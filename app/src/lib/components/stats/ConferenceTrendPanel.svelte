<script>
  import Input from '$lib/components/ui/input.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import X from 'lucide-svelte/icons/x';
  import Plus from 'lucide-svelte/icons/plus';
  import TrendingUp from 'lucide-svelte/icons/trending-up';
  import ConferenceTrendChart from './ConferenceTrendChart.svelte';
  import { computePhraseTrends } from '$lib/stats/conferenceTrends.js';
  import { conferenceState } from '$lib/stores/conference.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { searchState } from '$lib/stores/search.svelte.js';

  const MAX_PHRASES = 10;
  // Tableau 10 — perceptually distinct and works on light backgrounds.
  const COLORS = [
    '#4e79a7', // blue
    '#59a14f', // green
    '#f28e2b', // orange
    '#b07aa1', // purple
    '#e15759', // red
    '#76b7b2', // teal
    '#edc948', // yellow
    '#ff9da7', // pink
    '#9c755f', // brown
    '#bab0ac', // gray
  ];

  // Local controlled inputs; trend recomputes when user clicks "Update".
  // The first slot mirrors the main search term — each new search replaces it
  // so the chart always shows "trend of what I just searched".
  let phrases = $state([searchState.lastRunTerm || '']);
  let draft = $state([searchState.lastRunTerm || '']);

  let expanded = $state(false);
  /** @type {'count' | 'frequency'} */
  let mode = $state('count');
  /** @type {'year' | 'session'} */
  let granularity = $state('year');
  let useRegex = $state(false);

  // Seed phrases[0]/draft[0] only when the *search term itself* changes, so
  // the user can edit the first phrase freely without the reactive effect
  // stomping their edits on every unrelated re-render. A new search still
  // replaces the first slot and refreshes the chart.
  let prevSearchTerm = searchState.lastRunTerm || '';
  $effect(() => {
    const term = searchState.lastRunTerm || '';
    if (term === prevSearchTerm) return;
    prevSearchTerm = term;
    if (draft.length === 0) draft = [''];
    if (phrases.length === 0) phrases = [''];
    draft[0] = term;
    phrases[0] = term;
  });

  const trend = $derived.by(() => {
    if (!expanded || !conferenceState.loaded) return null;
    const anyPhrase = phrases.some((p) => p && p.trim());
    if (!anyPhrase) return null;
    return computePhraseTrends(conferenceState.talks, conferenceState.paragraphs, phrases, {
      yearFrom: settings.conferenceYearFrom,
      yearTo: settings.conferenceYearTo,
      includeApril: settings.conferenceIncludeApril,
      includeOctober: settings.conferenceIncludeOctober,
      selectedSpeakers: settings.conferenceSelectedSpeakers,
      selectedCallings: settings.conferenceSelectedCallings,
      caseSensitive: settings.caseSensitive,
      granularity,
      useRegex,
    });
  });

  const chartLabels = $derived(trend ? trend.points.map((p) => p.label) : []);
  const chartSeries = $derived(
    trend
      ? trend.series.map((s) => ({
          phrase: s.phrase,
          values: mode === 'frequency' ? s.freq : s.counts,
        }))
      : [],
  );
  const yFormat = $derived(
    mode === 'frequency'
      ? (n) => (n >= 10 ? n.toFixed(1) : n.toFixed(2))
      : (n) => String(Math.round(n)),
  );

  function updatePhrase(i, v) {
    draft[i] = v;
  }
  function addPhrase() {
    if (draft.length < MAX_PHRASES) draft = [...draft, ''];
  }
  function removePhrase(i) {
    draft = draft.filter((_, idx) => idx !== i);
    if (draft.length === 0) draft = [''];
  }
  function applyPhrases() {
    phrases = draft.map((p) => (p || '').trim());
  }
  function clearAll() {
    draft = [''];
    phrases = [''];
  }

  function toggle() {
    expanded = !expanded;
  }
</script>

<div class="rounded-xl border bg-card">
  <button
    type="button"
    onclick={toggle}
    class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/40 transition-colors"
  >
    <div class="flex items-center gap-2">
      <TrendingUp class="h-4 w-4 text-muted-foreground" />
      <span class="text-sm font-semibold uppercase tracking-wide">Phrase Trends Over Time</span>
    </div>
    <span class="text-xs text-muted-foreground">{expanded ? 'Hide' : 'Show'}</span>
  </button>

  {#if expanded}
    <div class="border-t p-4 space-y-4">
      <p class="text-xs text-muted-foreground">
        Track up to {MAX_PHRASES} phrases over the filtered conference range.
        Switch between raw counts / per-10k-words frequency, and between yearly
        and per-session (April / October) granularity. Respects the Sessions /
        Speakers filters above. Each new search seeds the first phrase, but
        you can edit it freely.
      </p>

      <label class="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-input"
          checked={useRegex}
          onchange={(e) => (useRegex = e.currentTarget.checked)}
        />
        <span class="font-medium">Enable regex</span>
        <span class="text-muted-foreground">
          — treat each phrase as a JavaScript regular expression
        </span>
      </label>

      <div class="flex flex-col gap-2">
        {#each draft as phrase, i (i)}
          <div class="flex items-center gap-2">
            <span
              class="h-3 w-3 rounded-full shrink-0"
              style="background: {COLORS[i % COLORS.length]}"
            ></span>
            <Input
              placeholder="phrase {i + 1}"
              value={phrase}
              oninput={(e) => updatePhrase(i, e.target.value)}
              onkeydown={(e) => { if (e.key === 'Enter') applyPhrases(); }}
              class="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onclick={() => removePhrase(i)}
              title="Remove phrase"
              disabled={draft.length === 1 && !draft[0]}
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        {/each}
      </div>

      <div class="flex flex-wrap gap-2">
        <Button onclick={applyPhrases}>Update chart</Button>
        {#if draft.length < MAX_PHRASES}
          <Button variant="outline" onclick={addPhrase}>
            <Plus class="h-4 w-4" /> Add phrase
          </Button>
        {/if}
        <Button variant="ghost" onclick={clearAll}>Clear</Button>
      </div>

      {#if trend && trend.points.length}
        <div>
          <div class="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <div class="inline-flex rounded-md border overflow-hidden">
              <button
                type="button"
                class="px-3 py-1.5 font-medium transition-colors {mode === 'count' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}"
                onclick={() => (mode = 'count')}
              >
                Count
              </button>
              <button
                type="button"
                class="px-3 py-1.5 font-medium border-l transition-colors {mode === 'frequency' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}"
                onclick={() => (mode = 'frequency')}
                title="Occurrences per 10,000 words in that bucket"
              >
                Word freq (per 10k)
              </button>
            </div>

            <div class="inline-flex rounded-md border overflow-hidden">
              <button
                type="button"
                class="px-3 py-1.5 font-medium transition-colors {granularity === 'year' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}"
                onclick={() => (granularity = 'year')}
              >
                By year
              </button>
              <button
                type="button"
                class="px-3 py-1.5 font-medium border-l transition-colors {granularity === 'session' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}"
                onclick={() => (granularity = 'session')}
                title="Separate April and October data points"
              >
                By session
              </button>
            </div>
          </div>

          <ConferenceTrendChart
            labels={chartLabels}
            series={chartSeries}
            colors={COLORS}
            {yFormat}
          />

          <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {#each trend.series as s, i (i)}
              {#if s.phrase}
                <div class="flex items-center gap-1.5">
                  <span
                    class="h-2 w-2 rounded-full"
                    style="background: {COLORS[i % COLORS.length]}"
                  ></span>
                  <span class="font-medium">{s.phrase}</span>
                  <span class="text-muted-foreground">— {s.total.toLocaleString()} total</span>
                </div>
              {/if}
            {/each}
            <span class="text-muted-foreground">
              across {trend.talksConsidered.toLocaleString()} talks
              {#if mode === 'frequency'}
                · normalized to occurrences per 10,000 words
              {/if}
            </span>
          </div>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground italic">
          Enter at least one phrase and click Update chart.
        </p>
      {/if}
    </div>
  {/if}
</div>
