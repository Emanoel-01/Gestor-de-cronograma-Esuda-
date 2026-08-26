export interface PlanoDeEnsino {
  ementa: string;
  conteudosProgramaticos: string[]; // um item por tópico/linha
  atividadeAvaliativa: string;
  bibliografiaBasica: string[]; // uma referência por item
  bibliografiaComplementar: string[];
  cargaHoraria?: string; // ex. "20 horas"
  cargaPorAula?: string; // ex. "10 h/a"
  creditos?: string; // ex. "01"
}

export interface SpecificDiscipline {
  name: string;
  syllabus?: string;
  teacherCount?: number;
  planoDeEnsino?: PlanoDeEnsino;
}

export interface CommonDiscipline {
  id: string;
  name: string;
  description?: string;
  order: number;
  planoDeEnsino?: PlanoDeEnsino;
}
