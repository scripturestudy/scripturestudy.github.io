<script>
  import { Card } from '$lib/components/ui/card/index.js';
  import ExternalLink from 'lucide-svelte/icons/external-link';
  import Music from 'lucide-svelte/icons/music';
  import Button from '$lib/components/ui/button.svelte';
  import { searchState } from '$lib/stores/search.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { hymnsState } from '$lib/stores/hymns.svelte.js';
  import { RESULT_RENDER_LIMIT } from '$lib/constants/limits.js';
  import HymnVerseCard from './HymnVerseCard.svelte';

  const PAGE_SIZE = 50;

  const res = $derived(searchState.hymns);

  let visibleHymns = $state(PAGE_SIZE);
  $effect(() => {
    res; // dependency
    visibleHymns = PAGE_SIZE;
  });

  const shown = $derived(res ? res.hymnOrder.slice(0, visibleHymns) : []);
  const remaining = $derived(res ? Math.max(0, res.hymnOrder.length - visibleHymns) : 0);
  const shownVerseCount = $derived.by(() => {
    if (!res) return 0;
    let n = 0;
    for (const idx of shown) n += res.byHymn.get(idx)?.length || 0;
    return n;
  });

  function loadMore() {
    visibleHymns = Math.min(res.hymnOrder.length, visibleHymns + PAGE_SIZE);
  }

  function loadAll() {
    visibleHymns = res.hymnOrder.length;
  }
</script>

{#if hymnsState.error || searchState.hymnsError}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
    <p class="font-semibold text-destructive">Could not load hymns data.</p>
    <p class="text-sm text-muted-foreground mt-1">
      {hymnsState.error || searchState.hymnsError}
    </p>
  </div>
{:else if !hymnsState.loaded && (hymnsState.loading || searchState.hymnsSearching)}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="font-medium">Loading hymns…</p>
  </div>
{:else if !res}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="text-muted-foreground">Run a search or adjust filters to see hymn results.</p>
  </div>
{:else if res.overLimit}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="font-semibold text-amber-700">
      More than {RESULT_RENDER_LIMIT.toLocaleString()} matching verses.
    </p>
    <p class="text-muted-foreground mt-2">
      Narrow the search term to see results.
    </p>
  </div>
{:else if res.total === 0}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="text-muted-foreground">No hymn verses match your criteria.</p>
  </div>
{:else}
  <div class="mt-4 space-y-4" role="list" aria-label="Hymn results">
    {#each shown as hymnIdx (hymnIdx)}
      {@const verses = res.byHymn.get(hymnIdx)}
      {@const hymn = hymnsState.hymns[hymnIdx]}
      <Card class="p-4" role="listitem">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-primary truncate">
              <span class="text-muted-foreground font-normal mr-2">#{hymn.sn}</span>{hymn.t}
            </h3>
            {#if hymn.tp}
              <p class="text-xs text-muted-foreground italic mt-0.5">{hymn.tp}</p>
            {/if}
            {#if hymn.cr}
              <p class="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{hymn.cr}</p>
            {/if}
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <a
              href={hymn.u}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              title="Open hymn study page"
            >
              <ExternalLink class="h-4 w-4" />
              <span class="hidden sm:inline">Study</span>
            </a>
            <a
              href={hymn.mu}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              title="Open hymn music page (audio + sheet music)"
            >
              <Music class="h-4 w-4" />
              <span class="hidden sm:inline">Music</span>
            </a>
          </div>
        </div>

        <div class="space-y-2 pl-3 border-l-2 border-muted">
          {#each verses as hit (hit.marker || `${hit.kind}${hit.verseNumber}`)}
            <HymnVerseCard
              {hit}
              pattern={searchState.highlightPattern}
              useRegex={searchState.highlightUseRegex}
              caseSensitive={settings.caseSensitive}
            />
          {/each}
        </div>
      </Card>
    {/each}
  </div>

  {#if remaining > 0}
    <div class="mt-6 flex flex-col items-center gap-2">
      <p class="text-xs text-muted-foreground">
        Showing {shown.length} of {res.hymnOrder.length} hymns
        ({shownVerseCount} of {res.total} verses)
      </p>
      <div class="flex gap-2">
        <Button variant="outline" onclick={loadMore}>
          Load {Math.min(PAGE_SIZE, remaining)} more
        </Button>
        {#if remaining > PAGE_SIZE}
          <Button variant="ghost" onclick={loadAll}>
            Show all ({remaining} remaining)
          </Button>
        {/if}
      </div>
    </div>
  {/if}
{/if}
