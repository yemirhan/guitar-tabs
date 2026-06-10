import { useRef, useState } from 'react'
import { View, Alert } from 'react-native'
import { Host, HStack, Button } from '@expo/ui/swift-ui'
import TabView from '@/components/tab-view'
import type { TabCommand, TabCommandEnvelope } from '@gtr/shared'

const DEMO_TEX = `\\title "Smoke Test"
.
\\track "Guitar"
\\tuning e5 b4 g4 d4 a3 e3
3.3 5.3 7.3 8.3 | 7.3 5.3 3.3.8 0.3.8`

export default function Smoke() {
  const seqRef = useRef(0)
  const [command, setCommand] = useState<TabCommandEnvelope | null>(null)
  const send = (cmd: TabCommand) => setCommand({ seq: ++seqRef.current, cmd })

  return (
    <View style={{ flex: 1 }}>
      <TabView
        fileBase64={null}
        texBase64={btoa(DEMO_TEX)}
        theme="light"
        command={command}
        onScoreLoaded={async (s) => console.log('score loaded:', s.title, s.tracks.length)}
        onPlayerStateChanged={async (st) => console.log('player state:', st)}
        onError={async (msg) => Alert.alert('alphaTab error', msg)}
        dom={{
          style: { flex: 1 },
          scrollEnabled: false,
          mediaPlaybackRequiresUserAction: false
        }}
      />
      <Host matchContents>
        <HStack spacing={24}>
          <Button systemImage="play.fill" label="Play" onPress={() => send({ type: 'playPause' })} />
          <Button systemImage="stop.fill" label="Stop" onPress={() => send({ type: 'stop' })} />
        </HStack>
      </Host>
    </View>
  )
}
