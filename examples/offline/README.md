# Files for offline use

Open `/examples/offline/` through the local HTTP server. Select one file to see the group's checkbox in the mixed state. With focus on that checkbox, press Space to select all available files in the group. **Download selection** saves the selected files on this device. On a narrow screen, find this command under **More commands**.

Copy `index.html`, `offline.css`, `offline.js`, `offline-worker.js`, `catalog.json` and `files/`. Point the JavaScript and worker to your browser build of Metro UI. Change the group names and catalog records to fit your application. The example accepts same-origin files up to 256 KiB in the `files/` directory and previews them as text.

The command takes a snapshot of the selected keys. Later changes to the selection and catalog apply to the next download. The transfer rows report received bytes once the total is available. Retry downloads the failed files from that snapshot. Successful files can be opened with **Read offline**.

A service worker caches the page and scripts. Cache Storage holds the last valid catalog and the downloaded files. Use a secure browser context or localhost to store files and open them offline. The browser can limit storage or remove saved files.

When you deploy updated HTML, scripts, or styles, change the shell cache version in the service worker. This lets returning clients load the matching files.
