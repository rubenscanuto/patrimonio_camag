import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FolderOpen, Database, Building2, ClipboardList } from 'lucide-react';
import Dashboard from './components/Dashboard';
import DocumentVault from './components/DocumentVault';
import RegistersView from './components/RegistersView';
import AssetManager from './components/AssetManager';
import AuditView from './components/AuditView';
import { Property, Document, Employee, PropertyTag, AIConfig, UserProfile, MonthlyIndexData, Owner, CloudAccount, LogEntry, TrashItem } from './types';
import { fetchHistoricalIndices } from './services/geminiService';
import { getNextId } from './services/idService';

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
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [tags, setTags] = useState<PropertyTag[]>(INITIAL_TAGS);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccount[]>([]);
  const [isUpdatingIndices, setIsUpdatingIndices] = useState(false);
  
  // New States for Logs and Trash
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);

  // Indices Database - Initialize from LocalStorage
  const [indicesDatabase, setIndicesDatabase] = useState<MonthlyIndexData[]>(() => {
    const saved = localStorage.getItem('indicesDatabase');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to LocalStorage whenever indices change
  useEffect(() => {
    localStorage.setItem('indicesDatabase', JSON.stringify(indicesDatabase));
  }, [indicesDatabase]);

  // User & Settings State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Usuário Admin',
    email: 'admin@patrimonio360.com',
    companyName: 'Holding Familiar'
  });

  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([
    {
      id: 'default-1',
      label: 'Gemini Default',
      provider: 'Google Gemini',
      apiKey: process.env.API_KEY || '',
      modelName: 'gemini-2.5-flash',
      isActive: true
    }
  ]);

  const activeAIConfig = aiConfigs.find(c => c.isActive);

  // --- Helper Functions for Logging and Trash ---

  const addLog = (action: LogEntry['action'], entityType: LogEntry['entityType'], description: string, details?: string) => {
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
  };

  const addToTrash = (item: any, type: TrashItem['entityType'], name: string) => {
    const trashItem: TrashItem = {
      id: item.id,
      deletedAt: new Date().toLocaleString('pt-BR'),
      originalData: item,
      entityType: type,
      name: name
    };
    setTrash(prev => [trashItem, ...prev]);
  };

  const handleRestoreFromTrash = (trashId: string) => {
    const itemToRestore = trash.find(t => t.id === trashId);
    if (!itemToRestore) return;

    switch (itemToRestore.entityType) {
      case 'Property':
        setProperties(prev => [...prev, itemToRestore.originalData]);
        break;
      case 'Document':
        setDocuments(prev => [...prev, itemToRestore.originalData]);
        break;
      case 'Owner':
        setOwners(prev => [...prev, itemToRestore.originalData]);
        break;
      case 'Employee':
        setEmployees(prev => [...prev, itemToRestore.originalData]);
        break;
      case 'Tag':
        setTags(prev => [...prev, itemToRestore.originalData]);
        break;
      case 'CloudAccount':
        setCloudAccounts(prev => [...prev, itemToRestore.originalData]);
        break;
    }

    setTrash(prev => prev.filter(t => t.id !== trashId));
    addLog('Restore', itemToRestore.entityType as any, `Restaurado ${itemToRestore.name} da lixeira.`);
  };

  // --- CRUD Handlers ---

  const handleUpdateIndicesDatabase = (newData: MonthlyIndexData[]) => {
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
        const newIndices = await fetchHistoricalIndices(startStr, endStr, ['IPCA', 'IGPM', 'INCC', 'SELIC', 'CDI'], activeAIConfig?.apiKey || '', activeAIConfig?.modelName || '');
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

  // CRUD Settings
  const handleAddAIConfig = (config: AIConfig) => {
    setAiConfigs(prev => [...prev, config]);
    addLog('Create', 'System', `Adicionada chave de API: ${config.label}`);
  };
  const handleDeleteAIConfig = (id: string) => {
    setAiConfigs(prev => prev.filter(c => c.id !== id));
    addLog('Delete', 'System', `Removida chave de API ID: ${id}`);
  };
  const handleSetActiveAIConfig = (id: string) => {
    setAiConfigs(prev => prev.map(c => ({ ...c, isActive: c.id === id })));
    addLog('Update', 'System', `Chave ativa alterada para ID: ${id}`);
  };

  // Cloud Account CRUD
  const handleAddCloudAccount = (account: CloudAccount) => {
    setCloudAccounts(prev => [...prev, account]);
    addLog('Create', 'System', `Adicionada conta nuvem: ${account.provider}`);
  };
  const handleDeleteCloudAccount = (id: string) => {
    const acc = cloudAccounts.find(c => c.id === id);
    if(acc) {
        addToTrash(acc, 'CloudAccount', `${acc.provider} - ${acc.accountName}`);
        setCloudAccounts(prev => prev.filter(c => c.id !== id));
        addLog('Delete', 'System', `Conta nuvem movida para lixeira: ${acc.provider}`);
    }
  };

  // Property CRUD
  const handleAddProperty = (prop: Property) => {
    setProperties(prev => [...prev, prop]);
    addLog('Create', 'Property', `Criado imóvel: ${prop.name}`);
  };
  const handleUpdateProperties = (updatedProperties: Property[]) => {
    setProperties(updatedProperties);
    addLog('Update', 'Property', 'Atualização em lote de imóveis');
  };
  const handleEditProperty = (prop: Property) => {
    setProperties(prev => prev.map(p => p.id === prop.id ? prop : p));
    addLog('Update', 'Property', `Editado imóvel: ${prop.name}`);
  };
  const handleDeleteProperty = (id: string) => {
    const prop = properties.find(p => p.id === id);
    if(prop) {
        addToTrash(prop, 'Property', prop.name);
        setProperties(prev => prev.filter(p => p.id !== id));
        addLog('Delete', 'Property', `Imóvel movido para lixeira: ${prop.name}`);
    }
  };

  // Tag CRUD
  const handleAddTag = (tag: PropertyTag) => {
    setTags(prev => [...prev, tag]);
    addLog('Create', 'Tag', `Criada etiqueta: ${tag.label}`);
  };
  const handleDeleteTag = (id: string) => {
     const tag = tags.find(t => t.id === id);
     if(tag) {
        addToTrash(tag, 'Tag', tag.label);
        setTags(prev => prev.filter(t => t.id !== id));
        setProperties(prev => prev.map(p => ({
            ...p,
            tags: p.tags?.filter(tId => tId !== id)
        })));
        addLog('Delete', 'Tag', `Etiqueta movida para lixeira: ${tag.label}`);
     }
  };

  // Owner CRUD
  const handleAddOwner = (owner: Owner) => {
    setOwners(prev => [...prev, owner]);
    addLog('Create', 'Owner', `Cadastrado proprietário: ${owner.name}`);
  };
  const handleEditOwner = (owner: Owner) => {
    setOwners(prev => prev.map(o => o.id === owner.id ? owner : o));
    addLog('Update', 'Owner', `Editado proprietário: ${owner.name}`);
  };
  const handleDeleteOwner = (id: string) => {
    const owner = owners.find(o => o.id === id);
    if(owner) {
        addToTrash(owner, 'Owner', owner.name);
        setOwners(prev => prev.filter(o => o.id !== id));
        addLog('Delete', 'Owner', `Proprietário movido para lixeira: ${owner.name}`);
    }
  };

  // Document CRUD
  const handleAddDocument = (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
    addLog('Create', 'Document', `Documento adicionado: ${doc.name}`, `Categoria: ${doc.category}`);
  };
  const handleDeleteDocument = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if(doc) {
        addToTrash(doc, 'Document', doc.name);
        setDocuments(prev => prev.filter(d => d.id !== id));
        addLog('Delete', 'Document', `Documento movido para lixeira: ${doc.name}`);
    }
  };
  
  // Employee CRUD
  const handleAddEmployee = (emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
    addLog('Create', 'Employee', `Colaborador adicionado: ${emp.name}`);
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

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col flex-none md:h-full z-20 overflow-y-auto">
        <div className="flex items-center gap-2 mb-10 px-2 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Patrimônio<span className="text-indigo-600">360</span></h1>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto relative scroll-smooth">
        <div className="max-w-7xl mx-auto min-h-full">
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
      </main>

    </div>
  );
};

export default App;