import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import styles from './App.module.css';
import { DiffView } from './components/DiffView/DiffView';
import { Memorize } from './components/Memorize/Memorize';
import { Notice } from './components/Notice/Notice';
import { PracticeHistory } from './components/PracticeHistory/PracticeHistory';
import { Recorder } from './components/Recorder/Recorder';
import { ScriptInput } from './components/ScriptInput/ScriptInput';
import { ScriptLibrary } from './components/ScriptLibrary/ScriptLibrary';
import { ScriptView } from './components/ScriptView/ScriptView';
import { Timer } from './components/Timer/Timer';
import { TTSControls } from './components/TTSControls/TTSControls';
import { WeakWords } from './components/WeakWords/WeakWords';
import { useAlternatePlayback } from './hooks/useAlternatePlayback';
import { useRecorder } from './hooks/useRecorder';
import { useScripts } from './hooks/useScripts';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useVoices } from './hooks/useVoices';
import { detectLang } from './lib/detectLang';
import { collectWeakWords, diffScript, summarizeDiff } from './lib/diffWords';
import { flattenScript, segmentScript } from './lib/segment';
import { LEVEL_LABELS, toggleKeyword, type MaskLevel } from './lib/mask';
import { filterVoices, listLangs, pickVoice } from './lib/voices';
import type { Script } from './types';

export function App() {
  const { scripts, settings, records, weakWords, keywords: storedKeywords, setKeywords, save, remove, addRecord, removeRecord, addWeakWords, removeWeakWord, clearWeakWords, updateSettings, saveFailed, locked } = useScripts();
  const voices = useVoices();

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [langChoice, setLangChoice] = useState('auto');

  const deferredText = useDeferredValue(text);
  const detectedLang = useMemo(() => detectLang(deferredText), [deferredText]);
  const effectiveLang = langChoice === 'auto' ? detectedLang : langChoice;
  const locale = effectiveLang ?? undefined;

  const paragraphs = useMemo(() => segmentScript(deferredText, locale), [deferredText, locale]);
  const flat = useMemo(() => flattenScript(paragraphs), [paragraphs]);
  const items = useMemo(() => flat.items.map((i) => i.text), [flat]);

  const langs = useMemo(() => listLangs(voices), [voices]);
  const candidates = useMemo(() => filterVoices(voices, effectiveLang), [voices, effectiveLang]);
  const voice = useMemo(() => pickVoice(candidates, settings.voiceURI), [candidates, settings.voiceURI]);
  const noVoiceForLang = voices.length > 0 && effectiveLang !== null && candidates.length === 0;

  const tts = useSpeechSynthesis(items, { rate: settings.rate, voice, lang: locale });
  const { play, playTexts, stop } = tts;

  const recorder = useRecorder();
  const recognition = useSpeechRecognition(voice?.lang ?? locale);
  // Off on every load: no SpeechRecognition instance is created until the user opts in.
  const [useRecognition, setUseRecognition] = useState(false);
  const [appliedTake, setAppliedTake] = useState<string | null>(null);

  // Memorize mode. Keywords of saved scripts live in storage; an unsaved draft keeps them in memory.
  const [maskLevel, setMaskLevel] = useState<MaskLevel>('full');
  const [takeLevel, setTakeLevel] = useState<MaskLevel>('full');
  const [draftKeywords, setDraftKeywords] = useState<string[]>([]);
  const keywords = useMemo(
    () => (currentId === null ? draftKeywords : (storedKeywords.find((k) => k.scriptId === currentId)?.words ?? [])),
    [currentId, draftKeywords, storedKeywords],
  );
  const onToggleKeyword = (key: string) => {
    const next = toggleKeyword(keywords, key);
    if (currentId === null) setDraftKeywords(next);
    else setKeywords(currentId, next);
  };
  const onClearKeywords = () => {
    if (currentId === null) setDraftKeywords([]);
    else setKeywords(currentId, []);
  };

  const speakOnce = useCallback((text: string, onDone: () => void) => playTexts([text], { onDone }), [playTexts]);
  const alternate = useAlternatePlayback({ speak: speakOnce, stopSpeaking: stop });

  const diff = useMemo(() => {
    if (recorder.status !== 'stopped' || recognition.listening || !recognition.finalTranscript) return null;
    const result = diffScript(deferredText, recognition.finalTranscript, locale);
    return { result, summary: summarizeDiff(result.tokens), weak: collectWeakWords(result) };
  }, [recorder.status, recognition.listening, recognition.finalTranscript, deferredText, locale]);

  const recordingMs = recorder.status === 'stopped' ? recorder.elapsedMs : null;
  const applyWeak = () => {
    if (!diff) return;
    addWeakWords(diff.weak, currentId);
    setAppliedTake(recorder.url);
  };

  const lastIndex = items.length - 1;
  const playAll = useCallback(() => play(0, lastIndex), [play, lastIndex]);
  const playParagraph = useCallback((p: number) => play(flat.ranges[p].from, flat.ranges[p].to), [play, flat]);
  const playOnce = useCallback((i: number) => play(i, i), [play]);
  const repeatSentence = useCallback(
    (i: number) => {
      if (tts.repeating && tts.activeIndex === i) stop();
      else play(i, i, true);
    },
    [play, stop, tts.repeating, tts.activeIndex],
  );

  const onSave = () => {
    const id = save({ id: currentId, title, text, lang: langChoice }, draftKeywords);
    if (currentId === null) setDraftKeywords([]);
    setCurrentId(id);
  };
  const onNew = () => {
    stop();
    setCurrentId(null);
    setDraftKeywords([]);
    setTitle('');
    setText('');
    setLangChoice('auto');
  };
  const onLoad = (s: Script) => {
    stop();
    setCurrentId(s.id);
    setTitle(s.title);
    setText(s.text);
    setLangChoice(s.lang);
  };
  const onDelete = (id: string) => {
    remove(id);
    if (id === currentId) setCurrentId(null);
  };

  const hasText = items.length > 0;

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <h1>구술평가 연습</h1>
        <p>대본을 올리면 그 언어로 읽어 줍니다. 대본은 이 브라우저에만 저장되고 서버로 전송되지 않습니다.</p>
      </header>

      {locked && <Notice kind="warn">저장된 데이터가 더 새로운 버전의 앱에서 만들어져 이 버전에서는 저장하지 않습니다.</Notice>}
      {saveFailed && <Notice kind="error">브라우저에 저장하지 못했습니다. 시크릿 모드이거나 저장 공간이 부족할 수 있습니다.</Notice>}

      <section className={styles.section}>
        <h2>대본</h2>
        <ScriptInput
          title={title}
          text={text}
          editingSaved={currentId !== null}
          onTitleChange={setTitle}
          onTextChange={setText}
          onSave={onSave}
          onNew={onNew}
        />
      </section>

      <section className={styles.section}>
        <h2>저장된 대본</h2>
        <ScriptLibrary scripts={scripts} currentId={currentId} onLoad={onLoad} onDelete={onDelete} />
      </section>

      <section className={styles.section}>
        <h2>읽어 주기</h2>
        {!tts.supported && <Notice kind="warn">이 브라우저는 음성 읽기(speechSynthesis)를 지원하지 않아 읽어 주기 기능을 사용할 수 없습니다. 대본 저장과 보기는 그대로 쓸 수 있습니다.</Notice>}
        {tts.supported && voices.length === 0 && <Notice>목소리 목록을 불러오는 중이거나, 이 기기에 설치된 목소리가 없습니다.</Notice>}
        {noVoiceForLang && <Notice kind="warn">선택한 언어({effectiveLang})의 목소리가 이 기기에 없습니다. 다른 언어를 고르거나 기기에 해당 음성을 설치해 주세요.</Notice>}
        {tts.error && <Notice kind="error">{tts.error}</Notice>}
        {tts.supported && tts.boundaryMissing && <Notice>이 브라우저는 단어 위치 정보를 주지 않아 문장 단위로만 표시합니다.</Notice>}

        {tts.supported && (
          <div className={styles.sticky}>
            <TTSControls
              status={tts.status}
              repeating={tts.repeating}
              hasText={hasText}
              langChoice={langChoice}
              detectedLang={detectedLang}
              langs={langs}
              voices={candidates}
              voiceURI={voice?.voiceURI ?? null}
              rate={settings.rate}
              onLangChange={setLangChoice}
              onVoiceChange={(uri) => updateSettings({ voiceURI: uri })}
              onRateChange={(r) => updateSettings({ rate: r })}
              onPlayAll={playAll}
              onPause={tts.pause}
              onResume={tts.resume}
              onStop={stop}
            />
          </div>
        )}

        {hasText ? (
          <ScriptView
            paragraphs={paragraphs}
            flat={flat}
            locale={locale}
            activeIndex={tts.activeIndex}
            charIndex={tts.charIndex}
            repeating={tts.repeating}
            onPlayParagraph={playParagraph}
            onPlayOnce={playOnce}
            onRepeat={repeatSentence}
          />
        ) : (
          <div className={styles.empty}>
            <p>아직 대본이 없습니다.</p>
            <p>위 입력창에 대본을 붙여넣거나 .txt / .md 파일을 올려 시작하세요.</p>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2>외우기 모드</h2>
        {hasText ? (
          <Memorize
            paragraphs={paragraphs}
            locale={locale}
            level={maskLevel}
            keywords={keywords}
            keywordsPersisted={currentId !== null}
            onLevelChange={setMaskLevel}
            onToggleKeyword={onToggleKeyword}
            onClearKeywords={onClearKeywords}
          />
        ) : (
          <p className={styles.note}>대본을 올리면 단계별로 가려 가며 외울 수 있습니다.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2>녹음과 발음 비교</h2>
        <Recorder
          recorder={recorder}
          recognition={recognition}
          alternate={alternate}
          useRecognition={useRecognition}
          onUseRecognitionChange={setUseRecognition}
          sentences={items}
          ttsSupported={tts.supported}
          hasText={hasText}
          onTakeStart={() => setTakeLevel(maskLevel)}
        />
        {diff && (
          <DiffView
            result={diff.result}
            summary={diff.summary}
            heardText={recognition.finalTranscript}
            weakCount={new Set(diff.weak).size}
            weakApplied={appliedTake !== null && appliedTake === recorder.url}
            onApplyWeak={applyWeak}
            saveDisabled={locked}
            levelLabel={LEVEL_LABELS[takeLevel]}
          />
        )}
        {recorder.status === 'stopped' && !useRecognition && recognition.supported && (
          <Notice>대본과 비교하려면 위의 &quot;음성 인식으로 대본과 비교&quot;를 켠 뒤 다시 녹음해 주세요. 지금은 음성 인식이 꺼져 있어 녹음과 다시 듣기만 됩니다.</Notice>
        )}
        {recorder.status === 'stopped' && !diff && useRecognition && recognition.supported && !recognition.listening && (
          <Notice>인식된 말이 없어 대본과 비교하지 못했습니다. 마이크 소리와 선택한 언어를 확인해 주세요.</Notice>
        )}
      </section>

      <section className={styles.section}>
        <h2>자주 틀리는 단어</h2>
        <WeakWords
          words={weakWords}
          scripts={scripts}
          ttsSupported={tts.supported}
          speaking={tts.status !== 'idle' && tts.activeIndex === null}
          onSpeakOne={(w) => playTexts([w])}
          onLoop={(ws) => playTexts(ws, { loop: true })}
          onStop={stop}
          onRemove={removeWeakWord}
          onClear={clearWeakWords}
        />
      </section>

      <section className={styles.section}>
        <h2>발표 시간 연습</h2>
        <Timer scriptId={currentId} scriptTitle={title.trim()} text={deferredText} locale={locale} recordingMs={recordingMs} onSaveRecord={addRecord} />
      </section>

      <section className={styles.section}>
        <h2>연습 기록</h2>
        <p className={styles.note}>기록은 이 브라우저(localStorage)에만 저장되며 서버로 전송되지 않습니다.</p>
        <PracticeHistory records={records} onDelete={removeRecord} />
      </section>
    </main>
  );
}
