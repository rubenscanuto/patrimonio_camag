
export type PropertyStatus = 'Occupied' | 'Vacant' | 'Under Maintenance';

export interface MaintenanceRecord {
  id: string;
  date: string;
  description: string;
  cost: number;
  status: 'Pending' | 'Completed';
}

export interface RegistryData {
  matricula: string;
  cartorio: string;
  livro?: string;
  folha?: string;
}

export interface PropertyTag {
  id: string;
  label: string;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'pink' | 'indigo';
}

export interface CnaeData {
  code: string;
  text: string;
  isPrimary: boolean;
}

export interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string; // CPF or CNPJ
  profession?: string;
  naturality?: string;
  maritalStatus?: string;
  rg?: string; // Inscrição Estadual para PJ
  municipalRegistration?: string; // Inscrição Municipal
  address?: string;
  legalRepresentative?: string; // Representante Legal para PJ
  legalRepresentativeCpf?: string; // CPF do Representante Legal
  photoUrl?: string;
  cnaes?: CnaeData[];
}

export interface AddressComponents {
  cep: string;
  logradouro: string;
  numero: string;
  semNumero: boolean;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
}

export interface Property {
  id: string;
  name: string;
  address: string; // Full string for display
  addressComponents?: AddressComponents; // Structured data
  value: number; // Valor Contábil/Atual no sistema
  purchaseValue: number;
  purchaseDate: string;
  seller?: string;
  status: PropertyStatus;
  imageUrl: string;
  tenantName?: string;
  contractExpiry?: string;
  registryData?: RegistryData;
  maintenanceHistory?: MaintenanceRecord[];
  customFields?: Record<string, string>; // Campos livres
  tags?: string[]; // IDs das PropertyTags
  coordinates?: {
    lat: number;
    lng: number;
  };
  marketValue?: number; // Valor de Mercado estimado pelo usuário
  ownerId?: string; // Link to Owner
}

export type DocumentCategory = 'Legal' | 'Financial' | 'Maintenance' | 'Tax' | 'Acquisition' | 'Uncategorized' | 'Personal';

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadDate: string;
  summary?: string;
  relatedPropertyId?: string; // Chave estrangeira para Property
  relatedOwnerId?: string; // Chave estrangeira para Owner
  contentRaw?: string; 
  aiAnalysis?: {
    riskLevel: 'Low' | 'Medium' | 'High';
    keyDates: string[];
    monetaryValues: string[];
  };
  extractedData?: Record<string, string>; // Dados estruturados extraídos pela IA e editáveis
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  assignedProperties: string[];
  contact: string;
  activeTasks: number;
  status: 'Active' | 'On Leave';
}

export interface AIAnalysisResult {
  category: DocumentCategory;
  summary: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  keyDates: string[];
  monetaryValues: string[];
  // Dados extras para extração de imóvel
  extractedPropertyData?: Partial<Property>;
  // Dados extras para extração de proprietário
  extractedOwnerData?: Partial<Owner>;
  // Dados genéricos chave-valor
  structuredData?: Record<string, string>;
}

// Configurações de IA e Usuário
export type AIProvider = 'Google Gemini' | 'OpenAI' | 'Anthropic';

export interface AIConfig {
  id: string;
  label: string; // Ex: "Minha Chave Pessoal", "Chave da Empresa"
  provider: AIProvider;
  apiKey: string;
  modelName: string; // Ex: "gemini-2.5-flash", "gpt-4"
  isActive: boolean;
}

// Configurações de Nuvem
export type CloudProvider = 'Google Drive' | 'OneDrive' | 'Dropbox' | 'Outras' | string;

export interface CloudAccount {
  id: string;
  provider: CloudProvider;
  accountName: string; // email ou nome de usuário
  credentials?: Record<string, string>; // Client ID, Secret, etc.
  isConnected: boolean;
  authDate: string;
}

export interface UserProfile {
  name: string;
  email: string;
  companyName: string;
}

// Novos tipos para Índices Econômicos
export interface MonthlyIndexData {
  date: string; // Formato YYYY-MM
  indices: Record<string, number>; // Ex: { 'IPCA': 0.53, 'IGPM': 1.2 } (valores em %)
}

export interface IndicesDatabase {
  lastUpdated: string;
  data: MonthlyIndexData[];
}

// Logs e Auditoria
export interface LogEntry {
  id: string;
  timestamp: string;
  action: 'Create' | 'Update' | 'Delete' | 'Restore' | 'Analysis';
  entityType: 'Property' | 'Document' | 'Owner' | 'Employee' | 'Tag' | 'System';
  description: string;
  user?: string; // Nome do usuário que realizou a ação
  details?: string;
}

// Lixeira / Recuperação
export interface TrashItem {
  id: string; // ID original do item
  deletedAt: string;
  originalData: any; // O objeto completo que foi excluído
  entityType: 'Property' | 'Document' | 'Owner' | 'Employee' | 'Tag' | 'CloudAccount';
  name: string; // Para exibição facilitada
}
