'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  User, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  email: string;
  role: 'admin' | 'restrito';
  createdAt?: any;
  createdBy?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isRestricted: boolean;
  isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    // Verificar se existe sessão persistida localmente (para a conta institucional da coordenação)
    const storedSession = typeof window !== 'undefined' ? localStorage.getItem('esuda_admin_session') : null;
    let localAdminActive = false;

    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        if (parsed && (parsed.email === 'emanoel@esuda.edu.br' || parsed.email === 'emanoel.s.amorim@gmail.com')) {
          localAdminActive = true;
          setUser({
            uid: parsed.uid || 'hRgGEnLUzVVnTeETeh73GMUWbdg2',
            email: parsed.email,
            displayName: 'Emanoel Silva de Amorim',
            emailVerified: true
          } as any);
          setUserProfile({ email: parsed.email, role: 'admin' });
          setIsAdmin(true);
          setIsRestricted(false);
          setLoading(false);
        }
      } catch (e) {
        console.warn('Erro ao restaurar sessão local:', e);
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }

        const fallbackIsAdmin = (
          currentUser.uid === 'g0jsC6oh0ogC9leMzevt17i7cvF3' ||
          currentUser.uid === 'hRgGEnLUzVVnTeETeh73GMUWbdg2' ||
          currentUser.email?.toLowerCase() === 'emanoel.s.amorim@gmail.com' ||
          currentUser.email?.toLowerCase() === 'emanoel@esuda.edu.br'
        );

        // Escutar perfil no Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setUserProfile(data);
            const userIsAdmin = data.role === 'admin' || fallbackIsAdmin;
            setIsAdmin(userIsAdmin);
            setIsRestricted(data.role === 'restrito' && !userIsAdmin);
          } else {
            // Se doc ainda não existe mas é o admin conhecido
            setUserProfile(fallbackIsAdmin ? { email: currentUser.email || '', role: 'admin' } : null);
            setIsAdmin(fallbackIsAdmin);
            setIsRestricted(false);
          }
          setLoading(false);
        }, (err) => {
          console.warn('Erro ao carregar perfil do usuário:', err);
          setUserProfile(fallbackIsAdmin ? { email: currentUser.email || '', role: 'admin' } : null);
          setIsAdmin(fallbackIsAdmin);
          setIsRestricted(false);
          setLoading(false);
        });
      } else {
        if (!localAdminActive) {
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
          setIsRestricted(false);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // 1. Tenta login normal via Firebase Auth
      try {
        await signInWithEmailAndPassword(auth, normalizedEmail, pass);
        // Se deu certo, limpa eventual sessão manual
        if (typeof window !== 'undefined') {
          localStorage.removeItem('esuda_admin_session');
        }
        return;
      } catch (authErr: any) {
        // Se as credenciais forem da coordenação institucional: emanoel@esuda.edu.br / 3443*/A
        if (
          normalizedEmail === 'emanoel@esuda.edu.br' &&
          pass === '3443*/A'
        ) {
          const sessionData = {
            uid: 'hRgGEnLUzVVnTeETeh73GMUWbdg2',
            email: 'emanoel@esuda.edu.br',
            role: 'admin',
            timestamp: Date.now()
          };

          if (typeof window !== 'undefined') {
            localStorage.setItem('esuda_admin_session', JSON.stringify(sessionData));
          }

          setUser({
            uid: sessionData.uid,
            email: sessionData.email,
            displayName: 'Emanoel Silva de Amorim',
            emailVerified: true
          } as any);
          setUserProfile({ email: sessionData.email, role: 'admin' });
          setIsAdmin(true);
          setIsRestricted(false);
          return;
        }

        throw authErr;
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('esuda_admin_session');
      }
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      setIsRestricted(false);
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userProfile, 
        loading, 
        login, 
        logout, 
        isAdmin, 
        isRestricted, 
        isLoggingIn 
      }}
    >
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
