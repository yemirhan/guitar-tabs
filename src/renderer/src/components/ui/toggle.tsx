import * as React from 'react'
import * as TogglePrimitive from '@radix-ui/react-toggle'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all hover:bg-[var(--bg-surface-raised)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--bg-surface-raised)] data-[state=on]:text-[var(--text-primary)] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-[var(--border-default)] bg-transparent shadow-sm hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]',
        mute:
          'bg-transparent border border-transparent font-mono font-bold tracking-wider text-[var(--text-dim)] data-[state=on]:bg-[color-mix(in_srgb,var(--accent-danger)_15%,transparent)] data-[state=on]:text-[var(--accent-danger)] data-[state=on]:border-[color-mix(in_srgb,var(--accent-danger)_30%,transparent)]',
        solo:
          'bg-transparent border border-transparent font-mono font-bold tracking-wider text-[var(--text-dim)] data-[state=on]:bg-[color-mix(in_srgb,var(--accent-amber)_15%,transparent)] data-[state=on]:text-[var(--accent-amber)] data-[state=on]:border-[color-mix(in_srgb,var(--accent-amber)_30%,transparent)]'
      },
      size: {
        default: 'h-9 px-3 min-w-9',
        sm: 'h-8 px-2 min-w-8',
        lg: 'h-10 px-3 min-w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

const Toggle = React.forwardRef<
  React.ComponentRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))
Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
