<script>
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', ...rest } = $props();
</script>

<div class={cn('animate-pulse rounded-md bg-muted', className)} {...rest}></div>
