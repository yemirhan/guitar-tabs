'use dom'

import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { useAlphaTab } from '@gtr/shared/web'
import type { PracticeConfig, ScoreSummary, TabCommandEnvelope } from '@gtr/shared'

interface Props {
  fileBase64: string | null
  /** Base64-encoded alphaTex. Raw tex must not ride initial props: react-native-webview
   *  inlines them into a JS template literal, which mangles backslashes and quotes. */
  texBase64: string | null
  /** Base64 of alphaTab.min.js (UMD), read natively. In file:// release builds the webview
   *  can't fetch the worker script and a blob module worker can't import the core, so the
   *  synth worker is run as a CLASSIC blob worker of this self-contained UMD (it auto-inits in
   *  a worker context). Null in dev (the .mjs worker is loaded by URL instead). */
  workerUmdBase64: string | null
  /** Base64 of the .sf2 soundfont, read natively. Fed to alphaTab via loadSoundFont() because
   *  the webview can't XHR it from file://. Null in dev (loaded by URL instead). */
  soundFontBase64: string | null
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

// In dev, public/ is served at the dev-server root while this page lives at a deep
// /_expo/@dom URL, so public assets need root-absolute paths. In release builds the
// page is a file:// URL inside the app's www.bundle and public/ is copied right next
// to it, so assets must resolve relative to the document — root-absolute paths would
// point at the filesystem root (file:///font/...), which WKWebView's sandbox blocks.
const PUBLIC_BASE =
  typeof window !== 'undefined' && window.location.protocol === 'file:'
    ? new URL('./', window.location.href).href
    : '/'
const PUBLIC_BASE_URL =
  typeof window !== 'undefined' ? new URL(PUBLIC_BASE, window.location.href).href : PUBLIC_BASE
const ALPHATAB_WORKER_URL =
  typeof window !== 'undefined'
    ? new URL('vendor/alphaTab.worker.mjs', PUBLIC_BASE_URL).href
    : 'vendor/alphaTab.worker.mjs'
// In a file:// release build WKWebView blocks BOTH `new Worker('file://…')` (null origin →
// SecurityError) and fetch/XHR of file:// resources, and a blob worker in a null-origin
// document can't import/importScripts anything cross-origin. So the synth worker can be
// neither the vendored .mjs (a file:// URL) nor a blob *module* worker that imports the core.
// Instead the player reads the self-contained UMD build's bytes natively and we run them as a
// CLASSIC blob worker, which WKWebView allows and which self-initializes in a worker context
// with no further loads (see buildClassicWorkerFromUmd / the workerUmdBase64 prop). Over http
// (dev) none of this applies and the vendored .mjs worker is used by URL.
//
// alphaTab is the only worker creator in this webview; the override below redirects its worker
// requests to whatever `resolvedWorkerUrl` we prepared.
let resolvedWorkerUrl: string = ALPHATAB_WORKER_URL
let resolvedWorkerIsModule = true

function buildClassicWorkerFromUmd(umdBytes: Uint8Array): string {
  return URL.createObjectURL(new Blob([umdBytes as BlobPart], { type: 'text/javascript' }))
}

if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
  const NativeWorker = Worker
  ;(window as any).Worker = class extends NativeWorker {
    constructor(url: string | URL, opts?: WorkerOptions) {
      const s = String(url)
      if (s.includes('alphaTab.worker') || s.startsWith('blob:')) {
        super(resolvedWorkerUrl, resolvedWorkerIsModule ? { type: 'module' } : undefined)
      } else {
        super(url, opts)
      }
    }
  }
}

// console.warn is invisible in TestFlight builds, so runtime errors are kept in a
// module-level store and surfaced as an in-page overlay. Module scope (rather than a
// mount effect) so errors thrown before React mounts are not lost.
const runtimeErrors: string[] = []
const runtimeErrorListeners = new Set<() => void>()

function pushRuntimeError(message: string) {
  runtimeErrors.push(message)
  runtimeErrorListeners.forEach((l) => l())
}

function subscribeRuntimeErrors(listener: () => void) {
  runtimeErrorListeners.add(listener)
  return () => {
    runtimeErrorListeners.delete(listener)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.warn('[tab-view] window error:', e.message, e.filename, e.lineno)
    const where = e.filename ? ` (${e.filename}:${e.lineno})` : ''
    pushRuntimeError(`${e.message}${where}`)
  })
  window.addEventListener('unhandledrejection', (e) => {
    console.warn('[tab-view] unhandled rejection:', String(e.reason))
    const reason = e.reason as Error | undefined
    pushRuntimeError(`Unhandled rejection: ${String(reason?.message ?? e.reason)}`)
  })
}

interface ErrorBoundaryProps {
  theme: 'light' | 'dark'
  topInset: number
  children: ReactNode
}

class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { error: Error | null; componentStack: string | null }
> {
  state = { error: null as Error | null, componentStack: null as string | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[tab-view] render error:', error, info.componentStack)
    this.setState({ componentStack: info.componentStack ?? null })
  }

  render() {
    const { error, componentStack } = this.state
    if (!error) return this.props.children
    const dark = this.props.theme === 'dark'
    return (
      <div
        style={{
          minHeight: '100vh',
          boxSizing: 'border-box',
          padding: 16,
          paddingTop: this.props.topInset + 16,
          overflowY: 'auto',
          background: dark ? '#1a1b26' : '#ffffff',
          color: dark ? '#f7768e' : '#c0392b',
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 13,
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          userSelect: 'text'
        }}>
        <strong>Tab view crashed</strong>
        {`\n\n${String(error.message ?? error)}`}
        {error.stack ? `\n\n${error.stack}` : ''}
        {componentStack ? `\n\nComponent stack:${componentStack}` : ''}
      </div>
    )
  }
}

function RuntimeErrorOverlay({ theme }: { theme: 'light' | 'dark' }) {
  const errorCount = useSyncExternalStore(
    subscribeRuntimeErrors,
    () => runtimeErrors.length,
    () => 0
  )
  const [dismissedCount, setDismissedCount] = useState(0)
  if (errorCount <= dismissedCount) return null
  const dark = theme === 'dark'
  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 10,
        boxSizing: 'border-box',
        maxHeight: '40vh',
        overflowY: 'auto',
        padding: 12,
        borderRadius: 12,
        background: dark ? 'rgba(60, 18, 28, 0.95)' : 'rgba(255, 235, 238, 0.97)',
        border: `1px solid ${dark ? '#f7768e' : '#c0392b'}`,
        color: dark ? '#f7768e' : '#c0392b',
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: 12,
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        userSelect: 'text'
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontFamily: 'system-ui, sans-serif' }}>
          {errorCount - dismissedCount === 1
            ? 'Error'
            : `${errorCount - dismissedCount} errors`}
        </strong>
        <button
          onClick={() => setDismissedCount(errorCount)}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            padding: 0
          }}>
          Dismiss
        </button>
      </div>
      {runtimeErrors.slice(dismissedCount).join('\n\n')}
    </div>
  )
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function TabViewInner({
  fileBase64,
  texBase64,
  soundFontBase64,
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

  // Natively-read soundfont bytes (file:// release builds can't XHR the .sf2). Decoded once.
  const soundFontBytes = useMemo(
    () => (soundFontBase64 ? base64ToBytes(soundFontBase64) : null),
    [soundFontBase64]
  )

  const [state, actions] = useAlphaTab(containerRef, viewportRef, theme, {
    fontDirectory: `${PUBLIC_BASE}font/`,
    scriptFile: ALPHATAB_WORKER_URL,
    soundFontUrl: `${PUBLIC_BASE}soundfont/sonivox.sf2`,
    soundFontBytes,
    useWorkers: false,
    // Metro cannot bundle alphaTab's audio worklet; script-processor audio runs on the main thread.
    outputMode: alphaTab.PlayerOutputMode.WebAudioScriptProcessor,
    scrollOffsetY: -(topInset + 30),
    onError: (e) => onError(String((e as Error)?.message ?? e))
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
      case 'muteAllTracks':
        actions.muteAllTracks()
        break
      case 'unmuteAllTracks':
        actions.unmuteAllTracks()
        break
      case 'soloTrack': {
        const t = trackAt(cmd.trackIndex)
        if (t) actions.soloTrack(t, cmd.value)
        break
      }
      case 'clearSoloTracks':
        actions.clearSoloTracks()
        break
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

let workerBuiltFromUmd = false

export default function TabView(props: Props) {
  // Build the classic UMD synth worker from the native bytes during render, before
  // TabViewInner's effects construct the AlphaTabApi (which spawns the worker). useMemo runs
  // synchronously in render, so resolvedWorkerUrl is set in time.
  useMemo(() => {
    if (workerBuiltFromUmd || !props.workerUmdBase64) return
    resolvedWorkerUrl = buildClassicWorkerFromUmd(base64ToBytes(props.workerUmdBase64))
    resolvedWorkerIsModule = false
    workerBuiltFromUmd = true
  }, [props.workerUmdBase64])

  return (
    <ErrorBoundary theme={props.theme} topInset={props.topInset ?? 0}>
      <TabViewInner {...props} />
      <RuntimeErrorOverlay theme={props.theme} />
    </ErrorBoundary>
  )
}
