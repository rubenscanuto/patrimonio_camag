
// Gerenciador centralizado de IDs Sequenciais
// Persiste o último número utilizado para garantir que nunca seja reutilizado.

type EntityType = 'Property' | 'Owner' | 'Document' | 'Employee' | 'Tag' | 'Cloud' | 'Log';

const PREFIX_MAP: Record<EntityType, string> = {
  'Property': 'I', // Imóvel
  'Owner': 'P',    // Proprietário
  'Document': 'D', // Documento
  'Employee': 'C', // Colaborador
  'Tag': 'E',      // Etiqueta
  'Cloud': 'N',    // Nuvem
  'Log': 'L'       // Log
};

const STORAGE_KEY = 'patrimonio_id_counters';

const getCounters = (): Record<string, number> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
};

const saveCounters = (counters: Record<string, number>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
};

export const getNextId = (type: EntityType): string => {
  const counters = getCounters();
  const prefix = PREFIX_MAP[type];
  
  // Inicializa ou incrementa
  const currentCount = counters[type] || 0;
  const nextCount = currentCount + 1;
  
  // Salva o novo estado
  counters[type] = nextCount;
  saveCounters(counters);
  
  return `${prefix}_${nextCount}`;
};

// Função para reinicializar contadores (apenas para debug/dev se necessário)
export const resetCounters = () => {
  localStorage.removeItem(STORAGE_KEY);
};
