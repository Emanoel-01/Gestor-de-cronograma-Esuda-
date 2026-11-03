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

    if (!profEmanoel) {
      return { ok: false, message: 'Docente "Emanoel Silva de Amorim" não encontrado no cadastro de professores.' };
    }
    if (!profPryscilla) {
      return { ok: false, message: 'Docente "Pryscilla de Barros Gonçalves" não encontrada no cadastro de professores.' };
    }
    if (!profVera) {
      return { ok: false, message: 'Docente "Vera Lúcia Barbosa Silva" não encontrada no cadastro de professores.' };
    }

    // Opcional para ILU: Hilma Santos Ferreira
    const profHilma = teachers.find(t => norm(t.name).includes('hilma'));

    // 3. Carregar cursos para resolução de IDs e nomes
    const coursesSnap = await getDocs(collection(db, 'courses'));
    const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; name: string }));

    const cursoMAN = courses.find(c => norm(c.name).includes('manutencao predial'));
    const cursoGPO = courses.find(c => norm(c.name).includes('gestao de projetos e obras'));
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

    // A3: Inverter disciplina e professor entre A1 e A2 (4 atualizações)
    // a1[0] (24/10) <-> a2[0] (03/10)
    // a1[1] (07/11) <-> a2[1] (17/10)
    for (let i = 0; i < 2; i++) {
      const docA1 = a1[i];
      const docA2 = a2[i];

      const novosDadosParaA1: Record<string, any> = {
        disciplineName: docA2.data.disciplineName || '',
        teacherId: docA2.data.teacherId || '',
        teacherIds: docA2.data.teacherIds || (docA2.data.teacherId ? [docA2.data.teacherId] : []),
      };
      if (docA2.data.subject) novosDadosParaA1.subject = docA2.data.subject;

      alteracoesA.push({
        id: docA1.id,
        ref: docA1.ref,
        dadosAtuais: docA1.data,
        novosDados: novosDadosParaA1,
        descricaoLinha: `[Cluster A - MAN] ${formatBr(docA1.data.date)}: disciplina trocada para "${novosDadosParaA1.disciplineName}"`,
      });

      const novosDadosParaA2: Record<string, any> = {
        disciplineName: docA1.data.disciplineName || '',
        teacherId: docA1.data.teacherId || '',
        teacherIds: docA1.data.teacherIds || (docA1.data.teacherId ? [docA1.data.teacherId] : []),
      };
      if (docA1.data.subject) novosDadosParaA2.subject = docA1.data.subject;

      alteracoesA.push({
        id: docA2.id,
        ref: docA2.ref,
        dadosAtuais: docA2.data,
        novosDados: novosDadosParaA2,
        descricaoLinha: `[Cluster A - MAN] ${formatBr(docA2.data.date)}: disciplina trocada para "${novosDadosParaA2.disciplineName}"`,
      });
    }

    // A4: 6 aulas de GPO nas datas alvo: 03/10, 17/10, 24/10, 07/11, 05/12, 12/12
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
      const novosDadosGpo: Record<string, any> = {
        observation: deleteField(),
      };
      // Se a data for 03/10 ou 17/10, vincular Pryscilla de Barros Gonçalves
      if (['2026-10-03', '2026-10-17'].includes(gpo.data.date)) {
        novosDadosGpo.teacherId = profPryscilla.id;
        novosDadosGpo.teacherIds = [profPryscilla.id];
      }
      // Se a data for 05/12 ou 12/12, vincular Vera Lúcia Barbosa Silva
      if (['2026-12-05', '2026-12-12'].includes(gpo.data.date)) {
        novosDadosGpo.teacherId = profVera.id;
        novosDadosGpo.teacherIds = [profVera.id];
      }

      alteracoesA.push({
        id: gpo.id,
        ref: gpo.ref,
        dadosAtuais: gpo.data,
        novosDados: novosDadosGpo,
        descricaoLinha: `[Cluster A - GPO] ${formatBr(gpo.data.date)} (${gpo.data.disciplineName}): remoção de observação de conflito`,
      });
    }

    if (alteracoesA.length !== 10) {
      return {
        ok: false,
        message: `Cluster A: Total de alterações esperado é 10, mas gerou ${alteracoesA.length}. Abortando.`,
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

    // B3: 2 aulas comuns em 03/10 e 17/10 com Design Thinking
    const b3 = rawClassesB.filter(c => {
      const d = c.data.date;
      const isDate = d === '2026-10-03' || d === '2026-10-17';
      const isDt = norm(c.data.disciplineName || '').includes('design thinking') || c.data.isCommon;
      return isDate && isDt;
    }).sort((a, b) => (a.data.date || '').localeCompare(b.data.date || ''));

    if (b3.length !== 2) {
      return {
        ok: false,
        message: `Cluster B (Passo B3): Esperava 2 aulas comuns de Design Thinking em 03/10 e 17/10, mas encontrou ${b3.length}. Abortando.`,
      };
    }

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
        descricaoLinha: `[Cluster B - ACU] ${formatBr(docB1.data.date)}: reatribuída para Design Thinking (EAD - Emanoel Silva de Amorim)`,
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
        descricaoLinha: `[Cluster B - ACU] ${formatBr(docB2.data.date)}: alocada disciplina presencial "${discOriginalB1}"`,
      });
    }

    // B5.3: Excluir as 2 aulas comuns de B3 (datas 03/10 e 17/10)
    for (const docB3 of b3) {
      exclusoesB.push({
        id: docB3.id,
        ref: docB3.ref,
        dadosAtuais: docB3.data,
        descricaoLinha: `[Cluster B - Comum] ${formatBr(docB3.data.date)} (${docB3.data.disciplineName}): exclusão de aula comum de Design Thinking`,
      });
    }

    // B5.4: Criar 4 aulas de DT para INT e NEU (EAD) em 19/09 e 26/09
    const datasDt = ['2026-09-19', '2026-09-26'];
    for (let i = 0; i < datasDt.length; i++) {
      const dtDate = datasDt[i];
      // Para INT
      criacoesB.push({
        dados: {
          scheduleId: CLUSTER_B_ID,
          courseId: cursoINT.id,
          courseName: cursoINT.name,
          disciplineName: 'Solução Criativa de Problemas Complexos (Design Thinking) (EAD)',
          date: dtDate,
          classNumber: i + 1,
          order: 8,
          isCommon: false,
          modalidade: 'EAD',
          teacherId: profEmanoel.id,
          teacherIds: [profEmanoel.id],
          sessionCount: 2,
          sessionGapWeeks: 1,
        },
        descricaoLinha: `[Cluster B - INT] ${formatBr(dtDate)}: criação de aula Design Thinking (EAD - Emanoel Silva de Amorim)`,
      });

      // Para NEU
      criacoesB.push({
        dados: {
          scheduleId: CLUSTER_B_ID,
          courseId: cursoNEU.id,
          courseName: cursoNEU.name,
          disciplineName: 'Solução Criativa de Problemas Complexos (Design Thinking) (EAD)',
          date: dtDate,
          classNumber: i + 1,
          order: 8,
          isCommon: false,
          modalidade: 'EAD',
          teacherId: profEmanoel.id,
          teacherIds: [profEmanoel.id],
          sessionCount: 2,
          sessionGapWeeks: 1,
        },
        descricaoLinha: `[Cluster B - NEU] ${formatBr(dtDate)}: criação de aula Design Thinking (EAD - Emanoel Silva de Amorim)`,
      });
    }

    // B5.5: Criar 2 aulas de Iluminação para ACU Presencial em 03/10 e 17/10
    const datasIlu = ['2026-10-03', '2026-10-17'];
    for (let i = 0; i < datasIlu.length; i++) {
      const iluDate = datasIlu[i];
      criacoesB.push({
        dados: {
          scheduleId: CLUSTER_B_ID,
          courseId: cursoACU.id,
          courseName: cursoACU.name,
          disciplineName: 'FUNDAMENTOS DE ILUMINAÇÃO: TEORIA DA LUZ, EFICIÊNCIA E NORMATIZAÇÃO',
          date: iluDate,
          classNumber: i + 1,
          order: 9,
          isCommon: false,
          modalidade: 'Presencial',
          teacherId: profHilma ? profHilma.id : '',
          teacherIds: profHilma ? [profHilma.id] : [],
          sessionCount: 2,
          sessionGapWeeks: 2,
        },
        descricaoLinha: `[Cluster B - ACU] ${formatBr(iluDate)}: criação de aula presencial "Fundamentos de Iluminação"`,
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

    // Construção do resumo linha por linha
    const resumoLinhas: string[] = [
      'PLANO DE CORREÇÃO DE ORDEM — CLUSTERS A E B (PDF 01/11)',
      '',
      '--- CLUSTER A (10 alterações) ---',
      ...alteracoesA.map(a => `• ${a.descricaoLinha}`),
      '',
      '--- CLUSTER B (4 alterações, 2 exclusões, 6 criações) ---',
      ...alteracoesB.map(a => `• [Atualização] ${a.descricaoLinha}`),
      ...exclusoesB.map(e => `• [Exclusão] ${e.descricaoLinha}`),
      ...criacoesB.map(c => `• [Criação] ${c.descricaoLinha}`),
      '',
      'TOTAIS:',
      `• Aulas atualizadas: ${alteracoesA.length + alteracoesB.length} (Cluster A: 10, Cluster B: 4)`,
      `• Aulas excluídas: ${exclusoesB.length} (Cluster B: 2)`,
      `• Aulas criadas: ${criacoesB.length} (Cluster B: 6)`,
      '',
      'Um arquivo de backup JSON ("backup-ordem-ab-antes-da-correcao.json") será baixado automaticamente antes da gravação.'
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

    // Cluster A: 10 alterações
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
