# Справочник компонентов

В каталоге можно выбрать любой тег, увидеть его поэлементный импорт и открыть пример с разметкой. [Каталог из 119 компонентов](../examples/catalog/)

HTML-атрибуты настраивают простые значения. Для массивов команд, ссылок на узлы и других объектов используйте DOM-свойства. Компоненты регистрируются при импорте `windows-phone-metro-ui/<имя>`, где имя — тег без префикса `metro-`. Корневой и автономный браузерный модули регистрируют весь каталог.

## Кнопки и форма

| Тег | Атрибуты и свойства | Слоты и части |
| --- | --- | --- |
| `metro-button` | `type` (`button`, `submit`, `reset`), `name`, `value`, `disabled`, `form`, `formnovalidate` (`formNoValidate`), `label` | Текст в слоте по умолчанию. Часть `button` |
| `metro-toggle-button` | `checked`, `disabled`, `label`. При переключении пользователем отправляет `input` и `change`. Доступное имя сохраняется при изменении состояния | Текст в слоте по умолчанию. Часть `button` |
| `metro-repeat-button` | `disabled`, `label`, `delay` (400 мс), `interval` (80 мс). Удержание кнопки мыши, Space или Enter повторяет `metro-activate` с `detail.repeat = true`. Короткая активация отправляет одно событие с `repeat = false` | Текст в слоте по умолчанию. Часть `button` |
| `metro-hyperlink` | `href`, `target`, `rel`, `label`. Поддерживает обычное поведение ссылки, включая открытие в новой вкладке | Слот по умолчанию, часть `link` |
| `metro-checkbox` | `name`, `value`, `label`, `checked`, `indeterminate`, `required`, `disabled`, `form` | Подпись в слоте по умолчанию. Части `control`, `input`, `indicator`, `label` |
| `metro-toggle-switch` | `name`, `value`, `label`, `checked`, `on-label`, `off-label`, `required`, `disabled`, `form` | Подпись в слоте по умолчанию. Части `control`, `input`, `track`, `thumb`, `label`, `state` |
| `metro-radio-group` | `name`, `value`, `label`, `required`, `disabled`, `form`. Стрелки меняют выбранный вариант | Прямые дети `metro-radio`, слот `label` для заголовка группы. Части `group`, `legend`, `option`, `input`, `indicator`, `label` |
| `metro-radio` | `value` со стабильным ключом, `label`, `disabled` | Подпись берётся из `label`, текстового содержимого или `value` |
| `metro-combo-box` | `name`, `value`, `label`, `placeholder`, `empty-label`, `required`, `disabled`, `form` | Прямые дети `metro-option`, слот `label`. Части `label`, `control`, `select`, `indicator`. Меню рисует браузер |
| `metro-option` | `value` со стабильным ключом, `label`, `disabled` | Подпись берётся из `label`, текстового содержимого или `value` |
| `metro-text-box` | `name`, `value`, `label`, `description`, `placeholder`, `required`, `readonly`, `disabled`, `form`, `autocomplete`, `inputmode`, `minlength`, `maxlength`, `pattern`. `type` принимает `text`, `search`, `email`, `url` или `tel`. `multiline` и `rows` включают многострочный ввод | Слоты `label` и `description`. Части `label`, `control`, `input`, `description` |
| `metro-password-box` | Строковое поле с атрибутами TextBox для одиночной строки. `reveal` включает показ пароля на время удержания кнопки, `reveal-label` задаёт её доступное имя. При скрытии сфокусированной кнопки пароль маскируется, фокус возвращается в доступное поле | Слоты и части текстового поля, а также часть `reveal` |

Атрибут `checked` задаёт начальное состояние. Свойство `checked` меняет текущее состояние, `defaultChecked` — состояние для сброса формы. В отправляемых данных отмеченные checkbox и switch передают свой `value`, по умолчанию `on`. У радиогруппы и ComboBox ту же роль играют атрибут `value`, текущее свойство `value` и `defaultValue`. Без начального значения или `placeholder` ComboBox выбирает первый доступный вариант. Неизвестный ключ, удалённый или недоступный вариант дают пустой выбор. Для чтения формы используйте `FormData`.

Действие пользователя в checkbox, switch, радиогруппе и ComboBox отправляет всплывающие `input` и `change` через границу Shadow DOM. После присваивания текущего состояния JavaScript может сразу прочитать новое значение. События зарезервированы для действий пользователя.

Если приложение отключает или удаляет пункт с фокусом в RadioGroup или SelectorBar, фокус переходит к оставшемуся доступному пункту, когда такой есть. Браузер прокручивает его в видимую область.

`metro-toggle-switch` подтверждает перетаскивание при отпускании указателя. Присваивание `checked`, сброс формы и отключение контрола прерывают текущий жест.

У текстовых полей атрибут `value` и свойство `defaultValue` задают исходный текст, а свойство `value` — текущий. Браузер обрабатывает редактирование, выделение, отмену ввода и IME. События `beforeinput`, `input` и `change` уведомляют приложение о пользовательском вводе. Для пароля передавайте `autocomplete="new-password"` при создании нового пароля. Не записывайте введённые пароли в HTML-атрибуты.

`metro-rich-edit-box` поддерживает `name`, `label` или слот `label`, `value`, `defaultValue`, `required`, `readonly` и `disabled`. В форму передаётся обычный текст с переносами строк. Для сохранения форматирования используйте DOM-свойство `runs` с массивом `{ text, bold?, italic?, underline? }`. Приложение может вызвать `format('bold')`, `format('italic')`, `format('underline')` или `insertText(text)`. Редактор вставляет текст из буфера обмена и использует историю редактирования браузера. Части доступны через `control`, `label`, `toolbar`, `format` и `editor`.

Контекстное меню Copy, Cut и Paste открывается кнопкой, правым кликом или Shift+F10. Escape возвращает фокус к источнику открытия: к кнопке панели или к редактору с сохранённым выделением. `clipboardAction('copy' | 'cut' | 'paste')` вызывает ту же команду и возвращает `Promise<boolean>`. По умолчанию используется браузерный Clipboard API в защищённом контексте. DOM-свойство `clipboard` принимает `{ readText(signal)?, writeText(text, signal)? }` или `null` для отключения асинхронного доступа. Нативные события буфера остаются доступны. Привяжите редактор к записи через `document-key` или `documentKey`. Изменение документа, текста или выделения отменяет ожидающую команду. Смена ключа начинает отдельную историю undo. `metro-clipboard-result` сообщает `action` и `status` без содержимого буфера. Атрибуты `clipboard-label`, `copy-label`, `cut-label`, `paste-label` локализуют меню. Части `clipboard-trigger`, `clipboard-menu` и `clipboard-command` доступны для оформления. [Пример с двумя документами](../examples/clipboard/index.html)

```html
<form id="preferences">
  <metro-checkbox name="digest" checked>Подборка за неделю</metro-checkbox>
  <metro-button type="submit">Сохранить</metro-button>
</form>
```

```js
document.querySelector('#preferences').addEventListener('submit', (event) => {
  event.preventDefault();
  const preferences = new FormData(event.currentTarget);
  console.log(preferences.has('digest'));
});
```

Внешний текст подсказки или ошибки для TextBox, PasswordBox, SpeechTextBox, ListPicker и RecurringDaysPicker можно связать с контролом через `aria-describedby` на хосте. Связи берутся из дерева хоста и объединяются с доступным описанием самого контрола. При обновлении текста или замене элемента описание обновляется вместе с ним.

## Число и оценка

| Тег | Атрибуты и свойства | Слоты и части |
| --- | --- | --- |
| `metro-slider` | `min`, `max`, `step` (по умолчанию 0–10, шаг 1, допустимо `step="any"`), `orientation` (`horizontal` или `vertical`), `show-bounds`, `value-text` | Слот `label`. Части `label`, `control`, `input`, `track`, `fill`, `thumb`, `bounds` |
| `metro-number-box` | `min`, `max`, `step` (1 или `any`), `required`, `readonly`, `placeholder`, `spin-buttons`, `increment-label`, `decrement-label`. Методы `stepUp()` и `stepDown()`. `value` равен `null` для пустого поля, `draft` возвращает редактируемую строку | Слот `label`. Части `label`, `control`, `input`, `increment`, `decrement`, `error` |
| `metro-rating` | `max` звёзд (по умолчанию 5), `step` (1 или 0.5), `required`, `readonly`, `show-value`, `value-text`, `unrated-label`. Значение 0 означает отсутствие оценки | Слот `label`. Части `label`, `control`, `input`, `stars`, `star`, `fill`, `value` |

Все три контрола принимают `name`, `label`, `disabled` и `value`. Свойство `value` содержит текущее значение, `defaultValue` читает и меняет значение для сброса формы. Движение Slider и Rating отправляет `input`, подтверждение пользователем — `change`. В NumberBox Enter и уход с поля подтверждают число, Escape отменяет редактирование. Успешное изменение отправляет `input` и `change`. Можно ввести десятичную дробь с точкой или запятой. Встроенные сообщения проверки NumberBox на английском.

Присваивание `value` и сброс формы прекращают текущий жест Slider или Rating. Если контрол отключили во время жеста, восстанавливается значение до его начала. Escape в NumberBox обрабатывает само поле только при наличии черновика.

Для Slider доступны `--metro-slider-thickness`, `--metro-slider-track`, `--metro-slider-fill`, `--metro-slider-thumb` и `--metro-slider-length`. У NumberBox фон настраивается через `--metro-number-box-background`, у Rating цвет звёзд — через `--metro-rating-empty` и `--metro-rating-fill`.

```html
<metro-slider name="volume" label="Громкость" max="100" value="40" show-bounds></metro-slider>
<metro-number-box name="limit" label="Лимит" min="1" max="30" value="10" spin-buttons></metro-number-box>
<metro-rating name="rating" label="Оценка" max="5" step="0.5"></metro-rating>
```

## Выбор даты и времени

`metro-date-picker` и `metro-time-picker` принимают `name`, `value`, `min`, `max`, `step`, `required`, `readonly`, `disabled`, `form` и `autocomplete`. Имя и пояснение задаются атрибутами или слотами `label` и `description`. Для темы доступны части `control`, `input`, `label`, `description` и токены `--metro-picker-height`, `--metro-picker-border`, `--metro-picker-bg`, `--metro-picker-fg`.

Форма и JS получают строки формата `YYYY-MM-DD` и `HH:mm` (с секундами, если они есть в значении). Пустое значение — пустая строка. Для сброса используется `defaultValue`. Присваивание `value` проходит без события. Ввод пользователя отправляет `input` и `change`. Шаг даты измеряется в днях, времени — в секундах. В режиме по умолчанию `presentation="native"` браузер отвечает за отображение, локаль и всплывающий пикер. Где поддерживается, метод `showPicker()` можно вызвать из обработчика действия пользователя.

```html
<metro-date-picker name="day" label="Дата встречи" required></metro-date-picker>
<metro-time-picker name="time" label="Время встречи" value="13:45" step="900"></metro-time-picker>
```

С `presentation="phone"` поле открывает телефонный диалог с прокручиваемыми колонками. Диалог открывается с начала, фокус получает первая колонка. Если окно короткое, дальнейший обход Tab прокручивает диалог к следующей колонке или действию. Выбор внутри диалога хранится как черновик. Подтверждение применяет допустимое значение, а при изменении отправляет по одному `input` и `change`. Escape, кнопка отмены и `closePicker()` отменяют выбор. Метод `showPicker()` открывает диалог, `pickerOpen` показывает его состояние. Укажите `locale`, `dialog-label`, `apply-label`, `cancel-label` и `placeholder`. Свойство `pickerLabels` задаёт имена колонок, например `{ day: 'День', month: 'Месяц', year: 'Год' }`. Части `trigger`, `picker-surface`, `column`, `wheel`, `selected-cell`, `apply` и `cancel` доступны для стилизации.

```html
<metro-date-picker presentation="phone" name="day" locale="ru-RU" label="Дата встречи"
  value="2026-11-19" min="2026-01-01" max="2027-12-31"
  dialog-label="Выберите дату" apply-label="Готово" cancel-label="Отмена"></metro-date-picker>
```

`metro-calendar-view` показывает григорианскую сетку дат. Используйте `value`, `min`, `max` и DOM-свойство `disabledDates` с ISO-строками. Отображение задают `locale` и `first-day-of-week` (0–6, воскресенье — 0). `showDate(date)` перелистывает календарь без изменения выбора. Если фокус был на дне, он следует за новой датой. Фокус за пределами календаря сохраняется. Стрелки перемещают фокус по дням, PageUp и PageDown — по месяцам. В узком контейнере сетка может прокручиваться по горизонтали, сохраняя день с фокусом в видимой области. Выбор отправляет `input` и `change`.

`metro-calendar-date-picker` показывает ту же сетку в диалоге. Если высоты окна недостаточно, диалог прокручивается по вертикали вслед за днём с фокусом. При высоте окна от 360 CSS-пикселей месяц закреплён над сеткой, пока пользователь перемещается по дням. В более коротком окне заголовок прокручивается вместе с сеткой. К атрибутам календаря добавляются `name`, `required`, `disabled`, `label` или слот `label` и `placeholder`. `value` отражает подтверждённую дату, `defaultValue` задаёт значение для сброса. Присваивание `value` при открытом диалоге заменяет черновик. `showPicker()` открывает календарь. Escape и `close()` отменяют черновик. `apply-label`, `cancel-label`, `clear-label`, `previous-label`, `next-label` и `dialog-label` задают локализованные подписи. Для темы доступны части `trigger`, `value`, `dialog`, `calendar-grid`, `calendar-day`, `calendar-selected`, `apply`, `cancel` и `clear`.

```html
<metro-calendar-date-picker name="deadline" label="Срок" locale="ru-RU"
  min="2026-01-01" max="2026-12-31" value="2026-11-19" required
  previous-label="Предыдущий месяц" next-label="Следующий месяц"
  dialog-label="Выберите дату" apply-label="Применить" cancel-label="Отмена">
</metro-calendar-date-picker>
```

## Выбор из списка и дни повторения

`metro-list-picker` принимает прямых детей `metro-option`. Короткий список открывается рядом с полем. Для длинного списка и при `full-screen` используется диалог. В режиме `multiple` подтверждение применяет весь черновик, а `selectedValues` возвращает массив ключей. Начальный множественный выбор можно задать атрибутом `selected` на вариантах. Если приложение присваивает `value` или `selectedValues` при открытом списке, новый выбор сразу заменяет черновик.

`metro-recurring-days-picker` принимает `value="mon wed fri"` или DOM-свойство `selectedDays`. `locale` и `first-day-of-week` меняют видимый порядок дней. Подтверждённые ключи сохраняют порядок понедельник–воскресенье. Множественный выбор отправляется отдельными значениями под одним именем в `FormData`.

У обоих компонентов доступны `name`, `required`, `disabled`, `label` или слот `label`, `placeholder`, `value`, `defaultValue`, `showPicker()` и `close()`. Только подтверждение пользователя вызывает `input` и `change`. Части доступны через `label`, `trigger`, `value`, `list`, `option`, `status`, `dialog`, `actions`, `apply` и `cancel`.

```html
<metro-list-picker name="folder" label="Папка" value="inbox">
  <metro-option value="inbox">Входящие</metro-option>
  <metro-option value="archive">Архив</metro-option>
</metro-list-picker>
<metro-recurring-days-picker name="days" label="Повторять" locale="ru-RU" value="mon wed fri">
</metro-recurring-days-picker>
```

## Цвет

`metro-color-picker` принимает `value` в формате HEX и сохраняет его как `#rrggbb`. В палитре можно выбрать образец, ввести HEX или отредактировать каналы R, G, B. DOM-свойство `palette` задаёт массив `{ value, label }`. Изменения становятся значением формы после подтверждения. Escape отменяет черновик, а `defaultValue` задаёт исходный цвет для сброса. Атрибуты `name`, `required`, `disabled` и слот или атрибут `label` работают как у других пикеров. Части доступны через `trigger`, `value`, `sample`, `preview`, `palette`, `swatch`, `hex`, `channel` и `actions`.

```html
<metro-color-picker name="accent" value="#0050ef" label="Акцент"
  dialog-label="Выберите цвет" apply-label="Применить" cancel-label="Отмена">
</metro-color-picker>
```

## Поиск с подсказками

`metro-auto-suggest-box` принимает `value`, `label` (или слот `label`), `placeholder` и `disabled`. Пользовательский ввод отправляет `metro-query` с `detail.query` и `detail.queryId`. Компонент принимает ответы через `setSuggestions(queryId, items, options?)` и возвращает `false` для устаревшего ключа запроса. В `options` можно передать `status` (`ready`, `loading` или `error`) и `message`.

Стрелки выделяют доступные подсказки, Enter подтверждает выбор или введённый текст. Событие `metro-submit` передаёт `detail.query` и, если пользователь выбрал подсказку, `detail.item`. Escape и `close()` закрывают список. Чтобы запросить подсказки для программно заданного `value`, вызовите `requestSuggestions()`.

```html
<metro-auto-suggest-box id="search" label="Поиск по папкам" clear-label="Очистить"></metro-auto-suggest-box>
```

```js
const search = document.querySelector('#search');
const folders = [{ id: 'archive', label: 'Архив' }, { id: 'drafts', label: 'Черновики' }];
search.addEventListener('metro-query', ({ detail: { query, queryId } }) => {
  const items = folders.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()));
  search.setSuggestions(queryId, items);
});
```

`suggestions-label`, `clear-label`, `loading-label`, `empty-label` и `error-label` локализуют подсказки и состояния. Список располагается под полем внутри компонента. Контейнер с ограниченным `overflow` может обрезать список. Части доступны через `label`, `control`, `input`, `clear`, `popup`, `list`, `option` и `status`.

## Диалог и всплывающие меню

| Тег | Атрибуты, свойства и методы | Слоты и части |
| --- | --- | --- |
| `metro-dialog` | `label`, `trigger-label`, `open`. `show(trigger?)`, `close(value?)`, `returnValue`, `returnFocus` | Основной слот и слот `actions` с кнопками `data-metro-value`. Части `trigger`, `surface`, `heading`, `body`, `actions` |
| `metro-flyout` | `label`, `trigger-label`, `open`, `pass-through`. `show(anchor?)`, `showAt(anchor, { x, y })`, `close()`, `returnFocus` | Основной слот принимает любое содержимое, в том числе кнопки `data-metro-close`. При открытии элемент с `autofocus` получает фокус и прокручивается в видимую область внутри слоя. Части `trigger`, `surface` |
| `metro-menu-flyout` | API открытия Flyout и DOM-свойство `commands` с массивом `{ id, label, icon?, disabled? }` | Кроме частей Flyout доступны `item`, `icon`, `label`. Стрелки, Home и End переводят фокус по доступным командам. При обновлении массива фокус сохраняется на доступной команде с тем же `id`, а меню прокручивается к ней. Если команда исчезла или отключена, фокус получает первая доступная команда или поверхность пустого меню |
| `metro-context-menu` | API MenuFlyout. `for` связывает меню с идентификатором элемента в том же документе или Shadow Root. DOM-свойство `target` позволяет передать сам элемент | Правый клик, Shift+F10, клавиша контекстного меню или удержание пальцем открывают один набор команд. При закрытии фокус возвращается к кнопке или другому фокусируемому элементу, из которого открыли меню внутри заданной области |
| `metro-drop-down-button` | `label`, `menu-label`, `disabled`, массив `commands`, методы `show()` и `close()`. Свойство `open` доступно для чтения. `returnFocus` задаёт DOM-элемент для возврата фокуса, если кнопка меню стала недоступна | Текст кнопки в слоте по умолчанию. Части `trigger`, `indicator` и части MenuFlyout |
| `metro-split-button` | API DropDownButton и `primary-command` с идентификатором основного действия (по умолчанию `primary`). Если кнопка меню стала недоступна и `returnFocus` не задан, фокус возвращается на основное действие | Слот по умолчанию для текста основного действия. Дополнительно доступна часть `primary` |
| `metro-tooltip` | `text` с коротким описанием, появляющимся при фокусе или наведении. Escape скрывает подсказку | Один фокусируемый триггер в слоте по умолчанию. Часть `surface` |

`trigger-label` включает встроенную кнопку. В программе передайте инициатор в `show()` для восстановления фокуса. `showAt` принимает координаты окна, например `event.clientX` и `event.clientY` для контекстного меню. Flyout по умолчанию перехватывает внешний клик и закрывается. `pass-through` передаёт клик нижележащему элементу.

- Dialog отдаёт начальный фокус доступному элементу с `autofocus`, если он задан. Длинный диалог открывается с начала. Если браузер выбрал саму поверхность или действие ниже видимой области, фокус переходит на заголовок, а при его отсутствии на начало содержимого. Tab продолжает обычный обход. [Рекомендации WAI-ARIA для модальных диалогов](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- Dialog отправляет отменяемое `metro-before-close` с `detail.reason` (`action`, `escape` или `programmatic`) и `detail.value`. После закрытия отправляется `metro-close` с теми же полями. Прямое присваивание `open = false` закрывает диалог сразу.
- Flyout и MenuFlyout отправляют `metro-close` с `detail.reason` (`action`, `dismiss`, `escape` или `programmatic`). Выбор команды MenuFlyout также отправляет `metro-command` с `detail.id`. Эти события всплывают и пересекают Shadow DOM.
- DropDownButton передаёт `metro-command` от своего меню. SplitButton отправляет это же событие для основного действия.
- DropDownButton и SplitButton принимают `show()` сразу после добавления в DOM. Меню открывается после отрисовки, а вызов `close()` до неё отменяет открытие. Tab и Shift+Tab закрывают меню и продолжают обход страницы.

Для фона модального слоя используйте `--metro-dialog-backdrop`. Стандартный фон MenuFlyout и ContextMenu непрозрачный, чёрный в светлой теме и белый в тёмной. Поверхность меню поддерживает `--metro-menu-bg` и `--metro-menu-fg`, рамка контекстного меню — `--metro-context-menu-border`, подсказка — `--metro-tooltip-bg` и `--metro-tooltip-fg`.

## Панель команд и временные слои

Атрибут `mode` задаёт вид закрытой панели. `default` показывает обычный ряд, `compact` сокращает его высоту, `minimal` оставляет кнопку раскрытия. Токены `--metro-command-bar-compact-height` и `--metro-command-bar-minimal-height` задают высоту. В телефонном альбомном профиле установите `orientation="vertical"` и расположите панель у конечного края страницы. Вертикальная панель использует обычную высоту кнопок и учитывает доступную длину. `hide-secondary` скрывает вторичные команды. `--metro-command-bar-bg` задаёт фон, а положение поверх содержимого или в собственной полосе задаёт CSS страницы. [Разметка почты](../examples/mail/index.html)

Метод `closeMenu()` возвращает `true`, если меню было открыто. [Панель в Phone Hub](../examples/phone-hub/)


`metro-command-bar` принимает массив `commands` и прямые дочерние `metro-app-bar-button`, `metro-app-bar-toggle-button` и `metro-app-bar-separator`. Укажите `command-id`, `label`, `icon-name`, `placement`, `priority` и при необходимости `disabled`. Программные команды идут первыми, совпадения по ключу разрешаются в пользу массива. Переполнение учитывает доступную ширину и приоритет. `fixed-overflow` сохраняет фиксированные четыре места, а смена `context` закрывает меню. В событии `metro-command` для переключателя есть `detail.checked`. У декларативной кнопки это отражённое состояние, у команды из массива приложение применяет запрос к своему массиву.

```html
<metro-command-bar label="Команды записи" more-label="Ещё">
  <metro-app-bar-button command-id="save" label="Сохранить" icon-name="save" priority="10"></metro-app-bar-button>
  <metro-app-bar-toggle-button command-id="pin" label="Закрепить" checked></metro-app-bar-toggle-button>
  <metro-app-bar-separator placement="secondary"></metro-app-bar-separator>
</metro-command-bar>
```

`metro-command-bar-flyout` использует API Flyout с дополнительными `commands`, `more-label` и `context`. Выбор закрывает слой и возвращает фокус на инициатор. `metro-popup` открывается через `show(anchor)` и закрывается через `close()`. Для явного перехода фокуса используйте `focusContent()`. `metro-teaching-tip` добавляет `heading`, `dismiss-label` и кнопку закрытия. В Popup и TeachingTip основное содержимое задаётся слотом по умолчанию.

Когда сфокусированная команда исчезает, CommandBar ищет доступный элемент своей панели. Передайте элемент исходного списка через DOM-свойство `returnFocus`, чтобы вернуть фокус туда при очистке всех команд. Dialog, Flyout и MenuFlyout также используют свой `returnFocus`, когда исходный элемент скрыт, отключён или удалён.

## Прогресс и состояние

`metro-transfer-control` отображает фоновую операцию с `transfer-id`. Используйте `phase` (`queued`, `waiting`, `transferring`, `complete`, `error`, `cancelled`), `waiting-reason`, `transferred` и необязательный `total`. При неизвестном объёме индикатор остаётся неопределённым. `metro-transfer-action` передаёт `{ id, action, phase }` при отмене или повторе. `pending` блокирует повторный запрос и сохраняет фокус на кнопке. Приложение выполняет операцию и обновляет состояние. Если кнопка с фокусом исчезает или получает HTML-атрибут `disabled`, фокус переходит к статусу передачи. Явно установленный приложением внешний фокус сохраняется.

| Тег | Атрибуты и свойства | Слоты и части |
| --- | --- | --- |
| `metro-progress-bar` | `min`, `max`, `value` (по умолчанию 0–100), `indeterminate`, `state` (`normal`, `paused`, `error`), `label`, `value-text` для описания состояния | Части `track`, `fill`, `indicator` |
| `metro-progress-ring` | `active`, `size` (`small`, `large`), `label` | Часть `ring` |
| `metro-info-bar` | `open` (изначально открыт), `severity` (`info`, `success`, `warning`, `error`), `heading`, `message`, `dismissible`, `dismiss-label` | Основной слот и `action`. Части `surface`, `heading`, `message`, `icon`, `content`, `actions`, `dismiss` |
| `metro-info-badge` | `value` для счётчика, `max` (99 по умолчанию) для ограничения отображаемой цифры, `label` для доступного имени | Без значения показывает точку или содержимое слота `icon`. Части `badge`, `dot`, `value` |

Кнопка закрытия InfoBar отправляет отменяемое событие `metro-dismiss` с `detail.reason: 'dismiss-button'`. Если фокус был внутри сообщения при закрытии или на кнопке, которую приложение убирает через `dismissible = false`, фокус возвращается на прежний доступный элемент. Чтобы показать новую ошибку или результат, обновите содержание и присвойте `open = true`.

```html
<metro-progress-bar value="42" label="Загрузка вложений"></metro-progress-bar>
<metro-info-bar severity="warning" heading="Почта недоступна" dismissible dismiss-label="Закрыть">
  <button slot="action" type="button">Повторить</button>
</metro-info-bar>
```

## Раскрытие и прокрутка

- `metro-expander` принимает `label` или слот `label` для заголовка и слот по умолчанию для содержимого. Атрибут `open` задаёт состояние. Пользовательское раскрытие отправляет `metro-toggle` с `detail.open`. При программном сворачивании или удалении элемента с фокусом из содержимого фокус возвращается на заголовок. Если приложение уже установило фокус в другом месте, он сохраняется. Части доступны через `header`, `chevron` и `content`.
- `metro-scroll-viewer` использует нативную прокрутку. Ограничьте его размер в CSS и задайте `label` для доступного имени области. `orientation` принимает `vertical`, `horizontal` или `both`. Добавьте `data-metro-no-swipe`, если горизонтальная область находится внутри Pivot. У строк с устойчивыми ключами задайте `data-metro-key`. Сохраните результат `getAnchor()` и передайте его в `restoreAnchor(anchor)` после восстановления содержимого. Если строка скрыта или исчезла, метод возвращает `false`, и приложение может выбрать другую точку возврата. Если строка стала короче сохранённого смещения, восстановление показывает её с начала. Горизонтальный якорь RTL сохраняет смещение от правого края с `edge: "right"`. Для сохранённых якорей без `edge` горизонтальное смещение по-прежнему отсчитывается от левого края.

```html
<metro-expander label="История">
  <metro-scroll-viewer label="События" style="max-block-size: 12rem">
    <p data-metro-key="a17">Письмо отправлено</p>
    <p data-metro-key="b21">Письмо получено</p>
  </metro-scroll-viewer>
</metro-expander>
```

## Коллекции

| Тег | Атрибуты и свойства | Слоты и части |
| --- | --- | --- |
| `metro-list-box` | `label`, `value`, `selectedValues`, `selection-mode`, `activatable`, `disabled`. По умолчанию одиночный выбор | Прямые дети `metro-list-item` и слот `empty`. Части `viewport`, `item`, `content`, `mark` |
| `metro-list-view` | Тот же контракт. По умолчанию список доступен для чтения. `activatable` добавляет открытие строки | Части ListBox и `row`. В строке можно использовать собственную кнопку или ссылку |
| `metro-grid-view` | Контракт ListView, `columns` задаёт число столбцов, `0` включает адаптацию | Части ListView. Для оформления доступны `--metro-grid-gap` и `--metro-grid-item-background` |
| `metro-list-item` | Уникальный `value`, необязательные `label` и `disabled` | Основной слот принимает содержимое строки |

`selection-mode` принимает `none`, `single` или `multiple`. `value` возвращает первый выбранный ключ, `selectedValues` — весь набор. Для получения только подтверждённых действий пользователя слушайте `metro-selection-change` с `detail.selectedValues` и отдельное `metro-item-activate` с `detail.value`. Свойство `items` принимает новый массив `{ value, label, disabled? }`. Присваивание `null` возвращает декларативную разметку. `getAnchor()`, `restoreAnchor(anchor)` и `focusItem(value)` помогают приложению восстановить позицию после обновления. Если старое смещение полностью скрывает укороченную строку, восстановление показывает её с начала. Это правило также применяется к LongListSelector и RefreshContainer.

```html
<metro-list-view id="contacts" label="Контакты" activatable>
  <metro-list-item value="zoe">Зоя</metro-list-item>
  <metro-list-item value="mira">Мира</metro-list-item>
</metro-list-view>
```

```js
document.querySelector('#contacts').addEventListener('metro-item-activate', ({ detail }) => {
  console.log(detail.value);
});
```

`metro-long-list-selector` принимает прямые `metro-list-group` с `value`, `label` и дочерними `metro-list-item`. Для динамических данных задайте `groups` с массивом `{ value, label, items }`. У всех строк нужны уникальные ключи. Фиксированные `item-height` и `group-height` задаются в CSS-пикселях. Виртуализованные строки используют метаданные выбора и подписи. У обычных ListView и GridView содержимое строк остаётся живой разметкой.

Слоты и части `header` и `footer` прокручиваются вместе со списком и остаются доступны при пустом наборе. Слот `empty` показывается между ними. Заголовок и подвал сохраняют роли переданных элементов и не входят в число строк сетки.

После прокрутки списка снаружи Tab переводит фокус на видимую строку. При изменении высоты окна или строк список удерживает ранее видимую строку с фокусом в области прокрутки. Ввод начала подписи переводит фокус на совпавшую доступную строку, а повтор одной буквы перебирает совпадения. Ввод префикса сохраняет текущий выбор. Атрибут `current-item` или свойство `currentItem` отмечает по ключу запись, которую приложение сейчас показывает. Отметка использует `aria-current` и сохраняется при перемещении фокуса. В режиме `multiple` Shift расширяет диапазон, а Ctrl+Shift добавляет его к уже выбранным строкам. На macOS для добавления диапазона можно использовать Command+Shift.

Quick Jump вызывается заголовком группы или кнопкой обзора. Он использует те же ключи, что и список. Пользовательский переход отправляет `metro-group-jump` с ключом группы и первой доступной строки. `jumpToGroup(value)` прокручивает список без события. `focusItem(value)` переводит фокус на доступную строку и прокручивает её в видимую область. Его можно вызвать сразу после открытия диалога со списком. `group-selection` включает групповой выбор в режиме `multiple`. Для оформления доступны части `viewport`, `row`, `item`, `mark`, `group`, `group-button`, `group-select`, `overview`, `jump-grid` и `jump-tile`.

```html
<metro-long-list-selector label="Телефонная книга" selection-mode="multiple" group-selection>
  <metro-list-group value="a" label="А">
    <metro-list-item value="alina">Алина</metro-list-item>
  </metro-list-group>
  <metro-list-group value="m" label="М">
    <metro-list-item value="mikhail">Михаил</metro-list-item>
  </metro-list-group>
</metro-long-list-selector>
```

`metro-flip-view` перелистывает прямых детей с `data-value`. Укажите `value` для начального кадра или программного перехода. Кнопки, клавиатура и завершённый горизонтальный жест отправляют `metro-change`. Если кнопка или клавиша прерывает свайп, переход сразу достигает выбранного кадра. Присваивание `value` прерывает свайп без события. При удалении кадра выбирается следующий по порядку, либо предыдущий в конце. Если вместе с кадром или кнопками навигации исчез сфокусированный элемент, фокус переходит на область просмотра. `swipe-disabled` передаёт горизонтальный ввод вложенному интерактивному содержимому, оставляя кнопки и клавиатуру. `label`, `previous-label` и `next-label` задают доступные имена, слот `empty` показывает пустое состояние. Части доступны через `viewport`, `track`, `slide`, `controls`, `previous`, `next` и `status`.

`metro-pips-pager` независимо отображает позиции. Используйте `count`, `page` (с единицы, а при пустом наборе 0), `max-visible` и `label`. Компонент оставляет видимыми границы большого набора и позиции около текущей страницы. Если страницы исчезли, уже установленный фокус остаётся на контейнере навигации и переходит на текущую страницу при её появлении. Пользовательский переход отправляет `metro-page-change` с числовым `detail.page`. Части доступны через `navigation` (также `nav`), `button`, `pip` и `overflow`. Приложение может синхронизировать PipsPager и FlipView по текущему ключу.

Оба компонента принимают шаблон `position-label`, также доступный как DOM-свойство `positionLabel`. Подставляются номер `{current}` с единицы и количество `{total}`. Например, шаблон `{current} из {total}` меняет видимый счётчик и доступное имя кадра FlipView. У PipsPager шаблон `Страница {current} из {total}` меняет доступные имена кнопок и объявление о текущей странице. Атрибуты FlipView `carousel-description` и `slide-description` задают локальные описания ролей для вспомогательных технологий.

`metro-tree-view` строит дерево из вложенных `metro-tree-item` с уникальными `value`, `label`, `expanded` и `disabled`. `value` содержит выбранный узел, `expandedValues` — раскрытые ветки. Вложенная кнопка или ссылка помещается в слот `actions`. Вправо открывает ветку или передаёт фокус ребёнку, влево закрывает ветку или возвращает к родителю, вверх и вниз идут по видимым узлам. Пользовательское раскрытие отправляет `metro-expand-change`, выбор — `metro-selection-change`, а активация при `activatable` — `metro-item-activate`.

В узком дереве отступы вложенных строк ограничены долей ширины. Длинные действия из слота `actions` могут перейти на следующую строку.

```html
<metro-tree-view label="Каталог" value="letters">
  <metro-tree-item value="archives" label="Архив" expanded>
    <metro-tree-item value="letters" label="Письма"></metro-tree-item>
  </metro-tree-item>
</metro-tree-view>
```

`metro-items-repeater` отображает массив `items` с устойчивым ключом из `keyFor(item)`. Используйте дочерний `template` с `data-metro-field` или DOM-функцию `renderItem(item, container, index)`. Контейнер строки сохраняет идентичность при перестановке. `getElement(key)` возвращает контейнер. `metro-items-view` добавляет к шаблонам выбор, активацию и режимы `layout="list"` и `layout="grid"`. В ItemsView ключ берётся из `value` элемента данных. Для обеих поверхностей доступна часть `item-content`.

`metro-semantic-zoom` принимает `groups: { value, label, anchor?, disabled? }[]`, слот `detail` и необязательный `overview`. `showOverview()`, `showDetail()` и `zoomToGroup(value)` управляют обзором. Пользовательский переход отправляет `metro-zoom-change` с полями `view` и `value` и возвращает прокрутку к сохранённому якорю или к выбранной группе. Если якорь удалён или скрыт, выбор оставляет обзор открытым без события. При возврате восстанавливается фокус внутри подробного вида или на переключателе, если прежний элемент недоступен. Если фокус уже за пределами SemanticZoom, он там и остаётся.

`metro-annotated-scroll-bar` связывается с областью прокрутки через `for` или DOM-свойство `target`. Задайте `annotations: { value, label, anchor?, disabled? }[]` для меток строк с `data-metro-key`. `scrollToAnnotation(value)` переходит к метке, а пользовательское действие отправляет `metro-annotation-change`. Если строка скрывается, её метка временно отключается и перестаёт быть текущей, а риска исчезает со шкалы до появления строки. При отключении или удалении метки с фокусом компонент переводит фокус на доступную метку либо на шкалу.

`metro-swipe-control` получает `value` строки и массив `actions: { id, label, side?, disabled?, destructive? }[]`. Горизонтальный жест раскрывает сторону `start` или `end`, а в `mode="execute"` подтверждает доступное действие при превышении порога. Событие `metro-swipe-action` передаёт ключ строки, действие и сторону. Те же команды доступны через кнопку меню и `showActions(side)`. `busy`, `disabled` и `closeActions()` помогают приложению управлять выполнением. Замена массива `actions`, смена `mode`, `openSide` или ключа строки прерывают текущий жест. Отпускание указателя после отмены не вызывает команду. Если при обновлении данных или блокировке кнопка с фокусом становится недоступна, фокус получает доступная команда раскрытой стороны, кнопка меню или область строки. С области строки Tab продолжает обычный обход. Атрибут `actions-label` задаёт имя кнопки и открытого меню. Меню закрывается при смене ключа, блокировке или исчезновении всех доступных команд.

`metro-refresh-container` отправляет `metro-refresh` при жесте с верхнего края, активации кнопки или `requestRefresh()`. Приложение подтверждает состояние через `refreshing` и сообщает результат через `status`. `getAnchor()` и `restoreAnchor(anchor)` помогают оставить список у прежней строки после получения данных. Содержимое помещается в основной слот, `scrollViewport` возвращает область прокрутки. После завершения обновления восстановление фокуса пробует прежнюю доступную кнопку, её замену с тем же `data-metro-focus` или область списка. Явно переведённый на другой элемент фокус сохраняется.

`metro-reorder-list` отображает `items` или прямых детей `metro-list-item`. Нативная ручка перетаскивания работает мышью. С клавиатуры Space или Enter начинают и подтверждают перенос, стрелки выбирают позицию и прокручивают список до маркера, Escape отменяет перенос и показывает исходную ручку. `metro-reorder-preview` передаёт предварительный порядок. В отменяемом `metro-reorder` приложение получает `{ value, before, values, source }` и применяет выбранный порядок к своим данным. Если обработчик явно переводит фокус, список его сохраняет. Компонент переставляет одну запись внутри одного списка.

### Перенос и общая подборка

`metro-collection-transfer` объединяет списки `metro-reorder-list` с уникальным `id` и атрибутом `transfer="move copy"`. Направление и место вставки выбираются ручкой перетаскивания или доступной формой в области переноса. Свойство `labels` локализует поля, кнопки и сообщения. Событие `metro-transfer-preview` передаёт `source`, `target`, `value`, `before`, `operation` и `input`. Целевой список подтверждает `metro-before-transfer` вызовом `event.detail.accept()`. Передайте строку для нового ключа или Promise для асинхронного решения. `event.detail.signal` прерывается при отмене запроса. `metro-transfer` содержит `sourceValues`, `targetValues` и `targetValue` после повторной проверки ключей. Приложение применяет обе коллекции одним обновлением. `target.focusItem(targetValue)` доступен для собственного управления фокусом.

Во время ожидания форма сохраняет фокус на кнопке подтверждения и блокирует повторную отправку. Следующий Tab переводит фокус на кнопку отмены. После переноса через форму компонент прокручивает к строке в целевом списке, после отмены возвращает фокус к видимой исходной строке.

`metro-cross-slide` оборачивает строку коллекции. Короткое поперечное движение меняет выбор. `axis="horizontal"` подходит для вертикальной ленты и `axis="vertical"` для горизонтальной. Кнопка выбора также работает с клавиатуры. Задайте `value`, `selected` и доступное имя через `select-label`. `metro-cross-slide-change` сообщает ключ, состояние `selected` и источник `slide` или `button`. Для оформления доступны части `surface`, `row`, `content`, `select` и токен `--metro-cross-slide-background`.

С `transfer-gesture` второй порог запускает перенос. `threshold` и `max-distance` задают пороги в CSS-пикселях. `metro-cross-slide-transfer` сообщает `phase` (`start`, `move`, `drop` или `cancel`), `value`, `pointerId` и координаты `clientX`, `clientY`. Внутри подходящего ReorderList и CollectionTransfer перемещение показывает место вставки, отпускание подтверждает его, а отпускание вне доступной группы снимает предпросмотр. Без `transfer-gesture` длинное движение завершает предварительный выбор.

`MetroSelectionSet` хранит выбранные ключи приложения и сверяет их с каталогом. `toggle(key, selected?)` меняет один ключ, `replaceScope(keys, selectedKeys)` меняет выбор видимой группы, `setCatalog(items)` учитывает удалённые и недоступные элементы. Читайте `values` и `selectedItems` и обновляйте представления по событию `change`. [Перенос Move/Copy](../examples/collections/index.html) · [Подборка из нескольких групп](../examples/collections/selection.html)

Для группового переноса укажите `group-key` на каждом ReorderList и задайте `transfer.selection`. Группировка использует ID списка, если отдельного ключа группы нет. Клавиатура, ручка и Cross-slide используют одну транзакцию. Вызовы `beginBatch(source, anchorValue)`, `propose(target, before, operation)` и `commit()` доступны для пользовательского интерфейса. `metro-transfer-batch-preview` передаёт `items`, `targetGroup` и позицию `before`. В `metro-before-transfer-batch` вызовите `accept()` для Move или `accept(newKeys)` для Copy. Ключи копий идут в порядке `items`. Подтверждённое `metro-transfer-batch` отдаёт `targetKeys` и `updates` для одновременного применения списков. [Групповой перенос](../examples/collections/index.html)

## Таблицы и графики

`metro-table-view` принимает `columns` с полями `key`, `label`, `sortable?`, `rowHeader?` и `rows` с `id`, `cells`, `label?`, `disabled?`. `sort` имеет поля `key`, `direction` или равен `null`. `metro-sort-change` сообщает о сортировке, `metro-row-activate` — об активированной строке, если задан `action-label`. В таблице используются нативные заголовки и ячейки. Подпись переносится по ширине видимой области и остаётся на месте при горизонтальной прокрутке. Фокус сохраняется по ключу строки или столбца. При перестановке столбцов таблица прокручивается по горизонтали, чтобы ранее видимая кнопка с фокусом оставалась видимой.

`metro-chart` принимает `categories: { id, label }[]` и `series: { id, label, values, color? }[]`, где `values` индексируются идентификаторами категорий. `type` принимает `bar` или `line`. График выводит отрицательные и положительные значения относительно нуля, а отсутствующие данные оставляют разрыв. Подписи шкалы используют `locale`, в том числе в научной записи для очень больших и малых значений. Точные значения доступны в раскрываемой таблице. Если график или открытая таблица шире компонента, до области прокрутки можно дойти через Tab и прокрутить её стрелками. При исчезновении сфокусированной области после обновления данных фокус переходит на заголовок графика. Образцы линий в легенде повторяют штрихи графика. В режиме принудительных цветов столбцы и их образцы различаются заливками и штриховкой. Для длинных наборов серии используют эти рисунки циклически. Легенда и подписи настраиваются через `label`, `locale`, `category-label`, `data-label` и `missing-label`.

## Страницы и история

`metro-frame` отображает одну прямую дочернюю `metro-page`. Укажите уникальный `value` страницы и `label` для заголовка. Страница принимает слоты `title`, `commands` и слот по умолчанию. Если в `title` передан HTML-заголовок или элемент с `role="heading"`, он сохраняет свой уровень, а часть `heading` служит именованной группой для фокуса. Для обычного текста в слоте или `label` эта часть сама является заголовком первого уровня. Части доступны через `page`, `heading` и `body`.

Приложение может явно переместить фокус в обработчике `metro-navigate`, например сразу поставить курсор в поле на открывшейся странице. Frame отдаёт этому фокусу приоритет при переходе и Back.

Используйте `frame.navigate(value, { params, state, replace })` для перехода и `frame.back()` для возврата. Текущая запись доступна как `frame.visit`. Метод `frame.saveState(snapshot)` сохраняет в ней состояние страницы. При повторном открытии одного маршрута каждое посещение получает собственные параметры и состояние. После Back фокус возвращается на прежний узел или на его замену с таким же `data-metro-focus`. При отсутствии обоих Frame фокусирует заголовок страницы.

`metro-before-navigate` и `metro-navigate` несут `detail` с полями `from`, `to` и `direction`. Первое событие можно отменить, например, чтобы запросить подтверждение ухода. `frame.value = 'list'` переключает страницу и сбрасывает локальную историю без события. При неизвестном значении Frame выбирает первую доступную страницу. URL, браузерная история и приоритет закрытия открытых слоёв принадлежат приложению.

```html
<metro-frame id="frame" value="list">
  <metro-page value="list" label="Заметки">
    <button id="open-note" type="button" data-metro-focus="note-12">Открыть заметку</button>
  </metro-page>
  <metro-page value="note" label="Заметка">
    <button id="back" type="button">Назад</button>
  </metro-page>
</metro-frame>
```

```js
const frame = document.querySelector('#frame');
document.querySelector('#open-note').onclick = () => frame.navigate('note', { params: { id: 'note-12' } });
document.querySelector('#back').onclick = () => frame.back();
```

## Разделы и путь к странице

- `metro-selector-bar` показывает несколько равноправных представлений. Используйте прямых детей `metro-radio` и свойства радиогруппы `label`, `value` и `defaultValue`. Стрелки переключают выделение, а `change` передаёт выбор обработчику через `event.currentTarget.value`. Токен `--metro-selector-indicator` задаёт цвет черты под выбранным пунктом.
- `metro-breadcrumb-bar` принимает DOM-свойство `items` с массивом `{ id, label, href? }` в порядке от корня к текущей странице. Последний элемент помечается `aria-current="page"`. Предки с `href` остаются ссылками. `label` задаёт имя навигации. Части доступны через `nav`, `list`, `item`, `link`, `text`, `current` и `separator`.
- `metro-navigation-view` принимает основное содержимое в слоте по умолчанию и DOM-свойство `items` с массивом `{ id, label, href, disabled? }`. Приложение задаёт текущий раздел в `value`. При ширине контейнера от `40rem` атрибут `placement="top"` помещает ссылки над содержимым, а `placement="side"` размещает их сбоку. В узком контейнере используется кнопка меню с подписью `menu-label`. Escape или `closeMenu()` закрывают меню и возвращают фокус на кнопку. `open` управляет показом в узком режиме, `label` задаёт имя навигации. С атрибутом `show-back` доступна кнопка `back-label`, которую приложение включает через `canGoBack`. Она отправляет `metro-navigation-back`. Части доступны через `toggle`, `back`, `nav`, `list`, `item`, `link` и `content`. Ширина боковой панели настраивается через `--metro-navigation-width`. [Верхняя навигация с Frame](../examples/navigation/index.html)

BreadcrumbBar и NavigationView отправляют соответственно `metro-breadcrumb` и `metro-navigation` с `detail.id` и `detail.href`. В SPA можно отменить стандартный переход через `preventDefault()` и передать адрес роутеру. Ссылки сохраняют обычное открытие через Ctrl/Cmd+Click.

В компактном NavigationView длинный список прокручивается внутри меню. При открытии текущий раздел выводится в видимую область. Если обработчик `metro-navigation` переносит фокус на новую страницу, меню закрывается с сохранением этого фокуса.

## Panorama и Hub

`sectionsInView` возвращает ключи видимых секций по порядку, `firstVisible` — ключ первой. Событие `metro-sections-in-view-change` передаёт `{ values, first }` при изменении видимости. Для панели команд Phone Hub используйте первую видимую секцию. Для записи текущего раздела в состояние страницы используйте подтверждённый `value` из `metro-change`. [Пример команд секции](../examples/phone-hub/)


`metro-panorama` и `metro-hub` принимают прямых детей `metro-hub-section` с устойчивыми `value` и видимыми `label`. У секции можно задать `href` для обычной ссылки в заголовке и `hero` для обзорной секции. `heading` подписывает весь обзор, `label` задаёт доступное имя, слот `background` принимает декоративный фон.

При стандартной ширине секций Panorama после горизонтального свайпа или прокрутки трекпадом доводит выбранную секцию до края области просмотра. Рядом остаётся виден край следующей. Если секция шире области просмотра, трекпадом можно остановиться и внутри неё.

Hub использует `profile="phone"` или `profile="desktop"`. В широкой раскладке desktop видны несколько секций, в узкой они выстраиваются вертикально. `loop` принимает `auto`, `always` или `never`. Автоматический цикл работает от двух секций в Panorama и от трёх в Phone Hub. Свайп или навигация с клавиатуры отправляют `metro-change` с `detail.value` после завершения переключения. Прямое присваивание `value` проходит без события. `focusSection(value?)` фокусирует заголовок секции. Ссылка передаёт отменяемое событие `metro-section-open` с ключом, адресом и инициатором. Вложенной интерактивной области можно отдать ось жеста через `data-metro-no-swipe`.

```html
<metro-panorama heading="Музыка" value="recent">
  <metro-hub-section value="recent" label="Недавние" href="/music/recent" hero>
    <p>Последние добавленные альбомы</p>
  </metro-hub-section>
  <metro-hub-section value="artists" label="Исполнители">
    <p>Найдите исполнителя в коллекции</p>
  </metro-hub-section>
</metro-panorama>
```

`metro-lockable-pivot` использует те же панели `metro-pivot-item`, что и Pivot. Атрибут или свойство `locked` удерживает текущую панель, убирает соседние вкладки из ряда и прерывает текущий свайп. Содержимое выбранной панели остаётся доступным. После снятия блокировки соседние вкладки возвращаются, а новый свайп можно начать с нового касания.

## Документные вкладки

`metro-tab-view` отображает прямых детей `metro-tab-view-item` с уникальными `value`, названиями `label` и основным слотом содержимого. У вкладки можно задать `closable` и `disabled`. При закрытии последней вкладки отображается слот `empty`. Стрелки двигают фокус по заголовкам, Enter или Space активируют документ. Пользовательский выбор отправляет `metro-change`. Сочетания Ctrl+Tab и Ctrl+F4 работают, когда браузер передаёт их странице.

При смене `value`, ширины ряда или направления письма ряд прокручивается к заголовку с фокусом. Если фокус вне ряда, прокрутка показывает выбранный заголовок и оставляет фокус на текущем элементе.

`closeTab(value)` запрашивает закрытие. Обработчик `metro-before-tab-close` может отменить его или передать в `detail.waitUntil(promise)` результат сохранения либо диалога. Обещание должно разрешиться в `true` для подтверждения. `metro-tab-close` приходит после удаления вкладки. `reorderable` включает нативное перетаскивание с меткой вставки. `moveTab(value, index)` переставляет вкладку через API.

`transferTab(value, { target, item?, index? })` передаёт сеанс после того, как целевой TabView примет его. В текущем документе переносится существующая разметка. В другом окне того же сайта приложение создаёт целевой `item` с тем же `value`; TabView передаёт ему исходный объект `session`. Целевой TabView может отменить `metro-before-tab-receive`. Приложение хранит черновик, адрес и историю в `session` и отвечает за открытие окна. Ожидающий запрос закрытия применяется в текущем окне-владельце после переноса. Части доступны через `tablist`, `tab`, `close`, `panel` и `empty`. [Рабочая область с двумя окнами](../examples/workspace/index.html)

`detachable` отправляет `metro-tab-detach-request` после сброса заголовка на страницу за пределами ряда вкладок. Обработчик может сразу запросить окно и передать в `event.detail.accept(destination)` готовое назначение или Promise его подготовки. `null` сохраняет текущего владельца. Элемент с `data-metro-no-detach` исключает свою область из этого жеста. Политика открытия окна определяется браузером.

Для сброса на ряд другого окна настройте принимающий TabView с `reorderable` и DOM-свойством `dragAdapter`. `peers()` возвращает разрешённые исходные TabView того же origin, `canReceive?(detail)` разрешает предпросмотр и вставку, `createItem(detail)` создаёт вкладку в принимающем документе. Одинаковый `data-metro-focus` на элементах двух представлений позволяет восстановить фокус после переноса. Для метки вставки используется `--metro-tab-drop-indicator`. [Код открытия и возврата окна](../examples/workspace/workspace.js)

## Адаптивные панели

- `metro-list-details` размещает содержимое из слотов `list`, `details` и `empty`. Приложение выбирает объект через `value` либо `showDetails(value, source?)`. `back()` закрывает карточку и возвращает фокус на исходный доступный элемент списка, затем пробует замену с тем же `data-metro-focus`. Если ни один из них не может получить фокус, он переходит на панель списка. В компактной карточке Escape вызывает Back. При фокусе во вложенном модальном диалоге Escape обрабатывает сам диалог. `metro-before-details-change` можно отменить, а `metro-details-change` передаёт новый ключ и причину. Смена ширины сохраняет DOM обоих слотов и не отправляет событие перехода. Части доступны через `list`, `details` и `back`.
- `metro-two-pane-view` принимает слоты `first` и `second`. `wide-mode` и `tall-mode` принимают `first-second`, `second-first` или `single`. `min-wide-width` и `min-tall-height` задают пороги в CSS-пикселях. При одном видимом слоте выбор делает `pane-priority`. Текущее значение `mode` и событие `metro-layout-change` отражают раскладку.
- `metro-split-view` использует слоты `pane`, `compact` и основной слот. `display-mode` принимает `inline`, `overlay`, `compact-inline` или `compact-overlay`. Атрибут `placement` выбирает `start` или `end`, `open` управляет состоянием. `showPane(source?)` и `closePane()` отправляют `metro-pane-change` с `detail.open`. Escape закрывает панель в режиме наложения. Фокус возвращается на `source` или кнопку панели, если источник стал недоступен. При смене режима фокус из скрытой компактной колонки переходит на кнопку, а из содержимого, ставшего недоступным под наложением, в открытую панель. `--metro-split-pane-size` и `--metro-split-compact-size` задают ширины.

## Иконки

`metro-icon` рисует именованный монохромный знак, унаследовав цвет текста. `metroIconNames` содержит имена знаков, включая `add`, `check`, `close`, `search`, `delete`, `save`, `folder`, `mail`, `settings` и `play`. Для своей иконки используйте основной слот. У знака с самостоятельным смыслом задайте `label`. Без него иконка скрыта от средств доступности.

`metro-animated-icon` меняет один знак на другой при присваивании `name`. `duration` задаёт длительность в миллисекундах. Включение `prefers-reduced-motion`, атрибут `hidden` и удаление из DOM отменяют выполняемый переход. У обоих тегов есть части `glyph` и `icon` и токены `--metro-icon-size` и `--metro-icon-stroke`. В командах используйте `iconName` для готового знака или `icon` для символа.

```html
<metro-button><metro-icon name="save"></metro-icon> Сохранить</metro-button>
<metro-icon name="mail" label="Непрочитанные письма"></metro-icon>
```

## Типографика и компоновка

| Тег | Контракт |
| --- | --- |
| `metro-text-block` | `variant` принимает `body`, `subtle`, `small`, `title1`, `title2`, `title3`, `large`, `group-header`, `contrast`, `accent` или `huge`. `level` задаёт семантический уровень заголовка. `trim` принимает `wrap`, `ellipsis` или `balance`. Основной слот либо `text`, часть `text` |
| `metro-rich-text-block` | Те же варианты, обычные абзацы, заголовки и ссылки в слоте. `--metro-prose-width` управляет шириной, часть `content` |
| `metro-label` | Оформляет вложенный нативный `label` с обычным `for`. Используйте `--metro-label-size` и `--metro-label-color` |
| `metro-stack-panel`, `metro-wrap-panel` | Располагают дочерние узлы вертикально или горизонтально через `orientation`. Горизонтальный WrapPanel переносит элементы на новые строки по доступной ширине. Для переноса в соседние колонки задайте `orientation="vertical"` и ограничьте высоту компонента через `block-size` или `max-block-size`. Размеры промежутков задаёт `--metro-layout-gap`, часть `panel` |
| `metro-grid` | `columns` и `rows` принимают число равных дорожек или список размеров CSS Grid. `--metro-grid-column` и `--metro-grid-row` на дочернем узле задают его позицию, часть `grid` |
| `metro-canvas` | Задавайте координаты и слой на каждом дочернем элементе. `--metro-canvas-x` отсчитывается от начала строки, `--metro-canvas-y` от начала блока, `--metro-canvas-layer` управляет наложением внутри холста. У вложенного Canvas дочерние элементы без заданных координат начинаются с его собственного начала и слоя `auto`. Задайте высоту через `--metro-canvas-height`, часть `canvas` |
| `metro-border` | Оформляет слот внутренней рамкой. `--metro-border-width`, `--metro-border-color`, `--metro-border-padding`, часть `surface` |
| `metro-content-presenter`, `metro-content-control` | Основной слот или DOM-свойство `content` с текстом, числом либо DOM-узлом. ContentControl добавляет слоты `header` и `footer` и токен `--metro-content-padding` |
| `metro-shape` | `kind` принимает `rectangle`, `ellipse`, `line` или `polygon`. У многоугольника `points` — массив координат `{ x, y }` в области 0–100. `label` даёт доступное имя. Без него фигура декоративная. Размеры задают `--metro-shape-width` и `--metro-shape-height`, цвет и обводку — `--metro-shape-color`, `--metro-shape-fill`, `--metro-shape-stroke` и `--metro-shape-stroke-width`. Часть `shape` |

```html
<metro-stack-panel style="--metro-layout-gap: 1rem">
  <metro-text-block variant="title2" level="2">Контакты</metro-text-block>
  <metro-label><label for="search">Имя контакта</label></metro-label>
  <input id="search" type="search">
</metro-stack-panel>
```

## Медиа, карта и документ

- `metro-media-player` использует нативный элемент `media`. Укажите `kind="audio"` либо `"video"`, `src` либо массив `sources` и при необходимости `poster`, `muted`, `autoplay`, `loop`, `preload`. DOM-свойство `tracks` передаёт дорожки. `play()`, `pause()`, `seek(seconds)` и `state` позволяют нескольким экранам работать с одной сессией. `metro-media-state` раздельно передаёт позицию, воспроизведение, ожидание буфера и диапазоны загруженных данных. `native-controls` включает панель браузера, в том числе его выбор субтитров. `hide-controls` подходит для собственной панели. Во встроенной панели отключение сфокусированной перемотки или удаление полноэкранной кнопки переводит фокус на Play. При смене панелей сохраните элемент в DOM. Части доступны через `player`, `media`, `controls`, `play`, `seek`, `time`, `mute`, `fullscreen` и `status`. [Копируемый архив записей](../examples/media/index.html)
- `metro-image` принимает `src`, `srcset`, `sizes`, `alt`, `width`, `height`, `loading` и `fit`. У ошибки есть слот `fallback` и событие `metro-image-error`. Если источник пуст или не загрузился, при пустом слоте отображается текст `alt`. `metro-image-load` передаёт исходные размеры. `metro-image-brush` использует изображение как декоративный фон за основным слотом. Для аватара `metro-person-picture` принимает `name`, `src`, `initials` и слот `badge`. До успешной загрузки текущего источника аватар показывает инициалы или значок человека. При смене `src` результат прежней загрузки не влияет на портрет. Размер круга задаёт `--metro-person-size`. `--metro-person-font-size` задаёт верхний размер текста, а в компактном круге инициалы уменьшаются. Значок расположен у нижнего края круга со стороны конца строки, даже если сам элемент растянут по ширине.
- `metro-multi-scale-image` принимает `src`, `alt`, `zoom` и `max-zoom`. Кнопки, клавиши, двойной клик и пинч меняют масштаб. При увеличении стрелки или указатель перемещают изображение. Сохраняйте `view` с полями `zoom`, `x`, `y` для возврата и меняйте его программно. Присваивание `zoom` или `view` прерывает незавершённый жест без события. Кнопки и клавиши масштабируют последнее подтверждённое положение. `metro-image-view-change` приходит после действия пользователя. В увеличенном состоянии область сама обслуживает свайп. При отмене указателя, потере захвата, изменении размеров или источника незавершённый жест возвращает последнее подтверждённое положение без события изменения. Если кнопка масштаба становится недоступной, фокус переходит к изображению и команды масштаба остаются доступны с клавиатуры.

`MediaPlayer.play()` после присваивания источника использует новый источник. Promise предыдущего вызова по-прежнему сообщает свой результат, а состояние проигрывателя определяется текущей записью. Присваивание `MultiScaleImage.view` прерывает текущий жест без `metro-image-view-change`.
- `metro-map-view` принимает координаты, `zoom`, `markers` и при наличии `userLocation`. DOM-функция `tileSource({ x, y, z })` подаёт тайлы по схеме XYZ/Web Mercator. Без провайдера отображается координатная сетка. `metro-map-view-change` передаёт `view` и `bounds`, `metro-map-select` — метку. `metro-map-locate` запрашивает определение позиции у приложения. Для атрибуции поставщика используйте слот `attribution`. Если метка с фокусом уходит за пределы карты, фокус переходит к той же точке в списке. При исчезновении точки используется выбранная запись, первая доступная точка или область карты. Если кнопка масштаба становится недоступной, фокус переходит к карте, где работают стрелки и клавиши масштаба.
- `metro-web-view` открывает `src` в iframe. В режиме `history-enabled` он ведёт собственную историю вызовов `navigate(url)` и обычных ссылок доступного iframe. Переход к якорю и Back внутри того же документа сохраняют его DOM. `back()` возвращает `false`, когда Back пора передать хосту. При отключённых скриптах WebKit отслеживает доступные переходы iframe, а браузер может также добавить их в свою историю. Настройки `sandbox`, `allow` и ограничения на встраивание определяют доступ к содержимому. Для документа другого сайта событие загрузки сообщает `documentAccessible: false`. Для известной хосту ошибки есть `reportError(message)` и `reload()`. При тайм-ауте или ошибке во время загрузки незавершённый iframe удаляется. Retry загружает тот же адрес без новой записи в истории. Если Back или Forward становится недоступной, фокус переходит на оставшуюся кнопку навигации или в документ. При ошибке в документе с фокусом он переходит на Retry, а повторная загрузка возвращает его в документ.

## Файлы, речь и рукописный ввод

Пример импорта использует `share_target` для входящей формы и `file_handlers` вместе с `launchQueue` для запуска с файлом. Service worker сохраняет входящие данные в IndexedDB. Страница показывает действие и раздел назначения до подтверждения. Локальный `metro-file-picker` проходит через ту же проверку. Системные входы зависят от поддержки и установки PWA. [Входящие файлы](../examples/imports/index.html)

- `metro-file-picker` использует системный выбор файла через нативный input. `accept`, `multiple`, `capture`, `name` и `required` настраивают его как часть формы. `metro-file-select` передаёт массив `files` и идентификаторы запроса и контекста. После смены `context-key` прежний результат или отмена игнорируются, даже если открыт новый выбор. `metro-file-cancel` сообщает об отмене текущего запроса. Свойство `files` содержит выбранные файлы, `clear()` очищает его.
- `metro-speech-text-box` сохраняет обычный ввод текста и добавляет распознавание через `speechAdapter` или Web Speech API в поддерживаемой среде. Черновик распознавания требует явного подтверждения. Если сфокусированная команда или вариант исчезает, фокус переходит на кнопку запуска, а при её недоступности в поле ввода. Явно установленный приложением внешний фокус сохраняется. `metro-speech-recognized` можно отменить до вставки. Для управления запросом доступны `startRecognition()`, `cancelRecognition()`, `speechAvailable` и `speechStatus`.
- `metro-ink-canvas` хранит `strokes` с нормализованными координатами, размером и инструментом. Перо и мышь работают сразу, сенсорное рисование включается через `draw-touch`. `serialize()` и `restore(json)` сохраняют данные штрихов. `undo()`, `clear()` и инструменты пера и ластика доступны с клавиатуры. `metro-ink-change` передаёт сохранённые штрихи и причину изменения. Незавершённый штрих использует инструмент, цвет и толщину, выбранные при начале ввода. Изменение размеров холста отменяет этот штрих и сохраняет завершённые аннотации. Слот `description` добавляет текстовое описание аннотации. Ctrl+Z и Cmd+Z отменяют штрих при фокусе в панели инструментов. В элементах слота работает обычная отмена браузера. Если кнопка отмены или очистки теряет доступность из-за пустой истории, фокус переходит к текущему инструменту.
- `metro-share-button` принимает `text`, `url`, `share-title` или DOM-свойство `data` с текстом, ссылкой и файлами. Кнопка обращается к `shareAdapter` или Web Share после действия пользователя. `copy-fallback` показывает отдельную команду копирования. Если она исчезает с фокусом, компонент переводит его на доступную основную кнопку. Явно установленный приложением внешний фокус сохраняется. `metro-share-result` передаёт метод, результат и ключ контекста.
- `metro-camera-capture` показывает видоискатель, предпросмотр, повтор съёмки и подтверждение. `facing-mode` принимает `environment` или `user`, `file-fallback` добавляет выбор изображения, а `file-name` задаёт имя снимка камеры. Укажите `context-key` или `contextKey` для назначения, к которому относится снимок. `metro-camera-capture` передаёт `file`, `source`, `requestId` и `contextKey` после подтверждения. `metro-camera-cancel` передаёт ключи запроса и контекста при отмене. `cameraLabels` и `cameraMessages` дают приложению локализовать команды и состояния.
- Камера запускается кнопкой или `start(event)` из доверенного действия пользователя. `cancel()` освобождает ресурсы. Смена контекста, отключение элемента и уход со страницы закрывают текущий запрос. `cameraAvailable` и `cameraState` доступны для чтения. Свойство `cameraAdapter` позволяет делегировать открытие, съёмку и закрытие хосту. По умолчанию используется `getUserMedia` в защищённом контексте. Части `viewfinder`, `preview`, `actions`, `status` и токены `--metro-camera-height`, `--metro-camera-bg` управляют оформлением. Атрибут `direct` передаёт кадр сразу после нажатия кнопки съёмки. Выбор файла по-прежнему открывает предпросмотр. [Редактор и хранилище фотографий](../examples/camera/README.md) · [Копируемый пример камеры](../examples/camera/index.html)
- `metro-reminder` показывает `heading`, `message`, `scheduled-at` и состояние `state`. Событие `metro-reminder-action` передаёт `open`, `snooze` или `dismiss`, стабильный `id` и время. Если сфокусированная команда исчезает или получает HTML-атрибут `disabled`, фокус переходит на статус. Явно установленный приложением внешний фокус сохраняется. Планирование, повторение и выбор записи после активации принадлежат хосту.

## Плитки и уведомления

- `metro-live-tile` и `metro-hub-tile` принимают `mode="flip"`, `"cycle"` или `"iconic"`. `publish(content)` применяет данные с возрастающим `version`. Поля `front`, `back`, `frames`, `count`, `status` и `sizes` задают представления. Пропущенное поле сохраняется, `null` очищает его. Обновление только счётчика или статуса сохраняет текущий кадр и расписание смены кадров. Новое содержимое последовательности начинает её с первого кадра. Анимация выполняется только для видимой плитки, останавливается при фокусе, `paused` и уменьшенном движении. Оба тега сохраняют нативную ссылку с `href`, `target` и `rel`.
- `metro-toast` принимает `notification` либо `show(notification, source?)`. `duration` задаёт время в миллисекундах, ноль оставляет сообщение до закрытия. Таймер приостанавливается при наведении, фокусе и скрытии вкладки. Если сфокусированная команда исчезает при замене уведомления, фокус переходит на новую команду или на кнопку закрытия, и таймер остаётся на паузе. При закрытии сфокусированного Toast фокус возвращается на `source`, переданный для текущего уведомления. `metro-notification-center` читает долговременный массив `notifications` приложения. Обе поверхности отправляют `metro-notification-activate` со стабильным ключом, объектом и источником. `metro-notification-dismiss` передаёт причину, а `metro-notifications-clear` запрашивает очистку списка. Записи и маршруты принадлежат приложению. [Копируемый архив записей](../examples/media/index.html)
- `metro-status-bar` показывает переданные приложением `time`, `signal`, `battery`, `charging`, `progress` и `busy`. Для именования есть атрибуты `network-label`, `battery-label`, `charging-label` и `progress-label`. Отсутствующие значения скрываются. Части доступны через `status`, `signal`, `battery`, `time` и `progress`.
- `metro-title-bar` принимает `heading`, основной слот, слоты `start` и `actions` и необязательный `windowAdapter`. Кнопки появляются для реализованных действий хоста. `metro-window-action` можно отменить. Пока хост обрабатывает команду, её кнопка сохраняет фокус и сообщает недоступность через `aria-disabled`. Разворачивание и восстановление блокируют друг друга до завершения запроса. В обычном браузерном режиме кнопки могут перейти на отдельную строку, если заголовку и командам не хватает места. Атрибут `overlay` использует геометрию Window Controls Overlay, если её предоставляет браузер установленного приложения.
- Модуль `windows-phone-metro-ui/shell-host` экспортирует `requestMetroSecondaryTile`, `unpinMetroSecondaryTile` и `publishMetroLockScreen`. Операции используют адаптер возможностей хоста и возвращают `applied`, `declined` или `unsupported`.

### Вход в приложение и системные планировщики

`MetroActivationScope` принимает `activate(entry)` для обычного запуска, файла, ссылки, протокола, плитки, уведомления и напоминания. `resolve(entry, signal)` преобразует вход в `{ identity, route, params?, state? }` по текущим данным. Функция `current()` возвращает ключ уже открытого назначения, а `navigate(destination, entry)` применяет маршрут через Frame или роутер. При новом входе или вызове `cancel()` устаревший результат получает `superseded`. Результаты `opened`, `current`, `unavailable` и `blocked` позволяют приложению выбрать нужное сообщение и политику возврата. [Запуск с прямой ссылкой и восстановлением](../examples/launch/index.html)

`new MetroReminderScheduler(host)` ставит или заменяет напоминание через `schedule({ id, scheduledAt, title, destination })`. `scheduledAt` задаётся временем Unix в миллисекундах. Хост реализует `reminders.upsert(request)` с заменой по тому же ID и `reminders.cancel(id)`. Один экземпляр диспетчера выполняет операции по каждому ID в порядке поступления. Приложение обновляет интерфейс по подтверждённому результату, хранит правило повтора и получает факт доставки от хоста. Браузер без адаптера планирования возвращает `unsupported`.

`new MetroBrowserNotifications(registration)` публикует системные уведомления через активный service worker. Из обработчика кнопки вызовите `requestPermission()`, затем `publish({ id, title, destination, expiresAt? })`. Адрес назначения относится к области того же service worker. `dismiss(id)` отзывает уведомление, `pruneExpired()` закрывает просроченные, `readMetroNotificationActivation(event.notification, registration.scope)` читает ещё актуальное назначение в `notificationclick`. Обработчик worker, открытие окна и актуальность данных приложения принадлежат приложению. [Журнал с открытием уведомления](../examples/notifications/index.html)

`publishMetroAppBadge(unreadCount)` обновляет счётчик установленного веб-приложения через доступный браузерный Badging API. Ноль очищает счётчик. Положительное целое берётся из модели приложения. Операция возвращает `applied`, `declined` или `unsupported`.

## Back и команды с клавиатуры

Из `windows-phone-metro-ui/input-scope` импортируются `MetroBackScope` и `MetroKeyboardScope`. Оба доступны из браузерного модуля.

- `MetroBackScope` первым запрашивает закрытие последнего открытого слоя, затем вызывает обработчики `keyboard`, `mode`, `navigation` и `host`. `enterLayer(dismiss, active?)` регистрирует открытие и возвращает функцию снятия регистрации для самостоятельного закрытия слоя. `false` удерживает управление в слое. Обработчик этапа возвращает `handled`, `blocked` или `pass`, чтобы продолжить поиск. Параллельные вызовы `requestBack()` получают результат одного выполняющегося действия. Кнопку, системное событие и вызов роутера приложение связывает само.
- `MetroKeyboardScope` слушает события внутри переданного элемента. `commands()` возвращает актуальные команды с `id`, `run(event)`, `disabled`, сочетаниями `keys` и необязательной `accessKey`. Для редактируемых полей доступность сочетания включается свойством `allowInEditable`. `exclusive` удерживает сочетания внутри вложенной области, `active()` включает область по её состоянию. `renderTips` получает подсказки после отдельного Alt и пустой массив при закрытии. При демонтаже области вызовите `dispose()`. [Команды редактора, Back и черновик](../examples/editor/index.html)

### Экранная клавиатура и видимая область

`MetroFormViewport` из `windows-phone-metro-ui/form-viewport` отдаёт в `snapshot` и событии `change` размеры `layout`, `visible`, `usable` и `scale`. Прямоугольники используют CSS-пиксели относительно layout viewport. `visible` следует за VisualViewport. `usable` учитывает нижнее перекрытие клавиатурой, которое подтверждает VirtualKeyboard. `keyboard` равен `null`, если браузер не сообщает состояние клавиатуры.

Добавьте `viewport.handleBack() ? 'handled' : 'pass'` в этап `keyboard` у MetroBackScope. `canHandleBack` отражает наличие доступного запроса скрытия. Нативный `hide()` зависит от политики `virtualkeyboardpolicy="manual"` у активного поля, предшествующего действия пользователя и среды. Факт закрытия приходит в изменении геометрии. При демонтаже вызовите `dispose()`. [Редактор с видимой командой сохранения](../examples/keyboard/index.html)

## Эффекты движения

```html
<metro-navigation-transition transition="turnstile-feather">
  <metro-frame value="list">
    <metro-page value="list" label="Записи"><p data-metro-feather>Последние записи</p></metro-page>
    <metro-page value="detail" label="Детали"><p data-metro-feather>Описание записи</p></metro-page>
  </metro-frame>
</metro-navigation-transition>
```

- `metro-navigation-transition` реагирует на принятый переход Frame. Укажите `transition="turnstile"`, `"turnstile-feather"`, `"slide"`, `"fade"`, `"connected"` или `"none"`. Для ручного запуска есть `play(target, direction?, phase?)` и `cancel()`. При импорте по отдельности подключите модули Frame и перехода.
- `metro-slide-in-effect` задаёт `from="start|end|top|bottom"` и `distance` в CSS-пикселях. `metro-turnstile-feather-effect` последовательно анимирует прямых детей или элементы `data-metro-feather`, с атрибутами `direction`, `phase` и `stagger`. Для обоих доступны `play()`, `cancel()`, `duration`, `autoplay` и `event` с именем всплывающего события.
- `metro-tilt-effect` добавляет обратную связь при нажатии указателем или клавиатурой. Обычные кнопки и ссылки работают сразу. `data-metro-tilt` помечает дополнительную интерактивную цель, а `data-metro-no-tilt` исключает участок. Все эффекты учитывают `prefers-reduced-motion`.

Атрибут `hidden` отменяет запущенный эффект. Tilt также сбрасывает нажатие, если цель удалена, скрыта или отключена во время удержания.

[Подключение, Pivot, CommandBar и Tile](../README.md#публичный-api) · [Копируемый пример настроек](../examples/controls/index.html)

Для перехода между карточкой и деталями укажите ключ на обоих визуальных элементах и передайте тот же ключ переходу. Приложение может обновить `connectedKey` перед `frame.navigate()` или `frame.back()`. Компонент измеряет источник перед сменой страницы, а затем анимирует появление соответствующей цели. Скрытая, удалённая или прокрученная за пределы своей области карточка даёт обычное появление страницы. При уменьшенном движении переход происходит сразу. [Пример галереи](../examples/photos/)

```html
<metro-navigation-transition transition="connected" connected-key="coast">
  <metro-frame id="gallery" value="list">
    <metro-page value="list"><button data-metro-connected="coast">Маяк</button></metro-page>
    <metro-page value="photo" label="Детали"><h2 data-metro-connected="coast">Маяк</h2></metro-page>
  </metro-frame>
</metro-navigation-transition>
<script type="module">
  const frame = document.querySelector('#gallery');
  frame.querySelector('button').onclick = () => frame.navigate('photo');
</script>
```
