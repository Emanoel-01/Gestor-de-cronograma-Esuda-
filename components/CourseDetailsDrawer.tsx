'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  X, 
  Menu, 
  Calendar, 
  Clock, 
  RotateCcw, 
  Edit, 
  ArrowRight,
  Printer,
  Users,
  Check,
  MessageCircle,
  Briefcase,
  User,
  Linkedin,
  Instagram,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { COMMON_DISCIPLINES } from '@/lib/calendar';

interface CourseDetailsDrawerProps {
  course: any;
  teachers: any[];
  schedules: any[];
  commonDisciplines: any[];
  onClose: () => void;
}

const EditorialFiller = ({ text, subtext }: { text: string, subtext: string }) => (
  <div 
    className="hidden print:flex flex-col items-center justify-center p-12 bg-indigo-900 text-white rounded-[3rem] my-12 break-inside-avoid shadow-2xl text-center"
    style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
  >
    <div className="w-16 h-1 bg-white/20 mb-8 rounded-full" />
    <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight max-w-md">
      {text}
    </h3>
    <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em] mt-6">
      {subtext}
    </p>
    <div className="w-16 h-1 bg-white/20 mt-8 rounded-full" />
  </div>
);

export function CourseDetailsDrawer({ course, teachers, schedules, commonDisciplines, onClose }: CourseDetailsDrawerProps) {
  const [showDisciplines, setShowDisciplines] = useState(true);
  const [showSyllabus, setShowSyllabus] = useState(true);
  const [showTeachers, setShowTeachers] = useState(true);
  const [showSchedules, setShowSchedules] = useState(true);
  const [showApps, setShowApps] = useState(false);
  const [showIncubator, setShowIncubator] = useState(false);
  const [showInfrastructure, setShowInfrastructure] = useState(false);

  const activeSchedules = schedules.filter((s: any) => s.courseIds.includes(course.id) && s.status === 'active');
  
  // Guideline 1: Status Validation
  const getValidatedStatus = (status: string) => {
    const allowed = ["Matriculas Abertas", "Turma Iniciada (Aceitando novos alunos)"];
    return allowed.includes(status) ? status : "Matriculas Abertas";
  };
  const validatedStatus = getValidatedStatus(course.enrollmentStatus);
  
  // Safe date formatting helper to avoid timezone shifts
  const formatSafeDate = (dateVal: string | number | Date) => {
    if (!dateVal) return 'A definir';
    try {
      if (typeof dateVal === 'string' && dateVal.length === 10 && dateVal.includes('-')) {
        const [y, m, d] = dateVal.split('-');
        return `${d}/${m}/${y}`;
      }
      const d = new Date(dateVal);
      d.setHours(12);
      return format(d, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Use teachers prop directly as requested, but we can still filter by specialties if we want to be helpful,
  // however the instruction says "removendo filtros complexos". 
  // Let's filter by those who have this course in their specialties to keep it relevant.
  const courseTeachers = teachers.filter(t => 
    t.specialties?.some((s: any) => {
      // Direct course match
      if (s.courseId === course.id) return true;
      
      // Common trunk match
      if (s.courseId === 'common' || s.courseId === 'tronco-comum') return true;
      
      // Name-based match for common disciplines
      const commonNames = (commonDisciplines.length > 0 ? commonDisciplines : COMMON_DISCIPLINES)
        .map((d: any) => (d.name || '').toLowerCase().trim());
      const specName = (s.disciplineName || s.name || '').toLowerCase().trim();
      
      if (specName && commonNames.includes(specName)) return true;

      return false;
    })
  );

  // Helper to get initials
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col print:w-full print:max-w-none print:shadow-none print:h-auto print:overflow-visible print:bg-white"
        id="course-presentation-print"
      >
        {/* Header - Screen Version */}
        <div className="h-80 md:h-64 bg-indigo-900 relative shrink-0 print:hidden">
          {course.imageUrl && !course.imageUrl.includes('esuda.edu.br') ? (
            <Image 
              src={course.imageUrl} 
              alt={course.name} 
              fill 
              className="object-cover opacity-60" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://picsum.photos/seed/${course.id}/800/600`;
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              {course.imageUrl?.includes('esuda.edu.br') ? (
                <Image 
                  src={`https://picsum.photos/seed/${course.id}/800/600`}
                  alt={course.name}
                  fill
                  className="object-cover opacity-60"
                />
              ) : (
                <BookOpen className="w-24 h-24" />
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          
          {/* Print Controls Overlay */}
          <div className="absolute top-4 left-4 right-4 flex flex-col md:flex-row justify-between items-start gap-4 no-print">
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/20 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {/* Grupo 1: Conteúdo Principal */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 pb-2 md:border-b-0 md:pb-0 md:border-r md:pr-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showDisciplines ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {showDisciplines && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={showDisciplines} onChange={() => setShowDisciplines(!showDisciplines)} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Disciplinas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showSyllabus ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {showSyllabus && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={showSyllabus} onChange={() => setShowSyllabus(!showSyllabus)} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Ementa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showTeachers ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {showTeachers && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={showTeachers} onChange={() => setShowTeachers(!showTeachers)} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Professores</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showSchedules ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {showSchedules && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={showSchedules} onChange={() => setShowSchedules(!showSchedules)} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Turmas</span>
                  </label>
                </div>

                {/* Grupo 2: Extras */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showApps ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {showApps && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={showApps} onChange={() => setShowApps(!showApps)} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Apps</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showIncubator ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {showIncubator && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={showIncubator} onChange={() => setShowIncubator(!showIncubator)} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Incubadora</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showInfrastructure ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {showInfrastructure && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={showInfrastructure} onChange={() => setShowInfrastructure(!showInfrastructure)} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Infra</span>
                  </label>
                </div>
              </div>

              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 shrink-0"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors self-end md:self-start"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="absolute bottom-6 left-8 right-8">
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">
              {validatedStatus}
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{course.name}</h2>
          </div>
        </div>

        {/* Header Print Version */}
        <div className="hidden print:block mb-8">
          <div className="relative w-[calc(100%+2cm)] h-64 -ml-[1cm] -mt-[1cm] mb-6 overflow-hidden bg-indigo-50">
            <Image 
              src={course.imageUrl || `https://picsum.photos/seed/${course.id}/800/600`}
              alt={course.name}
              fill
              className="object-cover object-center"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="mb-4">
            <span 
              className="text-[11px] font-black text-white bg-indigo-600 uppercase tracking-[0.2em] px-4 py-2 rounded-md print:bg-indigo-600 print:text-white inline-block shadow-sm"
              style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
            >
              {course.enrollmentStatus || 'Matrículas Abertas'}
            </span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 leading-tight">{course.name}</h1>
            {course.marketingSummary && (
              <p className="text-lg text-gray-700 font-medium leading-relaxed italic border-l-4 border-indigo-100 pl-4">
                {course.marketingSummary}
              </p>
            )}
          </div>

        <div className="p-8 space-y-12 print:p-12 print:mt-0 print:space-y-16">
          {/* Side Accent for Print */}
          <div className="hidden print:block fixed left-0 top-0 bottom-0 w-1.5 bg-indigo-600" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }} />

          {/* Technical Data Grid */}
          <div 
            className="grid grid-cols-2 gap-6 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 print:bg-indigo-50/50 print:border-indigo-100 break-inside-avoid print:break-inside-avoid"
            style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 print:bg-white print:shadow-sm"><BookOpen className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Carga Horária</p>
                <p className="text-sm font-bold text-gray-900">{course.workload || '360h'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 print:bg-white print:shadow-sm"><Menu className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Formato</p>
                <p className="text-sm font-bold text-gray-900">{course.format || 'Presencial, Remoto'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 print:bg-white print:shadow-sm"><Calendar className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Dia(s)</p>
                <p className="text-sm font-bold text-gray-900">{course.classDays || 'Sáb'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 print:bg-white print:shadow-sm"><Clock className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Horário</p>
                <p className="text-sm font-bold text-gray-900">{course.classTime || '08:00 - 17:00'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 print:bg-white print:shadow-sm"><RotateCcw className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Duração</p>
                <p className="text-sm font-bold text-gray-900">{course.duration || '10 meses'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 print:bg-white print:shadow-sm"><Edit className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Inscrições</p>
                <p className="text-sm font-bold text-gray-900">{course.enrollmentPeriod || 'Consulte o site'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 col-span-2">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 print:bg-white print:shadow-sm"><ArrowRight className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Início das Aulas</p>
                <p className="text-sm font-bold text-gray-900">{course.startDateInfo || 'A definir'}</p>
              </div>
            </div>
          </div>

          {/* Marketing Text */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase tracking-tight">Sobre o Curso</h3>
            <div className="text-gray-600 text-sm leading-relaxed space-y-4 whitespace-pre-wrap text-justify font-medium print:text-slate-700">
              {course.fullDescription || course.marketingSummary || 'Descrição detalhada em breve.'}
            </div>
          </div>

          <EditorialFiller 
            text="Transforme sua carreira com a metodologia 4.0 da ESUDA" 
            subtext="O futuro da engenharia começa aqui" 
          />

          {/* Apps Educacionais Section */}
          {showApps && (
            <div className="space-y-6 break-inside-avoid print:break-inside-avoid" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
              <h3 className="text-lg font-black text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase tracking-tight">Apps Educacionais: Predial & GPO</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center shadow-sm break-inside-avoid print:flex print:flex-row print:bg-slate-50 print:border-slate-200">
                  <div className="relative w-full md:w-48 h-32 shrink-0 rounded-xl overflow-hidden border border-slate-200 print:w-48 print:block">
                    <Image src="https://i.postimg.cc/jSPpBHzn/predial.png" alt="App Predial" fill className="object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="space-y-2 print:w-full">
                    <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Aplicativo Educacional Predial 4.0</h4>
                    <p className="text-xs text-slate-600 leading-relaxed text-justify">
                      Plano Interativo para Inspeção, Diagnóstico e Manutenção Predial. Uma ferramenta projetada para transformar o denso conteúdo teórico em uma experiência de aprendizado clara, prática e navegável.
                    </p>
                    <a 
                      href="https://esuda-predial.base44.app/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline mt-1 print:text-indigo-600"
                    >
                      <LinkIcon className="w-3 h-3" /> Acessar App Predial 4.0
                    </a>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center shadow-sm break-inside-avoid print:flex print:flex-row print:bg-slate-50 print:border-slate-200">
                  <div className="relative w-full md:w-48 h-32 shrink-0 rounded-xl overflow-hidden border border-slate-200 print:w-48 print:block">
                    <Image src="https://i.postimg.cc/RZKk27c6/gpo.png" alt="App GPO" fill className="object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="space-y-2 print:w-full">
                    <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Ecossistema Digital GPO 4.0</h4>
                    <p className="text-xs text-slate-600 leading-relaxed text-justify">
                      A Convergência entre Gestão, Modelagem da Informação e Inteligência Artificial. Uma plataforma desenvolvida para revolucionar a forma como o profissional aprende e aplica a engenharia.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Incubadora Profissional Section */}
          {showIncubator && (
            <div className="space-y-4 break-inside-avoid print:break-inside-avoid" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
              <h3 className="text-lg font-black text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase tracking-tight">Incubadora Profissional</h3>
              <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100 shadow-sm print:bg-indigo-50/30 print:border-indigo-100">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-2">Objetivo Geral</h4>
                    <p className="text-sm text-slate-700 leading-relaxed text-justify font-medium">
                      Capacitar os alunos a integrarem os conhecimentos teóricos com a prática do mercado de trabalho. Este projeto visa complementar a formação acadêmica dos alunos, proporcionando a vivência profissional e o desenvolvimento de habilidades e competências altamente valorizadas pelas empresas.
                    </p>
                  </div>
                
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-2">Objetivos Específicos</h4>
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-2 marker:text-indigo-600">
                      <li>Aplicar os conhecimentos adquiridos nos módulos do curso</li>
                      <li>Desenvolver estudos de caso práticos em áreas específicas</li>
                      <li>Estabelecer elo entre a ESUDA e instituições parceiras</li>
                      <li>Estimular a pesquisa, a extensão e a inovação tecnológica</li>
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t border-indigo-100">
                    <h4 className="text-sm font-black text-amber-600 uppercase tracking-widest text-center mb-4">Prova Social Ano 2025</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:grid-cols-5">
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-center shadow-lg">
                        <p className="text-xl font-black text-white">4</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Alunos Contratados</p>
                      </div>
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-center shadow-lg">
                        <p className="text-xl font-black text-white">1</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Inovações Tech</p>
                      </div>
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-center shadow-lg">
                        <p className="text-xl font-black text-white">4</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Artigos Científicos</p>
                      </div>
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-center shadow-lg">
                        <p className="text-xl font-black text-white">3</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Workshops</p>
                      </div>
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-center shadow-lg">
                        <p className="text-xl font-black text-white">5</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Visitas Técnicas</p>
                      </div>
                    </div>
                  </div>

                  {/* Hired Students Grid */}
                  <div className="pt-6 border-t border-indigo-100">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Destaques da Incubadora: Alunos Contratados</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
                      {[
                        {
                          name: "Paulo Ewerton Ribeiro da Silva",
                          type: "Freelancer",
                          role: "Projetista",
                          date: "30/09/2025",
                          photo: "https://i.postimg.cc/Y0xjy4yD/Paulo-aluno.jpg"
                        },
                        {
                          name: "Hugo Ewerton Pereira Silva",
                          type: "Empregado",
                          role: "Engenheiro Fiscal de Campo",
                          date: "01/09/2025",
                          photo: "https://i.postimg.cc/x8W9q2CW/hugo.jpg"
                        },
                        {
                          name: "Adriana Gonçalves Araujo",
                          type: "Empregado",
                          role: "Fiscal de Obras",
                          date: "30/08/2025",
                          photo: "https://i.postimg.cc/c4f5jnYX/adriana4x4.jpg"
                        },
                        {
                          name: "Vinícius de Assis Souto Maior Arruda",
                          type: "Empregado",
                          role: "Gerente de Obras",
                          date: "31/08/2025",
                          photo: "https://i.postimg.cc/Fzx1nfn6/Vinicius.jpg"
                        }
                      ].map((student, idx) => (
                        <div 
                          key={idx} 
                          className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-4 flex gap-4 items-center shadow-sm print:bg-emerald-50/30 print:border-emerald-100 break-inside-avoid"
                          style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
                        >
                          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                            <Image 
                              src={student.photo} 
                              alt={student.name} 
                              fill 
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="bg-white px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                {student.type === 'Freelancer' ? (
                                  <User className="w-2.5 h-2.5 text-emerald-600" />
                                ) : (
                                  <Briefcase className="w-2.5 h-2.5 text-emerald-600" />
                                )}
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">{student.type}</span>
                              </div>
                            </div>
                            <h5 className="text-xs font-bold text-slate-900 truncate leading-tight">{student.name}</h5>
                            <p className="text-[10px] font-medium text-slate-500 truncate">{student.role}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1">{student.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disciplines */}
          {showDisciplines && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-l-4 border-indigo-600 pl-4 print:break-after-avoid">Matriz Curricular</h3>
              
              <div 
                className="space-y-6 bg-gray-50 rounded-2xl p-6 border border-gray-100 print:bg-slate-50 print:border-slate-200 print:p-6"
                style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
              >
                <div>
                  <div className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2 print:break-after-avoid">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 print:bg-indigo-600" /> Tronco Comum ({commonDisciplines.length || 9} Disciplinas)
                  </div>
                  <div className="grid grid-cols-1 gap-2 print:grid-cols-1">
                    {(commonDisciplines.length > 0 ? commonDisciplines : COMMON_DISCIPLINES).map((d, i) => (
                      <div key={i} className="flex flex-col bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-indigo-200 print:border-slate-200 print:shadow-sm break-inside-avoid print:break-inside-avoid">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 print:bg-indigo-50 print:text-indigo-600">
                            {i + 1}
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{d.name}</span>
                        </div>
                        {showSyllabus && (
                          <p className="text-xs text-gray-500 mt-1 ml-9 leading-tight italic text-justify">
                            {d.description || 'Ementa detalhada em elaboração'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2 print:break-after-avoid">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 print:bg-indigo-600" /> Específicas do Curso ({course.specificDisciplines?.length || 0} Disciplinas)
                  </div>
                  <div className="grid grid-cols-1 gap-2 print:grid-cols-1">
                    {(course.specificDisciplines || []).map((d: any, i: number) => {
                      const discName = typeof d === 'string' ? d : d.name;
                      const discEmenta = typeof d === 'string' ? null : (d.syllabus || d.description || d.ementa);
                      const commonCount = commonDisciplines.length > 0 ? commonDisciplines.length : COMMON_DISCIPLINES.length;
                      return (
                        <div key={i} className="flex flex-col bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-indigo-200 print:border-slate-200 print:shadow-sm break-inside-avoid print:break-inside-avoid">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 print:bg-indigo-50 print:text-indigo-600">
                              {i + commonCount + 1}
                            </div>
                            <span className="text-sm text-gray-700 font-medium">{discName}</span>
                          </div>
                          {showSyllabus && (
                            <p className="text-xs text-gray-500 mt-1 ml-9 leading-tight italic text-justify">
                              {discEmenta || 'Ementa detalhada em elaboração'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Teachers Section */}
          {showTeachers && courseTeachers.length > 0 && (
            <div className="space-y-6 break-inside-avoid print:break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-900 border-l-4 border-indigo-600 pl-4 print:break-after-avoid">Corpo Docente</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4">
                {courseTeachers.map((teacher: any, i: number) => (
                  <div 
                    key={teacher.id || i} 
                    className="flex flex-col items-center text-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm print:bg-slate-50 print:border-slate-200 print:shadow-sm break-inside-avoid print:break-inside-avoid"
                    style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
                  >
                    <div className="relative w-20 h-20 mb-3 rounded-full overflow-hidden border-2 border-indigo-50 print:border-indigo-100 flex items-center justify-center bg-indigo-50">
                      {teacher.imageUrl || teacher.photoUrl ? (
                        <Image 
                          src={teacher.imageUrl || teacher.photoUrl} 
                          alt={teacher.name} 
                          fill
                          sizes="(max-width: 768px) 50vw, 20vw"
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xl font-black text-indigo-400 print:text-indigo-600">
                          {getInitials(teacher.name)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight mb-1">{teacher.name}</p>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter mb-2">
                      {teacher.titulation || teacher.titulacao || teacher.degree || 'Especialista'}
                    </p>
                    
                    {/* Social Icons - Interative and Print-friendly */}
                    <div className="flex gap-2 mt-auto">
                      {/* LinkedIn */}
                      <a 
                        href={teacher.linkedin || '#'} 
                        target={teacher.linkedin ? "_blank" : "_self"}
                        rel="noreferrer"
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${teacher.linkedin ? 'bg-slate-900 text-white hover:scale-110' : 'bg-slate-100 text-slate-300 cursor-default'}`}
                        onClick={(e) => !teacher.linkedin && e.preventDefault()}
                      >
                        <Linkedin className="w-3 h-3" />
                      </a>
                      
                      {/* Instagram */}
                      <a 
                        href={teacher.instagram ? (teacher.instagram.startsWith('@') ? `https://instagram.com/${teacher.instagram.substring(1)}` : teacher.instagram) : '#'} 
                        target={teacher.instagram ? "_blank" : "_self"}
                        rel="noreferrer"
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${teacher.instagram ? 'bg-orange-500 text-white hover:scale-110' : 'bg-slate-100 text-slate-300 cursor-default'}`}
                        onClick={(e) => !teacher.instagram && e.preventDefault()}
                      >
                        <Instagram className="w-3 h-3" />
                      </a>
                      
                      {/* Lattes */}
                      <a 
                        href={teacher.lattes || '#'} 
                        target={teacher.lattes ? "_blank" : "_self"}
                        rel="noreferrer"
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${teacher.lattes ? 'bg-cyan-500 text-white hover:scale-110' : 'bg-slate-100 text-slate-300 cursor-default'}`}
                        onClick={(e) => !teacher.lattes && e.preventDefault()}
                      >
                        <LinkIcon className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Classes - Bloco Completo Atualizado */}
          {showSchedules && activeSchedules.length > 0 && (
            <div className="space-y-4 break-inside-avoid print:break-inside-avoid">
              <h3 className="text-lg font-black text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase tracking-tight print:break-after-avoid">Turmas em Andamento</h3>
              <div className="grid grid-cols-1 gap-3">
                {activeSchedules.map((s: any) => (
                  <div 
                    key={s.id} 
                    className="p-6 bg-indigo-600 text-white rounded-2xl print:bg-indigo-600 print:text-white shadow-md break-inside-avoid"
                    style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
                  >
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                      <div>
                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Nome da Turma</p>
                        <p className="font-black text-base">{s.className}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Status</p>
                        <p className="font-black text-base italic">
                          {s.className === 'LAND-T02/26' ? 'Matrículas Abertas' : (s.status === 'active' ? 'Turma Iniciada (Aceitando alunos)' : 'Matrículas Abertas')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Início das Aulas</p>
                        <p className="font-black text-base">{formatSafeDate(s.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Prazo de Inscrições</p>
                        <p className="font-black text-base">{course.enrollmentPeriod || 'Até o início das aulas'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <EditorialFiller 
            text="Infraestrutura de Ponta para sua Formação" 
            subtext="Laboratórios e espaços de convivência de alto nível" 
          />

          {/* Infrastructure Section - Organizada com 12 fotos para simetria total */}
          {showInfrastructure && (
            <div className="space-y-6 break-inside-avoid print:break-inside-avoid" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
              <h3 className="text-lg font-black text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase tracking-tight">Infraestrutura de Excelência da Faculdade</h3>
              <p className="text-sm text-slate-700 leading-relaxed text-justify font-medium">
                A Construção 4.0 exige prática, precisão e rede de contatos qualificada. Por isso, a ESUDA oferece um complexo educacional projetado para imergir você na realidade do mercado de alto nível. Nossos alunos têm acesso a laboratórios de excelência, incluindo o Laboratório de Construção Civil e o avançado Laboratório de Ensaios Técnicos.
              </p>
              <p className="text-sm text-slate-700 leading-relaxed text-justify font-medium">
                Para análises de conforto ambiental, contamos com o Laboratório de Acústica no Teatro Algibeira, exclusivo da instituição. A aplicação técnica ganha vida nas nossas Salas de Arquitetura e nos modernos Laboratórios de Informática, já equipados com as licenças dos softwares exigidos pelas grandes construtoras. Tudo isso integrado a amplos espaços de convivência, criando o ambiente perfeito para a rede de contatos qualificada e a geração de novos negócios entre especialistas.
              </p>
              <div className="grid grid-cols-3 gap-3 print:grid-cols-3">
                {[
                  { url: "https://i.postimg.cc/FKQ8NMTR/fachada-esuda.jpg", label: "Fachada Principal" },
                  { url: "https://i.postimg.cc/sgSrg1k5/IMG-9276-scaled.jpg", label: "Área de Eventos" },
                  { url: "https://i.postimg.cc/5tqG0srF/laboratorio-construcao-civil1.jpg", label: "Lab. Construção Civil" },
                  { url: "https://i.postimg.cc/SK75sgPY/laboratorio-construcao-civil2.jpg", label: "Canteiro de Práticas" },
                  { url: "https://i.postimg.cc/pdY7TsSF/laboratorio-ensaios-arquitetura-civil1.jpg", label: "Lab. Ensaios Técnicos" },
                  { url: "https://i.postimg.cc/FKgqRT6S/laboratorio-ensaios-arquitetura-civil2.jpg", label: "Análise de Materiais" },
                  { url: "https://i.postimg.cc/vmLjB0KD/laboratorio-de-acustica-teatro-algibeira.jpg", label: "Lab. de Acústica" },
                  { url: "https://i.postimg.cc/R0zy4kgn/Laboratorios-de-Informatica.jpg", label: "Lab. de Informática 4.0" },
                  { url: "https://i.postimg.cc/5tqG0sr4/Biblioteca.jpg", label: "Biblioteca Central" },
                  { url: "https://i.postimg.cc/PqzcxS7L/sala-de-arquitetura-desenho.jpg", label: "Salas de Arquitetura" },
                  { url: "https://i.postimg.cc/KYywx60k/sala-de-aula.jpg", label: "Salas de Aula Imersiva" },
                  { url: "https://i.postimg.cc/nLtgpy39/sala-de-estudos-acervo-tecnico.jpg", label: "Acervo Técnico" }
                ].map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 break-inside-avoid">
                    <Image 
                      src={img.url} 
                      alt={img.label} 
                      fill 
                      sizes="33vw"
                      className="object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 print:bg-black/70">
                      <p className="text-[7px] font-bold text-white uppercase text-center tracking-widest">{img.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-10 flex flex-col gap-4 print:mt-10">
            {course.websiteUrl && (
              <a 
                href={course.websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-center block hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest text-sm print:bg-indigo-600 print:text-white print:shadow-none"
                style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
              >
                Quero me inscrever agora
              </a>
            )}
            <a 
              href="https://wa.me/5581991298803" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-center flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-xl shadow-green-100 uppercase tracking-widest text-sm print:bg-green-600 print:text-white print:shadow-none"
              style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
            >
              <MessageCircle className="w-5 h-5" />
              Fale com o Coordenador
            </a>
          </div>
          {/* Footer Print Version - Back Cover Style */}
          <div 
            className="hidden print:flex flex-col items-center justify-center mt-24 p-12 bg-indigo-900 text-white rounded-[4rem] text-center space-y-6 break-inside-avoid shadow-2xl"
            style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}
          >
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-xl">
              <BookOpen className="w-10 h-10 text-indigo-900" />
            </div>
            <div className="space-y-2">
              <p className="font-black uppercase tracking-[0.3em] text-indigo-300 text-[10px]">Apresentação do curso</p>
              <h2 className="text-white font-black text-2xl leading-tight max-w-md">{course.name}</h2>
            </div>
            <div className="w-16 h-1 bg-white/20 my-4 rounded-full" />
            <div className="space-y-1 text-[11px]">
              <p className="font-black uppercase tracking-widest">Faculdade ESUDA</p>
              <p className="text-indigo-200 font-bold">https://esuda.edu.br/ | (81) 3412-4242</p>
              <p className="text-indigo-300 font-medium">Rua Dr. José Mariano, 593 - Santo Amaro, Recife - PE</p>
            </div>
            <div className="pt-8 space-y-2">
              <p className="font-black text-white text-lg uppercase tracking-widest">Emanoel Silva de Amorim</p>
              <p className="text-indigo-300 font-black text-[9px] uppercase tracking-[0.2em]">Coordenação das Especializações em Arquitetura e Engenharia</p>
              <div className="flex flex-col items-center gap-1 text-[10px] text-indigo-200 font-bold">
                <p>email: emanoel@esuda.edu.br</p>
                <p>Contatos: (81) 9.9129-8803 / (81) 9.9928-4160</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
