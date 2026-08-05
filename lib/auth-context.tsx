'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AdminProfile {
  id: string;
  email: string;
  nome: string;
  papel: 'admin_geral' | 'coordenador_adjunto';
  ativo: boolean;
  precisa_trocar_senha: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminProfile: AdminProfile | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateOwnPassword: (newPassword: string) => Promise<{ error: string | null }>;
  isAdmin: boolean;
  isAdminGeral: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAdminProfile(currentUser: User | null) {
    if (!currentUser) {
      setAdminProfile(null);
      return;
    }
    const { data } = await supabase
      .from('admin_users')
      .select('id, email, nome, papel, ativo, precisa_trocar_senha')
      .eq('auth_user_id', currentUser.id)
      .maybeSingle();

    // Se não está ativo, trata como se não estivesse logado como admin
    if (data && !data.ativo) {
      setAdminProfile(null);
      await supabase.auth.signOut();
      return;
    }
    setAdminProfile(data as AdminProfile | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      await loadAdminProfile(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      await loadAdminProfile(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'E-mail ou senha incorretos.' };
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateOwnPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    if (adminProfile) {
      await supabase
        .from('admin_users')
        .update({ precisa_trocar_senha: false })
        .eq('id', adminProfile.id);
      setAdminProfile({ ...adminProfile, precisa_trocar_senha: false });
    }
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      adminProfile,
      loading,
      loginWithPassword,
      logout,
      updateOwnPassword,
      isAdmin: !!adminProfile,
      isAdminGeral: adminProfile?.papel === 'admin_geral',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

