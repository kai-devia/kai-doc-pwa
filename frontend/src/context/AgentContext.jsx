import { createContext, useState, useEffect } from 'react';

export const AgentContext = createContext();

const AGENTS = [
  { id: 'kai', name: 'CORE' },
  { id: 'po-kai', name: 'PO' },
];

export function AgentContextProvider({ children }) {
  const [agentId, setAgentId] = useState('kai');

  // Load agent from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('kai-agent-id');
    if (stored && AGENTS.some(a => a.id === stored)) {
      setAgentId(stored);
    }
  }, []);

  // Apply data-mode to <html> whenever agentId changes (drives CSS theme)
  useEffect(() => {
    const agent = AGENTS.find(a => a.id === agentId) || AGENTS[0];
    document.documentElement.setAttribute('data-mode', agent.name);
  }, [agentId]);

  // Save to localStorage whenever agentId changes
  const setAgent = (newAgentId) => {
    if (AGENTS.some(a => a.id === newAgentId)) {
      setAgentId(newAgentId);
      localStorage.setItem('kai-agent-id', newAgentId);
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
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}
