# Inspection form

From the repository root, run `npm run build` and `npm run serve`. Open `http://127.0.0.1:4173/examples/form/`. The files import the prebuilt browser module.

Open the inspection report and pick a date. **Done** updates the draft. **Escape** or **Alt+Left Arrow** closes the picker with the prior date. **Back** opens a confirmation when the form has edits. **Save and leave** keeps that destination pending until the write succeeds. During the write, Back and repeated submission are blocked. A failure keeps the draft and offers **Retry save and leave**.

`mountSurveyForm()` uses IndexedDB and resolves the save when the transaction commits. To copy it with another storage backend, pass `{ load(), save(report) }` to `mountSurveyForm`. Return a promise from `save` and reject on a failure so the form can offer a retry. Each report contains a title and an ISO calendar date.
