import { supabase } from './supabase';

/**
 * Sincroniza as atribuições de professores nos cronogramas existentes.
 * Se uma disciplina tiver apenas UM professor especialista (estrela), 
 * esse professor é automaticamente atribuído a todas as aulas dessa disciplina 
 * que ainda não possuem professor ou que precisam ser atualizadas.
 */
export async function syncTeacherAssignments() {
  try {
    // 1. Buscar todos os professores
    const { data: teachers } = await supabase.from('teachers').select('*');
    if (!teachers) return;

    // 2. Mapear especialidades para professores
    // Estrutura: { "Nome da Disciplina": [teacherId1, teacherId2] }
    const specialtyMap: { [key: string]: string[] } = {};

    teachers.forEach(teacher => {
      teacher.specialties?.forEach((spec: any) => {
        const key = spec.disciplineName;
        if (!specialtyMap[key]) specialtyMap[key] = [];
        specialtyMap[key].push(teacher.id);
      });
    });

    // 3. Identificar disciplinas com apenas UM especialista
    const uniqueSpecialists: { [key: string]: string } = {};
    Object.entries(specialtyMap).forEach(([discipline, teacherIds]) => {
      if (teacherIds.length === 1) {
        uniqueSpecialists[discipline] = teacherIds[0];
      }
    });

    // 4. Buscar todos os cronogramas
    const { data: schedules } = await supabase.from('schedules').select('*');
    if (!schedules) return;
    
    for (const schedule of schedules) {
      // 5. Buscar todas as aulas deste cronograma
      const { data: classes } = await supabase.from('classes').select('*').eq('schedule_id', schedule.id);
      if (!classes) continue;
      
      for (const classItem of classes) {
        const disciplineName = classItem.discipline_name;
        
        // Se existe um especialista único para esta disciplina
        if (uniqueSpecialists[disciplineName]) {
          const targetTeacherId = uniqueSpecialists[disciplineName];
          
          // Só atualiza se o professor for diferente do atual
          if (classItem.teacher_id !== targetTeacherId) {
            await supabase.from('classes').update({
              teacher_id: targetTeacherId
            }).eq('id', classItem.id);
          }
        }
      }
    }
    
    console.log('Sincronização de professores concluída com sucesso.');
  } catch (error) {
    console.error('Erro ao sincronizar professores:', error);
    throw error;
  }
}
