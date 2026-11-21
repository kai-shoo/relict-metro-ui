# Design foundations and visual rules

[Table of contents](../README.md) · [Components](components.md) · [Scripts](flows.md) · [Primary sources](sources.md)

## Principles by generation

In the pre-release guide Windows Phone 7 is the starting point is the graphics of urban navigation. The size and position of the words set the order of reading, the space separates the groups, and the cropped edge of the horizontal composition invites to the next movement. The five principles of the guide cover a clear and fast interface, priority of content, consistency with the device, meaningful movement and personal living state. At the application level, this is recognized by large headers, a minimum of permanent binding, system-wide Back, and variable tiles. [Windows Phone 7 UI Design and Interaction Guide 8–17](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=5)

Before describing the appearance of the guide Windows Phone 7 sets three directions for the tasks of the application. **Personal** is about personal choices and choices. **Relevant** stands for the actual context of people and places. **Connected** refers to accessing your data and connections. At the script level, you can see this when the tile opens the saved purpose, and the review shows what is important for the current context. [Windows Phone 7 Philosophy, pp. 8–9](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=5)

In the introduction to Windows Phone 8.1, Microsoft reconnects the visual language with the simplicity of Swiss typography and navigational transport graphics. Moving helps to understand what part of the application the user was in and how he got there. In Hub, this is expressed in the consistent shifting of the background, the general header and sections. [Introduction to the Phone 8.1 Design Library](https://web.archive.org/web/20140410153319id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn642029.aspx) · [Original Phone Hub Guide](https://web.archive.org/web/20140408233046id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn596112.aspx)

The Dev Center Phone 8 features five stages. The concept sets the main task, the structure distributes the content across the screens, the interaction determines transitions and reactions, the visual stage refines the grid, typography and design, and the prototype allows you to check everything together. In the Audible example published, the Hub gives the entrances to the library, the store, and the statistics, and the specific task goes deeper. For the library, this provides a way to test the component in the task with a real transition and a return state. [Process at Dev Center](https://web.archive.org/web/20130127123808id_/http://dev.windowsphone.com:80/en-us/design/process) · [App design process for Windows Phone](https://web.archive.org/web/20121105014709id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh202873(v=vs.105).aspx)

In a Microsoft template for a brief design brief, the team articulates the audience, purpose, and core value of the product, then explains which solutions support it and what tone is needed. For a library example, these fields clarify why a particular scenario is chosen and how it works. [Design Brief Template](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/Design_Brief_Template.docx)

The Phone 8.1 guide first describes the tasks and their priorities, then sketches the basic and temporal states. The app map shows the hierarchy of screens. The map of an individual task shows the sequence of actions, for example, from the search to the result card. To test the prototype, Microsoft offers to observe how a person understands the task and passes it on their own. [App conceptualization](https://web.archive.org/web/20140618190015id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn596096.aspx) · [Design the best app you can](https://web.archive.org/web/20140618112350id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596108.aspx)

In the **Defining vision** desktop manual, the main benefit of the application is formulated in one sentence. This wording checks what tasks will be included in the prototype and where the capabilities of the platform help. For example, a shared travel scenario involves adding seats, discussing the route, and sending an invitation. For each task, describe the sequence of actions before selecting controls. [Defining vision](https://web.archive.org/web/20140410154330id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/hh465427.aspx)

Dev Center Phone 8 and Windows Store 8.1 share five common principles. Attention to detail extends to grid, typography and accessibility. A quick, smooth response supports continuous touch. The digital environment allows live data and typography to change the view. Concentration leaves the elements needed for the task on the screen. Integration uses common platform contracts and allows applications to work together. [Principles at Dev Center](https://web.archive.org/web/20130111181057id_/http://dev.windowsphone.com:80/en-us/design/Principles) · [Windows 8.1 UX guidelines, pp. 7–10](https://tilsgee.github.io/DesignGuidelinesArchive/uwp8.1.pdf#page=7)

Modern Windows Design lays out the practice by color, typography, navigation, commands, layout, geometry, layers, and movement. Windows 11 describes its own materials and approach to layering. It is useful for the library to borrow systematic work with themes, focus and adaptability and leave the visual palette of the mobile Metro as a separate profile. [Windows Design guidelines](https://learn.microsoft.com/en-us/windows/apps/design/guidelines-overview) · [Commanding basics](https://learn.microsoft.com/en-us/windows/apps/design/basics/commanding-basics)

| Observable principle | What to check on the screen |
| --- | --- |
| Contents in the centre | On the first screen, it's clear what's open and what action is appropriate right now. Text and data occupy the center area, secondary commands are available through the menu. |
| Space as a guide | Headings and adjacent sections give an idea of the structure, and the margins within the group are smaller than between groups. |
| Direct control | When touched, feedback appears, when captured dragging, the visible surface follows the finger. |
| Movement connects states | The transition has a source and a destination. The beginning, the completion and the interruption leave a distinct state. |
| Personalization | Theme, accent, fixed assignments, and meaningful updates are saved regardless of the specific screen. |
| Agreed return | Before opening the parts, you can predict where Back will lead. The transition state is confirmed after the explicit operation is completed. |

In the early design of Windows 10, Microsoft attributed navigation choices to the availability of a specific action. In the Photos project, frequent switching between the collection and the albums on the phone was left available via swipe. In Outlook, the team took into account the depth of the account and folder structure and feedback about the commands in the bottom panel. For a future library, it's the difference between a destination model and a control that suits a particular screen shape and input method. [Windows 10 Design](https://blogs.windows.com/windowsexperience/2015/04/29/windows-10-design-getting-the-balance-right/)

## Typography and text

Segoe WP is the Windows Phone 7 system typeface. The early guidance separates the app identifier, page title, section headings, body text, and secondary information. In a wide layout, the container title, section headings, and content form distinct visual levels. A Phone 7 page title shows context and stays in place when present. Modern Windows uses Segoe UI Variable. [Fonts, Page Title and Panorama](sources.md#2010-pdf-page-map) · [Typography in Windows](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/typography)

**Library contract.** The semantic roles of text are `Display`, `PageTitle`, `SectionTitle`, `ItemTitle`, `Body`, `Caption`, and `CommandLabel`. The theme profile specifies the headset, size, line spacing, and outline for each role. The system stack and its spare headsets should have Cyrillic, numbers and the necessary writing. Team icons have an independent destination line. Labels describe action through short verbs and take into account declination, plurality, and locale formatting of dates.

### Silverlight SDK text sizes and styles

| SDK resource | Value in XAML units |
| --- | --- |
| `PhoneFontSizeSmall` | 18,667 |
| `PhoneFontSizeNormal` | 20 |
| `PhoneFontSizeMedium` | 22,667 |
| `PhoneFontSizeMediumLarge` | 25,333 |
| `PhoneFontSizeLarge` | 32 |
| `PhoneFontSizeExtraLarge` | 42,667 |
| `PhoneFontSizeExtraExtraLarge` | 72 |
| `PhoneFontSizeHuge` | 186,667 |

The base text uses Segoe WP size 20 and `PhoneForegroundBrush`. The `PhoneTextTitle1Style`, `PhoneTextTitle2Style` and `PhoneTextTitle3Style` use the Segoe WP Semilight sizes 72, 32 and 22.667, respectively. The `PhoneTextGroupHeaderStyle` also uses a size 32 Semilight. The library can take these proportions as a basis and choose values for the density and scale of the text of the target environment. The Phone 7 guide specifically stipulated Segoe WP distribution, so the profile can use a headset installed or a compatible replacement. [SDK Resource Directory](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769552(v=vs.105)) · [Hyde Phone 7, page 40](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=21)

For plain text, `PhoneTextBlockBase` sets a horizontal indentation 12. Short styles in the table inherit this indentation. The dictionary defines the size and font of these styles. Line spacing allows text engine. [SDK 8.0 Dictionary](sources.md#extracted-windows-phone-sdk-80-resources)

| Role or style of XAML | Description · size | Brush |
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

Each of the six Segoe WP faces in the original Phone 7 package has an OpenType weight. The weights are 200 (Light), 300 (Semilight), 400 (Regular), 600 (Semibold), 700 (Bold), and 800 (Black). All six cover the Russian alphabet, including U+0401 and U+0451. Each uses 2048 units per em. In the `hhea` metrics, ascent is 2210, descent is −514, and line gap is 0. The control template and layout algorithm determine the line height. [Composition, source and license of Font.zip](windows-phone-archive.md#windows-phone-7-package-contents)

A large header can only go beyond the physical edge in a container, where it is part of a visual continuity. The full name of the section remains available semantically. Page titles and commands with a large text scale provide for the transfer, extension of the area or access to the full text. The register is selected by role and language. The margin of width for translation is checked on real lines.

### Interface tone

In the Microsoft library, the **Voice for Windows Phone** article describes the tone of the written text. She suggests speaking naturally, taking into account what task a person is in, and using language that retains meaning when translating. In the library, a short command name indicates the action, an error message reports the result and the next step available, and the full accessible name is saved when visually abbreviated. [Voice for Windows Phone 8](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj662928(v=vs.105)) · [Voice in Phone 8.1 Documentation](https://web.archive.org/web/20140618162025id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596125.aspx)

## Layout, themes, and accent colors

In the Phone Store apps, the system theme set a light or dark background and user accent. Standard controls inherit colors automatically. The operator or manufacturer could add their accent, so the application logic must work with any value from the system. The library's historic profile stores color roles separate from sizes and typography and checks for highlighting on both backgrounds. [Theme design decisions for Windows Phone](https://web.archive.org/web/20140408233050id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596122.aspx)

The Phone 7 also has a light and dark background and a custom accent. The guide describes the platform’s color theme change and separate portrait/landscape scenarios. His examples in physical pixels belong to devices of that generation. In WinUI, the adaptation comes from the effective window size. The list/details pattern uses the width of the available area, and the change of orientation leaves the open object the same. [Units, orientation and themes in the Phone 7 Guide](sources.md#2010-pdf-page-map) · [Windows Adaptive Points](https://learn.microsoft.com/windows/apps/design/layout/screen-sizes-and-breakpoints-for-responsive-design) · [List/details](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/list-details)

In Store apps guide 8.1, the minimum width of a phone profile is 384 effective px in the portrait and 640 in the landscape. For the desktop profile, 500 px is indicated by default and 320 px with explicit support. At the minimum width, commands, overlays, navigation, and main content are still being checked. These values set reference dimensions for the historical profile. [Guidelines for supporting multiple screen sizes](https://web.archive.org/web/20140714071743/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh465349.aspx)

With the Phone 8, the manufacturer or carrier could add their own accent color. Therefore, in the project contract, the color of the topic is represented by the value, and the meaning of the state sets a separate role. The sizes and typography have their own tokens, though the colors changed when the theme changed in Silverlight. [Theme design decisions for Windows Phone](https://web.archive.org/web/20121103210213/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh202878(v=vs.105).aspx)

**Library contract.** The table specifies minimum sets of tokens.

| Set. | rolely |
| --- | --- |
| Surfaces. | `canvas`, `surface`, `overlay`, `scrim`, `divider` |
| Text and emphasis | `textPrimary`, `textSecondary`, `textDisabled`, `accent`, `onAccent`, `focus` |
| Conditions | `selection`, `hover`, `pressed`, `error`, `warning`, `success`, `info` |
| Composite | Edge receding, intervals within the row and between sections, minimum activation area, panel height and safe indentations |
| Movement | Short response time, layer entry and page transition, curves and inertia parameters. Separate representation for reduced movement |

The role of `onAccent` is allowed for a specific background. The selected element differs in shape, marker or label even when monochrome display. The focus state remains distinguishable over the selected and pressed element. For long lists, the grid is set by a string, for details by content fields. A fixed panel has space in the geometry of the page or an explicitly declared overlay mode. The overlay layer has rules for the visibility of the last item in the list and focus fields when the keyboard is open. [XAML theme resources](https://learn.microsoft.com/en-us/windows/uwp/design/controls-and-patterns/xaml-theme-resources) · [Color in Windows](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/color) · [Layout overview](https://learn.microsoft.com/en-us/windows/apps/design/layout/)

In WinUI, `{ThemeResource}` allows the key when you download XAML and again when you change the theme. It is also used in an active visual state to update, for example, the focus brush when a contrasting theme is included. The dictionaries `Light`, `Dark` and `HighContrast` give values for the same roles. For a contrasting theme, brushes take custom system colors, including button background and text color. [ThemeResource Extension](https://learn.microsoft.com/en-us/windows/apps/develop/platform/xaml/themeresource-markup-extension) · [Contrast themes](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/high-contrast-themes)

In WinUI, the `AdaptiveTrigger` applies the visual state to the minimum width or height of the window in effective pixels. When both minimums are specified, both conditions must be met. In a library, thresholds depend on how much space the content needs. The nested component calculates its placement on the area available to it. When changing the layout, the selected keys and history are saved, and the focus is translated to the nearest visible counterpart if its former element is hidden. [Responsive layouts](https://learn.microsoft.com/en-us/windows/apps/develop/ui/layouts-with-xaml) · [AdaptiveTrigger](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.adaptivetrigger)

### Phone 8 Silverlight geometry and theme resources

The SDK defines `PhoneMargin` with a value of 12, `PhoneHorizontalMargin` with a value of `12, 0`, and `PhoneVerticalMargin` with a value of `0, 12`. The thickness of the frame and stroke is 3. `PhoneTouchTargetOverhang` is 12, and `PhoneTouchTargetLargeOverhang` is set by `12, 20`. These values refer to the pattern and complement the physical size rules of the touch target. `PhoneForegroundBrush` and `PhoneBackgroundBrush` serve as the primary foreground and background brushes, `PhoneDisabledBrush` and `PhoneSubtleBrush` as secondary state brushes, and `PhoneChromeBrush` coordinates color with the Application Bar. For TextBox, cursor brushes, selection and editing state are separately set. The Silverlight example reads a theme from `PhoneDarkThemeVisibility` and an accent from `PhoneAccentColor`. [Theme resources for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769552(v=vs.105)) · [How to apply theme resources for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769545(v=vs.105))

| Screen in Phone 8 Update 3 | Physical pixels | Area after scaling | `ScaleFactor` |
| --- | --- | --- | --- |
| WVGA | 480 × 800 | 480 × 800 | 100 |
| WXGA | 768 × 1280 | 480 × 800 | 160 |
| 720p | 720 × 1280 | 480 × 853 | 150 |
| 1080p | 1080 × 1920 | 480 × 853 | 150 |

At 1080p, the `ScaleFactor` value is available to the application as 150, and the system uses a factor of 2.25. In Microsoft’s example, the `Grid` has the height strings `Auto` and `*`. The app uses an additional 53 units in height on 16:9 displays, keeping the overall width. Layouts are checked on both aspect ratios, and graphics on each size for which a separate file is provided. [Multi-resolution apps for Windows Phone 8](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj206974(v=vs.105))

### Light and Dark color roles in SDK 8.0

The values are taken from the original design dictionaries `Dark\ThemeResources.xaml` and `Light\ThemeResources.xaml` of the SDK 8.0 package. The color format is `#AARRGGBB`. For example, `#DE000000` in a light theme sets a black color with the alpha `DE`. The final look of the translucent brush depends on the substrate. [Checking the package and the path to files](sources.md#extracted-windows-phone-sdk-80-resources)

| Colour key | Dark | Light | Application |
| --- | --- | --- | --- |
| `PhoneBackgroundColor` | `#FF000000` | `#FFFFFFFF` | von |
| `PhoneForegroundColor` | `#FFFFFFFF` | `#DE000000` | Main text and framework |
| `PhoneContrastBackgroundColor` | `#FFFFFFFF` | `#DE000000` | Contrast substrate |
| `PhoneContrastForegroundColor` | `#FF000000` | `#FFFFFFFF` | Text of contrast substrate |
| `PhoneDisabledColor` | `#66FFFFFF` | `#4D000000` | Disabled text and boundaries |
| `PhoneSubtleColor` | `#99FFFFFF` | `#66000000` | Secondary text and lines |
| `PhoneTextHighContrastColor` | `#FFFFFFFF` | `#DE000000` | High contrast text |
| `PhoneTextMidContrastColor` | `#99FFFFFF` | `#73000000` | Average level of contrast |
| `PhoneTextLowContrastColor` | `#73FFFFFF` | `#40000000` | Low level of contrast |
| `PhoneChromeColor` | `#FF1F1F1F` | `#FFDDDDDD` | System panels |
| `PhoneSemitransparentColor` | `#AA000000` | `#AAFFFFFF` | Semi-transparent substrate |
| `PhoneProgressBarBackgroundColor` | `#19FFFFFF` | `#19000000` | Indicator background |
| `PhoneButtonBasePressedForegroundColor` | `#FFFFFFFF` | `#FFFFFFFF` | Text of the button pressed |
| `PhoneTextBoxColor` | `#BFFFFFFF` | `#26000000` | Field background in normal condition |
| `PhoneTextBoxForegroundColor` | `#FF000000` | `#DE000000` | Text of the field |
| `PhoneTextCaretColor` | `#FF000000` | `#DE000000` | Input cursor |
| `PhoneTextBoxEditBackgroundColor` | `#FFFFFFFF` | `#00000000` | Background in editing mode |
| `PhoneTextBoxReadOnlyColor` | `#77000000` | `#2E000000` | Read-only mode |
| `PhoneTextBoxSelectionForegroundColor` | `#FFFFFFFF` | `#FFFFFFFF` | Highlighted text |
| `PhoneInactiveColor` | `#33FFFFFF` | `#33000000` | Obsolete inactivity brush |
| `PhoneInverseInactiveColor` | `#FFCCCCCC` | `#FFE5E5E5` | Obsolete inverse brush of inactivity |
| `PhoneInverseBackgroundColor` | `#FFFFFFFF` | `#FFDDDDDD` | Obsolete inverse background |
| `PhoneBorderColor` | `#BFFFFFFF` | `#99000000` | Obsolete color frame |

In both themes, the `PhoneTextBoxEditBorderBrush` editable field frame and the `PhoneRadioCheckBoxPressedBrush` pressed fill refer to the current `PhoneAccentColor`. CheckBox and RadioButton have regular fillers that are transparent. The frame and mark refer to `PhoneForegroundColor`. The hands of the disconnected state are set by a control pattern. For an inactive Pivot header, the dictionary specifies opacity of 0.4 in Dark and 0.23144 in Light. [Official names and assignment of resources](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769552(v=vs.105))

### Color roles in SDK 7.0 and 7.1

In both profiles, Dark and Light themes have ten accent options. A comparison of all the dictionaries showed that only `PhoneAccentColor` changes within each theme from variant to variant. All common literal colors listed in the SDK 8.0 table have the same meanings. 7.0 and 7.1 also define the individual colors of the editing frame, CheckBox and RadioButton. [Extracted dictionaries](sources.md#extracted-windows-phone-sdk-80-resources)

| SDK color key 7.0 and 7.1 | Dark | Light |
| --- | --- | --- |
| `PhoneTextBoxEditBorderColor` | `#FFFFFFFF` | `#DE000000` |
| `PhoneRadioCheckBoxColor` | `#BFFFFFFF` | `#26000000` |
| `PhoneRadioCheckBoxDisabledColor` | `#66FFFFFF` | `#00000000` |
| `PhoneRadioCheckBoxCheckColor` | `#FF000000` | `#DE000000` |
| `PhoneRadioCheckBoxCheckDisabledColor` | `#66000000` | `#4D000000` |
| `PhoneRadioCheckBoxPressedColor` | `#FFFFFFFF` | `#00000000` |
| `PhoneRadioCheckBoxPressedBorderColor` | `#FFFFFFFF` | `#DE000000` |

### Phone 7.5 and 8 accent palette

The MSDN table has 20 accents for the Phone 8. Ten of them are also noted in the Phone 7.5 column. The values below are taken from the HEX column in ARGB format from the illustration of the 2014 edition. In brackets, the names of the Phone 7.5 are indicated if they are different. The design token `accent` accepts the color that the device transmits. [Themes for Windows Phone, 2014 Edition](https://web.archive.org/web/20140419214046id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/develop/ff402557(v=vs.105).aspx) · [Original MSDN Table](https://web.archive.org/web/20130925151014id_/http://i.msdn.microsoft.com/dynimg/IC674329.png)

| Emphasis on Phone 8 | HEX Phone 8 | HEX Phone 7.5 on the MSDN table |
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

In the illustration of the edition of 2012 Yellow listed `#FFD8C100`, and Sienna — `#FF7A3B3F`. In 2014, the HEX Yellow was changed to `#FFE3C800`, and the plate retained the RGB `216, 193, 0`. In both illustrations, Pink has RGB `244, 141, 208` printed, while HEX and plaque give `244, 114, 208`. For Purple, in a separate theme reading example, Microsoft uses `#FFA200FF`. [Table from the 2012 edition](https://web.archive.org/web/20140518062640/http://i.msdn.microsoft.com/dynimg/IC619215.png) · [Table from the 2014 edition](https://web.archive.org/web/20130925151014id_/http://i.msdn.microsoft.com/dynimg/IC674329.png) · [An example of accent reading in Silverlight](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769545(v=vs.105))

In 20 `Design\AccentColors` SDK 8.0 files, 19 names and values matched the Phone 8 column. In the package for the designer there is **Taupe `#FF87794E`**, and in the MSDN table there is **Sienna `#FFA0522D`**. So when you check the layout, it's important to write down the palette version. [Dictionaries of colors SDK 8.0](sources.md#extracted-windows-phone-sdk-80-resources)

Emphases from design dictionaries 7.0 and 7.1 allow you to reproduce a specific issue. For Lime, the SDK 7.0 gives `#FF8CBF26` and the SDK 7.1 gives `#FFA2C139`. Magenta values `#FFFF0097` and `#FFD80073`, respectively. Both versions use the **Purple `#FFA200FF`**. The other seven accents matched the MSDN column for the Phone 7.5. [SDK packages](sources.md#extracted-windows-phone-sdk-80-resources)

### XAML themes and typography in Phone 8.1 Store apps

The `generic.xaml` phone archive contains separate dictionaries `Default` (dark theme), `Light`, `HighContrastBlack` and `HighContrastWhite`. Below is a complete table of the literal values of `Color` within these dictionaries. Information about the assembly number in the copy is not available. The emphasis in all dictionaries comes from the system resource `SystemColorControlAccentColor`. [Copy of generic.haml](https://gist.github.com/tmyt/dca3b0ccb3374c90a11a1b2e5b04ff2c/784d54c4b867dff1ac67cbd99a5f18b0aa997385#file-generic-xaml-L16-L74) · [Microsoft's Guide to Themes](https://web.archive.org/web/20140408233050id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596122.aspx)

| Key key | Default | Light | HighContrastBlack | HighContrastWhite |
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

`ApplicationPageBackgroundThemeBrush` uses `PhoneBackgroundColor` and `ApplicationForegroundThemeBrush` uses `PhoneBaseMediumHighColor`. The app title uses `PhoneForegroundColor`, the secondary text is `PhoneBaseMidColor`. `ContentDialog` substrate uses `PhoneChromeColor`, dimming - `ContentDialogDimmingColor`. [Alias brushes in a copy of the dictionary](https://gist.github.com/tmyt/dca3b0ccb3374c90a11a1b2e5b04ff2c/784d54c4b867dff1ac67cbd99a5f18b0aa997385#file-generic-xaml-L73-L105)

There are six sizes of `TextStyle…FontSize` in XAML units. They are 10.66 for Small, 16 for Medium, 18.14 for Large, 25.5 for ExtraLarge, 29.86 for ExtraLargePlus and 34.14 for ExtraExtraLarge. `ContentControlThemeFontFamily` defines Segoe WP, `ContentControlFontSize` is 20.26. Specific controls can use their values. [Typographical set in XAML copy](https://gist.github.com/tmyt/dca3b0ccb3374c90a11a1b2e5b04ff2c/784d54c4b867dff1ac67cbd99a5f18b0aa997385#file-generic-xaml-L1437-L1450) · [XAML and WinJS specifications](store-81-visual-specs.md)

### Phone 8 export asset sizes

SDK sets, resource names and geometry of App Bar icons are available in a shared directory. [Windows Phone Metro Icons](metro-icons.md)

The Asset Template Guide specifies physical pixel sizes for WVGA, 720p and WXGA. The size of the exported file, the internal area of the mark and the interaction area are stored separately. In particular, 26 × 26 px refers to the App Bar button pattern in the WVGA template. The size of the touch is calculated according to the rules for entering the corresponding profile. [Asset Template Guide, pp. 1-8](https://github.com/ghuntley/ux-design-for-windows-phone/blob/9f951a29e44013b8cb8208d6e063b94656af7723/ms%20windows%20phone%20templates/AssetTemplateGuide.pdf)

| Resource | Sizes in Phone 8 templates |
| --- | --- |
| App Bar button, WVGA | Circle 48 × 48 px The sign inside is 26 × 26 px. |
| Screensaver | Shared file 768 × 1280 px. Individual options 480 × 800 for WVGA, 720 × 1280 for 720p and 768 × 1280 for WXGA. |
| Von Panorama | 1536 × 1280 px. |
| Application icon | 99 × 99 px, the internal field of the template is 14 px. |
| Flip and Cycle tiles | Small file 159 × 159 with markup field 43 px, average 336 × 336 with field 101 px, wide 691 × 336 with fields 279 × 101 px. background fills the entire surface. |
| Iconic tiles | Small icon up to 110 px in width and 110 px in height, medium up to 202 px in width and 202 px in height. Template fields 19 and 34 px, respectively. When exporting, the guide suggests cropping the file along the upper and lower border of the sign. |
| Lock screen | Background 768 × 1280 px, icon 38 × 38 px. |
| Lens badge | 173×173 for WVGA, 259×259 for 720p, 277×277 px for WXGA. |
| File Association and Store badges | Three squares for files 33, 69 and 179 px Store images 300 × 300 and 1000 × 800 px. |

### Phone 8.1 Store app assets

The Graphical Guide suggests using typography and content to highlight tasks, and graphics to indicate an action, state, or brand. For tiles that receive a system background, the guide offers a transparent image background and a white sign. The screensaver appears briefly, so important text for the action should be available on the next screen. [Essential graphics, visual indicators, and notifications](https://web.archive.org/web/20141012014027id_/http://msdn.microsoft.com:80/en-us/library/windows/apps/dn596109.aspx)

In the original ZIP Phone 8.1, templates contain resources on scales of 100, 140, and 240 percent. The basic Start tiles in Windows Runtime help have 71 × 71, 150 × 150 and 310 × 150 px at a scale of 100. The app list icon has 44 × 44 px at the same scale. Resources in all available sizes are tied to one purpose. The system selects the appropriate file and notification template by tile size. [Phone Store apps templates](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/Visual_Assets_Templates_for_Windows_Phone_Store_apps.zip) · [Tile and toast visual assets](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh781198(v=win.10))

The six-page guide inside the ZIP indicates 32, 45 and 77 px graphics masks for the App Bar Store apps with 18, 25 and 41 px, respectively. For Hub, the package provides background options for theme and scale. The document recommends a low-contrast background to keep headlines and content readable. [Visual Asset Design Templates for Windows Phone Store apps](windows-phone-archive.md#visual-asset-templates-for-windows-phone-store-apps)

The table brings together canvases from six pages of the guide. The brackets indicate the square size of the sign, if given. Dimensions are indicated in physical pixels. At least 240% files are required. Hyde recommends providing all scales, and for file associations lists mandatory `targetsize` 63, 129 and 336 px. [Original templates and guide](https://cmsresources.windowsphone.com/devcenter/en-us/downloads/Visual_Assets_Templates_for_Windows_Phone_Store_apps.zip)

| Appointment | 100% | 140% | 240% |
| --- | --- | --- | --- |
| `Square71x71Logo` · Small tile | 71 × 71 (32) | 99 × 99 (45) | 170 × 170 (77) |
| `Square150x150Logo` · Medium tile | 150 × 150 (60) | 210 × 210 (84) | 360 × 360 (144) |
| `Wide310x150Logo` · wide tiles | 310 × 150 (60) | 434 × 210 (84) | 744 × 360 (144) |
| `Square44x44Logo` - List of applications | 44 × 44 (32) | 62 × 62 (44) | 106 × 106 (76) |
| `StoreLogo` | 50 × 50 (32) | 70 × 70 (46) | 120 × 120 (80) |
| von Hub | 640 × 533 | 1097 × 914 | 1536 × 1280 |
| `SplashScreen@Image` | 480 × 800 | 672 × 1120 | 1152 × 1920 |
| `AppBarButton` mask | 32 × 32 (18) | 45 × 45 (25) | 77 × 77 (41) |

## Input and feedback

The Phone 7 guide describes tap, double tap, pan, flick, hold, and pinch/stretch. In tap, feedback begins with touch, the action is performed when released. The guide sets the usual target of touching from 9 mm with a gap of 2 mm, and 7 mm gives as an exception. Screen and hardware keyboards refer to separate input surfaces. In modern Windows, touch, mouse, keyboard, and pen all have different ways of addressing. [Hyde Phone 7, pp. 70–102](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=36) · [Touch interactions](https://learn.microsoft.com/en-us/windows/apps/design/input/touch-interactions) · [Keyboard interactions](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-interactions)

In Phone Store apps tap stops inertial movement. Pan leads the surface after the finger and, when released, leads it to an acceptable position. Flick continues to move after releasing, and pinch zooms in relative to the middle between the fingers. These rules link the gesture manager to the scrolling and scale state. [Phone 8.1 gestures in MSDN](https://web.archive.org/web/20140501211142id_/http://msdn.microsoft.com:80/en-us/library/windows/apps/dn596119.aspx)

The **Input and feedback patterns** guide for the Windows Store suggests designing touch-based goals and maintaining predictable behavior when changing the input device. The mouse and touchpad provide precise guidance, the pen can point and draw, and the keyboard supports element bypass, activation, and commands. In the library, changing the input device saves the current task, the selected object, and the input data. [Input and feedback patterns](https://web.archive.org/web/20140501004253id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn456349.aspx)

The Phone 8.1 manual distinguishes between visible sign, touch area, and the gap between targets. For the main actions, the target is from 9 × 9 mm. In case of height deficiency, a wide line can have a goal of 7 mm in height with a width of 15 mm. Larger targets are recommended for actions with a noticeable cost of casual touch. These physical dimensions belong to a historical profile. [Interactions and usability in MSDN](https://web.archive.org/web/20140408235718id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn596113.aspx)

| Entering | Behavior in the library |
| --- | --- |
| Touching | Clicking shows the response, releasing ends the action. Clicking the axis or canceling stops the waiting tap. Holding can open the context menu. |
| Mouse. | Hover gives a hint, the main click activates, the secondary opens the context, and the wheel continues the expected scroll of the collection. |
| keyboard | Tab shifts focus between areas, arrows move within the composite control according to its role, Enter/Space activates the control semantics, Escape closes the current layer when it allows cancellation. |
| Screen reader | An item has a name, a role, a value and a state, and you can open, select, change the value and call the menu, and when you change the section, you can say the result. |
| feather | The library supports pointing and activation, and the surface of handwriting or stroke capture defines the individual gesture rules. |

## Motion and continuity

The historic Phone Hub moves the background, header and content at different speeds. Pivot is responsible for the transition between neighboring views. WinUI describes the individual transitions between pages and the relationship of the list element to its representation on the detail page. [Windows 8.1 UX guidelines, pages 131–135 and 161–164](sources.md#windows-81-and-windows-phone-81) · [Page transitions](https://learn.microsoft.com/en-us/windows/apps/design/motion/page-transitions) · [Connected animation](https://learn.microsoft.com/en-us/windows/apps/develop/motion/connected-animation)

**Library contract.** Touch animation follows input. After release, the control leads the surface to the target state. A command transition connects the selected object, header, or navigation direction to the new screen. If a common element has disappeared or has changed its geometry, a short page transition is used. In the mode of reduced movement, an instant change or a slight attenuation is used. Route, allocation and focus are confirmed by one model in any movement setting.

| Event. | Behavior |
| --- | --- |
| Start drag | Cancel the pending activation of the nested button after capturing the movement. |
| Release | Lock the adjacent section or return the current position according to the axis and speed control rules. |
| New input during transition | Interrupt the visual part and start from the current visible position, the result of the sequence of events is recorded once. |
| Change in width or subject matter | Recalculate the geometry, maintain the semantic state, complete the transition in the target state if the geometry is unusable. |
| Getting back from details | Return the source object and its position before restoring focus, if the object is still present. |

### Motion in Phone 8 and 8.1

The Microsoft Guide distinguishes between screen transitions and local reactions. Turnstile indicates the direction of navigation, Tilt confirms the touch of the interactive surface, and Panorama input can show the direction of scrolling. Hyde describes a smooth deceleration at entry, acceleration at exit, and an S-curve as an option for large displacement. These descriptions define the nature of the movement. Numerical curves and durations remain part of the future library's theme. [Animations, motion, and output for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202871(v=vs.105))

The MSDN version for Phone Store apps links Tilt to `PointerDownThemeAnimation` and requires a response during the gesture. Local animation indicates a change in control, directional transition shows movement through history, and a long-term task receives visible progress. Sound and vibration complement the response with the user's system settings. [Animations, Motion, and Output for Phone Store Apps](https://web.archive.org/web/20141223184936id_/http://msdn.microsoft.com:80/en-us/library/windows/apps/dn596095.aspx)

### WinUI transition semantics

| Changing context | The source of movement in WinUI | Application in the library |
| --- | --- | --- |
| Replacement of main section | EntranceNavigationTransitionInfo enters the content by shifting and attenuating. | Used when entering a new root, the focus follows the new page policy. |
| Opening of the child screen | DrillInNavigationTransitionInfo shows a deepening of the hierarchy. | Linked to the route of the parts. The return is reversed. |
| Neighbouring page | SlideNavigationTransitionInfo specifies the direction of the horizontal input. | The order of the sections and the direction of the gesture determine the shift, including RTL. |
| Transition of one object between representations | Connected Animation connects two visual representations of the object. SuppressNavigationTransitionInfo allows you to skip the standard Frame junction. | The transition is linked to the object key. If the string is virtualized or disappeared, the normal page transition is applied. |

[Page transitions](https://learn.microsoft.com/en-us/windows/apps/develop/motion/page-transitions) · [Connected animation](https://learn.microsoft.com/en-us/windows/apps/develop/motion/connected-animation)

## Accessibility and localization

The visible icon and its touch target have different sizes. Keep controls legible when the user increases text size. Let the system keyboard handle input when necessary. In RTL layouts, adjust the logical start, item order, and transition direction. Mirror icons only when their meaning calls for it. Keep reading order consistent with the task on narrow and wide screens. Announce status changes according to their importance. Announce a progress phase change, but do not announce each background tile update. [Windows accessibility](https://learn.microsoft.com/en-us/windows/apps/design/usability/) · [Guidelines for interactions, pp. 390-393](sources.md#2014-pdf-page-map) · [Globalization and Localization in the Phone 7 Guide](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=12)

In the background update, Windows 8.1 recommended changing the desired area of the page and reporting the result through the live region. In the library, permanent elements preserve the identity and order of reading. In a routine update, status is declared whenever possible, and urgency depends on the outcome of the task. Static text remains in read order, Tab leads through interactive elements. [Microsoft’s Accessibility Guide, pp. 390–392](https://tilsgee.github.io/DesignGuidelinesArchive/uwp8.1.pdf#page=390) · [AutomationProperties.LiveSetting](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.automation.automationproperties.livesetting?view=windows-app-sdk-2.0)

The profile check includes a long header in Russian, RTL language, right-hand scrolling area, narrow screen with on-screen keyboard, text enlargement, high contrast, disengaged movement and performing a key action without a gesture. For a downloaded collection, the missing item is added and the position is restored after a change in order.
