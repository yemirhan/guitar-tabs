import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, ChevronUp, Play } from 'lucide-react'
import { AlphaTabActions } from '@/hooks/useAlphaTab'
import { cn } from '@/lib/utils'

interface EditPanelProps {
  actions: AlphaTabActions
  onDirtyChange: (dirty: boolean) => void
}

export function EditPanel({ actions, onDirtyChange }: EditPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [texValue, setTexValue] = useState(
    '\\title "New Score"\n\\tempo 120\n.\n1.1 2.1 3.1 4.1 | 5.1 4.1 3.1 2.1'
  )

  const handleApply = useCallback(() => {
    actions.loadTex(texValue)
    onDirtyChange(true)
  }, [actions, texValue, onDirtyChange])

  return (
    <div className="shrink-0 border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
      {/* Toggle bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-full items-center justify-between px-3 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              isOpen ? 'bg-[var(--accent-success)]' : 'bg-[var(--text-dim)]'
            )}
          />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em]">
            AlphaTex
          </span>
        </div>
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {isOpen && (
        <>
          <Separator />
          <div className="flex flex-col gap-2 p-3">
            <textarea
              value={texValue}
              onChange={(e) => setTexValue(e.target.value)}
              className="h-32 w-full resize-none rounded-md border border-[var(--border-default)] bg-[var(--edit-bg)] p-3 font-mono text-xs text-[var(--accent-success)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              placeholder="Enter alphaTex notation..."
              spellCheck={false}
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[var(--text-dim)]">
                Write alphaTex notation and click Apply to render
              </span>
              <Button size="sm" variant="accent" onClick={handleApply} className="gap-1.5">
                <Play className="h-3 w-3" />
                Apply
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
