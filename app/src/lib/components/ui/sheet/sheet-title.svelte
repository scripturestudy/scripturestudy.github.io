<script>
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<SheetPrimitive.Title
  bind:ref
  class={cn('text-lg font-semibold text-foreground', className)}
  {...rest}
>
  {@render children?.()}
</SheetPrimitive.Title>
