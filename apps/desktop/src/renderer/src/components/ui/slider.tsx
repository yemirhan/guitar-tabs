import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { accent?: boolean }
>(({ className, accent, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-[var(--border-default)]">
      <SliderPrimitive.Range
        className={cn(
          'absolute h-full',
          accent
            ? 'bg-[var(--accent-primary)] shadow-[0_0_6px_color-mix(in_srgb,var(--accent-primary)_30%,transparent)]'
            : 'bg-[var(--text-dim)]'
        )}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'block h-3 w-3 rounded-full shadow transition-transform hover:scale-110 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        accent
          ? 'border-2 border-[var(--accent-primary)] bg-[var(--bg-surface)] focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]'
          : 'bg-[var(--text-secondary)] hover:bg-[var(--text-primary)] focus-visible:ring-1 focus-visible:ring-[var(--text-secondary)]'
      )}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
