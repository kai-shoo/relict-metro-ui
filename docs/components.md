# Components and contracts

[Table of contents](../README.md) · [Principles](foundations.md) · [Scripts](flows.md) · [Sources](sources.md)

This guide keeps official names where they help you find the source documentation. Each platform generation has its own API and behavior.

[Visual specifications by family](../README.md#visual-specifications) · [The official checklist for Phone 8 and 7.1](windows-phone-archive.md#controls) · [Directory Phone 8.1](windows-phone-archive.md#windows-phone-81-store-apps)

## Component interaction map

| Components | What's passed between them | Script | Primary source |
| --- | --- | --- | --- |
| Panorama / Phone Hub, Frame and Page | The preview transmits the object key. When you return, the visit restores the section, the scroll anchor, and the focus. | [Review → Details → Review](flows.md#1-open-details-and-return-to-the-overview) | [List with details drilldown](https://web.archive.org/web/20141006051436id_/http://msdn.microsoft.com/en-us/library/windows/apps/dn596115.aspx) |
| Phone Hub and CommandBar | The visible section sets the context of the page commands. The panel changes the composition and mode after the section changes. | [Teams of the current section](flows.md#25-phone-hub-and-current-section-commands) | [Example of SectionsInViewChanged by the Windows team](https://blogs.windows.com/windowsdeveloper/2014/07/22/tips-and-tricks-for-using-xaml-controls-in-your-universal-windows-apps/) |
| Pivot and ListView | Pivot transmits the filter key. The list stores its own scrolling. In the WinJS sample, multiple selection temporarily blocks section switching. | [Filter at Pivot](flows.md#2-use-pivot-to-switch-filters) | [WinJS on Phone 8.1](https://blogs.windows.com/windowsdeveloper/2014/04/18/winjs-on-windows-phone-8-1/) · [Sample source](windows-phone-archive.md#sample-source-analysis) |
| NavigationView, Frame and BreadcrumbBar | The top-level point and the ancestor in the hierarchy transmit different destinations, and the allocation in the framework synchronizes with the active route. | [Paragraph of the annex and placement in the document](flows.md#4-top-level-items-and-document-position) | [Navigation basics](https://learn.microsoft.com/en-us/windows/apps/design/basics/navigation-basics) |
| CommandBar, MenuFlyout and ContentDialog | The layer receives the command, the target key, and the initiator. Confirmation processes the result. Closing restores focus. | [Context team](flows.md#5-overflow-context-commands-and-confirmation) · [The Back Order](flows.md#3-back-closes-the-current-context) | [Command bar](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/command-bar) · [ContentDialog](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/dialogs-and-flyouts/dialogs) |
| LongListSelector with JumpList or SemanticZoo Collection | The review returns the group key. The collection resolves it in the current data and restores the position. | [List, groups and selection](flows.md#6-long-lists-group-navigation-and-selection) | [LongListSelector in Phone 8](https://blogs.windows.com/windowsdeveloper/2013/05/23/windows-phone-8-xaml-longlistselector/) · [Semantic Zoom](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/semantic-zoom) |
| ListView, part panel and adaptive layout | The list transmits the record key. The width changes the placement of the list and the details. Both layouts use the same choice. | [List and details](flows.md#7-list-and-details-on-narrow-and-wide-screens) | [List/details](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/list-details) |
| AutoSuggestBox, Results List and Frame | The input updates the query. The confirmation of the offer opens the result or starts the search by the selected value. | [Search and clues](flows.md#8-search-and-suggestions) | [Auto-suggest boxes](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/auto-suggest-box) |
| Field, form, ScrollViewer and on-screen keyboard | The host transmits the available area. The form saves the text and scrolls through the active field along with the verification message. | [Shape and keyboard](flows.md#32-forms-and-the-on-screen-keyboard) | [Touch keyboard](https://learn.microsoft.com/en-us/windows/apps/develop/input/respond-to-the-presence-of-the-touch-keyboard) |
| Slider, exact field, preview and form | Both inputs change one valid value. The preview shows a draft. The form confirms the retention. | [Slider and preview](flows.md#41-preview-and-save-a-setting-with-a-slider) | [Guidelines for sliders](https://web.archive.org/web/20140408235721/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh465473.aspx) |
| Draft page, system picker and host | When activated, the host returns the selected file or cancellation to the restored session. | [System Selection and Share](flows.md#14-system-pickers-share-and-the-app-boundary) | [File picker sample source](windows-phone-archive.md#sample-source-analysis) |
| Pivot / Hub, ScrollViewer and interactive map | The horizontal shift belongs to a single container, and the map gets a separate gesture area on its page. | [Axis conflict](flows.md#10-swipe-scroll-and-axis-conflicts) · [Map from the review](flows.md#26-open-a-map-and-return-to-a-selected-location) | [Phone Hub](https://web.archive.org/web/20140408233046id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn596112.aspx) |
| RefreshContainer, List, ProgressRing and InfoBar | The update changes the state of the query and the data. The list holds a reference line. The error reports the result and suggests a repeat. | [Update, Empty Screen and Error](flows.md#11-refresh-empty-state-and-error) | [Pull-to-refresh](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/pull-to-refresh) · [InfoBar](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/infobar) |
| Secondary Tile, Notification, Host and Frame | The system entry point transmits the destination. The application checks the current data and opens the corresponding page. | [Tile and activation](flows.md#12-tile-pinning-updates-and-activation) · [Notification and re-entry](flows.md#13-toast-notification-center-and-reactivation) | [Tile Design Guidelines for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj662929(v=vs.105)) · [Phone 8.1 Samples](windows-phone-archive.md#windows-phone-81-samples-from-msdn-code-gallery) |
| TabView, window and document session | The window stores the order of the tabs. The transfer transmits the session key, confirmed by the receiving window. | [Document tab and portability](flows.md#40-close-and-transfer-document-tabs) | [Tab view](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/tab-view) |

[Owners of fortune](flows.md#state-owners) · [End-to-end inspections](flows.md#end-to-end-checks-for-future-implementation)

## Navigation surfaces

| Surface. | When to apply | Content and communication with the rest of the screen |
| --- | --- | --- |
| **Frame / Page** | The user has separate destinations and a history of visits. | Frame manages the route and the log. Page sets the title, content area, commands, and closing policy. Moving to another object can create a history record. |
| **Panorama** (Phone 7–8 Silverlight) | The main viewing surface with several heterogeneous areas. | One wide canvas: The background, general heading, section headings and content are moved in layers. Previews, lines and links lead to details or specialized pages. |
| **Phone Hub** (8.1 Phone Store) | Appendix review and entry into related areas. | Hub, HubSection, optional headers, own section content. Microsoft describes a portrait, a cycle with three or more sections, a maximum of five sections, a return to the last section, and a minimized panel. |
| **Desktop Hub** (Windows 8.1 Store) | Overview of a large collection with different ways of entering. | The sections form a top-level navigation, and the section header can open a separate page. |
| **Pivot / PivotItem** | Equal representations of one context, such as incoming filters. | Headers switch panels. The Phone allows horizontal slide/flick and vertical scrolling of the nested list. Guide 8.1 describes a cycle, four to five sections as the top recommendation, and headings up to two words. The potentially filled section is left empty. |
| **NavigationView** (WinUI) | The main points of the application that need a permanent navigation frame. | The top or side area defines a point. The application associates the activation with Frame and updates the status of the point after the Back/deep link. |
| **SelectorBar** (WinUI) | A few small, unambiguous presentation switches. | The visible choice changes on the spot. The app links the selected item to the view. |
| **TabView** (WinUI) | Independent documents or working tabs. | Each tab has its own context, address, and state of the document, and the opening, closing, and selection are explicitly controlled. |
| **BreadcrumbBar** (WinUI) | Visible ancestral hierarchy. | The ancestor's choice is to move to a place in the structure. Back remains an operation on the history of visits. |
| **List/details** (WinUI pattern) | List of entities with selected details. | The narrow version shows the list or details. The wide version shows both panels and the selected row. The selectedId model is common to the options. |

[Panorama and Pivot in SDK](sources.md#windows-phone-8-and-windows-8) · [Windows 8.1 UX guidelines, pp. 119-135 and 161-164](sources.md#2014-pdf-page-map) · [Navigation basics](https://learn.microsoft.com/en-us/windows/apps/design/basics/navigation-basics) · [WinUI Navigation](sources.md#winui-control-reference-links)

### Hub for Windows Store 8.1

The desktop Hub has a shared header, sections with its own data, and an optional hero accent block. The interactive section header shows the chevron and raises the transition event. To view the entire section, the application opens a separate page. When launched, Hub prepares the visible sections first, the rest is downloaded later. In a narrow mode, the sections can be placed vertically. The app saves the scroll position, and Semantic Zoom can open a section review. [Description of Hub by the Windows team](https://blogs.windows.com/windowsdeveloper/2014/02/05/introducing-the-new-hub-control-for-heterogeneous-data/)

| Part part | Responsibility in the library |
| --- | --- |
| Common headline and hero | They give the context and show the priority selection. The interactive hero elements publish their commands and assignments. |
| Regular section heading | Gives the name of the area for reading, focusing and navigating sections. |
| Interactive headline | It has an accessible opening action for the entire partition, and the transition transfers the section key, the location, and the focus source. |
| Section body. | Manages data query, display, and local actions. Section error has status and recurrence. |
| Overview of sections | Allows the same key when you move from the general overview to a specific section. Detailed pages use Frame log. |

[Hub scenario with heterogeneous data](flows.md#24-hub-with-mixed-data-and-partial-loading)

### Windows Phone 8.1 XAML and WinJS surfaces

Numbers from XAML templates and early WinJS sources are linked to version and source. [Visual Specifications for Phone 8.1 Store Apps](store-81-visual-specs.md)

In Windows Phone 8.1, the Visual Studio team matched Silverlight’s Panorama with Windows Runtime XAML’s Hub. Phone XAML also included Pivot, WebView, and ContentDialog. In the desktop Windows Store 8.1 from this set were present Hub and WebView. Projects could share data and transition context, and the view was selected by profile. Microsoft's sample separates the header element with the on-screen Back button for Windows and the hardware Back processing for Phone. [XAML Control Templates and Table](https://devblogs.microsoft.com/visualstudio/authoring-windows-8-1-apps-in-xaml/) · [Shared pages and controls](https://blogs.windows.com/windowsdeveloper/2014/07/22/tips-and-tricks-for-using-xaml-controls-in-your-universal-windows-apps/)

The Phone Hub in XAML has a horizontal layout, the default section takes up 90% of the window width, and the two sections do not form a cycle. The API transmits a list of visible sections via `SectionsInViewChanged`. In Microsoft’s example, AppBar showed the core command and included a compact mode while the recent elements section was at the top of the list. When it left, the panel returned to minimum mode. [Phone Hub Rules](https://blogs.windows.com/windowsdeveloper/2014/07/22/tips-and-tricks-for-using-xaml-controls-in-your-universal-windows-apps/) · [Hub Script and Team Panels](flows.md#25-phone-hub-and-current-section-commands)

The Phone Hub guide describes the overall header, background, section headers, and content as independently moving layers. The general heading should be readable in all parts of the background. Control, which requires its own horizontal gesture, opens on a separate page. For example, a card with a preview card opens an interactive map, and Back returns to the same Hub section. [Original Phone Hub Recommendations](https://web.archive.org/web/20140408233046id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn596112.aspx) · [Scenario of gesture conflict](flows.md#10-swipe-scroll-and-axis-conflicts)

WinJS 2.1 added Pivot for Phone, where it could contain ListView. The list of controls in this branch is different from XAML. Flyout, Menu, NavBar, SearchBox, SettingsFlyout, Tooltip, and BackButton are all missing from Phone WinJS 2.1. When describing component support, the library specifies a platform option. [WinJS on Windows Phone 8.1](https://blogs.windows.com/windowsdeveloper/2014/04/18/winjs-on-windows-phone-8-1/)

In the Silverlight migration guide on Windows Runtime 8, Microsoft matches PhoneApplicationFrame and NavigationService with Frame, PhoneApplicationPage with Page, Panorama with Hub, LongListSelector with SemanticZoom, and ApplicationBar with CommandBar. The Silverlight App Bar icons correspond to `PrimaryCommands`, the drop-down menu items are `SecondaryCommands`. When transferring, the behavior of a particular element is determined by its profile. [Class comparison table](https://learn.microsoft.com/en-us/previous-versions/windows/apps/dn800286(v=win.10))

In the Phone 8.1 Pivot manual, horizontal gestures are reserved for panel switching. Vertical listings and links remain interactive. Independent tasks with text input, map or other horizontal gesture are displayed on a separate page. An object in the panel can open such a page via Frame. [Original Pivot Recommendations](https://web.archive.org/web/20140413025235id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596104.aspx) · [Gesture conflict](flows.md#10-swipe-scroll-and-axis-conflicts)

### Library contract for pages and sections

In Phone 8.1, a Frame entry corresponds to a place where the user can return. Such places include a Hub review and a detail page. The screensaver, entry dialog, and error screen are all time states. The Pivot panel and the change of object within the same card are saved in the state of their page. Back closes the overlay or returns to the previous Frame page. [Pages, screens and item enumeration in MSDN](https://web.archive.org/web/20140501211142id_/http://msdn.microsoft.com:80/en-us/library/windows/apps/dn596119.aspx)

- **Page.** Input: route identifier, parameters, optional header, content, command set, return and restore focus rules. Signals - transition request, successful opening, closing. The form page may pause the departure until confirmed.
- **Panorama/Hub.** Inputs are stable section identifiers, headers, optional general background, start section, and loop policy. Conditions - wait for input, drag, lead to position, completed section. The model distinguishes the visible shift from the confirmed sectionId. The preview can request a route, retaining the section and anchor. For the historic Phone Hub, the cycle is included in three sections. For other profiles, this is a clear setup.
- **Pivot.** Input data is a set of single-level views with independent loading and scrolling states. Header activation, keyboard selection, and completed swipe change `value` and send a single `metro-change` event. Assignment via API updates the interface without event. Visual copies at the edge of the cycle remain out of order of reading and focus. If the current item is removed or deactivated, Pivot selects the first one available in markup order. When the set is empty, `value` becomes an empty string.
- The **Hub and Pivot link.** Hub opens a route with Pivot via a link or line. In Phone 8.1, these containers are placed on separate pages. A map, carousel, or slider that needs the same gesture axis can be opened on a separate route. In Phone 7, the guide separately describes the vertically scrolling sections of Panorama and the wide horizontal sections. The Phone Hub has its own restrictions from the 2014 chapter.
- **Modern profile.** The current WinUI documentation recommends Windows 11 SelectorBar or NavigationView in scenarios where Pivot was previously used. In the Metro profile, neighboring headlines and flipping are saved. The choice between the profiles gives interactive geometry and overflow model. [Pivot at WinUI](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/pivot)

### Restrictions on Windows Phone versions

In the March CTP, the manual describes Panorama and Pivot as patterns that developers have assembled themselves. In July v2.0, pre-made controls and templates for both surfaces are announced as future resources. [List of CTP, pp. 29-31](https://web.archive.org/web/20100326152152id_/http://download.microsoft.com/download/D/8/6/D869941E-455D-4882-A6B8-0DBCAA6AF2D4/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20Series.pdf#page=33) · [Panorama in v2.0](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=83) · [Pivot in v2.0](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=88)

| Container | Primary source rules |
| --- | --- |
| Panorama, Phone 8 Silverlight | Portrait mode, cyclic transition between the extreme sections, restoration of the last section when returning to the same Panorama. The App Bar works in Minimized. The general guide recommends up to five sections. In the model of independent panels from a separate manual recommended up to four. |
| Pivot, Phone 8 Silverlight | Up to four submissions, one-word or two-word titles, a cycle. Independent editing is placed on the page. A vertical list with rows open can be Pivot content. |
| Phone Hub, Phone 8.1 Store | Portrait mode, up to five sections, cyclic navigation with three or more sections. |
| Pivot, Phone 8.1 Store | Cyclical navigation, short headings, up to four or five representations of the composite guide, and the empty view is saved if data can appear in it. |

[Panorama for Phone 8](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202912(v=vs.105)) · [Pivot for Phone 8](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202919(v=vs.105)) · [Model of independent panels](windows-phone-archive.md#structure-and-navigation) · [Phone 8.1 manual, pp. 131–135 and 161–164](sources.md#2014-pdf-page-map)

On Phone 8, Frame put individual page visits into the story. The time screen closed through the hardware back, and Pivot and flipping objects remained transitions inside the page. On Windows 10 Mobile, the raw system Back could be transmitted to the shell to exit the application. In the library, the adapter receives the Back signal, the top layer component or Frame reports the result, and the host receives the raw signal. [Navigation and gestures Phone 8](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh202911(v=vs.105)) · [SystemNavigationManager](https://learn.microsoft.com/en-us/uwp/api/windows.ui.core.systemnavigationmanager)

### Title, geometry and navigation

The **PivotHeader** sheets for Phone 7 and 8 have an interactive version with an app title and a horizontal row of sections. Next is a static version with a page title. Such a title in the library has the semantics of an ordinary title. Tab highlighting, arrow navigation within the row and switching gesture belong to Pivot itself. [Patterns Phone 7, sheet 16](windows-phone-archive.md#windows-phone-7-package-contents) · [PivotHeader for Phone 8](https://github.com/ghuntley/ux-design-for-windows-phone/blob/9f951a29e44013b8cb8208d6e063b94656af7723/ms%20windows%20phone%20templates/Design%20Templates%20for%20Windows%20Phone%208/PDF/PivotHeader_PSD.pdf)

In the **Panorama** sheet, the title is stretched over a wide canvas, and adjacent sections are visible beyond the current boundary. Nodes inside the section open routes to Frame. For the Phone 8, the template describes portrait mode, crossing the loop boundary, and a separate page for Pivot. A section may contain a link to such a page. [Panorama](https://github.com/ghuntley/ux-design-for-windows-phone/blob/9f951a29e44013b8cb8208d6e063b94656af7723/ms%20windows%20phone%20templates/Design%20Templates%20for%20Windows%20Phone%208/PDF/Panorama_PSD.pdf)

The numbers below are taken from design dictionaries and built-in SDK build patterns. Dimensions and indentations are given in XAML units. Meaning. `CharacterSpacing` It is expressed in thousandths of em. [SDK sources](sources.md#extracted-windows-phone-sdk-80-resources)

| Element | SDK keys and values |
| --- | --- |
| Application title in Pivot | In three profiles, the outer indentation of `24,17,0,-7`. `PivotTitleStyle` in 8.0 uses Segoe WP Semibold · 22.667 |
| A number of Pivot sections | In all three profiles, Segoe WP Semilight · 72 and `21,0,1,0` button indentation. The selected title has opacity 1. The neighbor in 7.0 and 7.1 is equal to 0.4. The 8.0 value depends on the theme and is 0.4 in Dark and 0.23144 in Light. |
| Pivot content area | In all three profiles, the `12,28,12,0` outer indentation is in order left, top, right, bottom. Template 8.0 declares the states `Right`, `Left` and `Center`. |
| Panorama general headline | In 7.0 and 7.1 Segoe WP Light · 187 and `10,-76,0,9` indentation. In 8.0 size 170, indentation `10,-34,0,0` and `CharacterSpacing` -35. The header, background and area of elements have separate layers. |
| Title of the Panorama section | In 7.0 and 7.1 Segoe WP Semilight · 72 and `10,-2,0,26` indentation. At 8.0, size 66, indentation `12,-2,0,38` and `CharacterSpacing` −35. The grid section in all profiles has a separate indentation `12,0,0,0` |
| Title of the LongListSelector Group | `LongListSelectorGroupHeaderStyle` uses Semilight · 29.333 and system accent |
| The letter in the tile of the group's title | `LongListSelectorGroupHeaderLetterTileStyle` uses Semilight · 42,667 and basic text color |
| JumpList line and letters | `JumpListStringFontSize` - 26.667, `JumpListAlphabetFontSize` - 48 and `JumpListAlphabetSmallFontSize` - 37.333 |
| Scroll through LongListSelector 8.0 | The vertical scrollbar has indentations of `4,0,4,0`. In the `Scrolling` state, opacity is 1, at rest, 0. The transition time is 0.5 s. |

In the visible layers of the original `PivotHeader_PSD.psd` Phone 7 and 8, the app header uses Segoe WP Semibold · 22.667. Section headings and a static header are shown in Segoe WP Semilight · 72 with −10 tracking. In Phone 7, the active point is white, and at neighboring points the color corresponds to 40% white on a black background. In the hidden layer of markup of the Phone 7 marked the height of the target touch 92 px and the margin of 12 px horizontally. These measurements describe examples on sheets. [Original Phone 7 template](windows-phone-archive.md#windows-phone-7-package-contents) · [Original Phone 8 template](windows-phone-archive.md#windows-phone-8-package-contents)

| Event. | Owner of fortune | Results in the library |
| --- | --- | --- |
| The gesture is captured by a horizontal surface | Sign recognition and Panorama or Pivot | The canvas moves with a finger. When canceled, it returns to the active section, when confirmed, selects a new section once. |
| Selected Pivot headline | Pivot and presentation of the selected section | The active key is changed, the scroll and the content state are restored separately, and the route of the page is saved. |
| Record or link activated | Frame and source page | Frame opens the object's route. The source stores the section keys and records for return. |
| NavigationView activated | Navigation host | The host chooses the route and the log policy. Back and external activation synchronize the visible point with the current route. |

In Microsoft’s example, switching from Pivot to the top NavigationView is done via Frame with the log entry disabled and the recommended transition. This mode in the library is suitable for peer-to-peer points, when Back should lead along the route of the task. [Pivot at WinUI](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/pivot)

In WinUI, `ItemInvoked` comes when you call the active item again, and `SelectionChanged` comes also when you change the allocation program. When a new item is called by the user, both events occur. In the library, one of them is the source of the transition request, the rest updates the view. Re-selection of the current route is processed without a new entry, unless an action is clearly set for it. `BackRequested` is transmitted to the router. The availability of the button reflects the ability to execute Back in the current context. [NavigationView](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/navigationview)

### Document tabs with TabView

In WinUI, when entering a number of tabs, the focus receives an active tab. The arrows move the focus over a row, and Space or Enter activate the focus tab. Ctrl+Tab and Ctrl+Shift+Tab cycle back and forth. Closing button and Ctrl+F4 lift `TabCloseRequested`. The application processes the request and decides when to remove the tab from the list. [Tab view](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/tab-view) · [TabCloseRequested](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.tabview.tabcloserequested)

With `CanTearOutTabs` in Windows App, SDK 1.6 and later, `TabTearOutWindowRequested` lets the application create a window at the beginning of the draw, and `TabTearOutRequested` passes a tab to this window. To transfer to an existing window, the receiving TabView checks the tab in `ExternalTornOutTabsDropping` and pastes it into the specified position at `ExternalTornOutTabsDropped`. An insert event can occur while the tab is held above a row. [Tab tear-out](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/tab-view#tab-tear-out) · [CanTearOutTabs](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.tabview.cantearouttabs)

In the library contract, the window stores the order and active tab key. The tab session stores the document address, draft, focus, and history of its Frame. When transferring, an already open session receives a new window. At closing, the decision relates to the draft of the requested tab. Closing the background tab keeps focus and history active. [Closure and postponement scenario](flows.md#40-close-and-transfer-document-tabs)

## Commands, overlays, and status

| Component | Semantics and interaction |
| --- | --- |
| **Application Bar** (Phone 7–8 Silverlight) | Up to four main icon buttons. The ellipsis reveals labels and secondary points. The Phone 7’s historic pre-release guide lists up to five menu items. The guide describes closing through selection, external touch, ellipsis or hardware back. Silverlight SDK has both Default and Minimized modes. |
| **CommandBar** (WinUI) | Primary commands participate in adaptive placement, secondary commands open in overflow. The `AppBarButton`, `AppBarToggleButton` buttons and separators are designed locally. Commands can have a page level, selected objects, or applications. |
| **Context menu / CommandBarFlyout** | Acting on an object under a cursor or in focus: Holding, secondary click, context key, and visible call lead to one set of available operations. |
| **Flyout / Popup / TeachingTip** | The surface associated with the trigger shows a short selection, additional information, or a hint. Flyout sets the closing rules. In a low-level Popup, responsibility for focus, closing, and position must be explicitly stated. |
| **ContentDialog / MessageDialog** | A modal step that requires a result before returning to a task, the options are represented by understandable verbs, the current action and context remain clear behind the overlap. |
| **Progress Bar / Ring** | The known fraction uses a certain indicator, the unknown duration is uncertain, and the area of the indicator corresponds to the scale of the task. |
| **Status Bar / System Tray** | Historic system surface of the device. Phone 8.1 guide suggests using its indicator for background update Hub. |
| **InfoBar / inline status / InfoBadge** | The field error remains at the field, the page level warning is in its visible area, the counter marks the corresponding destination. In WinUI, InfoBar and InfoBadge have different roles. |
| **Tooltip** | A brief explanation of an existing element when focusing or hovering. Critical text and commands are accessible through permanent surfaces. |

[Application Bar, pp. 30-37](sources.md#windows-phone-7-and-71) · [Silverlight API](sources.md#windows-phone-8-and-windows-8) · [CommandBar](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/command-bar) · [Contemporary overlays and status](sources.md#winui-control-reference-links)

### Library contract for commands

One command provides an identifier, label, icon, availability condition, and operation on a specific target. The panel, overflow, menu, visible button and key combination all get one actual model. The status of the team is updated when a choice or route is changed. A specific goal is transmitted to execution, captured at the time of the call and verified before changing the data.

The open overlay stores the trigger and the previous focus position. Closing returns the focus to the trigger, and when it disappears, to the stable element of the source area. Confirmation of destructive action completes the menu and opens the modal step. Cancellation leaves data and choices. The runtime operation has a `pending` mode, understandable result and protection against re-run. Feedback is built into where the user expects it.

In the Windows 8.1 manual, Flyout opens next to the control that triggered it. Immediately changing the switch in the open Flyout applies the value and keeps the layer open. A confirmation command, such as Save, applies the prepared value and closes the layer. Pressing outside or Escape allows you to close the layer without executing such a command. [Guidelines for flyouts](https://web.archive.org/web/20140408235720id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh465341.aspx)

In WinUI, Flyout takes focus while it's open. Pressing the outside usually closes the layer and absorbs the gesture itself. `OverlayInputPassThroughElement` allows you to pass the same click to one explicitly specified item, such as a neighboring menu button. For the library, the closing of the layer and the activation of the lower element are set separately. Confirmation dialogue terminates an action through its result. [Flyout](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/dialogs-and-flyouts/flyouts) · [ContentDialog](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/dialogs-and-flyouts/dialogs)

### Keyboard commands

In WinUI, a command object can serve a button, menu, and keyboard combination. `CanExecute` defines the availability of one action for all inputs. `ScopeOwner` allows you to link a combination to an area, such as a list, which belongs to the context menu. Alt displays access key labels in the current menu or view. [Commanding in Windows apps](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/commanding) · [Keyboard accelerators](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-accelerators) · [Access keys](https://learn.microsoft.com/en-us/windows/apps/develop/input/access-keys)

In a library contract, the keyboard and visible buttons convey the current context to the same command. The context is selected by focus, active document and top layer. Transferring the button to overflow changes its position, and the scope of the command is specified by the owner. [Context-shift scenario](flows.md#34-keyboard-commands-and-scope)

### Application Bar in Phone 8 Silverlight

In portrait orientation, the panel is located at the bottom. In the landscape, it becomes vertical and uses the size of the Default even when given Minimized. The standard band is described as 72 px in the Phone Size System. The ellipsis reveals the labels of the main buttons and, if the menu is available, a flat list of secondary commands. Hyde recommends up to five menu items so the list fits without scrolling. [App bar for Windows Phone](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431813(v=vs.105))

| Silverlight option | The effect |
| --- | --- |
| Mode Default or Minimized | Determines the size when entering the page and after folding. Minimized is suitable for Panorama. |
| IsMenuEnabled | Controls the appearance of secondary points in the open panel. |
| Opacity 0 or 0.5 | The panel is drawn on top of the content. The size of the page area is saved. |
| Opacity 1 | The opaque panel occupies its strip. The size of the page area is recalculated. |

In a library contract, placement affects the scrolling area, and design sets transparency. The historical adapter links these parameters in a table. Retreating at the edge allows you to get to the last row and regain focus when the panel overlaps the page. [App bar and accommodation properties](https://learn.microsoft.com/en-us/previous-versions/windows/apps/ff431813(v=vs.105))

In the `AppBarAppMenu_PSD.psd` source sheet for Phone 8, icon labels use Segoe WP Semibold · 13.333, and secondary commands use Segoe WP Semilight · 32. Both groups have tracked -10. Values taken from the text layers of the open bar in the template. [Original Screen Templates for Phone 8](windows-phone-archive.md#windows-phone-8-package-contents)

### AppBar in Phone 8.1 WinJS

In the closed state, `minimal` shows an ellipsis, `compact` shows up to four buttons. Touching or dragging an ellipsis reveals labels and secondary commands. `global` on the phone stands for primary commands, `selection` goes to the drop-down list. In the desktop WinJS, these groups were spread out at opposite edges of the panel. As the phone rotated, the stripe remained at the physical lower edge of the body, and text and icons rotated. [WinJS on Windows Phone 8.1](https://blogs.windows.com/windowsdeveloper/2014/04/18/winjs-on-windows-phone-8-1/)

### Command placement in Windows 8.1 Store apps

In a desktop model, the top panel serves for transitions, and the bottom one opens commands for the current page or selection. The command that is constantly needed for the main task is placed next to the content. In the bottom panel, selection commands appear on the left, and the creation of a new element is placed at the right edge. When a context group appears, the order of standing commands is maintained. As long as there is a choice, the panel can remain open in sticky mode. Hyde asks to leave the horizontal scroll bar under the contents available. [Navigation patterns](https://web.archive.org/web/20140417010223id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/hh761500.aspx) · [Command patterns](https://web.archive.org/web/20140423174004id_/http://msdn.microsoft.com:80/en-us/library/windows/apps/hh761499.aspx) · [App bars](https://web.archive.org/web/20140413025236/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh465302.aspx)

### Move commands when the width changes

For the Phone Application Bar, the app selects buttons and menu items in advance. WinUI CommandBar accepts primary and secondary commands. The built-in dynamic overflow transfers some of the primary commands to the menu when the width is not enough. The app sets priorities and can disable this mode. [Application Bar in Silverlight SDK](sources.md#windows-phone-8-and-windows-8) · [CommandBar](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/command-bar)

| Event. | Library contract |
| --- | --- |
| Width decreases | The panel calculates the placement and leaves access to the displaced commands in the menu, and the order takes into account the given priorities. |
| Width is growing. | The command reappears on the panel, if it fits, and the movement retains its identifier, availability, and switch state. |
| Moves the team with focus | In the open menu, the focus follows the command if it remains visible. When the menu is closed, the focus gets the ellipsis or the nearest command available. |
| The context of choice disappears | The panel updates the commands. The menu closes if it's no longer relevant to the available context. Focus returns to the current area. |

### System status bar

On the `StatusBar_PSD.psd` source sheet for Phone 7, the markup shows a 32 px high band, 32 × 27 px icon source codes, and the purpose of touching the watch 72 × 32 px. From left to right, the diagram shows the signal slots, mobile data, forwarding, roaming, Wi-Fi, Bluetooth, call, input, power and hours. This is the geometry of the WVGA screen on the sheet. On the sheet of the Phone 8, the slots scheme and the watch with the Segoe WP Semibold marking size about 20 in the text layer are saved. The data and visibility of the line in the library is transmitted by the host. [Composition of layouts Phone 7, sheet 24](windows-phone-archive.md#windows-phone-7-package-contents) · [Composition of Phone 8 layouts](windows-phone-archive.md#windows-phone-8-package-contents)

### Dialogs, notifications, and reminders in screen templates

Comparison is made by the visible layers of the original PSDs on WVGA sheets. The sizes of the layers describe the example shown. A template with a header transfer or additional field increases the dialog area. [Original Pages of Phone 7](windows-phone-archive.md#windows-phone-7-package-contents) · [Original Pages of Phone 8](windows-phone-archive.md#windows-phone-8-package-contents)

| Element | Dimensions and typography in example |
| --- | --- |
| `DialogBox_PSD` | The substrate of the example with a single-line header and a short message takes 480 × 252 px. Title: Segoe WP Semibold · 32, message - Regular · 22,667. button labels are Semibold · 25.333 in Phone 7 and 22.667 in Phone 8. |
| `Reminders_PSD` | The example with a header transfer takes 480 × 340 px. The title and text use the same shapes and sizes as the dialogue. Snooze and Dismiss have a label size that changes from 25,333 in Phone 7 to 22,667 in Phone 8. |
| `ToastNotification_PSD` | On the 480 x 64 px substrate layer in the Phone 7 SMS example and the Phone 8 non-icon example. The message string uses Segoe WP · 20. In the example of Phone 7, the SMS icon is 20 × 20 px. |

## Collections and direct manipulation

| Component | Contract |
| --- | --- |
| **ListBox / ListView / GridView** | One-dimensional or two-dimensional collections. Separate selection and activation events. Supports a view-only list, a regular opening, single selection, and multiple selection. A string with its own button should route the event to that button. |
| **LongListSelector** (Phone 8) | Virtualized lists with groups, a header and a basement. When grouped, going through a list of groups speeds up search over a long collection. |
| **SemanticZoom** (Windows Store / WinUI) | This is a detailed list of groups in a collection, and key communication in a group saves the transition. Optical zoom only changes the scale of the content. |
| **ItemsView / ItemsRepeater** (WinUI) | ItemsView is a ready-made collection surface with choice and interaction. ItemsRepeater builds elements from a template and requires explicit scrolling composition, selection and focus navigation when needed. |
| **TreeView / Expander / AnnotatedScrollBar** (WinUI) | The tree stores the opening of the nodes, the Expander reveals the local area, the annotated strip offers a jump on the marks. All three store identifiers when updating data. |
| **FlipView / PipsPager** | Viewing one item at a time or showing a position in a set of pages. The image may have a separate optical zoom mode. |
| **ScrollViewer / ScrollView** | Scrolling or panning in announced directions, saving the key of the visible element and local displacement. |
| **SwipeControl / RefreshContainer** (WinUI) | Swipe has a quick command disclosure or execution mode. Pull-to-refresh belongs to the collection and has a background update state. The same actions need to be accessed through a button or menu. |

[LongListSelector SDK](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj208486(v=vs.105)) · [ListView and GridView](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/listview-and-gridview) · [Semantic Zoom](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/semantic-zoom) · [WinUI Collections](sources.md#winui-control-reference-links)

### Collection interaction models in Windows 8.1

The Windows Store guide describes four profiles for a single family of controls. In WinJS, the list and grid were `ListView` layouts. In XAML, there are two separate controls. Below is the historical profile behavior. [Guidelines for list and grid view controls](https://web.archive.org/web/20140413013343/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh465465.aspx)

| Profile | What Happens When You Touch and Choose | Related component |
| --- | --- | --- |
| Catalogue | Touch activates an object. A cross gesture can add an object to a selection. In WinJS, it's `invokeOnly` and `swipeBehavior: select`. | The detailed page receives the activated object, the command panel receives the current selection. |
| List and details | Touch selects a string and updates the details. In WinJS, this is `directSelect`. For single selection, cross-selection is disabled. | A separate part panel reads the selected key. |
| picker | Touch changes choices. In the profile described, the choice is also available in a cross gesture. | The selection surface returns the selected elements to the challenging context. |
| Static contents | Lines read. Selection and activation are off. | The container displays data without going to the object page. |

For a narrow window and portrait orientation, the guide suggests replacing the horizontal WinJS grid with a vertical list. For a long grouped set, you can first show the groups, then a list of the group with a clear return. WinJS retains `indexOfFirstVisible` before resizing. In the library, key saving allows you to return to the same record after reshuffling the data. [List and details on a narrow and wide screen](flows.md#7-list-and-details-on-narrow-and-wide-screens) · [Maintaining focus](flows.md#30-refresh-a-collection-and-keep-focus)

ScrollViewer’s guide 8.1 has a viewing area and one or two bands by content size. Hyde recommends using a built-in list scroll, field or Hub, and a standalone ScrollViewer to place around one area of content. It can have a panel with several child elements. A vertical axis is used for long text. A full-size zoom image may require two axes. [Guidelines for scroll bars](https://web.archive.org/web/20140408235721/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn439342.aspx) · [Axis conflict](flows.md#10-swipe-scroll-and-axis-conflicts)

### Quick group navigation

In the Phone 8, the Quick Jump mechanism is shown as a layer above a long list. Its contents may be an alphabet, named by groups or dates. After the selection, the original list is activated in the position of the selected group. In the library, the layer receives groups from the current collection, and the transition transmits a stable key that can resolve the virtualized list. [QuickJumpGrid in Phone 8 screen templates](windows-phone-archive.md#windows-phone-8-package-contents) · [LongListSelector SDK](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj208486(v=vs.105))

In Silverlight Phone 8, LongListSelector supported virtualized layout with a list and grid. JumpList had its own layout, so a grid of photos could open a review of groups with a regular list. In XAML for Windows Phone 8.1, tapping the group header opens the SemanticZoom review, saving the Phone 8 gesture. On Windows 8.1, in the example of Microsoft, the review was opened with a mix of fingers. Availability of review points is calculated by current groups. [Windows Phone 8 XAML LongListSelector](https://blogs.windows.com/windowsdeveloper/2013/05/23/windows-phone-8-xaml-longlistselector/) · [SemanticZoom in Universal Applications 8.1](https://blogs.windows.com/windowsdeveloper/2014/07/22/tips-and-tricks-for-using-xaml-controls-in-your-universal-windows-apps/)

In the SemanticZoom guide, both surfaces use one dataset and a consistent scroll axis. The review may represent categories, initials, dates, or pages. Up to three review screens are recommended to keep the transition fast. In Phone 8.1, tapping the header opens up a view, and selecting the key returns a detailed surface with the appropriate group in the viewing area. [Guidelines for semantic zoom](https://web.archive.org/web/20140408235721/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh465319.aspx)

### Gestures to change the contents of the collection

| Action. | WinUI mechanics | Library contract |
| --- | --- | --- |
| Swipe in Reveal mode | After the release, line commands remain visible. Choosing one of them does the job. A swipe back, touching outside or leaving a line from the visible area closes the commands. | The layer stores the string key and clears the visual state when closed. The executable command rechecks the key. |
| Swipe in Execute mode | The command is executed when the finger is released outside the threshold, and if the finger is returned to the threshold, the release closes the line. | Color and label indicate readiness to execute. Action on the same line can be accessed from a visible button or context menu. |
| Pull-to-refresh at the edge of ScrollViewer | To the threshold, the indicator responds to drag. After the threshold, waits for release. When you release, you request an update, and the indicator waits for the application to complete. | The button and gesture use a single update. Success, error, and cancellation complete it by retaining access to existing content. |
| Pull-to-refresh in the middle of ScrollViewer | When you gesture from a position where the update is not available, the indicator can be seen in Peeking mode without running the update. | The scrolling remains the owner of the gesture. A command is available for an explicit update. |

[Swipe](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/swipe) · [Pull-to-refresh](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/pull-to-refresh)

### Cross-slide and item selection

In the Windows Store guide 8.1 cross-slide runs across a single collection scroll axis. A short movement behind the threshold with a let-down changes the choice. As you continue to move beyond the next threshold, the transfer begins. Tap can still open the element. In the historical guide, the first boundary begins at 2.7 mm, and the choice is limited to the angular zone in the direction of the gesture. Customization of thresholds refers to the input profile. [Guidelines for cross-slide, pp. 394-400](https://tilsgee.github.io/DesignGuidelinesArchive/uwp8.1.pdf#page=394) · [Microsoft Learn Documentation](https://learn.microsoft.com/en-us/windows/apps/develop/input/guidelines-for-cross-slide)

The list transmits the selected command panel keys. When selecting from several sections, a separate selection shows all the marked elements and is saved after the command is applied. In the queue, each record has its own key and execution order. When added to the queue, one directory record may appear in several positions. Selection and queue get their own deletion and feedback rules. [Selecting from several sections and adding to the queue](flows.md#28-select-items-across-sections-and-add-them-to-a-queue)

### Drag and reorder

The transfer source announces keys, data, and permitted operations. The target reports the permissible operation and shows the insertion position. The transfer within the collection changes the order of the existing keys. When transferred between collections, the source removes the item after the confirmed Move result. Cancellation closes the preview and maintains the original order. Historic Windows 8.1 animations show the element lifting, opening the place and returning the rest of the elements to position. [Drag and drop](https://learn.microsoft.com/en-us/windows/apps/develop/data/drag-and-drop) · [Drag animations, pp. 14–15](https://tilsgee.github.io/DesignGuidelinesArchive/uwp8.1.pdf#page=14)

The built-in order change in WinUI `ListViewBase` requires `CanReorderItems` and `AllowDrop`. When `IsSwipeEnabled` is turned off, drag and drop touch is not available. The built-in order change is limited to no grouping layouts and no `VariableSizedWrapGrid` as an element panel. For a grouped view, the library transmits the target group key and a neighboring element to the team. The same command is called from a menu or keyboard. [ListViewBase.CanReorderItems](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.listviewbase.canreorderitems?view=windows-app-sdk-1.8) · [Dragging while keeping order](flows.md#29-drag-and-reorder)

## Input, forms, presentation and layout

For buttons, fields, selections, lists, scrolling, and progress, sizes and states are combined from SDK 7.0, 7.1, and 8.0 files. [Visual specifications of Silverlight](silverlight-controls.md)

| The family | Composition | Status and communications |
| --- | --- | --- |
| Action and reference | Button, Hyperlink, DropDownButton, SplitButton, ToggleButton | A normal button executes a command, a link opens up space, split divides the main action and the extras. Focus, pressing and inaccessibility are discernible. |
| Choice | CheckBox, RadioButton/RadioButtons, ToggleSwitch, ComboBox, ListBox | The tick stores an independent choice, the radio group is one of the options, toggle is a binary state, the drop-down list is the selected key. With immediate application, the actual state and result of the recording are displayed. |
| Number and estimate | Slider, NumberBox, RatingControl | The value has range, step and an accessible name. Drag can give a preliminary value, the record is confirmed by a single event. For NumberBox, editable text and disassembled value are saved. |
| Text | TextBox, PasswordBox, RichEditBox, AutoSuggestBox | The field has the text, the highlight, the focus, the IME composition and the confirmation signal. The prompts show the result of the query and are closed separately from the screen. |
| Date, time, color | DatePicker, TimePicker, CalendarDatePicker, CalendarView, ColorPicker | Range limitations, locale format, initial value. In confirmation mode, the time value is separated from the stored value. |
| Typography | TextBlock, RichTextBlock, Label, Hyperlink | Text roles, overflow, locale, accessible name, and label link to the field. |
| Media and avatar | Image, ImageBrush, MediaElement/MediaPlayerElement, PersonPicture, icons, AnimatedIcon, shapes, InkPresenter/InkCanvas, MultiScaleImage | Images are downloaded independently and have a meaningful description. The media player separates playback and buffering. Pen and optical scaling get their own control area. |
| Composite | Grid, StackPanel, Canvas, Border, ContentControl, ContentPresenter, SplitView, TwoPaneView | Layout allocates areas, calculates the available width, and positions the child elements. The focus control and route change is the responsibility of the respective container. |
| Systemic and late surfaces | Maps, WebView, System File Selection, TitleBar, Experimental TableView, Chart and Inking | A map, document, and embedded web content can capture your own input. The picker and header system bar require a platform adapter. The status of modern experimental capabilities is listed in the catalog. |

For the listings of Windows Phone 7 CTP was prescribed to use ListBox. The early set also required the Metro design to be applied separately to ToggleSwitch, ListBox, ListViewItem, and TextBlock. [Registry and registration of CTP controls, pp. 29–31](https://web.archive.org/web/20100326152152id_/http://download.microsoft.com/download/D/8/6/D869941E-455D-4882-A6B8-0DBCAA6AF2D4/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20Series.pdf#page=33)

[Windows Phone 7 directory, pp. 136–188](https://tableless.github.io/exemplos/pdf/guidelines-interface-mobiles/UI%20Design%20and%20Interaction%20Guide%20for%20Windows%20Phone%207%20v2.0.pdf#page=69) · [Windows 8.1 directory, pp. 87–214 and 299–354](sources.md#2014-pdf-page-map) · [WinUI Catalogue](sources.md#winui-control-reference-links)

### Field and group labels

The MSDN Application Guide 8.1 describes a label as the name of a field or group. In XAML, `Header` is used for the embedded label, and for a field without `Header` or for a group, the manual shows `TextBlock`. HTML uses `label`. The short name of the field consists of a noun or name group. An explanation of the input can be given in a separate text. In a library contract, the visual label is associated with the field in the accessibility tree, and the hint and error are transmitted as the field description. [MSDN article on labels](https://web.archive.org/web/20140408235720/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn439336.aspx) · [Tags in WinUI](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/labels)

### Choose a control to edit a setting

In manual 8.1, ToggleSwitch performs a binary action immediately. CheckBox can store the selection until the form is confirmed. Slider is suitable for relative value with preview, numerical field for accurate input. In single-band scroll, the Slider guide offers a different axis for the slider. For a discrete scale, permissible steps include an upper bound, and labels and marks help read positions. [ToggleSwitch](https://web.archive.org/web/20140408235721/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh465475.aspx) · [Slider](https://web.archive.org/web/20140408235721/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh465473.aspx) · [Text input](https://web.archive.org/web/20140411233715/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh750315.aspx)

### On-screen keyboard and forms

In the MSDN guide for Windows Phone and Windows Store, the password field masks the entered characters. On the phone, the last symbol was briefly displayed before the camouflage. An explicit command to display a password makes it possible to check the long value. The manual describes a single field for entry, and allows a separate confirmation field for registration. [Guidelines for password boxes](https://web.archive.org/web/20140408235720id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596103.aspx)

The head of Microsoft for Windows Phone 7 connects the assignment of the field with the layout via `InputScope`. It also takes into account the overlap of the bottom of the screen and the landscape mode of devices with a hardware keyboard. In current Windows, field assignment serves as a clue for the layout of the on-screen keyboard. The rules for checking the value remain in the form model. [User Input Considerations for Phone 7](https://web.archive.org/web/20101213163400id_/http://msdn.microsoft.com:80/en-us/library/gg490770.aspx) · [Input scope in Windows](https://learn.microsoft.com/en-us/windows/apps/develop/input/use-input-scope-to-change-the-touch-keyboard)

The host reports the form of the available area. Skroll holds the active field and the associated message in it. If the platform has already scrolled or shrunk the area, the form uses the resulting geometry once. The command panel is placed with this area in mind and saves access to the main action. The type and role of active control reflect the real semantics of the transition between the field, the menu, and adjacent form elements. [Screen keyboard in Windows](https://learn.microsoft.com/en-us/windows/apps/develop/input/respond-to-the-presence-of-the-touch-keyboard) · [Form adaptation scenario](flows.md#32-forms-and-the-on-screen-keyboard)

### Text selection and clipboard

In the Windows 8.1 manual, the context menu serves a dedicated snippet and an insert point. Border markers are used to highlight the touch, and the keyboard and mouse perform the same operations in their own way. Built-in standard control commands retain the expected editing behavior. [Clipboard commands, page 300](https://tilsgee.github.io/DesignGuidelinesArchive/uwp8.1.pdf#page=300) · [Selecting text and images, page 415](https://tilsgee.github.io/DesignGuidelinesArchive/uwp8.1.pdf#page=415)

In a library contract, the editor stores the range and history of changes. Cut and Insert commands are available in the editable area, Copy is available for allowed selection. Before inserting, the editor checks the format and relevance of the goal. In WinUI, standard XAML controls can serve the buffer themselves. For its own control, the format is transmitted via `DataPackage`, and the command availability can be updated when the buffer content changes. [Copy and paste in WinUI](https://learn.microsoft.com/en-us/windows/apps/develop/communication/copy-and-paste) · [Selection and insertion scenario](flows.md#36-select-paste-and-undo-in-the-editor)

### Pen and ink annotations

In Windows 8.1, the pen could work as an accurate pointer and as a drawing tool. In experimental controls, WinUI 3 `InkCanvas` provides a surface, `InkPresenter` receives input and displays strokes, `InkStrokeContainer` stores them, and `InkToolbar` changes the active tool and its parameters. `InputDeviceTypes` determines which devices are drawn on a particular surface. [Input and feedback patterns](https://web.archive.org/web/20140501004253id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn456349.aspx) · [Inking controls for WinUI apps](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/ink-controls)

In the library contract, the document stores the completed strokes in the coordinates of the page. The canvas receives the current pointer and holds the unfinished stroke until release or loss of grip. The panel changes the instrument to the next stroke. Scrolling and scale belong to the viewing area. To the annotation with significant content, you can add the text available in the annotation list. [Script of annotations](flows.md#37-ink-annotations-and-input-changes)

### Media player and playback commands

In Windows Phone 8.1, MediaElement was limited to one instance. Microsoft’s notes for Windows 8.1 also describe built-in playback control and background audio tuning through the audio category and resolution in the manifest. In the library, a list line, a compact panel, and a full-screen view all refer to a single session state. During the transition between them, the current source, position and buffer state are retained. Availability of the background mode is reported by the host. [MediaElement, notes for previous versions](https://learn.microsoft.com/en-us/uwp/api/windows.ui.xaml.controls.mediaelement?view=winrt-26100#notes-for-previous-versions) · [Scenario of the common player](flows.md#27-shell-activation-and-a-shared-player)

The Windows Store guide shows a built-in panel on top of the video. For its own panel, it offers a display when you first open and when you access the video, a cover-up when you end the interaction, and a Play or Pause icon for the next action available. In the library, the panel visibility and playback session state are updated independently. [Guidelines for developing audio-aware apps](https://web.archive.org/web/20140408235720/http://msdn.microsoft.com/en-us/library/windowsphone/design/hh452724.aspx)

### Map preview and interactive map

The MSDN guidelines give the interactive map a larger area so that the user can navigate with fewer gestures. A compact static preview is suitable for the Hub or Pivot section. The preview button opens the map page. On it, panning, scale and point selection belong to the map. When you go into details, the Back point first restores the map, then the review section. [Recommendations for maps](https://web.archive.org/web/20140408235720id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596102.aspx) · [Phone Hub Recommendations](https://web.archive.org/web/20140408233046id_/http://msdn.microsoft.com/en-us/library/windowsphone/design/dn596112.aspx) · [Script of the map](flows.md#26-open-a-map-and-return-to-a-selected-location)

### Embedded WebView

The Phone 8.1 guide describes WebView for formatted content. Links work inside the surface, and typography, colors, and navigation must be consistent with the application. The manual contains a minimum of 15 items for text on Windows Phone. The input fields should remain comfortable without manually zooming in the page. [The Original WebView Guide](https://web.archive.org/web/20140408235721id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596106.aspx)

In the library contract, the page stores the address of the initial document and announces whether the local WebView history is involved in the Back processing. In document viewing mode, Back opens a previous document inside WebView while there are records in its history. Back then handles Frame. On a page with a built-in markup block, Back handles the page itself. WebView shows a download error and lets you repeat the request. System browser opens host. [Back processing](flows.md#3-back-closes-the-current-context)

### Accessible actions and state

Customizable template saves the accessible name and basic control actions. In the new composite control, the state and commands are visible through the semantic interface of the platform. In WinUI, they are provided by `AutomationPeer`, which reports changes in properties and structure. The keyboard, touch and accessibility tool call for a single command with a single target ID. [UI Automation Patterns](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/control-patterns-and-interfaces) · [AutomationPeer in WinUI](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/custom-automation-peers)

| Component | Action and status | UI Automation Pattern |
| --- | --- | --- |
| Button, link | Activation of a command or assignment. Availability depends on the status of the target. | `Invoke` |
| CheckBox, ToggleSwitch | Switching and reading the current state. CheckBox groups can report mixed selection. | `Toggle` |
| List, group of options | The container communicates the current selection, the elements take the choice by key. | `Selection`, `SelectionItem` |
| Expander, drop-off branch | Discovery, concealment and reading of the state of disclosure. | `ExpandCollapse` |
| The field of meaning, Slider | Reading and changing values. The numerical range has boundaries and step. | `Value`, `RangeValue` |

The selection change updates the string, the command panel, and the semantic state based on a single value. The collection composition update keeps the focus keyed and communicates a meaningful result through a separate status area. [Updating the collection with the preservation of focus](flows.md#30-refresh-a-collection-and-keep-focus)

### Visual states and WinUI templates

`VisualStateGroup` collects mutually exclusive states of a single characteristic. For example, in `CommonStates`, the control may be routine, induced, pressed, or inaccessible. Focus, list disclosure, and notoriety can coexist, so they need their own groups. For each state, the template specifies properties through `VisualState.Setters` or animation through `Storyboard`. When it comes out of the state, its changes are removed. [VisualStateGroup](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.visualstategroup) · [Control templates](https://learn.microsoft.com/en-us/windows/apps/develop/platform/xaml/xaml-control-templates)

In the template, `VisualStateManager.VisualStateGroups` is set on the root element `ControlTemplate`. `TemplateBinding` transmits values of control properties, such as indentation or a frame brush. `GoToState` takes the state name, and `VisualTransition` describes the visual transition. When adapting the standard control, state names expected to be implemented are stored. [Control templates](https://learn.microsoft.com/en-us/windows/apps/develop/platform/xaml/xaml-control-templates) · [VisualStateManager](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.visualstatemanager) · [VisualTransition](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.visualtransition)

In the library, the template gets selection from the model, focus from control, and availability from the team state. The type of allocation, focus contour, placement, and operation indicator may vary independently. The use of the command is determined by the confirmed action, and the transition to the final design can occur immediately or with animation. [Group selection scenario](flows.md#39-group-checkbox-and-visual-states)

### Selection, commands, and progress in Phone 8.1

In the Windows Runtime guides, the button triggers the action, the link opens the destination, and ListBox shows the available options and selected items. Ticks allow independent choice and application of the entire form. The mixed mark is calculated by child items. RadioButton presents one option from the group where re-clicking the selected item saves the selection. [Buttons](https://web.archive.org/web/20140408235720id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/hh465470.aspx) · [Links](https://web.archive.org/web/20140408235720id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/hh700379.aspx) · [List boxes](https://web.archive.org/web/20140408235720id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn439344.aspx) · [Check boxes](https://web.archive.org/web/20140413013344id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/hh700393.aspx) · [Radio buttons](https://web.archive.org/web/20140408235721id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/hh700395.aspx)

If the total amount of work is known, the indicator shows the percentage of execution. When connecting to the server, the volume may still be unknown. Once the size is obtained, the management suggests moving to measurable progress in the same place and with the same indicator sizes. The progress of one element is placed next to it, and the overall progress of related operations may be completed with the latter. [Progress controls](https://web.archive.org/web/20140408235723id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/hh465469.aspx)

## Windows Phone Toolkit extensions

Dimensions, indentations, brushes, states and transitions of the WP7 and WP8 templates are collected in a separate directory. [Visual Specifications for Windows Phone Toolkit](toolkit-visual-specs.md)

Windows Phone Toolkit extended the Silverlight SDK. The composition and behavior below are matched to the WP7 and WP8 projects, source codes, and August 2013 release demos. [Microsoft Release and Catalogue](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/README.md)

| Expansion | Role in scripts |
| --- | --- |
| AutoCompleteBox and PhoneTextBox | Enter prompts and a text field to the phone design link editable text, sentence list, and confirmation. |
| SpeechTextBox | Supplement to the WP8 project. The button triggers system recognition. The successful result arrives at the `SpeechRecognized` event, and the field processes it as text if the handler has authorized the insertion. [Source SpeechTextBox](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit.WP8/SpeechTextBox/SpeechTextBox.cs) |
| ListPicker, DatePicker, TimePicker, RecurringDaysPicker and DateTimeConverters | Selection from the list, date, time and days of repetition. The field shows the choice used, and the locale determines the order and representation of the values. [ListPicker demo](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/PhoneToolkitSample/Samples/ListPickerSample.xaml) |
| ContextMenu and CustomMessageBox | Object Action and Modal Solution: They use different placement, focus and return policies. |
| LongListSelector, LongListMultiSelector and MultiselectList | The WP7 project includes its `LongListSelector`. The WP8 project adds `LongListMultiSelector`, and the former `MultiselectList` is present in both projects. For a library, choice is tied to stable keys and experiences virtualization. [Draft WP7](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit.WP7/Microsoft.Phone.Controls.Toolkit.WP7.csproj) · [Draft WP8](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit.WP8/Microsoft.Phone.Controls.Toolkit.WP8.csproj) |
| HubTile | The tile inside the app. In the demo, Pivot pauses animation of tiles groups on adjacent tabs and resumes it for the active group via `HubTileService`. System fixing serves the shell. [HubTile demo](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/PhoneToolkitSample/Samples/HubTileSample.xaml.cs) |
| LockablePivot | Experimental extension of the WP7 project. `IsLocked` leaves the current tab and removes adjacent items and headers before unlocking. Suitable as a historical example of holding the context of a time problem inside Pivot. [Source: LockablePivot](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit/Pivot/LockablePivot.cs) |
| ExpanderView and WrapPanel | Disclosure of parts of a line or group and stacking elements with transfer. |
| ToggleSwitch and Rating | Binary selection and evaluation. The public class of Toolkit is called `Rating`. The modern WinUI has a `RatingControl`. The change in value goes to the page model. [Source Rating](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit/RatingControl/Rating.cs) |
| SlideInEffect, TiltEffect, TurnstileFeatherEffect and navigation transitions | A family of button effects, content and page changes. In the library, effects are tied to the event and support reduced movement. |
| Map extensions | `Pushpin` and `UserLocationMarker` in the WP8 project complement the map with tags. The host delivers authorized location data. [Map extensions](https://github.com/microsoftarchive/WindowsPhoneToolkit/tree/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit.WP8/Maps) |
| TransferControl and PerformanceProgressBar | `TransferControl` shows background transfer status and available cancellation. The `TransferMonitor` source distinguishes between network or power waiting, transmission, termination, and error. `PerformanceProgressBar` is also available as a separate control. [TransferControl and TransferMonitor](https://github.com/microsoftarchive/WindowsPhoneToolkit/tree/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit/TransferControl) · [PerformanceProgressBar](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit/ProgressBar/PerformanceProgressBar.cs) |

### ListPicker in a form

In the Toolkit released, a single `ListPicker` unfolds in place with permissioned disclosure and up to five elements set. For more set, forced full-screen display, and multiple selection, it opens the time page via `PhoneApplicationFrame`. A single touch applies the paragraph. In multiple selection, the Done team transfers the marked set to the form, and the Back or Cancel close the page with the previous choice. `RecurringDaysPicker` uses the same multiple mode and collects a brief label from the days of the week. [ListPicker](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit/ListPicker/ListPicker.cs) · [ListPickerPage for WP8](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit.WP8/ListPicker/ListPickerPage.xaml.cs) · [RecurringDaysPicker](https://github.com/microsoftarchive/WindowsPhoneToolkit/blob/4e4fd5d36c769c004f7ccc7daf78a5ffb8ef18df/Microsoft.Phone.Controls.Toolkit/DateTimePickers/RecurringDaysPicker.cs)

In WinUI, `ComboBox` shows the selected value in the folded form. In the usual setting, the arrows move the focus, and the choice is applied by activating the point. The `SelectionChangedTrigger=Always` connects choice with focus shifting and is suitable for immediate preview. The library contract stores the focus, preview and applied value separately. [Combo box and list box](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/combo-box) · [Selection scenario](flows.md#38-select-from-a-list-in-a-form)

## Start, tiles and shell

| Surface. | Appointment and owner |
| --- | --- |
| **Start and list of applications** | System login to the app. User controls anchoring and order. In Phone 8, the three sizes of the tiles change the density and the amount of information available. |
| **Primary and secondary tiles** | Primary presents the application. Secondary stores the path to a specific area or object fixed at the request of the user. A preview in Hub can look like a tile and remains an element within the app. |
| **Live Tile and badge** | A tile shows a value, image, short text or counter when it supports the platform. It's activated as an assignment. The app publishes the data, and the shell decides where and how to show it. |
| **Toast and Action Center** | Toast is a short system surface. In Phone 8.1, Action Center collects notifications even for non-fixed apps and gives you access to quick settings. Activation can lead to content. |
| **Lock screen** | System screen: Phone 8/8.1 supported user-selected background or status providers, and the library can present a data model via a capability adapter. |
| **Back, Start, Search, Keyboard, Sensors** | The host delivers system events. The application reacts to Back and change the available space when the keyboard appears. Start, system search, camera, microphone and sensors take advantage of the environment. |
| **Charms and Windows 8/8.1 Contracts** | Shared surfaces of the desktop branch for searching, accessing settings, Share, selecting files and devices depending on the version. Phone 8.1 used its own way of getting into these tasks. |

[Phone 8 Start](https://blogs.windows.com/windowsexperience/2012/11/02/the-story-behind-the-windows-phone-8-start-screen/) · [Phone 8.1 Action Center](https://blogs.windows.com/windowsexperience/2014/04/02/cortana-yes-and-many-many-other-great-features-coming-in-windows-phone-8-1/) · [UWP secondary tiles](https://learn.microsoft.com/en-us/windows/uwp/launch-resume/secondary-tiles-guidance) · [Windows 8.1 UX guidelines](sources.md#2014-pdf-page-map)

The Phone Store Apps guide describes three delivery channels. The tile reports the change, the toast indicates the event for which it is appropriate to propose an action, and the raw notification transmits data to the application for its own processing. The historical toast contains an icon, a title and a second line, displays ten seconds and activates the app when you click. [Essential graphics, visual indicators, and notifications](https://web.archive.org/web/20141012014027id_/http://msdn.microsoft.com:80/en-us/library/windows/apps/dn596109.aspx)

### Scheduled reminders

The Silverlight SDK Windows Phone specifies the name, time, content, repetition, and `NavigationUri` reminders. In the Windows documentation for scheduled notification, a pair of `Tag` and `Group` can be used for search and cancellation. The application stores the time rule and destination, the host plans a system display. The status on the list reflects the confirmed staging or cancellation. When a notification is opened, Frame allows the current version of the object by identifier. [Reminder in Windows Phone SDK](https://learn.microsoft.com/en-us/previous-versions/hh203244(v=vs.110)) · [Scheduled Notifications for Windows](https://learn.microsoft.com/en-us/windows/apps/develop/notifications/app-notifications/app-notifications-scheduled) · [Reminder scenario](flows.md#33-schedule-edit-and-open-a-reminder)

The Reminders template for Phone 7 shows the system layer above the top of the app and the two buttons, put down and close. To open the details, there is an action on the reminder itself. The duration of the delay is managed by the system. Text occupies a limited area, so the key purpose and time are visible immediately. [Phone 7 templates, sheet 20](windows-phone-archive.md#windows-phone-7-package-contents)

### Live tile templates in Phone 8

| Template. | Historical behavior | Status of submission |
| --- | --- | --- |
| Flip | The front and back are changing. Each side has its own image and text. | The data of both parties relate to one tile and one purpose. |
| Cycle | The tile shows a sequence of images. | The source publishes the recruitment. The active frame refers to the presentation. |
| Iconic | The tile shows the sign, counter and additional information in supported dimensions. | The counter and the image come from the same event model or section. |

For FlipTileData and IconicTileData classes, the help describes the counter values from 1 to 99 and hiding the counter at zero. In the Flip update documentation, a field without a new value can save the same content. The library contract distinguishes between the preservation, cleaning and replacement of the field. The content version applies entirely to this tile. When you change the size, you select the appropriate representation. [Demonstration of Windows Phone 8 at BUILD](https://blogs.windows.com/windowsdeveloper/2013/08/08/windows-phone-8-tiles-lock-notifications-build-2-206/) · [FlipTileData](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj208605(v=vs.105)) · [CycleTileData](https://learn.microsoft.com/en-us/previous-versions/jj208147(v=vs.110)) · [IconicTileData](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj208800(v=vs.105))

In Windows 10 UWP, the image of Iconic tiles, numerical badge and fixing parameters are published by separate platform tools. A single library state object can give these representations to different adapters. [Special tile templates](https://learn.microsoft.com/en-us/windows/uwp/launch-resume/special-tile-templates-catalog) · [UWP secondary tiles](https://learn.microsoft.com/en-us/windows/uwp/launch-resume/secondary-tiles-guidance)

The Phone 8.1 Store apps initially have a tile fixed to an average size. The user then selects a different size from the one for which there is a logo in the manifesto. The app publishes the display for all supported sizes because the current size selects the shell. [Windows Runtime Tile Sizes](https://learn.microsoft.com/en-us/previous-versions/windows/apps/hh781198(v=win.10))

### Lock screen in Phone 8 and 8.1

The user selects the background provider and the application to display the status. The **quick status** has a white icon with transparency and an affordable main tile counter. **Detailed status** displays the text of the main tile. For Flip, manuals describe the data of the broad version if available, otherwise the average is taken. Date, time and notifications remain readable over the background. Microsoft recommends having a standard background image in case of error. [Lock screen for Phone 8](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj662927(v=vs.105)) · [Lock screen for Phone Store apps](https://web.archive.org/web/20140408235720id_/http://msdn.microsoft.com:80/en-us/library/windowsphone/design/dn596116.aspx)

In the library, the notification model stores the event source, the counter, the brief view, and the allowed detail for the shell. The lock screen and start views are published through separate host capabilities. User choice of provider and displayed status is read from the host. [Lock screen scenario](flows.md#21-lock-screen-and-primary-tile)

### Library contract for the shell

The tile stores the stable tileId, purpose, theme, a set of available sizes, and the latest content shown. Fixing, moving, and removing are user-controlled. The data source publishes a new view with a version or time of relevance. Activation allows assignment through a conventional router, so starting from tile, link, and notification uses a general setting check and boot. System fixing, sending and controlling the lock screen is checked by the host adapter. In a demo, the proprietary anchored link screen can execute this contract locally.
