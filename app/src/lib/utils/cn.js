import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn-style class merger: clsx for conditionals, twMerge for conflict resolution. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
