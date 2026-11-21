export const recordings = new Map([
  ['coast', { title: 'У берега', artist: 'Лида Корш', pitch: 164, hue: 218 }],
  ['bridge', { title: 'У моста', artist: 'Сева Лозин', pitch: 196, hue: 260 }],
  ['cove', { title: 'У залива', artist: 'Лида Корш', pitch: 147, hue: 196 }],
  ['beacon', { title: 'Маяк в тумане', artist: 'Сева Лозин', pitch: 174, hue: 308, private: true }],
  ['reed', { title: 'У камышей', artist: 'Лида Корш', pitch: 139, hue: 150 }],
  ['orchard', { title: 'У сада', artist: 'Дина Полевая', pitch: 233, hue: 125 }],
  ['island', { title: 'У острова', artist: 'Сева Лозин', pitch: 220, hue: 236 }],
  ['estuary', { title: 'У устья', artist: 'Дина Полевая', pitch: 207, hue: 198 }],
  ['dock', { title: 'У причала', artist: 'Сева Лозин', pitch: 155, hue: 278 }],
  ['dunes', { title: 'У дюн', artist: 'Дина Полевая', pitch: 131, hue: 34 }],
  ['lake', { title: 'У озера', artist: 'Лида Корш', pitch: 185, hue: 284 }],
]);

// Generate small WAV samples locally. Each catalogue record has its own pitch.
export function sampleAudio(pitch) {
  const rate = 8000;
  const length = rate * 18;
  const buffer = new ArrayBuffer(44 + length * 2);
  const pcm = new DataView(buffer);
  const marker = (offset, word) => {
    [...word].forEach((letter, index) => pcm.setUint8(offset + index, letter.charCodeAt(0)));
  };
  marker(0, 'RIFF');
  pcm.setUint32(4, buffer.byteLength - 8, true);
  marker(8, 'WAVE');
  marker(12, 'fmt ');
  pcm.setUint32(16, 16, true);
  pcm.setUint16(20, 1, true);
  pcm.setUint16(22, 1, true);
  pcm.setUint32(24, rate, true);
  pcm.setUint32(28, rate * 2, true);
  pcm.setUint16(32, 2, true);
  pcm.setUint16(34, 16, true);
  marker(36, 'data');
  pcm.setUint32(40, length * 2, true);
  const notes = [1, 1.5, 1.25, 2, 1.25, 1.5];
  for (let sample = 0; sample < length; sample++) {
    const t = sample / rate;
    const beat = t % .75;
    const gain = Math.min(1, beat * 25) * Math.exp(-beat * 6);
    const note = notes[Math.floor(t / .75) % notes.length];
    pcm.setInt16(44 + sample * 2, Math.sin(2 * Math.PI * t * pitch * note) * 1800 * gain, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
