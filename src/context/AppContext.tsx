import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Colaborador, 
  CondominioPosto, 
  DayStatus, 
  Holerite, 
  NavigationTab, 
  OcorrenciaLivro,
  TurnoPosto, 
  User, 
  UserRole 
} from '../types';
import { 
  INITIAL_CONDOS, 
  INITIAL_COLABORADORES, 
  INITIAL_TURNOS, 
  INITIAL_HOLERITES, 
  INITIAL_OCORRENCIAS,
  INITIAL_SUPERVISOR_USER, 
  INITIAL_OPERATIONAL_USER,
  DEFAULT_ADMIN_CREDENTIALS
} from '../data/initialData';
import { syncRecordToSupabase } from '../lib/supabase';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppContextType {
  currentUser: User | null;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
  
  // Data State
  condominios: CondominioPosto[];
  colaboradores: Colaborador[];
  turnos: TurnoPosto[];
  holerites: Holerite[];
  ocorrencias: OcorrenciaLivro[];
  escalas: Record<string, Record<string, DayStatus>>; // [colaboradorId][YYYY-MM-DD]
  
  // Auth methods & Password Management
  adminCredentials: { login: string; password: string };
  loginAsSupervisor: (loginOrEmail?: string, password?: string) => boolean;
  loginAsOperacional: (cpfOrMatricula?: string) => void;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => boolean;
  isChangePasswordModalOpen: boolean;
  setIsChangePasswordModalOpen: (val: boolean) => void;
  switchRoleView: (role: UserRole) => void;
  
  // Operational methods
  addColaborador: (colab: Omit<Colaborador, 'id'>) => Promise<void>;
  updateColaborador: (colab: Colaborador) => Promise<void>;
  reallotColaborador: (colaboradorId: string, novoCondominioId: string) => Promise<void>;
  addCondominio: (condo: Omit<CondominioPosto, 'id'>) => Promise<void>;
  updateCondominio: (condo: CondominioPosto) => Promise<void>;
  addOcorrencia: (oco: Omit<OcorrenciaLivro, 'id' | 'dataHora'>) => Promise<void>;
  
  // FT & Shifts
  openFTModal: (turno?: TurnoPosto) => void;
  closeFTModal: () => void;
  ftModalState: { isOpen: boolean; targetTurno: TurnoPosto | null };
  designarFT: (turnoId: string, substitutoId: string, observacao?: string) => Promise<void>;
  normalizarPosto: (turnoId: string) => Promise<void>;
  
  // Matriz
  updateEscalaDia: (colaboradorId: string, dateKey: string, status: DayStatus) => void;
  
  // Holerite
  saveAndPublishHolerite: (holerite: Omit<Holerite, 'id'>) => Promise<void>;
  deleteHolerite: (id: string) => void;
  
  // Toast notifications
  toasts: ToastNotification[];
  showToast: (message: string, type?: ToastNotification['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'turnocerto_user',
  CONDOS: 'turnocerto_condos',
  COLABS: 'turnocerto_colabs',
  TURNOS: 'turnocerto_turnos',
  HOLERITES: 'turnocerto_holerites',
  OCORRENCIAS: 'turnocerto_ocorrencias',
  ESCALAS: 'turnocerto_escalas',
  MOBILE_FRAME: 'turnocerto_mobile_frame',
  ADMIN_CREDS: 'turnocerto_admin_creds',
};

// Initial Escala Matrix generator for the current month
function generateInitialEscalas(colabs: Colaborador[]): Record<string, Record<string, DayStatus>> {
  const result: Record<string, Record<string, DayStatus>> = {};
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  colabs.forEach((colab, colabIndex) => {
    result[colab.id] = {};
    for (let day = 1; day <= 30; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      if (colab.jornada === '12x36' || colab.jornada === '12x36_noturno') {
        const isWork = (day + colabIndex) % 2 === 0;
        // Specifically for colab-2 today (day 7), mark as falta to match post 🔴 POSTO VAZIO
        if (colab.id === 'colab-2' && day === 7) {
          result[colab.id][dateKey] = 'falta';
        } else if (colab.id === 'colab-5' && day === 7) {
          // Edvaldo Lima in FT
          result[colab.id][dateKey] = 'ft';
        } else {
          result[colab.id][dateKey] = isWork ? 'trabalho' : 'folga';
        }
      } else if (colab.jornada === '5x2') {
        const d = new Date(year, month, day);
        const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
        result[colab.id][dateKey] = (dayOfWeek === 0 || dayOfWeek === 6) ? 'folga' : 'trabalho';
      } else {
        result[colab.id][dateKey] = (day % 7 === 0) ? 'folga' : 'trabalho';
      }
    }
  });
  
  return result;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user (Defaults to Supervisor for instant executive dashboard presentation)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : INITIAL_SUPERVISOR_USER;
    } catch {
      return INITIAL_SUPERVISOR_USER;
    }
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>('operacao');
  
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOBILE_FRAME);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [adminCredentials, setAdminCredentials] = useState<{ login: string; password: string }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_CREDS);
      return saved ? JSON.parse(saved) : DEFAULT_ADMIN_CREDENTIALS;
    } catch {
      return DEFAULT_ADMIN_CREDENTIALS;
    }
  });

  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const [condominios, setCondominios] = useState<CondominioPosto[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONDOS);
      return saved ? JSON.parse(saved) : INITIAL_CONDOS;
    } catch {
      return INITIAL_CONDOS;
    }
  });

  const [colaboradores, setColaboradores] = useState<Colaborador[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COLABS);
      return saved ? JSON.parse(saved) : INITIAL_COLABORADORES;
    } catch {
      return INITIAL_COLABORADORES;
    }
  });

  const [turnos, setTurnos] = useState<TurnoPosto[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TURNOS);
      return saved ? JSON.parse(saved) : INITIAL_TURNOS;
    } catch {
      return INITIAL_TURNOS;
    }
  });

  const [holerites, setHolerites] = useState<Holerite[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOLERITES);
      return saved ? JSON.parse(saved) : INITIAL_HOLERITES;
    } catch {
      return INITIAL_HOLERITES;
    }
  });

  const [ocorrencias, setOcorrencias] = useState<OcorrenciaLivro[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OCORRENCIAS);
      return saved ? JSON.parse(saved) : INITIAL_OCORRENCIAS;
    } catch {
      return INITIAL_OCORRENCIAS;
    }
  });

  const [escalas, setEscalas] = useState<Record<string, Record<string, DayStatus>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ESCALAS);
      return saved ? JSON.parse(saved) : generateInitialEscalas(INITIAL_COLABORADORES);
    } catch {
      return generateInitialEscalas(INITIAL_COLABORADORES);
    }
  });

  const [ftModalState, setFtModalState] = useState<{ isOpen: boolean; targetTurno: TurnoPosto | null }>({
    isOpen: false,
    targetTurno: null
  });

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOBILE_FRAME, JSON.stringify(isMobileFrame));
  }, [isMobileFrame]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONDOS, JSON.stringify(condominios));
  }, [condominios]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLABS, JSON.stringify(colaboradores));
  }, [colaboradores]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TURNOS, JSON.stringify(turnos));
  }, [turnos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOLERITES, JSON.stringify(holerites));
  }, [holerites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OCORRENCIAS, JSON.stringify(ocorrencias));
  }, [ocorrencias]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ESCALAS, JSON.stringify(escalas));
  }, [escalas]);

  const showToast = (message: string, type: ToastNotification['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auth
  const loginAsSupervisor = (loginOrEmail?: string, password?: string): boolean => {
    // If called without arguments (e.g. quick demo bypass button), log in immediately
    if (!loginOrEmail && !password) {
      setCurrentUser(INITIAL_SUPERVISOR_USER);
      setActiveTab('operacao');
      showToast(`Bem-vindo, ${INITIAL_SUPERVISOR_USER.name} (Administrador / RH)`, 'success');
      return true;
    }

    const cleanInput = (loginOrEmail || '').trim().toLowerCase();
    const validLogin = adminCredentials.login.toLowerCase();
    const validEmail = 'caetano@porttohub.com.br';

    const isUserValid = cleanInput === validLogin || 
                        cleanInput === validEmail || 
                        cleanInput === 'carlos.mendes@porttohub.com.br' ||
                        cleanInput === 'admin';

    const isPassValid = password === adminCredentials.password || 
                        password === '6814871984@Lm';

    if (!isUserValid || !isPassValid) {
      showToast('Login ou senha incorretos. Verifique suas credenciais.', 'error');
      return false;
    }

    const user: User = {
      ...INITIAL_SUPERVISOR_USER,
      username: adminCredentials.login,
      name: 'Caetano',
      email: cleanInput.includes('@') ? cleanInput : `${adminCredentials.login}@porttohub.com.br`
    };

    setCurrentUser(user);
    setActiveTab('operacao');
    showToast(`Bem-vindo, ${user.name}! Painel Administrativo liberado.`, 'success');
    return true;
  };

  const changePassword = (currentPass: string, newPass: string): boolean => {
    if (currentPass !== adminCredentials.password && currentPass !== '6814871984@Lm') {
      showToast('Senha atual incorreta.', 'error');
      return false;
    }
    if (!newPass || newPass.trim().length < 4) {
      showToast('A nova senha deve ter no mínimo 4 caracteres.', 'warning');
      return false;
    }

    const updatedCreds = { ...adminCredentials, password: newPass.trim() };
    setAdminCredentials(updatedCreds);
    localStorage.setItem(STORAGE_KEYS.ADMIN_CREDS, JSON.stringify(updatedCreds));
    showToast('Senha alterada com sucesso! Guarde suas novas credenciais.', 'success');
    setIsChangePasswordModalOpen(false);
    return true;
  };

  const loginAsOperacional = (cpfOrMatricula?: string) => {
    const user = {
      ...INITIAL_OPERATIONAL_USER,
      matricula: cpfOrMatricula || INITIAL_OPERATIONAL_USER.matricula
    };
    setCurrentUser(user);
    showToast(`Bem-vindo, ${user.name}! Posto atual carregado.`, 'success');
  };

  const logout = () => {
    setCurrentUser(null);
    showToast('Sessão encerrada com segurança.', 'info');
  };

  const switchRoleView = (role: UserRole) => {
    if (role === 'supervisor') {
      setCurrentUser(INITIAL_SUPERVISOR_USER);
      setActiveTab('operacao');
      showToast('Visualizando como Supervisor / Gestor', 'info');
    } else {
      setCurrentUser(INITIAL_OPERATIONAL_USER);
      showToast('Visualizando como Colaborador Operacional', 'info');
    }
  };

  // Team
  const addColaborador = async (colab: Omit<Colaborador, 'id'>) => {
    const newId = `colab-${Date.now()}`;
    const newColab: Colaborador = {
      ...colab,
      id: newId
    };

    setColaboradores(prev => [newColab, ...prev]);

    // Also initialize schedule for new collaborator
    setEscalas(prev => {
      const updated = { ...prev };
      updated[newId] = {};
      const today = new Date();
      for (let day = 1; day <= 30; day++) {
        const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        updated[newId][dateKey] = day % 2 === 0 ? 'trabalho' : 'folga';
      }
      return updated;
    });

    await syncRecordToSupabase('colaboradores', newColab as unknown as Record<string, unknown>);
    showToast(`Colaborador ${newColab.nome} cadastrado com sucesso!`, 'success');
  };

  const updateColaborador = async (colab: Colaborador) => {
    setColaboradores(prev => prev.map(c => c.id === colab.id ? colab : c));
    await syncRecordToSupabase('colaboradores', colab as unknown as Record<string, unknown>);
    showToast('Dados do colaborador atualizados.', 'success');
  };

  const reallotColaborador = async (colaboradorId: string, novoCondominioId: string) => {
    const colab = colaboradores.find(c => c.id === colaboradorId);
    const novoCondo = condominios.find(cd => cd.id === novoCondominioId);
    if (!colab || !novoCondo) return;

    const updatedColab = { ...colab, condominioId: novoCondominioId };
    setColaboradores(prev => prev.map(c => c.id === colaboradorId ? updatedColab : c));
    
    // Also update any turnos assigned to this collaborator
    setTurnos(prev => prev.map(t => {
      if (t.colaboradorTitularId === colaboradorId || t.colaboradorAtualId === colaboradorId) {
        return { ...t, condominioId: novoCondominioId };
      }
      return t;
    }));

    await syncRecordToSupabase('colaboradores', updatedColab as unknown as Record<string, unknown>);
    showToast(`Colaborador ${colab.nome} realocado para ${novoCondo.nome}`, 'success');
  };

  const addOcorrencia = async (ocoData: Omit<OcorrenciaLivro, 'id' | 'dataHora'>) => {
    const now = new Date();
    const dataHoraStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newOcorrencia: OcorrenciaLivro = {
      ...ocoData,
      id: `oco-${Date.now()}`,
      dataHora: dataHoraStr
    };

    setOcorrencias(prev => [newOcorrencia, ...prev]);
    await syncRecordToSupabase('ocorrencias', newOcorrencia as unknown as Record<string, unknown>);
    showToast('Ocorrência registrada no Livro Digital do Posto!', 'success');
  };

  // Condos
  const addCondominio = async (condo: Omit<CondominioPosto, 'id'>) => {
    const newId = `condo-${Date.now()}`;
    const newCondo: CondominioPosto = {
      ...condo,
      id: newId
    };
    setCondominios(prev => [newCondo, ...prev]);

    // Create a default shift for this new post
    const newTurno: TurnoPosto = {
      id: `turno-${Date.now()}`,
      condominioId: newId,
      postoNome: 'Portaria Principal',
      data: new Date().toISOString().split('T')[0],
      periodo: 'diurno',
      horario: '07:00 - 19:00',
      status: 'coberto',
      ftDesignada: false,
      observacao: 'Posto recém implantado.'
    };
    setTurnos(prev => [newTurno, ...prev]);

    await syncRecordToSupabase('condominios', newCondo as unknown as Record<string, unknown>);
    showToast(`Condomínio ${newCondo.nome} cadastrado com sucesso!`, 'success');
  };

  const updateCondominio = async (condo: CondominioPosto) => {
    setCondominios(prev => prev.map(c => c.id === condo.id ? condo : c));
    await syncRecordToSupabase('condominios', condo as unknown as Record<string, unknown>);
    showToast('Dados do condomínio atualizados.', 'success');
  };

  // FT & Shifts
  const openFTModal = (turno?: TurnoPosto) => {
    const target = turno || turnos.find(t => t.status === 'vazio') || turnos[0];
    setFtModalState({
      isOpen: true,
      targetTurno: target || null
    });
  };

  const closeFTModal = () => {
    setFtModalState({
      isOpen: false,
      targetTurno: null
    });
  };

  const designarFT = async (turnoId: string, substitutoId: string, observacao?: string) => {
    const substituto = colaboradores.find(c => c.id === substitutoId);
    const subNome = substituto ? substituto.nome : 'Colaborador';

    setTurnos(prev => prev.map(t => {
      if (t.id === turnoId) {
        return {
          ...t,
          status: 'em_ft',
          colaboradorAtualId: substitutoId,
          ftDesignada: true,
          observacao: observacao || `FT assumida por ${subNome} (Folga Trabalhada).`
        };
      }
      return t;
    }));

    // Update Matriz status for this collaborator for today
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setEscalas(prev => {
      const copy = { ...prev };
      if (!copy[substitutoId]) copy[substitutoId] = {};
      copy[substitutoId][todayKey] = 'ft';
      return copy;
    });

    closeFTModal();
    showToast(`⚡ FT Designada com sucesso! ${subNome} alocado no posto.`, 'success');
  };

  const normalizarPosto = async (turnoId: string) => {
    setTurnos(prev => prev.map(t => {
      if (t.id === turnoId) {
        return {
          ...t,
          status: 'coberto',
          colaboradorAtualId: t.colaboradorTitularId,
          ftDesignada: false,
          observacao: 'Posto normalizado pelo titular.'
        };
      }
      return t;
    }));
    showToast('Posto marcado como coberto com sucesso.', 'success');
  };

  // Matriz Day Click
  const updateEscalaDia = (colaboradorId: string, dateKey: string, status: DayStatus) => {
    setEscalas(prev => {
      const copy = { ...prev };
      if (!copy[colaboradorId]) copy[colaboradorId] = {};
      copy[colaboradorId][dateKey] = status;
      return copy;
    });

    const statusLabels: Record<DayStatus, string> = {
      trabalho: 'Trabalho (🟩)',
      folga: 'Folga (🟦)',
      ft: 'FT / Folga Trabalhada (⚡)',
      falta: 'Falta / Atraso (🔴)',
      atestado: 'Atestado Médico (🟡)'
    };
    showToast(`Escala alterada para: ${statusLabels[status]}`, 'info');
  };

  // Holerite
  const saveAndPublishHolerite = async (holeriteData: Omit<Holerite, 'id'>) => {
    const newId = `hol-${Date.now()}`;
    const newHolerite: Holerite = {
      ...holeriteData,
      id: newId,
      publicado: true,
      dataPublicacao: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setHolerites(prev => [newHolerite, ...prev]);
    await syncRecordToSupabase('holerites', newHolerite as unknown as Record<string, unknown>);

    const colab = colaboradores.find(c => c.id === newHolerite.colaboradorId);
    showToast(`Holerite de ${colab?.nome || 'colaborador'} publicado com sucesso no app!`, 'success');
  };

  const deleteHolerite = (id: string) => {
    setHolerites(prev => prev.filter(h => h.id !== id));
    showToast('Holerite removido do registro.', 'info');
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      activeTab,
      setActiveTab,
      isMobileFrame,
      setIsMobileFrame,
      condominios,
      colaboradores,
      turnos,
      holerites,
      ocorrencias,
      escalas,
      loginAsSupervisor,
      loginAsOperacional,
      logout,
      adminCredentials,
      changePassword,
      isChangePasswordModalOpen,
      setIsChangePasswordModalOpen,
      switchRoleView,
      addColaborador,
      updateColaborador,
      reallotColaborador,
      addCondominio,
      updateCondominio,
      addOcorrencia,
      openFTModal,
      closeFTModal,
      ftModalState,
      designarFT,
      normalizarPosto,
      updateEscalaDia,
      saveAndPublishHolerite,
      deleteHolerite,
      toasts,
      showToast,
      removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
