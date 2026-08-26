'use client';

import React from 'react';
import { PlanoDeEnsino } from '@/types/syllabus';
import { BookOpen, Clock, ListOrdered, Award, BookMarked } from 'lucide-react';

interface PlanoDeEnsinoViewProps {
  plano?: PlanoDeEnsino;
  fallbackEmenta?: string;
}

export function PlanoDeEnsinoView({ plano, fallbackEmenta }: PlanoDeEnsinoViewProps) {
  const ementa = plano?.ementa || fallbackEmenta;
  const hasDetails = plano && (
    (plano.conteudosProgramaticos && plano.conteudosProgramaticos.length > 0) ||
    plano.atividadeAvaliativa ||
    (plano.bibliografiaBasica && plano.bibliografiaBasica.length > 0) ||
    (plano.bibliografiaComplementar && plano.bibliografiaComplementar.length > 0)
  );

  if (!ementa && !hasDetails) {
    return (
      <p className="text-xs text-gray-400 italic">Ementa detalhada em elaboração.</p>
    );
  }

  return (
    <div className="space-y-4 text-xs text-gray-700 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/80">
      {/* Metrics Header */}
      {(plano?.cargaHoraria || plano?.cargaPorAula || plano?.creditos) && (
        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-indigo-100">
          {plano.cargaHoraria && (
            <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-900 border border-indigo-100 shadow-2xs">
              <Clock className="w-3 h-3 text-indigo-600" />
              Carga Horária: {plano.cargaHoraria}
            </span>
          )}
          {plano.cargaPorAula && (
            <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-900 border border-indigo-100 shadow-2xs">
              <Clock className="w-3 h-3 text-indigo-600" />
              Carga/Aula: {plano.cargaPorAula}
            </span>
          )}
          {plano.creditos && (
            <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-900 border border-indigo-100 shadow-2xs">
              <BookOpen className="w-3 h-3 text-indigo-600" />
              Créditos: {plano.creditos}
            </span>
          )}
        </div>
      )}

      {/* Ementa */}
      {ementa && (
        <div>
          <h5 className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            Ementa
          </h5>
          <p className="leading-relaxed text-gray-700 text-justify font-normal bg-white p-3 rounded-lg border border-gray-100">
            {ementa}
          </p>
        </div>
      )}

      {/* Conteúdos Programáticos */}
      {plano?.conteudosProgramaticos && plano.conteudosProgramaticos.length > 0 && (
        <div>
          <h5 className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
            Conteúdos Programáticos
          </h5>
          <ul className="space-y-1.5 bg-white p-3 rounded-lg border border-gray-100 list-disc list-inside marker:text-indigo-600">
            {plano.conteudosProgramaticos.map((item, idx) => (
              <li key={idx} className="leading-relaxed text-gray-700 font-normal">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Atividade Avaliativa */}
      {plano?.atividadeAvaliativa && (
        <div>
          <h5 className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            Atividade Avaliativa
          </h5>
          <p className="leading-relaxed text-gray-700 bg-white p-3 rounded-lg border border-gray-100">
            {plano.atividadeAvaliativa}
          </p>
        </div>
      )}

      {/* Bibliografias */}
      {((plano?.bibliografiaBasica && plano.bibliografiaBasica.length > 0) || 
        (plano?.bibliografiaComplementar && plano.bibliografiaComplementar.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {plano.bibliografiaBasica && plano.bibliografiaBasica.length > 0 && (
            <div>
              <h5 className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-emerald-600" />
                Bibliografia Básica
              </h5>
              <ul className="space-y-1 bg-white p-2.5 rounded-lg border border-gray-100 text-[11px] text-gray-600">
                {plano.bibliografiaBasica.map((b, idx) => (
                  <li key={idx} className="pb-1 border-b border-gray-50 last:border-none leading-snug">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plano.bibliografiaComplementar && plano.bibliografiaComplementar.length > 0 && (
            <div>
              <h5 className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-blue-600" />
                Bibliografia Complementar
              </h5>
              <ul className="space-y-1 bg-white p-2.5 rounded-lg border border-gray-100 text-[11px] text-gray-600">
                {plano.bibliografiaComplementar.map((b, idx) => (
                  <li key={idx} className="pb-1 border-b border-gray-50 last:border-none leading-snug">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
