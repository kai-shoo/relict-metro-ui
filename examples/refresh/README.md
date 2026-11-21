# Refreshable requests

Open `/examples/refresh/` through the HTTP server after building the library. The view fetches `requests.json` on entry, on Refresh, on a pull from the top, and when the browser reports it is back online. The **Closed** filter starts with zero results.

Copy `index.html`, `refresh.css`, `refresh.js` and `requests.json`. Point the JavaScript import to your browser build of Metro UI and replace `endpoint` with your collection URL. Each record uses a stable `id`, a display `label`, a `state`, and a `description`. Adapt the state choices in HTML and the group labels in JavaScript to your data.

RefreshContainer handles the gesture, progress and scrolling. The example owns the request, filter, selection and commands. An `AbortController` stops the current fetch and the application ignores any completion for a superseded request. Existing rows stay interactive while a response is pending or after a refresh fails.

On update the list restores its keyed anchor and pixel offset. If the focused request disappears, focus goes to the nearest surviving request or to **Filters** when the view becomes empty. Both the row menu and the command bar look up the selected action's key against the current results. The result count uses one live region and changes after a new result is applied.
