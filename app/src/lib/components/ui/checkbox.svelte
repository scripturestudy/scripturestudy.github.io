<script>
  import { Checkbox as CheckboxPrimitive } from 'bits-ui';
  import Check from 'lucide-svelte/icons/check';
  import Minus from 'lucide-svelte/icons/minus';
  import { cn } from '$lib/utils/cn.js';

  let {
    class: className = '',
    checked = $bindable(false),
    indeterminate = $bindable(false),
    ref = $bindable(null),
    ...rest
  } = $props();
</script>

<CheckboxPrimitive.Root
  bind:ref
  bind:checked
  bind:indeterminate
  class={cn(
    'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
    className,
  )}
  {...rest}
>
  {#snippet children({ checked, indeterminate })}
    <div class="flex items-center justify-center text-current">
      {#if indeterminate}
        <Minus class="h-3.5 w-3.5" />
      {:else if checked}
        <Check class="h-3.5 w-3.5" />
      {/if}
    </div>
  {/snippet}
</CheckboxPrimitive.Root>
