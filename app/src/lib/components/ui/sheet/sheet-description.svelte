<script>
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<SheetPrimitive.Description
  bind:ref
  class={cn('text-sm text-muted-foreground', className)}
  {...rest}
>
  {@render children?.()}
</SheetPrimitive.Description>
