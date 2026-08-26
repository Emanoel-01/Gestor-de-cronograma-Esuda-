import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Sincroniza as atribuições de professores nos cronogramas existentes.
 * Se uma disciplina tiver apenas UM professor especialista (estrela), 
 * esse professor é automaticamente atribuído a todas as aulas dessa disciplina 
 * que ainda não possuem professor ou que precisam ser atualizadas.
 */
export async function syncTeacherAssignments() {
  try {
    // 1. Buscar todos os professores
    const teachersSnap = await getDocs(collection(db, 'teachers'));
    const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // 2. Mapear especialidades para professores usando Set para evitar duplicatas do mesmo professor
    // Chaves normalizadas (trim + lowercase)
    const specialtyMap: { [normalizedKey: string]: { originalName: string; teacherIds: Set<string> } } = {};

    teachers.forEach(teacher => {
      teacher.specialties?.forEach((spec: any) => {
        if (!spec.disciplineName) return;
        const origKey = spec.disciplineName.trim();
        const normKey = origKey.toLowerCase();
        
        if (!specialtyMap[normKey]) {
          specialtyMap[normKey] = {
            originalName: origKey,
            teacherIds: new Set<string>()
          };
        }
        specialtyMap[normKey].teacherIds.add(teacher.id);
      });
    });

    // 3. Identificar disciplinas com apenas UM especialista
    const uniqueSpecialists: { [normalizedKey: string]: string } = {};
    const multipleSpecialistsList: { discipline: string; teacherIds: string[] }[] = [];

    Object.entries(specialtyMap).forEach(([normKey, entry]) => {
      const ids = Array.from(entry.teacherIds);
      if (ids.length === 1) {
        uniqueSpecialists[normKey] = ids[0];
      } else if (ids.length > 1) {
        multipleSpecialistsList.push({
          discipline: entry.originalName,
          teacherIds: ids
        });
      }
    });

    // 4. Buscar todos os cronogramas
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    let updatedClassesCount = 0;
    const updatedDisciplinesSet = new Set<string>();

    for (const scheduleDoc of schedulesSnap.docs) {
      const scheduleId = scheduleDoc.id;
      
      // 5. Buscar todas as aulas deste cronograma na coleção global 'classes'
      const classesQuery = query(collection(db, 'classes'), where('scheduleId', '==', scheduleId));
      const classesSnap = await getDocs(classesQuery);
      
      for (const classDoc of classesSnap.docs) {
        const classData = classDoc.data();
        const disciplineName = classData.disciplineName;
        if (!disciplineName) continue;
        
        const normKey = disciplineName.trim().toLowerCase();
        
        // Se existe um especialista único para esta disciplina
        if (uniqueSpecialists[normKey]) {
          const targetTeacherId = uniqueSpecialists[normKey];
          
          const currentTeacherId = classData.teacherId || '';
          const currentTeacherIds = Array.isArray(classData.teacherIds) ? classData.teacherIds : [];
          
          const needsTeacherIdUpdate = currentTeacherId !== targetTeacherId;
          const needsTeacherIdsUpdate = currentTeacherIds.length !== 1 || currentTeacherIds[0] !== targetTeacherId;
          
          if (needsTeacherIdUpdate || needsTeacherIdsUpdate) {
            await updateDoc(doc(db, 'classes', classDoc.id), {
              teacherId: targetTeacherId,
              teacherIds: [targetTeacherId]
            });
            updatedClassesCount++;
            updatedDisciplinesSet.add(disciplineName);
          }
        }
      }
    }
    
    console.log(`Sincronização de professores concluída com sucesso. ${updatedClassesCount} aulas atualizadas em ${updatedDisciplinesSet.size} disciplinas.`);
    return {
      updatedClassesCount,
      updatedDisciplines: Array.from(updatedDisciplinesSet),
      multipleSpecialists: multipleSpecialistsList
    };
  } catch (error) {
    console.error('Erro ao sincronizar professores:', error);
    throw error;
  }
}
