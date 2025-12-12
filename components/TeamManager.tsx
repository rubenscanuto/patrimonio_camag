import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';
import { Users, Phone, ShieldCheck, Mail, Briefcase, Plus, CheckSquare, Eraser, ChevronDown } from 'lucide-react';

interface TeamManagerProps {
  employees: Employee[];
  onAddEmployee: (emp: Employee) => void;
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

const TeamManager: React.FC<TeamManagerProps> = ({ employees, onAddEmployee }) => {
  const [showModal, setShowModal] = useState(false);
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({ status: 'Active' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmp.name && newEmp.role) {
      onAddEmployee({
        id: Date.now().toString(),
        name: newEmp.name,
        role: newEmp.role,
        assignedProperties: [],
        contact: newEmp.contact || '',
        activeTasks: 0,
        status: newEmp.status as any
      });
      setShowModal(false);
      setNewEmp({ status: 'Active' });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-3xl font-bold text-slate-800 mb-1">Equipe e Controle</h2>
           <p className="text-slate-500">Monitore atividades e desempenho dos colaboradores.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white p-0 rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 flex items-start gap-4">
               <div className="relative">
                 <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400">
                   <Users size={28} />
                 </div>
                 <div className={`absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full ${emp.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
               </div>
               <div className="flex-1">
                 <h3 className="font-bold text-lg text-slate-800">{emp.name}</h3>
                 <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold mb-2">
                   {emp.role}
                 </span>
                 <div className="space-y-1">
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <Phone size={12} /> {emp.contact}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 truncate">
                      <Mail size={12} /> {emp.name.split(' ')[0].toLowerCase()}@patrimonio.com
                    </p>
                 </div>
               </div>
            </div>
            
            {/* Task / Control Section */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 mt-auto">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckSquare size={16} />
                    <span className="font-medium">Tarefas Ativas</span>
                 </div>
                 <span className={`px-2 py-1 rounded text-xs font-bold ${
                   emp.activeTasks > 4 ? 'bg-red-100 text-red-700' : 
                   emp.activeTasks > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                 }`}>
                   {emp.activeTasks} pendentes
                 </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${emp.activeTasks > 4 ? 'bg-red-500' : 'bg-blue-500'}`} 
                  style={{ width: `${Math.min(emp.activeTasks * 20, 100)}%` }}
                ></div>
              </div>
              <button className="w-full mt-3 py-1.5 text-xs font-medium border border-slate-200 bg-white rounded text-slate-600 hover:bg-slate-50">
                Gerenciar Atividades
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Visual placeholder for payroll/logs */}
      <div className="mt-8 bg-indigo-900 rounded-xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold mb-2">Relatório de Produtividade</h3>
            <p className="text-indigo-200 max-w-md">Os logs de acesso e conclusão de tarefas deste mês já estão disponíveis para exportação.</p>
          </div>
          <button className="bg-white text-indigo-900 px-6 py-2 rounded-lg font-bold hover:bg-indigo-50 transition-colors">
            Baixar Relatório PDF
          </button>
        </div>
        <Briefcase size={200} className="absolute -right-10 -bottom-20 text-indigo-800 opacity-20 rotate-12" />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Adicionar Colaborador</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nome Completo</label>
                <ClearableInput required type="text" className="w-full border p-2 rounded" 
                  value={newEmp.name || ''}
                  onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                  onClear={() => setNewEmp({...newEmp, name: ''})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Função/Cargo</label>
                <ClearableInput required type="text" className="w-full border p-2 rounded"
                  value={newEmp.role || ''}
                  onChange={e => setNewEmp({...newEmp, role: e.target.value})} 
                  onClear={() => setNewEmp({...newEmp, role: ''})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Telefone</label>
                <ClearableInput required type="text" className="w-full border p-2 rounded"
                  value={newEmp.contact || ''}
                  onChange={e => setNewEmp({...newEmp, contact: e.target.value})} 
                  onClear={() => setNewEmp({...newEmp, contact: ''})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <SearchableSelect 
                    options={[
                        { value: 'Active', label: 'Ativo' },
                        { value: 'On Leave', label: 'Licença/Férias' }
                    ]}
                    value={newEmp.status || 'Active'}
                    onChange={(val) => setNewEmp({...newEmp, status: val as any})}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;