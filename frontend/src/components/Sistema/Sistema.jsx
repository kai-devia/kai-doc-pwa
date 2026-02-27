import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { RefreshCw, Cpu, MemoryStick, HardDrive, Clock, Zap, ChevronDown, Check, Square, RotateCcw, Power, Bot, Sparkles } from 'lucide-react';
import { SiJira, SiGithub, SiGmail } from 'react-icons/si';
import { getToken } from '../../api/client';
import { AgentContext } from '../../context/AgentContext';
import styles from './Sistema.module.css';

const API_BASE = '/api';
const REFRESH_INTERVAL = 5000;

// ── Module-level cache — survives navigation (component unmount/remount) ───
const _cache = {
  metrics: null,
  webLimits: null,
  authData: null,
  agentsStatus: null,
  agentModels: null,
  agentSettings: null,
  lastUpdate: null,
};

// ── Formatters ─────────────────────────────────────────────────────────────
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function mbToGb(mb) { return (mb / 1024).toFixed(1); }

function shortModel(name) {
  if (!name) return '';
  return name
    .replace(/\(R\)|\(TM\)/gi, '').replace(/CPU|Processor/gi, '')
    .replace(/with Radeon.*$/i, '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

// ── Circular gauge (large) ─────────────────────────────────────────────────
function CircleGauge({ percent, size = 80, stroke = 6, label, sublabel }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  const color = percent >= 85 ? 'var(--danger)' : percent >= 60 ? 'var(--warning)' : 'var(--accent)';

  return (
    <div className={styles.gaugeContainer}>
      <svg width={size} height={size} className={styles.circleGauge}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={styles.circleProgress}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.35em"
          className={styles.circleText}
        >
          {percent}%
        </text>
      </svg>
      {label && <span className={styles.gaugeLabel}>{label}</span>}
      {sublabel && <span className={styles.gaugeSublabel}>{sublabel}</span>}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────
function Bar({ percent, height = 6, showLabel = false, label }) {
  const color =
    percent >= 85 ? 'var(--danger)' :
    percent >= 60 ? 'var(--warning)' : 'var(--accent)';
  return (
    <div className={styles.barContainer}>
      {showLabel && (
        <div className={styles.barHeader}>
          <span className={styles.barLabel}>{label}</span>
          <span className={styles.barPercent}>{percent}%</span>
        </div>
      )}
      <div className={styles.track} style={{ height }}>
        <div 
          className={styles.fill} 
          style={{ width: `${Math.min(percent, 100)}%`, background: color }} 
        />
      </div>
    </div>
  );
}

// ── Session renewal form ───────────────────────────────────────────────────
function SessionRenewal({ onRenew, renewing, profile }) {
  const [key, setKey] = useState('');
  const label = profile === 'personal' ? 'DEVIA' : 'NTASYS';
  return (
    <div className={styles.renewalBox}>
      <div className={styles.renewalTitle}>Sesión de {label} expirada</div>
      <div className={styles.renewalDesc}>
        Introduce el nuevo <code>sessionKey</code>
      </div>
      <input
        className={styles.renewalInput}
        type="text"
        placeholder="sk-ant-sid02-..."
        value={key}
        onChange={e => setKey(e.target.value)}
        spellCheck={false}
      />
      <button
        className={styles.renewalBtn}
        disabled={!key.startsWith('sk-ant-') || renewing}
        onClick={() => onRenew(key, profile)}
      >
        {renewing ? 'Actualizando...' : 'Actualizar'}
      </button>
    </div>
  );
}

// ── Profile card ───────────────────────────────────────────────────────────
function ProfileCard({ profile, data, isActive, onSelect, switching }) {
  const label = profile === 'personal' ? 'DEVIA' : 'NTASYS';
  const hasData = data?.updated_at;
  const isExpired = Boolean(data?.session_expired);
  const isLoading = switching && !isActive; // loader on the card being activated

  return (
    <button
      className={`${styles.profileCard} ${isActive ? styles.activeProfile : ''} ${isLoading ? styles.profileLoading : ''}`}
      onClick={() => onSelect(`anthropic:${profile}`)}
      disabled={switching || isActive}
    >
      {isLoading && (
        <div className={styles.profileLoadingOverlay}>
          <div className={styles.profileSpinner} />
          <span>Cambiando...</span>
        </div>
      )}
      <div className={styles.profileHeader}>
        <span className={styles.profileName}>{label}</span>
        <div className={styles.profileBadges}>
          {isActive && <span className={styles.activeBadge}>Activo</span>}
          {isExpired && <span className={styles.expiredBadge}>Expirada</span>}
        </div>
      </div>

      {!hasData ? (
        <div className={styles.noDataBox}>Sin datos de consumo</div>
      ) : (
        <div className={styles.profileContent}>
          <div className={styles.profileStats}>
            <div className={styles.statBlock}>
              <span className={styles.statValue}>{data.session_pct ?? 0}%</span>
              <span className={styles.statLabel}>Sesión</span>
              {data.session_resets_in && (
                <span className={styles.statTime}>{data.session_resets_in}</span>
              )}
            </div>
            <div className={styles.statBlock}>
              <span className={styles.statValue}>{data.weekly_all_pct ?? 0}%</span>
              <span className={styles.statLabel}>Semana</span>
              {data.weekly_resets_at && (
                <span className={styles.statTime}>{data.weekly_resets_at}</span>
              )}
            </div>
            <div className={styles.statBlock}>
              <span className={styles.statValue}>{data.weekly_sonnet_pct ?? 0}%</span>
              <span className={styles.statLabel}>Sonnet</span>
              {data.weekly_resets_at && (
                <span className={styles.statTime}>{data.weekly_resets_at}</span>
              )}
            </div>
          </div>
          
          <div className={styles.profileBars}>
            <Bar percent={data.session_pct ?? 0} height={4} />
            <Bar percent={data.weekly_all_pct ?? 0} height={4} />
            <Bar percent={data.weekly_sonnet_pct ?? 0} height={4} />
          </div>
        </div>
      )}
    </button>
  );
}

// ── Agent definitions ──────────────────────────────────────────────────────
// Maps PWA agent IDs to display config. agentConfigId is the id used by bridge/Docker
const AGENTS = [
  { id: 'core', agentConfigId: 'core', name: 'CORE', description: 'Agente principal',     emoji: '🧠' },
  { id: 'po',   agentConfigId: 'po',   name: 'PO',   description: 'Product Owner',        emoji: '📋' },
  { id: 'fe',   agentConfigId: 'fe',   name: 'FE',   description: 'Frontend Developer',   emoji: '🎨' },
  { id: 'be',   agentConfigId: 'be',   name: 'BE',   description: 'Backend Developer',    emoji: '⚙️' },
  { id: 'ux',   agentConfigId: 'ux',   name: 'UX',   description: 'UX Designer',          emoji: '🖌️' },
  { id: 'qa',   agentConfigId: 'qa',   name: 'QA',   description: 'Quality Assurance',    emoji: '🔍' },
];

const MODEL_OPTIONS = [
  { value: 'anthropic/claude-haiku-4-5', label: 'Haiku', desc: 'Rápido, eficiente' },
  { value: 'anthropic/claude-sonnet-4-6', label: 'Sonnet', desc: 'Equilibrado' },
  { value: 'anthropic/claude-opus-4-5', label: 'Opus', desc: 'Máxima potencia' },
];

// ── Custom Select Dropdown ─────────────────────────────────────────────────
function ModelDropdown({ value, options, onChange, disabled, onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onOpenChange]);

  const toggleOpen = () => {
    if (!disabled) {
      const newState = !isOpen;
      setIsOpen(newState);
      onOpenChange?.(newState);
    }
  };

  const handleSelect = (opt) => {
    if (opt.value !== value) {
      onChange({ target: { value: opt.value } });
    }
    setIsOpen(false);
    onOpenChange?.(false);
  };

  return (
    <div className={styles.modelDropdown} ref={ref}>
      <button
        type="button"
        className={`${styles.modelDropdownTrigger} ${isOpen ? styles.dropdownOpen : ''}`}
        onClick={toggleOpen}
        disabled={disabled}
      >
        <span className={styles.modelDropdownLabel}>{selected.label}</span>
        <ChevronDown size={14} className={styles.modelDropdownArrow} />
      </button>
      {isOpen && (
        <div className={styles.modelDropdownMenu}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.modelDropdownItem} ${opt.value === value ? styles.modelDropdownItemActive : ''}`}
              onClick={() => handleSelect(opt)}
            >
              <div className={styles.modelDropdownItemContent}>
                <span className={styles.modelDropdownItemLabel}>{opt.label}</span>
                <span className={styles.modelDropdownItemDesc}>{opt.desc}</span>
              </div>
              {opt.value === value && <Check size={14} className={styles.modelDropdownCheck} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Capability Icons (logos oficiales via react-icons) ─────────────────────
const CAPABILITY_ICONS = {
  mail: SiGmail,
  jira: SiJira,
  github: SiGithub,
};

const CAPABILITY_LABELS = {
  mail: 'Email',
  jira: 'Jira',
  github: 'GitHub',
};

// ── Agent card ─────────────────────────────────────────────────────────────
function AgentCard({
  agent, status, modelInfo, onModelChange, changingModel,
  accentColor, agentColor, onColorChange,
  onForceReset, forceResetting,
  onRestartClick, restarting, pendingRestart,
  onTogglePower, togglingPower,
  capabilities, onToggleCapability, togglingCapability,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colorInputRef = useRef(null);
  const state = status?.state || 'offline';
  const isLive = state === 'live';
  const isWorking = state === 'working';
  const isOffline = state === 'offline';
  const hasConfig = agent.agentConfigId !== null;
  const currentModel = modelInfo?.model || null;
  const isChangingThisModel = changingModel === agent.agentConfigId;
  const anyChanging = changingModel !== null;
  const isResettingThis = forceResetting === agent.id;
  const isConfirmingRestart = pendingRestart === agent.id;
  const isPowerToggling = togglingPower === agent.id;

  const handleModelChange = (e) => {
    if (onModelChange && agent.agentConfigId) {
      onModelChange(agent.agentConfigId, e.target.value);
    }
  };

  const handleColorChange = (e) => {
    onColorChange?.(agent.id, e.target.value);
  };

  const cardClasses = [
    styles.agentCard,
    isOffline ? styles.agentOffline : '',
    isWorking ? styles.agentWorking : '',
    dropdownOpen ? styles.dropdownActive : '',
    isChangingThisModel ? styles.agentChanging : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      style={{ '--agent-color': accentColor || '#00d4aa' }}
    >
      {/* Header: color + nombre + estado */}
      <div className={styles.agentHeader}>
        <div className={styles.colorPickerWrapper}>
          <button
            className={styles.colorSwatch}
            style={{ background: agentColor || '#00d4aa' }}
            onClick={() => colorInputRef.current?.click()}
            title="Cambiar color del agente"
          />
          <input
            ref={colorInputRef}
            type="color"
            className={styles.colorInput}
            value={agentColor || '#00d4aa'}
            onChange={handleColorChange}
          />
        </div>
        <div className={styles.agentTitleBlock}>
          <span className={styles.agentName}>{agent.name}</span>
          <span className={styles.agentDesc}>{agent.description}</span>
        </div>
        <div className={`${styles.statusIndicator} ${isLive ? styles.statusLive : isWorking ? styles.statusWorking : styles.statusOffline}`}>
          <span className={styles.statusDot} />
          <span className={styles.statusText}>
            {isLive ? 'Activo' : isWorking ? 'Working' : 'Offline'}
          </span>
        </div>
      </div>
      
      {status?.task && (
        <div className={styles.agentTaskRow}>
          <span className={styles.agentTask}>{status.task}</span>
        </div>
      )}
      
      {/* Model selector */}
      <div className={styles.agentModelSection}>
        <span className={styles.modelLabel}>Modelo</span>
        {hasConfig ? (
          isChangingThisModel ? (
            <div className={styles.modelChangingIndicator}>
              <div className={styles.modelSpinner} />
              <span className={styles.modelChangingText}>Aplicando...</span>
            </div>
          ) : (
            <ModelDropdown
              value={currentModel || MODEL_OPTIONS[0].value}
              options={MODEL_OPTIONS}
              onChange={handleModelChange}
              disabled={anyChanging || isOffline}
              onOpenChange={setDropdownOpen}
            />
          )
        ) : (
          <span className={styles.modelValue}>—</span>
        )}
      </div>

      {/* Capabilities */}
      <div className={styles.capabilitiesSection}>
        <span className={styles.capabilitiesSectionLabel}>Permisos</span>
        <div className={styles.capabilitiesRow}>
          {Object.entries(CAPABILITY_ICONS).map(([cap, Icon]) => {
            const isEnabled = capabilities?.[cap] ?? false;
            const isToggling = togglingCapability === `${agent.id}:${cap}`;
            return (
              <button
                key={cap}
                className={`${styles.capabilityBtn} ${isEnabled ? styles.capabilityEnabled : styles.capabilityDisabled} ${isToggling ? styles.capabilityToggling : ''}`}
                onClick={() => !isToggling && onToggleCapability?.(agent.id, cap, isEnabled)}
                disabled={isToggling}
                title={`${CAPABILITY_LABELS[cap]}: ${isEnabled ? 'Activado' : 'Desactivado'}`}
              >
                <Icon size={14} className={styles.capabilityIcon} />
                <span className={styles.capabilityLabel}>{CAPABILITY_LABELS[cap]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.agentActions}>
        {(isLive || isWorking) ? (
          <>
            <button
              className={styles.actionBtn}
              disabled={isResettingThis || restarting || isPowerToggling}
              onClick={() => onForceReset?.(agent.id)}
              title="Detener tarea actual"
            >
              {isResettingThis ? <div className={styles.actionSpinner} /> : <Square size={14} />}
              <span>Detener</span>
            </button>

            {hasConfig && (
              <button
                className={`${styles.actionBtn} ${isConfirmingRestart ? styles.actionBtnConfirm : ''}`}
                disabled={restarting || isPowerToggling}
                onClick={() => onRestartClick?.(agent.id)}
                title="Reiniciar agente"
              >
                {restarting ? <div className={styles.actionSpinner} /> : <RotateCcw size={14} />}
                <span>{isConfirmingRestart ? 'Confirmar' : 'Reiniciar'}</span>
              </button>
            )}

            <button
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              disabled={isPowerToggling || restarting}
              onClick={() => onTogglePower?.(agent.id, 'offline')}
              title="Apagar agente"
            >
              {isPowerToggling ? <div className={styles.actionSpinner} /> : <Power size={14} />}
              <span>Apagar</span>
            </button>
          </>
        ) : (
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            disabled={isPowerToggling}
            onClick={() => onTogglePower?.(agent.id, 'live')}
            title="Encender agente"
          >
            {isPowerToggling ? <div className={styles.actionSpinner} /> : <Power size={14} />}
            <span>Encender</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Sistema() {
  const { setModeColor, refreshAgentStatuses, modeColors, agentName } = useContext(AgentContext);
  
  // Color del modo actual (CORE, PO, etc.) - usar para todos los acentos
  const currentModeColor = modeColors?.[agentName] || '#00d4aa';
  const [metrics, setMetrics] = useState(_cache.metrics);
  const [webLimits, setWebLimits] = useState(_cache.webLimits);
  const [authData, setAuthData] = useState(_cache.authData);
  const [agentsStatus, setAgentsStatus] = useState(_cache.agentsStatus);
  const [agentModels, setAgentModels] = useState(_cache.agentModels);
  const [agentSettings, setAgentSettings] = useState(_cache.agentSettings || {});
  const [agentCapabilities, setAgentCapabilities] = useState(_cache.agentCapabilities || {});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!_cache.metrics); // skip spinner if cached
  const [lastUpdate, setLastUpdate] = useState(_cache.lastUpdate);
  const [syncing, setSyncing] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [changingModel, setChangingModel] = useState(null); // agentConfigId or null
  const [forceResetting, setForceResetting] = useState(null); // agentId or null
  const [restarting, setRestarting] = useState(false);
  const [pendingRestart, setPendingRestart] = useState(null); // agentId or null
  const [togglingPower, setTogglingPower] = useState(null); // agentId or null
  const [togglingCapability, setTogglingCapability] = useState(null); // '{agentId}:{capability}' or null
  const restartConfirmTimeout = useRef(null);
  const colorDebounceRef = useRef({});

  const colorsSyncedRef = useRef(false);

  const auth = useCallback(() => ({
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  }), []);

  // One-time sync: push backend colors to AgentContext so switching modes uses correct colors
  useEffect(() => {
    if (!colorsSyncedRef.current && Object.keys(agentSettings).length > 0) {
      colorsSyncedRef.current = true;
      AGENTS.forEach(agent => {
        const color = agentSettings[agent.id]?.color;
        if (color) setModeColor(agent.name, color);
      });
    }
  }, [agentSettings, setModeColor]);

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, wRes, aRes, modelsRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/system/metrics`, { headers: auth() }),
        fetch(`${API_BASE}/system/claude-web-limits`, { headers: auth() }),
        fetch(`${API_BASE}/system/auth-profile`, { headers: auth() }),
        fetch(`${API_BASE}/system/agent-models`, { headers: auth() }),
        fetch(`${API_BASE}/system/agent-settings`, { headers: auth() }),
      ]);
      if (!mRes.ok) throw new Error('Error cargando métricas');
      const m = await mRes.json();
      _cache.metrics = m;
      setMetrics(m);
      if (wRes.ok) { const d = await wRes.json(); _cache.webLimits = d; setWebLimits(d); }
      if (aRes.ok) { const d = await aRes.json(); _cache.authData = d; setAuthData(d); }
      if (modelsRes.ok) { const d = await modelsRes.json(); _cache.agentModels = d; setAgentModels(d); }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        // Don't overwrite if user has pending color changes (debounce in flight)
        const hasPending = Object.keys(colorDebounceRef.current).some(k => colorDebounceRef.current[k]);
        if (!hasPending) {
          _cache.agentSettings = d;
          setAgentSettings(d);
        }
      }

      try {
        const agRes = await fetch(`${API_BASE}/system/agents-status`, { headers: auth() });
        if (agRes.ok) { const d = await agRes.json(); _cache.agentsStatus = d; setAgentsStatus(d); }
      } catch (_e) { /* endpoint may not exist yet */ }

      try {
        const capRes = await fetch(`${API_BASE}/system/agent-capabilities`, { headers: auth() });
        if (capRes.ok) { const d = await capRes.json(); _cache.agentCapabilities = d; setAgentCapabilities(d); }
      } catch (_e) { /* endpoint may not exist yet */ }

      const now = new Date();
      // Update cache
      _cache.lastUpdate = now;
      setError(null);
      setLastUpdate(now);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/system/sync-claude`, {
        method: 'POST',
        headers: auth(),
      });
      if (res.ok) {
        await new Promise(r => setTimeout(r, 500));
        await fetchAll();
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleRenew = async (sessionKey, profile) => {
    setRenewing(true);
    try {
      const res = await fetch(`${API_BASE}/system/claude-session-key`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ sessionKey, profile }),
      });
      if (res.ok) {
        await new Promise(r => setTimeout(r, 1000));
        await fetchAll();
      }
    } catch (err) {
      console.error('Renew error:', err);
    } finally {
      setRenewing(false);
    }
  };

  const handleSwitchProfile = async (profile) => {
    setSwitching(true);
    try {
      const res = await fetch(`${API_BASE}/system/auth-profile`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ profile }),
      });
      if (res.ok) {
        await new Promise(r => setTimeout(r, 500));
        await fetchAll();
      }
    } catch (err) {
      console.error('Switch profile error:', err);
    } finally {
      setSwitching(false);
    }
  };

  const handleColorChange = (agentId, color) => {
    // Optimistic update immediately
    setAgentSettings(prev => {
      const next = { ...prev, [agentId]: { ...prev[agentId], color } };
      // Also update cache so fetchAll doesn't overwrite while debounce is pending
      _cache.agentSettings = next;
      return next;
    });

    // Propagate to AgentContext so the global CSS accent updates for this mode
    const agentDef = AGENTS.find(a => a.id === agentId);
    if (agentDef) {
      setModeColor(agentDef.name, color);
    }

    // Debounce API call — only fire 600ms after user stops dragging
    if (colorDebounceRef.current[agentId]) {
      clearTimeout(colorDebounceRef.current[agentId]);
    }
    colorDebounceRef.current[agentId] = setTimeout(async () => {
      colorDebounceRef.current[agentId] = null; // mark as done before API call
      try {
        await fetch(`${API_BASE}/system/agent-settings/${agentId}`, {
          method: 'PATCH',
          headers: auth(),
          body: JSON.stringify({ color }),
        });
      } catch (err) {
        console.error('Color save error:', err);
      }
    }, 600);
  };

  const handleModelChange = async (agentId, model) => {
    setChangingModel(agentId);
    try {
      const res = await fetch(`${API_BASE}/system/agent-models`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ agentId, model }),
      });
      if (res.ok) {
        // Wait for gateway restart
        await new Promise(r => setTimeout(r, 2000));
        await fetchAll();
      }
    } catch (err) {
      console.error('Change model error:', err);
    } finally {
      setChangingModel(null);
    }
  };

  const handleForceReset = async (agentId) => {
    setForceResetting(agentId);
    try {
      await fetch(`${API_BASE}/system/agents-force-reset/${agentId}`, {
        method: 'POST',
        headers: auth(),
      });
      await fetchAll();
    } catch (err) {
      console.error('Force reset error:', err);
    } finally {
      setForceResetting(null);
    }
  };

  const handleRestartClick = (agentId) => {
    if (restarting) return;
    if (pendingRestart === agentId) {
      // Second click — confirm and execute
      clearTimeout(restartConfirmTimeout.current);
      setPendingRestart(null);
      handleRestartAgent(agentId);
    } else {
      // First click — arm confirmation
      if (restartConfirmTimeout.current) clearTimeout(restartConfirmTimeout.current);
      setPendingRestart(agentId);
      restartConfirmTimeout.current = setTimeout(() => setPendingRestart(null), 3000);
    }
  };

  const handleTogglePower = async (agentId, targetState) => {
    setTogglingPower(agentId);
    try {
      // Para agentes con contenedor Docker, usar control real
      const agentStatus = agentsStatus?.[agentId];
      if (agentStatus?.hasContainer) {
        const action = targetState === 'live' ? 'start' : 'stop';
        await fetch(`${API_BASE}/system/agents-control/${agentId}/${action}`, {
          method: 'POST',
          headers: auth(),
        });
        // Esperar un momento para que el contenedor arranque/pare
        await new Promise(r => setTimeout(r, action === 'start' ? 3000 : 1000));
      } else {
        // Agentes sin contenedor: solo actualizar estado en DB
        await fetch(`${API_BASE}/system/agents-status/${agentId}`, {
          method: 'PUT',
          headers: auth(),
          body: JSON.stringify({ state: targetState, task: null }),
        });
      }
      await fetchAll();
      // Actualizar el context global para que los selectores se actualicen
      if (refreshAgentStatuses) refreshAgentStatuses();
    } catch (err) {
      console.error('Toggle power error:', err);
    } finally {
      setTogglingPower(null);
    }
  };

  // Reiniciar contenedor Docker de un agente específico
  const handleRestartAgent = async (agentId) => {
    setRestarting(true);
    try {
      const agentStatus = agentsStatus?.[agentId];
      if (agentStatus?.hasContainer) {
        await fetch(`${API_BASE}/system/agents-control/${agentId}/restart`, {
          method: 'POST',
          headers: auth(),
        });
        await new Promise(r => setTimeout(r, 3000));
      }
      await fetchAll();
      if (refreshAgentStatuses) refreshAgentStatuses();
    } catch (err) {
      console.error('Restart agent error:', err);
    } finally {
      setRestarting(false);
    }
  };

  // Toggle capability for an agent
  const handleToggleCapability = async (agentId, capability, currentEnabled) => {
    const key = `${agentId}:${capability}`;
    setTogglingCapability(key);
    try {
      const res = await fetch(`${API_BASE}/system/agent-capabilities/${agentId}/${capability}`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        // Update React state + cache so remounts don't use stale value
        setAgentCapabilities(prev => {
          const updated = {
            ...prev,
            capabilities: {
              ...prev.capabilities,
              [agentId]: {
                ...prev.capabilities?.[agentId],
                [capability]: !currentEnabled,
              }
            }
          };
          _cache.agentCapabilities = updated; // keep cache in sync
          return updated;
        });
        // Also re-fetch to confirm server state matches UI
        fetchAll();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Toggle capability failed:', res.status, errData);
      }
    } catch (err) {
      console.error('Toggle capability error:', err);
    } finally {
      setTogglingCapability(null);
    }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAll]);

  if (loading) return (
    <div className={styles.centered}>
      <div className={styles.spinner} />
    </div>
  );

  if (error) return (
    <div className={styles.centered}>
      <p className={styles.errorText}>{error}</p>
      <button className={styles.retryBtn} onClick={fetchAll}>Reintentar</button>
    </div>
  );

  const { cpu, memory, disk, uptime, hostname } = metrics;
  const profiles = webLimits?.profiles || {};
  // dockerAgents = perfil compartido de agentes Docker (nuevo formato)
  // agents.pwa = formato legacy (CORE original)
  const currentAuth = authData?.dockerAgents || authData?.agents?.pwa || 'anthropic:personal';
  const activeProfile = currentAuth === 'anthropic:personal' ? 'personal' : 'ntasys';

  const getAgentStatus = (agentId) => {
    if (agentsStatus?.[agentId]) return agentsStatus[agentId];
    if (agentId === 'core') return { state: 'live' };
    if (agentId === 'po') return { state: 'live' };
    return { state: 'offline' };
  };

  const getAgentModelInfo = (agentConfigId) => {
    if (!agentConfigId || !agentModels?.agents) return null;
    return agentModels.agents[agentConfigId] || null;
  };

  const liveCount = AGENTS.filter(a => getAgentStatus(a.id).state !== 'offline').length;

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Sparkles size={20} className={styles.headerIcon} />
          <h1>Panel de Control</h1>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.hostname}>{hostname}</span>
          <span className={styles.separator}>•</span>
          <span className={styles.lastUpdated}>{lastUpdate?.toLocaleTimeString('es-ES')}</span>
        </div>
      </header>

      {/* Hardware Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Cpu size={16} />
          <h2>Hardware</h2>
        </div>
        <div className={styles.hardwareGrid}>
          <div className={styles.hardwareCard}>
            <div className={styles.hardwareCardContent}>
              <div className={styles.hardwareIcon}><Cpu size={24} /></div>
              <div className={styles.hardwareDetails}>
                <span className={styles.hardwareLabel}>CPU</span>
                <span className={styles.hardwareModel}>{shortModel(cpu.model)}</span>
              </div>
            </div>
            <CircleGauge percent={cpu.usage} size={70} stroke={5} />
          </div>
          
          <div className={styles.hardwareCard}>
            <div className={styles.hardwareCardContent}>
              <div className={styles.hardwareIcon}><MemoryStick size={24} /></div>
              <div className={styles.hardwareDetails}>
                <span className={styles.hardwareLabel}>Memoria RAM</span>
                <span className={styles.hardwareModel}>{mbToGb(memory.used)} / {mbToGb(memory.total)} GB</span>
              </div>
            </div>
            <CircleGauge percent={memory.percent} size={70} stroke={5} />
          </div>
          
          <div className={styles.hardwareCard}>
            <div className={styles.hardwareCardContent}>
              <div className={styles.hardwareIcon}><HardDrive size={24} /></div>
              <div className={styles.hardwareDetails}>
                <span className={styles.hardwareLabel}>Almacenamiento</span>
                <span className={styles.hardwareModel}>{disk.used} / {disk.total}</span>
                <span className={styles.hardwareSub}>{disk.free} GB libres</span>
              </div>
            </div>
            <CircleGauge percent={disk.percent} size={70} stroke={5} />
          </div>

          <div className={styles.hardwareCard}>
            <div className={styles.hardwareCardContent}>
              <div className={styles.hardwareIcon}><Clock size={24} /></div>
              <div className={styles.hardwareDetails}>
                <span className={styles.hardwareLabel}>Uptime</span>
                <span className={styles.hardwareModel}>{formatUptime(uptime)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Anthropic Profiles Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Zap size={16} />
          <h2>Perfiles Anthropic</h2>
          <div className={styles.sectionActions}>
            <span className={styles.syncBadge}>Auto-sync</span>
            <button
              className={styles.syncBtn}
              onClick={handleSync}
              disabled={syncing}
              title="Sincronizar consumo"
            >
              <RefreshCw size={14} className={syncing ? styles.spinning : ''} />
            </button>
          </div>
        </div>
        
        <div className={styles.profilesGrid}>
          <ProfileCard
            profile="personal"
            data={profiles.personal}
            isActive={activeProfile === 'personal'}
            onSelect={handleSwitchProfile}
            switching={switching}
          />
          <ProfileCard
            profile="ntasys"
            data={profiles.ntasys}
            isActive={activeProfile === 'ntasys'}
            onSelect={handleSwitchProfile}
            switching={switching}
          />
        </div>

        {Boolean(profiles[activeProfile]?.session_expired) && (
          <SessionRenewal onRenew={handleRenew} renewing={renewing} profile={activeProfile} />
        )}
      </section>

      {/* Agents Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Bot size={16} />
          <h2>Agentes Kai</h2>
          <span className={styles.agentCountBadge}>{liveCount} activos</span>
        </div>
        
        <div className={styles.agentsGrid}>
          {AGENTS.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              status={getAgentStatus(agent.id)}
              modelInfo={getAgentModelInfo(agent.agentConfigId)}
              onModelChange={handleModelChange}
              changingModel={changingModel}
              accentColor={currentModeColor}
              agentColor={agentSettings[agent.id]?.color || '#00d4aa'}
              onColorChange={handleColorChange}
              onForceReset={handleForceReset}
              forceResetting={forceResetting}
              onRestartClick={handleRestartClick}
              restarting={restarting}
              pendingRestart={pendingRestart}
              onTogglePower={handleTogglePower}
              togglingPower={togglingPower}
              capabilities={agentCapabilities?.capabilities?.[agent.id]}
              onToggleCapability={handleToggleCapability}
              togglingCapability={togglingCapability}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
