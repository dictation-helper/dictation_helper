import { Notice } from '../Notice/Notice';

interface Props {
  /** Short form: only the reference-only warning. */
  short?: boolean;
}

export function SpeechNotice({ short = false }: Props) {
  return (
    <>
      <Notice kind="warn">음성 인식 결과는 참고용이며 실제 평가와 다를 수 있습니다.</Notice>
      {!short && (
        <Notice>
          크롬의 음성 인식은 말한 소리를 구글 서버로 보내 처리합니다. 다른 브라우저는 처리 방식을 확인하지 못했습니다(확인 필요). 이 기능을 제외하면 녹음 파일과 대본은 어디로도 전송되지 않으며, 녹음은 이 탭의 메모리에만 있다가 새로고침하면 사라집니다.
        </Notice>
      )}
    </>
  );
}
