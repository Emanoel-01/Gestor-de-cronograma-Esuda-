import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, firebaseConfig.firestoreDatabaseId);

const isDryRun = !process.argv.includes('--apply');

function generateAccessCode(existingCodes = new Set()) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (existingCodes.has(code));
  existingCodes.add(code);
  return code;
}

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
  console.log('  FIX PROFESSORES 2026 (REAPLICAÇÃO & AUDITORIA)');
  console.log(`  MODO: ${isDryRun ? 'DRY_RUN (nenhuma alteração será gravada)' : 'APPLY (gravando alterações no Firestore)'}`);
  console.log('====================================================\n');

  // 1. Carregar professores
  const teachersSnap = await getDocs(collection(db, 'teachers'));
  const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total de professores carregados: ${teachers.length}`);

  const existingCodes = new Set(
    teachers.map(t => t.accessCode).filter(c => c && typeof c === 'string' && c.trim().length > 0)
  );

  // 2. Garantir accessCode para todos os professores
  console.log('\n--- VERIFICAÇÃO DE ACCESS CODES ---');
  let codesGeneratedCount = 0;
  const teacherCodesReport = [];

  for (const t of teachers) {
    let code = t.accessCode;
    if (!code || typeof code !== 'string' || code.trim() === '') {
      code = generateAccessCode(existingCodes);
      codesGeneratedCount++;
      console.log(`[GERADO] Novo accessCode para ${t.name}: ${code}`);
      if (!isDryRun) {
        await withRetry(async () => {
          await updateDoc(doc(db, 'teachers', t.id), { accessCode: code });
        });
      }
    }
    teacherCodesReport.push({ id: t.id, name: t.name, accessCode: code });
  }

  // Ordenar lista alfabeticamente para relatório
  teacherCodesReport.sort((a, b) => a.name.localeCompare(b.name));

  // 3. Mapear professores de interesse para as 16 aulas
  const findTeacher = (nameSnippet) => {
    return teachers.find(t => t.name.toLowerCase().includes(nameSnippet.toLowerCase()));
  };

  const cassia = findTeacher('Cassia') || findTeacher('Cássia');
  const emmanoel = findTeacher('Emmanoel') || findTeacher('Neri');
  const tiago = findTeacher('Tiago');
  const vera = findTeacher('Vera');
  const ivan = findTeacher('Ivan');
  const rogerio = findTeacher('Rogerio') || findTeacher('Rogério');

  console.log('\n--- MAPEAMENTO DE PROFESSORES CHAVE ---');
  console.log(`- Cassia Albuquerque: ${cassia ? cassia.id + ' (' + cassia.name + ')' : 'NÃO ENCONTRADO'}`);
  console.log(`- Emmanoel Neri: ${emmanoel ? emmanoel.id + ' (' + emmanoel.name + ')' : 'NÃO ENCONTRADO'}`);
  console.log(`- Tiago Lopes Silva: ${tiago ? tiago.id + ' (' + tiago.name + ')' : 'NÃO ENCONTRADO'}`);
  console.log(`- Vera Lúcia Barbosa Silva: ${vera ? vera.id + ' (' + vera.name + ')' : 'NÃO ENCONTRADO'}`);
  console.log(`- Ivan Carlos Cunha: ${ivan ? ivan.id + ' (' + ivan.name + ')' : 'NÃO ENCONTRADO'}`);
  console.log(`- Rogério Pirola: ${rogerio ? rogerio.id + ' (' + rogerio.name + ')' : 'NÃO ENCONTRADO'}`);

  // 4. Buscar aulas do Cluster A
  const schedAId = 'WadMvge0Xmc5BvVZf1nA';
  const qA = query(collection(db, 'classes'), where('scheduleId', '==', schedAId));
  const classesSnap = await getDocs(qA);
  const classesA = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`\nTotal de aulas encontradas no Cluster A: ${classesA.length}`);

  // Regras das 16 aulas:
  // Array de especificações esperadas
  const targetRules = [
    {
      discipline: 'Marketing Pessoal e Digital para Arquitetos e Engenheiros',
      expectedTeacherIds: [cassia?.id],
      expectedTeacherId: cassia?.id,
      expectedName: cassia?.name
    },
    {
      discipline: 'Modelagem Estrutural',
      expectedTeacherIds: [emmanoel?.id],
      expectedTeacherId: emmanoel?.id,
      expectedName: emmanoel?.name
    },
    {
      discipline: 'Modelagem das Instalações',
      expectedTeacherIds: [emmanoel?.id, tiago?.id],
      expectedTeacherId: emmanoel?.id,
      expectedName: `${emmanoel?.name} & ${tiago?.name}`
    },
    {
      discipline: 'Lean Construction, Last Planner System e Logística de Canteiro',
      expectedTeacherIds: [vera?.id],
      expectedTeacherId: vera?.id,
      expectedName: vera?.name
    },
    {
      discipline: 'Sistemas Informatizados de Gestão Integrada e BI (ERP, CDE e Power BI)',
      expectedTeacherIds: [vera?.id],
      expectedTeacherId: vera?.id,
      expectedName: vera?.name
    },
    {
      discipline: 'Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção',
      expectedTeacherIds: [ivan?.id],
      expectedTeacherId: ivan?.id,
      expectedName: ivan?.name
    },
    {
      discipline: 'Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte',
      expectedTeacherIds: [rogerio?.id],
      expectedTeacherId: rogerio?.id,
      expectedName: rogerio?.name
    },
    {
      discipline: 'Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional',
      expectedTeacherIds: [ivan?.id],
      expectedTeacherId: ivan?.id,
      expectedName: ivan?.name
    }
  ];

  console.log('\n--- VERIFICAÇÃO E CORREÇÃO DAS 16 AULAS DO CLUSTER A ---');
  let verifiedCount = 0;
  let correctedCount = 0;

  for (const rule of targetRules) {
    const matchedClasses = classesA.filter(c => c.disciplineName === rule.discipline);
    console.log(`\nDisciplina: "${rule.discipline}" (${matchedClasses.length} aulas encontradas):`);

    for (const c of matchedClasses) {
      const currentIds = Array.isArray(c.teacherIds) ? c.teacherIds : (c.teacherId ? [c.teacherId] : []);
      const matches = rule.expectedTeacherIds.length === currentIds.length &&
        rule.expectedTeacherIds.every(id => currentIds.includes(id)) &&
        c.teacherId === rule.expectedTeacherId;

      if (matches) {
        verifiedCount++;
        console.log(`  [OK] Aula em ${c.date} (Curso: ${c.courseName}) já está com ${rule.expectedName}`);
      } else {
        console.log(`  [DIVERGÊNCIA] Aula em ${c.date} (Curso: ${c.courseName})`);
        console.log(`    Atual: teacherId=${c.teacherId}, teacherIds=${JSON.stringify(c.teacherIds)}`);
        console.log(`    Esperado: teacherId=${rule.expectedTeacherId}, teacherIds=${JSON.stringify(rule.expectedTeacherIds)}`);

        correctedCount++;
        if (!isDryRun) {
          await withRetry(async () => {
            await updateDoc(doc(db, 'classes', c.id), {
              teacherId: rule.expectedTeacherId,
              teacherIds: rule.expectedTeacherIds
            });
          });
          console.log(`    -> [ATUALIZADO] Documento ${c.id} corrigido.`);
        }
      }
    }
  }

  console.log('\n====================================================');
  console.log('  RELATÓRIO GERAL');
  console.log('====================================================');
  console.log(`- AccessCodes gerados: ${codesGeneratedCount}`);
  console.log(`- Aulas verificadas OK: ${verifiedCount}`);
  console.log(`- Aulas corrigidas: ${correctedCount}`);

  console.log('\n====================================================');
  console.log('  LISTAGEM OFICIAL DE ACCESS CODES (COORDENAÇÃO)');
  console.log('====================================================');
  teacherCodesReport.forEach(t => {
    console.log(`${t.name.padEnd(55)} | ${t.accessCode}`);
  });
}

main().then(() => {
  console.log('\nConcluído com sucesso.');
  process.exit(0);
}).catch(err => {
  console.error('\nErro fatal:', err);
  process.exit(1);
});
