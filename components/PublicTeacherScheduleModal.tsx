'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  User, 
  ChevronRight, 
  ChevronDown, 
  Printer, 
  CalendarDays
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlanoDeEnsinoView } from './ui/PlanoDeEnsinoView';
import { Button } from './ui/Button';

interface PublicTeacherScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: any[];
  classes: any[];
  courses: any[];
  commonDisciplines: any[];
}

export function PublicTeacherScheduleModal({
  isOpen,
  onClose,
  teachers,
  classes,
  courses,
  commonDisciplines
}: PublicTeacherScheduleModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  // Filter teachers based on search term
  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return teachers;
    const term = searchTerm.toLowerCase();
    return teachers.filter(t => 
      (t.name || '').toLowerCase().includes(term) || 
      (t.email || '').toLowerCase().includes(term)
    );
  }, [teachers, searchTerm]);

  // Selected teacher
  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId) || null;
  }, [teachers, selectedTeacherId]);

  // Find all classes assigned to this teacher across all schedules/clusters
  const teacherClasses = useMemo(() => {
    if (!selectedTeacherId) return [];

    return classes.filter(c => {
      // Check both teacherIds array and legacy teacherId string
      const ids = Array.isArray(c.teacherIds) ? c.teacherIds : (c.teacherId ? [c.teacherId] : []);
      return ids.includes(selectedTeacherId);
    });
  }, [classes, selectedTeacherId]);

  // Group sessions by discipline within course
  const groupedSessions = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      dates: string[];
      classItem: any;
      courseName: string;
      clusterName: string;
      disciplineName: string;
      format: string;
      planoDeEnsino?: any;
    }>();

    teacherClasses.forEach(c => {
      // Find course details to resolve plano de ensino
      const course = courses.find(crs => crs.id === c.courseId);
      let plano: any = null;

      // 1. Check if it is a specific discipline in the course
      if (course?.specificDisciplines) {
        const spec = course.specificDisciplines.find((d: any) => {
          const dName = typeof d === 'string' ? d : d.name;
          return dName?.trim().toLowerCase() === (c.disciplineName || '').trim().toLowerCase();
        });
        if (spec && typeof spec === 'object') {
          plano = spec.planoDeEnsino;
        }
      }

      // 2. Check if it is a common discipline
      if (!plano && commonDisciplines) {
        const com = commonDisciplines.find((d: any) => 
          (d.name || '').trim().toLowerCase() === (c.disciplineName || '').trim().toLowerCase()
        );
        if (com) {
          plano = com.planoDeEnsino;
        }
      }

      const dates = Array.isArray(c.allDates) && c.allDates.length > 0 
        ? c.allDates 
        : (c.date ? [c.date] : []);

      const groupKey = `${c.courseId || 'common'}::${(c.disciplineName || '').trim().toLowerCase()}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          dates: [],
          classItem: c,
          courseName: c.courseName || course?.name || 'Pós-Graduação ESUDA',
          clusterName: c.clusterName || 'Tronco Geral',
          disciplineName: c.disciplineName || 'Disciplina',
          format: c.format || (c.disciplineName?.toLowerCase().includes('ead') ? 'EAD' : 'Presencial'),
          planoDeEnsino: plano
        });
      }

      const group = groups.get(groupKey)!;
      if (!group.planoDeEnsino && plano) {
        group.planoDeEnsino = plano;
      }
      dates.forEach((d: string) => {
        if (d && !group.dates.includes(d)) {
          group.dates.push(d);
        }
      });
    });

    const result = Array.from(groups.values());
    result.forEach(g => g.dates.sort());
    // Sort groups by their earliest date
    return result.sort((a, b) => (a.dates[0] || '').localeCompare(b.dates[0] || ''));
  }, [teacherClasses, courses, commonDisciplines]);

  // Total individual sessions/meetings (Sábados de aula)
  const totalMeetingsCount = useMemo(() => {
    return groupedSessions.reduce((acc, g) => acc + g.dates.length, 0);
  }, [groupedSessions]);

  if (!isOpen) return null;

  return (
    <div className="print-container fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Print Specific Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 12mm;
            size: auto;
          }
          body {
            background: white !important;
            color: #0f172a !important;
          }
          .print-hide {
            display: none !important;
          }
          .print-container {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .print-card {
            max-height: none !important;
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            border-radius: 0 !important;
          }
          .print-scroll-area {
            overflow: visible !important;
            max-height: none !important;
            padding: 0 !important;
          }
          .print-header {
            background: #ffffff !important;
            color: #0f172a !important;
            border-bottom: 2px solid #0f172a !important;
            padding: 8px 0 16px 0 !important;
          }
          .print-header * {
            color: #0f172a !important;
          }
          .print-summary-box {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-item-card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            margin-bottom: 12px !important;
          }
        }
      `}} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="print-card bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="print-header px-6 py-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="print-hide w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <CalendarDays className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Agenda de Aulas do Docente</h2>
              <p className="text-xs text-indigo-200 print:text-slate-600">Pós-Graduação ESUDA · Cronograma Consolidado e Planos de Ensino</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="print-hide w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="print-scroll-area flex-1 overflow-y-auto p-6 space-y-6">
          {/* Teacher Selection & Search */}
          <div className="print-hide grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                Buscar Professor
              </label>
              <input
                type="text"
                placeholder="Filtrar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Selecione o Docente ({filteredTeachers.length})
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  setExpandedClassId(null);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="">-- Escolha um docente --</option>
                {filteredTeachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.titration ? `(${t.titration})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teacher Selected View */}
          {selectedTeacher ? (
            <div className="space-y-6">
              {/* Teacher Summary Badge */}
              <div className="print-summary-box bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 print:bg-slate-800 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-indigo-200 print:shadow-none shrink-0">
                    {selectedTeacher.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{selectedTeacher.name}</h3>
                    <p className="text-xs text-indigo-700 print:text-slate-600 font-medium">
                      {selectedTeacher.titration || 'Docente Convidado'} {selectedTeacher.email ? `· ${selectedTeacher.email}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="bg-white px-3.5 py-2 rounded-xl border border-indigo-100 print:border-slate-300 shadow-2xs print:shadow-none text-center">
                    <span className="block font-black text-indigo-900 print:text-slate-900 text-sm">{groupedSessions.length}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Disciplinas</span>
                  </div>
                  <div className="bg-white px-3.5 py-2 rounded-xl border border-indigo-100 print:border-slate-300 shadow-2xs print:shadow-none text-center">
                    <span className="block font-black text-indigo-900 print:text-slate-900 text-sm">{totalMeetingsCount}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Encontros</span>
                  </div>
                  <Button 
                    variant="secondary"
                    onClick={() => window.print()}
                    className="print-hide h-10 text-xs flex items-center gap-1.5 bg-white border-slate-200 shadow-2xs hover:bg-slate-50"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    Imprimir
                  </Button>
                </div>
              </div>

              {/* Sessions Timeline */}
              {groupedSessions.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-black text-slate-400 print:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 print:text-slate-600" />
                      Linha do Tempo de Aulas Agendadas ({groupedSessions.length})
                    </h4>
                    <span className="text-[10px] text-slate-400 print:text-slate-500">Agrupado por disciplina · Ordenado por data</span>
                  </div>

                  <div className="space-y-3">
                    {groupedSessions.map((group, gIdx) => {
                      const isExpanded = expandedClassId === group.key;

                      return (
                        <div
                          key={`${group.key}-${gIdx}`}
                          className="print-avoid-break print-item-card bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all overflow-hidden"
                        >
                          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            {/* Date Badges & Discipline Info */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                              {/* Date Badges Container */}
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {group.dates.map((dateStr) => {
                                  const dateObj = parseISO(dateStr);
                                  return (
                                    <div 
                                      key={dateStr}
                                      className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 print:bg-slate-50 print:border-slate-300 flex flex-col items-center justify-center text-center shrink-0"
                                    >
                                      <span className="text-[10px] uppercase font-bold text-indigo-600 print:text-slate-700">
                                        {format(dateObj, 'EEE', { locale: ptBR })}
                                      </span>
                                      <span className="text-base font-black text-indigo-950 print:text-slate-950 leading-none">
                                        {format(dateObj, 'dd/MM')}
                                      </span>
                                      <span className="text-[9px] text-slate-400 print:text-slate-600 font-medium leading-none mt-0.5">
                                        {format(dateObj, 'yyyy')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Discipline & Course Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 print:bg-slate-100 print:text-slate-800 print:border-slate-200">
                                    {group.courseName}
                                  </span>
                                  {group.clusterName && group.clusterName !== 'Tronco Geral' && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                                      {group.clusterName}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    group.format === 'EAD' 
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200 print:bg-slate-100 print:text-slate-800 print:border-slate-300' 
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 print:bg-slate-100 print:text-slate-800 print:border-slate-300'
                                  }`}>
                                    {group.format}
                                  </span>
                                  {group.dates.length > 1 && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 print:border print:border-slate-300">
                                      {group.dates.length} Encontros
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-bold text-slate-900 text-sm leading-snug">
                                  {group.disciplineName}
                                </h5>
                                <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    08:00 às 17:00 (Sábado)
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {group.format === 'EAD' ? 'Ambiente Virtual (EAD)' : 'Faculdade ESUDA - Recife/PE'}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Action to view Plano de Ensino */}
                            <button
                              onClick={() => setExpandedClassId(isExpanded ? null : group.key)}
                              className="print-hide px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 flex items-center gap-1.5 transition-colors shrink-0 self-end sm:self-center"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              {isExpanded ? 'Ocultar Plano' : 'Ver Plano de Ensino'}
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Expanded Plano de Ensino Details */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50 print:bg-white animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="mt-3">
                                <PlanoDeEnsinoView 
                                  plano={group.planoDeEnsino} 
                                  fallbackEmenta={group.classItem?.syllabus || 'Ementa em elaboração.'} 
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-700 text-sm">Nenhuma aula agendada</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Este professor não possui datas de aulas atribuídas nos cronogramas atuais.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <User className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 text-base">Selecione um Professor</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Utilize o seletor ou a barra de busca acima para visualizar todas as datas, disciplinas, turmas e planos de ensino estruturados atribuídos ao docente.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="print-hide px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Pós-Graduação ESUDA · Gestão Acadêmica</span>
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

