<script>
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', children, ...rest } = $props();
</script>

<div class={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...rest}>
  {@render children?.()}
</div>
