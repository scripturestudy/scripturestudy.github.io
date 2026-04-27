<script>
  import { Collapsible, CollapsibleContent } from '$lib/components/ui/collapsible/index.js';
  import Checkbox from '$lib/components/ui/checkbox.svelte';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { runHymns } from '$lib/stores/search.svelte.js';
  import { ui } from '$lib/stores/ui.svelte.js';
  import { cn } from '$lib/utils/cn.js';

  const open = $derived(!ui.filtersCollapsed);

  const selectClass = cn(
    'flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  );

  function onSortChange(e) {
    settings.hymnsSortMode = e.currentTarget.value;
    runHymns();
  }

  function toggleChoruses(next) {
    settings.hymnsIncludeChoruses = Boolean(next);
    runHymns();
  }
</script>

<Collapsible {open}>
  <CollapsibleContent>
<div class="rounded-xl border bg-card p-4 sm:p-6 space-y-5">
  <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
    Hymn Filters
  </h3>

  <div class="flex flex-wrap items-end gap-4">
    <div class="space-y-1.5">
      <label class="text-sm font-medium" for="hymnsSortMode">Sort</label>
      <select
        id="hymnsSortMode"
        class={cn(selectClass, 'w-44')}
        value={settings.hymnsSortMode}
        onchange={onSortChange}
      >
        <option value="number-asc">By number (1 → 341)</option>
        <option value="number-desc">By number (341 → 1)</option>
        <option value="title-asc">By title (A → Z)</option>
        <option value="shuffle">Shuffle</option>
      </select>
    </div>

    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <Checkbox
        checked={settings.hymnsIncludeChoruses}
        onCheckedChange={toggleChoruses}
      />
      <span>Include choruses</span>
    </label>
  </div>
</div>
  </CollapsibleContent>
</Collapsible>
