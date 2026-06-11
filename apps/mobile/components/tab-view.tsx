'use dom'

import { useEffect, useRef } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { useAlphaTab } from '@gtr/shared/web'
import type { PracticeConfig, ScoreSummary, TabCommandEnvelope } from '@gtr/shared'

interface Props {
  fileBase64: string | null
  /** Base64-encoded alphaTex. Raw tex must not ride initial props: react-native-webview
   *  inlines them into a JS template literal, which mangles backslashes and quotes. */
  texBase64: string | null
  theme: 'light' | 'dark'
  /** Space reserved for a transparent native header; content scrolls under it. */
  topInset?: number
  command: TabCommandEnvelope | null
  onScoreLoaded: (summary: ScoreSummary) => Promise<void>
  onPlayerStateChanged: (playerState: number) => Promise<void>
  /** Reports each completed practice loop with the (possibly increased) tempo. */
  onPracticeLoop?: (loopCount: number, tempo: number) => Promise<void>
  onError: (message: string) => Promise<void>
  dom?: import('expo/dom').DOMProps
}

// Metro has no alphaTab bundler plugin, so alphaTab's synth-worker URL attempts all
// point into the bundle URL space (or blob wrappers around it) and 404 silently.
// Redirect every alphaTab worker request to the copies served from public/vendor/
// (alphaTab.worker.mjs imports ./alphaTab.core.mjs from the same directory).
// alphaTab is the only worker creator in this webview.
if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
  const NativeWorker = Worker
  ;(window as any).Worker = class extends NativeWorker {
    constructor(url: string | URL, opts?: WorkerOptions) {
      const s = String(url)
      if (s.includes('alphaTab.worker') || s.startsWith('blob:')) {
        super(new URL('/vendor/alphaTab.worker.mjs', window.location.href), { type: 'module' })
      } else {
        super(url, opts)
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) =>
    console.warn('[tab-view] window error:', e.message, e.filename, e.lineno)
  )
  window.addEventListener('unhandledrejection', (e) =>
    console.warn('[tab-view] unhandled rejection:', String(e.reason))
  )
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export default function TabView({
  fileBase64,
  texBase64,
  theme,
  topInset = 0,
  command,
  onScoreLoaded,
  onPlayerStateChanged,
  onPracticeLoop,
  onError
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const lastSeq = useRef(0)
  // Practice loop state lives in a ref: playerFinished fires from alphaTab and
  // must see current values without re-subscribing.
  const practiceRef = useRef<{ config: PracticeConfig; tempo: number; loops: number } | null>(null)
  const savedTempoRef = useRef(1)

  const [state, actions] = useAlphaTab(containerRef, viewportRef, theme, {
    // Absolute paths: the DOM component page lives at a deep URL, but public/ is served at the site root.
    fontDirectory: '/font/',
    soundFontUrl: '/soundfont/sonivox.sf2',
    useWorkers: false,
    // Metro cannot bundle alphaTab's audio worklet; script-processor audio runs on the main thread.
    outputMode: alphaTab.PlayerOutputMode.WebAudioScriptProcessor,
    scrollOffsetY: -(topInset + 30)
  })

  useEffect(() => {
    if (fileBase64) {
      actions.loadFile(base64ToBytes(fileBase64))
    } else if (texBase64) {
      actions.loadTex(new TextDecoder().decode(base64ToBytes(texBase64)))
    }
    // actions identity is stable enough for load-on-change; deliberately not a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileBase64, texBase64, state.api])

  useEffect(() => {
    const api = state.api
    if (!api) return
    const handler = (e: unknown) => {
      onError(String((e as Error)?.message ?? e))
    }
    api.error.on(handler)
    return () => {
      api.error.off(handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.api])

  // Practice mode: gradual tempo increase on each completed loop.
  useEffect(() => {
    const api = state.api
    if (!api) return
    const onPlayerFinished = () => {
      const practice = practiceRef.current
      if (!practice) return
      practice.loops += 1
      if (practice.config.gradualIncrease) {
        practice.tempo = Math.min(practice.tempo + practice.config.tempoIncrement, practice.config.maxTempo)
        actions.setTempo(practice.tempo)
      }
      onPracticeLoop?.(practice.loops, practice.tempo)
    }
    api.playerFinished.on(onPlayerFinished)
    return () => {
      api.playerFinished.off(onPlayerFinished)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.api])

  useEffect(() => {
    if (!state.score) return
    onScoreLoaded({
      title: state.score.title,
      artist: state.score.artist,
      barCount: state.score.masterBars.length,
      tracks: state.tracks.map((t) => ({
        index: t.index,
        name: t.name,
        isMute: t.playbackInfo.isMute,
        isSolo: t.playbackInfo.isSolo
      }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.score, state.tracks])

  useEffect(() => {
    onPlayerStateChanged(state.playerState as number)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playerState])

  const startPractice = (config: PracticeConfig) => {
    const api = actions.getApi()
    const score = api?.score
    if (!score) return
    const totalBars = score.masterBars.length
    const startIdx = Math.min(Math.max(0, config.startBar - 1), totalBars - 1)
    const endIdx = Math.min(Math.max(startIdx, config.endBar - 1), totalBars - 1)
    const startTick = score.masterBars[startIdx].start
    const endMasterBar = score.masterBars[endIdx]
    const endTick = endMasterBar.start + endMasterBar.calculateDuration()

    if (!practiceRef.current) savedTempoRef.current = state.tempo
    practiceRef.current = { config, tempo: config.loopTempo, loops: 0 }

    actions.stop()
    actions.setPlaybackRange({ startTick, endTick })
    actions.setLooping(true)
    actions.setTempo(config.loopTempo)
    actions.setCountIn(config.countIn ? 1 : 0)
    // Small delay to let alphaTab process the range before playing
    setTimeout(() => actions.playPause(), 50)
  }

  const stopPractice = () => {
    if (!practiceRef.current) return
    practiceRef.current = null
    actions.stop()
    actions.setPlaybackRange(null)
    actions.setLooping(false)
    actions.setTempo(savedTempoRef.current)
    actions.setCountIn(0)
  }

  useEffect(() => {
    if (!command || command.seq === lastSeq.current) return
    lastSeq.current = command.seq
    const api = actions.getApi()
    const trackAt = (i: number) => api?.score?.tracks[i]
    const { cmd } = command
    switch (cmd.type) {
      case 'playPause':
        actions.playPause()
        break
      case 'stop':
        actions.stop()
        break
      case 'setTempo':
        actions.setTempo(cmd.value)
        break
      case 'setZoom':
        actions.setZoom(cmd.value)
        break
      case 'selectTrack': {
        const t = trackAt(cmd.trackIndex)
        if (t) actions.selectTrack(t)
        break
      }
      case 'muteTrack': {
        const t = trackAt(cmd.trackIndex)
        if (t) actions.muteTrack(t, cmd.value)
        break
      }
      case 'soloTrack': {
        const t = trackAt(cmd.trackIndex)
        if (t) actions.soloTrack(t, cmd.value)
        break
      }
      case 'setTrackVolume': {
        const t = trackAt(cmd.trackIndex)
        if (t && api) api.changeTrackVolume([t], cmd.value)
        break
      }
      case 'practiceStart':
        startPractice(cmd.config)
        break
      case 'practiceStop':
        stopPractice()
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command])

  const accent = theme === 'dark' ? '#0a84ff' : '#007aff'
  const dark = theme === 'dark'

  return (
    <div
      style={{
        // #root is a flex container; without explicit sizing this div collapses to width 0.
        flex: 1,
        width: '100%',
        height: '100vh',
        position: 'relative',
        background: dark ? '#1a1b26' : '#ffffff'
      }}
    >
      {/* alphaTab injects cursor/selection elements but leaves them unstyled. */}
      <style>{`
        .at-cursor-bar {
          background: ${dark ? 'rgba(255, 184, 108, 0.22)' : 'rgba(255, 159, 10, 0.18)'};
        }
        .at-cursor-beat {
          background: ${accent}c0;
          width: 3px;
        }
        .at-selection div {
          background: ${accent}1a;
        }
        .at-highlight * {
          fill: ${accent};
          stroke: ${accent};
        }
      `}</style>
      <div
        ref={viewportRef}
        style={{
          height: '100%',
          overflowY: 'auto'
        }}
      >
        {/* Inside the scroller so notation slides under the transparent header. */}
        <div style={{ paddingTop: topInset }}>
          <div ref={containerRef} />
        </div>
      </div>
    </div>
  )
}
