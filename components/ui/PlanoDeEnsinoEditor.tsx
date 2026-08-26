'use client';

import React from 'react';
import { PlanoDeEnsino } from '@/types/syllabus';
import { TextArea } from './TextArea';
import { Input } from './Input';
import { BookOpen, ListOrdered, Award, BookMarked } from 'lucide-react';

interface PlanoDeEnsinoEditorProps {
  value?: PlanoDeEnsino;
  onChange: (value: PlanoDeEnsino) => void;
  disabled?: boolean;
}

export function PlanoDeEnsinoEditor({ value, onChange, disabled }: PlanoDeEnsinoEditorProps) {
  const current: PlanoDeEnsino = {
    ementa: value?.ementa || '',
    cargaHoraria: value?.cargaHoraria || '20 horas',
    cargaPorAula: value?.cargaPorAula || '10 h/a',
    creditos: value?.creditos || '01',
    conteudosProgramaticos: value?.conteudosProgramaticos || [],
    atividadeAvaliativa: value?.atividadeAvaliativa || '',
    bibliografiaBasica: value?.bibliografiaBasica || [],
    bibliografiaComplementar: value?.bibliografiaComplementar || []
  };

  const updateField = (field: keyof PlanoDeEnsino, val: any) => {
    onChange({
      ...current,
      [field]: val
    });
  };

  const arrayToLines = (arr?: string[]) => (arr || []).join('\n');
  const linesToArray = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean);

  return (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm text-xs">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <BookOpen className="w-4 h-4 text-indigo-600" />
        <span className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Plano de Ensino Estruturado</span>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ementa Geral</label>
        <TextArea
          value={current.ementa}
          onChange={(e: any) => updateField('ementa', e.target.value)}
          placeholder="Descrição resumida da ementa..."
          rows={3}
          disabled={disabled}
          className="text-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Carga Horária</label>
          <Input
            value={current.cargaHoraria || ''}
            onChange={(e: any) => updateField('cargaHoraria', e.target.value)}
            placeholder="Ex: 20 horas"
            disabled={disabled}
            className="text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Carga por Aula</label>
          <Input
            value={current.cargaPorAula || ''}
            onChange={(e: any) => updateField('cargaPorAula', e.target.value)}
            placeholder="Ex: 10 h/a"
            disabled={disabled}
            className="text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Créditos</label>
          <Input
            value={current.creditos || ''}
            onChange={(e: any) => updateField('creditos', e.target.value)}
            placeholder="Ex: 01"
            disabled={disabled}
            className="text-xs"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500 mb-1">
          <ListOrdered className="w-3 h-3 text-indigo-500" />
          Conteúdos Programáticos (1 item por linha)
        </label>
        <TextArea
          value={arrayToLines(current.conteudosProgramaticos)}
          onChange={(e: any) => updateField('conteudosProgramaticos', linesToArray(e.target.value))}
          placeholder="Módulo 1: Introdução...&#10;Módulo 2: Fundamentos...&#10;Módulo 3: Prática..."
          rows={4}
          disabled={disabled}
          className="text-xs font-mono"
        />
      </div>

      <div>
        <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500 mb-1">
          <Award className="w-3 h-3 text-amber-500" />
          Atividade Avaliativa
        </label>
        <TextArea
          value={current.atividadeAvaliativa}
          onChange={(e: any) => updateField('atividadeAvaliativa', e.target.value)}
          placeholder="Critérios de avaliação, projetos, artigos ou provas..."
          rows={2}
          disabled={disabled}
          className="text-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500 mb-1">
            <BookMarked className="w-3 h-3 text-emerald-500" />
            Bibliografia Básica (1 por linha)
          </label>
          <TextArea
            value={arrayToLines(current.bibliografiaBasica)}
            onChange={(e: any) => updateField('bibliografiaBasica', linesToArray(e.target.value))}
            placeholder="SOBRENOME, Nome. Título do livro. Edição..."
            rows={3}
            disabled={disabled}
            className="text-xs font-mono"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500 mb-1">
            <BookMarked className="w-3 h-3 text-blue-500" />
            Bibliografia Complementar (1 por linha)
          </label>
          <TextArea
            value={arrayToLines(current.bibliografiaComplementar)}
            onChange={(e: any) => updateField('bibliografiaComplementar', linesToArray(e.target.value))}
            placeholder="SOBRENOME, Nome. Título do livro. Edição..."
            rows={3}
            disabled={disabled}
            className="text-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
}
