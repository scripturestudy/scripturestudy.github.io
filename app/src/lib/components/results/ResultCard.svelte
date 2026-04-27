<script>
  import HighlightedText from './HighlightedText.svelte';
  import { Card } from '$lib/components/ui/card/index.js';
  import Button from '$lib/components/ui/button.svelte';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  } from '$lib/components/ui/dropdown-menu/index.js';
  import Copy from 'lucide-svelte/icons/copy';
  import Plus from 'lucide-svelte/icons/plus';
  import Search from 'lucide-svelte/icons/search';
  import ExternalLink from 'lucide-svelte/icons/external-link';
  import MoreVertical from 'lucide-svelte/icons/more-vertical';
  import Check from 'lucide-svelte/icons/check';
  import { cn } from '$lib/utils/cn.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { openModal } from '$lib/stores/ui.svelte.js';
  import { buildChurchVerseUrl } from '$lib/constants/bookPaths.js';

  /**
   * Props:
   *   verse
   *   pattern       — search term or regex source, for highlighting
   *   useRegex
   *   caseSensitive
   *   inContext     — true inside ContextDrawer (disables click-to-open-context)
   */
  let { verse, pattern = '', useRegex = false, caseSensitive = false, inContext = false } = $props();

  const title = $derived(verse?.verse_title ?? '[Verse title missing]');
  const text = $derived(verse?.scripture_text ?? '[Scripture text missing]');
  const book = $derived(verse?.book_title ?? '');
  const chapter = $derived(verse?.chapter_number ?? '');
  const verseNum = $derived(verse?.verse_number ?? '');

  // Prefer a direct verse link when the book is mapped; fall back to the
  // site search for anything unexpected (e.g. malformed data, OD/Facsimile
  // entries outside the main books).
  const churchUrl = $derived(
    buildChurchVerseUrl(verse) ||
      `https://www.churchofjesuschrist.org/search?facet=all&lang=eng&query=${encodeURIComponent(book)}+${chapter}%3A${verseNum}`,
  );
  const googleUrl = $derived(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
  const copyText = $derived(`> ${text} (${title})`);

  let copied = $state(false);
  let added = $state(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(copyText);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch { /* ignore */ }
  }

  function openContext() {
    if (inContext) return;
    openModal('context', { verse });
  }

  function openNote() {
    openModal('note', {
      verseTitle: title,
      scriptureText: text,
      onAdded: () => {
        added = true;
        setTimeout(() => (added = false), 1500);
      },
    });
  }
</script>

<Card class={cn('group relative transition-shadow hover:shadow-card-hover', settings.compactView ? 'p-2' : 'p-4')}>
  <div class="flex {settings.compactView ? 'flex-col' : 'flex-row'} gap-3">
    <div class="flex-grow min-w-0">
      {#if inContext}
        {#if settings.compactView}
          <p class="caption text-center mb-1">{title}</p>
        {:else}
          <h3 class="text-base font-semibold text-primary mb-2">{title}</h3>
        {/if}
      {:else}
        <button
          type="button"
          class={cn(
            'text-left w-full',
            settings.compactView
              ? 'caption text-center mb-1 hover:text-foreground'
              : 'text-base font-semibold text-primary hover:text-primary/80 mb-2',
          )}
          title="Click to view chapter context"
          onclick={openContext}
        >
          {title}
        </button>
      {/if}
      <HighlightedText {text} {pattern} {useRegex} {caseSensitive} />
    </div>

    {#if settings.compactView}
      <DropdownMenu>
        <DropdownMenuTrigger
          class="absolute top-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Actions for {title}"
        >
          <MoreVertical class="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={copyToClipboard}>
            <Copy class="h-4 w-4" /> Copy Scripture
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openNote}>
            <Plus class="h-4 w-4" /> Add to Journal
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(googleUrl, '_blank')}>
            <Search class="h-4 w-4" /> Search on Google
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(churchUrl, '_blank')}>
            <ExternalLink class="h-4 w-4" /> Church Website
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    {:else}
      <div class="flex flex-col items-center gap-1 -mr-1 pl-3 border-l border-border flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          title="Copy scripture text and title"
          onclick={copyToClipboard}
        >
          {#if copied}
            <Check class="h-4 w-4 text-emerald-600" />
          {:else}
            <Copy class="h-4 w-4" />
          {/if}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          title="Add to Journal"
          onclick={openNote}
        >
          {#if added}
            <Check class="h-4 w-4 text-emerald-600" />
          {:else}
            <Plus class="h-4 w-4" />
          {/if}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Search scripture text on Google"
        >
          <Search class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          href={churchUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Search verse on Church Website"
        >
          <ExternalLink class="h-4 w-4" />
        </Button>
      </div>
    {/if}
  </div>
</Card>
