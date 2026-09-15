import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  addDoc,
  query, 
  where 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, firebaseConfig.firestoreDatabaseId);

const isDryRun = !process.argv.includes('--apply');

async function withRetry(fn, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(res => setTimeout(res, delayMs * attempt));
    }
  }
}

async function main() {
  console.log('====================================================');
  console.log('  APLICAÇÃO DOS BLOCOS 1, 2 E 3 - CRONOGRAMAS ESUDA');
  console.log(`  MODO: ${isDryRun ? 'DRY_RUN (nenhuma alteração será gravada)' : 'APPLY (gravando alterações no Firestore)'}`);
  console.log('====================================================\n');

  if (!isDryRun) {
    console.log('Autenticando como admin de migração...');
    await signInWithEmailAndPassword(auth, 'migration_temp@esuda.edu.br', 'TempAdminPass123!');
    console.log('Autenticado com sucesso!\n');
  }

  // IDs conhecidos
  const CLUSTER_A_ID = 'WadMvge0Xmc5BvVZf1nA';
  const CLUSTER_B_ID = 'kzQVwaCakQXzQIu30kMc';
  const GPO_COURSE_ID = '3HDgYKELmnhoYC3ctl1o';
  const GPO_COURSE_NAME = 'Gestão de Projetos e Obras';

  // Buscar professores
  const teachersSnap = await getDocs(collection(db, 'teachers'));
  const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const emanoel = teachers.find(t => t.name.toLowerCase().includes('emanoel') && t.name.toLowerCase().includes('amorim'));
  const vera = teachers.find(t => t.name.toLowerCase().includes('vera'));

  if (!emanoel) throw new Error('Professor Emanoel Silva de Amorim não encontrado.');
  if (!vera) throw new Error('Professora Vera Lúcia Barbosa Silva não encontrada.');

  console.log(`Professor Emanoel: [${emanoel.id}] ${emanoel.name}`);
  console.log(`Professora Vera: [${vera.id}] ${vera.name}\n`);

  // =====================================================================
  // BLOCO 1 — CLUSTER A: "Gestão de Projetos e Obras" APENAS
  // =====================================================================
  console.log('--- BLOCO 1: GESTÃO DE PROJETOS E OBRAS (CLUSTER A) ---');
  
  // 1.1 Mover "Lean Construction, Last Planner System e Logística de Canteiro"
  // de 2026-08-29 e 2026-09-12 para 2026-12-05 e 2026-12-12
  const qLean = query(
    collection(db, 'classes'),
    where('scheduleId', '==', CLUSTER_A_ID),
    where('courseId', '==', GPO_COURSE_ID)
  );
  const snapGpo = await getDocs(qLean);
  const gpoClasses = snapGpo.docs.map(d => ({ id: d.id, ...d.data() }));

  const leanClasses = gpoClasses.filter(c => 
    c.disciplineName.includes('Lean Construction')
  ).sort((a, b) => (a.classNumber || 0) - (b.classNumber || 0));

  console.log(`Encontradas ${leanClasses.length} aulas de Lean Construction no GPO.`);

  for (const c of leanClasses) {
    const isClass1 = c.classNumber === 1 || c.date === '2026-08-29' || c.date === '2026-12-05';
    const targetDate = isClass1 ? '2026-12-05' : '2026-12-12';
    const targetClassNumber = isClass1 ? 1 : 2;
    const targetOrder = 18; // Reordenada para o final cronológico do curso

    if (c.date === targetDate && c.sessionGapWeeks === 1 && c.order === targetOrder) {
      console.log(`  [OK] Aula ${c.classNumber} já está em ${c.date} (Order ${c.order}, Gap ${c.sessionGapWeeks})`);
    } else {
      console.log(`  [MOVER] Aula ${c.classNumber}: de ${c.date} para ${targetDate} (Order ${targetOrder}, sessionGapWeeks: 1)`);
      if (!isDryRun) {
        await withRetry(async () => {
          await updateDoc(doc(db, 'classes', c.id), {
            date: targetDate,
            classNumber: targetClassNumber,
            order: targetOrder,
            sessionCount: 2,
            sessionGapWeeks: 1,
            teacherId: vera.id,
            teacherIds: [vera.id]
          });
        });
        console.log(`    -> Documento ${c.id} atualizado.`);
      }
    }
  }

  // 1.2 Criar 2 docs em classes para "Aula Extra — Inteligência Artificial Aplicada"
  // nas datas 2026-08-29 e 2026-09-12
  const existingExtraIa = gpoClasses.filter(c => 
    c.disciplineName.includes('Inteligência Artificial Aplicada')
  );

  const extraDates = [
    { date: '2026-08-29', classNumber: 1 },
    { date: '2026-09-12', classNumber: 2 }
  ];

  for (const item of extraDates) {
    const found = existingExtraIa.find(c => c.date === item.date || c.classNumber === item.classNumber);
    if (found) {
      console.log(`  [OK] Aula Extra IA Aplicada aula ${item.classNumber} (${item.date}) já existe: ID ${found.id}`);
    } else {
      console.log(`  [CRIAR] Aula Extra IA Aplicada aula ${item.classNumber} em ${item.date}`);
      const newClassData = {
        scheduleId: CLUSTER_A_ID,
        disciplineName: 'Aula Extra — Inteligência Artificial Aplicada',
        order: 13,
        date: item.date,
        classNumber: item.classNumber,
        isCommon: false,
        courseId: GPO_COURSE_ID,
        courseName: GPO_COURSE_NAME,
        teacherIds: [emanoel.id],
        teacherId: emanoel.id,
        sessionCount: 2,
        sessionGapWeeks: 2,
        observation: 'Aula extra realizada em turma única com o Cluster B (mesma data, mesmo professor). Não caracteriza conflito de agenda.'
      };

      if (!isDryRun) {
        const docRef = await withRetry(async () => {
          return await addDoc(collection(db, 'classes'), newClassData);
        });
        console.log(`    -> Criado doc com ID ${docRef.id}`);
      }
    }
  }

  // =====================================================================
  // BLOCO 2 — CLUSTER A: Cerimônia de Encerramento em 2026-12-19
  // =====================================================================
  console.log('\n--- BLOCO 2: CERIMÔNIA DE ENCERRAMENTO (CLUSTER A) ---');
  const qEncA = query(
    collection(db, 'classes'),
    where('scheduleId', '==', CLUSTER_A_ID),
    where('disciplineName', '==', 'Cerimônia de Encerramento')
  );
  const snapEncA = await getDocs(qEncA);

  if (!snapEncA.empty) {
    console.log(`  [OK] Cerimônia de Encerramento do Cluster A já existe: ID ${snapEncA.docs[0].id} em ${snapEncA.docs[0].data().date}`);
  } else {
    console.log('  [CRIAR] Cerimônia de Encerramento do Cluster A em 2026-12-19');
    const encAData = {
      scheduleId: CLUSTER_A_ID,
      disciplineName: 'Cerimônia de Encerramento',
      order: 99,
      date: '2026-12-19',
      classNumber: 1,
      isCommon: true,
      courseId: 'all',
      courseName: 'Fase Comum',
      teacherIds: [],
      teacherId: '',
      sessionCount: 1,
      sessionGapWeeks: null,
      observation: 'Evento conjunto dos três cursos do Cluster A.'
    };

    if (!isDryRun) {
      const ref = await withRetry(async () => {
        return await addDoc(collection(db, 'classes'), encAData);
      });
      console.log(`    -> Criado doc com ID ${ref.id}`);
    }
  }

  // =====================================================================
  // BLOCO 3 — CLUSTER B: Conflito Feriado 06/03/2027 & Cerimônia 27/03/2027
  // =====================================================================
  console.log('\n--- BLOCO 3: AJUSTE DE FERIADO E ENCERRAMENTO (CLUSTER B) ---');
  
  // 3.1 Deslocar de [2027-03-06, 2027-03-13] para [2027-03-13, 2027-03-20]
  const qB = query(collection(db, 'classes'), where('scheduleId', '==', CLUSTER_B_ID));
  const snapB = await getDocs(qB);
  const classesB = snapB.docs.map(d => ({ id: d.id, ...d.data() }));

  // Cursos específicos e suas disciplinas alvo
  const targetShifts = [
    {
      courseName: 'Acústica Arquitetônica e Iluminação',
      matchDiscipline: 'Acústica e Iluminação na Escala da Cidade'
    },
    {
      courseName: 'Neuroarquitetura',
      // Aceita tanto Tecnologias de Monitoramento... quanto Neurourbanismo... se houver
      matchDiscipline: 'Tecnologias de Monitoramento e Avaliação Pós-Ocupação para Resultados'
    },
    {
      courseName: 'Design de Interiores Contemporâneo',
      matchDiscipline: 'Design de Interiores para o Mercado de Luxo'
    }
  ];

  for (const target of targetShifts) {
    const courseClasses = classesB.filter(c => c.courseName === target.courseName);
    const matched = courseClasses.filter(c => 
      c.disciplineName.includes(target.matchDiscipline) ||
      (target.courseName === 'Neuroarquitetura' && c.order === 19)
    ).sort((a, b) => (a.classNumber || 0) - (b.classNumber || 0));

    console.log(`\nCurso: "${target.courseName}" - Disciplina alvo (${matched.length} aulas):`);

    for (const c of matched) {
      const isClass1 = c.classNumber === 1 || c.date === '2027-03-06' || c.date === '2027-03-13';
      const targetDate = (c.classNumber === 1 || (!c.classNumber && c.date === '2027-03-06')) ? '2027-03-13' : '2027-03-20';
      const targetClassNumber = (targetDate === '2027-03-13') ? 1 : 2;

      if (c.date === targetDate) {
        console.log(`  [OK] Aula ${c.classNumber} já está na data correta ${c.date}`);
      } else {
        console.log(`  [DESLOCAR] Aula ${c.classNumber}: de ${c.date} para ${targetDate} (mantendo professor e order ${c.order})`);
        if (!isDryRun) {
          await withRetry(async () => {
            await updateDoc(doc(db, 'classes', c.id), {
              date: targetDate,
              classNumber: targetClassNumber,
              sessionCount: 2,
              sessionGapWeeks: 1
            });
          });
          console.log(`    -> Documento ${c.id} atualizado.`);
        }
      }
    }
  }

  // 3.2 Criar Cerimônia de Encerramento do Cluster B em 2027-03-27
  console.log('\n--- CERIMÔNIA DE ENCERRAMENTO (CLUSTER B) ---');
  const qEncB = query(
    collection(db, 'classes'),
    where('scheduleId', '==', CLUSTER_B_ID),
    where('disciplineName', '==', 'Cerimônia de Encerramento')
  );
  const snapEncB = await getDocs(qEncB);

  if (!snapEncB.empty) {
    console.log(`  [OK] Cerimônia de Encerramento do Cluster B já existe: ID ${snapEncB.docs[0].id} em ${snapEncB.docs[0].data().date}`);
  } else {
    console.log('  [CRIAR] Cerimônia de Encerramento do Cluster B em 2027-03-27');
    const encBData = {
      scheduleId: CLUSTER_B_ID,
      disciplineName: 'Cerimônia de Encerramento',
      order: 99,
      date: '2027-03-27',
      classNumber: 1,
      isCommon: true,
      courseId: 'all',
      courseName: 'Fase Comum',
      teacherIds: [],
      teacherId: '',
      sessionCount: 1,
      sessionGapWeeks: null,
      observation: 'Evento conjunto dos três cursos do Cluster B.'
    };

    if (!isDryRun) {
      const ref = await withRetry(async () => {
        return await addDoc(collection(db, 'classes'), encBData);
      });
      console.log(`    -> Criado doc com ID ${ref.id}`);
    }
  }

  console.log('\n====================================================');
  console.log('  PROCESSAMENTO DOS BLOCOS 1, 2 E 3 FINALIZADO');
  console.log('====================================================');
}

main().then(() => {
  console.log('\nSucesso!');
  process.exit(0);
}).catch(err => {
  console.error('\nErro fatal:', err);
  process.exit(1);
});
