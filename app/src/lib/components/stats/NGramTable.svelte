<script>
  import ChevronUp from 'lucide-svelte/icons/chevron-up';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import { formatStat, formatPercentage } from '$lib/utils/format.js';
  import { NGRAM_TABLE_LIMIT } from '$lib/constants/limits.js';
  import { cn } from '$lib/utils/cn.js';

  let { ngramSize, rows = [] } = $props();

  let sortColumn = $state('total');
  let sortDir = $state('desc');

  const columns = $derived.by(() => {
    if (ngramSize === 1) {
      return [
        { key: 'word', label: 'Word', align: 'left' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'unique', label: 'Unique', align: 'right' },
        { key: 'freqPerScripture', label: 'Freq/Scripture', align: 'right' },
        { key: 'freqPerWord', label: 'Freq/Word', align: 'right' },
        { key: 'coverage', label: 'Coverage', align: 'right' },
      ];
    }
    const phraseLabel =
      ngramSize === 2 ? 'Phrase (2-gram)' : ngramSize === 3 ? 'Triplet (3-gram)' : 'Quartet (4-gram)';
    return [
      { key: 'phrase', label: phraseLabel, align: 'left' },
      { key: 'total', label: 'Total', align: 'right' },
      { key: 'unique', label: 'Unique', align: 'right' },
    ];
  });

  const sorted = $derived.by(() => {
    const col = sortColumn;
    const dir = sortDir;
    const isString = col === 'word' || col === 'phrase';
    const copy = rows.slice();
    copy.sort((a, b) => {
      const av = a[col] ?? (isString ? '' : 0);
      const bv = b[col] ?? (isString ? '' : 0);
      if (isString) {
        const as = String(av).toLowerCase();
        const bs = String(bv).toLowerCase();
        if (as < bs) return dir === 'asc' ? -1 : 1;
        if (as > bs) return dir === 'asc' ? 1 : -1;
        return 0;
      }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy.slice(0, NGRAM_TABLE_LIMIT);
  });

  function onHeaderClick(key) {
    if (sortColumn === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = key;
      sortDir = ['total', 'unique', 'freqPerScripture', 'freqPerWord', 'coverage'].includes(key)
        ? 'desc'
        : 'asc';
    }
  }
</script>

<div class="overflow-x-auto rounded-lg border">
  <table class="w-full text-sm">
    <thead class={cn('bg-muted/50')}>
      <tr>
        {#each columns as c (c.key)}
          <th
            class="px-3 py-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
            class:text-right={c.align === 'right'}
            class:text-left={c.align === 'left'}
            onclick={() => onHeaderClick(c.key)}
          >
            <span class="inline-flex items-center gap-1">
              {c.label}
              {#if sortColumn === c.key}
                {#if sortDir === 'asc'}
                  <ChevronUp class="h-3.5 w-3.5" />
                {:else}
                  <ChevronDown class="h-3.5 w-3.5" />
                {/if}
              {/if}
            </span>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if sorted.length === 0}
        <tr>
          <td colspan={columns.length} class="text-center text-muted-foreground py-6">
            No frequency data to display.
          </td>
        </tr>
      {:else}
        {#each sorted as row, i (row.word ?? row.phrase)}
          <tr class={cn('border-t', i % 2 === 1 && 'bg-muted/20')}>
            <td class="px-3 py-1.5">{row.word ?? row.phrase}</td>
            <td class="px-3 py-1.5 text-right font-mono">{row.total}</td>
            <td class="px-3 py-1.5 text-right font-mono">{row.unique}</td>
            {#if ngramSize === 1}
              <td class="px-3 py-1.5 text-right font-mono">{formatStat(row.freqPerScripture, 3)}</td>
              <td class="px-3 py-1.5 text-right font-mono">{formatPercentage(row.freqPerWord, 2)}</td>
              <td class="px-3 py-1.5 text-right font-mono">{formatPercentage(row.coverage, 1)}</td>
            {/if}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
