import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

// ========================================
// Types
// ========================================

export type Page = 'dashboard' | 'downloads' | 'library' | 'history' | 'settings';
export type Theme = 'dark' | 'amoled' | 'light';
export type DownloadStatus = 'downloading' | 'paused' | 'queued' | 'completed' | 'failed';
export type FileCategory = 'video' | 'music' | 'image' | 'document' | 'archive' | 'other';

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  size: number; // bytes
  downloaded: number; // bytes
  speed: number; // bytes/sec
  status: DownloadStatus;
  category: FileCategory;
  addedAt: number;
  completedAt?: number;
  eta?: number; // seconds
  finalFilePath?: string;
}

export interface LibraryFile {
  id: string;
  filename: string;
  size: number;
  category: FileCategory;
  addedAt: number;
  path: string;
}

export interface AppState {
  activePage: Page;
  setActivePage: (page: Page) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  downloads: DownloadItem[];
  setDownloads: React.Dispatch<React.SetStateAction<DownloadItem[]>>;
  addDownload: (filename: string, url: string, size: number, category: FileCategory) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  openDownloadFolder: () => void;
  libraryFiles: LibraryFile[];
  globalSpeed: number;
  activeDownloadCount: number;
  totalStorageUsed: number;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (v: boolean) => void;
  addModalTab: 'single' | 'batch' | 'import';
  setAddModalTab: (tab: 'single' | 'batch' | 'import') => void;
  openAddModal: (tab?: 'single' | 'batch' | 'import') => void;
  closeAddModal: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  hardwareAccel: boolean;
  setHardwareAccel: (v: boolean) => void;
  notifications: boolean;
  setNotifications: (v: boolean) => void;
  autoStart: boolean;
  setAutoStart: (v: boolean) => void;
  concurrentLimit: number;
  setConcurrentLimit: (v: number) => void;
  speedLimit: string;
  setSpeedLimit: (v: string) => void;
  defaultFolder: string;
  setDefaultFolder: (v: string) => void;
}

const AppContext = createContext<AppState | null>(null);

// ========================================
// Provider
// ========================================

export function AppProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'single' | 'batch' | 'import'>('single');
  const [searchQuery, setSearchQuery] = useState('');

  // Persisted state
  const [downloads, setDownloads] = useState<DownloadItem[]>(() => {
    try {
      const saved = localStorage.getItem('bucket-downloads');
      if (saved) {
        const parsed = JSON.parse(saved) as DownloadItem[];
        // Any download that was "downloading" when app closed is now "paused" or "failed"
        return parsed.map(d => d.status === 'downloading' ? { ...d, status: 'paused', speed: 0, eta: 0 } : d);
      }
    } catch {}
    return [];
  });

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('bucket-theme') as Theme) || 'amoled');
  const [accentColor, setAccentColor] = useState<string>(() => localStorage.getItem('bucket-accent') || '#0095ff');
  
  const [hardwareAccel, setHardwareAccel] = useState<boolean>(() => localStorage.getItem('bucket-hardwareAccel') !== 'false');
  const [notifications, setNotifications] = useState<boolean>(() => localStorage.getItem('bucket-notifications') !== 'false');
  const [autoStart, setAutoStart] = useState<boolean>(() => localStorage.getItem('bucket-autoStart') === 'true');
  const [concurrentLimit, setConcurrentLimit] = useState<number>(() => parseInt(localStorage.getItem('bucket-concurrentLimit') || '3', 10));
  const [speedLimit, setSpeedLimit] = useState<string>(() => localStorage.getItem('bucket-speedLimit') || 'unlimited');
  const [defaultFolder, setDefaultFolder] = useState<string>(() => {
    // If we're in electron, we could fetch default from main process, but for now fallback to standard
    return localStorage.getItem('bucket-defaultFolder') || 'C:\\Users\\Downloads\\Bucket';
  });

  // Effects to persist state
  useEffect(() => {
    localStorage.setItem('bucket-downloads', JSON.stringify(downloads));
  }, [downloads]);

  useEffect(() => {
    localStorage.setItem('bucket-hardwareAccel', hardwareAccel.toString());
  }, [hardwareAccel]);

  useEffect(() => {
    localStorage.setItem('bucket-notifications', notifications.toString());
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('bucket-autoStart', autoStart.toString());
  }, [autoStart]);

  useEffect(() => {
    localStorage.setItem('bucket-concurrentLimit', concurrentLimit.toString());
  }, [concurrentLimit]);

  useEffect(() => {
    localStorage.setItem('bucket-speedLimit', speedLimit);
  }, [speedLimit]);

  useEffect(() => {
    localStorage.setItem('bucket-defaultFolder', defaultFolder);
  }, [defaultFolder]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-amoled', 'theme-light');
    root.classList.add(`theme-${theme}`);
    localStorage.setItem('bucket-theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-blue', accentColor);
    const gradientPairs: Record<string, string> = {
      '#0095ff': '#00d4ff',
      '#00d4ff': '#00e68a',
      '#7b61ff': '#a78bfa',
      '#00e68a': '#00d4ff',
      '#ff8c42': '#ffb07c',
      '#ff6b9d': '#fca5a5',
      '#ff4757': '#ff6b81',
    };
    const secondary = gradientPairs[accentColor] || '#00d4ff';
    root.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${accentColor}, ${secondary})`);
    root.style.setProperty('--shadow-glow-blue', `0 0 20px ${accentColor}25`);
    localStorage.setItem('bucket-accent', accentColor);
  }, [accentColor]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(v => !v), []);

  const openAddModal = useCallback((tab: 'single' | 'batch' | 'import' = 'single') => {
    setAddModalTab(tab);
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  // Simulation for Web (non-Electron)
  useEffect(() => {
    if ((window as any).electronAPI) return;
    const interval = setInterval(() => {
      setDownloads(prev => prev.map(dl => {
        if (dl.status !== 'downloading') return dl;
        const speed = 800000 + Math.random() * 4200000;
        const newDownloaded = Math.min(dl.downloaded + speed * 0.5, dl.size);
        const remaining = dl.size - newDownloaded;
        const eta = speed > 0 ? remaining / speed : 0;
        if (newDownloaded >= dl.size) {
          return { ...dl, downloaded: dl.size, speed: 0, status: 'completed' as DownloadStatus, completedAt: Date.now(), eta: 0 };
        }
        return { ...dl, downloaded: newDownloaded, speed, eta };
      }));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Registry of active IPC unsubscribe functions, keyed by download id.
  // Using a ref so registration doesn't trigger re-renders.
  const ipcCleanupRef = useRef<Map<string, (() => void)[]>>(new Map());

  const registerDownloadListeners = useCallback((dl: DownloadItem) => {
    if (!(window as any).electronAPI) return;
    // Prevent double-registration
    if (ipcCleanupRef.current.has(dl.id)) return;

    const cleanups: (() => void)[] = [];

    // Progress
    const unsubProgress = window.electronAPI.onDownloadProgress(dl.id, (data: any) => {
      setDownloads(prev => prev.map(item => {
        if (item.id !== dl.id) return item;
        const transferred = data.transferred ?? 0;
        const total = data.total ?? item.size;
        const speed = data.speed ?? 0;
        const remaining = total > 0 ? total - transferred : 0;
        return {
          ...item,
          downloaded: transferred,
          size: total > 0 ? total : item.size,
          speed,
          eta: speed > 0 && remaining > 0 ? remaining / speed : 0,
        };
      }));
    });
    cleanups.push(unsubProgress);

    // Metadata (filename / total size from response headers).
    // Also re-derives category from the real server-provided filename so that
    // e.g. a URL with no extension still gets the right icon once headers arrive.
    const unsubMeta = window.electronAPI.onDownloadMetadata(dl.id, (meta: any) => {
      setDownloads(prev => prev.map(item => {
        if (item.id !== dl.id) return item;
        const realFilename = meta.filename || item.filename;
        const realSize = typeof meta.total === 'number' && meta.total > 0 ? meta.total : item.size;
        // Only update category if the real filename gives us a better answer
        const derivedCategory = getFileCategoryFromName(realFilename);
        const newCategory = derivedCategory !== 'other' ? derivedCategory : item.category;
        return { ...item, filename: realFilename, size: realSize, category: newCategory };
      }));
    });
    cleanups.push(unsubMeta);

    // Completed
    const unsubCompleted = window.electronAPI.onDownloadCompleted(dl.id, (data: any) => {
      setDownloads(prev => prev.map(item =>
        item.id !== dl.id ? item : { 
          ...item, 
          status: 'completed', 
          completedAt: Date.now(), 
          speed: 0, 
          eta: 0, 
          downloaded: item.size > 0 ? item.size : item.downloaded,
          finalFilePath: data.filePath 
        }
      ));
      // Self-clean all listeners for this download
      const fns = ipcCleanupRef.current.get(dl.id);
      if (fns) { fns.forEach(f => f()); ipcCleanupRef.current.delete(dl.id); }
    });
    cleanups.push(unsubCompleted);

    // Failed
    const unsubFailed = window.electronAPI.onDownloadFailed(dl.id, (err: string) => {
      console.error(`[renderer] Download failed: ${dl.filename}`, err);
      setDownloads(prev => prev.map(item =>
        item.id !== dl.id ? item : { ...item, status: 'failed', speed: 0, eta: 0 }
      ));
      const fns = ipcCleanupRef.current.get(dl.id);
      if (fns) { fns.forEach(f => f()); ipcCleanupRef.current.delete(dl.id); }
    });
    cleanups.push(unsubFailed);

    ipcCleanupRef.current.set(dl.id, cleanups);
  }, []);

  // Queue Manager
  useEffect(() => {
    const activeCount = downloads.filter(d => d.status === 'downloading').length;
    if (activeCount < concurrentLimit) {
      const nextInQueue = downloads.find(d => d.status === 'queued');
      if (nextInQueue) {
        if ((window as any).electronAPI) {
          registerDownloadListeners(nextInQueue);
          try {
            console.log('[renderer] starting from queue', { id: nextInQueue.id, url: nextInQueue.url });
            (window as any).electronAPI.startDownload({
              id: nextInQueue.id,
              url: nextInQueue.url,
              filename: nextInQueue.filename,
              defaultFolder,
              downloaded: nextInQueue.downloaded || 0,
            });
          } catch (err) {
            console.error('[renderer] startDownload error', err);
            setDownloads(prev => prev.map(d => d.id === nextInQueue.id ? { ...d, status: 'failed' } : d));
            const fns = ipcCleanupRef.current.get(nextInQueue.id);
            if (fns) { fns.forEach(f => f()); ipcCleanupRef.current.delete(nextInQueue.id); }
            return;
          }
        }
        setDownloads(prev => prev.map(d => d.id === nextInQueue.id ? { ...d, status: 'downloading' } : d));
      }
    }
  }, [downloads, concurrentLimit, defaultFolder, registerDownloadListeners]);

  const addDownload = useCallback((filename: string, url: string, size: number, category: FileCategory) => {
    const id = crypto.randomUUID();
    const newDl: DownloadItem = {
      id,
      filename,
      url,
      size,
      downloaded: 0,
      speed: 0,
      status: 'queued',
      category,
      addedAt: Date.now(),
    };

    setDownloads(prev => [...prev, newDl]);
  }, []);

  const pauseDownload = useCallback((id: string) => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.cancelDownload(id);
    }
    // Clean up IPC listeners for this download
    const fns = ipcCleanupRef.current.get(id);
    if (fns) { fns.forEach(f => f()); ipcCleanupRef.current.delete(id); }
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'paused' as DownloadStatus, speed: 0 } : d));
  }, [setDownloads]);

  const resumeDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'queued' as DownloadStatus } : d));
  }, []);

  const cancelDownload = useCallback((id: string) => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.cancelDownload(id);
    }
    // Clean up IPC listeners
    const fns = ipcCleanupRef.current.get(id);
    if (fns) { fns.forEach(f => f()); ipcCleanupRef.current.delete(id); }
    setDownloads(prev => prev.filter(d => d.id !== id));
  }, [setDownloads]);

  const openDownloadFolder = useCallback(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.openFolder();
    }
  }, []);

  const libraryFiles: LibraryFile[] = downloads
    .filter(d => d.status === 'completed')
    .map(d => ({
      id: d.id,
      filename: d.filename,
      size: d.size,
      category: d.category,
      addedAt: d.completedAt || d.addedAt,
      path: d.finalFilePath || `C:\\Downloads\\Bucket\\${d.filename}`,
    }));

  const globalSpeed = downloads
    .filter(d => d.status === 'downloading')
    .reduce((sum, d) => sum + d.speed, 0);

  const activeDownloadCount = downloads.filter(d => d.status === 'downloading').length;

  const totalStorageUsed = downloads
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + d.size, 0);

  return (
    <AppContext.Provider value={{
      activePage, setActivePage,
      sidebarCollapsed, setSidebarCollapsed, toggleSidebar,
      downloads, setDownloads, addDownload, pauseDownload, resumeDownload, cancelDownload,
      openDownloadFolder,
      libraryFiles,
      globalSpeed, activeDownloadCount, totalStorageUsed,
      isAddModalOpen, setIsAddModalOpen,
      addModalTab, setAddModalTab,
      openAddModal, closeAddModal,
      theme, setTheme,
      accentColor, setAccentColor,
      searchQuery, setSearchQuery,
      hardwareAccel, setHardwareAccel,
      notifications, setNotifications,
      autoStart, setAutoStart,
      concurrentLimit, setConcurrentLimit,
      speedLimit, setSpeedLimit,
      defaultFolder, setDefaultFolder,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ========================================
// Shared Helpers
// ========================================

/**
 * Extracts a clean filename from a URL, stripping query params and hash
 * so that e.g. https://cdn.example.com/video.mp4?token=abc → "video.mp4"
 */
export function extractFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Take only the path segment, ignore query/hash
    const pathname = parsed.pathname;
    const last = pathname.split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(last);
  } catch {
    // Fallback for malformed URLs
    return url.split('/').pop()?.split('?')[0].split('#')[0] || '';
  }
}

/** Maps a filename (or just its extension) to a FileCategory. */
export function getFileCategoryFromName(filename: string): FileCategory {
  const ext = filename.split('.').pop()?.toLowerCase().split('?')[0].split('#')[0] || '';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'opus', 'wma'].includes(ext)) return 'music';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'].includes(ext)) return 'image';
  if (['pdf', 'doc', 'docx', 'txt', 'pptx', 'ppt', 'xlsx', 'xls', 'csv', 'md'].includes(ext)) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst'].includes(ext)) return 'archive';
  return 'other';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function getCategoryIcon(cat: FileCategory): string {
  switch (cat) {
    case 'video': return '🎬';
    case 'music': return '🎵';
    case 'image': return '🖼️';
    case 'document': return '📄';
    case 'archive': return '📦';
    default: return '📁';
  }
}

export function getCategoryColor(cat: FileCategory): string {
  switch (cat) {
    case 'video': return 'var(--accent-purple)';
    case 'music': return 'var(--accent-cyan)';
    case 'image': return 'var(--accent-green)';
    case 'document': return 'var(--accent-orange)';
    case 'archive': return 'var(--accent-pink)';
    default: return 'var(--accent-blue)';
  }
}

