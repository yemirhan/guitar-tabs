# Monorepo Conversion + Expo iPad App — Design

**Date:** 2026-06-10
**Status:** Approved

## Goal

Convert the guitar-tab-reader Electron app into an npm-workspaces monorepo with a
shared package, and add a new Expo SDK 56 iPad app that replicates the desktop
app's core functionality (open Guitar Pro files, render notation, play back with
track/tempo/zoom control) using native SwiftUI UI via `@expo/ui` and the
web-only alphaTab engine inside an Expo DOM component.

## Decisions

| Decision | Choice |
|---|---|
| Target device | iPad (SwiftUI via `@expo/ui`) |
| Native/web split | Native shell + DOM component for the alphaTab surface only |
| Monorepo tooling | npm workspaces (no Turborepo for now) |
| Sharing depth | One shared package: pure types + alphaTab web core |
| v1 mobile scope | Core reading + playback (see Scope) |
| Distribution | Dev client for iteration; TestFlight via paid Apple Developer account |

## 1. Monorepo layout

```
guitar-tab-reader/
├─ package.json              # workspaces: ["apps/*", "packages/*"]
├─ apps/
│  ├─ desktop/               # existing Electron app, moved via git mv
│  └─ mobile/                # new Expo SDK 56 app
└─ packages/
   └─ shared/                # @gtr/shared
      ├─ src/types/          # pure TS: PlaybackRange, ProjectEntry,
      │                      #   file/export types, zoom/theme constants
      └─ src/web/            # useAlphaTab hook + theme-color logic
```

- `@gtr/shared` ships TypeScript source directly (no build step). Two exports:
  - `.` — pure types and constants, safe to import from React Native code.
  - `./web` — alphaTab integration (`useAlphaTab`, theme color application);
    web environments only (Electron renderer, Expo DOM component).
- Both electron-vite and Metro transpile workspace TS source; no compile step
  or project references needed.
- Desktop app moves to `apps/desktop` with **no behavior change**. Imports
  update: shared types and `useAlphaTab` come from `@gtr/shared`.
  Electron-specific types (`ElectronAPI`, `Window.api`) stay in the desktop
  app — they describe its IPC surface, not shared domain.
- electron-builder config, build scripts, and CI references move with the app.

### `useAlphaTab` refactor (the one real change to shared code)

The hook currently hardcodes Electron-renderer assumptions. It gains an options
parameter:

```ts
interface UseAlphaTabOptions {
  fontDirectory: string        // desktop: 'font/'; mobile: Metro asset URL dir
  soundFontUrl: string         // desktop: 'soundfont/sonivox.sf2'; mobile: asset URL
  onExportFile?: (data: Uint8Array, name: string, filters: ExportFilter[]) => Promise<boolean>
                               // desktop: window.api.saveExport; mobile: omitted in v1
}
```

`localStorage` usage (zoom, staveProfile) stays as-is — available in both
Electron and WKWebView.

## 2. Mobile app (`apps/mobile`)

- Expo SDK 56, expo-router, dev client via prebuild/CNG (`@expo/ui` and DOM
  components do not run in Expo Go).
- `@expo/ui` (SwiftUI) for all native chrome; plain RN views as fallback where
  `@expo/ui` falls short.

### Screens

1. **Library** — saved tabs list. Files picked with `expo-document-picker` and
   copied into the app documents directory (`scores/`) so they persist. List
   shows file name + added date; swipe to delete. Filesystem is the source of
   truth; metadata (recency) in AsyncStorage.
2. **Player** — native shell + DOM tab view:
   - **DOM component** (`'use dom'`): wraps shared `useAlphaTab`. Receives
     serializable props: file bytes (base64), theme, zoom, and a command
     channel for play/pause/stop/track operations. Sends events up via async
     function props: score loaded (with serialized track list), player state
     changed, errors.
   - **Native shell**: `@expo/ui` transport bar (play/pause/stop, speed
     slider, zoom stepper), track sheet/sidebar (select, mute, solo, volume),
     system light/dark theme passed to alphaTab theme colors.

### v1 scope

In: open files + library, notation rendering, audio playback, playback speed,
track select/mute/solo/volume, zoom, light/dark theme.

Deferred to follow-up: practice mode (loop/gradual tempo/count-in), fretboard,
chord diagrams, export (PDF/MIDI/AlphaTex), instrument change, edit panel.

### Distribution

Daily iteration with the dev client over LAN. When stable: Xcode/EAS build to
TestFlight (paid Apple Developer account; builds installable over the air,
valid 90 days).

## 3. Risks & mitigations

- **alphaTab web workers in the webview.** Metro doesn't bundle alphaTab's
  layout/synth workers the way `alphaTab-vite` does. Mitigation: run with
  `settings.core.useWorkers = false` (alphaTab supports main-thread layout and
  synth fallback) — acceptable for a single-score viewer. Plan B: serve worker
  files as static assets to the DOM bundle.
- **Font + soundfont delivery.** Bravura font files and `sonivox.sf2` must
  resolve as URLs inside the DOM component. Metro bundles them as assets;
  their URIs are passed through `UseAlphaTabOptions`. **This is milestone 1 of
  mobile work**: render a hardcoded score with sound before building any UI.
- **`@expo/ui` maturity.** Components may be rough; fall back to plain RN
  views without architectural change.

## 4. Error handling

- DOM component reports load/render/player errors up through an `onError`
  function prop; native shows an alert and returns to Library.
- Corrupt/unsupported files surface alphaTab's error event the same way.
- Desktop app keeps its existing ErrorBoundary behavior unchanged.

## 5. Verification

- `npx tsc --noEmit` in each workspace.
- Desktop must build and run identically after the move
  (`npm run dev` in `apps/desktop`, plus a production `build:mac` smoke check)
  **before** mobile work begins.
- Mobile verified on the iOS simulator first, then on the iPad via dev client.
