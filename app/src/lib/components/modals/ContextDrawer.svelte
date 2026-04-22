<script>
  import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '$lib/components/ui/dialog/index.js';
  import { ui, closeModal } from '$lib/stores/ui.svelte.js';
  import { scripturesState } from '$lib/stores/scriptures.svelte.js';
  import ResultCard from '$lib/components/results/ResultCard.svelte';

  const open = $derived(ui.activeModal === 'context');
  const target = $derived(ui.modalPayload?.verse ?? null);

  const chapterVerses = $derived.by(() => {
    if (!target) return [];
    return scripturesState.verses
      .filter(
        (v) => v && v.book_title === target.book_title && v.chapter_number === target.chapter_number,
      )
      .sort((a, b) => a.verse_number - b.verse_number);
  });

  const title = $derived(
    target ? `${target.book_title} ${target.chapter_number}` : 'Chapter Context',
  );

  let drawerEl = $state(null);

  $effect(() => {
    if (!open || !target || !drawerEl) return;
    setTimeout(() => {
      const el = drawerEl?.querySelector?.('.current-context-verse');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  });

  function onOpenChange(next) { if (!next) closeModal(); }
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent class="max-w-3xl">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>Click any verse for the same actions you get on the results list.</DialogDescription>
    </DialogHeader>
    <div class="space-y-2" bind:this={drawerEl}>
      {#if !chapterVerses.length}
        <p class="text-center text-muted-foreground">No surrounding verses to display.</p>
      {:else}
        {#each chapterVerses as verse (verse.verse_number)}
          <div class:current-context-verse={verse.verse_number === target.verse_number}>
            <ResultCard {verse} inContext={true} />
          </div>
        {/each}
      {/if}
    </div>
  </DialogContent>
</Dialog>

<style>
  .current-context-verse {
    outline: 2px solid hsl(217 91% 60%);
    border-radius: 0.75rem;
  }
</style>
