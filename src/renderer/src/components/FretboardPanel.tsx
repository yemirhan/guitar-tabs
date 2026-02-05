import { useState } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { ChevronDown, ChevronUp, Guitar } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Fretboard } from '@/components/Fretboard'
import { ChordDiagram } from '@/components/ChordDiagram'
import { useFretboard } from '@/hooks/useFretboard'
import { useActiveChord } from '@/hooks/useActiveChord'
import { cn } from '@/lib/utils'

interface FretboardPanelProps {
  api: alphaTab.AlphaTabApi | null
  selectedTracks: alphaTab.model.Track[]
}

export function FretboardPanel({ api, selectedTracks }: FretboardPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { activeNotes, tuning, numStrings, numFrets } = useFretboard(api, selectedTracks)
  const chord = useActiveChord(api, tuning)

  return (
    <div className="shrink-0 border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-full items-center justify-between px-3 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              isOpen ? 'bg-[var(--accent-primary)]' : 'bg-[var(--text-dim)]'
            )}
          />
          <Guitar className="h-3.5 w-3.5" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em]">
            Fretboard
          </span>
          {activeNotes.length > 0 && (
            <span className="rounded-full bg-[var(--accent-primary)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--accent-primary)]">
              {activeNotes.length} note{activeNotes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {isOpen && (
        <>
          <Separator />
          <div className="flex items-start gap-4 overflow-x-auto p-3">
            <Fretboard
              activeNotes={activeNotes}
              tuning={tuning}
              numStrings={numStrings}
              numFrets={numFrets}
            />
            {chord && (
              <div className="shrink-0">
                <ChordDiagram chord={chord} numStrings={numStrings} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
