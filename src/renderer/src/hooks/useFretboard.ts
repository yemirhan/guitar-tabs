import { useState, useEffect, useRef } from 'react'
import * as alphaTab from '@coderline/alphatab'

export interface FretPosition {
  string: number
  fret: number
}

interface UseFretboardResult {
  activeNotes: FretPosition[]
  tuning: number[]
  numStrings: number
  numFrets: number
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiToNoteName(midi: number): string {
  return NOTE_NAMES[midi % 12] + Math.floor(midi / 12 - 1)
}

export function useFretboard(
  api: alphaTab.AlphaTabApi | null,
  selectedTracks: alphaTab.model.Track[]
): UseFretboardResult {
  const [activeNotes, setActiveNotes] = useState<FretPosition[]>([])
  const apiRef = useRef(api)
  apiRef.current = api

  const track = selectedTracks[0] ?? null
  const tuning = track?.staves[0]?.tuning ?? []
  const numStrings = tuning.length || 6
  const numFrets = 22

  useEffect(() => {
    if (!api) return

    const onActiveBeatsChanged = (e: alphaTab.ActiveBeatsChangedEventArgs) => {
      const notes: FretPosition[] = []
      for (const beat of e.activeBeats) {
        for (const note of beat.notes) {
          notes.push({ string: note.string, fret: note.fret })
        }
      }
      setActiveNotes(notes)
    }

    api.activeBeatsChanged.on(onActiveBeatsChanged)

    return () => {
      api.activeBeatsChanged.off(onActiveBeatsChanged)
    }
  }, [api])

  return { activeNotes, tuning: [...tuning], numStrings, numFrets }
}
