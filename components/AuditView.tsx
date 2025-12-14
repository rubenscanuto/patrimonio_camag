import React, { useState, useEffect } from 'react';
import { LogEntry, TrashItem, Property, Document, Owner, Employee, PropertyTag, AIConfig } from '../types';
import { History, Hash, RotateCcw, Search, Loader2, Trash2, Building2, FileText, User, Tag } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface AuditViewProps {
  logs: LogEntry[];
  trash: TrashItem[];
  onRestoreFromTrash: (id: string) => void;
  properties: Property[];
  documents: Document[];
  owners: Owner[];
  employees: Employee[];
  tags: PropertyTag[];
  aiConfig?: AIConfig;
}

const AuditView: React.FC<AuditViewProps> = ({ 
  logs, 
  trash, 
  onRestoreFromTrash, 
  properties, 
  documents, 
  owners, 
  employees, 
  tags, 
  aiConfig 
}) => {
  const [subTab, setSubTab] = useState<'Logs' | 'IDs' | 'Recovery'>('Logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilteredResults, setSearchFilteredResults] = useState<any[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);

  // AI Search Logic
  const handleAiSearch = async (data: any[], type: 'Logs' | 'IDs') => {
      if (!searchTerm) {
          setSearchFilteredResults(data);
          return;
      }

      const lowerTerm = searchTerm.toLowerCase();
      const localResults = data.filter(item => 
          JSON.stringify(item).toLowerCase().includes(lowerTerm)
      );

      if (localResults.length > 0) {
          setSearchFilteredResults(localResults);
          return;
      }

      if (aiConfig) {
          setIsAiSearching(true);
          try {
              const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });
              const prompt = `
                  Analise a lista JSON abaixo e encontre itens que semanticamente correspondam à busca: "${searchTerm}".
                  Retorne apenas um array JSON com os IDs dos itens correspondentes.
                  
                  Dados: ${JSON.stringify(data.slice(0, 50))} // Limitando para evitar estouro de tokens
              `;
              
              const response = await ai.models.generateContent({
                  model: aiConfig.modelName,
                  contents: prompt,
                  config: { responseMimeType: "application/json" }
              });
              
              const matchedIds = JSON.parse(response.text || "[]");
              const aiFiltered = data.filter(item => matchedIds.includes(item.id));
              setSearchFilteredResults(aiFiltered);
          } catch (e) {
              console.error("AI Search failed", e);
              setSearchFilteredResults([]);
          } finally {
              setIsAiSearching(false);
          }
      } else {
          setSearchFilteredResults([]);
      }
  };

  useEffect(() => {
      if (subTab === 'Logs') {
         handleAiSearch(logs || [], 'Logs');
      } else if (subTab === 'IDs') {
         const allEntities = [
            ...properties.map(p => ({...p, type: 'Imóvel'})),
            ...documents.map(d => ({...d, type: 'Documento'})),
            ...owners.map(o => ({...o, type: 'Proprietário'})),
            ...employees.map(e => ({...e, type: 'Colaborador'})),
            ...tags.map(t => ({...t, type: 'Etiqueta'}))
         ];
         handleAiSearch(allEntities, 'IDs');
      } else {
         setSearchFilteredResults([]);
      }
  }, [searchTerm, subTab, logs, properties, documents, owners, employees, tags]);

  return (
    <div className="p-6">
        <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-800">Auditoria e Controle</h2>
            <p className="text-slate-500">Gestão centralizada de logs, identificadores e recuperação de dados.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Sub Navigation */}
            <div className="flex border-b border-slate-200 px-4 bg-slate-50/50">
                <button 
                    onClick={() => { setSubTab('Logs'); setSearchTerm(''); }}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${subTab === 'Logs' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
                >
                    <History size={16}/> Logs de Operações
                </button>
                <button 
                    onClick={() => { setSubTab('IDs'); setSearchTerm(''); }}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${subTab === 'IDs' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
                >
                    <Hash size={16}/> Registro Geral de IDs
                </button>
                <button 
                    onClick={() => { setSubTab('Recovery'); setSearchTerm(''); }}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${subTab === 'Recovery' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
                >
                    <RotateCcw size={16}/> Lixeira / Recuperação
                </button>
            </div>

            {/* Content Area */}
            <div>
                {/* LOGS CONTENT */}
                {subTab === 'Logs' && (
                    <>
                        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar logs (Ex: 'Exclusões de imóveis ontem')..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                                {isAiSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-600" size={18} />}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3">Data/Hora</th>
                                        <th className="px-6 py-3">Ação</th>
                                        <th className="px-6 py-3">Entidade</th>
                                        <th className="px-6 py-3">Descrição</th>
                                        <th className="px-6 py-3">Usuário</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(searchTerm ? searchFilteredResults : (logs || [])).map((log: LogEntry) => (
                                        <tr key={log.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-mono text-slate-600">{log.timestamp}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    log.action === 'Delete' ? 'bg-red-100 text-red-700' :
                                                    log.action === 'Create' ? 'bg-green-100 text-green-700' :
                                                    log.action === 'Restore' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-slate-700">{log.entityType}</td>
                                            <td className="px-6 py-3 text-slate-600">{log.description}</td>
                                            <td className="px-6 py-3 text-slate-500">{log.user}</td>
                                        </tr>
                                    ))}
                                    {(searchTerm ? searchFilteredResults : (logs || [])).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* ID REGISTRY CONTENT */}
                {subTab === 'IDs' && (
                    <>
                        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar por ID ou Nome (IA disponível)..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                                {isAiSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-600" size={18} />}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 w-48">ID Único</th>
                                        <th className="px-6 py-3">Tipo</th>
                                        <th className="px-6 py-3">Nome / Identificação</th>
                                        <th className="px-6 py-3">Vínculos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(searchTerm ? searchFilteredResults : [
                                        ...properties.map(p => ({...p, type: 'Imóvel'})),
                                        ...documents.map(d => ({...d, type: 'Documento'})),
                                        ...owners.map(o => ({...o, type: 'Proprietário'})),
                                        ...employees.map(e => ({...e, type: 'Colaborador'})),
                                        ...tags.map(t => ({...t, type: 'Etiqueta'}))
                                    ]).map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-mono text-xs bg-slate-50 text-slate-600 rounded">{item.id}</td>
                                            <td className="px-6 py-3">
                                                <span className="inline-flex items-center gap-1 bg-white border px-2 py-1 rounded text-xs text-slate-600">
                                                    {item.type === 'Imóvel' && <Building2 size={12}/>}
                                                    {item.type === 'Documento' && <FileText size={12}/>}
                                                    {item.type === 'Proprietário' && <User size={12}/>}
                                                    {item.type === 'Colaborador' && <User size={12}/>}
                                                    {item.type === 'Etiqueta' && <Tag size={12}/>}
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-800">{item.name || item.label}</td>
                                            <td className="px-6 py-3 text-slate-500 text-xs">
                                                {item.ownerId && `Proprietário: ${item.ownerId}`}
                                                {item.relatedPropertyId && `Imóvel: ${item.relatedPropertyId}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* RECOVERY CONTENT */}
                {subTab === 'Recovery' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3">Data Exclusão</th>
                                    <th className="px-6 py-3">Tipo</th>
                                    <th className="px-6 py-3">Item</th>
                                    <th className="px-6 py-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(trash || []).map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-mono text-slate-600">{item.deletedAt}</td>
                                        <td className="px-6 py-3 text-slate-700">{item.entityType}</td>
                                        <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button 
                                                onClick={() => onRestoreFromTrash && onRestoreFromTrash(item.id)}
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ml-auto"
                                            >
                                                <RotateCcw size={14} /> Restaurar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(trash || []).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            <Trash2 size={32} className="mx-auto mb-2 opacity-20"/>
                                            Lixeira vazia.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default AuditView;