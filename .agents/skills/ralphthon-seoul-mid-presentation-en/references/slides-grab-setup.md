# slides-grab setup (EN)

Use this when `slides-grab` is missing.

## Standard npm setup
```bash
npm install slides-grab
npx playwright install chromium
npx skills add ./node_modules/slides-grab -g -a codex --yes --copy
npx slides-grab --help
```

Then restart Codex so the installed slides-grab skills are loaded.

## Notes
- Keep each deck in `decks/<deck-name>/`.
- `slides-grab edit`, `build-viewer`, `validate`, `pdf`, and `convert` all require an existing deck with `slide-*.html` files.
