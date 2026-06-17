import { useApp, formatBytes, formatDate, formatTime, getCategoryIcon, getCategoryColor } from '../store/appStore';

export default function History() {
  const { downloads } = useApp();

  const completedDownloads = downloads
    .filter(d => d.status === 'completed')
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  return (
    <div className="animate-in" id="history-page">
      <div className="page-header">
        <h1>History</h1>
        <p>View your download history and past transfers</p>
      </div>

      {completedDownloads.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-state-icon">📜</div>
          <div className="empty-state-text">No download history</div>
          <div className="empty-state-sub">Completed downloads will be listed here</div>
        </div>
      ) : (
        <div className="glass-card panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Category</th>
                <th>Completed</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {completedDownloads.map((dl, i) => (
                <tr key={dl.id} className="animate-in" style={{ animationDelay: `${i * 0.03}s` }}>
                  <td>
                    <div className="history-filename">
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: `${getCategoryColor(dl.category)}15`,
                        fontSize: 14,
                        flexShrink: 0,
                      }}>
                        {getCategoryIcon(dl.category)}
                      </span>
                      {dl.filename}
                    </div>
                  </td>
                  <td>{formatBytes(dl.size)}</td>
                  <td>
                    <span style={{ color: getCategoryColor(dl.category), fontWeight: 500, fontSize: 12, textTransform: 'capitalize' }}>
                      {dl.category}
                    </span>
                  </td>
                  <td>{formatDate(dl.completedAt || dl.addedAt)}</td>
                  <td style={{ color: 'var(--text-tertiary)' }}>{formatTime(dl.completedAt || dl.addedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
