# Иконки Windows Phone Metro

[Оглавление](../README.md) · [Компоненты](components.md) · [Визуальная грамматика](foundations.md)

Для Application Bar в Windows Phone 7–8 Silverlight историческое имя PNG и его размер хранятся отдельно от назначения команды. В Phone 8.1 Store apps `AppBarButton` может использовать растровую маску или системный символ. У WinJS для той же задачи есть именованные `AppBarIcon`. Назначения ниже помогают выбрать символ для команды, а идентификаторы фиксируют конкретный источник и поколение.

## Геометрия и правила показа

| Профиль | Холст исходника | Область знака | Оформление |
| --- | --- | --- | --- |
| Phone 7 Silverlight | 48 × 48 физических px | По центру | Белый знак на прозрачном фоне. Панель рисует круг и подставляет цвет темы. |
| Phone 8 Silverlight, рекомендации для WVGA | 48 × 48 физических px | 26 × 26 px по центру, поля по 11 px | Белая маска с альфа-каналом. Панель рисует круг. Для готовой иконки SDK гайд указывает вариант из `Icons\Dark`. |
| Phone 8.1 Store apps, 100% | 32 × 32 физических px | 18 × 18 px, поля по 7 px | Прозрачный фон, изображение используется как маска. |
| Phone 8.1 Store apps, 140% | 45 × 45 физических px | 25 × 25 px, поля по 10 px | Имя ресурса оканчивается на `.scale-140.png`. |
| Phone 8.1 Store apps, 240% | 77 × 77 физических px | 41 × 41 px, поля по 18 px | Имя ресурса оканчивается на `.scale-240.png`. Руководство требует вариант 240% и предлагает предоставить все три. |

[Phone 7 Design Guide, стр. 32–35](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=17) · [Microsoft Learn, App bar icon buttons](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431806(v=vs.105)) · [Оригинальный графический ZIP Phone 8](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/asset_template_PSDs.zip) · [Оригинальный графический ZIP Phone 8.1, лист 6](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/Visual_Assets_Templates_for_Windows_Phone_Store_apps.zip)

Microsoft рекомендует простую монохромную геометрию и знакомые метафоры. У основных кнопок короткие текстовые подписи, которые видны при раскрытии панели. Действие с неясной метафорой можно поместить в текстовое меню. В Silverlight приложению доступен аппаратный Back для возврата по журналу. При повороте корпуса панель становится вертикальной и сохраняет знак ориентированным к пользователю. [Гайд по кнопкам Application Bar](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431806(v=vs.105)) · [App bar for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431813(v=vs.105))

В библиотеке цвет маски берётся из текущего состояния команды через кисть переднего плана. Контур кнопки, подпись, цель касания и маска задаются отдельно. При раскрытии подпись поясняет ту же команду. Временное состояние, например «Воспроизвести» или «Пауза», обновляет подпись и знак вместе. [Контракт команд](components.md#контракт-библиотеки-для-команд) · [Гайд по управлению воспроизведением](https://web.archive.org/web/20140408235720/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh452724.aspx) · [Цели касания](foundations.md#ввод-и-обратная-связь)

## Растровый набор Windows Phone SDK 8.0

Руководство Phone 7 v2.0 указывает 32 PNG в каждом из вариантов для светлого и тёмного фона в Windows Phone Developer Tools Beta. Для App Bar в приложении гайд указывает белый вариант. Поставку Phone SDK 8.0 можно проверить по составу установщика. [Phone 7 Design Guide, стр. 34–35](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=18)

ISO Windows Phone SDK 8.0 содержит пакет `MobileTools/wpsdkcore/WPSDK_en.cab`. Его SHA-1 `E4E41CFF011BF11C53A3EBF216253AA042706660` совпадает с манифестом установщика Microsoft. В таблице `File` пакета `wpsdk_en.msi` и в самом CAB подтверждены 37 PNG в каждой папке `Icons\Dark` и `Icons\Light`. В обеих папках стоят одинаковые имена. Заголовки PNG дают 76 × 76 px для 36 файлов и 115 × 115 px для `overflowdots.png`. Это размеры файлов SDK, а в таблице выше указаны рекомендуемые размеры при подготовке собственного рисунка. В проверенных парах `add/new`, `cancel/close`, `sync/refresh` совпадает альфа-канал. [Страница Windows Phone SDK 8.0](https://www.microsoft.com/en-us/download/details.aspx?id=35471) · [Официальный ISO](https://download.microsoft.com/download/9/3/8/938A5074-461F-4E3D-89F4-5CE2F42C1E36/wpsdkv80_enu1.iso)

Колонка REDIST сохраняет 32 отдельных имени из списков Microsoft 2013 и 2015. Прочерк означает, что для файла SDK в именном списке нет отдельной позиции. [Visual Studio 2013 REDIST](https://learn.microsoft.com/en-us/visualstudio/releases/2013/2013-redistribution-vs#windows-phone-icon-files) · [Visual Studio 2015 REDIST](https://learn.microsoft.com/en-us/visualstudio/releases/2015/2015-redistribution-vs#microsoft-windows-phone-sdk-80--and-microsoft-windows-phone-sdk-81)

| Действие или назначение | Имя в каталоге SDK 8.0 | Имя в REDIST |
| --- | --- | --- |
| Добавить | `add.png` | `appbar.add.rest.png` |
| Создать | `new.png` | `appbar.new.rest.png` |
| Уменьшить | `minus.png` | `appbar.minus.rest.png` |
| Подтвердить | `check.png` | `appbar.check.rest.png` |
| Отменить | `cancel.png` | `appbar.cancel.rest.png` |
| Закрыть | `close.png` | `appbar.close.rest.png` |
| Синхронизировать | `sync.png` | `appbar.sync.rest.png` |
| Обновить | `refresh.png` | `appbar.refresh.rest.png` |
| Справка | `questionmark.png` | `appbar.questionmark.rest.png` |
| Назад | `back.png` | `appbar.back.rest.png` |
| Далее | `next.png` | `appbar.next.rest.png` |
| Поиск | `feature.search.png` | `appbar.feature.search.rest.png` |
| Удалить | `delete.png` | `appbar.delete.rest.png` |
| Сохранить | `save.png` | `appbar.save.rest.png` |
| Папка | `folder.png` | `appbar.folder.rest.png` |
| Видео | `feature.video.png` | `appbar.feature.video.rest.png` |
| Камера | `feature.camera.png` | `appbar.feature.camera.rest.png` |
| Почта | `feature.email.png` | `appbar.feature.email.rest.png` |
| Настройки | `feature.settings.png` | `appbar.feature.settings.rest.png` |
| Избранное | `favs.png` | `appbar.favs.rest.png` |
| Добавить в избранное | `favs.addto.png` | `appbar.favs.addto.rest.png` |
| Скачать | `download.png` | `appbar.download.rest.png` |
| Загрузить | `upload.png` | `appbar.upload.rest.png` |
| Поделиться | `share.png` | `appbar.share.rest.png` |
| Редактировать | `edit.png` | `appbar.edit.rest.png` |
| Дополнительные команды | `overflowdots.png` | `appbar.overflowdots.png` |
| Воспроизвести | `transport.play.png` | `appbar.transport.play.rest.png` |
| Пауза | `transport.pause.png` | `appbar.transport.pause.rest.png` |
| Предыдущее или перемотка назад | `transport.rew.png` | `appbar.transport.rew.rest.png` |
| Следующее или перемотка вперёд | `transport.ff.png` | `appbar.transport.ff.rest.png` |
| Остановить | `stop.png` | `appbar.stop.rest.png` |
| Контур круга | `basecircle.png` | `appbar.basecircle.rest.png` |
| Будильник | `feature.alarm.png` | — |
| Календарь | `feature.calendar.png` | — |
| Телефон | `feature.phone.png` | — |
| Нравится | `like.png` | — |
| Микрофон | `microphone.png` | — |

## Официальные листы и векторный исходник

Оба экранных листа `Icons_PSD` показывают по 32 подписанных знака. На листе Phone 7 команды New и Add, Close и Cancel, Sync и Refresh подписаны по отдельности. Лист Phone 8 объединяет каждую пару и показывает три дополнительные метафоры, Generic Like, Generic Unlike и Microphone. Exclamation и Remove from Favorites показаны на обоих листах, а в проверенном наборе PNG SDK 8.0 файлов с этими назначениями нет. На листах также есть примеры календаря, голосовой почты и других прикладных знаков с текстом и счётчиками. [Phone 7, лист 9 вложенного PDF](windows-phone-archive.md#состав-набора-windows-phone-7) · [Phone 8, Icons_PSD.pdf](https://github.com/ghuntley/ux-design-for-windows-phone/blob/9f951a29e44013b8cb8208d6e063b94656af7723/ms%20windows%20phone%20templates/Design%20Templates%20for%20Windows%20Phone%208/PDF/Icons_PSD.pdf)

В `Icons\Vector\basic_shellcommon_vectors.ai` из SDK 8.0 видны 36 примеров на двух листах. В первом 25 общих элементов с контуром кнопки, во втором 11 знаков для функций и переполнения. Clock, Remove from Favorites и Generic Unlike доступны в этом векторном исходнике. В составе стандартной панели круг и меню принадлежат самой панели. [Windows Phone SDK 8.0](https://www.microsoft.com/en-us/download/details.aspx?id=35471) · [App bar icon buttons](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431806(v=vs.105))

Векторный каталог поставляется с отдельной лицензией `License.rtf`. Она связывает распространение иконок с документацией пакета и ограничивает распространяемый код платформой Windows Phone. В REDIST для владельцев лицензии SDK перечислены условия поставки неизменённых иконок с приложениями Windows Phone. [Официальный ISO SDK 8.0](https://download.microsoft.com/download/9/3/8/938A5074-461F-4E3D-89F4-5CE2F42C1E36/wpsdkv80_enu1.iso) · [Windows Phone icon files в REDIST](https://learn.microsoft.com/en-us/visualstudio/releases/2015/2015-redistribution-vs#microsoft-windows-phone-sdk-80--and-microsoft-windows-phone-sdk-81)

## Имена символов Windows Phone 8.1 Store apps

Архив справки Microsoft за апрель 2014 года перечисляет 193 значения `Windows.UI.Xaml.Controls.Symbol` для Windows 8.1 и Windows Phone 8.1 Runtime. Соответствующая гарнитура того поколения — Segoe UI Symbol. Апрельская справка указывает десятичные значения, таблица ниже записывает их в формате Unicode. Июньская справка WinJS перечисляет 196 имён `AppBarIcon` и задаёт использование имени в `AppBarCommand.icon`. В ней ключ `pause` приведён в нижнем регистре. [MSDN Symbol, апрель 2014](https://web.archive.org/web/20140423170427/http://msdn.microsoft.com/en-us/library/windows/apps/windows.ui.xaml.controls.symbol.aspx) · [MSDN AppBarIcon, июнь 2014](https://web.archive.org/web/20140629200623/http://msdn.microsoft.com/en-us/library/windows/apps/hh770557.aspx)

В таблице рядом стоят имена, совпадающие без учёта регистра. Имена с другим написанием приведены после таблицы отдельным списком WinJS. Для программного интерфейса используются штатные имена выбранной среды. В Windows App SDK набор и гарнитура задаются текущим `Symbol` и ресурсом `SymbolThemeFontFamily`. [WinUI SymbolIcon](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.symbolicon)

| XAML Symbol | Код | WinJS AppBarIcon |
| --- | --- | --- |
| `Previous` | `U+E100` | `previous` |
| `Next` | `U+E101` | `next` |
| `Play` | `U+E102` | `play` |
| `Pause` | `U+E103` | `pause` |
| `Edit` | `U+E104` | `edit` |
| `Save` | `U+E105` | `save` |
| `Clear` | `U+E106` | `clear` |
| `Delete` | `U+E107` | `delete` |
| `Remove` | `U+E108` | `remove` |
| `Add` | `U+E109` | `add` |
| `Cancel` | `U+E10A` | `cancel` |
| `Accept` | `U+E10B` | `accept` |
| `More` | `U+E10C` | `more` |
| `Redo` | `U+E10D` | `redo` |
| `Undo` | `U+E10E` | `undo` |
| `Home` | `U+E10F` | `home` |
| `Up` | `U+E110` | `up` |
| `Forward` | `U+E111` | `forward` |
| `Back` | `U+E112` | `back` |
| `Favorite` | `U+E113` | `favorite` |
| `Camera` | `U+E114` | `camera` |
| `Setting` | `U+E115` | — |
| `Video` | `U+E116` | `video` |
| `Sync` | `U+E117` | `sync` |
| `Download` | `U+E118` | `download` |
| `Mail` | `U+E119` | `mail` |
| `Find` | `U+E11A` | `find` |
| `Help` | `U+E11B` | `help` |
| `Upload` | `U+E11C` | `upload` |
| `Emoji` | `U+E11D` | `emoji` |
| `TwoPage` | `U+E11E` | `twopage` |
| `LeaveChat` | `U+E11F` | `leavechat` |
| `MailForward` | `U+E120` | `mailforward` |
| `Clock` | `U+E121` | `clock` |
| `Send` | `U+E122` | `send` |
| `Crop` | `U+E123` | `crop` |
| `RotateCamera` | `U+E124` | `rotatecamera` |
| `People` | `U+E125` | `people` |
| `OpenPane` | `U+E126` | `openpane` |
| `ClosePane` | `U+E127` | `closepane` |
| `World` | `U+E128` | `world` |
| `Flag` | `U+E129` | `flag` |
| `PreviewLink` | `U+E12A` | `previewlink` |
| `Globe` | `U+E12B` | `globe` |
| `Trim` | `U+E12C` | `trim` |
| `AttachCamera` | `U+E12D` | `attachcamera` |
| `ZoomIn` | `U+E12E` | `zoomin` |
| `Bookmarks` | `U+E12F` | `bookmarks` |
| `Document` | `U+E130` | `document` |
| `ProtectedDocument` | `U+E131` | `protecteddocument` |
| `Page` | `U+E132` | `page` |
| `Bullets` | `U+E133` | `bullets` |
| `Comment` | `U+E134` | `comment` |
| `MailFilled` | `U+E135` | — |
| `ContactInfo` | `U+E136` | `contactinfo` |
| `HangUp` | `U+E137` | `hangup` |
| `ViewAll` | `U+E138` | `viewall` |
| `MapPin` | `U+E139` | `mappin` |
| `Phone` | `U+E13A` | `phone` |
| `VideoChat` | `U+E13B` | `videochat` |
| `Switch` | `U+E13C` | `switch` |
| `Contact` | `U+E13D` | `contact` |
| `Rename` | `U+E13E` | `rename` |
| `Pin` | `U+E141` | `pin` |
| `MusicInfo` | `U+E142` | `musicinfo` |
| `Go` | `U+E143` | `go` |
| `Keyboard` | `U+E144` | `keyboard` |
| `DockLeft` | `U+E145` | `dockleft` |
| `DockRight` | `U+E146` | `dockright` |
| `DockBottom` | `U+E147` | `dockbottom` |
| `Remote` | `U+E148` | `remote` |
| `Refresh` | `U+E149` | `refresh` |
| `Rotate` | `U+E14A` | `rotate` |
| `Shuffle` | `U+E14B` | `shuffle` |
| `List` | `U+E14C` | `list` |
| `Shop` | `U+E14D` | `shop` |
| `SelectAll` | `U+E14E` | `selectall` |
| `Orientation` | `U+E14F` | `orientation` |
| `Import` | `U+E150` | `import` |
| `ImportAll` | `U+E151` | `importall` |
| `BrowsePhotos` | `U+E155` | `browsephotos` |
| `WebCam` | `U+E156` | `webcam` |
| `Pictures` | `U+E158` | `pictures` |
| `SaveLocal` | `U+E159` | `savelocal` |
| `Caption` | `U+E15A` | `caption` |
| `Stop` | `U+E15B` | `stop` |
| `ShowResults` | `U+E15C` | `showresults` |
| `Volume` | `U+E15D` | `volume` |
| `Repair` | `U+E15E` | `repair` |
| `Message` | `U+E15F` | `message` |
| `Page2` | `U+E160` | `page2` |
| `CalendarDay` | `U+E161` | `calendarday` |
| `CalendarWeek` | `U+E162` | `calendarweek` |
| `Calendar` | `U+E163` | `calendar` |
| `Character` | `U+E164` | — |
| `MailReplyAll` | `U+E165` | `mailreplyall` |
| `Read` | `U+E166` | `read` |
| `Link` | `U+E167` | `link` |
| `Account` | `U+E168` | — |
| `ShowBcc` | `U+E169` | `showbcc` |
| `HideBcc` | `U+E16A` | `hidebcc` |
| `Cut` | `U+E16B` | `cut` |
| `Attach` | `U+E16C` | `attach` |
| `Paste` | `U+E16D` | `paste` |
| `Filter` | `U+E16E` | `filter` |
| `Copy` | `U+E16F` | `copy` |
| `Emoji2` | `U+E170` | `emoji2` |
| `Important` | `U+E171` | `important` |
| `MailReply` | `U+E172` | `mailreply` |
| `SlideShow` | `U+E173` | `slideshow` |
| `Sort` | `U+E174` | `sort` |
| `Manage` | `U+E178` | `manage` |
| `AllApps` | `U+E179` | `allapps` |
| `DisconnectDrive` | `U+E17A` | `disconnectdrive` |
| `MapDrive` | `U+E17B` | `mapdrive` |
| `NewWindow` | `U+E17C` | `newwindow` |
| `OpenWith` | `U+E17D` | `openwith` |
| `ContactPresence` | `U+E181` | `contactpresence` |
| `Priority` | `U+E182` | `priority` |
| `GoToToday` | `U+E184` | `gototoday` |
| `Font` | `U+E185` | `font` |
| `FontColor` | `U+E186` | `fontcolor` |
| `Contact2` | `U+E187` | `contact2` |
| `Folder` | `U+E188` | `folder` |
| `Audio` | `U+E189` | `audio` |
| `Placeholder` | `U+E18A` | `placeholder` |
| `View` | `U+E18B` | `view` |
| `SetLockScreen` | `U+E18C` | `setlockscreen` |
| `SetTile` | `U+E18D` | `settile` |
| `ClosedCaption` | `U+E190` | — |
| `StopSlideShow` | `U+E191` | `stopslideshow` |
| `Permissions` | `U+E192` | `permissions` |
| `Highlight` | `U+E193` | `highlight` |
| `DisableUpdates` | `U+E194` | `disableupdates` |
| `UnFavorite` | `U+E195` | `unfavorite` |
| `UnPin` | `U+E196` | `unpin` |
| `OpenLocal` | `U+E197` | `openlocal` |
| `Mute` | `U+E198` | `mute` |
| `Italic` | `U+E199` | `italic` |
| `Underline` | `U+E19A` | `underline` |
| `Bold` | `U+E19B` | `bold` |
| `MoveToFolder` | `U+E19C` | `movetofolder` |
| `LikeDislike` | `U+E19D` | `likedislike` |
| `Dislike` | `U+E19E` | `dislike` |
| `Like` | `U+E19F` | `like` |
| `AlignRight` | `U+E1A0` | `alignright` |
| `AlignCenter` | `U+E1A1` | `aligncenter` |
| `AlignLeft` | `U+E1A2` | `alignleft` |
| `Zoom` | `U+E1A3` | `zoom` |
| `ZoomOut` | `U+E1A4` | `zoomout` |
| `OpenFile` | `U+E1A5` | `openfile` |
| `OtherUser` | `U+E1A6` | `otheruser` |
| `Admin` | `U+E1A7` | `admin` |
| `Street` | `U+E1C3` | `street` |
| `Map` | `U+E1C4` | `map` |
| `ClearSelection` | `U+E1C5` | `clearselection` |
| `FontDecrease` | `U+E1C6` | `fontdecrease` |
| `FontIncrease` | `U+E1C7` | `fontincrease` |
| `FontSize` | `U+E1C8` | `fontsize` |
| `CellPhone` | `U+E1C9` | `cellphone` |
| `ReShare` | `U+E1CA` | `reshare` |
| `Tag` | `U+E1CB` | `tag` |
| `RepeatOne` | `U+E1CC` | `repeatone` |
| `RepeatAll` | `U+E1CD` | `repeatall` |
| `OutlineStar` | `U+E1CE` | `outlinestar` |
| `SolidStar` | `U+E1CF` | `solidstar` |
| `Calculator` | `U+E1D0` | `calculator` |
| `Directions` | `U+E1D1` | `directions` |
| `Target` | `U+E1D2` | `target` |
| `Library` | `U+E1D3` | `library` |
| `PhoneBook` | `U+E1D4` | `phonebook` |
| `Memo` | `U+E1D5` | `memo` |
| `Microphone` | `U+E1D6` | `microphone` |
| `PostUpdate` | `U+E1D7` | `postupdate` |
| `BackToWindow` | `U+E1D8` | `backtowindow` |
| `FullScreen` | `U+E1D9` | `fullscreen` |
| `NewFolder` | `U+E1DA` | `newfolder` |
| `CalendarReply` | `U+E1DB` | `calendarreply` |
| `UnSyncFolder` | `U+E1DD` | `unsyncfolder` |
| `ReportHacked` | `U+E1DE` | `reporthacked` |
| `SyncFolder` | `U+E1DF` | `syncfolder` |
| `BlockContact` | `U+E1E0` | `blockcontact` |
| `SwitchApps` | `U+E1E1` | `switchapps` |
| `AddFriend` | `U+E1E2` | `addfriend` |
| `TouchPointer` | `U+E1E3` | `touchpointer` |
| `GoToStart` | `U+E1E4` | `gotostart` |
| `ZeroBars` | `U+E1E5` | `zerobars` |
| `OneBar` | `U+E1E6` | `onebar` |
| `TwoBars` | `U+E1E7` | `twobars` |
| `ThreeBars` | `U+E1E8` | `threebars` |
| `FourBars` | `U+E1E9` | `fourbars` |
| `Scan` | `U+E294` | `scan` |
| `Preview` | `U+E295` | `preview` |

Имена WinJS с другим написанием или без одноимённого значения `Symbol` в апрельском снимке — `right`, `left`, `settings`, `mail2`, `characters`, `accounts`, `uploadskydrive`, `cc`.
