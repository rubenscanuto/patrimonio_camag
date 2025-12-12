import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FolderOpen, Database, Building2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import DocumentVault from './components/DocumentVault';
import RegistersView from './components/RegistersView';
import AssetManager from './components/AssetManager';
import { Property, Document, Employee, PropertyTag, AIConfig, UserProfile, MonthlyIndexData, Owner, CloudAccount } from './types';
import { fetchHistoricalIndices } from './services/geminiService';

// Initial Tags
const INITIAL_TAGS: PropertyTag[] = [
  { id: 't1', label: 'Em Reforma', color: 'yellow' },
  { id: 't2', label: 'Alugado', color: 'green' },
  { id: 't3', label: 'Venda Pendente', color: 'purple' },
];

// Mock Initial Data - Enhanced for detail views
const INITIAL_PROPERTIES: Property[] = [
  { 
    id: '1', 
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
    tags: ['t2'],
    maintenanceHistory: [
      { id: 'm1', date: '10/01/2024', description: 'Manutenção Elevadores', cost: 4500, status: 'Completed' },
      { id: 'm2', date: '01/02/2024', description: 'Revisão Sistema Incêndio', cost: 1200, status: 'Pending' }
    ]
  },
  { 
    id: '2', 
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
    id: '3', 
    name: 'Residencial Villa Verde', 
    address: 'Al. das Flores, 55 - Interior', 
    value: 2800000, 
    purchaseValue: 1200000,
    purchaseDate: '05/02/2018',
    status: 'Under Maintenance', 
    imageUrl: 'https://picsum.photos/400/300?random=3',
    tenantName: 'Família Souza',
    contractExpiry: '05/2026',
    tags: ['t1'],
    maintenanceHistory: [
       { id: 'm3', date: '15/02/2024', description: 'Troca de Telhado', cost: 18000, status: 'Pending' }
    ]
  },
];

const INITIAL_DOCUMENTS: Document[] = [
  { 
    id: '1', 
    name: 'Contrato Locação - Horizon', 
    category: 'Legal', 
    uploadDate: '12/02/2024', 
    relatedPropertyId: '1',
    summary: 'Contrato de 5 anos com Multinacional X.',
    aiAnalysis: {
        riskLevel: 'Low',
        keyDates: ['12/02/2029'],
        monetaryValues: ['R$ 85.000/mês']
    }
  },
  { 
    id: '2', 
    name: 'IPTU 2024 - Galpão', 
    category: 'Tax', 
    uploadDate: '15/01/2024', 
    relatedPropertyId: '2',
    summary: 'Guia parcela única paga.',
    aiAnalysis: {
        riskLevel: 'Low',
        keyDates: ['15/01/2024'],
        monetaryValues: ['R$ 12.400']
    }
  },
  { 
    id: '3', 
    name: 'Escritura Pública - Horizon', 
    category: 'Acquisition', 
    uploadDate: '15/05/2010', 
    relatedPropertyId: '1',
    summary: 'Escritura definitiva de compra e venda.',
    aiAnalysis: {
        riskLevel: 'Low',
        keyDates: ['15/05/2010'],
        monetaryValues: ['R$ 8.500.000']
    }
  },
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Carlos Mendes', role: 'Gerente Predial', assignedProperties: ['1', '3'], contact: '(11) 99999-9999', activeTasks: 3, status: 'Active' },
  { id: '2', name: 'Dra. Ana Silva', role: 'Jurídico', assignedProperties: ['ALL'], contact: '(11) 98888-8888', activeTasks: 5, status: 'Active' },
  { id: '3', name: 'Roberto Alencar', role: 'Manutenção', assignedProperties: ['2'], contact: '(11) 97777-7777', activeTasks: 1, status: 'On Leave' },
];

type ViewState = 'dashboard' | 'assets' | 'documents' | 'registers';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [tags, setTags] = useState<PropertyTag[]>(INITIAL_TAGS);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccount[]>([]);
  const [isUpdatingIndices, setIsUpdatingIndices] = useState(false);
  
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

  // Function to handle database updates from AssetManager
  const handleUpdateIndicesDatabase = (newData: MonthlyIndexData[]) => {
      const mergedMap = new Map<string, MonthlyIndexData>();
      
      // 1. Populate with existing data
      indicesDatabase.forEach(item => {
        mergedMap.set(item.date, { ...item, indices: { ...item.indices } });
      });

      // 2. Merge new data
      newData.forEach(newItem => {
        const existingItem = mergedMap.get(newItem.date);
        if (existingItem) {
            // Deep merge the indices object
            mergedMap.set(newItem.date, {
                date: newItem.date,
                indices: {
                    ...existingItem.indices,
                    ...newItem.indices
                }
            });
        } else {
            mergedMap.set(newItem.date, newItem);
        }
      });

      const mergedArray = Array.from(mergedMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      setIndicesDatabase(mergedArray);
  };

  const handleForceUpdateIndices = async () => {
      if(isUpdatingIndices) return;
      
      // Removed confirm dialog to ensure button works immediately and avoids blocking
      setIsUpdatingIndices(true);

      // Define range: Last 5 years to present
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const startYear = currentYear - 5;
      
      const startStr = `${startYear}-01`;
      const endStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      try {
        // Fetch indices including CDI
        const newIndices = await fetchHistoricalIndices(
            startStr,
            endStr,
            ['IPCA', 'IGPM', 'INCC', 'SELIC', 'CDI'],
            activeAIConfig?.apiKey || '',
            activeAIConfig?.modelName || ''
        );

        if(newIndices && newIndices.length > 0) {
            handleUpdateIndicesDatabase(newIndices);
            // Optional: You could show a toast here instead of alert, but alert confirms completion
            // alert(`Sucesso! Base de dados atualizada/mesclada com ${newIndices.length} registros mensais do Banco Central.`);
        } else {
            alert("Não foi possível obter novos dados no momento. Verifique sua conexão ou tente novamente mais tarde.");
        }
      } catch (error) {
          console.error(error);
          alert("Erro ao atualizar índices. Ocorreu uma falha na comunicação.");
      } finally {
          setIsUpdatingIndices(false);
      }
  };

  // CRUD Settings - Fixed for Batch Updates
  const handleAddAIConfig = (config: AIConfig) => setAiConfigs(prev => [...prev, config]);
  const handleDeleteAIConfig = (id: string) => setAiConfigs(prev => prev.filter(c => c.id !== id));
  const handleSetActiveAIConfig = (id: string) => setAiConfigs(prev => prev.map(c => ({ ...c, isActive: c.id === id })));

  // Cloud Account CRUD - Fixed for Batch Updates
  const handleAddCloudAccount = (account: CloudAccount) => setCloudAccounts(prev => [...prev, account]);
  const handleDeleteCloudAccount = (id: string) => setCloudAccounts(prev => prev.filter(c => c.id !== id));

  // Property CRUD - Fixed for Batch Updates
  const handleAddProperty = (prop: Property) => setProperties(prev => [...prev, prop]);
  const handleUpdateProperties = (updatedProperties: Property[]) => setProperties(updatedProperties);
  const handleEditProperty = (prop: Property) => setProperties(prev => prev.map(p => p.id === prop.id ? prop : p));
  const handleDeleteProperty = (id: string) => setProperties(prev => prev.filter(p => p.id !== id));

  // Tag CRUD - Fixed for Batch Updates
  const handleAddTag = (tag: PropertyTag) => setTags(prev => [...prev, tag]);
  const handleDeleteTag = (id: string) => {
     setTags(prev => prev.filter(t => t.id !== id));
     setProperties(prev => prev.map(p => ({
       ...p,
       tags: p.tags?.filter(tId => tId !== id)
     })));
  };

  // Owner CRUD - Fixed for Batch Updates
  const handleAddOwner = (owner: Owner) => setOwners(prev => [...prev, owner]);
  const handleEditOwner = (owner: Owner) => setOwners(prev => prev.map(o => o.id === owner.id ? owner : o));
  const handleDeleteOwner = (id: string) => setOwners(prev => prev.filter(o => o.id !== id));

  // Document CRUD - Fixed for Batch Updates (Crucial fix for multi-upload and reliable delete)
  const handleAddDocument = (doc: Document) => setDocuments(prev => [doc, ...prev]);
  // FIX: Using prev state to ensure delete works even if closure is stale
  const handleDeleteDocument = (id: string) => setDocuments(prev => prev.filter(d => d.id !== id));
  
  const handleAddEmployee = (emp: Employee) => setEmployees(prev => [...prev, emp]);

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
            />
          )}
        </div>
      </main>

    </div>
  );
};

export default App;