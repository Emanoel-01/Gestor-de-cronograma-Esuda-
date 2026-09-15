'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Edit2, 
  Trash2, 
  Plus,
  Search,
  SortAsc,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { 
  deleteDoc, 
  doc, 
  updateDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import Image from 'next/image';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { COMMON_DISCIPLINES } from '@/lib/calendar';
import { syncTeacherAssignments } from '@/lib/sync';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ConfirmationModal } from '../ui/ConfirmationModal';

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface TeachersManagerProps {
  teachers: any[];
  courses: any[];
  isAdmin: boolean;
  commonDisciplines: any[];
}

export function TeachersManager({ teachers, courses, isAdmin, commonDisciplines }: TeachersManagerProps) {
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterCourseId, setFilterCourseId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  const handleDelete = async () => {
    if (!deletingTeacherId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'teachers', deletingTeacherId));
      setDeletingTeacherId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'teachers');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCode = (code: string, teacherId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(teacherId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateMissingCodes = async () => {
    if (!isAdmin) return;
    setGeneratingBatch(true);
    try {
      for (const t of teachers) {
        if (!t.accessCode) {
          const code = generateRandomCode();
          await updateDoc(doc(db, 'teachers', t.id), { accessCode: code });
        }
      }
    } catch (err) {
      console.error('Erro ao gerar códigos em lote:', err);
    } finally {
      setGeneratingBatch(false);
    }
  };

  const teachersWithoutCode = teachers.filter(t => !t.accessCode);

  const filteredTeachers = (teachers || [])
    .filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (t.accessCode && t.accessCode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCourse = !filterCourseId || t.specialties?.some((s: any) => s.courseId === filterCourseId);
      return matchesSearch && matchesCourse;
    })
    .sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (sortOrder === 'asc') return nameA.localeCompare(nameB);
      return nameB.localeCompare(nameA);
    });

  return (
    <div className="space-y-6">
      {/* Batch notice if any teachers miss code */}
      {isAdmin && teachersWithoutCode.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="text-xs text-amber-900 font-bold">
            Existem {teachersWithoutCode.length} docentes sem Código de Acesso Individual gerado.
          </div>
          <Button 
            size="sm"
            onClick={handleGenerateMissingCodes}
            disabled={generatingBatch}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {generatingBatch ? 'Gerando...' : 'Gerar Códigos Automaticamente'}
          </Button>
        </div>
      )}

      {/* Filters and Sorting */}
      <Card className="p-4 bg-white border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Buscar por Nome ou Código</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Nome ou código do docente..." 
                value={searchTerm} 
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Filtrar por Curso</label>
            <Select 
              value={filterCourseId} 
              onChange={(e: any) => setFilterCourseId(e.target.value)}
            >
              <option value="">Todos os Cursos</option>
              <option value="common">Fase Comum</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>

          <div className="w-full md:w-48">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Ordem Alfabética</label>
            <Button 
              variant="secondary" 
              className="w-full justify-between h-10 cursor-pointer"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <span className="flex items-center gap-2">
                <SortAsc className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </span>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher: any) => (
          <Card 
            key={teacher.id} 
            className="p-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:border-indigo-300 transition-all group"
            onClick={() => setEditingTeacher(teacher)}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full font-bold text-lg sm:text-xl shadow-inner shrink-0 overflow-hidden">
              {teacher.photoUrl ? (
                <Image 
                  src={teacher.photoUrl} 
                  alt={teacher.name} 
                  width={48} 
                  height={48} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                teacher.name[0]
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="font-bold text-gray-900 truncate text-sm sm:text-base">{teacher.name}</h4>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">{teacher.titulacao || teacher.email || 'Docente'}</p>
              
              {/* Código de Acesso do Professor */}
              <div className="mt-1.5 flex items-center gap-2">
                <div 
                  onClick={(e) => handleCopyCode(teacher.accessCode, teacher.id, e)}
                  title="Clique para copiar código individual"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer border border-slate-200"
                >
                  <KeyRound className="w-2.5 h-2.5 text-indigo-600" />
                  <span>{teacher.accessCode || 'Sem código'}</span>
                  {copiedId === teacher.id ? (
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-600" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-1.5">
                {Array.from(new Set(teacher.specialties?.map((s: any) => s.courseId === 'common' ? 'Fase Comum' : courses.find((c: any) => c.id === s.courseId)?.name).filter(Boolean))).slice(0, 2).map((courseName: any, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[8px] font-bold uppercase">
                    {courseName}
                  </span>
                ))}
                {(new Set(teacher.specialties?.map((s: any) => s.courseId)).size > 2) && (
                  <span className="text-[8px] text-gray-400 font-bold">+{new Set(teacher.specialties?.map((s: any) => s.courseId)).size - 2}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              {isAdmin && (
                <button onClick={(e) => { e.stopPropagation(); setEditingTeacher(teacher); }} className="text-indigo-400 hover:text-indigo-600 p-1.5 sm:p-2 hover:bg-indigo-50 rounded transition-colors cursor-pointer">
                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingTeacherId(teacher.id);
                  }} 
                  className="text-red-400 hover:text-red-600 p-1.5 sm:p-2 hover:bg-red-50 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <ConfirmationModal 
        isOpen={!!deletingTeacherId}
        title="Excluir Docente"
        message="Tem certeza que deseja excluir este docente? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeletingTeacherId(null)}
        loading={isDeleting}
      />

      {editingTeacher && (
        <TeacherEditModal 
          teacher={editingTeacher} 
          courses={courses} 
          isAdmin={isAdmin} 
          commonDisciplines={commonDisciplines}
          onClose={() => setEditingTeacher(null)} 
        />
      )}
    </div>
  );
}

function TeacherEditModal({ teacher, courses, isAdmin, commonDisciplines, onClose }: any) {
  const [form, setForm] = useState({ 
    name: teacher.name || '', 
    titulacao: teacher.titulacao || '',
    accessCode: teacher.accessCode || generateRandomCode(),
    email: teacher.email || '', 
    cpf: teacher.cpf || '', 
    phone: teacher.phone || '', 
    photoUrl: teacher.photoUrl || '',
    linkedin: teacher.linkedin || '',
    lattes: teacher.lattes || '',
    instagram: teacher.instagram || '',
    hasSubmitted: teacher.hasSubmitted || false,
    specialties: teacher.specialties || [] 
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin && teacher?.id) {
      getDoc(doc(db, 'teachers', teacher.id, 'dados_sensiveis', 'principal'))
        .then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            setForm(prev => ({
              ...prev,
              cpf: data.cpf || prev.cpf || '',
              phone: data.phone || prev.phone || ''
            }));
          }
        })
        .catch(console.error);
    }
  }, [isAdmin, teacher?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { cpf, phone, ...dadosPublicos } = form;
      await updateDoc(doc(db, 'teachers', teacher.id), dadosPublicos);
      await setDoc(doc(db, 'teachers', teacher.id, 'dados_sensiveis', 'principal'), {
        cpf: cpf || '',
        phone: phone || '',
      });
      await syncTeacherAssignments();
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'teachers');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = () => {
    setForm({ ...form, accessCode: generateRandomCode() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-indigo-600 text-white shrink-0">
          <h2 className="text-lg sm:text-xl font-bold">Editar Docente</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 cursor-pointer">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input className="mb-4" label="Nome Completo" value={form.name} onChange={(e: any) => setForm({...form, name: e.target.value})} disabled={!isAdmin} />
            <Input className="mb-4" label="Titulação / Grau" value={form.titulacao} onChange={(e: any) => setForm({...form, titulacao: e.target.value})} disabled={!isAdmin} />
            
            {/* Código de Acesso Individual */}
            <div className="mb-4 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Código de Acesso Individual (Docente)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.accessCode}
                  onChange={(e) => setForm({...form, accessCode: e.target.value.toUpperCase()})}
                  disabled={!isAdmin}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-indigo-700 tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    title="Gerar novo código aleatório"
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <Input className="mb-4" label="E-mail (Opcional)" value={form.email} onChange={(e: any) => setForm({...form, email: e.target.value})} disabled={!isAdmin} />
            <Input className="mb-4" label="CPF (Opcional)" value={form.cpf} onChange={(e: any) => setForm({...form, cpf: e.target.value})} disabled={!isAdmin} />
            <Input className="mb-4" label="Telefone (Opcional)" value={form.phone} onChange={(e: any) => setForm({...form, phone: e.target.value})} disabled={!isAdmin} />
            <Input className="mb-4" label="URL da Foto (Opcional)" value={form.photoUrl} onChange={(e: any) => setForm({...form, photoUrl: e.target.value})} disabled={!isAdmin} />
            <Input className="mb-4" label="LinkedIn (Opcional)" value={form.linkedin} onChange={(e: any) => setForm({...form, linkedin: e.target.value})} disabled={!isAdmin} />
            <Input className="mb-4" label="Lattes (Opcional)" value={form.lattes} onChange={(e: any) => setForm({...form, lattes: e.target.value})} disabled={!isAdmin} />
            <Input label="Instagram (Opcional)" value={form.instagram} onChange={(e: any) => setForm({...form, instagram: e.target.value})} disabled={!isAdmin} />
            
            <div className="flex items-center gap-2 pt-6">
              <input 
                type="checkbox" 
                id="hasSubmitted"
                checked={form.hasSubmitted} 
                onChange={(e) => setForm({...form, hasSubmitted: e.target.checked})}
                disabled={!isAdmin}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="hasSubmitted" className="text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer">
                Já submeteu dados pelo formulário público
              </label>
            </div>
          </div>
          
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs sm:text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Disciplinas Atribuídas</p>
            
            <div className="mb-6">
              <p className="text-[10px] sm:text-xs font-bold text-indigo-600 mb-2 uppercase">Disciplinas Comuns</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(commonDisciplines.length > 0 ? commonDisciplines : COMMON_DISCIPLINES).map((disc: any) => {
                  const isSelected = form.specialties?.some((s: any) => s.courseId === 'common' && s.disciplineName === disc.name);
                  return (
                    <button
                      key={disc.name}
                      disabled={!isAdmin}
                      onClick={() => {
                        const current = form.specialties || [];
                        if (isSelected) {
                          setForm({ ...form, specialties: current.filter((s: any) => !(s.courseId === 'common' && s.disciplineName === disc.name)) });
                        } else {
                          setForm({ ...form, specialties: [...current, { courseId: 'common', disciplineName: disc.name }] });
                        }
                      }}
                      className={`px-2 py-1 rounded text-[9px] sm:text-[10px] border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                    >
                      {disc.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {(courses || []).map((course: any) => (
                <div key={course.id} className="space-y-2">
                  <p className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase">{course.name}</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {(course.specificDisciplines || []).map((d: any) => {
                      const discName = typeof d === 'string' ? d : d.name;
                      const isSelected = form.specialties?.some((s: any) => s.courseId === course.id && s.disciplineName === discName);
                      return (
                        <button
                          key={discName}
                          disabled={!isAdmin}
                          onClick={() => {
                            const current = form.specialties || [];
                            if (isSelected) {
                              setForm({ ...form, specialties: current.filter((s: any) => !(s.courseId === course.id && s.disciplineName === discName)) });
                            } else {
                              setForm({ ...form, specialties: [...current, { courseId: course.id, disciplineName: discName }] });
                            }
                          }}
                          className={`px-2 py-1 rounded text-[9px] sm:text-[10px] border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                        >
                          {discName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sm:gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
