import { useApp, formatBytes, formatSpeed, getCategoryIcon, getCategoryColor, formatDate } from '../store/appStore';

const CHART_DATA = [
  { label: 'Mon', value: 65 },
  { label: 'Tue', value: 82 },
  { label: 'Wed', value: 45 },
  { label: 'Thu', value: 93 },
  { label: 'Fri', value: 70 },
  { label: 'Sat', value: 55 },
  { label: 'Sun', value: 78 },
];

export default function Dashboard() {
  const { downloads, totalStorageUsed, globalSpeed, openAddModal, openDownloadFolder } = useApp();

  const completedCount = downloads.filter(d => d.status === 'completed').length;
  const totalCount = downloads.length;
  const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const recentCompleted = downloads
    .filter(d => d.status === 'completed')
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 4);

  return (
    <div className="animate-in" id="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back — here's an overview of your downloads</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="glass-card stat-card blue animate-in animate-in-delay-1">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Files</span>
            <span className="stat-card-icon">📊</span>
          </div>
          <div className="stat-card-value">{totalCount.toLocaleString()}</div>
          <div className="stat-card-sub">Downloaded to date</div>
        </div>
        <div className="glass-card stat-card purple animate-in animate-in-delay-2">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Storage</span>
            <span className="stat-card-icon">💾</span>
          </div>
          <div className="stat-card-value">{formatBytes(totalStorageUsed)}</div>
          <div className="stat-card-sub">Used of 500 GB</div>
        </div>
        <div className="glass-card stat-card green animate-in animate-in-delay-3">
          <div className="stat-card-header">
            <span className="stat-card-label">Average Speed</span>
            <span className="stat-card-icon">⚡</span>
          </div>
          <div className="stat-card-value">{globalSpeed > 0 ? formatSpeed(globalSpeed) : '4.8 MB/s'}</div>
          <div className="stat-card-sub">Current session avg</div>
        </div>
        <div className="glass-card stat-card orange animate-in animate-in-delay-4">
          <div className="stat-card-header">
            <span className="stat-card-label">Success Rate</span>
            <span className="stat-card-icon">🎯</span>
          </div>
          <div className="stat-card-value">{successRate}%</div>
          <div className="stat-card-sub">{completedCount} of {totalCount} completed</div>
        </div>
      </div>

      {/* Charts & Recent */}
      <div className="dashboard-grid">
        <div className="glass-card panel animate-in animate-in-delay-3">
          <div className="panel-header">
            <span className="panel-title">Download Activity</span>
            <span className="panel-badge">This Week</span>
          </div>
          <div className="activity-chart">
            {CHART_DATA.map((bar, i) => (
              <div className="chart-bar-wrapper" key={i}>
                <div
                  className="chart-bar"
                  style={{ height: `${bar.value}%` }}
                  title={`${bar.label}: ${bar.value}%`}
                />
                <span className="chart-bar-label">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card panel animate-in animate-in-delay-4">
          <div className="panel-header">
            <span className="panel-title">Recent Downloads</span>
          </div>
          <div className="recent-list">
            {recentCompleted.map(dl => (
              <div className="recent-item" key={dl.id}>
                <div className="recent-item-icon" style={{ background: `${getCategoryColor(dl.category)}15` }}>
                  {getCategoryIcon(dl.category)}
                </div>
                <div className="recent-item-info">
                  <div className="recent-item-name">{dl.filename}</div>
                  <div className="recent-item-meta">{formatBytes(dl.size)} · {formatDate(dl.completedAt || dl.addedAt)}</div>
                </div>
                <span className="recent-item-status completed">Completed</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card panel animate-in animate-in-delay-5">
        <div className="panel-header">
          <span className="panel-title">Quick Actions</span>
        </div>
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => openAddModal('single')} id="qa-add-url">
            <span className="icon">➕</span> Add URL
          </button>
          <button className="quick-action-btn" onClick={() => openAddModal('batch')} id="qa-add-batch">
            <span className="icon">📋</span> Add Batch
          </button>
          <button className="quick-action-btn" onClick={openDownloadFolder} id="qa-open-folder">
            <span className="icon">📂</span> Open Folder
          </button>
          <button className="quick-action-btn" onClick={() => openAddModal('import')} id="qa-import-links">
            <span className="icon">🔗</span> Import Links
          </button>
        </div>
      </div>
    </div>
  );
}
