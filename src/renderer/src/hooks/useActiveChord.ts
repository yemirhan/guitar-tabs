import { useState, useEffect } from 'react'
import * as alphaTab from '@coderline/alphatab'

export interface ActiveChord {
  name: string
  firstFret: number
  strings: number[]
  barreFrets: number[]
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function detectChordName(midiNotes: number[]): string {
  if (midiNotes.length === 0) return ''
  const pitchClasses = [...new Set(midiNotes.map((n) => n % 12))].sort((a, b) => a - b)
  if (pitchClasses.length < 2) return NOTE_NAMES[pitchClasses[0]]

  // Use the lowest note as the root
  const root = midiNotes.reduce((a, b) => (a < b ? a : b)) % 12
  const intervals = pitchClasses.map((p) => (p - root + 12) % 12).sort((a, b) => a - b)
  const has = (i: number) => intervals.includes(i)

  const rootName = NOTE_NAMES[root]

  // Major: 0,4,7
  if (has(4) && has(7) && !has(3) && !has(10)) return rootName
  // Minor: 0,3,7
  if (has(3) && has(7) && !has(4)) return rootName + 'm'
  // Dominant 7: 0,4,7,10
  if (has(4) && has(7) && has(10)) return rootName + '7'
  // Minor 7: 0,3,7,10
  if (has(3) && has(7) && has(10)) return rootName + 'm7'
  // Major 7: 0,4,7,11
  if (has(4) && has(7) && has(11)) return rootName + 'maj7'
  // Diminished: 0,3,6
  if (has(3) && has(6) && !has(7)) return rootName + 'dim'
  // Augmented: 0,4,8
  if (has(4) && has(8)) return rootName + 'aug'
  // Sus4: 0,5,7
  if (has(5) && has(7) && !has(3) && !has(4)) return rootName + 'sus4'
  // Sus2: 0,2,7
  if (has(2) && has(7) && !has(3) && !has(4)) return rootName + 'sus2'
  // Power chord: 0,7
  if (has(7) && pitchClasses.length === 2) return rootName + '5'

  return rootName
}

export function useActiveChord(
  api: alphaTab.AlphaTabApi | null,
  tuning: number[]
): ActiveChord | null {
  const [chord, setChord] = useState<ActiveChord | null>(null)

  useEffect(() => {
    if (!api) return

    const onActiveBeatsChanged = (e: alphaTab.ActiveBeatsChangedEventArgs) => {
      // First check for explicit chord annotation
      for (const beat of e.activeBeats) {
        if (beat.chord) {
          const c = beat.chord
          setChord({
            name: c.name,
            firstFret: c.firstFret,
            strings: c.strings ? [...c.strings] : [],
            barreFrets: c.barreFrets ? [...c.barreFrets] : []
          })
          return
        }
      }

      // Build chord from active notes
      const numStrings = tuning.length || 6
      const strings: number[] = new Array(numStrings).fill(-1)
      const midiNotes: number[] = []

      for (const beat of e.activeBeats) {
        for (const note of beat.notes) {
          const strIdx = note.string - 1
          if (strIdx >= 0 && strIdx < numStrings) {
            strings[strIdx] = note.fret
            if (tuning[strIdx] !== undefined) {
              midiNotes.push(tuning[strIdx] + note.fret)
            }
          }
        }
      }

      if (midiNotes.length < 2) {
        // Not enough notes for a chord — keep last chord displayed
        return
      }

      const fretValues = strings.filter((f) => f > 0)
      const firstFret = fretValues.length > 0 ? Math.min(...fretValues) : 1
      const name = detectChordName(midiNotes)

      setChord({ name, firstFret, strings, barreFrets: [] })
    }

    api.activeBeatsChanged.on(onActiveBeatsChanged)

    return () => {
      api.activeBeatsChanged.off(onActiveBeatsChanged)
    }
  }, [api, tuning])

  return chord
}
