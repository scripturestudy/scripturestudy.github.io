<script>
  import { onMount } from 'svelte';
  import Switch from '$lib/components/ui/switch.svelte';
  import Slider from '$lib/components/ui/slider.svelte';
  import { settings } from '$lib/stores/settings.svelte.js';
  import * as semantic from '$lib/search/semantic.js';

  let status = $state('');

  // Bits-ui Slider takes a Value array; mirror it to settings.semanticAlpha (0..1).
  let sliderValue = $state([settings.semanticAlpha * 100]);
  $effect(() => {
    settings.semanticAlpha = (sliderValue[0] ?? 50) / 100;
  });

  onMount(() => semantic.onStatus((msg) => { status = msg; }));

  async function onCheckedChange(next) {
    settings.semanticEnabled = next;
    if (!next) { status = ''; return; }
    try {
      await semantic.init();
    } catch (err) {
      status = `Semantic init failed: ${err.message}`;
      settings.semanticEnabled = false;
    }
  }

  const percentLabel = $derived(`${Math.round(settings.semanticAlpha * 100)}% semantic`);
</script>

<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
  <label class="inline-flex items-center gap-2 cursor-pointer select-none">
    <Switch checked={settings.semanticEnabled} onCheckedChange={onCheckedChange} />
    <span class="font-medium">Semantic search</span>
    <span class="text-xs text-muted-foreground">
      (downloads ~150 MB model + ~11 MB index on first use)
    </span>
  </label>

  {#if settings.semanticEnabled}
    <div class="flex-grow min-w-[240px] max-w-md">
      <div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>Keyword</span>
        <span>{percentLabel}</span>
        <span>Semantic</span>
      </div>
      <Slider bind:value={sliderValue} min={0} max={100} step={5} />
    </div>
  {/if}

  {#if status}
    <div class="text-xs text-muted-foreground w-full md:w-auto" aria-live="polite">{status}</div>
  {/if}
</div>
