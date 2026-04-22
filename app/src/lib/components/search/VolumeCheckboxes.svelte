<script>
  import Checkbox from '$lib/components/ui/checkbox.svelte';
  import { scripturesState } from '$lib/stores/scriptures.svelte.js';
  import { settings, toggleVolume, setAllVolumes } from '$lib/stores/settings.svelte.js';

  const allChecked = $derived(
    scripturesState.availableVolumes.length > 0 &&
      settings.selectedVolumes.length === scripturesState.availableVolumes.length,
  );
  const indeterminate = $derived(
    settings.selectedVolumes.length > 0 &&
      settings.selectedVolumes.length < scripturesState.availableVolumes.length,
  );

  function onAllChange(next) {
    setAllVolumes(scripturesState.availableVolumes, Boolean(next));
  }
</script>

<div>
  <p class="text-sm font-medium mb-2">Filter by Volume</p>
  <label class="flex items-center gap-2 mb-3 cursor-pointer">
    <Checkbox checked={allChecked} {indeterminate} onCheckedChange={onAllChange} />
    <span class="text-sm font-medium">All Volumes</span>
  </label>

  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
    {#each scripturesState.availableVolumes as volume (volume)}
      <label class="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox
          checked={settings.selectedVolumes.includes(volume)}
          onCheckedChange={() => toggleVolume(volume)}
        />
        <span class="truncate">{volume}</span>
      </label>
    {/each}
  </div>
</div>
