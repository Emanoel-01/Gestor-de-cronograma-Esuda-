const path = require('path');
const { initializeApp } = require('firebase/app');
const { initializeFirestore, memoryLocalCache, doc, setDoc, getDocs, collection } = require('firebase/firestore');
const config = require(path.join(__dirname, '../firebase-applet-config.json'));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

async function saveAdminUser() {
  console.log('Gravando usuário admin emanoel@esuda.edu.br no Firestore...');
  
  await setDoc(doc(db, 'users', 'admin-emanoel-esuda'), {
    email: 'emanoel@esuda.edu.br',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  }, { merge: true });

  console.log('Usuário gravado com sucesso!');

  const snap = await getDocs(collection(db, 'users'));
  console.log(`Total de usuários na coleção users: ${snap.size}`);
  snap.forEach(d => console.log(d.id, d.data()));
}

saveAdminUser()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
