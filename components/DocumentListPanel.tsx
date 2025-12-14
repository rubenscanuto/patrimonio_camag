import React, { useState, useRef } from 'react';
import { Document, AIConfig } from '../types';
import { FileText, Eye, Download, Trash2, Sparkles, Upload, CheckSquare, Square, X, Save, AlertTriangle, Calendar, ChevronDown, Info } from 'lucide-react';
import { analyzeDocumentContent } from '../services/geminiService';

interface DocumentListPanelProps {
  documents: Document[];
  relatedPropertyId?: string;
  relatedOwnerId?: string;
  onAddDocument: (doc: Document) => void;
  onEditDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  aiConfig?: AIConfig;
}

const DocumentListPanel: React.FC<DocumentListPanelProps> = ({
  documents,
  relatedPropertyId,
  relatedOwnerId,
  onAddDocument,
  onEditDocument,
  onDeleteDocument,
  aiConfig,
}) => {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [summaryPanelDoc, setSummaryPanelDoc] = useState<Document | null>(null);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = documents.filter(doc => {
    if (relatedPropertyId && doc.relatedPropertyId === relatedPropertyId) return true;
    if (relatedOwnerId && doc.relatedOwnerId === relatedOwnerId) return true;
    return false;
  });

  const toggleSelectDoc = (id: string) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDocs(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === filteredDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const handleDownloadSelected = () => {
    filteredDocs.filter(d => selectedDocs.has(d.id)).forEach(doc => {
      const link = document.createElement('a');
      link.href = doc.contentRaw || '';
      link.download = doc.name;
      link.click();
    });
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Deseja excluir ${selectedDocs.size} documento(s)?`)) {
      selectedDocs.forEach(id => onDeleteDocument(id));
      setSelectedDocs(new Set());
    }
  };

  const handleDownload = (e: React.MouseEvent, doc: Document) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = doc.contentRaw || '';
    link.download = doc.name;
    link.click();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Deseja excluir este documento?')) {
      onDeleteDocument(id);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = async (event) => {
        const content = event.target?.result as string;

        const newDoc: Document = {
          id: `D_${Date.now()}_${i}`,
          name: file.name,
          category: 'Uncategorized',
          uploadDate: new Date().toLocaleDateString('pt-BR'),
          summary: '',
          summaryHistory: [],
          relatedPropertyId: relatedPropertyId || '',
          relatedOwnerId: relatedOwnerId || '',
          contentRaw: content,
          aiAnalysis: {
            keyDates: [],
            riskLevel: 'Low',
            monetaryValues: [],
          },
        };

        if (aiConfig) {
          setIsAnalyzing(true);
          try {
            const analysis = await analyzeDocumentContent(
              content,
              aiConfig.apiKey,
              'General',
              aiConfig.provider,
              aiConfig.modelName
            );
            newDoc.category = analysis.category;
            newDoc.summary = analysis.summary;
            newDoc.aiAnalysis = {
              riskLevel: analysis.riskLevel,
              keyDates: analysis.keyDates,
              monetaryValues: analysis.monetaryValues,
            };
          } catch (error) {
            console.error('Erro ao analisar documento:', error);
          } finally {
            setIsAnalyzing(false);
          }
        }

        onAddDocument(newDoc);
      };

      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveSummary = () => {
    if (summaryPanelDoc) {
      const updatedDoc = {
        ...summaryPanelDoc,
        summary: editedSummary,
        summaryHistory: [
          ...(summaryPanelDoc.summaryHistory || []),
          {
            timestamp: new Date().toISOString(),
            content: summaryPanelDoc.summary || '',
            editedBy: 'Usuário',
          },
        ],
      };
      onEditDocument(updatedDoc);
      setSummaryPanelDoc(updatedDoc);
      setIsEditingSummary(false);
    }
  };

  const handleUndoSummary = () => {
    if (summaryPanelDoc && summaryPanelDoc.summaryHistory && summaryPanelDoc.summaryHistory.length > 0) {
      const history = [...summaryPanelDoc.summaryHistory];
      const previous = history.pop();

      if (previous) {
        const updatedDoc = {
          ...summaryPanelDoc,
          summary: previous.content,
          summaryHistory: history,
        };
        onEditDocument(updatedDoc);
        setSummaryPanelDoc(updatedDoc);
        setEditedSummary(previous.content);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            {selectedDocs.size === filteredDocs.length && filteredDocs.length > 0 ? (
              <CheckSquare size={16} />
            ) : (
              <Square size={16} />
            )}
            {selectedDocs.size === filteredDocs.length && filteredDocs.length > 0
              ? 'Desmarcar Todos'
              : 'Selecionar Todos'}
          </button>

          {selectedDocs.size > 0 && (
            <span className="text-sm text-slate-500">
              {selectedDocs.size} selecionado(s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedDocs.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleDownloadSelected}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors"
              >
                <Download size={16} />
                Baixar ({selectedDocs.size})
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
              >
                <Trash2 size={16} />
                Excluir ({selectedDocs.size})
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
            disabled={isAnalyzing}
          >
            <Upload size={16} />
            {isAnalyzing ? 'Analisando...' : 'Upload'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhum documento vinculado</p>
          <p className="text-sm mt-1">Faça upload de documentos para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className={`bg-white p-4 rounded-xl border ${
                selectedDocs.has(doc.id) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'
              } shadow-sm hover:shadow-md transition-all cursor-pointer`}
              onClick={() => setSummaryPanelDoc(doc)}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectDoc(doc.id);
                  }}
                  className="mt-1 text-slate-400 hover:text-indigo-600"
                >
                  {selectedDocs.has(doc.id) ? (
                    <CheckSquare size={20} className="text-indigo-600" />
                  ) : (
                    <Square size={20} />
                  )}
                </button>

                <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600 mt-0.5">
                  <FileText size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800 truncate">{doc.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">ID: {doc.id}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Calendar size={12} />
                    <span>{doc.uploadDate}</span>
                    <span>•</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{doc.category}</span>
                  </div>
                  {doc.summary && (
                    <p className="text-xs text-slate-600 mt-2 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                      Documento analisado
                    </p>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingDoc(doc);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Visualizar"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryPanelDoc(doc)}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    title="Resumo Inteligente"
                  >
                    <Sparkles size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, doc)}
                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Baixar"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, doc.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg">{viewingDoc.name}</h3>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-50">
              {viewingDoc.contentRaw?.startsWith('data:image') ? (
                <img src={viewingDoc.contentRaw} alt={viewingDoc.name} className="max-w-full h-auto mx-auto" />
              ) : viewingDoc.contentRaw?.startsWith('data:application/pdf') ? (
                <iframe src={viewingDoc.contentRaw} className="w-full h-[70vh] border-0 rounded" />
              ) : (
                <p className="text-slate-500">Visualização não disponível para este tipo de arquivo.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {summaryPanelDoc && (
        <div className="fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              <h3 className="font-bold">Resumo Inteligente</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSummaryPanelDoc(null);
                setIsEditingSummary(false);
              }}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            <div>
              <h4 className="font-bold text-lg text-slate-800">{summaryPanelDoc.name}</h4>
              <p className="text-sm text-slate-500 mt-1">{summaryPanelDoc.uploadDate}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Resumo</p>
                {!isEditingSummary && (
                  <div className="flex gap-2">
                    {summaryPanelDoc.summaryHistory && summaryPanelDoc.summaryHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={handleUndoSummary}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                      >
                        <ChevronDown size={12} className="rotate-90" />
                        Desfazer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingSummary(true);
                        setEditedSummary(summaryPanelDoc.summary || '');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
              {isEditingSummary ? (
                <div className="space-y-2">
                  <textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="w-full text-sm text-slate-700 bg-white p-4 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:outline-none leading-relaxed min-h-[400px]"
                    placeholder="Digite o resumo do documento..."
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveSummary}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                    >
                      <Save size={14} /> Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingSummary(false);
                        setEditedSummary(summaryPanelDoc.summary || '');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    >
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-wrap">
                  {summaryPanelDoc.summary}
                </p>
              )}
            </div>

            {summaryPanelDoc.aiAnalysis && (
              <>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Nível de Risco</p>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                      summaryPanelDoc.aiAnalysis.riskLevel === 'High'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : summaryPanelDoc.aiAnalysis.riskLevel === 'Medium'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}
                  >
                    {summaryPanelDoc.aiAnalysis.riskLevel === 'High' && <AlertTriangle size={12} />}
                    {summaryPanelDoc.aiAnalysis.riskLevel === 'High'
                      ? 'Alto Risco'
                      : summaryPanelDoc.aiAnalysis.riskLevel === 'Medium'
                      ? 'Risco Médio'
                      : 'Risco Baixo'}
                  </span>
                </div>

                {summaryPanelDoc.aiAnalysis.keyDates && summaryPanelDoc.aiAnalysis.keyDates.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Datas Importantes</p>
                    <div className="space-y-2">
                      {summaryPanelDoc.aiAnalysis.keyDates.map((date, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-slate-200">
                          <Calendar size={14} className="text-indigo-600" />
                          <span className="text-slate-700">{date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summaryPanelDoc.aiAnalysis.monetaryValues && summaryPanelDoc.aiAnalysis.monetaryValues.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Valores Monetários</p>
                    <div className="space-y-2">
                      {summaryPanelDoc.aiAnalysis.monetaryValues.map((value, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-slate-200">
                          <p className="text-sm text-slate-700 font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentListPanel;
