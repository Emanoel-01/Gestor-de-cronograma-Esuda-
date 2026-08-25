'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '@/lib/firebase';
import firebaseConfig from '@/firebase-applet-config.json';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface UserRecord {
  id: string;
  email: string;
  role: 'admin' | 'restrito';
  createdAt?: any;
  createdBy?: string;
}

interface UsersManagerProps {
  currentUser: any;
  isAdmin: boolean;
}

export function UsersManager({ currentUser, isAdmin }: UsersManagerProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'restrito' | 'admin'>('restrito');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserRecord[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      setUsers(list);
      setLoading(false);
    }, (err) => {
      console.error('Erro ao listar usuários:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      setErrorMessage('Informe e-mail e senha.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    let secondaryApp: any = null;
    try {
      // Cria instância isolada para registrar credenciais no Firebase Auth sem deslogar o admin atual
      const appName = `secondaryAuth-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newEmail.trim().toLowerCase(), 
        newPassword
      );
      
      const newUid = userCredential.user.uid;
      
      // Salva na coleção 'users' com o client principal autenticado do admin
      await setDoc(doc(db, 'users', newUid), {
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || currentUser?.uid || 'admin'
      });

      setSuccessMessage(`Usuário ${newEmail} criado com sucesso!`);
      setIsModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewRole('restrito');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Este e-mail já está cadastrado no sistema.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('E-mail inválido.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Senha fraca. Utilize ao menos 6 caracteres.');
      } else {
        setErrorMessage(err.message || 'Erro ao criar usuário.');
      }
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          // ignore
        }
      }
      setSubmitting(false);
    }
  };

  const handleToggleRole = async (userRec: UserRecord) => {
    if (!isAdmin) return;
    if (userRec.id === currentUser?.uid) {
      alert('Você não pode alterar o próprio perfil de acesso.');
      return;
    }

    const nextRole = userRec.role === 'admin' ? 'restrito' : 'admin';
    const confirmMsg = `Deseja alterar o perfil de "${userRec.email}" para ${nextRole.toUpperCase()}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, 'users', userRec.id), {
        role: nextRole
      });
    } catch (err) {
      console.error('Erro ao atualizar papel do usuário:', err);
      alert('Erro ao atualizar papel do usuário.');
    }
  };

  const handleDeleteUserDoc = async (userRec: UserRecord) => {
    if (!isAdmin) return;
    if (userRec.id === currentUser?.uid) {
      alert('Você não pode remover seu próprio acesso.');
      return;
    }

    if (!window.confirm(`Deseja remover as permissões do usuário "${userRec.email}"?`)) return;

    try {
      await deleteDoc(doc(db, 'users', userRec.id));
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      alert('Erro ao remover usuário.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> Gestão de Contas e Perfis de Acesso
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Controle de administradores e acessos de visualização interna dos cronogramas.
          </p>
        </div>
        {isAdmin && (
          <Button 
            id="btn-open-new-user-modal"
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Novo Usuário
          </Button>
        )}
      </div>

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-xs font-bold"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {/* Users Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-md rounded-2xl bg-white">
        {loading ? (
          <div className="p-12 text-center">
            <RotateCcw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Carregando usuários...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Nenhum usuário cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="p-4">E-mail do Usuário</th>
                  <th className="p-4">Perfil de Acesso</th>
                  <th className="p-4">UID / Identificador</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.uid;
                  const isAdm = u.role === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span>{u.email}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-full">
                              Você
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isAdm 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {isAdm ? <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> : <Shield className="w-3.5 h-3.5 text-slate-500" />}
                          {isAdm ? 'Administrador' : 'Restrito (Visualizador)'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-400">
                        {u.id}
                      </td>
                      <td className="p-4 text-right">
                        {isAdmin && !isCurrent && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleRole(u)}
                              title="Alternar Perfil"
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Mudar p/ {u.role === 'admin' ? 'Restrito' : 'Admin'}
                            </button>
                            <button
                              onClick={() => handleDeleteUserDoc(u)}
                              title="Excluir Permissão"
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Novo Usuário */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            id="new-user-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="bg-[#0f172a] text-white p-6 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                    Segurança
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    Novo Usuário
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    E-mail do Usuário
                  </label>
                  <input
                    id="new-user-email-input"
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="usuario@esuda.com.br"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Senha Inicial (mínimo 6 dígitos)
                  </label>
                  <div className="relative">
                    <input
                      id="new-user-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Perfil de Acesso
                  </label>
                  <select
                    id="new-user-role-select"
                    value={newRole}
                    onChange={(e: any) => setNewRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="restrito">Restrito (Visualizador de Cronogramas)</option>
                    <option value="admin">Administrador (Acesso Total)</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    id="btn-confirm-create-user"
                    type="submit" 
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {submitting ? 'Criando...' : 'Cadastrar Usuário'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
