<script>
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<DialogPrimitive.Description
  bind:ref
  class={cn('text-sm text-muted-foreground', className)}
  {...rest}
>
  {@render children?.()}
</DialogPrimitive.Description>
