import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  deleteField
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, firebaseConfig.firestoreDatabaseId);

const isDryRun = !process.argv.includes('--apply');

async function withRetry(fn, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(res => setTimeout(res, delayMs * attempt));
    }
  }
}

async function main() {
  console.log('====================================================');
  console.log('  MIGRAÇÃO DE DADOS PESSOAIS PARA teachers_private');
  console.log(`  MODO: ${isDryRun ? 'DRY_RUN (use --apply para gravar)' : 'APPLY (gravando no Firestore)'}`);
  console.log('====================================================\n');

  if (!isDryRun) {
    console.log('Autenticando como admin de migração...');
    await signInWithEmailAndPassword(auth, 'migration_temp@esuda.edu.br', 'TempAdminPass123!');
    console.log('Autenticado com sucesso!\n');
  } else {
    try {
      await signInWithEmailAndPassword(auth, 'migration_temp@esuda.edu.br', 'TempAdminPass123!');
      console.log('Autenticado para leitura de dados sensíveis no DRY_RUN.\n');
    } catch (e) {
      console.warn('Aviso: Leitura sem auth no DRY_RUN pode não acessar subcoleções protegidas.', e.message);
    }
  }

  const snap = await getDocs(collection(db, 'teachers'));
  console.log(`Total de professores encontrados em 'teachers': ${snap.size}\n`);

  let countWithEmail = 0;
  let countWithCpf = 0;
  let countWithPhone = 0;
  let processed = 0;

  for (const docSnap of snap.docs) {
    const id = docSnap.id;
    const data = docSnap.data();

    let email = (data.email || '').trim();
    let cpf = (data.cpf || '').trim();
    let phone = (data.phone || '').trim();

    // Checar subcoleção legada dados_sensiveis
    try {
      const subSnap = await getDoc(doc(db, 'teachers', id, 'dados_sensiveis', 'principal'));
      if (subSnap.exists()) {
        const subData = subSnap.data();
        if (!cpf && subData.cpf) cpf = String(subData.cpf).trim();
        if (!phone && subData.phone) phone = String(subData.phone).trim();
      }
    } catch (_) {}

    if (email) countWithEmail++;
    if (cpf) countWithCpf++;
    if (phone) countWithPhone++;

    console.log(`[${id}] ${data.name}`);
    console.log(`   -> email: "${email || '(vazio)'}" | cpf: "${cpf || '(vazio)'}" | phone: "${phone || '(vazio)'}"`);

    if (!isDryRun) {
      // 1. Gravar em teachers_private
      await withRetry(() => setDoc(doc(db, 'teachers_private', id), {
        cpf: cpf || '',
        email: email || '',
        phone: phone || ''
      }));

      // 2. Remover cpf, email, phone do documento teachers
      await withRetry(() => updateDoc(doc(db, 'teachers', id), {
        cpf: deleteField(),
        email: deleteField(),
        phone: deleteField()
      }));
    }

    processed++;
  }

  console.log('\n----------------------------------------------------');
  console.log(`Professores processados: ${processed}`);
  console.log(`Com e-mail: ${countWithEmail}`);
  console.log(`Com CPF: ${countWithCpf}`);
  console.log(`Com telefone: ${countWithPhone}`);
  console.log('----------------------------------------------------');
  if (isDryRun) {
    console.log('\nNENHUMA gravação foi realizada. Para executar a migração no Firestore, rode com --apply');
  } else {
    console.log('\nSUCESSO: Todos os dados pessoais foram copiados para "teachers_private" e removidos de "teachers".');
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('\nErro na migração:', err);
  process.exit(1);
});
