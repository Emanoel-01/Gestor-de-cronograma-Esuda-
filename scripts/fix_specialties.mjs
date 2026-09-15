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

async function main() {
  console.log('====================================================');
  console.log('  FIX SPECIALTIES - SINCRONIZAÇÃO COM CLASSES');
  console.log(`  MODO: ${isDryRun ? 'DRY_RUN (nenhuma alteração será gravada)' : 'APPLY (gravando alterações no Firestore)'}`);
  console.log('====================================================\n');

  if (!isDryRun) {
    console.log('Autenticando como admin de migração...');
    await signInWithEmailAndPassword(auth, 'migration_temp@esuda.edu.br', 'TempAdminPass123!');
    console.log('Autenticado com sucesso!\n');
  }

  // 1. Carregar todos os professores e todas as aulas
  const [teachersSnap, classesSnap] = await Promise.all([
    getDocs(collection(db, 'teachers')),
    getDocs(collection(db, 'classes'))
  ]);

  const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Professores carregados: ${teachers.length}`);
  console.log(`Aulas carregadas: ${classes.length}`);

  // 2. Mapear as especialidades reais alocadas em 'classes'
  // teacherId -> Map(key -> { courseId, disciplineName })
  const teacherAllocations = new Map();
  teachers.forEach(t => teacherAllocations.set(t.id, new Map()));

  for (const c of classes) {
    if (!c.disciplineName) continue;
    const disciplineName = c.disciplineName.trim();
    
    // Ignorar eventos institucionais sem professor
    if (disciplineName === 'Cerimônia de Encerramento') continue;

    const courseIdKey = (c.isCommon || c.courseId === 'all' || c.courseId === 'common') 
      ? 'common' 
      : c.courseId;

    if (!courseIdKey) continue;

    const teacherIds = Array.isArray(c.teacherIds) 
      ? c.teacherIds.filter(Boolean) 
      : (c.teacherId ? [c.teacherId] : []);

    const key = `${courseIdKey}::${disciplineName}`;

    for (const tid of teacherIds) {
      if (!teacherAllocations.has(tid)) {
        teacherAllocations.set(tid, new Map());
      }
      teacherAllocations.get(tid).set(key, {
        courseId: courseIdKey,
        disciplineName: disciplineName
      });
    }
  }

  // 3. Comparar e atualizar cada professor
  let teachersUpdatedCount = 0;
  let teachersUnchangedCount = 0;

  for (const t of teachers) {
    const allocatedMap = teacherAllocations.get(t.id) || new Map();
    const newSpecialties = Array.from(allocatedMap.values()).sort((a, b) => {
      const cComp = a.courseId.localeCompare(b.courseId);
      if (cComp !== 0) return cComp;
      return a.disciplineName.localeCompare(b.disciplineName);
    });

    const currentSpecialties = (Array.isArray(t.specialties) ? t.specialties : []).sort((a, b) => {
      const cComp = (a.courseId || '').localeCompare(b.courseId || '');
      if (cComp !== 0) return cComp;
      return (a.disciplineName || '').localeCompare(b.disciplineName || '');
    });

    // Comparar se houve mudança
    const areIdentical = (newSpecialties.length === currentSpecialties.length) &&
      newSpecialties.every((ns, idx) => {
        const cs = currentSpecialties[idx];
        return cs && cs.courseId === ns.courseId && cs.disciplineName === ns.disciplineName;
      });

    if (areIdentical) {
      teachersUnchangedCount++;
    } else {
      teachersUpdatedCount++;
      console.log(`\n[ALTERAÇÃO] Professor: [${t.id}] ${t.name}`);
      console.log(`  - Especialidades atuais (${currentSpecialties.length}):`, currentSpecialties.map(s => `${s.courseId}:${s.disciplineName}`).join(' | '));
      console.log(`  - Novas especialidades (${newSpecialties.length}):`, newSpecialties.map(s => `${s.courseId}:${s.disciplineName}`).join(' | '));

      if (!isDryRun) {
        await withRetry(async () => {
          await updateDoc(doc(db, 'teachers', t.id), {
            specialties: newSpecialties
          });
        });
        console.log(`  -> Documento do professor ${t.id} atualizado com sucesso.`);
      }
    }
  }

  console.log('\n====================================================');
  console.log('  RELATÓRIO DE SINCRONIZAÇÃO DE SPECIALTIES');
  console.log('====================================================');
  console.log(`- Professores com specialties inalteradas: ${teachersUnchangedCount}`);
  console.log(`- Professores com specialties atualizadas: ${teachersUpdatedCount}`);
}

main().then(() => {
  console.log('\nConcluído com sucesso.');
  process.exit(0);
}).catch(err => {
  console.error('\nErro fatal:', err);
  process.exit(1);
});
