# Camera and photo editor

Open the example over HTTPS or on localhost. Select a destination. Start the camera or select a file. Select **Use photo** to confirm the attachment. To take photos in sequence, enable **Save camera shots immediately**. The example always previews files from the system picker.

The app stores the photo bytes and the attachment ID in one IndexedDB transaction. **Edit photo** opens the photo by its stable ID. You can copy the link or open it again after a reload in the same browser profile and origin. **Rotate clockwise** rotates the pixels. **Save a copy** writes a separate PNG and shows a link to it. The original attachment does not change.

A system viewer can open `?photo=<id>&context=inspection` and handle the cancelable DOM event `metro-return-photo` on `window`. Call `event.preventDefault()`. Use the host API to restore focus to the photo with ID `event.detail.id`. A standard web page uses browser history to return to the attachment. If the site data is missing or the user opens the link in a different browser profile, the editor shows a message and a return button. The app needs its own photo storage to support links across devices.
