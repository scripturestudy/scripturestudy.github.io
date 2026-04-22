<script>
  import { searchState } from '$lib/stores/search.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { scripturesState } from '$lib/stores/scriptures.svelte.js';
  import { RESULT_RENDER_LIMIT } from '$lib/constants/limits.js';
  import Skeleton from '$lib/components/ui/skeleton.svelte';
  import ResultCard from './ResultCard.svelte';
  import VolumeColumns from './VolumeColumns.svelte';

  const columnStyle = $derived(
    settings.singleColumn ? '--results-columns: 1;' : '--results-columns: 4;',
  );

  const empty = $derived(
    searchState.results.length === 0 && searchState.firstSearchPerformed && !searchState.overLimit,
  );
</script>

{#if scripturesState.loading && !searchState.results.length}
  <div class="max-w-4xl mx-auto mt-4 space-y-3">
    {#each Array(5) as _, i (i)}
      <Skeleton class="h-20 w-full rounded-xl" />
    {/each}
  </div>
{:else if searchState.overLimit}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="font-semibold text-amber-700">
      Search returned more than {RESULT_RENDER_LIMIT.toLocaleString()} results.
    </p>
    <p class="text-muted-foreground mt-2">
      Please refine your search terms or filters to narrow down the results.
    </p>
  </div>
{:else if empty}
  <div class="mt-4 max-w-2xl mx-auto rounded-xl border bg-card p-8 text-center">
    <p class="text-muted-foreground">No matches found for your criteria.</p>
  </div>
{:else if searchState.results.length > 0}
  <div
    role="list"
    aria-label="Search results"
    style={columnStyle}
    class={settings.columnsByVolume ? 'results-flex' : 'results-grid'}
  >
    {#if settings.columnsByVolume}
      <VolumeColumns
        results={searchState.results}
        pattern={searchState.term}
        useRegex={settings.useRegex}
        caseSensitive={settings.caseSensitive}
      />
    {:else}
      {#each searchState.results as verse (verse.__idx)}
        <div role="listitem">
          <ResultCard
            {verse}
            pattern={searchState.term}
            useRegex={settings.useRegex}
            caseSensitive={settings.caseSensitive}
          />
        </div>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .results-grid {
    display: grid;
    grid-template-columns: repeat(var(--results-columns, 1), minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
    max-width: 100%;
  }

  @media (max-width: 768px) {
    .results-grid {
      grid-template-columns: 1fr;
    }
  }

  .results-flex {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 0.5rem;
  }
</style>
