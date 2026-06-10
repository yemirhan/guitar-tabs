import { Host, HStack, Button, Slider, Text, GlassEffectContainer } from '@expo/ui/swift-ui'
import { buttonStyle, font, frame, glassEffect, padding } from '@expo/ui/swift-ui/modifiers'
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
      <GlassEffectContainer spacing={12}>
        <HStack spacing={12} modifiers={[glassEffect({ shape: 'capsule' }), padding({ horizontal: 16, vertical: 8 })]}>
          <Button
            systemImage={isPlaying ? 'pause.fill' : 'play.fill'}
            label={isPlaying ? 'Pause' : 'Play'}
            onPress={onPlayPause}
            modifiers={[buttonStyle('glassProminent')]}
          />
          <Button
            systemImage="stop.fill"
            label="Stop"
            onPress={onStop}
            modifiers={[buttonStyle('glass')]}
          />
          <Text
            modifiers={[font({ size: 15, weight: 'medium', design: 'monospaced' }), frame({ width: 52 })]}>
            {`${Math.round(speed * 100)}%`}
          </Text>
          <Slider
            value={speed}
            min={MIN_SPEED}
            max={MAX_SPEED}
            onValueChange={(v) => onSpeedChange(Math.round(v * 20) / 20)} // snap to 5% steps
            modifiers={[frame({ width: 160 })]}
          />
          <Button
            systemImage="minus.magnifyingglass"
            onPress={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 0.1))}
            modifiers={[buttonStyle('glass')]}
          />
          <Button
            systemImage="plus.magnifyingglass"
            onPress={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 0.1))}
            modifiers={[buttonStyle('glass')]}
          />
          <Button
            systemImage={tracksVisible ? 'sidebar.trailing' : 'music.note.list'}
            label="Tracks"
            onPress={onToggleTracks}
            modifiers={[buttonStyle('glass')]}
          />
        </HStack>
      </GlassEffectContainer>
    </Host>
  )
}
