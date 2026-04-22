<script>
  import * as d3 from 'd3';
  import cloud from 'd3-cloud';
  import { WORD_CLOUD_LIMIT } from '$lib/constants/limits.js';
  import { setTerm, run } from '$lib/stores/search.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';

  let { items = [], ngramSize = 1 } = $props();

  const typeName = $derived(
    ngramSize === 1 ? 'word' : ngramSize === 2 ? 'phrase' : ngramSize === 3 ? 'triplet' : 'quartet',
  );

  function draw(container) {
    const rows = items;
    const n = ngramSize;
    container.innerHTML = '';
    if (!rows.length) return;

    const containerWidth = container.clientWidth > 0 ? container.clientWidth : 300;
    const containerHeight = 250;
    const baseMultiplier = n === 1 ? 5 : n === 2 ? 3.5 : n === 3 ? 3 : 2.5;

    const words = rows.slice(0, WORD_CLOUD_LIMIT).map((d) => ({
      text: d.text ?? d.word ?? d.phrase,
      size: Math.sqrt(d.total) * baseMultiplier,
    }));

    const layout = cloud()
      .size([containerWidth, containerHeight])
      .words(words)
      .padding(n === 1 ? 5 : n === 2 ? 3 : n === 3 ? 2 : 1.5)
      .rotate(() => (n === 1 && Math.random() > 0.7 ? 90 : 0))
      .font('sans-serif')
      .fontSize((d) => d.size)
      .on('end', (laid) => paint(container, laid, containerWidth, containerHeight, n));

    layout.start();
    return () => { container.innerHTML = ''; };
  }

  function paint(container, words, width, height, n) {
    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    svg
      .selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .style('font-size', (d) => d.size + 'px')
      .style('font-family', 'Inter, sans-serif')
      .style('fill', (_d, i) => d3.schemeCategory10[i % 10])
      .style('cursor', n === 1 ? 'pointer' : 'default')
      .attr('text-anchor', 'middle')
      .attr('transform', (d) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
      .text((d) => d.text)
      .on('click', async (_event, d) => {
        if (n !== 1) return;
        setTerm(d.text);
        settings.useRegex = false;
        await run();
      });
  }
</script>

<div class="w-full min-h-[200px] rounded-lg border bg-muted/20 flex items-center justify-center" {@attach draw}>
  {#if !items.length}
    <p class="text-sm text-muted-foreground p-4">Perform a search to generate the {typeName} cloud.</p>
  {/if}
</div>
