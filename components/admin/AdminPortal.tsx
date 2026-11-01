'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Users, 
  AlertCircle, 
  Clock,
  FileText,
  Save, 
  LogOut, 
  Menu, 
  X, 
  Plus,
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  Loader2,
  UserCheck
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/Button';
import { carregarCronogramas, CargaResult } from '@/lib/carga-cronogramas';
import { SidebarItem } from './SidebarItem';
import { DashboardOverview } from './DashboardOverview';
import { SchedulesList } from './SchedulesList';
import { CoursesManager } from './CoursesManager';
import { TeachersManager } from './TeachersManager';
import { HolidaysManager } from './HolidaysManager';
import { CommonDisciplinesManager } from './CommonDisciplinesManager';
import { TeacherSubmissionsManager } from './TeacherSubmissionsManager';
import { TeacherListGenerator } from './TeacherListGenerator';
import { UsersManager } from './UsersManager';
import { LeadsManager } from './LeadsManager';
import { NewScheduleModal } from './NewScheduleModal';
import { NewCourseModal } from './NewCourseModal';
import { NewTeacherModal } from './NewTeacherModal';
import { ScheduleDetailsModal } from './ScheduleDetailsModal';

interface AdminPortalProps {
  user: any;
  logout: () => void;
  teachers: any[];
  courses: any[];
  holidays: any[];
  schedules: any[];
  commonDisciplines: any[];
  isAdmin: boolean;
  seedData: () => Promise<any> | void;
}

export function AdminPortal({ 
  user, 
  logout, 
  teachers, 
  courses, 
  holidays, 
  schedules, 
  commonDisciplines,
  isAdmin, 
  seedData 
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState(false);
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [isNewTeacherModalOpen, setIsNewTeacherModalOpen] = useState(false);
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);

  // Estados para Carga de Cronogramas 2026/2027
  const [cargaModalOpen, setCargaModalOpen] = useState(false);
  const [cargaLoading, setCargaLoading] = useState(false);
  const [cargaProgress, setCargaProgress] = useState(0);
  const [cargaMessage, setCargaMessage] = useState('');
  const [cargaResult, setCargaResult] = useState<CargaResult | null>(null);

  const handleCarregarCronogramas = async () => {
    setCargaModalOpen(true);
    setCargaLoading(true);
    setCargaProgress(0);
    setCargaMessage('Iniciando processamento dos dados...');
    setCargaResult(null);

    const res = await carregarCronogramas(undefined, (msg, pct) => {
      setCargaMessage(msg);
      setCargaProgress(pct);
    });

    setCargaLoading(false);
    setCargaResult(res);
  };

  const viewingSchedule = schedules.find(s => s.id === viewingScheduleId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-indigo-600">Esuda Acadêmico</h2>
          {!isAdmin && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">
              Restrito
            </span>
          )}
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200 hidden md:flex items-center justify-between">
          <h2 className="text-xl font-bold text-indigo-600">Esuda Acadêmico</h2>
          {!isAdmin && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">
              Restrito
            </span>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Calendar />} 
            label="Cronogramas" 
            active={activeTab === 'schedules'} 
            onClick={() => { setActiveTab('schedules'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<BookOpen />} 
            label="Cursos" 
            active={activeTab === 'courses'} 
            onClick={() => { setActiveTab('courses'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Users />} 
            label="Docentes" 
            active={activeTab === 'teachers'} 
            onClick={() => { setActiveTab('teachers'); setIsSidebarOpen(false); }} 
          />
          
          {isAdmin && (
            <>
              <SidebarItem 
                icon={<UserCheck />} 
                label="Leads" 
                active={activeTab === 'leads'} 
                onClick={() => { setActiveTab('leads'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<Clock />} 
                label="Curadoria" 
                active={activeTab === 'curadoria'} 
                onClick={() => { setActiveTab('curadoria'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<BookOpen />} 
                label="Tronco Comum" 
                active={activeTab === 'common-disciplines'} 
                onClick={() => { setActiveTab('common-disciplines'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<AlertCircle />} 
                label="Feriados" 
                active={activeTab === 'holidays'} 
                onClick={() => { setActiveTab('holidays'); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={<ShieldCheck />} 
                label="Acessos & Usuários" 
                active={activeTab === 'users'} 
                onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} 
              />
            </>
          )}

          <SidebarItem 
            icon={<FileText />} 
            label="Relação de Docentes" 
            active={activeTab === 'teacher-list'} 
            onClick={() => { setActiveTab('teacher-list'); setIsSidebarOpen(false); }} 
          />

          {isAdmin && courses.length === 0 && (
            <button 
              onClick={() => { seedData(); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-amber-600 hover:bg-amber-50 mt-4 border border-dashed border-amber-200 cursor-pointer"
            >
              <Save className="w-5 h-5" /> Popular Banco (2026)
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            {user?.photoURL ? (
              <Image 
                src={user.photoURL} 
                width={40} 
                height={40} 
                className="rounded-full" 
                alt={user.displayName || ''} 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                {(user?.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button onClick={logout} variant="secondary" className="w-full justify-center cursor-pointer">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 capitalize">
            {activeTab === 'schedules' ? 'Cronogramas' : 
             activeTab === 'courses' ? 'Cursos' :
             activeTab === 'teachers' ? 'Docentes' :
             activeTab === 'leads' ? 'Leads' :
             activeTab === 'curadoria' ? 'Curadoria de Docentes' :
             activeTab === 'common-disciplines' ? 'Tronco Comum' :
             activeTab === 'holidays' ? 'Feriados' :
             activeTab === 'users' ? 'Gestão de Usuários' :
             activeTab === 'teacher-list' ? 'Relação de Docentes' : 'Dashboard'}
          </h1>
          {isAdmin && activeTab !== 'dashboard' && activeTab !== 'teacher-list' && activeTab !== 'users' && activeTab !== 'leads' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {activeTab === 'schedules' && (
                <Button 
                  variant="secondary"
                  className="w-full sm:w-auto cursor-pointer border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-xs"
                  onClick={handleCarregarCronogramas}
                >
                  <UploadCloud className="w-5 h-5 text-indigo-600" /> Carregar cronogramas 2026/2027
                </Button>
              )}
              <Button className="w-full sm:w-auto cursor-pointer" onClick={() => {
                if (activeTab === 'schedules') setIsNewScheduleModalOpen(true);
                if (activeTab === 'courses') setIsNewCourseModalOpen(true);
                if (activeTab === 'teachers') setIsNewTeacherModalOpen(true);
                if (activeTab === 'holidays') {
                  const input = document.querySelector('input[type="date"]') as HTMLInputElement;
                  input?.focus();
                }
              }}>
                <Plus className="w-5 h-5" /> Novo {
                  activeTab === 'schedules' ? 'Cronograma' : 
                  activeTab === 'courses' ? 'Curso' :
                  activeTab === 'teachers' ? 'Docente' : 'Feriado'
                }
              </Button>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardOverview schedules={schedules} courses={courses} teachers={teachers} setActiveTab={setActiveTab} />}
            {activeTab === 'schedules' && <SchedulesList schedules={schedules} courses={courses} onSelect={(s) => setViewingScheduleId(s.id)} isAdmin={isAdmin} />}
            {activeTab === 'courses' && <CoursesManager courses={courses} isAdmin={isAdmin} />}
            {activeTab === 'teachers' && <TeachersManager teachers={teachers} courses={courses} isAdmin={isAdmin} commonDisciplines={commonDisciplines} />}
            {activeTab === 'leads' && <LeadsManager courses={courses} />}
            {activeTab === 'curadoria' && <TeacherSubmissionsManager />}
            {activeTab === 'common-disciplines' && <CommonDisciplinesManager isAdmin={isAdmin} />}
            {activeTab === 'holidays' && <HolidaysManager holidays={holidays} isAdmin={isAdmin} />}
            {activeTab === 'users' && <UsersManager currentUser={user} isAdmin={isAdmin} />}
            {activeTab === 'teacher-list' && <TeacherListGenerator courses={courses} teachers={teachers} commonDisciplines={commonDisciplines} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      {isNewScheduleModalOpen && (
        <NewScheduleModal 
          courses={courses} 
          holidays={holidays}
          teachers={teachers}
          commonDisciplines={commonDisciplines}
          onClose={() => setIsNewScheduleModalOpen(false)} 
        />
      )}
      {isNewCourseModalOpen && (
        <NewCourseModal 
          isAdmin={isAdmin}
          onClose={() => setIsNewCourseModalOpen(false)} 
        />
      )}
      {isNewTeacherModalOpen && (
        <NewTeacherModal 
          courses={courses}
          isAdmin={isAdmin}
          commonDisciplines={commonDisciplines}
          onClose={() => setIsNewTeacherModalOpen(false)} 
        />
      )}

      {viewingSchedule && (
        <ScheduleDetailsModal
          schedule={viewingSchedule}
          courses={courses}
          teachers={teachers}
          isAdmin={isAdmin}
          onClose={() => setViewingScheduleId(null)}
          holidays={holidays}
        />
      )}

      {/* Modal de Carga de Cronogramas 2026/2027 */}
      {cargaModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100"
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Carga de Cronogramas 2026/2027</h3>
                  <p className="text-xs text-gray-500">Importação oficial a partir de lib/cronogramas-esuda.json</p>
                </div>
              </div>
              {!cargaLoading && (
                <button 
                  onClick={() => setCargaModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="py-6 space-y-5">
              {cargaLoading ? (
                <div className="space-y-4 text-center py-4">
                  <div className="flex justify-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{cargaMessage}</p>
                    <p className="text-xs text-gray-500 mt-1">Garantindo idempotência e integridade das sessões...</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${cargaProgress}%` }}
                    />
                  </div>
                  <p className="text-xs font-mono text-gray-400">{cargaProgress}% concluído</p>
                </div>
              ) : cargaResult ? (
                cargaResult.success ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900">Importação concluída com sucesso!</h4>
                        <p className="text-xs text-emerald-700 mt-1">{cargaResult.message}</p>
                      </div>
                    </div>

                    {cargaResult.stats && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-gray-400 block font-medium">Docentes Cadastrados</span>
                          <span className="text-lg font-bold text-gray-800">{cargaResult.stats.teachersCreated} novos</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-gray-400 block font-medium">Docentes Atualizados</span>
                          <span className="text-lg font-bold text-gray-800">{cargaResult.stats.teachersUpdated} existentes</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-gray-400 block font-medium">Turmas / Cronogramas</span>
                          <span className="text-lg font-bold text-indigo-600">
                            {cargaResult.stats.schedulesCreated + cargaResult.stats.schedulesUpdated} processadas
                          </span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-gray-400 block font-medium">Aulas Gravadas</span>
                          <span className="text-lg font-bold text-indigo-600">{cargaResult.stats.classesCreated} aulas</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-900">Aviso na importação</h4>
                      <p className="text-xs text-red-700 mt-1">{cargaResult.message}</p>
                    </div>
                  </div>
                )
              ) : null}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              {!cargaLoading && (
                <Button 
                  onClick={() => setCargaModalOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Concluir
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
