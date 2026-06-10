import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          'bg-[var(--text-primary)] text-[var(--bg-base)] shadow hover:opacity-90',
        destructive:
          'bg-[var(--accent-danger)] text-white shadow-sm hover:opacity-90',
        outline:
          'border border-[var(--border-default)] bg-transparent shadow-sm hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]',
        secondary:
          'bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-surface-overlay)]',
        ghost:
          'hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] text-[var(--text-secondary)]',
        link: 'text-[var(--accent-primary)] underline-offset-4 hover:underline',
        accent:
          'bg-[var(--accent-primary)] text-[var(--bg-base)] font-semibold shadow-[0_0_12px_color-mix(in_srgb,var(--accent-primary)_30%,transparent)] hover:shadow-[0_0_20px_color-mix(in_srgb,var(--accent-primary)_50%,transparent)] hover:scale-[1.02] active:scale-[0.98]',
        transport:
          'rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] hover:shadow-[0_0_8px_color-mix(in_srgb,var(--accent-primary)_20%,transparent)]'
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
        'icon-lg': 'h-11 w-11'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
