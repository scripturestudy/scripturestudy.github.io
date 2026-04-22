<script>
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ref = $bindable(null), children, ...rest } = $props();
</script>

<div
  bind:this={ref}
  class={cn('rounded-xl border bg-card text-card-foreground shadow-card', className)}
  {...rest}
>
  {@render children?.()}
</div>
