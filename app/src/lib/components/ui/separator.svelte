<script>
  import { Separator as SeparatorPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';

  let {
    class: className = '',
    orientation = 'horizontal',
    decorative = true,
    ref = $bindable(null),
    ...rest
  } = $props();
</script>

<SeparatorPrimitive.Root
  bind:ref
  {orientation}
  {decorative}
  class={cn(
    'shrink-0 bg-border',
    orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
    className,
  )}
  {...rest}
/>
