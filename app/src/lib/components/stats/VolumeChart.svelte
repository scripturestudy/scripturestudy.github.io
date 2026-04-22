<script>
  import * as d3 from 'd3';

  let { data = [] } = $props();

  function wrapAxisText(selection, width) {
    selection.each(function () {
      const t = d3.select(this);
      const words = t.text().split(/\s+/).reverse();
      let line = [];
      let lineNumber = 0;
      const lineHeight = 1.1;
      const y = t.attr('y');
      const dy = parseFloat(t.attr('dy') || 0);
      let tspan = t.text(null).append('tspan').attr('x', -10).attr('y', y).attr('dy', dy + 'em');
      let word;
      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(' '));
        if (tspan.node().getComputedTextLength() > width && line.length > 1) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = t.append('tspan')
            .attr('x', -10)
            .attr('y', y)
            .attr('dy', ++lineNumber * lineHeight + dy + 'em')
            .text(word);
        }
      }
    });
  }

  /**
   * Attachment: takes the container node and re-renders whenever `data` changes.
   * `$state`-aware code inside the returned closure triggers re-runs via Svelte's
   * reactivity — we read `data` on every call so the chart updates.
   */
  function chart(container) {
    // Read reactive prop so the attachment re-runs when it changes.
    const rows = data;
    container.innerHTML = '';
    if (!rows.length) return;

    const width = container.clientWidth;
    if (!width) return;

    const margin = { top: 10, right: 30, bottom: 20, left: 150 };
    const barHeight = 25;
    const height = rows.length * barHeight + margin.top + margin.bottom;
    const innerWidth = width - margin.left - margin.right;
    if (innerWidth <= 0) return;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const yScale = d3.scaleBand().domain(rows.map((d) => d.volume)).range([0, height - margin.top - margin.bottom]).padding(0.2);
    const xScale = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.count) || 1]).range([0, innerWidth]);

    svg.append('g').attr('class', 'y axis').call(d3.axisLeft(yScale).tickSizeOuter(0)).selectAll('.tick text').call(wrapAxisText, margin.left - 10);
    svg.append('g').attr('class', 'x axis').attr('transform', `translate(0,${height - margin.top - margin.bottom})`).call(d3.axisBottom(xScale).ticks(Math.min(5, d3.max(rows, (d) => d.count))).tickFormat(d3.format('d')));

    svg
      .selectAll('.bar')
      .data(rows)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('fill', 'hsl(217 91% 60%)')
      .attr('y', (d) => yScale(d.volume))
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', 0)
      .transition()
      .duration(500)
      .attr('width', (d) => Math.max(0, xScale(d.count)));

    svg
      .selectAll('.bar-label')
      .data(rows)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('fill', 'hsl(222 47% 11%)')
      .attr('y', (d) => yScale(d.volume) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('x', (d) => Math.max(0, xScale(d.count)) + 5)
      .style('font-size', '12px')
      .text((d) => d.count);

    return () => { container.innerHTML = ''; };
  }
</script>

<div class="w-full" {@attach chart}>
  {#if !data.length}
    <p class="text-xs text-muted-foreground italic text-center pt-4">No volume data to display.</p>
  {/if}
</div>
