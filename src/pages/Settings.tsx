import { useApp } from '../store/appStore';

const ACCENT_COLORS = [
  { name: 'Blue', color: '#0095ff' },
  { name: 'Cyan', color: '#00d4ff' },
  { name: 'Purple', color: '#7b61ff' },
  { name: 'Green', color: '#00e68a' },
  { name: 'Orange', color: '#ff8c42' },
  { name: 'Pink', color: '#ff6b9d' },
  { name: 'Red', color: '#ff4757' },
];

export default function Settings() {
  const { 
    theme, setTheme, 
    accentColor, setAccentColor,
    hardwareAccel, setHardwareAccel,
    notifications, setNotifications,
    autoStart, setAutoStart,
    concurrentLimit, setConcurrentLimit,
    speedLimit, setSpeedLimit,
    defaultFolder, setDefaultFolder
  } = useApp();

  return (
    <div className="animate-in" id="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure application behavior and appearance</p>
      </div>

      <div className="settings-sections">
        {/* Appearance */}
        <div className="glass-card settings-section animate-in animate-in-delay-1">
          <div className="settings-section-title">
            🎨 Appearance
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Theme</div>
              <div className="settings-description">Choose your preferred color scheme</div>
            </div>
            <select 
              className="settings-select" 
              value={theme} 
              onChange={e => setTheme(e.target.value as any)}
              id="theme-select"
            >
              <option value="dark">Dark</option>
              <option value="amoled">AMOLED Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Accent Color</div>
              <div className="settings-description">Customize the highlight color</div>
            </div>
            <div className="accent-colors">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.color}
                  className={`accent-color-dot${accentColor === c.color ? ' selected' : ''}`}
                  style={{ background: c.color, color: c.color }}
                  onClick={() => setAccentColor(c.color)}
                  title={c.name}
                  id={`accent-${c.name.toLowerCase()}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Downloads */}
        <div className="glass-card settings-section animate-in animate-in-delay-2">
          <div className="settings-section-title">
            ⬇️ Downloads
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Default Folder</div>
              <div className="settings-description">Where files are saved to</div>
            </div>
            <input
              className="settings-select"
              style={{ minWidth: 200 }}
              value={defaultFolder}
              onChange={e => setDefaultFolder(e.target.value)}
              id="default-folder-input"
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Concurrent Downloads</div>
              <div className="settings-description">Maximum simultaneous downloads</div>
            </div>
            <select
              className="settings-select"
              value={concurrentLimit.toString()}
              onChange={e => setConcurrentLimit(parseInt(e.target.value, 10))}
              id="concurrent-select"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="10">10</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Speed Limit</div>
              <div className="settings-description">Bandwidth throttling</div>
            </div>
            <select
              className="settings-select"
              value={speedLimit}
              onChange={e => setSpeedLimit(e.target.value)}
              id="speed-limit-select"
            >
              <option value="unlimited">Unlimited</option>
              <option value="1mb">1 MB/s</option>
              <option value="5mb">5 MB/s</option>
              <option value="10mb">10 MB/s</option>
              <option value="50mb">50 MB/s</option>
            </select>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card settings-section animate-in animate-in-delay-3">
          <div className="settings-section-title">
            🔔 Notifications
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Desktop Notifications</div>
              <div className="settings-description">Get notified when downloads complete</div>
            </div>
            <button
              className={`toggle${notifications ? ' active' : ''}`}
              onClick={() => setNotifications(!notifications)}
              id="notifications-toggle"
            />
          </div>
        </div>

        {/* Performance */}
        <div className="glass-card settings-section animate-in animate-in-delay-4">
          <div className="settings-section-title">
            ⚡ Performance
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Hardware Acceleration</div>
              <div className="settings-description">Use GPU for rendering when available</div>
            </div>
            <button
              className={`toggle${hardwareAccel ? ' active' : ''}`}
              onClick={() => setHardwareAccel(!hardwareAccel)}
              id="hw-accel-toggle"
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Start with System</div>
              <div className="settings-description">Launch Bucket on system startup</div>
            </div>
            <button
              className={`toggle${autoStart ? ' active' : ''}`}
              onClick={() => setAutoStart(!autoStart)}
              id="autostart-toggle"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
