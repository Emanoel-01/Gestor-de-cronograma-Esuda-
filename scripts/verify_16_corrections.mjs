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

const CLUSTER_A = 'WadMvge0Xmc5BvVZf1nA';
const CLUSTER_B = 'kzQVwaCakQXzQIu30kMc';

function normalize(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const RULES = [
  // CLUSTER A (1..10)
  {
    num: 1,
    scheduleId: CLUSTER_A,
    disciplineName: 'Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção',
    expected: 'Ivan Carlos Moura da Cunha',
    match: (names) => names.some(n => normalize(n).includes('ivan carlos'))
  },
  {
    num: 2,
    scheduleId: CLUSTER_A,
    disciplineName: 'Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial',
    expected: 'Wellington de Oliveira Martins',
    match: (names, ids) => ids.includes('0N1QqslcHaYCw25Ube0k') || names.some(n => normalize(n).includes('wellington'))
  },
  {
    num: 3,
    scheduleId: CLUSTER_A,
    disciplineName: 'Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte',
    expected: 'Rogerio Pirola Alves',
    match: (names) => names.some(n => normalize(n).includes('rogerio') || normalize(n).includes('pirola'))
  },
  {
    num: 4,
    scheduleId: CLUSTER_A,
    disciplineName: 'Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional',
    expected: 'Ivan Carlos Moura da Cunha',
    match: (names) => names.some(n => normalize(n).includes('ivan carlos'))
  },
  {
    num: 5,
    scheduleId: CLUSTER_A,
    disciplineName: 'Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva',
    expected: 'Vilberty Vasconcelos',
    match: (names, ids) => ids.includes('QlhmXPRHnCwbaOO5oleZ') || names.some(n => normalize(n).includes('vilberty'))
  },
  {
    num: 6,
    scheduleId: CLUSTER_A,
    disciplineName: 'Técnicas de Orçamentos, Cobranças e Custos de Projetos',
    expected: 'Priscila Raffi Rodrigues',
    match: (names, ids) => ids.includes('Hyzisa1fRfO4mSFGUEXK') || names.some(n => normalize(n).includes('priscila'))
  },
  {
    num: 7,
    scheduleId: CLUSTER_A,
    disciplineName: 'Técnicas de Orçamentos, Cobranças e Custos de Obras',
    expected: 'Dieska Rayane da Silva Gomes',
    match: (names, ids) => ids.includes('mddA7g37FSDdItNej2Aa') || names.some(n => normalize(n).includes('dieska'))
  },
  {
    num: 8,
    scheduleId: CLUSTER_A,
    disciplineName: 'Lean Construction, Last Planner System e Logística de Canteiro',
    expected: 'Vera Lucia Barbosa da Silva',
    match: (names) => names.some(n => normalize(n).includes('vera lucia') || normalize(n).includes('vera'))
  },
  {
    num: 9,
    scheduleId: CLUSTER_A,
    disciplineName: 'Eficiência Energética e Sustentabilidade na Construção Civil',
    expected: 'Pryscilla de Barros Gonçalves',
    match: (names, ids) => ids.includes('WzFQV1ExzDw8T9bjo3jn') || names.some(n => normalize(n).includes('pryscilla'))
  },
  {
    num: 10,
    scheduleId: CLUSTER_A,
    disciplineName: 'Modelagem das Instalações',
    expected: 'Emmanoel Neri E Tiago Lopes Silva (DOIS)',
    match: (names, ids) => {
      const hasNeri = names.some(n => normalize(n).includes('emmanoel') || normalize(n).includes('neri'));
      const hasTiago = names.some(n => normalize(n).includes('tiago'));
      return (ids.length === 2 && hasNeri && hasTiago);
    }
  },
  // CLUSTER B (11..16)
  {
    num: 11,
    scheduleId: CLUSTER_B,
    disciplineName: 'Neuroiluminação e Ritmos Biológicos',
    expected: 'Hilma Santos Ferreira',
    match: (names) => names.some(n => normalize(n).includes('hilma'))
  },
  {
    num: 12,
    scheduleId: CLUSTER_B,
    disciplineName: 'Neuroarquitetura em Ambientes Residenciais e Comerciais',
    expected: 'Amanda Vila Nova',
    match: (names) => names.some(n => normalize(n).includes('amanda'))
  },
  {
    num: 13,
    scheduleId: CLUSTER_B,
    disciplineName: 'Neuroarquitetura em Ambientes de Saúde (Healthcare) e Aprendizado',
    expected: 'Hilma Santos Ferreira',
    match: (names) => names.some(n => normalize(n).includes('hilma'))
  },
  {
    num: 14,
    scheduleId: CLUSTER_B,
    disciplineName: 'Automação, Internet das Coisas e Eficiência dos Ambientes de Interiores',
    expected: 'Edgar Natanael Gregório',
    match: (names, ids) => ids.includes('ZUr21ObW5h2amdc52FgY') || names.some(n => normalize(n).includes('edgar'))
  },
  {
    num: 15,
    scheduleId: CLUSTER_B,
    disciplineName: 'Iluminação de Interiores: Comerciais e Residenciais',
    expected: 'Hilma Santos Ferreira',
    match: (names) => names.some(n => normalize(n).includes('hilma'))
  },
  {
    num: 16,
    scheduleId: CLUSTER_B,
    disciplineName: 'Design Aplicado para Ambientes Residenciais',
    expected: 'Amanda Vila Nova',
    match: (names) => names.some(n => normalize(n).includes('amanda'))
  }
];

async function main() {
  const [teachersSnap, classesSnap] = await Promise.all([
    getDocs(collection(db, 'teachers')),
    getDocs(collection(db, 'classes'))
  ]);

  const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  for (const rule of RULES) {
    const matched = classes.filter(c => 
      c.scheduleId === rule.scheduleId && c.disciplineName === rule.disciplineName
    ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (matched.length === 0) {
      console.log(`[${rule.num}] ${rule.disciplineName} | - | NENHUMA AULA ENCONTRADA | DIVERGENTE`);
      continue;
    }

    const dates = matched.map(c => c.date);
    const allTeacherIds = [...new Set(matched.flatMap(c => {
      if (Array.isArray(c.teacherIds) && c.teacherIds.length > 0) {
        return c.teacherIds.filter(Boolean);
      }
      return c.teacherId ? [c.teacherId] : [];
    }))];

    const teacherNames = allTeacherIds.map(id => teacherMap.get(id)?.name || `ID:${id}`);
    const isOk = rule.match(teacherNames, allTeacherIds);
    const status = isOk ? 'OK' : 'DIVERGENTE';
    const namesStr = teacherNames.join(', ') || 'Nenhum';

    console.log(`[${rule.num}] ${rule.disciplineName} | ${dates.join(', ')} | ${namesStr} | ${status}`);
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
