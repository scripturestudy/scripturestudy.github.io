<script>
  import * as d3 from 'd3';

  /**
   * Props:
   *   labels:  string[]         x-axis tick labels (one per bucket)
   *   series:  Array<{ phrase, values: number[] }>
   *   colors:  string[]         parallel to series
   *   yFormat: (n: number) => string   optional custom tick/tooltip formatter
   */
  let {
    labels = [],
    series = [],
    colors = [],
    yFormat = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2)),
  } = $props();

  function chart(container) {
    // Read reactive props inside the closure so Svelte re-runs on change.
    const xs = labels;
    const rows = series.filter((s) => s.phrase);
    container.innerHTML = '';
    if (!xs.length || !rows.length) return;

    const width = container.clientWidth;
    if (!width) return;

    const rotateTicks = xs.length > 16;
    const margin = { top: 20, right: 20, bottom: rotateTicks ? 60 : 40, left: 56 };
    const height = 300;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    if (innerW <= 0) return;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, Math.max(1, xs.length - 1)]).range([0, innerW]);
    const maxY = Math.max(
      0,
      d3.max(rows, (r) => d3.max(r.values || [])) || 0,
    );
    const y = d3.scaleLinear().domain([0, maxY > 0 ? maxY : 1]).nice().range([innerH, 0]);

    // Pick a readable subset of x-ticks — at most ~12 across any density.
    const maxTicks = 12;
    const step = Math.max(1, Math.ceil(xs.length / maxTicks));
    const tickIndices = [];
    for (let i = 0; i < xs.length; i += step) tickIndices.push(i);
    if (tickIndices[tickIndices.length - 1] !== xs.length - 1) tickIndices.push(xs.length - 1);

    const xAxis = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(tickIndices)
          .tickFormat((d) => xs[d] || ''),
      );
    xAxis.selectAll('text').style('font-size', '11px');
    if (rotateTicks) {
      xAxis
        .selectAll('text')
        .attr('transform', 'rotate(-40)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.3em');
    }

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(5).tickFormat(yFormat))
      .selectAll('text')
      .style('font-size', '11px');

    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks(5))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', 'hsl(214 32% 91%)')
      .attr('stroke-dasharray', '3 3');

    const line = d3
      .line()
      .x((_, i) => x(i))
      .y((d) => y(d));

    rows.forEach((s, i) => {
      const color = colors[i] || 'hsl(217 91% 60%)';
      g.append('path')
        .datum(s.values || [])
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', line);
      g.selectAll(`.pt-${i}`)
        .data(s.values || [])
        .enter()
        .append('circle')
        .attr('cx', (_, ix) => x(ix))
        .attr('cy', (d) => y(d))
        .attr('r', 2.5)
        .attr('fill', color);
    });

    const tooltip = d3
      .select(container)
      .append('div')
      .attr(
        'class',
        'pointer-events-none absolute rounded-md bg-popover text-popover-foreground border shadow-md px-2 py-1 text-xs',
      )
      .style('opacity', 0)
      .style('position', 'absolute');

    const focusLine = g
      .append('line')
      .attr('stroke', 'hsl(215 16% 47%)')
      .attr('stroke-width', 1)
      .attr('y1', 0)
      .attr('y2', innerH)
      .style('opacity', 0);

    svg
      .append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .on('mouseenter', () => {
        focusLine.style('opacity', 1);
        tooltip.style('opacity', 1);
      })
      .on('mouseleave', () => {
        focusLine.style('opacity', 0);
        tooltip.style('opacity', 0);
      })
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event, g.node());
        const xVal = x.invert(mx);
        let idx = Math.round(xVal);
        idx = Math.max(0, Math.min(xs.length - 1, idx));
        focusLine.attr('x1', x(idx)).attr('x2', x(idx));
        const lines = rows.map((s, i) => {
          const swatch = colors[i] || 'hsl(217 91% 60%)';
          const v = (s.values || [])[idx] ?? 0;
          return `<div class="flex items-center gap-1.5"><span style="background:${swatch}" class="inline-block h-2 w-2 rounded-full"></span><span>${escape(s.phrase)}: <b>${yFormat(v)}</b></span></div>`;
        });
        tooltip
          .html(`<div class="font-medium mb-0.5">${escape(xs[idx])}</div>${lines.join('')}`)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY + 12}px`);
      });

    return () => {
      container.innerHTML = '';
    };
  }

  function escape(s) {
    return (s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }
</script>

<div class="relative w-full" {@attach chart}></div>
