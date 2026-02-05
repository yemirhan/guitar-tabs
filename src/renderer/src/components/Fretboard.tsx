import { memo, useMemo } from 'react'
import { FretPosition, midiToNoteName } from '@/hooks/useFretboard'

interface FretboardProps {
  activeNotes: FretPosition[]
  tuning: number[]
  numStrings: number
  numFrets: number
}

const FRET_MARKERS = [3, 5, 7, 9, 15]
const DOUBLE_MARKER = 12

const FRET_WIDTH = 50
const STRING_SPACING = 20
const NUT_WIDTH = 6
const LABEL_WIDTH = 36
const PADDING_Y = 16

const StaticElements = memo(function StaticElements({
  numStrings,
  numFrets,
  tuning
}: {
  numStrings: number
  numFrets: number
  tuning: number[]
}) {
  const totalWidth = LABEL_WIDTH + NUT_WIDTH + numFrets * FRET_WIDTH
  const totalHeight = (numStrings - 1) * STRING_SPACING + PADDING_Y * 2

  const frets = []
  const markers = []
  const strings = []
  const labels = []

  // Fret lines
  for (let f = 0; f <= numFrets; f++) {
    const x = LABEL_WIDTH + NUT_WIDTH + f * FRET_WIDTH
    frets.push(
      <line
        key={`fret-${f}`}
        x1={x}
        y1={PADDING_Y}
        x2={x}
        y2={totalHeight - PADDING_Y}
        stroke="var(--border-default)"
        strokeWidth={f === 0 ? 0 : 1}
      />
    )
  }

  // Fret markers
  const midY = totalHeight / 2
  for (let f = 1; f <= numFrets; f++) {
    const cx = LABEL_WIDTH + NUT_WIDTH + (f - 0.5) * FRET_WIDTH
    if (f === DOUBLE_MARKER) {
      markers.push(
        <circle key={`marker-${f}-a`} cx={cx} cy={midY - STRING_SPACING * 1.2} r={4} fill="var(--text-dim)" opacity={0.3} />,
        <circle key={`marker-${f}-b`} cx={cx} cy={midY + STRING_SPACING * 1.2} r={4} fill="var(--text-dim)" opacity={0.3} />
      )
    } else if (FRET_MARKERS.includes(f)) {
      markers.push(
        <circle key={`marker-${f}`} cx={cx} cy={midY} r={4} fill="var(--text-dim)" opacity={0.3} />
      )
    }
  }

  // Nut
  frets.push(
    <rect
      key="nut"
      x={LABEL_WIDTH}
      y={PADDING_Y}
      width={NUT_WIDTH}
      height={(numStrings - 1) * STRING_SPACING}
      fill="var(--text-dim)"
      rx={1}
    />
  )

  // Strings and labels (reversed: string 1 = highest pitch = top)
  for (let s = 0; s < numStrings; s++) {
    const y = PADDING_Y + s * STRING_SPACING
    // alphaTab string numbering: 1 = lowest pitch, so reverse for display
    const stringIndex = numStrings - 1 - s
    strings.push(
      <line
        key={`string-${s}`}
        x1={LABEL_WIDTH + NUT_WIDTH}
        y1={y}
        x2={totalWidth}
        y2={y}
        stroke="var(--border-default)"
        strokeWidth={1 + s * 0.2}
        opacity={0.6}
      />
    )

    if (tuning[stringIndex] !== undefined) {
      labels.push(
        <text
          key={`label-${s}`}
          x={LABEL_WIDTH - 6}
          y={y}
          textAnchor="end"
          dominantBaseline="central"
          fill="var(--text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {midiToNoteName(tuning[stringIndex])}
        </text>
      )
    }
  }

  // Fret numbers
  for (let f = 1; f <= numFrets; f += 2) {
    const x = LABEL_WIDTH + NUT_WIDTH + (f - 0.5) * FRET_WIDTH
    frets.push(
      <text
        key={`fretnum-${f}`}
        x={x}
        y={totalHeight - 2}
        textAnchor="middle"
        fill="var(--text-dim)"
        fontSize={8}
        fontFamily="var(--font-mono)"
        opacity={0.5}
      >
        {f}
      </text>
    )
  }

  return (
    <>
      {frets}
      {markers}
      {strings}
      {labels}
    </>
  )
})

export const Fretboard = memo(function Fretboard({
  activeNotes,
  tuning,
  numStrings,
  numFrets
}: FretboardProps) {
  const totalWidth = LABEL_WIDTH + NUT_WIDTH + numFrets * FRET_WIDTH
  const totalHeight = (numStrings - 1) * STRING_SPACING + PADDING_Y * 2

  const noteCircles = useMemo(() => {
    return activeNotes.map((note, i) => {
      // alphaTab string 1 = lowest pitch, display: bottom = lowest
      const displayRow = numStrings - note.string
      const y = PADDING_Y + displayRow * STRING_SPACING
      const x =
        note.fret === 0
          ? LABEL_WIDTH + NUT_WIDTH / 2
          : LABEL_WIDTH + NUT_WIDTH + (note.fret - 0.5) * FRET_WIDTH

      return (
        <circle
          key={`${note.string}-${note.fret}-${i}`}
          cx={x}
          cy={y}
          r={7}
          fill="var(--accent-primary)"
          opacity={0.9}
          className="transition-all duration-100"
        >
          <animate attributeName="r" from="4" to="7" dur="0.1s" fill="freeze" />
        </circle>
      )
    })
  }, [activeNotes, numStrings])

  return (
    <div className="overflow-x-auto">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="no-theme-transition"
      >
        <StaticElements numStrings={numStrings} numFrets={numFrets} tuning={tuning} />
        {noteCircles}
      </svg>
    </div>
  )
})
