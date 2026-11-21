# Refreshable requests

Build the library. Open `/examples/refresh/` through the HTTP server. The view fetches `requests.json` when you open it, use Refresh, or pull from the top. It also fetches the file when the browser reports that it is back online. The **Closed** filter starts with zero results.

Copy `index.html`, `refresh.css`, `refresh.js` and `requests.json`. Point the JavaScript import to your browser build of Metro UI and replace `endpoint` with your collection URL. Each record uses a stable `id`, a display `label`, a `state`, and a `description`. Adapt the state choices in HTML and the group labels in JavaScript to your data.

RefreshContainer handles the gesture, progress, and scrolling. The example manages the request, filter, selection, and commands. An `AbortController` stops the current request. The app ignores responses from requests that it replaced. Existing rows stay interactive while the app waits for a response or after a refresh fails.

On update the list restores its keyed anchor and pixel offset. If the focused request disappears, focus goes to the nearest surviving request or to **Filters** when the view becomes empty. Both the row menu and the command bar look up the selected action's key against the current results. The result count uses one live region and changes after a new result is applied.
