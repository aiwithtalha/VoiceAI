import { create } from 'zustand';
import { Assistant, PhoneNumber, Voice, Integration, DashboardStats } from '@/types';

interface WorkspaceState {
  // Data
  assistants: Assistant[];
  phoneNumbers: PhoneNumber[];
  voices: Voice[];
  integrations: Integration[];
  stats: DashboardStats | null;
  
  // UI State
  selectedAssistantId: string | null;
  isComposerOpen: boolean;
  
  // Actions
  setAssistants: (assistants: Assistant[]) => void;
  addAssistant: (assistant: Assistant) => void;
  updateAssistant: (id: string, updates: Partial<Assistant>) => void;
  removeAssistant: (id: string) => void;
  
  setPhoneNumbers: (numbers: PhoneNumber[]) => void;
  addPhoneNumber: (number: PhoneNumber) => void;
  updatePhoneNumber: (id: string, updates: Partial<PhoneNumber>) => void;
  removePhoneNumber: (id: string) => void;
  
  setVoices: (voices: Voice[]) => void;
  
  setIntegrations: (integrations: Integration[]) => void;
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  
  setStats: (stats: DashboardStats) => void;
  
  setSelectedAssistantId: (id: string | null) => void;
  setIsComposerOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  assistants: [],
  phoneNumbers: [],
  voices: [],
  integrations: [],
  stats: null,
  selectedAssistantId: null,
  isComposerOpen: false,

  setAssistants: (assistants) => set({ assistants }),
  
  addAssistant: (assistant) =>
    set((state) => ({ assistants: [assistant, ...state.assistants] })),
    
  updateAssistant: (id, updates) =>
    set((state) => ({
      assistants: state.assistants.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),
    
  removeAssistant: (id) =>
    set((state) => ({
      assistants: state.assistants.filter((a) => a.id !== id),
    })),

  setPhoneNumbers: (phoneNumbers) => set({ phoneNumbers }),
  
  addPhoneNumber: (number) =>
    set((state) => ({ phoneNumbers: [number, ...state.phoneNumbers] })),
    
  updatePhoneNumber: (id, updates) =>
    set((state) => ({
      phoneNumbers: state.phoneNumbers.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    })),
    
  removePhoneNumber: (id) =>
    set((state) => ({
      phoneNumbers: state.phoneNumbers.filter((n) => n.id !== id),
    })),

  setVoices: (voices) => set({ voices }),
  
  setIntegrations: (integrations) => set({ integrations }),
  
  updateIntegration: (id, updates) =>
    set((state) => ({
      integrations: state.integrations.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    })),

  setStats: (stats) => set({ stats }),
  
  setSelectedAssistantId: (id) => set({ selectedAssistantId: id }),
  
  setIsComposerOpen: (open) => set({ isComposerOpen: open }),
}));
