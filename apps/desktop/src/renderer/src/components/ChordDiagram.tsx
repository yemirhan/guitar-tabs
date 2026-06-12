import { memo } from 'react'
import type { ActiveChord } from '@/hooks/useActiveChord'

interface ChordDiagramProps {
  chord: ActiveChord
  numStrings?: number
}

const STRING_SPACING = 16
const FRET_SPACING = 22
const FRETS_SHOWN = 5
const PADDING_X = 20
const PADDING_TOP = 32
const NUT_HEIGHT = 4

export const ChordDiagram = memo(function ChordDiagram({
  chord,
  numStrings = 6
}: ChordDiagramProps) {
  const width = PADDING_X * 2 + (numStrings - 1) * STRING_SPACING
  const height = PADDING_TOP + FRETS_SHOWN * FRET_SPACING + 24

  const isAtNut = chord.firstFret <= 1
  const baseFret = isAtNut ? 1 : chord.firstFret

  const elements = []

  // Chord name
  elements.push(
    <text
      key="name"
      x={width / 2}
      y={14}
      textAnchor="middle"
      fill="var(--text-primary)"
      fontSize={13}
      fontWeight={600}
      fontFamily="var(--font-display)"
    >
      {chord.name}
    </text>
  )

  // Nut or fret number
  if (isAtNut) {
    elements.push(
      <rect
        key="nut"
        x={PADDING_X}
        y={PADDING_TOP}
        width={(numStrings - 1) * STRING_SPACING}
        height={NUT_HEIGHT}
        fill="var(--text-primary)"
        rx={1}
      />
    )
  } else {
    elements.push(
      <text
        key="fret-num"
        x={PADDING_X - 8}
        y={PADDING_TOP + FRET_SPACING / 2 + 4}
        textAnchor="end"
        fill="var(--text-dim)"
        fontSize={10}
        fontFamily="var(--font-mono)"
      >
        {baseFret}
      </text>
    )
  }

  // Fret lines
  for (let f = 0; f <= FRETS_SHOWN; f++) {
    const y = PADDING_TOP + NUT_HEIGHT + f * FRET_SPACING
    elements.push(
      <line
        key={`fret-${f}`}
        x1={PADDING_X}
        y1={y}
        x2={PADDING_X + (numStrings - 1) * STRING_SPACING}
        y2={y}
        stroke="var(--border-default)"
        strokeWidth={1}
      />
    )
  }

  // String lines
  for (let s = 0; s < numStrings; s++) {
    const x = PADDING_X + s * STRING_SPACING
    elements.push(
      <line
        key={`string-${s}`}
        x1={x}
        y1={PADDING_TOP + NUT_HEIGHT}
        x2={x}
        y2={PADDING_TOP + NUT_HEIGHT + FRETS_SHOWN * FRET_SPACING}
        stroke="var(--border-default)"
        strokeWidth={1}
      />
    )
  }

  // Barre lines
  for (const barreFret of chord.barreFrets) {
    const relFret = barreFret - baseFret + 1
    if (relFret < 1 || relFret > FRETS_SHOWN) continue
    const y = PADDING_TOP + NUT_HEIGHT + (relFret - 0.5) * FRET_SPACING
    // Find leftmost and rightmost strings that are part of barre
    let leftStr = numStrings - 1
    let rightStr = 0
    for (let s = 0; s < chord.strings.length; s++) {
      if (chord.strings[s] === barreFret) {
        leftStr = Math.min(leftStr, s)
        rightStr = Math.max(rightStr, s)
      }
    }
    elements.push(
      <line
        key={`barre-${barreFret}`}
        x1={PADDING_X + leftStr * STRING_SPACING}
        y1={y}
        x2={PADDING_X + rightStr * STRING_SPACING}
        y2={y}
        stroke="var(--text-primary)"
        strokeWidth={6}
        strokeLinecap="round"
      />
    )
  }

  // String markers (X, O, or fret dots)
  for (let s = 0; s < numStrings && s < chord.strings.length; s++) {
    const fretValue = chord.strings[s]
    const x = PADDING_X + s * STRING_SPACING

    if (fretValue === -1) {
      // Muted string
      const y = PADDING_TOP - 6
      elements.push(
        <text
          key={`mute-${s}`}
          x={x}
          y={y}
          textAnchor="middle"
          fill="var(--text-dim)"
          fontSize={11}
          fontWeight={700}
        >
          X
        </text>
      )
    } else if (fretValue === 0) {
      // Open string
      const y = PADDING_TOP - 6
      elements.push(
        <circle
          key={`open-${s}`}
          cx={x}
          cy={y - 4}
          r={4}
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth={1.5}
        />
      )
    } else {
      // Fingered fret
      const relFret = fretValue - baseFret + 1
      if (relFret >= 1 && relFret <= FRETS_SHOWN) {
        const y = PADDING_TOP + NUT_HEIGHT + (relFret - 0.5) * FRET_SPACING
        elements.push(
          <circle
            key={`dot-${s}`}
            cx={x}
            cy={y}
            r={6}
            fill="var(--accent-primary)"
          />
        )
      }
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="no-theme-transition">
      {elements}
    </svg>
  )
})
