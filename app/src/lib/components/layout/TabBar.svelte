<script>
  import { TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
  import { searchState } from '$lib/stores/search.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { RESULT_RENDER_LIMIT } from '$lib/constants/limits.js';

  const statsDisabled = $derived(
    !searchState.stats || searchState.overLimit || searchState.results.length === 0,
  );

  const countLabel = $derived(
    searchState.overLimit ? `>${RESULT_RENDER_LIMIT}` : String(searchState.results.length),
  );

  const conferenceCountLabel = $derived.by(() => {
    const c = searchState.conference;
    if (!c) return settings.conferenceEnabled ? '…' : '';
    if (c.overLimit) return `>${RESULT_RENDER_LIMIT}`;
    return String(c.total);
  });

  const hymnsCountLabel = $derived.by(() => {
    const h = searchState.hymns;
    if (!h) return settings.hymnsEnabled ? '…' : '';
    if (h.overLimit) return `>${RESULT_RENDER_LIMIT}`;
    return String(h.total);
  });
</script>

<TabsList class="grid grid-cols-4 max-w-2xl mx-auto">
  <TabsTrigger value="scriptures">Scriptures ({countLabel})</TabsTrigger>
  <TabsTrigger value="conference">
    Conference{conferenceCountLabel ? ` (${conferenceCountLabel})` : ''}
  </TabsTrigger>
  <TabsTrigger value="hymns">
    Hymns{hymnsCountLabel ? ` (${hymnsCountLabel})` : ''}
  </TabsTrigger>
  <TabsTrigger value="statistics" disabled={statsDisabled}>Statistics</TabsTrigger>
</TabsList>
