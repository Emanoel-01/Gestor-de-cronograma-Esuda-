const { initializeApp } = require('firebase/app');
const { 
  initializeFirestore, 
  memoryLocalCache, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy
} = require('firebase/firestore');
const config = require('../firebase-applet-config.json');

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

const scheduleIds = ['WadMvge0Xmc5BvVZf1nA', 'kzQVwaCakQXzQIu30kMc'];

async function fixCreatedAt() {
  console.log('--- ATUALIZANDO createdAt DOS CRONOGRAMAS ---');
  
  for (const id of scheduleIds) {
    const docRef = doc(db, 'schedules', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error(`Documento com ID ${id} não encontrado!`);
      continue;
    }
    
    console.log(`Documento encontrado: ${id} -> "${docSnap.data().className}"`);
    console.log(`Valor atual de createdAt:`, docSnap.data().createdAt);
    
    await updateDoc(docRef, {
      createdAt: serverTimestamp()
    });
    
    console.log(`[SUCESSO] Campo createdAt atualizado com serverTimestamp() para ${id}`);
  }

  // Verificação com a mesma query utilizada em app/page.tsx
  console.log('\n--- VERIFICAÇÃO COM QUERY orderBy("createdAt", "desc") ---');
  const q = query(collection(db, 'schedules'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  
  console.log(`Total de cronogramas retornados pela query: ${snap.size}`);
  snap.docs.forEach((d, idx) => {
    const data = d.data();
    console.log(`${idx + 1}. [${d.id}] ${data.className} | createdAt: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A'}`);
  });
}

fixCreatedAt().then(() => {
  console.log('\nOperação concluída com sucesso!');
  process.exit(0);
}).catch(err => {
  console.error('Erro ao atualizar documentos:', err);
  process.exit(1);
});
