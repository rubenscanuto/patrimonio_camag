import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, AIConfig, AIProvider, MonthlyIndexData } from '../types';
import { Save, Key, User, Plus, Trash2, Check, ShieldCheck, Cpu, Database, RefreshCw, Loader2, Eraser, ChevronDown } from 'lucide-react';

interface SettingsViewProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  aiConfigs: AIConfig[];
  onAddAIConfig: (config: AIConfig) => void;
  onDeleteAIConfig: (id: string) => void;
  onSetActiveAIConfig: (id: string) => void;
  indicesDatabase: MonthlyIndexData[];
  onForceUpdateIndices: () => void;
  isUpdatingIndices?: boolean;
  initialTab?: 'Profile' | 'AI' | 'Indices';
}

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
            className={`w-full ${className} pr-8 cursor-pointer border border-red-500 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none`}
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

const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  onUpdateProfile,
  aiConfigs,
  onAddAIConfig,
  onDeleteAIConfig,
  onSetActiveAIConfig,
  indicesDatabase,
  onForceUpdateIndices,
  isUpdatingIndices = false,
  initialTab = 'AI'
}) => {
  const [activeTab, setActiveTab] = useState<'Profile' | 'AI' | 'Indices'>(initialTab);
  
  // Update activeTab if initialTab changes prop
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Profile Form State
  const [profileForm, setProfileForm] = useState(userProfile);

  // AI Config Form State
  const [newConfigLabel, setNewConfigLabel] = useState('');
  const [newConfigProvider, setNewConfigProvider] = useState<AIProvider>('Google Gemini');
  const [newConfigKey, setNewConfigKey] = useState('');
  const [newConfigModel, setNewConfigModel] = useState('gemini-2.5-flash');
  const [isCustomModel, setIsCustomModel] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    alert('Perfil atualizado com sucesso!');
  };

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (newConfigLabel && newConfigKey && newConfigModel) {
      onAddAIConfig({
        id: Date.now().toString(),
        label: newConfigLabel,
        provider: newConfigProvider,
        apiKey: newConfigKey,
        modelName: newConfigModel,
        isActive: aiConfigs.length === 0 // Make active if it's the first one
      });
      // Reset form
      setNewConfigLabel('');
      setNewConfigKey('');
      setNewConfigModel('gemini-2.5-flash');
      setIsCustomModel(false);
    }
  };

  const GOOGLE_MODELS = [
    'gemini-2.5-flash',
    'gemini-3-pro-preview',
    'gemini-2.5-flash-image',
    'gemini-2.5-flash-lite-latest'
  ];

  const OPENAI_MODELS = [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ];

  const ANTHROPIC_MODELS = [
    'claude-3-5-sonnet-latest',
    'claude-3-opus-latest'
  ];

  const getModelOptions = () => {
      switch(newConfigProvider) {
          case 'Google Gemini': return GOOGLE_MODELS;
          case 'OpenAI': return OPENAI_MODELS;
          case 'Anthropic': return ANTHROPIC_MODELS;
          default: return [];
      }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Configurações</h2>
        <p className="text-slate-500">Gerencie seus dados e integrações de inteligência artificial.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Menu */}
        <div className="w-full lg:w-64 flex flex-col gap-2">
           <button 
             onClick={() => setActiveTab('AI')}
             className={`p-3 rounded-lg text-left flex items-center gap-3 font-medium transition-colors ${activeTab === 'AI' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
           >
             <Key size={18} /> Chaves de API & IA
           </button>
           <button 
             onClick={() => setActiveTab('Indices')}
             className={`p-3 rounded-lg text-left flex items-center gap-3 font-medium transition-colors ${activeTab === 'Indices' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
           >
             <Database size={18} /> Base de Índices
           </button>
           <button 
             onClick={() => setActiveTab('Profile')}
             className={`p-3 rounded-lg text-left flex items-center gap-3 font-medium transition-colors ${activeTab === 'Profile' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
           >
             <User size={18} /> Dados do Usuário
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1">
           
           {/* --- AI Configuration Tab --- */}
           {activeTab === 'AI' && (
             <div className="space-y-6">
               
               {/* Add New Key Form */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Plus size={20} className="text-indigo-600"/> Cadastrar Nova Chave de API
                 </h3>
                 <form onSubmit={handleAddKey} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Chave (Rótulo)</label>
                            <ClearableInput required type="text" placeholder="Ex: Gemini Pessoal" 
                                className="w-full border border-red-500 bg-white rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                                value={newConfigLabel} onChange={e => setNewConfigLabel(e.target.value)} onClear={() => setNewConfigLabel('')}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Provedor LLM</label>
                            <SearchableSelect 
                                options={[
                                    { value: 'Google Gemini', label: 'Google Gemini' },
                                    { value: 'OpenAI', label: 'OpenAI (Simulado)' },
                                    { value: 'Anthropic', label: 'Anthropic (Simulado)' }
                                ]}
                                value={newConfigProvider}
                                onChange={(val) => {
                                    setNewConfigProvider(val as AIProvider);
                                    setNewConfigModel('');
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Chave de API (Secret Key)</label>
                        <div className="relative">
                            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                            <input required type="password" placeholder="sk-..." 
                                className="w-full border border-red-500 bg-white rounded p-2 pl-9 pr-8 text-slate-900 focus:border-indigo-500 outline-none font-mono"
                                value={newConfigKey} onChange={e => setNewConfigKey(e.target.value)}
                            />
                            {newConfigKey && (
                                <button type="button" onClick={() => setNewConfigKey('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                                    <Eraser size={14}/>
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">A chave é armazenada localmente no seu navegador.</p>
                    </div>

                    {/* Dynamic Model Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-bold text-slate-700">Modelo LLM</label>
                            <button type="button" onClick={() => setIsCustomModel(!isCustomModel)} className="text-xs text-indigo-600 hover:underline">
                                {isCustomModel ? 'Selecionar da Lista' : 'Digitar Nome Manualmente'}
                            </button>
                        </div>
                        
                        {isCustomModel ? (
                             <ClearableInput required type="text" placeholder="Ex: gemini-1.5-pro-latest" 
                                className="w-full border border-red-500 bg-white rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                                value={newConfigModel} onChange={e => setNewConfigModel(e.target.value)} onClear={() => setNewConfigModel('')}
                            />
                        ) : (
                            <SearchableSelect 
                                options={getModelOptions().map(m => ({ value: m, label: m }))}
                                value={newConfigModel}
                                onChange={(val) => setNewConfigModel(val)}
                                placeholder="Selecione um modelo..."
                            />
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                            {isCustomModel 
                              ? "Útil quando a LLM lança um novo modelo ainda não listado." 
                              : "Selecione um dos modelos padrão recomendados."}
                        </p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                            <Save size={18}/> Salvar Chave
                        </button>
                    </div>
                 </form>
               </div>

               {/* List of Keys */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-4 bg-slate-50 border-b border-slate-100">
                       <h3 className="font-bold text-slate-800">Chaves Cadastradas</h3>
                   </div>
                   {aiConfigs.length === 0 ? (
                       <div className="p-8 text-center text-slate-400">
                           <Key size={48} className="mx-auto mb-3 opacity-20"/>
                           <p>Nenhuma chave configurada.</p>
                       </div>
                   ) : (
                       <div className="divide-y divide-slate-100">
                           {aiConfigs.map(config => (
                               <div key={config.id} className={`p-4 flex items-center justify-between ${config.isActive ? 'bg-indigo-50/50' : ''}`}>
                                   <div className="flex items-center gap-4">
                                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                           <ShieldCheck size={20} />
                                       </div>
                                       <div>
                                           <div className="flex items-center gap-2">
                                               <h4 className="font-bold text-slate-800">{config.label}</h4>
                                               {config.isActive && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ATIVA</span>}
                                           </div>
                                           <div className="text-sm text-slate-500 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 mt-1">
                                               <span className="flex items-center gap-1"><Key size={12}/> {config.provider}</span>
                                               <span className="flex items-center gap-1"><Cpu size={12}/> {config.modelName}</span>
                                               <span className="font-mono text-xs opacity-70">••••{config.apiKey.slice(-4)}</span>
                                           </div>
                                       </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                       {!config.isActive && (
                                           <button 
                                             onClick={() => onSetActiveAIConfig(config.id)}
                                             className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                           >
                                             Definir como Ativa
                                           </button>
                                       )}
                                       <button 
                                         onClick={() => onDeleteAIConfig(config.id)}
                                         className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                         title="Excluir"
                                       >
                                           <Trash2 size={18}/>
                                       </button>
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
             </div>
           )}

           {/* --- Indices Database Tab --- */}
           {activeTab === 'Indices' && (
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                   <div className="flex justify-between items-center mb-6">
                       <div>
                           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                               <Database size={20} className="text-indigo-600"/> Base de Dados de Índices
                           </h3>
                           <p className="text-sm text-slate-500 mt-1">
                               Esta tabela é atualizada automaticamente todo fim de mês para agilizar cálculos.
                           </p>
                       </div>
                       <button 
                           onClick={onForceUpdateIndices}
                           disabled={isUpdatingIndices}
                           className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                       >
                           {isUpdatingIndices ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16} />} 
                           {isUpdatingIndices ? 'Baixando do Banco Central...' : 'Forçar Atualização'}
                       </button>
                   </div>

                   {indicesDatabase.length === 0 ? (
                       <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg">
                           <Database size={48} className="mx-auto mb-3 opacity-20"/>
                           <p>Nenhum dado histórico armazenado.</p>
                           <p className="text-xs mt-1">O sistema atualizará automaticamente ao detectar imóveis ou clique no botão acima.</p>
                       </div>
                   ) : (
                       <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[500px]">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-slate-50 sticky top-0 font-semibold text-xs uppercase tracking-wider">
                                   <tr>
                                       <th className="px-4 py-3 border-b text-slate-500">Mês/Ano</th>
                                       <th className="px-4 py-3 border-b text-blue-600">IPCA (%)</th>
                                       <th className="px-4 py-3 border-b text-red-600">IGPM (%)</th>
                                       <th className="px-4 py-3 border-b text-green-600">INCC (%)</th>
                                       <th className="px-4 py-3 border-b text-slate-600">SELIC (%)</th>
                                       <th className="px-4 py-3 border-b text-purple-600">CDI (%)</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100 bg-white">
                                   {indicesDatabase.map((data) => (
                                       <tr key={data.date} className="hover:bg-slate-50 transition-colors">
                                           <td className="px-4 py-3 font-mono text-slate-700 font-medium">{data.date}</td>
                                           <td className="px-4 py-3 text-blue-700 font-medium">
                                               {typeof data.indices['IPCA'] === 'number' ? data.indices['IPCA'].toFixed(2) : '-'}
                                           </td>
                                           <td className="px-4 py-3 text-red-700 font-medium">
                                               {typeof data.indices['IGPM'] === 'number' ? data.indices['IGPM'].toFixed(2) : '-'}
                                           </td>
                                           <td className="px-4 py-3 text-green-700 font-medium">
                                               {typeof data.indices['INCC'] === 'number' ? data.indices['INCC'].toFixed(2) : '-'}
                                           </td>
                                           <td className="px-4 py-3 text-slate-700 font-medium">
                                               {typeof data.indices['SELIC'] === 'number' ? data.indices['SELIC'].toFixed(2) : '-'}
                                           </td>
                                           <td className="px-4 py-3 text-purple-700 font-medium">
                                               {typeof data.indices['CDI'] === 'number' ? data.indices['CDI'].toFixed(2) : '-'}
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   )}
                   <p className="text-xs text-slate-400 mt-2 text-right">Mostrando {indicesDatabase.length} registros mensais.</p>
               </div>
           )}

           {/* --- User Profile Tab --- */}
           {activeTab === 'Profile' && (
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl">
                   <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                       <User size={20} className="text-indigo-600"/> Dados Cadastrais
                   </h3>
                   <form onSubmit={handleSaveProfile} className="space-y-4">
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                           <ClearableInput type="text" className="w-full border border-red-500 bg-white rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                               value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} onClear={() => setProfileForm({...profileForm, name: ''})}
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                           <ClearableInput type="email" className="w-full border border-red-500 bg-white rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                               value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} onClear={() => setProfileForm({...profileForm, email: ''})}
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Holding / Empresa</label>
                           <ClearableInput type="text" className="w-full border border-red-500 bg-white rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                               value={profileForm.companyName} onChange={e => setProfileForm({...profileForm, companyName: e.target.value})} onClear={() => setProfileForm({...profileForm, companyName: ''})}
                           />
                       </div>
                       <div className="pt-4 flex justify-end">
                           <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm">
                               Salvar Perfil
                           </button>
                       </div>
                   </form>
               </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default SettingsView;