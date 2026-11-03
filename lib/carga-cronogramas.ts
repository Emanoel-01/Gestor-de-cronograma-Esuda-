// Correção do Cluster C — 01/11/2026
// Substitui a carga antiga. Mantém o nome da função e o formato do resultado
// para reaproveitar o botão e a janela de progresso que já existem no painel.
import {
  collection, getDocs, query, where, doc, writeBatch, serverTimestamp,
  DocumentReference, DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

export interface CargaResult {
  success: boolean;
  message: string;
  stats?: {
    teachersCreated: number;
    teachersUpdated: number;
    schedulesCreated: number;
    schedulesUpdated: number;
    classesDeleted: number;
    classesCreated: number;
  };
}
export type ProgressCallback = (message: string, percent: number) => void;

export interface AulaAntiga {
  id: string;
  ref: DocumentReference<DocumentData>;
  data: any;
}

export interface PlanoClusterC {
  scheduleId: string;
  scheduleAtual: any;
  aulasAntigas: AulaAntiga[];
  cursoId: Record<string, string>;
  cursoNome: Record<string, string>;
  teacherIdMap: Record<string, string>;
}

const CLUSTER_C = {
  className: 'CLUSTER C — BIM / GESTÃO DE PROJETOS E OBRAS / ACÚSTICA ARQUITETÔNICA E ILUMINAÇÃO',
  startDate: '2027-01-16',
  cursos: {
    GPO: 'gestao de projetos e obras',
    BIM: 'tecnologia bim',
    ACU: 'acustica arquitetonica',
  } as Record<string, string>,
};

// [ordem, curso, disciplina, professor (null = EAD ou a definir), datas]
type Linha = [number, string, string, string | null, string[]];
const AULAS: Linha[] = [
  [ 1, 'COMUM', "Gestão de Escritórios de Arquitetura e Engenharia: Branding e Precificação", "Paulo Ney Alves Barata", ['2027-01-16', '2027-01-23']],
  [ 2, 'COMUM', "Marketing Pessoal e Digital para Arquitetos e Engenheiros", "Cassia Albuquerque", ['2027-01-30', '2027-02-13']],
  [ 3, 'COMUM', "Metodologia da Pesquisa e Didática do Ensino Superior (EAD)", "Emanoel Silva de Amorim", ['2027-02-20', '2027-02-27']],
  [ 4, 'COMUM', "Inteligência Artificial Aplicada", "Emanoel Silva de Amorim", ['2027-03-13', '2027-03-20']],
  [ 5, 'COMUM', "Competências Estratégicas, Liderança e Alta Performance (EAD)", "Emanoel Silva de Amorim", ['2027-04-03', '2027-04-10']],
  [ 6, 'COMUM', "Práticas Simuladas: Estrutura Legal, Contábil e Empreendedorismo", "Nilson da Cunha Ximenes", ['2027-04-17', '2027-04-24']],
  [ 7, 'COMUM', "Novas Fontes de Receita: Elaboração de Laudos e Perícias (EAD)", "Emanoel Silva de Amorim", ['2027-05-08', '2027-05-15']],
  [ 8, 'COMUM', "Solução Criativa de Problemas Complexos (Design Thinking) (EAD)", "Emanoel Silva de Amorim", ['2027-05-22', '2027-05-29']],
  [10, 'COMUM', "Negociação e Gestão de Conflitos (EAD)", "Emanoel Silva de Amorim", ['2027-06-19', '2027-06-26']],
  [ 9, 'GPO', "Técnicas de Coordenação e Compatibilização de Projetos", "Tiago Lopes Silva", ['2027-06-05', '2027-06-12']],
  [11, 'GPO', "Técnicas de Orçamentos, Cobranças e Custos de Projetos", "Priscila Raffi Rodrigues", ['2027-07-03', '2027-07-10']],
  [12, 'GPO', "Técnicas de Orçamentos, Cobranças e Custos de Obras", "Dieska Rayane da Silva Gomes", ['2027-07-24', '2027-07-31']],
  [13, 'GPO', "Técnicas de Planejamento e Coordenação de Obras", "Emanoel Silva de Amorim", ['2027-08-07', '2027-08-14']],
  [14, 'GPO', "Lean Construction, Last Planner System e Logística de Canteiro", "Pryscilla de Barros Gonçalves", ['2027-08-21', '2027-08-28']],
  [15, 'GPO', "Engenharia de Segurança e Normas de Desempenho", "Florencio Absalão da Silva Filho", ['2027-09-04', '2027-09-11']],
  [16, 'GPO', "Eficiência Energética e Sustentabilidade na Construção Civil", "Vera Lúcia Barbosa Silva", ['2027-09-18', '2027-09-25']],
  [17, 'GPO', "Administração Contratual, Medições e Gestão de Pleitos (Claims)", "Priscila Raffi Rodrigues", ['2027-10-02', '2027-10-09']],
  [18, 'GPO', "Sistemas Informatizados de Gestão Integrada e BI (ERP, CDE e Power BI)", "Vera Lúcia Barbosa Silva", ['2027-10-23', '2027-10-30']],
  [ 9, 'BIM', "BIM Conceituação Básica do Planejamento ao Pós-Obra", "Gildo Alves de Souza Júnior", ['2027-06-05', '2027-06-12']],
  [11, 'BIM', "Modelagem Arquitetônica", "Nathálya Aguiar Leal de Melo Souto Maior Arruda", ['2027-07-03', '2027-07-10']],
  [12, 'BIM', "Colaboração e Integração com CDE", "Tiago Lopes Silva", ['2027-07-24', '2027-07-31']],
  [13, 'BIM', "Modelagem Estrutural", "Emmanoel Roberto da Silva Neri", ['2027-08-07', '2027-08-14']],
  [14, 'BIM', "Modelagem das Instalações", "Tiago Lopes Silva", ['2027-08-21', '2027-08-28']],
  [15, 'BIM', "BIM no Planejamento e Orçamentação", "Tiago Lopes Silva", ['2027-09-04', '2027-09-11']],
  [16, 'BIM', "Gestão e Compatibilização de Projetos", "Tiago Lopes Silva", ['2027-09-18', '2027-09-25']],
  [17, 'BIM', "Modelagem Paramétrica", "Emmanoel Roberto da Silva Neri", ['2027-10-02', '2027-10-09']],
  [18, 'BIM', "BIM, Análise de Dados e IA", "Gildo Alves de Souza Júnior", ['2027-10-23', '2027-10-30']],
  [ 9, 'ACU', "FUNDAMENTOS DE ACÚSTICA: FÍSICA DO SOM, GRÁFICOS E NORMAS DE DESEMPENHO", "Renata Eskinazi Leça", ['2027-06-05', '2027-06-12']],
  [11, 'ACU', "FUNDAMENTOS DE ILUMINAÇÃO: TEORIA DA LUZ, EFICIÊNCIA E NORMATIZAÇÃO", "Hilma de Oliveira Santos Ferreira", ['2027-07-03', '2027-07-10']],
  [12, 'ACU', "ACÚSTICA ARQUITETÔNICA PARA AMBIENTES DE CONVIVÊNCIA, HOSPITALIDADE E TRABALHO", "Francisco Buarque", ['2027-07-24', '2027-07-31']],
  [13, 'ACU', "LUMINOTÉCNICA PARA AMBIENTES DE CONVIVÊNCIA, HOSPITALIDADE E TRABALHO", null, ['2027-08-07', '2027-08-14']],
  [14, 'ACU', "ACÚSTICA ARQUITETÔNICA PARA AMBIENTES DE PERFORMANCE E EVENTOS", "Francisco Ellihimas", ['2027-08-21', '2027-08-28']],
  [15, 'ACU', "LUMINOTÉCNICA PARA AMBIENTES DE PERFORMANCE E EVENTOS", "Ramon Araújo", ['2027-09-04', '2027-09-11']],
  [16, 'ACU', "ENGENHARIA ACÚSTICA PARA GRANDES AMBIENTES E COMPLEXOS", "Francisco Ellihimas", ['2027-09-18', '2027-09-25']],
  [17, 'ACU', "ILUMINAÇÃO EXTERNA: JARDINS, PRAÇAS E EDIFICAÇÕES HISTÓRICAS", "Hilma de Oliveira Santos Ferreira", ['2027-10-02', '2027-10-09']],
  [18, 'ACU', "ACÚSTICA NA ESCALA DA CIDADE", "Francisco Ellihimas", ['2027-10-23']],
  [19, 'ACU', "ILUMINAÇÃO NA ESCALA DA CIDADE", null, ['2027-10-30']],
];

const norm = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function baixarBackup(conteudo: unknown) {
  try {
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-cluster-c-antes-da-correcao.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Falha ao gerar backup', e);
  }
}

export async function prepararCorrecaoClusterC(): Promise<
  { ok: true; resumo: string; plano: PlanoClusterC } |
  { ok: false; message: string }
> {
  try {
    const schedSnap = await getDocs(collection(db, 'schedules'));
    const candidatos = schedSnap.docs.filter(d => {
      const s = d.data() as any;
      return norm(s.className).startsWith('cluster c') || ['2026-10-23', '2026-10-24'].includes(s.startDate);
    });
    if (candidatos.length === 0) {
      return { ok: false, message: 'Nenhum cronograma do Cluster C foi encontrado. Nada foi alterado.' };
    }
    if (candidatos.length > 1) {
      const nomes = candidatos.map(d => (d.data() as any).className).join(' | ');
      return { ok: false, message: 'Encontrei mais de um cronograma que parece ser o Cluster C: ' + nomes + '. Nada foi alterado.' };
    }
    const sched = candidatos[0];
    const atual = sched.data() as any;

    const aulasSnap = await getDocs(query(collection(db, 'classes'), where('scheduleId', '==', sched.id)));

    const coursesSnap = await getDocs(collection(db, 'courses'));
    const cursoId: Record<string, string> = {};
    const cursoNome: Record<string, string> = {};
    for (const [cod, chave] of Object.entries(CLUSTER_C.cursos)) {
      const achado = coursesSnap.docs.find(c => norm((c.data() as any).name).includes(chave));
      if (!achado) {
        return { ok: false, message: 'Não encontrei o curso "' + chave + '" na coleção courses. Nada foi alterado.' };
      }
      cursoId[cod] = achado.id;
      cursoNome[cod] = (achado.data() as any).name;
    }

    const teachersSnap = await getDocs(collection(db, 'teachers'));
    const profId = (nome: string | null): string => {
      if (!nome) return '';
      const n = norm(nome);
      const t = teachersSnap.docs.find(d => {
        const tn = norm((d.data() as any).name);
        return tn === n;
      });
      return t ? t.id : '';
    };

    const teacherIdMap: Record<string, string> = {};
    const naoEncontrados: string[] = [];
    for (const [, , , prof] of AULAS) {
      if (prof && !teacherIdMap[prof]) {
        const tid = profId(prof);
        if (!tid) {
          if (!naoEncontrados.includes(prof)) {
            naoEncontrados.push(prof);
          }
        } else {
          teacherIdMap[prof] = tid;
        }
      }
    }

    if (naoEncontrados.length > 0) {
      return {
        ok: false,
        message: 'Professores não encontrados no cadastro: ' + naoEncontrados.join(', ') + '. Nada foi alterado.'
      };
    }

    const totalNovas = AULAS.reduce((s, l) => s + l[4].length, 0);
    const resumo =
      'CLUSTER C ENCONTRADO\n\n' +
      'Nome atual: ' + atual.className + '\n' +
      'Início atual: ' + atual.startDate + '\n' +
      'Cursos atuais: ' + (atual.courseIds?.length ?? 0) + '\n' +
      'Aulas atuais: ' + aulasSnap.size + '\n\n' +
      'SERÁ FEITO\n' +
      '• Início passa para 16/01/2027\n' +
      '• Ficam só 3 cursos: ' + Object.values(cursoNome).join(', ') + '\n' +
      '• Apagar ' + aulasSnap.size + ' aulas antigas e criar ' + totalNovas + ' novas\n' +
      '\nUm arquivo de backup será baixado antes. Os Clusters A e B não serão tocados.';

    const aulasAntigas: AulaAntiga[] = aulasSnap.docs.map(d => ({
      id: d.id,
      ref: d.ref,
      data: d.data(),
    }));

    return {
      ok: true,
      resumo,
      plano: {
        scheduleId: sched.id,
        scheduleAtual: atual,
        aulasAntigas,
        cursoId,
        cursoNome,
        teacherIdMap,
      }
    };
  } catch (e: any) {
    console.error(e);
    return { ok: false, message: 'Erro: ' + (e?.message || String(e)) };
  }
}

export async function aplicarCorrecaoClusterC(
  plano: PlanoClusterC,
  onProgress?: ProgressCallback
): Promise<CargaResult> {
  const p = (m: string, n: number) => onProgress?.(m, n);
  try {
    p('Baixando backup...', 45);
    baixarBackup({
      geradoEm: new Date().toISOString(),
      schedule: { id: plano.scheduleId, ...plano.scheduleAtual },
      classes: plano.aulasAntigas.map(a => ({ id: a.id, ...a.data })),
    });

    p('Apagando aulas antigas...', 55);
    const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
    plano.aulasAntigas.forEach(a => ops.push(b => b.delete(a.ref)));

    ops.push(b => b.update(doc(db, 'schedules', plano.scheduleId), {
      className: CLUSTER_C.className,
      startDate: CLUSTER_C.startDate,
      status: 'active',
      courseIds: ['GPO', 'BIM', 'ACU'].map(c => plano.cursoId[c]),
      courseNames: ['GPO', 'BIM', 'ACU'].map(c => plano.cursoNome[c]),
      lastUpdated: serverTimestamp(),
    }));

    let criadas = 0;
    for (const [ordem, curso, disciplina, prof, datas] of AULAS) {
      const comum = curso === 'COMUM';
      const tid = prof ? (plano.teacherIdMap[prof] || '') : '';
      datas.forEach((data, i) => {
        const ref = doc(collection(db, 'classes'));
        ops.push(b => b.set(ref, {
          scheduleId: plano.scheduleId,
          date: data,
          disciplineName: disciplina,
          order: ordem,
          classNumber: datas.length > 1 ? i + 1 : 1,
          isCommon: comum,
          courseId: comum ? 'all' : plano.cursoId[curso],
          courseName: comum ? 'Fase Comum' : plano.cursoNome[curso],
          teacherId: tid,
          teacherIds: tid ? [tid] : [],
          modalidade: disciplina.endsWith('(EAD)') ? 'EAD' : 'Presencial',
        }));
        criadas++;
      });
    }

    p('Gravando...', 70);
    for (let i = 0; i < ops.length; i += 450) {
      const batch = writeBatch(db);
      ops.slice(i, i + 450).forEach(op => op(batch));
      await batch.commit();
      p('Gravando...', 70 + Math.round((i / ops.length) * 28));
    }

    p('Concluído.', 100);
    return {
      success: true,
      message: 'Cluster C corrigido: início em 16/01/2027 com 3 cursos.',
      stats: {
        teachersCreated: 0,
        teachersUpdated: 0,
        schedulesCreated: 0,
        schedulesUpdated: 1,
        classesDeleted: plano.aulasAntigas.length,
        classesCreated: criadas,
      },
    };
  } catch (e: any) {
    console.error(e);
    return { success: false, message: 'Erro: ' + (e?.message || String(e)) + '. Se o erro ocorreu durante a gravação, use o arquivo de backup baixado.' };
  }
}

export async function carregarCronogramas(
  _customData?: unknown,
  onProgress?: ProgressCallback
): Promise<CargaResult> {
  const prep = await prepararCorrecaoClusterC();
  if (!prep.ok) {
    return { success: false, message: prep.message };
  }
  return aplicarCorrecaoClusterC(prep.plano, onProgress);
}
