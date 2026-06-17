import { useState } from 'react';
import {
  useApp,
  formatBytes,
  formatSpeed,
  formatEta,
  getCategoryIcon,
  getCategoryColor,
  type FileCategory,
} from '../store/appStore';

function getFileCategoryFromName(filename: string): FileCategory {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'flac', 'wav', 'aac', 'ogg'].includes(ext)) return 'music';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['pdf', 'doc', 'docx', 'txt', 'pptx', 'xlsx'].includes(ext)) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'other';
}

export default function Downloads() {
  const { downloads, addDownload, pauseDownload, resumeDownload, cancelDownload, openDownloadFolder } = useApp();
  const [urlInput, setUrlInput] = useState('');

  const activeDownloads = downloads.filter(d => d.status !== 'completed');
  const activeCount = downloads.filter(d => d.status === 'downloading').length;
  const totalProgress = activeDownloads.length > 0
    ? activeDownloads.reduce((sum, d) => sum + (d.size > 0 ? d.downloaded / d.size : 0), 0) / activeDownloads.length * 100
    : 0;
  const totalSpeed = downloads.filter(d => d.status === 'downloading').reduce((s, d) => s + d.speed, 0);
  const totalDownloaded = downloads.filter(d => d.status === 'downloading').reduce((s, d) => s + d.downloaded, 0);
  const totalSize = downloads.filter(d => d.status === 'downloading').reduce((s, d) => s + d.size, 0);
  const circumference = 2 * Math.PI * 48;

  const handleAdd = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const filename = url.split('/').pop() || `download-${Date.now()}.bin`;
    // We'll trust the headers for real size, but use 1GB for UI if unknown
    const size = 0; // unknown size; will update when main process reports content-length
    const category = getFileCategoryFromName(filename);
    addDownload(filename, url, size, category);
    setUrlInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="animate-in" id="downloads-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Downloads</h1>
          <p>Manage your download queue and active transfers</p>
        </div>
        <button className="quick-action-btn" onClick={openDownloadFolder} id="open-downloads-folder-btn">
          <span className="icon">📂</span> Open Folder
        </button>
      </div>

      {/* URL Input */}
      <div className="url-input-area">
        <div className="url-input-row">
          <div className="url-input-wrapper">
            <span className="url-input-icon">🔗</span>
            <input
              type="text"
              placeholder="Paste URL to start downloading..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={handleKeyDown}
              id="url-input"
            />
          </div>
          <button className="url-add-btn" onClick={handleAdd} id="add-download-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      {activeDownloads.length > 0 && (
        <div className="glass-card panel downloads-overview animate-in animate-in-delay-1">
          <div>
            <div className="panel-title" style={{ marginBottom: 16 }}>Progress Tracking</div>
            <div className="progress-stats">
              <div className="progress-stat-row">
                <span className="dot" style={{ background: 'var(--accent-blue)' }} />
                <span className="label">Active</span>
                <span className="val">{activeCount}</span>
              </div>
              <div className="progress-stat-row">
                <span className="dot" style={{ background: 'var(--accent-cyan)' }} />
                <span className="label">Speed</span>
                <span className="val">{formatSpeed(totalSpeed)}</span>
              </div>
              <div className="progress-stat-row">
                <span className="dot" style={{ background: 'var(--accent-green)' }} />
                <span className="label">Downloaded</span>
                <span className="val">{formatBytes(totalDownloaded)} / {formatBytes(totalSize)}</span>
              </div>
            </div>
          </div>
          <div className="circular-progress">
            <svg viewBox="0 0 120 120">
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent-blue)" />
                  <stop offset="100%" stopColor="var(--accent-cyan)" />
                </linearGradient>
              </defs>
              <circle className="bg" cx="60" cy="60" r="48" />
              <circle
                className="fill"
                cx="60" cy="60" r="48"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * Math.min(totalProgress, 100)) / 100}
              />
            </svg>
            <div className="value">
              <div className="number">{Math.round(totalProgress)}</div>
              <div className="unit">percent</div>
            </div>
          </div>
        </div>
      )}

      {/* Download Queue */}
      <div className="panel-title" style={{ marginBottom: 12, marginTop: 8 }}>Queue</div>
      <div className="download-queue">
        {activeDownloads.length === 0 && (
          <div className="glass-card empty-state">
            <div className="empty-state-icon">📥</div>
            <div className="empty-state-text">No active downloads</div>
            <div className="empty-state-sub">Paste a URL above to start downloading</div>
          </div>
        )}
        {activeDownloads.map((dl, i) => {
          const progress = dl.size > 0 ? (dl.downloaded / dl.size) * 100 : 0;
          return (
            <div className="glass-card download-item animate-in" key={dl.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <span className="dl-number">{i + 1}</span>
              <div className="dl-icon" style={{ background: `${getCategoryColor(dl.category)}15` }}>
                {getCategoryIcon(dl.category)}
              </div>
              <div className="dl-info">
                <div className="dl-name">{dl.filename}</div>
                <div className="dl-progress-bar">
                  <div
                    className={`dl-progress-fill${dl.status === 'downloading' ? ' active' : ''}${dl.status === 'paused' ? ' paused' : ''}${dl.status === 'completed' ? ' completed' : ''}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="dl-meta">
                  {dl.status === 'downloading' && <span>{formatSpeed(dl.speed)}</span>}
                  {dl.status === 'downloading' && dl.eta && <span>ETA: {formatEta(dl.eta)}</span>}
                  <span>{formatBytes(dl.downloaded)} / {formatBytes(dl.size)}</span>
                </div>
              </div>
              <span className="dl-size">{formatBytes(dl.size)}</span>
              <span className={`dl-status-badge ${dl.status}`}>
                {dl.status === 'downloading' ? 'Downloading' : dl.status === 'paused' ? 'Paused' : dl.status === 'queued' ? 'Queued' : dl.status === 'completed' ? 'Completed' : 'Failed'}
              </span>
              <div className="dl-actions">
                {dl.status === 'downloading' && (
                  <button className="dl-action-btn" onClick={() => pauseDownload(dl.id)} title="Pause">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                  </button>
                )}
                {dl.status === 'paused' && (
                  <button className="dl-action-btn" onClick={() => resumeDownload(dl.id)} title="Resume">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </button>
                )}
                <button className="dl-action-btn danger" onClick={() => cancelDownload(dl.id)} title="Cancel">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
