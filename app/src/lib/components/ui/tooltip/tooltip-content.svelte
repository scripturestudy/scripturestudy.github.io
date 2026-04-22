<script>
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';

  let {
    class: className = '',
    sideOffset = 4,
    ref = $bindable(null),
    children,
    ...rest
  } = $props();
</script>

<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    bind:ref
    {sideOffset}
    class={cn(
      'z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...rest}
  >
    {@render children?.()}
  </TooltipPrimitive.Content>
</TooltipPrimitive.Portal>
