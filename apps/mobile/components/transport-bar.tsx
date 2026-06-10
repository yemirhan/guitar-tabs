import { Host, HStack, Button, Slider, Text, Spacer } from '@expo/ui/swift-ui'
import { MIN_ZOOM, MAX_ZOOM } from '@gtr/shared'

interface Props {
  isPlaying: boolean
  speed: number
  zoom: number
  tracksVisible: boolean
  onPlayPause: () => void
  onStop: () => void
  onSpeedChange: (speed: number) => void
  onZoomChange: (zoom: number) => void
  onToggleTracks: () => void
}

const MIN_SPEED = 0.25
const MAX_SPEED = 2.0

export default function TransportBar({
  isPlaying,
  speed,
  zoom,
  tracksVisible,
  onPlayPause,
  onStop,
  onSpeedChange,
  onZoomChange,
  onToggleTracks
}: Props) {
  return (
    <Host matchContents>
      <HStack spacing={16}>
        <Button
          systemImage={isPlaying ? 'pause.fill' : 'play.fill'}
          label={isPlaying ? 'Pause' : 'Play'}
          onPress={onPlayPause}
        />
        <Button systemImage="stop.fill" label="Stop" onPress={onStop} />
        <Spacer />
        <Text>{`${Math.round(speed * 100)}%`}</Text>
        <Slider
          value={speed}
          min={MIN_SPEED}
          max={MAX_SPEED}
          onValueChange={(v) => onSpeedChange(Math.round(v * 20) / 20)} // snap to 5% steps
        />
        <Spacer />
        <Button
          systemImage="minus.magnifyingglass"
          label="Out"
          onPress={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 0.1))}
        />
        <Button
          systemImage="plus.magnifyingglass"
          label="In"
          onPress={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 0.1))}
        />
        <Button
          systemImage={tracksVisible ? 'sidebar.trailing' : 'music.note.list'}
          label="Tracks"
          onPress={onToggleTracks}
        />
      </HStack>
    </Host>
  )
}
