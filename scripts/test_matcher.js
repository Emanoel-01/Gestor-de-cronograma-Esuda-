const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs 
} = require('firebase/firestore');
const config = require(path.join(__dirname, '../firebase-applet-config.json'));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

function normalize(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\(\)\-\:\,\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES = {
  'design tecnico para ambientes residenciais': 'design aplicado para ambientes residenciais'
};

function matchDiscipline(targetName, candidateList) {
  const normTarget = normalize(targetName);
  const aliasTarget = ALIASES[normTarget] || normTarget;

  // 1. Exact match
  for (let i = 0; i < candidateList.length; i++) {
    const candName = typeof candidateList[i] === 'string' ? candidateList[i] : candidateList[i].name;
    const normCand = normalize(candName);
    if (normCand === normTarget || normCand === aliasTarget) {
      return i;
    }
  }

  // 2. Substring match
  for (let i = 0; i < candidateList.length; i++) {
    const candName = typeof candidateList[i] === 'string' ? candidateList[i] : candidateList[i].name;
    const normCand = normalize(candName);
    if (normCand.includes(normTarget) || normTarget.includes(normCand) ||
        normCand.includes(aliasTarget) || aliasTarget.includes(normCand)) {
      return i;
    }
  }

  return -1;
}

function cleanField(val) {
  if (!val) return '';
  return val.replace(/^:\s*/, '').trim();
}

function buildPlanoDeEnsino(item) {
  return {
    ementa: item.ementa || '',
    conteudosProgramaticos: item.conteudos_programaticos || [],
    atividadeAvaliativa: item.atividade_avaliativa || '',
    bibliografiaBasica: item.bibliografia_basica || [],
    bibliografiaComplementar: item.bibliografia_complementar || [],
    cargaHoraria: cleanField(item.carga_horaria),
    cargaPorAula: cleanField(item.carga_por_aula),
    creditos: cleanField(item.creditos)
  };
}

async function testMatch() {
  const rawData = fs.readFileSync(path.join(__dirname, '../planos_de_ensino.json'), 'utf8');
  const planos = JSON.parse(rawData);

  console.log(`Total de registros no JSON: ${planos.length}`);

  const commonSnap = await getDocs(collection(db, 'commonDisciplines'));
  const commonDocs = commonSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const coursesSnap = await getDocs(collection(db, 'courses'));
  const coursesDocs = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  let matchedCommon = 0;
  let unmatchedCommon = [];

  let matchedSpecific = 0;
  let unmatchedSpecific = [];

  let ignoredCount = 0;

  for (const item of planos) {
    if (item.curso_alvo === '__NAO_CADASTRAR_SEM_CRONOGRAMA__') {
      ignoredCount++;
      continue;
    }

    if (item.curso_alvo === '__TRONCO_COMUM__') {
      const normTarget = normalize(item.disciplina);
      const found = commonDocs.find(cd => {
        const normCd = normalize(cd.name);
        return normCd === normTarget || normCd.includes(normTarget) || normTarget.includes(normCd);
      });

      if (found) {
        matchedCommon++;
        console.log(`[TRONCO COMUM OK] "${item.disciplina}" -> matched "${found.name}" (${found.id})`);
      } else {
        unmatchedCommon.push(item.disciplina);
        console.warn(`[TRONCO COMUM FAIL] Could not match "${item.disciplina}"`);
      }
      continue;
    }

    // Specific courses
    const normCourseTarget = normalize(item.curso_alvo);
    const course = coursesDocs.find(c => normalize(c.name) === normCourseTarget);

    if (!course) {
      unmatchedSpecific.push({ course: item.curso_alvo, discipline: item.disciplina, reason: 'Course not found' });
      console.warn(`[COURSE NOT FOUND] "${item.curso_alvo}"`);
      continue;
    }

    const specDiscs = course.specificDisciplines || [];
    const foundIdx = matchDiscipline(item.disciplina, specDiscs);

    if (foundIdx !== -1) {
      matchedSpecific++;
      const matchedName = typeof specDiscs[foundIdx] === 'string' ? specDiscs[foundIdx] : specDiscs[foundIdx].name;
      console.log(`[SPECIFIC OK] [${course.name}] "${item.disciplina}" -> matched "${matchedName}"`);
    } else {
      unmatchedSpecific.push({ course: item.curso_alvo, discipline: item.disciplina, reason: 'Discipline not matched in course' });
      console.warn(`[SPECIFIC FAIL] [${course.name}] "${item.disciplina}" not found in:`, specDiscs.map(d => typeof d === 'string' ? d : d.name));
    }
  }

  console.log('\n================ RESUMO DO TESTE ================');
  console.log(`Ignorados: ${ignoredCount} (esperado 9)`);
  console.log(`Tronco Comum Casados: ${matchedCommon}/9`);
  console.log(`Específicos Casados: ${matchedSpecific}/54`);
  console.log(`Total Casados: ${matchedCommon + matchedSpecific}/63`);
  if (unmatchedCommon.length > 0) console.log('Tronco Comum Não Casados:', unmatchedCommon);
  if (unmatchedSpecific.length > 0) console.log('Específicos Não Casados:', unmatchedSpecific);
}

testMatch().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
