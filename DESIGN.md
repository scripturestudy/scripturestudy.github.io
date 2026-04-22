# Scripture Study — Design Document

This document describes the runtime behavior of the app. The page is a single-file, client-only web app; all logic lives in the browser. There is no build step and no server besides static hosting.

## 1. Architecture overview

Files:

- `index.html` — markup + hidden modals/drawers + floating buttons. No behavior.
- `script.js` — ~2000 lines, the bulk of the app. Top-level IIFE style (globals captured at load). Runs after `DOMContentLoaded`. Not a module.
- `semantic-search.js` — ES module attached as `window.__semanticSearch`. Lazy-loaded on toggle.
- `sw.js` — service worker. Cache-first for static assets; lazy-fetched-and-cached for the semantic index.
- `style.css` — styling (modals, dark mode, grid, compact cards).
- Data: `lds-scriptures.json` (~40k verses), `cfm2026.json` (Come Follow Me schedule), `assets/seek-scriptures.json` (random encouragement strings), `assets/embeddings.bin` + `assets/embeddings-meta.json` (semantic index).

Load order in `index.html`: Tailwind CDN, D3, d3-cloud, marked (all `defer`). Then `semantic-search.js` (module) and `script.js` (classic). Then the service-worker registration inline.

## 2. State

All state is in-memory module globals in `script.js`:

- `scriptureCache.lds` — full verse array (cached after first fetch).
- `scriptureCache.currentResults` — array of verses from the most recent search; used by stats, compact-view re-render, and the add-to-journal flow.
- `allAvailableVolumes` — ordered list derived from data.
- `booksMap` — `Map<volume, Set<book>>` (built but not currently read).
- `currentFrequencyData` — `{1:[], 2:[], 3:[], 4:[]}` n-gram arrays for the stats tables/clouds.
- `currentVolumeChartData` — array for the volume bar chart.
- `currentSortColumn` / `currentSortDirection` — stats table sort state.
- `currentNgramSize` — 1–4, which stats sub-tab is active.
- `firstSearchPerformed` — flips true after first search; used to auto-collapse the filters drawer.
- `currentCompactActionVerse` — verse backing the compact-view action modal.
- `seekScriptures` — lazy-loaded list of "seek" messages.
- `searchHistory` — in-memory list (NOT persisted; lost on reload).
- Dark mode is the one exception persisted to `localStorage` under key `darkMode`.

Note: search history, journal contents, and search settings do **not** survive a page refresh. The journal textarea placeholder explicitly warns the user.

## 3. Data loading

`fetchScriptureData()` (script.js:214):

1. Returns cached `scriptureCache.lds` if present.
2. Shows loading indicator; tries `fetch("lds-scriptures.json")`.
3. On failure, falls back to `DUMMY_SCRIPTURE_DATA` (a handful of hardcoded verses) and sets a visible fallback warning.
4. Iterates the array once. For each verse:
   - Assigns `verse.__idx = idx` — this row index aligns with the embeddings array for semantic search.
   - Normalizes volume names via `VOLUME_ACRONYM_MAP` (e.g., "D&C" → "Doctrine and Covenants").
   - Populates `booksMap` and the volumes set.
5. Orders volumes using `HARDCODED_VOLUME_ORDER` (OT, NT, BoM, D&C, PoGP) first, then anything else alphabetically.
6. Calls `populateVolumeCheckboxes()` which creates one checkbox per volume, all checked by default, wired to `handleVolumeCheckboxChange` to keep the "All Volumes" master checkbox in sync (including tri-state indeterminate).

## 4. Search logic

Entry point: `performSearch()` (script.js:427). Triggered by:

- Clicking `#searchButton`.
- Enter in `#searchInput` or `#verseTitleFilterInput`.
- Clicking a search-history item (`applySearchSettings` populates inputs then calls `performSearch`).
- Clicking a 1-gram word in the word cloud (sets `searchInput.value` and disables regex).
- CFM filter changes (when enabled).

### 4.1 Pre-flight

1. Temporarily swap the button label to "and ye shall find" for 2s.
2. Call `showSeekScripture()` — fetches `assets/seek-scriptures.json` once, picks a random string, shows it in `#seekMessage` for 2s (`.show` CSS class toggles opacity).
3. If this is not the first search, auto-collapse the advanced filter area.
4. Clear errors, results, stats; disable the Stats tab; switch the active tab back to Scriptures.
5. If data not yet loaded, show loader and `await fetchScriptureData()`.

### 4.2 Query interpretation

Inputs: `searchInput`, `verseTitleFilterInput`, the regex/case-sensitive checkboxes, the volume checkboxes.

**Volume filter:** if none selected, bail early with "Please select at least one volume".

**Main search term** (`searchTerm`):

- If regex is OFF and the term matches `^(.*?)\s+AND\s+(.*?)$` (case-insensitive), auto-convert to regex `(term1.*?term2|term2.*?term1)` — "either order, anywhere".
- Else if regex OFF and matches `^(.*?)\s+OR\s+(.*?)$`, auto-convert to `(term1|term2)`.
- AND is checked before OR, so `AND` wins if both appear — this is called out in the help modal as a known limitation; use explicit regex for complex logic.
- Both operands are `escapeRegex`'d before insertion.
- If regex is ON (or we auto-converted), compile `new RegExp(pattern, isCaseSensitive ? "g" : "gi")`. Invalid regex → render an inline error under the input and stop.

**Verse title filter** (always regex, always case-insensitive):

- Before compiling, replace every acronym in `VOLUME_ACRONYM_MAP` with a non-capturing alternation of the acronym OR the full name. E.g. typing `^D&C 4` will match both `D&C 4:...` and `Doctrine and Covenants 4:...`. This is a per-match substitution over the user's pattern using `escapeRegex` on both sides.

### 4.3 Filtering

1. Start from the full verse array.
2. Keep only verses whose `volume_title` is in the selected volumes set.
3. If semantic toggle is ON and a query is present, take the semantic-search path (see §8). Otherwise:
4. If main regex was compiled, keep verses whose `scripture_text` matches (reset `lastIndex` after, since the regex is `/g`).
5. Else if there's a plain search term, substring match (lowercased if not case-sensitive).
6. Else no term → results = everything selected.
7. If verse-title regex is present, further filter on `verse_title`.
8. If "Shuffle Results" is on AND we did **not** just rank semantically, shuffle in place (Fisher-Yates in `shuffleArray`).

### 4.4 Cap & render

- Results are stored in `scriptureCache.currentResults`.
- If `results.length > RESULT_RENDER_LIMIT` (2000), render nothing; show "more than limit" warning instead; leave the Stats tab disabled. This avoids blowing up the DOM on overly-broad queries.
- Otherwise call `displayResults(...)` and `calculateAndDisplayStatistics(...)` and enable the Stats tab.
- On success, `saveSearchSettings()` snapshots the current form state into in-memory search history.

### 4.5 Status line

Built from parts (`"Searching for "<term>""`, `"using regex"` / `"as exact phrase"` / `"hybrid rank (X% semantic)"`, case-sensitivity, title filter, volumes scope) joined with commas into `#searchStatus`.

## 5. Results rendering

`displayResults(results, searchTerm, isCaseSensitive, displayColumns)` (script.js:725).

Two layouts, chosen by the "Show Volume Columns" checkbox:

- **Grid/flow** (`results-grid-container`): a `DocumentFragment` of cards.
- **Volume columns** (`results-flex-container`): group by `volume_title`, render one `.volume-column` per volume in `HARDCODED_VOLUME_ORDER`, then any remaining volumes alphabetically. Each column has a header with count and a scrollable content area.

### 5.1 Card (`createResultCard`)

Two visual modes driven by the `#compactView` checkbox.

**Non-compact:**

- Row layout: content on the left, vertical button rail on the right (copy, add to journal, Google, Church site).
- Heading is `<h3>` with the verse title, clickable → opens the context drawer.
- Body is a `<p>` of `scripture_text` with matches wrapped in `<span class="highlight">`. Highlight regex: if the user typed regex, use the same pattern; otherwise `escapeRegex` it. If compilation throws, render text unhighlighted (no error shown).
- Button data is stashed in `data-copy` / `data-verse-title` / `data-scripture-text` using `escape()` (the legacy URL-escaping function) to survive HTML attribute embedding; decoded on click with `unescape()`.
- Google button opens `google.com/search?q=<scripture_text>`. Church-site link goes to `churchofjesuschrist.org/search?...` scoped by book/chapter/verse.

**Compact:**

- Flex-column card, tighter padding, smaller verse-title caption.
- Right-side buttons collapse into a single `⋮` trigger (`.compact-card-action-trigger`) that opens the Compact Action Modal (§7.3).

Every card stashes the full verse on `card.dataset.verseData = JSON.stringify(verse)` so the compact-action handler can recover it via `JSON.parse`.

### 5.2 Event delegation

Rather than wiring per-card listeners:

- `document.body` click listener handles `.copy-button` and `.add-to-journal-button` everywhere (results and context drawer).
- `document` click listener handles `.compact-card-action-trigger`.
- `resultsContainer` click listener handles (legacy) `.card-menu-button` dropdowns. (This looks like dead code — no cards currently emit `.card-menu-button`; the compact-view menu uses `.compact-card-action-trigger` + modal. Safe to ignore but noted.)

### 5.3 Interactions with view toggles

- `#compactView` toggles a CSS variable `--column-spacing` and a `.compact-mode` class for immediate visual feedback, then re-renders via `requestAnimationFrame` after a 150ms debounce if there are cached results.
- `#columnsByVolume` toggle re-renders if there are results, or just swaps the container class.
- `#singleColumn` toggle sets CSS variable `--results-columns` to `1` or `4`.

## 6. Context drawer

`openContextDrawer(clickedVerse)` (script.js:805):

1. Filter the full cache for the same `book_title` + `chapter_number`, sort by `verse_number`.
2. For each verse in that chapter, call `createResultCard(verse, null, false, isForContextDrawer=true)` — passes `null` for searchTerm so no highlighting; passes `true` to disable the heading's click-to-open-context (avoids nesting drawers).
3. The clicked verse gets `.current-context-verse` and `scrollIntoView({block: 'center'})` after a 100ms tick.
4. Uses the same `openModal` / `closeModal` primitive (toggling `.active` on the overlay).

## 7. Modals

All modals are hidden `<div class="modal-overlay">` nodes in `index.html`, flipped on with `.active`. A single `Escape` keydown handler closes whichever is active. Overlay clicks (where `event.target === overlay`) also close.

Modals inventory:

- `searchHelpModalOverlay` — how-to-search README; opened by the floating `?` button.
- `statsHelpModalOverlay` — statistics glossary; opened from the "Explain Statistics" button inside the stats panel.
- `stopWordsModalOverlay` — list of stop words; populated lazily via `populateStopWordsModal` (sorted `STOP_WORDS`).
- `contextDrawerOverlay` — chapter context (§6).
- `noteModal` — add-a-note + scripture-preview textarea (§7.1).
- `compactActionModal` — copy / add-to-journal / Google / Church for compact-card mode (§7.3).

### 7.1 Note modal (Add to Journal)

Triggered from any `.add-to-journal-button`. Flow:

1. Populate `#modalVerseTitle` + `#modalScriptureText`; `showModal()` and focus the textarea after 50ms.
2. Wire ephemeral listeners:
   - Save button click → `handleSaveNote`.
   - Cancel button / close-X / overlay click → `handleCancelNote`.
   - Shift+Enter in textarea → `handleSaveNote`.
3. `handleSaveNote` composes `{userNote}\n> {scripture} ({title})`, prepends `\n\n` if the journal already has text, appends to `journalEditor.value`, calls `updateJournalPreview()`, scrolls to bottom, and flashes "✓ Added!" on the originating add button via `showButtonFeedback`.
4. Cleanup removes the textarea keydown handler and overlay handler; save/cancel/close use `{once:true}` (paired with explicit `cleanupOverlay` passes for the overlay handler).

Caveat: the same flow is duplicated inside the compact-action "Add to Journal" handler (script.js:1981). The two paths share the same modal DOM but have independent listener lifecycles.

### 7.2 Help modals

Static content in HTML. Just `openModal`/`closeModal` on the overlays.

### 7.3 Compact Action Modal

Only used in compact view. Clicking a card's `⋮`:

1. `handleCompactActionTrigger` parses `card.dataset.verseData` → `currentCompactActionVerse`.
2. Sets `#compactActionModalVerseRef` to the verse title and updates the Church-site `<a>` href to the correct verse.
3. `openModal(compactActionModal)`.

Buttons:

- **Copy Scripture** — clipboard-writes `> {text} ({title})`, flashes check/error, closes.
- **Add to Journal** — populates noteModal with this verse, wires save/cancel listeners, opens noteModal, closes compact modal. (Second, mostly-duplicated implementation of §7.1.)
- **Search on Google** — `window.open` on Google with the scripture text.
- **Search on Church Website** — the `<a>` uses the href set when the modal opened; the click handler closes the modal after 100ms so the new tab can launch.

There are two overlapping click delegations for the trigger (one named `handleCompactActionTrigger`, one anonymous at script.js:1911). Both open the modal; the second wins once the first's `stopPropagation` is consumed. Functional but redundant.

## 8. Semantic search

`semantic-search.js` defines three public methods on `window.__semanticSearch`: `init`, `scoreAll(query)`, `onStatus(cb)`.

### 8.1 Initialization (`init`)

Concurrent `Promise.all` of two pipelines:

1. **Model pipeline** — dynamically `import()`s transformers.js v3 from jsDelivr and creates a `feature-extraction` pipeline for `onnx-community/embeddinggemma-300m-ONNX` with `dtype: "q4"`. Downloads ~150 MB on first use; cached by the browser HTTP cache afterward.
2. **Embeddings** — fetches `assets/embeddings-meta.json` + `assets/embeddings.bin` in parallel, validates `buf.byteLength === num_verses * dim` and `dtype === "int8"`, then dequantizes int8 → Float32Array by multiplying each byte by `meta.scale`. Result is one ~43 MB contiguous `Float32Array` (e.g. 42k × 256).

Both promises are memoized; a second `init()` returns the first one.

### 8.2 Query scoring (`scoreAll`)

1. Build `prefix + query` where prefix comes from `meta.query_prompt` (default `"task: search result | query: "`). Keeping this in the meta file keeps the JS in lockstep with whatever Python pipeline built the index.
2. `pipe(...)` with `pooling: "mean"`, `normalize: true` returns a unit Float32Array at the model's native dim (768).
3. **Matryoshka truncation**: if `full.length > meta.dim`, slice to the first `meta.dim` components and re-normalize. Supports running the index at a smaller dim than the model.
4. Dot product the query vector against each verse (both unit-normalized → cosine). Tight `for (i) for (j)` loop, no BLAS. ~20–40 ms for 42k × 256 on a modern laptop.

### 8.3 Integration in `performSearch`

When `semanticSearchToggle.checked` is true AND a query is present (script.js:488):

1. `scoreAll(originalSearchTerm)` — returns scores aligned with the full verse array by `verse.__idx`.
2. Apply volume + verse-title filters to build `pool`. Main keyword regex is NOT used as a hard filter here.
3. For each pooled verse, compute a hybrid score:
   - `sem = (score + 1) * 0.5` — shift cosine from [-1, 1] into [0, 1].
   - `kw = 1 if the keyword (regex or substring) matches, else 0`.
   - `fused = (1 - α) * kw + α * sem` where α = `semanticWeightSlider.value / 100`.
4. Sort desc by `fused`, take top 500 (`SEMANTIC_TOP_K`).
5. When semantic ranking is applied, shuffle is suppressed and the status line shows `"hybrid rank (X% semantic)"`.

### 8.4 UI wiring

- Toggle shows/hides `#semanticSliderWrap`; on first enable, awaits `init()` and routes progress messages via `onStatus` → `#semanticStatus`.
- Slider updates `#semanticWeightLabel` text live.
- If the module failed to load entirely, the toggle un-checks itself and shows an error.

## 9. Statistics panel

`calculateAndDisplayStatistics(results, totalScripturesMatched, originalSearchTerm, useRegex)` (script.js:897) runs after a successful search. Panel is hidden until enabled (`#statsTabButton.disabled = false`).

### 9.1 Per-verse scan

Single pass over results:

- Increments per-volume counter.
- Splits text on `\s+`, `normalizeWord`s each token (lowercase, strip leading/trailing non-word chars, drop trailing `'s`, remove punctuation).
- Increments `wordTotalCounts[word]` (respecting stop-word exclusion if `#excludeStopWordsCheckbox` is checked).
- Increments `wordUniqueCounts[word]` once per verse.
- Increments `totalWordsCounted` for the global denominator.
- If the original search was a **single-word, non-regex, non-AND/OR** query, also counts all words that start with the normalized search prefix into `wordFormsCounts` (e.g. "faith" → "faith", "faithful", "faithfulness"). This gates the "Word Forms Breakdown" panel.

### 9.2 N-grams

`calculateNGrams(results, n, excludeStopWords)` for n ∈ {2, 3, 4}. Normalizes + optionally drops stop words **before** forming sliding windows. That means stop-word exclusion for 2/3/4-grams changes which adjacent words are considered, not just filters output — this is why the help text calls out that including stop words "preserves the exact phrasing for 2-/3-/4-grams".

### 9.3 Tabs & tables

N-gram sub-tabs (1/2/3/4-gram) each have a word cloud + frequency table.

- `switchNgramTab(target)` updates `.active` classes, then re-renders chart + table + cloud.
- `renderFrequencyTable` slices the sorted frequency data to the top 100, renders it into the n-gram-specific `<tbody>`. Column layout differs: 1-gram has 6 columns (word, total, unique, freq/scripture, freq/word, coverage); n-gram has 3 (phrase, total, unique).
- Clicking a `<th data-sort>` toggles sort direction (numeric columns default to desc, string columns to asc). Sort state is global (`currentSortColumn`, `currentSortDirection`).
- "Exclude Stop Words" change handler re-runs the full stats calculation against cached results.

### 9.4 Volume chart

`renderVolumeChart(data)` (D3):

- 50ms timeout to let the tab become visible and `clientWidth` become nonzero.
- Horizontal bar chart; left margin 150px for wrapped axis labels (`wrapAxisText` word-wraps labels that exceed available width).
- Bars animate from width 0 to `xScale(count)`.
- `currentVolumeChartData` is cached so re-entering the tab can re-render without recomputing.

### 9.5 Word cloud

`renderWordCloud(ngramSize)` uses `d3.layout.cloud`. Size multiplier shrinks as n grows (5 → 3.5 → 3 → 2.5) so longer phrases still fit. 1-gram items get random 90° rotation 30% of the time; n-grams stay horizontal. Clicking a word in the 1-gram cloud writes it into `#searchInput`, unchecks regex, and re-runs search.

## 10. Journal panel

- Floating blue notepad button at bottom-right → `toggleJournalPanel` slides `#journalSection` up/down via `translate-y-full` utility class. Button hides while panel is open (and vice versa).
- Inside the panel:
  - `#journalEditor` textarea (Markdown input).
  - `#journalPreview` div (rendered HTML).
  - Editor/Preview toggle buttons swap which is visible; Preview calls `marked.parse(journalEditor.value)` into `#journalPreview.innerHTML`.
  - `input` on the editor live-updates preview (so it's ready when you flip).
  - Download button creates a `Blob` of the editor value and triggers download of `scripture_journal.md`.
  - Copy button clipboard-writes the editor value; flashes feedback.
  - Clear button confirms, then empties the editor.
- Journal content is **session-only**. The textarea placeholder includes a ⚠️ warning.

## 11. Come Follow Me filter

On DOM ready, `loadCFMSchedule()` fetches `cfm2026.json`. Each entry has `start_date`, `end_date`, `verse_title`.

- `updateCFMSelect` populates `#comeFollowMeSelect` with `<date_range>: <reading>` options. The current week (today is between start and inclusive-end) is auto-selected.
- The checkbox enables/disables the `<select>`.
- When checked (`handleCFMFilterChange`):
  1. Disable "Shuffle Results", disable "Show Volume Columns", enable "Single Column" (sets `--results-columns` CSS var to `1`).
  2. Pull the selected week's `verse_title`, prefix with `^` if not already, write to `#verseTitleFilterInput`, and call `performSearch`.
- Unchecking reverses the single-column CSS var to 4 but leaves other checkboxes as the user left them.

## 12. Search history

- In-memory ring-buffer of max `MAX_SEARCH_HISTORY = 30`.
- `saveSearchSettings` is called on successful non-empty search (after results render).
- `#searchHistoryButton` (bottom-left floating) opens the history panel; items show the search term, title filter, regex/case flags, selected-volume count, and timestamp (`Date.toLocaleString()`).
- Clicking an item runs `applySearchSettings` which restores inputs + volume checkboxes + re-runs the search.
- Not persisted across reloads.

## 13. Dark mode

Toggled by `#darkModeToggle` (top-right). Adds/removes `.dark-mode` on `<body>`; label flips between "Dark" and "Light"; boolean persisted as `localStorage.darkMode`. Loaded on DOMContentLoaded.

## 14. Floating buttons & first-run behavior

- `#howToSearchButton` (`?` top-right) opens the search-help modal. On DOMContentLoaded it is given `opacity-0 pointer-events-none` to hide it. (Effectively disabled by default; the CSS transition class stays in the markup but the button is invisible and unclickable until something removes those classes — none of the current code does. Treat this as dormant.)
- Mobile vs desktop defaults (detected via `matchMedia("(max-width: 768px)")` on DOMContentLoaded):
  - Compact view: on for mobile, off for desktop.
  - Shuffle: off for mobile, on for desktop.
  - Volume columns: off for mobile, on for desktop.

## 15. Service worker (`sw.js`)

- Cache name: `scripturestudy-v3`. Bump the version to force a cache refresh.
- On `install`: precache `/`, `index.html`, `style.css`, `script.js`, `semantic-search.js`, `lds-scriptures.json`, `cfm2026.json`, `assets/seek-scriptures.json`. Then `skipWaiting`.
- On `activate`: delete any caches not matching the current `CACHE_NAME`, then `clients.claim`.
- On `fetch` (GET only): cache-first. Cache misses go to network, and successful same-origin 200 responses are cloned and written back to cache. This is what makes the 150 MB semantic model and 43 MB embeddings file persist after first load (they aren't in the precache list).
- Registered inline in `index.html` after `load`.

## 16. Notable constants

```js
HARDCODED_VOLUME_ORDER       // OT, NT, BoM, D&C, PoGP
VOLUME_ACRONYM_MAP           // D&C, BoM, BofM, OT, NT, PoGP, PGP, Ne
STOP_WORDS                   // ~175-word set, shared by stats + n-grams
WORD_CLOUD_LIMIT    = 75
RESULT_RENDER_LIMIT = 2000
MAX_SEARCH_HISTORY  = 30
SEMANTIC_TOP_K      = 500    // cap on hybrid-ranked results
```

## 17. Known rough edges

- The noteModal-open flow exists in two places with slightly different listener cleanup (§7.1 and §7.3 Add-to-Journal). Any refactor should collapse them.
- Two click delegations fire for `.compact-card-action-trigger` (script.js:1873 and 1911); only the second is load-bearing.
- `resultsContainer` has dead listeners for `.card-menu-button` / `.card-menu` — no current card emits those classes.
- Search history / journal / search settings are not persisted. The placeholder warns the user about the journal; the other two are silently session-only.
- The top-right "?" help button is rendered invisible on load and never re-shown by current code.
- The `booksMap` is built but not consumed.
