<script>
  import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '$lib/components/ui/dialog/index.js';
  import { ui, closeModal } from '$lib/stores/ui.svelte.js';
  import { STOP_WORDS } from '$lib/constants/stopwords.js';

  const open = $derived(ui.activeModal === 'stop-words');
  const sorted = Array.from(STOP_WORDS).sort();
  function onOpenChange(next) { if (!next) closeModal(); }
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent class="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Stop Words List</DialogTitle>
      <DialogDescription>
        These common words are excluded from N-gram analysis when "Exclude Stop Words" is checked.
      </DialogDescription>
    </DialogHeader>
    <ul class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-4 gap-y-1 text-sm text-muted-foreground max-h-[60vh] overflow-y-auto">
      {#each sorted as word}
        <li>{word}</li>
      {/each}
    </ul>
  </DialogContent>
</Dialog>
