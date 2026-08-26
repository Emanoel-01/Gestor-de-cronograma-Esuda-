const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs, 
  doc, 
  updateDoc 
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

async function runImport() {
  console.log('--- INICIANDO IMPORTAÇÃO DOS PLANOS DE ENSINO ---');
  const rawData = fs.readFileSync(path.join(__dirname, '../planos_de_ensino.json'), 'utf8');
  const planos = JSON.parse(rawData);

  // 1. Fetch collections
  const commonSnap = await getDocs(collection(db, 'commonDisciplines'));
  const commonDocs = commonSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const coursesSnap = await getDocs(collection(db, 'courses'));
  const coursesDocs = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  let updatedCommonCount = 0;
  let updatedSpecificCount = 0;
  let ignoredCount = 0;

  // Track modified courses in memory to batch update per course document
  const courseUpdates = new Map(); // courseId -> { courseRef, specificDisciplines }

  // Initialize course map
  for (const c of coursesDocs) {
    const specDiscs = (c.specificDisciplines || []).map(item => {
      if (typeof item === 'string') {
        return { name: item };
      }
      return { ...item };
    });
    courseUpdates.set(c.id, {
      courseDoc: c,
      specificDisciplines: specDiscs
    });
  }

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
        const plano = buildPlanoDeEnsino(item);
        await updateDoc(doc(db, 'commonDisciplines', found.id), {
          planoDeEnsino: plano
        });
        updatedCommonCount++;
        console.log(`[TRONCO COMUM ATUALIZADO] ${item.disciplina} -> ${found.name} (id: ${found.id})`);
      } else {
        console.warn(`[AVISO] Disciplina de Tronco Comum não encontrada: "${item.disciplina}"`);
      }
      continue;
    }

    // Specific courses
    const normCourseTarget = normalize(item.curso_alvo);
    const course = coursesDocs.find(c => normalize(c.name) === normCourseTarget);

    if (!course) {
      console.warn(`[AVISO] Curso não encontrado no banco: "${item.curso_alvo}"`);
      continue;
    }

    const courseEntry = courseUpdates.get(course.id);
    const specDiscs = courseEntry.specificDisciplines;
    const foundIdx = matchDiscipline(item.disciplina, specDiscs);

    if (foundIdx !== -1) {
      const plano = buildPlanoDeEnsino(item);
      specDiscs[foundIdx] = {
        ...specDiscs[foundIdx],
        planoDeEnsino: plano
      };
      updatedSpecificCount++;
      console.log(`[ESPECÍFICA MAPEADA] [${course.name}] ${item.disciplina} -> ${specDiscs[foundIdx].name}`);
    } else {
      console.warn(`[AVISO] Disciplina não encontrada no curso ${course.name}: "${item.disciplina}"`);
    }
  }

  // Commit updates for all modified courses
  console.log('\n--- Gravando atualizações dos cursos no Firestore ---');
  for (const [courseId, entry] of courseUpdates.entries()) {
    await updateDoc(doc(db, 'courses', courseId), {
      specificDisciplines: entry.specificDisciplines
    });
    console.log(`[CURSO ATUALIZADO] ${entry.courseDoc.name} (${entry.specificDisciplines.length} disciplinas)`);
  }

  console.log('\n================ RESUMO DA IMPORTAÇÃO ================');
  console.log(`Ignorados (__NAO_CADASTRAR_SEM_CRONOGRAMA__): ${ignoredCount}`);
  console.log(`Tronco Comum Atualizados: ${updatedCommonCount}/9`);
  console.log(`Disciplinas Específicas Atualizadas: ${updatedSpecificCount}/54`);
  console.log(`TOTAL IMPORTADO: ${updatedCommonCount + updatedSpecificCount}/63`);
  console.log('======================================================\n');
}

runImport()
  .then(() => {
    console.log('Importação concluída com sucesso!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Erro na importação:', err);
    process.exit(1);
  });
