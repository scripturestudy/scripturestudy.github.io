<script>
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<DialogPrimitive.Title
  bind:ref
  class={cn('text-lg font-semibold leading-none tracking-tight', className)}
  {...rest}
>
  {@render children?.()}
</DialogPrimitive.Title>
