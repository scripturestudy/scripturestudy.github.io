<script>
  import { TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
  import { searchState } from '$lib/stores/search.svelte.js';
  import { RESULT_RENDER_LIMIT } from '$lib/constants/limits.js';

  const statsDisabled = $derived(
    !searchState.stats || searchState.overLimit || searchState.results.length === 0,
  );

  const countLabel = $derived(
    searchState.overLimit ? `>${RESULT_RENDER_LIMIT}` : String(searchState.results.length),
  );
</script>

<TabsList class="grid grid-cols-2 max-w-sm mx-auto">
  <TabsTrigger value="scriptures">Scriptures ({countLabel})</TabsTrigger>
  <TabsTrigger value="statistics" disabled={statsDisabled}>Statistics</TabsTrigger>
</TabsList>
