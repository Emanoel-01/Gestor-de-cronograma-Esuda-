// Correção pontual de ordem de aulas dos Clusters A e B (PDF 01/11)
// Uso único na coleção classes para os schedules especificados.
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  writeBatch,
  deleteField,
  DocumentReference,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

import { CargaResult } from './carga-cronogramas';
export type { CargaResult };

export type ProgressCallback = (message: string, percent: number) => void;

export const CLUSTER_A_ID = 'WadMvge0Xmc5BvVZf1nA';
export const CLUSTER_B_ID = 'kzQVwaCakQXzQIu30kMc';

export const norm = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function formatBr(d: string): string {
  if (!d) return '';
  const [ano, mes, dia] = d.split('-');
  if (!ano || !mes || !dia) return d;
  return `${dia}/${mes}/${ano}`;
}

export interface AulaAlteracao {
  id: string;
  ref: DocumentReference<DocumentData>;
  dadosAtuais: any;
  novosDados: Record<string, any>;
  descricaoLinha: string;
}

export interface AulaExclusao {
  id: string;
  ref: DocumentReference<DocumentData>;
  dadosAtuais: any;
  descricaoLinha: string;
}

export interface AulaCriacao {
  dados: Record<string, any>;
  descricaoLinha: string;
}

export interface PlanoOrdemAB {
  clusterA: {
    scheduleId: string;
    scheduleData: any;
    alteracoes: AulaAlteracao[];
  };
  clusterB: {
    scheduleId: string;
    scheduleData: any;
    alteracoes: AulaAlteracao[];
    exclusoes: AulaExclusao[];
    criacoes: AulaCriacao[];
  };
}

function baixarBackup(conteudo: unknown) {
  try {
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-ordem-ab-antes-da-correcao.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Falha ao gerar backup', e);
  }
}

export async function prepararCorrecaoOrdemAB(): Promise<
  { ok: true; resumo: string; plano: PlanoOrdemAB } |
  { ok: false; message: string }
> {
  try {
    // 1. Confirmar existência dos dois schedules
    const [schedASnap, schedBSnap] = await Promise.all([
      getDoc(doc(db, 'schedules', CLUSTER_A_ID)),
      getDoc(doc(db, 'schedules', CLUSTER_B_ID)),
    ]);

    if (!schedASnap.exists()) {
      return { ok: false, message: `Cronograma do Cluster A (${CLUSTER_A_ID}) não foi encontrado.` };
    }
    if (!schedBSnap.exists()) {
      return { ok: false, message: `Cronograma do Cluster B (${CLUSTER_B_ID}) não foi encontrado.` };
    }

    const schedAData = schedASnap.data();
    const schedBData = schedBSnap.data();

    // 2. Carregar professores necessários
    const teachersSnap = await getDocs(collection(db, 'teachers'));
    const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; name: string }));

    const profEmanoel = teachers.find(t => norm(t.name) === norm('Emanoel Silva de Amorim'));
    const profPryscilla = teachers.find(t => norm(t.name) === norm('Pryscilla de Barros Gonçalves'));
    const profVera = teachers.find(t => norm(t.name) === norm('Vera Lúcia Barbosa Silva'));
    const profTiago = teachers.find(t => norm(t.name) === norm('Tiago Lopes Silva'));

    if (!profEmanoel) {
      return { ok: false, message: 'Docente "Emanoel Silva de Amorim" não encontrado no cadastro de professores.' };
    }
    if (!profPryscilla) {
      return { ok: false, message: 'Docente "Pryscilla de Barros Gonçalves" não encontrada no cadastro de professores.' };
    }
    if (!profVera) {
      return { ok: false, message: 'Docente "Vera Lúcia Barbosa Silva" não encontrada no cadastro de professores.' };
    }
    if (!profTiago) {
      return { ok: false, message: 'Docente "Tiago Lopes Silva" não encontrado no cadastro de professores.' };
    }

    const teacherNameMap = new Map<string, string>(teachers.map(t => [t.id, t.name || '']));

    const formatProfessores = (ids?: string[], fallbackId?: string): string => {
      if (Array.isArray(ids) && ids.length > 0) {
        return ids.map(id => teacherNameMap.get(id) || id).join(', ');
      }
      if (fallbackId) {
        return teacherNameMap.get(fallbackId) || fallbackId;
      }
      return 'A definir';
    };

    const formatAlteracaoLinha = (
      cluster: 'A' | 'B',
      cursoTag: string,
      dadosAtuais: any,
      novosDados: Record<string, any>
    ): string => {
      const dataBr = formatBr(dadosAtuais.date);
      const discAtual = dadosAtuais.disciplineName || dadosAtuais.subject || 'A definir';
      const profAtual = formatProfessores(dadosAtuais.teacherIds, dadosAtuais.teacherId);

      const discNova = novosDados.disciplineName !== undefined ? novosDados.disciplineName : discAtual;
      const profNovo =
        novosDados.teacherIds !== undefined || novosDados.teacherId !== undefined
          ? formatProfessores(novosDados.teacherIds, novosDados.teacherId)
          : profAtual;

      let obsText = '';
      if (dadosAtuais.observation && novosDados.observation !== undefined) {
        obsText = ` (observação removida: ${dadosAtuais.observation})`;
      }

      return `[${cluster}] [${cursoTag}] ${dataBr}: ${discAtual} / ${profAtual} -> ${discNova} / ${profNovo}${obsText}`;
    };

    const formatExclusaoLinha = (cluster: 'A' | 'B', cursoTag: string, dadosAtuais: any): string => {
      const dataBr = formatBr(dadosAtuais.date);
      const disc = dadosAtuais.disciplineName || dadosAtuais.subject || 'A definir';
      const prof = formatProfessores(dadosAtuais.teacherIds, dadosAtuais.teacherId);
      return `APAGAR [${cluster}] ${cursoTag} ${dataBr}: ${disc} / ${prof}`;
    };

    const formatCriacaoLinha = (cluster: 'A' | 'B', cursoTag: string, dados: any): string => {
      const dataBr = formatBr(dados.date);
      const disc = dados.disciplineName || 'A definir';
      const prof = formatProfessores(dados.teacherIds, dados.teacherId);
      return `CRIAR [${cluster}] [${cursoTag}] ${dataBr}: ${disc} / ${prof}`;
    };

    // 3. Carregar cursos para resolução de IDs e nomes
    const coursesSnap = await getDocs(collection(db, 'courses'));
    const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; name: string }));

    const cursoACU = courses.find(c => norm(c.name).includes('acustica arquitetonica'));
    const cursoINT = courses.find(c => norm(c.name).includes('design de interiores'));
    const cursoNEU = courses.find(c => norm(c.name).includes('neuroarquitetura'));

    if (!cursoACU) return { ok: false, message: 'Curso de Acústica Arquitetônica não encontrado na coleção courses.' };
    if (!cursoINT) return { ok: false, message: 'Curso de Design de Interiores não encontrado na coleção courses.' };
    if (!cursoNEU) return { ok: false, message: 'Curso de Neuroarquitetura não encontrado na coleção courses.' };

    // 4. Ler classes de ambos os schedules
    const [classesASnap, classesBSnap] = await Promise.all([
      getDocs(query(collection(db, 'classes'), where('scheduleId', '==', CLUSTER_A_ID))),
      getDocs(query(collection(db, 'classes'), where('scheduleId', '==', CLUSTER_B_ID))),
    ]);

    const rawClassesA = classesASnap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() as any }));
    const rawClassesB = classesBSnap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() as any }));

    // =========================================================================
    // CLUSTER A
    // =========================================================================
    const alteracoesA: AulaAlteracao[] = [];

    // A1: 2 aulas de Manutenção Predial em 24/10/2026 e 07/11/2026
    const a1 = rawClassesA.filter(c => {
      const cName = norm(c.data.courseName || '');
      const d = c.data.date;
      return cName.includes('manutencao predial') && (d === '2026-10-24' || d === '2026-11-07');
    }).sort((a, b) => (a.data.date || '').localeCompare(b.data.date || ''));

    if (a1.length !== 2) {
      return {
        ok: false,
        message: `Cluster A (Passo A1): Esperava 2 aulas de Manutenção Predial em 24/10 e 07/11, mas encontrou ${a1.length}. Abortando.`,
      };
    }

    // A2: 2 aulas de Manutenção Predial em 03/10/2026 e 17/10/2026
    const a2 = rawClassesA.filter(c => {
      const cName = norm(c.data.courseName || '');
      const d = c.data.date;
      return cName.includes('manutencao predial') && (d === '2026-10-03' || d === '2026-10-17');
    }).sort((a, b) => (a.data.date || '').localeCompare(b.data.date || ''));

    if (a2.length !== 2) {
      return {
        ok: false,
        message: `Cluster A (Passo A2): Esperava 2 aulas de Manutenção Predial em 03/10 e 17/10, mas encontrou ${a2.length}. Abortando.`,
      };
    }

    // A3 (C1):
    // - aulas do A2 (MAN, 2026-10-03 e 2026-10-17): disciplineName, teacherIds e teacherId copiados das aulas do A1
    // - aulas do A1 (MAN, 2026-10-24 e 2026-11-07): disciplineName copiado das aulas do A2, teacherIds = [Emanoel], teacherId = Emanoel
    for (let i = 0; i < 2; i++) {
      const docA1 = a1[i];
      const docA2 = a2[i];

      const novosDadosParaA2: Record<string, any> = {
        disciplineName: docA1.data.disciplineName || '',
        teacherId: docA1.data.teacherId || (docA1.data.teacherIds?.[0] || ''),
        teacherIds: docA1.data.teacherIds || (docA1.data.teacherId ? [docA1.data.teacherId] : []),
      };

      alteracoesA.push({
        id: docA2.id,
        ref: docA2.ref,
        dadosAtuais: docA2.data,
        novosDados: novosDadosParaA2,
        descricaoLinha: formatAlteracaoLinha('A', 'MAN', docA2.data, novosDadosParaA2),
      });

      const novosDadosParaA1: Record<string, any> = {
        disciplineName: docA2.data.disciplineName || '',
        teacherId: profEmanoel.id,
        teacherIds: [profEmanoel.id],
      };

      alteracoesA.push({
        id: docA1.id,
        ref: docA1.ref,
        dadosAtuais: docA1.data,
        novosDados: novosDadosParaA1,
        descricaoLinha: formatAlteracaoLinha('A', 'MAN', docA1.data, novosDadosParaA1),
      });
    }

    // A4 (C2): 6 aulas de GPO nas datas alvo com disciplina correta, professor e remoção de observation
    const gpoDatasAlvo = ['2026-10-03', '2026-10-17', '2026-10-24', '2026-11-07', '2026-12-05', '2026-12-12'];
    const gpoAulas = rawClassesA.filter(c => {
      const cName = norm(c.data.courseName || '');
      return cName.includes('gestao de projetos e obras') && gpoDatasAlvo.includes(c.data.date);
    }).sort((a, b) => (a.data.date || '').localeCompare(b.data.date || ''));

    if (gpoAulas.length !== 6) {
      return {
        ok: false,
        message: `Cluster A (Passo A4): Esperava 6 aulas de Gestão de Projetos e Obras nas datas alvo, mas encontrou ${gpoAulas.length}. Abortando.`,
      };
    }

    for (const gpo of gpoAulas) {
      const d = gpo.data.date;
      let discName = '';
      let profTarget: { id: string; name: string };

      if (d === '2026-10-03' || d === '2026-10-17') {
        discName = 'Lean Construction, Last Planner System e Logística de Canteiro';
        profTarget = profPryscilla;
      } else if (d === '2026-10-24' || d === '2026-11-07') {
        discName = 'Eficiência Energética e Sustentabilidade na Construção Civil';
        profTarget = profVera;
      } else if (d === '2026-12-05' || d === '2026-12-12') {
        discName = 'Sistemas Informatizados de Gestão Integrada e BI (ERP, CDE e Power BI)';
        profTarget = profVera;
      } else {
        return { ok: false, message: `Data inesperada para aula de GPO: ${d}` };
      }

      const novosDadosGpo: Record<string, any> = {
        disciplineName: discName,
        teacherId: profTarget.id,
        teacherIds: [profTarget.id],
        observation: deleteField(),
      };

      alteracoesA.push({
        id: gpo.id,
        ref: gpo.ref,
        dadosAtuais: gpo.data,
        novosDados: novosDadosGpo,
        descricaoLinha: formatAlteracaoLinha('A', 'GPO', gpo.data, novosDadosGpo),
      });
    }

    // A5 (C3): Novo passo A5 — BIM em 19/09 e 26/09 (exatamente 2 aulas). teacherIds = [Tiago], teacherId = Tiago. Não mudar disciplineName.
    const a5 = rawClassesA.filter(c => {
      const cName = norm(c.data.courseName || '');
      const d = c.data.date;
      return cName.includes('tecnologia bim') && (d === '2026-09-19' || d === '2026-09-26');
    }).sort((a, b) => (a.data.date || '').localeCompare(b.data.date || ''));

    if (a5.length !== 2) {
      return {
        ok: false,
        message: `Cluster A (Passo A5): Esperava 2 aulas de Tecnologia BIM em 19/09 e 26/09, mas encontrou ${a5.length}. Abortando.`,
      };
    }

    for (const bim of a5) {
      const novosDadosBim: Record<string, any> = {
        teacherId: profTiago.id,
        teacherIds: [profTiago.id],
      };
      alteracoesA.push({
        id: bim.id,
        ref: bim.ref,
        dadosAtuais: bim.data,
        novosDados: novosDadosBim,
        descricaoLinha: formatAlteracaoLinha('A', 'BIM', bim.data, novosDadosBim),
      });
    }

    // A6 (C4): Novo passo A6 — BIM em 29/08 e 12/09 (exatamente 2 aulas). teacherIds = [Tiago], teacherId = Tiago. Não mudar disciplineName.
    const a6 = rawClassesA.filter(c => {
      const cName = norm(c.data.courseName || '');
      const d = c.data.date;
      return cName.includes('tecnologia bim') && (d === '2026-08-29' || d === '2026-09-12');
    }).sort((a, b) => (a.data.date || '').localeCompare(b.data.date || ''));

    if (a6.length !== 2) {
      return {
        ok: false,
        message: `Cluster A (Passo A6): Esperava 2 aulas de Tecnologia BIM em 29/08 e 12/09, mas encontrou ${a6.length}. Abortando.`,
      };
    }

    for (const bim of a6) {
      const novosDadosBim: Record<string, any> = {
        teacherId: profTiago.id,
        teacherIds: [profTiago.id],
      };
      alteracoesA.push({
        id: bim.id,
        ref: bim.ref,
        dadosAtuais: bim.data,
        novosDados: novosDadosBim,
        descricaoLinha: formatAlteracaoLinha('A', 'BIM', bim.data, novosDadosBim),
      });
    }

    if (alteracoesA.length !== 14) {
      return {
        ok: false,
        message: `Cluster A: Total de alterações esperado é 14, mas gerou ${alteracoesA.length}. Abortando.`,
      };
    }

    // =========================================================================
    // CLUSTER B
    // =========================================================================
    const alteracoesB: AulaAlteracao[] = [];
    const exclusoesB: AulaExclusao[] = [];
    const criacoesB: AulaCriacao[] = [];

    // B1: 2 aulas de ACU em 19/09 e 26/09
    const b1 = rawClassesB.filter(c => {
      const cName = norm(c.data.courseName || '');
      const d = c.data.date;
      return cName.includes('acustica arquitetonica') && (d === '2026-09-19' || d === '2026-09-26');
    }).sort((a, b) => (a.data.date || '').localeCompare(b.data.date || ''));

    if (b1.length !== 2) {
      return {
        ok: false,
        message: `Cluster B (Passo B1): Esperava 2 aulas de Acústica Arquitetônica em 19/09 e 26/09, mas encontrou ${b1.length}. Abortando.`,
      };
    }

    // B2: 2 aulas de ACU em 24/10 e 07/11
    const b2 = rawClassesB.filter(c => {
      const cName = norm(c.data.courseName || '');
      const d = c.data.date;
      return cName.includes('acustica arquitetonica') && (d === '2026-10-24' || d === '2026-11-07');
    }).sort((a, b) => (a.data.date || '').localeCompare(b.data.date || ''));

    if (b2.length !== 2) {
      return {
        ok: false,
        message: `Cluster B (Passo B2): Esperava 2 aulas de Acústica Arquitetônica em 24/10 e 07/11, mas encontrou ${b2.length}. Abortando.`,
      };
    }

    // Snapshot das aulas de B2 lido ANTES de qualquer alteração (para uso no C7)
    const b2Snapshot = b2.map(c => ({
      disciplineName: c.data.disciplineName || c.data.subject || '',
      teacherId: c.data.teacherId || (c.data.teacherIds?.[0] || ''),
      teacherIds: c.data.teacherIds || (c.data.teacherId ? [c.data.teacherId] : []),
    }));

    // B3 (C5): 2 aulas comuns em 03/10 e 17/10 com Design Thinking (isCommon === true E contém "design thinking")
    const b3 = rawClassesB.filter(c => {
      const d = c.data.date;
      const isDate = d === '2026-10-03' || d === '2026-10-17';
      const isDt = c.data.isCommon === true && norm(c.data.disciplineName || '').includes('design thinking');
      return isDate && isDt;
    }).sort((a, b) => (a.data.date || '').localeCompare(b.data.date || ''));

    if (b3.length !== 2) {
      return {
        ok: false,
        message: `Cluster B (Passo B3): Esperava 2 aulas comuns de Design Thinking em 03/10 e 17/10, mas encontrou ${b3.length}. Abortando.`,
      };
    }

    const b3ByDate = new Map(b3.map(c => [c.data.date, c.data]));

    // Guardar a disciplina original de ACU de B1 para passar para B2
    const discOriginalB1 = b1[0].data.disciplineName || 'Fundamentos de Acústica: Física do Som, Gráficos e Normas de Desempenho';
    const profOriginalB1Id = b1[0].data.teacherId || '';
    const profOriginalB1Ids = b1[0].data.teacherIds || (profOriginalB1Id ? [profOriginalB1Id] : []);

    // B5.1: Reatribuir B1 (datas 19/09 e 26/09 em ACU) para Design Thinking com Emanoel EAD
    for (let i = 0; i < 2; i++) {
      const docB1 = b1[i];
      const novosDadosB1: Record<string, any> = {
        disciplineName: 'Solução Criativa de Problemas Complexos (Design Thinking) (EAD)',
        teacherId: profEmanoel.id,
        teacherIds: [profEmanoel.id],
        modalidade: 'EAD',
        isCommon: false,
        courseId: cursoACU.id,
        courseName: cursoACU.name,
        sessionCount: 2,
        sessionGapWeeks: 1,
        classNumber: i + 1,
      };

      alteracoesB.push({
        id: docB1.id,
        ref: docB1.ref,
        dadosAtuais: docB1.data,
        novosDados: novosDadosB1,
        descricaoLinha: formatAlteracaoLinha('B', 'ACU', docB1.data, novosDadosB1),
      });
    }

    // B5.2: Reatribuir B2 (datas 24/10 e 07/11 em ACU) para a disciplina presencial de ACU
    for (let i = 0; i < 2; i++) {
      const docB2 = b2[i];
      const novosDadosB2: Record<string, any> = {
        disciplineName: discOriginalB1,
        modalidade: 'Presencial',
        isCommon: false,
        courseId: cursoACU.id,
        courseName: cursoACU.name,
        sessionCount: 2,
        sessionGapWeeks: 2,
        classNumber: i + 1,
      };
      if (profOriginalB1Id) {
        novosDadosB2.teacherId = profOriginalB1Id;
        novosDadosB2.teacherIds = profOriginalB1Ids;
      }

      alteracoesB.push({
        id: docB2.id,
        ref: docB2.ref,
        dadosAtuais: docB2.data,
        novosDados: novosDadosB2,
        descricaoLinha: formatAlteracaoLinha('B', 'ACU', docB2.data, novosDadosB2),
      });
    }

    // B5.3: Excluir as 2 aulas comuns de B3 (datas 03/10 e 17/10)
    for (const docB3 of b3) {
      exclusoesB.push({
        id: docB3.id,
        ref: docB3.ref,
        dadosAtuais: docB3.data,
        descricaoLinha: formatExclusaoLinha('B', 'COMUM', docB3.data),
      });
    }

    // B5.4 (C6): Criar as 4 aulas de DT para INT e NEU (EAD) em 03/10 e 17/10. order e classNumber copiados da aula do B3 da mesma data.
    const datasDt = ['2026-10-03', '2026-10-17'];
    for (let i = 0; i < datasDt.length; i++) {
      const dtDate = datasDt[i];
      const b3Ref = b3ByDate.get(dtDate);
      const targetOrder = b3Ref?.order ?? (i + 1);
      const targetClassNumber = b3Ref?.classNumber ?? (i + 1);

      // Para INT
      const dadosInt = {
        scheduleId: CLUSTER_B_ID,
        courseId: cursoINT.id,
        courseName: cursoINT.name,
        disciplineName: 'Solução Criativa de Problemas Complexos (Design Thinking) (EAD)',
        date: dtDate,
        classNumber: targetClassNumber,
        order: targetOrder,
        isCommon: false,
        modalidade: 'EAD',
        teacherId: profEmanoel.id,
        teacherIds: [profEmanoel.id],
        sessionCount: 2,
        sessionGapWeeks: 1,
      };
      criacoesB.push({
        dados: dadosInt,
        descricaoLinha: formatCriacaoLinha('B', 'INT', dadosInt),
      });

      // Para NEU
      const dadosNeu = {
        scheduleId: CLUSTER_B_ID,
        courseId: cursoNEU.id,
        courseName: cursoNEU.name,
        disciplineName: 'Solução Criativa de Problemas Complexos (Design Thinking) (EAD)',
        date: dtDate,
        classNumber: targetClassNumber,
        order: targetOrder,
        isCommon: false,
        modalidade: 'EAD',
        teacherId: profEmanoel.id,
        teacherIds: [profEmanoel.id],
        sessionCount: 2,
        sessionGapWeeks: 1,
      };
      criacoesB.push({
        dados: dadosNeu,
        descricaoLinha: formatCriacaoLinha('B', 'NEU', dadosNeu),
      });
    }

    // B5.5 (C7): Criar as 2 aulas de ACU em 03/10 e 17/10 copiando disciplina e professores do B2 snapshot da mesma posição. order e classNumber copiados do B3 da mesma data.
    const datasAcu = ['2026-10-03', '2026-10-17'];
    for (let i = 0; i < datasAcu.length; i++) {
      const acuDate = datasAcu[i];
      const b3Ref = b3ByDate.get(acuDate);
      const targetOrder = b3Ref?.order ?? (i + 1);
      const targetClassNumber = b3Ref?.classNumber ?? (i + 1);

      const b2Ref = b2Snapshot[i];

      const dadosAcu = {
        scheduleId: CLUSTER_B_ID,
        courseId: cursoACU.id,
        courseName: cursoACU.name,
        disciplineName: b2Ref.disciplineName,
        date: acuDate,
        classNumber: targetClassNumber,
        order: targetOrder,
        isCommon: false,
        modalidade: 'Presencial',
        teacherId: b2Ref.teacherId,
        teacherIds: b2Ref.teacherIds,
        sessionCount: 2,
        sessionGapWeeks: 2,
      };
      criacoesB.push({
        dados: dadosAcu,
        descricaoLinha: formatCriacaoLinha('B', 'ACU', dadosAcu),
      });
    }

    if (alteracoesB.length !== 4) {
      return { ok: false, message: `Cluster B: Esperava 4 alterações, mas gerou ${alteracoesB.length}. Abortando.` };
    }
    if (exclusoesB.length !== 2) {
      return { ok: false, message: `Cluster B: Esperava 2 exclusões, mas gerou ${exclusoesB.length}. Abortando.` };
    }
    if (criacoesB.length !== 6) {
      return { ok: false, message: `Cluster B: Esperava 6 criações, mas gerou ${criacoesB.length}. Abortando.` };
    }

    // Construção do resumo linha por linha (C8)
    const resumoLinhas: string[] = [
      'PLANO DE CORREÇÃO DE ORDEM — CLUSTERS A E B (PDF 01/11)',
      '',
      '--- CLUSTER A (14 alterações) ---',
      ...alteracoesA.map(a => a.descricaoLinha),
      '',
      '--- CLUSTER B (4 alterações, 2 apagadas, 6 criadas) ---',
      ...alteracoesB.map(a => a.descricaoLinha),
      ...exclusoesB.map(e => e.descricaoLinha),
      ...criacoesB.map(c => c.descricaoLinha),
      '',
      'TOTAIS:',
      'Cluster A 14 alteradas; Cluster B 4 alteradas, 2 apagadas, 6 criadas.',
      '',
      'Um arquivo de backup JSON ("backup-ordem-ab-antes-da-correcao.json") será baixado automaticamente antes da gravação.',
    ];

    return {
      ok: true,
      resumo: resumoLinhas.join('\n'),
      plano: {
        clusterA: {
          scheduleId: CLUSTER_A_ID,
          scheduleData: schedAData,
          alteracoes: alteracoesA,
        },
        clusterB: {
          scheduleId: CLUSTER_B_ID,
          scheduleData: schedBData,
          alteracoes: alteracoesB,
          exclusoes: exclusoesB,
          criacoes: criacoesB,
        },
      },
    };
  } catch (e: any) {
    console.error(e);
    return { ok: false, message: 'Erro ao preparar correção: ' + (e?.message || String(e)) };
  }
}

export async function aplicarCorrecaoOrdemAB(
  plano: PlanoOrdemAB,
  onProgress?: ProgressCallback
): Promise<CargaResult> {
  const p = (m: string, n: number) => onProgress?.(m, n);
  try {
    p('Baixando backup...', 20);
    baixarBackup({
      geradoEm: new Date().toISOString(),
      scheduleA: { id: plano.clusterA.scheduleId, ...plano.clusterA.scheduleData },
      scheduleB: { id: plano.clusterB.scheduleId, ...plano.clusterB.scheduleData },
      classesAfetadasClusterA: plano.clusterA.alteracoes.map(a => ({ id: a.id, ...a.dadosAtuais })),
      classesAfetadasClusterB: [
        ...plano.clusterB.alteracoes.map(a => ({ id: a.id, ...a.dadosAtuais })),
        ...plano.clusterB.exclusoes.map(a => ({ id: a.id, ...a.dadosAtuais })),
      ],
    });

    p('Preparando operações em lote...', 40);
    const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];

    // Cluster A: 14 alterações
    for (const alt of plano.clusterA.alteracoes) {
      ops.push(b => b.update(alt.ref, alt.novosDados));
    }

    // Cluster B: 4 alterações
    for (const alt of plano.clusterB.alteracoes) {
      ops.push(b => b.update(alt.ref, alt.novosDados));
    }

    // Cluster B: 2 exclusões
    for (const exc of plano.clusterB.exclusoes) {
      ops.push(b => b.delete(exc.ref));
    }

    // Cluster B: 6 criações
    for (const cri of plano.clusterB.criacoes) {
      const newRef = doc(collection(db, 'classes'));
      ops.push(b => b.set(newRef, cri.dados));
    }

    p('Gravando no banco...', 60);
    for (let i = 0; i < ops.length; i += 450) {
      const batch = writeBatch(db);
      ops.slice(i, i + 450).forEach(op => op(batch));
      await batch.commit();
      p('Gravando...', 60 + Math.round((i / ops.length) * 35));
    }

    p('Concluído.', 100);

    const totalUpdated = plano.clusterA.alteracoes.length + plano.clusterB.alteracoes.length;
    const totalDeleted = plano.clusterB.exclusoes.length;
    const totalCreated = plano.clusterB.criacoes.length;

    return {
      success: true,
      message: `Ordem dos Clusters A e B corrigida com sucesso! (${totalUpdated} aulas atualizadas, ${totalDeleted} aulas excluídas, ${totalCreated} aulas criadas).`,
      stats: {
        teachersCreated: 0,
        teachersUpdated: 0,
        schedulesCreated: 0,
        schedulesUpdated: 0,
        classesDeleted: totalDeleted,
        classesCreated: totalCreated,
      },
    };
  } catch (e: any) {
    console.error(e);
    return {
      success: false,
      message: 'Erro durante a gravação: ' + (e?.message || String(e)) + '. Use o arquivo de backup baixado caso necessário.',
    };
  }
}
