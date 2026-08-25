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

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (currentUser) {
        const fallbackIsAdmin = (
          currentUser.uid === 'g0jsC6oh0ogC9leMzevt17i7cvF3' ||
          currentUser.email?.toLowerCase() === 'emanoel.s.amorim@gmail.com'
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
        setUserProfile(null);
        setIsAdmin(false);
        setIsRestricted(false);
        setLoading(false);
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
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
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
