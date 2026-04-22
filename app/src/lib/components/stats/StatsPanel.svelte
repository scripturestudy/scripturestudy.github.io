<script>
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card/index.js';
  import Checkbox from '$lib/components/ui/checkbox.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Info from 'lucide-svelte/icons/info';
  import { searchState, recomputeStats } from '$lib/stores/search.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { openModal } from '$lib/stores/ui.svelte.js';
  import NGramTabs from './NGramTabs.svelte';
  import VolumeChart from './VolumeChart.svelte';
  import WordFormsBreakdown from './WordFormsBreakdown.svelte';

  function onExcludeStopWordsChange(next) {
    settings.excludeStopWords = Boolean(next);
    recomputeStats();
  }
</script>

<Card class="max-w-4xl mx-auto">
  <CardHeader class="flex flex-row items-start justify-between">
    <div>
      <CardTitle>Search Statistics</CardTitle>
      <CardDescription>Word frequency, n-gram analysis, and per-volume distribution.</CardDescription>
    </div>
    <Button variant="ghost" size="sm" onclick={() => openModal('stats-help')}>
      <Info class="h-4 w-4" />
      Explain
    </Button>
  </CardHeader>
  <CardContent class="space-y-6">
    {#if searchState.stats}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div class="space-y-4">
          <p>
            <span class="text-sm text-muted-foreground">Total unique scriptures matched</span><br />
            <span class="text-3xl font-semibold">{searchState.stats.totalMatched}</span>
          </p>
          <WordFormsBreakdown wordForms={searchState.stats.wordForms} />
        </div>
        <div>
          <h4 class="text-sm font-medium mb-2 text-muted-foreground">Matches per Volume</h4>
          <VolumeChart data={searchState.stats.perVolume} />
        </div>
      </div>

      <div class="border-t pt-6">
        <h4 class="text-base font-semibold mb-1">N-gram Analysis (Top 100)</h4>
        <p class="text-xs text-muted-foreground mb-3">
          Click column headers to sort. Click a 1-gram word to search for it.
        </p>
        <div class="flex items-center gap-4 mb-4 text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={settings.excludeStopWords}
              onCheckedChange={onExcludeStopWordsChange}
            />
            <span>Exclude Stop Words</span>
          </label>
          <Button variant="link" size="sm" onclick={() => openModal('stop-words')}>
            Show stop words
          </Button>
        </div>
        <NGramTabs ngrams={searchState.stats.ngrams} />
      </div>
    {:else}
      <p class="text-muted-foreground italic text-center py-6">
        Perform a search to see statistics.
      </p>
    {/if}

    {#if searchState.statsError}
      <div class="text-destructive text-sm">{searchState.statsError}</div>
    {/if}
  </CardContent>
</Card>
