<script module>
  import { tv } from 'tailwind-variants';
  export const sheetVariants = tv({
    base:
      'fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t rounded-t-xl max-h-[85vh] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left:
          'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      },
    },
    defaultVariants: { side: 'right' },
  });
</script>

<script>
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import X from 'lucide-svelte/icons/x';
  import { cn } from '$lib/utils/cn.js';
  import SheetOverlay from './sheet-overlay.svelte';

  let {
    class: className = '',
    side = 'right',
    ref = $bindable(null),
    showClose = true,
    children,
    ...rest
  } = $props();
</script>

<SheetPrimitive.Portal>
  <SheetOverlay />
  <SheetPrimitive.Content
    bind:ref
    class={cn(sheetVariants({ side }), className)}
    {...rest}
  >
    {@render children?.()}
    {#if showClose}
      <SheetPrimitive.Close
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">Close</span>
      </SheetPrimitive.Close>
    {/if}
  </SheetPrimitive.Content>
</SheetPrimitive.Portal>
