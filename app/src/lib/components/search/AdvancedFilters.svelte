<script>
  import { Collapsible, CollapsibleContent } from '$lib/components/ui/collapsible/index.js';
  import Input from '$lib/components/ui/input.svelte';
  import Checkbox from '$lib/components/ui/checkbox.svelte';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { searchState, run } from '$lib/stores/search.svelte.js';
  import { ui } from '$lib/stores/ui.svelte.js';
  import VolumeCheckboxes from './VolumeCheckboxes.svelte';
  import CFMFilter from './CFMFilter.svelte';

  const open = $derived(!ui.filtersCollapsed);

  function onEnter(e) {
    if (e.key === 'Enter') run();
  }

  const toggles = [
    { key: 'useRegex', label: 'Search using regex' },
    { key: 'caseSensitive', label: 'Case sensitive' },
    { key: 'columnsByVolume', label: 'Show volume columns' },
    { key: 'shuffleResults', label: 'Shuffle results' },
    { key: 'compactView', label: 'Compact view' },
    { key: 'singleColumn', label: 'Single column' },
  ];
</script>

<Collapsible {open}>
  <CollapsibleContent>
    <div class="mt-4 rounded-xl border bg-card p-6 space-y-6">
      <h3 class="text-lg font-semibold text-center">Filters &amp; View Options</h3>

      <div class="flex flex-col md:flex-row gap-6">
        <div class="flex-grow space-y-5">
          <h4 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filters</h4>

          <div class="space-y-1.5">
            <label for="verseTitleFilterInput" class="text-sm font-medium">
              Filter by Verse Title (Regex)
            </label>
            <Input
              id="verseTitleFilterInput"
              placeholder="e.g., ^John 3:1[6-7]$ or Alma 5"
              bind:value={searchState.verseTitleFilter}
              onkeydown={onEnter}
              aria-describedby={searchState.verseTitleError ? 'verseTitleError' : undefined}
            />
            {#if searchState.verseTitleError}
              <p id="verseTitleError" class="text-xs text-destructive">{searchState.verseTitleError}</p>
            {/if}
          </div>

          <CFMFilter />

          <div class="border-t pt-5">
            <VolumeCheckboxes />
          </div>
        </div>

        <div class="md:w-72 shrink-0 rounded-lg border bg-muted/30 p-4 space-y-3">
          <h4 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Advanced Options
          </h4>

          {#each toggles as t (t.key)}
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox bind:checked={settings[t.key]} />
              <span>{t.label}</span>
            </label>
          {/each}
        </div>
      </div>
    </div>
  </CollapsibleContent>
</Collapsible>
