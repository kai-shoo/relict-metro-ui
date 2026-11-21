# Survey locations

From the repository root, run `npm run build`. Then run `npm run serve`. Open `http://127.0.0.1:4173/examples/speech/`. The files import the prebuilt browser module.

Select **North depot**, type **Open North depot**, or say **Open North depot** and select **Run voice command**. All three actions open the same location. **Open depot** shows a list of choices. To share a location, use a URL such as `?record=west`. Change the buttons and `records.json` to use your own destinations.

Speech uses the browser's recognition provider when it is available. The browser handles microphone permission and recognition. For a custom provider, assign `speechAdapter` on the speech field. The bundled example uses a browser URL for external entry. System voice activation can pass the same destination through a host adapter.

**Back** or **Alt+Left Arrow** cancels the current recognition, choice, or lookup before returning from a location. Both the recognition component and the destination resolver discard stale results. The typed and visible commands are available with any recognition provider.
