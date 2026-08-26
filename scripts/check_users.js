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

async function check() {
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log('Users count:', usersSnap.size);
  usersSnap.forEach(u => console.log(u.id, u.data()));
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
