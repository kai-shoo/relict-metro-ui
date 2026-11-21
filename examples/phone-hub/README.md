# Route catalog

After the build, start the local server as shown in the [repository README](../../README.md). Open `/examples/phone-hub/`. On a narrow screen, swipe horizontally to change the Hub section. With focus on a section header, use the arrow keys to do the same. Add `?sections=2` to show two sections and stop at the ends. With three sections, the Hub wraps from the last section to the first.

Select the ellipsis to show the global command. When the recent routes section is the first visible section, the command bar shows the command that clears recent routes. Back closes the overlay first. When you return from a record, the app restores the section, the list position, and focus on the row.

Copy `index.html`, `phone-hub.css`, and `phone-hub.js`. Update the path to the browser ES module. Replace the route data. `sectionsInView` describes the section geometry. `value` contains the confirmed key. The example selects commands for the first visible section. It checks the section key again before it clears the list. The example keeps its data in the current page.

## Desktop archive

`/examples/phone-hub/desktop.html` shows a featured card, collections, recent routes, and a help section. When the help section becomes visible, the app requests the local `desktop-help.json` file. If the request fails, the retry button sends it again. To test this, open the catalog. Set the network to Offline in DevTools. Select the last section in the overview to show the help section. Set the network back to Online, then retry the request.

The section overview selects a Hub key without adding a history entry. The collections section heading opens a separate page. If you resize the details page and go Back, the Hub restores focus to the original link in the current orientation. To reuse the example, copy `desktop.html`, `desktop-hub.css`, `desktop-hub.js`, and `desktop-help.json`.
