<script>
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
  } from '$lib/components/ui/dropdown-menu/index.js';
  import NotebookPen from 'lucide-svelte/icons/notebook-pen';
  import Clock from 'lucide-svelte/icons/clock';
  import HelpCircle from 'lucide-svelte/icons/help-circle';
  import Menu from 'lucide-svelte/icons/menu';
  import { toggleJournal, toggleHistory, openModal } from '$lib/stores/ui.svelte.js';
</script>

<div class="fixed bottom-4 right-4 z-50">
  <DropdownMenu>
    <DropdownMenuTrigger
      class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Open menu"
    >
      <Menu class="h-5 w-5" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuItem onSelect={() => toggleJournal(true)}>
        <NotebookPen class="h-4 w-4" />
        Notes
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => toggleHistory(true)}>
        <Clock class="h-4 w-4" />
        Search history
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => openModal('search-help')}>
        <HelpCircle class="h-4 w-4" />
        How to search
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
