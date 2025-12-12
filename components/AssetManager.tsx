import React, { useState, useRef, useEffect } from 'react';
import { Property, Document, PropertyTag, AIConfig, MonthlyIndexData, Owner, AddressComponents } from '../types';
import { Building, MapPin, CheckCircle, Calendar, User, DollarSign, X, FileText, Plus, Trash2, Cloud, ScrollText, Camera, Image as ImageIcon, Loader2, Tag, Pencil, Map as MapIcon, Crosshair, Sparkles, TrendingUp, Calculator, Info, List, AlertTriangle, Eye, Download, Eraser, ChevronDown, Search } from 'lucide-react';
import { analyzeDocumentContent, extractCustomFieldFromText, getCoordinatesFromAddress, calculateCorrectionFromLocalData, IndexCorrectionResult, fetchHistoricalIndices } from '../services/geminiService';

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
  aiConfig?: AIConfig;
  indicesDatabase: MonthlyIndexData[];
  onUpdateIndicesDatabase?: (data: MonthlyIndexData[]) => void;
}

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

// Utils duplicados para isolamento
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

// Helper to handle currency input masking
const handleCurrencyInput = (value: string, setter: (val: number) => void) => {
  // Remove non-digits
  const digits = value.replace(/\D/g, '');
  // Treat as cents (e.g., 100 -> 1.00)
  const numberValue = Number(digits) / 100;
  setter(numberValue);
};

// Reusable Clearable Input Component
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

// Searchable Select Component
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
  aiConfig,
  indicesDatabase,
  onUpdateIndicesDatabase
}) => {
  // ... (Estados e Handlers mantidos)
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeneratingMapDetail, setIsGeneratingMapDetail] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeTab, setActiveTab] = useState<'Info' | 'Docs' | 'Custom' | 'Valuation'>('Info');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  
  // Document Viewing State
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  // Quick Owner Modal State
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerDoc, setNewOwnerDoc] = useState('');
  const [suggestedOwnerData, setSuggestedOwnerData] = useState<Partial<Owner> | null>(null);

  // Address Form State (Detailed)
  const [addressForm, setAddressForm] = useState<AddressComponents>({
    cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: ''
  });
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Valuation State
  const [valuationStart, setValuationStart] = useState('');
  const [valuationEnd, setValuationEnd] = useState('');
  const [valuationInitialValue, setValuationInitialValue] = useState(0);
  const [valuationMarketValue, setValuationMarketValue] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<string[]>(['IPCA', 'IGPM']);
  const [correctionResults, setCorrectionResults] = useState<IndexCorrectionResult[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showChart, setShowChart] = useState(true);

  // Quick Tagging State
  const [quickTagProperty, setQuickTagProperty] = useState<Property | null>(null);

  // Camera & Image State
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null); // For documents
  const photoInputRef = useRef<HTMLInputElement>(null); // For cover photo

  // Global Field State
  const [showGlobalFieldDialog, setShowGlobalFieldDialog] = useState(false);
  const [pendingField, setPendingField] = useState<{key: string, value: string} | null>(null);
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);

  // Form State
  const [newProp, setNewProp] = useState<Partial<Property>>({ status: 'Vacant', customFields: {}, tags: [], coordinates: undefined });
  const [tempCustomFieldKey, setTempCustomFieldKey] = useState('');
  const [tempCustomFieldValue, setTempCustomFieldValue] = useState('');
  
  // Pending Files for Analysis
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  // Update Valuation defaults when selected property changes
  useEffect(() => {
    if (selectedProperty) {
      setValuationStart(convertToISODate(selectedProperty.purchaseDate));
      setValuationEnd(new Date().toISOString().split('T')[0]);
      setValuationInitialValue(selectedProperty.purchaseValue);
      setValuationMarketValue(selectedProperty.marketValue || selectedProperty.value);
      setCorrectionResults([]);
      setChartData([]);
    }
  }, [selectedProperty]);

  // City Fetcher
  useEffect(() => { 
      if (addressForm.uf && addressForm.uf.length === 2) { 
          const fetchCities = async () => { 
              setIsLoadingCities(true); 
              try { 
                  const response = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${addressForm.uf}`); 
                  if (response.ok) { 
                      const data = await response.json(); 
                      const cityNames = data.map((c: any) => c.nome); 
                      setAvailableCities(cityNames); 
                  } 
              } catch (e) { 
                  console.error("Failed to fetch cities", e); 
                  setAvailableCities([]); 
              } finally { 
                  setIsLoadingCities(false); 
              } 
          }; 
          fetchCities(); 
      } else { 
          setAvailableCities([]); 
      } 
  }, [addressForm.uf]);

  const convertToISODate = (dateStr?: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const parts = dateStr.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr;
  };

  // Funções de Download
  const handleDownload = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    if (!doc.contentRaw) {
      alert("O conteúdo deste arquivo não está disponível para download.");
      return;
    }

    try {
      const link = document.createElement('a');
      link.download = doc.name;
      
      // Verifica se é Data URL (Base64) ou texto puro
      if (doc.contentRaw.startsWith('data:')) {
         link.href = doc.contentRaw;
      } else {
         // Assume texto/JSON se não for imagem
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

  // FIX: Delete handler
  const confirmDeleteDoc = (e: React.MouseEvent, docId: string, docName: string) => {
      e.stopPropagation();
      if (confirm(`Tem certeza que deseja excluir o documento "${docName}"?`)) {
          onDeleteDocument(docId);
      }
  };

  // ... (Resto das funções auxiliares mantidas)
  const handleCalculateCorrection = async () => {
     if (selectedIndices.length === 0) {
         alert("Selecione pelo menos um índice.");
         return;
     }

     setIsCalculating(true);
     setStatusMessage('');
     setChartData([]);

     const targetDate = new Date(valuationEnd);
     const targetYear = targetDate.getFullYear();
     const targetMonth = targetDate.getMonth() + 1; 
     
     let lastDbDateStr = '2000-01';
     if (indicesDatabase.length > 0) {
         const sorted = [...indicesDatabase].sort((a,b) => b.date.localeCompare(a.date));
         lastDbDateStr = sorted[0].date;
     }

     const [lastDbYearStr, lastDbMonthStr] = lastDbDateStr.split('-');
     const lastDbYear = parseInt(lastDbYearStr);
     const lastDbMonth = parseInt(lastDbMonthStr);

     const monthDiff = (targetYear - lastDbYear) * 12 + (targetMonth - lastDbMonth);
     let workingDatabase = indicesDatabase;

     if (monthDiff >= 2) {
         if (!aiConfig || !onUpdateIndicesDatabase) {
             alert("Base de índices desatualizada e IA não configurada. O cálculo usará apenas dados disponíveis.");
         } else {
             setStatusMessage('Base desatualizada (+2 meses). Buscando índices recentes...');
             let nextMonth = lastDbMonth + 1;
             let nextYear = lastDbYear;
             if (nextMonth > 12) { nextMonth = 1; nextYear++; }
             
             const fetchStart = `${nextYear}-${String(nextMonth).padStart(2,'0')}`;
             const fetchEnd = `${targetYear}-${String(targetMonth).padStart(2,'0')}`;
             
             try {
                const newIndices = await fetchHistoricalIndices(
                    fetchStart,
                    fetchEnd,
                    ['IPCA', 'IGPM', 'INCC', 'SELIC', 'CDI'],
                    aiConfig?.apiKey || ''
                );
                
                if (newIndices && newIndices.length > 0) {
                    onUpdateIndicesDatabase(newIndices);
                    workingDatabase = [...indicesDatabase, ...newIndices]; 
                }
             } catch (err) {
                 console.error("Failed to auto-update indices", err);
                 setStatusMessage('Falha ao atualizar índices. Usando base local.');
             }
         }
     }

     setStatusMessage('Calculando...');
     const results = calculateCorrectionFromLocalData(
         valuationInitialValue,
         valuationStart,
         valuationEnd,
         selectedIndices,
         workingDatabase
     );
     
     setCorrectionResults(results);
     
     if (results.length > 0) {
        const mergedData = new Map<string, any>();
        
        results.forEach(res => {
            res.history.forEach(point => {
                if (!mergedData.has(point.date)) {
                    mergedData.set(point.date, { date: point.date });
                }
                mergedData.get(point.date)[res.indexName] = point.value;
            });
        });
        
        const chartArray = Array.from(mergedData.values()).sort((a,b) => a.date.localeCompare(b.date));
        setChartData(chartArray);
        setShowChart(true);
     }

     setIsCalculating(false);
     setStatusMessage('');

     if (selectedProperty && valuationMarketValue !== selectedProperty.marketValue) {
         const updated = { ...selectedProperty, marketValue: valuationMarketValue };
         onEditProperty(updated);
         setSelectedProperty(updated);
     }
  };

  const toggleIndex = (index: string) => {
      if (selectedIndices.includes(index)) {
          setSelectedIndices(selectedIndices.filter(i => i !== index));
      } else {
          setSelectedIndices([...selectedIndices, index]);
      }
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = formatCEP(e.target.value); setAddressForm({...addressForm, cep: val}); };
  const handleFetchCEP = async () => { const cep = addressForm.cep.replace(/\D/g, ''); if (cep.length !== 8) return; try { const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`); if (response.ok) { const data = await response.json(); setAddressForm(prev => ({ ...prev, logradouro: data.street || prev.logradouro, bairro: data.neighborhood || prev.bairro, municipio: data.city || prev.municipio, uf: data.state || prev.uf })); } } catch (e) { console.error("Erro ao buscar CEP", e); } };
  const handleCEPKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchCEP(); } };

  const handleLocateAddress = async () => {
    // Construct address from parts if available
    const constructedAddress = `${addressForm.logradouro}, ${addressForm.semNumero ? 'S/N' : addressForm.numero} - ${addressForm.bairro}, ${addressForm.municipio} - ${addressForm.uf}`;
    
    if (!addressForm.logradouro) {
      alert("Preencha o endereço primeiro.");
      return;
    }
    if (!aiConfig) {
      alert("Configure uma chave de API nas Configurações primeiro.");
      return;
    }

    setIsLocating(true);
    const coords = await getCoordinatesFromAddress(constructedAddress, aiConfig.apiKey);

    if (coords) {
      setNewProp(prev => ({
        ...prev,
        coordinates: coords,
        address: constructedAddress // Update legacy field too
      }));
    } else {
      alert("Não foi possível encontrar as coordenadas para este endereço.");
    }
    setIsLocating(false);
  };

  const handleGenerateMapForDetail = async () => {
    if (!selectedProperty || !selectedProperty.address) return;
    if (!aiConfig) {
      alert("Configure uma chave de API nas Configurações primeiro.");
      return;
    }

    setIsGeneratingMapDetail(true);
    const coords = await getCoordinatesFromAddress(selectedProperty.address, aiConfig.apiKey);

    if (coords) {
      const updatedProp = { ...selectedProperty, coordinates: coords };
      onEditProperty(updatedProp); 
      setSelectedProperty(updatedProp); 
    } else {
      alert("Não foi possível gerar o mapa para este endereço.");
    }
    setIsGeneratingMapDetail(false);
  };

  const processFiles = (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const newUploads: PendingUpload[] = [];
      
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const content = ev.target?.result as string || '';
              newUploads.push({
                  name: file.name,
                  content: content,
                  fileObject: file
              });
              
              if (newUploads.length === files.length) {
                  setPendingUploads(prev => [...prev, ...newUploads]);
              }
          };
          if(file.type.includes('text') || file.type.includes('json')) {
              reader.readAsText(file);
          } else {
              reader.readAsDataURL(file); // Load as DataURL for consistency
          }
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          processFiles(e.target.files);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(e.dataTransfer.files);
      }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          processFiles(e.clipboardData.files);
      }
  };

  const removePendingUpload = (index: number) => {
      setPendingUploads(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentAnalysis = async () => {
    if (pendingUploads.length === 0) return;
    if (!aiConfig) {
        alert("Configure uma chave de API nas Configurações primeiro.");
        return;
    }
    
    setIsAnalyzing(true);
    setSuggestedOwnerData(null); 
    
    const textFiles = pendingUploads.filter(f => !f.content.startsWith('data:image'));
    
    if (textFiles.length === 0) {
        alert("Apenas imagens carregadas. Para extração de texto, carregue PDFs ou Texto. Salvando apenas.");
        setIsAnalyzing(false);
        return;
    }

    const combinedText = textFiles.map(f => `--- Arquivo: ${f.name} ---\n${f.content.substring(0, 5000)}`).join('\n\n');

    try {
        const result = await analyzeDocumentContent(combinedText, aiConfig.apiKey, 'PropertyCreation');
        
        if (result.extractedPropertyData) {
          // If address is extracted, try to parse it simply (naive approach or overwrite logradouro)
          if(result.extractedPropertyData.address) {
             setAddressForm(prev => ({...prev, logradouro: result.extractedPropertyData!.address || ''}));
          }
          setNewProp(prev => ({
            ...prev,
            ...result.extractedPropertyData,
            status: 'Vacant', 
            customFields: prev.customFields || {}
          }));
        }

        if (result.extractedOwnerData && result.extractedOwnerData.name) {
            setSuggestedOwnerData(result.extractedOwnerData);
        }
        alert("Dados extraídos com sucesso! O formulário foi preenchido.");
    } catch(e) {
        console.error(e);
        alert("Erro na análise.");
    }

    setIsAnalyzing(false);
  };

  const handleQuickAddOwner = () => {
      if (newOwnerName) {
          const newOwnerId = Date.now().toString();
          onAddOwner({
              id: newOwnerId,
              name: newOwnerName,
              document: newOwnerDoc,
              address: newProp.address || '' 
          });
          setNewProp({ ...newProp, ownerId: newOwnerId });
          setShowOwnerModal(false);
          setNewOwnerName('');
          setNewOwnerDoc('');
          setSuggestedOwnerData(null);
      }
  };

  const openQuickOwnerModal = () => {
      if (suggestedOwnerData) {
          setNewOwnerName(suggestedOwnerData.name || '');
          setNewOwnerDoc(suggestedOwnerData.document || '');
      }
      setShowOwnerModal(true);
  };

  const handleAddCustomField = () => {
    if (!tempCustomFieldKey || !tempCustomFieldValue) return;
    setPendingField({ key: tempCustomFieldKey, value: tempCustomFieldValue });
    setShowGlobalFieldDialog(true);
  };

  const confirmGlobalField = async (addToAll: boolean, autoFill: boolean) => {
    if (!pendingField) return;

    setIsProcessingGlobal(true);

    if (addToAll) {
      const updatedProperties = await Promise.all(properties.map(async (prop) => {
        let valueToAdd = ""; 
        
        if (autoFill && aiConfig) {
          const docs = getLinkedDocuments(prop.id);
          const fullText = docs.map(d => d.contentRaw || d.summary || '').join('\n');
          
          if (fullText.length > 10) {
             const extracted = await extractCustomFieldFromText(fullText, pendingField.key, aiConfig.apiKey);
             if (extracted) valueToAdd = extracted;
          }
        }

        return {
          ...prop,
          customFields: {
            ...prop.customFields,
            [pendingField.key]: valueToAdd
          }
        };
      }));

      onUpdateProperties(updatedProperties);
    }

    setNewProp(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [pendingField.key]: pendingField.value
      }
    }));

    setIsProcessingGlobal(false);
    setShowGlobalFieldDialog(false);
    setPendingField(null);
    setTempCustomFieldKey('');
    setTempCustomFieldValue('');
  };

  const removeCustomField = (key: string) => {
    const updated = { ...newProp.customFields };
    delete updated[key];
    setNewProp({ ...newProp, customFields: updated });
  };

  const toggleTagOnProperty = (tagId: string) => {
    const currentTags = newProp.tags || [];
    if (currentTags.includes(tagId)) {
      setNewProp({ ...newProp, tags: currentTags.filter(id => id !== tagId) });
    } else {
      setNewProp({ ...newProp, tags: [...currentTags, tagId] });
    }
  };

  const handleQuickToggleTag = (tagId: string) => {
    if (!quickTagProperty) return;

    const currentTags = quickTagProperty.tags || [];
    let newTags;
    if (currentTags.includes(tagId)) {
      newTags = currentTags.filter(id => id !== tagId);
    } else {
      newTags = [...currentTags, tagId];
    }

    const updatedProp = { ...quickTagProperty, tags: newTags };
    setQuickTagProperty(updatedProp); 
    onEditProperty(updatedProp); 
  };

  const openAddModal = () => {
    resetForm();
    setIsEditingMode(false);
    setShowAddModal(true);
  };

  const openEditModal = (prop: Property) => {
    setNewProp({ ...prop });
    // Load address parts if available, or try to parse (simple split for fallback)
    if(prop.addressComponents) {
        setAddressForm(prop.addressComponents);
    } else {
        // Fallback for legacy data (rough estimation)
        setAddressForm({
            cep: '', logradouro: prop.address || '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: ''
        });
    }
    setImagePreview(prop.imageUrl);
    setIsEditingMode(true);
    setShowAddModal(true);
    setSelectedProperty(null); 
  };

  const confirmDelete = (prop: Property) => {
    if (confirm(`Tem certeza que deseja excluir o imóvel "${prop.name}"?`)) {
      onDeleteProperty(prop.id);
      setSelectedProperty(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct full address string
    const fullAddress = `${addressForm.logradouro}, ${addressForm.semNumero ? 'S/N' : addressForm.numero}${addressForm.complemento ? ' - ' + addressForm.complemento : ''}, ${addressForm.bairro}, ${addressForm.municipio} - ${addressForm.uf}`;
    
    if (newProp.name && addressForm.logradouro) { // Basic validation
      
      if (isEditingMode && newProp.id) {
        const updatedProp: Property = {
            ...(newProp as Property),
            address: fullAddress,
            addressComponents: addressForm,
            imageUrl: imagePreview || newProp.imageUrl || ''
        };
        onEditProperty(updatedProp);

      } else {
        const newId = Date.now().toString();
        const propertyToAdd: Property = {
            id: newId,
            name: newProp.name!,
            address: fullAddress,
            addressComponents: addressForm,
            value: Number(newProp.value) || 0,
            purchaseValue: Number(newProp.purchaseValue) || 0,
            purchaseDate: newProp.purchaseDate || new Date().toLocaleDateString('pt-BR'),
            status: newProp.status as any,
            imageUrl: imagePreview || `https://picsum.photos/400/300?random=${newId}`,
            seller: newProp.seller,
            registryData: newProp.registryData,
            customFields: newProp.customFields,
            tags: newProp.tags || [],
            maintenanceHistory: [],
            coordinates: newProp.coordinates,
            ownerId: newProp.ownerId
        };
        onAddProperty(propertyToAdd);
        
        if (pendingUploads.length > 0) {
            pendingUploads.forEach(upload => {
                onAddDocument({
                  id: Date.now().toString() + Math.random().toString().slice(2,5),
                  name: upload.name,
                  category: 'Acquisition',
                  uploadDate: new Date().toLocaleDateString('pt-BR'),
                  relatedPropertyId: newId,
                  contentRaw: upload.content,
                  summary: "Documento de Aquisição/Origem do imóvel.",
                  aiAnalysis: { riskLevel: 'Low', keyDates: [], monetaryValues: [] }
                });
            });
        }
      }

      resetForm();
      setShowAddModal(false);
    }
  };

  const resetForm = () => {
    setNewProp({ status: 'Vacant', customFields: {}, tags: [], coordinates: undefined });
    setAddressForm({ cep: '', logradouro: '', numero: '', semNumero: false, complemento: '', bairro: '', municipio: '', uf: '' });
    setPendingUploads([]);
    setTempCustomFieldKey('');
    setTempCustomFieldValue('');
    setImagePreview('');
    setSuggestedOwnerData(null);
  };

  const filteredProperties = properties.filter(p => {
    if (selectedTagFilter === 'All') return true;
    return p.tags?.includes(selectedTagFilter);
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                setImagePreview(ev.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera error", err);
        alert("Erro ao acessar câmera.");
        setShowCamera(false);
      }
    }, 100);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setShowCamera(false);
      }
    }
  };

  const getLinkedDocuments = (propId: string) => {
    return allDocuments.filter(d => d.relatedPropertyId === propId);
  };

  return (
    <div className="p-6" onPaste={handlePaste}>
      {/* ... (Header and Grid remain same) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {/* ... Header Content ... */}
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Imóveis</h2>
          <p className="text-slate-500">Gestão física, financeira e documental.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative w-48">
             <SearchableSelect 
               options={[{ value: 'All', label: 'Todas Etiquetas' }, ...tags.map(tag => ({ value: tag.id, label: tag.label }))]}
               value={selectedTagFilter}
               onChange={(val) => setSelectedTagFilter(val || 'All')}
               placeholder="Filtrar Etiqueta"
               className="border-red-500"
             />
          </div>
          
          <button 
            type="button"
            onClick={() => setShowDriveModal(true)}
            className="bg-white border border-red-500 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <Cloud size={18} className="text-blue-500" />
            <span className="hidden md:inline">Importar</span>
          </button>
          <button 
            type="button"
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden md:inline">Novo Imóvel</span>
            <span className="md:hidden">Novo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <div 
            key={property.id} 
            onClick={() => { setSelectedProperty(property); setActiveTab('Info'); }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-lg transition-all cursor-pointer relative"
          >
            {/* ... Card Content ... */}
            <div className="h-48 overflow-hidden relative">
              <img 
                src={property.imageUrl} 
                alt={property.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              
              <button
                 type="button"
                 onClick={(e) => { e.stopPropagation(); setQuickTagProperty(property); }}
                 className="absolute top-3 left-3 bg-white/90 p-2 rounded-full text-slate-600 hover:text-indigo-600 shadow-sm transition-colors z-10 hover:scale-110"
                 title="Etiquetagem Rápida"
              >
                 <Tag size={16} />
              </button>

               <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-md ${
                  property.status === 'Occupied' ? 'bg-green-100/90 text-green-700' :
                  property.status === 'Vacant' ? 'bg-red-100/90 text-red-700' :
                  'bg-yellow-100/90 text-yellow-700'
                }`}>
                  {property.status === 'Occupied' ? 'Ocupado' : 
                   property.status === 'Vacant' ? 'Vago' : 'Em Manutenção'}
                </span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg text-slate-800 mb-1">{property.name}</h3>
              <p className="text-slate-500 text-sm flex items-center gap-1 mb-4">
                <MapPin size={14} /> {property.address}
              </p>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {property.tags?.map(tagId => {
                   const tag = tags.find(t => t.id === tagId);
                   if (!tag) return null;
                   return (
                     <span key={tagId} className={`text-[10px] px-2 py-0.5 rounded-full border ${TAG_COLORS[tag.color]}`}>
                       {tag.label}
                     </span>
                   )
                })}
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                 <div className="flex items-center gap-1 text-slate-600 text-sm">
                   <ScrollText size={14} />
                   <span>{getLinkedDocuments(property.id).length} Docs</span>
                 </div>
                 <p className="font-bold text-slate-800">{formatCurrency(property.value)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Detail Modal --- */}
      {selectedProperty && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
             <div className="bg-slate-900 text-white p-6 relative">
               <div className="absolute top-4 right-4 flex gap-2">
                 <button type="button" onClick={() => openEditModal(selectedProperty)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white" title="Editar Imóvel">
                    <Pencil size={18} />
                 </button>
                 <button type="button" onClick={() => confirmDelete(selectedProperty)} className="bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white p-2 rounded-full" title="Excluir Imóvel">
                    <Trash2 size={18} />
                 </button>
                 <button type="button" onClick={() => setSelectedProperty(null)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white ml-2"><X size={18}/></button>
               </div>
               
               <h2 className="text-2xl font-bold pr-24">{selectedProperty.name}</h2>
               <p className="opacity-80 flex items-center gap-2"><MapPin size={16}/> {selectedProperty.address}</p>
               
               <div className="flex gap-4 mt-6 text-sm font-medium overflow-x-auto pb-1">
                 <button onClick={() => setActiveTab('Info')} className={`pb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'Info' ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
                    <Info size={14}/> Informações
                 </button>
                 <button onClick={() => setActiveTab('Custom')} className={`pb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'Custom' ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
                    <List size={14}/> Campos Livres
                 </button>
                 <button onClick={() => setActiveTab('Docs')} className={`pb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'Docs' ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
                    <FileText size={14}/> Documentos ({getLinkedDocuments(selectedProperty.id).length})
                 </button>
                 <button onClick={() => setActiveTab('Valuation')} className={`pb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'Valuation' ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
                    <TrendingUp size={14}/> Valorização & Índices
                 </button>
               </div>
             </div>

             {/* Content */}
             <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                {activeTab === 'Info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building size={18} className="text-indigo-600"/> Dados de Aquisição</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">Valor de Compra</span>
                                        <span className="font-medium">{formatCurrency(selectedProperty.purchaseValue)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">Data Aquisição</span>
                                        <span className="font-medium">{selectedProperty.purchaseDate}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">Vendedor</span>
                                        <span className="font-medium">{selectedProperty.seller || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-500">Proprietário</span>
                                        <span className="font-medium">
                                            {owners.find(o => o.id === selectedProperty.ownerId)?.name || 'Não atribuído'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-slate-500">Valor Atual (Sistema)</span>
                                        <span className="font-bold text-green-600">{formatCurrency(selectedProperty.value)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ScrollText size={18} className="text-indigo-600"/> Dados de Registro (Cartório)</h3>
                                {selectedProperty.registryData ? (
                                    <div className="space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-2 rounded">
                                                <p className="text-xs text-slate-400">Matrícula</p>
                                                <p className="font-mono font-medium">{selectedProperty.registryData.matricula}</p>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded">
                                                <p className="text-xs text-slate-400">Cartório</p>
                                                <p className="font-medium truncate" title={selectedProperty.registryData.cartorio}>{selectedProperty.registryData.cartorio}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <span><strong>Livro:</strong> {selectedProperty.registryData.livro || '-'}</span>
                                            <span><strong>Folha:</strong> {selectedProperty.registryData.folha || '-'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-400 italic text-sm">Dados de registro não cadastrados.</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MapIcon size={18} className="text-indigo-600"/> Localização</h3>
                                {selectedProperty.coordinates ? (
                                    <div className="flex-1 w-full h-full min-h-[250px] bg-slate-100 rounded-lg overflow-hidden relative flex flex-col">
                                        <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight={0} marginWidth={0} src={`https://maps.google.com/maps?q=${selectedProperty.coordinates.lat},${selectedProperty.coordinates.lng}&z=15&output=embed`} className="absolute inset-0 w-full h-full"></iframe>
                                    </div>
                                ) : (
                                    <div className="flex-1 w-full h-full min-h-[250px] bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                                        <MapIcon size={48} className="mb-2 opacity-20"/>
                                        <p className="mb-4">Mapa indisponível (coordenadas não geradas)</p>
                                        <button type="button" onClick={handleGenerateMapForDetail} disabled={isGeneratingMapDetail} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                                            {isGeneratingMapDetail ? <Loader2 className="animate-spin" size={16}/> : <Crosshair size={16}/>} Gerar Mapa a partir do Endereço
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* RESTORED DOCS TAB */}
                {activeTab === 'Docs' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={18} className="text-indigo-600"/> Arquivos Vinculados
                            </h3>
                        </div>
                        
                        {getLinkedDocuments(selectedProperty.id).length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                                <p>Nenhum documento vinculado a este imóvel.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {getLinkedDocuments(selectedProperty.id).map(doc => (
                                    <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                                                <FileText size={20}/>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-medium text-slate-800 truncate">{doc.name}</h4>
                                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">{doc.category}</span>
                                                    <span>• {doc.uploadDate}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => setViewingDoc(doc)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Visualizar"
                                            >
                                                <Eye size={18}/>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleDownload(e, doc)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Baixar Documento"
                                            >
                                                <Download size={18}/>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => confirmDeleteDoc(e, doc.id, doc.name)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Excluir Documento"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'Custom' && <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><List size={18} className="text-indigo-600"/> Campos Livres</h3><p className="text-slate-400 italic text-sm">Consulte o código fonte para ver a implementação completa dos outros tabs.</p></div>}
                {activeTab === 'Valuation' && <div className="space-y-6"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calculator size={18} className="text-indigo-600"/> Parâmetros de Correção Monetária</h3><p className="text-slate-400 italic text-sm">Consulte o código fonte para ver a implementação completa dos outros tabs.</p></div>}
             </div>
           </div>
         </div>
      )}

      {/* --- ADD/EDIT PROPERTY MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">{isEditingMode ? 'Editar Imóvel' : 'Cadastrar Novo Imóvel'}</h3>
              <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }}><X size={24} className="text-slate-400"/></button>
            </div>
            
            <div className="p-6 space-y-6">
                
                {/* SECTION 1: PHOTO UPLOAD */}
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Foto de Capa</label>
                    <input type="file" accept="image/*" className="hidden" ref={photoInputRef} onChange={handleImageSelect} />
                    
                    {imagePreview ? (
                        <div className="relative h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-300 group">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => photoInputRef.current?.click()} 
                                        className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center gap-2"
                                    >
                                        <ImageIcon size={14}/> Alterar
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setImagePreview('')}
                                        className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 flex items-center gap-2"
                                    >
                                        <Trash2 size={14}/> Remover
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            <button 
                                type="button" 
                                onClick={startCamera} 
                                className="flex-1 h-32 border border-slate-300 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all gap-2"
                            >
                                <div className="p-2 bg-slate-100 rounded-full group-hover:bg-white"><Camera size={24}/></div>
                                <span className="text-sm font-medium">Usar Câmera</span>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => photoInputRef.current?.click()} 
                                className="flex-1 h-32 border border-slate-300 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all gap-2"
                            >
                                <div className="p-2 bg-slate-100 rounded-full group-hover:bg-white"><ImageIcon size={24}/></div>
                                <span className="text-sm font-medium">Importar Imagem</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* SECTION 2: DOCUMENT UPLOAD (AUTO-FILL) */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Documentos & Preenchimento Automático</label>
                    <div 
                        className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center transition-colors hover:bg-indigo-50/50"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onPaste={handlePaste}
                    >
                        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                        
                        {pendingUploads.length === 0 ? (
                            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors w-full">
                                <Cloud size={40} className="text-indigo-500 opacity-80" />
                                <div className="text-center">
                                    <span className="font-medium text-sm">Clique para selecionar, arraste ou cole arquivos</span>
                                    <p className="text-xs text-slate-400 mt-1">PDF, DOCX, Escritura (para extração de dados e arquivamento)</p>
                                </div>
                            </button>
                        ) : (
                            <div className="w-full">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-sm text-slate-700">Arquivos para Processamento</h4>
                                    <button onClick={() => fileInputRef.current?.click()} className="text-xs text-indigo-600 hover:underline">+ Adicionar mais</button>
                                </div>
                                <ul className="bg-white border rounded-lg p-3 text-sm space-y-2 mb-4">
                                    {pendingUploads.map((f, i) => (
                                        <li key={i} className="flex justify-between items-center text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="truncate flex-1 mr-2">{f.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 flex items-center gap-1 font-medium text-xs"><CheckCircle size={14} className="text-green-600" /> Pronto</span>
                                                <button type="button" onClick={() => removePendingUpload(i)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-3 justify-end">
                                    <button type="button" onClick={() => { alert("Arquivos salvos no cadastro."); }} className="text-sm bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                                        Apenas Salvar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={handleDocumentAnalysis} 
                                        disabled={isAnalyzing} 
                                        className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium shadow-sm transition-colors"
                                    >
                                        {isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} 
                                        Salvar e Processar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

              {showCamera && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                   <div className="relative flex-1">
                      <video ref={videoRef} className="w-full h-full object-cover"></video>
                      <button type="button" onClick={() => setShowCamera(false)} className="absolute top-4 right-4 text-white"><X size={32}/></button>
                   </div>
                   <div className="bg-black p-6 flex justify-center">
                      <button type="button" onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-slate-300"></button>
                   </div>
                </div>
              )}
              
              <form id="propForm" onSubmit={handleSubmit} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Imóvel</label>
                     <ClearableInput required type="text" className="w-full border border-red-500 bg-white p-2 rounded focus:border-indigo-500 outline-none text-slate-900" 
                       value={newProp.name || ''} onChange={e => setNewProp({...newProp, name: e.target.value})} onClear={() => setNewProp({...newProp, name: ''})} />
                   </div>
                   {/* Legacy/Display Address Field (Read Only or Hidden if needed, but kept for context) */}
                   <div className="hidden">
                     <label className="block text-sm font-bold text-slate-700 mb-1">Endereço Completo</label>
                     <ClearableInput type="text" className="w-full border border-red-500 bg-white p-2 pr-10 rounded focus:border-indigo-500 outline-none text-slate-900"
                          value={newProp.address || ''} readOnly onClear={() => {}} />
                   </div>
                </div>

                {/* DETAILED ADDRESS FORM */}
                <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><MapPin size={18}/> Endereço Detalhado</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-slate-700 mb-1">CEP</label>
                            <div className="relative">
                                <ClearableInput 
                                    type="text" 
                                    className="w-full border border-red-500 bg-white rounded p-2 focus:border-indigo-500 outline-none text-slate-900" 
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
                            <div className="relative">
                                <ClearableInput type="text" className="w-full border border-red-500 bg-white rounded p-2 focus:border-indigo-500 outline-none text-slate-900 pr-10" value={addressForm.logradouro} onChange={e => setAddressForm({...addressForm, logradouro: e.target.value})} onClear={() => setAddressForm({...addressForm, logradouro: ''})} />
                                <button 
                                    type="button" 
                                    onClick={handleLocateAddress} 
                                    disabled={isLocating || !addressForm.logradouro}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                    title="Localizar coordenadas com IA"
                                >
                                    {isLocating ? <Loader2 className="animate-spin" size={18}/> : <Crosshair size={18}/>}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Número</label>
                            <div className="flex gap-2 items-center">
                                <ClearableInput type="text" className="w-full border border-red-500 bg-white rounded p-2 focus:border-indigo-500 outline-none text-slate-900" value={addressForm.numero} onChange={e => setAddressForm({...addressForm, numero: e.target.value})} disabled={addressForm.semNumero} onClear={() => setAddressForm({...addressForm, numero: ''})} />
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
                            <ClearableInput type="text" className="w-full border border-red-500 bg-white rounded p-2 focus:border-indigo-500 outline-none text-slate-900" value={addressForm.complemento} onChange={e => setAddressForm({...addressForm, complemento: e.target.value})} onClear={() => setAddressForm({...addressForm, complemento: ''})} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Bairro</label>
                            <ClearableInput type="text" className="w-full border border-red-500 bg-white rounded p-2 focus:border-indigo-500 outline-none text-slate-900" value={addressForm.bairro} onChange={e => setAddressForm({...addressForm, bairro: e.target.value})} onClear={() => setAddressForm({...addressForm, bairro: ''})} />
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
                                className="border-red-500"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Município</label>
                            <div className="relative">
                                <ClearableInput 
                                    type="text" 
                                    className="w-full border border-red-500 bg-white rounded p-2 focus:border-indigo-500 outline-none text-slate-900" 
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
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Valor Contábil (Atual)</label>
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                        <input type="text" className="w-full border border-red-500 bg-white p-2 pl-9 pr-8 rounded focus:border-indigo-500 outline-none text-slate-900"
                          value={(newProp.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                          onChange={e => handleCurrencyInput(e.target.value, (val) => setNewProp({...newProp, value: val}))} />
                        {(newProp.value || 0) > 0 && (
                            <button type="button" onClick={() => setNewProp({...newProp, value: 0})} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                                <Eraser size={14}/>
                            </button>
                        )}
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Valor de Compra (Histórico)</label>
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                        <input type="text" className="w-full border border-red-500 bg-white p-2 pl-9 pr-8 rounded focus:border-indigo-500 outline-none text-slate-900"
                          value={(newProp.purchaseValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                          onChange={e => handleCurrencyInput(e.target.value, (val) => setNewProp({...newProp, purchaseValue: val}))} />
                        {(newProp.purchaseValue || 0) > 0 && (
                            <button type="button" onClick={() => setNewProp({...newProp, purchaseValue: 0})} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                                <Eraser size={14}/>
                            </button>
                        )}
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Data de Aquisição</label>
                     <ClearableInput type="text" className="w-full border border-red-500 bg-white p-2 rounded focus:border-indigo-500 outline-none text-slate-900" placeholder="DD/MM/AAAA"
                       value={newProp.purchaseDate || ''} onChange={e => setNewProp({...newProp, purchaseDate: e.target.value})} onClear={() => setNewProp({...newProp, purchaseDate: ''})} />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                     <SearchableSelect 
                       options={[
                           { value: 'Occupied', label: 'Ocupado / Alugado' },
                           { value: 'Vacant', label: 'Vago / Disponível' },
                           { value: 'Under Maintenance', label: 'Em Manutenção / Reforma' }
                       ]}
                       value={newProp.status || 'Vacant'} 
                       onChange={(val) => setNewProp({...newProp, status: val as any})}
                       className="border-red-500"
                     />
                   </div>
                </div>

                {/* Owner Selection with Quick Add */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Proprietário</label>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <SearchableSelect 
                                options={owners.map(owner => ({ value: owner.id, label: `${owner.name} (${owner.document})` }))}
                                value={newProp.ownerId || ''}
                                onChange={(val) => setNewProp({...newProp, ownerId: val})}
                                placeholder="Selecione o Proprietário..."
                                className="border-red-500"
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={openQuickOwnerModal}
                            className="bg-indigo-600 text-white px-3 rounded hover:bg-indigo-700 flex items-center gap-1 shadow-sm whitespace-nowrap"
                            title="Cadastrar Novo Proprietário"
                        >
                            <Plus size={18} /> <span className="hidden sm:inline">Novo</span>
                        </button>
                    </div>
                </div>

                {/* Registry Data */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-2"><ScrollText size={16}/> Dados de Cartório (Opcional)</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <ClearableInput type="text" placeholder="Matrícula" className="border p-2 rounded text-sm" 
                           value={newProp.registryData?.matricula || ''} 
                           onChange={e => setNewProp({...newProp, registryData: { ...newProp.registryData!, matricula: e.target.value }})} onClear={() => setNewProp({...newProp, registryData: { ...newProp.registryData!, matricula: '' }})} />
                        <ClearableInput type="text" placeholder="Cartório" className="border p-2 rounded text-sm" 
                           value={newProp.registryData?.cartorio || ''} 
                           onChange={e => setNewProp({...newProp, registryData: { ...newProp.registryData!, cartorio: e.target.value }})} onClear={() => setNewProp({...newProp, registryData: { ...newProp.registryData!, cartorio: '' }})} />
                        <ClearableInput type="text" placeholder="Livro" className="border p-2 rounded text-sm" 
                           value={newProp.registryData?.livro || ''} 
                           onChange={e => setNewProp({...newProp, registryData: { ...newProp.registryData!, livro: e.target.value }})} onClear={() => setNewProp({...newProp, registryData: { ...newProp.registryData!, livro: '' }})} />
                        <ClearableInput type="text" placeholder="Folha" className="border p-2 rounded text-sm" 
                           value={newProp.registryData?.folha || ''} 
                           onChange={e => setNewProp({...newProp, registryData: { ...newProp.registryData!, folha: e.target.value }})} onClear={() => setNewProp({...newProp, registryData: { ...newProp.registryData!, folha: '' }})} />
                    </div>
                </div>

                {/* Custom Fields */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-2"><List size={16}/> Campos Personalizados</h4>
                    
                    {newProp.customFields && Object.entries(newProp.customFields).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 mb-2 text-sm">
                            <span className="font-medium text-slate-600">{key}: <span className="font-normal text-slate-800">{val}</span></span>
                            <button type="button" onClick={() => removeCustomField(key)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                        </div>
                    ))}

                    <div className="flex gap-2">
                        <ClearableInput type="text" placeholder="Nome do Campo (Ex: Voltagem)" className="flex-1 border p-2 rounded text-sm"
                           value={tempCustomFieldKey} onChange={e => setTempCustomFieldKey(e.target.value)} onClear={() => setTempCustomFieldKey('')} />
                        <ClearableInput type="text" placeholder="Valor" className="flex-1 border p-2 rounded text-sm"
                           value={tempCustomFieldValue} onChange={e => setTempCustomFieldValue(e.target.value)} onClear={() => setTempCustomFieldValue('')} />
                        <button type="button" onClick={handleAddCustomField} className="bg-slate-200 hover:bg-slate-300 p-2 rounded"><Plus size={16}/></button>
                    </div>
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Etiquetas</label>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <button
                                type="button"
                                key={tag.id}
                                onClick={() => toggleTagOnProperty(tag.id)}
                                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                                    (newProp.tags || []).includes(tag.id) 
                                    ? `bg-indigo-600 text-white border-indigo-600 shadow-sm` 
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
              <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
              <button form="propForm" type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700">
                {isEditingMode ? 'Salvar Alterações' : 'Salvar Imóvel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Quick Owner Modal --- */}
      {showOwnerModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-md animate-in zoom-in-95 shadow-2xl">
                  {/* ... Modal content ... */}
                  <div className="bg-indigo-600 p-4 rounded-t-xl flex justify-between items-center text-white">
                      <h3 className="font-bold flex items-center gap-2"><User size={20}/> Cadastro Rápido de Proprietário</h3>
                      <button type="button" onClick={() => setShowOwnerModal(false)} className="hover:bg-white/20 p-1 rounded"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      {suggestedOwnerData && (
                          <div className="bg-green-50 border border-green-200 rounded p-3 text-xs text-green-800 mb-2 flex gap-2">
                              <Sparkles size={16} className="shrink-0 mt-0.5"/>
                              <div>Dados extraídos do documento do imóvel. Verifique antes de salvar.</div>
                          </div>
                      )}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo / Razão Social</label>
                          <ClearableInput 
                              type="text" 
                              className="w-full border border-slate-300 rounded p-2 text-slate-900"
                              value={newOwnerName}
                              onChange={e => setNewOwnerName(e.target.value)}
                              onClear={() => setNewOwnerName('')}
                              placeholder="Nome do Proprietário"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">CPF / CNPJ</label>
                          <ClearableInput 
                              type="text" 
                              className="w-full border border-slate-300 rounded p-2 text-slate-900 font-mono"
                              value={newOwnerDoc}
                              onChange={e => setNewOwnerDoc(formatDocumentMask(e.target.value))}
                              onClear={() => setNewOwnerDoc('')}
                              placeholder="000.000.000-00"
                              maxLength={18}
                          />
                      </div>
                      <p className="text-xs text-slate-500">Para cadastrar mais detalhes (endereço completo, CNAEs, etc.), utilize a aba "Cadastros Gerais" posteriormente.</p>
                      <button 
                          type="button"
                          onClick={handleQuickAddOwner}
                          disabled={!newOwnerName || !newOwnerDoc}
                          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 mt-2"
                      >
                          Salvar e Vincular
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* VIEWING DOC MODAL - Added here for AssetManager */}
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
  );
};

export default AssetManager;