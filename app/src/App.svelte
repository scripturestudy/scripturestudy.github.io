<script>
  import { onMount, onDestroy } from 'svelte';
  import { scripturesState, load } from '$lib/stores/scriptures.svelte.js';
  import { seedVolumes } from '$lib/stores/settings.svelte.js';
  import { searchState, run } from '$lib/stores/search.svelte.js';
  import { RESULT_RENDER_LIMIT } from '$lib/constants/limits.js';
  import { initPersistence } from '$lib/stores/persist-all.svelte.js';
  import { readHashIntoState } from '$lib/stores/urlSync.js';
  import { installShortcuts } from '$lib/stores/shortcuts.js';

  import { Tabs, TabsContent } from '$lib/components/ui/tabs/index.js';
  import Alert from '$lib/components/ui/alert.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import AlertTriangle from 'lucide-svelte/icons/triangle-alert';
  import Clipboard from 'lucide-svelte/icons/clipboard-copy';
  import { resultsToMarkdown } from '$lib/utils/export.js';

  import SearchBar from '$lib/components/search/SearchBar.svelte';
  import SemanticSearchBar from '$lib/components/search/SemanticSearchBar.svelte';
  import AdvancedFilters from '$lib/components/search/AdvancedFilters.svelte';
  import TabBar from '$lib/components/layout/TabBar.svelte';
  import ResultsView from '$lib/components/results/ResultsView.svelte';
  import StatsPanel from '$lib/components/stats/StatsPanel.svelte';

  import FloatingButtons from '$lib/components/layout/FloatingButtons.svelte';
  import JournalPanel from '$lib/components/journal/JournalPanel.svelte';
  import SearchHistoryPanel from '$lib/components/history/SearchHistoryPanel.svelte';

  import NoteModal from '$lib/components/modals/NoteModal.svelte';
  import ContextDrawer from '$lib/components/modals/ContextDrawer.svelte';
  import SearchHelpModal from '$lib/components/modals/SearchHelpModal.svelte';
  import StatsHelpModal from '$lib/components/modals/StatsHelpModal.svelte';
  import StopWordsModal from '$lib/components/modals/StopWordsModal.svelte';

  // Persistence effects must run in a Svelte context.
  initPersistence();
  const teardownShortcuts = installShortcuts();
  onDestroy(teardownShortcuts);

  onMount(async () => {
    await load();
    seedVolumes(scripturesState.availableVolumes);
    // Apply any shareable URL hash (seeds selectedVolumes after volumes load).
    const fromHash = readHashIntoState();
    if (fromHash && searchState.term.trim()) {
      await run();
    }
  });

  const countLabel = $derived(
    searchState.overLimit
      ? `>${RESULT_RENDER_LIMIT}`
      : String(searchState.results.length),
  );

  let exportLabel = $state('Export');
  async function exportResults() {
    if (!searchState.results.length) return;
    try {
      await navigator.clipboard.writeText(resultsToMarkdown(searchState.results));
      exportLabel = 'Copied!';
      setTimeout(() => (exportLabel = 'Export'), 1500);
    } catch {
      exportLabel = 'Failed';
      setTimeout(() => (exportLabel = 'Export'), 1500);
    }
  }
</script>

<main class="container max-w-6xl mx-auto px-4 py-8">
  <header class="text-center mb-8">
    <h1 class="text-4xl font-bold tracking-tight">Scripture Study</h1>
    <p class="text-muted-foreground mt-1">Search, find, journal, write, repeat.</p>
  </header>

  <section class="max-w-4xl mx-auto mb-8">
    <SearchBar />
    <SemanticSearchBar />
    <AdvancedFilters />
  </section>

  {#if scripturesState.usedFallback}
    <Alert variant="warning" class="max-w-4xl mx-auto mb-4">
      <AlertTriangle class="h-4 w-4" />
      <div>
        <p class="font-medium">Using limited fallback data.</p>
        <p class="text-xs mt-1">Could not load the full scripture dataset.</p>
      </div>
    </Alert>
  {/if}

  <div class="max-w-4xl mx-auto mb-4 flex items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-semibold">Results ({countLabel})</h2>
      <p class="text-sm text-muted-foreground mt-1" aria-live="polite">{searchState.status}</p>
    </div>
    {#if searchState.results.length > 0}
      <Button variant="outline" size="sm" onclick={exportResults}>
        <Clipboard class="h-4 w-4" />
        {exportLabel}
      </Button>
    {/if}
  </div>

  <Tabs value={searchState.activeTab} onValueChange={(v) => (searchState.activeTab = v)}>
    <TabBar />

    <TabsContent value="scriptures" class="mt-4">
      <ResultsView />
    </TabsContent>
    <TabsContent value="statistics" class="mt-4">
      <StatsPanel />
    </TabsContent>
  </Tabs>
</main>

<FloatingButtons />
<JournalPanel />
<SearchHistoryPanel />

<NoteModal />
<ContextDrawer />
<SearchHelpModal />
<StatsHelpModal />
<StopWordsModal />
