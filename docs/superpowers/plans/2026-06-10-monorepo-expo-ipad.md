# Monorepo + Expo iPad App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the repo to an npm-workspaces monorepo (`apps/desktop`, `apps/mobile`, `packages/shared`) and build an Expo SDK 56 iPad app that opens Guitar Pro files and plays them back, using `@expo/ui` SwiftUI for native chrome and the shared alphaTab web core inside an Expo DOM component.

**Architecture:** `packages/shared` (`@gtr/shared`) ships TypeScript source with two entry points — `.` (pure types/constants, importable from React Native) and `./web` (the `useAlphaTab` hook + alphaTab integration, web contexts only). The Electron renderer and the Expo DOM component both consume `./web`, so desktop and iPad render tabs through one code path. Native↔DOM communication: serializable props down (file base64, theme, a sequenced command envelope), async function props up (score loaded, player state, errors).

**Tech Stack:** npm workspaces, Electron 33 + electron-vite (existing), Expo SDK 56 + expo-router + `@expo/ui/swift-ui` + DOM components, alphaTab 1.8, TypeScript 5.7.

**Spec:** `docs/superpowers/specs/2026-06-10-monorepo-expo-ipad-design.md`

**Testing approach (read first):** This repo has no unit-test infrastructure, and the desktop tsconfigs have pre-existing `lib`-target errors (`tsc --noEmit -p apps/desktop/tsconfig.web.json` fails today on `Map`/`Set`/`Promise` not found — NOT caused by this work; do not fix it, it's out of scope). Verification is therefore: (a) `@gtr/shared` and `apps/mobile` get their own clean `tsc --noEmit` checks, (b) the desktop app must build (`npm run build`) and run (`npm run dev`) identically after every desktop-touching task, (c) the mobile app is verified on the iOS simulator at the milestone in Task 6 and on the physical iPad in Task 9. The shared hook is React+alphaTab glue — unit-testing it would mean mocking the entire alphaTab API for no real coverage; app-level smoke verification is the deliberate choice here.

**Important constraints discovered during planning:**
- Desktop package name MUST stay `"guitar-tab-reader"` — Electron derives the dev `userData` path from it; renaming would silently orphan the user's saved projects/preferences (localStorage).
- alphaTab 1.8 confirms `settings.core.useWorkers: boolean` and `settings.core.smuflFontSources: Map<FontFileFormat, string>` exist (checked in `node_modules/@coderline/alphatab/dist/alphaTab.d.ts`).
- `@expo/ui` Slider docs only guarantee `value`/`onValueChange` (0–1) on SwiftUI; we map 0–1 to the speed range in JS rather than relying on `min`/`max` props.
- The DOM component webview needs `mediaPlaybackRequiresUserAction: false` or Web Audio may stay suspended when playback is triggered from native buttons.

---

## Phase A — Monorepo conversion

### Task 1: Workspace root + move desktop app

**Files:**
- Create: `package.json` (new workspace root)
- Move: `src/`, `build/`, `electron-builder.yml`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `package.json` → `apps/desktop/`
- Delete: `package-lock.json` (regenerated at root)
- Modify: `.gitignore`

- [ ] **Step 1: Create a working branch**

```bash
git checkout -b monorepo-expo
```

- [ ] **Step 2: Move the Electron app into apps/desktop**

```bash
mkdir -p apps/desktop packages
git mv src apps/desktop/src
git mv build apps/desktop/build
git mv electron-builder.yml electron.vite.config.ts tsconfig.json tsconfig.node.json tsconfig.web.json apps/desktop/
git mv package.json apps/desktop/package.json
git rm package-lock.json
rm -rf node_modules out dist
```

`out/` and `dist/` are gitignored build outputs; deleting them avoids stale-path confusion. Do NOT rename the `"name"` field in `apps/desktop/package.json` (see constraints above).

- [ ] **Step 3: Write the new workspace root package.json**

```json
{
  "name": "guitar-tab-reader-monorepo",
  "version": "1.2.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:desktop": "npm run dev -w guitar-tab-reader",
    "build:desktop": "npm run build -w guitar-tab-reader",
    "dev:mobile": "npm run start -w @gtr/mobile",
    "typecheck": "npm run typecheck --workspaces --if-present"
  }
}
```

- [ ] **Step 4: Extend .gitignore**

Append to `.gitignore` (existing entries stay):

```
.expo/
*.tsbuildinfo
```

- [ ] **Step 5: Install and verify the desktop app still works**

```bash
npm install
npm run dev:desktop
```

Expected: `npm install` creates a root `package-lock.json` and hoisted `node_modules`; the `postinstall` (`electron-builder install-app-deps`) runs without error. The Electron window opens, a Guitar Pro file can be opened and played. Quit the app.

Then a production build smoke:

```bash
npm run build:desktop
```

Expected: electron-vite build succeeds, output in `apps/desktop/out/`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move Electron app to apps/desktop, add npm workspaces root"
```

---

### Task 2: Create packages/shared (@gtr/shared)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/web/use-alpha-tab.ts`
- Create: `packages/shared/src/web/index.ts`

- [ ] **Step 1: Write packages/shared/package.json**

```json
{
  "name": "@gtr/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/types/index.ts",
    "./web": "./src/web/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@coderline/alphatab": "^1.8.0",
    "react": ">=19"
  },
  "devDependencies": {
    "@coderline/alphatab": "^1.8.1",
    "@types/react": "^19.0.0",
    "react": "^19.0.0",
    "typescript": "^5.7.3"
  }
}
```

The package ships raw `.ts` source via `exports`; electron-vite (rollup) and Metro both transpile workspace TS. No build step.

- [ ] **Step 2: Write packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

`skipLibCheck` is required — alphaTab's own `.d.ts` has issues under strict lib settings.

- [ ] **Step 3: Write packages/shared/src/types/index.ts**

Pure types and constants — no alphaTab or DOM imports, safe in React Native:

```ts
export interface PlaybackRange {
  startTick: number
  endTick: number
}

export interface ExportFilter {
  name: string
  extensions: string[]
}

export interface ProjectEntry {
  filePath: string
  fileName: string
  addedAt: number
}

export type ThemeName = 'light' | 'dark'

export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 3.0

/** alphaTab synth.PlayerState.Playing — mirrored so native code can compare without importing alphaTab. */
export const PLAYER_STATE_PLAYING = 1

export interface TrackSummary {
  index: number
  name: string
  isMute: boolean
  isSolo: boolean
}

export interface ScoreSummary {
  title: string
  artist: string
  tracks: TrackSummary[]
}

export type TabCommand =
  | { type: 'playPause' }
  | { type: 'stop' }
  | { type: 'setTempo'; value: number }
  | { type: 'setZoom'; value: number }
  | { type: 'selectTrack'; trackIndex: number }
  | { type: 'muteTrack'; trackIndex: number; value: boolean }
  | { type: 'soloTrack'; trackIndex: number; value: boolean }
  | { type: 'setTrackVolume'; trackIndex: number; value: number }

export interface TabCommandEnvelope {
  seq: number
  cmd: TabCommand
}
```

- [ ] **Step 4: Write packages/shared/src/web/use-alpha-tab.ts**

This is `apps/desktop/src/renderer/src/hooks/useAlphaTab.ts` moved, with three changes: (1) an options parameter replaces hardcoded `fontDirectory`/`soundFont` and adds `useWorkers`/`smuflFontSources`; (2) `exportAlphaTex` calls the injected `onExportFile` instead of `window.api.saveExport`; (3) zoom clamps use the shared constants. Full file:

```ts
import { useRef, useState, useCallback, useEffect } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { MIN_ZOOM, MAX_ZOOM } from '../types/index'
import type { ExportFilter, PlaybackRange, ThemeName } from '../types/index'

export type { PlaybackRange }

export interface UseAlphaTabOptions {
  /** Directory URL containing the Bravura font files (must end with '/'). */
  fontDirectory?: string | null
  /** Alternative to fontDirectory: explicit font URLs per format (use when asset URLs are hash-renamed). */
  smuflFontSources?: Map<alphaTab.FontFileFormat, string> | null
  /** URL of the .sf2 soundfont. */
  soundFontUrl: string
  /** Set false in environments where alphaTab's web workers can't be bundled (Expo DOM components). Default true. */
  useWorkers?: boolean
  /** Receives export payloads (desktop wires this to the Electron save dialog). */
  onExportFile?: (data: Uint8Array, defaultName: string, filters: ExportFilter[]) => Promise<boolean>
}

export interface AlphaTabState {
  api: alphaTab.AlphaTabApi | null
  score: alphaTab.model.Score | null
  tracks: alphaTab.model.Track[]
  selectedTracks: alphaTab.model.Track[]
  playerState: alphaTab.synth.PlayerState
  isLoading: boolean
  isPlayerReady: boolean
  tempo: number
  zoom: number
  staveProfile: alphaTab.StaveProfile
}

export interface AlphaTabActions {
  loadFile: (data: Uint8Array) => void
  playPause: () => void
  stop: () => void
  setTempo: (speed: number) => void
  setVolume: (vol: number) => void
  selectTrack: (track: alphaTab.model.Track, append?: boolean) => void
  muteTrack: (track: alphaTab.model.Track, mute: boolean) => void
  muteAllTracks: () => void
  unmuteAllTracks: () => void
  soloTrack: (track: alphaTab.model.Track, solo: boolean) => void
  loadTex: (tex: string) => void
  getScore: () => alphaTab.model.Score | null
  getApi: () => alphaTab.AlphaTabApi | null
  changeTrackProgram: (track: alphaTab.model.Track, program: number) => void
  setStaveProfile: (profile: alphaTab.StaveProfile) => void
  setZoom: (scale: number) => void
  exportPdf: () => void
  exportMidi: () => void
  exportAlphaTex: () => Promise<void>
  setPlaybackRange: (range: PlaybackRange | null) => void
  setLooping: (enabled: boolean) => void
  setCountIn: (volume: number) => void
}

function applyThemeColors(settings: alphaTab.Settings, theme: ThemeName) {
  const res = settings.display.resources
  if (theme === 'dark') {
    res.mainGlyphColor = new alphaTab.model.Color(232, 234, 240, 255)
    res.secondaryGlyphColor = new alphaTab.model.Color(232, 234, 240, 100)
    res.scoreInfoColor = new alphaTab.model.Color(232, 234, 240, 255)
    res.barSeparatorColor = new alphaTab.model.Color(74, 77, 94, 255)
    res.barNumberColor = new alphaTab.model.Color(139, 143, 160, 255)
    res.staffLineColor = new alphaTab.model.Color(74, 77, 94, 255)
  } else {
    res.mainGlyphColor = new alphaTab.model.Color(0, 0, 0, 255)
    res.secondaryGlyphColor = new alphaTab.model.Color(0, 0, 0, 100)
    res.scoreInfoColor = new alphaTab.model.Color(0, 0, 0, 255)
    res.barSeparatorColor = new alphaTab.model.Color(34, 34, 17, 255)
    res.barNumberColor = new alphaTab.model.Color(200, 0, 0, 255)
    res.staffLineColor = new alphaTab.model.Color(165, 165, 165, 255)
  }
}

export function useAlphaTab(
  containerRef: React.RefObject<HTMLDivElement | null>,
  viewportRef: React.RefObject<HTMLDivElement | null>,
  theme: ThemeName = 'dark',
  options: UseAlphaTabOptions
): [AlphaTabState, AlphaTabActions] {
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [score, setScore] = useState<alphaTab.model.Score | null>(null)
  const [tracks, setTracks] = useState<alphaTab.model.Track[]>([])
  const [selectedTracks, setSelectedTracks] = useState<alphaTab.model.Track[]>([])
  const [playerState, setPlayerState] = useState<alphaTab.synth.PlayerState>(
    alphaTab.synth.PlayerState.Paused
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [tempo, setTempoState] = useState(1)
  const [zoom, setZoomState] = useState<number>(() => {
    const saved = localStorage.getItem('zoom')
    return saved !== null ? Number(saved) : 1.0
  })
  const [staveProfile, setStaveProfileState] = useState<alphaTab.StaveProfile>(() => {
    const saved = localStorage.getItem('staveProfile')
    return saved !== null ? (Number(saved) as alphaTab.StaveProfile) : alphaTab.StaveProfile.Default
  })

  useEffect(() => {
    const container = containerRef.current
    const viewport = viewportRef.current
    if (!container || !viewport) return

    const opts = optionsRef.current
    const settings = new alphaTab.Settings()
    settings.core.fontDirectory = opts.fontDirectory ?? null
    if (opts.smuflFontSources) {
      settings.core.smuflFontSources = opts.smuflFontSources
    }
    settings.core.useWorkers = opts.useWorkers ?? true
    settings.player.enablePlayer = true
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer
    settings.player.soundFont = opts.soundFontUrl
    settings.player.scrollElement = viewport
    settings.player.scrollOffsetY = -30
    settings.display.layoutMode = alphaTab.LayoutMode.Page
    const savedProfile = localStorage.getItem('staveProfile')
    if (savedProfile !== null) {
      settings.display.staveProfile = Number(savedProfile) as alphaTab.StaveProfile
    }
    const savedZoom = localStorage.getItem('zoom')
    if (savedZoom !== null) {
      settings.display.scale = Number(savedZoom)
    }
    applyThemeColors(settings, theme)

    const api = new alphaTab.AlphaTabApi(container, settings)
    apiRef.current = api

    api.scoreLoaded.on((s) => {
      setScore(s)
      setTracks([...s.tracks])
      if (s.tracks.length > 0) {
        setSelectedTracks([s.tracks[0]])
      }
    })

    api.renderStarted.on(() => {
      setIsLoading(true)
    })

    api.renderFinished.on(() => {
      setIsLoading(false)
    })

    api.playerStateChanged.on((e) => {
      setPlayerState(e.state)
    })

    api.playerReady.on(() => {
      setIsPlayerReady(true)
    })

    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [containerRef, viewportRef])

  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    applyThemeColors(api.settings, theme)
    api.updateSettings()
    api.render()
  }, [theme])

  const loadFile = useCallback((data: Uint8Array) => {
    const api = apiRef.current
    if (!api) return
    api.load(data, [0])
  }, [])

  const playPause = useCallback(() => {
    apiRef.current?.playPause()
  }, [])

  const stop = useCallback(() => {
    apiRef.current?.stop()
  }, [])

  const setTempo = useCallback((speed: number) => {
    if (apiRef.current) {
      apiRef.current.playbackSpeed = speed
    }
    setTempoState(speed)
  }, [])

  const setVolume = useCallback((vol: number) => {
    if (apiRef.current) {
      apiRef.current.masterVolume = vol
    }
  }, [])

  const selectTrack = useCallback(
    (track: alphaTab.model.Track, append = false) => {
      const api = apiRef.current
      if (!api) return

      let newSelection: alphaTab.model.Track[]
      if (append) {
        const existing = selectedTracks.find((t) => t.index === track.index)
        if (existing) {
          newSelection = selectedTracks.filter((t) => t.index !== track.index)
          if (newSelection.length === 0) newSelection = [track]
        } else {
          newSelection = [...selectedTracks, track]
        }
      } else {
        newSelection = [track]
      }

      setSelectedTracks(newSelection)
      api.renderTracks(newSelection)
    },
    [selectedTracks]
  )

  const muteTrack = useCallback((track: alphaTab.model.Track, mute: boolean) => {
    const api = apiRef.current
    if (!api?.score) return
    api.changeTrackMute([track], mute)
    setTracks([...api.score.tracks])
  }, [])

  const soloTrack = useCallback((track: alphaTab.model.Track, solo: boolean) => {
    const api = apiRef.current
    if (!api?.score) return
    api.changeTrackSolo([track], solo)
    setTracks([...api.score.tracks])
  }, [])

  const muteAllTracks = useCallback(() => {
    const api = apiRef.current
    if (!api?.score || api.score.tracks.length === 0) return
    api.changeTrackMute(api.score.tracks, true)
    setTracks([...api.score.tracks])
  }, [])

  const unmuteAllTracks = useCallback(() => {
    const api = apiRef.current
    if (!api?.score || api.score.tracks.length === 0) return
    api.changeTrackMute(api.score.tracks, false)
    api.changeTrackSolo(api.score.tracks, false)
    setTracks([...api.score.tracks])
  }, [])

  const loadTex = useCallback((tex: string) => {
    apiRef.current?.tex(tex)
  }, [])

  const getScore = useCallback(() => {
    return apiRef.current?.score ?? null
  }, [])

  const getApi = useCallback(() => {
    return apiRef.current
  }, [])

  const changeTrackProgram = useCallback(
    (track: alphaTab.model.Track, program: number) => {
      const api = apiRef.current
      if (!api || !api.score) return

      // Program changes require MIDI regeneration so the synth receives new patch events.
      track.playbackInfo.program = program

      // Some files store explicit per-beat instrument automations that override track program.
      // Keep them in sync with the selected program so playback actually changes timbre.
      for (const staff of track.staves) {
        for (const bar of staff.bars) {
          for (const voice of bar.voices) {
            for (const beat of voice.beats) {
              for (const automation of beat.automations) {
                if (automation.type === alphaTab.model.AutomationType.Instrument) {
                  automation.value = program
                }
              }
            }
          }
        }
      }

      api.loadMidiForScore()
      setTracks([...api.score.tracks])
    },
    []
  )

  const setStaveProfile = useCallback((profile: alphaTab.StaveProfile) => {
    const api = apiRef.current
    if (!api) return
    api.settings.display.staveProfile = profile
    api.updateSettings()
    api.render()
    setStaveProfileState(profile)
    localStorage.setItem('staveProfile', String(profile))
  }, [])

  const setZoom = useCallback((scale: number) => {
    const api = apiRef.current
    if (!api) return
    const clamped = Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale)) * 100) / 100
    api.settings.display.scale = clamped
    api.updateSettings()
    api.render()
    setZoomState(clamped)
    localStorage.setItem('zoom', String(clamped))
  }, [])

  const exportPdf = useCallback(() => {
    const api = apiRef.current
    if (!api) return
    // Always print with light colors so glyphs are visible on white paper
    api.print(undefined, {
      display: {
        resources: {
          mainGlyphColor: '#000000',
          secondaryGlyphColor: 'rgba(0,0,0,0.4)',
          scoreInfoColor: '#000000',
          barSeparatorColor: '#222211',
          barNumberColor: '#c80000',
          staffLineColor: '#a5a5a5'
        }
      }
    })
  }, [])

  const exportMidi = useCallback(() => {
    apiRef.current?.downloadMidi()
  }, [])

  const exportAlphaTex = useCallback(async () => {
    const api = apiRef.current
    const onExportFile = optionsRef.current.onExportFile
    if (!api?.score || !onExportFile) return
    const exporter = new alphaTab.exporter.AlphaTexExporter()
    exporter.export(api.score)
    const tex = exporter.toString()
    await onExportFile(new TextEncoder().encode(tex), 'score.alphatex', [
      { name: 'AlphaTex', extensions: ['alphatex', 'tex', 'txt'] }
    ])
  }, [])

  const setPlaybackRange = useCallback((range: PlaybackRange | null) => {
    const api = apiRef.current
    if (!api) return
    if (range) {
      const pr = new alphaTab.synth.PlaybackRange()
      pr.startTick = range.startTick
      pr.endTick = range.endTick
      api.playbackRange = pr
    } else {
      api.playbackRange = null
    }
  }, [])

  const setLooping = useCallback((enabled: boolean) => {
    const api = apiRef.current
    if (!api) return
    api.isLooping = enabled
  }, [])

  const setCountIn = useCallback((volume: number) => {
    const api = apiRef.current
    if (!api) return
    api.countInVolume = volume
  }, [])

  const state: AlphaTabState = {
    api: apiRef.current,
    score,
    tracks,
    selectedTracks,
    playerState,
    isLoading,
    isPlayerReady,
    tempo,
    zoom,
    staveProfile
  }

  const actions: AlphaTabActions = {
    loadFile,
    playPause,
    stop,
    setTempo,
    setVolume,
    selectTrack,
    muteTrack,
    muteAllTracks,
    unmuteAllTracks,
    soloTrack,
    loadTex,
    getScore,
    getApi,
    changeTrackProgram,
    setStaveProfile,
    setZoom,
    exportPdf,
    exportMidi,
    exportAlphaTex,
    setPlaybackRange,
    setLooping,
    setCountIn
  }

  return [state, actions]
}
```

Note the `exportAlphaTex` signature change: it now passes `Uint8Array` (not `number[]`) to the callback — the desktop adapter converts (Task 3).

- [ ] **Step 5: Write packages/shared/src/web/index.ts**

```ts
export * from './use-alpha-tab'
export * from '../types/index'
```

- [ ] **Step 6: Typecheck and commit**

```bash
npm install
npm run typecheck -w @gtr/shared
```

Expected: exit 0, no errors.

```bash
git add -A
git commit -m "feat: add @gtr/shared package with types and alphaTab web core"
```

---

### Task 3: Desktop consumes @gtr/shared

**Files:**
- Delete: `apps/desktop/src/renderer/src/hooks/useAlphaTab.ts`
- Modify: `apps/desktop/package.json` (add dependency)
- Modify: `apps/desktop/tsconfig.web.json` (include shared source)
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/components/Toolbar.tsx`
- Modify: `apps/desktop/src/renderer/src/components/ExportMenu.tsx`
- Modify: `apps/desktop/src/renderer/src/components/TabViewer.tsx`
- Modify: `apps/desktop/src/renderer/src/components/EditPanel.tsx`
- Modify: `apps/desktop/src/renderer/src/components/TrackPanel.tsx`
- Modify: `apps/desktop/src/renderer/src/hooks/usePracticeMode.ts`
- Modify: `apps/desktop/src/renderer/src/hooks/useProjects.ts`

- [ ] **Step 1: Add the workspace dependency**

In `apps/desktop/package.json` `"dependencies"`, add:

```json
"@gtr/shared": "*"
```

- [ ] **Step 2: Include shared source in the renderer tsconfig**

In `apps/desktop/tsconfig.web.json`, change `"include"` to:

```json
"include": [
  "src/renderer/src/**/*",
  "src/renderer/*.d.ts",
  "../../packages/shared/src/**/*"
]
```

(Required because `composite: true` demands all program files be listed; the shared source enters the program via imports.)

- [ ] **Step 3: Delete the old hook**

```bash
git rm apps/desktop/src/renderer/src/hooks/useAlphaTab.ts
```

- [ ] **Step 4: Update imports across the renderer**

In each file, change ONLY the import line(s) shown (left = current, right = new):

- `App.tsx:4`: `import { useAlphaTab } from '@/hooks/useAlphaTab'` → `import { useAlphaTab } from '@gtr/shared/web'`
- `components/Toolbar.tsx:27`: `import { AlphaTabState, AlphaTabActions } from '@/hooks/useAlphaTab'` → `import { AlphaTabState, AlphaTabActions } from '@gtr/shared/web'`
- `components/ExportMenu.tsx:5`: `import { AlphaTabActions } from '@/hooks/useAlphaTab'` → `import { AlphaTabActions } from '@gtr/shared/web'`
- `components/TabViewer.tsx:2`: `import { AlphaTabState } from '@/hooks/useAlphaTab'` → `import { AlphaTabState } from '@gtr/shared/web'`
- `components/EditPanel.tsx:5`: `import { AlphaTabActions } from '@/hooks/useAlphaTab'` → `import { AlphaTabActions } from '@gtr/shared/web'`
- `components/TrackPanel.tsx:17`: `import { AlphaTabState, AlphaTabActions } from '@/hooks/useAlphaTab'` → `import { AlphaTabState, AlphaTabActions } from '@gtr/shared/web'`
- `hooks/usePracticeMode.ts:3`: `import type { AlphaTabActions, PlaybackRange } from './useAlphaTab'` → `import type { AlphaTabActions, PlaybackRange } from '@gtr/shared/web'`

- [ ] **Step 5: Update the App.tsx hook call site**

`App.tsx:24` currently:

```ts
const [state, actions] = useAlphaTab(containerRef, viewportRef, theme)
```

Replace with:

```ts
const [state, actions] = useAlphaTab(containerRef, viewportRef, theme, {
  fontDirectory: 'font/',
  soundFontUrl: 'soundfont/sonivox.sf2',
  onExportFile: (data, defaultName, filters) =>
    window.api.saveExport(Array.from(data), defaultName, filters)
})
```

- [ ] **Step 6: Re-export ProjectEntry from shared in useProjects**

In `apps/desktop/src/renderer/src/hooks/useProjects.ts`, delete the local interface:

```ts
export interface ProjectEntry {
  filePath: string
  fileName: string
  addedAt: number
}
```

and replace with:

```ts
import type { ProjectEntry } from '@gtr/shared'

export type { ProjectEntry }
```

(`ProjectsPanel.tsx` imports `ProjectEntry` from `@/hooks/useProjects` and keeps working unchanged via the re-export.)

- [ ] **Step 7: Verify desktop builds and runs**

```bash
npm install
npm run build:desktop
```

Expected: build succeeds. Then:

```bash
npm run dev:desktop
```

Expected: app opens; open a Guitar Pro file; verify rendering, playback, track mute/solo, zoom, theme toggle, and AlphaTex export (the changed code path) all work. Quit.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: desktop consumes useAlphaTab and shared types from @gtr/shared"
```

---

### Task 4: Update CI workflow for the new layout

**Files:**
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: Point build steps at apps/desktop**

In `.github/workflows/build.yml`:

1. The `Build app` step becomes:

```yaml
      - name: Build app
        run: npm run build:desktop
```

2. The `Build & sign` step's `run` line becomes:

```yaml
        run: npx electron-builder --mac --arm64 --publish never --project apps/desktop
```

3. Both artifact upload paths change from `dist/*.dmg` / `dist/*.zip` to:

```yaml
          path: apps/desktop/dist/*.dmg
```

```yaml
          path: apps/desktop/dist/*.zip
```

(`npm ci` at root already installs all workspaces; the `cache: npm` setup keys off the root lockfile and needs no change.)

- [ ] **Step 2: Local smoke of the packaged build path**

```bash
npx electron-builder --mac --dir --publish never --project apps/desktop
```

Expected: an unpacked `.app` in `apps/desktop/dist/mac-arm64/`. Launch it once and open a file — this validates electron-builder works with hoisted workspace `node_modules`. If it fails to resolve modules, add `"npmRebuild": false` to `apps/desktop/electron-builder.yml` and retry.

- [ ] **Step 3: Commit (Phase A complete)**

```bash
git add -A
git commit -m "ci: update macOS build workflow for monorepo layout"
```

---

## Phase B — Expo iPad app

### Task 5: Scaffold apps/mobile (Expo SDK 56)

**Files:**
- Create: `apps/mobile/` (scaffolded, then edited)
- Modify: `apps/mobile/package.json`, `apps/mobile/app.json`, `apps/mobile/tsconfig.json`, `apps/mobile/.gitignore`
- Create: `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`
- Delete: `apps/mobile/App.tsx`

- [ ] **Step 1: Scaffold**

From the repo root:

```bash
npx create-expo-app@latest apps/mobile --template blank-typescript --no-install
```

- [ ] **Step 2: Edit apps/mobile/package.json**

Set the name, entry, and add scripts/dependency (keep scaffolded fields otherwise):

```json
{
  "name": "@gtr/mobile",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "ios": "expo run:ios",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@gtr/shared": "*"
  }
}
```

(Merge — the scaffold's `expo`, `react`, `react-native` deps stay.)

- [ ] **Step 3: Install Expo packages**

```bash
npm install
cd apps/mobile
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar @expo/ui expo-document-picker expo-file-system react-native-webview react-dom expo-dev-client
cd ../..
```

`npx expo install` picks SDK-56-compatible versions. `react-native-webview` + `react-dom` are required by DOM components; `expo-dev-client` because `@expo/ui` and DOM components don't run in Expo Go.

- [ ] **Step 4: Write apps/mobile/app.json**

```json
{
  "expo": {
    "name": "Guitar Tab Reader",
    "slug": "guitar-tab-reader",
    "version": "1.0.0",
    "orientation": "default",
    "scheme": "gtr",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yemirhan.guitartabreader"
    },
    "plugins": ["expo-router"]
  }
}
```

`orientation: "default"` allows landscape on iPad. Keep any scaffolded `icon`/`splash` fields.

- [ ] **Step 5: Replace the scaffold entry with expo-router routes**

```bash
rm apps/mobile/App.tsx
mkdir -p apps/mobile/app apps/mobile/components apps/mobile/lib
```

Write `apps/mobile/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router/stack'

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Library', headerLargeTitle: true }} />
      <Stack.Screen name="player" options={{ title: '' }} />
    </Stack>
  )
}
```

Write a placeholder `apps/mobile/app/index.tsx` (replaced in Tasks 6/8):

```tsx
import { View, Text } from 'react-native'

export default function Library() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Library placeholder</Text>
    </View>
  )
}
```

- [ ] **Step 6: Ensure native dirs are gitignored**

In `apps/mobile/.gitignore`, ensure these lines exist (add if missing):

```
/ios
/android
.expo/
```

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck -w @gtr/mobile
```

Expected: exit 0.

```bash
git add -A
git commit -m "feat: scaffold Expo SDK 56 app in apps/mobile with expo-router"
```

---

### Task 6: Assets + TabView DOM component + render/audio MILESTONE

This task validates the riskiest part end-to-end (alphaTab rendering + Web Audio in the webview) before any real UI exists.

**Files:**
- Create: `apps/mobile/public/font/` (copied), `apps/mobile/public/soundfont/` (copied)
- Create: `apps/mobile/components/tab-view.tsx`
- Modify: `apps/mobile/app/index.tsx` (temporary smoke screen)

- [ ] **Step 1: Copy web assets into the DOM component public dir**

```bash
mkdir -p apps/mobile/public
cp -R apps/desktop/src/renderer/public/font apps/mobile/public/font
mkdir -p apps/mobile/public/soundfont
cp apps/desktop/src/renderer/public/soundfont/sonivox.sf2 apps/mobile/public/soundfont/
cp apps/desktop/src/renderer/public/soundfont/LICENSE apps/mobile/public/soundfont/
```

Expo's web bundler (which builds DOM components) serves `public/` at the site root — same relative URLs (`font/`, `soundfont/sonivox.sf2`) as the Electron renderer.

- [ ] **Step 2: Write apps/mobile/components/tab-view.tsx**

```tsx
'use dom'

import { useEffect, useRef } from 'react'
import { useAlphaTab } from '@gtr/shared/web'
import type { ScoreSummary, TabCommandEnvelope } from '@gtr/shared'

interface Props {
  fileBase64: string | null
  tex: string | null
  theme: 'light' | 'dark'
  command: TabCommandEnvelope | null
  onScoreLoaded: (summary: ScoreSummary) => Promise<void>
  onPlayerStateChanged: (playerState: number) => Promise<void>
  onError: (message: string) => Promise<void>
  dom?: import('expo/dom').DOMProps
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export default function TabView({
  fileBase64,
  tex,
  theme,
  command,
  onScoreLoaded,
  onPlayerStateChanged,
  onError
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const lastSeq = useRef(0)

  const [state, actions] = useAlphaTab(containerRef, viewportRef, theme, {
    fontDirectory: 'font/',
    soundFontUrl: 'soundfont/sonivox.sf2',
    useWorkers: false
  })

  useEffect(() => {
    if (fileBase64) {
      actions.loadFile(base64ToBytes(fileBase64))
    } else if (tex) {
      actions.loadTex(tex)
    }
    // actions identity is stable enough for load-on-change; deliberately not a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileBase64, tex, state.api])

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

  return (
    <div
      ref={viewportRef}
      style={{
        height: '100vh',
        overflowY: 'auto',
        background: theme === 'dark' ? '#1a1b26' : '#ffffff'
      }}
    >
      <div ref={containerRef} />
    </div>
  )
}
```

- [ ] **Step 3: Write the temporary smoke screen**

Replace `apps/mobile/app/index.tsx` entirely with:

```tsx
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
        tex={DEMO_TEX}
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
          <Button systemImage="play.fill" onPress={() => send({ type: 'playPause' })}>
            Play
          </Button>
          <Button systemImage="stop.fill" onPress={() => send({ type: 'stop' })}>
            Stop
          </Button>
        </HStack>
      </Host>
    </View>
  )
}
```

Also ensure `apps/mobile/tsconfig.json` has the path alias (Expo's base config usually includes it; add if missing):

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck -w @gtr/mobile
```

Expected: exit 0.

- [ ] **Step 5: Build the dev client and run on simulator — MILESTONE**

```bash
cd apps/mobile
npx expo run:ios
```

(First run takes minutes: prebuild + CocoaPods + Xcode build, launches an iPad simulator if one is default; otherwise `npx expo run:ios --device "iPad Pro 13-inch (M4)"` style selection.)

Expected, in order:
1. App launches, smoke screen shows rendered notation (staff + tab numbers in Bravura glyphs — if you see empty space or boxes, fonts didn't load).
2. Console shows `score loaded: Smoke Test 1`.
3. Tapping the native **Play** button plays synthesized audio and the cursor moves; console logs `player state: 1`.
4. **Stop** halts playback.

**If fonts/soundfont fail to load from `public/`** (check the webview console: Safari → Develop → Simulator → the DOM component page): fall back to explicit asset URLs —
- add `metro.config.js` at `apps/mobile/` with `const { getDefaultConfig } = require('expo/metro-config'); const config = getDefaultConfig(__dirname); config.resolver.assetExts.push('sf2'); module.exports = config;`
- in `tab-view.tsx`, `import * as alphaTab from '@coderline/alphatab'`, build `smuflFontSources: new Map([[alphaTab.FontFileFormat.Woff2, require('../assets/font/Bravura.woff2')]])` (copy the font/soundfont into `apps/mobile/assets/` for this), pass `soundFontUrl: require('../assets/soundfont/sonivox.sf2')`, and drop `fontDirectory`.

**If rendering works but audio is silent:** verify `mediaPlaybackRequiresUserAction: false` is set on the `dom` prop; then try tapping inside the webview once before Play (user-gesture requirement) — if that fixes it, add a one-time "tap to enable audio" overlay inside `tab-view.tsx` that calls `actions.playPause()` directly from the in-webview tap.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: alphaTab DOM component renders and plays in Expo app (milestone)"
```

---### Task 7: Player screen with native @expo/ui shell

**Files:**
- Create: `apps/mobile/components/transport-bar.tsx`
- Create: `apps/mobile/components/track-panel.tsx`
- Create: `apps/mobile/app/player.tsx`

- [ ] **Step 1: Write apps/mobile/components/transport-bar.tsx**

```tsx
import { Host, HStack, Button, Slider, Text, Spacer } from '@expo/ui/swift-ui'
import { MIN_ZOOM, MAX_ZOOM } from '@gtr/shared'

interface Props {
  isPlaying: boolean
  speed: number
  zoom: number
  tracksVisible: boolean
  onPlayPause: () => void
  onStop: () => void
  onSpeedChange: (speed: number) => void
  onZoomChange: (zoom: number) => void
  onToggleTracks: () => void
}

const MIN_SPEED = 0.25
const MAX_SPEED = 2.0

export default function TransportBar({
  isPlaying,
  speed,
  zoom,
  tracksVisible,
  onPlayPause,
  onStop,
  onSpeedChange,
  onZoomChange,
  onToggleTracks
}: Props) {
  // @expo/ui Slider works 0..1; map to the speed range in JS.
  const sliderValue = (speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)

  return (
    <Host matchContents>
      <HStack spacing={16}>
        <Button
          systemImage={isPlaying ? 'pause.fill' : 'play.fill'}
          onPress={onPlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button systemImage="stop.fill" onPress={onStop}>
          Stop
        </Button>
        <Spacer />
        <Text>{`${Math.round(speed * 100)}%`}</Text>
        <Slider
          value={sliderValue}
          onValueChange={(v) => {
            const s = MIN_SPEED + v * (MAX_SPEED - MIN_SPEED)
            onSpeedChange(Math.round(s * 20) / 20) // snap to 5% steps
          }}
        />
        <Spacer />
        <Button
          systemImage="minus.magnifyingglass"
          onPress={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 0.1))}>
          Out
        </Button>
        <Button
          systemImage="plus.magnifyingglass"
          onPress={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 0.1))}>
          In
        </Button>
        <Button
          systemImage={tracksVisible ? 'sidebar.trailing' : 'music.note.list'}
          onPress={onToggleTracks}>
          Tracks
        </Button>
      </HStack>
    </Host>
  )
}
```

- [ ] **Step 2: Write apps/mobile/components/track-panel.tsx**

```tsx
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
```

- [ ] **Step 3: Write apps/mobile/app/player.tsx**

```tsx
import { useMemo, useRef, useState } from 'react'
import { View, Alert, useColorScheme } from 'react-native'
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
      return new File(Paths.document, 'scores', file).base64()
    } catch {
      return null
    }
  }, [file])

  const onScoreLoaded = async (summary: ScoreSummary) => {
    setTitle(summary.title || file || 'Untitled')
    setTracks(summary.tracks)
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title }} />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <TabView
            fileBase64={fileBase64}
            tex={null}
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
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
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
```

- [ ] **Step 4: Typecheck and smoke on simulator**

```bash
npm run typecheck -w @gtr/mobile
cd apps/mobile && npx expo start
```

Press `i` to open the dev client on the simulator. The Library placeholder still shows; navigate manually by adding a temporary link — instead, quicker: in the smoke screen from Task 6 you already verified TabView; here verify the player screen compiles and renders by visiting `gtr:///player` is NOT needed — Task 8 wires real navigation. For now confirm no red-screen and typecheck passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: player screen with @expo/ui transport bar and track panel"
```

---

### Task 8: Library screen + file import

**Files:**
- Create: `apps/mobile/lib/library.ts`
- Modify: `apps/mobile/app/index.tsx` (replace smoke screen entirely)

- [ ] **Step 1: Write apps/mobile/lib/library.ts**

```ts
import { Directory, File, Paths } from 'expo-file-system'
import type { ProjectEntry } from '@gtr/shared'

const scoresDir = new Directory(Paths.document, 'scores')
const indexFile = new File(Paths.document, 'library.json')

export function loadLibrary(): ProjectEntry[] {
  try {
    if (!indexFile.exists) return []
    const parsed = JSON.parse(indexFile.text())
    return Array.isArray(parsed) ? (parsed as ProjectEntry[]) : []
  } catch {
    return []
  }
}

function saveLibrary(entries: ProjectEntry[]): void {
  indexFile.write(JSON.stringify(entries))
}

export function importScore(sourceUri: string, fileName: string): ProjectEntry[] {
  scoresDir.create({ intermediates: true, idempotent: true })
  const dest = new File(scoresDir, fileName)
  if (dest.exists) dest.delete()
  new File(sourceUri).copy(dest)
  const entry: ProjectEntry = { filePath: fileName, fileName, addedAt: Date.now() }
  const next = [entry, ...loadLibrary().filter((e) => e.fileName !== fileName)]
  saveLibrary(next)
  return next
}

export function removeScore(fileName: string): ProjectEntry[] {
  const f = new File(scoresDir, fileName)
  if (f.exists) f.delete()
  const next = loadLibrary().filter((e) => e.fileName !== fileName)
  saveLibrary(next)
  return next
}
```

- [ ] **Step 2: Replace apps/mobile/app/index.tsx with the real Library screen**

```tsx
import { useCallback, useState } from 'react'
import { FlatList, Pressable, Text, View, Alert } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { Host, Button } from '@expo/ui/swift-ui'
import { loadLibrary, importScore, removeScore } from '@/lib/library'
import type { ProjectEntry } from '@gtr/shared'

export default function Library() {
  const router = useRouter()
  const [entries, setEntries] = useState<ProjectEntry[]>([])

  useFocusEffect(
    useCallback(() => {
      setEntries(loadLibrary())
    }, [])
  )

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: '*/*'
    })
    if (res.canceled || !res.assets?.length) return
    const asset = res.assets[0]
    try {
      setEntries(importScore(asset.uri, asset.name))
    } catch (e) {
      Alert.alert('Import failed', String(e))
    }
  }

  const confirmRemove = (entry: ProjectEntry) => {
    Alert.alert('Remove tab?', entry.fileName, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setEntries(removeScore(entry.fileName))
      }
    ])
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.fileName}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, gap: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '600' }}>No tabs yet</Text>
            <Text style={{ opacity: 0.6 }}>Import a Guitar Pro file to get started.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/player', params: { file: item.fileName } })
            }
            onLongPress={() => confirmRemove(item)}
            style={{
              padding: 16,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: 'rgba(128,128,128,0.08)',
              gap: 4
            }}>
            <Text style={{ fontSize: 17, fontWeight: '600' }} selectable>
              {item.fileName}
            </Text>
            <Text style={{ opacity: 0.6, fontSize: 13 }}>
              Added {new Date(item.addedAt).toLocaleDateString()}
            </Text>
          </Pressable>
        )}
      />
      <View style={{ alignItems: 'center', padding: 16 }}>
        <Host matchContents>
          <Button systemImage="plus" onPress={pickFile}>
            Import Tab
          </Button>
        </Host>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck -w @gtr/mobile
```

Expected: exit 0.

- [ ] **Step 4: End-to-end verify on simulator**

```bash
cd apps/mobile && npx expo start
```

In the simulator: drag a `.gp`/`.gp5` file onto the simulator window first (it lands in Files → On My iPad). Then in the app: **Import Tab** → pick the file → it appears in the list → tap it → player opens, notation renders → Play produces audio → speed slider, zoom buttons, and the Tracks panel (select/mute/solo/volume) all work → long-press a library row removes it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: library screen with document import and player navigation"
```

---

### Task 9: iPad device run + polish

**Files:**
- Modify: only if fixes surface during device testing

- [ ] **Step 1: Run on the physical iPad**

Connect the iPad via USB (unlock it, trust the Mac). Then:

```bash
cd apps/mobile
npx expo run:ios --device
```

Select the iPad from the device list. Xcode signs with the paid-account team automatically if configured; if signing fails, run `open ios/*.xcworkspace`, select the team under Signing & Capabilities, then re-run.

- [ ] **Step 2: Verify on device**

Full pass: import a real Guitar Pro file via the Files app picker, render, play (check audio through speakers), speed/zoom/tracks, dark + light appearance (toggle system appearance in Settings), rotation landscape/portrait.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: iPad device polish"
```

(Skip the commit if no changes were needed.)

---

### Task 10 (optional, when stable): TestFlight

- [ ] **Step 1: Configure EAS**

```bash
cd apps/mobile
npx eas init
npx eas build:configure
```

This creates `eas.json` and links the project to your Expo account.

- [ ] **Step 2: Build and submit**

```bash
npx eas build --platform ios --profile production
npx eas submit --platform ios --latest
```

Requires App Store Connect API access on first run (interactive prompts). After processing, install on the iPad via the TestFlight app; builds remain installable for 90 days.

- [ ] **Step 3: Commit eas.json**

```bash
git add eas.json && git commit -m "chore: add EAS build config"
```

---

## Self-review notes (already applied)

- Spec coverage: monorepo layout (T1), shared package + hook refactor (T2), desktop unchanged-behavior verification (T3), CI (T4), scaffold (T5), font/soundfont milestone-first risk validation (T6), player + native shell (T7), library (T8), device + theme + errors (T7–T9), TestFlight (T10). Practice mode / fretboard / chords / export on mobile are deferred per spec.
- The desktop `tsc --noEmit` failure is pre-existing (missing `lib` settings) and explicitly out of scope; do not "fix" it mid-plan.
- `exportAlphaTex` callback takes `Uint8Array`; the desktop adapter converts to `number[]` for IPC at the call site (T3 Step 5).
