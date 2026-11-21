// The markup and setup functions below are also the source shown to the reader.
const actionStyles = `<style>
  #demo .demo-action {
    box-sizing: border-box;
    max-inline-size: 100%;
    min-block-size: 2.75rem;
    padding: .375rem .625rem;
    border: 3px solid currentColor;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    overflow-wrap: anywhere;
    cursor: pointer;
  }
  #demo .demo-action:focus-visible {
    outline: 2px solid var(--metro-focus, currentColor);
    outline-offset: 2px;
  }
</style>`;

export const samples = [
  {
    title: 'Кнопки и быстрые действия',
    html: `<metro-toggle-button>Избранное</metro-toggle-button>
<metro-repeat-button>Прибавить</metro-repeat-button>
<output>0</output>
<metro-hyperlink href="../mail/"><metro-icon name="mail"></metro-icon> Почта</metro-hyperlink>`,
    setup(root) {
      const output = root.querySelector('output');
      root.querySelector('metro-repeat-button').addEventListener('metro-activate', () => {
        output.value = String(Number(output.value) + 1);
      });
    },
  },
  {
    title: 'Календарь и расписание',
    html: `<metro-calendar-view value="2026-11-19" locale="ru"
  previous-label="Предыдущий месяц" next-label="Следующий месяц"></metro-calendar-view>
<metro-time-picker label="Начало" value="09:00" locale="ru" presentation="phone"
  dialog-label="Время начала" apply-label="Готово" cancel-label="Отмена"></metro-time-picker>
<metro-recurring-days-picker label="Дни недели" locale="ru"
  placeholder="Без повтора" dialog-label="Дни повтора" every-day-label="Ежедневно"
  apply-label="Применить" cancel-label="Отмена"></metro-recurring-days-picker>`,
    setup(root) {
      root.querySelector('metro-time-picker').pickerLabels = { hour: 'Часы', minute: 'Минуты' };
    },
  },
  {
    title: 'Поля и подсказки',
    html: `<metro-auto-suggest-box label="Город"></metro-auto-suggest-box>
<metro-password-box label="Код доступа" reveal reveal-label="Показать код при удержании"></metro-password-box>
<metro-rating label="Оценка" value="3"></metro-rating>
<metro-color-picker label="Акцент" value="#0050ef"></metro-color-picker>`,
    setup(root) {
      const cities = [{ id: 'moscow', label: 'Москва' }, { id: 'perm', label: 'Пермь' }];
      const box = root.querySelector('metro-auto-suggest-box');
      box.addEventListener('metro-query', ({ detail }) => {
        box.setSuggestions(detail.queryId, cities.filter(city => city.label.toLowerCase().startsWith(detail.query.toLowerCase())));
      });
    },
  },
  {
    title: 'Выбор представления',
    html: `<metro-selector-bar label="Показывать" value="all">
  <metro-radio value="all" label="Все"></metro-radio>
  <metro-radio value="saved" label="Сохранённые"></metro-radio>
</metro-selector-bar>
<metro-list-picker label="Размер" value="m">
  <metro-option value="s">Маленький</metro-option>
  <metro-option value="m">Средний</metro-option>
</metro-list-picker>`,
  },
  {
    title: 'Команды документа',
    html: `<metro-command-bar label="Документ" more-label="Ещё">
  <metro-app-bar-button command-id="save" label="Сохранить" icon-name="save"></metro-app-bar-button>
  <metro-app-bar-separator></metro-app-bar-separator>
  <metro-app-bar-toggle-button command-id="pin" label="Закрепить" icon-name="pin"></metro-app-bar-toggle-button>
  <metro-app-bar-button command-id="export" label="Экспортировать" placement="secondary"></metro-app-bar-button>
</metro-command-bar>
<output aria-live="polite"></output>`,
    setup(root) {
      root.addEventListener('metro-command', event => { root.querySelector('output').value = event.detail.id; });
    },
  },
  {
    title: 'Меню действий',
    html: `${actionStyles}
<metro-split-button label="Отправить" primary-command="send" menu-label="Способы отправки">Отпра&shy;вить</metro-split-button>
<metro-drop-down-button label="Экспорт"></metro-drop-down-button>
<metro-command-bar-flyout trigger-label="Инструменты" label="Инструменты"></metro-command-bar-flyout>
<button id="file" class="demo-action" type="button" aria-haspopup="menu">Отчёт</button>
<metro-context-menu for="file" label="Действия с отчётом"></metro-context-menu>
<output aria-live="polite"></output>`,
    setup(root) {
      for (const menu of root.querySelectorAll('metro-split-button, metro-drop-down-button, metro-command-bar-flyout, metro-context-menu')) {
        menu.commands = [{ id: 'copy', label: 'Копировать' }, { id: 'print', label: 'Печать' }];
      }
      const file = root.querySelector('#file');
      file.onclick = () => root.querySelector('metro-context-menu').show(file);
      root.addEventListener('metro-command', ({ detail }) => { root.querySelector('output').value = detail.id; });
    },
  },
  {
    title: 'Всплывающее содержимое',
    html: `${actionStyles}
<button id="help" class="demo-action" type="button" aria-haspopup="dialog">Подсказка</button>
<metro-teaching-tip heading="Папки" dismiss-label="Закрыть">Папку можно сменить свайпом.</metro-teaching-tip>
<metro-tooltip text="Сведения о записи">
  <button id="info" class="demo-action" type="button" aria-haspopup="dialog" aria-expanded="false">Сведения</button>
</metro-tooltip>
<metro-popup label="Сведения о записи"><p>Доступен в архиве</p><button class="demo-action" type="button" data-metro-close>Закрыть</button></metro-popup>`,
    setup(root) {
      const info = root.querySelector('#info');
      const help = root.querySelector('#help');
      const popup = root.querySelector('metro-popup');
      info.onclick = async () => {
        if (popup.open) {
          popup.close();
          return;
        }
        popup.show(info);
        info.setAttribute('aria-expanded', 'true');
        await popup.updateComplete;
        if (popup.open) popup.focusContent({ preventScroll: true });
      };
      popup.addEventListener('metro-close', ({ detail }) => {
        info.setAttribute('aria-expanded', 'false');
        if (detail.reason === 'escape' || detail.reason === 'action') info.focus({ preventScroll: true });
      });
      help.onclick = () => root.querySelector('metro-teaching-tip').show(help);
    },
  },
  {
    title: 'Компо\u00adновка',
    html: `<metro-grid columns="repeat(auto-fit, minmax(min(100%, 9em), 1fr))">
  <metro-border style="--metro-border-padding: 1rem">
    <metro-content-control>
      <strong slot="header">Маршрут</strong>
      <metro-content-presenter>Линия № 1</metro-content-presenter>
    </metro-content-control>
  </metro-border>
  <metro-canvas style="--metro-canvas-height: 6rem">
    <metro-shape kind="ellipse" label="Станция" style="--metro-canvas-x: 1rem; --metro-canvas-y: 1rem"></metro-shape>
  </metro-canvas>
</metro-grid>
<metro-wrap-panel><span>Север</span><span>Юг</span></metro-wrap-panel>`,
  },
  {
    title: 'Фор\u00adмати\u00adрован\u00adный текст',
    html: `<metro-rich-text-block><p>Первая остановка — <strong>маяк</strong>.</p></metro-rich-text-block>`,
  },
  {
    title: 'Подпись поля',
    html: `<metro-label><label for="caption">Подпись</label></metro-label>
<input id="caption" value="Берег">`,
  },
  {
    title: 'Аватар с ини\u00adциа\u00adлами',
    html: `<metro-person-picture name="Анна Ветрова"></metro-person-picture>`,
  },
  {
    title: 'Изображение',
    html: `<metro-image src="../photos/assets/coast.svg" alt="Маяк на побережье" width="180" height="100"></metro-image>`,
  },
  {
    title: 'Фоновое изображение с подписью',
    html: `<metro-image-brush src="../photos/assets/lake.svg">
  <div style="box-sizing:border-box; min-height:clamp(9rem, 28vw, 16rem); padding:1rem; display:flex; align-items:flex-end">
    <strong style="background:#111d; color:white; padding:.25em .6em">Тихое озеро</strong>
  </div>
</metro-image-brush>`,
  },
  {
    title: 'Списки',
    html: `<metro-list-box label="Районы" value="north">
  <metro-list-item value="north">Север</metro-list-item>
  <metro-list-item value="south">Юг</metro-list-item>
</metro-list-box>
<metro-grid-view label="Станции">
  <metro-list-item value="park">Парк</metro-list-item>
  <metro-list-item value="river">Река</metro-list-item>
</metro-grid-view>`,
  },
  {
    title: 'Группы и дерево',
    html: `<metro-long-list-selector label="Города" jump-label="Перейти к букве" cancel-label="Отмена">
  <metro-list-group value="p" label="П">
    <metro-list-item value="perm">Пермь</metro-list-item>
  </metro-list-group>
</metro-long-list-selector>
<metro-tree-view label="Папки">
  <metro-tree-item value="saved" label="Сохранённые" expanded>
    <metro-tree-item value="map" label="Карты"></metro-tree-item>
  </metro-tree-item>
</metro-tree-view>`,
  },
  {
    title: 'Шаблон строки',
    html: `<metro-items-view label="Папки" selection-mode="single">
  <template><strong data-metro-field="label"></strong></template>
</metro-items-view>
<metro-items-repeater>
  <template><p data-metro-field="label"></p></template>
</metro-items-repeater>`,
    setup(root) {
      const folders = [{ value: 'local', label: 'На устройстве' }, { value: 'cloud', label: 'В облаке' }];
      const list = root.querySelector('metro-items-repeater');
      list.keyFor = item => item.value;
      list.items = folders;
      root.querySelector('metro-items-view').items = folders;
    },
  },
  {
    title: 'Переход к группе',
    html: `<metro-semantic-zoom overview-label="Группы" detail-label="Вернуться к станциям">
  <metro-scroll-viewer slot="detail" label="Станции" style="height:7rem">
    <p data-metro-key="north" style="height:6rem">Северная станция</p>
    <p data-metro-key="south" style="height:6rem">Южная станция</p>
  </metro-scroll-viewer>
</metro-semantic-zoom>
<metro-scroll-viewer id="stops" label="Остановки" style="max-height:8rem">
  <p data-metro-key="park" style="height:7rem">Парк</p>
  <p data-metro-key="depot" style="height:7rem">Депо</p>
</metro-scroll-viewer>
<metro-annotated-scroll-bar for="stops" label="Метки остановок" scroll-label="Положение остановок"></metro-annotated-scroll-bar>`,
    setup(root) {
      root.querySelector('metro-semantic-zoom').groups = [
        { value: 'north', label: 'Север' },
        { value: 'south', label: 'Юг' },
      ];
      root.querySelector('metro-annotated-scroll-bar').annotations = [{ value: 'park', label: 'Парк' }, { value: 'depot', label: 'Депо' }];
    },
  },
  {
    title: 'Кадры галереи',
    html: `<metro-flip-view label="Фотографии" value="coast" position-label="{current} из {total}"
  carousel-description="галерея" slide-description="кадр"
  previous-label="Предыдущий кадр" next-label="Следующий кадр">
  <p data-value="coast">Маяк на мысе</p><p data-value="lake">Тихое озеро</p>
</metro-flip-view>
<metro-pips-pager count="2" page="1" label="Страницы галереи" position-label="Страница {current} из {total}"></metro-pips-pager>`,
    setup(root) {
      const view = root.querySelector('metro-flip-view');
      const pager = root.querySelector('metro-pips-pager');
      const keys = ['coast', 'lake'];
      view.addEventListener('metro-change', ({ detail }) => { pager.page = keys.indexOf(detail.value) + 1; });
      pager.addEventListener('metro-page-change', ({ detail }) => { view.value = keys[detail.page - 1]; });
    },
  },
  {
    title: 'Адаптивные области',
    html: `${actionStyles}
<metro-two-pane-view first-label="Контакты" second-label="Сведения о контакте">
  <h3 slot="first">Контакты</h3><p slot="second">Сведения о контакте</p>
</metro-two-pane-view>
<button class="demo-action" type="button">Открыть папки</button>
<metro-split-view display-mode="overlay" pane-label="Папки" toggle-label="Панель папок">
  <nav slot="pane"><a href="../mail/">Входящие</a></nav>
  <p>Сообщения</p>
</metro-split-view>`,
    setup(root) {
      const open = root.querySelector('button');
      open.onclick = () => root.querySelector('metro-split-view').showPane(open);
    },
  },
  {
    title: 'Плитка и индикаторы',
    html: `<metro-live-tile href="../mail/" label="Почта"></metro-live-tile>
<metro-hub-tile href="../notifications/" label="Журнал"></metro-hub-tile>
<metro-status-bar label="Состояние" time="09:42" battery="75" battery-label="Заряд" signal="3" network-label="Wi-Fi"></metro-status-bar>
<metro-progress-ring label="Загрузка" active></metro-progress-ring>`,
    setup(root) {
      root.querySelector('metro-live-tile').publish({ version: 1, front: { iconName: 'mail' }, count: 4, status: '4 новых письма' });
      root.querySelector('metro-hub-tile').publish({
        version: 1,
        front: { iconName: 'clock' },
        back: { text: 'Две записи', iconName: 'calendar' },
        status: 'Две записи',
      });
    },
  },
  {
    title: 'Действия записи',
    html: `<metro-swipe-control value="north" actions-label="Действия">Северный маршрут</metro-swipe-control>
<metro-share-button label="Поделиться маршрутом" text="Северный маршрут" copy-label="Скопировать текст" copy-fallback></metro-share-button>
<metro-reminder reminder-id="depart" heading="Отправление" message="Проверить маршрут" state-label="Пора отправляться"
  open-label="Открыть" snooze-label="Отложить" dismiss-label="Закрыть"></metro-reminder>
<output aria-live="polite"></output>`,
    setup(root) {
      const row = root.querySelector('metro-swipe-control');
      row.actions = [{ id: 'flag', label: 'Отметить', side: 'end' }];
      const output = root.querySelector('output');
      const reminderActions = { open: 'Открыть отправление', snooze: 'Отложить напоминание', dismiss: 'Закрыть напоминание' };
      row.addEventListener('metro-swipe-action', () => { output.value = 'Маршрут отмечен'; });
      root.addEventListener('metro-reminder-action', ({ detail }) => { output.value = reminderActions[detail.action]; });
      root.querySelector('metro-share-button').shareMessages = {
        pending: 'Подождите…',
        shared: 'Маршрут отправлен.',
        copied: 'Текст скопирован.',
        cancelled: 'Отправка отменена.',
        unsupported: 'Отправка недоступна.',
        error: 'Не удалось выполнить действие. Попробуйте ещё раз.',
      };
    },
  },
  {
    title: 'Сводка по маршрутам',
    html: `<metro-table-view label="Отправления" locale="ru" empty-label="Нет отправлений"></metro-table-view>
<metro-chart label="Рейсы" type="bar" locale="ru" category-label="Маршрут"
  data-label="Точные значения" empty-label="Нет данных" missing-label="Нет значения"></metro-chart>`,
    setup(root) {
      const table = root.querySelector('metro-table-view');
      table.columns = [{ key: 'name', label: 'Маршрут', rowHeader: true, sortable: true }, { key: 'trips', label: 'Рейсы', sortable: true }];
      table.rows = [{ id: 'north', cells: { name: 'Север', trips: 12 } }, { id: 'south', cells: { name: 'Юг', trips: 8 } }];
      const chart = root.querySelector('metro-chart');
      chart.categories = [{ id: 'north', label: 'Север' }, { id: 'south', label: 'Юг' }];
      chart.series = [{ id: 'trips', label: 'Рейсы', values: { north: 12, south: 8 } }];
    },
  },
  {
    title: 'Движение и пиктограммы',
    html: `<metro-tilt-effect><metro-button>Сменить знак</metro-button></metro-tilt-effect>
<metro-slide-in-effect event="reveal"><metro-animated-icon name="mail" label="Почта"></metro-animated-icon></metro-slide-in-effect>
<metro-turnstile-feather-effect event="reveal"><p>Почтовый ящик</p></metro-turnstile-feather-effect>`,
    setup(root) {
      const icon = root.querySelector('metro-animated-icon');
      root.querySelector('metro-button').onclick = () => {
        icon.name = icon.name === 'mail' ? 'save' : 'mail';
        icon.label = icon.name === 'mail' ? 'Почта' : 'Сохранение';
        for (const effect of root.querySelectorAll('[event="reveal"]')) effect.play();
      };
    },
  },
  {
    title: 'Разделы и вложенный документ',
    html: `<metro-lockable-pivot label="Архив" value="letters">
  <metro-pivot-item value="letters" label="Письма">Входящие письма</metro-pivot-item>
  <metro-pivot-item value="notes" label="Заметки">Полевые заметки</metro-pivot-item>
</metro-lockable-pivot>
<metro-expander label="Обложка маршрута">
  <metro-web-view src="../photos/assets/coast.svg" label="Маяк"></metro-web-view>
</metro-expander>`,
  },
];
