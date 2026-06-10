/// <reference types="vite/client" />

interface FileResult {
  data: number[]
  filePath: string
  fileName: string
}

interface FileReadError {
  error: 'FILE_NOT_FOUND' | 'READ_ERROR'
}

interface ExportFilter {
  name: string
  extensions: string[]
}

interface ElectronAPI {
  openFile: () => Promise<FileResult | null>
  saveFile: (data: number[]) => Promise<boolean>
  saveToPath: (path: string, data: number[]) => Promise<boolean>
  readFile: (path: string) => Promise<FileResult | FileReadError>
  toggleFullscreen: () => Promise<void>
  isFullscreen: () => Promise<boolean>
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => () => void
  saveExport: (data: number[], defaultName: string, filters: ExportFilter[]) => Promise<boolean>
}

interface Window {
  api: ElectronAPI
}
