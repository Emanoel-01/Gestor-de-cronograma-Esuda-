import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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

const TEACHER_IDS = {
  ivan_carlos: 'rrowThp4FhAMUJwqERVb',
  wellington: '0N1QqslcHaYCw25Ube0k',
  vilberty: 'QlhmXPRHnCwbaOO5oleZ',
  priscila_raffi: 'Hyzisa1fRfO4mSFGUEXK',
  dieska: 'mddA7g37FSDdItNej2Aa',
  emmanoel_neri: 'EV8q8aIJ7MVD1mFr2ssr',
  tiago_lopes: 'Zb0KPRPk2CyFOkqU3oBH',
  hilma: 'KDVbUo2I7q07jYolJezx',
  edgar_natanael: 'ZUr21ObW5h2amdc52FgY',
  amanda_nova: 'FBcOg9gvxUJ4wIRZ1yia',
  rogerio_pirola: 'sTERQqeasYGRvlvmjYsd',
  atividades_integrativas: 'qv3n5kHlhwVmExbwfChg'
};

const CORRECTIONS_C = [
  {
    num: 1,
    disciplineName: 'Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção',
    expectedDates: ['2027-04-10', '2027-04-17'],
    teacherIds: [TEACHER_IDS.ivan_carlos],
    teacherName: 'Ivan Carlos Cunha'
  },
  {
    num: 2,
    disciplineName: 'Técnicas de Orçamentos, Cobranças e Custos de Projetos',
    expectedDates: ['2027-05-15', '2027-05-22'],
    teacherIds: [TEACHER_IDS.priscila_raffi],
    teacherName: 'Priscila Raffi Rodrigues'
  },
  {
    num: 3,
    disciplineName: 'Iluminação de Interiores: Comerciais e Residenciais',
    expectedDates: ['2027-05-15', '2027-05-22'],
    teacherIds: [TEACHER_IDS.hilma],
    teacherName: 'Hilma Santos Ferreira'
  },
  {
    num: 4,
    disciplineName: 'Técnicas de Orçamentos, Cobranças e Custos de Obras',
    expectedDates: ['2027-05-29', '2027-06-05'],
    teacherIds: [TEACHER_IDS.dieska],
    teacherName: 'Dieska Rayane Gomes'
  },
  {
    num: 5,
    disciplineName: 'Neuroiluminação e Ritmos Biológicos',
    expectedDates: ['2027-05-29', '2027-06-05'],
    teacherIds: [TEACHER_IDS.hilma],
    teacherName: 'Hilma Santos Ferreira'
  },
  {
    num: 6,
    disciplineName: 'Automação, Internet das Coisas e Eficiência dos Ambientes de Interiores',
    expectedDates: ['2027-05-29', '2027-06-05'],
    teacherIds: [TEACHER_IDS.edgar_natanael],
    teacherName: 'Edgar Natanael Gregório'
  },
  {
    num: 7,
    disciplineName: 'Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial',
    expectedDates: ['2027-06-26', '2027-07-03'],
    teacherIds: [TEACHER_IDS.wellington],
    teacherName: 'Wellington Martins'
  },
  {
    num: 8,
    disciplineName: 'Modelagem das Instalações',
    expectedDates: ['2027-06-26', '2027-07-03'],
    teacherIds: [TEACHER_IDS.emmanoel_neri, TEACHER_IDS.tiago_lopes],
    teacherName: 'Emmanoel Neri, Tiago Lopes Silva'
  },
  {
    num: 9,
    disciplineName: 'Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva',
    expectedDates: ['2027-07-31', '2027-08-07'],
    teacherIds: [TEACHER_IDS.vilberty],
    teacherName: 'Vilberty Vasconcelos'
  },
  {
    num: 10,
    disciplineName: 'Neuroarquitetura em Ambientes de Saúde (Healthcare) e Aprendizado',
    expectedDates: ['2027-07-31', '2027-08-07'],
    teacherIds: [TEACHER_IDS.hilma],
    teacherName: 'Hilma Santos Ferreira'
  },
  {
    num: 11,
    disciplineName: 'Design Aplicado para Ambientes Residenciais',
    expectedDates: ['2027-07-31', '2027-08-07'],
    teacherIds: [TEACHER_IDS.amanda_nova],
    teacherName: 'Amanda Nova'
  },
  {
    num: 12,
    disciplineName: 'Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte',
    expectedDates: ['2027-08-14', '2027-08-21'],
    teacherIds: [TEACHER_IDS.rogerio_pirola],
    teacherName: 'Rogério Pirola'
  },
  {
    num: 13,
    disciplineName: 'Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional',
    expectedDates: ['2027-08-28', '2027-09-04'],
    teacherIds: [TEACHER_IDS.ivan_carlos],
    teacherName: 'Ivan Carlos Cunha'
  }
];

function normalize(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function main() {
  console.log('====================================================');
  console.log('  FIX CLUSTER C (UB7LySGzLc5GU0SFjU6Y)');
  console.log(`  MODO: ${isDryRun ? 'DRY_RUN (nenhuma alteração será gravada)' : 'APPLY (gravando alterações no Firestore)'}`);
  console.log('====================================================\n');

  if (!isDryRun) {
    console.log('Autenticando como admin de migração...');
    await signInWithEmailAndPassword(auth, 'migration_temp@esuda.edu.br', 'TempAdminPass123!');
    console.log('Autenticado com sucesso!\n');
  }

  // Carregar dados
  console.log('Carregando dados do Firestore...');
  const [teachersSnap, classesSnap] = await Promise.all([
    getDocs(collection(db, 'teachers')),
    getDocs(collection(db, 'classes'))
  ]);

  const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  let classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  console.log(`Professores carregados: ${teachers.length}`);
  console.log(`Aulas carregadas: ${classes.length}\n`);

  // ----------------------------------------------------
  // PARTE 1: PADRONIZAÇÃO (Cluster C)
  // ----------------------------------------------------
  console.log('--- 1) PADRONIZAÇÃO (CLUSTER C) ---');

  // a) Cerimônia de Encerramento (2027-09-11)
  console.log('\na) Cerimônia de Encerramento (2027-09-11): esvaziando teacherIds e teacherId');
  const encerramentoClasses = classes.filter(c => 
    c.scheduleId === CLUSTER_C &&
    c.date === '2027-09-11' &&
    normalize(c.disciplineName).includes('encerramento')
  );
  console.log(`   Sessões de encerramento encontradas: ${encerramentoClasses.length}`);

  for (const c of encerramentoClasses) {
    const currentProfs = (Array.isArray(c.teacherIds) ? c.teacherIds : [c.teacherId])
      .map(id => teacherMap.get(id)?.name || id).join(', ') || 'Nenhum';
    console.log(`   -> [${c.id}] ${c.courseName} | Professores atuais: ${currentProfs}`);
    if (!isDryRun) {
      await withRetry(async () => {
        await updateDoc(doc(db, 'classes', c.id), {
          teacherIds: [],
          teacherId: ''
        });
      });
      console.log(`      [OK GRAVADO] Aula ${c.id} esvaziada.`);
    } else {
      console.log(`      [DRY_RUN] Aula ${c.id} seria esvaziada.`);
    }
    c.teacherIds = [];
    c.teacherId = '';
  }

  // b) Atividades Integrativas + Professores Convidados (qv3n5kHlhwVmExbwfChg)
  console.log('\nb) Removendo professor "Atividades Integrativas + Professores Convidados" de teacherIds e adicionando à observation');
  const ativIntClasses = classes.filter(c => 
    c.scheduleId === CLUSTER_C && (
      (Array.isArray(c.teacherIds) && c.teacherIds.includes(TEACHER_IDS.atividades_integrativas)) ||
      c.teacherId === TEACHER_IDS.atividades_integrativas
    )
  );
  console.log(`   Aulas afetadas encontradas: ${ativIntClasses.length}`);

  for (const c of ativIntClasses) {
    const cleanTeacherIds = (Array.isArray(c.teacherIds) ? c.teacherIds : [c.teacherId])
      .filter(id => id && id !== TEACHER_IDS.atividades_integrativas);
    const cleanTeacherId = cleanTeacherIds.length > 0 ? cleanTeacherIds[0] : '';
    
    let newObs = c.observation || '';
    const obsText = 'Com atividades integrativas e professores convidados.';
    if (!normalize(newObs).includes('atividades integrativas')) {
      newObs = newObs.trim() ? `${newObs.trim()} ${obsText}` : obsText;
    }

    console.log(`   -> [${c.id}] Data: ${c.date} | ${c.courseName} | ${c.disciplineName}`);
    console.log(`      teacherIds antes: ${JSON.stringify(c.teacherIds)} -> depois: ${JSON.stringify(cleanTeacherIds)}`);
    console.log(`      observation nova: "${newObs}"`);

    if (!isDryRun) {
      await withRetry(async () => {
        await updateDoc(doc(db, 'classes', c.id), {
          teacherIds: cleanTeacherIds,
          teacherId: cleanTeacherId,
          observation: newObs
        });
      });
      console.log(`      [OK GRAVADO] Aula ${c.id} atualizada.`);
    } else {
      console.log(`      [DRY_RUN] Aula ${c.id} seria atualizada.`);
    }
    c.teacherIds = cleanTeacherIds;
    c.teacherId = cleanTeacherId;
    c.observation = newObs;
  }

  // ----------------------------------------------------
  // PARTE 2: AS 13 CORREÇÕES EM CLUSTER C
  // ----------------------------------------------------
  console.log('\n--- 2) AS 13 CORREÇÕES NO CLUSTER C ---');

  // Pré-validação: abortar se alguma disciplina tiver contagem diferente de 2
  for (const corr of CORRECTIONS_C) {
    const matched = classes.filter(c => 
      c.scheduleId === CLUSTER_C && c.disciplineName === corr.disciplineName
    );
    if (matched.length !== 2) {
      throw new Error(`ABORT: Disciplina "${corr.disciplineName}" possui ${matched.length} sessões (esperado exatamente 2).`);
    }
  }
  console.log('Pré-validação concluída: todas as 13 disciplinas possuem exatamente 2 sessões.\n');

  for (const corr of CORRECTIONS_C) {
    const matched = classes.filter(c => 
      c.scheduleId === CLUSTER_C && c.disciplineName === corr.disciplineName
    ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    console.log(`[Correção ${corr.num}/13] "${corr.disciplineName}"`);
    console.log(`  Esperado: ${corr.teacherName} (${JSON.stringify(corr.teacherIds)})`);
    console.log(`  Sessões encontradas: ${matched.length}`);

    for (const c of matched) {
      const currentNames = (Array.isArray(c.teacherIds) ? c.teacherIds : [c.teacherId])
        .filter(Boolean).map(id => teacherMap.get(id)?.name || id).join(', ') || 'Nenhum';
      console.log(`  -> Aula ID: ${c.id} | Data: ${c.date} | Atual: ${currentNames}`);

      if (!isDryRun) {
        await withRetry(async () => {
          await updateDoc(doc(db, 'classes', c.id), {
            teacherIds: corr.teacherIds,
            teacherId: corr.teacherIds[0]
          });
        });
        console.log(`     [OK GRAVADO] Aula ${c.id} atualizada com sucesso.`);
      } else {
        console.log(`     [DRY_RUN] Aula ${c.id} seria atualizada.`);
      }
      c.teacherIds = corr.teacherIds;
      c.teacherId = corr.teacherIds[0];
    }
    console.log('');
  }

  // Se aplicamos alterações, recarregar snapshots para validações finais fidedignas
  if (!isDryRun) {
    const freshClassesSnap = await getDocs(collection(db, 'classes'));
    classes = freshClassesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ----------------------------------------------------
  // PARTE 3: VALIDAÇÃO FINAL
  // ----------------------------------------------------
  console.log('====================================================');
  console.log('  VALIDAÇÃO FINAL');
  console.log('====================================================\n');

  // 1) VERIFICAÇÃO DAS 16 CORREÇÕES NOS TRÊS SCHEDULES (A, B e C)
  console.log('--- 1) VERIFICAÇÃO DAS 16 CORREÇÕES NOS TRÊS SCHEDULES ---');

  const RULES_16 = [
    // CLUSTER A
    { num: 1, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção', matchIds: ['rrowThp4FhAMUJwqERVb'], expectedName: 'Ivan Carlos Cunha' },
    { num: 2, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial', matchIds: ['0N1QqslcHaYCw25Ube0k'], expectedName: 'Wellington de Oliveira Martins' },
    { num: 3, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte', matchIds: ['sTERQqeasYGRvlvmjYsd'], expectedName: 'Rogério Pirola' },
    { num: 4, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional', matchIds: ['rrowThp4FhAMUJwqERVb'], expectedName: 'Ivan Carlos Cunha' },
    { num: 5, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva', matchIds: ['QlhmXPRHnCwbaOO5oleZ'], expectedName: 'Vilberty Vasconcelos' },
    { num: 6, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Técnicas de Orçamentos, Cobranças e Custos de Projetos', matchIds: ['Hyzisa1fRfO4mSFGUEXK'], expectedName: 'Priscila Raffi Rodrigues' },
    { num: 7, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Técnicas de Orçamentos, Cobranças e Custos de Obras', matchIds: ['mddA7g37FSDdItNej2Aa'], expectedName: 'Dieska Rayane da Silva Gomes' },
    { num: 8, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Lean Construction, Last Planner System e Logística de Canteiro', matchIds: ['ekLC5Cm1lri0ZB2AhFTA'], expectedName: 'Vera Lúcia Barbosa Silva' },
    { num: 9, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Eficiência Energética e Sustentabilidade na Construção Civil', matchIds: ['WzFQV1ExzDw8T9bjo3jn'], expectedName: 'Pryscilla de Barros Gonçalves' },
    { num: 10, cluster: 'CLUSTER_A', scheduleId: CLUSTER_A, disc: 'Modelagem das Instalações', matchIds: ['EV8q8aIJ7MVD1mFr2ssr', 'Zb0KPRPk2CyFOkqU3oBH'], expectedName: 'Emmanoel Roberto da Silva Neri, Tiago Lopes Silva' },
    // CLUSTER B
    { num: 11, cluster: 'CLUSTER_B', scheduleId: CLUSTER_B, disc: 'Neuroiluminação e Ritmos Biológicos', matchIds: ['KDVbUo2I7q07jYolJezx'], expectedName: 'Hilma de Oliveira Santos Ferreira' },
    { num: 12, cluster: 'CLUSTER_B', scheduleId: CLUSTER_B, disc: 'Neuroarquitetura em Ambientes Residenciais e Comerciais', matchIds: ['FBcOg9gvxUJ4wIRZ1yia'], expectedName: 'Amanda Nova' },
    { num: 13, cluster: 'CLUSTER_B', scheduleId: CLUSTER_B, disc: 'Neuroarquitetura em Ambientes de Saúde (Healthcare) e Aprendizado', matchIds: ['KDVbUo2I7q07jYolJezx'], expectedName: 'Hilma de Oliveira Santos Ferreira' },
    { num: 14, cluster: 'CLUSTER_B', scheduleId: CLUSTER_B, disc: 'Automação, Internet das Coisas e Eficiência dos Ambientes de Interiores', matchIds: ['ZUr21ObW5h2amdc52FgY'], expectedName: 'Edgar Natanael Gregório' },
    { num: 15, cluster: 'CLUSTER_B', scheduleId: CLUSTER_B, disc: 'Iluminação de Interiores: Comerciais e Residenciais', matchIds: ['KDVbUo2I7q07jYolJezx'], expectedName: 'Hilma de Oliveira Santos Ferreira' },
    { num: 16, cluster: 'CLUSTER_B', scheduleId: CLUSTER_B, disc: 'Design Aplicado para Ambientes Residenciais', matchIds: ['FBcOg9gvxUJ4wIRZ1yia'], expectedName: 'Amanda Nova' },
    // CLUSTER C (Todas as 16 disciplinas)
    { num: 1, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção', matchIds: ['rrowThp4FhAMUJwqERVb'], expectedName: 'Ivan Carlos Cunha' },
    { num: 2, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial', matchIds: ['0N1QqslcHaYCw25Ube0k'], expectedName: 'Wellington Martins' },
    { num: 3, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte', matchIds: ['sTERQqeasYGRvlvmjYsd'], expectedName: 'Rogério Pirola' },
    { num: 4, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional', matchIds: ['rrowThp4FhAMUJwqERVb'], expectedName: 'Ivan Carlos Cunha' },
    { num: 5, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva', matchIds: ['QlhmXPRHnCwbaOO5oleZ'], expectedName: 'Vilberty Vasconcelos' },
    { num: 6, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Técnicas de Orçamentos, Cobranças e Custos de Projetos', matchIds: ['Hyzisa1fRfO4mSFGUEXK'], expectedName: 'Priscila Raffi Rodrigues' },
    { num: 7, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Técnicas de Orçamentos, Cobranças e Custos de Obras', matchIds: ['mddA7g37FSDdItNej2Aa'], expectedName: 'Dieska Rayane Gomes' },
    { num: 8, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Lean Construction, Last Planner System e Logística de Canteiro', matchIds: ['ekLC5Cm1lri0ZB2AhFTA'], expectedName: 'Vera Lúcia Barbosa Silva' },
    { num: 9, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Eficiência Energética e Sustentabilidade na Construção Civil', matchIds: ['WzFQV1ExzDw8T9bjo3jn'], expectedName: 'Pryscilla de Barros Gonçalves' },
    { num: 10, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Modelagem das Instalações', matchIds: ['EV8q8aIJ7MVD1mFr2ssr', 'Zb0KPRPk2CyFOkqU3oBH'], expectedName: 'Emmanoel Neri, Tiago Lopes Silva' },
    { num: 11, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Neuroiluminação e Ritmos Biológicos', matchIds: ['KDVbUo2I7q07jYolJezx'], expectedName: 'Hilma Santos Ferreira' },
    { num: 12, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Neuroarquitetura em Ambientes Residenciais e Comerciais', matchIds: ['FBcOg9gvxUJ4wIRZ1yia'], expectedName: 'Amanda Nova' },
    { num: 13, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Neuroarquitetura em Ambientes de Saúde (Healthcare) e Aprendizado', matchIds: ['KDVbUo2I7q07jYolJezx'], expectedName: 'Hilma Santos Ferreira' },
    { num: 14, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Automação, Internet das Coisas e Eficiência dos Ambientes de Interiores', matchIds: ['ZUr21ObW5h2amdc52FgY'], expectedName: 'Edgar Natanael Gregório' },
    { num: 15, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Iluminação de Interiores: Comerciais e Residenciais', matchIds: ['KDVbUo2I7q07jYolJezx'], expectedName: 'Hilma Santos Ferreira' },
    { num: 16, cluster: 'CLUSTER_C', scheduleId: CLUSTER_C, disc: 'Design Aplicado para Ambientes Residenciais', matchIds: ['FBcOg9gvxUJ4wIRZ1yia'], expectedName: 'Amanda Nova' }
  ];

  for (const r of RULES_16) {
    const matched = classes.filter(c => 
      c.scheduleId === r.scheduleId && c.disciplineName === r.disc
    ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (matched.length === 0) {
      console.log(`[${r.num}] ${r.cluster} | ${r.disc} | - | NENHUMA SESSÃO ENCONTRADA | DIVERGENTE`);
      continue;
    }

    const dates = matched.map(c => c.date);
    const teacherIdsInSessions = [...new Set(matched.flatMap(c => 
      (Array.isArray(c.teacherIds) ? c.teacherIds : [c.teacherId]).filter(Boolean)
    ))];

    const teacherNames = teacherIdsInSessions.map(id => teacherMap.get(id)?.name || id);

    // Comparação de IDs exatos
    const idsMatch = r.matchIds.length === teacherIdsInSessions.length &&
      r.matchIds.every(id => teacherIdsInSessions.includes(id));

    const status = idsMatch ? 'OK' : 'DIVERGENTE';
    console.log(`[${r.num}] ${r.cluster} | ${r.disc} | ${dates.join(', ')} | ${teacherNames.join(', ') || 'Nenhum'} | ${status}`);
  }

  // 2) CHECAGEM DE CONFLITO DE PROFESSOR (A, B e C juntos)
  console.log('\n--- 2) CHECAGEM DE CONFLITO DE PROFESSOR (SCHEDULES A, B e C) ---');
  console.log('(Mesmo professor em aulas de mesma data em cursos diferentes, ignorando observation com "turma única")\n');

  const inScopeClasses = classes.filter(c => 
    [CLUSTER_A, CLUSTER_B, CLUSTER_C].includes(c.scheduleId) && c.date
  );

  const byDateAndTeacher = new Map();
  for (const cl of inScopeClasses) {
    const tIds = (Array.isArray(cl.teacherIds) ? cl.teacherIds : [cl.teacherId]).filter(Boolean);
    for (const tid of tIds) {
      const key = `${cl.date}::${tid}`;
      if (!byDateAndTeacher.has(key)) byDateAndTeacher.set(key, []);
      byDateAndTeacher.get(key).push(cl);
    }
  }

  let totalConflicts = 0;
  const emanoelConflicts = [];
  const allefConflicts = [];

  for (const [key, cls] of byDateAndTeacher.entries()) {
    const [date, tid] = key.split('::');
    // Ignorar observation com 'turma única'
    const nonTurmaUnica = cls.filter(cl => {
      const obs = normalize(cl.observation || '');
      return !obs.includes('turma unica');
    });

    if (nonTurmaUnica.length > 1) {
      const courseSet = new Set(nonTurmaUnica.map(c => c.courseName || c.courseId));
      if (courseSet.size > 1) {
        totalConflicts++;
        const tName = teacherMap.get(tid)?.name || tid;
        console.log(`[CONFLITO] Data: ${date} | Professor: ${tName} (${tid})`);
        for (const cl of nonTurmaUnica) {
          const schedLabel = cl.scheduleId === CLUSTER_A ? 'CLUSTER_A' : cl.scheduleId === CLUSTER_B ? 'CLUSTER_B' : 'CLUSTER_C';
          console.log(`   -> [${schedLabel}] Curso: ${cl.courseName} | Disciplina: ${cl.disciplineName} | Obs: "${cl.observation || '-'}"`);
        }

        if (tid === '7YGlEtfZttvH6BdJqjs4' || normalize(tName).includes('emanoel silva de amorim')) {
          emanoelConflicts.push({ date, classes: nonTurmaUnica });
        }
        if (tid === '5eqdmhfMdZrMknAFtk2y' || normalize(tName).includes('jose allef')) {
          allefConflicts.push({ date, classes: nonTurmaUnica });
        }
      }
    }
  }

  if (totalConflicts === 0) {
    console.log('Nenhum conflito de professor detectado!');
  } else {
    console.log(`\nTotal de conflitos detectados: ${totalConflicts}`);
  }

  console.log('\n--- CONFIRMAÇÃO ESPECÍFICA (Emanoel Silva de Amorim & Jose Allef Ferreira Dantas) ---');
  console.log(`- Emanoel Silva de Amorim (7YGlEtfZttvH6BdJqjs4): ${emanoelConflicts.length === 0 ? 'SEM DUPLA ALOCAÇÃO (0 conflitos)' : `${emanoelConflicts.length} conflito(s) restante(s)`}`);
  if (emanoelConflicts.length > 0) {
    for (const c of emanoelConflicts) {
      console.log(`  * ${c.date}: ${c.classes.map(cl => `${cl.courseName} (${cl.disciplineName})`).join(' vs ')}`);
    }
  }

  console.log(`- Jose Allef Ferreira Dantas (5eqdmhfMdZrMknAFtk2y): ${allefConflicts.length === 0 ? 'SEM DUPLA ALOCAÇÃO (0 conflitos)' : `${allefConflicts.length} conflito(s) restante(s)`}`);
  if (allefConflicts.length > 0) {
    for (const c of allefConflicts) {
      console.log(`  * ${c.date}: ${c.classes.map(cl => `${cl.courseName} (${cl.disciplineName})`).join(' vs ')}`);
    }
  }

  // 3) LISTAR AULAS COM TEACHERIDS VAZIO, NULO OU CONTENDO STRING VAZIA
  console.log('\n--- 3) AULAS COM TEACHERIDS VAZIO, NULO OU CONTENDO STRING VAZIA (A, B e C) ---');
  const emptyTeacherClasses = inScopeClasses.filter(c => {
    if (!c.teacherIds || !Array.isArray(c.teacherIds) || c.teacherIds.length === 0) return true;
    return c.teacherIds.some(id => !id || typeof id !== 'string' || id.trim() === '');
  }).sort((a, b) => {
    const sCmp = (a.scheduleId || '').localeCompare(b.scheduleId || '');
    if (sCmp !== 0) return sCmp;
    return (a.date || '').localeCompare(b.date || '');
  });

  console.log(`Total de aulas sem professor / teacherIds vazio: ${emptyTeacherClasses.length}\n`);
  for (const c of emptyTeacherClasses) {
    const schedLabel = c.scheduleId === CLUSTER_A ? 'CLUSTER_A' : c.scheduleId === CLUSTER_B ? 'CLUSTER_B' : 'CLUSTER_C';
    console.log(`  [${schedLabel}] Data: ${c.date} | Curso: ${c.courseName} | Disciplina: ${c.disciplineName} | teacherIds: ${JSON.stringify(c.teacherIds)} | teacherId: "${c.teacherId}"`);
  }

  console.log('\n====================================================');
  console.log('  EXECUÇÃO CONCLUÍDA COM SUCESSO');
  console.log('====================================================');
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\nErro fatal:', err);
  process.exit(1);
});
