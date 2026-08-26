const { initializeApp } = require('firebase/app');
const { 
  initializeFirestore, 
  memoryLocalCache, 
  doc,
  getDoc 
} = require('firebase/firestore');
const path = require('path');
const config = require(path.join(__dirname, '../firebase-applet-config.json'));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

async function inspectDoc() {
  const snap = await getDoc(doc(db, 'courses', '3HDgYKELmnhoYC3ctl1o'));
  console.log('Gestão de Projetos e Obras specificDisciplines raw:', JSON.stringify(snap.data().specificDisciplines, null, 2));
}

inspectDoc().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
