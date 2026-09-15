import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteField,
  serverTimestamp 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf8'));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

const normalize = (s) => (s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const teacherAliases = {
  "Amanda Vila Nova": "Amanda Nova",
  "Conceição de Cássia Pereira de Albuquerque": "Cassia Albuquerque",
  "Emmanoel Neri": "Emmanoel Roberto da Silva Neri",
  "Hilma Santos Ferreira": "Hilma de Oliveira Santos Ferreira",
  "Ivan Carlos Moura da Cunha": "Ivan Carlos Cunha ",
  "Rogerio Pirola Alves": "Rogério Pirola",
  "Vera Lucia Barbosa da Silva": "Vera Lúcia Barbosa Silva"
};

const registroOficial = [
  {"nome":"Paulo Ney Alves Barata","titulacao":"Especialista","cpf":"455.868.534-34","email":"pauloney@esuda.edu.br","phone":"(81) 99924-0560"},
  {"nome":"Conceição de Cássia Pereira de Albuquerque","titulacao":"Mestre","cpf":"PENDENTE_VERIFICACAO","email":"cassia_albuquerque@hotmail.com","phone":"(81) 99221-2335"},
  {"nome":"Emanoel Silva de Amorim","titulacao":"Mestre","cpf":"081.642.984-76","email":"emanoel@esuda.edu.br","phone":"(81) 99129-8803"},
  {"nome":"Nilson da Cunha Ximenes","titulacao":"Especialista","cpf":"317.898.544-15","email":"nilson.ximenes@gmail.com","phone":"(81) 99842-3151"},
  {"nome":"Gildo Alves de Souza Júnior","titulacao":"Especialista","cpf":"072.421.914-59","email":"gildoalvess@hotmail.com","phone":"(81) 98422-7853"},
  {"nome":"Nathálya Aguiar Leal de Melo Souto Maior Arruda","titulacao":"Especialista","cpf":"090.746.254-52","email":"nathalyaaguiar92@gmail.com","phone":"(81) 99885-8090"},
  {"nome":"Tiago Lopes Silva","titulacao":"Especialista","cpf":"PENDENTE_VERIFICACAO","email":"tlsprojetoseconsultoria@gmail.com","phone":"(81) 99614-2463"},
  {"nome":"Emmanoel Neri","titulacao":"Mestre","cpf":"099.375.594-13","email":"emmanoelroberto@gmail.com","phone":"(81) 99773-1722"},
  {"nome":"Dieska Rayane da Silva Gomes","titulacao":"Mestre","cpf":"114.947.164-61","email":"dieskarayane@gmail.com","phone":"(87) 99994-3146"},
  {"nome":"Priscila Raffi Rodrigues","titulacao":"Mestre","cpf":"034.401.054-66","email":"priscilaraffi@esuda.edu.br","phone":"(81) 99539-9727"},
  {"nome":"Vera Lucia Barbosa da Silva","titulacao":"Mestre","cpf":"713.049.834-04","email":"meioambiente.vera@gmail.com","phone":"(81) 98238-1417"},
  {"nome":"Florencio Absalão da Silva Filho","titulacao":"Mestre","cpf":"168.385.484-53","email":"prof.absalao@gmail.com","phone":"(81) 98833-7068"},
  {"nome":"Pryscilla de Barros Gonçalves","titulacao":"Mestre","cpf":"027.532.665-90","email":"pryscillawc5@gmail.com","phone":"(81) 99537-2992"},
  {"nome":"Ivan Carlos Moura da Cunha","titulacao":"Especialista","cpf":"529.121.324-87","email":"ivancarloscunha@gnoseconsultoria.com","phone":"(81) 98203-0013"},
  {"nome":"Erick Sidrome de Oliveira","titulacao":"Especialista","cpf":"027.323.044-17","email":"e.s.o@outlook.com","phone":"(81) 99815-5922"},
  {"nome":"Wellington de Oliveira Martins","titulacao":"Especialista","cpf":"585.162.634-87","email":"contato@womengenharia.com.br","phone":"(81) 99732-3217"},
  {"nome":"Francisco de Assis Berenguer Correia","titulacao":"Especialista","cpf":"078.240.904-00","email":"francisco@dbengenharia.com","phone":"(81) 99994-3302"},
  {"nome":"Rogerio Pirola Alves","titulacao":"Especialista","cpf":"223.707.218-39","email":"rogerio.pirola@hotmail.com","phone":"(81) 98957-8604"},
  {"nome":"Vilberty Vasconcelos","titulacao":"Mestre","cpf":"020.703.294-70","email":"vilberty@bbcep.eng.br","phone":"(81) 98104-6624"},
  {"nome":"Fabio Torres Cunha","titulacao":"Mestre","cpf":"618.842.603-06","email":"fabiologo1980@gmail.com","phone":"(81) 98821-7411"},
  {"nome":"Hilma Santos Ferreira","titulacao":"Doutor","cpf":"707.751.094-87","email":"hilma.ferreira@esuda.edu.br","phone":"(81) 98612-6268"},
  {"nome":"Amanda Vila Nova","titulacao":"Especialista","cpf":"073.859.344-39","email":"amandavilanova.arq@gmail.com","phone":"(81) 99998-3910"},
  {"nome":"Clodomir Barros","titulacao":"Mestre","cpf":"594.731.344-87","email":"clodomir@esuda.edu.br","phone":"(81) 98833-9560"},
  {"nome":"Renata Eskinazi Leça","titulacao":"Mestre","cpf":"830.130.834-68","email":"renata@esuda.edu.br","phone":"(81) 99973-2701"},
  {"nome":"Regina Coeli Barros","titulacao":"Mestre","cpf":"235.543.804-82","email":"reginacoelibblima@gmail.com","phone":"(81) 99971-5292"},
  {"nome":"Francisco Buarque","titulacao":"Especialista","cpf":"459.496.974-72","email":"francisco.buarque@gmail.com","phone":"(81) 99788-1144"},
  {"nome":"Mohana Barros","titulacao":"Especialista","cpf":"034.099.034-10","email":"mohanalima@gmail.com","phone":"(81) 99904-7144"},
  {"nome":"Francisco Ellihimas","titulacao":"Especialista","cpf":"767.105.214-00","email":"francisco@esuda.edu.br","phone":"(81) 99949-0932"},
  {"nome":"Ramon Araújo","titulacao":"Especialista","cpf":"685.788.064-68","email":"arquitetoramonaraujo@gmail.com","phone":"(81) 98617-4362"},
  {"nome":"Rebeka Zambon","titulacao":"Especialista","cpf":"069.429.104-81","email":"rebekazambon@gmail.com","phone":"(81) 99570-1377"},
  {"nome":"Alexandre Mesquita","titulacao":"Especialista","cpf":"409.525.414-91","email":"mesquitaita@gmail.com","phone":"(81) 99972-3113"},
  {"nome":"Edgar Natanael Gregório","titulacao":"Mestre","cpf":"042.901.834-76","email":"edgarnatanael28@hotmail.com","phone":"(81) 98315-5645"},
  {"nome":"Laura Julyê Sales Almeida","titulacao":"","cpf":"PENDENTE_VERIFICACAO","email":"","phone":""}
];

function isValidCPF(cpf) {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;
  return true;
}

async function withRetry(fn, maxRetries = 4, delayMs = 300) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(res => setTimeout(res, delayMs * attempt));
    }
  }
}

function generateAccessCode(existingCodes = new Set()) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (existingCodes.has(code));
  existingCodes.add(code);
  return code;
}

async function main() {
  const isDryRun = !process.argv.includes('--apply');
  console.log('====================================================');
  console.log('  FIX CADASTRO PROFESSORES - ESUDA');
  console.log(`  MODO: ${isDryRun ? 'DRY_RUN (nenhuma alteração será gravada)' : 'APPLY (gravando alterações no Firestore)'}`);
  console.log('====================================================\n');

  // Carrega todos os professores atuais do Firestore
  const teachersSnap = await getDocs(collection(db, 'teachers'));
  const dbTeachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total de professores no banco: ${dbTeachers.length}`);

  const existingCodes = new Set(
    dbTeachers.map(t => t.accessCode).filter(code => code && typeof code === 'string' && code.trim().length > 0)
  );

  let countMigratedCpf = 0;
  let countMigratedPhone = 0;
  let countUpdatedPublic = 0;
  let countUpdatedSensitive = 0;
  let countCreated = 0;

  const pendenciasCoordenacao = [];
  const invalidCpfs = [];
  const missingFieldsReport = [];
  const allFinalCpfs = new Map(); // cleanCpf -> { teacherId, teacherName, rawCpf }

  // Processa cada professor do banco de dados
  for (const t of dbTeachers) {
    const normDbName = normalize(t.name);

    // 1. Verifica se há doc em dados_sensiveis/principal
    let existingSensitive = {};
    try {
      const sensSnap = await getDoc(doc(db, 'teachers', t.id, 'dados_sensiveis', 'principal'));
      if (sensSnap.exists()) {
        existingSensitive = sensSnap.data() || {};
      }
    } catch (err) {
      // Ignora erro de permissão no DRY_RUN se regras estiverem estritas
    }

    let targetCpf = existingSensitive.cpf || '';
    let targetPhone = existingSensitive.phone || '';

    // Se a subcoleção ainda não tem cpf, aproveita o que está no doc público
    let hadCpfInPublic = (t.cpf !== undefined);
    if (!targetCpf && t.cpf && t.cpf !== 'PENDENTE_VERIFICACAO') {
      targetCpf = t.cpf.trim();
    }

    let hadPhoneInPublic = (t.phone !== undefined);
    if (!targetPhone && t.phone) {
      targetPhone = t.phone.trim();
    }

    // 2. Procura no REGISTRO oficial
    const regMatch = registroOficial.find(r => {
      const alias = teacherAliases[r.nome];
      const targetNorm = alias ? normalize(alias) : normalize(r.nome);
      return normDbName === targetNorm || normDbName === normalize(r.nome);
    });

    let targetTitulacao = t.titulacao || '';
    let targetEmail = t.email || '';

    if (regMatch) {
      // Regra PENDENTE_VERIFICACAO: nunca grava o literal
      if (regMatch.cpf === 'PENDENTE_VERIFICACAO') {
        pendenciasCoordenacao.push({
          professor: t.name,
          id: t.id,
          campo: 'CPF',
          motivo: 'Marcado como PENDENTE_VERIFICACAO no cronograma oficial. Mantido valor prévio.',
          valorAtual: targetCpf || '(vazio)'
        });
      } else if (regMatch.cpf && regMatch.cpf.trim()) {
        targetCpf = regMatch.cpf.trim();
      }

      if (regMatch.phone && regMatch.phone.trim()) {
        targetPhone = regMatch.phone.trim();
      }

      // Titulação
      if (regMatch.titulacao && regMatch.titulacao.trim()) {
        targetTitulacao = regMatch.titulacao.trim();
      }

      // Email
      if (regMatch.email && regMatch.email.trim()) {
        targetEmail = regMatch.email.trim();
      }
    }

    // Identifica campos faltantes para o relatório
    const missing = [];
    if (!targetCpf) missing.push('CPF');
    if (!targetPhone) missing.push('Telefone');
    if (!targetEmail) missing.push('Email');
    if (!targetTitulacao) missing.push('Titulação');

    if (missing.length > 0) {
      missingFieldsReport.push({
        professor: t.name,
        id: t.id,
        camposFaltando: missing
      });
    }

    // Validação de duplicidade e dígitos verificadores de CPF
    if (targetCpf && targetCpf !== 'PENDENTE_VERIFICACAO') {
      const cleanCpf = targetCpf.replace(/\D/g, '');
      if (cleanCpf.length === 11) {
        if (allFinalCpfs.has(cleanCpf)) {
          const prev = allFinalCpfs.get(cleanCpf);
          console.error(`\n[ERRO CRÍTICO] CPF DUPLICADO DETECTADO: ${targetCpf}`);
          console.error(`- Professor 1: [${prev.teacherId}] ${prev.teacherName}`);
          console.error(`- Professor 2: [${t.id}] ${t.name}`);
          throw new Error(`Abortando por CPF duplicado: ${targetCpf}`);
        }
        allFinalCpfs.set(cleanCpf, { teacherId: t.id, teacherName: t.name, rawCpf: targetCpf });

        if (!isValidCPF(targetCpf)) {
          invalidCpfs.push({
            professor: t.name,
            id: t.id,
            cpf: targetCpf
          });
        }
      }
    }

    // Determina o que precisa ser atualizado
    const needsPublicUpdate = 
      hadCpfInPublic || 
      hadPhoneInPublic || 
      (targetTitulacao !== (t.titulacao || '')) || 
      (targetEmail !== (t.email || ''));

    const needsSensitiveUpdate = 
      (targetCpf !== (existingSensitive.cpf || '')) || 
      (targetPhone !== (existingSensitive.phone || ''));

    if (hadCpfInPublic) countMigratedCpf++;
    if (hadPhoneInPublic) countMigratedPhone++;

    if (needsPublicUpdate) countUpdatedPublic++;
    if (needsSensitiveUpdate) countUpdatedSensitive++;

    // Aplica alterações se não for DRY_RUN
    if (!isDryRun) {
      // 1. Atualiza subcoleção sensível se necessário
      if (needsSensitiveUpdate || targetCpf || targetPhone) {
        await withRetry(async () => {
          await setDoc(doc(db, 'teachers', t.id, 'dados_sensiveis', 'principal'), {
            cpf: targetCpf || '',
            phone: targetPhone || ''
          }, { merge: true });
        });
      }

      // 2. Atualiza doc público e remove cpf/phone
      if (needsPublicUpdate) {
        const publicUpdates = {};
        if (hadCpfInPublic) {
          publicUpdates.cpf = deleteField();
        }
        if (hadPhoneInPublic) {
          publicUpdates.phone = deleteField();
        }
        if (targetTitulacao !== (t.titulacao || '')) {
          publicUpdates.titulacao = targetTitulacao;
        }
        if (targetEmail !== (t.email || '')) {
          publicUpdates.email = targetEmail;
        }

        await withRetry(async () => {
          await updateDoc(doc(db, 'teachers', t.id), publicUpdates);
        });
      }
    }
  }

  // 3. Verifica se existe algum professor do REGISTRO não presente no banco
  for (const r of registroOficial) {
    const alias = teacherAliases[r.nome];
    const targetNorm = alias ? normalize(alias) : normalize(r.nome);
    const existsInDb = dbTeachers.some(t => {
      const normDb = normalize(t.name);
      return normDb === targetNorm || normDb === normalize(r.nome);
    });

    if (!existsInDb) {
      console.log(`[NOVO] Professor do registro oficial não encontrado no banco: ${r.nome}`);
      countCreated++;
      if (!isDryRun) {
        const newTeacherRef = await withRetry(async () => {
          return await addDoc(collection(db, 'teachers'), {
            name: r.nome,
            titulacao: r.titulacao || 'Especialista',
            email: r.email || '',
            accessCode: generateAccessCode(existingCodes),
            specialties: [],
            hasSubmitted: false,
            createdAt: serverTimestamp()
          });
        });

        const newCpf = (r.cpf && r.cpf !== 'PENDENTE_VERIFICACAO') ? r.cpf.trim() : '';
        const newPhone = (r.phone && r.phone.trim()) ? r.phone.trim() : '';
        if (newCpf || newPhone) {
          await withRetry(async () => {
            await setDoc(doc(db, 'teachers', newTeacherRef.id, 'dados_sensiveis', 'principal'), {
              cpf: newCpf,
              phone: newPhone
            });
          });
        }
      }
    }
  }

  console.log('\n====================================================');
  console.log('  RELATÓRIO DA EXECUÇÃO');
  console.log('====================================================');
  console.log(`- Docs públicos com campo CPF migrado e removido: ${countMigratedCpf}`);
  console.log(`- Docs públicos com campo Phone migrado e removido: ${countMigratedPhone}`);
  console.log(`- Professores com dados públicos atualizados: ${countUpdatedPublic}`);
  console.log(`- Professores com dados sensíveis gravados/mesclados: ${countUpdatedSensitive}`);
  console.log(`- Novos professores criados: ${countCreated}`);

  console.log('\n--- VALIDAÇÃO DE CPFs REPROVADOS NO DÍGITO VERIFICADOR ---');
  if (invalidCpfs.length === 0) {
    console.log('Nenhum CPF com dígito inválido!');
  } else {
    invalidCpfs.forEach(item => {
      console.log(`[REPROVADO] ${item.professor} (ID: ${item.id}) - CPF: ${item.cpf}`);
    });
  }

  console.log('\n--- PENDÊNCIAS DE COORDENAÇÃO (PENDENTE_VERIFICACAO) ---');
  if (pendenciasCoordenacao.length === 0) {
    console.log('Nenhuma pendência.');
  } else {
    pendenciasCoordenacao.forEach(p => {
      console.log(`[PENDÊNCIA] ${p.professor} (ID: ${p.id}): ${p.motivo} (Valor mantido: ${p.valorAtual})`);
    });
  }

  console.log('\n--- PROFESSORES COM CAMPOS FALTANDO ---');
  if (missingFieldsReport.length === 0) {
    console.log('Todos os professores possuem todos os campos preenchidos!');
  } else {
    console.log(`Total com ao menos 1 campo pendente: ${missingFieldsReport.length}`);
    missingFieldsReport.forEach(item => {
      console.log(`- ${item.professor} (ID: ${item.id}): faltando [${item.camposFaltando.join(', ')}]`);
    });
  }

  // 4. VALIDAÇÃO ANÔNIMA AO FINAL (se executado com --apply)
  if (!isDryRun) {
    console.log('\n--- VALIDAÇÃO DE LEITURA ANÔNIMA SIMULADA ---');
    const verifySnap = await getDocs(collection(db, 'teachers'));
    let publicLeaks = 0;
    for (const d of verifySnap.docs) {
      const data = d.data();
      if (data.cpf !== undefined || data.phone !== undefined) {
        console.error(`[VAZAMENTO DETECTADO] Professor ${data.name} (ID: ${d.id}) ainda contém: ${data.cpf !== undefined ? 'cpf ' : ''}${data.phone !== undefined ? 'phone' : ''}`);
        publicLeaks++;
      }
    }
    if (publicLeaks === 0) {
      console.log('SUCESSO: Nenhum documento público de "teachers" contém mais os campos cpf ou phone.');
    } else {
      console.error(`FALHA: ${publicLeaks} documentos ainda contêm campos sensíveis no documento público.`);
    }
  }

  console.log('\n====================================================');
  console.log(isDryRun ? 'DRY_RUN CONCLUÍDO COM SUCESSO. Para aplicar, execute com --apply' : 'MIGRAÇÃO E COMPLEMENTAÇÃO APLICADAS COM SUCESSO.');
  console.log('====================================================\n');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('\nErro na execução:', err);
  process.exit(1);
});
