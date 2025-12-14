import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FolderOpen, Database, Building2, ClipboardList, Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import DocumentVault from './components/DocumentVault';
import RegistersView from './components/RegistersView';
import AssetManager from './components/AssetManager';
import AuditView from './components/AuditView';
import AuthScreen from './components/AuthScreen';
import { Property, Document, Employee, PropertyTag, AIConfig, UserProfile, MonthlyIndexData, Owner, CloudAccount, LogEntry, TrashItem } from './types';
import { fetchHistoricalIndices } from './services/geminiService';
import { getNextId } from './services/idService';
import { authService } from './services/authService';
import {
  propertiesService,
  documentsService,
  employeesService,
  tagsService,
  ownersService,
  aiConfigsService,
  cloudAccountsService,
  indicesService,
  logsService,
  trashService,
} from './services/databaseService';

// Initial Tags
const INITIAL_TAGS: PropertyTag[] = [
  { id: 'E_1', label: 'Em Reforma', color: 'yellow' },
  { id: 'E_2', label: 'Alugado', color: 'green' },
  { id: 'E_3', label: 'Venda Pendente', color: 'purple' },
];

// Mock Initial Data - Enhanced for detail views
const INITIAL_PROPERTIES: Property[] = [
  { 
    id: 'I_1', 
    name: 'Edifício Horizon', 
    address: 'Av. Paulista, 1000 - SP', 
    value: 15000000, 
    purchaseValue: 8500000,
    purchaseDate: '15/05/2010',
    status: 'Occupied', 
    imageUrl: 'https://picsum.photos/400/300?random=1',
    tenantName: 'TechSolutions Ltda',
    contractExpiry: '12/2029',
    seller: 'Construtora ABC',
    registryData: { matricula: '123.456', cartorio: '4º Registro de Imóveis SP', livro: '2', folha: '120' },
    customFields: { 'Voltagem': '220v', 'Vagas Garagem': '10 Fixas' },
    tags: ['E_2'],
    maintenanceHistory: [
      { id: 'm1', date: '10/01/2024', description: 'Manutenção Elevadores', cost: 4500, status: 'Completed' },
      { id: 'm2', date: '01/02/2024', description: 'Revisão Sistema Incêndio', cost: 1200, status: 'Pending' }
    ]
  },
  { 
    id: 'I_2', 
    name: 'Galpão Industrial Zona Norte', 
    address: 'Rua das Indústrias, 400 - SP', 
    value: 4500000, 
    purchaseValue: 2100000,
    purchaseDate: '22/08/2015',
    status: 'Vacant', 
    imageUrl: 'https://picsum.photos/400/300?random=2',
    seller: 'Indústrias Reunidas SA',
    registryData: { matricula: '987.654', cartorio: '8º Registro de Imóveis SP', livro: '3', folha: '05' },
    tags: [],
    maintenanceHistory: []
  },
  { 
    id: 'I_3', 
    name: 'Residencial Villa Verde', 
    address: 'Al. das Flores, 55 - Interior', 
    value: 2800000, 
    purchaseValue: 1200000,
    purchaseDate: '05/02/2018',
    status: 'Under Maintenance', 
    imageUrl: 'https://picsum.photos/400/300?random=3',
    tenantName: 'Família Souza',
    contractExpiry: '05/2026',
    tags: ['E_1'],
    maintenanceHistory: [
       { id: 'm3', date: '15/02/2024', description: 'Troca de Telhado', cost: 18000, status: 'Pending' }
    ]
  },
];

const INITIAL_DOCUMENTS: Document[] = [
  { 
    id: 'D_1', 
    name: 'Contrato Locação - Horizon', 
    category: 'Legal', 
    uploadDate: '12/02/2024', 
    relatedPropertyId: 'I_1',
    summary: 'Contrato de 5 anos com Multinacional X.',
    aiAnalysis: {
        riskLevel: 'Low',
        keyDates: ['12/02/2029'],
        monetaryValues: ['R$ 85.000/mês']
    }
  },
  { 
    id: 'D_2', 
    name: 'IPTU 2024 - Galpão', 
    category: 'Tax', 
    uploadDate: '15/01/2024', 
    relatedPropertyId: 'I_2',
    summary: 'Guia parcela única paga.',
    aiAnalysis: {
        riskLevel: 'Low',
        keyDates: ['15/01/2024'],
        monetaryValues: ['R$ 12.400']
    }
  },
  { 
    id: 'D_3', 
    name: 'Escritura Pública - Horizon', 
    category: 'Acquisition', 
    uploadDate: '15/05/2010', 
    relatedPropertyId: 'I_1',
    summary: 'Escritura definitiva de compra e venda.',
    aiAnalysis: {
        riskLevel: 'Low',
        keyDates: ['15/05/2010'],
        monetaryValues: ['R$ 8.500.000']
    }
  },
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'C_1', name: 'Carlos Mendes', role: 'Gerente Predial', assignedProperties: ['I_1', 'I_3'], contact: '(11) 99999-9999', activeTasks: 3, status: 'Active' },
  { id: 'C_2', name: 'Dra. Ana Silva', role: 'Jurídico', assignedProperties: ['ALL'], contact: '(11) 98888-8888', activeTasks: 5, status: 'Active' },
  { id: 'C_3', name: 'Roberto Alencar', role: 'Manutenção', assignedProperties: ['I_2'], contact: '(11) 97777-7777', activeTasks: 1, status: 'On Leave' },
];

type ViewState = 'dashboard' | 'assets' | 'documents' | 'registers' | 'audit';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tags, setTags] = useState<PropertyTag[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccount[]>([]);
  const [isUpdatingIndices, setIsUpdatingIndices] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [indicesDatabase, setIndicesDatabase] = useState<MonthlyIndexData[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    companyName: ''
  });
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);

  const activeAIConfig = aiConfigs.find(c => c.isActive);

  useEffect(() => {
    let mounted = true;

    const loadingTimeout = setTimeout(() => {
      console.warn('[App] Loading timeout reached, forcing loading to false');
      if (mounted) setLoading(false);
    }, 15000);

    const subscription = authService.onAuthStateChange(async (authUser) => {
      console.log('[App] Auth state changed:', authUser?.id || 'logged out');

      if (!mounted) return;

      setUser(authUser);

      if (authUser) {
        try {
          console.log('[App] Aguardando 500ms para garantir sessão estabelecida...');
          await new Promise(resolve => setTimeout(resolve, 500));

          if (mounted) {
            await loadUserData(authUser.id);
          }
        } catch (error) {
          console.error('[App] Erro no handler de mudança de auth:', error);
        } finally {
          if (mounted) {
            setLoading(false);
            clearTimeout(loadingTimeout);
          }
        }
      } else {
        if (mounted) {
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    });

    checkAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const checkAuth = async () => {
    try {
      console.log('[checkAuth] Verificando autenticação inicial...');
      const currentUser = await authService.getCurrentUser();

      if (currentUser) {
        console.log('[checkAuth] Usuário já autenticado encontrado:', currentUser.id);
        console.log('[checkAuth] onAuthStateChange irá carregar os dados...');
      } else {
        console.log('[checkAuth] Nenhum usuário autenticado, mostrando tela de login');
        setLoading(false);
      }
    } catch (error) {
      console.error('[checkAuth] Erro ao verificar autenticação:', error);
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      console.log('[loadUserData] Iniciando carregamento para:', userId);

      console.log('[loadUserData] Carregando perfil...');
      const profile = await authService.getUserProfile(userId).catch(e => {
        console.error('[loadUserData] Erro ao carregar perfil:', e);
        return null;
      });

      console.log('[loadUserData] Carregando propriedades...');
      const propertiesData = await propertiesService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar propriedades:', e);
        return [];
      });

      console.log('[loadUserData] Carregando documentos...');
      const documentsData = await documentsService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar documentos:', e);
        return [];
      });

      console.log('[loadUserData] Carregando funcionários...');
      const employeesData = await employeesService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar funcionários:', e);
        return [];
      });

      console.log('[loadUserData] Carregando tags...');
      const tagsData = await tagsService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar tags:', e);
        return [];
      });

      console.log('[loadUserData] Carregando proprietários...');
      const ownersData = await ownersService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar proprietários:', e);
        return [];
      });

      console.log('[loadUserData] Carregando configurações de IA...');
      const aiConfigsData = await aiConfigsService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar configs de IA:', e);
        return [];
      });

      console.log('[loadUserData] Carregando contas cloud...');
      const cloudAccountsData = await cloudAccountsService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar contas cloud:', e);
        return [];
      });

      console.log('[loadUserData] Carregando índices...');
      const indicesData = await indicesService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar índices:', e);
        return [];
      });

      console.log('[loadUserData] Carregando logs...');
      const logsData = await logsService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar logs:', e);
        return [];
      });

      console.log('[loadUserData] Carregando lixeira...');
      const trashData = await trashService.getAll().catch(e => {
        console.error('[loadUserData] Erro ao carregar lixeira:', e);
        return [];
      });

      console.log('[loadUserData] Todos os dados carregados com sucesso');
      if (profile) setUserProfile(profile);
      setProperties(propertiesData || []);
      setDocuments(documentsData || []);
      setEmployees(employeesData || []);
      setTags(tagsData || []);
      setOwners(ownersData || []);
      setAiConfigs(aiConfigsData || []);
      setCloudAccounts(cloudAccountsData || []);
      setIndicesDatabase(indicesData || []);
      setLogs(logsData || []);
      setTrash(trashData || []);
    } catch (error: any) {
      console.error('[loadUserData] Erro crítico:', error);
      console.error('[loadUserData] Stack:', error.stack);
      alert(`Erro ao carregar dados: ${error.message || 'Verifique sua conexão.'}`);
    }
  };

  const handleAuth = async (email: string, password: string, isSignUp: boolean, profile?: { name: string; companyName: string }) => {
    try {
      console.log('[handleAuth] Iniciando autenticação:', isSignUp ? 'SIGN UP' : 'SIGN IN', 'Email:', email);

      if (isSignUp && profile) {
        console.log('[handleAuth] Criando nova conta...');
        const result = await authService.signUp(email, password, {
          name: profile.name,
          email,
          companyName: profile.companyName,
        });
        console.log('[handleAuth] Conta criada com sucesso:', result.user?.id);
      } else {
        console.log('[handleAuth] Fazendo login...');
        const result = await authService.signIn(email, password);
        console.log('[handleAuth] Login bem-sucedido:', result.user?.id);
        console.log('[handleAuth] Sessão ativa:', !!result.session);
      }

      console.log('[handleAuth] Autenticação concluída');
    } catch (error: any) {
      console.error('[handleAuth] Erro na autenticação:', error);
      console.error('[handleAuth] Detalhes:', error.message, error.status);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setProperties([]);
      setDocuments([]);
      setEmployees([]);
      setTags([]);
      setOwners([]);
      setAiConfigs([]);
      setCloudAccounts([]);
      setIndicesDatabase([]);
      setLogs([]);
      setTrash([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // --- Helper Functions for Logging and Trash ---

  const addLog = async (action: LogEntry['action'], entityType: LogEntry['entityType'], description: string, details?: string) => {
    const newLog: LogEntry = {
      id: getNextId('Log'),
      timestamp: new Date().toLocaleString('pt-BR'),
      action,
      entityType,
      description,
      user: userProfile.name,
      details
    };
    setLogs(prev => [newLog, ...prev]);
    try {
      await logsService.create(newLog);
    } catch (error) {
      console.error('Error creating log:', error);
    }
  };

  const addToTrash = async (item: any, type: TrashItem['entityType'], name: string) => {
    const trashItem: TrashItem = {
      id: item.id,
      deletedAt: new Date().toLocaleString('pt-BR'),
      originalData: item,
      entityType: type,
      name: name
    };
    setTrash(prev => [trashItem, ...prev]);
    try {
      await trashService.create(trashItem);
    } catch (error) {
      console.error('Error adding to trash:', error);
    }
  };

  const handleRestoreFromTrash = async (trashId: string) => {
    const itemToRestore = trash.find(t => t.id === trashId);
    if (!itemToRestore) return;

    try {
      switch (itemToRestore.entityType) {
        case 'Property':
          await propertiesService.create(itemToRestore.originalData);
          setProperties(prev => [...prev, itemToRestore.originalData]);
          break;
        case 'Document':
          await documentsService.create(itemToRestore.originalData);
          setDocuments(prev => [...prev, itemToRestore.originalData]);
          break;
        case 'Owner':
          await ownersService.create(itemToRestore.originalData);
          setOwners(prev => [...prev, itemToRestore.originalData]);
          break;
        case 'Employee':
          await employeesService.create(itemToRestore.originalData);
          setEmployees(prev => [...prev, itemToRestore.originalData]);
          break;
        case 'Tag':
          await tagsService.create(itemToRestore.originalData);
          setTags(prev => [...prev, itemToRestore.originalData]);
          break;
        case 'CloudAccount':
          await cloudAccountsService.create(itemToRestore.originalData);
          setCloudAccounts(prev => [...prev, itemToRestore.originalData]);
          break;
      }

      await trashService.delete(trashId);
      setTrash(prev => prev.filter(t => t.id !== trashId));
      addLog('Restore', itemToRestore.entityType as any, `Restaurado ${itemToRestore.name} da lixeira.`);
    } catch (error) {
      console.error('Error restoring from trash:', error);
      alert('Erro ao restaurar item da lixeira');
    }
  };

  // --- CRUD Handlers ---

  const handleUpdateIndicesDatabase = async (newData: MonthlyIndexData[]) => {
      const mergedMap = new Map<string, MonthlyIndexData>();
      indicesDatabase.forEach(item => { mergedMap.set(item.date, { ...item, indices: { ...item.indices } }); });
      newData.forEach(newItem => {
        const existingItem = mergedMap.get(newItem.date);
        if (existingItem) {
            mergedMap.set(newItem.date, { date: newItem.date, indices: { ...existingItem.indices, ...newItem.indices } });
        } else { mergedMap.set(newItem.date, newItem); }
      });
      const mergedArray = Array.from(mergedMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      setIndicesDatabase(mergedArray);
      try {
        await indicesService.upsert(mergedArray);
      } catch (error) {
        console.error('Error updating indices:', error);
      }
      addLog('Update', 'System', 'Base de índices atualizada via API/IA.');
  };

  const handleForceUpdateIndices = async () => {
      if(isUpdatingIndices) return;
      setIsUpdatingIndices(true);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const startYear = currentYear - 5;
      const startStr = `${startYear}-01`;
      const endStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      try {
        const newIndices = await fetchHistoricalIndices(startStr, endStr, ['IPCA', 'IGPM', 'INCC', 'SELIC', 'CDI'], activeAIConfig?.apiKey || '');
        if(newIndices && newIndices.length > 0) {
            handleUpdateIndicesDatabase(newIndices);
        } else {
            alert("Não foi possível obter novos dados no momento.");
        }
      } catch (error) {
          console.error(error);
          alert("Erro ao atualizar índices.");
      } finally {
          setIsUpdatingIndices(false);
      }
  };

  const handleAddAIConfig = async (config: AIConfig) => {
    try {
      console.log('Saving AI config to database:', config.id, config.label);
      await aiConfigsService.create(config);
      console.log('AI config saved to database successfully');
      setAiConfigs(prev => [...prev, config]);
      await addLog('Create', 'System', `Adicionada chave de API: ${config.label}`);
    } catch (error: any) {
      console.error('Error adding AI config:', error);
      const errorMessage = error?.message || error?.toString() || 'Erro ao salvar configuração de IA';
      throw new Error(errorMessage);
    }
  };
  const handleDeleteAIConfig = async (id: string) => {
    try {
      await aiConfigsService.delete(id);
      setAiConfigs(prev => prev.filter(c => c.id !== id));
      addLog('Delete', 'System', `Removida chave de API ID: ${id}`);
    } catch (error) {
      console.error('Error deleting AI config:', error);
      alert('Erro ao remover configuração de IA');
    }
  };
  const handleSetActiveAIConfig = async (id: string) => {
    try {
      const updatedConfigs = aiConfigs.map(c => ({ ...c, isActive: c.id === id }));
      for (const config of updatedConfigs) {
        await aiConfigsService.update(config);
      }
      setAiConfigs(updatedConfigs);
      addLog('Update', 'System', `Chave ativa alterada para ID: ${id}`);
    } catch (error) {
      console.error('Error setting active AI config:', error);
      alert('Erro ao definir configuração de IA ativa');
    }
  };

  const handleAddCloudAccount = async (account: CloudAccount) => {
    try {
      await cloudAccountsService.create(account);
      setCloudAccounts(prev => [...prev, account]);
      addLog('Create', 'System', `Adicionada conta nuvem: ${account.provider}`);
    } catch (error) {
      console.error('Error adding cloud account:', error);
      alert('Erro ao adicionar conta de nuvem');
    }
  };
  const handleDeleteCloudAccount = async (id: string) => {
    const acc = cloudAccounts.find(c => c.id === id);
    if(acc) {
        try {
          await addToTrash(acc, 'CloudAccount', `${acc.provider} - ${acc.accountName}`);
          await cloudAccountsService.delete(id);
          setCloudAccounts(prev => prev.filter(c => c.id !== id));
          addLog('Delete', 'System', `Conta nuvem movida para lixeira: ${acc.provider}`);
        } catch (error) {
          console.error('Error deleting cloud account:', error);
          alert('Erro ao remover conta de nuvem');
        }
    }
  };

  const handleAddProperty = async (prop: Property) => {
    try {
      await propertiesService.create(prop);
      setProperties(prev => [...prev, prop]);
      addLog('Create', 'Property', `Criado imóvel: ${prop.name}`);
    } catch (error) {
      console.error('Error adding property:', error);
      alert('Erro ao adicionar imóvel');
    }
  };
  const handleUpdateProperties = async (updatedProperties: Property[]) => {
    try {
      for (const prop of updatedProperties) {
        await propertiesService.update(prop);
      }
      setProperties(updatedProperties);
      addLog('Update', 'Property', 'Atualização em lote de imóveis');
    } catch (error) {
      console.error('Error updating properties:', error);
      alert('Erro ao atualizar imóveis');
    }
  };
  const handleEditProperty = async (prop: Property) => {
    try {
      await propertiesService.update(prop);
      setProperties(prev => prev.map(p => p.id === prop.id ? prop : p));
      addLog('Update', 'Property', `Editado imóvel: ${prop.name}`);
    } catch (error) {
      console.error('Error editing property:', error);
      alert('Erro ao editar imóvel');
    }
  };
  const handleDeleteProperty = async (id: string) => {
    const prop = properties.find(p => p.id === id);
    if(prop) {
        try {
          await addToTrash(prop, 'Property', prop.name);
          await propertiesService.delete(id);
          setProperties(prev => prev.filter(p => p.id !== id));
          addLog('Delete', 'Property', `Imóvel movido para lixeira: ${prop.name}`);
        } catch (error) {
          console.error('Error deleting property:', error);
          alert('Erro ao remover imóvel');
        }
    }
  };

  const handleAddTag = async (tag: PropertyTag) => {
    try {
      await tagsService.create(tag);
      setTags(prev => [...prev, tag]);
      addLog('Create', 'Tag', `Criada etiqueta: ${tag.label}`);
    } catch (error) {
      console.error('Error adding tag:', error);
      alert('Erro ao adicionar etiqueta');
    }
  };
  const handleDeleteTag = async (id: string) => {
     const tag = tags.find(t => t.id === id);
     if(tag) {
        try {
          await addToTrash(tag, 'Tag', tag.label);
          await tagsService.delete(id);
          setTags(prev => prev.filter(t => t.id !== id));
          const updatedProperties = properties.map(p => ({
              ...p,
              tags: p.tags?.filter(tId => tId !== id)
          }));
          setProperties(updatedProperties);
          for (const prop of updatedProperties) {
            await propertiesService.update(prop);
          }
          addLog('Delete', 'Tag', `Etiqueta movida para lixeira: ${tag.label}`);
        } catch (error) {
          console.error('Error deleting tag:', error);
          alert('Erro ao remover etiqueta');
        }
     }
  };

  const handleAddOwner = async (owner: Owner) => {
    try {
      await ownersService.create(owner);
      setOwners(prev => [...prev, owner]);
      addLog('Create', 'Owner', `Cadastrado proprietário: ${owner.name}`);
    } catch (error) {
      console.error('Error adding owner:', error);
      alert('Erro ao adicionar proprietário');
    }
  };
  const handleEditOwner = async (owner: Owner) => {
    try {
      await ownersService.update(owner);
      setOwners(prev => prev.map(o => o.id === owner.id ? owner : o));
      addLog('Update', 'Owner', `Editado proprietário: ${owner.name}`);
    } catch (error) {
      console.error('Error editing owner:', error);
      alert('Erro ao editar proprietário');
    }
  };
  const handleDeleteOwner = async (id: string) => {
    const owner = owners.find(o => o.id === id);
    if(owner) {
        try {
          await addToTrash(owner, 'Owner', owner.name);
          await ownersService.delete(id);
          setOwners(prev => prev.filter(o => o.id !== id));
          addLog('Delete', 'Owner', `Proprietário movido para lixeira: ${owner.name}`);
        } catch (error) {
          console.error('Error deleting owner:', error);
          alert('Erro ao remover proprietário');
        }
    }
  };

  const handleAddDocument = async (doc: Document) => {
    try {
      console.log('Saving document:', doc.name, 'Size:', doc.contentRaw?.length || 0);
      await documentsService.create(doc);
      setDocuments(prev => [doc, ...prev]);
      addLog('Create', 'Document', `Documento adicionado: ${doc.name}`, `Categoria: ${doc.category}`);
      console.log('Document saved successfully');
    } catch (error: any) {
      console.error('Error adding document:', error);
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
      alert(`Erro ao adicionar documento: ${errorMessage}`);
      throw error;
    }
  };
  const handleEditDocument = async (doc: Document) => {
    try {
      await documentsService.update(doc);
      setDocuments(prev => prev.map(d => d.id === doc.id ? doc : d));
      addLog('Update', 'Document', `Documento atualizado: ${doc.name}`, `Categoria: ${doc.category}`);
    } catch (error) {
      console.error('Error editing document:', error);
      alert('Erro ao editar documento');
    }
  };
  const handleDeleteDocument = async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if(doc) {
        try {
          await addToTrash(doc, 'Document', doc.name);
          await documentsService.delete(id);
          setDocuments(prev => prev.filter(d => d.id !== id));
          addLog('Delete', 'Document', `Documento movido para lixeira: ${doc.name}`);
        } catch (error) {
          console.error('Error deleting document:', error);
          alert('Erro ao remover documento');
        }
    }
  };

  const handleAddEmployee = async (emp: Employee) => {
    try {
      await employeesService.create(emp);
      setEmployees(prev => [...prev, emp]);
      addLog('Create', 'Employee', `Colaborador adicionado: ${emp.name}`);
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Erro ao adicionar colaborador');
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        currentView === view 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
          : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
      }`}
    >
      <Icon size={20} className="shrink-0" />
      <span className="font-medium text-left leading-tight">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col flex-none md:h-full z-20 overflow-y-auto">
        <div className="flex items-center gap-2 mb-10 px-2 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Patrimônio<span className="text-blue-600">360</span></h1>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem view="assets" icon={Building2} label="Imóveis" />
          <NavItem view="documents" icon={FolderOpen} label="Documentos" />
          <NavItem view="registers" icon={Database} label="Cadastros" />
          <NavItem view="audit" icon={ClipboardList} label="Auditoria e Controle" />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 shrink-0">

          {/* Active AI Config Indicator */}
          <div className="px-4 mt-2">
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">IA Ativa</div>
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 truncate" title={activeAIConfig?.modelName}>
                <div className={`w-2 h-2 rounded-full ${activeAIConfig ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="truncate">{activeAIConfig?.label || "Sem configuração"}</span>
            </div>
            {indicesDatabase.length > 0 && (
                <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> {indicesDatabase.length} meses salvos
                </div>
            )}
          </div>

          <button
            onClick={handleSignOut}
            className="w-full mt-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto relative scroll-smooth flex flex-col">
        <div className="max-w-7xl mx-auto flex-1 w-full">
          {currentView === 'dashboard' && <Dashboard properties={properties} documents={documents} aiConfig={activeAIConfig} />}
          
          {currentView === 'assets' && (
             <AssetManager 
               properties={properties} 
               onAddProperty={handleAddProperty} 
               onUpdateProperties={handleUpdateProperties}
               onEditProperty={handleEditProperty}
               onDeleteProperty={handleDeleteProperty}
               allDocuments={documents}
               onAddDocument={handleAddDocument}
               onEditDocument={handleEditDocument}
               onDeleteDocument={handleDeleteDocument}
               tags={tags}
               onAddTag={handleAddTag}
               onDeleteTag={handleDeleteTag}
               owners={owners}
               onAddOwner={handleAddOwner}
               aiConfig={activeAIConfig}
               indicesDatabase={indicesDatabase}
               onUpdateIndicesDatabase={handleUpdateIndicesDatabase}
             />
          )}

          {currentView === 'documents' && (
            <DocumentVault 
              documents={documents} 
              properties={properties} 
              owners={owners}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              aiConfig={activeAIConfig}
            />
          )}
          
          {currentView === 'registers' && (
            <RegistersView 
              properties={properties} 
              onAddProperty={handleAddProperty} 
              onUpdateProperties={handleUpdateProperties}
              onEditProperty={handleEditProperty}
              onDeleteProperty={handleDeleteProperty}
              allDocuments={documents}
              onAddDocument={handleAddDocument}
              onEditDocument={handleEditDocument}
              onDeleteDocument={handleDeleteDocument}
              employees={employees}
              onAddEmployee={handleAddEmployee}
              tags={tags}
              onAddTag={handleAddTag}
              onDeleteTag={handleDeleteTag}
              owners={owners}
              onAddOwner={handleAddOwner}
              onEditOwner={handleEditOwner}
              onDeleteOwner={handleDeleteOwner}
              indicesDatabase={indicesDatabase}
              onUpdateIndicesDatabase={handleUpdateIndicesDatabase}
              onForceUpdateIndices={handleForceUpdateIndices}
              isUpdatingIndices={isUpdatingIndices}
              aiConfigs={aiConfigs}
              onAddAIConfig={handleAddAIConfig}
              onDeleteAIConfig={handleDeleteAIConfig}
              onSetActiveAIConfig={handleSetActiveAIConfig}
              cloudAccounts={cloudAccounts}
              onAddCloudAccount={handleAddCloudAccount}
              onDeleteCloudAccount={handleDeleteCloudAccount}
              activeAIConfig={activeAIConfig}
              userProfile={userProfile}
              onUpdateProfile={setUserProfile}
              logs={logs}
              trash={trash}
              onRestoreFromTrash={handleRestoreFromTrash}
            />
          )}

          {currentView === 'audit' && (
            <AuditView 
              logs={logs}
              trash={trash}
              onRestoreFromTrash={handleRestoreFromTrash}
              properties={properties}
              documents={documents}
              owners={owners}
              employees={employees}
              tags={tags}
              aiConfig={activeAIConfig}
            />
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white py-3 px-6 shrink-0">
          <p className="text-xs text-slate-400 text-center">
            Patrimônio 360 AI • Versão 1.0.0 • {new Date().getFullYear()}
          </p>
        </footer>
      </main>

    </div>
  );
};

export default App;