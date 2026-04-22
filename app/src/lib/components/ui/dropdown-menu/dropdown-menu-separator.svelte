<script>
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), ...rest } = $props();
</script>

<DropdownMenuPrimitive.Separator
  bind:ref
  class={cn('-mx-1 my-1 h-px bg-muted', className)}
  {...rest}
/>
