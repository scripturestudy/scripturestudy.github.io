<script>
  import { Slider as SliderPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn.js';

  let {
    class: className = '',
    value = $bindable(),
    ref = $bindable(null),
    ...rest
  } = $props();
</script>

<SliderPrimitive.Root
  bind:ref
  bind:value
  class={cn('relative flex w-full touch-none select-none items-center', className)}
  {...rest}
>
  {#snippet children({ thumbs })}
    <span class="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range class="absolute h-full bg-primary" />
    </span>
    {#each thumbs as index (index)}
      <SliderPrimitive.Thumb
        {index}
        class="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      />
    {/each}
  {/snippet}
</SliderPrimitive.Root>
