import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header/Header';
import Sidebar from './Sidebar/Sidebar';
import { useFiles } from '../../hooks/useFiles';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useToast } from '../../hooks/useToast';
import { logout } from '../../api/client';
import styles from './Layout.module.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { tree, files, refresh } = useFiles();
  const { toasts, success, info, error } = useToast();

  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'file_changed') {
      info(`📝 ${msg.path} actualizado`);
      refresh();
    } else if (msg.type === 'file_added') {
      info(`➕ ${msg.path} creado`);
      refresh();
    } else if (msg.type === 'file_deleted') {
      info(`🗑️ ${msg.path} eliminado`);
      refresh();
    }
  }, [info, refresh]);

  const { isConnected } = useWebSocket(handleWsMessage);

  return (
    <div className={styles.layout}>
      <Sidebar
        tree={tree}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
      />
      <div className={styles.main}>
        <Header
          isConnected={isConnected}
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
        />
        <main className={styles.content}>
          <Outlet context={{ files, tree, refresh, success, error, info }} />
        </main>
      </div>
      
      {/* Toast container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
