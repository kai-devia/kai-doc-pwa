import { useContext, useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Monitor, MessageSquare, CheckSquare, Activity, Brain, Lock, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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

  // Close dropdown when clicking outside
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
      {/* Logo section */}
      <div className={styles.logoSection}>
        {!collapsed && (
          <div className={styles.logoMark}>
            <img src="/kai-avatar.svg" alt="KAI" width="28" height="28" className={styles.logo} />
            <span className={styles.logoText}>Kai</span>
          </div>
        )}

        <button
          className={styles.toggleBtn}
          onClick={onToggle}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          aria-label="Toggle navigation"
        >
          {collapsed ? (
            <div className={styles.collapsedLogoBtn}>
              <img src="/kai-avatar.svg" alt="KAI" width="24" height="24" className={styles.logo} />
              <ChevronRight size={12} />
            </div>
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
      </div>

      {/* Mode dropdown */}
      <div
        className={`${styles.modeSection} ${collapsed ? styles.modeSectionCollapsed : ''}`}
        ref={dropdownRef}
      >
        <button
          className={styles.modeDropdownTrigger}
          onClick={() => setDropdownOpen(o => !o)}
          title={collapsed ? `Modo: ${agentName}` : undefined}
        >
          {collapsed ? (
            <span className={styles.modeTagCollapsed}>{agentName.slice(0, 2)}</span>
          ) : (
            <>
              <span className={styles.modeLabel}>{agentName}</span>
              <ChevronDown size={14} className={`${styles.modeChevron} ${dropdownOpen ? styles.modeChevronOpen : ''}`} />
            </>
          )}
        </button>

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
