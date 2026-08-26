'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2,
  GripVertical,
  BookOpen
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { SortableItem } from '../ui/SortableItem';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { PlanoDeEnsinoEditor } from '../ui/PlanoDeEnsinoEditor';
import { PlanoDeEnsino } from '@/types/syllabus';

interface CommonDisciplinesManagerProps {
  isAdmin: boolean;
}

export function CommonDisciplinesManager({ isAdmin }: CommonDisciplinesManagerProps) {
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDisc, setEditingDisc] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form for new/edit
  const [name, setName] = useState('');
  const [planoDeEnsino, setPlanoDeEnsino] = useState<PlanoDeEnsino>({
    ementa: '',
    conteudosProgramaticos: [],
    atividadeAvaliativa: '',
    bibliografiaBasica: [],
    bibliografiaComplementar: [],
    cargaHoraria: '20 horas',
    cargaPorAula: '10 h/a',
    creditos: '01'
  });

  useEffect(() => {
    const q = query(collection(db, 'commonDisciplines'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setDisciplines(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = disciplines.findIndex(item => item.id === active.id);
      const newIndex = disciplines.findIndex(item => item.id === over.id);
      
      const newItems = arrayMove(disciplines, oldIndex, newIndex);
      setDisciplines(newItems);

      // Update orders in Firestore
      try {
        const promises = newItems.map((item, index) => 
          updateDoc(doc(db, 'commonDisciplines', item.id), { order: index + 1 })
        );
        await Promise.all(promises);
      } catch (e) {
        console.error("Error updating order:", e);
      }
    }
  };

  const handleStartEdit = (disc: any) => {
    setEditingDisc(disc);
    setName(disc.name || '');
    setPlanoDeEnsino(disc.planoDeEnsino || {
      ementa: disc.description || '',
      conteudosProgramaticos: [],
      atividadeAvaliativa: '',
      bibliografiaBasica: [],
      bibliografiaComplementar: [],
      cargaHoraria: '20 horas',
      cargaPorAula: '10 h/a',
      creditos: '01'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingDisc(null);
    setName('');
    setPlanoDeEnsino({
      ementa: '',
      conteudosProgramaticos: [],
      atividadeAvaliativa: '',
      bibliografiaBasica: [],
      bibliografiaComplementar: [],
      cargaHoraria: '20 horas',
      cargaPorAula: '10 h/a',
      creditos: '01'
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        description: planoDeEnsino.ementa || '',
        planoDeEnsino: planoDeEnsino
      };

      if (editingDisc) {
        await updateDoc(doc(db, 'commonDisciplines', editingDisc.id), payload);
      } else {
        await addDoc(collection(db, 'commonDisciplines'), {
          ...payload,
          order: disciplines.length + 1
        });
      }
      handleCancelEdit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'commonDisciplines');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'commonDisciplines', deletingId));
      setDeletingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'commonDisciplines');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando disciplinas...</div>;

  return (
    <div className="space-y-8">
      {isAdmin && (
        <Card className="p-6 border-indigo-100 bg-indigo-50/30 space-y-4">
          <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-widest">
            {editingDisc ? 'Editar Disciplina' : 'Nova Disciplina do Tronco Comum'}
          </h3>
          
          <Input 
            label="Nome da Disciplina" 
            value={name} 
            onChange={(e: any) => setName(e.target.value)} 
            placeholder="Ex: Gestão de Escritórios"
          />

          <PlanoDeEnsinoEditor
            value={planoDeEnsino}
            onChange={setPlanoDeEnsino}
            disabled={!isAdmin}
          />

          <div className="flex justify-end gap-2 pt-2">
            {editingDisc && (
              <Button variant="secondary" onClick={handleCancelEdit}>Cancelar</Button>
            )}
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Salvando...' : editingDisc ? 'Salvar Alterações' : 'Adicionar Disciplina'}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Disciplinas Cadastradas ({disciplines.length})</h3>
          <p className="text-[10px] text-gray-400 italic">Arraste para reordenar</p>
        </div>

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={disciplines.map(d => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {disciplines.map((disc) => (
                <SortableItem key={disc.id} id={disc.id}>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4 group hover:border-indigo-300 transition-all">
                    <div className="mt-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-indigo-400 transition-colors">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {disc.order}
                        </span>
                        <h4 className="font-bold text-gray-900 truncate">{disc.name}</h4>
                        {disc.planoDeEnsino?.conteudosProgramaticos?.length > 0 && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                            Plano Completo
                          </span>
                        )}
                      </div>
                      {(disc.planoDeEnsino?.ementa || disc.description) && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic">
                          {disc.planoDeEnsino?.ementa || disc.description}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleStartEdit(disc)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar Plano de Ensino"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeletingId(disc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir Disciplina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <ConfirmationModal 
        isOpen={!!deletingId}
        title="Excluir Disciplina"
        message="Tem certeza que deseja remover esta disciplina do tronco comum? Isso não afetará cronogramas já gerados, mas as novas ementas não aparecerão para os alunos."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        loading={isDeleting}
      />
    </div>
  );
}
