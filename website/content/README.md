# English documentation content

The site renders the English Markdown from the repository's `docs/` directory and root README. Keep API names, code identifiers, source citations, and example URLs intact when editing.

`example-translations.json` localizes the example applications copied from the pinned npm release. The build applies it to text and JavaScript strings without modifying the installed package. New release text must have a translation; missing entries fail the build instead of silently falling back to Russian.

Translations are stored in the repository. Building and deploying the site does not use a translation service or download a translation model.
