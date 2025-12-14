import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, AIConfig, AIProvider, MonthlyIndexData, CloudAccount, CloudProvider } from '../types';
import { Save, Key, User, Plus, Trash2, ShieldCheck, Cpu, Database, RefreshCw, Loader2, Eraser, ChevronDown, Cloud, Power, PowerOff, Pencil, ExternalLink, Lock, HelpCircle, HardDrive, Server, Eye, EyeOff } from 'lucide-react';
import { getNextId } from '../services/idService';

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
  initialTab?: 'Profile' | 'AI' | 'Indices' | 'Cloud';
  hideSidebar?: boolean;
  
  // Cloud Props
  cloudAccounts?: CloudAccount[];
  onAddCloudAccount?: (account: CloudAccount) => void;
  onDeleteCloudAccount?: (id: string) => void;
}

// --- Icons ---
const GoogleIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const OpenAIIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="#10A37F"/>
  </svg>
);

const AnthropicIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="anthropic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: '#CC785C', stopOpacity: 1}} />
        <stop offset="100%" style={{stopColor: '#B8613E', stopOpacity: 1}} />
      </linearGradient>
    </defs>
    <path d="M18.6667 3L23.3333 13.5H19.5L18.5 11H13.5L12.5 13.5H8.66667L13.3333 3H18.6667ZM16.8 7.5L16 9.3H14.4L13.6 7.5H16.8Z" fill="url(#anthropic-gradient)" />
    <path d="M12 21L7.33333 10.5H3.5L8.16667 21H12Z" fill="url(#anthropic-gradient)" />
  </svg>
);

const GoogleDriveLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 25.3-43.2 25.3 43.2z" fill="#0066da" opacity=".2"/>
    <path d="m6.6 66.85 25.3-43.2 25.3 43.2z" fill="#0066da" opacity=".1"/>
    <path d="M29.815 17.1 6.2 58h16.2l16.2-28.05z" fill="#0066da"/>
    <path d="m32.6 12.35 14.9-2.6 14.85 2.6-9 15.6h-29.7z" fill="#00ac47"/>
    <path d="m53.35 27.95 25.3 43.2h-16.2l-17.2-29.4z" fill="#ea4335"/>
    <path d="M29.815 17.1h29.7l-8.1 14.1h-30.6z" fill="#00ac47"/>
    <path d="M22.4 58h49.5l-8.1 14.1h-50.4z" fill="#2684fc"/>
    <path d="m53.35 27.95 9 15.6-17.2 29.4-9-15.6z" fill="#ffba00"/>
  </svg>
);

const OneDriveLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <path d="M40.7 26.8c-.3 0-.6 0-.8.1-1.3-6-6.6-10.5-13-10.5-5.6 0-10.4 3.5-12.4 8.5C13.5 24.3 12.3 24 11 24c-5.5 0-10 4.5-10 10 0 5.4 4.3 9.7 9.6 9.9h30.2c7.2 0 13-5.8 13-13-.1-7-5.7-12.8-12.7-12.9l-.4-.2z" fill="#0078D4"/>
    <path d="M51.9 44H24.5c-1.3 0-2.4-1.1-2.4-2.4 0-1.3 1.1-2.4 2.4-2.4h27.4c4.6 0 8.3-3.7 8.3-8.3 0-4.6-3.7-8.3-8.3-8.3-.5 0-1.1 0-1.6.1l-1 .3-.3-1c-1-3.6-4.3-6.1-8-6.1-3.1 0-5.9 1.8-7.3 4.6l-.6 1.1-1.2-.2c-1.4-.2-2.8-.3-4.2-.3-7.9 0-14.4 6.5-14.4 14.4 0 5.6 3.3 10.5 8.2 12.8l1.3.6H10.7c-5.1-.3-9.1-4.6-9.1-9.7 0-5.4 4.3-9.7 9.6-9.7 1.3 0 2.5.3 3.6 1 1.9-5.1 6.8-8.6 12.4-8.6 6.3 0 11.7 4.5 13 10.5 6.9.1 12.5 5.8 12.6 12.8 0 7.3-5.9 13.2-13.2 13.2" fill="#0078D4" opacity="0.2"/>
  </svg>
);

const DropboxLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#0061FF">
    <path d="M7.06 1L0 5.61l7.06 4.607L14.12 5.61z"/>
    <path d="M16.94 1L9.88 5.61l7.06 4.607L24 5.61z"/>
    <path d="M7.06 19.387L0 14.78l7.06-4.61 7.06 4.61z"/>
    <path d="M16.94 19.387l7.06-4.607-7.06-4.61-7.06 4.61z"/>
    <path d="M7.06 19.98l4.94 3.197 4.94-3.197-4.94-3.23z"/>
  </svg>
);

const AWSLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#FF9900">
    <path d="M17.4 12.8c-1 .6-2.1 1-3.3 1.2-3.3.6-5.8-1.5-6.8-2.6-.3-.3-.2-.8.2-1 .3-.2.8-.2 1.1 0 .8.9 2.9 2.6 5.6 2.1.9-.2 1.8-.6 2.5-1.1.4-.2.8-.1 1 .3.2.3.1.8-.3 1.1zM6.6 9.9c-.3.2-.8.2-1.1-.1-.8-.9-2.9-2.6-5.6-2.1-.9.2-1.8.6-2.5 1.1-.4.2-.8.1-1-.3-.2-.3-.1-.8.3-1.1 1-.6 2.1-1 3.3-1.2 3.3-.6 5.8 1.5 6.8 2.6.3.3.2.8-.2 1.1z" transform="translate(3, 4)"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity="0.3"/>
  </svg>
);

const BoxLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#0061D5">
    <rect x="2" y="7" width="20" height="12" rx="2" ry="2"/>
    <path d="M10 2L2 7h20l-8-5z" fill="#0061D5" opacity="0.7"/>
  </svg>
);

// --- Data & Constants ---

type CostTier = 'Low' | 'Medium' | 'High';

interface ModelInfo {
  id: string;
  label: string;
  cost: CostTier;
}

const MODEL_CATALOG: Record<AIProvider, ModelInfo[]> = {
  'Google Gemini': [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', cost: 'Low' },
    { id: 'gemini-2.5-flash-lite-latest', label: 'Gemini 2.5 Flash Lite', cost: 'Low' },
    { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', cost: 'Low' },
    { id: 'gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro (Preview)', cost: 'Medium' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', cost: 'Medium' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', cost: 'Low' },
    { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (Future)', cost: 'High' },
  ],
  'OpenAI': [
    { id: 'gpt-4o', label: 'GPT-4o', cost: 'Medium' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: 'Low' },
    { id: 'o1-preview', label: 'o1 Preview (Reasoning)', cost: 'High' },
    { id: 'o1-mini', label: 'o1 Mini (Reasoning)', cost: 'Medium' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', cost: 'High' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', cost: 'Low' },
  ],
  'Anthropic': [
    { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', cost: 'Medium' },
    { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', cost: 'Low' },
    { id: 'claude-3-opus-latest', label: 'Claude 3 Opus', cost: 'High' },
    { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', cost: 'Low' },
  ]
};

const COST_CONFIG: Record<CostTier, { color: string; label: string; icon: string }> = {
  'Low': { color: 'bg-green-500', label: 'Custo Baixo', icon: '$' },
  'Medium': { color: 'bg-yellow-500', label: 'Custo Médio', icon: '$$' },
  'High': { color: 'bg-red-500', label: 'Custo Alto', icon: '$$$' },
};

// --- Cloud Logic ---
interface CloudField {
  key: string;
  label: string;
  placeholder: string;
  description: string;
  instructions: string;
  type?: 'text' | 'password';
  consoleUrl?: string;
}

const CLOUD_CONFIGS: Record<string, CloudField[]> = {
  'Google Drive': [
    { 
      key: 'clientId', label: 'ID do Cliente (Client ID)', placeholder: 'Ex: 123456-...apps.googleusercontent.com', type: 'text',
      description: 'Identificador único do seu aplicativo no Google Cloud.',
      instructions: 'Acesse Google Cloud Console > APIs & Services > Credentials. Crie um "OAuth 2.0 Client ID".',
      consoleUrl: 'https://console.cloud.google.com/apis/credentials'
    },
    {
      key: 'clientSecret', label: 'Senha (Client Secret)', placeholder: 'Ex: GOCSPX-xyz...', type: 'password',
      description: 'Senha secreta para autenticação do aplicativo.',
      instructions: 'Disponível na mesma tela onde você criou o Client ID. Mantenha em sigilo.'
    },
    {
      key: 'redirectUri', label: 'URI de Redirecionamento', placeholder: 'http://localhost:5173', type: 'text',
      description: 'URL de retorno autorizada.',
      instructions: 'Adicione a URL do seu aplicativo na lista "Authorized redirect URIs" no Google Console.'
    }
  ],
  'OneDrive': [
    {
      key: 'clientId', label: 'ID do Aplicativo (Client ID)', placeholder: 'Ex: 00000000-0000-0000-0000-000000000000', type: 'text',
      description: 'ID do aplicativo no Azure Portal.',
      instructions: 'Acesse Azure Portal > App Registrations > Novo Registro. Copie o ID gerado.',
      consoleUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade'
    },
    {
      key: 'clientSecret', label: 'Senha (Secret)', placeholder: 'Valor do segredo...', type: 'password',
      description: 'Chave secreta para provar a identidade do app.',
      instructions: 'Em "Certificates & secrets", crie um novo Client Secret e copie o "Value" imediatamente.'
    }
  ],
  'Dropbox': [
    {
      key: 'appKey', label: 'Chave do App (App Key)', placeholder: 'Ex: u45...p89', type: 'text',
      description: 'Chave pública do aplicativo Dropbox.',
      instructions: 'Acesse Dropbox App Console > Create App. A App Key estará nas configurações.',
      consoleUrl: 'https://www.dropbox.com/developers/apps'
    },
    {
      key: 'appSecret', label: 'Senha do App (App Secret)', placeholder: 'Ex: d92...k21', type: 'password',
      description: 'Chave privada do aplicativo.',
      instructions: 'Localizada logo abaixo da App Key no console do Dropbox.'
    },
    {
      key: 'accessToken', label: 'Token de Acesso Gerado (Opcional)', placeholder: 'sl.Bg...', type: 'password',
      description: 'Token de acesso temporário para testes rápidos.',
      instructions: 'No App Console, clique em "Generate" na seção OAuth 2 para obter um token imediato.'
    }
  ],
  'AWS S3': [
    {
        key: 'accessKeyId', label: 'Access Key ID', placeholder: 'AKIA...', description: 'ID da chave de acesso AWS.', instructions: 'Console AWS > IAM > Usuários > Credenciais de segurança.', type: 'text', consoleUrl: 'https://console.aws.amazon.com/iam/home'
    },
    {
        key: 'secretAccessKey', label: 'Secret Access Key', placeholder: 'wJalr...', description: 'Chave secreta de acesso.', instructions: 'Exibida apenas no momento da criação da Access Key.', type: 'password'
    },
    {
        key: 'bucketRegion', label: 'Região do Bucket', placeholder: 'us-east-1', description: 'Código da região onde o bucket foi criado.', instructions: 'Ex: us-east-1, sa-east-1 (São Paulo).', type: 'text'
    },
    {
        key: 'bucketName', label: 'Nome do Bucket', placeholder: 'meu-patrimonio-backup', description: 'Nome único do bucket S3.', instructions: 'Nome exato do bucket criado no S3.', type: 'text'
    }
  ],
  'Box': [
    {
        key: 'clientId', label: 'Client ID', placeholder: 'Ex: 12345abcde...', type: 'text', description: 'ID do aplicativo Box.', instructions: 'Box Developer Console > My Apps.'
    },
    {
        key: 'clientSecret', label: 'Client Secret', placeholder: 'Ex: secret...', type: 'password', description: 'Segredo do aplicativo.', instructions: 'Box Developer Console > Configuration.'
    }
  ],
  'Default': [
    {
      key: 'apiUrl', label: 'URL da API / Endpoint', placeholder: 'https://api.exemplo.com/v1', type: 'text',
      description: 'Endereço base para comunicação com o serviço.',
      instructions: 'Consulte a documentação técnica do desenvolvedor do serviço escolhido.'
    },
    {
      key: 'apiKey', label: 'Chave da API / Token', placeholder: 'Token de autenticação', type: 'password',
      description: 'Chave de segurança para autorizar as requisições.',
      instructions: 'Geralmente encontrado nas configurações de conta ou painel de desenvolvedor do serviço.'
    }
  ]
};

const EMAIL_DOMAINS: Record<string, string> = {
    'Google Drive': '@gmail.com',
    'OneDrive': '@outlook.com',
    'Dropbox': '@gmail.com',
    'iCloud': '@icloud.com'
};

// --- Components ---

interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
}

const ClearableInput = React.forwardRef<HTMLInputElement, ClearableInputProps>(({ onClear, className = "", ...props }, ref) => {
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        className={`w-full ${className} ${props.value && !props.readOnly && !props.disabled ? 'pr-10' : ''}`}
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
});
ClearableInput.displayName = "ClearableInput";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear: () => void;
  leftIcon?: React.ReactNode;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ onClear, leftIcon, className = "", ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          {leftIcon}
        </div>
      )}
      <input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        className={`w-full ${className} ${leftIcon ? 'pl-10' : ''} ${props.value ? 'pr-20' : 'pr-10'}`}
        {...props}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 items-center">
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-slate-400 hover:text-slate-600 p-1 bg-transparent border-0 cursor-pointer transition-colors"
          tabIndex={-1}
          title={showPassword ? 'Ocultar' : 'Exibir'}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        {props.value && !props.readOnly && !props.disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-slate-400 hover:text-slate-600 p-1 bg-transparent border-0 cursor-pointer transition-colors"
            tabIndex={-1}
            title="Limpar campo"
          >
            <Eraser size={14} />
          </button>
        )}
      </div>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

interface SearchableSelectProps {
  options: { value: string; label: string; icon?: React.ReactNode }[];
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

  const getSelectedIcon = () => {
      const selected = options.find(o => o.value === value);
      return selected?.icon;
  };

  return (
    <div className="relative w-full">
      <div className="relative">
         {getSelectedIcon() && (
             <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                 {getSelectedIcon()}
             </div>
         )}
         <input
            type="text"
            className={`w-full ${className} pr-10 cursor-pointer border border-slate-300 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none ${getSelectedIcon() ? 'pl-9' : ''}`}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
            onFocus={() => { setIsOpen(true); setSearchTerm(''); }}
            readOnly={false}
         />
         <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 items-center pointer-events-none">
            <ChevronDown size={14} className="text-slate-400" />
         </div>
         {value && (
            <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); onChange(''); setSearchTerm(''); }} 
                className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 pointer-events-auto"
            >
                <Eraser size={14} />
            </button>
         )}
      </div>
      
      {isOpen && (
        <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
            <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {filtered.map(opt => (
                <li key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm flex items-center gap-2 ${opt.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                >
                    {opt.icon && <span className="shrink-0 text-slate-500">{opt.icon}</span>}
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

const HelpTooltip: React.FC<{ description: string; instructions: string }> = ({ description, instructions }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block ml-2">
      <button 
        type="button" 
        className="text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        <HelpCircle size={16} />
      </button>
      {show && (
        <div className="absolute z-50 w-64 bg-slate-800 text-white text-xs rounded p-3 shadow-lg -translate-x-1/2 left-1/2 bottom-full mb-2 animate-in fade-in zoom-in-95 duration-200">
          <p className="font-bold mb-1 text-indigo-300">O que é isso?</p>
          <p className="mb-2">{description}</p>
          <p className="font-bold mb-1 text-green-300">Como obter?</p>
          <p>{instructions}</p>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

const CostVisualizer: React.FC<{ tier?: CostTier }> = ({ tier }) => {
    if (!tier) return null;

    const config = COST_CONFIG[tier];
    
    return (
        <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custo do Token</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${config.color}`}>
                    {config.label} ({config.icon})
                </span>
            </div>
            
            <div className="flex gap-1 h-2 w-full mt-1">
                {/* Low Segment */}
                <div className={`flex-1 rounded-l-full transition-colors duration-300 ${
                    tier === 'Low' ? 'bg-green-500' : 
                    tier === 'Medium' || tier === 'High' ? 'bg-green-300 opacity-50' : 'bg-slate-200'
                }`}></div>
                
                {/* Medium Segment */}
                <div className={`flex-1 transition-colors duration-300 ${
                    tier === 'Medium' ? 'bg-yellow-500' : 
                    tier === 'High' ? 'bg-yellow-300 opacity-50' : 'bg-slate-200'
                }`}></div>
                
                {/* High Segment */}
                <div className={`flex-1 rounded-r-full transition-colors duration-300 ${
                    tier === 'High' ? 'bg-red-500' : 'bg-slate-200'
                }`}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
                {tier === 'Low' && "Ideal para tarefas rotineiras, extração de dados simples e alto volume."}
                {tier === 'Medium' && "Balanceado para raciocínio complexo e geração de conteúdo."}
                {tier === 'High' && "Melhor para tarefas que exigem criatividade extrema ou lógica avançada."}
            </p>
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
  initialTab = 'AI',
  hideSidebar = false,
  cloudAccounts = [],
  onAddCloudAccount,
  onDeleteCloudAccount
}) => {
  const [activeTab, setActiveTab] = useState<'Profile' | 'AI' | 'Indices' | 'Cloud'>(initialTab);
  
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
  const [customAIProviderName, setCustomAIProviderName] = useState('');
  const [isCustomProvider, setIsCustomProvider] = useState(false);

  // Cloud Form State
  const [newCloudProvider, setNewCloudProvider] = useState<CloudProvider>('Google Drive');
  const [customCloudProviderName, setCustomCloudProviderName] = useState('');
  const [newCloudEmail, setNewCloudEmail] = useState('');
  const [cloudCredentials, setCloudCredentials] = useState<Record<string, string>>({});
  const [cloudFormFields, setCloudFormFields] = useState<CloudField[]>(CLOUD_CONFIGS['Google Drive']);
  const [editingCloudId, setEditingCloudId] = useState<string | null>(null);
  const customProviderInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    alert('Perfil atualizado com sucesso!');
  };

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (newConfigLabel && newConfigKey && newConfigModel) {
      const finalProvider = isCustomProvider && customAIProviderName
        ? (customAIProviderName as AIProvider)
        : newConfigProvider;

      onAddAIConfig({
        id: Date.now().toString(),
        label: newConfigLabel,
        provider: finalProvider,
        apiKey: newConfigKey,
        modelName: newConfigModel,
        isActive: aiConfigs.length === 0 // Make active if it's the first one
      });
      // Reset form
      setNewConfigLabel('');
      setNewConfigKey('');
      setNewConfigModel('');
      setIsCustomModel(false);
      setCustomAIProviderName('');
      setIsCustomProvider(false);
      setNewConfigProvider('Google Gemini');
    }
  };

  // Cloud Handlers
  useEffect(() => {
    if (newCloudProvider === 'Outras') {
        setCloudFormFields(CLOUD_CONFIGS['Default']);
        if (customProviderInputRef.current) customProviderInputRef.current.focus();
    } else {
        const config = CLOUD_CONFIGS[newCloudProvider];
        if (config) {
            setCloudFormFields(config);
            setCustomCloudProviderName('');
        } else {
            setCloudFormFields(CLOUD_CONFIGS['Default']);
        }
    }
    if (!editingCloudId) setCloudCredentials({});
  }, [newCloudProvider, editingCloudId]);

  const detectCustomProviderRequirements = (providerName: string) => {
      const lower = providerName.toLowerCase();
      let fields = CLOUD_CONFIGS['Default'];
      if (lower.includes('s3') || lower.includes('aws')) {
          fields = CLOUD_CONFIGS['AWS S3'];
      }
      setCloudFormFields(fields);
  };

  const handleCustomProviderBlur = () => { if (customCloudProviderName) detectCustomProviderRequirements(customCloudProviderName); };
  const handleCloudCredentialChange = (key: string, value: string) => { setCloudCredentials(prev => ({ ...prev, [key]: value })); };

  const handleSaveCloudAccount = (e: React.MouseEvent, connect: boolean) => { 
      e.preventDefault(); 
      if(newCloudEmail && onAddCloudAccount && onDeleteCloudAccount) { 
          const accountData: CloudAccount = { 
              id: editingCloudId || getNextId('Cloud'), 
              provider: newCloudProvider === 'Outras' ? customCloudProviderName : newCloudProvider, 
              accountName: newCloudEmail.toLowerCase(), 
              credentials: cloudCredentials,
              isConnected: connect, 
              authDate: new Date().toLocaleDateString() 
          };
          if (editingCloudId) { onDeleteCloudAccount(editingCloudId); onAddCloudAccount(accountData); } else { onAddCloudAccount(accountData); }
          setNewCloudEmail(''); setCloudCredentials({}); setCustomCloudProviderName(''); setNewCloudProvider('Google Drive'); setEditingCloudId(null);
      }
  };

  const startEditingCloudAccount = (account: CloudAccount) => {
      setEditingCloudId(account.id);
      setNewCloudEmail(account.accountName);
      setCloudCredentials(account.credentials || {});
      const standardProviders = ['Google Drive', 'OneDrive', 'Dropbox', 'AWS S3', 'Box', 'iCloud'];
      if (standardProviders.includes(account.provider)) {
          setNewCloudProvider(account.provider as CloudProvider);
          setCustomCloudProviderName('');
      } else {
          setNewCloudProvider('Outras');
          setCustomCloudProviderName(account.provider);
      }
  };

  const toggleCloudConnection = (account: CloudAccount) => { 
      if(onDeleteCloudAccount && onAddCloudAccount) {
          onDeleteCloudAccount(account.id); 
          onAddCloudAccount({ ...account, isConnected: !account.isConnected }); 
      }
  };
  const deleteCloudAccount = (id: string) => { 
      if (confirm("Tem certeza que deseja excluir esta conta de nuvem?") && onDeleteCloudAccount) { 
          onDeleteCloudAccount(id); 
          if (editingCloudId === id) { setNewCloudEmail(''); setCloudCredentials({}); setCustomCloudProviderName(''); setNewCloudProvider('Google Drive'); setEditingCloudId(null); } 
      } 
  };
  const getEmailSuggestion = () => { if (!newCloudEmail || newCloudEmail.includes('@')) return null; const domain = EMAIL_DOMAINS[newCloudProvider]; if (!domain) return null; return ( <button type="button" onClick={() => setNewCloudEmail((newCloudEmail + domain).toLowerCase())} className="text-xs text-indigo-600 hover:underline mt-1 block text-left"> Completar com {domain} </button> ); };
  const getProviderIcon = (providerName: string) => {
      if (providerName.includes('Drive')) return <GoogleDriveLogo size={20} />;
      if (providerName.includes('OneDrive')) return <OneDriveLogo size={20} />;
      if (providerName.includes('Dropbox')) return <DropboxLogo size={20} />;
      if (providerName.includes('AWS') || providerName.includes('S3')) return <AWSLogo size={20} />;
      if (providerName.includes('Box')) return <BoxLogo size={20} />;
      if (providerName.includes('iCloud')) return <Cloud size={20} className="text-blue-400" />;
      return <Cloud size={20} className="text-slate-400" />;
  };

  const getProviderUrl = (providerName: string) => {
      if (providerName.includes('Drive')) return 'https://drive.google.com/';
      if (providerName.includes('OneDrive')) return 'https://onedrive.live.com/';
      if (providerName.includes('Dropbox')) return 'https://www.dropbox.com/home';
      if (providerName.includes('AWS') || providerName.includes('S3')) return 'https://s3.console.aws.amazon.com/';
      if (providerName.includes('Box')) return 'https://app.box.com/';
      if (providerName.includes('iCloud')) return 'https://www.icloud.com/iclouddrive/';
      return null;
  };

  const getModelOptions = () => {
      if (isCustomProvider) {
          return [{ value: 'custom', label: 'Digite manualmente o modelo' }];
      }
      const models = MODEL_CATALOG[newConfigProvider] || [];
      return models.map(m => {
          const costIcon = COST_CONFIG[m.cost].icon;
          return {
              value: m.id,
              label: `${m.label} [${costIcon}]`
          };
      });
  };

  const getSelectedModelTier = (): CostTier | undefined => {
      const models = MODEL_CATALOG[newConfigProvider] || [];
      const selected = models.find(m => m.id === newConfigModel);
      return selected?.cost;
  };

  const getAIProviderIcon = (provider: string, size: number = 24) => {
      switch(provider) {
          case 'Google Gemini': return <GoogleIcon size={size} />;
          case 'OpenAI': return <OpenAIIcon size={size} />;
          case 'Anthropic': return <AnthropicIcon size={size} />;
          default: return <Cpu size={size}/>;
      }
  };

  return (
    <div className={`p-6 ${hideSidebar ? '' : 'max-w-5xl mx-auto'}`}>
      {!hideSidebar && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Configurações</h2>
            <p className="text-slate-500">Gerencie seus dados e integrações.</p>
          </div>
      )}

      <div className={`flex flex-col ${hideSidebar ? '' : 'lg:flex-row gap-8'}`}>
        {/* Sidebar Menu - Only show if not hidden */}
        {!hideSidebar && (
            <div className="w-full lg:w-64 flex flex-col gap-2">
            <button 
                onClick={() => setActiveTab('AI')}
                className={`p-3 rounded-lg text-left flex items-center gap-3 font-medium transition-colors ${activeTab === 'AI' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
                <Key size={18} /> Chaves de API
            </button>
            <button 
                onClick={() => setActiveTab('Indices')}
                className={`p-3 rounded-lg text-left flex items-center gap-3 font-medium transition-colors ${activeTab === 'Indices' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
                <Database size={18} /> Base de Índices
            </button>
            <button 
                onClick={() => setActiveTab('Cloud')}
                className={`p-3 rounded-lg text-left flex items-center gap-3 font-medium transition-colors ${activeTab === 'Cloud' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
                <Cloud size={18} /> Nuvens
            </button>
            <button 
                onClick={() => setActiveTab('Profile')}
                className={`p-3 rounded-lg text-left flex items-center gap-3 font-medium transition-colors ${activeTab === 'Profile' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
                <User size={18} /> Dados do Usuário
            </button>
            </div>
        )}

        {/* Content Area */}
        <div className="flex-1">
           
           {/* --- AI Configuration Tab --- */}
           {activeTab === 'AI' && (
             <div className="space-y-6 animate-in fade-in">
               <div className="mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">Chaves de API</h2>
                    <p className="text-slate-500">Configure os provedores de Inteligência Artificial.</p>
               </div>
               {/* Add New Key Form */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Plus size={20} className="text-indigo-600"/> Cadastrar Nova Chave
                 </h3>
                 <form onSubmit={handleAddKey} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Provedor LLM</label>
                            <SearchableSelect
                                options={[
                                    { value: 'Google Gemini', label: 'Google Gemini', icon: <GoogleIcon size={18} /> },
                                    { value: 'OpenAI', label: 'OpenAI', icon: <OpenAIIcon size={18} /> },
                                    { value: 'Anthropic', label: 'Anthropic (Claude)', icon: <AnthropicIcon size={18} /> },
                                    { value: 'Outro', label: 'Outro / Personalizado', icon: <Cpu size={18} /> }
                                ]}
                                value={newConfigProvider}
                                onChange={(val) => {
                                    setNewConfigProvider(val as AIProvider);
                                    setNewConfigModel(''); // Reset model when provider changes
                                    setIsCustomProvider(val === 'Outro');
                                    if (val !== 'Outro') setCustomAIProviderName('');
                                }}
                            />
                        </div>

                        {isCustomProvider && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Provedor</label>
                                <ClearableInput
                                    required
                                    type="text"
                                    placeholder="Ex: Mistral AI, Cohere, etc."
                                    className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                                    value={customAIProviderName}
                                    onChange={e => setCustomAIProviderName(e.target.value)}
                                    onClear={() => setCustomAIProviderName('')}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Modelo</label>
                            {isCustomModel ? (
                                 <ClearableInput required type="text" placeholder="Ex: gemini-1.5-pro-latest" 
                                    className="w-full border border-slate-300 bg-white rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                                    value={newConfigModel} onChange={e => setNewConfigModel(e.target.value)} onClear={() => setNewConfigModel('')}
                                />
                            ) : (
                                <SearchableSelect 
                                    options={getModelOptions()}
                                    value={newConfigModel}
                                    onChange={(val) => setNewConfigModel(val)}
                                    placeholder="Selecione um modelo..."
                                />
                            )}
                            <button type="button" onClick={() => setIsCustomModel(!isCustomModel)} className="text-xs text-indigo-600 hover:underline mt-1">
                                {isCustomModel ? 'Selecionar do Catálogo' : 'Digitar Nome Manualmente'}
                            </button>
                        </div>
                    </div>
                    
                    {!isCustomModel && newConfigModel && (
                        <CostVisualizer tier={getSelectedModelTier()} />
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Chave (Rótulo)</label>
                        <ClearableInput required type="text" placeholder="Ex: Gemini Pessoal" 
                            className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                            value={newConfigLabel} onChange={e => setNewConfigLabel(e.target.value)} onClear={() => setNewConfigLabel('')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Chave de API (Secret Key)</label>
                        <PasswordInput
                            required
                            placeholder="sk-..."
                            className="border border-slate-300 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none font-mono"
                            value={newConfigKey}
                            onChange={e => setNewConfigKey(e.target.value)}
                            onClear={() => setNewConfigKey('')}
                            leftIcon={<Key size={16} />}
                        />
                        <p className="text-xs text-slate-500 mt-1">A chave é armazenada localmente no seu navegador.</p>
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
                           {[...aiConfigs].sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0)).map(config => (
                               <div key={config.id} className={`p-4 flex items-center justify-between ${config.isActive ? 'bg-indigo-50/50' : ''}`}>
                                   <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-slate-100 shadow-sm">
                                           {getAIProviderIcon(config.provider)}
                                       </div>
                                       <div>
                                           <div className="flex items-center gap-2">
                                               <h4 className="font-bold text-slate-800">{config.label}</h4>
                                               {config.isActive && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ATIVA</span>}
                                           </div>
                                           <div className="text-sm text-slate-500 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 mt-1">
                                               <span className="flex items-center gap-1">{getAIProviderIcon(config.provider, 16)} {config.provider}</span>
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
                                         onClick={() => {
                                           setNewConfigLabel(config.label);
                                           setNewConfigProvider(config.provider);
                                           setNewConfigModel(config.modelName);
                                           setNewConfigKey(config.apiKey);
                                           onDeleteAIConfig(config.id);
                                         }}
                                         className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
                                         title="Editar"
                                       >
                                           <Pencil size={18}/>
                                       </button>
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
               <div className="space-y-6 animate-in fade-in">
                   <div className="mb-4">
                       <h2 className="text-2xl font-bold text-slate-800">Base de Índices</h2>
                       <p className="text-slate-500">Histórico de indicadores econômicos.</p>
                   </div>
                   <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                       <div className="flex justify-between items-center mb-6">
                           <div>
                               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                   <Database size={20} className="text-indigo-600"/> Dados Históricos
                               </h3>
                               <p className="text-sm text-slate-500 mt-1">
                                   Sincronizado via Banco Central (BCB) ou IA.
                               </p>
                           </div>
                           <button 
                               onClick={onForceUpdateIndices}
                               disabled={isUpdatingIndices}
                               className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                           >
                               {isUpdatingIndices ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16} />} 
                               {isUpdatingIndices ? 'Atualizando...' : 'Forçar Atualização'}
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
               </div>
           )}

           {/* --- Cloud Tab --- */}
           {activeTab === 'Cloud' && (
               <div className="space-y-6 animate-in fade-in">
                   <div className="mb-4">
                       <h2 className="text-2xl font-bold text-slate-800">Contas na Nuvem</h2>
                       <p className="text-slate-500">Conecte seus provedores de armazenamento para backup.</p>
                   </div>
                   
                   {/* Form - Full Width Frame like AI Keys */}
                   <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Plus size={20} className="text-indigo-600"/> {editingCloudId ? 'Editar Conexão' : 'Nova Conexão'}
                        </h3>
                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Provedor</label>
                                    <SearchableSelect 
                                        options={[
                                            { value: 'Google Drive', label: 'Google Drive', icon: <GoogleDriveLogo /> },
                                            { value: 'OneDrive', label: 'Microsoft OneDrive', icon: <OneDriveLogo /> },
                                            { value: 'Dropbox', label: 'Dropbox', icon: <DropboxLogo /> },
                                            { value: 'AWS S3', label: 'Amazon S3', icon: <AWSLogo /> },
                                            { value: 'Box', label: 'Box', icon: <BoxLogo /> },
                                            { value: 'iCloud', label: 'iCloud (WebDAV)', icon: <Cloud size={16} className="text-blue-400" /> },
                                            { value: 'Outras', label: 'Outro (WebDAV, etc)', icon: <Cloud size={16}/> }
                                        ]}
                                        value={newCloudProvider}
                                        onChange={(val) => setNewCloudProvider(val as CloudProvider)}
                                    />
                                </div>
                                
                                {newCloudProvider === 'Outras' ? (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Serviço Personalizado</label>
                                        <ClearableInput 
                                            ref={customProviderInputRef}
                                            type="text" 
                                            placeholder="Ex: MinIO, Nextcloud..." 
                                            className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                                            value={customCloudProviderName} onChange={e => setCustomCloudProviderName(e.target.value)} 
                                            onBlur={handleCustomProviderBlur}
                                            onClear={() => setCustomCloudProviderName('')}
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Conta / E-mail Principal</label>
                                        <ClearableInput 
                                            type="email" 
                                            placeholder="email@empresa.com" 
                                            className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                                            value={newCloudEmail} onChange={e => setNewCloudEmail(e.target.value)} onClear={() => setNewCloudEmail('')}
                                        />
                                        {getEmailSuggestion()}
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                                <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-2">
                                    <Key size={16} className="text-slate-400"/>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credenciais de Acesso</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {cloudFormFields.map((field) => (
                                        <div key={field.key}>
                                            <div className="flex items-center gap-1 mb-1">
                                                <label className="block text-xs font-bold text-slate-700">{field.label}</label>
                                                <HelpTooltip description={field.description} instructions={field.instructions} />
                                            </div>
                                            {field.type === 'password' ? (
                                                <div className="relative">
                                                    <PasswordInput
                                                        placeholder={field.placeholder}
                                                        className="border border-slate-300 rounded p-2 text-sm text-slate-900 focus:border-indigo-500 outline-none font-mono"
                                                        value={cloudCredentials[field.key] || ''}
                                                        onChange={e => handleCloudCredentialChange(field.key, e.target.value)}
                                                        onClear={() => handleCloudCredentialChange(field.key, '')}
                                                    />
                                                    {field.consoleUrl && (
                                                        <a href={field.consoleUrl} target="_blank" rel="noopener noreferrer" className="absolute right-24 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1" title="Abrir Console do Provedor">
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder={field.placeholder}
                                                        className="w-full border border-slate-300 rounded p-2 text-sm text-slate-900 focus:border-indigo-500 outline-none font-mono"
                                                        value={cloudCredentials[field.key] || ''}
                                                        onChange={e => handleCloudCredentialChange(field.key, e.target.value)}
                                                    />
                                                    {field.consoleUrl && (
                                                        <a href={field.consoleUrl} target="_blank" rel="noopener noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1" title="Abrir Console do Provedor">
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <button 
                                    onClick={(e) => handleSaveCloudAccount(e, false)} 
                                    className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Save size={18}/> Salvar Rascunho
                                </button>
                                <button 
                                    onClick={(e) => handleSaveCloudAccount(e, true)} 
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Power size={18}/> Salvar e Conectar
                                </button>
                            </div>
                        </form>
                   </div>

                   {/* Cloud Accounts List - Unified Frame */}
                   <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                           <h3 className="font-bold text-slate-800">Contas Conectadas</h3>
                           {cloudAccounts.length > 0 && <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{cloudAccounts.length}</span>}
                        </div>
                       
                        {cloudAccounts.length === 0 ? (
                           <div className="p-12 text-center text-slate-400">
                               <Cloud size={48} className="mx-auto mb-3 opacity-20"/>
                               <p>Nenhuma conta conectada.</p>
                           </div>
                        ) : (
                           <div className="divide-y divide-slate-100">
                               {cloudAccounts.map(account => (
                                   <div key={account.id} className={`p-4 flex items-center justify-between transition-colors hover:bg-slate-50 ${account.isConnected ? 'bg-indigo-50/30' : ''}`}>
                                       <div
                                         className="flex items-center gap-4 flex-1 cursor-pointer"
                                         onClick={() => {
                                           const url = getProviderUrl(account.provider);
                                           if (url) window.open(url, '_blank');
                                         }}
                                       >
                                            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-slate-100 shadow-sm">
                                                {getProviderIcon(account.provider)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">{account.accountName}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    <span>{account.provider}</span>
                                                    <span>•</span>
                                                    {account.isConnected ? (
                                                        <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded"><Power size={10}/> Conectado</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded"><PowerOff size={10}/> Off</span>
                                                    )}
                                                </div>
                                            </div>
                                       </div>
                                       
                                       <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => toggleCloudConnection(account)} 
                                                className={`p-2 rounded transition-colors ${account.isConnected ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                title={account.isConnected ? "Desconectar" : "Conectar"}
                                            >
                                                <Power size={18} />
                                            </button>
                                            <button 
                                                onClick={() => startEditingCloudAccount(account)} 
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Editar Credenciais"
                                            >
                                                <Pencil size={18}/>
                                            </button>
                                            <button 
                                                onClick={() => deleteCloudAccount(account.id)} 
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Remover Conta"
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

           {/* --- User Profile Tab --- */}
           {activeTab === 'Profile' && (
               <div className="space-y-6 animate-in fade-in">
                   <div className="mb-4">
                       <h2 className="text-2xl font-bold text-slate-800">Dados do Usuário</h2>
                       <p className="text-slate-500">Informações da conta administrativa.</p>
                   </div>
                   <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <User size={20} className="text-indigo-600"/> Dados Cadastrais
                        </h3>
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                                <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                                    value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} onClear={() => setProfileForm({...profileForm, name: ''})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                                <ClearableInput type="email" className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
                                    value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value.toLowerCase()})} onClear={() => setProfileForm({...profileForm, email: ''})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Holding / Empresa</label>
                                <ClearableInput type="text" className="w-full border border-slate-300 rounded p-2 text-slate-900 focus:border-indigo-500 outline-none"
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
               </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default SettingsView;