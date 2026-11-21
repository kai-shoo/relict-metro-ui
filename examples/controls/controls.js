const form = document.querySelector('#settings');
const result = document.querySelector('#result');
const actions = document.querySelector('#actions');
const reset = document.querySelector('#reset');

result.open = false;
actions.commands = [{ id: 'reset', label: 'Восстановить настройки' }];
actions.addEventListener('metro-command', ({ detail }) => {
  if (detail.id === 'reset') reset.show(actions);
});
reset.addEventListener('metro-close', ({ detail }) => {
  if (detail.reason !== 'action' || detail.value !== 'reset') return;
  form.reset();
  result.open = false;
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const delivery = values.get('delivery') === 'auto' ? 'автоматическая' : 'ручная';
  result.message = `Проверка почты: ${delivery}. Предпросмотр: ${values.has('previews') ? 'включён' : 'выключен'}.`;
  result.open = true;
});
