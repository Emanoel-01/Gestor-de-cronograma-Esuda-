const { initializeApp } = require('firebase/app');
const { 
  initializeFirestore, 
  memoryLocalCache, 
  collection,
  getDocs 
} = require('firebase/firestore');
const path = require('path');
const config = require(path.join(__dirname, '../firebase-applet-config.json'));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

async function inspectAll() {
  const snap = await getDocs(collection(db, 'courses'));
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`Course: "${d.name}"`);
    console.log(`First item in specificDisciplines:`, typeof d.specificDisciplines?.[0], d.specificDisciplines?.[0]);
  }
}

inspectAll().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
