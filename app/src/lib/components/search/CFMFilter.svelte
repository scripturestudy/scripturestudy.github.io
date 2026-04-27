<script>
  import { onMount } from 'svelte';
  import Checkbox from '$lib/components/ui/checkbox.svelte';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { setVerseTitleFilter, run } from '$lib/stores/search.svelte.js';
  import { loadCFMSchedule, formatDateRange, currentWeekIndex } from '$lib/data/cfm.js';
  import { cn } from '$lib/utils/cn.js';

  let schedule = $state(null);
  let loadError = $state(null);

  onMount(async () => {
    const data = await loadCFMSchedule();
    if (!data) { loadError = 'Failed to load schedule'; return; }
    schedule = data;
    if (settings.cfmWeekIndex < 0) {
      const idx = currentWeekIndex(data);
      settings.cfmWeekIndex = idx >= 0 ? idx : 0;
    }
  });

  async function applyCFM() {
    if (!schedule || settings.cfmWeekIndex < 0) return;
    // Defaults tuned for a "reading" experience — let the layout react via $derived.
    settings.scriptureSortMode = 'canonical';
    settings.columnsByVolume = false;
    settings.singleColumn = true;

    const week = schedule[settings.cfmWeekIndex];
    if (!week) return;
    let vt = week.verse_title;
    if (!vt.startsWith('^')) vt = '^' + vt;
    setVerseTitleFilter(vt);
    await run();
  }

  function onCheckedChange(next) {
    settings.cfmEnabled = Boolean(next);
    if (settings.cfmEnabled) applyCFM();
    else settings.singleColumn = false;
  }

  function onSelectChange(e) {
    settings.cfmWeekIndex = parseInt(e.currentTarget.value, 10);
    if (settings.cfmEnabled) applyCFM();
  }

  const selectClass = cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
  );
</script>

<div class="space-y-2">
  <p class="text-sm font-medium">Come Follow Me</p>
  <label class="flex items-center gap-2 cursor-pointer">
    <Checkbox checked={settings.cfmEnabled} onCheckedChange={onCheckedChange} disabled={!schedule} />
    <span class="text-sm">Filter by Come Follow Me reading</span>
  </label>
  <select
    class={selectClass}
    disabled={!schedule || !settings.cfmEnabled}
    value={settings.cfmWeekIndex}
    onchange={onSelectChange}
  >
    {#if !schedule}
      <option value="-1">{loadError ?? 'Loading...'}</option>
    {:else}
      {#each schedule as week, i}
        <option value={i}>
          {formatDateRange(week.start_date, week.end_date)}: {week.verse_title.replace(/\[|\]/g, '')}
        </option>
      {/each}
    {/if}
  </select>
</div>
