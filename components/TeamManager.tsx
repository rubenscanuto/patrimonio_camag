import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { Users, Phone, ShieldCheck, Mail, Briefcase, Plus, CheckSquare, Eraser, ChevronDown, User, X } from 'lucide-react';
import { getNextId } from '../services/idService';

interface TeamManagerProps {
  employees: Employee[];
  onAddEmployee: (emp: Employee) => void;
}

interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
}

// Helper for Phone Mask (XX) XXXXX-XXXX
const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length > 11) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
  return v;
};

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
            className={`w-full ${className} pr-8 cursor-pointer border border-slate-300 rounded p-2 outline-none focus:border-indigo-500 bg-white`}
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
      // Gera ID sequencial com prefixo 'C' (Colaborador)
      const newId = getNextId('Employee');
      
      onAddEmployee({
        id: newId,
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
        {employees.map(emp => (
          <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <User size={20} />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-800">{emp.name}</h3>
                    <p className="text-xs text-slate-500">{emp.role}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {emp.id}</p>
                 </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {emp.status === 'Active' ? 'Ativo' : 'Afastado'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400"/>
                    <span>{emp.contact || 'Sem contato'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-slate-400"/>
                    <span>{emp.activeTasks} tarefas ativas</span>
                </div>
            </div>
          </div>
        ))}
        {employees.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <Users size={48} className="mx-auto mb-3 opacity-20"/>
                <p>Nenhum colaborador cadastrado.</p>
            </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800">Novo Colaborador</h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                        <ClearableInput required value={newEmp.name || ''} onChange={e => setNewEmp({...newEmp, name: e.target.value})} onClear={() => setNewEmp({...newEmp, name: ''})} className="border-slate-300 border p-2 rounded"/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Função / Cargo</label>
                        <ClearableInput required value={newEmp.role || ''} onChange={e => setNewEmp({...newEmp, role: e.target.value})} onClear={() => setNewEmp({...newEmp, role: ''})} className="border-slate-300 border p-2 rounded"/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Contato (Tel/Email)</label>
                        <ClearableInput 
                            value={newEmp.contact || ''} 
                            onChange={e => {
                                const val = e.target.value;
                                // Basic heuristic: if it looks like email, lowercase it; if number, mask it
                                if (val.includes('@')) {
                                    setNewEmp({...newEmp, contact: val.toLowerCase()});
                                } else {
                                    setNewEmp({...newEmp, contact: formatPhone(val)});
                                }
                            }} 
                            onClear={() => setNewEmp({...newEmp, contact: ''})} 
                            className="border-slate-300 border p-2 rounded"
                            placeholder="(82) 99999-9999 ou email@exemplo.com"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                        <SearchableSelect 
                            options={[{ value: 'Active', label: 'Ativo' }, { value: 'On Leave', label: 'Afastado' }]}
                            value={newEmp.status || 'Active'}
                            onChange={(val) => setNewEmp({...newEmp, status: val as any})}
                        />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 mt-2">Salvar Colaborador</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;