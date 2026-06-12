'use dom'

import { useEffect, useRef } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { useAlphaTab } from '@gtr/shared/web'
import type { ScoreSummary, TabCommandEnvelope } from '@gtr/shared'

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
  onError
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const lastSeq = useRef(0)

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

  useEffect(() => {
    if (!state.score) return
    onScoreLoaded({
      title: state.score.title,
      artist: state.score.artist,
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command])

  const accent = theme === 'dark' ? '#0a84ff' : '#007aff'

  return (
    <div
      ref={viewportRef}
      style={{
        // #root is a flex container; without explicit sizing this div collapses to width 0.
        flex: 1,
        width: '100%',
        height: '100vh',
        overflowY: 'auto',
        background: theme === 'dark' ? '#1a1b26' : '#ffffff'
      }}
    >
      {/* alphaTab injects cursor/selection elements but leaves them unstyled. */}
      <style>{`
        .at-cursor-bar {
          background: ${theme === 'dark' ? 'rgba(255, 184, 108, 0.22)' : 'rgba(255, 159, 10, 0.18)'};
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
      {/* Inside the scroller so notation slides under the transparent header. */}
      <div style={{ paddingTop: topInset }}>
        <div ref={containerRef} />
      </div>
    </div>
  )
}
