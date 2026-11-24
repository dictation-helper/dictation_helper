import { useId, useRef, useState } from 'react';
import { readTextFile } from '../../hooks/useTextFile';
import { Notice } from '../Notice/Notice';
import styles from './ScriptInput.module.css';

interface Props {
  title: string;
  text: string;
  editingSaved: boolean;
  onTitleChange: (v: string) => void;
  onTextChange: (v: string) => void;
  onSave: () => void;
  onNew: () => void;
}

export function ScriptInput({ title, text, editingSaved, onTitleChange, onTextChange, onSave, onNew }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const textId = useId();
  const [fileNote, setFileNote] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const { text: loaded, suspectEncoding } = await readTextFile(file);
    onTextChange(loaded);
    if (!title.trim()) onTitleChange(file.name.replace(/\.(txt|md|markdown)$/i, ''));
    setFileNote(suspectEncoding ? '파일에 깨진 글자가 있습니다. UTF-8로 저장된 파일인지 확인해 주세요.' : null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className={styles.box} aria-label="대본 입력">
      <div>
        <label className={styles.label} htmlFor={titleId}>제목</label>
        <input id={titleId} type="text" value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="저장할 때 사용할 제목" />
      </div>
      <div>
        <label className={styles.label} htmlFor={textId}>대본</label>
        <textarea
          id={textId}
          className={styles.textarea}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="여기에 대본을 붙여넣거나, 아래에서 .txt / .md 파일을 올리세요. 문단은 빈 줄로 구분합니다."
        />
      </div>
      <div className={styles.row}>
        <input ref={fileRef} className={styles.hidden} type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={(e) => void onFile(e.target.files?.[0])} aria-label="대본 파일 선택" />
        <button type="button" onClick={() => fileRef.current?.click()}>파일 올리기 (.txt / .md)</button>
        <button type="button" className="primary" onClick={onSave} disabled={!text.trim()}>
          {editingSaved ? '저장 (덮어쓰기)' : '저장'}
        </button>
        <button type="button" onClick={onNew}>새 대본</button>
      </div>
      {fileNote && <Notice kind="warn">{fileNote}</Notice>}
    </section>
  );
}
