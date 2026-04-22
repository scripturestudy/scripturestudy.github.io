<script module>
  import { tv } from 'tailwind-variants';
  export const alertVariants = tv({
    base: 'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        warning:
          'border-yellow-500/50 text-yellow-900 bg-yellow-50 dark:border-yellow-500 [&>svg]:text-yellow-700',
        destructive:
          'border-destructive/50 text-destructive bg-destructive/10 [&>svg]:text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  });
</script>

<script>
  import { cn } from '$lib/utils/cn.js';
  let { class: className = '', variant = 'default', children, ...rest } = $props();
</script>

<div role="alert" class={cn(alertVariants({ variant }), className)} {...rest}>
  {@render children?.()}
</div>
