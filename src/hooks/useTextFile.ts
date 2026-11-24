/** Reads a user-selected file as UTF-8 text. */
export async function readTextFile(file: File): Promise<{ text: string; suspectEncoding: boolean }> {
  const text = await file.text();
  return { text, suspectEncoding: text.includes('�') };
}
