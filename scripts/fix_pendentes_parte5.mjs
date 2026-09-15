import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs, 
  doc, 
  updateDoc 
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

const CLUSTER_A = 'WadMvge0Xmc5BvVZf1nA';
const CLUSTER_B = 'kzQVwaCakQXzQIu30kMc';
const CLUSTER_C = 'UB7LySGzLc5GU0SFjU6Y';

const CORRECTIONS = [
  {
    clusterName: 'CLUSTER_A',
    scheduleId: CLUSTER_A,
    disciplineName: 'Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial',
    expectedDates: ['2026-08-15', '2026-08-22'],
    teacherIds: ['0N1QqslcHaYCw25Ube0k'],
    teacherName: 'Wellington de Oliveira Martins'
  },
  {
    clusterName: 'CLUSTER_A',
    scheduleId: CLUSTER_A,
    disciplineName: 'Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva',
    expectedDates: ['2026-11-14', '2026-11-28'],
    teacherIds: ['QlhmXPRHnCwbaOO5oleZ'],
    teacherName: 'Vilberty Vasconcelos'
  },
  {
    clusterName: 'CLUSTER_A',
    scheduleId: CLUSTER_A,
    disciplineName: 'Técnicas de Orçamentos, Cobranças e Custos de Projetos',
    expectedDates: ['2026-07-18', '2026-07-25'],
    teacherIds: ['Hyzisa1fRfO4mSFGUEXK'],
    teacherName: 'Priscila Raffi Rodrigues'
  },
  {
    clusterName: 'CLUSTER_A',
    scheduleId: CLUSTER_A,
    disciplineName: 'Técnicas de Orçamentos, Cobranças e Custos de Obras',
    expectedDates: ['2026-08-01', '2026-08-08'],
    teacherIds: ['mddA7g37FSDdItNej2Aa'],
    teacherName: 'Dieska Rayane da Silva Gomes'
  },
  {
    clusterName: 'CLUSTER_A',
    scheduleId: CLUSTER_A,
    disciplineName: 'Eficiência Energética e Sustentabilidade na Construção Civil',
    expectedDates: ['2026-10-03', '2026-10-17'],
    teacherIds: ['WzFQV1ExzDw8T9bjo3jn'],
    teacherName: 'Pryscilla de Barros Gonçalves'
  },
  {
    clusterName: 'CLUSTER_B',
    scheduleId: CLUSTER_B,
    disciplineName: 'Automação, Internet das Coisas e Eficiência dos Ambientes de Interiores',
    expectedDates: ['2026-09-19', '2026-09-26'],
    teacherIds: ['ZUr21ObW5h2amdc52FgY'],
    teacherName: 'Edgar Natanael Gregório'
  },
  {
    clusterName: 'CLUSTER_C',
    scheduleId: CLUSTER_C,
    disciplineName: 'Lean Construction, Last Planner System e Logística de Canteiro',
    expectedDates: ['2027-06-26', '2027-07-03'],
    teacherIds: ['ekLC5Cm1lri0ZB2AhFTA'],
    teacherName: 'Vera Lúcia Barbosa Silva'
  },
  {
    clusterName: 'CLUSTER_C',
    scheduleId: CLUSTER_C,
    disciplineName: 'Eficiência Energética e Sustentabilidade na Construção Civil',
    expectedDates: ['2027-07-31', '2027-08-07'],
    teacherIds: ['WzFQV1ExzDw8T9bjo3jn'],
    teacherName: 'Pryscilla de Barros Gonçalves'
  }
];

async function main() {
  console.log('====================================================');
  console.log('  FIX PENDENTES PARTE 5 - CORREÇÃO DE 8 DISCIPLINAS ');
  console.log(`  MODO: ${isDryRun ? 'DRY_RUN (nenhuma alteração será gravada)' : 'APPLY (gravando alterações no Firestore)'}`);
  console.log('====================================================\n');

  if (!isDryRun) {
    console.log('Autenticando como admin de migração...');
    await signInWithEmailAndPassword(auth, 'migration_temp@esuda.edu.br', 'TempAdminPass123!');
    console.log('Autenticado com sucesso!\n');
  }

  // 1. Carregar professores e aulas
  console.log('Carregando dados do Firestore...');
  const [teachersSnap, classesSnap] = await Promise.all([
    getDocs(collection(db, 'teachers')),
    getDocs(collection(db, 'classes'))
  ]);

  const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  console.log(`Professores carregados: ${teachers.length}`);
  console.log(`Aulas carregadas: ${classes.length}\n`);

  // 2. Validação prévia de todas as 6 correções
  console.log(`--- 1) VALIDANDO E APLICANDO AS ${CORRECTIONS.length} CORREÇÕES ---`);
  const plannedClassUpdates = [];

  for (let i = 0; i < CORRECTIONS.length; i++) {
    const corr = CORRECTIONS[i];
    const matched = classes.filter(c => 
      c.scheduleId === corr.scheduleId && c.disciplineName === corr.disciplineName
    ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    console.log(`\n[Correção ${i + 1}/${CORRECTIONS.length}] ${corr.clusterName} | "${corr.disciplineName}"`);
    console.log(`  Esperado: ${corr.teacherName} (ID: ${corr.teacherIds[0]})`);
    console.log(`  Sessões encontradas: ${matched.length}`);

    if (matched.length !== 2) {
      console.error(`ERRO CRÍTICO: Esperava exatamente 2 sessões, mas foram encontradas ${matched.length}! Abortando.`);
      process.exit(1);
    }

    for (const c of matched) {
      const currentIds = Array.isArray(c.teacherIds) ? c.teacherIds : (c.teacherId ? [c.teacherId] : []);
      const currentNames = currentIds.map(id => teacherMap.get(id)?.name || id).join(', ') || 'Nenhum';
      console.log(`  -> Aula ID: ${c.id} | Data: ${c.date} | Atual: ${currentNames} (${JSON.stringify(currentIds)})`);

      plannedClassUpdates.push({
        classId: c.id,
        date: c.date,
        disciplineName: c.disciplineName,
        teacherIds: corr.teacherIds,
        teacherId: corr.teacherIds[0]
      });
    }
  }

  // Executar atualização das classes
  console.log(`\nTotal de sessões a atualizar: ${plannedClassUpdates.length}`);
  if (!isDryRun) {
    for (const upd of plannedClassUpdates) {
      await withRetry(async () => {
        await updateDoc(doc(db, 'classes', upd.classId), {
          teacherIds: upd.teacherIds,
          teacherId: upd.teacherId
        });
      });
      console.log(`  [OK GRAVADO] Aula ${upd.classId} (${upd.date} - ${upd.disciplineName}) atualizada com sucesso.`);
    }
  } else {
    console.log('  [DRY_RUN] Nenhuma alteração gravada em classes.');
  }

  // 3. Higiene de Dados
  console.log('\n--- 2) HIGIENE DE DADOS ---');
  
  // a) Trim no nome dos professores
  console.log('\na) Verificando trim() no campo name dos professores:');
  let teachersTrimCount = 0;
  for (const t of teachers) {
    if (t.name && typeof t.name === 'string' && t.name !== t.name.trim()) {
      const trimmedName = t.name.trim();
      teachersTrimCount++;
      console.log(`  - [ID: ${t.id}] Nome com espaços: "${t.name}" -> "${trimmedName}"`);
      if (!isDryRun) {
        await withRetry(async () => {
          await updateDoc(doc(db, 'teachers', t.id), {
            name: trimmedName
          });
        });
        console.log(`    -> Professor ${t.id} atualizado.`);
      }
    }
  }
  console.log(`Total de professores com nome corrigido por trim(): ${teachersTrimCount}`);

  // b) Remover strings vazias ou nulas de teacherIds nas classes
  console.log('\nb) Verificando arrays teacherIds em todas as classes:');
  let classesCleanedCount = 0;
  for (const c of classes) {
    let needsUpdate = false;
    let cleanTeacherIds = [];
    
    if (Array.isArray(c.teacherIds)) {
      const hasInvalid = c.teacherIds.some(id => !id || typeof id !== 'string' || id.trim() === '' || id !== id.trim());
      if (hasInvalid) {
        needsUpdate = true;
        cleanTeacherIds = c.teacherIds
          .filter(id => id && typeof id === 'string' && id.trim() !== '')
          .map(id => id.trim());
      } else {
        cleanTeacherIds = c.teacherIds;
      }
    }

    let cleanTeacherId = c.teacherId;
    if (typeof c.teacherId === 'string') {
      if (c.teacherId.trim() === '') {
        cleanTeacherId = cleanTeacherIds.length > 0 ? cleanTeacherIds[0] : "";
        if (c.teacherId !== cleanTeacherId) needsUpdate = true;
      } else if (c.teacherId !== c.teacherId.trim()) {
        cleanTeacherId = c.teacherId.trim();
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      classesCleanedCount++;
      console.log(`  - Aula [${c.id}] (${c.disciplineName} - ${c.date}):`);
      console.log(`    Antes: teacherIds = ${JSON.stringify(c.teacherIds)} | teacherId = "${c.teacherId}"`);
      console.log(`    Depois: teacherIds = ${JSON.stringify(cleanTeacherIds)} | teacherId = "${cleanTeacherId}"`);

      if (!isDryRun) {
        await withRetry(async () => {
          await updateDoc(doc(db, 'classes', c.id), {
            teacherIds: cleanTeacherIds,
            teacherId: cleanTeacherIds.length > 0 ? cleanTeacherIds[0] : ""
          });
        });
        console.log(`    -> Aula ${c.id} gravada.`);
      }
    }
  }
  console.log(`Total de aulas com teacherIds limpos: ${classesCleanedCount}`);

  // 3. Listagem das aulas do Cluster C do curso "Engenharia Legal e Perícias: Avaliações e Desempenho"
  console.log('\n--- 3) AULAS DO CLUSTER C — ENGENHARIA LEGAL E PERÍCIAS: AVALIAÇÕES E DESEMPENHO ---');
  const freshClassesSnap = await getDocs(collection(db, 'classes'));
  const allCurrentClasses = freshClassesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const engLegalClasses = allCurrentClasses.filter(c => 
    c.scheduleId === CLUSTER_C && (
      c.courseName === 'Engenharia Legal e Perícias: Avaliações e Desempenho' ||
      (c.courseId && c.courseId === 'HVsnYWvNhKUk8afA8ROL')
    )
  ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  console.log(`Total de aulas encontradas: ${engLegalClasses.length}\n`);

  let countSemProfessor = 0;
  for (const c of engLegalClasses) {
    const tIds = (Array.isArray(c.teacherIds) ? c.teacherIds : [c.teacherId]).filter(id => id && typeof id === 'string' && id.trim() !== '');
    const tNames = tIds.map(id => teacherMap.get(id)?.name || id);
    const hasTeacher = tNames.length > 0;
    if (!hasTeacher) countSemProfessor++;
    const teacherStr = hasTeacher ? tNames.join(', ') : 'SEM PROFESSOR ⚠️';
    console.log(`  Data: ${c.date} | Disciplina: ${c.disciplineName} | Professor: ${teacherStr}`);
  }

  console.log(`\nResumo Engenharia Legal: ${engLegalClasses.length} aulas listadas, ${countSemProfessor} sem professor.`);

  console.log('\n====================================================');
  console.log('  EXECUÇÃO CONCLUÍDA');
  console.log('====================================================');
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\nErro fatal:', err);
  process.exit(1);
});
