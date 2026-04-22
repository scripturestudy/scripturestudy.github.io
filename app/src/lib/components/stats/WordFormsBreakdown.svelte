<script>
  /** @type {{wordForms: Array<{word:string, count:number}> | null}} */
  let { wordForms } = $props();
</script>

<div>
  <h5 class="text-sm font-medium mb-2 text-muted-foreground">Word Forms Breakdown</h5>
  {#if wordForms === null}
    <p class="text-xs text-muted-foreground italic">
      Perform a non-regex, single-word search to see breakdown.
    </p>
  {:else if wordForms.length === 0}
    <p class="text-xs text-muted-foreground italic">
      No variations of the search term found in results.
    </p>
  {:else}
    <ul class="space-y-1 text-sm">
      {#each wordForms as form (form.word)}
        <li class="flex justify-between border-b border-border/60 py-1">
          <span>{form.word}</span>
          <span class="font-mono text-muted-foreground">{form.count}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
