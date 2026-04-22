<script>
  import { cn } from '$lib/utils/cn.js';
  let {
    class: className = '',
    type = 'text',
    value = $bindable(''),
    ref = $bindable(null),
    ...rest
  } = $props();
</script>

<input
  bind:this={ref}
  {type}
  bind:value
  class={cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
  {...rest}
/>
