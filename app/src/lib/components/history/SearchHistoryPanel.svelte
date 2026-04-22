<script>
  import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '$lib/components/ui/sheet/index.js';
  import { ui, toggleHistory } from '$lib/stores/ui.svelte.js';
  import { history } from '$lib/stores/history.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { setTerm, setVerseTitleFilter, run } from '$lib/stores/search.svelte.js';

  async function applyEntry(entry) {
    setTerm(entry.term);
    setVerseTitleFilter(entry.verseTitleFilter);
    settings.useRegex = entry.useRegex;
    settings.caseSensitive = entry.caseSensitive;
    settings.columnsByVolume = entry.columnsByVolume;
    settings.shuffleResults = entry.shuffleResults;
    settings.selectedVolumes = entry.selectedVolumes.slice();
    toggleHistory(false);
    await run();
  }

  function onOpenChange(next) { toggleHistory(next); }
</script>

<Sheet open={ui.historyOpen} {onOpenChange}>
  <SheetContent side="left" class="w-full sm:max-w-md flex flex-col p-0">
    <SheetHeader>
      <SheetTitle>Search History</SheetTitle>
      <SheetDescription>Click any entry to re-apply it.</SheetDescription>
    </SheetHeader>
    <div class="flex-grow overflow-y-auto p-4">
      {#if history.entries.length === 0}
        <p class="text-sm italic text-muted-foreground">No searches yet.</p>
      {:else}
        <ul class="space-y-2">
          {#each history.entries as entry (entry.timestamp)}
            <li>
              <button
                type="button"
                class="block w-full text-left rounded-lg border bg-background p-3 transition-colors hover:bg-accent"
                onclick={() => applyEntry(entry)}
              >
                <div class="font-semibold text-sm">{entry.term || '(empty search)'}</div>
                <div class="text-xs text-muted-foreground mt-1">
                  {#if entry.verseTitleFilter}
                    <span>Title filter: {entry.verseTitleFilter}</span><br />
                  {/if}
                  Regex: {entry.useRegex ? '✓' : '—'} · Case: {entry.caseSensitive ? '✓' : '—'} · Volumes: {entry.selectedVolumes.length}
                </div>
                <div class="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </SheetContent>
</Sheet>
