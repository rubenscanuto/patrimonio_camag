import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

export const authService = {
  async signUp(email: string, password: string, profile: UserProfile) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        name: profile.name,
        email: profile.email,
        company_name: profile.companyName,
      });

    if (profileError) throw profileError;

    return data;
  },

  async signIn(email: string, password: string) {
    console.log('[authService.signIn] Tentando login com email:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[authService.signIn] Erro no login:', error.message, error.status);
      throw error;
    }

    console.log('[authService.signIn] Login bem-sucedido');
    console.log('[authService.signIn] User ID:', data.user?.id);
    console.log('[authService.signIn] Session:', !!data.session);

    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    console.log('[authService.getCurrentUser] Verificando usuário atual...');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[authService.getCurrentUser] Erro:', error);
      throw error;
    }

    console.log('[authService.getCurrentUser] Usuário:', user?.id || 'null');
    return user;
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      name: data.name,
      email: data.email,
      companyName: data.company_name,
    };
  },

  async updateUserProfile(userId: string, profile: Partial<UserProfile>) {
    const updates: any = {};
    if (profile.name !== undefined) updates.name = profile.name;
    if (profile.email !== undefined) updates.email = profile.email;
    if (profile.companyName !== undefined) updates.company_name = profile.companyName;

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  },

  onAuthStateChange(callback: (user: any) => void) {
    console.log('[authService.onAuthStateChange] Registrando listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[authService.onAuthStateChange] Evento:', event);
      console.log('[authService.onAuthStateChange] User:', session?.user?.id || 'null');
      console.log('[authService.onAuthStateChange] Session ativa:', !!session);

      (() => {
        callback(session?.user ?? null);
      })();
    });

    return subscription;
  },
};
