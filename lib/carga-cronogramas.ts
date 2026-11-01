import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  writeBatch, 
  serverTimestamp,
  WriteBatch,
  Firestore
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import defaultCronogramasData from './cronogramas-esuda.json';

export interface CargaResult {
  success: boolean;
  message: string;
  stats?: {
    teachersCreated: number;
    teachersUpdated: number;
    schedulesCreated: number;
    schedulesUpdated: number;
    classesDeleted: number;
    classesCreated: number;
  };
}

export type ProgressCallback = (message: string, percent: number) => void;

function normalizeName(name: string | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeDate(raw: string | undefined): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }
  return s;
}

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function commitInChunks(database: Firestore, operations: Array<(b: WriteBatch) => void>) {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(database);
    for (const op of chunk) {
      op(batch);
    }
    await batch.commit();
  }
}

function findCourseId(courses: Array<{ id: string; name: string }>, rawCursoName: string): string | undefined {
  if (!rawCursoName) return undefined;
  // Remove prefixos comuns como "Especialização em"
  const cleanTarget = rawCursoName.replace(/^especialização em\s+/i, '').trim();
  const normTarget = normalizeName(cleanTarget);

  // 1. Busca exata após normalização
  const exact = courses.find(c => {
    const cleanC = c.name.replace(/^especialização em\s+/i, '').trim();
    return normalizeName(cleanC) === normTarget;
  });
  if (exact) return exact.id;

  // 2. Busca por substring mútua
  const partial = courses.find(c => {
    const cleanC = c.name.replace(/^especialização em\s+/i, '').trim();
    const normC = normalizeName(cleanC);
    return normTarget.includes(normC) || normC.includes(normTarget);
  });
  if (partial) return partial.id;

  return undefined;
}

export async function carregarCronogramas(
  customData?: any,
  onProgress?: ProgressCallback
): Promise<CargaResult> {
  const data = customData || defaultCronogramasData;
  const professores = Array.isArray(data?.professores) ? data.professores : [];
  const turmas = Array.isArray(data?.turmas) ? data.turmas : [];
  const aulasAvulsas = Array.isArray(data?.aulas) ? data.aulas : [];

  if (professores.length === 0 && turmas.length === 0 && aulasAvulsas.length === 0) {
    return {
      success: false,
      message: 'O arquivo lib/cronogramas-esuda.json ainda não contém dados de professores ou turmas para carregar.'
    };
  }

  const stats = {
    teachersCreated: 0,
    teachersUpdated: 0,
    schedulesCreated: 0,
    schedulesUpdated: 0,
    classesDeleted: 0,
    classesCreated: 0,
  };

  try {
    onProgress?.('Carregando base de cursos e professores existentes...', 10);

    // 1. Mapeamento de Cursos existentes (para associar courseIds nas turmas)
    const coursesSnap = await getDocs(collection(db, 'courses'));
    const coursesList: Array<{ id: string; name: string }> = [];
    coursesSnap.forEach(d => {
      const cData = d.data();
      if (cData?.name) {
        coursesList.push({ id: d.id, name: cData.name });
      }
    });

    // 2. Mapeamento de Professores existentes no Firestore
    const teachersSnap = await getDocs(collection(db, 'teachers'));
    const teachersMap = new Map<string, string>(); // normName -> docId
    teachersSnap.forEach(d => {
      const tData = d.data();
      if (tData?.name) {
        teachersMap.set(normalizeName(tData.name), d.id);
      }
    });

    // Mapeamento de chave do professor (ex: "paulo" -> docId)
    const chaveToTeacherId = new Map<string, string>();

    // 3. Processar Professores do JSON
    onProgress?.('Processando professores e credenciais privadas...', 25);
    for (let i = 0; i < professores.length; i++) {
      const p = professores[i];
      const chave = (p.chave || '').trim().toLowerCase();
      const rawName = (p.nome || p.name || '').trim();
      if (!rawName) continue;

      const norm = normalizeName(rawName);
      const titulacao = (p.titulacao || p.titulação || '').trim();
      const cpf = (p.privado?.cpf || p.cpf || '').trim();
      const email = (p.privado?.email || p.email || '').trim();
      const phone = (p.privado?.telefone || p.privado?.phone || p.telefone || p.phone || '').trim();

      let teacherId = teachersMap.get(norm);

      if (teacherId) {
        // Atualiza docente público existente
        const publicUpdates: Record<string, any> = { name: rawName };
        if (titulacao) publicUpdates.titulacao = titulacao;
        await updateDoc(doc(db, 'teachers', teacherId), publicUpdates);

        // Atualiza coleção restrita de dados pessoais
        await setDoc(doc(db, 'teachers_private', teacherId), {
          cpf,
          email,
          phone
        }, { merge: true });

        stats.teachersUpdated++;
      } else {
        // Cria novo docente público
        const newDocRef = doc(collection(db, 'teachers'));
        teacherId = newDocRef.id;

        await setDoc(newDocRef, {
          name: rawName,
          titulacao: titulacao || 'Especialista',
          accessCode: generateRandomCode(),
          hasSubmitted: false,
          specialties: [],
          createdAt: serverTimestamp()
        });

        // Cria dados privados correspondentes com mesmo ID
        await setDoc(doc(db, 'teachers_private', teacherId), {
          cpf,
          email,
          phone
        });

        teachersMap.set(norm, teacherId);
        stats.teachersCreated++;
      }

      if (chave) {
        chaveToTeacherId.set(chave, teacherId);
      }
      chaveToTeacherId.set(norm, teacherId);
    }

    // 4. Mapeamento de Schedules existentes (para idempotência)
    onProgress?.('Localizando turmas e cronogramas existentes...', 45);
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    const schedulesMap = new Map<string, { id: string; className: string }>(); // normClassName -> { id, className }
    schedulesSnap.forEach(d => {
      const sData = d.data();
      if (sData?.className) {
        schedulesMap.set(normalizeName(sData.className), { id: d.id, className: sData.className });
      }
    });

    // 5. Processar cada turma e suas aulas
    const totalTurmas = turmas.length || (aulasAvulsas.length > 0 ? 1 : 0);
    let turmasProcessadas = 0;

    for (const t of turmas) {
      turmasProcessadas++;
      const turmaNome = (t.turma || t.className || t.nome || '').trim();
      if (!turmaNome) continue;

      const normTurma = normalizeName(turmaNome);
      const dataInicio = normalizeDate(t.inicio || t.startDate || '2026-01-31');

      // Normaliza nomes dos cursos
      const rawCursos = t.curso || t.cursos || t.courseNames;
      const courseNames: string[] = Array.isArray(rawCursos) 
        ? rawCursos.map(c => String(c).trim()).filter(Boolean)
        : (rawCursos ? [String(rawCursos).trim()] : []);

      // Resolve courseIds a partir dos nomes dos cursos
      let courseIds: string[] = [];
      for (const cn of courseNames) {
        const matchedId = findCourseId(coursesList, cn);
        if (matchedId && !courseIds.includes(matchedId)) {
          courseIds.push(matchedId);
        }
      }

      if (courseIds.length === 0) {
        courseIds = ['curso_geral'];
      }

      // Localiza schedule existente ou cria novo
      let scheduleId: string;
      const existingSchedule = schedulesMap.get(normTurma);

      if (existingSchedule) {
        scheduleId = existingSchedule.id;
        await updateDoc(doc(db, 'schedules', scheduleId), {
          className: turmaNome,
          startDate: dataInicio,
          status: 'active',
          courseIds,
          courseNames: courseNames.length > 0 ? courseNames : [turmaNome],
          lastUpdated: serverTimestamp()
        });
        stats.schedulesUpdated++;
      } else {
        const newSchedRef = doc(collection(db, 'schedules'));
        scheduleId = newSchedRef.id;
        await setDoc(newSchedRef, {
          className: turmaNome,
          startDate: dataInicio,
          status: 'active',
          courseIds,
          courseNames: courseNames.length > 0 ? courseNames : [turmaNome],
          createdAt: serverTimestamp()
        });
        schedulesMap.set(normTurma, { id: scheduleId, className: turmaNome });
        stats.schedulesCreated++;
      }

      onProgress?.(
        `Turma ${turmasProcessadas}/${totalTurmas}: Limpando aulas anteriores de "${turmaNome}"...`, 
        50 + Math.floor((turmasProcessadas / totalTurmas) * 20)
      );

      // IDEMPOTÊNCIA: Antes de gravar, apagar todas as classes existentes cujo scheduleId pertença a esta turma
      const existingClassesSnap = await getDocs(
        query(collection(db, 'classes'), where('scheduleId', '==', scheduleId))
      );

      if (!existingClassesSnap.empty) {
        const deleteOps: Array<(b: WriteBatch) => void> = [];
        existingClassesSnap.forEach(cdoc => {
          deleteOps.push(b => b.delete(doc(db, 'classes', cdoc.id)));
          stats.classesDeleted++;
        });
        await commitInChunks(db, deleteOps);
      }

      // Extrair aulas desta turma: presentes no item da turma ou em lista geral
      const aulasDaTurma = Array.isArray(t.aulas) 
        ? t.aulas 
        : aulasAvulsas.filter((a: any) => {
            const aTurma = (a.turma || a.scheduleName || '').trim();
            return normalizeName(aTurma) === normTurma;
          });

      // Gravar aulas no Firestore
      const insertOps: Array<(b: WriteBatch) => void> = [];

      for (let orderIdx = 0; orderIdx < aulasDaTurma.length; orderIdx++) {
        const aula = aulasDaTurma[orderIdx];
        const rawDate = normalizeDate(aula.data || aula.date);
        const disciplineName = (aula.disciplina || aula.disciplineName || aula.nome || '').trim();
        const rawProf = (aula.professor || aula.teacher || aula.docente || '').trim();
        const order = Number(aula.ordem ?? aula.order ?? (orderIdx + 1));
        const classNumber = Number(aula.aula ?? aula.classNumber ?? 1);
        const isCommon = Boolean(aula.isCommon);
        const courseName = (aula.curso || aula.courseName || courseNames[0] || turmaNome).trim();

        // Casos especiais:
        // 1. semAula: true -> existe no cronograma mas não tem professor nem disciplina regular. disciplineName = texto, teacherId = ""
        const isSemAula = Boolean(aula.semAula);
        // 2. semTitular: true -> disciplina sem professor definido. teacherId = "", aDefinir = true
        const isSemTitular = Boolean(aula.semTitular);
        // 3. aulaExtra: true -> destaque visual no portal
        const isAulaExtra = Boolean(aula.aulaExtra);
        const isAlterado = Boolean(aula.alterado);
        const modalidade = aula.modalidade || 'Presencial';

        let teacherId = '';
        if (!isSemAula && !isSemTitular && rawProf) {
          const profKey = rawProf.toLowerCase();
          teacherId = chaveToTeacherId.get(profKey) || teachersMap.get(normalizeName(rawProf)) || '';
        }

        const classDocRef = doc(collection(db, 'classes'));
        const classPayload: Record<string, any> = {
          scheduleId,
          date: rawDate,
          disciplineName,
          order,
          classNumber,
          isCommon,
          courseName,
          teacherId: teacherId || '',
          teacherIds: teacherId ? [teacherId] : [],
          modalidade
        };

        if (isSemAula) {
          classPayload.semAula = true;
        }
        if (isSemTitular) {
          classPayload.aDefinir = true;
        }
        if (isAulaExtra) {
          classPayload.aulaExtra = true;
        }
        if (isAlterado) {
          classPayload.alterado = true;
        }

        insertOps.push(b => b.set(classDocRef, classPayload));
        stats.classesCreated++;
      }

      if (insertOps.length > 0) {
        await commitInChunks(db, insertOps);
      }
    }

    onProgress?.('Carga finalizada com sucesso!', 100);

    return {
      success: true,
      message: `Carga concluída com sucesso! ${stats.schedulesCreated + stats.schedulesUpdated} turmas e ${stats.classesCreated} aulas processadas.`,
      stats
    };
  } catch (error) {
    console.error('Erro na carga de cronogramas:', error);
    const errInfo = handleFirestoreError(error, OperationType.WRITE, 'schedules/classes');
    return {
      success: false,
      message: (errInfo as any)?.message || 'Erro inesperado ao carregar cronogramas.',
      stats
    };
  }
}
