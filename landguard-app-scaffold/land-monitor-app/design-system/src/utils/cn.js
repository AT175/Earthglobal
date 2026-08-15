import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Standard shadcn/ui class-merging utility, used by any Tailwind-based
// primitives we adapt from shadcn/ui alongside our styled-components.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default cn;
