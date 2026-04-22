<script>
  import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '$lib/components/ui/sheet/index.js';
  import { ui, toggleJournal } from '$lib/stores/ui.svelte.js';
  import JournalEditor from './JournalEditor.svelte';

  function onOpenChange(next) { toggleJournal(next); }
</script>

<Sheet open={ui.journalOpen} {onOpenChange}>
  <SheetContent side="right" class="w-full sm:max-w-xl flex flex-col p-0">
    <SheetHeader>
      <SheetTitle>Notes</SheetTitle>
      <SheetDescription>
        Session-only markdown notes. Add scripture references from the results list.
      </SheetDescription>
    </SheetHeader>
    <div class="flex flex-col flex-grow overflow-hidden p-4">
      <JournalEditor />
    </div>
  </SheetContent>
</Sheet>
