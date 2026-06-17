import { useMemo, useRef, useState } from 'react'
import { ActivityIndicator, View, Alert, useColorScheme } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { File, Paths } from 'expo-file-system'
import TabView from '@/components/tab-view'
import TrackSheet from '@/components/track-sheet'
import PracticeSheet from '@/components/practice-sheet'
import type { PracticeConfig, ScoreSummary, TabCommand, TabCommandEnvelope, TrackSummary } from '@gtr/shared'
import { PLAYER_STATE_PLAYING, MIN_ZOOM, MAX_ZOOM } from '@gtr/shared'

const SPEED_PRESETS = [0.25, 0.5, 0.75, 0.9, 1, 1.25, 1.5, 2]

export default function Player() {
  const { file } = useLocalSearchParams<{ file: string }>()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = colorScheme === 'light' ? 'light' : 'dark'
  const insets = useSafeAreaInsets()
  // Status bar + the floating glass nav bar the notation scrolls under.
  const topInset = insets.top + 56

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
  const [practiceVisible, setPracticeVisible] = useState(false)
  const [barCount, setBarCount] = useState(0)
  const [practiceLooping, setPracticeLooping] = useState(false)
  const [loopCount, setLoopCount] = useState(0)
  const [loopTempo, setLoopTempo] = useState(0.75)
  const [practiceConfig, setPracticeConfig] = useState<PracticeConfig>({
    startBar: 1,
    endBar: 4,
    loopTempo: 0.75,
    gradualIncrease: false,
    tempoIncrement: 0.05,
    maxTempo: 1,
    countIn: true
  })

  const fileBase64 = useMemo(() => {
    if (!file) return null
    try {
      return new File(Paths.document, 'scores', file).base64Sync()
    } catch {
      return null
    }
  }, [file])

  // In release the DOM page is a file:// document and WKWebView blocks fetch/XHR of file://
  // resources. A blob worker also can't import (or importScripts) the core cross-origin from
  // a null-origin document. So read the self-contained UMD build (which auto-initializes in a
  // worker with no imports) + the soundfont natively from the app bundle and hand them to the
  // webview as bytes. In dev/web these reads fail (assets are served over http) and we pass
  // null, so the webview keeps loading them by URL as before.
  const domAssets = useMemo(() => {
    try {
      const workerUmd = new File(Paths.bundle, 'www.bundle', 'vendor', 'alphaTab.min.js').base64Sync()
      const soundFont = new File(Paths.bundle, 'www.bundle', 'soundfont', 'sonivox.sf2').base64Sync()
      return { workerUmd, soundFont }
    } catch {
      return null
    }
  }, [])

  const onScoreLoaded = async (summary: ScoreSummary) => {
    setTitle(summary.title || file || 'Untitled')
    setTracks(summary.tracks)
    setBarCount(summary.barCount ?? 0)
    setIsLoaded(true)
  }

  const startPractice = () => {
    setPracticeLooping(true)
    setLoopCount(0)
    setLoopTempo(practiceConfig.loopTempo)
    send({ type: 'practiceStart', config: practiceConfig })
  }

  const stopPractice = () => {
    setPracticeLooping(false)
    setLoopCount(0)
    send({ type: 'practiceStop' })
  }

  const changeSpeed = (s: number) => {
    setSpeed(s)
    send({ type: 'setTempo', value: s })
  }

  const changeZoom = (z: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
    setZoom(clamped)
    send({ type: 'setZoom', value: clamped })
  }

  const background = theme === 'dark' ? '#1a1b26' : '#ffffff'

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <Stack.Screen options={{ title, headerTransparent: true }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="sidebar.trailing"
          accessibilityLabel="Toggle track panel"
          selected={tracksVisible}
          onPress={() => setTracksVisible((v) => !v)}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.Button
          icon={isPlaying ? 'pause.fill' : 'play.fill'}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          variant="prominent"
          onPress={() => send({ type: 'playPause' })}
        />
        <Stack.Toolbar.Button
          icon="stop.fill"
          accessibilityLabel="Stop"
          onPress={() => send({ type: 'stop' })}
        />
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Menu title={`${Math.round(speed * 100)}%`} icon="gauge.with.needle">
          {SPEED_PRESETS.map((s) => (
            <Stack.Toolbar.MenuAction key={s} isOn={speed === s} onPress={() => changeSpeed(s)}>
              {`${Math.round(s * 100)}%`}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button
          icon="repeat"
          accessibilityLabel="Practice mode"
          selected={practiceLooping || practiceVisible}
          onPress={() => setPracticeVisible((v) => !v)}
        />
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button
          icon="minus.magnifyingglass"
          accessibilityLabel="Zoom out"
          onPress={() => changeZoom(zoom - 0.1)}
        />
        <Stack.Toolbar.Button
          icon="plus.magnifyingglass"
          accessibilityLabel="Zoom in"
          onPress={() => changeZoom(zoom + 0.1)}
        />
      </Stack.Toolbar>
      <View style={{ flex: 1 }}>
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
            workerUmdBase64={domAssets?.workerUmd ?? null}
            soundFontBase64={domAssets?.soundFont ?? null}
            theme={theme}
            topInset={topInset}
            command={command}
            onScoreLoaded={onScoreLoaded}
            onPlayerStateChanged={async (st) => setIsPlaying(st === PLAYER_STATE_PLAYING)}
            onPracticeLoop={async (count, tempo) => {
              setLoopCount(count)
              setLoopTempo(tempo)
            }}
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
        <TrackSheet
          isPresented={tracksVisible}
          onIsPresentedChange={setTracksVisible}
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
        <PracticeSheet
          isPresented={practiceVisible}
          onIsPresentedChange={setPracticeVisible}
          config={practiceConfig}
          onConfigChange={setPracticeConfig}
          barCount={barCount}
          isLooping={practiceLooping}
          loopCount={loopCount}
          currentTempo={loopTempo}
          onStart={startPractice}
          onStop={stopPractice}
        />
      </View>
    </View>
  )
}
