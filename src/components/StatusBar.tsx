import { useApp, formatSpeed } from '../store/appStore';

export default function StatusBar() {
  const { activeDownloadCount, globalSpeed, downloads } = useApp();
  const completedCount = downloads.filter(d => d.status === 'completed').length;
  const queuedCount = downloads.filter(d => d.status === 'queued').length;
  const isActive = activeDownloadCount > 0;

  return (
    <footer className="statusbar" id="statusbar">
      <div className="statusbar-left">
        <div className="statusbar-item">
          <span className={`statusbar-dot${isActive ? '' : ' idle'}`} />
          <span>{isActive ? 'Active' : 'Idle'}</span>
        </div>
        <div className="statusbar-item">
          <span>⬇</span>
          <span>{formatSpeed(globalSpeed)}</span>
        </div>
        <div className="statusbar-item">
          <span>{activeDownloadCount} downloading</span>
          {queuedCount > 0 && <span>· {queuedCount} queued</span>}
        </div>
      </div>
      <div className="statusbar-right">
        <div className="statusbar-item">
          <span>✓ {completedCount} completed</span>
        </div>
        <div className="statusbar-item">
          <span>Bucket v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
