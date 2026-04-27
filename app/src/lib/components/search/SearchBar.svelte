<script>
  import Input from '$lib/components/ui/input.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Settings2 from 'lucide-svelte/icons/settings-2';
  import Eye from 'lucide-svelte/icons/eye';
  import Check from 'lucide-svelte/icons/check';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuSeparator,
  } from '$lib/components/ui/dropdown-menu/index.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { searchState, run } from '$lib/stores/search.svelte.js';
  import { ui, toggleFilters, setSeekMessage } from '$lib/stores/ui.svelte.js';
  import { getRandomSeekMessage } from '$lib/data/seek.js';

  const viewToggles = [
    { key: 'compactView', label: 'Compact view' },
    { key: 'columnsByVolume', label: 'Show volume columns' },
    { key: 'singleColumn', label: 'Single column' },
  ];

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
      placeholder='Phrase, "faith in" AND "hope in", or regex...'
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
  <DropdownMenu>
    <DropdownMenuTrigger
      class="inline-flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      title="View options"
      aria-label="View options"
    >
      <Eye class="h-5 w-5" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuGroup>
        <DropdownMenuLabel>View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {#each viewToggles as t (t.key)}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              settings[t.key] = !settings[t.key];
            }}
          >
            <span class="flex h-4 w-4 items-center justify-center">
              {#if settings[t.key]}<Check class="h-4 w-4" />{/if}
            </span>
            <span>{t.label}</span>
          </DropdownMenuItem>
        {/each}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</div>

<div
  class="text-xs text-muted-foreground mt-2 h-4 transition-opacity duration-300"
  class:opacity-0={!seekVisible}
  class:opacity-100={seekVisible}
  aria-live="polite"
>
  {ui.seekMessage}
</div>
