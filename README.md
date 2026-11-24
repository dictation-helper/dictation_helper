# 구술평가 연습 (Speech Rehearsal)

어떤 구술평가든 준비할 수 있는 정적 웹사이트입니다. 대본을 올리면 그 언어로 읽어 주고, 읽는 위치를 하이라이트합니다. 서버 없이 브라우저만으로 동작합니다.

- 배포 URL: https://dictation-helper.github.io/dictation_helper/ (GitHub Pages 설정과 첫 배포 완료 후 접속 가능, 배포 확인 필요)

## 현재 기능
1. **대본 올리기**: 붙여넣기, `.txt` / `.md` 업로드, 제목을 붙여 여러 개 저장·불러오기·삭제 (localStorage).
2. **읽어 주기 (TTS)**: 전체 / 문단 / 문장 재생, 일시정지, 정지, 속도, 언어·목소리 선택, 문장·단어 하이라이트, 문장 클릭 반복.

발표 시간 연습, 녹음·발음 비교, 외우기 모드는 이후 단계에서 추가합니다.

## 대본 분리 규칙
- 빈 줄 = 문단 구분. 한 줄 안에서는 `Intl.Segmenter`로 문장을 나눕니다(없으면 정규식 대체).
- 줄바꿈도 문장 경계로 취급합니다. 한 문장이 여러 줄로 끊긴 파일은 줄 단위로 읽힙니다.
- 언어 자동 감지는 문자 범위 기반입니다. 라틴 문자는 모두 `en`으로 보므로 영어 외 언어는 드롭다운에서 직접 고르세요.

## 개인정보
- 대본과 설정은 이 브라우저의 localStorage(`speech-rehearsal:data`)에만 저장되며 외부로 전송하지 않습니다.
- (음성 인식 기능을 추가하면) 크롬의 `SpeechRecognition`은 음성을 구글 서버로 보내 처리합니다. 해당 기능 화면과 이 문서에 계속 명시합니다.

## 브라우저 지원
확인하지 않은 항목은 "확인 필요"로 둡니다. 확인하면 이 표를 갱신합니다.

| 기능 | 크롬 (데스크톱) | 사파리 (iOS/macOS) | 모바일 크롬 |
| --- | --- | --- | --- |
| `speechSynthesis` 읽기 | 확인 필요 | 확인 필요 | 확인 필요 |
| 단어 단위 하이라이트(`onboundary`) | 확인 필요 | 확인 필요 | 확인 필요 |
| 일시정지/이어서 | 확인 필요 | 확인 필요 | 확인 필요 |

미지원이거나 단어 경계 이벤트가 없으면 해당 부분만 비활성화되거나 문장 단위 하이라이트로 대체됩니다. 개발 환경(헤드리스 크롬, 가짜 음성)에서는 앱 동작만 확인했고 실제 음성 출력은 확인하지 못했습니다.

## 개발
```bash
npm install
npm run dev        # 개발 서버
npm run lint && npm run typecheck && npm run test && npm run build
```

`vite.config.ts`의 `base`는 저장소 이름(`dictation_helper`)과 일치해야 합니다.

## 배포
`main`에 push되면 `.github/workflows/deploy.yml`이 빌드해서 GitHub Pages에 배포합니다. 처음 한 번 저장소 Settings → Pages에서 Source를 **GitHub Actions**로 설정해야 합니다.
