<script>
  import { Card } from '$lib/components/ui/card/index.js';
  import Button from '$lib/components/ui/button.svelte';
  import ExternalLink from 'lucide-svelte/icons/external-link';
  import { searchState } from '$lib/stores/search.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { conferenceState } from '$lib/stores/conference.svelte.js';
  import { RESULT_RENDER_LIMIT } from '$lib/constants/limits.js';
  import ConferenceParagraphCard from './ConferenceParagraphCard.svelte';

  const PAGE_SIZE = 50;

  const conf = $derived(searchState.conference);

  // Reset the visible window whenever the result set changes (new search,
  // filter tweak). Reactive to `conf` identity since runConference() always
  // assigns a fresh object.
  let visibleTalks = $state(PAGE_SIZE);
  $effect(() => {
    conf; // dependency
    visibleTalks = PAGE_SIZE;
  });

  const shown = $derived(conf ? conf.talkOrder.slice(0, visibleTalks) : []);
  const remaining = $derived(conf ? Math.max(0, conf.talkOrder.length - visibleTalks) : 0);
  const shownParagraphCount = $derived.by(() => {
    if (!conf) return 0;
    let n = 0;
    for (const idx of shown) n += conf.byTalk.get(idx)?.length || 0;
    return n;
  });

  function loadMore() {
    visibleTalks = Math.min(conf.talkOrder.length, visibleTalks + PAGE_SIZE);
  }

  function loadAll() {
    visibleTalks = conf.talkOrder.length;
  }

  function talkUrl(talk) {
    return talk?.u ?? '#';
  }

  function monthLabel(m) {
    return m === 4 ? 'April' : m === 10 ? 'October' : String(m);
  }
</script>

{#if conferenceState.error || searchState.conferenceError}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
    <p class="font-semibold text-destructive">Could not load conference data.</p>
    <p class="text-sm text-muted-foreground mt-1">
      {conferenceState.error || searchState.conferenceError}
    </p>
  </div>
{:else if !conferenceState.loaded && (conferenceState.loading || searchState.conferenceSearching)}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="font-medium">Loading conference talks…</p>
    <p class="text-sm text-muted-foreground mt-1">
      First-time fetch is large (~16 MB). The browser will cache it for next time.
    </p>
  </div>
{:else if !conf}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="text-muted-foreground">Run a search or adjust filters to see conference results.</p>
  </div>
{:else if conf.overLimit}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="font-semibold text-amber-700">
      More than {RESULT_RENDER_LIMIT.toLocaleString()} matching paragraphs.
    </p>
    <p class="text-muted-foreground mt-2">
      Narrow the search term, year range, or speakers to see results.
    </p>
  </div>
{:else if conf.total === 0}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="text-muted-foreground">No conference paragraphs match your criteria.</p>
  </div>
{:else}
  <div class="mt-4 space-y-4" role="list" aria-label="Conference results">
    {#each shown as talkIdx (talkIdx)}
      {@const paragraphs = conf.byTalk.get(talkIdx)}
      {@const talk = conferenceState.talks[talkIdx]}
      <Card class="p-4" role="listitem">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-primary truncate">
              {talk.t}
            </h3>
            <p class="text-sm text-muted-foreground truncate">
              <span class="font-medium">{talk.sp}</span>
              {#if talk.r}
                <span class="hidden sm:inline"> — {talk.r}</span>
              {/if}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              {monthLabel(talk.m)} {talk.y} · {talk.s}
            </p>
          </div>
          <a
            href={talkUrl(talk)}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
            title="Read full talk on churchofjesuschrist.org"
          >
            <ExternalLink class="h-4 w-4" />
            <span class="hidden sm:inline">Open</span>
          </a>
        </div>

        <div class="space-y-2 pl-3 border-l-2 border-muted">
          {#each paragraphs as hit (hit.paraId || hit.text)}
            <ConferenceParagraphCard
              {hit}
              {talk}
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
        Showing {shown.length} of {conf.talkOrder.length} talks
        ({shownParagraphCount} of {conf.total} paragraphs)
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
