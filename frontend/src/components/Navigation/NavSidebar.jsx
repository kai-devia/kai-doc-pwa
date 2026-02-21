import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './NavSidebar.module.css';

const NAV_ITEMS = [
  { to: '/sistema',    icon: '🖥️',  label: 'Sistema' },
  { to: '/chat',       icon: '💬',  label: 'Chat' },
  { to: '/heartpulse', icon: '💓',  label: 'Heartpulse' },
  { to: '/mente',      icon: '🧠',  label: 'Mente' },
];

export default function NavSidebar({ collapsed, onToggle }) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo / Toggle button */}
      <button
        className={styles.logoBtn}
        onClick={onToggle}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        aria-label="Toggle navigation"
      >
        <img src="/kai-avatar.svg" alt="KAI" width="28" height="28" className={styles.logo} />
        {!collapsed && <span className={styles.logoText}>KAI</span>}
      </button>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <span className={styles.icon}>{icon}</span>
            {!collapsed && <span className={styles.label}>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
