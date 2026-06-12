import { useState, useEffect, useMemo, useRef } from 'react'
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
  // activeBeatsChanged fires for ALL tracks; only the displayed track's notes
  // belong on this fretboard. Ref keeps the subscription stable across renders.
  const trackIndexRef = useRef<number | null>(null)
  trackIndexRef.current = track?.index ?? null
  // Stable reference: a new array every render makes consumers' effect deps
  // (e.g. useActiveChord) re-run each render, and alphaTab replays the last
  // activeBeatsChanged event synchronously on every .on(), causing an
  // infinite setState loop during playback.
  const tuning = useMemo(() => [...(track?.staves[0]?.tuning ?? [])], [track])
  const numStrings = tuning.length || 6
  const numFrets = 22

  useEffect(() => {
    if (!api) return

    const onActiveBeatsChanged = (e: alphaTab.ActiveBeatsChangedEventArgs) => {
      const notes: FretPosition[] = []
      for (const beat of e.activeBeats) {
        if (beat.voice.bar.staff.track.index !== trackIndexRef.current) continue
        for (const note of beat.notes) {
          // Percussion/unfretted notes report string=-1 / fret=-1
          if (!note.isStringed || note.string < 1 || note.fret < 0) continue
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

  return { activeNotes, tuning, numStrings, numFrets }
}
