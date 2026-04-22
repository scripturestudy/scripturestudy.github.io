<script>
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<DropdownMenuPrimitive.Item
  bind:ref
  class={cn(
    'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</DropdownMenuPrimitive.Item>
