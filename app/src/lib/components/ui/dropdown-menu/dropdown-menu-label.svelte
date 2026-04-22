<script>
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<DropdownMenuPrimitive.GroupHeading
  bind:ref
  class={cn('px-2 py-1.5 text-sm font-semibold', className)}
  {...rest}
>
  {@render children?.()}
</DropdownMenuPrimitive.GroupHeading>
