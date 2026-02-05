import { useCallback } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { Toggle } from '@/components/ui/toggle'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AlphaTabState, AlphaTabActions } from '@/hooks/useAlphaTab'
import { cn } from '@/lib/utils'

/**
 * Common General MIDI instruments grouped by category.
 * Program numbers are 0-indexed (General MIDI standard).
 */
const MIDI_INSTRUMENTS: { label: string; instruments: { program: number; name: string }[] }[] = [
  {
    label: 'Piano',
    instruments: [
      { program: 0, name: 'Acoustic Grand Piano' },
      { program: 1, name: 'Bright Acoustic Piano' },
      { program: 4, name: 'Electric Piano 1' },
      { program: 5, name: 'Electric Piano 2' }
    ]
  },
  {
    label: 'Guitar',
    instruments: [
      { program: 24, name: 'Nylon Guitar' },
      { program: 25, name: 'Steel Guitar' },
      { program: 26, name: 'Jazz Guitar' },
      { program: 27, name: 'Clean Guitar' },
      { program: 28, name: 'Muted Guitar' },
      { program: 29, name: 'Overdriven Guitar' },
      { program: 30, name: 'Distortion Guitar' },
      { program: 31, name: 'Guitar Harmonics' }
    ]
  },
  {
    label: 'Bass',
    instruments: [
      { program: 32, name: 'Acoustic Bass' },
      { program: 33, name: 'Finger Bass' },
      { program: 34, name: 'Pick Bass' },
      { program: 35, name: 'Fretless Bass' },
      { program: 36, name: 'Slap Bass 1' },
      { program: 38, name: 'Synth Bass 1' }
    ]
  },
  {
    label: 'Strings',
    instruments: [
      { program: 40, name: 'Violin' },
      { program: 41, name: 'Viola' },
      { program: 42, name: 'Cello' },
      { program: 48, name: 'String Ensemble' }
    ]
  },
  {
    label: 'Brass & Wind',
    instruments: [
      { program: 56, name: 'Trumpet' },
      { program: 57, name: 'Trombone' },
      { program: 60, name: 'French Horn' },
      { program: 65, name: 'Alto Sax' },
      { program: 66, name: 'Tenor Sax' },
      { program: 73, name: 'Flute' }
    ]
  },
  {
    label: 'Synth & Other',
    instruments: [
      { program: 80, name: 'Synth Lead (Square)' },
      { program: 81, name: 'Synth Lead (Saw)' },
      { program: 88, name: 'Synth Pad (New Age)' },
      { program: 104, name: 'Sitar' },
      { program: 105, name: 'Banjo' }
    ]
  }
]

/** Flat lookup: program number → instrument name */
const PROGRAM_NAME_MAP = new Map<number, string>()
for (const group of MIDI_INSTRUMENTS) {
  for (const inst of group.instruments) {
    PROGRAM_NAME_MAP.set(inst.program, inst.name)
  }
}

function getInstrumentName(program: number): string {
  return PROGRAM_NAME_MAP.get(program) ?? `Program ${program}`
}

interface TrackPanelProps {
  state: AlphaTabState
  actions: AlphaTabActions
}

export function TrackPanel({ state, actions }: TrackPanelProps) {
  const handleTrackClick = useCallback(
    (track: alphaTab.model.Track, e: React.MouseEvent) => {
      const append = e.metaKey || e.ctrlKey
      actions.selectTrack(track, append)
    },
    [actions]
  )

  const handleProgramChange = useCallback(
    (track: alphaTab.model.Track, value: string) => {
      actions.changeTrackProgram(track, Number(value))
    },
    [actions]
  )

  if (!state.score) {
    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex h-10 items-center px-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-dim)]">
            Tracks
          </span>
        </div>
        <Separator />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center font-mono text-xs text-[var(--text-dim)]">
            Open a file to see tracks
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex h-10 items-center justify-between px-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-dim)]">
          Tracks
        </span>
        <span className="rounded-full bg-[var(--bg-surface-raised)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-dim)]">
          {state.tracks.length}
        </span>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="flex w-full flex-col gap-0.5 overflow-hidden p-1.5">
          {state.tracks.map((track) => {
            const isSelected = state.selectedTracks.some((t) => t.index === track.index)
            const isMuted = track.playbackInfo.isMute
            const isSolo = track.playbackInfo.isSolo

            return (
              <div
                key={track.index}
                className={cn(
                  'group flex min-w-0 flex-col overflow-hidden rounded-md border-l-2 px-2.5 py-2 transition-all cursor-pointer',
                  isSelected
                    ? 'border-l-[var(--track-selected-border)] bg-[var(--track-selected)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                    : 'border-l-transparent hover:bg-[var(--track-hover)]'
                )}
                onClick={(e) => handleTrackClick(track, e)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {/* Track number badge */}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--bg-surface-raised)] font-mono text-[10px] font-medium text-[var(--text-dim)]">
                    {track.index + 1}
                  </span>

                  {/* Track name */}
                  <span
                    className={cn(
                      'flex-1 truncate font-display text-sm',
                      isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    )}
                  >
                    {track.name}
                  </span>

                  {/* Mute / Solo toggles */}
                  <div
                    className={cn(
                      'flex items-center gap-0.5 transition-opacity',
                      !isMuted && !isSolo && 'opacity-0 group-hover:opacity-100'
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Toggle
                          size="sm"
                          variant="mute"
                          pressed={isMuted}
                          onPressedChange={(pressed) => actions.muteTrack(track, pressed)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 w-6 p-0 text-[10px]"
                          aria-label="Mute"
                        >
                          M
                        </Toggle>
                      </TooltipTrigger>
                      <TooltipContent>Mute</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Toggle
                          size="sm"
                          variant="solo"
                          pressed={isSolo}
                          onPressedChange={(pressed) => actions.soloTrack(track, pressed)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 w-6 p-0 text-[10px]"
                          aria-label="Solo"
                        >
                          S
                        </Toggle>
                      </TooltipTrigger>
                      <TooltipContent>Solo</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Instrument selector */}
                <div className="mt-1.5 pl-7" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={String(track.playbackInfo.program)}
                    onValueChange={(value) => handleProgramChange(track, value)}
                  >
                    <SelectTrigger className="h-6 w-full text-[10px]">
                      <SelectValue>
                        {getInstrumentName(track.playbackInfo.program)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {MIDI_INSTRUMENTS.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.instruments.map((inst) => (
                            <SelectItem key={inst.program} value={String(inst.program)}>
                              {inst.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
