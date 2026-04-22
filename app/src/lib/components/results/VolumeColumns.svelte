<script>
  import { HARDCODED_VOLUME_ORDER } from '$lib/constants/volumes.js';
  import ResultCard from './ResultCard.svelte';

  let { results = [], pattern = '', useRegex = false, caseSensitive = false } = $props();

  const columns = $derived.by(() => {
    const by = new Map();
    for (const v of results) {
      const volume = v?.volume_title;
      if (!volume) continue;
      if (!by.has(volume)) by.set(volume, []);
      by.get(volume).push(v);
    }
    const ordered = [];
    for (const name of HARDCODED_VOLUME_ORDER) {
      if (by.has(name)) {
        ordered.push({ name, verses: by.get(name) });
        by.delete(name);
      }
    }
    for (const name of Array.from(by.keys()).sort()) {
      ordered.push({ name, verses: by.get(name) });
    }
    return ordered;
  });
</script>

{#snippet card(verse)}
  <div role="listitem">
    <ResultCard {verse} {pattern} {useRegex} {caseSensitive} />
  </div>
{/snippet}

{#each columns as col (col.name)}
  <div class="volume-column">
    <div class="volume-column-header">
      <h3 class="text-sm font-semibold">{col.name}</h3>
      <div class="caption">
        {col.verses.length} scripture{col.verses.length !== 1 ? 's' : ''}
      </div>
    </div>
    <div class="volume-column-content">
      {#each col.verses as verse (verse.__idx)}
        {@render card(verse)}
      {/each}
    </div>
  </div>
{/each}

<style>
  .volume-column {
    flex: 0 0 min(80vw, 320px);
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    background-color: hsl(220 14% 96% / 0.4);
    border: 1px solid hsl(220 13% 91%);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .volume-column-header {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 0.5rem 0.75rem;
    background-color: hsl(0 0% 100%);
    border-bottom: 1px solid hsl(220 13% 91%);
  }

  .volume-column-content {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
