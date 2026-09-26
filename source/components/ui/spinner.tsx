import { cn } from '@/lib/utils';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  // Keep status on the SVG; an output wrapper would change the icon-only API.
  /* eslint-disable jsx-a11y/prefer-tag-over-role */
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
  /* eslint-enable jsx-a11y/prefer-tag-over-role */
}

export { Spinner };
