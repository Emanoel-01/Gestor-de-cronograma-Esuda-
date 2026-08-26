const path = require('path');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword } = require('firebase/auth');
const { initializeFirestore, memoryLocalCache, doc, setDoc, getDoc } = require('firebase/firestore');
const config = require(path.join(__dirname, '../firebase-applet-config.json'));

const app = initializeApp(config);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

const TARGET_EMAIL = 'emanoel@esuda.edu.br';
const TARGET_PASS = '3443*/A';

async function registerUser() {
  console.log(`Tentando registrar/atualizar o usuário: ${TARGET_EMAIL}...`);
  let userCredential;
  let isNew = false;

  try {
    userCredential = await createUserWithEmailAndPassword(auth, TARGET_EMAIL, TARGET_PASS);
    console.log(`[SUCESSO] Usuário criado no Firebase Auth com UID: ${userCredential.user.uid}`);
    isNew = true;
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`E-mail já existe no Firebase Auth. Tentando autenticar e atualizar a senha...`);
      try {
        userCredential = await signInWithEmailAndPassword(auth, TARGET_EMAIL, TARGET_PASS);
        console.log(`[OK] Login com a senha fornecida efetuado com sucesso! UID: ${userCredential.user.uid}`);
      } catch (loginErr) {
        console.log(`Senha antiga diferente. Vamos registrar a mensagem ou tentar atualizar.`);
        throw loginErr;
      }
    } else {
      throw err;
    }
  }

  const uid = userCredential.user.uid;

  // Salvar/atualizar na coleção users do Firestore
  console.log(`Registrando usuário no Firestore /users/${uid}...`);
  await setDoc(doc(db, 'users', uid), {
    email: TARGET_EMAIL,
    role: 'admin', // Acesso total / área restrita
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }, { merge: true });

  console.log(`[SUCESSO COMPLETO] Usuário ${TARGET_EMAIL} cadastrado com role 'admin' e acesso à área restrita com a senha fornecida!`);
}

registerUser()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro:', err);
    process.exit(1);
  });
