import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs 
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

const TEAM_EMAILS = [
  'secretaria@esuda.edu.br',
  'marketing@esuda.edu.br',
  'valnei@esuda.edu.br',
  'coord.posgraduacao@esuda.edu.br'
];

const BCC_EMAILS = [
  'emanoel.s.amorim@gmail.com'
];

function buildWhatsAppLink(phone, nome, cursoInteresse, material) {
  let digits = (phone || '').replace(/\D/g, '');
  if (!digits) return 'https://wa.me/5581991298803';
  if (!digits.startsWith('55')) digits = `55${digits}`;
  else if (digits.length <= 11) digits = `55${digits}`;
  const msg = `Olá, ${nome}! Sou da equipe de Pós-Graduação da Faculdade ESUDA. Vimos seu interesse no curso de ${cursoInteresse || 'Pós-Graduação'} (${material || 'material acadêmico'}). Como podemos te ajudar?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

function formatDateTime(date) {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Recife',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function run() {
  console.log('--- ENVIANDO RESUMO DIÁRIO DE LEADS (ÚLTIMAS 24H) ---');
  
  // Autenticar com usuário admin se necessário para leitura
  try {
    await signInWithEmailAndPassword(auth, 'migration_temp@esuda.edu.br', 'TempAdminPass123!');
    console.log('Autenticado com credencial administrativa temporária.');
  } catch (e) {
    console.warn('Aviso: continuando sem autenticação direta:', e.message);
  }

  const agora = new Date();
  const vinteQuatroHorasAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const dataResumo = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Recife' });

  const snap = await getDocs(collection(db, 'leads'));
  const leads = [];

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const criado = data.criadoEm?.toDate ? data.criadoEm.toDate() : (data.criadoEm ? new Date(data.criadoEm) : null);
    if (!criado || criado >= vinteQuatroHorasAtras) {
      leads.push({ id: docSnap.id, ...data, criadoEmDate: criado });
    }
  });

  console.log(`Total de leads identificados nas últimas 24h: ${leads.length}`);

  const subject = `Resumo Diário de Leads — ESUDA — ${dataResumo} (${leads.length} leads)`;

  let textBody = `RESUMO DIÁRIO DE LEADS — FACULDADE ESUDA (${dataResumo})\n`;
  textBody += `Total de novos interessados nas últimas 24 horas: ${leads.length}\n`;
  textBody += `--------------------------------------------------------------------\n\n`;

  if (leads.length === 0) {
    textBody += `Nenhum novo lead registrado nas últimas 24 horas.\n`;
  } else {
    leads.forEach((l, idx) => {
      const dataHora = l.criadoEmDate ? formatDateTime(l.criadoEmDate) : 'Data recente';
      const waLink = buildWhatsAppLink(l.telefone, l.nome, l.cursoInteresse, l.origem);
      textBody += `${idx + 1}. ${l.nome} | Curso: ${l.cursoInteresse}\n`;
      textBody += `   E-mail: ${l.email} | Tel: ${l.telefone || 'N/I'}\n`;
      textBody += `   Material: ${l.origem || 'N/I'} | Origem: ${l.comoConheceu || 'N/I'}\n`;
      textBody += `   Data/Hora: ${dataHora}\n`;
      textBody += `   WhatsApp: ${waLink}\n\n`;
    });
  }

  const rowsHtml = leads.map((l, idx) => {
    const dataHora = l.criadoEmDate ? formatDateTime(l.criadoEmDate) : 'Data recente';
    const waLink = buildWhatsAppLink(l.telefone, l.nome, l.cursoInteresse, l.origem);
    return `
    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
      <td style="padding: 12px 10px; font-weight: bold; color: #0f172a;">${idx + 1}. ${l.nome}</td>
      <td style="padding: 12px 10px; color: #4338ca; font-weight: 600;">${l.cursoInteresse}</td>
      <td style="padding: 12px 10px; color: #334155;">${l.email}<br/><span style="font-size: 12px; color: #64748b;">${l.telefone || 'N/I'}</span></td>
      <td style="padding: 12px 10px; font-size: 12px; color: #64748b;">${l.origem || 'N/I'}<br/>${l.comoConheceu || 'N/I'}</td>
      <td style="padding: 12px 10px; font-size: 12px; color: #64748b;">${dataHora}</td>
      <td style="padding: 12px 10px; text-align: center;">
        <a href="${waLink}" target="_blank" style="display: inline-block; background-color: #16a34a; color: white; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 11px; font-weight: bold;">WhatsApp</a>
      </td>
    </tr>`;
  }).join('');

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 820px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
  <div style="background-color: #1e1b4b; padding: 24px; border-radius: 12px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 22px; text-transform: uppercase;">Faculdade ESUDA • Pós-Graduação</h2>
    <p style="margin: 6px 0 0 0; color: #a5b4fc; font-size: 14px;">Resumo Diário de Leads das Últimas 24 Horas (${dataResumo})</p>
  </div>
  <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0;">
    <p style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 0;">Total de novos interessados: ${leads.length}</p>
    ${leads.length > 0 ? `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 10px;">Interessado</th>
              <th style="padding: 10px;">Curso</th>
              <th style="padding: 10px;">Contato</th>
              <th style="padding: 10px;">Material/Origem</th>
              <th style="padding: 10px;">Data/Hora</th>
              <th style="padding: 10px; text-align: center;">Ação</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    ` : '<p style="color: #64748b; text-align: center; padding: 20px;">Nenhum lead nas últimas 24h.</p>'}
  </div>
</div>`;

  const mailDoc = {
    to: TEAM_EMAILS,
    bcc: BCC_EMAILS,
    message: { subject, text: textBody, html: htmlBody },
    subject,
    text: textBody,
    html: htmlBody,
    tipo: 'resumo_diario',
    totalLeads: leads.length,
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'mail'), mailDoc);
  console.log(`Documento de resumo gravado com sucesso na coleção 'mail' com ID: ${docRef.id}`);
}

run().then(() => process.exit(0)).catch(e => {
  console.error('Erro na execução:', e);
  process.exit(1);
});
