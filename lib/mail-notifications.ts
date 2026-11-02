import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

// Destinatários oficiais da equipe ESUDA conforme PROMPT 7:
// Secretaria, Marketing e Valnei (Coordenador Geral de Pós-Graduação)
export const TEAM_EMAILS = [
  'possoajudarsecretariapos@esuda.edu.br',
  'vdoval@gmail.com'
];

// Cópia oculta obrigatória
export const BCC_EMAILS = [
  'emanoel.s.amorim@gmail.com'
];

function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizeLead<T extends Record<string, any>>(lead: T): T {
  const out: Record<string, any> = { ...lead };
  for (const k of ['nome', 'email', 'telefone', 'cursoInteresse', 'origem', 'comoConheceu']) {
    if (out[k] != null) out[k] = escapeHtml(out[k]);
  }
  return out as T;
}

export interface LeadData {
  id?: string;
  nome: string;
  email: string;
  telefone?: string;
  cursoInteresse: string;
  origem?: string;
  comoConheceu?: string;
  criadoEm?: any;
  consentimento?: boolean;
  status?: string;
}

/**
 * Monta o link https://wa.me/55DDDNUMERO?text=... com o telefone do lead
 * e uma mensagem inicial pré-formatada para facilitar o primeiro contato da equipe.
 */
export function buildWhatsAppLink(
  phone: string | undefined, 
  nome: string, 
  cursoInteresse: string, 
  material?: string
): string {
  let digits = (phone || '').replace(/\D/g, '');
  
  if (!digits) {
    // Caso não haja telefone, link genérico para WhatsApp da ESUDA
    return 'https://wa.me/5581991298803';
  }

  // Adiciona o DDI 55 (Brasil) se não estiver presente
  if (!digits.startsWith('55')) {
    digits = `55${digits}`;
  } else if (digits.length <= 11) {
    digits = `55${digits}`;
  }

  const mensagemInicial = `Olá, ${nome}! Sou da equipe de Pós-Graduação da Faculdade ESUDA. Vimos seu interesse no curso de ${cursoInteresse || 'Pós-Graduação'} (${material || 'material acadêmico'}). Como podemos te ajudar?`;
  
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensagemInicial)}`;
}

/**
 * Formata data e hora para o fuso horário brasileiro.
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Recife',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Grava um documento na coleção 'mail' do Firestore para envio imediato
 * via extensão Trigger Email from Firestore.
 */
export async function sendNewLeadNotification(lead: LeadData): Promise<string> {
  const agora = new Date();
  const dataHoraFormatada = formatDateTime(agora);
  const whatsappUrl = buildWhatsAppLink(lead.telefone, lead.nome, lead.cursoInteresse, lead.origem);
  lead = sanitizeLead(lead);

  const subject = `Novo lead — ${lead.cursoInteresse} — ${lead.nome}`;

  const textBody = `NOVO LEAD CADASTRADO — FACULDADE ESUDA
--------------------------------------------------
Nome: ${lead.nome}
E-mail: ${lead.email}
Telefone / WhatsApp: ${lead.telefone || 'Não informado'}
Curso de Interesse: ${lead.cursoInteresse}
Material Solicitado: ${lead.origem || 'Download de Material'}
Como Conheceu o Curso: ${lead.comoConheceu || 'Não informado'}
Data e Hora: ${dataHoraFormatada}

Conversar via WhatsApp (abrir conversa com 1 clique):
${whatsappUrl}
--------------------------------------------------
Notificação automática gerada pelo sistema de captação de leads.`;

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
  <div style="background-color: #1e1b4b; padding: 20px; border-radius: 12px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.05em; text-transform: uppercase;">Faculdade ESUDA • Pós-Graduação</h2>
    <p style="margin: 6px 0 0 0; color: #a5b4fc; font-size: 13px;">Novo lead captado no portal público</p>
  </div>

  <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h3 style="margin-top: 0; color: #0f172a; font-size: 17px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Dados do Interessado</h3>
    
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px;">
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 150px;">Nome:</td>
        <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${lead.nome}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">E-mail:</td>
        <td style="padding: 8px 0; color: #0f172a;"><a href="mailto:${lead.email}" style="color: #4f46e5; text-decoration: none;">${lead.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Telefone / WhatsApp:</td>
        <td style="padding: 8px 0; color: #0f172a;">${lead.telefone || 'Não informado'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Curso de Interesse:</td>
        <td style="padding: 8px 0; color: #4338ca; font-weight: bold;">${lead.cursoInteresse}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Material Solicitado:</td>
        <td style="padding: 8px 0; color: #0f172a;">${lead.origem || 'Download de Material'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Como Conheceu:</td>
        <td style="padding: 8px 0; color: #0f172a;">${lead.comoConheceu || 'Não informado'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Data e Hora:</td>
        <td style="padding: 8px 0; color: #0f172a;">${dataHoraFormatada}</td>
      </tr>
    </table>

    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
      <a href="${whatsappUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);">
        Abrir Conversa no WhatsApp
      </a>
      <p style="margin-top: 10px; font-size: 11px; color: #94a3b8;">
        Ou copie o link: <a href="${whatsappUrl}" style="color: #16a34a; word-break: break-all;">${whatsappUrl}</a>
      </p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 16px; font-size: 11px; color: #94a3b8;">
    Faculdade ESUDA • Notificação instantânea disparada pela captação de leads
  </div>
</div>`;

  const mailDoc = {
    to: TEAM_EMAILS,
    bcc: BCC_EMAILS,
    message: {
      subject,
      text: textBody,
      html: htmlBody
    },
    // Compatibilidade com diferentes versões da extensão Trigger Email
    subject,
    text: textBody,
    html: htmlBody,
    tipo: 'novo_lead',
    leadData: {
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone || '',
      cursoInteresse: lead.cursoInteresse,
      origem: lead.origem || ''
    },
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'mail'), mailDoc);
  return docRef.id;
}

/**
 * Gera e envia o resumo diário de todos os leads cadastrados nas últimas 24 horas.
 */
export async function sendDailyLeadsSummary(): Promise<{ count: number; mailId: string | null }> {
  const agora = new Date();
  const vinteQuatroHorasAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const dataResumoFormatada = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Recife' });

  // Buscar leads criados nas últimas 24h
  const leadsQuery = query(
    collection(db, 'leads'),
    where('criadoEm', '>=', Timestamp.fromDate(vinteQuatroHorasAtras)),
    orderBy('criadoEm', 'desc')
  );

  let leadsSnap;
  try {
    leadsSnap = await getDocs(leadsQuery);
  } catch (err) {
    // Fallback sem orderBy se índice não estiver criado
    console.warn('Fallback busca leads sem orderBy:', err);
    leadsSnap = await getDocs(collection(db, 'leads'));
  }

  const leadsList: LeadData[] = [];
  leadsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const criadoEmDate = data.criadoEm?.toDate ? data.criadoEm.toDate() : (data.criadoEm ? new Date(data.criadoEm) : null);
    
    // Filtro estrito de 24h no código caso use fallback
    if (!criadoEmDate || criadoEmDate >= vinteQuatroHorasAtras) {
      leadsList.push({
        id: docSnap.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        cursoInteresse: data.cursoInteresse,
        origem: data.origem,
        comoConheceu: data.comoConheceu,
        criadoEm: criadoEmDate
      });
    }
  });

  const subject = `Resumo Diário de Leads — ESUDA — ${dataResumoFormatada} (${leadsList.length} leads)`;

  let textBody = `RESUMO DIÁRIO DE LEADS — FACULDADE ESUDA (${dataResumoFormatada})\n`;
  textBody += `Total de novos interessados nas últimas 24 horas: ${leadsList.length}\n`;
  textBody += `--------------------------------------------------------------------\n\n`;

  if (leadsList.length === 0) {
    textBody += `Nenhum novo lead registrado nas últimas 24 horas.\n`;
  } else {
    leadsList.forEach((lead, idx) => {
      const dataHora = lead.criadoEm ? formatDateTime(lead.criadoEm) : 'Data recente';
      const waLink = buildWhatsAppLink(lead.telefone, lead.nome, lead.cursoInteresse, lead.origem);
      lead = sanitizeLead(lead);
      textBody += `${idx + 1}. ${lead.nome} | Curso: ${lead.cursoInteresse}\n`;
      textBody += `   E-mail: ${lead.email} | Tel: ${lead.telefone || 'N/I'}\n`;
      textBody += `   Material: ${lead.origem || 'N/I'} | Origem: ${lead.comoConheceu || 'N/I'}\n`;
      textBody += `   Data/Hora: ${dataHora}\n`;
      textBody += `   WhatsApp: ${waLink}\n\n`;
    });
  }

  textBody += `--------------------------------------------------------------------\n`;
  textBody += `Relatório automático gerado diariamente para a equipe ESUDA.`;

  const rowsHtml = leadsList.map((lead, idx) => {
    const dataHora = lead.criadoEm ? formatDateTime(lead.criadoEm) : 'Data recente';
    const waLink = buildWhatsAppLink(lead.telefone, lead.nome, lead.cursoInteresse, lead.origem);
    lead = sanitizeLead(lead);
    return `
    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
      <td style="padding: 12px 10px; font-weight: bold; color: #0f172a;">${idx + 1}. ${lead.nome}</td>
      <td style="padding: 12px 10px; color: #4338ca; font-weight: 600;">${lead.cursoInteresse}</td>
      <td style="padding: 12px 10px; color: #334155;">
        ${lead.email}<br/>
        <span style="font-size: 12px; color: #64748b;">${lead.telefone || 'Não informado'}</span>
      </td>
      <td style="padding: 12px 10px; font-size: 12px; color: #64748b;">
        <strong>Material:</strong> ${lead.origem || 'Ementa'}<br/>
        <strong>Conheceu:</strong> ${lead.comoConheceu || 'N/I'}
      </td>
      <td style="padding: 12px 10px; font-size: 12px; color: #64748b;">${dataHora}</td>
      <td style="padding: 12px 10px; text-align: center;">
        <a href="${waLink}" target="_blank" style="display: inline-block; background-color: #16a34a; color: white; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 11px; font-weight: bold; text-transform: uppercase;">
          WhatsApp
        </a>
      </td>
    </tr>`;
  }).join('');

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 820px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
  <div style="background-color: #1e1b4b; padding: 24px; border-radius: 12px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 0.05em;">Faculdade ESUDA • Pós-Graduação</h2>
    <p style="margin: 6px 0 0 0; color: #a5b4fc; font-size: 14px;">Resumo Diário de Leads das Últimas 24 Horas (${dataResumoFormatada})</p>
  </div>

  <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="margin: 0; color: #0f172a; font-size: 16px;">Total de novos interessados: <strong>${leadsList.length}</strong></h3>
      <span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold;">
        Últimas 24 Horas
      </span>
    </div>

    ${leadsList.length === 0 ? `
      <div style="text-align: center; padding: 40px; color: #64748b;">
        <p style="font-size: 15px; margin: 0;">Nenhum lead novo cadastrado no período de 24 horas.</p>
      </div>
    ` : `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
              <th style="padding: 10px;">Interessado</th>
              <th style="padding: 10px;">Curso</th>
              <th style="padding: 10px;">Contato</th>
              <th style="padding: 10px;">Detalhes</th>
              <th style="padding: 10px;">Data/Hora</th>
              <th style="padding: 10px; text-align: center;">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `}
  </div>

  <div style="text-align: center; margin-top: 16px; font-size: 11px; color: #94a3b8;">
    Relatório consolidado automático enviado aos setores de Secretaria, Marketing e Coordenação de Pós-Graduação da ESUDA.
  </div>
</div>`;

  const mailDoc = {
    to: TEAM_EMAILS,
    bcc: BCC_EMAILS,
    message: {
      subject,
      text: textBody,
      html: htmlBody
    },
    subject,
    text: textBody,
    html: htmlBody,
    tipo: 'resumo_diario',
    totalLeads: leadsList.length,
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'mail'), mailDoc);
  return { count: leadsList.length, mailId: docRef.id };
}
