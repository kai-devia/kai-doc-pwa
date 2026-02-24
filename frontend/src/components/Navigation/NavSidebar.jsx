import { useContext, useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Monitor, MessageSquare, CheckSquare, Activity, Brain, Lock } from 'lucide-react';
import { AgentContext } from '../../context/AgentContext';
import styles from './NavSidebar.module.css';

const NAV_ITEMS = [
  { to: '/sistema', icon: Monitor,       label: 'Sistema' },
  { to: '/chat',    icon: MessageSquare, label: 'Chat' },
  { to: '/tasks',   icon: CheckSquare,   label: 'Tasks' },
  { to: '/pulse',   icon: Activity,      label: 'Pulse' },
  { to: '/mente',   icon: Brain,         label: 'Mente' },
  { to: '/vault',   icon: Lock,          label: 'Vault' },
];

export default function NavSidebar({ collapsed, onToggle }) {
  const { agentId, agentName, setAgent, agents } = useContext(AgentContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo section — clicking K always toggles */}
      <div className={styles.logoSection}>
        <button
          className={styles.logoBtn}
          onClick={onToggle}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          aria-label="Toggle navigation"
        >
          <img src="/kai-avatar.svg" alt="KAI" width="26" height="26" className={styles.logo} />
          {!collapsed && <span className={styles.logoText}>Kai</span>}
        </button>
      </div>

      {/* Mode selector — div with onclick, no box */}
      <div
        className={`${styles.modeSection} ${collapsed ? styles.modeSectionCollapsed : ''}`}
        ref={dropdownRef}
      >
        <div
          className={styles.modeTrigger}
          onClick={() => setDropdownOpen(o => !o)}
          title={`Modo: ${agentName}`}
        >
          <span className={styles.modeLabel}>{agentName}</span>
        </div>

        {dropdownOpen && (
          <div className={`${styles.modeDropdown} ${collapsed ? styles.modeDropdownCollapsed : ''}`}>
            {agents.map((agent) => (
              <button
                key={agent.id}
                className={`${styles.modeOption} ${agentId === agent.id ? styles.modeOptionActive : ''}`}
                onClick={() => { setAgent(agent.id); setDropdownOpen(false); }}
              >
                {agent.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <span className={styles.icon}>
              <Icon size={18} strokeWidth={1.5} />
            </span>
            {!collapsed && <span className={styles.label}>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
