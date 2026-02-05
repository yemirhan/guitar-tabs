import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data: number[]) => ipcRenderer.invoke('dialog:saveFile', data),
  saveToPath: (path: string, data: number[]) => ipcRenderer.invoke('file:save', path, data),
  readFile: (path: string) => ipcRenderer.invoke('file:readPath', path)
})
