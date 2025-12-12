import React, { useState, useRef, useEffect } from 'react';
import { Property, Document, Employee, PropertyTag, AIConfig, MonthlyIndexData, UserProfile, Owner, CloudAccount, CloudProvider, AIProvider } from '../types';
import AssetManager from './AssetManager';
import TeamManager from './TeamManager';
import TagManagerView from './TagManagerView';
import { analyzeDocumentContent } from '../services/geminiService';
import { Database, Users, Building2, Tag, Key, User, Plus, Trash2, Save, Cpu, ShieldCheck, RefreshCw, Loader2, Search, MapPin, FileBadge, ExternalLink, Info, CheckSquare, X, Pencil, Upload, FileText, Eye, Cloud, FolderOpen, Paperclip, Download, AlertTriangle, Calendar, DollarSign, Sparkles, ChevronDown, ChevronUp, Lock, CloudUpload, Mail, Eraser, CheckCircle } from 'lucide-react';

// --- Helpers ---
function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let soma = 0;
  let resto;
  for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

const formatCEP = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length > 5) {
    return v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2-$3');
  } else if (v.length > 2) {
    return v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  }
  return v;
};

// --- Constants ---
const COMMON_CNAES = [
  { code: '6810-2/01', desc: 'Compra e venda de imóveis próprios' },
  { code: '6810-2/02', desc: 'Aluguel de imóveis próprios' },
  { code: '6821-8/01', desc: 'Corretagem na compra e venda e avaliação de imóveis' },
  { code: '6822-6/00', desc: 'Gestão e administração da propriedade imobiliária' },
  { code: '6462-0/00', desc: 'Holdings de instituições não-financeiras' },
  { code: '7020-4/00', desc: 'Atividades de consultoria em gestão empresarial' },
  { code: '4110-7/00', desc: 'Incorporação de empreendimentos imobiliários' },
  { code: '4120-4/00', desc: 'Construção de edifícios' },
];

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const EMAIL_PROVIDERS = ['gmail.com', 'hotmail.com', 'hotmail.com.br', 'outlook.com', 'yahoo.com.br'];

// --- Types ---
interface AddressForm {
  cep: string;
  logradouro: string;
  numero: string;
  semNumero: boolean;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
}

interface PendingFile {
  name: string;
  content: string;
  fileObject: File;
}

interface CnaeEntry {
    code: string;
    description: string;
    type: 'Principal' | 'Secundário' | 'Manual';
}

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
}

type TabType = 'Assets' | 'Owners' | 'Team' | 'Tags' | 'Indices' | 'API' | 'Cloud' | 'Users';
type OwnerModalTab = 'Data' | 'Documents';

// --- Reusable Components ---

interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
}

const ClearableInput: React.FC<ClearableInputProps> = ({ onClear, className = "", ...props }) => {
  return (
    <div className="relative w-full">
      <input
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
};

interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = "Selecione...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const selected = options.find(o => o.value === value);
    if (selected) setSearchTerm(selected.label);
    else if (!value) setSearchTerm('');
  }, [value, options]);

  const filtered = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative w-full">
      <div className="relative">
         <input
            type="text"
            className={`w-full ${className} pr-8 cursor-pointer border border-slate-300 rounded p-2 outline-none focus:border-indigo-500`}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
            onFocus={() => { setIsOpen(true); if(!value) setSearchTerm(''); }}
            readOnly={false}
         />
         <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 items-center">
            {value && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setSearchTerm(''); }} className="text-slate-400 hover:text-slate-600 p-1">
                    <Eraser size={14} />
                </button>
            )}
            <ChevronDown size={14} className="text-slate-400" />
         </div>
      </div>
      
      {isOpen && (
        <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
            <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {filtered.map(opt => (
                <li key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm ${opt.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                >
                    {opt.label}
                </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-2 text-slate-400 text-sm italic">Sem resultados</li>}
            </ul>
        </>
      )}
    </div>
  );
};

// --- Main Component ---

const RegistersView: React.FC<RegistersViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabType>('Assets');

  // --- States ---
  // Owners Form
  const [newOwner, setNewOwner] = useState<Partial<Owner>>({});
  const [ownerModalTab, setOwnerModalTab] = useState<OwnerModalTab>('Data');
  const [addressForm, setAddressForm] = useState<AddressForm>({
    cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: ''
  });
  const [naturalityForm, setNaturalityForm] = useState<{uf: string, city: string}>({ uf: '', city: '' });

  const [cnaeList, setCnaeList] = useState<CnaeEntry[]>([]);
  const [showCnaeDropdown, setShowCnaeDropdown] = useState(false);
  
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [isFetchingTaxId, setIsFetchingTaxId] = useState(false);
  const [fetchSource, setFetchSource] = useState<'API' | null>(null);
  const [isEditingOwner, setIsEditingOwner] = useState(false);

  // Address - Cities State
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Naturality - Cities State
  const [availableNaturalityCities, setAvailableNaturalityCities] = useState<string[]>([]);
  const [isLoadingNaturality, setIsLoadingNaturality] = useState(false);
  const [showNaturalityDropdown, setShowNaturalityDropdown] = useState(false);

  // Email State
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);

  // Owner Documents
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Form
  const [newCloudProvider, setNewCloudProvider] = useState<CloudProvider>('Google Drive');
  const [newCloudEmail, setNewCloudEmail] = useState('');

  // API Config Form
  const [newConfigLabel, setNewConfigLabel] = useState('');
  const [newConfigProvider, setNewConfigProvider] = useState<AIProvider>('Google Gemini');
  const [newConfigKey, setNewConfigKey] = useState('');
  const [newConfigModel, setNewConfigModel] = useState('gemini-2.5-flash');
  const [isCustomModel, setIsCustomModel] = useState(false);

  // User Profile Form
  const [profileForm, setProfileForm] = useState(props.userProfile);

  // --- Effects & Helpers ---
  useEffect(() => { if (addressForm.uf && addressForm.uf.length === 2) { const fetchCities = async () => { setIsLoadingCities(true); try { const response = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${addressForm.uf}`); if (response.ok) { const data = await response.json(); const cityNames = data.map((c: any) => c.nome); setAvailableCities(cityNames); } } catch (e) { console.error("Failed to fetch cities", e); setAvailableCities([]); } finally { setIsLoadingCities(false); } }; fetchCities(); } else { setAvailableCities([]); } }, [addressForm.uf]);
  useEffect(() => { if (naturalityForm.uf && naturalityForm.uf.length === 2) { const fetchCities = async () => { setIsLoadingNaturality(true); try { const response = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${naturalityForm.uf}`); if (response.ok) { const data = await response.json(); const cityNames = data.map((c: any) => c.nome); setAvailableNaturalityCities(cityNames); } } catch (e) { console.error("Failed to fetch naturality cities", e); setAvailableNaturalityCities([]); } finally { setIsLoadingNaturality(false); } }; fetchCities(); } else { setAvailableNaturalityCities([]); } }, [naturalityForm.uf]);
  const formatDocumentMask = (value: string) => { const v = value.replace(/\D/g, ''); if (v.length <= 11) { return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'); } else { return v.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'); } };
  const formatPhoneMask = (value: string) => { let v = value.replace(/\D/g, ""); if (v.length > 11) v = v.substring(0, 11); if (v.length > 10) { return v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3"); } else if (v.length > 5) { return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3"); } else if (v.length > 2) { return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2"); } return v; };
  const isPJ = (document?: string) => { const clean = document?.replace(/\D/g, '') || ''; return clean.length > 11; };
  const handleDeleteWithConfirm = (deleteFn: (id: string) => void, id: string, name: string, typeLabel: string = 'item') => { if (confirm(`Tem certeza que deseja excluir o ${typeLabel} "${name}"? Esta ação não pode ser desfeita.`)) { deleteFn(id); } };
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = formatDocumentMask(e.target.value); setNewOwner({ ...newOwner, document: val }); };
  
  const handleFetchTaxData = async () => { 
      const doc = newOwner.document?.replace(/\D/g, '') || ''; 
      setFetchSource(null); 
      if (doc.length !== 11 && doc.length !== 14) { 
          alert("Por favor, insira um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para buscar."); 
          return; 
      } 
      if (doc.length === 11) { 
          if (!validateCPF(doc)) { 
              alert("CPF inválido. Por favor verifique os dígitos digitados."); 
              return; 
          } 
          return; 
      } 
      setIsFetchingTaxId(true); 
      try { 
          if (doc.length === 14) { 
              const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${doc}`); 
              if (!response.ok) throw new Error("CNPJ não encontrado na base da Receita."); 
              const data = await response.json(); 
              
              let legalRep = '';
              if (data.qsa && Array.isArray(data.qsa) && data.qsa.length > 0) {
                  legalRep = data.qsa[0].nome_socio;
              }

              setNewOwner(prev => ({ 
                  ...prev, 
                  name: data.razao_social || data.nome_fantasia, 
                  email: data.email || prev.email, 
                  phone: data.ddd_telefone_1 ? formatPhoneMask(`${data.ddd_telefone_1}${data.telefone_1}`) : prev.phone, 
                  naturality: 'Brasileira', 
                  rg: prev.rg || '', 
                  municipalRegistration: prev.municipalRegistration || '',
                  legalRepresentative: legalRep || prev.legalRepresentative
              })); 
              
              let initialAddress = { 
                  cep: data.cep ? formatCEP(data.cep) : '', 
                  logradouro: data.logradouro || '', 
                  numero: data.numero === 'S/N' ? '' : data.numero || '', 
                  semNumero: data.numero === 'S/N', 
                  complemento: data.complemento || '', 
                  bairro: data.bairro || '', 
                  municipio: data.municipio || '', 
                  uf: data.uf || '' 
              }; 
              setAddressForm(initialAddress); 
              
              const atividades: CnaeEntry[] = []; 
              if (data.cnae_fiscal && data.cnae_fiscal !== 0 && data.cnae_fiscal_descricao) { 
                  atividades.push({ code: String(data.cnae_fiscal), description: data.cnae_fiscal_descricao, type: 'Principal' }); 
              } 
              if (data.cnaes_secundarios) { 
                  data.cnaes_secundarios.forEach((c: any) => { 
                      if (c.codigo && c.codigo !== 0 && c.descricao && c.descricao !== 'Não informado') { 
                          atividades.push({ code: String(c.codigo), description: c.descricao, type: 'Secundário' }); 
                      } 
                  }); 
              } 
              setCnaeList(atividades); 
              setFetchSource('API'); 
          } 
      } catch (error) { 
          console.error(error); 
          alert("Erro ao buscar dados. O serviço pode estar indisponível ou o documento não existe."); 
      } finally { 
          setIsFetchingTaxId(false); 
      } 
  };

  const handleDocumentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { 
      if (e.key === 'Enter') { 
          e.preventDefault(); 
          handleFetchTaxData(); 
      } 
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = formatPhoneMask(e.target.value); setNewOwner({ ...newOwner, phone: val }); };
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; setNewOwner({ ...newOwner, email: val }); if (val.includes('@')) { const [user, domain] = val.split('@'); if (domain !== undefined) { const filtered = EMAIL_PROVIDERS.filter(p => p.startsWith(domain)); setEmailSuggestions(filtered); setShowEmailDropdown(filtered.length > 0); } } else { setShowEmailDropdown(false); } };
  const selectEmailProvider = (provider: string) => { const [user] = (newOwner.email || '').split('@'); setNewOwner({ ...newOwner, email: `${user}@${provider}` }); setShowEmailDropdown(false); };
  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = formatCEP(e.target.value); setAddressForm({...addressForm, cep: val}); };
  
  const handleFetchCEP = async () => { const cep = addressForm.cep.replace(/\D/g, ''); if (cep.length !== 8) return; try { const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`); if (response.ok) { const data = await response.json(); setAddressForm(prev => ({ ...prev, logradouro: data.street || prev.logradouro, bairro: data.neighborhood || prev.bairro, municipio: data.city || prev.municipio, uf: data.state || prev.uf })); } } catch (e) { console.error("Erro ao buscar CEP", e); } };
  
  const handleCEPKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleFetchCEP();
      }
  };

  const handleAddCnae = (code: string, desc: string) => { if (!cnaeList.find(c => c.code === code)) { setCnaeList([...cnaeList, { code, description: desc, type: 'Manual' }]); setShowCnaeDropdown(false); } };
  const handleRemoveCnae = (code: string) => { setCnaeList(cnaeList.filter(c => c.code !== code)); };
  
  const handleSaveOwner = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (newOwner.name && newOwner.document) { 
          const fullAddress = `${addressForm.logradouro}, ${addressForm.semNumero ? 'S/N' : addressForm.numero}${addressForm.complemento ? ' - ' + addressForm.complemento : ''}, ${addressForm.bairro}, ${addressForm.municipio} - ${addressForm.uf}, CEP: ${addressForm.cep}`; 
          const professionFinal = isPJ(newOwner.document) ? cnaeList.map(c => `${c.code} - ${c.description} (${c.type})`).join('; ') : newOwner.profession; 
          const finalNaturality = !isPJ(newOwner.document) && naturalityForm.city ? (naturalityForm.uf ? `${naturalityForm.city} - ${naturalityForm.uf}` : naturalityForm.city) : newOwner.naturality; 
          const ownerData: Owner = { 
              id: newOwner.id || Date.now().toString(), 
              name: newOwner.name, 
              document: newOwner.document, 
              email: newOwner.email, 
              phone: newOwner.phone, 
              profession: professionFinal, 
              naturality: finalNaturality, 
              maritalStatus: newOwner.maritalStatus, 
              rg: newOwner.rg, 
              municipalRegistration: newOwner.municipalRegistration, 
              address: fullAddress, 
              legalRepresentative: newOwner.legalRepresentative 
          }; 
          
          if (isEditingOwner) { 
              props.onEditOwner(ownerData); 
          } else { 
              props.onAddOwner(ownerData); 
          } 
          
          setShowOwnerModal(false); 
          setNewOwner({}); 
          setAddressForm({ cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: '' }); 
          setNaturalityForm({ uf: '', city: '' }); 
          setCnaeList([]); 
          setPendingFiles([]); 
          setIsEditingOwner(false); 
      } else {
          // If trying to save but missing required fields
          alert("Por favor, preencha o Nome e CPF/CNPJ do proprietário na aba 'Dados Cadastrais'.");
          setOwnerModalTab('Data'); // Switch to data tab so user can fix it
      }
  };

  const handleOpenEditOwner = (owner: Owner) => { setNewOwner(owner); const parts = owner.address?.split(', ') || []; const cepMatch = owner.address?.match(/CEP: (\d{2}\.\d{3}-\d{3}|\d{5}-\d{3})/); const cep = cepMatch ? cepMatch[1] : ''; setAddressForm({ logradouro: parts[0] || '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: '', cep: cep }); if (!isPJ(owner.document)) { const natParts = owner.naturality?.split(' - ') || []; if (natParts.length === 2 && natParts[1].length === 2) { setNaturalityForm({ city: natParts[0], uf: natParts[1] }); } else { setNaturalityForm({ city: owner.naturality || '', uf: '' }); } } if (isPJ(owner.document)) { if (owner.profession) { const parsedCnaes: CnaeEntry[] = owner.profession.split('; ').map(s => { const match = s.match(/^(.*?) - (.*?) \((.*?)\)$/); if (match) { return { code: match[1], description: match[2], type: match[3] as any }; } return { code: '?', description: s, type: 'Manual' }; }); setCnaeList(parsedCnaes); } else { setCnaeList([]); } } setIsEditingOwner(true); setShowOwnerModal(true); };
  const processFiles = (fileList: FileList | File[]) => { const files = Array.from(fileList); const newPendingFiles: PendingFile[] = []; files.forEach(file => { const reader = new FileReader(); reader.onload = (e) => { newPendingFiles.push({ name: file.name, content: e.target?.result as string || '', fileObject: file }); if(newPendingFiles.length === files.length) { setPendingFiles(prev => [...prev, ...newPendingFiles]); } }; if (file.type.includes('text') || file.type.includes('json')) { reader.readAsText(file); } else { reader.onload({target: {result: `[Binary: ${file.type}]`}} as any); } }); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { processFiles(e.dataTransfer.files); } };
  const handlePaste = (e: React.ClipboardEvent) => { if (e.clipboardData.files && e.clipboardData.files.length > 0) { processFiles(e.clipboardData.files); } };
  const handleUploadAction = async (process: boolean) => { if (pendingFiles.length === 0) return; setIsAnalyzingDoc(true); const tempOwnerId = newOwner.id || Date.now().toString(); if(!newOwner.id) setNewOwner(prev => ({...prev, id: tempOwnerId})); try { for (const pFile of pendingFiles) { const newDoc: Document = { id: Date.now().toString() + Math.random().toString().slice(2,5), name: pFile.name, category: 'Personal', uploadDate: new Date().toLocaleDateString('pt-BR'), summary: process ? 'Extração de dados automática.' : 'Documento anexado manualmente.', relatedOwnerId: tempOwnerId, contentRaw: pFile.content, aiAnalysis: { riskLevel: 'Low', keyDates: [], monetaryValues: [] } }; props.onAddDocument(newDoc); } if (process && props.activeAIConfig) { const combinedContent = pendingFiles.map(f => `--- ${f.name} ---\n${f.content}`).join('\n\n'); const result = await analyzeDocumentContent(combinedContent, props.activeAIConfig.apiKey, props.activeAIConfig.modelName, 'OwnerCreation'); if (result.extractedOwnerData) { const extractedData = result.extractedOwnerData; setNewOwner(prev => ({ ...prev, ...extractedData })); if(extractedData.address) setAddressForm(prev => ({...prev, logradouro: extractedData.address || ''})); alert("Dados extraídos e formulário preenchido!"); } } else if (process && !props.activeAIConfig) { alert("Configure uma chave de API para usar o processamento inteligente."); } else { alert("Documentos anexados com sucesso."); } } catch(e) { console.error(e); alert("Erro ao processar arquivos."); } finally { setIsAnalyzingDoc(false); setPendingFiles([]); } };
  const getOwnerDocuments = () => { if (newOwner.id) { return props.allDocuments.filter(d => d.relatedOwnerId === newOwner.id); } return []; };
  
  // FIX: Added stopPropagation
  const handleDeleteOwnerDoc = (e: React.MouseEvent, docId: string, docName: string) => { 
      e.stopPropagation(); 
      if (confirm(`Tem certeza que deseja excluir o documento "${docName}"?`)) { 
          props.onDeleteDocument(docId); 
      } 
  };
  
  const handleAddKey = (e: React.FormEvent) => { e.preventDefault(); props.onAddAIConfig({ id: Date.now().toString(), label: newConfigLabel, provider: newConfigProvider, apiKey: newConfigKey, modelName: newConfigModel, isActive: props.aiConfigs.length === 0 }); setNewConfigLabel(''); setNewConfigKey(''); setNewConfigModel('gemini-2.5-flash'); setIsCustomModel(false); };
  const handleAddCloudAccount = (e: React.FormEvent) => { e.preventDefault(); if(newCloudEmail) { props.onAddCloudAccount({ id: Date.now().toString(), provider: newCloudProvider, accountName: newCloudEmail, isConnected: true, authDate: new Date().toLocaleDateString() }); setNewCloudEmail(''); }};
  const handleSaveProfile = (e: React.FormEvent) => { e.preventDefault(); props.onUpdateProfile(profileForm); alert('Perfil atualizado com sucesso!'); };

  // Helper para Download
  const handleDownload = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    if (!doc.contentRaw) {
      alert("O conteúdo deste arquivo não está disponível para download.");
      return;
    }

    try {
      const link = document.createElement('a');
      link.download = doc.name;
      
      if (doc.contentRaw.startsWith('data:')) {
         link.href = doc.contentRaw;
      } else {
         const blob = new Blob([doc.contentRaw], { type: 'text/plain' });
         link.href = URL.createObjectURL(blob);
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Erro ao iniciar download.");
    }
  };

  // FIX: Save button logic for both tabs to ensure Owner is saved even from Doc tab
  const handleMainSaveButton = async (e: React.MouseEvent) => {
      e.preventDefault();
      
      // If we are in documents tab and have pending files, upload them first
      if (ownerModalTab === 'Documents' && pendingFiles.length > 0) {
          await handleUploadAction(false);
      }
      
      // THEN trigger the main save logic which validates and saves the owner data
      handleSaveOwner(e as any);
  };

  const getSaveButtonText = () => {
      if (ownerModalTab === 'Documents') {
          if (pendingFiles.length === 0) return isEditingOwner ? 'Salvar Alterações' : 'Concluir Cadastro';
          return pendingFiles.length === 1 ? 'Salvar Documento & Concluir' : 'Salvar Documentos & Concluir';
      }
      return isEditingOwner ? 'Salvar Proprietário' : 'Salvar Proprietário';
  };

  const menuItems = [
    { id: 'Assets', label: 'Imóveis', icon: Building2 },
    { id: 'Owners', label: 'Proprietários', icon: User },
    { id: 'Team', label: 'Equipe', icon: Users },
    { id: 'Tags', label: 'Etiquetas', icon: Tag },
    { id: 'Indices', label: 'Base de Índices', icon: Database },
    { id: 'API', label: 'Chaves de API (IA)', icon: Key },
    { id: 'Cloud', label: 'Nuvem', icon: Cloud },
    { id: 'Users', label: 'Perfil Admin', icon: ShieldCheck },
  ];

  const docCount = getOwnerDocuments().length + pendingFiles.length;

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Sidebar */}
      <div className="w-full lg:w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">
          Cadastros Gerais
        </div>
        <div className="flex-1 overflow-y-auto py-2">
           {menuItems.map(item => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id as TabType)}
               className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                 activeTab === item.id 
                 ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600' 
                 : 'text-slate-600 hover:bg-slate-50'
               }`}
             >
               <item.icon size={18} />
               <span className="font-medium text-sm">{item.label}</span>
             </button>
           ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        
        {/* ASSETS */}
        {activeTab === 'Assets' && (
             <AssetManager 
               properties={props.properties} 
               onAddProperty={props.onAddProperty} 
               onUpdateProperties={props.onUpdateProperties}
               onEditProperty={props.onEditProperty}
               onDeleteProperty={(id) => props.onDeleteProperty(id)}
               allDocuments={props.allDocuments} 
               onAddDocument={props.onAddDocument}
               onDeleteDocument={(id) => props.onDeleteDocument(id)}
               tags={props.tags}
               onAddTag={props.onAddTag}
               onDeleteTag={props.onDeleteTag}
               owners={props.owners}
               onAddOwner={props.onAddOwner}
               aiConfig={props.activeAIConfig}
               indicesDatabase={props.indicesDatabase}
               onUpdateIndicesDatabase={props.onUpdateIndicesDatabase}
             />
        )}

        {/* TEAM */}
        {activeTab === 'Team' && (
           <TeamManager employees={props.employees} onAddEmployee={props.onAddEmployee} />
        )}

        {/* TAGS */}
        {activeTab === 'Tags' && (
           <TagManagerView tags={props.tags} onAddTag={props.onAddTag} onDeleteTag={(id) => props.onDeleteTag(id)} />
        )}

        {/* OWNERS logic omitted for brevity as it's not changed */}
        {activeTab === 'Owners' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">Proprietários</h2>
                <p className="text-slate-500">Gestão de Pessoas Físicas e Jurídicas.</p>
              </div>
              <button 
                onClick={() => {
                    setNewOwner({});
                    setAddressForm({ cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: '' });
                    setNaturalityForm({ uf: '', city: '' });
                    setCnaeList([]);
                    setIsEditingOwner(false);
                    setShowOwnerModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <Plus size={18} /> Novo Cadastro
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {props.owners.map(owner => {
                   const isCompany = isPJ(owner.document);
                   return (
                       <div key={owner.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col relative group hover:shadow-md transition-shadow">
                           <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 type="button" 
                                 onClick={() => handleOpenEditOwner(owner)} 
                                 className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                               >
                                 <Pencil size={18}/>
                               </button>
                               <button 
                                 type="button" 
                                 onClick={() => handleDeleteWithConfirm(props.onDeleteOwner, owner.id, owner.name, 'proprietário')} 
                                 className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                               >
                                 <Trash2 size={18}/>
                               </button>
                           </div>
                           
                           <div className="flex items-start gap-4 mb-4">
                               <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isCompany ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                   {isCompany ? <Building2 size={24}/> : <User size={24}/>}
                               </div>
                               <div>
                                   <h3 className="font-bold text-lg text-slate-800">{owner.name}</h3>
                                   <p className="text-sm text-slate-500 font-mono">{owner.document}</p>
                                   <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isCompany ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                       {isCompany ? 'Pessoa Jurídica' : 'Pessoa Física'}
                                   </span>
                               </div>
                           </div>
                           <div className="space-y-2 text-sm text-slate-600 mt-2">
                               {owner.email && <div className="flex items-center gap-2 truncate"><div className="w-4 shrink-0"><ExternalLink size={14}/></div> {owner.email}</div>}
                               {owner.phone && <div className="flex items-center gap-2 truncate"><div className="w-4 shrink-0"><Info size={14}/></div> {owner.phone}</div>}
                               {owner.address && <div className="flex items-start gap-2"><div className="w-4 shrink-0 mt-0.5"><MapPin size={14}/></div> <span className="flex-1 text-xs">{owner.address}</span></div>}
                               {owner.legalRepresentative && isCompany && <div className="flex items-center gap-2 text-xs bg-slate-100 p-1 rounded mt-2"><User size={12}/> <strong>Rep:</strong> {owner.legalRepresentative}</div>}
                           </div>
                       </div>
                   );
               })}
            </div>
            
            {showOwnerModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                             <div>
                               <h3 className="text-xl font-bold text-slate-800">{isEditingOwner ? 'Editar Proprietário' : 'Novo Proprietário'}</h3>
                               <p className="text-sm text-slate-500">Pessoa Física ou Jurídica</p>
                             </div>
                             <button type="button" onClick={() => setShowOwnerModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        </div>
                        
                        <div className="flex border-b border-slate-200 px-6">
                            <button type="button" onClick={() => setOwnerModalTab('Data')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${ownerModalTab === 'Data' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}>Dados Cadastrais</button>
                            <button type="button" onClick={() => setOwnerModalTab('Documents')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ownerModalTab === 'Documents' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}>Documentos <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">{docCount}</span></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {ownerModalTab === 'Data' && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    {/* SMART UPLOAD SECTION (ADDED) */}
                                    <div className="bg-indigo-50 border border-dashed border-indigo-200 rounded-lg p-4 mb-4">
                                        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && processFiles(e.target.files)} />
                                        
                                        {pendingFiles.length === 0 ? (
                                            <div 
                                                className="flex flex-col items-center justify-center cursor-pointer py-2 hover:bg-indigo-100/50 rounded transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                                onDragOver={handleDragOver}
                                                onDrop={handleDrop}
                                            >
                                                <div className="flex items-center gap-2 text-indigo-600 font-medium mb-1">
                                                    <CloudUpload size={20} />
                                                    <span>Carregamento Inteligente</span>
                                                </div>
                                                <p className="text-xs text-indigo-400 text-center max-w-xs">
                                                    Arraste ou clique para carregar RG, CNH, CNPJ ou Contrato Social.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <h5 className="text-xs font-bold text-indigo-700 uppercase">Arquivos Selecionados</h5>
                                                    <button type="button" onClick={() => setPendingFiles([])} className="text-xs text-red-500 hover:underline">Limpar</button>
                                                </div>
                                                <ul className="bg-white rounded border border-indigo-100 divide-y divide-indigo-50 text-xs">
                                                    {pendingFiles.map((file, idx) => (
                                                        <li key={idx} className="p-2 flex justify-between items-center">
                                                            <span className="truncate text-slate-600">{file.name}</span>
                                                            <span className="text-green-600 flex items-center gap-1 font-medium text-xs"><CheckCircle size={14} className="text-green-600" /> Pronto</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="flex gap-2">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleUploadAction(false)} 
                                                        disabled={isAnalyzingDoc}
                                                        className="flex-1 bg-white border border-indigo-200 text-indigo-700 py-1.5 rounded text-xs font-medium hover:bg-indigo-50 transition-colors"
                                                    >
                                                        Apenas Anexar
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleUploadAction(true)} 
                                                        disabled={isAnalyzingDoc}
                                                        className="flex-1 bg-indigo-600 text-white py-1.5 rounded text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        {isAnalyzingDoc ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} 
                                                        Processar e Preencher
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <form id="ownerForm" onSubmit={handleSaveOwner} className="space-y-6">
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><User size={18}/> Identificação</h4>
                                            
                                            {/* RESTRUCTURED: CPF/CNPJ First Line */}
                                            <div className="w-full md:w-1/2 mx-auto">
                                                <label className="block text-sm font-bold text-slate-700 mb-1">CPF / CNPJ <span className="text-xs font-normal text-indigo-600 ml-1">(Inicie por aqui)</span></label>
                                                <div className="relative">
                                                    <ClearableInput 
                                                        type="text" 
                                                        className={`w-full border-2 p-2 pr-10 rounded outline-none transition-all ${fetchSource === 'API' ? 'border-green-500 bg-green-50' : 'border-indigo-100 focus:border-indigo-500 focus:shadow-md'}`}
                                                        placeholder="Digite apenas números"
                                                        value={newOwner.document || ''}
                                                        onChange={handleDocumentChange}
                                                        onKeyDown={handleDocumentKeyDown}
                                                        onClear={() => setNewOwner({...newOwner, document: ''})}
                                                        maxLength={18}
                                                        autoFocus
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={handleFetchTaxData}
                                                        className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                                                        title="Buscar dados na Receita"
                                                        disabled={isFetchingTaxId}
                                                    >
                                                        {isFetchingTaxId ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
                                                    </button>
                                                </div>
                                                {fetchSource === 'API' && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={12}/> Dados carregados da Receita</p>}
                                            </div>

                                            {/* RESTRUCTURED: Name Full Width Second Line */}
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo / Razão Social</label>
                                                <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2" value={newOwner.name || ''} onChange={e => setNewOwner({...newOwner, name: e.target.value})} onClear={() => setNewOwner({...newOwner, name: ''})} />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                                                    <div className="relative">
                                                        <ClearableInput type="email" className="w-full border border-slate-300 rounded p-2" value={newOwner.email || ''} onChange={handleEmailChange} onClear={() => setNewOwner({...newOwner, email: ''})} />
                                                        {showEmailDropdown && (
                                                            <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                                {emailSuggestions.map(provider => (
                                                                    <li key={provider} onClick={() => selectEmailProvider(provider)} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">{newOwner.email?.split('@')[0]}@{provider}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                                                    <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2" value={newOwner.phone || ''} onChange={handlePhoneChange} onClear={() => setNewOwner({...newOwner, phone: ''})} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* CONDITIONAL FIELDS (MOVED UP) */}
                                        {isPJ(newOwner.document) ? (
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><Building2 size={18}/> Dados da Empresa</h4>
                                                
                                                {/* Representante Legal Input */}
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Representante Legal</label>
                                                    <ClearableInput 
                                                        type="text" 
                                                        className="w-full border border-slate-300 rounded p-2" 
                                                        value={newOwner.legalRepresentative || ''} 
                                                        onChange={e => setNewOwner({...newOwner, legalRepresentative: e.target.value})} 
                                                        onClear={() => setNewOwner({...newOwner, legalRepresentative: ''})} 
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Inscrição Estadual</label>
                                                        <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2" value={newOwner.rg || ''} onChange={e => setNewOwner({...newOwner, rg: e.target.value})} onClear={() => setNewOwner({...newOwner, rg: ''})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Inscrição Municipal</label>
                                                        <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2" value={newOwner.municipalRegistration || ''} onChange={e => setNewOwner({...newOwner, municipalRegistration: e.target.value})} onClear={() => setNewOwner({...newOwner, municipalRegistration: ''})} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">Atividades Econômicas (CNAE)</label>
                                                    <div className="flex gap-2 mb-2">
                                                        <div className="relative flex-1">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Buscar código ou descrição..." 
                                                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                                                onFocus={() => setShowCnaeDropdown(true)}
                                                            />
                                                            {showCnaeDropdown && (
                                                                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                                    {COMMON_CNAES.map(cnae => (
                                                                        <div key={cnae.code} onClick={() => handleAddCnae(cnae.code, cnae.desc)} className="p-2 hover:bg-slate-50 cursor-pointer text-xs border-b last:border-0">
                                                                            <strong>{cnae.code}</strong> - {cnae.desc}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {cnaeList.map(cnae => (
                                                            <div key={cnae.code} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 text-sm">
                                                                <div>
                                                                    <span className="font-mono font-bold text-slate-700">{cnae.code}</span> - {cnae.description}
                                                                    <span className={`ml-2 text-[10px] px-2 py-0.5 rounded ${cnae.type === 'Principal' ? 'bg-green-100 text-green-700 font-bold' : 'bg-slate-200 text-slate-600'}`}>{cnae.type}</span>
                                                                </div>
                                                                <button type="button" onClick={() => handleRemoveCnae(cnae.code)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><User size={18}/> Dados Pessoais</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">RG</label>
                                                        <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2" value={newOwner.rg || ''} onChange={e => setNewOwner({...newOwner, rg: e.target.value})} onClear={() => setNewOwner({...newOwner, rg: ''})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Estado Civil</label>
                                                        <SearchableSelect 
                                                            options={[
                                                                { value: 'Solteiro(a)', label: 'Solteiro(a)' },
                                                                { value: 'Casado(a)', label: 'Casado(a)' },
                                                                { value: 'Divorciado(a)', label: 'Divorciado(a)' },
                                                                { value: 'Viúvo(a)', label: 'Viúvo(a)' },
                                                                { value: 'União Estável', label: 'União Estável' },
                                                            ]}
                                                            value={newOwner.maritalStatus || ''} 
                                                            onChange={(val) => setNewOwner({...newOwner, maritalStatus: val})}
                                                            placeholder="Selecione..."
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Naturalidade</label>
                                                        <div className="flex gap-2">
                                                            <div className="w-28">
                                                                <SearchableSelect 
                                                                    options={BRAZIL_STATES.map(s => ({ value: s, label: s }))}
                                                                    value={naturalityForm.uf} 
                                                                    onChange={(val) => setNaturalityForm({...naturalityForm, uf: val})}
                                                                    placeholder="UF"
                                                                />
                                                            </div>
                                                            <div className="flex-1 relative">
                                                                <ClearableInput 
                                                                    type="text" 
                                                                    className="w-full border border-slate-300 rounded p-2" 
                                                                    placeholder="Cidade"
                                                                    value={naturalityForm.city} 
                                                                    onChange={e => {
                                                                        setNaturalityForm({...naturalityForm, city: e.target.value});
                                                                        setShowNaturalityDropdown(true);
                                                                    }}
                                                                    onFocus={() => setShowNaturalityDropdown(true)}
                                                                    onBlur={() => setTimeout(() => setShowNaturalityDropdown(false), 200)}
                                                                    onClear={() => setNaturalityForm({...naturalityForm, city: ''})}
                                                                />
                                                                {isLoadingNaturality && <div className="absolute right-8 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-indigo-600" size={16}/></div>}
                                                                {showNaturalityDropdown && availableNaturalityCities.length > 0 && (
                                                                    <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                                        {availableNaturalityCities.filter(c => c.toLowerCase().includes(naturalityForm.city.toLowerCase())).map(city => (
                                                                            <li key={city} onClick={() => setNaturalityForm({...naturalityForm, city: city})} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">{city}</li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ADDRESS SECTION (MOVED DOWN) */}
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><MapPin size={18}/> Endereço</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-1">
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">CEP</label>
                                                    <div className="relative">
                                                        <ClearableInput 
                                                            type="text" 
                                                            className="w-full border border-slate-300 rounded p-2" 
                                                            value={addressForm.cep} 
                                                            onChange={handleCEPChange} 
                                                            onBlur={handleFetchCEP} 
                                                            onKeyDown={handleCEPKeyDown}
                                                            onClear={() => setAddressForm({...addressForm, cep: ''})} 
                                                            maxLength={10} 
                                                            placeholder="00.000-000"
                                                        />
                                                        <button type="button" onClick={handleFetchCEP} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"><Search size={16}/></button>
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Logradouro</label>
                                                    <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2" value={addressForm.logradouro} onChange={e => setAddressForm({...addressForm, logradouro: e.target.value})} onClear={() => setAddressForm({...addressForm, logradouro: ''})} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número</label>
                                                    <div className="flex gap-2 items-center">
                                                        <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2" value={addressForm.numero} onChange={e => setAddressForm({...addressForm, numero: e.target.value})} disabled={addressForm.semNumero} onClear={() => setAddressForm({...addressForm, numero: ''})} />
                                                        <div className="flex items-center h-full">
                                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 whitespace-nowrap" title="Sem Número">
                                                                <input type="checkbox" checked={addressForm.semNumero} onChange={e => setAddressForm({...addressForm, semNumero: e.target.checked, numero: e.target.checked ? 'S/N' : ''})} className="w-4 h-4"/>
                                                                S/N
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Complemento</label>
                                                    <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2" value={addressForm.complemento} onChange={e => setAddressForm({...addressForm, complemento: e.target.value})} onClear={() => setAddressForm({...addressForm, complemento: ''})} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Bairro</label>
                                                    <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2" value={addressForm.bairro} onChange={e => setAddressForm({...addressForm, bairro: e.target.value})} onClear={() => setAddressForm({...addressForm, bairro: ''})} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Estado (UF)</label>
                                                    <SearchableSelect 
                                                        options={BRAZIL_STATES.map(s => ({ value: s, label: s }))}
                                                        value={addressForm.uf} 
                                                        onChange={(val) => setAddressForm({...addressForm, uf: val})}
                                                        placeholder="UF"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Município</label>
                                                    <div className="relative">
                                                        <ClearableInput 
                                                            type="text" 
                                                            className="w-full border border-slate-300 rounded p-2" 
                                                            value={addressForm.municipio} 
                                                            onChange={e => {
                                                                setAddressForm({...addressForm, municipio: e.target.value});
                                                                setShowCityDropdown(true);
                                                            }}
                                                            onFocus={() => setShowCityDropdown(true)}
                                                            onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                                                            onClear={() => setAddressForm({...addressForm, municipio: ''})}
                                                        />
                                                        {isLoadingCities && <div className="absolute right-8 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-indigo-600" size={16}/></div>}
                                                        {showCityDropdown && availableCities.length > 0 && (
                                                            <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                                {availableCities.filter(c => c.toLowerCase().includes(addressForm.municipio.toLowerCase())).map(city => (
                                                                    <li key={city} onClick={() => setAddressForm({...addressForm, municipio: city})} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">{city}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* ... (Existing Documents Tab logic remains unchanged) ... */}
                            {ownerModalTab === 'Documents' && (
                                <div className="space-y-6">
                                    <div 
                                        className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center transition-colors hover:bg-indigo-50/50 cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onPaste={handlePaste}
                                    >
                                        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && processFiles(e.target.files)} />
                                        <CloudUpload size={48} className="text-indigo-400 mb-4" />
                                        <p className="text-sm font-medium text-slate-700">Clique para selecionar, arraste ou cole arquivos</p>
                                        <p className="text-xs text-slate-400 mt-1">PDF, Imagens, DOCX (para extração automática de dados)</p>
                                    </div>

                                    {pendingFiles.length > 0 && (
                                        <div className="bg-white border rounded-lg p-4">
                                            <h4 className="font-bold text-sm text-slate-700 mb-3">Arquivos Selecionados</h4>
                                            <ul className="space-y-2 mb-4">
                                                {pendingFiles.map((file, idx) => (
                                                    <li key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
                                                        <span className="truncate flex-1">{file.name}</span>
                                                        <span className="text-green-600 flex items-center gap-1 font-medium text-xs"><CheckCircle size={14} className="text-green-600" /> Pronto</span>
                                                        <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 ml-2"><X size={16}/></button>
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="flex gap-2">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleUploadAction(false)} 
                                                    className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded text-sm hover:bg-slate-50"
                                                    disabled={isAnalyzingDoc}
                                                >
                                                    Apenas Anexar
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleUploadAction(true)} 
                                                    className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 flex items-center justify-center gap-2"
                                                    disabled={isAnalyzingDoc}
                                                >
                                                    {isAnalyzingDoc ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} 
                                                    Anexar e Processar via IA
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <h4 className="font-bold text-sm text-slate-700">Documentos Anexados</h4>
                                        {getOwnerDocuments().length === 0 ? (
                                            <p className="text-sm text-slate-400 italic">Nenhum documento vinculado.</p>
                                        ) : (
                                            getOwnerDocuments().map(doc => (
                                                <div key={doc.id} className="flex justify-between items-center p-3 bg-white border rounded-lg hover:shadow-sm">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="bg-indigo-50 p-2 rounded text-indigo-600"><FileText size={18}/></div>
                                                        <div className="truncate">
                                                            <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                                                            <p className="text-xs text-slate-500">{doc.category} • {doc.uploadDate}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        <button type="button" onClick={() => setViewingDoc(doc)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded" title="Visualizar"><Eye size={16}/></button>
                                                        <button type="button" onClick={(e) => handleDownload(e, doc)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded" title="Download"><Download size={16}/></button>
                                                        <button type="button" onClick={(e) => handleDeleteOwnerDoc(e, doc.id, doc.name)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Excluir"><Trash2 size={16}/></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowOwnerModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
                            <button type="button" onClick={handleMainSaveButton} className="px-6 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700">{getSaveButtonText()}</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* VIEWING DOC MODAL */}
            {viewingDoc && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                   <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
                      <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                         <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded text-indigo-600">
                                <FileText size={24}/>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{viewingDoc.name}</h3>
                                <p className="text-xs text-slate-500">{viewingDoc.category} • {viewingDoc.uploadDate}</p>
                            </div>
                         </div>
                         <div className="flex gap-2">
                            <button type="button" onClick={(e) => handleDownload(e, viewingDoc)} className="text-slate-500 hover:bg-slate-200 p-2 rounded" title="Download">
                                <Download size={20}/>
                            </button>
                            <button type="button" onClick={() => setViewingDoc(null)} className="text-slate-500 hover:bg-red-100 hover:text-red-600 p-2 rounded">
                                <X size={20}/>
                            </button>
                         </div>
                      </div>
                      
                      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                          <div className="flex-1 bg-slate-100 p-6 overflow-y-auto border-r border-slate-200">
                              <div className="bg-white shadow-sm p-8 min-h-full rounded-lg">
                                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed">
                                      {viewingDoc.contentRaw || "(Conteúdo do arquivo não disponível para visualização direta. Em um app real, aqui seria exibido o PDF ou Imagem.)"}
                                  </pre>
                              </div>
                          </div>

                          <div className="w-full md:w-80 bg-white p-6 overflow-y-auto">
                              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                  <Tag size={18} className="text-indigo-600"/> Análise da IA
                              </h4>
                              
                              <div className="space-y-6">
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Resumo</p>
                                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100">
                                          {viewingDoc.summary || "Sem resumo disponível."}
                                      </p>
                                  </div>

                                  {viewingDoc.aiAnalysis && (
                                      <>
                                          <div>
                                              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Nível de Risco</p>
                                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                                                  viewingDoc.aiAnalysis.riskLevel === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                                                  viewingDoc.aiAnalysis.riskLevel === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                  'bg-green-50 text-green-700 border-green-200'
                                              }`}>
                                                  {viewingDoc.aiAnalysis.riskLevel === 'High' && <AlertTriangle size={12}/>}
                                                  {viewingDoc.aiAnalysis.riskLevel === 'High' ? 'Alto Risco' : 
                                                   viewingDoc.aiAnalysis.riskLevel === 'Medium' ? 'Risco Médio' : 'Risco Baixo'}
                                              </span>
                                          </div>

                                          {viewingDoc.aiAnalysis.keyDates.length > 0 && (
                                              <div>
                                                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Datas Chave</p>
                                                  <ul className="space-y-1">
                                                      {viewingDoc.aiAnalysis.keyDates.map((date, i) => (
                                                          <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                              <Calendar size={14} className="text-slate-400"/> {date}
                                                          </li>
                                                      ))}
                                                  </ul>
                                              </div>
                                          )}

                                          {viewingDoc.aiAnalysis.monetaryValues.length > 0 && (
                                              <div>
                                                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Valores Encontrados</p>
                                                  <ul className="space-y-1">
                                                      {viewingDoc.aiAnalysis.monetaryValues.map((val, i) => (
                                                          <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                              <DollarSign size={14} className="text-slate-400"/> {val}
                                                          </li>
                                                      ))}
                                                  </ul>
                                              </div>
                                          )}
                                      </>
                                  )}
                              </div>
                          </div>
                      </div>
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