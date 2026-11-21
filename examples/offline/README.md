# Files for offline use

Open `/examples/offline/` through the local HTTP server. Choose one file to see the group's mixed checkbox. Space on that checkbox selects the full available group. **Download selection** saves the chosen files on this device. At narrow widths the command appears under **More commands**.

Copy `index.html`, `offline.css`, `offline.js`, `offline-worker.js`, `catalog.json` and `files/`. Point the JavaScript and worker to your browser build of Metro UI. Change the group names and catalog records to fit your application. The example accepts same-origin files up to 256 KiB in the `files/` directory and previews them as text.

The command takes a snapshot of the selected keys. Later changes to the selection and catalog apply to the next download. The transfer rows report received bytes once the total is available. Retry downloads the failed files from that snapshot. Successful files can be opened with **Read offline**.

A service worker caches the page and scripts. Change its shell cache revision when deploying new shell assets. Cache Storage holds the last valid catalog and the files the user has downloaded. A secure browser context, or localhost, is required for browser storage and offline reopening. Saved files remain subject to browser storage limits and eviction.

When deploying updated HTML, scripts or styles, change the shell-cache version in the service worker so returning clients receive the matching files.
