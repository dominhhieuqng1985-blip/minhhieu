/**
 * Audio Synthesizer & Vietnamese Folk Instrument Audio Engine
 * Generates natural audio waveforms, pentatonic melodies (Hò Xự Xang Xê Cống),
 * and exports crisp WAV audio files.
 */

// Create standard WAV file header and PCM buffer
export function createWavBlob(samples: Float32Array, sampleRate = 44100): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // 16 for PCM
  view.setUint16(20, 1, true); // Linear quantization
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * 1 * 2)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples (16-bit signed integer)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Pentatonic Nam Bộ scale frequencies (Hò - Xự - Xang - Xê - Cống / Dm pentatonic)
 * D4 (293.66), F4 (349.23), G4 (392.00), A4 (440.00), C5 (523.25), D5 (587.33)
 */
export const NAM_BO_PENTATONIC = [
  293.66, // Hò (D4)
  349.23, // Xự (F4)
  392.0,  // Xang (G4)
  440.0,  // Xê (A4)
  523.25, // Cống (C5)
  587.33, // Oan (D5)
  698.46, // F5
  783.99, // G5
];

/**
 * Generate synthetic Southern Folk instrumental melody (Đàn Kìm & Sáo Trúc vibe)
 */
export function generateFolkMelodyAudio(durationSeconds = 20, sampleRate = 44100): Blob {
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const samples = new Float32Array(totalSamples);

  const notes = [
    { freq: 293.66, dur: 2.0 },
    { freq: 392.0, dur: 1.5 },
    { freq: 440.0, dur: 2.5 },
    { freq: 349.23, dur: 1.5 },
    { freq: 293.66, dur: 2.0 },
    { freq: 523.25, dur: 2.0 },
    { freq: 440.0, dur: 2.0 },
    { freq: 392.0, dur: 2.5 },
    { freq: 349.23, dur: 2.0 },
    { freq: 293.66, dur: 2.0 },
  ];

  let currentSample = 0;
  let noteIndex = 0;

  while (currentSample < totalSamples) {
    const note = notes[noteIndex % notes.length];
    const noteSamples = Math.floor(note.dur * sampleRate);
    const end = Math.min(totalSamples, currentSample + noteSamples);

    for (let i = currentSample; i < end; i++) {
      const t = (i - currentSample) / sampleRate;
      const progress = (i - currentSample) / noteSamples;

      // Exponential pluck decay (Đàn Kìm pluck + Flute sustain)
      const pluckEnv = Math.exp(-progress * 4.5);
      const fluteEnv = Math.sin(Math.min(Math.PI, progress * Math.PI));

      // Fundamental tone + subtle vibrato for Vietnamese folk ornament
      const vibrato = 1 + 0.015 * Math.sin(2 * Math.PI * 5.2 * t);
      const freq = note.freq * vibrato;

      // Đàn Kìm: Rich harmonics with distinctive sharp attack
      const kim =
        0.5 * Math.sin(2 * Math.PI * freq * t) +
        0.25 * Math.sin(2 * Math.PI * freq * 2 * t) +
        0.12 * Math.sin(2 * Math.PI * freq * 3 * t);

      // Sáo Trúc (Bamboo Flute): Breathy gentle wave
      const flute =
        0.4 * Math.sin(2 * Math.PI * freq * t) +
        0.1 * Math.sin(2 * Math.PI * freq * 2 * t) +
        0.02 * (Math.random() * 2 - 1); // breath air

      const sampleVal = (kim * pluckEnv + flute * fluteEnv * 0.4) * 0.45;
      samples[i] += sampleVal;
    }

    currentSample = end;
    noteIndex++;
  }

  return createWavBlob(samples, sampleRate);
}
