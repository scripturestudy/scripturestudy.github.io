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
  import Music from 'lucide-svelte/icons/music';
  import MoreVertical from 'lucide-svelte/icons/more-vertical';
  import Check from 'lucide-svelte/icons/check';
  import { cn } from '$lib/utils/cn.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { openModal } from '$lib/stores/ui.svelte.js';

  /**
   * Props:
   *   hit            — { hymnIdx, verseNumber, kind, marker, text, hymn }
   *   pattern        — search term / regex source
   *   useRegex
   *   caseSensitive
   */
  let { hit, pattern = '', useRegex = false, caseSensitive = false } = $props();

  const text = $derived(hit?.text ?? '');
  const marker = $derived(hit?.marker ?? '');
  const isChorus = $derived(hit?.kind === 'C');
  const verseLabel = $derived(isChorus ? 'Chorus' : `Verse ${hit?.verseNumber ?? ''}`);
  const hymn = $derived(hit?.hymn);

  const studyUrl = $derived(
    hymn
      ? marker
        ? `${hymn.u}&id=${marker}#${marker}`
        : hymn.u
      : '#',
  );
  const musicUrl = $derived(hymn?.mu ?? '#');
  const citation = $derived(hymn ? `Hymn #${hymn.sn}, "${hymn.t}"` : '');
  const googleUrl = $derived(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
  const copyText = $derived(`> ${text} — ${citation}, ${verseLabel}`);

  let copied = $state(false);
  let added = $state(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(copyText);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch { /* ignore */ }
  }

  function openNote() {
    openModal('note', {
      verseTitle: `${citation} — ${verseLabel}`,
      scriptureText: text,
      onAdded: () => {
        added = true;
        setTimeout(() => (added = false), 1500);
      },
    });
  }
</script>

<Card
  class={cn(
    'group relative transition-shadow hover:shadow-card-hover',
    settings.compactView ? 'p-2' : 'p-3',
  )}
>
  <div class="flex {settings.compactView ? 'flex-col' : 'flex-row'} gap-3">
    <div class="flex-grow min-w-0">
      <a
        href={studyUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="caption inline-block text-xs text-muted-foreground hover:text-foreground mb-1"
        title="Open this verse on churchofjesuschrist.org"
      >
        {verseLabel}{marker ? ` · ${marker}` : ''}
      </a>
      <div class="whitespace-pre-line">
        <HighlightedText {text} {pattern} {useRegex} {caseSensitive} />
      </div>
    </div>

    {#if settings.compactView}
      <DropdownMenu>
        <DropdownMenuTrigger
          class="absolute top-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Actions for verse"
        >
          <MoreVertical class="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={copyToClipboard}>
            <Copy class="h-4 w-4" /> Copy Verse
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openNote}>
            <Plus class="h-4 w-4" /> Add to Journal
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(googleUrl, '_blank')}>
            <Search class="h-4 w-4" /> Search on Google
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(studyUrl, '_blank')}>
            <ExternalLink class="h-4 w-4" /> Open Study Page
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(musicUrl, '_blank')}>
            <Music class="h-4 w-4" /> Open Music Page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    {:else}
      <div class="flex flex-col items-center gap-1 -mr-1 pl-3 border-l border-border flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          title="Copy verse with citation"
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
          title="Search verse text on Google"
        >
          <Search class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          href={studyUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open this verse on the Church study site"
        >
          <ExternalLink class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          href={musicUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open hymn audio + sheet music"
        >
          <Music class="h-4 w-4" />
        </Button>
      </div>
    {/if}
  </div>
</Card>
