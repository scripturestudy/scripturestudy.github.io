<script>
  import { onMount, onDestroy } from 'svelte';
  import { scripturesState, load } from '$lib/stores/scriptures.svelte.js';
  import { seedVolumes, settings } from '$lib/stores/settings.svelte.js';
  import { searchState, run, enableConference, enableHymns } from '$lib/stores/search.svelte.js';
  import { conferenceState } from '$lib/stores/conference.svelte.js';
  import { hymnsState } from '$lib/stores/hymns.svelte.js';
  import { RESULT_RENDER_LIMIT } from '$lib/constants/limits.js';
  import { initPersistence } from '$lib/stores/persist-all.svelte.js';
  import { readHashIntoState } from '$lib/stores/urlSync.js';
  import { installShortcuts } from '$lib/stores/shortcuts.js';

  import { Tabs, TabsContent } from '$lib/components/ui/tabs/index.js';
  import Alert from '$lib/components/ui/alert.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import AlertTriangle from 'lucide-svelte/icons/triangle-alert';
  import Clipboard from 'lucide-svelte/icons/clipboard-copy';
  import BookPlus from 'lucide-svelte/icons/book-plus';
  import { resultsToMarkdown } from '$lib/utils/export.js';
  import { appendEntry } from '$lib/stores/journal.svelte.js';

  import SearchBar from '$lib/components/search/SearchBar.svelte';
  import SemanticSearchBar from '$lib/components/search/SemanticSearchBar.svelte';
  import AdvancedFilters from '$lib/components/search/AdvancedFilters.svelte';
  import TabBar from '$lib/components/layout/TabBar.svelte';
  import ResultsView from '$lib/components/results/ResultsView.svelte';
  import ConferenceResults from '$lib/components/results/ConferenceResults.svelte';
  import ConferenceFilters from '$lib/components/search/ConferenceFilters.svelte';
  import ConferenceTrendPanel from '$lib/components/stats/ConferenceTrendPanel.svelte';
  import HymnsResults from '$lib/components/results/HymnsResults.svelte';
  import HymnsFilters from '$lib/components/search/HymnsFilters.svelte';
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

  // Covers the case where the user lands directly on the Conference/Hymns tab —
  // `onValueChange` doesn't fire on the initial mount, so the bundle would
  // never load. Runs once on mount; further tab changes go through
  // `onValueChange` below.
  $effect(() => {
    if (searchState.activeTab === 'conference' && !conferenceState.loaded && !conferenceState.loading) {
      enableConference();
    }
    if (searchState.activeTab === 'hymns' && !hymnsState.loaded && !hymnsState.loading) {
      enableHymns();
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

  let addAllLabel = $state('Add all to Journal');
  function addAllToJournal() {
    const results = searchState.results;
    if (!results.length) return;
    if (
      results.length > 20 &&
      !window.confirm(
        `Add all ${results.length} results to your journal? This may produce a long list.`,
      )
    ) {
      return;
    }
    for (const verse of results) {
      appendEntry({
        verseTitle: verse?.verse_title ?? '',
        scriptureText: verse?.scripture_text ?? '',
      });
    }
    addAllLabel = `Added ${results.length}`;
    setTimeout(() => (addAllLabel = 'Add all to Journal'), 1500);
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
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" onclick={addAllToJournal}>
          <BookPlus class="h-4 w-4" />
          {addAllLabel}
        </Button>
        <Button variant="outline" size="sm" onclick={exportResults}>
          <Clipboard class="h-4 w-4" />
          {exportLabel}
        </Button>
      </div>
    {/if}
  </div>

  <Tabs
    value={searchState.activeTab}
    onValueChange={(v) => {
      searchState.activeTab = v;
      // Ensure the bundle is loaded whenever the conference/hymns tab is opened —
      // also covers returning users whose enabled flag was persisted but
      // whose in-memory store is fresh.
      if (v === 'conference' && (!settings.conferenceEnabled || !conferenceState.loaded)) {
        enableConference();
      }
      if (v === 'hymns' && (!settings.hymnsEnabled || !hymnsState.loaded)) {
        enableHymns();
      }
    }}
  >
    <TabBar />

    <TabsContent value="scriptures" class="mt-4">
      <div class="max-w-4xl mx-auto mb-4">
        <AdvancedFilters />
      </div>
      <ResultsView />
    </TabsContent>
    <TabsContent value="conference" class="mt-4">
      {#if conferenceState.loaded || conferenceState.loading}
        <div class="max-w-5xl mx-auto mb-4 space-y-4">
          <ConferenceFilters />
          {#if conferenceState.loaded}
            <ConferenceTrendPanel />
          {/if}
        </div>
      {/if}
      <div class="max-w-5xl mx-auto">
        <ConferenceResults />
      </div>
    </TabsContent>
    <TabsContent value="hymns" class="mt-4">
      {#if hymnsState.loaded || hymnsState.loading}
        <div class="max-w-5xl mx-auto mb-4">
          <HymnsFilters />
        </div>
      {/if}
      <div class="max-w-5xl mx-auto">
        <HymnsResults />
      </div>
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
