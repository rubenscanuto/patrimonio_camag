import React, { useState, useRef, useEffect } from 'react';
import { Document, DocumentCategory, Property, AIConfig, Owner } from '../types';
import { FileText, Upload, Search, Tag, AlertTriangle, Calendar, DollarSign, Loader2, Filter, User, Building, CheckSquare, Square, Trash2, Eye, X, Download, Save, Sparkles, Eraser, CloudUpload, ChevronDown, CheckCircle, Link, File, FileSpreadsheet, List } from 'lucide-react';
import { analyzeDocumentContent, AnalyzableFile } from '../services/geminiService';
import { getNextId } from '../services/idService';

// ... (Standard Interfaces)
interface DocumentVaultProps {
  documents: Document[];
  properties: Property[];
  owners?: Owner[];
  onAddDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  onUpdateDocument?: (doc: Document) => void; // Added for saving AI data
  aiConfig?: AIConfig;
}

interface PendingDoc {
    name: string;
    content: string;
    fileObject: File;
    selectedPropertyId?: string;
    selectedOwnerId?: string;
}

// Reuse components (ClearableInput, SearchableSelect, FileViewer)
// ... (Keeping exact same helper components as before for stability)
interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> { onClear: () => void; }
const ClearableInput: React.FC<ClearableInputProps> = ({ onClear, className = "", ...props }) => {
  return (<div className="relative w-full"><input className={`w-full ${className} ${props.value && !props.readOnly && !props.disabled ? 'pr-8' : ''}`} {...props} />{props.value && !props.readOnly && !props.disabled && (<button type="button" onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 bg-transparent border-0 cursor-pointer z-10 transition-colors" tabIndex={-1} title="Limpar campo"><Eraser size={14} /></button>)}</div>);
};

interface SearchableSelectProps { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; placeholder?: string; className?: string; }
const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = "Selecione...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false); const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => { const selected = options.find(o => o.value === value); if (selected) setSearchTerm(selected.label); else if (!value) setSearchTerm(''); }, [value, options]);
  const filtered = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
  return (<div className="relative w-full"><div className="relative"><input type="text" className={`w-full ${className} pr-8 cursor-pointer border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 bg-white text-slate-900 shadow-sm text-sm`} placeholder={placeholder} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }} onFocus={() => { setIsOpen(true); setSearchTerm(''); }} readOnly={false} /><div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 items-center">{value && (<button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setSearchTerm(''); }} className="text-slate-400 hover:text-slate-600 p-1"><Eraser size={14} /></button>)}<ChevronDown size={14} className="text-slate-400" /></div></div>{isOpen && (<><div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} /><ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">{filtered.map(opt => (<li key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm ${opt.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}>{opt.label}</li>))}{filtered.length === 0 && <li className="px-3 py-2 text-slate-400 text-sm italic">Sem resultados</li>}</ul></>)}</div>);
};

const FileViewer: React.FC<{ content: string }> = ({ content }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => { if (content.startsWith('data:application/pdf')) { try { const base64Arr = content.split(','); const base64 = base64Arr.length > 1 ? base64Arr[1] : base64Arr[0]; const binaryStr = atob(base64); const len = binaryStr.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); } const blob = new Blob([bytes], { type: 'application/pdf' }); const url = URL.createObjectURL(blob); setBlobUrl(url); return () => URL.revokeObjectURL(url); } catch (err) { console.error("Erro ao converter PDF para Blob:", err); setBlobUrl(null); } } else { setBlobUrl(null); } }, [content]);
  if (!content) return (<div className="flex flex-col items-center justify-center h-full text-slate-400"><FileText size={48} /><p className="mt-4">Conteúdo não disponível</p></div>);
  if (content.startsWith('data:image')) return (<img src={content} alt="Preview" className="max-w-full max-h-full object-contain mx-auto shadow-sm rounded" />);
  if (content.startsWith('data:application/pdf')) { if (!blobUrl) return (<div className="flex flex-col items-center justify-center h-full text-slate-400"><Loader2 size={32} className="animate-spin mb-2 text-indigo-600" /><p>Preparando visualização do PDF...</p></div>); return (<iframe src={blobUrl} className="w-full h-full rounded border border-slate-200" title="PDF Preview" />); }
  return (<pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-6 rounded shadow-sm overflow-auto h-full">{content}</pre>);
};

// --- DATA FORM MODAL ---
const DocumentDataModal: React.FC<{ doc: Document; onClose: () => void; onSave: (doc: Document) => void; aiConfig?: AIConfig; onReanalyze: (doc: Document) => void }> = ({ doc, onClose, onSave, aiConfig, onReanalyze }) => {
    const [formData, setFormData] = useState<Record<string, string>>(doc.extractedData || {});
    const [summary, setSummary] = useState(doc.summary || '');
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        setFormData(doc.extractedData || {});
        setSummary(doc.summary || '');
    }, [doc]);

    const handleAddField = () => {
        if (newKey && newValue) {
            setFormData(prev => ({ ...prev, [newKey]: newValue }));
            setNewKey('');
            setNewValue('');
        }
    };

    const handleRemoveField = (key: string) => {
        const next = { ...formData };
        delete next[key];
        setFormData(next);
    };

    const handleSave = () => {
        onSave({ ...doc, extractedData: formData, summary });
        onClose();
    };

    const handleForceAnalysis = async () => {
        if(!aiConfig) return;
        setIsAnalyzing(true);
        // This is a "Force Re-analyze" logic that we propagate up or handle here if we had the function context
        // Since we are inside a modal, better to delegate
        onReanalyze(doc);
        setIsAnalyzing(false); 
        // Note: The parent will update the doc, and the useEffect will refresh this form.
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileSpreadsheet size={20} className="text-indigo-600"/> Dados Estruturados
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Summary Section */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resumo Executivo (IA)</label>
                        <textarea 
                            className="w-full border border-slate-200 rounded p-3 text-sm text-slate-700 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-colors h-24"
                            value={summary}
                            onChange={e => setSummary(e.target.value)}
                        />
                    </div>

                    {/* Fields Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Campos Extraídos</label>
                            {aiConfig && (
                                <button 
                                    type="button" 
                                    onClick={handleForceAnalysis}
                                    disabled={isAnalyzing}
                                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                >
                                    <Sparkles size={12}/> {isAnalyzing ? 'Analisando...' : 'Forçar Reanálise IA'}
                                </button>
                            )}
                        </div>
                        
                        <div className="space-y-2 mb-4">
                            {Object.entries(formData).map(([key, val]) => (
                                <div key={key} className="flex gap-2 items-center">
                                    <input type="text" value={key} readOnly className="w-1/3 text-xs font-semibold bg-slate-100 border-transparent rounded p-2 text-slate-600" />
                                    <input type="text" value={val} onChange={(e) => setFormData({...formData, [key]: e.target.value})} className="flex-1 text-sm border border-slate-200 rounded p-2 text-slate-800 focus:border-indigo-500 outline-none" />
                                    <button onClick={() => handleRemoveField(key)} className="text-slate-400 hover:text-red-500 p-1"><X size={14}/></button>
                                </div>
                            ))}
                            {Object.keys(formData).length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">Nenhum dado estruturado extraído.</p>}
                        </div>

                        <div className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200">
                            <input type="text" placeholder="Novo Campo" value={newKey} onChange={e => setNewKey(e.target.value)} className="w-1/3 text-xs p-2 border border-slate-300 rounded" />
                            <input type="text" placeholder="Valor" value={newValue} onChange={e => setNewValue(e.target.value)} className="flex-1 text-sm p-2 border border-slate-300 rounded" />
                            <button onClick={handleAddField} disabled={!newKey || !newValue} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50"><Save size={14}/></button>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                        <Save size={16}/> Salvar Dados
                    </button>
                </div>
            </div>
        </div>
    );
};

const DocumentVault: React.FC<DocumentVaultProps> = ({ documents, properties, owners = [], onAddDocument, onDeleteDocument, onUpdateDocument, aiConfig }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'All'>('All');
  
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [editingDataDoc, setEditingDataDoc] = useState<Document | null>(null);
  
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [filterFlags, setFilterFlags] = useState({ property: true, owner: true, general: true });

  // ... (Process Files Handlers - Keeping existing)
  const processFiles = (fileList: FileList | File[]) => {
      const files: File[] = Array.from(fileList);
      const newDocs: PendingDoc[] = [];
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
              newDocs.push({ name: file.name, content: ev.target?.result as string || '', fileObject: file });
              if (newDocs.length === files.length) setPendingDocs(prev => [...prev, ...newDocs]);
          };
          if(file.type.includes('text') || file.type.includes('json')) reader.readAsText(file); else reader.readAsDataURL(file);
      });
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) processFiles(e.target.files); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); };
  const handlePaste = (e: React.ClipboardEvent) => { if (e.clipboardData.files && e.clipboardData.files.length > 0) processFiles(e.clipboardData.files); };
  const removePendingDoc = (index: number) => { setPendingDocs(prev => prev.filter((_, i) => i !== index)); };
  const updatePendingDocLink = (index: number, field: 'selectedPropertyId' | 'selectedOwnerId', value: string) => { setPendingDocs(prev => prev.map((doc, i) => i === index ? { ...doc, [field]: value } : doc)); };

  const handleUploadAction = async (process: boolean) => {
    if (pendingDocs.length === 0) return;
    if (process && !aiConfig) { alert("Configure uma chave de API nas Configurações primeiro para processar com IA."); return; }
    setIsAnalyzing(true);
    for (const doc of pendingDocs) {
        let aiResult: any = { category: 'Uncategorized', summary: process ? 'Processamento falhou.' : 'Upload manual (sem IA).', riskLevel: 'Low', keyDates: [], monetaryValues: [], structuredData: {} };
        let linkedPropId = doc.selectedPropertyId;
        let linkedOwnerId = doc.selectedOwnerId;

        if (process && aiConfig) {
            try {
                const analyzableFiles: AnalyzableFile[] = [];
                let textContext = "";
                if (doc.content.startsWith('data:')) {
                     const matches = doc.content.match(/^data:(.+);base64,(.+)$/);
                     if (matches && matches.length === 3) analyzableFiles.push({ mimeType: matches[1], data: matches[2] });
                } else { textContext = doc.content; }

                const analysis = await analyzeDocumentContent(textContext, analyzableFiles, aiConfig.apiKey, aiConfig.modelName);
                aiResult = { ...analysis };

                if (!linkedPropId && !linkedOwnerId) {
                    const text = (analysis.summary || doc.name).toLowerCase();
                    const matchedProp = properties.find(p => text.includes(p.name.toLowerCase()) || text.includes(p.address.toLowerCase()));
                    if (matchedProp) linkedPropId = matchedProp.id;
                    const matchedOwner = owners.find(o => text.includes(o.name.toLowerCase()) || (o.document && text.includes(o.document)));
                    if (matchedOwner) linkedOwnerId = matchedOwner.id;
                }
            } catch (e) { console.error("Failed to analyze doc", doc.name, e); aiResult.summary = "Erro na análise de IA."; }
        }

        const newDoc: Document = {
          id: getNextId('Document'), name: doc.name, uploadDate: new Date().toLocaleDateString('pt-BR'), contentRaw: doc.content,
          category: aiResult.category, summary: aiResult.summary, relatedPropertyId: linkedPropId, relatedOwnerId: linkedOwnerId,
          aiAnalysis: { riskLevel: aiResult.riskLevel, keyDates: aiResult.keyDates, monetaryValues: aiResult.monetaryValues },
          extractedData: aiResult.structuredData // Store structured data
        };
        onAddDocument(newDoc);
    }
    setIsAnalyzing(false); setIsUploading(false); setPendingDocs([]);
  };

  const handleDownload = (doc: Document) => {
    if (!doc.contentRaw) { alert("Conteúdo indisponível."); return; }
    try {
      const link = document.createElement('a'); link.download = doc.name;
      if (doc.contentRaw.startsWith('data:')) link.href = doc.contentRaw;
      else { const blob = new Blob([doc.contentRaw], { type: 'text/plain' }); link.href = URL.createObjectURL(blob); }
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { console.error(e); alert("Erro ao iniciar download."); }
  };

  const handleRunAI = async (doc: Document) => {
      if (!aiConfig) { alert("IA não configurada."); return; }
      if (!onUpdateDocument) return;
      
      // If data already exists, open form instead of running again
      if (doc.extractedData && Object.keys(doc.extractedData).length > 0) {
          setEditingDataDoc(doc);
          return;
      }

      // Run Analysis
      try {
          // Show loader (could add local state for specific row loading if needed, using global here for simplicity)
          const analyzableFiles: AnalyzableFile[] = [];
          let textContext = "";
          if (doc.contentRaw?.startsWith('data:')) {
                const matches = doc.contentRaw.match(/^data:(.+);base64,(.+)$/);
                if (matches && matches.length === 3) analyzableFiles.push({ mimeType: matches[1], data: matches[2] });
          } else { textContext = doc.contentRaw || ''; }

          const analysis = await analyzeDocumentContent(textContext, analyzableFiles, aiConfig.apiKey, aiConfig.modelName);
          
          const updatedDoc = {
              ...doc,
              category: analysis.category,
              summary: analysis.summary,
              aiAnalysis: { riskLevel: analysis.riskLevel, keyDates: analysis.keyDates, monetaryValues: analysis.monetaryValues },
              extractedData: analysis.structuredData
          };
          onUpdateDocument(updatedDoc);
          setEditingDataDoc(updatedDoc); // Open form after analysis
      } catch (e) {
          console.error(e);
          alert("Erro ao executar análise de IA.");
      }
  };

  const handleForceReanalyze = async (doc: Document) => {
      if (!aiConfig || !onUpdateDocument) return;
      // Close modal to show we are working? Or keep it open with loader? 
      // For simplicity, we just run the logic similar to handleRunAI but force overwrites
      try {
          const analyzableFiles: AnalyzableFile[] = [];
          let textContext = "";
          if (doc.contentRaw?.startsWith('data:')) {
                const matches = doc.contentRaw.match(/^data:(.+);base64,(.+)$/);
                if (matches && matches.length === 3) analyzableFiles.push({ mimeType: matches[1], data: matches[2] });
          } else { textContext = doc.contentRaw || ''; }

          const analysis = await analyzeDocumentContent(textContext, analyzableFiles, aiConfig.apiKey, aiConfig.modelName);
          
          const updatedDoc = {
              ...doc,
              category: analysis.category,
              summary: analysis.summary,
              aiAnalysis: { riskLevel: analysis.riskLevel, keyDates: analysis.keyDates, monetaryValues: analysis.monetaryValues },
              extractedData: analysis.structuredData
          };
          onUpdateDocument(updatedDoc);
          setEditingDataDoc(updatedDoc); // Refresh modal data
      } catch (e) {
          console.error(e);
          alert("Erro ao reanalisar.");
      }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || doc.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const isPropertyDoc = !!doc.relatedPropertyId;
    const isOwnerDoc = !!doc.relatedOwnerId;
    const isGeneralDoc = !isPropertyDoc && !isOwnerDoc;
    const matchesType = (filterFlags.property && isPropertyDoc) || (filterFlags.owner && isOwnerDoc) || (filterFlags.general && isGeneralDoc);
    return matchesSearch && matchesCategory && matchesType;
  });

  const toggleSelectAll = () => {
      if (selectedDocIds.length === filteredDocs.length) setSelectedDocIds([]);
      else setSelectedDocIds(filteredDocs.map(d => d.id));
  };

  const toggleSelectOne = (id: string) => {
      if (selectedDocIds.includes(id)) setSelectedDocIds(prev => prev.filter(d => d !== id));
      else setSelectedDocIds(prev => [...prev, id]);
  };

  const handleBatchDelete = () => {
      if (confirm(`Excluir ${selectedDocIds.length} documentos?`)) {
          selectedDocIds.forEach(id => onDeleteDocument(id));
          setSelectedDocIds([]);
      }
  };

  const handleBatchDownload = async (singlePDF: boolean) => {
      if (singlePDF) {
          alert("Nota: Devido a restrições do ambiente (sem bibliotecas de PDF), os arquivos serão baixados individualmente em sequência.");
      }
      
      const docsToDownload = documents.filter(d => selectedDocIds.includes(d.id));
      for (const doc of docsToDownload) {
          handleDownload(doc);
          await new Promise(resolve => setTimeout(resolve, 500)); // Delay to prevent browser blocking
      }
  };

  return (
    <div className="p-6 h-full flex flex-col" onPaste={handlePaste}>
       <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Arquivo Digital</h2>
          <p className="text-slate-500">Arquivamento inteligente e análise de contratos.</p>
        </div>
        <button type="button" onClick={() => setIsUploading(!isUploading)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Upload size={18} /> {isUploading ? 'Cancelar' : 'Novo Documento'}
        </button>
      </div>
      
      {/* Upload Area */}
      {isUploading && (
        <div className="bg-indigo-50 border border-dashed border-indigo-200 rounded-lg p-4 mb-8 animate-in slide-in-from-top-4">
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          {pendingDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center cursor-pointer py-8 hover:bg-indigo-100/50 rounded transition-colors" onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDrop={handleDrop}>
                    <div className="flex items-center gap-2 text-indigo-600 font-medium mb-1"><CloudUpload size={24} /><span className="text-lg">Carregamento Inteligente</span></div>
                    <p className="text-sm text-indigo-400 text-center max-w-md">Clique para selecionar, arraste ou cole arquivos (PDF, Imagens, DOCX). A IA classifica e vincula automaticamente.</p>
                </div>
          ) : (
             <div className="space-y-3">
                 <div className="flex justify-between items-center"><h5 className="text-xs font-bold text-indigo-700 uppercase">Arquivos Selecionados</h5><button onClick={() => setPendingDocs([])} className="text-xs text-red-500 hover:underline">Limpar</button></div>
                 <ul className="bg-white rounded border border-indigo-100 divide-y divide-indigo-50 text-xs">
                    {pendingDocs.map((doc, idx) => (
                        <li key={idx} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 overflow-hidden flex-1"><div className="truncate font-medium text-slate-700">{doc.name}</div><span className="text-green-600 flex items-center gap-1 font-medium text-xs shrink-0"><CheckCircle size={14} className="text-green-600" /> Pronto</span></div>
                            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                                    <div className="flex items-center gap-1 text-slate-400"><Link size={12} /><span className="mr-1">Vincular a:</span></div>
                                    <div className="w-40"><select className="w-full border border-slate-200 rounded p-1 text-xs bg-slate-50 outline-none focus:border-indigo-500" value={doc.selectedPropertyId || ''} onChange={(e) => updatePendingDocLink(idx, 'selectedPropertyId', e.target.value)}><option value="">Imóvel (Auto/Nenhum)</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                    <div className="w-40"><select className="w-full border border-slate-200 rounded p-1 text-xs bg-slate-50 outline-none focus:border-indigo-500" value={doc.selectedOwnerId || ''} onChange={(e) => updatePendingDocLink(idx, 'selectedOwnerId', e.target.value)}><option value="">Proprietário (Auto/Nenhum)</option>{owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                                    <button onClick={() => removePendingDoc(idx)} className="text-slate-400 hover:text-red-500 self-end md:self-center"><X size={14}/></button>
                                </div>
                        </li>
                    ))}
                 </ul>
                 <div className="flex gap-2 justify-end pt-2">
                     <button type="button" onClick={() => handleUploadAction(false)} disabled={isAnalyzing} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">Apenas Anexar</button>
                     <button type="button" onClick={() => handleUploadAction(true)} disabled={isAnalyzing} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm">{isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} Processar, Vincular e Arquivar</button>
                 </div>
             </div>
          )}
          {!aiConfig && <p className="text-xs text-red-500 mt-2 text-center">Atenção: Configure a chave de API para usar análise e vinculação automática.</p>}
        </div>
      )}

       <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <ClearableInput type="text" placeholder="Buscar documentos, cláusulas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClear={() => setSearchTerm('')} className="w-full pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white text-slate-900 shadow-sm"/>
                </div>
                <div className="flex gap-4">
                    <button type="button" onClick={() => setFilterFlags(p => ({...p, property: !p.property}))} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${filterFlags.property ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>{filterFlags.property ? <CheckSquare size={16}/> : <Square size={16}/>} Imóveis</button>
                    <button type="button" onClick={() => setFilterFlags(p => ({...p, owner: !p.owner}))} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${filterFlags.owner ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>{filterFlags.owner ? <CheckSquare size={16}/> : <Square size={16}/>} Proprietários</button>
                    <button type="button" onClick={() => setFilterFlags(p => ({...p, general: !p.general}))} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${filterFlags.general ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>{filterFlags.general ? <CheckSquare size={16}/> : <Square size={16}/>} Geral</button>
                </div>
            </div>
            <div className="flex justify-end w-48 ml-auto">
                <SearchableSelect options={[{ value: 'All', label: 'Todas Categorias' }, { value: 'Legal', label: 'Jurídico' }, { value: 'Financial', label: 'Financeiro' }, { value: 'Tax', label: 'Fiscal' }, { value: 'Maintenance', label: 'Manutenção' }, { value: 'Acquisition', label: 'Aquisição' }, { value: 'Personal', label: 'Pessoal' }]} value={selectedCategory} onChange={(val) => setSelectedCategory(val as any)} placeholder="Categoria" />
            </div>
       </div>

       {/* BATCH ACTIONS HEADER */}
       <div className="flex items-center justify-between bg-slate-100 p-3 rounded-t-xl border-b border-slate-200">
           <div className="flex items-center gap-3">
               <button onClick={toggleSelectAll} className="text-slate-500 hover:text-indigo-600">
                   {selectedDocIds.length > 0 && selectedDocIds.length === filteredDocs.length ? <CheckSquare size={20}/> : <Square size={20}/>}
               </button>
               <span className="text-sm font-medium text-slate-600">{selectedDocIds.length} selecionados</span>
           </div>
           {selectedDocIds.length > 0 && (
               <div className="flex gap-2">
                   <div className="group relative">
                       <button className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                           <Download size={16}/> Baixar <ChevronDown size={14}/>
                       </button>
                       <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg hidden group-hover:block w-48 z-10">
                           <button onClick={() => handleBatchDownload(false)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50">Individualmente</button>
                           <button onClick={() => handleBatchDownload(true)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50">Combinar em um PDF</button>
                       </div>
                   </div>
                   <button onClick={handleBatchDelete} className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-2">
                       <Trash2 size={16}/> Excluir
                   </button>
               </div>
           )}
       </div>

       {/* DOCUMENT LIST (Unified Format) */}
       <div className="bg-white border border-slate-200 rounded-b-xl overflow-hidden divide-y divide-slate-100">
        {filteredDocs.map((doc) => {
             const relatedProperty = properties.find(p => p.id === doc.relatedPropertyId);
             const relatedOwner = owners.find(o => o.id === doc.relatedOwnerId);
             const hasAI = doc.aiAnalysis && doc.extractedData;
             const isSelected = selectedDocIds.includes(doc.id);

             return (
                 <div key={doc.id} className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                      {/* Checkbox */}
                      <button onClick={() => toggleSelectOne(doc.id)} className="text-slate-400 hover:text-indigo-600 shrink-0">
                          {isSelected ? <CheckSquare size={20} className="text-indigo-600"/> : <Square size={20}/>}
                      </button>

                      {/* Icon */}
                      <div className={`p-3 rounded-lg text-slate-600 shrink-0 ${doc.category === 'Tax' ? 'bg-red-50 text-red-600' : 'bg-slate-100'}`}><FileText size={20} /></div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-base truncate">{doc.name}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><Calendar size={12}/> {doc.uploadDate}</span>
                              {relatedProperty && <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100"><Building size={10} /> {relatedProperty.name}</span>}
                              {relatedOwner && <span className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100"><User size={10} /> {relatedOwner.name}</span>}
                              <span className={`px-1.5 py-0.5 rounded border ${doc.category === 'Legal' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{doc.category}</span>
                          </div>
                      </div>

                      {/* ACTIONS (Right to Left: AI, Form, View, Download, Delete) */}
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          
                          {/* AI / Form Button */}
                          <button 
                            onClick={() => {
                                if (doc.extractedData) setEditingDataDoc(doc);
                                else handleRunAI(doc);
                            }}
                            className={`p-2 rounded transition-colors relative ${doc.extractedData ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title={doc.extractedData ? "Ver Dados Extraídos" : "Analisar com IA"}
                          >
                              {doc.extractedData ? <FileSpreadsheet size={18} /> : <Sparkles size={18} />}
                              {!doc.extractedData && <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border border-white"></span>}
                          </button>

                          {/* View */}
                          <button onClick={() => setViewingDoc(doc)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Visualizar">
                              <Eye size={18} />
                          </button>

                          {/* Download */}
                          <button onClick={() => handleDownload(doc)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Download">
                              <Download size={18} />
                          </button>

                          {/* Delete */}
                          <button onClick={() => { if(confirm(`Excluir ${doc.name}?`)) onDeleteDocument(doc.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Excluir">
                              <Trash2 size={18} />
                          </button>
                      </div>
                 </div>
             );
        })}
        {filteredDocs.length === 0 && <div className="p-8 text-center text-slate-400 italic">Nenhum documento encontrado.</div>}
       </div>

       {/* Viewing Modal */}
       {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                 <div className="flex items-center gap-3"><div className="bg-indigo-100 p-2 rounded text-indigo-600"><FileText size={24}/></div><div><h3 className="text-lg font-bold text-slate-800">{viewingDoc.name}</h3><p className="text-xs text-slate-500">{viewingDoc.category} • {viewingDoc.uploadDate}</p></div></div>
                 <div className="flex gap-2"><button type="button" onClick={() => handleDownload(viewingDoc)} className="text-slate-500 hover:bg-slate-200 p-2 rounded"><Download size={20}/></button><button type="button" onClick={() => setViewingDoc(null)} className="text-slate-500 hover:bg-red-100 hover:text-red-600 p-2 rounded"><X size={20}/></button></div>
              </div>
              <div className="flex-1 overflow-hidden bg-slate-100 p-6 flex items-center justify-center relative">
                  <FileViewer content={viewingDoc.contentRaw || ''} />
              </div>
           </div>
        </div>
      )}

      {/* Editing Data Modal */}
      {editingDataDoc && (
          <DocumentDataModal 
            doc={editingDataDoc} 
            onClose={() => setEditingDataDoc(null)} 
            onSave={(updatedDoc) => {
                if (onUpdateDocument) onUpdateDocument(updatedDoc);
                setEditingDataDoc(null);
            }}
            aiConfig={aiConfig}
            onReanalyze={handleForceReanalyze}
          />
      )}
    </div>
  );
};

export default DocumentVault;