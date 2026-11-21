import { MetroActivationScope } from '../../dist/metro-ui.js';
import { sampleRecording } from './sound.js';

const queue = document.querySelector('#queue');
const player = document.querySelector('#recording');
const center = document.querySelector('#notifications');
const toast = document.querySelector('#toast');
const activationStatus = document.querySelector('#activation-status');
const records = new Map([
  ['dawn', { title: 'На рассвете', src: URL.createObjectURL(sampleRecording(8)) }],
  ['lake', { title: 'У озера', src: URL.createObjectURL(sampleRecording(12)) }],
]);

player.labels = {
  play: 'Воспроизвести', pause: 'Пауза', mute: 'Выключить звук', unmute: 'Включить звук',
  position: 'Позиция воспроизведения', buffering: 'Загрузка записи', error: 'Запись недоступна',
};

let opened;
function select(id) {
  const record = records.get(id);
  if (!record) return false;
  opened = id;
  queue.value = id;
  player.label = record.title;
  if (player.src !== record.src) player.src = record.src;
  document.querySelector('#now').text = record.title;
  return true;
}

const activation = new MetroActivationScope({
  resolve(entry) {
    const id = entry.kind === 'launch' ? 'dawn' : entry.destination?.parameters?.record;
    return records.has(id) ? { identity: id, route: id } : null;
  },
  current: () => opened ?? null,
  navigate: destination => select(destination.route),
});

async function openRecord(entry) {
  const result = await activation.activate(entry);
  if (result === 'unavailable') {
    activationStatus.textContent = 'Запись недоступна. Выберите другую запись из списка.';
  } else if (result === 'opened' || result === 'current') {
    activationStatus.textContent = '';
  }
  return result;
}

function chooseRecord(id) {
  activation.cancel();
  activationStatus.textContent = '';
  return select(id);
}

queue.addEventListener('metro-selection-change', ({ detail }) => chooseRecord(detail.value));
queue.addEventListener('metro-item-activate', async ({ detail }) => {
  if (chooseRecord(detail.value)) {
    await player.updateComplete;
    await player.play().catch(() => {});
  }
});
document.querySelector('#native').addEventListener('change', event => {
  player.nativeControls = event.currentTarget.checked;
});

let serial = 0;
const announcement = document.querySelector('#announce');
announcement.addEventListener('click', () => {
  const key = queue.value;
  const record = records.get(key);
  if (!record) return;
  const notification = {
    id: `record-${++serial}`, title: record.title, message: 'Запись доступна для прослушивания.',
    source: 'Архив', icon: 'play', destination: key,
  };
  center.notifications = [notification, ...center.notifications];
  toast.show(notification, announcement);
});

for (const surface of [toast, center]) {
  surface.addEventListener('metro-notification-activate', async ({ detail }) => {
    await openRecord({ kind: 'notification', id: detail.id, destination: {
      href: './', parameters: { record: detail.notification.destination },
    } });
    center.notifications = center.notifications.map(item => item.id === detail.id ? { ...item, read: true } : item);
  });
}
center.addEventListener('metro-notification-dismiss', ({ detail }) => {
  center.notifications = center.notifications.filter(item => item.id !== detail.id);
});
center.addEventListener('metro-notifications-clear', () => { center.notifications = []; });

function plan() {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 300;
  const drawing = canvas.getContext('2d');
  drawing.fillStyle = '#e5e9e0';
  drawing.fillRect(0, 0, 480, 300);
  drawing.fillStyle = '#a0c7da';
  drawing.beginPath();
  drawing.ellipse(255, 145, 124, 63, -.14, 0, Math.PI * 2);
  drawing.fill();
  drawing.strokeStyle = '#475342';
  drawing.lineWidth = 3;
  drawing.beginPath();
  drawing.moveTo(76, 95);
  drawing.bezierCurveTo(154, 136, 166, 262, 385, 231);
  drawing.stroke();
  for (const [x, y, label] of [[76, 95, 'На рассвете'], [385, 231, 'У озера']]) {
    drawing.fillStyle = '#0050ef';
    drawing.fillRect(x - 6, y - 6, 12, 12);
    drawing.font = '18px system-ui';
    drawing.fillStyle = '#171c15';
    drawing.fillText(label, x - 36, y - 15);
  }
  return canvas.toDataURL('image/png');
}

const linkedRecord = new URLSearchParams(location.search).get('record');
const entry = linkedRecord
  ? { kind: 'link', destination: { href: './', parameters: { record: linkedRecord } } }
  : { kind: 'launch' };
void openRecord(entry).then(result => {
  if (result === 'unavailable') select('dawn');
});
document.querySelector('#preview').src = plan();
window.addEventListener('pagehide', event => {
  if (!event.persisted) for (const record of records.values()) URL.revokeObjectURL(record.src);
});
