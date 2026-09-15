const { initializeApp } = require('firebase/app');
const { 
  initializeFirestore, 
  memoryLocalCache, 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  doc,
  Timestamp 
} = require('firebase/firestore');
const config = require('../firebase-applet-config.json');

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

const professoresUnicos = [
  { "nome": "Alexandre Mesquita", "documento": "409.525.414-91", "documento_tipo": "CPF", "email": "mesquitaita@gmail.com" },
  { "nome": "Amanda Vila Nova", "documento": "073.859.344-39", "documento_tipo": "CPF", "email": "amandavilanova.arq@gmail.com" },
  { "nome": "Clodomir Barros", "documento": "594.731.344-87", "documento_tipo": "CPF", "email": "clodomir@esuda.edu.br" },
  { "nome": "Conceição de Cássia Pereira de Albuquerque", "documento": "081.642.984-76", "documento_tipo": "CPF", "email": "Cassia_albuquerque@Hotmail.com" },
  { "nome": "Dieska Rayane da Silva Gomes", "documento": "114.947.164-61", "documento_tipo": "CPF", "email": "dieskarayane@gmail.com" },
  { "nome": "Edgar Natanael Gregório", "documento": "042.901.834-76", "documento_tipo": "CPF", "email": "edgarnatanael28@hotmail.com" },
  { "nome": "Emanoel Silva de Amorim", "documento": "081.642.984-76", "documento_tipo": "CPF", "email": "emanoel@esuda.edu.br" },
  { "nome": "Emmanoel Neri", "documento": "09937559413", "documento_tipo": "outro", "email": "emmanoelroberto@gmail.com" },
  { "nome": "Erick Sidrome de Oliveira", "documento": "027.323.044-17", "documento_tipo": "CPF", "email": "e.s.o@outlook.com" },
  { "nome": "Fabio Torres Cunha", "documento": "618.842.603-06", "documento_tipo": "CPF", "email": "fabiologo1980@gmail.com" },
  { "nome": "Florencio Absalão da Silva Filho", "documento": "168.385.484-53", "documento_tipo": "CPF", "email": "prof.absalao@gmail.com" },
  { "nome": "Francisco Buarque", "documento": "459.496.974-72", "documento_tipo": "CPF", "email": "francisco.buarque@gmail.com" },
  { "nome": "Francisco Ellihimas", "documento": "767.105.214-00", "documento_tipo": "CPF", "email": "Francisco@esuda.edu.br" },
  { "nome": "Francisco de Assis Berenguer Correia", "documento": "078.240.904-00", "documento_tipo": "CPF", "email": "francisco@dbengenharia.com" },
  { "nome": "Gildo Alves de Souza Júnior", "documento": "072.421.914-59", "documento_tipo": "CPF", "email": "gildoalvess@hotmail.com" },
  { "nome": "Hilma Santos Ferreira", "documento": "707.751.094-87", "documento_tipo": "CPF", "email": "hilma.ferreira@esuda.edu.br" },
  { "nome": "Ivan Carlos Moura da Cunha", "documento": "529.121.324-87", "documento_tipo": "CPF", "email": "ivancarloscunha@gnoseconsultoria.com" },
  { "nome": "Mohana Barros", "documento": "034.099.034-10", "documento_tipo": "CPF", "email": "mohanalima@gmail.com" },
  { "nome": "Nathálya Aguiar Leal de Melo Souto Maior Arruda", "documento": "09074625452", "documento_tipo": "outro", "email": "nathalyaaguiar92@gmail.com" },
  { "nome": "Nilson da Cunha Ximenes", "documento": "317.898.544-15", "documento_tipo": "CPF", "email": "nilson.ximenes@gmail.com" },
  { "nome": "Paulo Ney Alves Barata", "documento": "455.868.534-34", "documento_tipo": "CPF", "email": "pauloney@esuda.edu.br" },
  { "nome": "Priscila Raffi Rodrigues", "documento": "034.401.054-66", "documento_tipo": "CPF", "email": "priscilaraffi@esuda.edu.br" },
  { "nome": "Pryscilla de Barros Gonçalves", "documento": "027.532.665-90", "documento_tipo": "CPF", "email": "pryscillawc5@gmail.com" },
  { "nome": "Ramon Araújo", "documento": "685.788.064-68", "documento_tipo": "CPF", "email": "arquitetoramonaraujo@gmail.com" },
  { "nome": "Rebeka Zambon", "documento": "069.429.104-81", "documento_tipo": "CPF", "email": "rebekazambon@gmail.com" },
  { "nome": "Regina Coeli Barros", "documento": "235.543.804-82", "documento_tipo": "CPF", "email": "reginacoelibblima@gmail.com" },
  { "nome": "Renata Eskinazi Leça", "documento": "830.130.834-68", "documento_tipo": "CPF", "email": "renata@esuda.edu.br" },
  { "nome": "Rogerio Pirola Alves", "documento": "223.707.218-39", "documento_tipo": "CPF", "email": "rogerio.pirola@hotmail.com" },
  { "nome": "Tiago Lopes Silva", "documento": "071.147.754-54", "documento_tipo": "CPF", "email": "Tlsprojetoseconsultoria@gmail.com" },
  { "nome": "Vera Lucia Barbosa da Silva", "documento": "713.049.834-04", "documento_tipo": "CPF", "email": "meioambiente.vera@gmail.com" },
  { "nome": "Vilberty Vasconcelos", "documento": "020.703.294-70", "documento_tipo": "CPF", "email": "vilberty@bbcep.eng.br" },
  { "nome": "Wellington de Oliveira Martins", "documento": "585.162.634-87", "documento_tipo": "CPF", "email": "contato@womengenharia.com.br" }
];

const knownDoubts = {
  "Amanda Vila Nova": 'Nome no banco é "Amanda Nova"',
  "Conceição de Cássia Pereira de Albuquerque": 'Nome no banco é "Cassia Albuquerque"',
  "Emmanoel Neri": 'Nome no banco é "Emmanoel Roberto da Silva Neri"',
  "Hilma Santos Ferreira": 'Nome no banco é "Hilma de Oliveira Santos Ferreira"',
  "Ivan Carlos Moura da Cunha": 'Nome no banco é "Ivan Carlos Cunha "',
  "Rogerio Pirola Alves": 'Nome no banco é "Rogério Pirola"',
  "Vera Lucia Barbosa da Silva": 'Nome no banco é "Vera Lúcia Barbosa Silva"'
};

const extracaoCronogramas = {
  "clusters": [
    {
      "nome_cluster": "Cluster A — BIM / Gestão de Projetos e Obras / Manutenção Predial",
      "data_inicio_fase_comum": "2026-01-31",
      "fase_comum": [
        {
          "order": 1,
          "disciplina": "Gestão de Escritórios de Arquitetura e Engenharia: Branding e Precificação",
          "datas": ["2026-01-31", "2026-02-07"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "Presencial",
          "professor_status": "DEFINIDO",
          "professores": [{ "nome": "Paulo Ney Alves Barata" }]
        },
        {
          "order": 2,
          "disciplina": "Marketing Pessoal e Digital para Arquitetos e Engenheiros",
          "datas": ["2026-02-21", "2026-02-28"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "Presencial",
          "professor_status": "DEFINIDO",
          "professores": [{ "nome": "Conceição de Cássia Pereira de Albuquerque" }]
        },
        {
          "order": 3,
          "disciplina": "Metodologia da Pesquisa e Didática do Ensino Superior (EAD)",
          "datas": ["2026-03-14", "2026-03-21"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "EAD",
          "professor_status": "EAD",
          "professores": []
        },
        {
          "order": 4,
          "disciplina": "Inteligência Artificial Aplicada",
          "datas": ["2026-03-28", "2026-04-11"],
          "sessionCount": 2,
          "sessionGapWeeks": 2,
          "modalidade": "Presencial",
          "professor_status": "DEFINIDO",
          "professores": [{ "nome": "Emanoel Silva de Amorim" }]
        },
        {
          "order": 5,
          "disciplina": "Competências Estratégicas, Liderança e Alta Performance (EAD)",
          "datas": ["2026-04-18", "2026-04-25"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "EAD",
          "professor_status": "EAD",
          "professores": []
        },
        {
          "order": 6,
          "disciplina": "Práticas Simuladas: Estrutura Legal, Contábil e Empreendedorismo",
          "datas": ["2026-05-09", "2026-05-16"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "Presencial",
          "professor_status": "DEFINIDO",
          "professores": [{ "nome": "Nilson da Cunha Ximenes" }]
        },
        {
          "order": 7,
          "disciplina": "Novas Fontes de Receita: Elaboração de Laudos e Perícias (EAD)",
          "datas": ["2026-05-23", "2026-05-30"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "EAD",
          "professor_status": "EAD",
          "professores": []
        },
        {
          "order": 8,
          "disciplina": "Solução Criativa de Problemas Complexos (Design Thinking) (EAD)",
          "datas": ["2026-06-06", "2026-06-13"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "EAD",
          "professor_status": "EAD",
          "professores": []
        }
      ],
      "nona_disciplina_comum_intercalada": {
        "order": 9.5,
        "disciplina": "Negociação e Gestão de Conflitos (EAD)",
        "datas": ["2026-07-04", "2026-07-11"],
        "sessionCount": 2,
        "sessionGapWeeks": 1,
        "modalidade": "EAD",
        "professor_status": "EAD",
        "professores": []
      },
      "cursos": {
        "Tecnologia BIM na Construção Civil": {
          "turma": "Turma 01",
          "disciplinas_especificas": [
            {
              "order": 9,
              "disciplina": "BIM Conceituação Básica do Planejamento ao pós obra",
              "datas": ["2026-06-20", "2026-06-27"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Gildo Alves de Souza Júnior" }]
            },
            {
              "order": 10,
              "disciplina": "Modelagem Arquitetônica",
              "datas": ["2026-07-18", "2026-07-25"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Nathálya Aguiar Leal de Melo Souto Maior Arruda" }]
            },
            {
              "order": 11,
              "disciplina": "Colaboração e integração com CDE",
              "datas": ["2026-08-01", "2026-08-08"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Tiago Lopes Silva" }]
            },
            {
              "order": 12,
              "disciplina": "Modelagem Estrutural",
              "datas": ["2026-08-15", "2026-08-22"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Emmanoel Neri" }]
            },
            {
              "order": 13,
              "disciplina": "Modelagem das Instalações",
              "datas": ["2026-08-29", "2026-09-12"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [
                { "nome": "Emmanoel Neri" },
                { "nome": "Tiago Lopes Silva" }
              ]
            },
            {
              "order": 14,
              "disciplina": "BIM no Planejamento e Orçamentação",
              "datas": ["2026-09-19", "2026-09-26"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "A_DEFINIR",
              "professores": []
            },
            {
              "order": 15,
              "disciplina": "Gestão e Compatibilização de Projetos",
              "datas": ["2026-10-03", "2026-10-17"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Tiago Lopes Silva" }]
            },
            {
              "order": 16,
              "disciplina": "Modelagem Paramétrica",
              "datas": ["2026-10-24", "2026-11-07"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "A_DEFINIR",
              "professores": []
            },
            {
              "order": 17,
              "disciplina": "BIM, Análise de dados e IA",
              "datas": ["2026-11-14", "2026-11-28"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Gildo Alves de Souza Júnior" }]
            }
          ]
        },
        "Gestão de Projetos e Obras": {
          "turma": "Turma 13",
          "disciplinas_especificas": [
            {
              "order": 9,
              "disciplina": "Técnicas de Coordenação e Compatibilização de Projetos",
              "datas": ["2026-06-20", "2026-06-27"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Tiago Lopes Silva" }]
            },
            {
              "order": 10,
              "disciplina": "Técnicas de Orçamentos, Cobranças e Custos de Projetos",
              "datas": ["2026-07-18", "2026-07-25"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Priscila Raffi Rodrigues" }]
            },
            {
              "order": 11,
              "disciplina": "Técnicas de Orçamentos, Cobranças e Custos de Obras",
              "datas": ["2026-08-01", "2026-08-08"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Dieska Rayane da Silva Gomes" }]
            },
            {
              "order": 12,
              "disciplina": "Técnicas de Planejamento e Coordenação de Obras",
              "datas": ["2026-08-15", "2026-08-22"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Emanoel Silva de Amorim" }]
            },
            {
              "order": 13,
              "disciplina": "Lean Construction, Last Planner System e Logística de Canteiro",
              "datas": ["2026-08-29", "2026-09-12"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Vera Lucia Barbosa da Silva" }]
            },
            {
              "order": 14,
              "disciplina": "Engenharia de Segurança e Normas de Desempenho",
              "datas": ["2026-09-19", "2026-09-26"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Florencio Absalão da Silva Filho" }]
            },
            {
              "order": 15,
              "disciplina": "Eficiência Energética e Sustentabilidade na Construção Civil",
              "datas": ["2026-10-03", "2026-10-17"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Pryscilla de Barros Gonçalves" }]
            },
            {
              "order": 16,
              "disciplina": "Administração Contratual, Medições e Gestão de Pleitos (Claims)",
              "datas": ["2026-10-24", "2026-11-07"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Priscila Raffi Rodrigues" }]
            },
            {
              "order": 17,
              "disciplina": "Sistemas Informatizados de Gestão Integrada e BI (ERP, CDE e Power BI)",
              "datas": ["2026-11-14", "2026-11-28"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Vera Lucia Barbosa da Silva" }]
            }
          ]
        },
        "Engenharia e Gestão da Manutenção Predial na Construção 4.0": {
          "turma": "Turma 02",
          "disciplinas_especificas": [
            {
              "order": 9,
              "disciplina": "Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção",
              "datas": ["2026-06-20", "2026-06-27"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Ivan Carlos Moura da Cunha" }]
            },
            {
              "order": 10,
              "disciplina": "Patologias Construtivas em Estruturas e Sistemas de Envoltória",
              "datas": ["2026-07-18", "2026-07-25"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Dieska Rayane da Silva Gomes" }]
            },
            {
              "order": 11,
              "disciplina": "Manutenção Avançada em Instalações Prediais (Elétrica, Hidráulica, HVAC)",
              "datas": ["2026-08-01", "2026-08-08"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Erick Sidrome de Oliveira" }]
            },
            {
              "order": 12,
              "disciplina": "Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial",
              "datas": ["2026-08-15", "2026-08-22"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Wellington de Oliveira Martins" }]
            },
            {
              "order": 13,
              "disciplina": "Termografia Infravermelha e Drones na Inspeção de Ativos",
              "datas": ["2026-08-29", "2026-09-12"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Francisco de Assis Berenguer Correia" }]
            },
            {
              "order": 14,
              "disciplina": "Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte",
              "datas": ["2026-09-19", "2026-09-26"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Rogerio Pirola Alves" }]
            },
            {
              "order": 15,
              "disciplina": "CMMS e GMAO: Implementação de Sistemas de Gestão da Manutenção",
              "datas": ["2026-10-03", "2026-10-17"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Emanoel Silva de Amorim" }]
            },
            {
              "order": 16,
              "disciplina": "Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional",
              "datas": ["2026-10-24", "2026-11-07"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Ivan Carlos Moura da Cunha" }]
            },
            {
              "order": 17,
              "disciplina": "Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva",
              "datas": ["2026-11-14", "2026-11-28"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Vilberty Vasconcelos" }]
            }
          ]
        }
      }
    },
    {
      "nome_cluster": "Cluster B — Neuroarquitetura / Acústica Arquitetônica e Iluminação / Design de Interiores Contemporâneo",
      "data_inicio_fase_comum": "2026-05-23",
      "fase_comum": [
        {
          "order": 1,
          "disciplina": "Gestão de Escritórios de Arquitetura e Engenharia: Branding e Precificação",
          "datas": ["2026-05-23", "2026-05-30"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "Presencial",
          "professor_status": "DEFINIDO",
          "professores": [{ "nome": "Paulo Ney Alves Barata" }]
        },
        {
          "order": 2,
          "disciplina": "Práticas Simuladas: Estrutura Legal, Contábil e Empreendedorismo",
          "datas": ["2026-06-06", "2026-06-13"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "Presencial",
          "professor_status": "DEFINIDO",
          "professores": [{ "nome": "Nilson da Cunha Ximenes" }]
        },
        {
          "order": 3,
          "disciplina": "Metodologia da Pesquisa e Didática do Ensino Superior (EAD)",
          "datas": ["2026-06-20", "2026-06-27"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "EAD",
          "professor_status": "EAD",
          "professores": []
        },
        {
          "order": 4,
          "disciplina": "Marketing Pessoal e Digital para Arquitetos e Engenheiros",
          "datas": ["2026-07-04", "2026-07-11"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "Presencial",
          "professor_status": "DEFINIDO",
          "professores": [{ "nome": "Conceição de Cássia Pereira de Albuquerque" }]
        },
        {
          "order": 5,
          "disciplina": "Competências Estratégicas, Liderança e Alta Performance (EAD)",
          "datas": ["2026-07-18", "2026-07-25"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "EAD",
          "professor_status": "EAD",
          "professores": []
        },
        {
          "order": 6,
          "disciplina": "Aula Extra - Gestão da Mobilidade Urbana (Opcional)",
          "datas": ["2026-08-01", "2026-08-08"],
          "sessionCount": 2,
          "sessionGapWeeks": 1,
          "modalidade": "Presencial",
          "professor_status": "DEFINIDO",
          "professores": [{ "nome": "Ivan Carlos Moura da Cunha" }]
        },
        {
          "order": 7,
          "disciplina": "Novas Fontes de Receita: Elaboração de Laudos e Perícias (EAD)",
          "datas": ["2026-08-15"],
          "sessionCount": 1,
          "sessionGapWeeks": null,
          "modalidade": "EAD",
          "professor_status": "EAD",
          "professores": []
        },
        {
          "order": 8,
          "disciplina": "Negociação e Gestão de Conflitos (EAD)",
          "datas": ["2026-08-22"],
          "sessionCount": 1,
          "sessionGapWeeks": null,
          "modalidade": "EAD",
          "professor_status": "EAD",
          "professores": []
        },
        {
          "order": 9,
          "disciplina": "Inteligência Artificial Aplicada",
          "datas": ["2026-08-29", "2026-09-12"],
          "sessionCount": 2,
          "sessionGapWeeks": 2,
          "modalidade": "Presencial",
          "professor_status": "DEFINIDO",
          "professores": [{ "nome": "Emanoel Silva de Amorim" }]
        },
        {
          "order": 10,
          "disciplina": "Solução Criativa de Problemas Complexos (Design Thinking) (EAD)",
          "datas": ["2026-10-03", "2026-10-17"],
          "sessionCount": 2,
          "sessionGapWeeks": 2,
          "modalidade": "EAD",
          "professor_status": "EAD",
          "professores": []
        }
      ],
      "cursos": {
        "Neuroarquitetura": {
          "turma": "Turma 01",
          "disciplinas_especificas": [
            {
              "order": 11,
              "disciplina": "Fundamentos de Neurociência Aplicada à Arquitetura",
              "datas": ["2026-09-19", "2026-09-26"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [
                { "nome": "Fabio Torres Cunha" },
                { "nome": "Nathálya Aguiar Leal de Melo Souto Maior Arruda" }
              ]
            },
            {
              "order": 12,
              "disciplina": "Psicofisiologia do Bem-Estar: Percepção e Comportamento Humano",
              "datas": ["2026-10-24", "2026-11-07"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Nathálya Aguiar Leal de Melo Souto Maior Arruda" }]
            },
            {
              "order": 13,
              "disciplina": "Neuroiluminação e Ritmos Biológicos",
              "datas": ["2026-11-14", "2026-11-28"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Hilma Santos Ferreira" }]
            },
            {
              "order": 14,
              "disciplina": "Neuroarquitetura em Ambientes Residenciais e Comerciais",
              "datas": ["2026-12-05", "2026-12-12"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Amanda Vila Nova" }]
            },
            {
              "order": 15,
              "disciplina": "Design Biofílico Aplicado em Ambientes Restauradores e Espaços Verdes",
              "datas": ["2026-12-19", "2027-01-09"],
              "sessionCount": 2,
              "sessionGapWeeks": 3,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Clodomir Barros" }]
            },
            {
              "order": 16,
              "disciplina": "Neuroarquitetura e Neuroergonomia em Ambientes de Trabalho e Corporativos",
              "datas": ["2027-01-16", "2027-01-23"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Priscila Raffi Rodrigues" }]
            },
            {
              "order": 17,
              "disciplina": "Neuroarquitetura em Ambientes de Saúde (Healthcare) e Aprendizado",
              "datas": ["2027-01-30", "2027-02-13"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Hilma Santos Ferreira" }]
            },
            {
              "order": 18,
              "disciplina": "Neurourbanismo e a Experiência da Cidade",
              "datas": ["2027-02-20", "2027-02-27"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Clodomir Barros" }]
            },
            {
              "order": 19,
              "disciplina": "Tecnologias de Monitoramento e Avaliação Pós-Ocupação para Resultados",
              "datas": ["2027-03-06", "2027-03-13"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "A_DEFINIR",
              "professores": []
            }
          ]
        },
        "Acústica Arquitetônica e Iluminação": {
          "turma": "Turma 05",
          "disciplinas_especificas": [
            {
              "order": 11,
              "disciplina": "Fundamentos de Acústica: Física do Som, Gráficos e Normas de Desempenho",
              "datas": ["2026-09-19", "2026-09-26"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Renata Eskinazi Leça" }]
            },
            {
              "order": 12,
              "disciplina": "Fundamentos de Iluminação: Teoria da Luz, Eficiência e Normatização",
              "datas": ["2026-10-24", "2026-11-07"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Regina Coeli Barros" }]
            },
            {
              "order": 13,
              "disciplina": "Acústica Arquitetônica para Ambientes de Convivência, Hospitalidade e Trabalho",
              "datas": ["2026-11-14", "2026-11-28"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Francisco Buarque" }]
            },
            {
              "order": 14,
              "disciplina": "Luminotécnica para Ambientes de Convivência, Hospitalidade e Trabalho",
              "datas": ["2026-12-05", "2026-12-12"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Mohana Barros" }]
            },
            {
              "order": 15,
              "disciplina": "Acústica Arquitetônica para Ambientes de Performance e Eventos",
              "datas": ["2026-12-19", "2027-01-09"],
              "sessionCount": 2,
              "sessionGapWeeks": 3,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Francisco Ellihimas" }]
            },
            {
              "order": 16,
              "disciplina": "Luminotécnica para Ambientes de Performance e Eventos",
              "datas": ["2027-01-16", "2027-01-23"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Ramon Araújo" }]
            },
            {
              "order": 17,
              "disciplina": "Engenharia Acústica para Grandes Ambientes e Complexos",
              "datas": ["2027-01-30", "2027-02-13"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Francisco Ellihimas" }]
            },
            {
              "order": 18,
              "disciplina": "Iluminação Externa: Jardins, Praças e Edificações Históricas",
              "datas": ["2027-02-20", "2027-02-27"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Mohana Barros" }]
            },
            {
              "order": 19,
              "disciplina": "Acústica e Iluminação na Escala da Cidade",
              "datas": ["2027-03-06", "2027-03-13"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Regina Coeli Barros" }]
            }
          ]
        },
        "Design de Interiores Contemporâneo": {
          "turma": "Turma 01",
          "disciplinas_especificas": [
            {
              "order": 11,
              "disciplina": "Automação, Internet das Coisas e Eficiência dos Ambientes de Interiores",
              "datas": ["2026-09-19", "2026-09-26"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Edgar Natanael Gregório" }]
            },
            {
              "order": 12,
              "disciplina": "Iluminação de Interiores: Comerciais e Residenciais",
              "datas": ["2026-10-24", "2026-11-07"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Hilma Santos Ferreira" }]
            },
            {
              "order": 13,
              "disciplina": "Design de Superfícies",
              "datas": ["2026-11-14", "2026-11-28"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Rebeka Zambon" }]
            },
            {
              "order": 14,
              "disciplina": "Inclusão e Ergonomia",
              "datas": ["2026-12-05", "2026-12-12"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Hilma Santos Ferreira" }]
            },
            {
              "order": 15,
              "disciplina": "Antropologia do Espaço",
              "datas": ["2026-12-19", "2027-01-09"],
              "sessionCount": 2,
              "sessionGapWeeks": 3,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Priscila Raffi Rodrigues" }]
            },
            {
              "order": 16,
              "disciplina": "Design do Mobiliário",
              "datas": ["2027-01-16", "2027-01-23"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Alexandre Mesquita" }]
            },
            {
              "order": 17,
              "disciplina": "Design Aplicado para Ambientes Residenciais",
              "datas": ["2027-01-30", "2027-02-13"],
              "sessionCount": 2,
              "sessionGapWeeks": 2,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Amanda Vila Nova" }]
            },
            {
              "order": 18,
              "disciplina": "Design Aplicado para Ambientes Comerciais e Corporativos",
              "datas": ["2027-02-20", "2027-02-27"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Alexandre Mesquita" }]
            },
            {
              "order": 19,
              "disciplina": "Design de Interiores para o Mercado de Luxo",
              "datas": ["2027-03-06", "2027-03-13"],
              "sessionCount": 2,
              "sessionGapWeeks": 1,
              "modalidade": "Presencial",
              "professor_status": "DEFINIDO",
              "professores": [{ "nome": "Rebeka Zambon" }]
            }
          ]
        }
      }
    }
  ]
};

async function runImport() {
  console.log('--- PASSO 1: Resolução e Cadastro de Professores ---');
  const teachersSnap = await getDocs(collection(db, 'teachers'));
  const dbTeachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const coursesSnap = await getDocs(collection(db, 'courses'));
  const dbCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const courseNameToId = {};
  dbCourses.forEach(c => {
    courseNameToId[c.name.trim()] = c.id;
  });

  const resolvedTeacherMap = {};
  const reportReused = [];
  const reportNew = [];
  const reportDoubt = [];

  for (const prof of professoresUnicos) {
    const normProf = normalize(prof.nome);

    // Se é dúvida conhecida
    if (knownDoubts[prof.nome]) {
      resolvedTeacherMap[normProf] = null;
      reportDoubt.push({
        nome: prof.nome,
        motivo: knownDoubts[prof.nome]
      });
      continue;
    }

    const exactMatches = dbTeachers.filter(t => normalize(t.name) === normProf);

    if (exactMatches.length === 1) {
      resolvedTeacherMap[normProf] = exactMatches[0].id;
      reportReused.push({ nome: prof.nome, id: exactMatches[0].id, dbName: exactMatches[0].name });
    } else if (exactMatches.length > 1) {
      resolvedTeacherMap[normProf] = null;
      reportDoubt.push({ nome: prof.nome, motivo: 'Múltiplos registros com o mesmo nome: ' + exactMatches.map(m => m.id).join(', ') });
    } else {
      // Novo professor
      const docRef = await addDoc(collection(db, 'teachers'), {
        name: prof.nome,
        email: prof.email || '',
        titulacao: 'Especialista',
        specialties: [],
        hasSubmitted: false
      });
      const cpfValue = prof.documento_tipo === 'CPF' ? prof.documento : (prof.documento || '');
      if (cpfValue) {
        await setDoc(doc(db, 'teachers', docRef.id, 'dados_sensiveis', 'principal'), {
          cpf: cpfValue,
          phone: ''
        });
      }
      resolvedTeacherMap[normProf] = docRef.id;
      reportNew.push({ nome: prof.nome, id: docRef.id, doc: prof.documento, email: prof.email });
      console.log(`[NOVO] Cadastrado: ${prof.nome} (ID: ${docRef.id})`);
    }
  }

  console.log('\n--- RESUMO PROFESSORES ---');
  console.log(`Reaproveitados: ${reportReused.length}`);
  console.log(`Novos criados: ${reportNew.length}`);
  console.log(`Dúvidas / Sem vínculo: ${reportDoubt.length}`);

  console.log('\n--- PASSO 2: Criando Schedules e Classes ---');
  const createdSchedules = [];
  let totalClassesCreated = 0;

  for (const cluster of extracaoCronogramas.clusters) {
    const courseNames = Object.keys(cluster.cursos);
    const courseIds = courseNames.map(name => {
      const id = courseNameToId[name];
      if (!id) throw new Error(`Curso não encontrado no Firestore: "${name}"`);
      return id;
    });

    const schedRef = await addDoc(collection(db, 'schedules'), {
      className: cluster.nome_cluster,
      courseIds: courseIds,
      courseNames: courseNames,
      startDate: cluster.data_inicio_fase_comum,
      status: 'active'
    });

    const scheduleId = schedRef.id;
    console.log(`\nSchedule criado: ${cluster.nome_cluster} (ID: ${scheduleId})`);

    let clusterClassesCount = 0;

    // 1. Fase Comum
    for (const disc of cluster.fase_comum) {
      const tIds = (disc.professores || [])
        .map(p => resolvedTeacherMap[normalize(p.nome)])
        .filter(Boolean);

      for (let i = 0; i < disc.datas.length; i++) {
        await addDoc(collection(db, 'classes'), {
          scheduleId: scheduleId,
          disciplineName: disc.disciplina,
          order: disc.order,
          date: disc.datas[i],
          classNumber: i + 1,
          isCommon: true,
          courseId: 'all',
          courseName: 'Fase Comum',
          teacherIds: tIds,
          teacherId: tIds[0] || '',
          sessionCount: disc.sessionCount || 2,
          sessionGapWeeks: disc.sessionGapWeeks || null,
          observation: ''
        });
        clusterClassesCount++;
      }
    }

    // 2. Nona disciplina comum intercalada (se houver)
    if (cluster.nona_disciplina_comum_intercalada) {
      const nona = cluster.nona_disciplina_comum_intercalada;
      const tIds = (nona.professores || [])
        .map(p => resolvedTeacherMap[normalize(p.nome)])
        .filter(Boolean);

      for (let i = 0; i < nona.datas.length; i++) {
        await addDoc(collection(db, 'classes'), {
          scheduleId: scheduleId,
          disciplineName: nona.disciplina,
          order: nona.order,
          date: nona.datas[i],
          classNumber: i + 1,
          isCommon: true,
          courseId: 'all',
          courseName: 'Fase Comum',
          teacherIds: tIds,
          teacherId: tIds[0] || '',
          sessionCount: nona.sessionCount || 2,
          sessionGapWeeks: nona.sessionGapWeeks || null,
          observation: ''
        });
        clusterClassesCount++;
      }
    }

    // 3. Disciplinas Específicas
    for (const [courseName, courseData] of Object.entries(cluster.cursos)) {
      const cId = courseNameToId[courseName];

      for (const disc of courseData.disciplinas_especificas) {
        let tIds = [];
        if (disc.professor_status !== 'A_DEFINIR') {
          tIds = (disc.professores || [])
            .map(p => resolvedTeacherMap[normalize(p.nome)])
            .filter(Boolean);
        }

        for (let i = 0; i < disc.datas.length; i++) {
          await addDoc(collection(db, 'classes'), {
            scheduleId: scheduleId,
            disciplineName: disc.disciplina,
            order: disc.order,
            date: disc.datas[i],
            classNumber: i + 1,
            isCommon: false,
            courseId: cId,
            courseName: courseName,
            teacherIds: tIds,
            teacherId: tIds[0] || '',
            sessionCount: disc.sessionCount || 2,
            sessionGapWeeks: disc.sessionGapWeeks || null,
            observation: ''
          });
          clusterClassesCount++;
        }
      }
    }

    console.log(`Classes criadas para ${cluster.nome_cluster}: ${clusterClassesCount}`);
    createdSchedules.push({
      id: scheduleId,
      name: cluster.nome_cluster,
      classesCount: clusterClassesCount
    });
    totalClassesCreated += clusterClassesCount;
  }

  console.log('\n=== IMPORTAÇÃO CONCLUÍDA COM SUCESSO ===');
  console.log('Total de cronogramas criados:', createdSchedules.length);
  console.log('Total de classes criadas:', totalClassesCreated);
  console.log(JSON.stringify({ createdSchedules, reportReused, reportNew, reportDoubt }, null, 2));
}

runImport().then(() => process.exit(0)).catch(e => {
  console.error('Erro na importação:', e);
  process.exit(1);
});
