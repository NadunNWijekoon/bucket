import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  windowAction: (action: string) => ipcRenderer.send('window-action', action),
  getDownloadPath: () => ipcRenderer.invoke('get-download-path'),
  openFolder: (path?: string) => ipcRenderer.invoke('open-folder', path),
  startDownload: (data: { id: string, url: string, filename: string }) => ipcRenderer.send('start-download', data),
  cancelDownload: (id: string) => ipcRenderer.send('cancel-download', id),
  onDownloadProgress: (id: string, callback: any) => {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on(`download-progress-${id}`, subscription)
    return () => ipcRenderer.removeListener(`download-progress-${id}`, subscription)
  },
  onDownloadMetadata: (id: string, callback: any) => {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on(`download-metadata-${id}`, subscription)
    return () => ipcRenderer.removeListener(`download-metadata-${id}`, subscription)
  },
  onDownloadCompleted: (id: string, callback: any) => {
    ipcRenderer.once(`download-completed-${id}`, (_event: any, data: any) => callback(data))
  },
  onDownloadFailed: (id: string, callback: any) => {
    ipcRenderer.once(`download-failed-${id}`, (_event: any, data: any) => callback(data))
  }
})
