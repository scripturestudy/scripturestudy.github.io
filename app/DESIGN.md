# Scripture Study — Svelte app design

This is a Svelte 5 rebuild of the legacy app at the repo root. The old
`index.html` + `script.js` are still there, untouched. Everything in this
folder is the current app.

## 1. Goals

Preserve the feature set of the original while fixing the structural problems
called out in `../DESIGN.md` §17, and replace hand-rolled primitives with an
accessible component library.

- Decompose the 2000-line `script.js` into pure logic + reactive state +
  single-purpose components.
- Replace imperative DOM handling (event delegation, manual class toggling,
  ephemeral listener bookkeeping) with declarative components.
- Replace duplicated modal flows with one shared dialog primitive.
- Make the search engine a pure function so it can be tested, reused, profiled.
- Own the design system — Tailwind compiled, no CDN, no legacy stylesheet.
- Adopt a mainstream UI primitive library so we get focus trapping, keyboard
  navigation, and stacking for free.

## 2. Tech choices

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Svelte 5 (runes)** | Smallest runtime that still gives us real components + reactivity. `$state`/`$derived` makes the store layer ~20 lines. |
| Build | **Vite** (no SvelteKit) | App is a single client-side SPA. SvelteKit's router/SSR pay nothing here. |
| Styling | **Tailwind CSS v3** (compiled) + CSS custom properties via Tailwind theme tokens | Owned design system, no CDN. Dark mode has been removed. |
| UI primitives | **bits-ui** + shadcn-svelte conventions | Accessible, headless primitives (Dialog, Sheet, Tabs, DropdownMenu, Checkbox, Switch, Slider, Collapsible, Tooltip, Card). Styled with Tailwind in `components/ui/`. |
| Icons | **lucide-svelte** | Single import per icon; removed ~150 lines of inline SVG. |
| Class merging | **clsx + tailwind-merge + tailwind-variants** | Standard shadcn-style `cn()` helper in `utils/cn.js`. |
| Charts | `d3` + `d3-cloud` (npm) | Same libs as before, bundled. Mounted via Svelte 5 **attachments**. |
| Markdown | `marked` (npm) | Journal preview rendering. |
| Semantic | Lazy `import()` of `@huggingface/transformers` from CDN | Keeps ~150 MB model out of the main bundle; only downloads when user opts in. |

No TypeScript. JSDoc where shape matters (verse objects, search settings,
stats rows). Running TS on top of Svelte 5 runes is still flaky and would
mostly annotate obvious types.

## 3. Directory layout

```
app/
  index.html              # Vite entry. Links only /src/main.js and Google Fonts.
  package.json
  vite.config.js          # Dev middleware serves /lds-scriptures.json etc. from repo root.
  svelte.config.js        # Per-file runes detection (so lucide-svelte stays in legacy mode).
  tailwind.config.js
  postcss.config.js
  jsconfig.json
  DESIGN.md
  public/
    sw.js                 # service worker, copied to build root
  src/
    app.css               # @tailwind directives + a small @layer components
    main.js               # imports app.css, mounts App, registers SW
    App.svelte            # layout shell: header, search, tabs, modals, floating menu
    lib/
      constants/
        volumes.js        # HARDCODED_VOLUME_ORDER, VOLUME_ACRONYM_MAP
        stopwords.js      # STOP_WORDS Set
        limits.js         # RESULT_RENDER_LIMIT, WORD_CLOUD_LIMIT, MAX_SEARCH_HISTORY, SEMANTIC_TOP_K
      utils/
        regex.js          # escapeRegex
        text.js           # normalizeWord, shuffleArray
        format.js         # formatStat, formatPercentage
        url.js            # dataUrl(path)
        cn.js             # shadcn-style class merger
        export.js         # resultsToMarkdown
      data/
        scriptures.js     # fetch + normalize + sort volumes
        cfm.js            # fetch + parse Come Follow Me schedule
        seek.js           # fetch + pick random "seek" message
        fallback.js       # tiny sample data when lds-scriptures.json can't be fetched
      search/
        query.js          # parseQuery: AND/OR auto-convert, regex compile
        verseTitle.js     # buildVerseTitleRegex: acronym expansion
        engine.js         # runSearch(data, settings) -> { results, status, ... } (pure)
        semantic.js       # lazy-loaded embedding pipeline + scoreAll
      stats/
        ngrams.js         # calculateNGrams(results, n, excludeStopWords)
        compute.js        # computeStatistics(...)
      stores/             # .svelte.js so they can use $state at module scope
        scriptures.svelte.js       # class-based store; verses field is $state.raw
        search.svelte.js
        settings.svelte.js
        journal.svelte.js
        history.svelte.js
        ui.svelte.js               # which modal is open, panels, filters collapsed
        persistence.js             # seedFromStorage / writeToStorage helpers
        persist-all.svelte.js      # wires persistence for journal, history, settings
        urlSync.js                 # readHashIntoState / writeStateToHash
        shortcuts.js               # /, Cmd+J, Cmd+H, ?
      components/
        ui/               # shadcn-svelte primitives, styled wrappers over bits-ui
          button.svelte
          input.svelte
          textarea.svelte
          checkbox.svelte
          switch.svelte
          slider.svelte
          separator.svelte
          badge.svelte
          skeleton.svelte
          alert.svelte
          dialog/         # {root, trigger, close, portal, content, overlay, title, description, header, footer}
          sheet/          # {root, trigger, close, portal, content, overlay, title, description, header}
          tabs/           # {root, list, trigger, content}
          dropdown-menu/  # {root, trigger, content, item, separator, label}
          card/           # {root, header, title, description, content, footer}
          collapsible/    # {root, trigger, content}
          tooltip/        # {root, trigger, content, provider}
        search/
          SearchBar.svelte
          AdvancedFilters.svelte
          VolumeCheckboxes.svelte
          CFMFilter.svelte
          SemanticSearchBar.svelte
        results/
          ResultsView.svelte
          ResultCard.svelte
          VolumeColumns.svelte
          HighlightedText.svelte
        stats/
          StatsPanel.svelte
          NGramTabs.svelte
          NGramTable.svelte
          WordCloud.svelte
          VolumeChart.svelte
          WordFormsBreakdown.svelte
        journal/
          JournalPanel.svelte
          JournalEditor.svelte
        modals/
          ContextDrawer.svelte
          NoteModal.svelte
          SearchHelpModal.svelte
          StatsHelpModal.svelte
          StopWordsModal.svelte
        history/
          SearchHistoryPanel.svelte
        layout/
          FloatingButtons.svelte    # single DropdownMenu in bottom-right
          TabBar.svelte
```

## 4. Architecture

Three horizontal layers, no cross-talk below downward:

```
┌─ components/ ────────────────────────────────────┐
│  thin Svelte components, read/write stores       │
├─ stores/ ────────────────────────────────────────┤
│  reactive state ($state / class fields), derived │
│  values, actions that invoke pure logic          │
├─ lib/ (data, search, stats, utils) ──────────────┤
│  pure functions, no DOM, no stores               │
└──────────────────────────────────────────────────┘
```

Anything under `lib/` (except `stores/`) is framework-agnostic and can be
unit-tested with plain `node --test`.

### 4.1 Search data flow

```
SearchBar      → search.svelte.js:run()
                    │
                    ├─ settings.svelte.js        (read filters/flags)
                    ├─ scriptures.svelte.js      (read cached data)
                    ├─ lib/search/query.js       (parse query + compile regex)
                    ├─ lib/search/verseTitle.js  (build title regex)
                    ├─ lib/search/engine.js      (pure filter)
                    ├─ [optional] semantic.js    (lazy; hybrid rescore)
                    ├─ lib/stats/compute.js      (stats for result set)
                    └─ urlSync.writeStateToHash  (make the search shareable)
                    ↓
               search.svelte.js state updates
                    ↓
               ResultsView / StatsPanel re-render
```

### 4.2 Modals: one primitive, `ui.activeModal` selects which

`ui.activeModal` is a string like `'search-help' | 'stats-help' | 'stop-words'
| 'context' | 'note' | null`. Each modal component listens for its own key and
opens the shared bits-ui `Dialog` wrapper. The old compact-action modal is
gone — it's now a `DropdownMenu` attached directly to the compact card. One
code path instead of two.

### 4.3 UI primitives (`components/ui/`)

These follow the shadcn-svelte convention: thin `<script>`-only wrappers over
bits-ui that apply Tailwind classes and expose a `class` prop merged via
`cn()`. Compound components (Dialog, Sheet, Tabs, DropdownMenu, Card,
Collapsible, Tooltip) each live in their own folder with an `index.js` that
re-exports both short names (`Root`, `Content`, `Trigger`) and namespaced
ones (`Dialog`, `DialogContent`, `DialogTrigger`) so callers pick whichever
style reads better.

### 4.4 Svelte 5 idioms in use

- **`$state.raw` for `verses`**: the 40k-verse array is wrapped in `$state.raw`
  inside `ScripturesStore` (a class) so we pay proxy cost only on reassignment,
  never on per-element access in the search hot loop.
- **Attachments (`{@attach ...}`)** for the D3 components. `VolumeChart.svelte`
  and `WordCloud.svelte` hand the container node to a D3 function that reads
  `$props` reactively and cleans up on detach. No `bind:this`, no `$effect +
  setTimeout` dance.
- **Snippets** (`{#snippet}`) in `VolumeColumns.svelte` for the repeated card
  rendering.
- **`$derived`** everywhere for computed UI — counts, labels, sort order.
- **Class fields with runes**: `ScripturesStore` shows the pattern for mixing
  `$state` and `$state.raw` in one object.

### 4.5 Persistence

`persist-all.svelte.js` seeds + writes three keys at mount:

- `ss.journal` — journal content + edit/preview mode.
- `ss.history` — entire search history array.
- `ss.settings` — all toggles + `selectedVolumes`, **except** CFM (intentionally
  session-only, because its "apply defaults for a reading experience" side
  effect would surprise users on refresh).

### 4.6 URL sync

Every `run()` call writes the search state to `location.hash` via
`writeStateToHash`. At app mount, if the hash is present, `readHashIntoState`
seeds the stores and triggers a search automatically. Makes URLs shareable
(`#?q=faith+AND+hope&re=1&vols=all`).

### 4.7 Keyboard shortcuts

Installed once from `App.svelte`. Defaults:

- `/` focus the main search input
- `Cmd/Ctrl+J` toggle journal panel
- `Cmd/Ctrl+H` toggle history panel
- `?` open search help

All skip when the user is typing in an input/textarea.

## 5. Data loading

`scriptures.svelte.js:load()` is called from `App.svelte` on mount. The loader:

1. `fetch(dataUrl('lds-scriptures.json'))` → falls back to `lib/data/fallback.js`
   on failure.
2. Annotates each verse with `__idx = i` so semantic scores stay index-aligned
   with `embeddings.bin`.
3. Normalizes volume names via `VOLUME_ACRONYM_MAP`.
4. Builds `availableVolumes` in `HARDCODED_VOLUME_ORDER` order, unknowns
   appended alphabetically.

CFM schedule and seek messages are lazy — loaded the first time their
consumers mount / first run.

## 6. Search engine

### 6.1 Query parsing

`parseQuery({ term, useRegex, caseSensitive })` returns a `ParsedQuery`:

```js
{ mode, regex, phrase, wasAutoConverted, error }
```

- AND wins over OR (documented limitation; explicit regex for complex logic).
- Both operands are `escapeRegex`'d before insertion.

### 6.2 Verse title filter

`buildVerseTitleRegex(pattern)` rewrites every acronym in
`VOLUME_ACRONYM_MAP` to `(?:acronym|fullName)` so typing `^D&C 4` matches both
`D&C 4:1` and `Doctrine and Covenants 4:1`. Always case-insensitive.

### 6.3 Engine

`runSearch(data, settings)` is pure:

1. Filter by selected volumes.
2. If semantic + query → `hybridRescore` with the precomputed score vector and
   a keyword-match closure. Top `SEMANTIC_TOP_K` survive.
3. Else apply main regex / phrase, then verse-title regex.
4. Optionally shuffle (skipped if semantic ranked).
5. Returns `{ results, status, wasAutoConverted, rankingMode, error }`.

Caller (`search.svelte.js`) enforces `RESULT_RENDER_LIMIT` (2000) — the engine
doesn't truncate.

## 7. Statistics

`computeStatistics(results, { term, useRegex, excludeStopWords })` returns
`{ totalMatched, perVolume, wordForms, ngrams: {1,2,3,4} }`. Single pass for
1-grams + per-volume counts; three sliding-window passes for 2/3/4-grams.
Stop-word exclusion is applied **before** window formation for n>1 — same as
the original app.

Sort state is purely UI (lives in `NGramTable.svelte`).

## 8. Components

**`ResultCard.svelte`** — one verse; renders compact or full based on
`settings.compactView`. Compact mode's `⋮` opens a `DropdownMenu` in place
(no modal).

**`HighlightedText.svelte`** — safe template: HTML-escapes non-match segments,
wraps match ranges with `<span class="highlight">`. Fails silently on regex
error (same as old app).

**`VolumeChart.svelte` / `WordCloud.svelte`** — attachment-driven D3.
`WordCloud` only renders items when its tab is active (keyed by `active`).

**`Modal` (removed)** — replaced by `ui/dialog`. All help/context/note modals
compose `DialogContent`, `DialogTitle`, `DialogDescription`.

**`FloatingButtons.svelte`** — single bottom-right `DropdownMenu` with Notes /
History / Help items. Replaces the three separate floating buttons the old
app had.

## 9. Semantic search

`lib/search/semantic.js` exports `init`, `scoreAll`, `onStatus`, `isReady`.
Lazy `import()` of `@huggingface/transformers` (CDN). Embeddings file is
fetched in parallel and dequantized int8 → Float32Array once.
`runSearch`'s hybrid rescoring fuses `(1-α)·kw + α·sem` and takes the top K.

## 10. Service worker

`public/sw.js` (copied to build root). Cache-first for `./`, `./index.html`,
`/lds-scriptures.json`, `/cfm2026.json`. GET misses are lazy-cached, so the
semantic model/embeddings persist after first fetch. Cache name
`scripturestudy-app-v1` — bump for breaking changes.

## 11. Known trade-offs / deferred

- **Virtualized result list** — still deferred; 2000-cap keeps it usable.
- **Web Worker for semantic/stats** — still on the main thread.
- **Test harness** — no vitest yet; pure lib is ready for it.
- **Focus return** on modal close — bits-ui returns focus to trigger by
  default, but our modals opened from elsewhere (e.g. floating menu item →
  help modal) don't always have a clean return target.
- **Deep arrow-key navigation** between cards isn't implemented yet;
  `role="list"` + `role="listitem"` are in place so a later directive is cheap.
