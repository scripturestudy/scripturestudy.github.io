<script>
  import { marked } from 'marked';
  import Button from '$lib/components/ui/button.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Pencil from 'lucide-svelte/icons/pencil';
  import Eye from 'lucide-svelte/icons/eye';
  import Copy from 'lucide-svelte/icons/copy';
  import Download from 'lucide-svelte/icons/download';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Check from 'lucide-svelte/icons/check';
  import { journal, clearJournal } from '$lib/stores/journal.svelte.js';
  import { cn } from '$lib/utils/cn.js';

  const rendered = $derived(journal.content.trim() ? marked.parse(journal.content) : '');

  let copied = $state(false);

  async function copyJournal() {
    if (!journal.content) { alert('Journal is empty. Nothing to copy.'); return; }
    try {
      await navigator.clipboard.writeText(journal.content);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      alert('Failed to copy journal.');
    }
  }

  function downloadJournal() {
    const blob = new Blob([journal.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scripture_journal.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function onClear() {
    if (!journal.content.trim()) { alert('Journal is already empty.'); return; }
    if (confirm('Clear the entire journal? This cannot be undone.')) {
      clearJournal();
    }
  }
</script>

<div class="flex items-center gap-2 mb-3 flex-wrap">
  <div class="inline-flex rounded-md border bg-background p-1">
    <button
      type="button"
      class={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-sm transition-colors',
        journal.mode === 'edit'
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
      onclick={() => (journal.mode = 'edit')}
    >
      <Pencil class="h-3.5 w-3.5" />
      Edit
    </button>
    <button
      type="button"
      class={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-sm transition-colors',
        journal.mode === 'preview'
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
      onclick={() => (journal.mode = 'preview')}
    >
      <Eye class="h-3.5 w-3.5" />
      Preview
    </button>
  </div>

  <div class="ml-auto flex items-center gap-2">
    <Button size="sm" variant="secondary" onclick={copyJournal}>
      {#if copied}
        <Check class="h-4 w-4 text-emerald-600" />
        Copied
      {:else}
        <Copy class="h-4 w-4" />
        Copy
      {/if}
    </Button>
    <Button size="sm" variant="secondary" onclick={downloadJournal}>
      <Download class="h-4 w-4" />
      Download
    </Button>
    <Button size="sm" variant="destructive" onclick={onClear}>
      <Trash2 class="h-4 w-4" />
      Clear
    </Button>
  </div>
</div>

<div class="flex-grow flex flex-col min-h-0 relative">
  {#if journal.mode === 'edit'}
    <Textarea
      bind:value={journal.content}
      class="absolute inset-0 h-full resize-none"
      placeholder="⚠️ Session-only notepad — clears on refresh. Scripture references are added automatically via the '+' on a result card. Markdown syntax supported."
    />
  {:else}
    <div class="absolute inset-0 p-4 border border-input rounded-md bg-muted/30 overflow-y-auto prose prose-sm max-w-none">
      {#if rendered}
        {@html rendered}
      {:else}
        <p class="text-muted-foreground italic">Your formatted journal notes will appear here.</p>
      {/if}
    </div>
  {/if}
</div>
