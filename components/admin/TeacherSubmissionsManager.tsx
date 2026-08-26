'use client';

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, storage, OperationType, handleFirestoreError } from '@/lib/firebase';
import { 
  Check, 
  X, 
  Edit2, 
  ExternalLink, 
  Clock, 
  User, 
  Upload,
  Mail, 
  Phone, 
  CreditCard,
  Linkedin,
  Instagram,
  Link as LinkIcon,
  GraduationCap,
  Save,
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TeacherSubmissionsManager() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'submissoes_professores'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar submissões:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleApprove = async (submission: any) => {
    if (!confirm(`Deseja aprovar e publicar os dados de ${submission.name}?`)) return;

    try {
      // 1. Update the official teacher document
      const teacherRef = doc(db, 'teachers', submission.teacherId);
      await updateDoc(teacherRef, {
        titulacao: submission.titulacao,
        email: submission.email || '',
        cpf: submission.cpf || '',
        phone: submission.phone || '',
        photoUrl: submission.photoUrl || '',
        linkedin: submission.linkedin || '',
        lattes: submission.lattes || '',
        instagram: submission.instagram || '',
        hasSubmitted: true
      });

      // 2. Delete the submission
      await deleteDoc(doc(db, 'submissoes_professores', submission.id));
      
      alert('Professor aprovado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teachers');
      alert('Erro ao aprovar professor.');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Deseja rejeitar e excluir esta submissão?')) return;
    try {
      await deleteDoc(doc(db, 'submissoes_professores', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'submissoes_professores');
    }
  };

  const startEditing = (submission: any) => {
    setEditingId(submission.id);
    setEditData({ ...submission });
  };

  const saveEdit = async () => {
    if (!editingId || !editData) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'submissoes_professores', editingId), editData);
      setEditingId(null);
      setEditData(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'submissoes_professores');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">Carregando submissões...</div>;

  const pendentes = submissions.filter(s => s.status === 'pendente');

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Submissões Pendentes</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{pendentes.length} aguardando revisão</p>
          </div>
        </div>

        {pendentes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
            <Check className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhuma submissão pendente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendentes.map((s) => (
              <div key={s.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
                {/* Photo Preview */}
                <div className="w-full lg:w-48 h-48 lg:h-auto bg-slate-200 relative">
                  {s.photoUrl ? (
                    <Image src={s.photoUrl} alt={s.name} fill className="object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{s.name}</h3>
                      <p className="text-indigo-600 text-xs font-black uppercase tracking-widest flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> {s.titulacao}
                      </p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                        Enviado em: {s.submittedAt?.toDate ? format(s.submittedAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Recentemente'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => startEditing(s)}>
                        <Edit2 className="w-4 h-4" /> Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleReject(s.id)}>
                        <Trash2 className="w-4 h-4" /> Rejeitar
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => handleApprove(s)}>
                        <Check className="w-4 h-4" /> Aprovar e Publicar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Mail className="w-3 h-3 text-slate-400" /> {s.email || 'Não informado'}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400" /> {s.phone || 'Não informado'}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <CreditCard className="w-3 h-3 text-slate-400" /> {s.cpf || 'Não informado'}
                    </div>
                    {s.linkedin && (
                      <a href={s.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline">
                        <Linkedin className="w-3 h-3" /> LinkedIn <ExternalLink className="w-2 h-2" />
                      </a>
                    )}
                    {s.lattes && (
                      <a href={s.lattes} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline">
                        <LinkIcon className="w-3 h-3" /> Lattes <ExternalLink className="w-2 h-2" />
                      </a>
                    )}
                    {s.instagram && (
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                        <Instagram className="w-3 h-3" /> {s.instagram}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && editData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Editar Submissão</h3>
                <button onClick={() => setEditingId(null)}><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL da Foto de Perfil</label>
                  <div className="flex gap-4 items-center">
                    <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-100 shrink-0">
                      {editData.photoUrl ? (
                        <Image src={editData.photoUrl} alt="Preview" fill className="object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-300"><User /></div>
                      )}
                    </div>
                    <input 
                      value={editData.photoUrl || ''}
                      onChange={(e) => setEditData({...editData, photoUrl: e.target.value})}
                      placeholder="https://exemplo.com/foto.jpg"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titulação</label>
                  <input 
                    value={editData.titulacao}
                    onChange={(e) => setEditData({...editData, titulacao: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</label>
                  <input 
                    value={editData.email}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF</label>
                    <input 
                      value={editData.cpf}
                      onChange={(e) => setEditData({...editData, cpf: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</label>
                    <input 
                      value={editData.phone}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LinkedIn</label>
                  <input 
                    value={editData.linkedin}
                    onChange={(e) => setEditData({...editData, linkedin: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lattes</label>
                  <input 
                    value={editData.lattes}
                    onChange={(e) => setEditData({...editData, lattes: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instagram</label>
                  <input 
                    value={editData.instagram}
                    onChange={(e) => setEditData({...editData, instagram: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <Button className="w-full py-4" onClick={saveEdit} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
