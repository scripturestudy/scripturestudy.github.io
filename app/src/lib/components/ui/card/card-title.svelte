<script>
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), tag = 'h3', children, ...rest } = $props();
</script>

<svelte:element
  this={tag}
  bind:this={ref}
  class={cn('text-lg font-semibold leading-none tracking-tight', className)}
  {...rest}
>
  {@render children?.()}
</svelte:element>
