import { useApp } from './store/appStore';
import TopToolbar from './components/TopToolbar';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import AddDownloadModal from './components/AddDownloadModal';
import Dashboard from './pages/Dashboard';
import Downloads from './pages/Downloads';
import Library from './pages/Library';
import History from './pages/History';
import Settings from './pages/Settings';
import './App.css';

function PageContent() {
  const { activePage } = useApp();

  switch (activePage) {
    case 'dashboard': return <Dashboard />;
    case 'downloads': return <Downloads />;
    case 'library': return <Library />;
    case 'history': return <History />;
    case 'settings': return <Settings />;
    default: return <Dashboard />;
  }
}

export default function App() {
  return (
    <div className="app-layout" id="app-root">
      <Sidebar />
      <TopToolbar />
      <main className="main-content" id="main-content">
        <PageContent />
      </main>
      <StatusBar />
      <AddDownloadModal />
    </div>
  );
}
