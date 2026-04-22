<script>
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', children, ...rest } = $props();
</script>

<div class={cn('flex flex-col space-y-2 text-center sm:text-left px-6 py-4 border-b', className)} {...rest}>
  {@render children?.()}
</div>
