// A short generated recording makes the example independent of a media server.
export function sampleRecording(seconds = 8) {
  const rate = 8000;
  const count = Math.floor(rate * seconds);
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const four = (offset, value) => {
    for (let i = 0; i < 4; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  four(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  four(8, 'WAVE');
  four(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  four(36, 'data');
  view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const time = i / rate;
    const envelope = Math.max(0, 1 - (time % .8) * 2);
    const frequency = 220 * [1, 1.25, 1.5, 1.25][Math.floor(time / .8) % 4];
    view.setInt16(44 + i * 2, Math.sin(Math.PI * 2 * time * frequency) * 2000 * envelope, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
