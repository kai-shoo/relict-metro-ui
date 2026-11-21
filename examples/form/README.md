# Inspection form

From the repository root, run `npm run build`. Then run `npm run serve`. Open `http://127.0.0.1:4173/examples/form/`. The files import the prebuilt browser module.

Open the inspection report. Select a date. **Done** updates the draft. **Escape** or **Alt+Left Arrow** closes the picker without changing the date. **Back** opens a confirmation if the form has edits. **Save and leave** opens the destination only after the save succeeds. While saving, the app ignores Back and repeated submissions. If the save fails, the app keeps the draft and shows **Retry save and leave**.

`mountSurveyForm()` uses IndexedDB and resolves the save when the transaction commits. To copy it with another storage backend, pass `{ load(), save(report) }` to `mountSurveyForm`. Return a promise from `save` and reject on a failure so the form can offer a retry. Each report contains a title and an ISO calendar date.
