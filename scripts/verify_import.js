const path = require('path');
const { initializeApp } = require('firebase/app');
const { initializeFirestore, memoryLocalCache, collection, getDocs } = require('firebase/firestore');
const config = require(path.join(__dirname, '../firebase-applet-config.json'));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

async function verify() {
  console.log('=== VERIFICAÇÃO DOS DADOS NO FIRESTORE ===');
  
  // 1. Common disciplines
  const commonSnap = await getDocs(collection(db, 'commonDisciplines'));
  console.log(`\n--- Tronco Comum (${commonSnap.size} documentos) ---`);
  let commonWithPlano = 0;
  commonSnap.forEach(d => {
    const data = d.data();
    const hasPlano = !!data.planoDeEnsino && !!data.planoDeEnsino.ementa;
    if (hasPlano) commonWithPlano++;
    console.log(`- ${data.name}: ${hasPlano ? 'COM PLANO DE ENSINO (Ementa: ' + data.planoDeEnsino.ementa.substring(0, 40) + '...)' : 'SEM PLANO'}`);
  });
  console.log(`Tronco Comum com Plano: ${commonWithPlano}/${commonSnap.size}`);

  // 2. Courses
  const coursesSnap = await getDocs(collection(db, 'courses'));
  console.log(`\n--- Cursos e Disciplinas Específicas (${coursesSnap.size} cursos) ---`);
  let totalSpecific = 0;
  let totalSpecificWithPlano = 0;

  coursesSnap.forEach(d => {
    const data = d.data();
    const spec = data.specificDisciplines || [];
    let courseWithPlano = 0;
    console.log(`\nCurso: ${data.name}`);
    spec.forEach(item => {
      totalSpecific++;
      const name = typeof item === 'string' ? item : item.name;
      const hasPlano = typeof item === 'object' && !!item.planoDeEnsino && !!item.planoDeEnsino.ementa;
      if (hasPlano) {
        totalSpecificWithPlano++;
        courseWithPlano++;
      }
      console.log(`  * ${name}: ${hasPlano ? 'COM PLANO (' + item.planoDeEnsino.ementa.substring(0, 30) + '...)' : 'SEM PLANO'}`);
    });
    console.log(`  -> Subtotal com plano: ${courseWithPlano}/${spec.length}`);
  });

  console.log(`\n========================================`);
  console.log(`Tronco Comum: ${commonWithPlano}/${commonSnap.size}`);
  console.log(`Disciplinas Específicas: ${totalSpecificWithPlano}/${totalSpecific}`);
  console.log(`========================================`);
}

verify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
