import { ScrollView, View, Text as RNText, Pressable, PlatformColor } from 'react-native'
import { Host, HStack, VStack, Toggle, Slider, Image } from '@expo/ui/swift-ui'
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
      style={{
        width: 320,
        borderLeftWidth: 1,
        borderLeftColor: PlatformColor('separator'),
        backgroundColor: PlatformColor('systemGroupedBackground')
      }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 12, gap: 10 }}>
      <RNText
        style={{
          fontSize: 13,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: PlatformColor('secondaryLabel'),
          marginLeft: 4,
          marginBottom: 2
        }}>
        Tracks
      </RNText>
      {tracks.map((track) => {
        const selected = track.index === selectedIndex
        return (
          <View
            key={track.index}
            style={{
              borderRadius: 14,
              borderCurve: 'continuous',
              overflow: 'hidden',
              borderWidth: selected ? 1.5 : 0,
              borderColor: PlatformColor('systemBlue'),
              backgroundColor: PlatformColor('secondarySystemGroupedBackground')
            }}>
            {/* Only the title row selects the track — SwiftUI controls must not sit
                inside a Pressable, or it swallows their gestures. */}
            <Pressable
              onPress={() => onSelect(track.index)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 12,
                paddingBottom: 8,
                backgroundColor: pressed
                  ? PlatformColor('tertiarySystemGroupedBackground')
                  : 'transparent'
              })}>
              <Host matchContents>
                <Image
                  systemName={selected ? 'waveform.circle.fill' : 'waveform.circle'}
                  size={20}
                  color={
                    selected ? PlatformColor('systemBlue') : PlatformColor('secondaryLabel')
                  }
                />
              </Host>
              <RNText
                numberOfLines={1}
                style={{ flex: 1, fontWeight: '600', color: PlatformColor('label') }}>
                {track.name || `Track ${track.index + 1}`}
              </RNText>
            </Pressable>
            <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
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
                    <Image systemName="speaker.wave.2.fill" size={14} />
                    <Slider
                      value={volumes[track.index] ?? 1}
                      onValueChange={(v) => onVolume(track.index, v)}
                    />
                  </HStack>
                </VStack>
              </Host>
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}
