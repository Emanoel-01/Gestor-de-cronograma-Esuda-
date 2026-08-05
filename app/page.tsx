'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, mapTeacherFromDb, mapCourseFromDb, mapScheduleFromDb, mapCommonDisciplineFromDb } from '@/lib/supabase';
import { Holiday } from '@/lib/calendar';
import { PublicPortal } from '@/components/PublicPortal';
import { AdminPortal } from '@/components/admin/AdminPortal';
import { seedData } from '@/lib/seed';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// --- Dashboard ---

function DashboardContent() {
  const { user, loading, logout, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const initialScheduleId = searchParams.get('schedule');
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [commonDisciplines, setCommonDisciplines] = useState<any[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Fetch Data
  useEffect(() => {
    const fetchTeachers = () => {
      supabase.from('teachers').select('*').then(({ data }) => {
        setTeachers((data || []).map(mapTeacherFromDb));
      });
    };

    const fetchCourses = () => {
      supabase.from('courses').select('*').then(({ data }) => {
        setCourses((data || []).map(mapCourseFromDb));
      });
    };

    const fetchHolidays = () => {
      supabase.from('holidays').select('*').then(({ data }) => {
        setHolidays((data || []) as any);
      });
    };

    const fetchSchedules = () => {
      supabase.from('schedules').select('*').order('created_at', { ascending: false }).then(({ data }) => {
        setSchedules((data || []).map(mapScheduleFromDb));
      });
    };

    const fetchCommonDisciplines = () => {
      supabase.from('common_disciplines').select('*').order('order', { ascending: true }).then(({ data }) => {
        setCommonDisciplines((data || []).map(mapCommonDisciplineFromDb));
      });
    };

    fetchTeachers();
    fetchCourses();
    fetchHolidays();
    fetchSchedules();
    fetchCommonDisciplines();

    const teachersSub = supabase.channel('teachers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, fetchTeachers)
      .subscribe();

    const coursesSub = supabase.channel('courses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchCourses)
      .subscribe();

    const holidaysSub = supabase.channel('holidays-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, fetchHolidays)
      .subscribe();

    const schedulesSub = supabase.channel('schedules-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, fetchSchedules)
      .subscribe();

    const commonSub = supabase.channel('common-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'common_disciplines' }, fetchCommonDisciplines)
      .subscribe();

    return () => {
      supabase.removeChannel(teachersSub);
      supabase.removeChannel(coursesSub);
      supabase.removeChannel(holidaysSub);
      supabase.removeChannel(schedulesSub);
      supabase.removeChannel(commonSub);
    };
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50">Carregando...</div>;

  if (!isAdmin) {
    return (
      <PublicPortal 
        teachers={teachers} 
        courses={courses} 
        holidays={holidays} 
        schedules={schedules} 
        commonDisciplines={commonDisciplines}
        onLogin={() => setShowLoginModal(true)}
        isLoggingIn={false}
        user={user}
        logout={logout}
        initialScheduleId={initialScheduleId}
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
      />
    );
  }

  return (
    <AdminPortal 
      user={user}
      logout={logout}
      teachers={teachers}
      courses={courses}
      holidays={holidays}
      schedules={schedules}
      commonDisciplines={commonDisciplines}
      isAdmin={isAdmin}
      seedData={() => seedData(() => {})}
    />
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-50">Carregando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

