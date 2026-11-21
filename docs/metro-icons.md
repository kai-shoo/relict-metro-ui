# Windows Phone Metro Icons

[Table of contents](../README.md) · [Components](components.md) · [Visual grammar](foundations.md)

For the Application Bar in Windows Phone 7–8 Silverlight, the historical PNG name and size are stored separately from the command assignment. In Phone 8.1 Store apps, `AppBarButton` can use a raster mask or system symbol. WinJS has a `AppBarIcon` for the same task. The assignments below help select a character for the team, and the identifiers capture a specific source and generation.

## Geometry and display rules

| Profile | Source canvas | Area of sign | Processing |
| --- | --- | --- | --- |
| Phone 7 Silverlight | 48 × 48 physical px | Downtown. | A white sign on a transparent background. The panel draws a circle and subtracts the color of the theme. |
| Phone 8 Silverlight, recommendations for WVGA | 48 × 48 physical px | 26 × 26 px in the center, fields at 11 px | White mask with alpha channel. The panel draws a circle. For the finished SDK icon, the guide specifies a variant from `Icons\Dark`. |
| Phone 8.1 Store apps, 100% | 32 × 32 physical px | 18 x 18 px, fields at 7 px | Transparent background, the image is used as a mask. |
| Phone 8.1 Store apps, 140% | 45 x 45 physical px | 25 x 25 px, fields at 10 px | The resource name ends in `.scale-140.png`. |
| Phone 8.1 Store apps, 240% | 77 × 77 physical px | 41 x 41 px, fields at 18 px | The resource name ends in `.scale-240.png`. The manual requires option 240% and suggests providing all three. |

[Phone 7 Design Guide, pp. 32–35](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=17) · [Microsoft Learn, App bar icon buttons](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431806(v=vs.105)) · [Original graphical ZIP Phone 8](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/asset_template_PSDs.zip) · [Original graphics ZIP Phone 8.1, sheet 6](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/Visual_Assets_Templates_for_Windows_Phone_Store_apps.zip)

Microsoft recommends simple monochrome geometry and familiar metaphors. The main buttons have short text labels that are visible when you open the panel. An action with an obscure metaphor can be placed in a text menu. In Silverlight, the application has hardware Back for log return. When the case is rotated, the panel becomes vertical and keeps the sign oriented to the user. [Guide to the Application Bar buttons](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431806(v=vs.105)) · [App bar for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431813(v=vs.105))

In the library, the color of the mask is taken from the current state of the team through the foreground brush. The outline of the button, the label, the purpose of the touch and the mask are set separately. When disclosed, the label explains the same command. A time state, such as "Play" or "Pause," updates the label and the sign together. [Contract of teams](components.md#library-contract-for-commands) · [Guide to Reproduction Management](https://web.archive.org/web/20140408235720/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh452724.aspx) · [Objectives of touch](foundations.md#input-and-feedback)

## Windows Phone SDK 8.0 raster icons

The Phone 7 v2.0 manual specifies 32 PNGs in each of the light and dark background options in Windows Phone Developer Tools Beta. For the App Bar in the app, the guide indicates a white option. The Phone SDK 8.0 delivery can be checked by installer composition. [Phone 7 Design Guide, pp. 34–35](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=18)

The Windows Phone SDK 8.0 contains the `MobileTools/wpsdkcore/WPSDK_en.cab` package. Its SHA-1 `E4E41CFF011BF11C53A3EBF216253AA042706660` matches Microsoft's installer manifesto. In the `File` table of the `wpsdk_en.msi` package and in the CAB itself, 37 PNGs are confirmed in each `Icons\Dark` and `Icons\Light` folder. Both folders have the same names. PNG headers give 76×76 px for 36 files and 115×115 px for `overflowdots.png`. These are the SDK file sizes, and the table above indicates the recommended sizes when preparing your own drawing. In the tested pairs `add/new`, `cancel/close`, `sync/refresh` matches the alpha channel. [Windows Phone SDK 8.0 Page](https://www.microsoft.com/en-us/download/details.aspx?id=35471) · [Official ISO](https://download.microsoft.com/download/9/3/8/938A5074-461F-4E3D-89F4-5CE2F42C1E36/wpsdkv80_enu1.iso)

The REDIST column saves 32 individual names from Microsoft’s 2013 and 2015 listings. A dash means that there is no separate position for the SDK file in the name list. [Visual Studio 2013 REDIST](https://learn.microsoft.com/en-us/visualstudio/releases/2013/2013-redistribution-vs#windows-phone-icon-files) · [Visual Studio 2015 REDIST](https://learn.microsoft.com/en-us/visualstudio/releases/2015/2015-redistribution-vs#microsoft-windows-phone-sdk-80--and-microsoft-windows-phone-sdk-81)

| Act or appointment | Name in the SDK 8.0 directory | Name in REDIST |
| --- | --- | --- |
| Add | `add.png` | `appbar.add.rest.png` |
| Create | `new.png` | `appbar.new.rest.png` |
| Reduce | `minus.png` | `appbar.minus.rest.png` |
| Confirm | `check.png` | `appbar.check.rest.png` |
| Cancel. | `cancel.png` | `appbar.cancel.rest.png` |
| Close it. | `close.png` | `appbar.close.rest.png` |
| Synchronize | `sync.png` | `appbar.sync.rest.png` |
| Update | `refresh.png` | `appbar.refresh.rest.png` |
| Reference | `questionmark.png` | `appbar.questionmark.rest.png` |
| Get back. | `back.png` | `appbar.back.rest.png` |
| Next | `next.png` | `appbar.next.rest.png` |
| Search | `feature.search.png` | `appbar.feature.search.rest.png` |
| Delete | `delete.png` | `appbar.delete.rest.png` |
| Save. | `save.png` | `appbar.save.rest.png` |
| folder | `folder.png` | `appbar.folder.rest.png` |
| Video | `feature.video.png` | `appbar.feature.video.rest.png` |
| Camera | `feature.camera.png` | `appbar.feature.camera.rest.png` |
| Mail. | `feature.email.png` | `appbar.feature.email.rest.png` |
| Settings | `feature.settings.png` | `appbar.feature.settings.rest.png` |
| Chosen. | `favs.png` | `appbar.favs.rest.png` |
| Add to the select few | `favs.addto.png` | `appbar.favs.addto.rest.png` |
| Download | `download.png` | `appbar.download.rest.png` |
| Download. | `upload.png` | `appbar.upload.rest.png` |
| Share. | `share.png` | `appbar.share.rest.png` |
| Edit | `edit.png` | `appbar.edit.rest.png` |
| Additional teams | `overflowdots.png` | `appbar.overflowdots.png` |
| Reproduce | `transport.play.png` | `appbar.transport.play.rest.png` |
| Pause. | `transport.pause.png` | `appbar.transport.pause.rest.png` |
| Previous or rewind | `transport.rew.png` | `appbar.transport.rew.rest.png` |
| Next, or fast forward. | `transport.ff.png` | `appbar.transport.ff.rest.png` |
| Stop it. | `stop.png` | `appbar.stop.rest.png` |
| Contour of the circle | `basecircle.png` | `appbar.basecircle.rest.png` |
| Alarm clock | `feature.alarm.png` | — |
| Calendar | `feature.calendar.png` | — |
| Phone. | `feature.phone.png` | — |
| I like it. | `like.png` | — |
| Microphone | `microphone.png` | — |

## Official sheets and vector source

Both `Icons_PSD` screens show 32 signed characters each. On the Phone 7 sheet, the commands New and Add, Close and Cancel, Sync and Refresh are signed separately. The Phone 8 sheet brings together each pair and features three additional metaphors, Generic Like, Generic Unlike and Microphone. Exclamation and Remove from Favorites are shown on both sheets, while the verified PNG SDK 8.0 set does not have any files with these assignments. The sheets also have examples of calendar, voice mail and other applied signs with text and counters. [Phone 7, sheet 9 of the attached PDF](windows-phone-archive.md#windows-phone-7-package-contents) · [Phone 8, Icons_PSD.pdf](https://github.com/ghuntley/ux-design-for-windows-phone/blob/9f951a29e44013b8cb8208d6e063b94656af7723/ms%20windows%20phone%20templates/Design%20Templates%20for%20Windows%20Phone%208/PDF/Icons_PSD.pdf)

The `Icons\Vector\basic_shellcommon_vectors.ai` of the SDK 8.0 shows 36 examples on two sheets. In the first 25 common elements with the outline of the button, in the second 11 characters for functions and overflow. Clock, Remove from Favorites and Generic Unlike are available in this vector source. In the standard panel, the circle and menu belong to the panel itself. [Windows Phone SDK 8.0](https://www.microsoft.com/en-us/download/details.aspx?id=35471) · [App bar icon buttons](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431806(v=vs.105))

The vector directory comes with a separate `License.rtf` license. It connects icon distribution with package documentation and limits the code distributed to the Windows Phone platform. REDIST for SDK license holders lists the terms of delivery of unchanged icons with Windows Phone applications. [Official ISO SDK 8.0](https://download.microsoft.com/download/9/3/8/938A5074-461F-4E3D-89F4-5CE2F42C1E36/wpsdkv80_enu1.iso) · [Windows Phone icon files in REDIST](https://learn.microsoft.com/en-us/visualstudio/releases/2015/2015-redistribution-vs#microsoft-windows-phone-sdk-80--and-microsoft-windows-phone-sdk-81)

## Windows Phone 8.1 Store app symbols

Microsoft's April 2014 Help Archive lists 193 `Windows.UI.Xaml.Controls.Symbol` values for Windows 8.1 and Windows Phone 8.1 Runtime. The corresponding headset of that generation is the Segoe UI Symbol. The April Help indicates decimal values, the table below records them in Unicode format. WinJS' June Help lists 196 `AppBarIcon` names and specifies the use of the name in `AppBarCommand.icon`. In it, the `pause` key is given in the lower case. [MSDN Symbol, April 2014](https://web.archive.org/web/20140423170427/http://msdn.microsoft.com/en-us/library/windows/apps/windows.ui.xaml.controls.symbol.aspx) · [MSDN AppBarIcon, June 2014](https://web.archive.org/web/20140629200623/http://msdn.microsoft.com/en-us/library/windows/apps/hh770557.aspx).

In the table next to the names that coincide without register. Names with a different spelling are given after the table by a separate list of WinJS. For the program interface, the staff names of the selected environment are used. In the Windows App SDK, the set and headset are set to the current `Symbol` resource `SymbolThemeFontFamily`. [WinUI SymbolIcon](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.symbolicon)

| XAML Symbol | Code. | WinJS AppBarIcon |
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

Names WinJS with another spelling or without the eponymous value of `Symbol` in the April image — `right`, `left`, `settings`, `mail2`, `characters`, `accounts`, `uploadskydrive`, `cc`.
