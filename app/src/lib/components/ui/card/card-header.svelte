<script>
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<div bind:this={ref} class={cn('flex flex-col space-y-1.5 p-6', className)} {...rest}>
  {@render children?.()}
</div>
