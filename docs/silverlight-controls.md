# Specifications for Windows Phone Silverlight Controls

[Component catalogue](components.md) · [Visual principles](foundations.md) · [Scripts](flows.md)

Here are the standard styles of the three `Design/System.Windows.xaml` files that Microsoft installs for Windows Phone 7.0, 7.1 and 8.0 profiles. The dimensions in XAML logical units, brushes and visual states are indicated. The four indentation numbers set the left, upper, right and lower sides in this order. Colors are given in `#AARRGGBB` format. The state names correspond to SDK. [Original Windows Phone SDK 8.0](https://www.microsoft.com/en-us/download/details.aspx?id=35471) · [Resource directory of the topic](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff769552(v=vs.105))

The data is derived from Microsoft’s original ISO without installing an SDK. The composition and paths are confirmed by the File, Component and Directory tables in MSI. For 8.0 templates, CAB from `packages/MobileTools/wpsdkcore`, SHA-1 `e4e41cff011bf11c53a3ebf216253aa042706660` is used. For compatible profiles 7.0 and 7.1, CAB from `packages/MobileTools/wpsdk`, SHA-1 `03dea4b5f0084cfe3e3e786dac946107dc246a57` is used. Both amounts matched the manifesto of Microsoft's official installer. [ISO SDK 8.0](https://download.microsoft.com/download/9/3/8/938A5074-461F-4E3D-89F4-5CE2F42C1E36/wpsdkv80_enu1.iso) · [Manifesto installer](https://download.microsoft.com/download/9/3/8/938a5074-461f-4e3d-89f4-5ce2f42c1e36/WPexpress_full.exe)

In each of the profiles 7.0 and 7.1, all 20 copies of the `System.Windows.xaml` for theme and accent combinations matched the basic template of their generation. All three copies of the 8.0 pattern matched each other. These files are in the directories of the designer. `ThemeResources.xaml` defines the specific values for light and dark topics. Gesture behavior and selection limitations are clarified in the design guides and APIs. For the indicator of uncertain progress, the animation that the SDK builds software is additionally verified. [Hyde Phone 7](sources.md#2010-pdf-page-map) · [The official checklist for Phone 8 and 7.1](windows-phone-archive.md#controls)

## Basic dimensions and brushes

In three profiles, `PhoneBorderThickness` and `PhoneStrokeThickness` are 3, `PhoneTouchTargetOverhang` is 12 on all sides, `PhoneTouchTargetLargeOverhang` is 12 horizontally and 20 vertically. `PhoneHorizontalMargin` is equal to `12,0`, `PhoneVerticalMargin` is equal to `0,12`. The receding pattern and the visible figure give different sizes. In particular, the field width 32 inside the transparent area with side indentations 12 and vertical 20 forms the expected size of 56 × 72 in the absence of additional content and external constraints of the layout. [Geometry and resources theme](foundations.md#phone-8-silverlight-geometry-and-theme-resources)

| Role or brush from SDK 8.0 | Dark | Light |
| --- | --- | --- |
| Foreground and conventional frame, `PhoneForegroundBrush` | `#FFFFFFFF` | `#DE000000` |
| Application background, `PhoneBackgroundBrush` | `#FF000000` | `#FFFFFFFF` |
| Muffled foreground, `PhoneDisabledBrush` | `#66FFFFFF` | `#4D000000` |
| Text on the pressed button, `PhoneButtonBasePressedForegroundBrush` | `#FFFFFFFF` | `#FFFFFFFF` |
| Background system panel and unfilled track Slider, `PhoneChromeBrush` | `#FF1F1F1F` | `#FFDDDDDD` |
| Part of ProgressBar, `PhoneProgressBarBackgroundBrush` Unfinished | `#19FFFFFF` | `#19000000` |
| Ordinary fill and field frame, `PhoneTextBoxBrush` | `#BFFFFFFF` | `#26000000` |
| Field text and cursor system brush | `#FF000000` | `#DE000000` |
| Field fill at focus, `PhoneTextBoxEditBackgroundBrush` | `#FFFFFFFF` | `#00000000` |
| Read-only field text, `PhoneTextBoxReadOnlyBrush` | `#77000000` | `#2E000000` |
| Selection text in `TextBox`, `PhoneTextBoxSelectionForegroundBrush` | `#FFFFFFFF` | `#FFFFFFFF` |
| Selection text in `PasswordBox`, `PhoneContrastBackgroundBrush` | `#FFFFFFFF` | `#DE000000` |

The focus field frame, text highlight background and pouring a number of active controls use the user's accent. `PhoneAccentBrush` refers to `PhoneAccentColor`. [Light and Dark from SDK 8.0](foundations.md#light-and-dark-color-roles-in-sdk-80) · [Palette of accents](foundations.md#phone-75-and-8-accent-palette)

## Buttons and choices

| Control. | Geometry and font in SDK 8.0 | Conditions in SDK 8.0 |
| --- | --- | --- |
| `ButtonBase`, `Button`, `RepeatButton` | Rectangular frame 3 with zero radius. Inside `10,5,10,6`. Outside transparent stock 12. Segoe WP Semibold 22,667 | **Normal** is a transparent foreground color casting, frame and text. **Pressed** - accent fill, white text, normal frame. **Disabled** is a transparent filling, text and frame of `PhoneDisabledBrush` color. **MouseOver** is empty. |
| `ToggleButton` | General button style: Internal indent 8, external 12. Segoe WP Semibold 22,667 | **Unchecked** is a normal button. **Checked** is an accent filler and white text. **Disabled** is a separate layer with muted frame and text. In the marked disconnected state, the fill and frame are muffled, the text of the background color of the page |
| `CheckBox` | Square 32 × 32 with frame 3. Tick 23 × 21, mixed choice square 16 × 16. Label with indentation 12. Transparent margin 12 on the sides and 20 on top and bottom Segoe WP 22.667 | **Normal** is a transparent figure, frame and foreground color mark. **Pressed** - accent fill, white mark. **Disabled** - Muffled frame, mark and label. **Checked**, **Unchecked**, and **Indeterminate** independently show a tick, empty square, or inner square. |
| `RadioButton` | Exterior circle 32 × 32, bar 3. Interior circle 16 × 16.label with indentation 12. Transparent margin 12 on the sides and 20 on the top and bottom. Segoe WP 22.667 | **Normal**, **Pressed**, and **Disabled** use the same color roles as CheckBox. **Checked** shows the inner circle. **Unchecked** is filming it. The **Indeterminate** state in the template is empty. The item changes the single selected key of its group. |
| `HyperlinkButton` | Underlined label at size 22.667. Transparent background, side margins of 12, and padding of 0. | The label uses the foreground color. **Pressed** changes the color to the accent. **Disabled** uses `PhoneDisabledBrush`. **MouseOver** is empty. |

In 7.0 and 7.1, the `ButtonBase` label was 25.333 with a `10,3,10,5` indentation. In the pressed state, the fill and border used the foreground color. The label used the page background color. A checked `ToggleButton` used the same inversion. Pressing `HyperlinkButton` set the label opacity to 0.5. [Button guide](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh487169(v=vs.105)) · [Hyperlink Button](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202899(v=vs.105))

In 7.0 and 7.1, the external selection figures are the same sizes, CheckBox is 24×18. For ordinary casting of the figure, a translucent white `#BFFFFFFF` in Dark and a translucent black `#26000000` in Light are used. The mark in Dark is black, in Light it is `#DE000000`. When pressed, Dark gets a white fill, Light - a transparent fill and a foreground color frame. At the disabled point Dark fill `#66FFFFFF` and mark `#66000000`, Light - transparent fill and mark `#4D000000`. In 8.0, both controls have a transparent resting and a contrasting frame, and the press is marked with an accent. [CheckBox Guide](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202897(v=vs.105)) · [Hyde RadioButton](https://web.archive.org/web/20121105043452/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh202881(v=vs.105).aspx)

The touch of the label works together with the figure of choice. In the official screen templates for CheckBox and RadioButton, up to two lines are allowed. In the historical pattern of buttons and marks, there is no separate visual state of the focus. For keyboard navigation, the library projects a visible focus over the geometry of the selected profile. [Original PSD and PDF Phone 8](windows-phone-archive.md#windows-phone-8-package-contents) · [Input and feedback](foundations.md#input-and-feedback) · [Group choice](flows.md#39-group-checkbox-and-visual-states)

## Input fields

| Control. | Geometry and typeface | Conditions |
| --- | --- | --- |
| `TextBox` | Segoe WP 25,333 font, frame 3, transparent stock 12, internal `Padding` 2 and additional indentation of `1,2` content | **Normal** and **Unfocused** are the background and frame of `PhoneTextBoxBrush`. **Focused** - edit filler and accent frame. **Disabled** is a transparent fill, muted frame and text. **ReadOnly** is a regular filler and a special muted text. **MouseOver** is empty. Highlighting uses accent background and white text |
| `PasswordBox` | Segoe WP 25.333, frame 3, transparent stock 12, `Padding` 2 and additional indentation of `3,2` contents | The conventional and focused look uses the same background and frame roles as TextBox. **Disabled** shows a separate layer with a muted frame and masked text. **ReadOnly** is missing. Highlighting uses an accent background and a contrast background brush for symbols |
| `RichTextBox` | From profile 7.1, the file has a style with a size of 20, a foreground color, a transparent background, a frame and an internal indentation 0. Side field 12 | There are no separate visual groups in this pattern. The content area is stretched horizontally and aligned centrally vertically. |

TextBox profile 7.0/7.1 disabled and read-only view use one alternate layer with nested control. In 8.0, the usual text content is saved, and the design changes the frames and brushes. PasswordBox sets the same template in all three files. When moving into editing, the visible carriage and on-screen keyboard are related to the input context. Microsoft templates suggest leaving the keyboard open automatically for cases where a person has already chosen editing from a previous context. [TextBox Hyde](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202916(v=vs.105)) · [PasswordBox Hyde](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202898(v=vs.105)) · [Screen keyboard and shape](components.md#on-screen-keyboard-and-forms)

## Slider and indicators

| Control or part | SDK 8.0 | SDK 7.0 and 7.1 |
| --- | --- | --- |
| Track `Slider` | Thickness 12. Horizontal field at the edges 12, vertical at the ends 12. Unpainted part of the color of the system panel, filling with an accent. In **Disabled**, track opacity is 0.1 and `PhoneDisabledBrush` filling | Thickness 12, background contrast background brush with opacity 0.2, accent filling. **Disabled** has the same replacements as 8.0 |
| Slider tag | Horizontal 12×24, vertical 24×12. Foreground brush. The horizontal track and filling have `Margin=0,22,0,50`, the label is `0,16,0,44`. Vertical track - `18,0,18,0`, label - `12,0,12,0` | 7.0 uses a transparent `Thumb` with scaling of the input zone. 7.1 figure 12 × 12 with an enlarged transparent zone 60 × 84 horizontally and 48 × 72 vertically |
| Slider values | `Minimum=0`, `Maximum=10`, `Value=0`. The template has **Normal**, empty **MouseOver** and **Disabled**. | The same values and groups of states |
| Separate style of `Thumb` | 48 × 48 with field 12, frame 3. At rest, the background of the page, when you press the foreground, when you turn off the muffled color. It's a common style, and the Slider representation uses its geometry. | Dimensions and states match. `PhoneRadioCheckBoxBrush` is used at rest. |
| `ProgressBar`, **Determinate** | Track and filling height 4, side fields 12, maximum 100. `PhoneProgressBarBackgroundBrush` track, accent filling | Same height, same field and maximum. The track uses an accent with opacity of 0.1. |
| `ProgressBar`, **Indeterminate** | Five squares 4 × 4 with an accent. The pattern switches the visibility of the layer. The trajectories of these squares are determined outside the designer's file. | Five indicators 4×4. In XAML, a cycle of 4.4 s is indicated, a shift in the beginning of the neighboring point by 0.2 s and the stroke of each point is 2.5 s. Keys are set to 0.5 s with EaseOut, 2 s with linear interpolation and 2.5 s with EaseIn. |

In the 8.0 `v8.0/Private/System.Windows.dll` package, the `ProgressBar.EnsureIndeterminateAnimations` and `RecalculateIndeterminateAnimations` methods are available. In the software branch for the main version of the application above 4, the cycle of 4.4 s, the delay of 0.2 s between points and the same three key moments are stored. If the width of the area is `w` and the width of the point is `d`, the X coordinate begins in `−d−1`. At 0.5 c the value is equal to `(w+d)/3−d`, at 2 c - `2(w+d)/3−d`, at 2.5 c - `w+1`. The first and last keys correspond to `ExponentialEase` with index 1 and `EaseOut` and `EaseIn` modes. Parameters obtained by static reading IL of the original build, SHA-256 `252ca242a8f289e0720c6fd75d168a2b9de466ecda5ff4eb5f6765d6a6273c34`. [ISO SDK 8.0](https://download.microsoft.com/download/9/3/8/938a5074-461f-4e3d-89f4-5ce2f42c1e36/wpsdkv80_enu1.iso)

The Slider template from the Phone 8 screen set recommends horizontal orientation by default. Scale marks are optional, labels set extreme values. The slider shows a change in a continuous quantity, such as brightness. ProgressBar has its source of fortune. When the operation allows cancellation, the cancellation command belongs to the parent surface, the indicator itself does not accept input. [Hyde Slider](https://web.archive.org/web/20121105044708/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh202877(v=vs.105).aspx) · [Hyde ProgressBar](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202917(v=vs.105)) · [Scenario setting with preview](flows.md#41-preview-and-save-a-setting-with-a-slider)

## Scrolling, lists and containers

| Control. | Parameters and conditions |
| --- | --- |
| `ScrollViewer` | Vertical indicator `Auto`, horizontal `Disabled`, background and frame transparent, frame thickness and `Padding` 0. The indicator width or height of 5 has an initial opacity of 0. In **Scrolling**, it immediately becomes opaque, for the transition, the template sets 0.5 s. |
| `ScrollBar` | Minimum thickness 5, internal indentation 1. Minimum length of movable part along axis 72. `PhoneDisabledBrush` filling. The sign and Tab entrance are off. Control shows position |
| `ListBox` | Transparent background and frame, `Padding` and frame thickness 0. The color of the text is taken from `PhoneForegroundBrush`. The content is placed inside the vertical `ScrollViewer`, the horizontal band is turned off |
| `ListBoxItem` | Transparent background and frame, frame thickness and `Padding` 0, the content begins at the top left. **Selected** accents the content, **Disabled** sets 0.5 opacity and transparent background. **MouseOver** and **Unselected** are empty |
| `ContentControl` | The content gets horizontal and vertical alignment of the parent, `Padding` gets transferred to `Margin` content. |
| `ViewportControl` | The template is in the SDK 8.0. It conveys content, pointer, alignment and indentation to the view. Visual groups in the XAML design are missing. |

ScrollViewer, ScrollBar, ListBox, ListBoxItem, and ContentControl all have the same template across all three profiles. The guide describes hiding the indicator about one second after the gesture ends. The value of the visual transition duration of 0.5 s in XAML and the pause after the gesture refer to different stages. The height of the line of the collection is given by its contents and the style of the element. [ScrollViewer guide](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202907(v=vs.105)) · [ListBox guide](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202882(v=vs.105)) · [Collection catalogue](components.md#collections-and-direct-manipulation)

## Application in the library

The visual part can use the dimensions and brushes of this profile. The component contract further captures the accessible name, selection semantics, keyboard control and focus recovery. The dimensions of the lines, the fields on the screen grid and the height of the container should be calculated from the contents. Shell controls, Toolkit and Phone Store apps have their own templates. [ScrollViewer and Axis Conflict](flows.md#10-swipe-scroll-and-axis-conflicts) · [Available activities and status](components.md#accessible-actions-and-state) · [Implementation audits](flows.md#end-to-end-checks-for-future-implementation)
