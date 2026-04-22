<script>
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<CollapsiblePrimitive.Content
  bind:ref
  class={cn(
    'overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</CollapsiblePrimitive.Content>
