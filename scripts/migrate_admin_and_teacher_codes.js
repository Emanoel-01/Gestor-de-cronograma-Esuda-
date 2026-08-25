const { initializeApp } = require('firebase/app');
const { 
  initializeFirestore, 
  memoryLocalCache, 
  doc, 
  setDoc,
  getDoc,
  getDocs, 
  updateDoc, 
  serverTimestamp,
  collection
} = require('firebase/firestore');
const path = require('path');
const config = require(path.join(__dirname, '../firebase-applet-config.json'));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Evita 0, O, 1, I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function migrate() {
  console.log('=== INICIANDO MIGRAÇÃO DE USUÁRIO ADMIN E ACCESS CODES ===\n');

  // 1. Criar/Garantir documento do Admin em `users`
  const adminUid = 'g0jsC6oh0ogC9leMzevt17i7cvF3';
  const adminDocRef = doc(db, 'users', adminUid);
  const adminSnap = await getDoc(adminDocRef);

  if (!adminSnap.exists()) {
    await setDoc(adminDocRef, {
      email: 'emanoel.s.amorim@gmail.com',
      role: 'admin',
      createdAt: serverTimestamp(),
      createdBy: 'system'
    });
    console.log(`[SUCESSO] Documento admin criado em users/${adminUid}`);
  } else {
    console.log(`[INFO] Documento admin já existe em users/${adminUid}:`, adminSnap.data());
    await updateDoc(adminDocRef, { 
      email: 'emanoel.s.amorim@gmail.com',
      role: 'admin',
      createdAt: adminSnap.data().createdAt || serverTimestamp(),
      createdBy: 'system'
    });
    console.log(`[SUCESSO] Role do admin garantido como 'admin'`);
  }

  // 2. Gerar accessCode para docentes que ainda não possuem
  console.log('\n--- VERIFICANDO ACCESS CODES DOS DOCENTES ---');
  const teachersSnap = await getDocs(collection(db, 'teachers'));
  console.log(`Total de docentes encontrados: ${teachersSnap.size}`);

  let updatedCount = 0;
  for (const tDoc of teachersSnap.docs) {
    const data = tDoc.data();
    if (!data.accessCode) {
      const code = generateAccessCode();
      await updateDoc(doc(db, 'teachers', tDoc.id), {
        accessCode: code
      });
      updatedCount++;
      console.log(`Docente "${data.name}" -> AccessCode gerado: ${code}`);
    } else {
      console.log(`Docente "${data.name}" já possui AccessCode: ${data.accessCode}`);
    }
  }

  console.log(`\n[SUCESSO] Total de docentes com novos códigos: ${updatedCount}`);
}

migrate().then(() => {
  console.log('\nMigração concluída com sucesso!');
  process.exit(0);
}).catch(err => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
