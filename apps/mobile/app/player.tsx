import { useMemo, useRef, useState } from 'react'
import { ActivityIndicator, View, Alert, useColorScheme } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { File, Paths } from 'expo-file-system'
import TabView from '@/components/tab-view'
import TransportBar from '@/components/transport-bar'
import TrackPanel from '@/components/track-panel'
import type { ScoreSummary, TabCommand, TabCommandEnvelope, TrackSummary } from '@gtr/shared'
import { PLAYER_STATE_PLAYING } from '@gtr/shared'

export default function Player() {
  const { file } = useLocalSearchParams<{ file: string }>()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = colorScheme === 'light' ? 'light' : 'dark'

  const seqRef = useRef(0)
  const [command, setCommand] = useState<TabCommandEnvelope | null>(null)
  const send = (cmd: TabCommand) => setCommand({ seq: ++seqRef.current, cmd })

  const [title, setTitle] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [tracks, setTracks] = useState<TrackSummary[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [volumes, setVolumes] = useState<Record<number, number>>({})
  const [tracksVisible, setTracksVisible] = useState(false)

  const fileBase64 = useMemo(() => {
    if (!file) return null
    try {
      return new File(Paths.document, 'scores', file).base64Sync()
    } catch {
      return null
    }
  }, [file])

  const onScoreLoaded = async (summary: ScoreSummary) => {
    setTitle(summary.title || file || 'Untitled')
    setTracks(summary.tracks)
    setIsLoaded(true)
  }

  const background = theme === 'dark' ? '#1a1b26' : '#ffffff'

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <Stack.Screen options={{ title }} />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          {!isLoaded && (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: background
              }}>
              <ActivityIndicator size="large" />
            </View>
          )}
          <TabView
            fileBase64={fileBase64}
            texBase64={null}
            theme={theme}
            command={command}
            onScoreLoaded={onScoreLoaded}
            onPlayerStateChanged={async (st) => setIsPlaying(st === PLAYER_STATE_PLAYING)}
            onError={async (msg) => {
              Alert.alert('Could not load tab', msg, [
                { text: 'OK', onPress: () => router.back() }
              ])
            }}
            dom={{
              style: { flex: 1 },
              scrollEnabled: false,
              mediaPlaybackRequiresUserAction: false
            }}
          />
        </View>
        {tracksVisible && (
          <TrackPanel
            tracks={tracks}
            selectedIndex={selectedIndex}
            volumes={volumes}
            onSelect={(i) => {
              setSelectedIndex(i)
              send({ type: 'selectTrack', trackIndex: i })
            }}
            onMute={(i, v) => {
              setTracks((prev) => prev.map((t) => (t.index === i ? { ...t, isMute: v } : t)))
              send({ type: 'muteTrack', trackIndex: i, value: v })
            }}
            onSolo={(i, v) => {
              setTracks((prev) => prev.map((t) => (t.index === i ? { ...t, isSolo: v } : t)))
              send({ type: 'soloTrack', trackIndex: i, value: v })
            }}
            onVolume={(i, v) => {
              setVolumes((prev) => ({ ...prev, [i]: v }))
              send({ type: 'setTrackVolume', trackIndex: i, value: v })
            }}
          />
        )}
      </View>
      <View style={{ position: 'absolute', bottom: 24, alignSelf: 'center' }} pointerEvents="box-none">
        <TransportBar
          isPlaying={isPlaying}
          speed={speed}
          zoom={zoom}
          tracksVisible={tracksVisible}
          onPlayPause={() => send({ type: 'playPause' })}
          onStop={() => send({ type: 'stop' })}
          onSpeedChange={(s) => {
            setSpeed(s)
            send({ type: 'setTempo', value: s })
          }}
          onZoomChange={(z) => {
            setZoom(z)
            send({ type: 'setZoom', value: z })
          }}
          onToggleTracks={() => setTracksVisible((v) => !v)}
        />
      </View>
    </View>
  )
}
