import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabaseClient] ERRO: Variáveis de ambiente não encontradas');
  console.error('[supabaseClient] VITE_SUPABASE_URL:', supabaseUrl);
  console.error('[supabaseClient] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'definida' : 'undefined');
  throw new Error('Missing Supabase environment variables');
}

console.log('[supabaseClient] Inicializando Supabase...');
console.log('[supabaseClient] URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'patrimonio360-web'
    }
  }
});

console.log('[supabaseClient] Supabase inicializado com sucesso');
