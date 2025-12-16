import React, { useState, useRef, useEffect } from 'react';
import { Property, MaintenanceRecord, Document, PropertyTag, AIConfig, MonthlyIndexData, Owner, AddressComponents, AIAnalysisResult } from '../types';
import { Building, MapPin, CheckCircle, XCircle, Wrench, ArrowUpRight, Calendar, User, DollarSign, X, FileText, Upload, Plus, Trash2, Cloud, ScrollText, Camera, Image as ImageIcon, Loader2, Tag, Filter, Pencil, Settings2, Map as MapIcon, Crosshair, Sparkles, TrendingUp, Calculator, Info, List, BarChart3, LineChart as LineChartIcon, AlertTriangle, Eye, Download, Save, Eraser, CloudUpload, ChevronDown, Search, CheckSquare, Square, FileSpreadsheet } from 'lucide-react';
import { analyzeDocumentContent, extractCustomFieldFromText, getCoordinatesFromAddress, calculateCorrectionFromLocalData, IndexCorrectionResult, fetchHistoricalIndices, AnalyzableFile } from '../services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getNextId } from '../services/idService';
import DocumentVault from './DocumentVault';

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
  const [aiSummary, setAiSummary] = useState<string | null>(null); 
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeTab, setActiveTab] = useState<'Info' | 'Docs' | 'Custom'>('Info');
  
  const [imagePreview, setImagePreview] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [newProp, setNewProp] = useState<Partial<Property>>({ status: 'Vacant', customFields: {}, tags: [], coordinates: undefined });
  const [tempDocs, setTempDocs] = useState<Document[]>([]);

  const openAddModal = () => { resetForm(); setIsEditingMode(false); setShowAddModal(true); setActiveTab('Info'); };
  const openEditModal = (prop: Property) => { setNewProp({ ...prop }); setIsEditingMode(true); setShowAddModal(true); setActiveTab('Info'); setTempDocs([]); }; 
  
  const resetForm = () => {
    setNewProp({ status: 'Vacant', customFields: {}, tags: [], coordinates: undefined });
    setTempDocs([]);
    setImagePreview(''); setAiSummary(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProp.name) {
      if (isEditingMode && newProp.id) {
        onEditProperty(newProp as Property);
        // Documents in edit mode are handled live via add/delete props in DocumentVault
      } else {
        const newId = getNextId('Property');
        onAddProperty({ ...newProp as Property, id: newId });
        // Link temp docs to new ID
        tempDocs.forEach(d => onAddDocument({ ...d, relatedPropertyId: newId }));
      }
      resetForm(); setShowAddModal(false);
    }
  };

  // Get active document list (Existing filtered + Temp)
  // For Edit Mode: DocumentVault handles global documents filtered by ID.
  // For Create Mode: DocumentVault handles 'tempDocs'.
  const docsToShow = isEditingMode 
      ? allDocuments.filter(d => d.relatedPropertyId === newProp.id) 
      : tempDocs;

  // Callback to handle docs added via DocumentVault
  const handleVaultAddDoc = (doc: Document) => {
      if (isEditingMode && newProp.id) {
          // Live add
          onAddDocument({ ...doc, relatedPropertyId: newProp.id });
      } else {
          // Temp add
          setTempDocs(prev => [...prev, doc]);
      }
  };

  const handleVaultDeleteDoc = (id: string) => {
      if (isEditingMode) {
          onDeleteDocument(id);
      } else {
          setTempDocs(prev => prev.filter(d => d.id !== id));
      }
  };

  const handleVaultUpdateDoc = (doc: Document) => {
      // Since DocumentVault relies on parent to update, we need a way to update `allDocuments`
      // For now, we simulate update via delete + add in RegisterView, let's do similar here if possible,
      // or we just re-add it. AssetManager receives `allDocuments` but update function is not passed for docs.
      // We will assume `onAddDocument` overwrites if ID matches in parent state or we use Delete+Add workaround.
      // WORKAROUND: Delete then Add.
      if (isEditingMode) {
          onDeleteDocument(doc.id);
          onAddDocument(doc);
      } else {
          setTempDocs(prev => prev.map(d => d.id === doc.id ? doc : d));
      }
  };

  // Handle data filling from AI analysis
  const handleAiDataMerge = (result: AIAnalysisResult) => {
      if (result.extractedPropertyData) {
          setNewProp(prev => ({
              ...prev,
              // Only fill if empty
              name: prev.name || result.extractedPropertyData?.name || prev.name,
              address: prev.address || result.extractedPropertyData?.address || prev.address,
              value: prev.value || result.extractedPropertyData?.purchaseValue || prev.value,
              purchaseValue: prev.purchaseValue || result.extractedPropertyData?.purchaseValue || prev.purchaseValue,
              purchaseDate: prev.purchaseDate || result.extractedPropertyData?.purchaseDate || prev.purchaseDate,
              seller: prev.seller || result.extractedPropertyData?.seller || prev.seller,
              registryData: {
                  matricula: prev.registryData?.matricula || result.extractedPropertyData?.registryData?.matricula || '',
                  cartorio: prev.registryData?.cartorio || result.extractedPropertyData?.registryData?.cartorio || '',
                  livro: prev.registryData?.livro || result.extractedPropertyData?.registryData?.livro || '',
                  folha: prev.registryData?.folha || result.extractedPropertyData?.registryData?.folha || ''
              }
          }));
          alert("Dados do imóvel preenchidos automaticamente com base no documento analisado. Verifique a aba 'Dados Principais'.");
      }
  };

  return (
    <div className="p-6">
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
          <div className={`bg-white rounded-xl w-full ${aiSummary ? 'max-w-6xl' : 'max-w-4xl'} h-[90vh] flex flex-col animate-in zoom-in-95`}>
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
              <h3 className="text-xl font-bold">{isEditingMode ? 'Editar Imóvel' : 'Cadastrar Novo Imóvel'}</h3>
              <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }}><X size={24} className="text-slate-400"/></button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6 shrink-0">
                <button onClick={() => setActiveTab('Info')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}><Building size={16}/> Dados Principais</button>
                <button onClick={() => setActiveTab('Docs')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}><FileText size={16}/> Documentos ({docsToShow.length})</button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {activeTab === 'Info' && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <form id="propForm" onSubmit={handleSubmit} className="space-y-4">
                            {/* ... (Existing Info Form Fields) ... */}
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Foto de Capa</label>
                                <input type="file" accept="image/*" className="hidden" ref={photoInputRef} onChange={(e) => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => setImagePreview(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />
                                {imagePreview ? (<div className="relative h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-300 group"><img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /><button type="button" onClick={() => setImagePreview('')} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X size={14}/></button></div>) : (<div className="flex gap-4"><button type="button" onClick={() => photoInputRef.current?.click()} className="flex-1 h-32 border border-slate-300 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-all gap-2"><ImageIcon size={24}/> <span className="text-sm font-medium">Importar Imagem</span></button></div>)}
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome do Imóvel</label><ClearableInput required type="text" className="w-full border border-slate-300 bg-white p-2 rounded" value={newProp.name || ''} onChange={e => setNewProp({...newProp, name: e.target.value})} onClear={() => setNewProp({...newProp, name: ''})} /></div>
                            {/* Address etc... reusing layout logic */}
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Endereço Completo</label><input type="text" className="w-full border border-slate-300 p-2 rounded" value={newProp.address || ''} onChange={e => setNewProp({...newProp, address: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Valor</label><input type="number" className="w-full border border-slate-300 p-2 rounded" value={newProp.value || 0} onChange={e => setNewProp({...newProp, value: parseFloat(e.target.value)})} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Status</label><select className="w-full border border-slate-300 p-2 rounded" value={newProp.status} onChange={e => setNewProp({...newProp, status: e.target.value as any})}><option value="Occupied">Ocupado</option><option value="Vacant">Vago</option><option value="Under Maintenance">Em Manutenção</option></select></div>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'Docs' && (
                    <div className="flex-1 overflow-hidden p-6 flex flex-col">
                        <div className="h-full flex flex-col">
                            <DocumentVault 
                                documents={docsToShow}
                                properties={properties}
                                owners={owners}
                                onAddDocument={handleVaultAddDoc}
                                onDeleteDocument={handleVaultDeleteDoc}
                                onUpdateDocument={handleVaultUpdateDoc}
                                aiConfig={aiConfig}
                                isEmbedded={true}
                                preSelectedPropertyId={isEditingMode ? newProp.id : undefined}
                                customTitle="Documentos do Imóvel"
                                alwaysShowUpload={true}
                                analysisContext="PropertyCreation"
                                onAnalysisComplete={handleAiDataMerge}
                            />
                        </div>
                    </div>
                )}
                
                {aiSummary && (<div className="w-80 bg-indigo-50 border-l border-indigo-100 p-6 overflow-y-auto"><div className="flex items-center gap-2 mb-4 text-indigo-700 font-bold"><Sparkles size={20} /><h4>Resumo Inteligente</h4></div><div className="bg-white p-4 rounded-lg shadow-sm text-sm whitespace-pre-wrap border border-indigo-100">{aiSummary}</div></div>)}
            </div>
             <div className="p-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl shrink-0">
              <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
              <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700">{isEditingMode ? 'Salvar Alterações' : 'Salvar Imóvel'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManager;