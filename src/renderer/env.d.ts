/// <reference types="vite/client" />

interface FileResult {
  data: number[]
  filePath: string
  fileName: string
}

interface FileReadError {
  error: 'FILE_NOT_FOUND' | 'READ_ERROR'
}

interface ElectronAPI {
  openFile: () => Promise<FileResult | null>
  saveFile: (data: number[]) => Promise<boolean>
  saveToPath: (path: string, data: number[]) => Promise<boolean>
  readFile: (path: string) => Promise<FileResult | FileReadError>
}

interface Window {
  api: ElectronAPI
}
