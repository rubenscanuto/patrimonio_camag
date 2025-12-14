import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Property, Document, Employee, PropertyTag, AIConfig, MonthlyIndexData, UserProfile, Owner, CloudAccount, CloudProvider, AIProvider, LogEntry, TrashItem, AddressComponents } from '../types';
import AssetManager from './AssetManager';
import TeamManager from './TeamManager';
import TagManagerView from './TagManagerView';
import SettingsView from './SettingsView';
import DocumentListPanel from './DocumentListPanel';
import { analyzeDocumentContent } from '../services/geminiService';
import { processDocumentForUpload } from '../services/documentProcessor';
import { extractTextFromPDF, isPDF } from '../services/pdfService';
import { Database, Users, Building2, Tag, Key, User, Plus, Trash2, Save, Cloud, ShieldCheck, Loader2, Search, MapPin, FileText, Download, Sparkles, ChevronDown, Camera, X, Briefcase, HelpCircle, Power, PowerOff, RefreshCcw, Eraser, Pencil, ExternalLink, CheckCircle, Lock, Image as ImageIcon } from 'lucide-react';
import { getNextId } from '../services/idService';

// Constants
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

// ... (ClearableInput, SearchableSelect, HelpTooltip are defined in SettingsView or used locally)
// For simplicity, reusing definitions here if they are not exported, but in a real app they would be shared.
// Assuming they are needed for the Owner form below.

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
            onFocus={(e) => { setIsOpen(true); setSearchTerm(''); e.currentTarget.select(); }}
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
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
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

interface RegistersViewProps {
  properties: Property[];
  onAddProperty: (prop: Property) => void;
  onUpdateProperties: (props: Property[]) => void;
  onEditProperty: (prop: Property) => void;
  onDeleteProperty: (id: string) => void;
  allDocuments: Document[];
  onAddDocument: (doc: Document) => void;
  onEditDocument: (doc: Document) => void;
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

type TabType = 'Assets' | 'Owners' | 'Team' | 'Tags' | 'Indices' | 'API' | 'Cloud' | 'Users';
type OwnerModalTab = 'Data' | 'Documents';

interface PendingFile {
  name: string;
  content: string;
  fileObject: File;
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
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  
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

  // FETCH CNAES ON INIT
  useEffect(() => {
      const fetchCnaes = async () => {
          try {
              const response = await fetch('https://servicodados.ibge.gov.br/api/v2/cnae/subclasses');
              if (response.ok) {
                  const data = await response.json();
                  setAllCnaes(data);
              }
          } catch(e) {
              console.error("Failed to fetch CNAEs", e);
          }
      };
      if (allCnaes.length === 0) fetchCnaes();
  }, []);

  const filteredCnaes = allCnaes.filter(c => {
      if (!cnaeInput) return false;
      const search = cnaeInput.toLowerCase();
      return c.id.includes(search) || c.descricao.toLowerCase().includes(search);
  }).slice(0, 50);

  useEffect(() => { if (addressForm.uf && addressForm.uf.length === 2) { const fetchCities = async () => { setIsLoadingCities(true); try { const response = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${addressForm.uf}`); if (response.ok) { const data = await response.json(); const cityNames = data.map((c: any) => c.nome); setAvailableCities(cityNames); } } catch (e) { console.error("Failed to fetch cities", e); setAvailableCities([]); } finally { setIsLoadingCities(false); } }; fetchCities(); } else { setAvailableCities([]); } }, [addressForm.uf]);
  
  const formatDocumentMask = (value: string) => { const v = value.replace(/\D/g, ''); if (v.length <= 11) { return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'); } else { return v.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'); } };
  const isPJ = (document?: string) => { const clean = document?.replace(/\D/g, '') || ''; return clean.length > 11; };
  const handleDeleteWithConfirm = (deleteFn: (id: string) => void, id: string, name: string, typeLabel: string = 'item') => { if (confirm(`Tem certeza que deseja excluir o ${typeLabel} "${name}"? Esta ação não pode ser desfeita.`)) { deleteFn(id); } };
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = formatDocumentMask(e.target.value); setNewOwner({ ...newOwner, document: val }); };
  const handleFillOwnerDataFromAI = (extractedData: any) => { if (!extractedData) return; setNewOwner(prev => { const updated: Partial<Owner> = { ...prev }; if (extractedData.name && !prev.name) updated.name = extractedData.name; if (extractedData.email && !prev.email) updated.email = extractedData.email; if (extractedData.phone && !prev.phone) updated.phone = extractedData.phone; if (extractedData.document && !prev.document) updated.document = formatDocumentMask(extractedData.document); if (extractedData.address && !prev.address) updated.address = extractedData.address; return updated; }); };
  
  const handleFetchCNPJ = async (e?: any) => {
      const isManual = e?.type === 'click' || e?.key === 'Enter';
      const cleanCnpj = newOwner.document?.replace(/\D/g, '');
      if (!cleanCnpj) { if (isManual) alert("Digite um CNPJ."); return; }
      if (cleanCnpj.length === 11) { if (isManual) alert("A busca automática está disponível apenas para CNPJ (14 dígitos)."); return; }
      if (cleanCnpj.length !== 14) { if (cleanCnpj.length > 0 && isManual) alert("Por favor, digite um CNPJ completo (14 dígitos)."); return; }

      setIsFetchingCnpj(true);
      let data: any = null;
      let source = '';

      // Tenta BrasilAPI primeiro
      try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
          if (response.ok) {
              data = await response.json();
              source = 'BrasilAPI';
          }
      } catch (err) {
          console.warn("Falha na BrasilAPI, tentando fallback...", err);
      }

      // Fallback para Minha Receita se BrasilAPI falhar
      if (!data) {
          try {
              const response = await fetch(`https://minhareceita.org/${cleanCnpj}`);
              if (response.ok) {
                  data = await response.json();
                  source = 'MinhaReceita';
              }
          } catch (err) {
              console.warn("Falha na MinhaReceita", err);
          }
      }

      if (data) {
          // Normaliza campos comuns entre as APIs
          const razao = data.razao_social || data.nome_fantasia;
          
          // Tratamento CNAEs (BrasilAPI retorna numbers, normaliza para string)
          const primaryCnae = data.cnae_fiscal && String(data.cnae_fiscal) !== '0' 
              ? [{ code: String(data.cnae_fiscal), text: data.cnae_fiscal_descricao, isPrimary: true }] 
              : [];
              
          const secCnaes = (data.cnaes_secundarios || [])
              .filter((sec: any) => sec.codigo && String(sec.codigo) !== '0')
              .map((sec: any) => ({ code: String(sec.codigo), text: sec.descricao, isPrimary: false }));

          // Tratamento QSA
          const qsa = data.qsa || [];
          const rep = qsa.length > 0 ? qsa[0] : null; // Pega o primeiro sócio como representante sugerido

          // Tratamento Telefone
          let phone = '';
          if (data.ddd_telefone_1 && data.telefone_1) {
              phone = `(${data.ddd_telefone_1}) ${data.telefone_1}`;
          } else if (data.ddd_telefone_1) {
              phone = data.ddd_telefone_1; // Algumas APIs retornam full string
          }

          setNewOwner(prev => ({
              ...prev,
              name: razao || prev.name,
              profession: undefined,
              email: (data.email || prev.email || '').toLowerCase(),
              phone: formatPhone(phone || prev.phone || ''),
              legalRepresentative: rep ? (rep.nome_socio || rep.nome) : '',
              legalRepresentativeCpf: rep ? formatDocumentMask(rep.cnpj_cpf_do_socio || '') : '',
              cnaes: [...primaryCnae, ...secCnaes]
          }));

          setAddressForm(prev => ({
              ...prev,
              cep: formatCEP(String(data.cep)),
              logradouro: data.logradouro,
              numero: data.numero,
              bairro: data.bairro,
              municipio: data.municipio,
              uf: data.uf,
              complemento: data.complemento,
              semNumero: data.numero === 'S/N'
          }));
      } else {
          if (isManual) alert("CNPJ não encontrado nas bases públicas (BrasilAPI/MinhaReceita). Verifique o número ou a conexão.");
      }
      setIsFetchingCnpj(false);
  };

  const handleDocumentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchCNPJ(e); } };

  const handleAddCnae = () => {
      let codeToAdd = '';
      let descToAdd = '';
      const separatorIndex = cnaeInput.indexOf(' - ');
      if (separatorIndex > 0) {
          codeToAdd = cnaeInput.substring(0, separatorIndex).trim();
          descToAdd = cnaeInput.substring(separatorIndex + 3).trim();
      } else {
          descToAdd = cnaeInput;
          codeToAdd = 'MANUAL';
      }
      if(descToAdd) {
          setNewOwner(prev => ({ ...prev, cnaes: [...(prev.cnaes || []), { code: codeToAdd, text: descToAdd, isPrimary: false }] }));
          setCnaeInput('');
      }
  };

  const handleRemoveCnae = (code: string) => { setNewOwner(prev => ({ ...prev, cnaes: (prev.cnaes || []).filter(c => c.code !== code) })); };
  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = formatCEP(e.target.value); setAddressForm({...addressForm, cep: val}); };
  const handleFetchCEP = async () => { const cep = addressForm.cep.replace(/\D/g, ''); if (cep.length !== 8) return; try { const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`); if (response.ok) { const data = await response.json(); setAddressForm(prev => ({ ...prev, logradouro: data.street || prev.logradouro, bairro: data.neighborhood || prev.bairro, municipio: data.city || prev.municipio, uf: data.state || prev.uf })); } } catch (e) { console.error("Erro ao buscar CEP", e); } };
  const handleCEPKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchCEP(); } };

  const handleDownload = (e: React.MouseEvent, doc: Document) => { e.stopPropagation(); if (!doc.contentRaw) { alert("Conteúdo indisponível."); return; } try { const link = document.createElement('a'); link.download = doc.name; if (doc.contentRaw.startsWith('data:')) link.href = doc.contentRaw; else { const blob = new Blob([doc.contentRaw], { type: 'text/plain' }); link.href = URL.createObjectURL(blob); } document.body.appendChild(link); link.click(); document.body.removeChild(link); } catch (e) { console.error(e); alert("Erro download."); } };

  const processFiles = (fileList: FileList | File[]) => {
      const files: File[] = Array.from(fileList);
      const newDocs: PendingFile[] = [];
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
              let content = ev.target?.result as string || '';

              // Special handling for PDF files - add a note that text extraction needs AI
              if (file.type === 'application/pdf') {
                  content = `[Arquivo PDF carregado: ${file.name}]\n\nNota: PDFs binários requerem análise com IA para extrair informações.\nClique em "Processar com IA" para analisar este documento.`;
              }

              newDocs.push({ name: file.name, content: content, fileObject: file });
              if (newDocs.length === files.length) setPendingFiles(prev => [...prev, ...newDocs]);
          };

          if(file.type.includes('text') || file.type.includes('json')) {
              reader.readAsText(file);
          } else {
              reader.readAsDataURL(file);
          }
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) processFiles(e.target.files); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); };
  const handlePaste = (e: React.ClipboardEvent) => { if (e.clipboardData.files && e.clipboardData.files.length > 0) processFiles(e.clipboardData.files); };

  const getOwnerDocuments = () => { if (isEditingOwner && newOwner.id) return props.allDocuments.filter(d => d.relatedOwnerId === newOwner.id); return tempDocs; };
  const handleOpenEditOwner = (owner: Owner) => { setNewOwner({...owner}); setIsEditingOwner(true); setOwnerPhotoPreview(owner.photoUrl || ''); setTempDocs([]); setAddressForm({ cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: '' }); if(owner.address) { const parts = owner.address.split(','); if(parts.length > 0) setAddressForm(prev => ({ ...prev, logradouro: parts[0] })); } setShowOwnerModal(true); };

  const handleUploadAction = async (processWithAI: boolean) => {
      if (pendingFiles.length === 0) return;
      setIsAnalyzingDoc(true);
      setAiSummary(null);

      for (const file of pendingFiles) {
          let aiResult: any = undefined;
          let extractedOwner: Partial<Owner> | null = null;

          if (processWithAI && props.activeAIConfig) {
              try {
                  console.log(`Processando documento: ${file.name}`);

                  let textToAnalyze = file.content;

                  if (file.content.startsWith('data:')) {
                      console.log('Arquivo detectado como binário (PDF/Imagem)');

                      if (isPDF(file.name)) {
                          try {
                              console.log('Extraindo texto do PDF...');
                              textToAnalyze = await extractTextFromPDF(file.content);
                              console.log('Texto extraído do PDF:', textToAnalyze.substring(0, 200));
                          } catch (pdfError) {
                              console.error('Erro ao extrair texto do PDF:', pdfError);
                              textToAnalyze = `Arquivo PDF: ${file.name}\n\nNão foi possível extrair texto automaticamente. Documento anexado para referência.`;
                          }
                      } else {
                          textToAnalyze = `Arquivo: ${file.name}\nTipo: Imagem\n\nEste é um documento de identificação ou comprovante. Extraia informações de proprietário se possível com base no nome do arquivo.`;
                      }
                  } else if (file.content.length > 5000) {
                      textToAnalyze = file.content.substring(0, 5000);
                      console.log(`Texto longo detectado, usando primeiros 5000 caracteres`);
                  }

                  console.log('Enviando para análise com IA...');
                  setAiSummary('Analisando documento... Por favor aguarde.');

                  const analysis = await analyzeDocumentContent(
                      textToAnalyze,
                      props.activeAIConfig.apiKey,
                      'OwnerCreation',
                      props.activeAIConfig.provider,
                      props.activeAIConfig.modelName
                  );

                  console.log('Análise recebida:', analysis);

                  aiResult = {
                      category: analysis.category as any,
                      summary: analysis.summary,
                      riskLevel: analysis.riskLevel as any,
                      keyDates: analysis.keyDates as any,
                      monetaryValues: analysis.monetaryValues as any
                  };

                  if (analysis.extractedOwnerData) {
                      extractedOwner = analysis.extractedOwnerData;
                      console.log('Dados extraídos do proprietário:', extractedOwner);
                  }

                  if (analysis.summary) {
                      setAiSummary(analysis.summary);
                  } else {
                      setAiSummary('Análise concluída, mas nenhum resumo foi gerado.');
                  }

              } catch(e: any) {
                  console.error('Erro ao analisar documento:', e);
                  const errorMsg = `Erro na análise: ${e.message || 'Verifique a chave de API e tente novamente'}`;
                  setAiSummary(errorMsg);
                  aiResult = {
                      category: 'Uncategorized',
                      summary: errorMsg,
                      riskLevel: 'Low',
                      keyDates: [],
                      monetaryValues: []
                  };
              }
          }

          if (ownerModalTab === 'Data' && extractedOwner) {
              setNewOwner(prev => ({
                  ...prev,
                  name: prev.name || extractedOwner?.name || prev.name,
                  document: prev.document || extractedOwner?.document || prev.document,
                  email: (prev.email || extractedOwner?.email || prev.email || '').toLowerCase(),
                  phone: formatPhone(prev.phone || extractedOwner?.phone || prev.phone || ''),
                  address: prev.address || extractedOwner?.address || prev.address
              }));
              alert("Dados extraídos e preenchidos no formulário.");
          } else {
              const newDoc: Document = {
                  id: getNextId('Document'),
                  name: file.name,
                  category: aiResult?.category || 'Legal',
                  uploadDate: new Date().toLocaleDateString('pt-BR'),
                  summary: aiResult?.summary || 'Upload manual (sem análise de IA).',
                  contentRaw: file.content,
                  aiAnalysis: aiResult
              };

              if (isEditingOwner && newOwner.id) {
                  props.onAddDocument({ ...newDoc, relatedOwnerId: newOwner.id });
              } else {
                  setTempDocs(prev => [...prev, newDoc]);
              }
          }
      }

      setPendingFiles([]);
      setIsAnalyzingDoc(false);
  };

  const handleAnalyzeDocument = async (doc: Document) => {
      if (!props.activeAIConfig) {
          alert("Configure uma chave de API ativa nas Configurações primeiro.");
          return;
      }

      if (doc.aiAnalysis) {
          alert("Este documento já foi analisado.");
          return;
      }

      setAnalyzingDocId(doc.id);

      try {
          const content = doc.contentRaw || doc.summary || '';
          const analysis = await analyzeDocumentContent(
              content.substring(0, 10000),
              props.activeAIConfig.apiKey,
              'OwnerCreation',
              props.activeAIConfig.provider,
              props.activeAIConfig.modelName
          );

          const updatedDoc: Document = {
              ...doc,
              summary: analysis.summary,
              aiAnalysis: {
                  riskLevel: analysis.riskLevel,
                  keyDates: analysis.keyDates,
                  monetaryValues: analysis.monetaryValues
              }
          };

          props.onEditDocument(updatedDoc);
          alert("Documento analisado com sucesso!");
      } catch (error) {
          console.error("Erro ao analisar documento:", error);
          alert("Erro ao analisar documento. Verifique sua chave de API.");
      } finally {
          setAnalyzingDocId(null);
      }
  };

  const handleSaveOwner = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newOwner.name) return;
      const ownerId = newOwner.id || getNextId('Owner');
      const ownerToSave: Owner = { ...newOwner as Owner, id: ownerId, photoUrl: ownerPhotoPreview, address: `${addressForm.logradouro}, ${addressForm.numero} ${addressForm.complemento} - ${addressForm.bairro}, ${addressForm.municipio}/${addressForm.uf}` };
      if (isEditingOwner) props.onEditOwner(ownerToSave); else { props.onAddOwner(ownerToSave); tempDocs.forEach(doc => props.onAddDocument({ ...doc, relatedOwnerId: ownerId })); }
      setShowOwnerModal(false); setNewOwner({}); setTempDocs([]); setPendingFiles([]); setAiSummary(null); setOwnerPhotoPreview('');
    };

  const handleDeleteOwnerDoc = (e: React.MouseEvent, docId: string, docName: string) => { e.stopPropagation(); if (confirm(`Excluir ${docName}?`)) { if (isEditingOwner) props.onDeleteDocument(docId); else setTempDocs(prev => prev.filter(d => d.id !== docId)); } };
  const handleMainSaveButton = async (e: React.MouseEvent) => { e.preventDefault(); if (ownerModalTab === 'Documents' && pendingFiles.length > 0) await handleUploadAction(false); handleSaveOwner(e as any); };
  const handleOwnerPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = (ev) => { if(ev.target?.result) setOwnerPhotoPreview(ev.target.result as string); }; reader.readAsDataURL(file); } };
  const getSaveButtonText = () => { if (ownerModalTab === 'Documents') { if (pendingFiles.length === 0) return isEditingOwner ? 'Salvar Alterações' : 'Concluir Cadastro'; return pendingFiles.length === 1 ? 'Salvar Documento & Concluir' : 'Salvar Documentos & Concluir'; } return isEditingOwner ? 'Salvar Proprietário' : 'Salvar Proprietário'; };
  
  const menuItems = [
    { id: 'Assets', label: 'Imóveis', icon: Building2 },
    { id: 'Owners', label: 'Proprietários', icon: User },
    { id: 'Team', label: 'Equipe', icon: Users },
    { id: 'Tags', label: 'Etiquetas', icon: Tag },
    { id: 'Indices', label: 'Base de Índices', icon: Database },
    { id: 'API', label: 'Chaves de API', icon: Key },
    { id: 'Cloud', label: 'Contas na Nuvem', icon: Cloud },
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
               onClick={() => { setActiveTab(item.id as TabType); }}
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
               onEditDocument={props.onEditDocument}
               onDeleteDocument={(id) => props.onDeleteDocument(id)}
               tags={props.tags}
               onAddTag={props.onAddTag}
               onDeleteTag={props.onDeleteTag}
               owners={props.owners}
               onAddOwner={props.onAddOwner}
               onEditOwner={props.onEditOwner}
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
           <TagManagerView tags={props.tags} onAddTag={props.onAddTag} onDeleteTag={props.onDeleteTag} />
        )}

        {/* SETTINGS (Indices, API, Cloud, Users) - Centralized in SettingsView */}
        {(activeTab === 'Indices' || activeTab === 'API' || activeTab === 'Cloud' || activeTab === 'Users') && (
            <div className="p-6">
                <SettingsView 
                    userProfile={props.userProfile}
                    onUpdateProfile={props.onUpdateProfile}
                    aiConfigs={props.aiConfigs}
                    onAddAIConfig={props.onAddAIConfig}
                    onDeleteAIConfig={props.onDeleteAIConfig}
                    onSetActiveAIConfig={props.onSetActiveAIConfig}
                    indicesDatabase={props.indicesDatabase}
                    onForceUpdateIndices={props.onForceUpdateIndices}
                    isUpdatingIndices={props.isUpdatingIndices}
                    initialTab={activeTab === 'Users' ? 'Profile' : activeTab === 'API' ? 'AI' : activeTab as any}
                    hideSidebar={true}
                    cloudAccounts={props.cloudAccounts}
                    onAddCloudAccount={props.onAddCloudAccount}
                    onDeleteCloudAccount={props.onDeleteCloudAccount}
                />
            </div>
        )}

        {/* OWNERS (FIXED) */}
        {activeTab === 'Owners' && (
            <div className="p-6">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">Proprietários</h2>
                        <p className="text-slate-500">Gestão de pessoas físicas e jurídicas detentoras de patrimônio.</p>
                    </div>
                    <button 
                        onClick={() => { setShowOwnerModal(true); setIsEditingOwner(false); setNewOwner({}); setTempDocs([]); setPendingFiles([]); setAiSummary(null); setOwnerPhotoPreview(''); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus size={18}/> Novo Proprietário
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {props.owners.map(owner => (
                        <div key={owner.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        {owner.photoUrl ? (
                                            <img src={owner.photoUrl} alt={owner.name} className="w-12 h-12 rounded-full object-cover border border-slate-200"/>
                                        ) : (
                                            <div className={`p-3 rounded-full ${isPJ(owner.document) ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {isPJ(owner.document) ? <Building2 size={24}/> : <User size={24}/>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleOpenEditOwner(owner)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50"><Pencil size={16}/></button>
                                        <button onClick={() => handleDeleteWithConfirm(props.onDeleteOwner, owner.id, owner.name, 'Proprietário')} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 truncate" title={owner.name}>{owner.name}</h3>
                                <p className="text-slate-500 text-sm font-mono mb-4">{owner.document || 'Sem documento'}</p>
                                <p className="text-xs text-slate-400 font-mono mb-1">ID: {owner.id}</p>
                                
                                <div className="space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-3">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-slate-400"/>
                                        <span className="truncate">{owner.address || 'Endereço não cadastrado'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-slate-400"/>
                                        <span>{props.allDocuments.filter(d => d.relatedOwnerId === owner.id).length} documentos vinculados</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {props.owners.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <User size={48} className="mx-auto mb-3 opacity-20"/>
                            <p>Nenhum proprietário cadastrado.</p>
                        </div>
                    )}
                </div>

                {/* MODAL DE PROPRIETÁRIOS */}
                {showOwnerModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className={`bg-white rounded-xl w-full ${aiSummary ? 'max-w-6xl' : 'max-w-4xl'} h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95`}>
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                                <h3 className="text-xl font-bold text-slate-800">
                                    {isEditingOwner ? `Editar: ${newOwner.name}` : 'Novo Proprietário'}
                                </h3>
                                <button onClick={() => setShowOwnerModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={24}/></button>
                            </div>

                            <div className="flex border-b border-slate-200 px-6 shrink-0">
                                <button onClick={() => setOwnerModalTab('Data')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ownerModalTab === 'Data' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}>
                                    <User size={16}/> Dados Cadastrais
                                </button>
                                <button onClick={() => setOwnerModalTab('Documents')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ownerModalTab === 'Documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}>
                                    <FileText size={16}/> Documentos ({docCount})
                                </button>
                            </div>

                            <div className="flex flex-1 overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                                    {ownerModalTab === 'Data' ? (
                                        <form id="ownerForm" className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                                            
                                            {/* Photo Upload Section */}
                                            <div className="flex justify-center mb-4">
                                                <div className="relative group">
                                                    <input type="file" accept="image/*" className="hidden" ref={ownerPhotoInputRef} onChange={handleOwnerPhotoSelect} />
                                                    <div 
                                                        onClick={() => ownerPhotoInputRef.current?.click()}
                                                        className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50 hover:bg-slate-100 transition-colors"
                                                    >
                                                        {ownerPhotoPreview ? (
                                                            <img src={ownerPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="text-slate-400 flex flex-col items-center gap-1">
                                                                <Camera size={24} />
                                                                <span className="text-[10px]">Foto</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {ownerPhotoPreview && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => setOwnerPhotoPreview('')}
                                                            className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-sm"
                                                        >
                                                            <X size={12}/>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Main Info */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="col-span-full">
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">CPF / CNPJ <span className="font-normal text-xs text-slate-500">(Pressione Enter para buscar PJ)</span></label>
                                                    <div className="relative">
                                                        <ClearableInput 
                                                            className="w-full border border-slate-300 rounded p-2 font-mono pr-20" 
                                                            value={newOwner.document || ''} 
                                                            onChange={handleDocumentChange} 
                                                            onKeyDown={handleDocumentKeyDown}
                                                            onBlur={(e) => handleFetchCNPJ(e)}
                                                            onClear={() => setNewOwner({...newOwner, document: ''})} 
                                                            placeholder="000.000.000-00"
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => handleFetchCNPJ(e)} 
                                                            disabled={isFetchingCnpj}
                                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                                                            title="Buscar na Receita Federal"
                                                        >
                                                            <Search size={18}/>
                                                        </button>
                                                        {isFetchingCnpj && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                <Loader2 className="animate-spin text-indigo-600" size={16}/>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="col-span-full">
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo / Razão Social</label>
                                                    <ClearableInput required className="w-full border border-slate-300 rounded p-2" 
                                                        value={newOwner.name || ''} onChange={e => setNewOwner({...newOwner, name: e.target.value})} onClear={() => setNewOwner({...newOwner, name: ''})} />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1">{isPJ(newOwner.document) ? 'Inscrição Estadual' : 'RG / Identidade'}</label>
                                                    <ClearableInput className="w-full border border-slate-300 rounded p-2" 
                                                        value={newOwner.rg || ''} onChange={e => setNewOwner({...newOwner, rg: e.target.value})} onClear={() => setNewOwner({...newOwner, rg: ''})} />
                                                </div>

                                                {isPJ(newOwner.document) && (
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Inscrição Municipal</label>
                                                        <ClearableInput className="w-full border border-slate-300 rounded p-2" 
                                                            value={newOwner.municipalRegistration || ''} onChange={e => setNewOwner({...newOwner, municipalRegistration: e.target.value})} onClear={() => setNewOwner({...newOwner, municipalRegistration: ''})} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* CNAE Section for PJ */}
                                            {isPJ(newOwner.document) && (
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                    <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2"><Briefcase size={16}/> Atividades Econômicas (CNAE)</h4>
                                                    
                                                    {/* List Existing CNAEs */}
                                                    {newOwner.cnaes && newOwner.cnaes.length > 0 && (
                                                        <div className="space-y-2 mb-4">
                                                            {newOwner.cnaes.map((cnae, idx) => (
                                                                <div key={idx} className={`flex justify-between items-start text-sm p-2 rounded ${cnae.isPrimary ? 'bg-indigo-50 border border-indigo-100' : 'bg-white border border-slate-100'}`}>
                                                                    <div>
                                                                        <span className="font-mono font-bold mr-2">{cnae.code}</span>
                                                                        <span className="text-slate-700">{cnae.text}</span>
                                                                        {cnae.isPrimary && <span className="ml-2 text-[10px] bg-indigo-600 text-white px-1.5 rounded">Principal</span>}
                                                                    </div>
                                                                    <button type="button" onClick={() => handleRemoveCnae(cnae.code)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Unified CNAE Input with Autocomplete */}
                                                    <div className="flex gap-2 items-end relative">
                                                        <div className="flex-1 relative">
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Buscar Atividade</label>
                                                            <input 
                                                                type="text" 
                                                                className="w-full border border-slate-300 rounded p-2 text-sm" 
                                                                value={cnaeInput} 
                                                                onChange={e => {
                                                                    setCnaeInput(e.target.value);
                                                                    setShowCnaeDropdown(true);
                                                                }}
                                                                onFocus={() => setShowCnaeDropdown(true)}
                                                                onBlur={() => setTimeout(() => setShowCnaeDropdown(false), 200)}
                                                                placeholder="Busque por código ou atividade (Ex: 6201 - Desenvolvimento)"
                                                            />
                                                            {showCnaeDropdown && cnaeInput && filteredCnaes.length > 0 && (
                                                                <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                                                    {filteredCnaes.map((c) => (
                                                                        <li 
                                                                            key={c.id} 
                                                                            onClick={() => {
                                                                                setCnaeInput(`${c.id} - ${c.descricao}`);
                                                                                setShowCnaeDropdown(false);
                                                                            }}
                                                                            className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0"
                                                                        >
                                                                            <span className="font-mono font-bold text-indigo-600 mr-2">{c.id}</span>
                                                                            {c.descricao}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={handleAddCnae} 
                                                            className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 mb-[1px] disabled:opacity-50"
                                                            disabled={!cnaeInput}
                                                        >
                                                            <Plus size={18}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Representative Section for PJ */}
                                            {isPJ(newOwner.document) && (
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                    <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2"><User size={16}/> Representante Legal</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Representante</label>
                                                            <ClearableInput className="w-full border border-slate-300 rounded p-2 text-sm" 
                                                                value={newOwner.legalRepresentative || ''} onChange={e => setNewOwner({...newOwner, legalRepresentative: e.target.value})} onClear={() => setNewOwner({...newOwner, legalRepresentative: ''})} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-bold text-slate-700 mb-1">CPF do Representante</label>
                                                            <ClearableInput className="w-full border border-slate-300 rounded p-2 text-sm font-mono" 
                                                                value={newOwner.legalRepresentativeCpf || ''} onChange={e => setNewOwner({...newOwner, legalRepresentativeCpf: formatDocumentMask(e.target.value)})} onClear={() => setNewOwner({...newOwner, legalRepresentativeCpf: ''})} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Address Fields */}
                                            <div className="pt-2 border-t border-slate-200">
                                                <h4 className="font-bold text-sm text-slate-600 uppercase tracking-wide mb-3">Endereço</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">CEP</label>
                                                        <div className="relative">
                                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={addressForm.cep} onChange={handleCEPChange} onBlur={handleFetchCEP} onKeyDown={handleCEPKeyDown} />
                                                            <button type="button" onClick={handleFetchCEP} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"><Search size={14}/></button>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Logradouro</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={addressForm.logradouro} onChange={e => setAddressForm({...addressForm, logradouro: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Número</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={addressForm.numero} onChange={e => setAddressForm({...addressForm, numero: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Bairro</label>
                                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={addressForm.bairro} onChange={e => setAddressForm({...addressForm, bairro: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Estado (UF)</label>
                                                        <div className="relative">
                                                            <SearchableSelect 
                                                                options={BRAZIL_STATES.map(uf => ({ value: uf, label: uf }))}
                                                                value={addressForm.uf}
                                                                onChange={(val) => setAddressForm({...addressForm, uf: val, municipio: ''})}
                                                                placeholder="UF"
                                                                className="border-slate-300"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Município</label>
                                                        <div className="relative">
                                                            <input 
                                                                type="text" 
                                                                className="w-full border border-slate-300 rounded p-2 text-sm" 
                                                                value={addressForm.municipio} 
                                                                onChange={e => {
                                                                    setAddressForm({...addressForm, municipio: e.target.value});
                                                                    setShowCityDropdown(true);
                                                                }}
                                                                onFocus={() => setShowCityDropdown(true)}
                                                                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                                                                placeholder={addressForm.uf ? "Selecione a cidade" : "Selecione o estado primeiro"}
                                                                disabled={!addressForm.uf}
                                                            />
                                                            {isLoadingCities && <div className="absolute right-2 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-indigo-600" size={14}/></div>}
                                                            {showCityDropdown && availableCities.length > 0 && addressForm.uf && (
                                                                <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                                    {availableCities.filter(c => c.toLowerCase().includes(addressForm.municipio.toLowerCase())).map(city => (
                                                                        <li key={city} onClick={() => setAddressForm({...addressForm, municipio: city})} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 hover:text-indigo-600">{city}</li>
                                                                    ))}
                                                                    {availableCities.filter(c => c.toLowerCase().includes(addressForm.municipio.toLowerCase())).length === 0 && (
                                                                        <li className="px-3 py-2 text-slate-400 text-xs italic">Nenhuma cidade encontrada</li>
                                                                    )}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-200">
                                                <h4 className="font-bold text-sm text-slate-600 uppercase tracking-wide mb-3">Contato & Info Adicional</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">E-mail</label>
                                                        <ClearableInput type="email" className="w-full border border-slate-300 rounded p-2 text-sm" 
                                                            value={newOwner.email || ''} onChange={e => setNewOwner({...newOwner, email: e.target.value.toLowerCase()})} onClear={() => setNewOwner({...newOwner, email: ''})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
                                                        <ClearableInput type="tel" className="w-full border border-slate-300 rounded p-2 text-sm" 
                                                            value={newOwner.phone || ''} onChange={e => setNewOwner({...newOwner, phone: formatPhone(e.target.value)})} onClear={() => setNewOwner({...newOwner, phone: ''})} />
                                                    </div>
                                                    
                                                    {/* Conditional Fields for PF Only */}
                                                    {!isPJ(newOwner.document) && (
                                                        <>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Profissão / Atividade</label>
                                                                <div className="relative">
                                                                    <ClearableInput 
                                                                        type="text" 
                                                                        className="w-full border border-slate-300 rounded p-2 text-sm" 
                                                                        value={newOwner.profession || ''} 
                                                                        onChange={e => {
                                                                            setNewOwner({...newOwner, profession: e.target.value});
                                                                            setShowProfessionDropdown(true);
                                                                        }} 
                                                                        onFocus={() => setShowProfessionDropdown(true)}
                                                                        onBlur={() => setTimeout(() => setShowProfessionDropdown(false), 200)}
                                                                        onClear={() => setNewOwner({...newOwner, profession: ''})} 
                                                                    />
                                                                    {showProfessionDropdown && newOwner.profession && (
                                                                        <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                                            {COMMON_PROFESSIONS.filter(p => p.toLowerCase().includes((newOwner.profession || '').toLowerCase())).map(prof => (
                                                                                <li key={prof} onClick={() => setNewOwner({...newOwner, profession: prof})} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700">{prof}</li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Estado Civil</label>
                                                                <select className="w-full border border-slate-300 rounded p-2 text-sm bg-white" 
                                                                    value={newOwner.maritalStatus || ''} onChange={e => setNewOwner({...newOwner, maritalStatus: e.target.value})}>
                                                                    <option value="">Selecione...</option>
                                                                    <option value="Solteiro(a)">Solteiro(a)</option>
                                                                    <option value="Casado(a)">Casado(a)</option>
                                                                    <option value="Divorciado(a)">Divorciado(a)</option>
                                                                    <option value="Viúvo(a)">Viúvo(a)</option>
                                                                    <option value="União Estável">União Estável</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <DocumentListPanel
                                          documents={props.allDocuments}
                                          relatedOwnerId={newOwner.id}
                                          onAddDocument={props.onAddDocument}
                                          onEditDocument={props.onEditDocument}
                                          onDeleteDocument={props.onDeleteDocument}
                                          aiConfig={props.activeAIConfig}
                                          onFillOwnerData={handleFillOwnerDataFromAI}
                                        />
                                    )}
                                </div>

                                {/* Side-by-side AI Summary */}
                                {aiSummary && (
                                    <div className="w-80 bg-indigo-50 border-l border-indigo-100 p-6 overflow-y-auto shrink-0">
                                        <div className="flex items-center gap-2 mb-4 text-indigo-700 font-bold">
                                            <Sparkles size={20} />
                                            <h4>Resumo Inteligente</h4>
                                        </div>
                                        <div className="prose prose-sm text-indigo-900 prose-headings:text-indigo-800">
                                            <p className="text-sm italic mb-4">
                                                Dados extraídos automaticamente. Os campos vazios foram preenchidos com base nos documentos.
                                            </p>
                                            <div className="bg-white p-4 rounded-lg shadow-sm text-sm whitespace-pre-wrap border border-indigo-100">
                                                {aiSummary}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-white rounded-b-xl flex justify-between items-center gap-3 shrink-0">
                                <div>
                                    {ownerModalTab === 'Documents' && (
                                        <button
                                            onClick={() => setOwnerModalTab('Data')}
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <ChevronDown size={18} className="rotate-90"/> Voltar aos Dados Cadastrais
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowOwnerModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                    <button
                                        onClick={handleMainSaveButton}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={18}/> {getSaveButtonText()}
                                    </button>
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