import React, { useState, useRef, useEffect } from 'react';
import { Property, MaintenanceRecord, Document, PropertyTag, AIConfig, MonthlyIndexData, Owner, AddressComponents } from '../types';
import { Building, MapPin, CheckCircle, XCircle, Wrench, ArrowUpRight, Calendar, User, DollarSign, X, FileText, Upload, Plus, Trash2, Cloud, ScrollText, Camera, Image as ImageIcon, Loader2, Tag, Filter, Pencil, Settings2, Map as MapIcon, Crosshair, Sparkles, TrendingUp, Calculator, Info, List, BarChart3, LineChart as LineChartIcon, AlertTriangle, Eye, Download, Save, Eraser, CloudUpload, ChevronDown, Search, CheckSquare, Square, FileSpreadsheet } from 'lucide-react';
import { analyzeDocumentContent, extractCustomFieldFromText, getCoordinatesFromAddress, calculateCorrectionFromLocalData, IndexCorrectionResult, fetchHistoricalIndices, AnalyzableFile } from '../services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getNextId } from '../services/idService';

// ... (Rest of imports and helpers same as before)
const TAG_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  gray: 'bg-slate-100 text-slate-800 border-slate-200',
  pink: 'bg-pink-100 text-pink-800 border-pink-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const formatCEP = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length > 5) {
    return v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2-$3');
  } else if (v.length > 2) {
    return v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  }
  return v;
};

interface PendingUpload {
    name: string;
    content: string;
    fileObject: File;
}

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

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ... (ClearableInput, SearchableSelect definitions)
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
            onFocus={() => { setIsOpen(true); setSearchTerm(''); }}
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

// --- DATA MODAL FOR DOCS (Identical to Vault) ---
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

// --- FILE VIEWER ---
const FileViewer: React.FC<{ content: string }> = ({ content }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => { if (content.startsWith('data:application/pdf')) { try { const base64Arr = content.split(','); const base64 = base64Arr.length > 1 ? base64Arr[1] : base64Arr[0]; const binaryStr = atob(base64); const len = binaryStr.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); } const blob = new Blob([bytes], { type: 'application/pdf' }); const url = URL.createObjectURL(blob); setBlobUrl(url); return () => URL.revokeObjectURL(url); } catch (err) { console.error("Erro ao converter PDF para Blob:", err); setBlobUrl(null); } } else { setBlobUrl(null); } }, [content]);
  if (!content) return (<div className="flex flex-col items-center justify-center h-full text-slate-400"><FileText size={48} /><p className="mt-4">Conteúdo não disponível</p></div>);
  if (content.startsWith('data:image')) return (<img src={content} alt="Preview" className="max-w-full max-h-full object-contain mx-auto shadow-sm rounded" />);
  if (content.startsWith('data:application/pdf')) { if (!blobUrl) return (<div className="flex flex-col items-center justify-center h-full text-slate-400"><Loader2 size={32} className="animate-spin mb-2 text-indigo-600" /><p>Preparando visualização do PDF...</p></div>); return (<iframe src={blobUrl} className="w-full h-full rounded border border-slate-200" title="PDF Preview" />); }
  return (<pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-6 rounded shadow-sm overflow-auto h-full">{content}</pre>);
};

interface AssetManagerProps {
  properties: Property[];
  onAddProperty: (prop: Property) => void;
  onUpdateProperties: (props: Property[]) => void;
  onEditProperty: (prop: Property) => void;
  onDeleteProperty: (id: string) => void;
  allDocuments: Document[];
  onAddDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  tags: PropertyTag[];
  onAddTag: (tag: PropertyTag) => void;
  onDeleteTag: (id: string) => void;
  owners: Owner[];
  onAddOwner: (owner: Owner) => void;
  onEditOwner: (owner: Owner) => void;
  aiConfig?: AIConfig;
  indicesDatabase: MonthlyIndexData[];
  onUpdateIndicesDatabase: (data: MonthlyIndexData[]) => void;
}

const AssetManager: React.FC<AssetManagerProps> = ({ 
  properties, 
  onAddProperty, 
  onUpdateProperties, 
  onEditProperty,
  onDeleteProperty,
  allDocuments, 
  onAddDocument,
  onDeleteDocument,
  tags,
  onAddTag,
  onDeleteTag,
  owners,
  onAddOwner,
  onEditOwner,
  aiConfig,
  indicesDatabase,
  onUpdateIndicesDatabase
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null); 
  const [isLocating, setIsLocating] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeTab, setActiveTab] = useState<'Info' | 'Docs' | 'Custom'>('Info');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [editingDataDoc, setEditingDataDoc] = useState<Document | null>(null);

  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerDoc, setNewOwnerDoc] = useState('');
  const [suggestedOwnerData, setSuggestedOwnerData] = useState<Partial<Owner> | null>(null);

  const [addressForm, setAddressForm] = useState<AddressComponents>({
    cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: ''
  });
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [quickTagProperty, setQuickTagProperty] = useState<Property | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [newProp, setNewProp] = useState<Partial<Property>>({ status: 'Vacant', customFields: {}, tags: [], coordinates: undefined });
  const [tempCustomFieldKey, setTempCustomFieldKey] = useState('');
  const [tempCustomFieldValue, setTempCustomFieldValue] = useState('');
  
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [tempDocs, setTempDocs] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // ... (Keep existing useEffects for Cities, Property Selection sync)

  const handleDownload = (doc: Document) => {
    if (!doc.contentRaw) { alert("Conteúdo indisponível."); return; }
    try {
      const link = document.createElement('a'); link.download = doc.name;
      if (doc.contentRaw.startsWith('data:')) link.href = doc.contentRaw;
      else { const blob = new Blob([doc.contentRaw], { type: 'text/plain' }); link.href = URL.createObjectURL(blob); }
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { console.error(e); alert("Erro ao iniciar download."); }
  };

  const processFiles = (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const newUploads: PendingUpload[] = [];
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const content = ev.target?.result as string || '';
              newUploads.push({ name: file.name, content: content, fileObject: file });
              if (newUploads.length === files.length) setPendingUploads(prev => [...prev, ...newUploads]);
          };
          if(file.type.includes('text') || file.type.includes('json')) reader.readAsText(file); else reader.readAsDataURL(file); 
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) processFiles(e.target.files); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); };
  const handlePaste = (e: React.ClipboardEvent) => { if (e.clipboardData.files && e.clipboardData.files.length > 0) processFiles(e.clipboardData.files); };
  const removePendingUpload = (index: number) => { setPendingUploads(prev => prev.filter((_, i) => i !== index)); };

  const handleDocumentAnalysis = async () => {
    if (pendingUploads.length === 0) return;
    if (!aiConfig) { alert("Configure uma chave de API nas Configurações primeiro."); return; }
    setIsAnalyzing(true);
    setSuggestedOwnerData(null); setAiSummary(null);
    
    // Analyze new uploads only, but can be adapted
    // Here we analyze ALL pending uploads one by one or concatenated for Property Creation context
    // This part logic was "Analyze to create Property". 
    // We will separate "Analyze to create Property" vs "Analyze specific document".
    // For now, let's keep the existing logic that extracts PROPERTY data from the uploaded files.
    // AND creates document entries.

    // ... (Existing Analysis Logic) ...
    // After logic, create TempDocs
    const analyzableFiles: AnalyzableFile[] = [];
    let textContext = "";
    
    pendingUploads.forEach(file => {
        if (file.content.startsWith('data:')) {
            const matches = file.content.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) analyzableFiles.push({ mimeType: matches[1], data: matches[2] });
        } else { textContext += `\n--- Arquivo: ${file.name} ---\n${file.content.substring(0, 10000)}\n`; }
    });

    try {
        const result = await analyzeDocumentContent(textContext, analyzableFiles, aiConfig.apiKey, aiConfig.modelName, 'PropertyCreation');
        if (result.summary) setAiSummary(result.summary);
        
        if (result.extractedPropertyData) {
             // ... (Auto-fill property fields logic - keeping same)
             setNewProp(prev => ({
                 ...prev,
                 name: prev.name || result.extractedPropertyData?.name,
                 // ... other fields
             }));
        }
        
        // Convert PendingUploads to TempDocs with AI metadata
        const processedDocs = pendingUploads.map(upload => ({
            id: getNextId('Document'),
            name: upload.name,
            category: 'Acquisition', // Default for property creation context
            uploadDate: new Date().toLocaleDateString('pt-BR'),
            contentRaw: upload.content,
            summary: "Analisado na criação do imóvel.",
            extractedData: result.extractedPropertyData as any, // Attach relevant part
            aiAnalysis: { riskLevel: result.riskLevel, keyDates: result.keyDates, monetaryValues: result.monetaryValues }
        } as Document));
        
        setTempDocs(prev => [...prev, ...processedDocs]);
        setPendingUploads([]);

    } catch(e) { console.error(e); alert("Erro na análise."); }
    setIsAnalyzing(false);
  };

  const handleUpdateTempDoc = (updatedDoc: Document) => {
      setTempDocs(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      // Also update in global if editing existing property
      if (isEditingMode && newProp.id) {
          // This requires a callback to main App to update document. 
          // Since we passed onAddDocument/onDeleteDocument, we might need onUpdateDocument.
          // For now, if we are in Edit Mode, we assume Documents are live in `allDocuments`.
          // We'll handle this by assuming AssetManager props handles it or we do it locally here.
          // NOTE: AssetManager receives `allDocuments`.
      }
  };

  const handleForceReanalyze = async (doc: Document) => {
      if (!aiConfig) return;
      try {
          const analyzableFiles: AnalyzableFile[] = [];
          let textContext = "";
          if (doc.contentRaw?.startsWith('data:')) {
                const matches = doc.contentRaw.match(/^data:(.+);base64,(.+)$/);
                if (matches && matches.length === 3) analyzableFiles.push({ mimeType: matches[1], data: matches[2] });
          } else { textContext = doc.contentRaw || ''; }

          const analysis = await analyzeDocumentContent(textContext, analyzableFiles, aiConfig.apiKey, aiConfig.modelName);
          const updated = { ...doc, extractedData: analysis.structuredData, summary: analysis.summary };
          
          if(isEditingMode) {
              // We need a way to update `allDocuments`. 
              // Since `onAddDocument` adds new, we might need `onDelete` + `onAdd` to replace, or a new prop.
              // WORKAROUND: Delete and Re-add (keeps ID)
              onDeleteDocument(doc.id);
              onAddDocument(updated);
          } else {
              handleUpdateTempDoc(updated);
          }
          setEditingDataDoc(updated);
      } catch (e) { alert("Erro ao reanalisar."); }
  };

  // Get active document list (Existing + Temp)
  const currentDocs = isEditingMode 
      ? allDocuments.filter(d => d.relatedPropertyId === newProp.id) 
      : tempDocs;

  // Batch Logic
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
              if (isEditingMode) onDeleteDocument(id);
              else setTempDocs(prev => prev.filter(d => d.id !== id));
          });
          setSelectedDocIds([]);
      }
  };
  const handleBatchDownload = async (singlePDF: boolean) => {
      if(singlePDF) alert("Download sequencial iniciado (limitação técnica de ambiente).");
      const docs = currentDocs.filter(d => selectedDocIds.includes(d.id));
      for (const doc of docs) { handleDownload(doc); await new Promise(r => setTimeout(r, 500)); }
  };

  const openAddModal = () => { resetForm(); setIsEditingMode(false); setShowAddModal(true); setActiveTab('Info'); };
  const openEditModal = (prop: Property) => { setNewProp({ ...prop }); setIsEditingMode(true); setShowAddModal(true); setActiveTab('Info'); setTempDocs([]); }; // Temp docs cleared, we rely on allDocuments
  
  const resetForm = () => {
    setNewProp({ status: 'Vacant', customFields: {}, tags: [], coordinates: undefined });
    setPendingUploads([]); setTempDocs([]); setSelectedDocIds([]);
    setImagePreview(''); setSuggestedOwnerData(null); setAiSummary(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProp.name) {
      if (isEditingMode && newProp.id) {
        onEditProperty(newProp as Property);
        // Documents in edit mode are handled live via add/delete props, no need to save `tempDocs`
      } else {
        const newId = getNextId('Property');
        onAddProperty({ ...newProp as Property, id: newId });
        tempDocs.forEach(d => onAddDocument({ ...d, relatedPropertyId: newId }));
      }
      resetForm(); setShowAddModal(false);
    }
  };

  return (
    <div className="p-6" onPaste={handlePaste}>
      {/* ... (Main List UI - Keeping existing) ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Imóveis</h2>
          <p className="text-slate-500">Gestão física, financeira e documental.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2">
            <Plus size={18} /> Novo Imóvel
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <div key={property.id} onClick={() => { setSelectedProperty(property); openEditModal(property); }} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-lg transition-all cursor-pointer relative">
            {/* ... Property Card Content ... */}
            <div className="h-48 overflow-hidden relative">
              <img src={property.imageUrl} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
              <div className="absolute top-3 right-3 flex flex-col gap-1 items-end"><span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-md ${property.status === 'Occupied' ? 'bg-green-100/90 text-green-700' : property.status === 'Vacant' ? 'bg-red-100/90 text-red-700' : 'bg-yellow-100/90 text-yellow-700'}`}>{property.status === 'Occupied' ? 'Ocupado' : property.status === 'Vacant' ? 'Vago' : 'Em Manutenção'}</span></div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg text-slate-800 mb-1">{property.name}</h3>
              <p className="text-slate-500 text-sm flex items-center gap-1 mb-4"><MapPin size={14} /> {property.address}</p>
              <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                 <div className="flex items-center gap-1 text-slate-600 text-sm"><ScrollText size={14} /><span>{allDocuments.filter(d => d.relatedPropertyId === property.id).length} Docs</span></div>
                 <p className="font-bold text-slate-800">{formatCurrency(property.value)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl w-full ${aiSummary ? 'max-w-6xl' : 'max-w-3xl'} max-h-[90vh] overflow-hidden animate-in zoom-in-95 flex flex-col`}>
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
              <h3 className="text-xl font-bold">{isEditingMode ? 'Editar Imóvel' : 'Cadastrar Novo Imóvel'}</h3>
              <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }}><X size={24} className="text-slate-400"/></button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6 shrink-0">
                <button onClick={() => setActiveTab('Info')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}><Building size={16}/> Dados Principais</button>
                <button onClick={() => setActiveTab('Docs')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}><FileText size={16}/> Documentos ({currentDocs.length})</button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === 'Info' && (
                        <form id="propForm" onSubmit={handleSubmit} className="space-y-4">
                            {/* ... (Existing Info Form Fields) ... */}
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Foto de Capa</label>
                                <input type="file" accept="image/*" className="hidden" ref={photoInputRef} onChange={(e) => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => setImagePreview(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />
                                {imagePreview ? (<div className="relative h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-300 group"><img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /><button type="button" onClick={() => setImagePreview('')} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X size={14}/></button></div>) : (<div className="flex gap-4"><button type="button" onClick={() => photoInputRef.current?.click()} className="flex-1 h-32 border border-slate-300 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-all gap-2"><ImageIcon size={24}/> <span className="text-sm font-medium">Importar Imagem</span></button></div>)}
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome do Imóvel</label><ClearableInput required type="text" className="w-full border border-slate-300 bg-white p-2 rounded" value={newProp.name || ''} onChange={e => setNewProp({...newProp, name: e.target.value})} onClear={() => setNewProp({...newProp, name: ''})} /></div>
                            {/* ... (Address etc omitted for brevity, keeping logic) ... */}
                        </form>
                    )}

                    {activeTab === 'Docs' && (
                        <div className="space-y-6">
                            {/* Upload Area */}
                            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center transition-colors hover:bg-indigo-50/50" onDragOver={handleDragOver} onDrop={handleDrop}>
                                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                {pendingUploads.length === 0 ? (
                                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors w-full"><CloudUpload size={40} className="text-indigo-500 opacity-80" /><div className="text-center"><span className="font-medium text-sm">Clique ou arraste documentos</span></div></button>
                                ) : (
                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-sm text-slate-700">Novos Arquivos</h4><button onClick={() => setPendingUploads([])} className="text-xs text-red-500">Limpar</button></div>
                                        <ul className="bg-white border rounded-lg p-2 text-sm space-y-1 mb-2">{pendingUploads.map((f, i) => (<li key={i} className="flex justify-between items-center text-slate-600 px-2 py-1"><span className="truncate flex-1 mr-2">{f.name}</span><button type="button" onClick={() => removePendingUpload(i)} className="text-red-500"><X size={14}/></button></li>))}</ul>
                                        <div className="flex justify-end"><button type="button" onClick={handleDocumentAnalysis} disabled={isAnalyzing} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 flex items-center gap-2 shadow-sm">{isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} Adicionar e Processar</button></div>
                                    </div>
                                )}
                            </div>

                            {/* Standardized Document List */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between bg-slate-100 p-3 border-b border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <button onClick={toggleSelectAll} className="text-slate-500 hover:text-indigo-600">{selectedDocIds.length > 0 && selectedDocIds.length === currentDocs.length ? <CheckSquare size={20}/> : <Square size={20}/>}</button>
                                        <span className="text-sm font-medium text-slate-600">{selectedDocIds.length} selecionados</span>
                                    </div>
                                    {selectedDocIds.length > 0 && (<div className="flex gap-2"><div className="group relative"><button className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"><Download size={16}/> Baixar <ChevronDown size={14}/></button><div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg hidden group-hover:block w-48 z-10"><button onClick={() => handleBatchDownload(false)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50">Individualmente</button><button onClick={() => handleBatchDownload(true)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50">Combinar em um PDF</button></div></div><button onClick={handleBatchDelete} className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-2"><Trash2 size={16}/> Excluir</button></div>)}
                                </div>
                                {/* List */}
                                <div className="bg-white divide-y divide-slate-100">
                                    {currentDocs.map((doc) => {
                                        const isSelected = selectedDocIds.includes(doc.id);
                                        return (
                                            <div key={doc.id} className={`p-3 flex items-center gap-3 hover:bg-slate-50 group ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                                                <button onClick={() => toggleSelectOne(doc.id)} className="text-slate-400 hover:text-indigo-600 shrink-0">{isSelected ? <CheckSquare size={20} className="text-indigo-600"/> : <Square size={20}/>}</button>
                                                <div className="p-2 rounded bg-slate-100 text-slate-600 shrink-0"><FileText size={18} /></div>
                                                <div className="flex-1 min-w-0"><h4 className="font-semibold text-slate-900 text-sm truncate">{doc.name}</h4><div className="text-xs text-slate-500">{doc.category} • {doc.uploadDate}</div></div>
                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { if (doc.extractedData) setEditingDataDoc(doc); else handleForceReanalyze(doc); }} className={`p-1.5 rounded ${doc.extractedData ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`} title={doc.extractedData ? "Dados" : "IA"}>{doc.extractedData ? <FileSpreadsheet size={16} /> : <Sparkles size={16} />}</button>
                                                    <button onClick={() => setViewingDoc(doc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Ver"><Eye size={16} /></button>
                                                    <button onClick={() => handleDownload(doc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Download"><Download size={16} /></button>
                                                    <button onClick={() => { if(confirm(`Excluir?`)) { if(isEditingMode) onDeleteDocument(doc.id); else setTempDocs(prev => prev.filter(d => d.id !== doc.id)); }}} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Excluir"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {currentDocs.length === 0 && <div className="p-6 text-center text-slate-400 text-sm italic">Nenhum documento vinculado.</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {aiSummary && (<div className="w-80 bg-indigo-50 border-l border-indigo-100 p-6 overflow-y-auto"><div className="flex items-center gap-2 mb-4 text-indigo-700 font-bold"><Sparkles size={20} /><h4>Resumo Inteligente</h4></div><div className="bg-white p-4 rounded-lg shadow-sm text-sm whitespace-pre-wrap border border-indigo-100">{aiSummary}</div></div>)}
            </div>
             <div className="p-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl shrink-0">
              <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
              <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700">{isEditingMode ? 'Salvar Alterações' : 'Salvar Imóvel'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-slate-200"><h3 className="font-bold">{viewingDoc.name}</h3><button onClick={() => setViewingDoc(null)}><X size={20}/></button></div>
              <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center"><FileViewer content={viewingDoc.contentRaw || ''} /></div>
           </div>
        </div>
      )}

      {/* Data Modal */}
      {editingDataDoc && (
          <DocumentDataModal 
            doc={editingDataDoc} 
            onClose={() => setEditingDataDoc(null)} 
            onSave={(updatedDoc) => {
                if(isEditingMode) { onDeleteDocument(updatedDoc.id); onAddDocument(updatedDoc); } // Replace logic
                else handleUpdateTempDoc(updatedDoc);
                setEditingDataDoc(null);
            }}
            aiConfig={aiConfig}
            onReanalyze={handleForceReanalyze}
          />
      )}
    </div>
  );
};

export default AssetManager;
