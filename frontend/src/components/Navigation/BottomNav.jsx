import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const NAV_ITEMS = [
  { to: '/sistema',    icon: '🖥️',  label: 'Sistema' },
  { to: '/chat',       icon: '💬',  label: 'Chat' },
  { to: '/heartpulse', icon: '💓',  label: 'Heartpulse' },
  { to: '/mente',      icon: '🧠',  label: 'Mente' },
];

export default function BottomNav() {
  return (
    <nav className={styles.bottomNav}>
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
