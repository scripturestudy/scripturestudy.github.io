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

  /**
   * Props:
   *   hit            — { paraId, text, talkIdx }
   *   talk           — ConferenceTalk
   *   pattern        — search term / regex source
   *   useRegex
   *   caseSensitive
   *   inContext      — true inside TalkContextDrawer (disables click-to-open-context)
   */
  let { hit, talk, pattern = '', useRegex = false, caseSensitive = false, inContext = false } = $props();

  const text = $derived(hit?.text ?? '');
  const paraId = $derived(hit?.paraId ?? '');

  function monthLabel(m) {
    return m === 4 ? 'April' : m === 10 ? 'October' : String(m);
  }

  const paragraphUrl = $derived(
    talk ? (paraId ? `${talk.u}#${paraId}` : talk.u) : '#',
  );
  const citationMarkdown = $derived(
    talk ? `${talk.sp}, [${talk.t}](${paragraphUrl}), ${monthLabel(talk.m)} ${talk.y}` : '',
  );
  const googleUrl = $derived(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
  const copyText = $derived(`> ${text} — ${citationMarkdown}`);

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
      verseTitle: citationMarkdown,
      scriptureText: text,
      onAdded: () => {
        added = true;
        setTimeout(() => (added = false), 1500);
      },
    });
  }

  function openTalkContext() {
    if (inContext || hit?.talkIdx == null) return;
    openModal('talk-context', { talkIdx: hit.talkIdx, paraId });
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
      {#if paraId}
        {#if inContext}
          <span class="caption inline-block text-xs text-muted-foreground mb-1">
            ¶ {paraId}
          </span>
        {:else}
          <button
            type="button"
            class="caption inline-block text-xs text-muted-foreground hover:text-foreground mb-1 cursor-pointer"
            title="View paragraph in context of the talk"
            onclick={openTalkContext}
          >
            ¶ {paraId}
          </button>
        {/if}
      {/if}
      {#if inContext}
        <HighlightedText {text} {pattern} {useRegex} {caseSensitive} />
      {:else}
        <button
          type="button"
          class="block w-full text-left cursor-pointer"
          title="View paragraph in context of the talk"
          onclick={openTalkContext}
        >
          <HighlightedText {text} {pattern} {useRegex} {caseSensitive} />
        </button>
      {/if}
    </div>

    {#if settings.compactView}
      <DropdownMenu>
        <DropdownMenuTrigger
          class="absolute top-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Actions for paragraph"
        >
          <MoreVertical class="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={copyToClipboard}>
            <Copy class="h-4 w-4" /> Copy Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openNote}>
            <Plus class="h-4 w-4" /> Add to Journal
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(googleUrl, '_blank')}>
            <Search class="h-4 w-4" /> Search on Google
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(paragraphUrl, '_blank')}>
            <ExternalLink class="h-4 w-4" /> Open on Church Website
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    {:else}
      <div class="flex flex-col items-center gap-1 -mr-1 pl-3 border-l border-border flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          title="Copy paragraph with citation"
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
          title="Search paragraph text on Google"
        >
          <Search class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          href={paragraphUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open paragraph on Church Website"
        >
          <ExternalLink class="h-4 w-4" />
        </Button>
      </div>
    {/if}
  </div>
</Card>
