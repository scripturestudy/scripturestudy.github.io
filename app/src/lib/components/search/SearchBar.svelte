<script>
  import Input from '$lib/components/ui/input.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Settings2 from 'lucide-svelte/icons/settings-2';
  import { searchState, run } from '$lib/stores/search.svelte.js';
  import { ui, toggleFilters, setSeekMessage } from '$lib/stores/ui.svelte.js';
  import { getRandomSeekMessage } from '$lib/data/seek.js';

  let seekVisible = $state(false);
  let buttonLabel = $state('seek,');

  async function doSearch() {
    if (searchState.firstSearchPerformed) toggleFilters(true);

    const msg = await getRandomSeekMessage();
    if (msg) {
      setSeekMessage(msg);
      seekVisible = true;
      setTimeout(() => { seekVisible = false; setSeekMessage(''); }, 2000);
    }
    buttonLabel = 'and ye shall find';
    setTimeout(() => { buttonLabel = 'seek,'; }, 2000);

    await run();
  }

  function onKeydown(e) {
    if (e.key === 'Enter') doSearch();
  }
</script>

<div class="flex gap-2 items-start">
  <div class="flex-grow">
    <Input
      id="searchInput"
      placeholder="Enter phrase, keywords (AND/OR), or regex..."
      bind:value={searchState.term}
      onkeydown={onKeydown}
      aria-label="Search text"
      aria-describedby={searchState.termError ? 'searchInputError' : undefined}
      class="h-12 text-base"
    />
    {#if searchState.termError}
      <p id="searchInputError" class="text-xs text-destructive mt-1">{searchState.termError}</p>
    {/if}
  </div>

  <Button onclick={doSearch} size="lg" class="h-12 px-6">{buttonLabel}</Button>
  <Button
    variant="secondary"
    size="icon"
    class="h-12 w-12"
    onclick={() => toggleFilters()}
    title="Toggle filters"
    aria-label="Toggle filters"
  >
    <Settings2 class="h-5 w-5" />
  </Button>
</div>

<div
  class="text-xs text-muted-foreground mt-2 h-4 transition-opacity duration-300"
  class:opacity-0={!seekVisible}
  class:opacity-100={seekVisible}
  aria-live="polite"
>
  {ui.seekMessage}
</div>
