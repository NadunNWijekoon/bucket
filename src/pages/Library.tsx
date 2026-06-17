import { useState } from 'react';
import { useApp, formatBytes, formatDate, getCategoryIcon, getCategoryColor, type FileCategory } from '../store/appStore';

const CATEGORIES: { id: FileCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Files', icon: '📁' },
  { id: 'video', label: 'Videos', icon: '🎬' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'image', label: 'Images', icon: '🖼️' },
  { id: 'document', label: 'Documents', icon: '📄' },
  { id: 'archive', label: 'Archives', icon: '📦' },
];

export default function Library() {
  const { libraryFiles } = useApp();
  const [activeCategory, setActiveCategory] = useState<FileCategory | 'all'>('all');

  const filtered = activeCategory === 'all'
    ? libraryFiles
    : libraryFiles.filter(f => f.category === activeCategory);

  const categoryCounts = CATEGORIES.map(cat => ({
    ...cat,
    count: cat.id === 'all' ? libraryFiles.length : libraryFiles.filter(f => f.category === cat.id).length,
  }));

  return (
    <div className="animate-in" id="library-page">
      <div className="page-header">
        <h1>Library</h1>
        <p>Browse and organize your downloaded files</p>
      </div>

      <div className="library-toolbar">
        <div className="library-categories">
          {categoryCounts.map(cat => (
            <button
              key={cat.id}
              className={`category-tab${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              id={`lib-cat-${cat.id}`}
            >
              {cat.icon} {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-text">No files yet</div>
          <div className="empty-state-sub">Completed downloads will appear here</div>
        </div>
      ) : (
        <div className="library-grid">
          {filtered.map((file, i) => (
            <div
              className="glass-card library-file-card animate-in"
              key={file.id}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="file-card-icon" style={{ background: `${getCategoryColor(file.category)}15` }}>
                {getCategoryIcon(file.category)}
              </div>
              <div className="file-card-name" title={file.filename}>{file.filename}</div>
              <div className="file-card-meta">
                {formatBytes(file.size)} · {formatDate(file.addedAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
