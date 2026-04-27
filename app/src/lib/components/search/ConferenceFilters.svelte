<script>
  import { Collapsible, CollapsibleContent } from '$lib/components/ui/collapsible/index.js';
  import Input from '$lib/components/ui/input.svelte';
  import Checkbox from '$lib/components/ui/checkbox.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import X from 'lucide-svelte/icons/x';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { conferenceState } from '$lib/stores/conference.svelte.js';
  import { runConference } from '$lib/stores/search.svelte.js';
  import { ui } from '$lib/stores/ui.svelte.js';
  import { cn } from '$lib/utils/cn.js';
  import { CALLING_GROUPS } from '$lib/constants/callings.js';

  const open = $derived(!ui.filtersCollapsed);

  const selectClass = cn(
    'flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  );

  function onSortChange(e) {
    settings.conferenceSortMode = e.currentTarget.value;
    runConference();
  }

  let speakerFilter = $state('');

  // Capped list shown in the scrollable panel. ~2000 speakers total; rendering
  // them all is fine but the typed filter trims the visual noise.
  const filteredSpeakers = $derived.by(() => {
    const q = speakerFilter.trim().toLowerCase();
    const all = conferenceState.speakers;
    if (!q) return all;
    return all.filter((s) => s.toLowerCase().includes(q));
  });

  const yearMin = $derived(conferenceState.minYear || 1971);
  const yearMax = $derived(conferenceState.maxYear || new Date().getFullYear());

  function toggleSpeaker(name) {
    if (settings.conferenceSelectedSpeakers.includes(name)) {
      settings.conferenceSelectedSpeakers = settings.conferenceSelectedSpeakers.filter(
        (s) => s !== name,
      );
    } else {
      settings.conferenceSelectedSpeakers = [...settings.conferenceSelectedSpeakers, name];
    }
    runConference();
  }

  function clearSpeakers() {
    settings.conferenceSelectedSpeakers = [];
    runConference();
  }

  function toggleCalling(id) {
    if (settings.conferenceSelectedCallings.includes(id)) {
      settings.conferenceSelectedCallings = settings.conferenceSelectedCallings.filter(
        (c) => c !== id,
      );
    } else {
      settings.conferenceSelectedCallings = [...settings.conferenceSelectedCallings, id];
    }
    runConference();
  }

  function clearCallings() {
    settings.conferenceSelectedCallings = [];
    runConference();
  }

  // Commit on blur / Enter so in-progress typing (e.g. "2" on the way to
  // "2000") doesn't get clamped to yearMin mid-edit.
  function commitYearFrom(e) {
    const v = Number(e.target.value);
    if (Number.isFinite(v) && v > 0) {
      settings.conferenceYearFrom = Math.max(yearMin, Math.min(settings.conferenceYearTo, v));
      runConference();
    }
    e.target.value = settings.conferenceYearFrom;
  }
  function commitYearTo(e) {
    const v = Number(e.target.value);
    if (Number.isFinite(v) && v > 0) {
      settings.conferenceYearTo = Math.min(yearMax, Math.max(settings.conferenceYearFrom, v));
      runConference();
    }
    e.target.value = settings.conferenceYearTo;
  }
  function onYearKeydown(e) {
    if (e.key === 'Enter') e.currentTarget.blur();
  }

  function toggleApril(next) {
    settings.conferenceIncludeApril = Boolean(next);
    runConference();
  }
  function toggleOctober(next) {
    settings.conferenceIncludeOctober = Boolean(next);
    runConference();
  }
</script>

<Collapsible {open}>
  <CollapsibleContent>
<div class="rounded-xl border bg-card p-4 sm:p-6 space-y-5">
  <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
    Conference Filters
  </h3>

  <div class="flex flex-wrap items-end gap-4">
    <div class="space-y-1.5">
      <label class="text-sm font-medium" for="conferenceYearFrom">From year</label>
      <Input
        id="conferenceYearFrom"
        type="number"
        min={yearMin}
        max={yearMax}
        value={settings.conferenceYearFrom}
        onchange={commitYearFrom}
        onkeydown={onYearKeydown}
        class="w-24"
      />
    </div>
    <div class="space-y-1.5">
      <label class="text-sm font-medium" for="conferenceYearTo">To year</label>
      <Input
        id="conferenceYearTo"
        type="number"
        min={yearMin}
        max={yearMax}
        value={settings.conferenceYearTo}
        onchange={commitYearTo}
        onkeydown={onYearKeydown}
        class="w-24"
      />
    </div>

    <div class="flex flex-col gap-1">
      <span class="text-sm font-medium">Sessions</span>
      <div class="flex gap-4">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={settings.conferenceIncludeApril}
            onCheckedChange={toggleApril}
          />
          <span>April</span>
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={settings.conferenceIncludeOctober}
            onCheckedChange={toggleOctober}
          />
          <span>October</span>
        </label>
      </div>
    </div>

    <div class="space-y-1.5">
      <label class="text-sm font-medium" for="conferenceSortMode">Sort</label>
      <select
        id="conferenceSortMode"
        class={cn(selectClass, 'w-40')}
        value={settings.conferenceSortMode}
        onchange={onSortChange}
      >
        <option value="year-desc">Newest first</option>
        <option value="year-asc">Oldest first</option>
        <option value="shuffle">Shuffle</option>
      </select>
    </div>
  </div>

  <div>
    <div class="flex items-center justify-between mb-2">
      <p class="text-sm font-medium">
        Callings
        {#if settings.conferenceSelectedCallings.length}
          <span class="text-xs text-muted-foreground">
            ({settings.conferenceSelectedCallings.length} selected)
          </span>
        {:else}
          <span class="text-xs text-muted-foreground">(all)</span>
        {/if}
      </p>
      {#if settings.conferenceSelectedCallings.length}
        <Button variant="ghost" size="sm" onclick={clearCallings}>Clear</Button>
      {/if}
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
      {#each CALLING_GROUPS as g (g.id)}
        <label class="flex items-center gap-2 text-sm cursor-pointer truncate">
          <Checkbox
            checked={settings.conferenceSelectedCallings.includes(g.id)}
            onCheckedChange={() => toggleCalling(g.id)}
          />
          <span class="truncate" title={g.label}>{g.label}</span>
        </label>
      {/each}
    </div>
  </div>

  <div>
    <div class="flex items-center justify-between mb-2">
      <p class="text-sm font-medium">
        Speakers
        {#if settings.conferenceSelectedSpeakers.length}
          <span class="text-xs text-muted-foreground">
            ({settings.conferenceSelectedSpeakers.length} selected)
          </span>
        {:else}
          <span class="text-xs text-muted-foreground">(all)</span>
        {/if}
      </p>
      {#if settings.conferenceSelectedSpeakers.length}
        <Button variant="ghost" size="sm" onclick={clearSpeakers}>Clear</Button>
      {/if}
    </div>

    {#if settings.conferenceSelectedSpeakers.length}
      <div class="flex flex-wrap gap-1.5 mb-2">
        {#each settings.conferenceSelectedSpeakers as s (s)}
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary hover:bg-primary/20"
            onclick={() => toggleSpeaker(s)}
            title="Remove {s}"
          >
            {s}
            <X class="h-3 w-3" />
          </button>
        {/each}
      </div>
    {/if}

    <Input
      placeholder="Search speakers…"
      bind:value={speakerFilter}
    />

    {#if speakerFilter.trim()}
      <div class="mt-2 max-h-48 overflow-y-auto rounded-md border bg-background p-2">
        {#if filteredSpeakers.length === 0}
          <p class="text-sm text-muted-foreground p-2">No speakers match.</p>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {#each filteredSpeakers.slice(0, 200) as name (name)}
              <label class="flex items-center gap-2 text-sm cursor-pointer truncate">
                <Checkbox
                  checked={settings.conferenceSelectedSpeakers.includes(name)}
                  onCheckedChange={() => toggleSpeaker(name)}
                />
                <span class="truncate" title={name}>{name}</span>
              </label>
            {/each}
          </div>
          {#if filteredSpeakers.length > 200}
            <p class="text-xs text-muted-foreground mt-2">
              Showing first 200 of {filteredSpeakers.length}. Keep typing to narrow.
            </p>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
</div>
  </CollapsibleContent>
</Collapsible>
