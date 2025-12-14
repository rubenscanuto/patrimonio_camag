import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Property, Document, Employee, PropertyTag, AIConfig, MonthlyIndexData, UserProfile, Owner, CloudAccount, CloudProvider, AIProvider, LogEntry, TrashItem, AddressComponents, AIAnalysisResult } from '../types';
import AssetManager from './AssetManager';
import TeamManager from './TeamManager';
import TagManagerView from './TagManagerView';
import SettingsView from './SettingsView';
import DocumentVault from './DocumentVault';
import { Database, Users, Building2, Tag, Key, User, Plus, Trash2, Save, Cloud, ShieldCheck, Loader2, Search, MapPin, FileText, Download, Sparkles, ChevronDown, Camera, X, Briefcase, HelpCircle, Power, PowerOff, RefreshCcw, CloudUpload, Eraser, Pencil, ExternalLink, CheckCircle, Lock, Image as ImageIcon, FileSpreadsheet, CheckSquare, Square, Eye } from 'lucide-react';
import { getNextId } from '../services/idService';

// ... (Mask Helpers and Interface definitions same as before)
type TabType = 'Assets' | 'Team' | 'Tags' | 'Indices' | 'API' | 'Cloud' | 'Users' | 'Owners';
type OwnerModalTab = 'Data' | 'Documents';

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const COMMON_PROFESSIONS = [
  "Administrador", "Advogado", "Analista de Sistemas", "Arquiteto", "Artista Plástico", "Ator", 
  "Bancário", "Bibliotecário", "Biólogo", "Bombeiro", "Cabeleireiro", "Caminhoneiro", 
  "Carpinteiro", "Cientista", "Contador", "Corretor de Imóveis", "Cozinheiro", "Dentista", 
  "Designer", "Desenvolvedor de Software", "Economista", "Eletricista", "Enfermeiro", 
  "Engenheiro Civil", "Engenheiro Eletricista", "Engenheiro Mecânico", "Escritor", 
  "Farmacêutico", "Fisioterapeuta", "Fotógrafo", "Gastrólogo", "Geólogo", "Historiador", 
  "Jornalista", "Juiz", "Mecânico", "Médico", "Motorista", "Músico", "Nutricionista", 
  "Pedagogo", "Pedreiro", "Personal Trainer", "Piloto", "Policial", "Professor", 
  "Programador", "Psicólogo", "Publicitário", "Químico", "Recepcionista", "Secretário", 
  "Segurança", "Sociólogo", "Taxista", "Técnico de TI", "Tradutor", "Vendedor", "Veterinário", "Zootecnista"
];

const formatPhone = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '');
  if (v.length > 11) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
  return v;
};

const formatCEP = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length > 5) {
    return v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2-$3');
  } else if (v.length > 2) {
    return v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  }
  return v;
};

const formatDocumentMask = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 11) { 
      return v.replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d{1,2})/, '$1-$2')
              .replace(/(-\d{2})\d+?$/, '$1');
    } else { 
      return v.replace(/(\d{2})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1/$2')
              .replace(/(\d{4})(\d)/, '$1-$2')
              .replace(/(-\d{2})\d+?$/, '$1');
    }
};

interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
}

const ClearableInput = forwardRef<HTMLInputElement, ClearableInputProps>(({ onClear, className = "", ...props }, ref) => {
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        className={`w-full ${className} ${props.value && !props.readOnly && !props.disabled ? 'pr-8' : ''}`}
        {...props}
      />
      {props.value && !props.readOnly && !props.disabled && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 bg-transparent border-0 cursor-pointer z-10 transition-colors"
          tabIndex={-1}
          title="Limpar campo"
        >
          <Eraser size={14} />
        </button>
      )}
    </div>
  );
});
ClearableInput.displayName = "ClearableInput";

interface RegistersViewProps {
  properties: Property[];
  onAddProperty: (prop: Property) => void;
  onUpdateProperties: (props: Property[]) => void;
  onEditProperty: (prop: Property) => void;
  onDeleteProperty: (id: string) => void;
  allDocuments: Document[];
  onAddDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  employees: Employee[];
  onAddEmployee: (emp: Employee) => void;
  tags: PropertyTag[];
  onAddTag: (tag: PropertyTag) => void;
  onDeleteTag: (id: string) => void;
  owners: Owner[];
  onAddOwner: (owner: Owner) => void;
  onEditOwner: (owner: Owner) => void;
  onDeleteOwner: (id: string) => void;
  indicesDatabase: MonthlyIndexData[];
  onUpdateIndicesDatabase: (data: MonthlyIndexData[]) => void;
  onForceUpdateIndices: () => void;
  isUpdatingIndices: boolean;
  aiConfigs: AIConfig[];
  onAddAIConfig: (config: AIConfig) => void;
  onDeleteAIConfig: (id: string) => void;
  onSetActiveAIConfig: (id: string) => void;
  cloudAccounts: CloudAccount[];
  onAddCloudAccount: (account: CloudAccount) => void;
  onDeleteCloudAccount: (id: string) => void;
  activeAIConfig?: AIConfig;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  logs?: LogEntry[];
  trash?: TrashItem[];
  onRestoreFromTrash?: (id: string) => void;
}

const RegistersView: React.FC<RegistersViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabType>('Assets');

  // Owners Form State
  const [newOwner, setNewOwner] = useState<Partial<Owner>>({});
  const [ownerModalTab, setOwnerModalTab] = useState<OwnerModalTab>('Data');
  const [addressForm, setAddressForm] = useState<AddressComponents>({
    cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: ''
  });
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState<string>('');
  
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  
  const [cnaeInput, setCnaeInput] = useState('');
  const [allCnaes, setAllCnaes] = useState<{id: string, descricao: string}[]>([]);
  const [showCnaeDropdown, setShowCnaeDropdown] = useState(false);

  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false);

  const [tempDocs, setTempDocs] = useState<Document[]>([]);
  const ownerPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v2/cnae/classes').then(r => r.json()).then(data => setAllCnaes(data));
  }, []);

  useEffect(() => {
    if (addressForm.uf) {
      setIsLoadingCities(true);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${addressForm.uf}/municipios`)
        .then(r => r.json()).then(data => setAvailableCities(data.map((c: any) => c.nome)))
        .finally(() => setIsLoadingCities(false));
    }
  }, [addressForm.uf]);

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = formatDocumentMask(e.target.value); setNewOwner({ ...newOwner, document: val }); };
  const handleDocumentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchCNPJ(e); } };
  
  const handleFetchCNPJ = async (e?: any) => {
    e?.preventDefault();
    if (!newOwner.document) return;
    const doc = newOwner.document.replace(/\D/g, '');
    if (doc.length !== 14) { alert("CNPJ inválido (deve ter 14 dígitos)"); return; }
    setIsFetchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${doc}`);
      if (!res.ok) throw new Error("Erro ao buscar CNPJ");
      const data = await res.json();
      setNewOwner(prev => ({
        ...prev,
        name: data.razao_social || data.nome_fantasia,
        email: data.email,
        phone: data.ddd_telefone_1,
        address: `${data.logradouro}, ${data.numero} ${data.complemento} - ${data.bairro}, ${data.municipio}/${data.uf}`,
        cnaes: data.cnaes_secundarios?.map((c: any) => ({ code: c.codigo, text: c.descricao, isPrimary: false })) || []
      }));
      if (data.cnae_fiscal_descricao) {
          setNewOwner(prev => ({
              ...prev,
              cnaes: [{ code: String(data.cnae_fiscal), text: data.cnae_fiscal_descricao, isPrimary: true }, ...(prev.cnaes || [])]
          }));
      }
      setAddressForm({
          cep: formatCEP(data.cep),
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          municipio: data.municipio,
          uf: data.uf,
          semNumero: false
      });
    } catch (e) { alert("Não foi possível buscar dados do CNPJ."); } finally { setIsFetchingCnpj(false); }
  };

  const handleCEPBlur = async () => {
    const cep = addressForm.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (res.ok) {
          const data = await res.json();
          setAddressForm(prev => ({ ...prev, logradouro: data.street, bairro: data.neighborhood, municipio: data.city, uf: data.state }));
        }
      } catch (e) { console.error("CEP Error", e); }
    }
  };

  const docsToShow = isEditingOwner && newOwner.id 
      ? props.allDocuments.filter(d => d.relatedOwnerId === newOwner.id) 
      : tempDocs;

  const handleOpenEditOwner = (owner: Owner) => { setNewOwner({...owner}); setIsEditingOwner(true); setOwnerPhotoPreview(owner.photoUrl || ''); setTempDocs([]); setAddressForm({ cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: '' }); if(owner.address) { const parts = owner.address.split(','); if(parts.length > 0) setAddressForm(prev => ({ ...prev, logradouro: parts[0] })); } setShowOwnerModal(true); };

  const handleSaveOwner = (e: React.FormEvent) => {
      e.preventDefault(); if (!newOwner.name) return;
      const ownerId = newOwner.id || getNextId('Owner');
      const ownerToSave: Owner = { ...newOwner as Owner, id: ownerId, photoUrl: ownerPhotoPreview, address: `${addressForm.logradouro}, ${addressForm.numero} ${addressForm.complemento} - ${addressForm.bairro}, ${addressForm.municipio}/${addressForm.uf}` };
      if (isEditingOwner) props.onEditOwner(ownerToSave); else { props.onAddOwner(ownerToSave); tempDocs.forEach(doc => props.onAddDocument({ ...doc, relatedOwnerId: ownerId })); }
      setShowOwnerModal(false); setNewOwner({}); setTempDocs([]); setOwnerPhotoPreview('');
  };

  const handleVaultAddDoc = (doc: Document) => {
      if (isEditingOwner && newOwner.id) {
          props.onAddDocument({ ...doc, relatedOwnerId: newOwner.id });
      } else {
          setTempDocs(prev => [...prev, doc]);
      }
  };

  const handleVaultDeleteDoc = (id: string) => {
      if (isEditingOwner) {
          props.onDeleteDocument(id);
      } else {
          setTempDocs(prev => prev.filter(d => d.id !== id));
      }
  };

  const handleVaultUpdateDoc = (doc: Document) => {
      if (isEditingOwner) {
          props.onDeleteDocument(doc.id);
          props.onAddDocument(doc);
      } else {
          setTempDocs(prev => prev.map(d => d.id === doc.id ? doc : d));
      }
  };

  // Handle data filling from AI analysis
  const handleAiDataMerge = (result: AIAnalysisResult) => {
      if (result.extractedOwnerData) {
          setNewOwner(prev => ({
              ...prev,
              name: prev.name || result.extractedOwnerData?.name || prev.name,
              document: prev.document || result.extractedOwnerData?.document || prev.document,
              email: prev.email || result.extractedOwnerData?.email || prev.email,
              phone: prev.phone || result.extractedOwnerData?.phone || prev.phone,
              profession: prev.profession || result.extractedOwnerData?.profession || prev.profession,
              rg: prev.rg || result.extractedOwnerData?.rg || prev.rg,
              municipalRegistration: prev.municipalRegistration || result.extractedOwnerData?.municipalRegistration || prev.municipalRegistration
          }));
          alert("Dados do proprietário preenchidos automaticamente com base no documento analisado. Verifique a aba 'Dados Cadastrais'.");
      }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gestão</h3></div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            <button onClick={() => setActiveTab('Assets')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'Assets' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Building2 size={16}/> Imóveis</button>
            <button onClick={() => setActiveTab('Owners')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'Owners' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><User size={16}/> Proprietários</button>
            <button onClick={() => setActiveTab('Team')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'Team' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={16}/> Equipe</button>
            <button onClick={() => setActiveTab('Tags')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'Tags' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Tag size={16}/> Etiquetas</button>
            <div className="pt-4 pb-2 px-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sistema</h3></div>
            <button onClick={() => setActiveTab('Indices')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'Indices' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Database size={16}/> Índices</button>
            <button onClick={() => setActiveTab('API')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'API' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Key size={16}/> Chaves API</button>
            <button onClick={() => setActiveTab('Cloud')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'Cloud' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Cloud size={16}/> Nuvens</button>
            <button onClick={() => setActiveTab('Users')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'Users' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><ShieldCheck size={16}/> Usuário</button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {activeTab === 'Assets' && <AssetManager {...props} />}
        {activeTab === 'Team' && <TeamManager employees={props.employees} onAddEmployee={props.onAddEmployee} />}
        {activeTab === 'Tags' && <TagManagerView tags={props.tags} onAddTag={props.onAddTag} onDeleteTag={props.onDeleteTag} />}
        {(activeTab === 'Indices' || activeTab === 'API' || activeTab === 'Cloud' || activeTab === 'Users') && <SettingsView {...props} initialTab={activeTab === 'Users' ? 'Profile' : activeTab === 'API' ? 'AI' : activeTab as any} hideSidebar={true} />}

        {/* OWNERS (FIXED) */}
        {activeTab === 'Owners' && (
            <div className="p-6">
                <div className="flex justify-between items-center mb-6"><div><h2 className="text-3xl font-bold text-slate-800">Proprietários</h2><p className="text-slate-500">Gestão de Pessoas Físicas e Jurídicas</p></div><button onClick={() => { setNewOwner({}); setIsEditingOwner(false); setTempDocs([]); setOwnerPhotoPreview(''); setShowOwnerModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"><Plus size={18}/> Novo Proprietário</button></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{props.owners.map(owner => (<div key={owner.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow relative group"><div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenEditOwner(owner)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-full shadow-sm border border-slate-100"><Pencil size={14}/></button><button onClick={() => { if(confirm("Excluir proprietário?")) props.onDeleteOwner(owner.id); }} className="p-1.5 text-slate-400 hover:text-red-600 bg-white rounded-full shadow-sm border border-slate-100"><Trash2 size={14}/></button></div><div className="flex items-center gap-4 mb-4"><div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">{owner.photoUrl ? <img src={owner.photoUrl} alt={owner.name} className="w-full h-full object-cover"/> : <User size={32} className="text-slate-300"/>}</div><div><h3 className="font-bold text-slate-800 line-clamp-1" title={owner.name}>{owner.name}</h3><p className="text-xs text-slate-500">{owner.profession || 'Profissão não informada'}</p><div className="flex gap-2 mt-1"><span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{owner.document || 'Sem Doc'}</span></div></div></div><div className="space-y-2 text-xs text-slate-600"><p className="flex items-center gap-2"><MapPin size={12} className="text-slate-400"/> <span className="truncate">{owner.address || 'Endereço não informado'}</span></p><p className="flex items-center gap-2"><Briefcase size={12} className="text-slate-400"/> <span>{props.properties.filter(p => p.ownerId === owner.id).length} Imóveis vinculados</span></p></div></div>))}
                {props.owners.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300"><User size={48} className="mx-auto mb-3 opacity-20"/><p>Nenhum proprietário cadastrado.</p></div>}</div>
                
                {/* Owner Modal */}
                {showOwnerModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className={`bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95`}>
                            {/* ... Header and Tab Nav ... */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0"><h3 className="text-xl font-bold text-slate-800">{isEditingOwner ? `Editar: ${newOwner.name}` : 'Novo Proprietário'}</h3><button onClick={() => setShowOwnerModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={24}/></button></div>
                            <div className="flex border-b border-slate-200 px-6 shrink-0"><button onClick={() => setOwnerModalTab('Data')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ownerModalTab === 'Data' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}><User size={16}/> Dados Cadastrais</button><button onClick={() => setOwnerModalTab('Documents')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ownerModalTab === 'Documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}><FileText size={16}/> Documentos ({docsToShow.length})</button></div>

                            <div className="flex flex-1 overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                                    {ownerModalTab === 'Data' ? (
                                        <form id="ownerForm" className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                                            {/* Photo Upload */}
                                            <div className="flex justify-center mb-6">
                                                <div className="relative group cursor-pointer" onClick={() => ownerPhotoInputRef.current?.click()}>
                                                    <div className="w-24 h-24 rounded-full bg-slate-200 border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                                                        {ownerPhotoPreview ? <img src={ownerPhotoPreview} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-400" />}
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={24}/></div>
                                                    <input type="file" ref={ownerPhotoInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => setOwnerPhotoPreview(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Informações Pessoais / Jurídicas</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF / CNPJ</label>
                                                        <div className="relative">
                                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" placeholder="000.000.000-00" value={newOwner.document || ''} onChange={handleDocumentChange} onKeyDown={handleDocumentKeyDown}/>
                                                            <button type="button" onClick={handleFetchCNPJ} disabled={isFetchingCnpj} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"><Search size={16}/></button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo / Razão Social</label>
                                                        <ClearableInput className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={newOwner.name || ''} onChange={e => setNewOwner({...newOwner, name: e.target.value})} onClear={() => setNewOwner({...newOwner, name: ''})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
                                                        <ClearableInput type="email" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={newOwner.email || ''} onChange={e => setNewOwner({...newOwner, email: e.target.value})} onClear={() => setNewOwner({...newOwner, email: ''})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label>
                                                        <ClearableInput type="tel" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={newOwner.phone || ''} onChange={e => setNewOwner({...newOwner, phone: formatPhone(e.target.value)})} onClear={() => setNewOwner({...newOwner, phone: ''})} />
                                                    </div>
                                                </div>
                                                
                                                {/* Extended Fields for PJ vs PF */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RG / Inscrição Estadual</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={newOwner.rg || ''} onChange={e => setNewOwner({...newOwner, rg: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inscrição Municipal</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={newOwner.municipalRegistration || ''} onChange={e => setNewOwner({...newOwner, municipalRegistration: e.target.value})} />
                                                    </div>
                                                     <div className="relative">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Profissão / Ramo</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={newOwner.profession || ''} onChange={e => setNewOwner({...newOwner, profession: e.target.value})} onFocus={() => setShowProfessionDropdown(true)} onBlur={() => setTimeout(() => setShowProfessionDropdown(false), 200)} />
                                                        {showProfessionDropdown && (
                                                            <div className="absolute z-10 w-full bg-white border border-slate-200 shadow-lg max-h-40 overflow-y-auto rounded-b-lg mt-1">
                                                                {COMMON_PROFESSIONS.filter(p => p.toLowerCase().includes((newOwner.profession || '').toLowerCase())).map(p => (
                                                                    <div key={p} className="p-2 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => setNewOwner({...newOwner, profession: p})}>{p}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* CNAE Section for PJ */}
                                                <div className="border-t border-slate-100 pt-4 mt-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CNAEs (Atividades Econômicas)</label>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {(newOwner.cnaes || []).map((cnae, i) => (
                                                            <span key={i} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${cnae.isPrimary ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                                {cnae.code} - {cnae.text}
                                                                <button type="button" onClick={() => setNewOwner(prev => ({...prev, cnaes: prev.cnaes?.filter((_, idx) => idx !== i)}))} className="text-slate-400 hover:text-red-500 ml-1"><X size={12}/></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="relative">
                                                        <input type="text" placeholder="Adicionar CNAE (Código ou Descrição)..." className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={cnaeInput} onChange={e => { setCnaeInput(e.target.value); setShowCnaeDropdown(true); }} />
                                                        {showCnaeDropdown && cnaeInput && (
                                                            <div className="absolute z-10 w-full bg-white border border-slate-200 shadow-lg max-h-48 overflow-y-auto rounded-b-lg mt-1">
                                                                {allCnaes.filter(c => c.id.includes(cnaeInput) || c.descricao.toLowerCase().includes(cnaeInput.toLowerCase())).slice(0, 20).map(c => (
                                                                    <div key={c.id} className="p-2 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => { setNewOwner(prev => ({...prev, cnaes: [...(prev.cnaes || []), { code: c.id, text: c.descricao, isPrimary: false }]})); setCnaeInput(''); setShowCnaeDropdown(false); }}>
                                                                        <span className="font-bold">{c.id}</span> - {c.descricao}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Endereço</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                     <div className="md:col-span-1">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" placeholder="00000-000" value={addressForm.cep} onChange={(e) => setAddressForm({...addressForm, cep: formatCEP(e.target.value)})} onBlur={handleCEPBlur} />
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Logradouro</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={addressForm.logradouro} onChange={(e) => setAddressForm({...addressForm, logradouro: e.target.value})} />
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número</label>
                                                        <div className="flex items-center gap-2">
                                                             <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={addressForm.numero} onChange={(e) => setAddressForm({...addressForm, numero: e.target.value})} disabled={addressForm.semNumero} />
                                                             <input type="checkbox" checked={addressForm.semNumero} onChange={(e) => setAddressForm({...addressForm, semNumero: e.target.checked, numero: e.target.checked ? 'S/N' : ''})} /> <span className="text-xs">S/N</span>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Complemento</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={addressForm.complemento} onChange={(e) => setAddressForm({...addressForm, complemento: e.target.value})} />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={addressForm.bairro} onChange={(e) => setAddressForm({...addressForm, bairro: e.target.value})} />
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado (UF)</label>
                                                        <select className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500 bg-white" value={addressForm.uf} onChange={(e) => setAddressForm({...addressForm, uf: e.target.value})}>
                                                            <option value="">Selecione</option>
                                                            {BRAZIL_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-2 relative">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={addressForm.municipio} onChange={(e) => { setAddressForm({...addressForm, municipio: e.target.value}); setShowCityDropdown(true); }} disabled={!addressForm.uf} />
                                                        {isLoadingCities && <Loader2 className="absolute right-2 top-8 animate-spin text-slate-400" size={14} />}
                                                        {showCityDropdown && availableCities.length > 0 && (
                                                            <div className="absolute z-10 w-full bg-white border border-slate-200 shadow-lg max-h-40 overflow-y-auto rounded-b-lg mt-1">
                                                                {availableCities.filter(c => c.toLowerCase().includes(addressForm.municipio.toLowerCase())).map(c => (
                                                                    <div key={c} className="p-2 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => { setAddressForm({...addressForm, municipio: c}); setShowCityDropdown(false); }}>{c}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="h-full flex flex-col">
                                            <DocumentVault 
                                                documents={docsToShow}
                                                properties={props.properties}
                                                owners={props.owners}
                                                onAddDocument={handleVaultAddDoc}
                                                onDeleteDocument={handleVaultDeleteDoc}
                                                onUpdateDocument={handleVaultUpdateDoc}
                                                aiConfig={props.activeAIConfig}
                                                isEmbedded={true}
                                                preSelectedOwnerId={isEditingOwner ? newOwner.id : undefined}
                                                customTitle="Documentos do Proprietário"
                                                alwaysShowUpload={true}
                                                analysisContext="OwnerCreation"
                                                onAnalysisComplete={handleAiDataMerge}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-white rounded-b-xl flex justify-end gap-3 shrink-0"><button onClick={() => setShowOwnerModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button><button onClick={handleSaveOwner} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2"><Save size={18}/> {isEditingOwner ? 'Salvar Alterações' : 'Cadastrar Proprietário'}</button></div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default RegistersView;