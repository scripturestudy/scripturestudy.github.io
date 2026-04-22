<script>
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<p bind:this={ref} class={cn('text-sm text-muted-foreground', className)} {...rest}>
  {@render children?.()}
</p>
