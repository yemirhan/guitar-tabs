import { Host, BottomSheet, Group, List, Section, HStack, Toggle, Slider, Stepper, Button, Text, Spacer, Image } from '@expo/ui/swift-ui'
import { buttonStyle, font } from '@expo/ui/swift-ui/modifiers'
import {
  presentationDetents,
  presentationDragIndicator,
  presentationBackgroundInteraction
} from '@expo/ui/swift-ui/modifiers'
import type { PracticeConfig } from '@gtr/shared'

interface Props {
  isPresented: boolean
  onIsPresentedChange: (v: boolean) => void
  config: PracticeConfig
  onConfigChange: (config: PracticeConfig) => void
  barCount: number
  isLooping: boolean
  loopCount: number
  currentTempo: number
  onStart: () => void
  onStop: () => void
}

export default function PracticeSheet({
  isPresented,
  onIsPresentedChange,
  config,
  onConfigChange,
  barCount,
  isLooping,
  loopCount,
  currentTempo,
  onStart,
  onStop
}: Props) {
  const set = (patch: Partial<PracticeConfig>) => onConfigChange({ ...config, ...patch })

  return (
    <Host style={{ position: 'absolute', width: 1, height: 1 }}>
      <BottomSheet isPresented={isPresented} onIsPresentedChange={onIsPresentedChange}>
        <Group
          modifiers={[
            presentationDetents(['medium', 'large']),
            presentationDragIndicator('visible'),
            // Keep playback audible/controllable while adjusting the loop.
            presentationBackgroundInteraction({ type: 'enabledUpThrough', detent: 'medium' })
          ]}>
          <List>
            <Section title="Loop range">
              <Stepper
                label={`Start bar: ${config.startBar}`}
                value={config.startBar}
                min={1}
                max={barCount || 1}
                onValueChange={(v) =>
                  set({ startBar: v, endBar: Math.max(v, config.endBar) })
                }
              />
              <Stepper
                label={`End bar: ${config.endBar}`}
                value={config.endBar}
                min={config.startBar}
                max={barCount || 1}
                onValueChange={(v) => set({ endBar: v })}
              />
            </Section>
            <Section title="Tempo">
              <HStack spacing={12}>
                <Text>{`Speed ${Math.round(config.loopTempo * 100)}%`}</Text>
                <Slider
                  value={config.loopTempo}
                  min={0.25}
                  max={1.5}
                  onValueChange={(v) => set({ loopTempo: Math.round(v * 20) / 20 })}
                />
              </HStack>
              <Toggle
                label="Speed up each loop"
                isOn={config.gradualIncrease}
                onIsOnChange={(v) => set({ gradualIncrease: v })}
              />
              {config.gradualIncrease && (
                <>
                  <Stepper
                    label={`Increase: ${Math.round(config.tempoIncrement * 100)}%`}
                    value={Math.round(config.tempoIncrement * 100)}
                    min={1}
                    max={25}
                    onValueChange={(v) => set({ tempoIncrement: v / 100 })}
                  />
                  <Stepper
                    label={`Up to: ${Math.round(config.maxTempo * 100)}%`}
                    value={Math.round(config.maxTempo * 100)}
                    min={Math.round(config.loopTempo * 100)}
                    max={200}
                    step={5}
                    onValueChange={(v) => set({ maxTempo: v / 100 })}
                  />
                </>
              )}
            </Section>
            <Section title="Options">
              <Toggle
                label="Count-in"
                isOn={config.countIn}
                onIsOnChange={(v) => set({ countIn: v })}
              />
            </Section>
            <Section>
              {isLooping ? (
                <>
                  <HStack spacing={8}>
                    <Image systemName="repeat" size={16} color="#34c759" />
                    <Text>{`Loop ${loopCount} · ${Math.round(currentTempo * 100)}%`}</Text>
                    <Spacer />
                  </HStack>
                  <Button
                    label="Stop Practice"
                    systemImage="stop.fill"
                    role="destructive"
                    onPress={onStop}
                  />
                </>
              ) : (
                <Button
                  label="Start Practice Loop"
                  systemImage="play.fill"
                  onPress={onStart}
                  modifiers={[buttonStyle('borderedProminent'), font({ weight: 'semibold' })]}
                />
              )}
            </Section>
          </List>
        </Group>
      </BottomSheet>
    </Host>
  )
}
