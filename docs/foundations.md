# Принципы и визуальная грамматика

[Оглавление](../README.md) · [Компоненты](components.md) · [Сценарии](flows.md) · [Первоисточники](sources.md)

## Принципы по поколениям

В предрелизном гайде Windows Phone 7 отправной точкой служит графика городской навигации. Размер и положение слов задают порядок чтения, пространство разделяет группы, а обрезанный край горизонтальной композиции приглашает к следующему движению. Пять принципов руководства охватывают ясный и быстрый интерфейс, приоритет содержимого, согласованность с устройством, осмысленное движение и персональное живое состояние. На уровне приложения это узнаётся по крупным заголовкам, минимуму постоянной обвязки, общесистемному Back и изменяемым плиткам. [Windows Phone 7 UI Design and Interaction Guide, стр. 8–17](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=5)

Перед описанием внешнего вида гайд Windows Phone 7 задаёт три направления для задач приложения. **Personal** связано с личным распорядком и выбором. **Relevant** означает актуальный контекст людей и места. **Connected** относится к доступу к своим данным и связям. На уровне сценария это видно, когда плитка открывает сохранённое назначение, а обзор показывает важное для текущего контекста. [Философия Windows Phone 7, стр. 8–9](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=5)

Во вступлении для Windows Phone 8.1 Microsoft вновь связывает визуальный язык с простотой швейцарской типографики и навигационной графикой транспорта. Движение помогает понять, в какой части приложения оказался пользователь и как он туда попал. В Hub это выражается в согласованном смещении фона, общего заголовка и секций. [Вступление к библиотеке дизайна Phone 8.1](https://web.archive.org/web/20140410153319id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn642029.aspx) · [Оригинальный гайд Phone Hub](https://web.archive.org/web/20140408233046id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn596112.aspx)

Dev Center Phone 8 описывает пять этапов. Концепция задаёт основную задачу, структура распределяет содержимое по экранам, взаимодействие определяет переходы и реакции, визуальный этап уточняет сетку, типографику и оформление, а прототип позволяет проверить всё вместе. В опубликованном примере Audible обзорный Hub даёт входы в библиотеку, магазин и статистику, а конкретная задача продолжается глубже. Для библиотеки это даёт способ проверять компонент в составе задачи с реальным переходом и состоянием возврата. [Process в Dev Center](https://web.archive.org/web/20130127123808id_/http://dev.windowsphone.com:80/en-us/design/process) · [App design process for Windows Phone](https://web.archive.org/web/20121105014709id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh202873(v=vs.105).aspx)

В шаблоне Microsoft для краткого дизайн-брифа команда формулирует аудиторию, цель и основную ценность продукта, затем объясняет, какие решения её поддерживают и какой тон нужен. Для библиотечного примера эти поля уточняют, почему выбран конкретный сценарий и по какому результату судить, что он работает. [Design Brief Template](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/Design_Brief_Template.docx)

Руководство Phone 8.1 сначала предлагает описать задачи и их приоритеты, затем сделать эскизы основных и временных состояний. Карта приложения показывает иерархию экранов. Карта отдельной задачи показывает последовательность действий, например от поиска до карточки результата. Для проверки прототипа Microsoft предлагает наблюдать, как человек понимает задачу и проходит её самостоятельно. [App conceptualization](https://web.archive.org/web/20140618190015id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn596096.aspx) · [Design the best app you can](https://web.archive.org/web/20140618112350id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596108.aspx)

В настольном руководстве **Defining vision** главную пользу приложения формулируют одним предложением. Этой формулировкой проверяют, какие задачи войдут в прототип и где помогают возможности платформы. Например, сценарий совместной поездки связывает добавление мест, обсуждение маршрута и отправку приглашения. Для каждой задачи описывают последовательность действий до выбора контролов. [Defining vision](https://web.archive.org/web/20140410154330id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/hh465427.aspx)

Dev Center Phone 8 и гайд Windows Store 8.1 формулируют пять общих принципов. Внимание к деталям распространяется на сетку, типографику и доступность. Быстрый, плавный ответ поддерживает непрерывное касание. Цифровая среда позволяет живым данным и типографике менять представление. Сосредоточенность оставляет на экране элементы, нужные для задачи. Интеграция использует общие контракты платформы и позволяет приложениям работать вместе. [Principles в Dev Center](https://web.archive.org/web/20130111181057id_/http://dev.windowsphone.com:80/en-us/design/Principles) · [Windows 8.1 UX guidelines, стр. 7–10](https://tilsgee.github.io/DesignGuidelinesArchive/uwp8.1.pdf#page=7)

Современная Windows Design раскладывает практику по цвету, типографике, навигации, командам, компоновке, геометрии, слоям и движению. Windows 11 описывает собственные материалы и подход к многослойности. Для библиотеки полезно заимствовать систематическую работу с темами, фокусом и адаптивностью и оставить визуальную палитру мобильного Metro самостоятельным профилем. [Windows Design guidelines](https://learn.microsoft.com/en-us/windows/apps/design/guidelines-overview) · [Commanding basics](https://learn.microsoft.com/en-us/windows/apps/design/basics/commanding-basics)

| Наблюдаемый принцип | Что проверить на экране |
| --- | --- |
| Содержимое в центре | По первому экрану ясно, что открыто и какое действие сейчас уместно. Текст и данные занимают центровую область, вторичные команды доступны через меню. |
| Пространство как ориентир | Заголовки и соседние секции дают представление о структуре. Отступы внутри группы меньше, чем между группами. |
| Прямое управление | При касании появляется обратная связь, при захваченном перетаскивании видимая поверхность следует за пальцем. |
| Движение связывает состояния | У перехода есть источник и назначение. Начало, завершение и прерывание оставляют различимое состояние. |
| Персонализация | Тема, акцент, закреплённые назначения и значимые обновления сохраняются независимо от конкретного экрана. |
| Согласованный возврат | Перед открытием деталей можно предсказать, куда приведёт Back. Состояние перехода подтверждается после завершения явной операции. |

В раннем проектировании Windows 10 Microsoft объясняла выбор навигации доступностью конкретного действия. В проекте Photos частое переключение между коллекцией и альбомами на телефоне оставили доступным через свайп. В Outlook команда учитывала глубину структуры аккаунтов и папок и обратную связь о командах в нижней панели. Для будущей библиотеки это различие между моделью назначения и управлением, которое подходит конкретной форме экрана и способу ввода. [Windows 10 Design](https://blogs.windows.com/windowsexperience/2015/04/29/windows-10-design-getting-the-balance-right/)

## Типографика и текст

Segoe WP — системная гарнитура Windows Phone 7. Ранняя документация различает идентификатор приложения, заголовок страницы, заголовки секций, основной текст и вторичные сведения. В большой композиции заголовок контейнера, заголовок секции и содержимое образуют разные визуальные уровни. Титул страницы в модели Phone 7 относится к контексту и при наличии остаётся на месте. В современных Windows системная гарнитура — Segoe UI Variable. [Разделы Fonts, Page title и Panorama](sources.md#карта-pdf-2010) · [Typography in Windows](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/typography)

**Контракт библиотеки.** Семантические роли текста — `Display`, `PageTitle`, `SectionTitle`, `ItemTitle`, `Body`, `Caption`, `CommandLabel`. Профиль темы задаёт гарнитуру, размер, межстрочный интервал и начертание для каждой роли. Системный стек и его запасные гарнитуры должны иметь кириллицу, цифры и нужные письменности. У иконок команд хранится самостоятельная строка назначения. Подписи описывают действие через короткие глаголы и учитывают склонение, множественное число и форматирование дат по локали.

### Размеры и стили текста Silverlight SDK

| Ресурс SDK | Значение в единицах XAML |
| --- | --- |
| `PhoneFontSizeSmall` | 18,667 |
| `PhoneFontSizeNormal` | 20 |
| `PhoneFontSizeMedium` | 22,667 |
| `PhoneFontSizeMediumLarge` | 25,333 |
| `PhoneFontSizeLarge` | 32 |
| `PhoneFontSizeExtraLarge` | 42,667 |
| `PhoneFontSizeExtraExtraLarge` | 72 |
| `PhoneFontSizeHuge` | 186,667 |

Базовый текст использует Segoe WP размера 20 и `PhoneForegroundBrush`. `PhoneTextTitle1Style`, `PhoneTextTitle2Style` и `PhoneTextTitle3Style` используют Segoe WP Semilight размеров 72, 32 и 22,667 соответственно. `PhoneTextGroupHeaderStyle` также использует Semilight размера 32. Библиотека может взять эти пропорции за основу и подобрать значения под плотность и масштаб текста целевой среды. В гайде Phone 7 отдельно оговаривалось распространение Segoe WP, поэтому профиль может использовать установленную гарнитуру или совместимую замену. [Справочник ресурсов SDK](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769552(v=vs.105)) · [Гайд Phone 7, стр. 40](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=21)

Для обычного текста `PhoneTextBlockBase` задаёт горизонтальный отступ 12. Короткие стили в таблице наследуют этот отступ. Словарь задаёт размеры и шрифт этих стилей. Межстрочный интервал разрешает текстовый движок. [Словари SDK 8.0](sources.md#извлечённые-ресурсы-windows-phone-sdk-80)

| Роль или стиль XAML | Начертание · размер | Кисть |
| --- | --- | --- |
| `PhoneTextNormalStyle` | Regular · 20 | `PhoneForegroundBrush` |
| `PhoneTextSubtleStyle` | Regular · 20 | `PhoneSubtleBrush` |
| `PhoneTextSmallStyle` | Regular · 18,667 | `PhoneSubtleBrush` |
| `PhoneTextTitle1Style` | Semilight · 72 | `PhoneForegroundBrush` |
| `PhoneTextTitle2Style`, `PhoneTextLargeStyle` | Semilight · 32 | `PhoneForegroundBrush` |
| `PhoneTextTitle3Style` | Semilight · 22,667 | `PhoneForegroundBrush` |
| `PhoneTextExtraLargeStyle` | Semilight · 42,667 | `PhoneForegroundBrush` |
| `PhoneTextGroupHeaderStyle` | Semilight · 32 | `PhoneSubtleBrush` |
| `PhoneTextContrastStyle` | Semibold · 20 | `PhoneContrastForegroundBrush` |
| `PhoneTextAccentStyle` | Semibold · 20 | `PhoneAccentBrush` |
| `PhoneTextHugeStyle` | Light · 186,667 | `PhoneForegroundBrush` |

В шести файлах Segoe WP из оригинального пакета Phone 7 каждому начертанию присвоен вес OpenType. У Light вес 200, у Semilight — 300, у Regular — 400, у Semibold — 600, у Bold — 700 и у Black — 800. Все шесть покрывают русский алфавит, включая «Ё» и «ё». У каждого 2048 единиц на em. В метриках `hhea` ascent равен 2210, descent равен −514, line gap равен 0. Высоту строки конкретного контрола задаёт его шаблон и алгоритм компоновки. [Состав, источник и лицензия Font.zip](windows-phone-archive.md#состав-набора-windows-phone-7)

Крупный заголовок может уходить за физический край только в контейнере, где это часть визуальной непрерывности. Полное название секции остаётся доступно семантически. У заголовков страниц и команд при большом масштабе текста предусматриваются перенос, расширение области или доступ к полному тексту. Регистр выбирается по роли и языку. Запас ширины под перевод проверяется на реальных строках.

### Тон интерфейса

В библиотеке Microsoft статья **Voice for Windows Phone** описывает тон письменного текста. Она предлагает говорить естественно, учитывать, в какой задаче находится человек, и использовать формулировки, которые сохраняют смысл при переводе. В библиотеке короткое название команды указывает действие, сообщение об ошибке сообщает результат и доступный следующий шаг, а полное доступное имя сохраняется при визуальном сокращении. [Voice for Windows Phone 8](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj662928(v=vs.105)) · [Voice в документации Phone 8.1](https://web.archive.org/web/20140618162025id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596125.aspx)

## Компоновка, темы и акцент

В Phone Store apps системная тема задавала светлый или тёмный фон и пользовательский акцент. Стандартные контролы наследовали цвета автоматически. Оператор или производитель мог добавить свой акцент, поэтому логика приложения должна работать с любым значением от системы. Исторический профиль библиотеки хранит цветовые роли отдельно от размеров и типографики и проверяет выделение на обоих фонах. [Theme design decisions for Windows Phone](https://web.archive.org/web/20140408233050id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596122.aspx)

Phone 7 поддерживал светлый и тёмный фон и пользовательский акцент. Гайд описывает изменение цветовой темы средствами платформы и раздельные portrait/landscape сценарии. Его примеры в физических пикселях относятся к устройствам того поколения. В WinUI адаптация идёт от эффективных размеров окна. Паттерн list/details использует ширину доступной области, а смена ориентации оставляет открытый объект тем же. [Единицы, ориентация и темы в гайде Phone 7](sources.md#карта-pdf-2010) · [Точки адаптации Windows](https://learn.microsoft.com/windows/apps/design/layout/screen-sizes-and-breakpoints-for-responsive-design) · [List/details](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/list-details)

В гайде Store apps 8.1 минимальная ширина телефонного профиля составляет 384 эффективных px в портрете и 640 в ландшафте. Для настольного профиля указаны 500 px по умолчанию и 320 px при явной поддержке. На минимальной ширине всё ещё проверяются команды, временные слои, навигация и основное содержимое. Эти значения задают контрольные размеры для исторического профиля. [Guidelines for supporting multiple screen sizes](https://web.archive.org/web/20140714071743/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh465349.aspx)

В Phone 8 производитель или оператор мог добавить собственный цвет акцента. Поэтому в проектном контракте цвет темы представлен значением, а смысл состояния задаёт отдельная роль. Размеры и типографика имеют собственные токены, хотя при изменении темы в Silverlight менялись цвета. [Theme design decisions for Windows Phone](https://web.archive.org/web/20121103210213/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh202878(v=vs.105).aspx)

**Контракт библиотеки.** Таблица задаёт минимальные наборы токенов.

| Набор | Роли |
| --- | --- |
| Поверхности | `canvas`, `surface`, `overlay`, `scrim`, `divider` |
| Текст и акцент | `textPrimary`, `textSecondary`, `textDisabled`, `accent`, `onAccent`, `focus` |
| Состояния | `selection`, `hover`, `pressed`, `error`, `warning`, `success`, `info` |
| Компоновка | Отступ края, интервалы внутри строки и между секциями, минимальная область активации, высота панели и безопасные отступы |
| Движение | Длительности короткого отклика, входа слоя и перехода страницы, кривые и параметры инерции. Отдельное представление для уменьшенного движения |

Роль `onAccent` разрешается для конкретного фона. Выбранный элемент отличается формой, маркером или подписью даже при монохромном отображении. Состояние фокуса остаётся различимо поверх выбранного и нажатого элемента. Для длинных списков сетка задаётся строкой, для деталей — полями содержимого. У закреплённой панели есть место в геометрии страницы или явно объявленный режим наложения. У слоя с наложением есть правила видимости последнего элемента списка и фокусируемых полей при открытой клавиатуре. [XAML theme resources](https://learn.microsoft.com/en-us/windows/uwp/design/controls-and-patterns/xaml-theme-resources) · [Color in Windows](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/color) · [Layout overview](https://learn.microsoft.com/en-us/windows/apps/design/layout/)

В WinUI `{ThemeResource}` разрешает ключ при загрузке XAML и повторно при смене темы. Его используют и в активном визуальном состоянии, чтобы обновить, например, кисть фокуса при включении контрастной темы. Словари `Light`, `Dark` и `HighContrast` дают значения по одним ролям. Для контрастной темы кисти берут пользовательские системные цвета, в том числе фон кнопок и цвет текста. [Расширение ThemeResource](https://learn.microsoft.com/en-us/windows/apps/develop/platform/xaml/themeresource-markup-extension) · [Contrast themes](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/high-contrast-themes)

В WinUI `AdaptiveTrigger` применяет визуальное состояние при достижении минимальной ширины или высоты окна в эффективных пикселях. Когда указаны оба минимума, должны выполняться оба условия. В библиотеке пороги зависят от того, сколько места нужно содержимому. Вложенный компонент вычисляет своё размещение по доступной ему области. При смене компоновки сохраняются выбранные ключи и история, а фокус переводится к ближайшему видимому аналогу, если его прежний элемент скрыт. [Responsive layouts](https://learn.microsoft.com/en-us/windows/apps/develop/ui/layouts-with-xaml) · [AdaptiveTrigger](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.adaptivetrigger)

### Геометрия и ресурсы темы Phone 8 Silverlight

SDK задаёт `PhoneMargin` со значением 12, `PhoneHorizontalMargin` со значением `12, 0` и `PhoneVerticalMargin` со значением `0, 12`. Толщина рамки и штриха равна 3. `PhoneTouchTargetOverhang` равен 12, а `PhoneTouchTargetLargeOverhang` задан парой `12, 20`. Эти величины относятся к шаблону и дополняют правила физического размера цели касания. `PhoneForegroundBrush` и `PhoneBackgroundBrush` служат основными кистями переднего плана и фона, `PhoneDisabledBrush` и `PhoneSubtleBrush` — кистями вторичных состояний, а `PhoneChromeBrush` согласует цвет с Application Bar. Для TextBox отдельно заданы кисти курсора, выделения и состояния редактирования. Пример Silverlight читает тему из `PhoneDarkThemeVisibility`, а акцент из `PhoneAccentColor`. [Theme resources for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769552(v=vs.105)) · [How to apply theme resources for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769545(v=vs.105))

| Экран в Phone 8 Update 3 | Физические пиксели | Область после масштабирования | `ScaleFactor` |
| --- | --- | --- | --- |
| WVGA | 480 × 800 | 480 × 800 | 100 |
| WXGA | 768 × 1280 | 480 × 800 | 160 |
| 720p | 720 × 1280 | 480 × 853 | 150 |
| 1080p | 1080 × 1920 | 480 × 853 | 150 |

На 1080p значение `ScaleFactor` доступно приложению как 150, а система использует коэффициент 2,25. В примере Microsoft у `Grid` есть строки высоты `Auto` и `*`. Приложение использует дополнительные 53 единицы по высоте на дисплеях 16:9, сохраняя общую ширину. Макеты проверяются на обоих соотношениях сторон, а графика — на каждом размере, для которого предусмотрен отдельный файл. [Multi-resolution apps for Windows Phone 8](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj206974(v=vs.105))

### Цветовые роли Light и Dark из SDK 8.0

Значения взяты из оригинальных дизайнерских словарей `Dark\ThemeResources.xaml` и `Light\ThemeResources.xaml` пакета SDK 8.0. Формат цветов — `#AARRGGBB`. Например, `#DE000000` в светлой теме задаёт чёрный цвет с альфой `DE`. Итоговый вид полупрозрачной кисти зависит от подложки. [Проверка пакета и путь к файлам](sources.md#извлечённые-ресурсы-windows-phone-sdk-80)

| Ключ цвета | Dark | Light | Применение |
| --- | --- | --- | --- |
| `PhoneBackgroundColor` | `#FF000000` | `#FFFFFFFF` | Фон |
| `PhoneForegroundColor` | `#FFFFFFFF` | `#DE000000` | Основной текст и рамки |
| `PhoneContrastBackgroundColor` | `#FFFFFFFF` | `#DE000000` | Контрастная подложка |
| `PhoneContrastForegroundColor` | `#FF000000` | `#FFFFFFFF` | Текст контрастной подложки |
| `PhoneDisabledColor` | `#66FFFFFF` | `#4D000000` | Отключённый текст и границы |
| `PhoneSubtleColor` | `#99FFFFFF` | `#66000000` | Второстепенный текст и линии |
| `PhoneTextHighContrastColor` | `#FFFFFFFF` | `#DE000000` | Текст высокой контрастности |
| `PhoneTextMidContrastColor` | `#99FFFFFF` | `#73000000` | Средний уровень контрастности |
| `PhoneTextLowContrastColor` | `#73FFFFFF` | `#40000000` | Низкий уровень контрастности |
| `PhoneChromeColor` | `#FF1F1F1F` | `#FFDDDDDD` | Системные панели |
| `PhoneSemitransparentColor` | `#AA000000` | `#AAFFFFFF` | Полупрозрачная подложка |
| `PhoneProgressBarBackgroundColor` | `#19FFFFFF` | `#19000000` | Фон индикатора |
| `PhoneButtonBasePressedForegroundColor` | `#FFFFFFFF` | `#FFFFFFFF` | Текст нажатой кнопки |
| `PhoneTextBoxColor` | `#BFFFFFFF` | `#26000000` | Фон поля в обычном состоянии |
| `PhoneTextBoxForegroundColor` | `#FF000000` | `#DE000000` | Текст поля |
| `PhoneTextCaretColor` | `#FF000000` | `#DE000000` | Курсор ввода |
| `PhoneTextBoxEditBackgroundColor` | `#FFFFFFFF` | `#00000000` | Фон в режиме редактирования |
| `PhoneTextBoxReadOnlyColor` | `#77000000` | `#2E000000` | Режим только для чтения |
| `PhoneTextBoxSelectionForegroundColor` | `#FFFFFFFF` | `#FFFFFFFF` | Выделенный текст |
| `PhoneInactiveColor` | `#33FFFFFF` | `#33000000` | Устаревшая кисть неактивности |
| `PhoneInverseInactiveColor` | `#FFCCCCCC` | `#FFE5E5E5` | Устаревшая инверсная кисть неактивности |
| `PhoneInverseBackgroundColor` | `#FFFFFFFF` | `#FFDDDDDD` | Устаревший инверсный фон |
| `PhoneBorderColor` | `#BFFFFFFF` | `#99000000` | Устаревший цвет рамки |

В обеих темах рамка редактируемого поля `PhoneTextBoxEditBorderBrush` и нажатая заливка `PhoneRadioCheckBoxPressedBrush` ссылаются на текущий `PhoneAccentColor`. У CheckBox и RadioButton обычная заливка прозрачна. Рамка и отметка ссылаются на `PhoneForegroundColor`. Кисти отключённого состояния задаются шаблоном контрола. Для неактивного заголовка Pivot словарь задаёт непрозрачность 0,4 в Dark и 0,23144 в Light. [Официальные имена и назначение ресурсов](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769552(v=vs.105))

### Цветовые роли SDK 7.0 и 7.1

В обоих профилях темы Dark и Light имеют по десять вариантов акцента. Сравнение всех словарей показало, что внутри каждой темы от варианта к варианту меняется только `PhoneAccentColor`. Все общие буквальные цвета, перечисленные в таблице SDK 8.0, имеют те же значения. В 7.0 и 7.1 также определены отдельные цвета рамки редактирования, CheckBox и RadioButton. [Извлечённые словари](sources.md#извлечённые-ресурсы-windows-phone-sdk-80)

| Ключ цвета SDK 7.0 и 7.1 | Dark | Light |
| --- | --- | --- |
| `PhoneTextBoxEditBorderColor` | `#FFFFFFFF` | `#DE000000` |
| `PhoneRadioCheckBoxColor` | `#BFFFFFFF` | `#26000000` |
| `PhoneRadioCheckBoxDisabledColor` | `#66FFFFFF` | `#00000000` |
| `PhoneRadioCheckBoxCheckColor` | `#FF000000` | `#DE000000` |
| `PhoneRadioCheckBoxCheckDisabledColor` | `#66000000` | `#4D000000` |
| `PhoneRadioCheckBoxPressedColor` | `#FFFFFFFF` | `#00000000` |
| `PhoneRadioCheckBoxPressedBorderColor` | `#FFFFFFFF` | `#DE000000` |

### Палитра акцентов Phone 7.5 и 8

В таблице MSDN 20 акцентов для Phone 8. Десять из них также отмечены в колонке Phone 7.5. Значения ниже взяты из колонки HEX в формате ARGB из иллюстрации редакции 2014 года. В скобках указаны названия Phone 7.5, если они отличаются. Проектный токен `accent` принимает и цвет, который передаёт устройство. [Themes for Windows Phone, редакция 2014](https://web.archive.org/web/20140419214046id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/develop/ff402557(v=vs.105).aspx) · [Оригинальная таблица MSDN](https://web.archive.org/web/20130925151014id_/http://i.msdn.microsoft.com/dynimg/IC674329.png)

| Акцент Phone 8 | HEX Phone 8 | HEX Phone 7.5 по таблице MSDN |
| --- | --- | --- |
| Lime | `#FFA4C400` | `#FFA2C139` |
| Green | `#FF60A917` | `#FF339933` |
| Emerald | `#FF008A00` | — |
| Teal (Viridian) | `#FF00ABA9` | `#FF00ABA9` |
| Cyan (Blue) | `#FF1BA1E2` | `#FF1BA1E2` |
| Cobalt | `#FF0050EF` | — |
| Indigo | `#FF6A00FF` | — |
| Violet (Purple) | `#FFAA00FF` | `#FFAA00FF` |
| Pink | `#FFF472D0` | `#FFE671B8` |
| Magenta | `#FFD80073` | `#FFD80073` |
| Crimson | `#FFA20025` | — |
| Red | `#FFE51400` | `#FFE51400` |
| Orange (Mango) | `#FFFA6800` | `#FFF09609` |
| Amber | `#FFF0A30A` | — |
| Yellow | `#FFE3C800` | — |
| Brown | `#FF825A2C` | `#FFA05000` |
| Olive | `#FF6D8764` | — |
| Steel | `#FF647687` | — |
| Mauve | `#FF76608A` | — |
| Sienna | `#FFA0522D` | — |

В иллюстрации редакции 2012 года у Yellow указан `#FFD8C100`, а у Sienna — `#FF7A3B3F`. В редакции 2014 года HEX Yellow изменился на `#FFE3C800`, а плашка сохранила RGB `216, 193, 0`. В обеих иллюстрациях у Pink напечатано RGB `244, 141, 208`, а HEX и плашка дают `244, 114, 208`. Для Purple в отдельном примере чтения темы Microsoft использует `#FFA200FF`. [Таблица из редакции 2012](https://web.archive.org/web/20140518062640/http://i.msdn.microsoft.com/dynimg/IC619215.png) · [Таблица из редакции 2014](https://web.archive.org/web/20130925151014id_/http://i.msdn.microsoft.com/dynimg/IC674329.png) · [Пример чтения акцента в Silverlight](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769545(v=vs.105))

В 20 файлах `Design\AccentColors` SDK 8.0 19 названий и значений совпали с колонкой Phone 8. В пакете для дизайнера есть **Taupe `#FF87794E`**, а в таблице MSDN — **Sienna `#FFA0522D`**. Поэтому при сверке макета важно записывать версию палитры. [Словари цветов SDK 8.0](sources.md#извлечённые-ресурсы-windows-phone-sdk-80)

Акценты из дизайнерских словарей 7.0 и 7.1 позволяют воспроизвести конкретный выпуск. Для Lime SDK 7.0 даёт `#FF8CBF26`, а SDK 7.1 — `#FFA2C139`. Для Magenta значения `#FFFF0097` и `#FFD80073` соответственно. Обе версии используют **Purple `#FFA200FF`**. Остальные семь акцентов совпали с колонкой MSDN для Phone 7.5. [Пакеты SDK](sources.md#извлечённые-ресурсы-windows-phone-sdk-80)

### Темы и типографика XAML в Phone 8.1 Store apps

Архивная копия телефонного `generic.xaml` содержит отдельные словари `Default` (тёмная тема), `Light`, `HighContrastBlack` и `HighContrastWhite`. Ниже полная таблица буквальных значений `Color` внутри этих словарей. Сведения о номере сборки в копии отсутствуют. Акцент во всех словарях поступает из системного ресурса `SystemColorControlAccentColor`. [Копия generic.xaml](https://gist.github.com/tmyt/dca3b0ccb3374c90a11a1b2e5b04ff2c/784d54c4b867dff1ac67cbd99a5f18b0aa997385#file-generic-xaml-L16-L74) · [Руководство Microsoft по темам](https://web.archive.org/web/20140408233050id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596122.aspx)

| Ключ | Default | Light | HighContrastBlack | HighContrastWhite |
| --- | --- | --- | --- | --- |
| `PhoneBaseBlackColor` | `#FF000000` | `#FF000000` | `#FF000000` | `#FF000000` |
| `PhoneBaseWhiteColor` | `#FFFFFFFF` | `#FFFFFFFF` | `#FFFFFFFF` | `#FFFFFFFF` |
| `PhoneBackgroundColor` | `#FF000000` | `#FFFFFFFF` | `#FF000000` | `#FFFFFFFF` |
| `PhoneDisabledColor` | `#66FFFFFF` | `#66000000` | `#66FFFFFF` | `#66000000` |
| `PhoneForegroundColor` | `#FFFFFFFF` | `#FF000000` | `#FFFFFFFF` | `#FF000000` |
| `PhonePageBackgroundColor` | `#FF000000` | `#FFFFFFFF` | `#FF000000` | `#FFFFFFFF` |
| `PhoneTextHighColor` | `#FFFFFFFF` | `#DE000000` | `#FFFFFFFF` | `#FF000000` |
| `PhoneTextMidColor` | `#99FFFFFF` | `#73000000` | `#FFFFFFFF` | `#FF000000` |
| `PhoneTextLowColor` | `#73FFFFFF` | `#40000000` | `#73FFFFFF` | `#40000000` |
| `PhoneTextOverAccentColor` | `#FFFFFFFF` | `#FFFFFFFF` | `#FF000000` | `#FFFFFFFF` |
| `PhoneBaseHighColor` | `#FFFFFFFF` | `#FF000000` | `#FFFFFFFF` | `#FF000000` |
| `PhoneBaseMediumHighColor` | `#CCFFFFFF` | `#BF000000` | `#FFFFFFFF` | `#FF000000` |
| `PhoneBaseMidColor` | `#99FFFFFF` | `#73000000` | `#FFFFFFFF` | `#FF000000` |
| `PhoneBaseMediumMidColor` | `#80FFFFFF` | `#80000000` | `#FFFFFFFF` | `#FF000000` |
| `PhoneBaseMediumMidSolidColor` | `#FF666666` | `#FFCCCCCC` | `#FF666666` | `#FFCCCCCC` |
| `PhoneBaseLowColor` | `#73FFFFFF` | `#40000000` | `#73FFFFFF` | `#40000000` |
| `PhoneBaseLowSolidColor` | `#FF747474` | `#FFBFBFBF` | `#FF747474` | `#FFBFBFBF` |
| `PhoneImagePlaceholderColor` | `#FF3D3D3D` | `#FFCCCCCC` | `#FFFFFFFF` | `#FF000000` |
| `PhoneChromeColor` | `#FF1F1F1F` | `#FFDDDDDD` | `#FF1F1F1F` | `#FFDDDDDD` |
| `PhoneControlBackgroundColor` | `Transparent` | `Transparent` | `#FFFFFFFF` | `#FF000000` |
| `PhoneControlDisabledColor` | `#66FFFFFF` | `#66000000` | `#FFFFFFFF` | `#FF000000` |
| `PhoneControlForegroundColor` | `#FFFFFFFF` | `#FF000000` | `#FF000000` | `#FFFFFFFF` |
| `TextBoxBackgroundColor` | `#FFFFFFFF` | `#FFBFBFBF` | `#FF000000` | `#FFFFFFFF` |
| `TextBoxBorderColor` | `#FFFFFFFF` | `#FFBFBFBF` | `#FFFFFFFF` | `#FF000000` |
| `TextBoxForegroundColor` | `#FF000000` | `#FF000000` | `#FFFFFFFF` | `#FF000000` |
| `TextBoxPlaceholderColor` | `#FF909090` | `#40000000` | `#73FFFFFF` | `#FF909090` |
| `ContentDialogDimmingColor` | `#99000000` | `#99FFFFFF` | `#99000000` | `#99FFFFFF` |

Кисть страницы `ApplicationPageBackgroundThemeBrush` использует `PhoneBackgroundColor`, а `ApplicationForegroundThemeBrush` — `PhoneBaseMediumHighColor`. Заголовок приложения использует `PhoneForegroundColor`, вторичный текст — `PhoneBaseMidColor`. Подложка `ContentDialog` использует `PhoneChromeColor`, затемнение — `ContentDialogDimmingColor`. [Алиасы кистей в копии словаря](https://gist.github.com/tmyt/dca3b0ccb3374c90a11a1b2e5b04ff2c/784d54c4b867dff1ac67cbd99a5f18b0aa997385#file-generic-xaml-L73-L105)

Там же есть шесть размеров `TextStyle…FontSize` в единицах XAML. Последовательно они равны 10,66 для Small, 16 для Medium, 18,14 для Large, 25,5 для ExtraLarge, 29,86 для ExtraLargePlus и 34,14 для ExtraExtraLarge. `ContentControlThemeFontFamily` задаёт Segoe WP, `ContentControlFontSize` равен 20,26. Конкретные контролы могут использовать свои значения. [Типографический набор в копии XAML](https://gist.github.com/tmyt/dca3b0ccb3374c90a11a1b2e5b04ff2c/784d54c4b867dff1ac67cbd99a5f18b0aa997385#file-generic-xaml-L1437-L1450) · [Спецификации XAML и WinJS](store-81-visual-specs.md)

### Размеры экспортируемой графики Phone 8

Наборы SDK, имена ресурсов и геометрия иконок App Bar доступны в общем каталоге. [Иконки Windows Phone Metro](metro-icons.md)

Asset Template Guide задаёт размеры изображений в физических пикселях для WVGA, 720p и WXGA. Размер экспортируемого файла, внутренняя область знака и область взаимодействия хранятся отдельно. В частности, 26 × 26 px относится к рисунку кнопки App Bar в шаблоне WVGA. Размер касания вычисляется по правилам ввода соответствующего профиля. [Asset Template Guide, стр. 1–8](https://github.com/ghuntley/ux-design-for-windows-phone/blob/9f951a29e44013b8cb8208d6e063b94656af7723/ms%20windows%20phone%20templates/AssetTemplateGuide.pdf)

| Ресурс | Размеры в шаблонах Phone 8 |
| --- | --- |
| Кнопка App Bar, WVGA | Круг 48 × 48 px. Знак внутри 26 × 26 px. |
| Заставка | Общий файл 768 × 1280 px. Отдельные варианты 480 × 800 для WVGA, 720 × 1280 для 720p и 768 × 1280 для WXGA. |
| Фон Panorama | 1536 × 1280 px. |
| Иконка приложения | 99 × 99 px, внутреннее поле шаблона 14 px. |
| Плитки Flip и Cycle | Малый файл 159 × 159 с полем разметки 43 px, средний 336 × 336 с полем 101 px, широкий 691 × 336 с полями 279 × 101 px. Фон заполняет всю поверхность. |
| Плитки Iconic | Малый значок до 110 px по ширине и 110 px в высоту, средний до 202 px по ширине и 202 px в высоту. Поля шаблона 19 и 34 px соответственно. При экспорте гайд предлагает обрезать файл по верхней и нижней границе знака. |
| Экран блокировки | Фон 768 × 1280 px, значок 38 × 38 px. |
| Значок Lens | 173 × 173 для WVGA, 259 × 259 для 720p, 277 × 277 px для WXGA. |
| Значки файловой ассоциации и Store | Три квадрата для файлов 33, 69 и 179 px. Изображения Store 300 × 300 и 1000 × 800 px. |

### Графика Phone 8.1 Store apps

Руководство по графике предлагает использовать типографику и содержимое для выделения задач, а графику — для обозначения действия, состояния или бренда. Для плитки, которая получает системный фон, руководство предлагает прозрачный фон изображения и белый знак. Заставка появляется кратко, поэтому важный для действия текст должен быть доступен на следующем экране. [Essential graphics, visual indicators, and notifications](https://web.archive.org/web/20141012014027id_/http://msdn.microsoft.com:80/en-us/library/windows/apps/dn596109.aspx)

В исходном ZIP Phone 8.1 шаблоны содержат ресурсы для масштабов 100, 140 и 240 процентов. Базовые файлы плиток Start в справке Windows Runtime имеют 71 × 71, 150 × 150 и 310 × 150 px при масштабе 100. Иконка списка приложений имеет 44 × 44 px при том же масштабе. Ресурсы во всех доступных размерах привязаны к одному назначению. Система выбирает подходящий файл и шаблон уведомления по размеру плитки. [Шаблоны Phone Store apps](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/Visual_Assets_Templates_for_Windows_Phone_Store_apps.zip) · [Tile and toast visual assets](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh781198(v=win.10))

Шестистраничный гайд внутри ZIP указывает для App Bar Store apps графические маски 32, 45 и 77 px с рисунком 18, 25 и 41 px соответственно. Для Hub в пакете предусмотрены варианты фона по теме и масштабу. Документ рекомендует низкоконтрастный фон, чтобы заголовки и содержимое сохраняли читаемость. [Visual Asset Design Templates for Windows Phone Store apps](windows-phone-archive.md#visual-assets-templates-для-windows-phone-store-apps)

Таблица сводит холсты из шести страниц гайда. В скобках указан квадратный размер знака, если он задан. Размеры указаны в физических пикселях. Файлы масштаба 240% требуются как минимум. Гайд рекомендует предоставить все масштабы, а для файловых ассоциаций перечисляет обязательные `targetsize` 63, 129 и 336 px. [Оригинальные шаблоны и гайд](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/Visual_Assets_Templates_for_Windows_Phone_Store_apps.zip)

| Назначение | 100% | 140% | 240% |
| --- | --- | --- | --- |
| `Square71x71Logo` · малая плитка | 71 × 71 (32) | 99 × 99 (45) | 170 × 170 (77) |
| `Square150x150Logo` · средняя плитка | 150 × 150 (60) | 210 × 210 (84) | 360 × 360 (144) |
| `Wide310x150Logo` · широкая плитка | 310 × 150 (60) | 434 × 210 (84) | 744 × 360 (144) |
| `Square44x44Logo` · список приложений | 44 × 44 (32) | 62 × 62 (44) | 106 × 106 (76) |
| `StoreLogo` | 50 × 50 (32) | 70 × 70 (46) | 120 × 120 (80) |
| Фон Hub | 640 × 533 | 1097 × 914 | 1536 × 1280 |
| `SplashScreen@Image` | 480 × 800 | 672 × 1120 | 1152 × 1920 |
| Маска `AppBarButton` | 32 × 32 (18) | 45 × 45 (25) | 77 × 77 (41) |

## Ввод и обратная связь

Гайд Phone 7 описывает tap, double tap, pan, flick, удержание и pinch/stretch. У tap обратная связь начинается при касании, действие выполняется при отпускании. Гайд задаёт обычную цель касания от 9 мм с промежутком от 2 мм, а 7 мм приводит как исключение. Экранная и аппаратная клавиатуры относятся к отдельным поверхностям ввода. В современном Windows касание, мышь, клавиатура и перо имеют разные способы адресации. [Гайд Phone 7, стр. 70–102](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=36) · [Touch interactions](https://learn.microsoft.com/en-us/windows/apps/design/input/touch-interactions) · [Keyboard interactions](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-interactions)

В Phone Store apps tap останавливает инерционное движение. Pan ведёт поверхность вслед за пальцем и при отпускании приводит её к допустимой позиции. Flick продолжает движение после отпускания, а pinch меняет масштаб относительно середины между пальцами. Эти правила связывают диспетчер жестов с состоянием прокрутки и масштаба. [Жесты Phone 8.1 в MSDN](https://web.archive.org/web/20140501211142id_/http://msdn.microsoft.com:80/en-us/library/windows/apps/dn596119.aspx)

Руководство **Input and feedback patterns** для Windows Store предлагает проектировать цели с учётом касания и сохранять предсказуемое поведение при смене устройства ввода. Мышь и тачпад дают точное наведение, перо может указывать и рисовать, а клавиатура поддерживает обход элементов, активацию и команды. В библиотеке смена устройства ввода сохраняет текущую задачу, выбранный объект и введённые данные. [Input and feedback patterns](https://web.archive.org/web/20140501004253id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn456349.aspx)

Руководство Phone 8.1 различает видимый знак, область касания и промежуток между целями. Для основных действий указана цель от 9 × 9 мм. При дефиците высоты широкая строка может иметь цель 7 мм по высоте при ширине от 15 мм. Для действий с заметной ценой случайного касания рекомендуются более крупные цели. Эти физические размеры относятся к историческому профилю. [Interactions and usability в MSDN](https://web.archive.org/web/20140408235718id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn596113.aspx)

| Ввод | Поведение в библиотеке |
| --- | --- |
| Касание | Нажатие показывает отклик, отпускание завершает действие. Захват оси или отмена прекращает ожидающий tap. Удержание может открыть контекстное меню. |
| Мышь | Hover даёт подсказку, основной клик активирует, вторичный открывает контекст. Колесо продолжает ожидаемую прокрутку коллекции. |
| Клавиатура | Tab перемещает фокус между областями, стрелки перемещаются внутри составного контрола согласно его роли, Enter/Space активируют по семантике контрола, Escape закрывает текущий слой, когда тот допускает отмену. |
| Считыватель экрана | У элемента есть имя, роль, значение и состояние. Доступны действия открытия, выбора, изменения значения и вызова меню. При смене секции озвучивается результат. |
| Перо | Библиотека поддерживает указание и активацию. Поверхность рукописного ввода или захвата штриха определяет отдельные правила жестов. |

## Движение и непрерывность

Исторический Phone Hub движет фон, заголовок и содержимое с разной скоростью. Pivot отвечает за переход между соседними представлениями. WinUI описывает отдельные переходы между страницами и связь элемента списка с его представлением на странице деталей. [Windows 8.1 UX guidelines, стр. 131–135 и 161–164](sources.md#windows-81-и-windows-phone-81) · [Page transitions](https://learn.microsoft.com/en-us/windows/apps/design/motion/page-transitions) · [Connected animation](https://learn.microsoft.com/en-us/windows/apps/develop/motion/connected-animation)

**Контракт библиотеки.** Анимация касания следует за вводом. После отпускания контрол приводит поверхность к целевому состоянию. Переход по команде связывает выбранный объект, заголовок или направление навигации с новым экраном. Если общий элемент исчез или у него изменилась геометрия, используется короткий переход страницы. В режиме уменьшенного движения используются мгновенная смена или небольшое затухание. Маршрут, выделение и фокус подтверждаются по одной модели при любой настройке движения.

| Событие | Поведение |
| --- | --- |
| Старт drag | Отменить ожидающую активацию вложенной кнопки после захвата перемещения. |
| Отпускание | Зафиксировать соседнюю секцию или вернуть текущую позицию по правилам контроля оси и скорости. |
| Новый ввод во время перехода | Прервать визуальную часть и начать с текущей видимой позиции. Результат последовательности событий фиксируется один раз. |
| Изменение ширины или темы | Пересчитать геометрию и сохранить семантическое состояние. При непригодной геометрии завершить переход в целевом состоянии. |
| Возврат от деталей | Вернуть объект-источник и его позицию перед восстановлением фокуса, если объект ещё есть. |

### Движение в Phone 8 и 8.1

Гайд Microsoft различает переходы между экранами и локальные реакции. Turnstile обозначает направление навигации, Tilt подтверждает касание интерактивной поверхности, а вход Panorama может показать направление прокрутки. Гайд описывает плавное замедление при входе, ускорение при выходе и S-образную кривую как вариант для большого перемещения. Эти описания задают характер движения. Числовые кривые и длительности остаются частью темы будущей библиотеки. [Animations, motion, and output for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202871(v=vs.105))

Редакция MSDN для Phone Store apps связывает Tilt с `PointerDownThemeAnimation` и требует отклика во время жеста. Локальная анимация обозначает изменение контрола, направленный переход показывает перемещение по истории, а длительная задача получает видимый прогресс. Звук и вибрация дополняют отклик с учётом системных настроек пользователя. [Animations, motion, and output, редакция для Phone Store apps](https://web.archive.org/web/20141223184936id_/http://msdn.microsoft.com:80/en-us/library/windows/apps/dn596095.aspx)

### Семантика переходов WinUI

| Смена контекста | Источник движения в WinUI | Применение в библиотеке |
| --- | --- | --- |
| Смена главного раздела | EntranceNavigationTransitionInfo проводит вход содержимого сдвигом и затуханием. | Используется при входе в новый корень. Фокус следует политике новой страницы. |
| Открытие дочернего экрана | DrillInNavigationTransitionInfo показывает углубление по иерархии. | Привязывается к маршруту деталей. Для возврата применяется соответствующий обратный переход. |
| Соседняя страница | SlideNavigationTransitionInfo задаёт направление горизонтального входа. | Порядок секций и направление жеста определяют сдвиг, включая RTL. |
| Переход одного объекта между представлениями | Connected Animation связывает два визуальных представления объекта. SuppressNavigationTransitionInfo позволяет пропустить штатный переход Frame. | Переход привязан к ключу объекта. Если строка виртуализирована или исчезла, применяется обычный переход страницы. |

[Page transitions](https://learn.microsoft.com/en-us/windows/apps/develop/motion/page-transitions) · [Connected animation](https://learn.microsoft.com/en-us/windows/apps/develop/motion/connected-animation)

## Доступность и локализация

Размер видимой иконки и размер её цели касания — разные метрики. Контролы должны сохранять читаемость при увеличении текста и пропускать управление системной клавиатурой. При RTL меняются логическое начало, порядок элементов и направление переходов. Смысловые значки отражаются по назначению. Порядок чтения следует задаче и остаётся последовательным на узком и широком экране. Обновление статуса озвучивается по значимости, поэтому прогресс объявляют при смене фазы, а фоновое обновление плитки не превращают в речевой поток. [Доступность Windows](https://learn.microsoft.com/en-us/windows/apps/design/usability/) · [Guidelines for interactions, стр. 390–393](sources.md#карта-pdf-2014) · [Globalization и localization в гайде Phone 7](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=12)

При фоновом обновлении Windows 8.1 рекомендовала менять нужную область страницы и сообщать итог через live region. В библиотеке постоянные элементы сохраняют идентичность и порядок чтения. При обычном обновлении статус объявляется по возможности, а срочность зависит от результата задачи. Статический текст остаётся в порядке чтения, последовательность Tab ведёт через интерактивные элементы. [Руководство Microsoft по доступности, стр. 390–392](https://tilsgee.github.io/DesignGuidelinesArchive/uwp8.1.pdf#page=390) · [AutomationProperties.LiveSetting](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.automation.automationproperties.livesetting?view=windows-app-sdk-2.0)

Проверка профиля включает длинный заголовок на русском, язык RTL, область с правосторонней прокруткой, узкий экран с экранной клавиатурой, увеличение текста, высокий контраст, отключённое движение и выполнение ключевого действия без жеста. Для загруженной коллекции добавляются исчезнувший элемент и восстановление позиции после изменения порядка.
