declare interface Window {
  electronAPI: {
    windowAction: (action: string) => void;
    getDownloadPath: () => Promise<string>;
    openFolder: (path?: string) => Promise<void>;
    startDownload: (data: { id: string, url: string, filename: string }) => void;
    cancelDownload: (id: string) => void;
    onDownloadProgress: (id: string, callback: (data: { percent: number, transferred: number, total: number, speed: number }) => void) => () => void;
    onDownloadMetadata: (id: string, callback: (data: { filename?: string, total?: number }) => void) => () => void;
    onDownloadCompleted: (id: string, callback: (data: { filePath: string }) => void) => void;
    onDownloadFailed: (id: string, callback: (error: string) => void) => void;
  }
}
