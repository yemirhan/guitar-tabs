import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, ChevronUp, Repeat, Play, Square } from 'lucide-react'
import type { PracticeModeState, PracticeModeActions } from '@/hooks/usePracticeMode'
import { cn } from '@/lib/utils'

interface PracticeModePanelProps {
  state: PracticeModeState
  actions: PracticeModeActions
  totalBars: number
  isOpen: boolean
  onToggle: () => void
}

export function PracticeModePanel({
  state,
  actions,
  totalBars,
  isOpen,
  onToggle
}: PracticeModePanelProps) {
  const handleStartBarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(1, Math.min(totalBars, Number(e.target.value) || 1))
      actions.setRange(val, Math.max(val, state.endBar))
    },
    [actions, state.endBar, totalBars]
  )

  const handleEndBarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(state.startBar, Math.min(totalBars, Number(e.target.value) || 1))
      actions.setRange(state.startBar, val)
    },
    [actions, state.startBar, totalBars]
  )

  const handleTempoChange = useCallback(
    (value: number[]) => {
      actions.setLoopTempo(value[0])
    },
    [actions]
  )

  const handleIncrementChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      actions.setTempoIncrement(Math.max(0.01, Math.min(0.5, Number(e.target.value) || 0.05)))
    },
    [actions]
  )

  const handleMaxTempoChange = useCallback(
    (value: number[]) => {
      actions.setMaxTempo(value[0])
    },
    [actions]
  )

  return (
    <div className="shrink-0 border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
      <button
        onClick={onToggle}
        className="flex h-8 w-full items-center justify-between px-3 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              state.isActive ? 'bg-[var(--accent-amber)]' : 'bg-[var(--text-dim)]'
            )}
          />
          <Repeat className="h-3.5 w-3.5" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em]">
            Practice Mode
          </span>
          {state.isActive && state.currentLoopCount > 0 && (
            <span className="rounded-full bg-[var(--accent-amber)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--accent-amber)]">
              Loop #{state.currentLoopCount}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {isOpen && (
        <>
          <Separator />
          <div className="flex flex-col gap-3 p-3">
            {/* Bar range */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-[var(--text-dim)]">Bar range</span>
              <input
                type="number"
                min={1}
                max={totalBars}
                value={state.startBar}
                onChange={handleStartBarChange}
                className="w-16 rounded border border-[var(--border-default)] bg-[var(--edit-bg)] px-2 py-1 text-center font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
              <span className="text-xs text-[var(--text-dim)]">to</span>
              <input
                type="number"
                min={1}
                max={totalBars}
                value={state.endBar}
                onChange={handleEndBarChange}
                className="w-16 rounded border border-[var(--border-default)] bg-[var(--edit-bg)] px-2 py-1 text-center font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
              <span className="text-xs text-[var(--text-dim)]">
                / {totalBars}
              </span>
            </div>

            {/* Loop tempo */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-[var(--text-dim)]">Tempo</span>
              <Slider
                value={[state.loopTempo]}
                min={0.25}
                max={2}
                step={0.05}
                onValueChange={handleTempoChange}
                className="flex-1"
              />
              <span className="w-12 text-right font-mono text-xs font-medium text-[var(--accent-amber)]">
                {Math.round(state.loopTempo * 100)}%
              </span>
            </div>

            {/* Gradual increase */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.isGradualIncrease}
                  onChange={(e) => actions.setGradualIncrease(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--accent-primary)]"
                />
                <span className="text-xs text-[var(--text-secondary)]">Gradual increase</span>
              </label>

              {state.isGradualIncrease && (
                <>
                  <span className="text-xs text-[var(--text-dim)]">+</span>
                  <input
                    type="number"
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    value={state.tempoIncrement}
                    onChange={handleIncrementChange}
                    className="w-16 rounded border border-[var(--border-default)] bg-[var(--edit-bg)] px-2 py-1 text-center font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  <span className="text-xs text-[var(--text-dim)]">max</span>
                  <Slider
                    value={[state.maxTempo]}
                    min={0.5}
                    max={2}
                    step={0.05}
                    onValueChange={handleMaxTempoChange}
                    className="w-20"
                  />
                  <span className="w-10 text-right font-mono text-xs text-[var(--text-dim)]">
                    {Math.round(state.maxTempo * 100)}%
                  </span>
                </>
              )}
            </div>

            {/* Count-in + controls */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.countInEnabled}
                  onChange={() => actions.toggleCountIn()}
                  className="h-3.5 w-3.5 accent-[var(--accent-primary)]"
                />
                <span className="text-xs text-[var(--text-secondary)]">Count-in</span>
              </label>

              <div className="flex-1" />

              {!state.isActive ? (
                <Button size="sm" variant="accent" onClick={() => { actions.activate(); actions.startLoop() }} className="gap-1.5">
                  <Play className="h-3 w-3" />
                  Start Loop
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => { actions.stopLoop(); actions.deactivate() }} className="gap-1.5">
                  <Square className="h-3 w-3" />
                  Stop
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
