import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data: number[]) => ipcRenderer.invoke('dialog:saveFile', data),
  saveToPath: (path: string, data: number[]) => ipcRenderer.invoke('file:save', path, data),
  readFile: (path: string) => ipcRenderer.invoke('file:readPath', path),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value)
    ipcRenderer.on('fullscreen-changed', handler)
    return () => ipcRenderer.removeListener('fullscreen-changed', handler)
  },
  saveExport: (
    data: number[],
    defaultName: string,
    filters: { name: string; extensions: string[] }[]
  ) => ipcRenderer.invoke('export:saveBuffer', data, defaultName, filters)
})
