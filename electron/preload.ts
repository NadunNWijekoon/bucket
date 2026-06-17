import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  windowAction: (action: string) => ipcRenderer.send('window-action', action),
  getDownloadPath: () => ipcRenderer.invoke('get-download-path'),
  openFolder: (path?: string) => ipcRenderer.invoke('open-folder', path),
  startDownload: (data: { id: string, url: string, filename: string, defaultFolder: string, downloaded: number }) => ipcRenderer.send('start-download', data),
  cancelDownload: (id: string) => ipcRenderer.send('cancel-download', id),

  onDownloadProgress: (id: string, callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on(`download-progress-${id}`, subscription)
    return () => ipcRenderer.removeListener(`download-progress-${id}`, subscription)
  },

  onDownloadMetadata: (id: string, callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on(`download-metadata-${id}`, subscription)
    return () => ipcRenderer.removeListener(`download-metadata-${id}`, subscription)
  },

  // Use persistent listeners + return unsubscribe so the store can clean them up on cancel/pause.
  onDownloadCompleted: (id: string, callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on(`download-completed-${id}`, subscription)
    return () => ipcRenderer.removeListener(`download-completed-${id}`, subscription)
  },

  onDownloadFailed: (id: string, callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on(`download-failed-${id}`, subscription)
    return () => ipcRenderer.removeListener(`download-failed-${id}`, subscription)
  },
})
