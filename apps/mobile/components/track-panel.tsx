import { ScrollView, View, Text as RNText, Pressable } from 'react-native'
import { Host, HStack, VStack, Toggle, Slider, Text } from '@expo/ui/swift-ui'
import type { TrackSummary } from '@gtr/shared'

interface Props {
  tracks: TrackSummary[]
  selectedIndex: number
  volumes: Record<number, number>
  onSelect: (trackIndex: number) => void
  onMute: (trackIndex: number, value: boolean) => void
  onSolo: (trackIndex: number, value: boolean) => void
  onVolume: (trackIndex: number, value: number) => void
}

export default function TrackPanel({
  tracks,
  selectedIndex,
  volumes,
  onSelect,
  onMute,
  onSolo,
  onVolume
}: Props) {
  return (
    <ScrollView
      style={{ width: 320, borderLeftWidth: 1, borderLeftColor: 'rgba(128,128,128,0.3)' }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 12, gap: 12 }}>
      {tracks.map((track) => (
        <Pressable
          key={track.index}
          onPress={() => onSelect(track.index)}
          style={{
            padding: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor:
              track.index === selectedIndex ? 'rgba(10,132,255,0.15)' : 'rgba(128,128,128,0.08)'
          }}>
          <RNText style={{ fontWeight: '600', marginBottom: 8 }} selectable>
            {track.name || `Track ${track.index + 1}`}
          </RNText>
          <Host matchContents>
            <VStack spacing={8}>
              <HStack spacing={16}>
                <Toggle
                  label="Mute"
                  isOn={track.isMute}
                  onIsOnChange={(v) => onMute(track.index, v)}
                />
                <Toggle
                  label="Solo"
                  isOn={track.isSolo}
                  onIsOnChange={(v) => onSolo(track.index, v)}
                />
              </HStack>
              <HStack spacing={8}>
                <Text>Vol</Text>
                <Slider
                  value={volumes[track.index] ?? 1}
                  onValueChange={(v) => onVolume(track.index, v)}
                />
              </HStack>
            </VStack>
          </Host>
        </Pressable>
      ))}
    </ScrollView>
  )
}
