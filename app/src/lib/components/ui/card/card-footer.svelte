<script>
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<div bind:this={ref} class={cn('flex items-center p-6 pt-0', className)} {...rest}>
  {@render children?.()}
</div>
