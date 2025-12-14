import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Property, Document, Employee, PropertyTag, AIConfig, MonthlyIndexData, UserProfile, Owner, CloudAccount, CloudProvider, AIProvider, LogEntry, TrashItem, AddressComponents } from '../types';
import AssetManager from './AssetManager';
import TeamManager from './TeamManager';
import TagManagerView from './TagManagerView';
import SettingsView from './SettingsView';
import { analyzeDocumentContent, AnalyzableFile } from '../services/geminiService';
import { Database, Users, Building2, Tag, Key, User, Plus, Trash2, Save, Cloud, ShieldCheck, Loader2, Search, MapPin, FileText, Download, Sparkles, ChevronDown, Camera, X, Briefcase, HelpCircle, Power, PowerOff, RefreshCcw, CloudUpload, Eraser, Pencil, ExternalLink, CheckCircle, Lock, Image as ImageIcon, FileSpreadsheet, CheckSquare, Square, Eye } from 'lucide-react';
import { getNextId } from '../services/idService';

// Define Missing Types
type TabType = 'Assets' | 'Team' | 'Tags' | 'Indices' | 'API' | 'Cloud' | 'Users' | 'Owners';
type OwnerModalTab = 'Data' | 'Documents';

interface PendingFile {
    name: string;
    content: string;
    fileObject: File;
}

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

// Helper for Phone Mask (XX) XXXXX-XXXX
const formatPhone = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '');
  if (v.length > 11) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
  return v;
};

// Helper for CEP Mask XXXXX-XXX
const formatCEP = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length > 5) {
    return v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2-$3');
  } else if (v.length > 2) {
    return v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  }
  return v;
};

// Helper for Document Mask
const formatDocumentMask = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 11) { // CPF Mask
      return v.replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d{1,2})/, '$1-$2')
              .replace(/(-\d{2})\d+?$/, '$1');
    } else { // CNPJ Mask
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

interface SearchableSelectProps {
  options: { value: string; label: string; icon?: React.ReactNode }[];
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
            className={`w-full ${className} pr-10 cursor-pointer border border-slate-300 rounded p-2 outline-none focus:border-indigo-500`}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
            onFocus={() => { setIsOpen(true); setSearchTerm(''); }}
            readOnly={false}
         />
         <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 items-center pointer-events-none">
            <ChevronDown size={16} className="text-slate-400" />
         </div>
         {value && (
            <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); onChange(''); setSearchTerm(''); }} 
                className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
                <Eraser size={14} />
            </button>
         )}
      </div>
      
      {isOpen && (
        <>
            <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => { 
                    setIsOpen(false); 
                    const selected = options.find(o => o.value === value);
                    if (selected) setSearchTerm(selected.label);
                    else setSearchTerm('');
                }} 
            />
            <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {filtered.map(opt => (
                <li key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm flex items-center gap-2 ${opt.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                >
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
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

const FileViewer: React.FC<{ content: string }> = ({ content }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => { if (content.startsWith('data:application/pdf')) { try { const base64Arr = content.split(','); const base64 = base64Arr.length > 1 ? base64Arr[1] : base64Arr[0]; const binaryStr = atob(base64); const len = binaryStr.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); } const blob = new Blob([bytes], { type: 'application/pdf' }); const url = URL.createObjectURL(blob); setBlobUrl(url); return () => URL.revokeObjectURL(url); } catch (err) { console.error("Erro ao converter PDF para Blob:", err); setBlobUrl(null); } } else { setBlobUrl(null); } }, [content]);
  if (!content) return (<div className="flex flex-col items-center justify-center h-full text-slate-400"><FileText size={48} /><p className="mt-4">Conteúdo não disponível</p></div>);
  if (content.startsWith('data:image')) return (<img src={content} alt="Preview" className="max-w-full max-h-full object-contain mx-auto shadow-sm rounded" />);
  if (content.startsWith('data:application/pdf')) { if (!blobUrl) return (<div className="flex flex-col items-center justify-center h-full text-slate-400"><Loader2 size={32} className="animate-spin mb-2 text-indigo-600" /><p>Preparando visualização do PDF...</p></div>); return (<iframe src={blobUrl} className="w-full h-full rounded border border-slate-200" title="PDF Preview" />); }
  return (<pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-6 rounded shadow-sm overflow-auto h-full">{content}</pre>);
};

const DocumentDataModal: React.FC<{ doc: Document; onClose: () => void; onSave: (doc: Document) => void; aiConfig?: AIConfig; onReanalyze: (doc: Document) => void }> = ({ doc, onClose, onSave, aiConfig, onReanalyze }) => {
    const [formData, setFormData] = useState<Record<string, string>>(doc.extractedData || {});
    const [summary, setSummary] = useState(doc.summary || '');
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => { setFormData(doc.extractedData || {}); setSummary(doc.summary || ''); }, [doc]);

    const handleSave = () => { onSave({ ...doc, extractedData: formData, summary }); onClose(); };
    const handleForceAnalysis = async () => { if(!aiConfig) return; setIsAnalyzing(true); onReanalyze(doc); setIsAnalyzing(false); };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet size={20} className="text-indigo-600"/> Dados Estruturados</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resumo Executivo (IA)</label>
                        <textarea className="w-full border border-slate-200 rounded p-3 text-sm text-slate-700 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none h-24" value={summary} onChange={e => setSummary(e.target.value)}/>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Campos Extraídos</label>
                            {aiConfig && (<button type="button" onClick={handleForceAnalysis} disabled={isAnalyzing} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"><Sparkles size={12}/> {isAnalyzing ? 'Analisando...' : 'Forçar Reanálise IA'}</button>)}
                        </div>
                        <div className="space-y-2 mb-4">
                            {Object.entries(formData).map(([key, val]) => (
                                <div key={key} className="flex gap-2 items-center">
                                    <input type="text" value={key} readOnly className="w-1/3 text-xs font-semibold bg-slate-100 border-transparent rounded p-2 text-slate-600" />
                                    <input type="text" value={val} onChange={(e) => setFormData({...formData, [key]: e.target.value})} className="flex-1 text-sm border border-slate-200 rounded p-2 text-slate-800 focus:border-indigo-500 outline-none" />
                                    <button onClick={() => { const next = {...formData}; delete next[key]; setFormData(next); }} className="text-slate-400 hover:text-red-500 p-1"><X size={14}/></button>
                                </div>
                            ))}
                            {Object.keys(formData).length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">Nenhum dado estruturado extraído.</p>}
                        </div>
                        <div className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200">
                            <input type="text" placeholder="Novo Campo" value={newKey} onChange={e => setNewKey(e.target.value)} className="w-1/3 text-xs p-2 border border-slate-300 rounded" />
                            <input type="text" placeholder="Valor" value={newValue} onChange={e => setNewValue(e.target.value)} className="flex-1 text-sm p-2 border border-slate-300 rounded" />
                            <button onClick={() => { if(newKey && newValue) { setFormData(prev => ({...prev, [newKey]: newValue})); setNewKey(''); setNewValue(''); }}} disabled={!newKey || !newValue} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50"><Save size={14}/></button>
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2"><Save size={16}/> Salvar Dados</button>
                </div>
            </div>
        </div>
    );
};

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
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  
  const [cnaeInput, setCnaeInput] = useState('');
  const [allCnaes, setAllCnaes] = useState<{id: string, descricao: string}[]>([]);
  const [showCnaeDropdown, setShowCnaeDropdown] = useState(false);

  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [tempDocs, setTempDocs] = useState<Document[]>([]);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ownerPhotoInputRef = useRef<HTMLInputElement>(null);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [editingDataDoc, setEditingDataDoc] = useState<Document | null>(null);

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

  const handleDownload = (doc: Document) => {
    if (!doc.contentRaw) { alert("Conteúdo indisponível."); return; }
    try {
      const link = document.createElement('a'); link.download = doc.name;
      if (doc.contentRaw.startsWith('data:')) link.href = doc.contentRaw;
      else { const blob = new Blob([doc.contentRaw], { type: 'text/plain' }); link.href = URL.createObjectURL(blob); }
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { console.error(e); alert("Erro download."); }
  };

  const processFiles = (fileList: FileList | File[]) => {
      const files: File[] = Array.from(fileList);
      const newDocs: PendingFile[] = [];
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
              newDocs.push({ name: file.name, content: ev.target?.result as string || '', fileObject: file });
              if (newDocs.length === files.length) setPendingFiles(prev => [...prev, ...newDocs]);
          };
          if(file.type.includes('text') || file.type.includes('json')) reader.readAsText(file); else reader.readAsDataURL(file);
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) processFiles(e.target.files); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); };
  const handlePaste = (e: React.ClipboardEvent) => { if (e.clipboardData.files && e.clipboardData.files.length > 0) processFiles(e.clipboardData.files); };

  const getOwnerDocuments = () => { if (isEditingOwner && newOwner.id) return props.allDocuments.filter(d => d.relatedOwnerId === newOwner.id); return tempDocs; };
  const handleOpenEditOwner = (owner: Owner) => { setNewOwner({...owner}); setIsEditingOwner(true); setOwnerPhotoPreview(owner.photoUrl || ''); setTempDocs([]); setSelectedDocIds([]); setAddressForm({ cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: '' }); if(owner.address) { const parts = owner.address.split(','); if(parts.length > 0) setAddressForm(prev => ({ ...prev, logradouro: parts[0] })); } setShowOwnerModal(true); };

  const handleUploadAction = async (processWithAI: boolean) => {
      if (pendingFiles.length === 0) return;
      setIsAnalyzingDoc(true);
      setAiSummary(null);
      for (const file of pendingFiles) {
          let aiResult: any = { category: 'Legal' as any, summary: processWithAI ? 'Análise indisponível' : 'Upload manual.', riskLevel: 'Low' as any, keyDates: [], monetaryValues: [], structuredData: {} };
          let extractedOwner: Partial<Owner> | null = null;
          if (processWithAI && props.activeAIConfig) {
              try {
                  const analyzableFiles: AnalyzableFile[] = [];
                  let textContext = "";
                  if (file.content.startsWith('data:')) {
                       const matches = file.content.match(/^data:(.+);base64,(.+)$/);
                       if (matches && matches.length === 3) analyzableFiles.push({ mimeType: matches[1], data: matches[2] });
                  } else { textContext = file.content.substring(0, 5000); }

                  const analysis = await analyzeDocumentContent(textContext, analyzableFiles, props.activeAIConfig.apiKey, props.activeAIConfig.modelName, 'OwnerCreation');
                  aiResult = { ...analysis };
                  if (analysis.extractedOwnerData) extractedOwner = analysis.extractedOwnerData;
                  if (analysis.summary) setAiSummary(analysis.summary);
              } catch(e) { console.error(e); }
          }
          if (ownerModalTab === 'Data' && extractedOwner) {
              setNewOwner(prev => ({ ...prev, name: prev.name || extractedOwner?.name || prev.name, document: prev.document || extractedOwner?.document || prev.document, email: (prev.email || extractedOwner?.email || prev.email || '').toLowerCase(), phone: formatPhone(prev.phone || extractedOwner?.phone || prev.phone || ''), address: prev.address || extractedOwner?.address || prev.address }));
              alert("Dados extraídos para o formulário.");
          } else {
              const newDoc: Document = { id: getNextId('Document'), name: file.name, category: aiResult.category, uploadDate: new Date().toLocaleDateString('pt-BR'), summary: aiResult.summary, contentRaw: file.content, aiAnalysis: aiResult as any, extractedData: aiResult.structuredData };
              if (isEditingOwner && newOwner.id) props.onAddDocument({ ...newDoc, relatedOwnerId: newOwner.id }); else setTempDocs(prev => [...prev, newDoc]);
          }
      }
      setPendingFiles([]); setIsAnalyzingDoc(false);
  };

  const handleUpdateTempDoc = (updatedDoc: Document) => { setTempDocs(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d)); };
  
  const handleForceReanalyze = async (doc: Document) => {
      if (!props.activeAIConfig) return;
      try {
          const analyzableFiles: AnalyzableFile[] = [];
          let textContext = "";
          if (doc.contentRaw?.startsWith('data:')) {
                const matches = doc.contentRaw.match(/^data:(.+);base64,(.+)$/);
                if (matches && matches.length === 3) analyzableFiles.push({ mimeType: matches[1], data: matches[2] });
          } else { textContext = doc.contentRaw || ''; }

          const analysis = await analyzeDocumentContent(textContext, analyzableFiles, props.activeAIConfig.apiKey, props.activeAIConfig.modelName);
          const updated = { ...doc, extractedData: analysis.structuredData, summary: analysis.summary };
          
          if(isEditingOwner) { props.onDeleteDocument(doc.id); props.onAddDocument(updated); } else { handleUpdateTempDoc(updated); }
          setEditingDataDoc(updated);
      } catch (e) { alert("Erro ao reanalisar."); }
  };

  // Batch
  const currentDocs = getOwnerDocuments();
  const docCount = currentDocs.length;
  const toggleSelectAll = () => {
      if (selectedDocIds.length === currentDocs.length) setSelectedDocIds([]);
      else setSelectedDocIds(currentDocs.map(d => d.id));
  };
  const toggleSelectOne = (id: string) => {
      if (selectedDocIds.includes(id)) setSelectedDocIds(prev => prev.filter(d => d !== id));
      else setSelectedDocIds(prev => [...prev, id]);
  };
  const handleBatchDelete = () => {
      if (confirm(`Excluir ${selectedDocIds.length} documentos?`)) {
          selectedDocIds.forEach(id => {
              if (isEditingOwner) props.onDeleteDocument(id);
              else setTempDocs(prev => prev.filter(d => d.id !== id));
          });
          setSelectedDocIds([]);
      }
  };
  const handleBatchDownload = async (singlePDF: boolean) => {
      if(singlePDF) alert("Download sequencial iniciado.");
      const docs = currentDocs.filter(d => selectedDocIds.includes(d.id));
      for (const doc of docs) { handleDownload(doc); await new Promise(r => setTimeout(r, 500)); }
  };

  const handleSaveOwner = (e: React.FormEvent) => {
      e.preventDefault(); if (!newOwner.name) return;
      const ownerId = newOwner.id || getNextId('Owner');
      const ownerToSave: Owner = { ...newOwner as Owner, id: ownerId, photoUrl: ownerPhotoPreview, address: `${addressForm.logradouro}, ${addressForm.numero} ${addressForm.complemento} - ${addressForm.bairro}, ${addressForm.municipio}/${addressForm.uf}` };
      if (isEditingOwner) props.onEditOwner(ownerToSave); else { props.onAddOwner(ownerToSave); tempDocs.forEach(doc => props.onAddDocument({ ...doc, relatedOwnerId: ownerId })); }
      setShowOwnerModal(false); setNewOwner({}); setTempDocs([]); setPendingFiles([]); setAiSummary(null); setOwnerPhotoPreview('');
  };

  const handleMainSaveButton = (e: React.FormEvent) => {
      handleSaveOwner(e);
  };
  
  const getSaveButtonText = () => {
      return isEditingOwner ? 'Salvar Alterações' : 'Cadastrar Proprietário';
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
                <div className="flex justify-between items-center mb-6"><div><h2 className="text-3xl font-bold text-slate-800">Proprietários</h2><p className="text-slate-500">Gestão de Pessoas Físicas e Jurídicas</p></div><button onClick={() => { setNewOwner({}); setIsEditingOwner(false); setTempDocs([]); setSelectedDocIds([]); setOwnerPhotoPreview(''); setShowOwnerModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"><Plus size={18}/> Novo Proprietário</button></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{props.owners.map(owner => (<div key={owner.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow relative group"><div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenEditOwner(owner)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-full shadow-sm border border-slate-100"><Pencil size={14}/></button><button onClick={() => { if(confirm("Excluir proprietário?")) props.onDeleteOwner(owner.id); }} className="p-1.5 text-slate-400 hover:text-red-600 bg-white rounded-full shadow-sm border border-slate-100"><Trash2 size={14}/></button></div><div className="flex items-center gap-4 mb-4"><div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">{owner.photoUrl ? <img src={owner.photoUrl} alt={owner.name} className="w-full h-full object-cover"/> : <User size={32} className="text-slate-300"/>}</div><div><h3 className="font-bold text-slate-800 line-clamp-1" title={owner.name}>{owner.name}</h3><p className="text-xs text-slate-500">{owner.profession || 'Profissão não informada'}</p><div className="flex gap-2 mt-1"><span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{owner.document || 'Sem Doc'}</span></div></div></div><div className="space-y-2 text-xs text-slate-600"><p className="flex items-center gap-2"><MapPin size={12} className="text-slate-400"/> <span className="truncate">{owner.address || 'Endereço não informado'}</span></p><p className="flex items-center gap-2"><Briefcase size={12} className="text-slate-400"/> <span>{props.properties.filter(p => p.ownerId === owner.id).length} Imóveis vinculados</span></p></div></div>))}
                {props.owners.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300"><User size={48} className="mx-auto mb-3 opacity-20"/><p>Nenhum proprietário cadastrado.</p></div>}</div>
                
                {/* Owner Modal */}
                {showOwnerModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className={`bg-white rounded-xl w-full ${aiSummary ? 'max-w-6xl' : 'max-w-4xl'} h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95`}>
                            {/* ... Header and Tab Nav ... */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0"><h3 className="text-xl font-bold text-slate-800">{isEditingOwner ? `Editar: ${newOwner.name}` : 'Novo Proprietário'}</h3><button onClick={() => setShowOwnerModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={24}/></button></div>
                            <div className="flex border-b border-slate-200 px-6 shrink-0"><button onClick={() => setOwnerModalTab('Data')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ownerModalTab === 'Data' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}><User size={16}/> Dados Cadastrais</button><button onClick={() => setOwnerModalTab('Documents')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ownerModalTab === 'Documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}><FileText size={16}/> Documentos ({docCount})</button></div>

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
                                        <div className="space-y-6">
                                            {/* Upload Area */}
                                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer bg-white" onDragOver={handleDragOver} onDrop={handleDrop} onPaste={handlePaste} onClick={() => fileInputRef.current?.click()}><input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} /><CloudUpload size={48} className="mb-4 text-indigo-400"/><p className="font-medium">Clique ou arraste documentos aqui</p></div>
                                            
                                            {pendingFiles.length > 0 && (<div className="bg-white rounded-xl border border-slate-200 p-4"><h4 className="font-bold text-sm text-slate-700 mb-3">Arquivos para Envio</h4><ul className="space-y-2">{pendingFiles.map((file, idx) => (<li key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded"><span className="truncate flex-1">{file.name}</span><button onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button></li>))}</ul><div className="flex gap-2 mt-4 justify-end"><button type="button" onClick={() => handleUploadAction(false)} disabled={isAnalyzingDoc} className="text-xs bg-white border border-slate-300 px-3 py-2 rounded hover:bg-slate-50 text-slate-700">Apenas Anexar</button><button type="button" onClick={() => handleUploadAction(true)} disabled={isAnalyzingDoc} className="text-xs bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 flex items-center gap-2">{isAnalyzingDoc ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} Processar com IA</button></div></div>)}

                                            {/* Unified Document List for Owner */}
                                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                <div className="flex items-center justify-between bg-slate-100 p-3 border-b border-slate-200">
                                                    <div className="flex items-center gap-3"><button onClick={toggleSelectAll} className="text-slate-500 hover:text-indigo-600">{selectedDocIds.length > 0 && selectedDocIds.length === currentDocs.length ? <CheckSquare size={20}/> : <Square size={20}/>}</button><span className="text-sm font-medium text-slate-600">{selectedDocIds.length} selecionados</span></div>
                                                    {selectedDocIds.length > 0 && (<div className="flex gap-2"><button onClick={() => handleBatchDownload(false)} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"><Download size={16}/> Baixar</button><button onClick={handleBatchDelete} className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-2"><Trash2 size={16}/> Excluir</button></div>)}
                                                </div>
                                                <div className="bg-white divide-y divide-slate-100">
                                                    {currentDocs.map(doc => {
                                                        const isSelected = selectedDocIds.includes(doc.id);
                                                        return (
                                                            <div key={doc.id} className={`p-3 flex items-center gap-3 hover:bg-slate-50 group ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                                                                <button onClick={() => toggleSelectOne(doc.id)} className="text-slate-400 hover:text-indigo-600 shrink-0">{isSelected ? <CheckSquare size={20} className="text-indigo-600"/> : <Square size={20}/>}</button>
                                                                <div className="p-2 rounded bg-slate-100 text-slate-600 shrink-0"><FileText size={18}/></div>
                                                                <div className="flex-1 min-w-0"><h4 className="font-semibold text-slate-900 text-sm truncate">{doc.name}</h4><div className="text-xs text-slate-500">{doc.category} • {doc.uploadDate}</div></div>
                                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => { if (doc.extractedData) setEditingDataDoc(doc); else handleForceReanalyze(doc); }} className={`p-1.5 rounded ${doc.extractedData ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`} title={doc.extractedData ? "Dados" : "IA"}>{doc.extractedData ? <FileSpreadsheet size={16} /> : <Sparkles size={16} />}</button>
                                                                    <button onClick={() => setViewingDoc(doc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Ver"><Eye size={16} /></button>
                                                                    <button onClick={() => handleDownload(doc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Download"><Download size={16} /></button>
                                                                    <button onClick={() => { if(confirm(`Excluir?`)) { if(isEditingOwner) props.onDeleteDocument(doc.id); else setTempDocs(prev => prev.filter(d => d.id !== doc.id)); }}} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Excluir"><Trash2 size={16} /></button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {currentDocs.length === 0 && <div className="p-6 text-center text-slate-400 text-sm italic">Nenhum documento vinculado.</div>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {aiSummary && (<div className="w-80 bg-indigo-50 border-l border-indigo-100 p-6 overflow-y-auto"><div className="flex items-center gap-2 mb-4 text-indigo-700 font-bold"><Sparkles size={20} /><h4>Resumo Inteligente</h4></div><div className="bg-white p-4 rounded-lg shadow-sm text-sm whitespace-pre-wrap border border-indigo-100">{aiSummary}</div></div>)}
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-white rounded-b-xl flex justify-end gap-3 shrink-0"><button onClick={() => setShowOwnerModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button><button onClick={handleMainSaveButton} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2"><Save size={18}/> {getSaveButtonText()}</button></div>
                        </div>
                    </div>
                )}
            </div>
        )}
        
        {/* Modals for Register View (Viewer, Data) */}
        {viewingDoc && (<div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"><div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"><div className="flex justify-between items-center p-4 border-b border-slate-200"><h3 className="font-bold">{viewingDoc.name}</h3><button onClick={() => setViewingDoc(null)}><X size={20}/></button></div><div className="flex-1 bg-slate-100 p-4 flex items-center justify-center"><FileViewer content={viewingDoc.contentRaw || ''} /></div></div></div>)}
        {editingDataDoc && (<DocumentDataModal doc={editingDataDoc} onClose={() => setEditingDataDoc(null)} onSave={(updatedDoc) => { if(isEditingOwner) { props.onDeleteDocument(updatedDoc.id); props.onAddDocument(updatedDoc); } else { handleUpdateTempDoc(updatedDoc); } setEditingDataDoc(null); }} aiConfig={props.activeAIConfig} onReanalyze={handleForceReanalyze} />)}
      </div>
    </div>
  );
};

export default RegistersView;