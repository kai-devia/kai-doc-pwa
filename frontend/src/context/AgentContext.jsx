import { createContext, useState, useEffect } from 'react';

export const AgentContext = createContext();

const AGENTS = [
  { id: 'kai',    name: 'CORE' },
  { id: 'po-kai', name: 'PO'   },
];

// Default accent colors per mode
const DEFAULT_COLORS = {
  CORE: '#00d4aa',
  PO:   '#f59e0b',
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
}

function darken(hex, amount = 0.15) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.max(0, Math.round(parseInt(result[1], 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(result[2], 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(result[3], 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function applyAccent(hex) {
  const root = document.documentElement;
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-hover', darken(hex));
  root.style.setProperty('--accent-rgb', hexToRgb(hex));
}

export function AgentContextProvider({ children }) {
  const [agentId, setAgentId] = useState('kai');
  const [modeColors, setModeColors] = useState(() => {
    try {
      const stored = localStorage.getItem('kai-mode-colors');
      return stored ? { ...DEFAULT_COLORS, ...JSON.parse(stored) } : { ...DEFAULT_COLORS };
    } catch {
      return { ...DEFAULT_COLORS };
    }
  });

  // Load agent from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('kai-agent-id');
    if (stored && AGENTS.some(a => a.id === stored)) {
      setAgentId(stored);
    }
  }, []);

  // Apply data-mode + accent color whenever agentId or modeColors change
  useEffect(() => {
    const agent = AGENTS.find(a => a.id === agentId) || AGENTS[0];
    document.documentElement.setAttribute('data-mode', agent.name);
    applyAccent(modeColors[agent.name] || DEFAULT_COLORS[agent.name] || '#00d4aa');
  }, [agentId, modeColors]);

  const setAgent = (newAgentId) => {
    if (AGENTS.some(a => a.id === newAgentId)) {
      setAgentId(newAgentId);
      localStorage.setItem('kai-agent-id', newAgentId);
    }
  };

  const setModeColor = (modeName, color) => {
    setModeColors(prev => {
      const next = { ...prev, [modeName]: color };
      localStorage.setItem('kai-mode-colors', JSON.stringify(next));
      return next;
    });
    // Apply immediately if it's the active mode — don't wait for useEffect
    const currentAgent = AGENTS.find(a => a.id === agentId);
    if (currentAgent && currentAgent.name === modeName) {
      applyAccent(color);
    }
  };

  const agent = AGENTS.find(a => a.id === agentId) || AGENTS[0];

  return (
    <AgentContext.Provider
      value={{
        agentId,
        agentName: agent.name,
        setAgent,
        agents: AGENTS,
        modeColors,
        setModeColor,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}
