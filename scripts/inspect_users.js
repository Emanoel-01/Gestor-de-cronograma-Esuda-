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

async function inspect() {
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log('--- FIRESTORE USERS ---');
  usersSnap.forEach(d => {
    console.log(d.id, '=>', d.data());
  });
}

inspect().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
