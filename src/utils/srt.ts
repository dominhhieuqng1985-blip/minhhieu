export interface SrtCue {
  id: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

export function formatSrtTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

export function parseSrtTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  if (parts.length < 3) return 0;
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const secParts = parts[2].split(",");
  const seconds = parseFloat(secParts[0]);
  const ms = secParts[1] ? parseFloat(secParts[1]) : 0;
  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

export function parseSrtContent(srtText: string): SrtCue[] {
  if (!srtText || !srtText.trim()) return [];
  const blocks = srtText.trim().replace(/\r\n/g, "\n").split(/\n\n+/);
  const cues: SrtCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length >= 2) {
      const timeLineIndex = lines[0].includes("-->") ? 0 : 1;
      const textStartIndex = timeLineIndex + 1;
      const timeLine = lines[timeLineIndex];

      if (timeLine && timeLine.includes("-->")) {
        const [startStr, endStr] = timeLine.split("-->");
        const startTime = parseSrtTimeToSeconds(startStr);
        const endTime = parseSrtTimeToSeconds(endStr);
        const text = lines.slice(textStartIndex).join(" ").trim();

        cues.push({
          id: cues.length + 1,
          startTime,
          endTime,
          text
        });
      }
    }
  }

  return cues;
}

/**
 * Generates valid SRT subtitle content from text segments with duration estimation
 */
export function generateSrtFromText(
  inputText: string,
  totalDurationSeconds?: number,
  speedRate: number = 1.0
): string {
  if (!inputText.trim()) return "";

  // Split into natural sentences or clauses
  const rawSentences = inputText
    .replace(/([.!?。！？\n]+)/g, "$1|")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (rawSentences.length === 0) return "";

  // Estimate duration if not provided
  // Average speaking rate: ~3-4 syllables/words per second in Vietnamese/English at 1.0 speed
  const totalWords = inputText.trim().split(/\s+/).length;
  const calculatedDuration = totalDurationSeconds || Math.max(2, (totalWords / 2.8) / Math.max(0.5, speedRate));

  // Distribute duration proportionally by word count
  let currentStartTime = 0;
  const srtBlocks: string[] = [];

  rawSentences.forEach((sentence, idx) => {
    const sentenceWords = Math.max(1, sentence.split(/\s+/).length);
    const proportion = sentenceWords / Math.max(1, totalWords);
    const duration = Math.max(1.2, calculatedDuration * proportion);
    const endTime = Math.min(calculatedDuration, currentStartTime + duration);

    const srtBlock = `${idx + 1}\n${formatSrtTime(currentStartTime)} --> ${formatSrtTime(endTime)}\n${sentence}`;
    srtBlocks.push(srtBlock);

    currentStartTime = endTime + 0.15; // small gap
  });

  return srtBlocks.join("\n\n");
}

export function downloadFile(content: string, filename: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
