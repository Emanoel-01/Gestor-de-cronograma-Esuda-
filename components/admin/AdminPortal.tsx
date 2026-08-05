'use client';

import React, { useState, useEffect } from 'react';
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
  UserCog
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { ForcePasswordChange } from '../ForcePasswordChange';
import { Button } from '../ui/Button';
import { SidebarItem } from './SidebarItem';
import { DashboardOverview } from './DashboardOverview';
import { SchedulesList } from './SchedulesList';
import { CoursesManager } from './CoursesManager';
import { TeachersManager } from './TeachersManager';
import { HolidaysManager } from './HolidaysManager';
import { CommonDisciplinesManager } from './CommonDisciplinesManager';
import { TeacherSubmissionsManager } from './TeacherSubmissionsManager';
import { TeacherListGenerator } from './TeacherListGenerator';
import { AccessManager } from './AccessManager';
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
  seedData: () => Promise<void>;
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
  const { adminProfile, isAdminGeral } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState(false);
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [isNewTeacherModalOpen, setIsNewTeacherModalOpen] = useState(false);
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);

  // Auto-fix broken images on mount if admin
  useEffect(() => {
    if (isAdmin) {
      const fixImages = async () => {
        try {
          const { data: coursesList } = await supabase.from('courses').select('*');
          if (!coursesList) return;

          const imageMapping: Record<string, string> = {
            'Design de Interiores Contemporâneo': 'https://i.postimg.cc/1z7b2pRB/DESIGN-DE-INTER-CApa.png',
            'Neuroarquitetura': 'https://i.postimg.cc/tJ8qjKX7/NEUROARQUITETURA-CAPA.png',
            'Acústica Arquitetônica e Iluminação': 'https://i.postimg.cc/tJ8qjKXs/ACUSTIC-ARQUITETO-CAPA.png',
            'Engenharia Legal': 'https://i.postimg.cc/fy1zNGwJ/engenharia-legal-capa.png',
            'Manutenção Predial': 'https://i.postimg.cc/Kv4fpdkq/engen-construc-4-0.png',
            'Gestão de Projetos e Obras': 'https://i.postimg.cc/Gh9KgZ8M/GEST-DE-PROJ-E-OBRAS-CAPA.png',
            'Tecnologia BIM': 'https://i.postimg.cc/8Ps4XqJ0/TECNOLOGIA-BIM-CAPA-1.png'
          };

          for (const courseData of coursesList) {
            const courseName = courseData.name;
            const matchKey = Object.keys(imageMapping).find(key => courseName.includes(key));
            
            if (matchKey) {
              const newUrl = imageMapping[matchKey];
              if (courseData.image_url !== newUrl) {
                await supabase.from('courses').update({ image_url: newUrl }).eq('id', courseData.id);
              }
            } else if (courseData.image_url && courseData.image_url.includes('esuda.edu.br')) {
              const fallbackUrl = `https://picsum.photos/seed/${courseData.id}/800/600`;
              await supabase.from('courses').update({ image_url: fallbackUrl }).eq('id', courseData.id);
            }
          }

          const { data: schedulesList } = await supabase.from('schedules').select('*');
          const { data: classesList } = await supabase.from('classes').select('*');

          if (classesList) {
            for (const cData of classesList) {
              if (!cData.is_common && cData.course_id) {
                const course = courses.find(c => c.id === cData.course_id);
                if (!course && cData.course_name) {
                  const matchingCourse = courses.find(c => c.name === cData.course_name);
                  if (matchingCourse) {
                    await supabase.from('classes').update({ course_id: matchingCourse.id }).eq('id', cData.id);
                  }
                }
              }
            }
          }

          if (schedulesList) {
            for (const sData of schedulesList) {
              let changed = false;
              const newIds = [...(sData.course_ids || [])];
              const newNames = (sData.course_ids || []).map((cid: string, idx: number) => {
                const course = courses.find(c => c.id === cid);
                if (course) return course.name;
                const oldName = sData.course_names?.[idx];
                if (oldName) {
                  const matchingCourse = courses.find(c => c.name === oldName);
                  if (matchingCourse) {
                    newIds[idx] = matchingCourse.id;
                    changed = true;
                    return matchingCourse.name;
                  }
                }
                return cid;
              });

              if (JSON.stringify(sData.course_names) !== JSON.stringify(newNames) || changed) {
                await supabase.from('schedules').update({
                  course_names: newNames,
                  course_ids: newIds
                }).eq('id', sData.id);
              }
            }
          }
        } catch (e) {
          console.error("Erro no auto-fix:", e);
        }
      };
      fixImages();
    }
  }, [isAdmin, courses]);

  if (adminProfile?.precisa_trocar_senha) {
    return <ForcePasswordChange />;
  }

  const viewingSchedule = schedules.find(s => s.id === viewingScheduleId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-40">
        <h2 className="text-xl font-bold text-indigo-600">Esuda Acadêmico</h2>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
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
        <div className="p-6 border-b border-gray-200 hidden md:block">
          <h2 className="text-xl font-bold text-indigo-600">Esuda Acadêmico</h2>
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
            icon={<FileText />} 
            label="Relação de Docentes" 
            active={activeTab === 'teacher-list'} 
            onClick={() => { setActiveTab('teacher-list'); setIsSidebarOpen(false); }} 
          />
          {isAdminGeral && (
            <SidebarItem 
              icon={<UserCog />} 
              label="Gestão de Acesso" 
              active={activeTab === 'gestao-acesso'} 
              onClick={() => { setActiveTab('gestao-acesso'); setIsSidebarOpen(false); }} 
            />
          )}
          {isAdmin && courses.length === 0 && (
            <button 
              onClick={() => { seedData(); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-amber-600 hover:bg-amber-50 mt-4 border border-dashed border-amber-200 text-xs font-bold"
            >
              <Save className="w-5 h-5" /> Popular Banco (2026)
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
              {(adminProfile?.nome?.[0] || user?.email?.[0] || 'A').toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{adminProfile?.nome || user?.email}</p>
              <p className="text-xs text-gray-500 truncate">{adminProfile?.papel === 'admin_geral' ? 'Admin Geral' : 'Coordenador Adjunto'}</p>
            </div>
          </div>
          <Button onClick={logout} variant="secondary" className="w-full justify-center">
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
             activeTab === 'curadoria' ? 'Curadoria de Docentes' :
             activeTab === 'common-disciplines' ? 'Tronco Comum' :
             activeTab === 'holidays' ? 'Feriados' :
             activeTab === 'teacher-list' ? 'Relação de Docentes' :
             activeTab === 'gestao-acesso' ? 'Gestão de Acesso' : 'Dashboard'}
          </h1>
          {isAdmin && activeTab !== 'dashboard' && activeTab !== 'teacher-list' && activeTab !== 'gestao-acesso' && (
            <Button className="w-full sm:w-auto" onClick={() => {
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
            {activeTab === 'curadoria' && <TeacherSubmissionsManager />}
            {activeTab === 'common-disciplines' && <CommonDisciplinesManager isAdmin={isAdmin} />}
            {activeTab === 'holidays' && <HolidaysManager holidays={holidays} isAdmin={isAdmin} />}
            {activeTab === 'teacher-list' && <TeacherListGenerator courses={courses} teachers={teachers} commonDisciplines={commonDisciplines} />}
            {activeTab === 'gestao-acesso' && <AccessManager courses={courses} />}
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
    </div>
  );
}
