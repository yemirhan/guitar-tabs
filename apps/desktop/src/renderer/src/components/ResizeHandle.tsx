import { cn } from '@/lib/utils'

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void
}

export function ResizeHandle({ onMouseDown }: ResizeHandleProps) {
  return (
    <div
      className={cn(
        'group relative w-[3px] shrink-0 cursor-col-resize'
      )}
      onMouseDown={onMouseDown}
    >
      {/* Visible line */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border-default)] transition-all group-hover:w-[2px] group-hover:bg-[var(--accent-primary)] group-hover:shadow-[0_0_6px_color-mix(in_srgb,var(--accent-primary)_40%,transparent)]" />

      {/* Grip dots (appear on hover) */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="h-1 w-1 rounded-full bg-[var(--accent-primary)]" />
        <div className="h-1 w-1 rounded-full bg-[var(--accent-primary)]" />
        <div className="h-1 w-1 rounded-full bg-[var(--accent-primary)]" />
      </div>
    </div>
  )
}
