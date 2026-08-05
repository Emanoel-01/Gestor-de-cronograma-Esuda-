'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  UserCog, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Trash2, 
  BookOpen, 
  X, 
  Check, 
  Lock, 
  Mail, 
  User as UserIcon,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

interface AccessManagerProps {
  courses: any[];
}

export function AccessManager({ courses }: AccessManagerProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showNewModal, setShowNewModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    tempPassword: '',
    courseIds: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Course edit modal state
  const [editingCoursesProfile, setEditingCoursesProfile] = useState<any>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // Reset password modal state
  const [resetPassProfile, setResetPassProfile] = useState<any>(null);
  const [newTempPass, setNewTempPass] = useState('');

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar perfis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();

    const channel = supabase
      .channel('admin_profiles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_profiles' },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateCoordenador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email || !newAdmin.tempPassword) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create_coordenador',
          payload: {
            name: newAdmin.name,
            email: newAdmin.email,
            tempPassword: newAdmin.tempPassword,
            courseIds: newAdmin.courseIds
          }
        }
      });

      if (error) throw new Error(error.message || 'Erro ao criar coordenador.');
      if (data?.error) throw new Error(data.error);

      setSuccessMsg('Coordenador criado com sucesso! Ele precisará trocar a senha no primeiro acesso.');
      setNewAdmin({ name: '', email: '', tempPassword: '', courseIds: [] });
      setShowNewModal(false);
      fetchProfiles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao criar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (profile: any) => {
    const newStatus = !profile.active;
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'toggle_active',
          payload: {
            userId: profile.user_id,
            active: newStatus
          }
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      fetchProfiles();
    } catch (err: any) {
      alert(`Erro ao alterar status: ${err.message}`);
    }
  };

  const handleUpdateCourses = async () => {
    if (!editingCoursesProfile) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update_courses',
          payload: {
            userId: editingCoursesProfile.user_id,
            courseIds: selectedCourseIds
          }
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setEditingCoursesProfile(null);
      fetchProfiles();
    } catch (err: any) {
      alert(`Erro ao atualizar cursos: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassProfile || !newTempPass) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'reset_password',
          payload: {
            userId: resetPassProfile.user_id,
            newTempPassword: newTempPass
          }
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      alert(`Senha resetada com sucesso para ${resetPassProfile.name}! O usuário deverá alterar a senha no próximo acesso.`);
      setResetPassProfile(null);
      setNewTempPass('');
      fetchProfiles();
    } catch (err: any) {
      alert(`Erro ao resetar senha: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (profile: any) => {
    if (!confirm(`Tem certeza que deseja excluir a conta de ${profile.name}? Esta ação é irreversível.`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete_user',
          payload: {
            userId: profile.user_id
          }
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      fetchProfiles();
    } catch (err: any) {
      alert(`Erro ao excluir usuário: ${err.message}`);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setNewAdmin(prev => {
      const exists = prev.courseIds.includes(courseId);
      return {
        ...prev,
        courseIds: exists ? prev.courseIds.filter(id => id !== courseId) : [...prev.courseIds, courseId]
      };
    });
  };

  const toggleEditCourseSelection = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-indigo-600" /> Gestão de Acessos
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Gerencie os coordenadores adjuntos e defina quais cursos cada um pode visualizar e editar.
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Novo Coordenador Adjunto
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 text-sm font-bold rounded-xl border border-green-200 flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Table */}
      <Card className="p-6 border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Carregando usuários...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="p-3 text-xs font-bold text-gray-500 uppercase">Usuário</th>
                  <th className="p-3 text-xs font-bold text-gray-500 uppercase">Função</th>
                  <th className="p-3 text-xs font-bold text-gray-500 uppercase">Cursos Autorizados</th>
                  <th className="p-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profiles.map((p) => {
                  const isAdminGeral = p.role === 'admin_geral';
                  const authorizedCourses = courses.filter(c => p.course_ids?.includes(c.id));

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-gray-900 text-sm">{p.name || 'Sem nome'}</div>
                        <div className="text-xs text-gray-500">{p.email}</div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isAdminGeral ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isAdminGeral ? <ShieldCheck className="w-3 h-3 text-indigo-600" /> : <UserCog className="w-3 h-3 text-slate-500" />}
                          {isAdminGeral ? 'Admin Geral' : 'Coordenador Adjunto'}
                        </span>
                      </td>
                      <td className="p-3">
                        {isAdminGeral ? (
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            Acesso Total (Todos os cursos)
                          </span>
                        ) : authorizedCourses.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Nenhum curso vinculado</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {authorizedCourses.map(c => (
                              <span key={c.id} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {p.active ? 'ATIVO' : 'INATIVO'}
                        </span>
                        {p.precisa_trocar_senha && (
                          <span className="ml-2 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                            Troca Pendente
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {!isAdminGeral && (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingCoursesProfile(p);
                                setSelectedCourseIds(p.course_ids || []);
                              }}
                              title="Editar Cursos"
                              className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(p)}
                              title={p.active ? "Desativar Conta" : "Ativar Conta"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                p.active ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600'
                              }`}
                            >
                              {p.active ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => {
                                setResetPassProfile(p);
                                setNewTempPass('');
                              }}
                              title="Resetar Senha"
                              className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(p)}
                              title="Excluir Usuário"
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
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

      {/* Modal: Novo Coordenador Adjunto */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" /> Novo Coordenador Adjunto
                </h3>
                <button onClick={() => setShowNewModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateCoordenador} className="space-y-4">
                <Input
                  label="Nome Completo"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  placeholder="Ex: Prof. Carlos Silva"
                  required
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="coordenador@esuda.edu.br"
                  required
                />
                <Input
                  label="Senha Provisória"
                  type="password"
                  value={newAdmin.tempPassword}
                  onChange={(e) => setNewAdmin({ ...newAdmin, tempPassword: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                />

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">Cursos Autorizados</label>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-2">
                    {courses.map((course) => (
                      <label key={course.id} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer hover:text-indigo-600">
                        <input
                          type="checkbox"
                          checked={newAdmin.courseIds.includes(course.id)}
                          onChange={() => toggleCourseSelection(course.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <span>{course.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button variant="secondary" type="button" onClick={() => setShowNewModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Criando...' : 'Criar Coordenador'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Cursos do Coordenador */}
      {editingCoursesProfile && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Cursos do Coordenador: {editingCoursesProfile.name}
                </h3>
                <button onClick={() => setEditingCoursesProfile(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">Selecione os Cursos Autorizados:</label>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-2">
                  {courses.map((course) => (
                    <label key={course.id} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer hover:text-indigo-600">
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.includes(course.id)}
                        onChange={() => toggleEditCourseSelection(course.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>{course.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setEditingCoursesProfile(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateCourses} disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resetar Senha Provisória */}
      {resetPassProfile && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Resetar Senha: {resetPassProfile.name}
                </h3>
                <button onClick={() => setResetPassProfile(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              <p className="text-xs text-gray-500">
                Informe uma nova senha provisória. O usuário precisará alterá-la no primeiro acesso após o reset.
              </p>

              <Input
                label="Nova Senha Provisória"
                type="password"
                value={newTempPass}
                onChange={(e) => setNewTempPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setResetPassProfile(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleResetPassword} disabled={isSubmitting || !newTempPass}>
                  {isSubmitting ? 'Resetando...' : 'Resetar Senha'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
