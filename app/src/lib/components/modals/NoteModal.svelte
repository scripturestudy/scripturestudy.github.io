<script>
  import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '$lib/components/ui/dialog/index.js';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Button from '$lib/components/ui/button.svelte';
  import { ui, closeModal } from '$lib/stores/ui.svelte.js';
  import { appendEntry } from '$lib/stores/journal.svelte.js';

  const open = $derived(ui.activeModal === 'note');
  const payload = $derived(ui.modalPayload ?? {});

  let noteText = $state('');
  let textareaEl = $state(null);

  $effect(() => {
    if (open) {
      noteText = '';
      setTimeout(() => textareaEl?.focus(), 50);
    }
  });

  function save() {
    appendEntry({
      verseTitle: payload.verseTitle,
      scriptureText: payload.scriptureText,
      userNote: noteText,
    });
    payload.onAdded?.();
    closeModal();
  }

  function onKeydown(e) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      save();
    }
  }

  function onOpenChange(next) { if (!next) closeModal(); }
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add a Note to your Journal</DialogTitle>
      <DialogDescription>
        Your note will be saved together with the scripture below. Tip: Shift+Enter to save.
      </DialogDescription>
    </DialogHeader>

    <Textarea
      bind:ref={textareaEl}
      bind:value={noteText}
      placeholder="Enter your note here..."
      onkeydown={onKeydown}
      class="min-h-[100px]"
    />

    <div class="rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <strong>{payload.verseTitle ?? ''}</strong>
      <span class="text-muted-foreground">{payload.scriptureText ?? ''}</span>
    </div>

    <DialogFooter>
      <Button onclick={save}>Add to Journal</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
