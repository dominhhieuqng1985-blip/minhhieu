export function splitText(text: string, maxLength: number = 2000): string[] {
  if (!text || !text.trim()) return [];

  const chunks: string[] = [];
  let current = "";

  // Split by sentence terminators or newlines while keeping boundaries natural
  const sentences = text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?。！？\n])\s+/);

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // If a single sentence exceeds maxLength, split it by commas or spaces
    if (trimmedSentence.length > maxLength) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }

      const subClauses = trimmedSentence.split(/(?<=[,;:\n])\s+/);
      let subCurrent = "";

      for (const clause of subClauses) {
        if (subCurrent.length + clause.length + 1 > maxLength) {
          if (subCurrent.trim()) {
            chunks.push(subCurrent.trim());
          }
          subCurrent = clause;
        } else {
          subCurrent += (subCurrent ? " " : "") + clause;
        }
      }

      if (subCurrent.trim()) {
        chunks.push(subCurrent.trim());
      }
      continue;
    }

    if (current.length + trimmedSentence.length + 1 > maxLength) {
      if (current.trim()) {
        chunks.push(current.trim());
      }
      current = trimmedSentence;
    } else {
      current += (current ? " " : "") + trimmedSentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
