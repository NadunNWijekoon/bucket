import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

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
}

const AppContext = createContext<AppState | null>(null);

// ========================================
// Provider
// ========================================

export function AppProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [downloads, setDownloads] = useState<DownloadItem[]>(INITIAL_DOWNLOADS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'single' | 'batch' | 'import'>('single');

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('bucket-theme') as Theme;
    return saved || 'amoled';
  });

  const [accentColor, setAccentColor] = useState<string>(() => {
    const saved = localStorage.getItem('bucket-accent');
    return saved || '#0095ff';
  });

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

  // Real or Simulated download progress
  useEffect(() => {
    const inElectron = !!(window as any).electronAPI;
    if (!inElectron) {
      // Simulation for Web
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
    } else {
      // Real Electron Logic
      const progressUnsubs: (() => void)[] = [];

      downloads.forEach(dl => {
        if (dl.status === 'downloading') {
          const unsub = window.electronAPI.onDownloadProgress(dl.id, (data) => {
            setDownloads(prev => prev.map(item => {
              if (item.id === dl.id) {
                const remaining = item.size - data.transferred;
                return {
                  ...item,
                  downloaded: data.transferred,
                  speed: data.speed,
                  eta: data.speed > 0 ? remaining / data.speed : 0
                };
              }
              return item;
            }));
          });
          progressUnsubs.push(unsub);

          window.electronAPI.onDownloadCompleted(dl.id, () => {
            setDownloads(prev => prev.map(item =>
              item.id === dl.id ? { ...item, status: 'completed', completedAt: Date.now(), speed: 0, eta: 0 } : item
            ));
          });

          window.electronAPI.onDownloadFailed(dl.id, (err) => {
            console.error(`Download failed: ${dl.filename}`, err);
            setDownloads(prev => prev.map(item =>
              item.id === dl.id ? { ...item, status: 'failed', speed: 0, eta: 0 } : item
            ));
          });
        }
      });

      // Metadata subscriptions (filename, total size)
      downloads.forEach(dl => {
        if (dl.status === 'downloading') {
          const metaUnsub = window.electronAPI.onDownloadMetadata(dl.id, (meta) => {
            setDownloads(prev => prev.map(item => item.id === dl.id ? {
              ...item,
              size: typeof meta.total === 'number' ? meta.total : item.size,
              filename: meta.filename || item.filename,
            } : item));
          });
          progressUnsubs.push(metaUnsub);
        }
      });

      return () => progressUnsubs.forEach(u => u());
    }
  }, [downloads.length]);

  const addDownload = useCallback((filename: string, url: string, size: number, category: FileCategory) => {
    const id = crypto.randomUUID();
    const newDl: DownloadItem = {
      id,
      filename,
      url,
      size,
      downloaded: 0,
      speed: 0,
        status: (window as any).electronAPI ? 'downloading' : 'queued',
      category,
      addedAt: Date.now(),
    };
    
    setDownloads(prev => [...prev, newDl]);

    if ((window as any).electronAPI) {
      try {
        // Helpful debug log to ensure renderer is invoking the main process correctly
        console.log('[renderer] startDownload', { id, url, filename });
        (window as any).electronAPI.startDownload({ id, url, filename });
      } catch (err) {
        console.error('[renderer] startDownload error', err);
        // Mark item failed locally so UI reflects the error
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'failed' as DownloadStatus } : d));
      }
    }
  }, [setDownloads]);

  const pauseDownload = useCallback((id: string) => {
    if ((window as any).electronAPI) {
       // Future: implement pause in main process
       (window as any).electronAPI.cancelDownload(id);
    }
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'paused' as DownloadStatus, speed: 0 } : d));
  }, [setDownloads]);

  const resumeDownload = useCallback((id: string) => {
    const dl = downloads.find(d => d.id === id);
    if ((window as any).electronAPI && dl) {
      (window as any).electronAPI.startDownload({ id: dl.id, url: dl.url, filename: dl.filename });
    }
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'downloading' as DownloadStatus } : d));
  }, [downloads, setDownloads]);

  const cancelDownload = useCallback((id: string) => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.cancelDownload(id);
    }
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
      path: `C:\\Downloads\\Bucket\\${d.filename}`, // Example path
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
// Helpers (Unchanged)
// ========================================

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

// ========================================
// Initial Mock Data
// ========================================

const INITIAL_DOWNLOADS: DownloadItem[] = [
  {
    id: 'mock-1',
    filename: 'Big Buck Bunny 4K.mp4',
    url: 'https://example.com/bbb-4k.mp4',
    size: 2_100_000_000,
    downloaded: 2_100_000_000,
    speed: 0,
    status: 'completed',
    category: 'video',
    addedAt: Date.now() - 7200000,
    completedAt: Date.now() - 3600000,
  },
  {
    id: 'mock-2',
    filename: 'lofi-music-collection.zip',
    url: 'https://example.com/lofi-pack.zip',
    size: 1_100_000_000,
    downloaded: 1_100_000_000,
    speed: 0,
    status: 'completed',
    category: 'archive',
    addedAt: Date.now() - 86400000,
    completedAt: Date.now() - 82800000,
  },
];
