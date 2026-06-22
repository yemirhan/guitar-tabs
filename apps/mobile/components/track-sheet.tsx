import { Host, BottomSheet, Group, List, Section, HStack, Toggle, Slider, Image, Button, Text, Spacer } from '@expo/ui/swift-ui'
import {
  presentationDetents,
  presentationDragIndicator,
  presentationBackgroundInteraction
} from '@expo/ui/swift-ui/modifiers'
import type { TrackSummary } from '@gtr/shared'

interface Props {
  isPresented: boolean
  onIsPresentedChange: (v: boolean) => void
  tracks: TrackSummary[]
  selectedIndex: number
  volumes: Record<number, number>
  onSelect: (trackIndex: number) => void
  onMute: (trackIndex: number, value: boolean) => void
  onMuteAll: () => void
  onUnmuteAll: () => void
  onSolo: (trackIndex: number, value: boolean) => void
  onClearSolo: () => void
  onVolume: (trackIndex: number, value: number) => void
}

export default function TrackSheet({
  isPresented,
  onIsPresentedChange,
  tracks,
  selectedIndex,
  volumes,
  onSelect,
  onMute,
  onMuteAll,
  onUnmuteAll,
  onSolo,
  onClearSolo,
  onVolume
}: Props) {
  return (
    <Host style={{ position: 'absolute', width: 1, height: 1 }}>
      <BottomSheet isPresented={isPresented} onIsPresentedChange={onIsPresentedChange}>
        <Group
          modifiers={[
            presentationDetents(['medium', 'large']),
            presentationDragIndicator('visible'),
            // Keep the player usable while mixing tracks.
            presentationBackgroundInteraction({ type: 'enabledUpThrough', detent: 'medium' })
          ]}>
          <List>
            <Section title="Quick Actions">
              <HStack spacing={8}>
                <Button label="Mute all" systemImage="speaker.slash.fill" onPress={onMuteAll} />
                <Button label="Unmute all" systemImage="speaker.wave.2.fill" onPress={onUnmuteAll} />
              </HStack>
              <Button label="Clear solo" systemImage="person.2.slash" onPress={onClearSolo} />
            </Section>
            {tracks.map((track) => {
              const selected = track.index === selectedIndex
              return (
                <Section key={track.index} title={track.name || `Track ${track.index + 1}`}>
                  <Button onPress={() => onSelect(track.index)}>
                    <HStack spacing={8}>
                      <Image
                        systemName={selected ? 'checkmark.circle.fill' : 'circle'}
                        size={18}
                        color={selected ? '#0a84ff' : undefined}
                      />
                      <Text>{selected ? 'Showing in notation' : 'Show in notation'}</Text>
                      <Spacer />
                    </HStack>
                  </Button>
                  <HStack spacing={24}>
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
                  <HStack spacing={12}>
                    <Image systemName="speaker.wave.2.fill" size={16} />
                    <Slider
                      value={volumes[track.index] ?? 1}
                      onValueChange={(v) => onVolume(track.index, v)}
                    />
                  </HStack>
                </Section>
              )
            })}
          </List>
        </Group>
      </BottomSheet>
    </Host>
  )
}
