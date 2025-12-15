import React, { useState, useEffect, useRef } from 'react';
import { PropertyTag } from '../types';
import { Plus, Trash2, Tag, Palette, Eraser, ChevronDown } from 'lucide-react';

interface TagManagerViewProps {
  tags: PropertyTag[];
  onAddTag: (tag: PropertyTag) => void;
  onDeleteTag: (id: string) => void;
}

const TAG_COLORS = {
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  gray: 'bg-slate-100 text-slate-800 border-slate-200',
  pink: 'bg-pink-100 text-pink-800 border-pink-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
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
            className={`w-full ${className} pr-8 cursor-pointer border border-red-500 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none`}
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

const TagManagerView: React.FC<TagManagerViewProps> = ({ tags, onAddTag, onDeleteTag }) => {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<PropertyTag['color']>('blue');

  const handleCreateTag = () => {
    if (newTagName) {
      onAddTag({
        id: Date.now().toString(),
        label: newTagName,
        color: newTagColor
      });
      setNewTagName('');
    }
  };

  return (
    <div className="p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-800">Cadastro de Etiquetas</h2>
          <p className="text-slate-500">Gerencie as etiquetas de status para classificar seus imóveis.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-indigo-600"/> Nova Etiqueta
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Etiqueta</label>
                            <ClearableInput 
                                type="text" 
                                placeholder="Ex: Em Reforma, Alugado..." 
                                className="w-full border border-red-500 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newTagName}
                                onChange={e => setNewTagName(e.target.value)}
                                onClear={() => setNewTagName('')}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Cor de Identificação</label>
                            <div className="relative">
                                <SearchableSelect 
                                    options={[
                                        { value: 'blue', label: 'Azul' },
                                        { value: 'green', label: 'Verde' },
                                        { value: 'red', label: 'Vermelho' },
                                        { value: 'yellow', label: 'Amarelo' },
                                        { value: 'purple', label: 'Roxo' },
                                        { value: 'gray', label: 'Cinza' },
                                        { value: 'pink', label: 'Rosa' },
                                        { value: 'indigo', label: 'Índigo' },
                                    ]}
                                    value={newTagColor}
                                    onChange={(val) => setNewTagColor(val as any)}
                                    placeholder="Selecione a cor"
                                />
                                <Palette className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="pt-2">
                             <label className="block text-xs font-medium text-slate-500 mb-2">Pré-visualização</label>
                             <div className={`inline-block px-3 py-1 rounded-full text-sm border font-medium ${TAG_COLORS[newTagColor]}`}>
                                {newTagName || "Nome da Etiqueta"}
                             </div>
                        </div>

                        <button 
                            onClick={handleCreateTag} 
                            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!newTagName}
                        >
                            <Plus size={18} />
                            Cadastrar Etiqueta
                        </button>
                    </div>
                </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                         <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Tag size={18} className="text-slate-500" /> Etiquetas Existentes
                        </h3>
                        <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">{tags.length}</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {tags.map(tag => (
                        <div key={tag.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${TAG_COLORS[tag.color]}`}>
                                    <Tag size={18} />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-800">{tag.label}</h4>
                                    <p className="text-xs text-slate-400 font-mono">ID: {tag.id}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`hidden sm:inline-block text-xs px-2 py-1 rounded border ${TAG_COLORS[tag.color]}`}>
                                    Exemplo Visual
                                </span>
                                <button 
                                    onClick={() => onDeleteTag(tag.id)} 
                                    className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors group"
                                    title="Excluir Etiqueta"
                                >
                                    <Trash2 size={18} className="group-hover:stroke-2"/>
                                </button>
                            </div>
                        </div>
                        ))}
                        {tags.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <Tag size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Nenhuma etiqueta cadastrada no momento.</p>
                                <p className="text-sm mt-1">Use o formulário ao lado para criar.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default TagManagerView;