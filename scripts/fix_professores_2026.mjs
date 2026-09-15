import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  memoryLocalCache,
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config
const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

// Normalization function (same as scripts/import_clusters.js)
const normalize = (s) => (s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

// Determine DRY_RUN mode
const isDryRun = !(process.env.DRY_RUN === 'false' || process.argv.includes('--apply'));

console.log('================================================================');
console.log(` FIX PROFESSORES 2026/2027 — MODO: ${isDryRun ? 'DRY-RUN (SIMULAÇÃO)' : 'APLICAR NO BANCO (LIVE)'}`);
console.log('================================================================\n');

// Teachers to register if missing
const teachersToEnsure = [
  {
    name: 'Wellington de Oliveira Martins',
    cpf: '585.162.634-87',
    email: 'contato@womengenharia.com.br',
    titulacao: 'Especialista'
  },
  {
    name: 'Rogerio Pirola Alves',
    cpf: '',
    email: '',
    titulacao: 'Especialista'
  },
  {
    name: 'Vilberty Vasconcelos',
    cpf: '020.703.294-70',
    email: 'vilberty@bbcep.eng.br',
    titulacao: 'Especialista'
  },
  {
    name: 'Pryscilla de Barros Gonçalves',
    cpf: '027.532.665-90',
    email: 'pryscillawc5@gmail.com',
    titulacao: 'Especialista'
  },
  {
    name: 'Edgar Natanael Gregório',
    cpf: '042.901.834-76',
    email: 'edgarnatanael28@hotmail.com',
    titulacao: 'Especialista'
  },
  {
    name: 'Amanda Vila Nova',
    cpf: '',
    email: '',
    titulacao: 'Especialista'
  }
];

// Aliases mapping (normalized key -> normalized target)
const teacherAliases = {
  'ivan carlos moura da cunha': 'ivan carlos cunha',
  'amanda vila nova': 'amanda nova',
  'hilma santos ferreira': 'hilma de oliveira santos ferreira',
  'vera lucia barbosa da silva': 'vera lucia barbosa silva',
  'rogerio pirola alves': 'rogerio pirola',
  'emmanoel neri': 'emmanoel roberto da silva neri',
  'conceicao de cassia pereira de albuquerque': 'cassia albuquerque'
};

// 16 Target Disciplines for Cluster A & B
const correctionsSpec = [
  // --- CLUSTER A ---
  // Engenharia e Gestão da Manutenção Predial na Construção 4.0
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Engenharia e Gestão da Manutenção Predial na Construção 4.0',
    disciplineName: 'Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção',
    expectedDates: ['2026-06-20', '2026-06-27'],
    expectedSessions: 2,
    teachers: ['Ivan Carlos Moura da Cunha']
  },
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Engenharia e Gestão da Manutenção Predial na Construção 4.0',
    disciplineName: 'Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial',
    expectedDates: ['2026-08-15', '2026-08-22'],
    expectedSessions: 2,
    teachers: ['Wellington de Oliveira Martins']
  },
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Engenharia e Gestão da Manutenção Predial na Construção 4.0',
    disciplineName: 'Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte',
    expectedDates: ['2026-09-19', '2026-09-26'],
    expectedSessions: 2,
    teachers: ['Rogerio Pirola Alves']
  },
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Engenharia e Gestão da Manutenção Predial na Construção 4.0',
    disciplineName: 'Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional',
    expectedDates: ['2026-10-24', '2026-11-07'],
    expectedSessions: 2,
    teachers: ['Ivan Carlos Moura da Cunha']
  },
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Engenharia e Gestão da Manutenção Predial na Construção 4.0',
    disciplineName: 'Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva',
    expectedDates: ['2026-11-14', '2026-11-28'],
    expectedSessions: 2,
    teachers: ['Vilberty Vasconcelos']
  },
  // Gestão de Projetos e Obras
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Gestão de Projetos e Obras',
    disciplineName: 'Técnicas de Orçamentos, Cobranças e Custos de Projetos',
    expectedDates: ['2026-07-18', '2026-07-25'],
    expectedSessions: 2,
    teachers: ['Priscila Raffi Rodrigues']
  },
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Gestão de Projetos e Obras',
    disciplineName: 'Técnicas de Orçamentos, Cobranças e Custos de Obras',
    expectedDates: ['2026-08-01', '2026-08-08'],
    expectedSessions: 2,
    teachers: ['Dieska Rayane da Silva Gomes']
  },
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Gestão de Projetos e Obras',
    disciplineName: 'Lean Construction, Last Planner System e Logística de Canteiro',
    expectedDates: ['2026-08-29', '2026-09-12'],
    expectedSessions: 2,
    teachers: ['Vera Lucia Barbosa da Silva']
  },
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Gestão de Projetos e Obras',
    disciplineName: 'Eficiência Energética e Sustentabilidade na Construção Civil',
    expectedDates: ['2026-10-03', '2026-10-17'],
    expectedSessions: 2,
    teachers: ['Pryscilla de Barros Gonçalves']
  },
  // Tecnologia BIM na Construção Civil
  {
    cluster: 'Cluster A',
    clusterMatcher: 'Cluster A',
    courseName: 'Tecnologia BIM na Construção Civil',
    disciplineName: 'Modelagem das Instalações',
    expectedDates: ['2026-08-29', '2026-09-12'],
    expectedSessions: 2,
    teachers: ['Emmanoel Neri', 'Tiago Lopes Silva']
  },

  // --- CLUSTER B ---
  // Neuroarquitetura
  {
    cluster: 'Cluster B',
    clusterMatcher: 'Cluster B',
    courseName: 'Neuroarquitetura',
    disciplineName: 'Neuroiluminação e Ritmos Biológicos',
    expectedDates: ['2026-11-14', '2026-11-28'],
    expectedSessions: 2,
    teachers: ['Hilma Santos Ferreira']
  },
  {
    cluster: 'Cluster B',
    clusterMatcher: 'Cluster B',
    courseName: 'Neuroarquitetura',
    disciplineName: 'Neuroarquitetura em Ambientes Residenciais e Comerciais',
    expectedDates: ['2026-12-05', '2026-12-12'],
    expectedSessions: 2,
    teachers: ['Amanda Vila Nova']
  },
  {
    cluster: 'Cluster B',
    clusterMatcher: 'Cluster B',
    courseName: 'Neuroarquitetura',
    disciplineName: 'Neuroarquitetura em Ambientes de Saúde (Healthcare) e Aprendizado',
    expectedDates: ['2027-01-30', '2027-02-13'],
    expectedSessions: 2,
    teachers: ['Hilma Santos Ferreira']
  },
  // Design de Interiores Contemporâneo
  {
    cluster: 'Cluster B',
    clusterMatcher: 'Cluster B',
    courseName: 'Design de Interiores Contemporâneo',
    disciplineName: 'Automação, Internet das Coisas e Eficiência dos Ambientes de Interiores',
    expectedDates: ['2026-09-19', '2026-09-26'],
    expectedSessions: 2,
    teachers: ['Edgar Natanael Gregório']
  },
  {
    cluster: 'Cluster B',
    clusterMatcher: 'Cluster B',
    courseName: 'Design de Interiores Contemporâneo',
    disciplineName: 'Iluminação de Interiores: Comerciais e Residenciais',
    expectedDates: ['2026-10-24', '2026-11-07'],
    expectedSessions: 2,
    teachers: ['Hilma Santos Ferreira']
  },
  {
    cluster: 'Cluster B',
    clusterMatcher: 'Cluster B',
    courseName: 'Design de Interiores Contemporâneo',
    disciplineName: 'Design Aplicado para Ambientes Residenciais',
    expectedDates: ['2027-01-30', '2027-02-13'],
    expectedSessions: 2,
    teachers: ['Amanda Vila Nova']
  }
];

async function main() {
  // 1. Fetch initial state
  console.log('Carregando dados do Firestore...');
  const [teachersSnap, schedulesSnap, classesSnap, holidaysSnap] = await Promise.all([
    getDocs(collection(db, 'teachers')),
    getDocs(collection(db, 'schedules')),
    getDocs(collection(db, 'classes')),
    getDocs(collection(db, 'holidays'))
  ]);

  const initialTeacherCount = teachersSnap.size;
  console.log(`- Professores atuais no banco: ${initialTeacherCount}`);
  console.log(`- Cronogramas (schedules) no banco: ${schedulesSnap.size}`);
  console.log(`- Classes (sessões de aula) no banco: ${classesSnap.size}`);
  console.log(`- Feriados cadastrados: ${holidaysSnap.size}\n`);

  const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const schedules = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const holidays = holidaysSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Identify Cluster A and Cluster B schedules
  const scheduleClusterA = schedules.find(s => normalize(s.className).includes('cluster a'));
  const scheduleClusterB = schedules.find(s => normalize(s.className).includes('cluster b'));

  if (!scheduleClusterA) {
    throw new Error('Cronograma Cluster A não encontrado no Firestore!');
  }
  if (!scheduleClusterB) {
    throw new Error('Cronograma Cluster B não encontrado no Firestore!');
  }

  console.log(`Cluster A Schedule: "${scheduleClusterA.className}" (ID: ${scheduleClusterA.id})`);
  console.log(`Cluster B Schedule: "${scheduleClusterB.className}" (ID: ${scheduleClusterB.id})\n`);

  const scheduleMap = {
    'Cluster A': scheduleClusterA.id,
    'Cluster B': scheduleClusterB.id
  };

  // 2. Resolve or Register Teachers
  console.log('--- 1. RESOLUÇÃO DE PROFESSORES ---');
  const resolvedTeachers = {};
  const reportReused = [];
  const reportCreated = [];

  // Helper to find teacher in array
  function findTeacher(nameToFind, currentList) {
    const norm = normalize(nameToFind);
    // Direct match
    let match = currentList.find(t => normalize(t.name) === norm);
    if (match) return match;

    // Check alias
    const aliasTarget = teacherAliases[norm];
    if (aliasTarget) {
      match = currentList.find(t => normalize(t.name) === aliasTarget);
      if (match) return match;
    }

    // Check reverse alias
    for (const [k, v] of Object.entries(teacherAliases)) {
      if (v === norm) {
        match = currentList.find(t => normalize(t.name) === k);
        if (match) return match;
      }
    }

    return null;
  }

  // Set of all unique teacher names referenced in corrections
  const allNeededTeachers = new Set();
  correctionsSpec.forEach(c => c.teachers.forEach(t => allNeededTeachers.add(t)));

  for (const teacherName of allNeededTeachers) {
    let match = findTeacher(teacherName, teachers);

    if (match) {
      resolvedTeachers[teacherName] = { id: match.id, name: match.name, isNew: false };
      reportReused.push({ requested: teacherName, foundName: match.name, id: match.id });
    } else {
      // Must ensure teacher exists
      const ensureData = teachersToEnsure.find(t => normalize(t.name) === normalize(teacherName)) || {
        name: teacherName,
        cpf: '',
        email: '',
        titulacao: 'Especialista'
      };

      if (!isDryRun) {
        const docRef = await addDoc(collection(db, 'teachers'), {
          name: ensureData.name,
          cpf: ensureData.cpf || '',
          email: ensureData.email || '',
          titulacao: ensureData.titulacao || 'Especialista',
          specialties: [],
          hasSubmitted: false
        });
        const newTeacherObj = { id: docRef.id, ...ensureData, specialties: [], hasSubmitted: false };
        teachers.push(newTeacherObj);
        resolvedTeachers[teacherName] = { id: docRef.id, name: ensureData.name, isNew: true };
        reportCreated.push({ name: ensureData.name, id: docRef.id });
      } else {
        const simulatedId = `dry_run_new_${normalize(teacherName).replace(/\s+/g, '_')}`;
        resolvedTeachers[teacherName] = { id: simulatedId, name: ensureData.name, isNew: true };
        reportCreated.push({ name: ensureData.name, id: simulatedId });
      }
    }
  }

  console.log(`Professores Reutilizados (nenhuma duplicata criada): ${reportReused.length}`);
  reportReused.forEach(r => {
    console.log(`  ✓ "${r.requested}" -> "${r.foundName}" [ID: ${r.id}]`);
  });

  console.log(`\nProfessores Novos Cadastrados: ${reportCreated.length}`);
  if (reportCreated.length === 0) {
    console.log('  (Nenhum novo professor precisou ser criado. Todos já existiam no banco!)');
  } else {
    reportCreated.forEach(c => {
      console.log(`  + [NOVO] "${c.name}" [ID: ${c.id}]`);
    });
  }

  // 3. Match and Update Classes
  console.log('\n--- 2. LOCALIZAÇÃO E ATUALIZAÇÃO DAS CLASSES ---');
  const updatesPlan = [];
  let totalDocsToUpdate = 0;

  for (let idx = 0; idx < correctionsSpec.length; idx++) {
    const spec = correctionsSpec[idx];
    const targetScheduleId = scheduleMap[spec.cluster];

    // Match classes in memory
    const matchedDocs = classes.filter(c => 
      c.scheduleId === targetScheduleId &&
      normalize(c.courseName) === normalize(spec.courseName) &&
      normalize(c.disciplineName) === normalize(spec.disciplineName)
    );

    // Sort matched by date
    matchedDocs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Validation: Check document count
    if (matchedDocs.length !== spec.expectedSessions) {
      throw new Error(
        `ABORTANDO: Disciplina "${spec.disciplineName}" do curso "${spec.courseName}" (${spec.cluster}) ` +
        `retornou ${matchedDocs.length} documentos, mas o esperado eram ${spec.expectedSessions} documentos!`
      );
    }

    // Validation: Check expected dates
    const matchedDates = matchedDocs.map(d => d.date);
    const expectedDatesSorted = [...spec.expectedDates].sort();
    const datesMatch = JSON.stringify(matchedDates) === JSON.stringify(expectedDatesSorted);
    if (!datesMatch) {
      throw new Error(
        `ABORTANDO: Datas não conferem para "${spec.disciplineName}". ` +
        `Encontrado: [${matchedDates.join(', ')}], Esperado: [${expectedDatesSorted.join(', ')}]`
      );
    }

    // Resolve teacher IDs
    const targetTeacherIds = spec.teachers.map(tName => {
      const res = resolvedTeachers[tName];
      if (!res || !res.id) {
        throw new Error(`Professor não resolvido: "${tName}"`);
      }
      return res.id;
    });
    const targetTeacherId = targetTeacherIds[0] || '';

    updatesPlan.push({
      itemNumber: idx + 1,
      cluster: spec.cluster,
      scheduleId: targetScheduleId,
      courseName: spec.courseName,
      disciplineName: spec.disciplineName,
      teachers: spec.teachers,
      teacherIds: targetTeacherIds,
      teacherId: targetTeacherId,
      matchedDocs: matchedDocs.map(d => ({
        id: d.id,
        date: d.date,
        prevTeacherIds: d.teacherIds || [],
        prevTeacherId: d.teacherId || ''
      }))
    });

    totalDocsToUpdate += matchedDocs.length;
  }

  console.log(`Validação concluída: Todas as 16 disciplinas foram localizadas com precisão.`);
  console.log(`Total de sessões de aula (docs em classes) a atualizar: ${totalDocsToUpdate}\n`);

  // Print plan per discipline
  updatesPlan.forEach(plan => {
    const profNames = plan.teachers.join(', ');
    const docSummary = plan.matchedDocs.map(d => `${d.date} (doc: ${d.id})`).join(' | ');
    console.log(`${plan.itemNumber.toString().padStart(2, ' ')}. [${plan.cluster}] ${plan.courseName}`);
    console.log(`    Disciplina: "${plan.disciplineName}"`);
    console.log(`    Aulas: ${docSummary}`);
    console.log(`    Novo(s) Professor(es): [${profNames}] (teacherIds: ${JSON.stringify(plan.teacherIds)})`);
    console.log(`    teacherId primário: "${plan.teacherId}"\n`);
  });

  // 4. Apply updates if not dry run
  if (!isDryRun) {
    console.log('--- 3. APLICANDO ATUALIZAÇÕES NO FIRESTORE ---');
    let updatedCount = 0;
    let skippedCount = 0;
    for (const plan of updatesPlan) {
      let planUpdated = 0;
      for (const mDoc of plan.matchedDocs) {
        const isAlreadyUpdated =
          JSON.stringify(mDoc.prevTeacherIds || []) === JSON.stringify(plan.teacherIds) &&
          (mDoc.prevTeacherId || '') === plan.teacherId;

        if (isAlreadyUpdated) {
          skippedCount++;
          continue;
        }

        // Safe retry loop with delay
        let success = false;
        let lastErr = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const docRef = doc(db, 'classes', mDoc.id);
            await updateDoc(docRef, {
              teacherIds: plan.teacherIds,
              teacherId: plan.teacherId
            });
            success = true;
            updatedCount++;
            planUpdated++;
            await new Promise(r => setTimeout(r, 200));
            break;
          } catch (e) {
            lastErr = e;
            await new Promise(r => setTimeout(r, 500 * attempt));
          }
        }
        if (!success) {
          throw new Error(`Falha ao atualizar doc ${mDoc.id} da disciplina "${plan.disciplineName}": ${lastErr?.message}`);
        }
      }
      if (planUpdated > 0) {
        console.log(`✓ Atualizado: "${plan.disciplineName}" (${planUpdated} sessões alteradas)`);
      } else {
        console.log(`- Já em conformidade: "${plan.disciplineName}" (0 alterações necessárias)`);
      }
    }
    console.log(`\nGravação concluída com sucesso! Total de ${updatedCount} classes atualizadas (${skippedCount} já estavam atualizadas).\n`);
  } else {
    console.log('--- 3. MODO DRY-RUN ---');
    console.log('Nenhum dado foi gravado no Firestore. Para gravar, execute com:');
    console.log('  node scripts/fix_professores_2026.mjs --apply\n');
  }

  // 5. Build updated classes array in memory for verification
  const simulatedClasses = classes.map(c => {
    for (const plan of updatesPlan) {
      const match = plan.matchedDocs.find(m => m.id === c.id);
      if (match) {
        return {
          ...c,
          teacherIds: plan.teacherIds,
          teacherId: plan.teacherId
        };
      }
    }
    return c;
  });

  // 6. Conflict Checking
  console.log('--- 4. CHECAGEM OBRIGATÓRIA DE CONFLITOS DE PROFESSORES ---');
  const teacherIdToName = {};
  teachers.forEach(t => {
    teacherIdToName[t.id] = t.name;
  });
  // Add any simulated
  Object.values(resolvedTeachers).forEach(rt => {
    teacherIdToName[rt.id] = rt.name;
  });

  const scheduleIdToName = {};
  schedules.forEach(s => {
    scheduleIdToName[s.id] = s.className;
  });

  const dateTeacherMap = {};
  simulatedClasses.forEach(c => {
    if (!c.date) return;
    const tIds = c.teacherIds || (c.teacherId ? [c.teacherId] : []);
    tIds.filter(Boolean).forEach(tid => {
      const key = `${c.date}_${tid}`;
      if (!dateTeacherMap[key]) dateTeacherMap[key] = [];
      dateTeacherMap[key].push(c);
    });
  });

  const remainingConflicts = [];
  for (const [key, classList] of Object.entries(dateTeacherMap)) {
    if (classList.length > 1) {
      // Check if they are distinct courses/schedules
      const first = classList[0];
      const isConflict = classList.some(c => 
        c.courseName !== first.courseName || c.disciplineName !== first.disciplineName || c.scheduleId !== first.scheduleId
      );
      if (isConflict) {
        const [date, tid] = key.split('_');
        remainingConflicts.push({
          date,
          teacherId: tid,
          teacherName: teacherIdToName[tid] || tid,
          classes: classList
        });
      }
    }
  }

  console.log(`Conflitos detectados na base completa: ${remainingConflicts.length}`);
  if (remainingConflicts.length === 0) {
    console.log('  Nenhum conflito de professor encontrado em cursos distintos na mesma data!');
  } else {
    // Filter conflicts directly involving Cluster A or Cluster B
    const clusterABConflicts = remainingConflicts.filter(conf =>
      conf.classes.some(c => c.scheduleId === scheduleClusterA.id || c.scheduleId === scheduleClusterB.id)
    );
    console.log(`  -> Conflitos envolvendo Cluster A ou B: ${clusterABConflicts.length}`);
    clusterABConflicts.forEach(conf => {
      console.log(`  ! Conflito em ${conf.date} para "${conf.teacherName}" (ID: ${conf.teacherId}):`);
      conf.classes.forEach(c => {
        const sName = scheduleIdToName[c.scheduleId] || c.scheduleId;
        console.log(`      • [${sName}] ${c.courseName}: "${c.disciplineName}"`);
      });
    });

    const otherConflicts = remainingConflicts.filter(conf =>
      !conf.classes.some(c => c.scheduleId === scheduleClusterA.id || c.scheduleId === scheduleClusterB.id)
    );
    if (otherConflicts.length > 0) {
      console.log(`\n  -> Conflitos pré-existentes em outras turmas (ex: Turma 2026.03 legada): ${otherConflicts.length}`);
      otherConflicts.slice(0, 5).forEach(conf => {
        console.log(`      • ${conf.date} | ${conf.teacherName} (${conf.classes.map(c => c.courseName).join(' vs ')})`);
      });
      if (otherConflicts.length > 5) {
        console.log(`      ... e mais ${otherConflicts.length - 5} em turmas anteriores.`);
      }
    }
  }

  // 7. Holiday Warning Check
  console.log('\n--- 5. SINALIZAÇÃO DE FERIADOS (COLEÇÃO `holidays`) ---');
  const holidayDateMap = {};
  holidays.forEach(h => {
    if (h.date) {
      holidayDateMap[h.date] = h.description || 'Feriado';
    }
  });

  const classesOnHolidays = simulatedClasses.filter(c => 
    holidayDateMap[c.date] &&
    (c.scheduleId === scheduleClusterA.id || c.scheduleId === scheduleClusterB.id)
  );

  console.log(`Total de aulas em feriados no Cluster A e Cluster B: ${classesOnHolidays.length}`);
  classesOnHolidays.forEach(c => {
    const sName = scheduleIdToName[c.scheduleId] || c.scheduleId;
    const profs = (c.teacherIds || []).map(id => teacherIdToName[id] || id).join(', ') || '(Sem professor)';
    console.log(`  ⚠ [FERIADO] Data: ${c.date} (${holidayDateMap[c.date]})`);
    console.log(`      Cronograma: ${sName}`);
    console.log(`      Curso: ${c.courseName}`);
    console.log(`      Disciplina: "${c.disciplineName}"`);
    console.log(`      Professor: ${profs}`);
  });

  // 8. Teacher count verification
  console.log('\n--- 6. CONTAGEM FINAL DE PROFESSORES ---');
  const finalTeachersSnap = await getDocs(collection(db, 'teachers'));
  console.log(`- Contagem inicial em 'teachers': ${initialTeacherCount}`);
  console.log(`- Contagem final em 'teachers': ${finalTeachersSnap.size}`);
  if (finalTeachersSnap.size === initialTeacherCount) {
    console.log(`- Confirmação: NENHUMA duplicata foi criada.`);
  } else {
    console.log(`- Novos professores adicionados: ${finalTeachersSnap.size - initialTeacherCount}`);
  }

  console.log('\n================================================================');
  console.log(' FIM DO PROCESSAMENTO');
  console.log('================================================================\n');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ ERRO NA EXECUÇÃO:', err);
    process.exit(1);
  });
