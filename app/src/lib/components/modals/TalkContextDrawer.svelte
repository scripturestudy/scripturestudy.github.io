<script>
  import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '$lib/components/ui/dialog/index.js';
  import { ui, closeModal } from '$lib/stores/ui.svelte.js';
  import { conferenceState } from '$lib/stores/conference.svelte.js';
  import ConferenceParagraphCard from '$lib/components/results/ConferenceParagraphCard.svelte';

  const open = $derived(ui.activeModal === 'talk-context');
  const talkIdx = $derived(ui.modalPayload?.talkIdx ?? null);
  const targetParaId = $derived(ui.modalPayload?.paraId ?? '');

  const talk = $derived(
    talkIdx != null ? conferenceState.talks[talkIdx] : null,
  );

  const paragraphs = $derived.by(() => {
    if (talkIdx == null) return [];
    const out = [];
    for (const row of conferenceState.paragraphs) {
      if (row[0] === talkIdx) {
        out.push({ talkIdx: row[0], paraId: row[1], text: row[2] });
      }
    }
    return out;
  });

  function monthLabel(m) {
    return m === 4 ? 'April' : m === 10 ? 'October' : String(m);
  }

  const title = $derived(talk ? talk.t : 'Talk Context');
  const subtitle = $derived(
    talk ? `${talk.sp} · ${monthLabel(talk.m)} ${talk.y}` : '',
  );

  let drawerEl = $state(null);

  $effect(() => {
    if (!open || !talk || !drawerEl) return;
    setTimeout(() => {
      const el = drawerEl?.querySelector?.('.current-context-paragraph');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  });

  function onOpenChange(next) { if (!next) closeModal(); }
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent class="max-w-3xl">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{subtitle}</DialogDescription>
    </DialogHeader>
    <div class="space-y-2" bind:this={drawerEl}>
      {#if !paragraphs.length}
        <p class="text-center text-muted-foreground">No paragraphs to display.</p>
      {:else}
        {#each paragraphs as hit (hit.paraId)}
          <div class:current-context-paragraph={hit.paraId === targetParaId}>
            <ConferenceParagraphCard {hit} {talk} inContext={true} />
          </div>
        {/each}
      {/if}
    </div>
  </DialogContent>
</Dialog>

<style>
  .current-context-paragraph {
    outline: 2px solid hsl(217 91% 60%);
    border-radius: 0.75rem;
  }
</style>
