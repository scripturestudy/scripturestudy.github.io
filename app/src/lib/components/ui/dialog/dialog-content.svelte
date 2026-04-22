<script>
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import X from 'lucide-svelte/icons/x';
  import { cn } from '$lib/utils/cn.js';
  import DialogOverlay from './dialog-overlay.svelte';

  let {
    class: className = '',
    ref = $bindable(null),
    showClose = true,
    children,
    ...rest
  } = $props();
</script>

<DialogPrimitive.Portal>
  <DialogOverlay />
  <DialogPrimitive.Content
    bind:ref
    class={cn(
      'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200 sm:rounded-lg',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
      'max-h-[90vh] overflow-y-auto',
      className,
    )}
    {...rest}
  >
    {@render children?.()}
    {#if showClose}
      <DialogPrimitive.Close
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">Close</span>
      </DialogPrimitive.Close>
    {/if}
  </DialogPrimitive.Content>
</DialogPrimitive.Portal>
