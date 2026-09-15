import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs 
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

const normalize = (s) => (s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

async function runAudit() {
  const [schedulesSnap, classesSnap, teachersSnap] = await Promise.all([
    getDocs(collection(db, 'schedules')),
    getDocs(collection(db, 'classes')),
    getDocs(collection(db, 'teachers'))
  ]);

  const schedules = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const teacherMap = new Map();
  teachers.forEach(t => {
    teacherMap.set(t.id, t);
  });

  console.log('=== RELATÓRIO DE AUDITORIA DO ESTADO REAL ===\n');

  // 1) SCHEDULES
  console.log('--- 1) SCHEDULES ---');
  const classCountBySched = new Map();
  classes.forEach(c => {
    const sId = c.scheduleId || 'SEM_SCHEDULE_ID';
    classCountBySched.set(sId, (classCountBySched.get(sId) || 0) + 1);
  });

  const clusterMap = new Map();

  schedules.forEach(s => {
    const count = classCountBySched.get(s.id) || 0;
    const coursesStr = Array.isArray(s.courseNames) ? s.courseNames.join(', ') : (s.courseNames || 'N/A');
    console.log(`ID: ${s.id} | className: "${s.className || ''}" | startDate: ${s.startDate || 'N/A'} | status: ${s.status || 'N/A'} | classesCount: ${count} | courses: [${coursesStr}]`);
    
    // Agrupamento para sinalização de duplicatas de cluster
    const key = (s.className || '').toLowerCase().trim();
    if (!clusterMap.has(key)) clusterMap.set(key, []);
    clusterMap.get(key).push(s);
  });

  console.log('\nSinalização de clusters:');
  let duplicateClusters = false;
  for (const [name, list] of clusterMap.entries()) {
    if (list.length > 1) {
      duplicateClusters = true;
      console.log(`ATENÇÃO: Mais de um schedule encontrado para "${name}": ${list.map(s => s.id).join(', ')}`);
    }
  }
  if (!duplicateClusters) {
    console.log('Nenhum cluster com schedules duplicados pelo campo className.');
  }

  // 2) DUPLICATAS TEACHERS
  console.log('\n--- 2) PROFESSORES E DUPLICATAS ---');
  const teachersSorted = [...teachers].sort((a, b) => {
    return normalize(a.name).localeCompare(normalize(b.name));
  });

  const normCount = new Map();
  teachers.forEach(t => {
    const n = normalize(t.name);
    normCount.set(n, (normCount.get(n) || 0) + 1);
  });

  teachersSorted.forEach(t => {
    const n = normalize(t.name);
    const isDup = (normCount.get(n) || 0) > 1;
    console.log(`${t.id} | ${t.name} (norm: "${n}")${isDup ? ' [DUPLICATA DETECTADA]' : ''}`);
  });

  const duplicateNames = Array.from(normCount.entries()).filter(([_, count]) => count > 1);
  console.log(`Total de professores: ${teachers.length}`);
  if (duplicateNames.length > 0) {
    console.log(`Total de nomes normalizados repetidos: ${duplicateNames.length}`);
    duplicateNames.forEach(([name, c]) => console.log(`- "${name}": ${c} ocorrências`));
  } else {
    console.log('Total de nomes normalizados repetidos: 0');
  }

  // 3) GPO REAL
  console.log('\n--- 3) GESTÃO DE PROJETOS E OBRAS (TODAS AS AULAS DE TODOS OS SCHEDULES) ---');
  const gpoClasses = classes.filter(c => {
    const cn = (c.courseName || '').trim();
    return cn === 'Gestão de Projetos e Obras';
  }).sort((a, b) => {
    const sCmp = (a.scheduleId || '').localeCompare(b.scheduleId || '');
    if (sCmp !== 0) return sCmp;
    return (a.date || '').localeCompare(b.date || '');
  });

  console.log(`Total de aulas encontradas com courseName = "Gestão de Projetos e Obras": ${gpoClasses.length}`);
  gpoClasses.forEach(c => {
    const tIds = Array.isArray(c.teacherIds) ? c.teacherIds : (c.teacherId ? [c.teacherId] : []);
    const teacherNames = tIds.map(tid => teacherMap.get(tid)?.name || `ID:${tid}`).join(', ') || 'Sem professor';
    console.log(`scheduleId: ${c.scheduleId} | date: ${c.date} | disciplineName: "${c.disciplineName}" | professores: ${teacherNames}`);
  });

  // 4) AS 16 CORREÇÕES
  console.log('\n--- 4) VERIFICAÇÃO DAS 16 CORREÇÕES (TODOS OS SCHEDULES) ---');

  const rulesToCheck = [
    // CLUSTER A
    {
      cluster: 'CLUSTER A',
      num: 1,
      discSearch: 'Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção',
      expected: 'Ivan Carlos Moura da Cunha',
      matchExpected: (names) => names.some(n => normalize(n).includes('ivan carlos'))
    },
    {
      cluster: 'CLUSTER A',
      num: 2,
      discSearch: 'Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial',
      expected: 'Wellington de Oliveira Martins',
      matchExpected: (names) => names.some(n => normalize(n).includes('wellington'))
    },
    {
      cluster: 'CLUSTER A',
      num: 3,
      discSearch: 'Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte',
      expected: 'Rogerio Pirola Alves',
      matchExpected: (names) => names.some(n => normalize(n).includes('rogerio') || normalize(n).includes('pirola'))
    },
    {
      cluster: 'CLUSTER A',
      num: 4,
      discSearch: 'Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional',
      expected: 'Ivan Carlos Moura da Cunha',
      matchExpected: (names) => names.some(n => normalize(n).includes('ivan carlos'))
    },
    {
      cluster: 'CLUSTER A',
      num: 5,
      discSearch: 'Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva',
      expected: 'Vilberty Vasconcelos',
      matchExpected: (names) => names.some(n => normalize(n).includes('vilberty'))
    },
    {
      cluster: 'CLUSTER A',
      num: 6,
      discSearch: 'Técnicas de Orçamentos, Cobranças e Custos de Projetos',
      expected: 'Priscila Raffi Rodrigues',
      matchExpected: (names) => names.some(n => normalize(n).includes('priscila'))
    },
    {
      cluster: 'CLUSTER A',
      num: 7,
      discSearch: 'Técnicas de Orçamentos, Cobranças e Custos de Obras',
      expected: 'Dieska Rayane da Silva Gomes',
      matchExpected: (names) => names.some(n => normalize(n).includes('dieska'))
    },
    {
      cluster: 'CLUSTER A',
      num: 8,
      discSearch: 'Lean Construction, Last Planner System e Logística de Canteiro',
      expected: 'Vera Lucia Barbosa da Silva',
      matchExpected: (names) => names.some(n => normalize(n).includes('vera lucia') || normalize(n).includes('vera'))
    },
    {
      cluster: 'CLUSTER A',
      num: 9,
      discSearch: 'Eficiência Energética e Sustentabilidade na Construção Civil',
      expected: 'Pryscilla de Barros Gonçalves',
      matchExpected: (names) => names.some(n => normalize(n).includes('pryscilla'))
    },
    {
      cluster: 'CLUSTER A',
      num: 10,
      discSearch: 'Modelagem das Instalações',
      expected: 'Emmanoel Neri E Tiago Lopes Silva (DOIS)',
      matchExpected: (names, ids) => {
        const hasNeri = names.some(n => normalize(n).includes('emmanoel') || normalize(n).includes('neri'));
        const hasTiago = names.some(n => normalize(n).includes('tiago'));
        return (ids.length === 2 && hasNeri && hasTiago);
      }
    },
    // CLUSTER B
    {
      cluster: 'CLUSTER B',
      num: 11,
      discSearch: 'Neuroiluminação e Ritmos Biológicos',
      expected: 'Hilma Santos Ferreira',
      matchExpected: (names) => names.some(n => normalize(n).includes('hilma'))
    },
    {
      cluster: 'CLUSTER B',
      num: 12,
      discSearch: 'Neuroarquitetura em Ambientes Residenciais e Comerciais',
      expected: 'Amanda Vila Nova',
      matchExpected: (names) => names.some(n => normalize(n).includes('amanda'))
    },
    {
      cluster: 'CLUSTER B',
      num: 13,
      discSearch: 'Neuroarquitetura em Ambientes de Saúde (Healthcare) e Aprendizado',
      expected: 'Hilma Santos Ferreira',
      matchExpected: (names) => names.some(n => normalize(n).includes('hilma'))
    },
    {
      cluster: 'CLUSTER B',
      num: 14,
      discSearch: 'Automação, Internet das Coisas e Eficiência dos Ambientes de Interiores',
      expected: 'Edgar Natanael Gregório',
      matchExpected: (names) => names.some(n => normalize(n).includes('edgar'))
    },
    {
      cluster: 'CLUSTER B',
      num: 15,
      discSearch: 'Iluminação de Interiores: Comerciais e Residenciais',
      expected: 'Hilma Santos Ferreira',
      matchExpected: (names) => names.some(n => normalize(n).includes('hilma'))
    },
    {
      cluster: 'CLUSTER B',
      num: 16,
      discSearch: 'Design Aplicado para Ambientes Residenciais',
      expected: 'Amanda Vila Nova',
      matchExpected: (names) => names.some(n => normalize(n).includes('amanda'))
    }
  ];

  rulesToCheck.forEach(rule => {
    // Buscar em todas as classes onde disciplineName bate
    const targetNorm = normalize(rule.discSearch);
    const matched = classes.filter(c => {
      const dNorm = normalize(c.disciplineName);
      return dNorm === targetNorm || dNorm.includes(targetNorm);
    });

    if (matched.length === 0) {
      console.log(`[${rule.cluster} #${rule.num}] ${rule.discSearch} | NENHUMA AULA ENCONTRADA | datas: - | professores atuais: - | esperado: ${rule.expected} | DIVERGENTE`);
      return;
    }

    // Agrupar por curso/scheduleId para visualização precisa
    const groups = new Map();
    matched.forEach(c => {
      const gKey = `${c.scheduleId}__${c.courseName || c.courseId}`;
      if (!groups.has(gKey)) groups.set(gKey, []);
      groups.get(gKey).push(c);
    });

    for (const [_, list] of groups.entries()) {
      const cSample = list[0];
      const dates = list.map(c => c.date).sort().join(', ');
      // Coletar professores únicos desse grupo de aulas
      const allTeacherNamesSet = new Set();
      const allTeacherIds = [];
      list.forEach(c => {
        const tIds = Array.isArray(c.teacherIds) ? c.teacherIds : (c.teacherId ? [c.teacherId] : []);
        tIds.forEach(id => {
          allTeacherIds.push(id);
          const name = teacherMap.get(id)?.name || `ID:${id}`;
          allTeacherNamesSet.add(name);
        });
      });

      const currentTeacherNames = Array.from(allTeacherNamesSet);
      const currentTeachersStr = currentTeacherNames.join(', ') || 'Sem professor';
      
      // Avaliar OK ou DIVERGENTE para cada aula do grupo
      const isOk = list.every(c => {
        const tIds = Array.isArray(c.teacherIds) ? c.teacherIds : (c.teacherId ? [c.teacherId] : []);
        const tNames = tIds.map(id => teacherMap.get(id)?.name || `ID:${id}`);
        return rule.matchExpected(tNames, tIds);
      });

      const status = isOk ? 'OK' : 'DIVERGENTE';
      console.log(`[${rule.cluster} #${rule.num}] ${cSample.disciplineName} | ${cSample.courseName || cSample.courseId} (sched: ${cSample.scheduleId}) | datas: [${dates}] | professores atuais: ${currentTeachersStr} | esperado: ${rule.expected} | ${status}`);
    }
  });

  // 5) BUSCA POR TERMOS ESPECÍFICOS
  console.log('\n--- 5) BUSCA POR TERMOS ESPECÍFICOS ---');
  const terms = ['Martiniano', 'Prevenção de Riscos', 'Conforto Ambiental', 'Resolução de Disputas'];

  terms.forEach(term => {
    console.log(`\nBuscando por: "${term}"`);
    const termNorm = normalize(term);

    // Em teachers
    const teachersMatched = teachers.filter(t => normalize(t.name).includes(termNorm));
    if (teachersMatched.length > 0) {
      console.log(`  Em teachers (${teachersMatched.length} encontrado(s)):`);
      teachersMatched.forEach(t => console.log(`    - ID: ${t.id} | Nome: "${t.name}" | Email: "${t.email || ''}"`));
    } else {
      console.log('  Em teachers: NÃO ENCONTRADO');
    }

    // Em classes
    const classesMatched = classes.filter(c => {
      const dName = normalize(c.disciplineName);
      const obs = normalize(c.observation);
      return dName.includes(termNorm) || obs.includes(termNorm);
    });

    if (classesMatched.length > 0) {
      console.log(`  Em classes (${classesMatched.length} encontrada(s)):`);
      classesMatched.forEach(c => {
        const tIds = Array.isArray(c.teacherIds) ? c.teacherIds : (c.teacherId ? [c.teacherId] : []);
        const profs = tIds.map(id => teacherMap.get(id)?.name || `ID:${id}`).join(', ') || 'Sem professor';
        console.log(`    - scheduleId: ${c.scheduleId} | date: ${c.date} | courseName: "${c.courseName}" | disciplineName: "${c.disciplineName}" | professores: ${profs}`);
      });
    } else {
      console.log('  Em classes: NÃO ENCONTRADO');
    }
  });

  // 6) PROFESSORES SEM CAMPO EMAIL OU EMAIL VAZIO
  console.log('\n--- 6) PROFESSORES SEM EMAIL OU COM EMAIL VAZIO ---');
  const teachersWithoutEmail = teachers.filter(t => !t.email || typeof t.email !== 'string' || t.email.trim() === '');
  console.log(`Total de professores sem email ou com email vazio: ${teachersWithoutEmail.length}`);
  teachersWithoutEmail.forEach(t => {
    console.log(`Nome: "${t.name}" | ID: ${t.id}`);
  });

  console.log('\n=== FIM DO RELATÓRIO ===');
}

runAudit().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
