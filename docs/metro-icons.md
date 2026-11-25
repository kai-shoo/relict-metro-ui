# Windows Phone Metro Icons

[Table of contents](../README.md) · [Components](components.md) · [Visual grammar](foundations.md)

## Use icons in Relict Metro UI

Open the [SVG icon catalog](/icons/) to find a supported name. Select a drawing to copy its HTML. Each drawing is an original SVG path on a 24 × 24 grid. The icon inherits its color from the surrounding text.

Import the element once:

```js
import 'relict-metro-ui/icon';
```

Use a decorative icon next to visible text. Set `label` when the icon alone conveys information:

```html
<p><metro-icon name="save"></metro-icon> Save changes</p>
<metro-icon name="volume-mute" label="Audio muted"></metro-icon>
```

Set `--metro-icon-size` to change the width and height. To get the supported names in code, import `metroIconNames` from `relict-metro-ui/icon`.

## Read the Windows Phone archive

The sections below describe historical Windows Phone resources. **SDK filenames, XAML symbols, and WinJS identifiers are not the Relict icon API.** For example, use `name="search"`, not the SDK filename `feature.search.png`. The archived XAML symbol `Scan` does not have a built-in Relict icon.

## Geometry and display rules

| Profile | Source canvas | Glyph area | Display rules |
| --- | --- | --- | --- |
| Phone 7 Silverlight | 48 × 48 physical px | Centered | White glyph on a transparent background. The Application Bar draws the circle. |
| Phone 8 Silverlight, recommendations for WVGA | 48 × 48 physical px | 26 × 26 px in the center, fields at 11 px | White mask with alpha channel. The panel draws a circle. For the finished SDK icon, the guide specifies a variant from `Icons\Dark`. |
| Phone 8.1 Store apps, 100% | 32 × 32 physical px | 18 x 18 px, fields at 7 px | Transparent background, the image is used as a mask. |
| Phone 8.1 Store apps, 140% | 45 x 45 physical px | 25 x 25 px, fields at 10 px | The resource name ends in `.scale-140.png`. |
| Phone 8.1 Store apps, 240% | 77 × 77 physical px | 41 x 41 px, fields at 18 px | The resource name ends in `.scale-240.png`. The manual requires option 240% and suggests providing all three. |

[Phone 7 Design Guide, pp. 32–35](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=17) · [Microsoft Learn, App bar icon buttons](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431806(v=vs.105)) · [Original graphical ZIP Phone 8](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/asset_template_PSDs.zip) · [Original graphics ZIP Phone 8.1, sheet 6](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/Visual_Assets_Templates_for_Windows_Phone_Store_apps.zip)

Microsoft recommended simple monochrome shapes and familiar symbols. Opening the Application Bar revealed a short label for each button. Commands without a familiar symbol could use a text menu. Silverlight apps used the hardware Back button for navigation. In landscape mode, the bar moved to the side and kept its icons upright. [Application Bar buttons](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431806(v=vs.105)) · [App bar for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431813(v=vs.105))

Keep a command's icon and label in sync. For example, when a media player starts playback, change both the drawing and the label from Play to Pause. [Library contract for commands](components.md#library-contract-for-commands) · [Media playback guide](https://web.archive.org/web/20140408235720/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh452724.aspx) · [Input and feedback](foundations.md#input-and-feedback)

## Windows Phone SDK 8.0 raster icons

The Phone 7 v2.0 guide lists 32 PNGs for each theme in Windows Phone Developer Tools Beta. The guide specifies white icons for the Application Bar. [Phone 7 Design Guide, pp. 34–35](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=18)

The Windows Phone SDK 8.0 contains `MobileTools/wpsdkcore/WPSDK_en.cab`. Its SHA-1 `E4E41CFF011BF11C53A3EBF216253AA042706660` matches Microsoft's installer manifest. The CAB and the `File` table in `wpsdk_en.msi` list the same 37 PNG filenames in `Icons\Dark` and `Icons\Light`. In each folder, 36 files measure 76 × 76 px. The exception is `overflowdots.png` at 115 × 115 px. These are the shipped file sizes, not the design canvas sizes above. Three pairs have matching alpha channels: `add/new`, `cancel/close`, and `sync/refresh`. [Windows Phone SDK 8.0](https://www.microsoft.com/en-us/download/details.aspx?id=35471) · [Official ISO](https://download.microsoft.com/download/9/3/8/938A5074-461F-4E3D-89F4-5CE2F42C1E36/wpsdkv80_enu1.iso)

The REDIST column gives the 32 filenames in Microsoft's 2013 and 2015 redistribution lists. A dash means the lists have no separate entry for that SDK file. [Visual Studio 2013 REDIST](https://learn.microsoft.com/en-us/visualstudio/releases/2013/2013-redistribution-vs#windows-phone-icon-files) · [Visual Studio 2015 REDIST](https://learn.microsoft.com/en-us/visualstudio/releases/2015/2015-redistribution-vs#microsoft-windows-phone-sdk-80--and-microsoft-windows-phone-sdk-81)

| Command or shape | Name in the SDK 8.0 directory | Name in REDIST |
| --- | --- | --- |
| Add | `add.png` | `appbar.add.rest.png` |
| Create | `new.png` | `appbar.new.rest.png` |
| Reduce | `minus.png` | `appbar.minus.rest.png` |
| Confirm | `check.png` | `appbar.check.rest.png` |
| Cancel | `cancel.png` | `appbar.cancel.rest.png` |
| Close | `close.png` | `appbar.close.rest.png` |
| Synchronize | `sync.png` | `appbar.sync.rest.png` |
| Update | `refresh.png` | `appbar.refresh.rest.png` |
| Help | `questionmark.png` | `appbar.questionmark.rest.png` |
| Back | `back.png` | `appbar.back.rest.png` |
| Next | `next.png` | `appbar.next.rest.png` |
| Search | `feature.search.png` | `appbar.feature.search.rest.png` |
| Delete | `delete.png` | `appbar.delete.rest.png` |
| Save | `save.png` | `appbar.save.rest.png` |
| Folder | `folder.png` | `appbar.folder.rest.png` |
| Video | `feature.video.png` | `appbar.feature.video.rest.png` |
| Camera | `feature.camera.png` | `appbar.feature.camera.rest.png` |
| Mail | `feature.email.png` | `appbar.feature.email.rest.png` |
| Settings | `feature.settings.png` | `appbar.feature.settings.rest.png` |
| Favorites | `favs.png` | `appbar.favs.rest.png` |
| Add to favorites | `favs.addto.png` | `appbar.favs.addto.rest.png` |
| Download | `download.png` | `appbar.download.rest.png` |
| Upload | `upload.png` | `appbar.upload.rest.png` |
| Share | `share.png` | `appbar.share.rest.png` |
| Edit | `edit.png` | `appbar.edit.rest.png` |
| More commands | `overflowdots.png` | `appbar.overflowdots.png` |
| Play | `transport.play.png` | `appbar.transport.play.rest.png` |
| Pause | `transport.pause.png` | `appbar.transport.pause.rest.png` |
| Previous or rewind | `transport.rew.png` | `appbar.transport.rew.rest.png` |
| Next or fast forward | `transport.ff.png` | `appbar.transport.ff.rest.png` |
| Stop | `stop.png` | `appbar.stop.rest.png` |
| Circle outline | `basecircle.png` | `appbar.basecircle.rest.png` |
| Alarm clock | `feature.alarm.png` | — |
| Calendar | `feature.calendar.png` | — |
| Phone | `feature.phone.png` | — |
| Like | `like.png` | — |
| Microphone | `microphone.png` | — |

## Official sheets and vector source

Both `Icons_PSD` screens show 32 signed characters each. On the Phone 7 sheet, the commands New and Add, Close and Cancel, Sync and Refresh are signed separately. The Phone 8 sheet brings together each pair and features three additional metaphors, Generic Like, Generic Unlike and Microphone. Exclamation and Remove from Favorites are shown on both sheets, while the verified PNG SDK 8.0 set does not have any files with these assignments. The sheets also have examples of calendar, voice mail and other applied signs with text and counters. [Phone 7, sheet 9 of the attached PDF](windows-phone-archive.md#windows-phone-7-package-contents) · [Phone 8, Icons_PSD.pdf](https://github.com/ghuntley/ux-design-for-windows-phone/blob/9f951a29e44013b8cb8208d6e063b94656af7723/ms%20windows%20phone%20templates/Design%20Templates%20for%20Windows%20Phone%208/PDF/Icons_PSD.pdf)

The `Icons\Vector\basic_shellcommon_vectors.ai` of the SDK 8.0 shows 36 examples on two sheets. In the first 25 common elements with the outline of the button, in the second 11 characters for functions and overflow. Clock, Remove from Favorites and Generic Unlike are available in this vector source. In the standard panel, the circle and menu belong to the panel itself. [Windows Phone SDK 8.0](https://www.microsoft.com/en-us/download/details.aspx?id=35471) · [App bar icon buttons](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431806(v=vs.105))

The vector directory comes with a separate `License.rtf` license. It connects icon distribution with package documentation and limits the code distributed to the Windows Phone platform. REDIST for SDK license holders lists the terms of delivery of unchanged icons with Windows Phone applications. [Official ISO SDK 8.0](https://download.microsoft.com/download/9/3/8/938A5074-461F-4E3D-89F4-5CE2F42C1E36/wpsdkv80_enu1.iso) · [Windows Phone icon files in REDIST](https://learn.microsoft.com/en-us/visualstudio/releases/2015/2015-redistribution-vs#microsoft-windows-phone-sdk-80--and-microsoft-windows-phone-sdk-81)

## Windows Phone 8.1 Store app symbols

Microsoft's April 2014 reference lists 193 `Windows.UI.Xaml.Controls.Symbol` values for Windows 8.1 and Windows Phone 8.1 Runtime. These apps used the Segoe UI Symbol font. The table shows the original decimal values as Unicode code points. The June 2014 WinJS reference lists 196 `AppBarIcon` names for `AppBarCommand.icon`. [MSDN Symbol, April 2014](https://web.archive.org/web/20140423170427/http://msdn.microsoft.com/en-us/library/windows/apps/windows.ui.xaml.controls.symbol.aspx) · [MSDN AppBarIcon, June 2014](https://web.archive.org/web/20140629200623/http://msdn.microsoft.com/en-us/library/windows/apps/hh770557.aspx)

The table pairs names that differ only in case. The list after the table gives the remaining WinJS names. Use the spelling for the platform you target. For current Windows App SDK behavior, see [WinUI SymbolIcon](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.symbolicon).

| XAML Symbol | Code point | WinJS AppBarIcon |
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

Other WinJS names: `right`, `left`, `settings`, `mail2`, `characters`, `accounts`, `uploadskydrive`, `cc`.
