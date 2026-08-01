"use client";

import { useEffect, useMemo, useState } from "react";
import MapView from "./MapView";

type Module =
  | "overview" | "fluxo" | "universo" | "ativos" | "ss" | "os" | "newbase" | "map" | "financial" | "auto-expurge" | "ai"
  | "expurgos" | "sigco" | "revisoes" | "aprovacoes" | "importar" | "regras"
  | "historico" | "manuais" | "admin";

// Universo consolidado de SS. A base do app deixou de ser so as 134 auditadas: passou a
// ser o universo inteiro (1.592 SS distintas), dividido em coorte. As 134 continuam
// existindo como um recorte dentro dele, e sao as unicas com auditoria caso a caso —
// mas a camada de campo (cruzamento automatico com a base de interrupcao pela chave
// COD_INS_TRF_TNT) agora cobre as 1.581 SS abertas entre janeiro e julho de 2026.
type UniverseRecord = {
  NUMERO_SS: string; COORTE: string; NA_COLETA: string; NA_AMOSTRA_209: string;
  AUDITADA_134: string; ID_AUDITORIA: string;
  DECISAO_FINAL: string; EXPURGAR: string; CAMADA: string; DECISAO: string;
  DECISAO_SITE_134: string; DIVERGE_DO_SITE: string;
  CATEGORIA: string; CAUSA: string; REGRA: string; MOTIVO: string;
  NUMERO_OS: string; NUM_OBRA: string; STATUS_OBRA: string; EMPREITEIRA: string;
  DATA_ABERTURA_SS: string; DATA_ABERTURA_OBRA: string;
  DIAS_SS_ATE_OBRA: number | null; DIAS_SS_ATE_OS: number | null; IDADE_SS_DIAS: number | null;
  INVERSAO_OS_ANTES_SS: string;
  TRAFOS_NO_MATERIAL: number; POSTES_NO_MATERIAL: number; MATERIAL_CONFERIDO: string;
  SIGCO: string; LOCALIDADE: string; SOLICITANTE: string; ORG_SOLIC: string;
  COD_EQUIPE: string; ALIMENTADOR: string; NUM_TRAFO: string;
  CRITICIDADE_SS: string; SITUACAO_SS: string; TIPOSS: string;
  POTENCIA_RET: string; POTENCIA_INST: string; NA_BASE_GERAL: string;
  DESCRICAO_SS: string; DESCRICAO_OS: string;
  // Camada de campo (jan-jul/2026). Nas SS fora do periodo estes campos vem vazios.
  // DECISAO_COM_CAMPO nunca sobrescreve DECISAO_FINAL: ela existe ao lado, com o motivo
  // escrito, para que a mudanca seja auditavel caso a caso antes de virar oficial.
  RECORTE?: string; DECISAO_COM_CAMPO?: string; MUDOU_COM_CAMPO?: string; MOTIVO_DA_MUDANCA?: string;
  NIVEL_DUVIDA_CAMPO?: string; SCORE_DUVIDA_CAMPO?: number;
  QTD_INTERVENCOES_CAMPO?: number | null; INTERV_ANTES_DA_SS?: number | null;
  INTERV_NA_JANELA?: number | null; INTERV_DEPOIS_DA_TROCA?: number | null;
  DIAS_INTERV_MAIS_PROXIMA?: number | null; JANELA_TEMPORAL?: string; DATA_INTERV_MAIS_PROXIMA?: string;
  CAUSA_CAMPO?: string; SUBCAUSA_CAMPO?: string; LEITURA_CAMPO?: string; CONFRONTO_CAMPO?: string;
  REINCIDENCIA_POS_TROCA?: string; SUBCAUSAS_TODAS?: string; OBS_CAMPO?: string;
  SINAIS_R_CAMPO?: string; EVIDENCIAS_CAMPO?: string; CONTRA_EVIDENCIAS_CAMPO?: string;
  // Estado explicito das tres analises. A regra e: nenhum campo vazio sem explicacao.
  // Onde a base nao tem o dado, COBERTURA_* diz o motivo em vez de deixar em branco.
  COBERTURA_SS?: string; COBERTURA_OS?: string; COBERTURA_MATERIAL?: string;
  ORIGEM_DESCRICAO_OS?: string; ANALISES_COMPLETAS?: number; TRIPLICE_COMPLETA?: string;
};

type CohortBlock = {
  total: number; expurgar: number; incluir: number; revisao: number; pendente: number;
  byDecision: Pair[]; byRule: Pair[]; byCause: Pair[]; byCategory: Pair[];
};

type UniverseData = {
  source: string; referenceDate: string; note: string; limits: string[];
  totals: {
    universo: number; coleta: number; amostra209: number; complemento: number;
    auditadas134: number; expurgar: number;
    janJun?: number; julho?: number; comCampo?: number;
    comIntervencao?: number; semIntervencao?: number; mudouComCampo?: number;
    descricaoSS?: number; descricaoOS?: number; materialConferido?: number; tripliceCompleta?: number;
  };
  cohorts: Record<string, CohortBlock>;
  fieldRules?: Array<{ id: string; title: string; detail: string; count: number }>;
  coverage?: Array<{ id: string; title: string; detail: string; ok: number; total: number;
    gaps: Array<{ label: string; count: number }> }>;
  records: UniverseRecord[];
};

type Scope = "UNIVERSO" | "JAN-JUN 1510" | "JULHO" | "COLETA" | "AMOSTRA 209" | "COMPLEMENTO" | "AUDITADAS 134";

const SCOPES: Array<{ id: Scope; label: string; note: string }> = [
  { id: "UNIVERSO", label: "Universo", note: "Todas as SS da base" },
  { id: "JAN-JUN 1510", label: "Jan–jun 1.510", note: "SS abertas de 01/01 a 30/06/2026" },
  { id: "JULHO", label: "Julho", note: "SS abertas em julho/2026 — obras ainda abertas" },
  { id: "COLETA", label: "Coleta", note: "SS que vieram da coleta" },
  { id: "AMOSTRA 209", label: "Amostra 209", note: "A amostra reprocessada" },
  { id: "COMPLEMENTO", label: "Complemento", note: "Na base geral, fora das duas listas" },
  { id: "AUDITADAS 134", label: "Auditadas 134", note: "Únicas com auditoria caso a caso" },
];

// Colunas da planilha de drill-down, na ordem em que aparecem. Sao as mesmas do
// universo-ss.json, para que o que o usuario ve na tela e o que ele baixa sejam iguais.
const SHEET_COLUMNS: Array<{ key: keyof UniverseRecord; label: string; width: number }> = [
  { key: "NUMERO_SS", label: "SS", width: 22 },
  { key: "COORTE", label: "Coorte", width: 14 },
  { key: "AUDITADA_134", label: "Auditada 134", width: 12 },
  { key: "CAMADA", label: "Camada", width: 28 },
  { key: "DECISAO_FINAL", label: "Decisão final", width: 18 },
  { key: "REGRA", label: "Regra", width: 11 },
  { key: "CAUSA", label: "Causa", width: 26 },
  { key: "MOTIVO", label: "Motivo", width: 60 },
  { key: "CATEGORIA", label: "Categoria", width: 14 },
  { key: "DECISAO", label: "Triagem da base", width: 18 },
  { key: "DECISAO_SITE_134", label: "Decisão do site (134)", width: 20 },
  { key: "DIVERGE_DO_SITE", label: "Diverge do site", width: 14 },
  { key: "NUMERO_OS", label: "OS", width: 22 },
  { key: "NUM_OBRA", label: "Obra", width: 13 },
  { key: "STATUS_OBRA", label: "Status da obra", width: 26 },
  { key: "EMPREITEIRA", label: "Empreiteira", width: 30 },
  { key: "DATA_ABERTURA_SS", label: "Abertura da SS", width: 13 },
  { key: "DATA_ABERTURA_OBRA", label: "Abertura da obra", width: 14 },
  { key: "DIAS_SS_ATE_OBRA", label: "Dias SS→obra", width: 12 },
  { key: "DIAS_SS_ATE_OS", label: "Dias SS→OS", width: 12 },
  { key: "IDADE_SS_DIAS", label: "Idade da SS", width: 12 },
  { key: "TRAFOS_NO_MATERIAL", label: "Trafos no material", width: 14 },
  { key: "POSTES_NO_MATERIAL", label: "Postes no material", width: 14 },
  { key: "MATERIAL_CONFERIDO", label: "Material conferido", width: 16 },
  { key: "SIGCO", label: "SIGCO", width: 10 },
  { key: "LOCALIDADE", label: "Localidade", width: 22 },
  { key: "SOLICITANTE", label: "Solicitante da SS", width: 30 },
  { key: "ORG_SOLIC", label: "Órgão solicitante", width: 14 },
  { key: "COD_EQUIPE", label: "Equipe da OS", width: 14 },
  { key: "ALIMENTADOR", label: "Alimentador", width: 14 },
  { key: "NUM_TRAFO", label: "Nº do trafo", width: 14 },
  { key: "CRITICIDADE_SS", label: "Criticidade", width: 12 },
  { key: "SITUACAO_SS", label: "Situação da SS", width: 16 },
  { key: "TIPOSS", label: "Tipo da SS", width: 22 },
  { key: "POTENCIA_RET", label: "Potência retirada", width: 14 },
  { key: "POTENCIA_INST", label: "Potência instalada", width: 14 },
  // Camada de campo — o que o cruzamento com a base de interrupcao acrescentou.
  { key: "RECORTE", label: "Recorte", width: 11 },
  { key: "DECISAO_COM_CAMPO", label: "Decisão com campo", width: 18 },
  { key: "MUDOU_COM_CAMPO", label: "Mudou?", width: 9 },
  { key: "MOTIVO_DA_MUDANCA", label: "Motivo da mudança", width: 70 },
  { key: "NIVEL_DUVIDA_CAMPO", label: "Nível de dúvida", width: 13 },
  { key: "SCORE_DUVIDA_CAMPO", label: "Score de dúvida", width: 12 },
  { key: "QTD_INTERVENCOES_CAMPO", label: "Intervenções no trafo", width: 14 },
  { key: "INTERV_ANTES_DA_SS", label: "Antes da SS", width: 11 },
  { key: "INTERV_NA_JANELA", label: "Na janela", width: 11 },
  { key: "INTERV_DEPOIS_DA_TROCA", label: "Depois da troca", width: 13 },
  { key: "DIAS_INTERV_MAIS_PROXIMA", label: "Dias até a mais próxima", width: 14 },
  { key: "DATA_INTERV_MAIS_PROXIMA", label: "Data da mais próxima", width: 14 },
  { key: "JANELA_TEMPORAL", label: "Janela temporal", width: 20 },
  { key: "CAUSA_CAMPO", label: "Causa em campo", width: 24 },
  { key: "SUBCAUSA_CAMPO", label: "Subcausa em campo", width: 34 },
  { key: "LEITURA_CAMPO", label: "Leitura de campo", width: 30 },
  { key: "CONFRONTO_CAMPO", label: "Confronto com a SS", width: 46 },
  { key: "REINCIDENCIA_POS_TROCA", label: "Reincidência pós-troca", width: 13 },
  { key: "SUBCAUSAS_TODAS", label: "Todas as subcausas", width: 50 },
  { key: "SINAIS_R_CAMPO", label: "Sinais R-CAMPO", width: 30 },
  { key: "EVIDENCIAS_CAMPO", label: "Evidências de dúvida", width: 80 },
  { key: "CONTRA_EVIDENCIAS_CAMPO", label: "Contra-evidências", width: 60 },
  { key: "OBS_CAMPO", label: "Observação do executante", width: 70 },
  // Cobertura antes dos textos: quem abre a planilha ve primeiro se as tres analises
  // existem, e so depois o texto. Onde falta, a coluna diz o motivo, nao fica em branco.
  { key: "TRIPLICE_COMPLETA", label: "SS+OS+material completos", width: 22 },
  { key: "COBERTURA_SS", label: "Cobertura da SS", width: 34 },
  { key: "COBERTURA_OS", label: "Cobertura da OS", width: 34 },
  { key: "COBERTURA_MATERIAL", label: "Cobertura do material", width: 34 },
  { key: "ORIGEM_DESCRICAO_OS", label: "Origem do texto da OS", width: 28 },
  { key: "DESCRICAO_SS", label: "Descrição da SS", width: 70 },
  { key: "DESCRICAO_OS", label: "Descrição da OS", width: 70 },
];

type AuditRecord = {
  id: string; ss: string; os: string; openedAt: string; openedAtLabel: string; month: number;
  category: string; location: string; type: string; sigco: string;
  requestType?: string; origin?: string; requester?: string; originReason?: string;
  powerRemoved: number; powerInstalled: number;
  requestType?: string; origin?: string; requester?: string; originReason?: string;
  ssAnalysis: { description: string; category: string; causeHint: string; evidence: string };
  osAnalysis: { description: string; action: string; transformerEvidence: string; evidence: string };
  work: {
    number: string; description: string; status: string; contractor: string; terminal: boolean; analyticReason: string;
    analyticReasonSource?: string; analyticConflict?: boolean;
    openedBy?: string; openedSector?: string; openedAt?: string; openedAtLabel?: string; projectSigco?: string;
    workClass?: string; workNature?: string; workKind?: string; expenseOrder?: boolean;
    ssAgeDays?: number | null; overdue?: boolean; alerts?: string[];
  };
  material: {
    transformers: number; poles: number; lightningArresters: number; items: number; value: number;
    conference?: MaterialConference;
  };
  finance: {
    totalBudgeted: number; totalRealized: number; materialBudgeted: number;
    materialRealized: number; laborBudgeted: number; laborRealized: number;
  };
  consolidated: {
    decision: string; condition: string; cause: string; action: string; materialEvidence: string;
    rule: string; rationale: string; confidence: number; confidenceBand: string;
    automaticExpurge: boolean; review: boolean; sigcoStatus: string; sigcoReason: string;
    flags: string[]; approvalStatus: string; reviewer: string; official: boolean;
  };
  fieldAnalysis?: FieldAnalysis;
  // preenchidos no cruzamento com o universo
  universe?: UniverseRecord;
  cohort?: string;
  audited134?: boolean;
  lite?: boolean;
};

// Análise por Intervenções: tudo o que a base TMAE/SIGOD registra sobre o transformador
// da SS — quantas intervenções, quando, causa, leitura do executante e o confronto com
// a categoria declarada. É a camada de campo que sustenta as regras R-CAMPO-01 a 08.
type FieldAnalysis = {
  interventions: number;
  before: number | null; inWindow: number | null; afterSwap: number | null;
  daysToNearest: number | null; nearestDate: string; window: string;
  cause: string; subcause: string; reading: string; confrontation: string;
  recurrence: string; team: string; executorNote: string;
  rules: string[];
  doubtLevel: string; doubtScore: number;
  pros: Array<{ level: string; text: string }>;
  cons: string[];
  inManualReview74: boolean;
  expurgeReason: string;
};

// Conferência de material: a base de itens da obra (material_obra) é o árbitro. Cada obra
// é reagregada item a item — TRANSF DISTR conta como transformador, POSTE como poste,
// PARA-RAIOS como para-raios; acessórios que só citam a palavra (CAPA PROTETORA TRANSF,
// CINTA POSTE) não contam. O que a aba Obras dizia é substituído quando diverge.
type MaterialConference = {
  status: string; items: number; value: number; valueMatches: boolean;
  transformerItems: Array<{ codigo: string; descricao: string; qtd: number; valor: number }>;
  detail: string;
};

type FieldRule = { id: string; label: string; description: string; count: number; records: string[] };

type Pair = { label: string; value: number };
type AuditData = {
  meta: {
    title: string; period: { start: string; end: string; observedEnd: string }; total: number;
    source: string; generatedAt: string; reviewer: string; approvalPolicy: string; note: string;
  };
  summary: {
    total: number; burned: number; damaged: number; included: number; expurged: number;
    review: number; approved: number; pending: number; works: number; analyticAlerts: number;
    temporaryPending?: number; expenseOrders?: number; missingWork?: number; overdueWork?: number;
  };
  workRules?: {
    referenceDate: string; deadlineDays: number;
    expense: Array<{ id: string; ss: string; work: string; workClass: string; decision: string }>;
    missing: Array<{ id: string; ss: string; openedAtLabel: string; ssAgeDays: number | null; overdue: boolean; decision: string }>;
    kindDivergent: Array<{ id: string; ss: string; work: string; workNature: string; workKind: string }>;
  };
  financial: {
    materialValue: number; totalBudgeted: number; totalRealized: number;
    materialBudgeted: number; materialRealized: number; laborBudgeted: number; laborRealized: number;
  };
  byMonth: Array<{
    month: number; label: string; total: number; burned: number; damaged: number;
    expurged: number; included: number; review: number; realized: number;
  }>;
  expurgeDashboard: {
    total: number; value: number; materialValue: number; byCause: Pair[]; byRule: Pair[]; sentToReview: number;
    byFieldRule?: Pair[]; fieldCandidates?: number; fieldStrong?: number;
  };
  fieldRules?: FieldRule[];
  fieldSummary?: {
    total: number; withDoubt: number; strong: number; medium: number; weak: number;
    withSignal: number; noIntervention: number; insideReview74: number; outsideReview74: number;
    confrontation: Pair[]; source: string;
  };
  aiDashboard: {
    highConfidence: number; mediumConfidence: number; lowConfidence: number; needsReview: number;
    sigcoAnalysis: number; completeEvidence: number; byDecision: Pair[]; byRule: Pair[];
  };
  requestSources?: { byType: Pair[]; byOrigin: Pair[]; byRequester: Pair[] };
  materialConference?: {
    works: number; matches: number; corrected: number; withoutWork: number;
    analyticConflicts: number; transformerWorks: number; items: number; value: number;
    source: string; rule: string;
    correctedList: Array<{ id: string; ss: string; work: string; detail: string; decision: string; rule: string }>;
    conflictList: Array<{ id: string; ss: string; work: string; sheet: string; checked: string; transformers: number; value: number }>;
  };
  workOrigin?: {
    note: string; source: string; works: number;
    requesterRanking: Pair[]; orgRanking: Pair[]; teamRanking: Pair[];
    contractorRanking: Pair[]; lastMoveRanking: Pair[]; sectorRanking: Pair[];
  };
  records: AuditRecord[];
};

// Fluxo das 1.510: o JSON vem pronto do pipeline, uma linha por SS com o resultado de cada
// estágio. O site não recalcula nada aqui — ele mostra, filtra e exporta o que foi decidido.
type FluxoRegistro = Record<string, string | number | boolean | null>;
type FluxoData = {
  meta: { titulo: string; janelaHoras: number; fontes: string[]; lacunas: string[] };
  resumo: {
    total: number; foraDaBase: number; e1: Record<string, number>; e1Retidos: number;
    e2SemAtendimento: number; e2SemDeslocamento: number; e3Retidos: number; e4Alertas: number;
    decisao: Record<string, number>; expurgos: number;
  };
  registros: FluxoRegistro[];
  historico: Array<Array<string | number | null>>;
};

// Método e decisões da análise, escritos fora do site e lidos de metodo.json. Os três corpos
// de cada bloco são opcionais: um bloco pode ser só texto, só itens, só tabela ou a mistura.
type MetodoItem = { rotulo: string; texto: string };
type MetodoTabela = { cabecalho: string[]; linhas: string[][] };
type MetodoBloco = {
  id: string; titulo: string;
  paragrafos?: string[]; itens?: MetodoItem[]; tabela?: MetodoTabela;
};
type MetodoData = {
  resumo?: { titulo: string; paragrafos: string[] };
  blocos?: MetodoBloco[];
};

type Change = { status?: string; comment: string; at: string; actor: string; action: string };
type Overrides = Record<string, Change[]>;
type DemoUser = {
  id: string; name: string; role: string; initials: string;
  description: string; canApprove: boolean;
};
type Municipality = { ibge: string; name: string; latitude: number; longitude: number; capital: boolean };

// A tela de senha saiu. O login era cosmético — rodava inteiro no navegador e expunha
// oito senhas em texto puro num repositório público. Quem abre o site lê e exporta tudo;
// a identificação só é pedida para assinar aprovação, e sem senha.
const VISITANTE: DemoUser = {
  id: "visitante", name: "Visitante", role: "Leitura", initials: "VS",
  description: "Acesso de leitura e exportação. Para aprovar, escolha seu nome na barra lateral.",
  canApprove: false,
};

const EQUIPE: DemoUser[] = [
  VISITANTE,
  { id: "matheus-alves", name: "Matheus Alves", role: "Supervisor", initials: "MA", description: "Controle operacional, acompanhamento das equipes e aprovação.", canApprove: true },
  { id: "joao-antonio", name: "João Antônio", role: "Desenvolvedor", initials: "JA", description: "Acesso técnico total e configuração do painel.", canApprove: false },
  { id: "mateus-gracia", name: "Mateus Gracia", role: "Engenheiro", initials: "MG", description: "Análise de engenharia e aprovação oficial.", canApprove: true },
  { id: "andressa", name: "Andressa", role: "Analista", initials: "AN", description: "Análise de SS, OS, SIGCO e consolidação.", canApprove: false },
  { id: "ronnald", name: "Ronnald", role: "Técnico terceiro", initials: "RO", description: "Registro técnico, evidências e solicitação de expurgo.", canApprove: false },
  { id: "gustavo", name: "Gustavo", role: "Técnico terceiro", initials: "GU", description: "Registro técnico, evidências e solicitação de expurgo.", canApprove: false },
  { id: "danillo", name: "Danillo", role: "Coordenador", initials: "DA", description: "Coordenação da operação, acompanhamento das filas e aprovação.", canApprove: true },
  { id: "carlos", name: "Carlos", role: "Desenvolvedor 2", initials: "CA", description: "Acesso técnico ao painel, manutenção e apoio à configuração.", canApprove: false },
];
const DEMO_USERS = EQUIPE;

const EXPURGE_REASONS = [
  "Furto, roubo ou vandalismo",
  "Possível furto ou abalroamento",
  "Transformador particular ou prefixo 56",
  "Regulador 58 ou religador 79",
  "Construção, nova ligação ou desativação",
  "Sem movimentação de trafo e obra em etapa terminal",
  "Fiscalização aprovada ou término físico",
  "Obra não gerada há mais de 60 dias da abertura da SS",
  "Obra lançada como ordem de despesa",
  // Motivos vindos da Análise por Intervenções (base TMAE/SIGOD). Ficam disponíveis como
  // justificativa rastreável: quem expurgar por um deles deixa registrada a regra de campo.
  "R-CAMPO-01 — QUEIMADO sem interrupção no período",
  "R-CAMPO-02 — Campo diverge da categoria da SS",
  "R-CAMPO-03 — Falha no ramal ou em acessório",
  "R-CAMPO-04 — Reincidência após a troca",
  "R-CAMPO-05 — SS duplicada para o mesmo transformador",
  "R-CAMPO-06 — Obra sem transformador no material",
  "R-CAMPO-07 — Causa externa registrada em campo",
  "R-CAMPO-08 — Queima por sobrecarga",
  "Outro motivo técnico",
];

const FIELD_RULE_IDS = ["R-CAMPO-01", "R-CAMPO-02", "R-CAMPO-03", "R-CAMPO-04", "R-CAMPO-05", "R-CAMPO-06", "R-CAMPO-07", "R-CAMPO-08"] as const;

const NAV: Array<{ group: string; items: Array<{ id: Module; label: string; code: string }> }> = [
  { group: "Operação", items: [
    { id: "overview", label: "Visão geral", code: "01" },
    { id: "fluxo", label: "Fluxo 1.510", code: "0A" },
    { id: "universo", label: "Universo de SS", code: "1A" },
    { id: "ativos", label: "Por transformador", code: "1B" },
    { id: "ss", label: "Análise de SS", code: "02" },
    { id: "os", label: "Análise por OS", code: "03" },
    { id: "newbase", label: "New Base", code: "04" },
    { id: "map", label: "Mapa dos transformadores", code: "05" },
  ]},
  { group: "Dashboards", items: [
    { id: "financial", label: "Financeiro", code: "06" },
    { id: "auto-expurge", label: "Expurgo automático", code: "07" },
    { id: "ai", label: "Análise da IA", code: "08" },
  ]},
  { group: "Filas", items: [
    { id: "expurgos", label: "Expurgos", code: "09" },
    { id: "sigco", label: "Análise por SIGCO", code: "10" },
    { id: "revisoes", label: "Revisões", code: "11" },
    { id: "aprovacoes", label: "Aprovações", code: "12" },
  ]},
  { group: "Controle", items: [
    { id: "importar", label: "Importar", code: "13" },
    { id: "regras", label: "Regras", code: "14" },
    { id: "historico", label: "Histórico", code: "15" },
    { id: "manuais", label: "Manuais", code: "16" },
    { id: "admin", label: "Administração", code: "17" },
  ]},
];

const TITLES: Record<Module, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Universo de SS", title: "Visão geral", description: "Leitura operacional da carga, das propostas da IA e das pendências. Todo número é clicável e abre a planilha do recorte." },
  // O total sai do proprio arquivo em tempo de render (ver pageDescription). Deixar o numero
  // escrito aqui ja causou o bug de a pagina dizer 1.582 enquanto os cartoes diziam 1.592.
  fluxo: { eyebrow: "Caixa d'água · 4 estágios", title: "Fluxo das 1.510", description: "As 1.510 SS de jan a jun escorrendo pelos quatro filtros. Cada caixa abre a lista, e toda lista exporta em CSV." },
  ativos: { eyebrow: "Contagem por ativo", title: "Por transformador", description: "Quantas solicitações e quantas intervenções de campo cada código de transformador acumulou no escopo." },
  universo: { eyebrow: "Base completa", title: "Universo de SS", description: "Toda a base dividida por coorte, com a regra de expurgo aplicada e as 134 auditadas sinalizadas." },
  ss: { eyebrow: "Primeira leitura", title: "Análise de SS", description: "O que foi solicitado, alegado e identificado no texto original da SS." },
  os: { eyebrow: "Execução registrada", title: "Análise por OS", description: "O que a equipe executou e quais evidências foram deixadas na OS." },
  newbase: { eyebrow: "Camada de decisão", title: "New Base — Análise Consolidada", description: "Os casos do escopo ativo reunidos com regra, justificativa, confiança e aprovação." },
  map: { eyebrow: "Distribuição territorial", title: "Mapa dos transformadores", description: "Visualização municipal aproximada dos atendimentos do escopo ativo. Clique em um ponto para consultar os casos." },
  financial: { eyebrow: "Valores da obra", title: "Dashboard financeiro", description: "Orçado, realizado e materiais, usando exclusivamente os campos da planilha." },
  "auto-expurge": { eyebrow: "Regras acionadas", title: "Dashboard de Expurgo Automático", description: "Casos elegíveis, motivo, regra e valor associado — ainda sujeitos à governança." },
  ai: { eyebrow: "Qualidade da proposta", title: "Dashboard Análise da IA", description: "Confiança, cobertura de evidência, revisões e regras utilizadas." },
  expurgos: { eyebrow: "Fila operacional", title: "Expurgos", description: "Propostas de exclusão do indicador, com motivo rastreável." },
  sigco: { eyebrow: "Coerência cadastral", title: "Análise por SIGCO", description: "Códigos que exigem confirmação, correção ou recomendação de abertura com motivo." },
  revisoes: { eyebrow: "Decisão humana", title: "Revisões", description: "Casos com conflito, baixa evidência, obra ausente ou reavaliação obrigatória." },
  aprovacoes: { eyebrow: "Administração", title: "Aprovações", description: "Matheus Alves, Danillo e Mateus Gracia podem oficializar uma análise com comentário." },
  importar: { eyebrow: "Fonte controlada", title: "Importar e reconciliar", description: "Carga exclusiva do Painel_134_Completo.xlsx." },
  regras: { eyebrow: "Manual v0.96", title: "Regras de decisão", description: "Critérios operacionais reproduzidos no motor de análise." },
  historico: { eyebrow: "Rastreabilidade", title: "Histórico", description: "Alterações, observações e decisões registradas neste navegador." },
  manuais: { eyebrow: "Documentação oficial", title: "Manuais", description: "Dois documentos separados e alinhados aos módulos do sistema." },
  admin: { eyebrow: "Governança", title: "Administração", description: "Papéis, limites do protótipo e controles de aprovação." },
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", maximumFractionDigits: 2,
}).format(value);
const compactMoney = (value: number) => new Intl.NumberFormat("pt-BR", {
  notation: "compact", style: "currency", currency: "BRL", maximumFractionDigits: 1,
}).format(value);
const pct = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const assetUrl = (path: string) => `${import.meta.env.BASE_URL || "/"}${path.replace(/^\/+/, "")}`;
const decisionClass = (value: string) =>
  value === "INCLUIR" ? "good"
    : value === "EXPURGAR" ? "bad"
      : value === "PENDENTE TEMPORAL" ? "pend"
        : "warn";
const requestTone = (value: string) => {
  const key = normalize(value);
  if (!key) return "neutral";
  if (key.includes("FORMS")) return "green";
  if (key.includes("ANOMALIA") || key.includes("SOLICITACAO DE SERVICO")) return "amber";
  return "neutral";
};

function RequestSource({ record, tab }: { record: AuditRecord; tab: "ss" | "os" }) {
  const type = record.requestType || record.type;
  if (!type && !record.origin && !record.requester) return null;
  return <article className={`request-source ${requestTone(type)}`}>
    <span>COMO A SOLICITAÇÃO NASCEU</span>
    <strong>{type || "Tipo não informado"}</strong>
    <div className="request-fields">
      <div><span>Origem</span><b>{record.origin || "Não informada"}</b></div>
      <div><span>Solicitante</span><b>{record.requester || "Não informado"}</b></div>
      {tab === "ss" ? <div><span>Motivo declarado na abertura</span><b>{record.originReason || "Não informado"}</b></div> : null}
    </div>
  </article>;
}

// Quem abre a SS e quem abre a obra são times distintos nesta base — 44 solicitantes contra
// 13 usuários de cadastro. Quando coincidem, vale sinalizar: a mesma pessoa pediu e cadastrou.
const sameOpener = (record: AuditRecord) => {
  const ss = normalize(record.requester || "").trim();
  const work = normalize(record.work.openedBy || "").trim();
  return Boolean(ss) && ss === work;
};

// O que cada código de SIGCO afirma sobre a ocorrência. É a mesma tabela usada pelo motor
// para julgar a coerência do código; aqui ela serve para confrontar o código com o material
// que a obra de fato movimentou.
const SIGCO_MEANING: Record<string, string> = {
  "20497": "abalroamento",
  "25983": "código que exige análise obrigatória",
  "8812": "transformador queimado",
  "25962": "transformador avariado",
  "8385": "código que não comprova falha do transformador",
};

// Confronto entre o SIGCO da ocorrência e o material conferido da obra. É leitura, não
// decisão: nenhuma regra do motor depende disto. Serve para o analista ver, na mesma tela,
// que um código de troca de equipamento não bate com uma obra que não movimentou trafo.
// O âmbar fica reservado à incoerência de fato — código que afirma algo que o material não
// sustenta, ou código ausente. Códigos que apenas pedem validação saem em tom neutro, para
// não contradizer o status de coerência mostrado ao lado.
function sigcoVsMaterial(record: AuditRecord): { tone: string; text: string } {
  const code = (record.sigco || "").trim();
  const meaning = SIGCO_MEANING[code];
  const { transformers, poles } = record.material;
  const moved = `A obra movimentou ${transformers} transformador(es) e ${poles} poste(s)`;
  if (!record.work.number) {
    return { tone: "", text: "SS sem obra gerada: não há material para confrontar com o código." };
  }
  if (!code || code === "#N/A") {
    return { tone: "alert", text: `Código ausente. ${moved} — a New Base deve recomendar abertura ou correção do SIGCO com motivo.` };
  }
  if (code === "8812" || code === "25962") {
    return transformers > 0
      ? { tone: "ok", text: `O código aponta ${meaning} e a base de itens comprova ${transformers} transformador(es) movimentado(s) na obra: código e material convergem.` }
      : { tone: "alert", text: `O código aponta ${meaning}, mas a base de itens não registra nenhum transformador movimentado na obra. Sem troca de equipamento, o código não se sustenta pelo material.` };
  }
  if (code === "20497") {
    return poles > 0 || transformers > 0
      ? { tone: "ok", text: `O código aponta ${meaning} e ${moved.toLowerCase()}, compatível com dano físico em campo.` }
      : { tone: "alert", text: `O código aponta ${meaning}, mas a obra não movimentou transformador nem poste — não há material que evidencie o impacto.` };
  }
  if (code === "8385") {
    return { tone: "", text: `${moved} — como 8385 não afirma, sozinho, a falha do equipamento, é o material, e não o código, que sustenta ou não a troca.` };
  }
  if (code === "25983") {
    return { tone: "", text: `25983 é permitido, mas exige análise por SIGCO em qualquer cenário. ${moved} — o material entra como evidência dessa análise, não a dispensa.` };
  }
  return { tone: "", text: `${code} é um código sem regra conclusiva no manual. ${moved}; o código precisa ser validado contra a causa e a condição antes de sustentar a decisão.` };
}

const REQUEST_LABEL: Record<string, string> = {
  "FORMS SUBST DE TRANSFORMADOR": "Forms substituição de transformador",
  "AVISO DE ANOMALIA": "Aviso de anomalia",
  "SOLICITAÇÃO DE SERVIÇO": "Solicitação de serviço",
};

const requestClass = (value?: string) => {
  const key = (value || "").toUpperCase();
  if (key.includes("FORMS")) return "forms";
  if (key.includes("ANOMALIA") || key.includes("SOLICITAÇÃO DE SERVIÇO") || key.includes("SOLICITACAO DE SERVICO")) return "aviso";
  return "none";
};

const requestLabel = (value?: string) => REQUEST_LABEL[(value || "").toUpperCase()] || value || "Origem não informada";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dayLabel = (iso: string) => {
  if (!iso) return "Sem data";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year}` : iso;
};

// As SS fora das 134 nao tem auditoria caso a caso — a base nao guarda isso. Elas viram
// um registro enxuto (lite = true) com o que existe de fato. O que mudou: as 1.581 SS de
// jan a jul agora carregam tambem a camada de campo automatica, entao a aba "Análise por
// Intervenções" deixa de ser exclusiva das 134 e passa a ter lastro para quase todas.
const splitList = (value?: string) => (value || "").split(" | ").map((item) => item.trim()).filter(Boolean);

function fieldFromUniverse(u: UniverseRecord): FieldAnalysis | undefined {
  if (u.QTD_INTERVENCOES_CAMPO === null || u.QTD_INTERVENCOES_CAMPO === undefined) return undefined;
  return {
    interventions: u.QTD_INTERVENCOES_CAMPO,
    before: u.INTERV_ANTES_DA_SS ?? null, inWindow: u.INTERV_NA_JANELA ?? null,
    afterSwap: u.INTERV_DEPOIS_DA_TROCA ?? null,
    daysToNearest: u.DIAS_INTERV_MAIS_PROXIMA ?? null, nearestDate: u.DATA_INTERV_MAIS_PROXIMA || "",
    window: u.JANELA_TEMPORAL || "", cause: u.CAUSA_CAMPO || "", subcause: u.SUBCAUSA_CAMPO || "",
    reading: u.LEITURA_CAMPO || "", confrontation: u.CONFRONTO_CAMPO || "",
    recurrence: u.REINCIDENCIA_POS_TROCA || "", team: "",
    executorNote: u.OBS_CAMPO || "",
    rules: (u.SINAIS_R_CAMPO || "").split(";").map((item) => item.trim()).filter(Boolean),
    doubtLevel: u.NIVEL_DUVIDA_CAMPO === "SEM DUVIDA" ? "" : (u.NIVEL_DUVIDA_CAMPO || ""),
    doubtScore: u.SCORE_DUVIDA_CAMPO ?? 0,
    pros: splitList(u.EVIDENCIAS_CAMPO).map((text) => ({ level: "", text })),
    cons: splitList(u.CONTRA_EVIDENCIAS_CAMPO),
    inManualReview74: u.DECISAO_FINAL === "REVISAO MANUAL",
    expurgeReason: "",
  };
}

function liteRecord(u: UniverseRecord): AuditRecord {
  const iso = (u.DATA_ABERTURA_SS || "").slice(0, 10);
  const month = iso ? Number(iso.slice(5, 7)) : 0;
  const decision = u.DECISAO_FINAL || "REVISAO MANUAL";
  return {
    fieldAnalysis: fieldFromUniverse(u),
    id: u.ID_AUDITORIA || `UNI-${u.NUMERO_SS}`,
    ss: u.NUMERO_SS, os: u.NUMERO_OS || "",
    openedAt: iso, openedAtLabel: dayLabel(iso), month,
    category: u.CATEGORIA || "SEM CATEGORIA",
    location: u.LOCALIDADE || "—", type: u.TIPOSS || "", sigco: u.SIGCO || "",
    requestType: u.TIPOSS || "", origin: u.ORG_SOLIC || "", requester: u.SOLICITANTE || "",
    powerRemoved: Number(u.POTENCIA_RET) || 0, powerInstalled: Number(u.POTENCIA_INST) || 0,
    ssAnalysis: { description: u.DESCRICAO_SS || "", category: u.CATEGORIA || "", causeHint: u.CAUSA || "", evidence: "" },
    osAnalysis: { description: u.DESCRICAO_OS || "", action: u.CAUSA || "—", transformerEvidence: u.MATERIAL_CONFERIDO || "—", evidence: "" },
    work: {
      number: u.NUM_OBRA || "", description: "", status: u.STATUS_OBRA || (u.NUM_OBRA ? "—" : "Sem obra"),
      contractor: u.EMPREITEIRA || "", terminal: false, analyticReason: "",
      ssAgeDays: u.IDADE_SS_DIAS, overdue: u.REGRA === "R-PRZ-60" || u.REGRA === "R-OBR-02", alerts: [],
    },
    material: {
      transformers: Number(u.TRAFOS_NO_MATERIAL) || 0, poles: Number(u.POSTES_NO_MATERIAL) || 0,
      lightningArresters: 0, items: 0, value: 0,
    },
    finance: { totalBudgeted: 0, totalRealized: 0, materialBudgeted: 0, materialRealized: 0, laborBudgeted: 0, laborRealized: 0 },
    consolidated: {
      decision, condition: u.CATEGORIA || "—", cause: u.CAUSA || "—", action: "—",
      materialEvidence: u.MATERIAL_CONFERIDO || "—", rule: u.REGRA || "—", rationale: u.MOTIVO || "",
      confidence: 0, confidenceBand: u.RECORTE && u.RECORTE !== "SEM DATA" ? "Triagem + campo automático" : "Triagem sem campo",
      automaticExpurge: u.EXPURGAR === "SIM", review: decision === "REVISAO MANUAL",
      sigcoStatus: u.SIGCO ? "Não avaliado nesta camada" : "SIGCO não informado",
      sigcoReason: "A conferência de SIGCO só foi feita nas 134 auditadas.",
      flags: [], approvalStatus: "PENDENTE", reviewer: "—", official: false,
    },
    universe: u, cohort: u.COORTE, audited134: false, lite: true,
  };
}

const sheetValue = (u: UniverseRecord, key: keyof UniverseRecord) => {
  const raw = u[key];
  if (raw === null || raw === undefined || raw === "") return "";
  return raw;
};

// Exportacao da planilha do recorte. Sai em CSV com BOM e separador ponto e virgula, que e
// o que o Excel em portugues espera: abre com duplo clique, sem passo de importacao. Nao
// usamos biblioteca de xlsx de proposito — o build do Pages roda com o lockfile travado.
function downloadSheet(rows: UniverseRecord[], title: string) {
  const safe = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60) || "planilha";
  const head = SHEET_COLUMNS.map((column) => column.label).join(";");
    const body = rows.map((row) => SHEET_COLUMNS
      .map((column) => String(sheetValue(row, column.key)).replace(/[;\r\n]+/g, " ").trim())
      .join(";")).join("\r\n");
  triggerDownload(new Blob([`\uFEFF${head}\r\n${body}`], { type: "text/csv;charset=utf-8" }), `${safe}.csv`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}


// ---------------------------------------------------------------- fluxo das 1.510
// Os recortes da caixa d'água. Cada um é um filtro sobre a mesma lista: o que a caixa
// mostra e o que o CSV baixa são exatamente as mesmas linhas.
const FLUXO_FILTROS: Array<{ id: string; caixa: string; rotulo: string; nota: string; teste: (r: FluxoRegistro) => boolean }> = [
  { id: "todos", caixa: "Entrada", rotulo: "Todas as SS", nota: "As 1.510 do recorte jan–jun.", teste: () => true },
  { id: "e0", caixa: "Entrada", rotulo: "Fora da base de falha", nota: "Furto, auxiliar de equipamento especial, preventivo e particular saem antes de tudo.", teste: (r) => r.e0_status === "RETIDO" },
  { id: "e1A", caixa: "1 · Interrupção", rotulo: "Nível A — dentro da janela", nota: "A SS foi aberta com o cliente desligado. Prova forte.", teste: (r) => r.e1_nivel === "A" },
  { id: "e1B", caixa: "1 · Interrupção", rotulo: "Nível B — até 24h", nota: "Perto da ocorrência, mas fora dela. Indício.", teste: (r) => r.e1_nivel === "B" },
  { id: "e1C", caixa: "1 · Interrupção", rotulo: "Nível C — mesmo dia", nota: "Só coincide a data.", teste: (r) => r.e1_nivel === "C" },
  { id: "e1F", caixa: "1 · Interrupção", rotulo: "Aparece em outra data", nota: "O ativo tem ocorrência no semestre, mas nenhuma perto da SS.", teste: (r) => r.e1_nivel === "FORA" },
  { id: "e1S", caixa: "1 · Interrupção", rotulo: "Sem nenhuma ocorrência", nota: "O código não aparece na Crítica em seis meses.", teste: (r) => r.e1_nivel === "SEM" },
  { id: "e1R", caixa: "1 · Interrupção", rotulo: "Retidos pelos sinais", nota: "Programado, preventivo, sem cliente, particular, outro elemento, individual.", teste: (r) => r.e1_status === "RETIDO" },
  { id: "e2S", caixa: "2 · Deslocamento", rotulo: "Sem atendimento no TMAE", nota: "Nenhuma nota de atendimento no código do trafo.", teste: (r) => r.e2_status === "SEM ATENDIMENTO" },
  { id: "e2D", caixa: "2 · Deslocamento", rotulo: "Atendimento sem deslocamento", nota: "A nota existe e a equipe não saiu.", teste: (r) => r.e2_status === "ATENDIMENTO SEM DESLOCAMENTO" },
  { id: "e2R", caixa: "2 · Deslocamento", rotulo: "Atendimento em outra data", nota: "Existe atendimento, mas longe da abertura da SS.", teste: (r) => r.e2_status === "RETIDO" },
  { id: "e2G", caixa: "2 · Deslocamento", rotulo: "Atendimento casado", nota: "Equipe deslocou na janela da SS.", teste: (r) => r.e2_status === "SEGUE" },
  { id: "e3R", caixa: "3 · SS/OS + material", rotulo: "Retidos no material", nota: "Sem transformador na obra, material não conferido ou OS sem texto.", teste: (r) => r.e3_status === "RETIDO" },
  { id: "e3G", caixa: "3 · SS/OS + material", rotulo: "Material comprova a troca", nota: "Obra conferida com transformador movimentado.", teste: (r) => r.e3_status === "SEGUE" },
  { id: "e4", caixa: "4 · Obra e SIGCO", rotulo: "Com alerta de obra ou SIGCO", nota: "R-OBR-01/02/03 e divergência de código.", teste: (r) => r.e4_status === "ALERTA" },
  { id: "incluir", caixa: "Saída", rotulo: "INCLUIR", nota: "Passou nas quatro peneiras.", teste: (r) => r.decisao === "INCLUIR" },
  { id: "revisao", caixa: "Saída", rotulo: "REVISÃO", nota: "Tem sinal contrário e espera leitura humana.", teste: (r) => r.decisao === "REVISÃO" },
  { id: "investigar", caixa: "Saída", rotulo: "INVESTIGAR", nota: "Sem lastro em nenhuma das duas bases, já com o teste do vizinho aplicado.", teste: (r) => r.decisao === "INVESTIGAR" },
  { id: "qa", caixa: "Saída", rotulo: "Queimados e avariados", nota: "O que sai limpo do funil e é queima ou avaria.", teste: (r) => r.decisao === "INCLUIR" && (r.categoria === "QUEIMADO" || r.categoria === "AVARIADO") },
];

const FLUXO_COLUNAS: Array<[string, string]> = [
  ["SS", "ss"], ["OS", "os"], ["Obra", "obra"], ["Ativo", "trafo"], ["Categoria", "categoria"],
  ["Decisão", "decisao"], ["Expurgo", "expurgo"], ["Abertura da SS", "abertura"], ["Término", "termino"],
  ["Situação", "situacao"], ["Entrada", "e0_status"], ["Motivo da saída", "e0_motivo"],
  ["E1 nível", "e1_nivel"], ["E1 situação", "e1_status"], ["E1 sinais", "e1_sinais"], ["E1 delta (h)", "e1_delta_h"],
  ["Conflito", "e1_conflito"], ["Ocorrência", "oc_num"], ["Início oc.", "oc_ini"], ["Fim oc.", "oc_fim"],
  ["Duração (h)", "oc_dur_h"], ["Clientes", "oc_cons"], ["Papel do trafo", "oc_papel"],
  ["Elemento do defeito", "oc_prob_ele"], ["Tipo", "oc_tipo"], ["Causa (Crítica)", "oc_causa"],
  ["Subcausa (Crítica)", "oc_sub"], ["E2 situação", "e2_status"], ["E2 nível", "e2_nivel"],
  ["E2 delta (h)", "e2_delta_h"], ["Atendimento", "at_num"], ["Início at.", "at_ini"], ["Equipe", "at_equipe"],
  ["Deslocou", "at_deslocou"], ["TMP", "at_tmp"], ["TMD", "at_tmd"], ["TME", "at_tme"], ["TMA", "at_tma"],
  ["Causa (TMAE)", "at_causa"], ["Subcausa (TMAE)", "at_sub"], ["E3 situação", "e3_status"],
  ["E3 motivo", "e3_motivo"], ["Trafos no material", "trafos_material"], ["Material conferido", "material_conferido"],
  ["E4", "e4_status"], ["Alertas de obra", "e4_alertas"], ["Classe da obra", "obra_classe"],
  ["Natureza", "obra_natureza"], ["Tipo da obra", "obra_tipo"], ["SIGCO da SS", "sigco"],
  ["SIGCO do projeto", "obra_sigco_proj"], ["Última movimentação", "obra_ultimo_nome"], ["Setor", "obra_setor"],
  ["Empreiteira", "obra_empreiteira"], ["Realizado", "obra_realizado"], ["Solicitante", "solicitante"],
  ["Origem", "origem"], ["Equipe da SS", "equipe_ss"], ["Tipo da solicitação", "tipo_ss"],
  ["Localidade", "localidade"], ["Alimentador", "alimentador"], ["Pot. retirada", "pot_ret"],
  ["Pot. instalada", "pot_inst"], ["Ocorrências do ativo", "ocorrencias_ativo"],
  ["Atendimentos do ativo", "atendimentos_ativo"], ["Teste do vizinho", "vizinho"],
  ["Decisão da base", "decisao_base"], ["Regra da base", "regra_base"],
  ["Observação (Crítica)", "oc_obs"], ["Observação (TMAE)", "at_obs"],
  ["Descrição da SS", "desc_ss"], ["Descrição da OS", "desc_os"],
];

function baixaFluxoCSV(linhas: FluxoRegistro[], titulo: string) {
  const cabec = FLUXO_COLUNAS.map(([rotulo]) => rotulo).join(";");
  const corpo = linhas.map((linha) => FLUXO_COLUNAS
    .map(([, campo]) => String(linha[campo] ?? "").replace(/[;\r\n]+/g, " ").trim())
    .join(";")).join("\r\n");
  const nome = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60);
  triggerDownload(new Blob([`\uFEFF${cabec}\r\n${corpo}`], { type: "text/csv;charset=utf-8" }), `${nome || "fluxo"}.csv`);
}

// Mediana, e não média: o delta da SS e os tempos do TMAE têm cauda longa (SS aberta dias
// depois da ocorrência), e a média sobre essa cauda deixa de descrever o caso típico.
function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const ordem = valores.slice().sort((a, b) => a - b);
  const meio = Math.floor(ordem.length / 2);
  return ordem.length % 2 ? ordem[meio] : (ordem[meio - 1] + ordem[meio]) / 2;
}

const numerosDe = (linhas: FluxoRegistro[], campo: string) => linhas
  .map((linha) => Number(linha[campo]))
  .filter((valor) => Number.isFinite(valor));

const umaCasa = (valor: number | null) => (valor === null ? "—" : valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));
const texto = (linha: FluxoRegistro, campo: string) => String(linha[campo] ?? "").trim();

function contaPor(linhas: FluxoRegistro[], chave: (linha: FluxoRegistro) => string, limite = 8): Pair[] {
  const mapa = new Map<string, number>();
  linhas.forEach((linha) => {
    const rotulo = chave(linha);
    if (!rotulo) return;
    mapa.set(rotulo, (mapa.get(rotulo) || 0) + 1);
  });
  return Array.from(mapa.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limite);
}

// O alerta do estágio 4 vem como frase de caso ("R-OBR-02 · obra não gerada, 179 dias…").
// No agregado interessa o tipo, senão cada SS vira uma categoria de uma linha só.
function tipoDeAlerta(valor: string): string {
  const bruto = valor.trim();
  if (!bruto) return "sem alerta";
  const regra = bruto.match(/^R-[A-Z]{3}-\d+/);
  if (regra) return regra[0];
  const sigco = bruto.match(/^(\d+)\s+espera\s+(.+)$/);
  if (sigco) return `SIGCO ${sigco[1]} espera ${sigco[2]}`;
  return bruto;
}

function Kpi({ label, value, note, tone = "neutral", onClick }: {
  label: string; value: string | number; note: string; tone?: string; onClick?: () => void;
}) {
  const shown = typeof value === "number" ? value.toLocaleString("pt-BR") : value;
  if (!onClick) return <article className={`kpi ${tone}`}><span>{label}</span><strong>{shown}</strong><small>{note}</small></article>;
  return <button type="button" className={`kpi ${tone} clickable`} onClick={onClick} title="Abrir a planilha deste recorte">
    <span>{label}</span><strong>{shown}</strong><small>{note}</small><em className="kpi-open">abrir planilha ↗</em>
  </button>;
}

function BarList({ data, total, moneyValues = false, onSelect, totalLabel = "da base" }: {
  data: Pair[]; total?: number; moneyValues?: boolean; onSelect?: (label: string) => void; totalLabel?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return <div className={`bar-list${onSelect ? " clickable" : ""}`}>
    {data.map((item) => {
      const body = <>
        <div><span>{item.label}</span><strong>{moneyValues ? money(item.value) : item.value}</strong></div>
        <i><b style={{ width: `${(item.value / max) * 100}%` }} /></i>
        {total ? <small>{pct(item.value, total)}% {totalLabel}</small> : null}
      </>;
      return onSelect
        ? <button type="button" className="bar-row" key={item.label} onClick={() => onSelect(item.label)} title="Abrir a planilha deste recorte">{body}</button>
        : <div className="bar-row" key={item.label}>{body}</div>;
    })}
  </div>;
}

// Indicadores do estágio selecionado. Cada peneira responde a uma pergunta diferente, então
// o bloco muda com o filtro em vez de repetir os mesmos totais em todas elas. Tudo é contado
// sobre as linhas que estão na tela — o que o cartão diz é o que a tabela e o CSV levam.
function FluxoIndicadores({ caixa, rotulo, linhas, janela }: {
  caixa: string; rotulo: string; linhas: FluxoRegistro[]; janela: number;
}) {
  const total = linhas.length;
  if (!total) return null;
  const conta = (teste: (linha: FluxoRegistro) => boolean) => linhas.filter(teste).length;
  const cartoes: Array<{ label: string; value: string | number; note: string; tone: string }> = [];
  const listas: Array<{ titulo: string; nota: string; dados: Pair[] }> = [];

  if (caixa === "1 · Interrupção") {
    const deltas = numerosDe(linhas, "e1_delta_h").map(Math.abs);
    const semCliente = conta((linha) => Number(linha.oc_cons) === 0);
    cartoes.push(
      { label: "SS no estágio", value: total, note: rotulo, tone: "ink" },
      { label: `Mediana do afastamento (janela ${janela}h)`, value: `${umaCasa(mediana(deltas))} h`, note: "Distância entre a abertura da SS e o início da ocorrência", tone: "blue" },
      { label: "Cliente interrompido zero", value: semCliente, note: `${pct(semCliente, total)}% — ocorrência sem cliente desligado`, tone: "amber" },
      { label: "Sem ocorrência no ativo", value: conta((linha) => !texto(linha, "oc_num")), note: "O código não aparece na Crítica no semestre", tone: "red" },
      { label: "Retidos pelos sinais", value: conta((linha) => linha.e1_status === "RETIDO"), note: "Programado, preventivo, sem cliente, outro elemento", tone: "amber" },
    );
    listas.push(
      { titulo: "Distribuição por nível", nota: "Nível recalculado na janela ativa", dados: contaPor(linhas, (linha) => `Nível ${texto(linha, "e1_nivel") || "—"}`) },
      { titulo: "Elemento do defeito", nota: "Código do elemento na Crítica", dados: contaPor(linhas, (linha) => texto(linha, "oc_prob_ele") || "sem ocorrência") },
      { titulo: "Causa registrada na Crítica", nota: "Causa da ocorrência", dados: contaPor(linhas, (linha) => texto(linha, "oc_causa") || "sem ocorrência") },
      { titulo: "Sinais que retiveram a SS", nota: "Só as SS com sinal escrito", dados: contaPor(linhas, (linha) => texto(linha, "e1_sinais")) },
    );
  } else if (caixa === "2 · Deslocamento") {
    const comAtendimento = conta((linha) => Boolean(texto(linha, "at_num")));
    const deslocou = conta((linha) => linha.at_deslocou === "SIM");
    cartoes.push(
      { label: "SS no estágio", value: total, note: rotulo, tone: "ink" },
      { label: "Com atendimento no TMAE", value: comAtendimento, note: `${pct(comAtendimento, total)}% têm nota no código do trafo`, tone: "green" },
      { label: "Equipe deslocou", value: deslocou, note: `${pct(deslocou, total)}% com deslocamento registrado`, tone: "green" },
      { label: "Mediana de TMA", value: `${umaCasa(mediana(numerosDe(linhas, "at_tma")))} min`, note: "Tempo médio de atendimento da nota", tone: "blue" },
      { label: "Mediana de TMD", value: `${umaCasa(mediana(numerosDe(linhas, "at_tmd")))} min`, note: "Tempo médio de deslocamento", tone: "blue" },
    );
    listas.push(
      { titulo: "Ranking de equipes", nota: "Equipe que atendeu a nota", dados: contaPor(linhas, (linha) => texto(linha, "at_equipe"), 10) },
      { titulo: "Causa registrada no TMAE", nota: "Causa da nota de atendimento", dados: contaPor(linhas, (linha) => texto(linha, "at_causa") || "sem atendimento") },
      { titulo: "Subcausa no TMAE", nota: "O que a equipe escreveu como subcausa", dados: contaPor(linhas, (linha) => texto(linha, "at_sub")) },
    );
  } else if (caixa === "3 · SS/OS + material") {
    const comTrafo = conta((linha) => Number(linha.trafos_material) > 0);
    const semConferencia = conta((linha) => linha.material_conferido !== "SIM");
    cartoes.push(
      { label: "SS no estágio", value: total, note: rotulo, tone: "ink" },
      { label: "Com trafo no material", value: comTrafo, note: `${pct(comTrafo, total)}% com transformador movimentado na obra`, tone: "green" },
      { label: "Sem conferência de material", value: semConferencia, note: "Obra fora do export ou obra não gerada", tone: "red" },
      { label: "Sem obra gerada", value: conta((linha) => !texto(linha, "obra")), note: "Sem obra não há material a conferir", tone: "amber" },
      { label: "Sem texto na OS", value: conta((linha) => !texto(linha, "desc_os")), note: "A OS não descreve o que foi executado", tone: "amber" },
    );
    listas.push(
      { titulo: "Motivo do estágio 3", nota: "O que o material disse sobre a troca", dados: contaPor(linhas, (linha) => texto(linha, "e3_motivo")) },
      { titulo: "Material conferido", nota: "Situação da conferência item a item", dados: contaPor(linhas, (linha) => texto(linha, "material_conferido") || "não informado") },
      { titulo: "Categoria declarada na SS", nota: "O que a SS alegou", dados: contaPor(linhas, (linha) => texto(linha, "categoria") || "sem categoria") },
    );
  } else if (caixa === "4 · Obra e SIGCO") {
    const comAlerta = conta((linha) => linha.e4_status === "ALERTA");
    const regraObra = conta((linha) => /^R-[A-Z]{3}-\d+/.test(texto(linha, "e4_alertas")));
    cartoes.push(
      { label: "SS no estágio", value: total, note: rotulo, tone: "ink" },
      { label: "Com alerta", value: comAlerta, note: `${pct(comAlerta, total)}% do recorte`, tone: "red" },
      { label: "Alerta de obra (R-OBR)", value: regraObra, note: "Despesa, obra não gerada ou natureza divergente", tone: "amber" },
      { label: "Divergência de SIGCO", value: comAlerta - regraObra, note: "O código espera uma condição que a base não sustenta", tone: "amber" },
      { label: "Obra encerrada", value: conta((linha) => texto(linha, "obra_status").includes("ENCERRAMENTO")), note: "Obra já em etapa de encerramento", tone: "blue" },
    );
    listas.push(
      { titulo: "Tipo de alerta", nota: "A frase de cada caso agrupada por tipo", dados: contaPor(linhas, (linha) => tipoDeAlerta(texto(linha, "e4_alertas"))) },
      { titulo: "Classe da obra", nota: "Imobilização, despesa ou sem cadastro", dados: contaPor(linhas, (linha) => texto(linha, "obra_classe") || "sem cadastro de obra") },
      { titulo: "Tipo da obra", nota: "Natureza cadastrada no projeto", dados: contaPor(linhas, (linha) => texto(linha, "obra_tipo") || "sem cadastro de obra") },
    );
  } else if (caixa === "Saída") {
    const expurgos = conta((linha) => linha.expurgo === "SIM");
    cartoes.push(
      { label: "SS na saída", value: total, note: rotulo, tone: "ink" },
      { label: "Queimados", value: conta((linha) => linha.categoria === "QUEIMADO"), note: `${pct(conta((linha) => linha.categoria === "QUEIMADO"), total)}% do recorte`, tone: "red" },
      { label: "Avariados", value: conta((linha) => linha.categoria === "AVARIADO"), note: `${pct(conta((linha) => linha.categoria === "AVARIADO"), total)}% do recorte`, tone: "blue" },
      { label: "Expurgos propostos", value: expurgos, note: "Proposta de saída do indicador, não decisão", tone: "red" },
      { label: "Com alerta de obra ou SIGCO", value: conta((linha) => linha.e4_status === "ALERTA"), note: "Entram na saída com ressalva escrita", tone: "amber" },
    );
    listas.push(
      { titulo: "Regra da base", nota: "Regra que a triagem acionou", dados: contaPor(linhas, (linha) => texto(linha, "regra_base") || "sem regra") },
      { titulo: "Decisão do fluxo", nota: "Resultado das quatro peneiras", dados: contaPor(linhas, (linha) => texto(linha, "decisao")) },
      { titulo: "Localidade", nota: "Onde a SS foi aberta", dados: contaPor(linhas, (linha) => texto(linha, "localidade"), 10) },
    );
  } else {
    const fora = conta((linha) => linha.e0_status === "RETIDO");
    cartoes.push(
      { label: "SS na entrada", value: total, note: rotulo, tone: "ink" },
      { label: "Fora da base de falha", value: fora, note: "Furto, preventivo, auxiliar e particular", tone: "red" },
      { label: "Queimados", value: conta((linha) => linha.categoria === "QUEIMADO"), note: "Categoria declarada na SS", tone: "red" },
      { label: "Avariados", value: conta((linha) => linha.categoria === "AVARIADO"), note: "Categoria declarada na SS", tone: "blue" },
      { label: "Emergenciais", value: conta((linha) => linha.criticidade === "EMERGENCIAL"), note: "Criticidade registrada na abertura", tone: "amber" },
    );
    listas.push(
      { titulo: "Motivo da saída na entrada", nota: "Só as SS retidas antes das peneiras", dados: contaPor(linhas, (linha) => texto(linha, "e0_motivo")) },
      { titulo: "Como a solicitação nasceu", nota: "Tipo da SS", dados: contaPor(linhas, (linha) => texto(linha, "tipo_ss") || "não informado") },
      { titulo: "Origem", nota: "Órgão que abriu a SS", dados: contaPor(linhas, (linha) => texto(linha, "origem") || "não informada") },
    );
  }

  return <>
    <section className="kpi-grid fluxo-kpis">
      {cartoes.map((cartao) => <Kpi key={cartao.label} label={cartao.label} value={cartao.value} note={cartao.note} tone={cartao.tone} />)}
    </section>
    <section className="fluxo-listas">
      {listas.filter((lista) => lista.dados.length).map((lista) => <article className="panel fluxo-lista" key={lista.titulo}>
        <div className="panel-title"><div><span>{caixa}</span><h2>{lista.titulo}</h2></div><small>{lista.nota}</small></div>
        <BarList data={lista.dados} total={total} totalLabel="do filtro" />
      </article>)}
    </section>
  </>;
}

// Os blocos do método, do jeito que vierem do arquivo. Cada bloco é um cartão largo com
// título; o que não existir no JSON simplesmente não é desenhado.
function MetodoBlocos({ blocos }: { blocos: MetodoBloco[] }) {
  if (!blocos.length) return null;
  return <>{blocos.map((bloco, indice) => <article className="panel metodo-bloco wide" key={bloco.id || indice}>
    <div className="panel-title"><div><span>Método e decisões</span><h2>{bloco.titulo}</h2></div></div>
    {(bloco.paragrafos || []).map((paragrafo, i) => <p className="metodo-paragrafo" key={i}>{paragrafo}</p>)}
    {bloco.itens && bloco.itens.length ? <div className="check-list metodo-itens">
      {bloco.itens.map((item, i) => <div key={item.rotulo || i}><b>✓</b><strong>{item.rotulo}</strong><span>{item.texto}</span></div>)}
    </div> : null}
    {bloco.tabela && bloco.tabela.linhas && bloco.tabela.linhas.length ? <div className="table-scroll metodo-tabela">
      <table className="records-table">
        <thead><tr>{(bloco.tabela.cabecalho || []).map((celula, i) => <th key={i}>{celula}</th>)}</tr></thead>
        <tbody>{bloco.tabela.linhas.map((linha, i) => <tr key={i}>
          {linha.map((celula, j) => <td key={j}>{j === 0 ? <strong>{celula}</strong> : <span>{celula}</span>}</td>)}
        </tr>)}</tbody>
      </table>
    </div> : null}
  </article>)}</>;
}

// A "planilha" do recorte. Abre por cima da tela com as mesmas colunas do universo-ss.json,
// filtro proprio e os dois downloads. O conteudo da tela e o do arquivo baixado sao o mesmo,
// filtro incluido — se divergissem, o numero da tela deixaria de ser auditavel.
function DrillSheet({ title, note, rows, onClose, onOpenRecord }: {
  title: string; note: string; rows: UniverseRecord[];
  onClose: () => void; onOpenRecord: (ss: string) => void;
}) {
  const [needle, setNeedle] = useState("");
  const [busy, setBusy] = useState("");
  const visible = useMemo(() => {
    const key = normalize(needle);
    if (!key) return rows;
    return rows.filter((row) => normalize([
      row.NUMERO_SS, row.NUMERO_OS, row.NUM_OBRA, row.LOCALIDADE, row.REGRA,
      row.CAUSA, row.DECISAO_FINAL, row.SOLICITANTE, row.EMPREITEIRA, row.COORTE,
      row.NUM_TRAFO, row.DECISAO_COM_CAMPO, row.SINAIS_R_CAMPO, row.CONFRONTO_CAMPO,
      row.SUBCAUSA_CAMPO, row.NIVEL_DUVIDA_CAMPO, row.RECORTE,
    ].join(" ")).includes(key));
  }, [rows, needle]);
  // A planilha tem dezenas de colunas (SHEET_COLUMNS.length, hoje 61 — o rodape imprime o
  // numero real, nao repita ele aqui). Desenhar 1.500 linhas disso trava o celular, entao a tela
  // mostra as primeiras 300 e o download continua levando tudo o que o filtro selecionou.
  const CAP = 300;
  const painted = visible.length > CAP ? visible.slice(0, CAP) : visible;
  const grab = () => {
    setBusy("csv");
    try { downloadSheet(visible, title); } finally { setBusy(""); }
  };
  return <div className="drawer-layer sheet-layer">
    <button className="drawer-backdrop" aria-label="Fechar" onClick={onClose} />
    <aside className="sheet-panel">
      <header>
        <div><span>PLANILHA DO RECORTE</span><h2>{title}</h2><p>{note}</p></div>
        <button onClick={onClose} aria-label="Fechar">×</button>
      </header>
      <div className="sheet-toolbar">
        <strong>{visible.length}{visible.length !== rows.length ? ` de ${rows.length}` : ""} SS</strong>
        <label className="search"><span>⌕</span><input value={needle} onChange={(event) => setNeedle(event.target.value)} placeholder="Filtrar SS, OS, obra, regra, local…" /></label>
        <button className="sheet-download" disabled={Boolean(busy)} onClick={grab}>{busy ? "Gerando…" : "Baixar planilha (CSV para Excel)"}</button>
      </div>
      <div className="sheet-scroll">
        <table className="sheet-table">
          <thead><tr>{SHEET_COLUMNS.map((column) => <th key={String(column.key)}>{column.label}</th>)}</tr></thead>
          <tbody>{painted.map((row) => <tr key={row.NUMERO_SS} onClick={() => onOpenRecord(row.NUMERO_SS)} title="Abrir o dossiê desta SS">
            {SHEET_COLUMNS.map((column) => {
              const value = sheetValue(row, column.key);
              const cls = column.key === "DECISAO_FINAL" ? `cell-${decisionClass(String(value))}`
                : column.key === "DECISAO_COM_CAMPO" && value ? `cell-${decisionClass(String(value))}`
                : column.key === "MUDOU_COM_CAMPO" && value === "SIM" ? "cell-warn"
                : column.key === "NIVEL_DUVIDA_CAMPO" && value === "FORTE" ? "cell-bad"
                : column.key === "AUDITADA_134" && value === "SIM" ? "cell-mark"
                : column.key === "DIVERGE_DO_SITE" && value === "SIM" ? "cell-warn" : "";
              return <td key={String(column.key)} className={cls}>{value === "" ? "—" : String(value)}</td>;
            })}
          </tr>)}</tbody>
        </table>
        {visible.length ? null : <div className="empty"><strong>Nenhuma SS neste filtro</strong><span>Limpe o filtro para ver as {rows.length} SS do recorte.</span></div>}
      </div>
      <footer className="sheet-foot">{visible.length > CAP
        ? `A tela desenha as primeiras ${CAP} linhas para não travar no celular. O arquivo baixado leva as ${visible.length.toLocaleString("pt-BR")} linhas do filtro, com as ${SHEET_COLUMNS.length} colunas.`
        : `O arquivo baixado tem exatamente as linhas e colunas mostradas aqui, filtro incluído — ${SHEET_COLUMNS.length} colunas.`}</footer>
    </aside>
  </div>;
}

// Conferência item a item do material da obra. O que a aba Obras informava vale apenas até
// a base de itens dizer outra coisa — aqui fica visível o que foi conferido, o que foi
// corrigido e qual transformador de fato saiu do almoxarifado.
function MaterialConferenceBox({ record }: { record: AuditRecord }) {
  const conference = record.material.conference;
  const conflict = Boolean(record.work.analyticConflict);
  const sheetReason = (record.work.analyticReasonSource || "").trim();
  if (!conference && !conflict) return null;
  return <>
    {conference ? <article className={`work-alerts${conference.status === "Corrigido" ? " danger" : ""}`}>
      <span>CONFERÊNCIA COM A BASE DE ITENS DA OBRA</span>
      <ul>
        <li><b>{conference.status}</b> — {conference.detail}</li>
        {record.work.number ? <li>{conference.items} item(ns) na obra · {money(conference.value)}{conference.valueMatches ? " · valor confere com a planilha" : " · valor diverge da planilha"}</li> : null}
        {conference.transformerItems.map((item) => <li key={`${item.codigo}-${item.descricao}`}>
          Transformador aplicado: <b>{item.codigo}</b> {item.descricao} · {item.qtd} un · {money(item.valor)}
        </li>)}
        {record.work.number && !conference.transformerItems.length
          ? <li>Nenhum item iniciado por “TRANSF DISTR” nesta obra.</li> : null}
      </ul>
    </article> : null}
    {conflict ? <article className="work-alerts danger">
      <span>DIVERGÊNCIA CORRIGIDA NO ALERTA ANALÍTICO</span>
      <ul>
        <li>A aba Base_Analitica dizia <b>{sheetReason || "—"}</b>.</li>
        <li>A base de itens comprova {record.material.transformers} transformador(es) e {record.material.poles} poste(s) nesta obra, então o alerta correto é <b>{record.work.analyticReason || "sem alerta"}</b>.</li>
      </ul>
    </article> : null}
  </>;
}

// Aba "Análise por Intervenções" do dossiê. Mostra tudo o que a base TMAE/SIGOD registra
// sobre o transformador daquela SS, as regras de campo acionadas, as evidências a favor e
// contra a dúvida, e permite levar a regra de campo direto para o motivo do expurgo.
function FieldTab({ record, rules, onUseReason }: { record: AuditRecord; rules: FieldRule[]; onUseReason: (reason: string) => void }) {
  const field = record.fieldAnalysis;
  if (!field) {
    return <><h3>Análise por Intervenções</h3><div className="empty"><strong>Sem cruzamento de campo</strong><span>Este registro não foi confrontado com a base de interrupções TMAE/SIGOD.</span></div></>;
  }
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const dash = (value: string | number | null | undefined) => (value === null || value === undefined || value === "" ? "—" : value);
  return <>
    <h3>Análise por Intervenções</h3>
    <article className={`field-box ${normalize(field.doubtLevel || "").toLowerCase() || "sem"}`}>
      <span>LEITURA DO CAMPO</span>
      <strong>{field.confrontation || "Sem intervenção registrada"}</strong>
      <p>
        {field.interventions} intervenção(ões) registrada(s) no operativo
        {field.doubtLevel ? ` · dúvida ${field.doubtLevel} (score ${field.doubtScore})` : " · nenhuma evidência de dúvida"}
        {field.inManualReview74 ? " · já está na revisão manual" : " · fora da revisão manual"}
      </p>
    </article>
    <section className="detail-grid">
      <div><span>Intervenções no transformador</span><strong>{field.interventions}</strong></div>
      <div><span>Antes da SS</span><strong>{dash(field.before)}</strong></div>
      <div><span>Na janela da SS</span><strong>{dash(field.inWindow)}</strong></div>
      <div><span>Depois da troca</span><strong>{dash(field.afterSwap)}</strong></div>
      <div><span>Dias até a mais próxima</span><strong>{dash(field.daysToNearest)}</strong></div>
      <div><span>Data da mais próxima</span><strong>{dash(field.nearestDate)}</strong></div>
      <div><span>Janela temporal</span><strong>{dash(field.window)}</strong></div>
      <div><span>Reincidência pós-troca</span><strong>{dash(field.recurrence)}</strong></div>
      <div><span>Causa SIGOD</span><strong>{dash(field.cause)}</strong></div>
      <div><span>Subcausa SIGOD</span><strong>{dash(field.subcause)}</strong></div>
      <div><span>Leitura de campo</span><strong>{dash(field.reading)}</strong></div>
      <div><span>Equipe</span><strong>{dash(field.team)}</strong></div>
    </section>
    <article className="source-text"><span>OBSERVAÇÃO DO EXECUTANTE EM CAMPO</span><p>{field.executorNote || "Sem observação registrada pela equipe."}</p></article>
    {field.rules.length ? <article className="work-alerts"><span>REGRAS DE CAMPO ACIONADAS</span><ul>
      {field.rules.map((id) => <li key={id}><b>{id}</b> — {byId.get(id)?.label || id}: {byId.get(id)?.description || ""}</li>)}
    </ul></article> : null}
    {field.pros.length ? <article className="work-alerts danger"><span>EVIDÊNCIAS A FAVOR DA DÚVIDA</span><ul>
      {field.pros.map((pro) => <li key={pro.text}><b>{pro.level}</b> — {pro.text}</li>)}
    </ul></article> : null}
    {field.cons.length ? <article className="work-alerts"><span>EVIDÊNCIAS CONTRA A DÚVIDA</span><ul>
      {field.cons.map((con) => <li key={con}>{con}</li>)}
    </ul></article> : null}
    {field.expurgeReason ? <button type="button" className="field-reason" onClick={() => onUseReason(field.expurgeReason)}>
      Usar “{field.expurgeReason}” como motivo do expurgo
    </button> : null}
  </>;
}

function RequestTag({ record }: { record: AuditRecord }) {
  const type = record.requestType || record.type;
  return <b className={`request-tag ${requestTone(type)}`}>{type || "Tipo não informado"}</b>;
}

function RecordTable({
  records, mode, onOpen, statusOf,
}: {
  records: AuditRecord[]; mode: "ss" | "os" | "newbase" | "expurgo"; onOpen: (record: AuditRecord) => void;
  statusOf: (record: AuditRecord) => string;
}) {
  return <div className="table-scroll"><table className="records-table">
    <thead><tr>
      <th>Identificação</th>
      <th>Data / local</th>
      {mode === "ss" && <><th>Leitura da SS</th><th>Evidência</th></>}
      {mode === "os" && <><th>Ação da OS</th><th>Obra / material</th></>}
      {mode === "newbase" && <><th>Consolidado</th><th>Regra / confiança</th><th>Aprovação</th></>}
      {mode === "expurgo" && <><th>Obra</th><th>Origem da solicitação</th><th>Decisão / regra</th></>}
    </tr></thead>
    <tbody>{records.map((record) => <tr key={record.id} onClick={() => onOpen(record)}>
      <td><strong>{record.ss}</strong><span>{record.os}</span><code>{record.id}</code></td>
      <td><strong>{record.openedAtLabel}</strong><span>{record.location}</span><small>SIGCO {record.sigco || "—"}</small></td>
      {mode === "ss" && <><td><b className={`condition ${record.category.toLowerCase()}`}>{record.category}</b><span>{record.ssAnalysis.causeHint}</span></td><td><p className="clip">{record.ssAnalysis.evidence || record.ssAnalysis.description}</p></td></>}
      {mode === "os" && <><td><strong>{record.osAnalysis.action}</strong><span>{record.osAnalysis.transformerEvidence}</span></td><td><strong>{record.work.number || "Sem obra"}</strong><span>{record.work.description || record.work.status}</span><small>{record.material.transformers} trafo · {record.material.poles} poste</small></td></>}
      {mode === "newbase" && <><td><b className={`pill ${decisionClass(record.consolidated.decision)}`}>{record.consolidated.decision}</b><span>{record.consolidated.cause}</span><small>{record.consolidated.rationale}</small></td><td><code>{record.consolidated.rule}</code><span>{record.consolidated.confidence}% · {record.consolidated.confidenceBand}</span></td><td><b className={`pill ${statusOf(record) === "APROVADO" ? "good" : statusOf(record) === "REJEITADO" ? "bad" : "warn"}`}>{statusOf(record)}</b><span>{record.consolidated.reviewer.replace("Matheus Gracia", "Mateus Gracia")}</span></td></>}
      {mode === "expurgo" && <>
        <td><strong>{record.work.number || "Sem obra gerada"}</strong><span>{record.work.description || record.work.status}</span><small>{record.material.transformers} trafo · {record.material.poles} poste · {money(record.material.value)}</small></td>
        <td><RequestTag record={record} /><span>Origem {record.origin || "—"}</span><small>{record.requester || "Solicitante não informado"}</small></td>
        <td><b className={`pill ${decisionClass(record.consolidated.decision)}`}>{record.consolidated.decision}</b><span>{record.consolidated.cause}</span><small><code>{record.consolidated.rule}</code>{record.consolidated.confidence}% · {record.consolidated.confidenceBand}</small></td>
      </>}
    </tr>)}</tbody>
  </table></div>;
}

export default function Page() {
  const [data, setData] = useState<AuditData | null>(null);
  const [universe, setUniverse] = useState<UniverseData | null>(null);
  // O recorte de trabalho é o das 1.510 de jan a jun. O universo inteiro continua a um
  // clique no seletor, mas quem abre o painel precisa cair no número que está sendo auditado.
  const [scope, setScope] = useState<Scope>("JAN-JUN 1510");
  const [drill, setDrill] = useState<{ title: string; note: string; rows: UniverseRecord[] } | null>(null);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [user, setUser] = useState<DemoUser>(VISITANTE);   // identidade só serve para assinar aprovação
  const [module, setModule] = useState<Module>("overview");
  const [query, setQuery] = useState("");
  const [assetQuery, setAssetQuery] = useState("");
  const [fluxo, setFluxo] = useState<FluxoData | null>(null);
  const [fluxoFiltro, setFluxoFiltro] = useState("");
  const [fluxoBusca, setFluxoBusca] = useState("");
  const [fluxoAtivo, setFluxoAtivo] = useState("");
  const [metodo, setMetodo] = useState<MetodoData | null>(null);
  const [selected, setSelected] = useState<AuditRecord | null>(null);
  const [detailTab, setDetailTab] = useState<"consolidado" | "ss" | "os" | "obra" | "campo" | "historico">("consolidado");
  const [comment, setComment] = useState("");
  const [expurgeReason, setExpurgeReason] = useState("");
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    fetch(assetUrl("auditorias.json")).then((response) => response.json()).then(setData);
    fetch(assetUrl("universo-ss.json")).then((response) => response.json()).then(setUniverse)
      .catch(() => setUniverse(null));
    fetch(assetUrl("municipios-to.json")).then((response) => response.json()).then(setMunicipalities);
    fetch(assetUrl("fluxo-1510.json")).then((response) => response.json()).then(setFluxo).catch(() => setFluxo(null));
    // O metodo.json e gerado fora do site. Enquanto nao existir, o fetch da 404 e as duas
    // secoes simplesmente nao aparecem — sem mensagem de erro para o leitor.
    fetch(assetUrl("metodo.json")).then((response) => (response.ok ? response.json() : null))
      .then(setMetodo).catch(() => setMetodo(null));
    const saved = localStorage.getItem("auditoria-134-historico");
    if (saved) Promise.resolve().then(() => setOverrides(JSON.parse(saved)));
    const savedUser = localStorage.getItem("auditoria-134-usuario");
    const match = EQUIPE.find((item) => item.id === savedUser);
    if (match) Promise.resolve().then(() => setUser(match));
    const savedScope = localStorage.getItem("auditoria-134-escopo") as Scope | null;
    if (savedScope && SCOPES.some((item) => item.id === savedScope)) Promise.resolve().then(() => setScope(savedScope));
  }, []);

  // Base unica do app: as 134 continuam com o dossie completo e ganham as colunas do
  // universo; as outras 1.448 entram como registro enxuto. Se o universo-ss.json nao
  // carregar, o app volta a ser exatamente o que era antes — so as 134.
  const allRecords = useMemo<AuditRecord[]>(() => {
    if (!data) return [];
    if (!universe) return data.records;
    const rich = new Map(data.records.map((record) => [record.ss, record]));
    return universe.records.map((row) => {
      const match = rich.get(row.NUMERO_SS);
      if (match) return { ...match, universe: row, cohort: row.COORTE, audited134: true, lite: false };
      return liteRecord(row);
    });
  }, [data, universe]);

  const scopedRecords = useMemo(() => {
    if (scope === "UNIVERSO") return allRecords;
    if (scope === "AUDITADAS 134") return allRecords.filter((record) => record.audited134);
    // Os recortes de periodo saem do campo RECORTE, gravado pela data de abertura da SS.
    // Nao se recalcula a data aqui: se o corte mudar, ele muda em um lugar so, na base.
    if (scope === "JAN-JUN 1510") return allRecords.filter((record) => record.universe?.RECORTE === "JAN-JUN");
    if (scope === "JULHO") return allRecords.filter((record) => record.universe?.RECORTE === "JULHO");
    return allRecords.filter((record) => record.cohort === scope);
  }, [allRecords, scope]);

  const scopedRows = useMemo(() => scopedRecords
    .map((record) => record.universe)
    .filter((row): row is UniverseRecord => Boolean(row)), [scopedRecords]);

  const scopeLabel = SCOPES.find((item) => item.id === scope)?.label || "Universo";

  // Abre a planilha de um recorte. O predicado roda sobre o escopo ativo, entao o que o
  // usuario ve no cartao e exatamente o que abre — nunca o universo inteiro por engano.
  const openSheet = (title: string, note: string, filter?: (row: UniverseRecord) => boolean) => {
    const rows = filter ? scopedRows.filter(filter) : scopedRows;
    setDrill({ title: `${title} · ${scopeLabel}`, note, rows });
  };
  const openSheetFor = (title: string, note: string, records: AuditRecord[]) => {
    setDrill({
      title: `${title} · ${scopeLabel}`, note,
      rows: records.map((record) => record.universe).filter((row): row is UniverseRecord => Boolean(row)),
    });
  };

  const saveChange = (record: AuditRecord, change: Omit<Change, "at" | "actor">) => {
    const next = {
      ...overrides,
      [record.id]: [...(overrides[record.id] || []), {
        ...change, at: new Date().toISOString(), actor: user?.name || "Usuário de demonstração",
      }],
    };
    setOverrides(next);
    localStorage.setItem("auditoria-134-historico", JSON.stringify(next));
    setComment("");
    setExpurgeReason("");
  };
  const statusOf = (record: AuditRecord) => overrides[record.id]?.at(-1)?.status || record.consolidated.approvalStatus;
  const allHistory = useMemo(() => Object.entries(overrides)
    .flatMap(([recordId, changes]) => changes.map((change) => ({ recordId, ...change })))
    .sort((a, b) => b.at.localeCompare(a.at)), [overrides]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = normalize(query);
    const bySearch = scopedRecords.filter((record) => !needle || normalize([
      record.ss, record.os, record.location, record.sigco, record.category, record.consolidated.decision,
      record.consolidated.cause, record.consolidated.rule, record.work.number,
    ].join(" ")).includes(needle));
    // uma busca por "R-CAMPO-03" passa a encontrar os dossiês pela regra de campo acionada
    const byField = needle && FIELD_RULE_IDS.some((id) => normalize(id).includes(needle))
      ? scopedRecords.filter((record) => (record.fieldAnalysis?.rules || []).some((id) => normalize(id).includes(needle)))
      : [];
    const merged = byField.length ? Array.from(new Set([...bySearch, ...byField])) : bySearch;
    if (module === "expurgos") return merged.filter((record) => record.consolidated.decision === "EXPURGAR");
    if (module === "sigco") return merged.filter((record) => record.consolidated.flags.includes("Análise por SIGCO"));
    if (module === "revisoes") return merged.filter((record) => record.consolidated.review);
    // a fila de aprovacao continua sendo so das 134: e o unico lote que passou por campo
    if (module === "aprovacoes") return merged.filter((record) => record.audited134 !== false).filter((record) =>
      (overrides[record.id]?.at(-1)?.status || record.consolidated.approvalStatus) === "PENDENTE");
    return merged;
  }, [data, scopedRecords, query, module, overrides]);

  if (!data) return <main className="loading"><i /><span>Carregando o universo de SS…</span></main>;


  const audited = allRecords.filter((record) => record.audited134 !== false);
  const approved = audited.filter((record) => statusOf(record) === "APROVADO").length;
  const title = TITLES[module];
  // A descricao do modulo Universo carrega o total da base. Ele vem do arquivo, nao de um
  // literal, para nunca mais existir uma pagina dizendo um numero e os cartoes dizendo outro.
  const pageDescription = module === "universo" && universe
    ? `As ${universe.totals.universo.toLocaleString("pt-BR")} SS da base, divididas por coorte e por período, com a regra de expurgo aplicada, a camada de campo em ${(universe.totals.comCampo ?? 0).toLocaleString("pt-BR")} delas e as 134 auditadas sinalizadas.`
    : title.description;
  const openRecord = (record: AuditRecord) => { setSelected(record); setDetailTab("consolidado"); setComment(""); setExpurgeReason(""); };
  const trocarIdentidade = (id: string) => {
    const escolhido = EQUIPE.find((item) => item.id === id) || VISITANTE;
    localStorage.setItem("auditoria-134-usuario", escolhido.id);
    setUser(escolhido);
  };
  const municipalityIndex = new Map(municipalities.map((item) => [normalize(item.name), item]));
  const mapPoints = Object.values(scopedRecords.reduce<Record<string, {
    name: string; total: number; burned: number; damaged: number; expurged: number;
  }>>((acc, record) => {
    const key = normalize(record.location);
    const current = acc[key] || { name: record.location, total: 0, burned: 0, damaged: 0, expurged: 0 };
    current.total += 1;
    current.burned += record.category === "QUEIMADO" ? 1 : 0;
    current.damaged += record.category === "AVARIADO" ? 1 : 0;
    current.expurged += record.consolidated.decision === "EXPURGAR" ? 1 : 0;
    acc[key] = current;
    return acc;
  }, {})).flatMap((point) => {
    const geo = municipalityIndex.get(normalize(point.name));
    return geo ? [{ ...point, latitude: geo.latitude, longitude: geo.longitude }] : [];
  });

  // Todos os numeros do painel saem daqui — do escopo ativo, nunca de um resumo pre-calculado.
  // Assim o que o cartao mostra e o que a planilha abre sao literalmente a mesma lista.
  // O site grava "REVISÃO MANUAL" com acento e o universo grava "REVISAO MANUAL" sem.
  // Sem esta normalizacao os 75 dossiês auditados sumiriam da contagem de revisao.
  const decisionOf = (record: AuditRecord) => normalize(record.consolidated.decision).toUpperCase();
  const isDecision = (record: AuditRecord, value: string) => decisionOf(record) === value;
  const scoped = {
    total: scopedRecords.length,
    audited: scopedRecords.filter((record) => record.audited134 !== false).length,
    lite: scopedRecords.filter((record) => record.lite).length,
    burned: scopedRecords.filter((record) => record.category === "QUEIMADO").length,
    damaged: scopedRecords.filter((record) => record.category === "AVARIADO").length,
    included: scopedRecords.filter((record) => isDecision(record, "INCLUIR")).length,
    expurged: scopedRecords.filter((record) => isDecision(record, "EXPURGAR")).length,
    review: scopedRecords.filter((record) => isDecision(record, "REVISAO MANUAL")).length,
    pending: scopedRecords.filter((record) => isDecision(record, "PENDENTE TEMPORAL")).length,
    noWork: scopedRecords.filter((record) => !record.universe?.NUM_OBRA).length,
    diverging: scopedRows.filter((row) => row.DIVERGE_DO_SITE === "SIM").length,
    // Camada de campo. "comCampo" conta quem foi cruzado com a base de interrupcao —
    // e diferente de "audited", que conta so as 134 lidas caso a caso.
    comCampo: scopedRows.filter((row) => Boolean(row.RECORTE) && row.RECORTE !== "SEM DATA").length,
    comIntervencao: scopedRows.filter((row) => (row.QTD_INTERVENCOES_CAMPO ?? 0) > 0).length,
    semIntervencao: scopedRows.filter((row) => row.JANELA_TEMPORAL === "SEM INTERVENCAO").length,
    campoConfirma: scopedRows.filter((row) => (row.CONFRONTO_CAMPO || "").startsWith("CONFIRMA")).length,
    campoDiverge: scopedRows.filter((row) => (row.CONFRONTO_CAMPO || "").startsWith("DIVERGE")).length,
    campoAlerta: scopedRows.filter((row) => (row.CONFRONTO_CAMPO || "").startsWith("ALERTA")).length,
    duvidaForte: scopedRows.filter((row) => row.NIVEL_DUVIDA_CAMPO === "FORTE").length,
    reincidencia: scopedRows.filter((row) => row.REINCIDENCIA_POS_TROCA === "SIM").length,
    mudou: scopedRows.filter((row) => row.MUDOU_COM_CAMPO === "SIM").length,
    comCampoIncluir: scopedRows.filter((row) => row.DECISAO_COM_CAMPO === "INCLUIR").length,
    comCampoExpurgar: scopedRows.filter((row) => row.DECISAO_COM_CAMPO === "EXPURGAR").length,
    comCampoRevisao: scopedRows.filter((row) => row.DECISAO_COM_CAMPO === "REVISAO MANUAL").length,
    comCampoPendente: scopedRows.filter((row) => row.DECISAO_COM_CAMPO === "PENDENTE TEMPORAL").length,
    // Cobertura das tres analises dentro do escopo ativo. Estes contadores existem para que a
    // pergunta "todas tem SS, OS e material?" tenha resposta na tela, e nao na minha palavra.
    covSS: scopedRows.filter((row) => row.COBERTURA_SS === "ANALISADA").length,
    covOS: scopedRows.filter((row) => row.COBERTURA_OS === "ANALISADA").length,
    covMat: scopedRows.filter((row) => row.COBERTURA_MATERIAL === "CONFERIDO").length,
    covTri: scopedRows.filter((row) => row.TRIPLICE_COMPLETA === "SIM").length,
  };
  // O gráfico mensal também sai do escopo ativo, senão ele continuaria contando só as 134
  // enquanto os cartões acima falam de 1.592 — dois números do mesmo painel se contradizendo.
  const scopedMonths = (universe ? Array.from({ length: 12 }, (_, index) => index + 1) : data.byMonth.map((item) => item.month))
    .map((monthNumber) => {
      const rows = scopedRecords.filter((record) => record.month === monthNumber);
      return {
        month: monthNumber,
        label: data.byMonth.find((item) => item.month === monthNumber)?.label || MONTHS[monthNumber - 1] || String(monthNumber),
        total: rows.length,
        burned: rows.filter((record) => record.category === "QUEIMADO").length,
        damaged: rows.filter((record) => record.category === "AVARIADO").length,
      };
    })
    .filter((month) => month.total > 0);

  const br = (value: number) => value.toLocaleString("pt-BR");
  // As regras R-CAMPO tem duas fontes: o dossie das 134 (auditorias.json) e o cruzamento
  // automatico das 1.581 (universo-ss.json). Sao os mesmos ids; o catalogo une os dois para
  // que a aba de campo saiba descrever a regra venha o registro de onde vier.
  const fieldRuleCatalog: FieldRule[] = (() => {
    const merged = new Map<string, FieldRule>((data.fieldRules || []).map((rule) => [rule.id, rule]));
    (universe?.fieldRules || []).forEach((rule) => {
      if (!merged.has(rule.id)) merged.set(rule.id, { id: rule.id, label: rule.title, description: rule.detail, count: rule.count, records: [] });
    });
    return Array.from(merged.values());
  })();
  const scopeNote = universe
    ? `${br(scoped.total)} SS no escopo · ${br(scoped.comCampo)} com camada de campo · ${br(scoped.audited)} auditadas caso a caso`
    : `${br(scoped.total)} SS auditadas`;
  // O periodo tambem sai do escopo: a base tem SS de julho, e o rodape antigo dizia jan-jun.
  const scopedDates = scopedRows.map((row) => (row.DATA_ABERTURA_SS || "").slice(0, 10)).filter(Boolean).sort();
  const scopedPeriod = scopedDates.length
    ? `${dayLabel(scopedDates[0])} — ${dayLabel(scopedDates[scopedDates.length - 1])}`
    : `${data.meta.period.start} — ${data.meta.period.end}`;

  const changeScope = (next: Scope) => {
    setScope(next);
    setQuery("");
    localStorage.setItem("auditoria-134-escopo", next);
  };

  const ScopePicker = () => universe ? <section className="scope-picker">
    <div className="scope-picker-head"><span>Escopo</span><strong>{scopeNote}</strong></div>
    <div className="scope-picker-tabs">{SCOPES.map((item) => {
      const count = item.id === "UNIVERSO" ? allRecords.length
        : item.id === "AUDITADAS 134" ? allRecords.filter((record) => record.audited134).length
          : item.id === "JAN-JUN 1510" ? allRecords.filter((record) => record.universe?.RECORTE === "JAN-JUN").length
            : item.id === "JULHO" ? allRecords.filter((record) => record.universe?.RECORTE === "JULHO").length
              : allRecords.filter((record) => record.cohort === item.id).length;
      return <button key={item.id} type="button" className={scope === item.id ? "active" : ""}
        onClick={() => changeScope(item.id)} title={item.note}>
        <strong>{item.label}</strong><em>{count.toLocaleString("pt-BR")}</em>
      </button>;
    })}</div>
  </section> : null;

  const Queue = ({ mode = "newbase" }: { mode?: "ss" | "os" | "newbase" }) => <section className="panel list-panel">
    <div className="list-head"><div><span>{filtered.length} registros</span><strong>{module === "newbase" ? "New Base completa" : title.title}</strong></div>
      <label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar SS, OS, local, SIGCO, regra…" /></label>
    </div>
    <RecordTable records={filtered} mode={mode} onOpen={openRecord} statusOf={statusOf} />
  </section>;

  const renderModule = () => {
    if (module === "overview") return <>
      <ScopePicker />
      <section className="scope-strip cinco">
        <div><span>Escopo ativo</span><strong>{scopeLabel} · {br(scoped.total)} SS</strong></div>
        <div><span>Fonte ativa</span><strong>{universe ? universe.source : data.meta.source}</strong></div>
        <div><span>Período</span><strong>{universe ? scopedPeriod : `${data.meta.period.start} — ${data.meta.period.end}`}</strong></div>
        <div><span>Governança</span><strong>{approved} oficiais · {audited.length - approved} pendentes</strong></div>
        <p>{universe
          ? `Todo número desta tela conta as ${br(scoped.total)} SS do escopo ${scopeLabel} — trocar o escopo troca todos eles. Clique em qualquer número para abrir a planilha daquele recorte e baixá-la. ${br(scoped.comCampo)} SS do escopo passaram pela camada de campo (R-CAMPO): o código do transformador foi cruzado contra a base de interrupção. As ${br(scoped.audited)} auditadas caso a caso continuam sendo as únicas com veredito humano, e a decisão publicada delas não foi alterada.`
          : data.meta.note.replace("Matheus Gracia", "Mateus Gracia")}</p>
      </section>
      <section className="kpi-grid">
        <Kpi label="SS no escopo" value={scoped.total} note={universe ? `Escopo ${scopeLabel}` : "134 SS · 134 OS"} tone="ink"
          onClick={universe ? () => openSheet("SS no escopo", "Todas as SS do escopo ativo.") : undefined} />
        <Kpi label="Queimados na origem" value={scoped.burned} note={`${pct(scoped.burned, scoped.total)}% da carga`} tone="red"
          onClick={universe ? () => openSheetFor("Queimados na origem", "CATEGORIA = QUEIMADO.", scopedRecords.filter((r) => r.category === "QUEIMADO")) : undefined} />
        <Kpi label="Avariados na origem" value={scoped.damaged} note={`${pct(scoped.damaged, scoped.total)}% da carga`} tone="blue"
          onClick={universe ? () => openSheetFor("Avariados na origem", "CATEGORIA = AVARIADO.", scopedRecords.filter((r) => r.category === "AVARIADO")) : undefined} />
        <Kpi label="Proposta: incluir" value={scoped.included} note="Ainda não oficial" tone="green"
          onClick={universe ? () => openSheetFor("Proposta: incluir", "DECISAO_FINAL = INCLUIR.", scopedRecords.filter((r) => isDecision(r, "INCLUIR"))) : undefined} />
        <Kpi label="Proposta: expurgar" value={scoped.expurged} note="Sai da base de imobilização" tone="red"
          onClick={universe ? () => openSheetFor("Proposta: expurgar", "DECISAO_FINAL = EXPURGAR.", scopedRecords.filter((r) => isDecision(r, "EXPURGAR"))) : undefined} />
        <Kpi label="Revisão manual" value={scoped.review} note="Responsável: Mateus Gracia" tone="amber"
          onClick={universe ? () => openSheetFor("Revisão manual", "DECISAO_FINAL = REVISAO MANUAL.", scopedRecords.filter((r) => isDecision(r, "REVISAO MANUAL"))) : undefined} />
        <Kpi label="Pendência temporal" value={scoped.pending} note={`SS sem obra dentro dos ${data.workRules?.deadlineDays ?? 60} dias`} tone="blue"
          onClick={universe ? () => openSheetFor("Pendência temporal", "DECISAO_FINAL = PENDENTE TEMPORAL.", scopedRecords.filter((r) => isDecision(r, "PENDENTE TEMPORAL"))) : undefined} />
        <Kpi label="Obra não gerada" value={scoped.noWork} note="SS sem NUM_OBRA na base" tone="red"
          onClick={universe ? () => openSheet("Obra não gerada", "SS sem número de obra.", (row) => !row.NUM_OBRA) : undefined} />
        <Kpi label="Com camada de campo" value={scoped.comCampo} note="Cruzadas com a base de interrupção" tone="green"
          onClick={universe ? () => openSheet("Com camada de campo", "SS abertas de jan a jul/2026, cruzadas com a base de interrupção pelo código do trafo.", (row) => Boolean(row.RECORTE) && row.RECORTE !== "SEM DATA") : undefined} />
        <Kpi label="A decisão mudaria" value={scoped.mudou} note="Campo x decisão atual — nada foi sobrescrito" tone="amber"
          onClick={universe ? () => openSheet("A decisão mudaria com o campo", "MUDOU_COM_CAMPO = SIM. A decisão atual continua valendo; a coluna DECISAO_COM_CAMPO é a proposta, com o motivo escrito ao lado.", (row) => row.MUDOU_COM_CAMPO === "SIM") : undefined} />
      </section>
      <section className="dashboard-columns">
        <article className="panel chart-panel"><div className="panel-title"><div><span>Distribuição mensal · {scopeLabel}</span><h2>Abertura da SS</h2></div><small>Origem: data da SS · clique para abrir a planilha</small></div>
          <div className="month-chart">{scopedMonths.map((month) => <button type="button" className="month" key={month.month}
            onClick={universe ? () => openSheetFor(`SS abertas em ${month.label}`, "Recorte pela data de abertura da SS.", scopedRecords.filter((record) => record.month === month.month)) : undefined}
            title={universe ? "Abrir a planilha deste mês" : undefined}>
            <strong>{month.total}</strong><div className="stack" title={`${month.burned} queimados · ${month.damaged} avariados`}>
              <i className="burned" style={{ height: `${(month.burned / Math.max(...scopedMonths.map((item) => item.total), 1)) * 150}px` }} />
              <i className="damaged" style={{ height: `${(month.damaged / Math.max(...scopedMonths.map((item) => item.total), 1)) * 150}px` }} />
            </div><span>{month.label}</span>
          </button>)}</div>
          <div className="legend"><span><i className="burned" />Queimado</span><span><i className="damaged" />Avariado</span></div>
        </article>
        <article className="panel pipeline"><div className="panel-title"><div><span>Processo</span><h2>Três leituras, uma decisão</h2></div></div>
          {[
            ["01", "Análise de SS", "Solicitação, condição alegada e causa provável", br(scoped.total)],
            ["02", "Análise por OS", "Execução, ação e contrapontos", br(scoped.total)],
            ["03", "New Base", "Consolidação pendente de aprovação", br(scoped.total)],
          ].map((item) => <button key={item[0]} onClick={() => setModule(item[0] === "01" ? "ss" : item[0] === "02" ? "os" : "newbase")}>
            <b>{item[0]}</b><span><strong>{item[1]}</strong><small>{item[2]}</small></span><em>{item[3]}</em>
          </button>)}
        </article>
      </section>
      {data.materialConference ? <section className="panel conference-panel">
        <div className="panel-title"><div><span>Conferência de material · só as 134</span><h2>A base de itens da obra confirma as análises</h2></div><small>{data.materialConference.works} obras conferidas</small></div>
        {universe ? <p className="scope-warn">Este bloco não acompanha o escopo: a conferência item a item só foi feita nas 134 auditadas.</p> : null}
        <section className="kpi-grid">
          <Kpi label="Obras batendo item a item" value={`${data.materialConference.matches}/${data.materialConference.works}`} note="Transformadores, postes, para-raios, itens e valor" tone="green" />
          <Kpi label="Obras corrigidas" value={data.materialConference.corrected} note="A planilha de obras contava acessório como equipamento" tone="red" />
          <Kpi label="Alertas analíticos refeitos" value={data.materialConference.analyticConflicts} note="A Base_Analitica não enxergava o transformador da obra" tone="amber" />
          <Kpi label="SS sem obra" value={data.materialConference.withoutWork} note="Sem obra não há material a conferir" tone="blue" />
        </section>
        <p className="conference-rule">{data.materialConference.rule}</p>
        <p className="conference-rule">Fonte: {data.materialConference.source} · {data.materialConference.items} itens · {money(data.materialConference.value)}.</p>
        {data.materialConference.correctedList.length ? <div className="conference-list">
          <h3>O que foi corrigido</h3>
          {data.materialConference.correctedList.map((item) => <div key={item.id}>
            <strong>{item.id} · {item.ss}</strong>
            <span>Obra {item.work} — {item.detail}</span>
            <em>Decisão após a correção: {item.decision} ({item.rule})</em>
          </div>)}
        </div> : null}
        {data.materialConference.conflictList.length ? <div className="conference-list">
          <h3>Alertas analíticos que a planilha errava</h3>
          {data.materialConference.conflictList.map((item) => <div key={item.id}>
            <strong>{item.id} · {item.ss}</strong>
            <span>{item.work
              ? `Obra ${item.work} — a planilha dizia “${item.sheet}”, a base de itens comprova ${item.transformers} transformador(es) · ${money(item.value)}`
              : `SS sem obra gerada — a planilha dizia “${item.sheet}”, mas sem obra não há material a acusar`}</span>
            <em>Alerta corrigido: {item.checked}</em>
          </div>)}
        </div> : null}
      </section> : null}
      <section className="panel editorial-note"><span>LEITURA DE CONTROLE</span><p>Os números de inclusão, expurgo e revisão são propostas geradas pelas regras do Manual v0.96. O total oficial permanece separado até um dos aprovadores autorizados revisar e aprovar cada caso.</p></section>
      {metodo?.resumo ? <section className="panel editorial-note wide metodo-resumo">
        <span>COMO ESTA ANÁLISE FOI FEITA</span>
        <h2>{metodo.resumo.titulo}</h2>
        {(metodo.resumo.paragrafos || []).map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
      </section> : null}
    </>;

    if (module === "fluxo") {
      if (!fluxo) return <section className="panel editorial-note"><span>FLUXO INDISPONÍVEL</span><p>O arquivo fluxo-1510.json não carregou.</p></section>;
      const filtro = FLUXO_FILTROS.find((f) => f.id === fluxoFiltro) || FLUXO_FILTROS[0];
      const conta = (f: typeof FLUXO_FILTROS[number]) => fluxo.registros.filter(f.teste).length;
      const agulha = normalize(fluxoBusca).trim();
      const selecionadas = fluxo.registros.filter(filtro.teste).filter((r) => !agulha || normalize([
        r.ss, r.os, r.obra, r.trafo, r.solicitante, r.equipe_ss, r.localidade, r.alimentador,
        r.oc_causa, r.oc_sub, r.at_equipe, r.e1_sinais, r.e4_alertas,
      ].join(" ")).includes(agulha));
      const soExpurgo = selecionadas.filter((r) => r.expurgo === "SIM");
      const CAP = 400;
      const caixas = [
        ["Entrada", ["todos", "e0"]],
        ["1 · Interrupção", ["e1A", "e1B", "e1C", "e1F", "e1S", "e1R"]],
        ["2 · Deslocamento", ["e2G", "e2S", "e2D", "e2R"]],
        ["3 · SS/OS + material", ["e3G", "e3R"]],
        ["4 · Obra e SIGCO", ["e4"]],
        ["Saída", ["incluir", "revisao", "investigar", "qa"]],
      ] as const;
      const historicoDoAtivo = fluxoAtivo
        ? fluxo.historico.filter((linha) => String(linha[0]) === fluxoAtivo)
        : [];
      return <>
        <section className="scope-strip">
          <div><span>Base</span><strong>{fluxo.resumo.total.toLocaleString("pt-BR")} SS · jan a jun/2026</strong></div>
          <div><span>Janela</span><strong>{fluxo.meta.janelaHoras}h antes e depois</strong></div>
          <div><span>Saída limpa</span><strong>{(fluxo.resumo.decisao["INCLUIR"] || 0).toLocaleString("pt-BR")} incluir</strong></div>
          <p>Cada caixa é uma peneira. O que fica retido não é expurgo: é fila de revisão com motivo escrito. Clique em qualquer número para abrir a lista e exportar.</p>
        </section>
        <section className="fluxo-caixas">
          {caixas.map(([nome, ids]) => <article key={nome} className="fluxo-caixa">
            <span>{nome}</span>
            {ids.map((id) => {
              const f = FLUXO_FILTROS.find((item) => item.id === id)!;
              const n = conta(f);
              return <button key={id} className={fluxoFiltro === id || (id === "todos" && !fluxoFiltro) ? "ativo" : ""}
                onClick={() => { setFluxoFiltro(id); setFluxoAtivo(""); }} title={f.nota}>
                <b>{n.toLocaleString("pt-BR")}</b><em>{f.rotulo}</em>
              </button>;
            })}
          </article>)}
        </section>
        <FluxoIndicadores caixa={filtro.caixa} rotulo={filtro.rotulo} linhas={selecionadas} janela={fluxo.meta.janelaHoras} />
        <section className="panel list-panel">
          <div className="list-head">
            <div><span>{selecionadas.length.toLocaleString("pt-BR")} registros{selecionadas.length > CAP ? ` · mostrando os ${CAP} primeiros` : ""}</span>
              <strong>{filtro.rotulo}</strong></div>
            <label className="search"><span>⌕</span><input value={fluxoBusca} onChange={(event) => setFluxoBusca(event.target.value)} placeholder="SS, OS, obra, ativo, equipe, solicitante, causa…" /></label>
            <button className="sheet-download" onClick={() => baixaFluxoCSV(selecionadas, filtro.rotulo)}>Baixar CSV ({selecionadas.length})</button>
            {soExpurgo.length ? <button className="sheet-download secondary" onClick={() => baixaFluxoCSV(soExpurgo, `${filtro.rotulo} — expurgos`)}>Só os expurgos ({soExpurgo.length})</button> : null}
          </div>
          <p className="fluxo-nota">{filtro.nota}</p>
          <div className="table-scroll"><table className="records-table">
            <thead><tr><th>Identificação</th><th>Estágio 1 · interrupção</th><th>Estágio 2 · deslocamento</th><th>Estágio 3 · material</th><th>Obra e SIGCO</th><th>Decisão</th></tr></thead>
            <tbody>{selecionadas.slice(0, CAP).map((r) => <tr key={String(r.ss)} onClick={() => setFluxoAtivo(String(r.trafo))}>
              <td><strong>{String(r.ss)}</strong><span>{String(r.os || "sem OS")}</span><code>{String(r.trafo)} · {String(r.localidade)}</code></td>
              <td><b className={`pill ${r.e1_nivel === "A" ? "good" : r.e1_nivel === "B" ? "pend" : r.e1_nivel === "SEM" ? "bad" : "warn"}`}>{String(r.e1_nivel)}</b>
                <span>{r.oc_ini ? `${String(r.oc_ini)} · ${r.oc_dur_h}h · ${r.oc_cons} clientes` : "sem ocorrência"}</span>
                <small>{String(r.e1_sinais || r.oc_sub || "")}</small></td>
              <td><strong>{String(r.e2_status)}</strong><span>{r.at_equipe ? `equipe ${String(r.at_equipe)} · TMA ${r.at_tma}` : "—"}</span><small>{String(r.at_sub || "")}</small></td>
              <td><strong>{String(r.e3_status)}</strong><span>{String(r.e3_motivo || "")}</span><small>{String(r.trafos_material)} trafo no material</small></td>
              <td><strong>{String(r.e4_status)}</strong><small>{String(r.e4_alertas || "sem alerta")}</small></td>
              <td><b className={`pill ${r.decisao === "INCLUIR" ? "good" : r.decisao === "INVESTIGAR" ? "bad" : r.decisao === "REVISÃO" ? "warn" : "pend"}`}>{String(r.decisao)}</b>
                {r.expurgo === "SIM" ? <span className="expurgo-tag">expurgo proposto</span> : null}
                <small>{String(r.solicitante || "")} · {String(r.origem || "")}</small></td>
            </tr>)}</tbody>
          </table></div>
        </section>
        {fluxoAtivo ? <section className="panel">
          <div className="list-head"><div><span>{historicoDoAtivo.length} eventos</span><strong>Histórico do ativo {fluxoAtivo}</strong></div>
            <button className="sheet-download secondary" onClick={() => setFluxoAtivo("")}>Fechar</button></div>
          <div className="table-scroll"><table className="records-table">
            <thead><tr><th>Evento</th><th>Quando</th><th>Número</th><th>Papel</th><th>Clientes</th><th>Causa e subcausa</th><th>Equipe</th><th>Observação</th></tr></thead>
            <tbody>{historicoDoAtivo.map((linha, i) => <tr key={i}>
              <td><strong>{String(linha[4])}</strong><span>{String(linha[1])}</span></td>
              <td><strong>{String(linha[5] || "—")}</strong><span>{String(linha[6] || "")}</span></td>
              <td><code>{String(linha[7] || "")}</code></td>
              <td><span>{String(linha[8] || "")}</span></td>
              <td><strong>{linha[9] === null ? "—" : String(linha[9])}</strong></td>
              <td><span>{String(linha[10] || "")}</span></td>
              <td><span>{String(linha[12] || "")}</span></td>
              <td><small>{String(linha[11] || "")}</small></td>
            </tr>)}</tbody>
          </table></div>
        </section> : null}
        <section className="panel editorial-note wide"><span>FONTES E LACUNAS DESTA ANÁLISE</span>
          {fluxo.meta.fontes.map((f) => <p key={f}>· {f}</p>)}
          {fluxo.meta.lacunas.map((l) => <p key={l}><b>Lacuna:</b> {l}</p>)}
        </section>
      </>;
    }

    if (module === "universo") {
      if (!universe) return <section className="panel editorial-note"><span>UNIVERSO INDISPONÍVEL</span><p>O arquivo universo-ss.json não carregou. O app está rodando apenas com as 134 auditadas.</p></section>;
      const rank = (key: keyof UniverseRecord, limit = 12) => {
        const counter = new Map<string, number>();
        scopedRows.forEach((row) => {
          const value = String(row[key] ?? "").trim() || "—";
          counter.set(value, (counter.get(value) || 0) + 1);
        });
        return Array.from(counter.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, limit);
      };
      const rules = rank("REGRA", 16);
      const causes = rank("CAUSA", 12);
      const categories = rank("CATEGORIA", 12);
      const cohortsRank = rank("COORTE", 5);
      const layers = rank("CAMADA", 3);
      const confronto = rank("CONFRONTO_CAMPO", 10).filter((item) => item.label !== "—");
      const janelas = rank("JANELA_TEMPORAL", 6).filter((item) => item.label !== "—");
      // O ranking de sinais nao sai do rank() porque um registro pode acionar varias regras
      // ao mesmo tempo: a soma das barras e maior que o total de SS, e isso e correto.
      const sinais = (universe.fieldRules || []).map((rule) => ({
        label: rule.id, value: scopedRows.filter((row) => (row.SINAIS_R_CAMPO || "").includes(rule.id)).length,
      })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
      const ruleById = new Map((universe.fieldRules || []).map((rule) => [rule.id, rule]));
      // O antes e o depois tem de sair das MESMAS linhas. Se o "antes" contasse o escopo
      // inteiro e o "depois" so as cruzadas, as 11 SS sem data entrariam de um lado so e a
      // diferenca apareceria menor do que e. Por isso os dois lados rodam sobre cruzadas.
      const cruzadas = scopedRows.filter((row) => Boolean(row.RECORTE) && row.RECORTE !== "SEM DATA");
      const comparativo = ["INCLUIR", "REVISAO MANUAL", "EXPURGAR", "PENDENTE TEMPORAL"].map((label) => [
        label,
        cruzadas.filter((row) => row.DECISAO_FINAL === label).length,
        cruzadas.filter((row) => row.DECISAO_COM_CAMPO === label).length,
      ] as [string, number, number]);
      return <>
        <ScopePicker />
        <section className="scope-strip">
          <div><span>Fonte</span><strong>{universe.source}</strong></div>
          <div><span>Data de referência</span><strong>{universe.referenceDate}</strong></div>
          <div><span>Escopo ativo</span><strong>{scopeLabel} · {br(scoped.total)} SS</strong></div>
          <div><span>Período no escopo</span><strong>{scopedPeriod}</strong></div>
          <p>{universe.note}</p>
        </section>
        <section className="kpi-grid">
          <Kpi label="SS no escopo" value={scoped.total} note={`de ${universe.totals.universo.toLocaleString("pt-BR")} no universo`} tone="ink"
            onClick={() => openSheet("SS no escopo", "Todas as SS do escopo ativo.")} />
          <Kpi label="Com camada de campo" value={scoped.comCampo} note="Cruzadas com a base de interrupção" tone="green"
            onClick={() => openSheet("Com camada de campo", "SS de jan a jul/2026 cruzadas com a base de interrupção pelo código do transformador.", (row) => Boolean(row.RECORTE) && row.RECORTE !== "SEM DATA")} />
          <Kpi label="Auditadas caso a caso" value={scoped.audited} note="Leitura humana e parecer escrito" tone="ink"
            onClick={() => openSheet("Auditadas caso a caso", "AUDITADA_134 = SIM.", (row) => row.AUDITADA_134 === "SIM")} />
          <Kpi label="Marcadas para expurgo" value={scoped.expurged} note={`${pct(scoped.expurged, scoped.total)}% do escopo`} tone="red"
            onClick={() => openSheet("Marcadas para expurgo", "EXPURGAR = SIM.", (row) => row.EXPURGAR === "SIM")} />
          <Kpi label="Incluir" value={scoped.included} note="Segue para imobilização" tone="green"
            onClick={() => openSheet("Incluir", "DECISAO_FINAL = INCLUIR.", (row) => row.DECISAO_FINAL === "INCLUIR")} />
          <Kpi label="Revisão manual" value={scoped.review} note="Precisa de leitura humana" tone="amber"
            onClick={() => openSheet("Revisão manual", "DECISAO_FINAL = REVISAO MANUAL.", (row) => row.DECISAO_FINAL === "REVISAO MANUAL")} />
          <Kpi label="Pendência temporal" value={scoped.pending} note="SS fora do prazo de obra" tone="blue"
            onClick={() => openSheet("Pendência temporal", "DECISAO_FINAL = PENDENTE TEMPORAL.", (row) => row.DECISAO_FINAL === "PENDENTE TEMPORAL")} />
          <Kpi label="Divergem do site" value={scoped.diverging} note="Base pura x veredito de campo" tone="red"
            onClick={() => openSheet("Divergem do site", "DIVERGE_DO_SITE = SIM — a cascata de base chegaria a outra decisão sem a camada de campo.", (row) => row.DIVERGE_DO_SITE === "SIM")} />
        </section>
        {/* Cobertura das tres analises. Fica antes da camada de campo de proposito: e a
            primeira pergunta que alguem faz ao abrir o painel — "isso aqui esta completo?" */}
        <section className="panel editorial-note wide"><span>COBERTURA DAS TRÊS ANÁLISES · {br(scoped.total)} SS NO ESCOPO</span>
          <p>Toda SS do escopo passa pela análise do texto da solicitação, pela análise do texto da ordem de serviço executada e pela conferência do material aplicado na obra. Onde alguma das três não existe, o registro <strong>diz o motivo</strong> em vez de aparecer em branco — dá para filtrar por isso na planilha.</p>
          <p><strong>{br(scoped.covTri)}</strong> das {br(scoped.total)} SS do escopo têm as três completas. As demais estão nos cartões abaixo, com a razão da falta.</p>
        </section>
        <section className="coverage-grid">
          {[
            { id: "SS", title: "Análise da SS", ok: scoped.covSS, detail: "Texto da solicitação lido e classificado pelo dicionário de regras.",
              pred: (row: UniverseRecord) => row.COBERTURA_SS === "ANALISADA", key: "COBERTURA_SS" as const },
            { id: "OS", title: "Análise da OS", ok: scoped.covOS, detail: "Texto da ordem de serviço executada, vindo da coleta ou do export de obras.",
              pred: (row: UniverseRecord) => row.COBERTURA_OS === "ANALISADA", key: "COBERTURA_OS" as const },
            { id: "MATERIAL", title: "Material da obra", ok: scoped.covMat, detail: "Itens aplicados na obra, conferidos item a item no export de material.",
              pred: (row: UniverseRecord) => row.COBERTURA_MATERIAL === "CONFERIDO", key: "COBERTURA_MATERIAL" as const },
          ].map((axis) => {
            const falta = scopedRows.filter((row) => !axis.pred(row));
            const motivos = Array.from(falta.reduce((acc, row) => {
              const reason = String(row[axis.key] || "—");
              acc.set(reason, (acc.get(reason) || 0) + 1); return acc;
            }, new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]);
            const pct = scoped.total ? Math.round((axis.ok / scoped.total) * 1000) / 10 : 0;
            return <article key={axis.id} className={`coverage-card ${falta.length ? "" : "full"}`}>
              <span>{axis.title}</span>
              <strong>{br(axis.ok)}<i>/{br(scoped.total)}</i></strong>
              <div className="coverage-bar"><b style={{ width: `${pct}%` }} /></div>
              <em>{pct.toLocaleString("pt-BR")}% do escopo</em>
              <p>{axis.detail}</p>
              {motivos.length ? <ul>{motivos.map(([reason, count]) => <li key={reason}>
                <button type="button" onClick={() => openSheet(`${axis.title} — ${reason}`,
                  `${axis.key} = ${reason}. Registros do escopo em que esta análise não existe, com o motivo.`,
                  (row) => String(row[axis.key] || "—") === reason)}>{br(count)} · {reason}</button>
              </li>)}</ul> : <ul><li className="none">Sem lacuna neste escopo.</li></ul>}
              <button type="button" className="coverage-open" onClick={() => openSheet(axis.title,
                `${axis.key} — cobertura desta análise no escopo ativo.`, () => true)}>Abrir planilha ↗</button>
            </article>;
          })}
        </section>
        {scoped.comCampo ? <>
          <section className="panel editorial-note wide"><span>CAMADA DE CAMPO · {br(scoped.comCampo)} SS CRUZADAS</span>
            <p>O código do transformador de cada SS foi confrontado com a base de interrupção (21.970 registros em transformador, 16.255 códigos distintos). O que sai daí é: quantas vezes aquele trafo específico desligou cliente, quando, qual causa a equipe registrou em campo e se isso bate com a condição declarada na SS.</p>
            <p>A decisão publicada não foi sobrescrita. Ela continua em <strong>Decisão final</strong>; a leitura de campo entra ao lado, em <strong>Decisão com campo</strong>, com o motivo escrito caso a caso. Nas 134 auditadas a decisão do site prevalece por regra — nenhuma delas mudou.</p>
          </section>
          <section className="kpi-grid">
            <Kpi label="Com intervenção no trafo" value={scoped.comIntervencao} note="O código aparece na base de interrupção" tone="ink"
              onClick={() => openSheet("Com intervenção no próprio trafo", "QTD_INTERVENCOES_CAMPO > 0.", (row) => (row.QTD_INTERVENCOES_CAMPO ?? 0) > 0)} />
            <Kpi label="Sem nenhuma intervenção" value={scoped.semIntervencao} note="Trafo que nunca desligou cliente no período" tone="red"
              onClick={() => openSheet("Sem nenhuma intervenção", "JANELA_TEMPORAL = SEM INTERVENCAO. Um trafo queimado obrigatoriamente desliga cliente — a ausência é um sinal.", (row) => row.JANELA_TEMPORAL === "SEM INTERVENCAO")} />
            <Kpi label="Campo confirma a SS" value={scoped.campoConfirma} note="Queima ou avaria registrada em campo" tone="green"
              onClick={() => openSheet("Campo confirma a SS", "CONFRONTO_CAMPO começa com CONFIRMA.", (row) => (row.CONFRONTO_CAMPO || "").startsWith("CONFIRMA"))} />
            <Kpi label="Campo diverge da SS" value={scoped.campoDiverge} note="Campo descreve outra condição" tone="amber"
              onClick={() => openSheet("Campo diverge da SS", "CONFRONTO_CAMPO começa com DIVERGE.", (row) => (row.CONFRONTO_CAMPO || "").startsWith("DIVERGE"))} />
            <Kpi label="Falha em outro elemento" value={scoped.campoAlerta} note="Campo aponta ramal ou acessório, não o trafo" tone="red"
              onClick={() => openSheet("Falha em outro elemento da rede", "CONFRONTO_CAMPO começa com ALERTA — o campo registrou condutor, conexão, chave ou acessório.", (row) => (row.CONFRONTO_CAMPO || "").startsWith("ALERTA"))} />
            <Kpi label="Dúvida forte" value={scoped.duvidaForte} note="Score alto nas regras R-CAMPO" tone="red"
              onClick={() => openSheet("Dúvida forte", "NIVEL_DUVIDA_CAMPO = FORTE.", (row) => row.NIVEL_DUVIDA_CAMPO === "FORTE")} />
            <Kpi label="Reincidência pós-troca" value={scoped.reincidencia} note="O trafo voltou a desligar depois da troca" tone="amber"
              onClick={() => openSheet("Reincidência pós-troca", "REINCIDENCIA_POS_TROCA = SIM — a troca não resolveu a causa.", (row) => row.REINCIDENCIA_POS_TROCA === "SIM")} />
            <Kpi label="A decisão mudaria" value={scoped.mudou} note="Proposta, não alteração" tone="amber"
              onClick={() => openSheet("A decisão mudaria com o campo", "MUDOU_COM_CAMPO = SIM. Compare DECISAO_FINAL com DECISAO_COM_CAMPO e leia MOTIVO_DA_MUDANCA.", (row) => row.MUDOU_COM_CAMPO === "SIM")} />
          </section>
          <section className="panel"><div className="panel-title"><div><span>Antes e depois</span><h2>Decisão atual × decisão com campo</h2></div><small>clique para abrir a planilha</small></div>
            <div className="compare-grid">{comparativo.map(([label, antes, depois]) => <button key={label} type="button"
              onClick={() => openSheet(`Decisão com campo: ${label}`, "DECISAO_COM_CAMPO = " + label, (row) => row.DECISAO_COM_CAMPO === label)}>
              <strong>{label}</strong>
              <div><em>{br(antes)}</em><i>→</i><em className={depois === antes ? "" : depois > antes ? "up" : "down"}>{br(depois)}</em></div>
              <small>{depois === antes ? "sem alteração no total" : `${depois > antes ? "+" : ""}${br(depois - antes)} com a leitura de campo`}</small>
            </button>)}</div>
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Confronto</span><h2>O que o campo diz sobre a SS</h2></div><small>clique para abrir a planilha</small></div>
              <BarList data={confronto} total={scoped.comCampo} onSelect={(label) => openSheet(`Confronto: ${label}`, "Recorte por CONFRONTO_CAMPO.", (row) => (row.CONFRONTO_CAMPO || "—") === label)} />
            </article>
            <article className="panel"><div className="panel-title"><div><span>Janela</span><h2>Quando a intervenção aconteceu</h2></div><small>clique para abrir a planilha</small></div>
              <BarList data={janelas} total={scoped.comCampo} onSelect={(label) => openSheet(`Janela ${label}`, "Recorte por JANELA_TEMPORAL.", (row) => (row.JANELA_TEMPORAL || "—") === label)} />
            </article>
          </section>
          {sinais.length ? <section className="panel"><div className="panel-title"><div><span>Regras R-CAMPO</span><h2>Sinais levantados pelo campo</h2></div><small>uma SS pode acionar mais de um sinal</small></div>
            <BarList data={sinais} total={scoped.comCampo} onSelect={(label) => openSheet(`Sinal ${label}`, ruleById.get(label)?.detail || "Recorte por sinal R-CAMPO.", (row) => (row.SINAIS_R_CAMPO || "").includes(label))} />
            <div className="rule-legend">{sinais.map((item) => <p key={item.label}><strong>{item.label}</strong> {ruleById.get(item.label)?.title || ""} — {ruleById.get(item.label)?.detail || ""}</p>)}</div>
          </section> : null}
        </> : null}
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Coorte</span><h2>De onde a SS veio</h2></div></div>
            <BarList data={cohortsRank} total={scoped.total} onSelect={(label) => openSheet(`Coorte ${label}`, "Recorte por COORTE.", (row) => row.COORTE === label)} />
          </article>
          <article className="panel"><div className="panel-title"><div><span>Camada</span><h2>Profundidade da decisão</h2></div></div>
            <BarList data={layers} total={scoped.total} onSelect={(label) => openSheet(`Camada ${label}`, "Recorte por CAMADA.", (row) => row.CAMADA === label)} />
          </article>
        </section>
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Regras</span><h2>Regra que decidiu</h2></div><small>clique para abrir a planilha</small></div>
            <BarList data={rules} total={scoped.total} onSelect={(label) => openSheet(`Regra ${label}`, "Recorte por REGRA acionada.", (row) => row.REGRA === label)} />
          </article>
          <article className="panel"><div className="panel-title"><div><span>Causas</span><h2>Motivo consolidado</h2></div><small>clique para abrir a planilha</small></div>
            <BarList data={causes} total={scoped.total} onSelect={(label) => openSheet(`Causa ${label}`, "Recorte por CAUSA.", (row) => row.CAUSA === label)} />
          </article>
        </section>
        <section className="panel"><div className="panel-title"><div><span>Categorias</span><h2>Condição declarada na SS</h2></div><small>clique para abrir a planilha</small></div>
          <BarList data={categories} total={scoped.total} onSelect={(label) => openSheet(`Categoria ${label}`, "Recorte por CATEGORIA.", (row) => row.CATEGORIA === label)} />
        </section>
        <section className="panel editorial-note wide"><span>LIMITES DESTA BASE</span>
          {universe.limits.map((item, index) => <p key={index}>{item}</p>)}
        </section>
      </>;
    }

    // Visao por codigo do ativo. Ate aqui tudo era contado por SS; esta tela vira a chave e
    // conta por transformador — quantas SS o mesmo trafo gerou e quantas intervencoes de campo
    // existem para o codigo dele na base de interrupcao (chave COD_INS_TRF_TNT = NUM_TRAFO).
    if (module === "ativos") {
      if (!universe) return <section className="panel editorial-note"><span>UNIVERSO INDISPONÍVEL</span><p>O arquivo universo-ss.json não carregou. Esta tela depende dele.</p></section>;
      const semCodigo = scopedRows.filter((row) => !String(row.NUM_TRAFO || "").trim()).length;
      const assets = new Map<string, UniverseRecord[]>();
      scopedRows.forEach((row) => {
        const code = String(row.NUM_TRAFO || "").trim();
        if (code) assets.set(code, [...(assets.get(code) || []), row]);
      });
      const soma = (rows: UniverseRecord[], key: keyof UniverseRecord) =>
        rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
      const catalogo = Array.from(assets.entries()).map(([code, rows]) => ({
        code,
        rows,
        ss: rows.length,
        interv: soma(rows, "QTD_INTERVENCOES_CAMPO"),
        janela: soma(rows, "INTERV_NA_JANELA"),
        antes: soma(rows, "INTERV_ANTES_DA_SS"),
        depois: soma(rows, "INTERV_DEPOIS_DA_TROCA"),
        reincidente: rows.some((row) => row.REINCIDENCIA_POS_TROCA === "SIM"),
        auditado: rows.some((row) => row.AUDITADA_134 === "SIM"),
        local: rows[0].LOCALIDADE || "—",
        decisoes: Array.from(new Set(rows.map((row) => row.DECISAO_FINAL).filter(Boolean))),
        subcausas: Array.from(new Set(rows.flatMap((row) => String(row.SUBCAUSAS_TODAS || "").split("|").map((item) => item.trim()).filter(Boolean)))),
      }));
      const multi = catalogo.filter((item) => item.ss > 1);
      const semInterv = catalogo.filter((item) => item.interv === 0);
      const totalInterv = catalogo.reduce((total, item) => total + item.interv, 0);
      const needle = normalize(assetQuery).trim();
      const lista = catalogo
        .filter((item) => !needle || normalize(item.code).includes(needle) || normalize(item.local).includes(needle))
        .sort((a, b) => b.interv - a.interv || b.ss - a.ss || a.code.localeCompare(b.code));
      const CAP = 200;
      return <>
        <ScopePicker />
        <section className="panel editorial-note wide"><span>CONTAGEM POR CÓDIGO DO ATIVO · ESCOPO {scopeLabel.toUpperCase()}</span>
          <p>Aqui a unidade deixa de ser a solicitação e passa a ser o transformador. A coluna <strong>intervenções</strong> conta os desligamentos que a base de interrupção registrou <strong>no próprio código do trafo</strong>, somados por SS — um trafo com duas SS soma as duas janelas.</p>
          <p><strong>{br(assets.size)}</strong> transformadores distintos no escopo, <strong>{br(totalInterv)}</strong> intervenções encontradas ao todo e <strong>{br(multi.length)}</strong> com mais de uma SS no período.</p>
        </section>
        <section className="kpi-grid">
          <Kpi label="Transformadores distintos" value={br(assets.size)} note={`${br(scoped.total)} SS no escopo`} tone="ink" />
          <Kpi label="Intervenções encontradas" value={br(totalInterv)} note="Desligamentos no código do trafo" tone="red"
            onClick={() => openSheet("Com intervenção no próprio trafo", "QTD_INTERVENCOES_CAMPO > 0.", (row) => (row.QTD_INTERVENCOES_CAMPO ?? 0) > 0)} />
          <Kpi label="Trafos com mais de uma SS" value={br(multi.length)} note={`${br(multi.reduce((total, item) => total + item.ss, 0))} SS envolvidas`} tone="amber"
            onClick={() => openSheet("Trafos com mais de uma SS", "Mesmo NUM_TRAFO com duas ou mais solicitações no escopo.",
              (row) => (assets.get(String(row.NUM_TRAFO || "").trim())?.length || 0) > 1)} />
          <Kpi label="Trafos sem nenhuma intervenção" value={br(semInterv.length)} note="Nenhum desligamento no período" tone="blue"
            onClick={() => openSheet("Sem nenhuma intervenção", "Trafos cujo código não aparece na base de interrupção no período.",
              (row) => (assets.get(String(row.NUM_TRAFO || "").trim())?.reduce((total, item) => total + (item.QTD_INTERVENCOES_CAMPO ?? 0), 0) || 0) === 0)} />
          <Kpi label="Com reincidência pós-troca" value={br(catalogo.filter((item) => item.reincidente).length)} note="Voltou a desligar depois da substituição" tone="red"
            onClick={() => openSheet("Reincidência pós-troca", "REINCIDENCIA_POS_TROCA = SIM.", (row) => row.REINCIDENCIA_POS_TROCA === "SIM")} />
          <Kpi label="SS sem código de ativo" value={br(semCodigo)} note="Não entram nesta contagem" tone="amber"
            onClick={() => openSheet("SS sem código de ativo", "NUM_TRAFO vazio no export da coleta.", (row) => !String(row.NUM_TRAFO || "").trim())} />
        </section>
        <section className="panel list-panel">
          <div className="list-head">
            <div><span>{br(lista.length)} transformadores{lista.length > CAP ? ` · mostrando os ${CAP} primeiros` : ""}</span><strong>Ordenados por intervenções encontradas</strong></div>
            <label className="search"><span>⌕</span><input value={assetQuery} onChange={(event) => setAssetQuery(event.target.value)} placeholder="Buscar código do trafo ou localidade…" /></label>
          </div>
          <div className="table-scroll"><table className="records-table">
            <thead><tr><th>Código do ativo</th><th>Solicitações</th><th>Intervenções</th><th>Quando</th><th>Campo</th><th>Decisão</th></tr></thead>
            <tbody>{lista.slice(0, CAP).map((item) => <tr key={item.code}
              onClick={() => openSheet(`Transformador ${item.code}`, `Todas as SS do escopo cujo NUM_TRAFO é ${item.code}.`,
                (row) => String(row.NUM_TRAFO || "").trim() === item.code)}>
              <td><strong>{item.code}</strong><span>{item.local}</span>{item.auditado ? <code>auditado caso a caso</code> : null}</td>
              <td><strong>{item.ss} SS</strong><span>{item.rows.map((row) => row.NUMERO_SS).join(" · ")}</span></td>
              <td><strong>{item.interv}</strong><span>{item.interv ? "desligamentos no código do trafo" : "nenhum registro no período"}</span></td>
              <td><span>{item.antes} antes da SS</span><span>{item.janela} na janela do evento</span><span>{item.depois} depois da troca</span></td>
              <td>{item.reincidente ? <b className="pill bad">REINCIDENTE</b> : null}<small>{item.subcausas.slice(0, 3).join(" · ") || "Sem causa registrada em campo"}</small></td>
              <td>{item.decisoes.map((decision) => <b key={decision} className={`pill ${decisionClass(decision)}`}>{decision}</b>)}</td>
            </tr>)}</tbody>
          </table></div>
        </section>
        <section className="panel editorial-note wide"><span>COMO LER</span>
          <p>Clique em qualquer linha para abrir a planilha com as SS daquele transformador — de lá dá para abrir o dossiê de cada uma e baixar o recorte. Um trafo com várias intervenções e uma SS só costuma ser o caso mais interessante: o equipamento já vinha desligando cliente antes de alguém abrir a solicitação.</p>
          <p>A base de interrupção vai até 29/07/2026, então SS abertas no fim de julho podem ter intervenção ainda não registrada. As {br(semCodigo)} SS sem código de ativo no escopo não entram em nenhuma linha desta tela.</p>
        </section>
      </>;
    }

    if (module === "ss") return <><ScopePicker /><Queue mode="ss" /></>;
    if (module === "os") return <><ScopePicker /><Queue mode="os" /></>;
    if (module === "aprovacoes") return <>
      <section className="panel editorial-note"><span>FILA DE APROVAÇÃO · SÓ AS 134</span><p>A aprovação formal existe apenas para as 134 auditadas — são as únicas com veredito de campo. As outras {(allRecords.length - audited.length).toLocaleString("pt-BR")} SS aparecem nas listas e nas planilhas, mas não entram nesta fila.</p></section>
      <Queue mode="newbase" />
    </>;
    if (module === "newbase" || ["expurgos", "sigco", "revisoes"].includes(module)) return <><ScopePicker /><Queue mode="newbase" /></>;
    if (module === "map") return <>
      <section className="map-layout">
        <article className="panel map-panel">
          <div className="panel-title"><div><span>Localização aproximada</span><h2>{mapPoints.length} municípios identificados</h2></div><small>Centro municipal · não representa coordenada do ativo</small></div>
          <MapView points={mapPoints} onSelect={(name) => setQuery(name)} />
        </article>
        <aside className="panel map-summary">
          <span>LEITURA DO MAPA</span><h2>{br(scoped.total)} atendimentos</h2>
          <p>O tamanho do círculo acompanha a quantidade de casos. Pontos vermelhos possuem ao menos uma proposta de expurgo.</p>
          <div><b>{mapPoints.length}</b><span>municípios no mapa</span></div>
          <div><b>{scoped.burned}</b><span>transformadores queimados</span></div>
          <div><b>{scoped.damaged}</b><span>transformadores avariados</span></div>
          <small>Para chegar ao ponto exato do transformador, a próxima carga deverá trazer latitude e longitude do ativo.</small>
        </aside>
      </section>
      {query ? <section className="panel list-panel map-results">
        <div className="list-head"><div><span>Seleção do mapa</span><strong>{filtered.length} casos em {query}</strong></div><button onClick={() => setQuery("")}>Limpar seleção</button></div>
        <RecordTable records={filtered} mode="newbase" onOpen={openRecord} statusOf={statusOf} />
      </section> : null}
    </>;

    if (module === "financial") {
      const variance = data.financial.totalBudgeted - data.financial.totalRealized;
      return <>
        <section className="kpi-grid finance-kpis">
          <Kpi label="Total orçado" value={compactMoney(data.financial.totalBudgeted)} note={money(data.financial.totalBudgeted)} tone="ink" />
          <Kpi label="Total realizado" value={compactMoney(data.financial.totalRealized)} note={money(data.financial.totalRealized)} tone="red" />
          <Kpi label="Saldo orçamento x realizado" value={compactMoney(variance)} note={`${pct(data.financial.totalRealized, data.financial.totalBudgeted)}% executado`} tone="green" />
          <Kpi label="Material nas obras" value={compactMoney(data.financial.materialValue)} note={money(data.financial.materialValue)} tone="blue" />
        </section>
        <section className="dashboard-columns">
          <article className="panel finance-breakdown"><div className="panel-title"><div><span>Composição</span><h2>Orçado x realizado</h2></div><small>Valores da OBRAS_COMPLETA</small></div>
            {[
              ["Total", data.financial.totalBudgeted, data.financial.totalRealized],
              ["Material", data.financial.materialBudgeted, data.financial.materialRealized],
              ["Mão de obra", data.financial.laborBudgeted, data.financial.laborRealized],
            ].map(([label, budgeted, realized]) => <div className="finance-row" key={String(label)}>
              <div><strong>{label}</strong><span>{money(Number(realized))} de {money(Number(budgeted))}</span></div>
              <i><b style={{ width: `${Math.min(100, pct(Number(realized), Number(budgeted)))}%` }} /></i><em>{pct(Number(realized), Number(budgeted))}%</em>
            </div>)}
          </article>
          <article className="panel"><div className="panel-title"><div><span>Realizado por mês</span><h2>Ritmo financeiro</h2></div></div>
            <BarList data={data.byMonth.map((item) => ({ label: item.label, value: item.realized }))} moneyValues />
          </article>
        </section>
        <section className="panel warning-note"><strong>Como ler</strong><p>“Material associado às obras” e “total realizado” não devem ser somados: o material pode já compor o realizado. Valores filtrados por expurgo representam parcela associada, não economia confirmada.</p></section>
      </>;
    }

    if (module === "auto-expurge") {
      const workRules = data.workRules;
      const recordById = new Map(data.records.map((record) => [record.id, record]));
      const openById = (id: string) => { const found = recordById.get(id); if (found) openRecord(found); };
      return <>
      <ScopePicker />
      {universe ? <>
        <section className="kpi-grid">
          <Kpi label="Marcadas para expurgo" value={scoped.expurged} note={`${pct(scoped.expurged, scoped.total)}% do escopo ${scopeLabel}`} tone="red"
            onClick={() => openSheet("Marcadas para expurgo", "EXPURGAR = SIM.", (row) => row.EXPURGAR === "SIM")} />
          <Kpi label="Com camada de campo" value={scopedRows.filter((row) => row.EXPURGAR === "SIM" && row.AUDITADA_134 === "SIM").length} note="Expurgo com veredito de campo" tone="ink"
            onClick={() => openSheet("Expurgo com campo", "EXPURGAR = SIM e AUDITADA_134 = SIM.", (row) => row.EXPURGAR === "SIM" && row.AUDITADA_134 === "SIM")} />
          <Kpi label="Só triagem de base" value={scopedRows.filter((row) => row.EXPURGAR === "SIM" && row.AUDITADA_134 !== "SIM").length} note="Precisa de confirmação em campo" tone="amber"
            onClick={() => openSheet("Expurgo só por base", "EXPURGAR = SIM e AUDITADA_134 = NAO.", (row) => row.EXPURGAR === "SIM" && row.AUDITADA_134 !== "SIM")} />
          <Kpi label="Revisão manual" value={scoped.review} note="Não decidido pela regra" tone="blue"
            onClick={() => openSheet("Revisão manual", "DECISAO_FINAL = REVISAO MANUAL.", (row) => row.DECISAO_FINAL === "REVISAO MANUAL")} />
        </section>
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Escopo {scopeLabel}</span><h2>Regra que levou ao expurgo</h2></div><small>clique para abrir a planilha</small></div>
            <BarList
              data={Array.from(scopedRows.filter((row) => row.EXPURGAR === "SIM").reduce((acc, row) => {
                const key = row.REGRA || "—"; acc.set(key, (acc.get(key) || 0) + 1); return acc;
              }, new Map<string, number>()).entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)}
              total={scoped.expurged}
              onSelect={(label) => openSheet(`Expurgo pela regra ${label}`, "EXPURGAR = SIM com esta REGRA.", (row) => row.EXPURGAR === "SIM" && (row.REGRA || "—") === label)} />
          </article>
          <article className="panel"><div className="panel-title"><div><span>Escopo {scopeLabel}</span><h2>Causa do expurgo</h2></div><small>clique para abrir a planilha</small></div>
            <BarList
              data={Array.from(scopedRows.filter((row) => row.EXPURGAR === "SIM").reduce((acc, row) => {
                const key = row.CAUSA || "—"; acc.set(key, (acc.get(key) || 0) + 1); return acc;
              }, new Map<string, number>()).entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)}
              total={scoped.expurged}
              onSelect={(label) => openSheet(`Expurgo por ${label}`, "EXPURGAR = SIM com esta CAUSA.", (row) => row.EXPURGAR === "SIM" && (row.CAUSA || "—") === label)} />
          </article>
        </section>
      </> : null}
      {universe ? <section className="panel editorial-note"><span>DAQUI PRA BAIXO · SÓ AS 134</span><p>Os blocos abaixo — valor associado, regras de campo R-CAMPO e confronto com o TMAE/SIGOD — só existem para as 134 SS auditadas. Eles não mudam quando você troca o escopo.</p></section> : null}
      <section className="kpi-grid">
        <Kpi label="Expurgos automáticos" value={data.expurgeDashboard.total} note={`${pct(data.expurgeDashboard.total, data.summary.total)}% das 134`} tone="red" />
        <Kpi label="Valor realizado associado" value={compactMoney(data.expurgeDashboard.value)} note={money(data.expurgeDashboard.value)} tone="ink" />
        <Kpi label="Material associado" value={compactMoney(data.expurgeDashboard.materialValue)} note={money(data.expurgeDashboard.materialValue)} tone="blue" />
        <Kpi label="Também em revisão" value={data.expurgeDashboard.sentToReview} note="Possível furto ou abalroamento" tone="amber" />
        <Kpi label="Obra não gerada" value={data.summary.missingWork ?? 0} note={`${data.summary.overdueWork ?? 0} acima de ${data.workRules?.deadlineDays ?? 60} dias · R-OBR-02`} tone="red" />
        <Kpi label="Pendência temporal" value={data.summary.temporaryPending ?? 0} note="Dentro do prazo, aguardando obra" tone="amber" />
        <Kpi label="Ordem de despesa" value={data.summary.expenseOrders ?? 0} note="R-OBR-01 · não imobiliza o ativo" tone="ink" />
      </section>
      {data.fieldSummary ? <section className="kpi-grid">
        <Kpi label="Candidatos pela Análise por Intervenções" value={data.fieldSummary.withDoubt} note={`${pct(data.fieldSummary.withDoubt, data.summary.total)}% da base tem alguma evidência de campo contrária`} tone="red" />
        <Kpi label="Evidência FORTE" value={data.fieldSummary.strong} note="Campo contradiz diretamente a categoria declarada" tone="red" />
        <Kpi label="Fora da revisão manual" value={data.fieldSummary.outsideReview74} note="Casos novos que o cruzamento de campo trouxe" tone="amber" />
        <Kpi label="SS sem nenhuma intervenção" value={data.fieldSummary.noIntervention} note="Nenhum registro no TMAE/SIGOD no período" tone="blue" />
      </section> : null}
      <section className="dashboard-columns">
        <article className="panel"><div className="panel-title"><div><span>Motivos</span><h2>Expurgos por causa</h2></div></div><BarList data={data.expurgeDashboard.byCause} total={data.summary.total} /></article>
        <article className="panel"><div className="panel-title"><div><span>Motor</span><h2>Regras acionadas</h2></div></div><BarList data={data.expurgeDashboard.byRule} /></article>
      </section>
      {data.expurgeDashboard.byFieldRule?.length ? <section className="dashboard-columns">
        <article className="panel"><div className="panel-title"><div><span>Campo · TMAE/SIGOD</span><h2>Regras de campo acionadas</h2></div><small>{data.fieldSummary?.source}</small></div>
          <BarList data={data.expurgeDashboard.byFieldRule} total={data.summary.total} />
          <div className="check-list field-rules">{(data.fieldRules || []).filter((rule) => rule.count).map((rule) => <div key={rule.id}><b>{rule.count}</b><strong>{rule.id} — {rule.label}</strong><span>{rule.description}</span></div>)}</div>
        </article>
        <article className="panel"><div className="panel-title"><div><span>Confronto</span><h2>O que o campo disse sobre a categoria</h2></div></div>
          <BarList data={data.fieldSummary?.confrontation || []} total={data.summary.total} />
        </article>
      </section> : null}
      {data.fieldSummary ? <section className="panel"><div className="list-head">
        <div><span>{data.fieldSummary.withDoubt} casos</span><strong>Dossiês com evidência de campo contrária à categoria</strong></div>
        <small>Ordenados pelo score de dúvida da Análise por Intervenções</small></div>
        <RecordTable
          records={data.records.filter((record) => (record.fieldAnalysis?.pros?.length || 0) > 0)
            .slice().sort((a, b) => (b.fieldAnalysis?.doubtScore || 0) - (a.fieldAnalysis?.doubtScore || 0))}
          mode="newbase" onOpen={openRecord} statusOf={statusOf} />
      </section> : null}
      <section className="panel"><div className="list-head"><div><span>{data.expurgeDashboard.total} casos</span><strong>Dossiês que acionaram expurgo automático</strong></div>
        <small>SS, OS, obra, origem da solicitação e regra acionada</small></div>
        <RecordTable records={data.records.filter((record) => record.consolidated.automaticExpurge)} mode="expurgo" onOpen={openRecord} statusOf={statusOf} /></section>
      {workRules ? <section className="panel"><div className="list-head">
        <div><span>{workRules.expense.length + workRules.missing.length + workRules.kindDivergent.length} casos sinalizados</span><strong>Regras de ordem de obra · Manual v0.96</strong></div>
        <small>Prazo contado contra {workRules.referenceDate}</small>
      </div>
        <div className="table-scroll"><table className="records-table">
          <thead><tr><th>Regra</th><th>SS / OS</th><th>Obra</th><th>Origem da solicitação</th><th>Situação</th><th>Decisão</th></tr></thead>
          <tbody>
            {workRules.expense.map((item) => <tr key={`obr1-${item.id}`} onClick={() => openById(item.id)}>
              <td><code>R-OBR-01</code><span>Ordem de despesa</span></td>
              <td><strong>{item.ss}</strong><span>{recordById.get(item.id)?.os || "—"}</span><code>{item.id}</code></td>
              <td><strong>{item.work || "Sem obra"}</strong><span>{item.workClass}</span></td>
              <td>{recordById.get(item.id) ? <RequestTag record={recordById.get(item.id)!} /> : null}<span>Origem {recordById.get(item.id)?.origin || "—"}</span><small>{recordById.get(item.id)?.requester || "—"}</small></td>
              <td><strong>Não imobiliza o ativo</strong><span>Incorporação a confirmar</span></td>
              <td><b className={`pill ${decisionClass(item.decision)}`}>{item.decision}</b><span>Análise manual obrigatória</span></td>
            </tr>)}
            {workRules.missing.map((item) => <tr key={`obr2-${item.id}`} onClick={() => openById(item.id)}>
              <td><code>R-OBR-02</code><span>Obra não gerada</span></td>
              <td><strong>{item.ss}</strong><span>{recordById.get(item.id)?.os || "—"}</span><code>{item.id}</code></td>
              <td><strong>Sem obra</strong><span>Sem consulta SIAGO</span></td>
              <td>{recordById.get(item.id) ? <RequestTag record={recordById.get(item.id)!} /> : null}<span>Origem {recordById.get(item.id)?.origin || "—"}</span><small>{recordById.get(item.id)?.requester || "—"}</small></td>
              <td><strong>{item.ssAgeDays ?? "—"} dias sem obra</strong><span>SS aberta em {item.openedAtLabel}</span><small>{item.overdue ? `Acima de ${workRules.deadlineDays} dias` : `Dentro dos ${workRules.deadlineDays} dias`}</small></td>
              <td><b className={`pill ${decisionClass(item.decision)}`}>{item.decision}</b><span>Sem obra não há prova da troca</span></td>
            </tr>)}
            {workRules.kindDivergent.map((item) => <tr key={`obr3-${item.id}`} onClick={() => openById(item.id)}>
              <td><code>R-OBR-03</code><span>Natureza da obra</span></td>
              <td><strong>{item.ss}</strong><span>{recordById.get(item.id)?.os || "—"}</span><code>{item.id}</code></td>
              <td><strong>{item.work || "Sem obra"}</strong><span>{[item.workNature, item.workKind].filter(Boolean).join(" · ")}</span></td>
              <td>{recordById.get(item.id) ? <RequestTag record={recordById.get(item.id)!} /> : null}<span>Origem {recordById.get(item.id)?.origin || "—"}</span><small>{recordById.get(item.id)?.requester || "—"}</small></td>
              <td><strong>Fora de manutenção corretiva emergencial</strong><span>Enquadramento de custo divergente</span></td>
              <td><b className="pill warn">ANÁLISE MANUAL</b><span>Confirmar antes de contar no indicador</span></td>
            </tr>)}
          </tbody>
        </table></div>
      </section> : null}
    </>;
    }

    if (module === "ai") return <>
      <section className="kpi-grid">
        <Kpi label="Confiança alta" value={data.aiDashboard.highConfidence} note="85% ou mais" tone="green" />
        <Kpi label="Confiança média" value={data.aiDashboard.mediumConfidence} note="65% a 84%" tone="amber" />
        <Kpi label="Confiança baixa" value={data.aiDashboard.lowConfidence} note="Revisão obrigatória" tone="red" />
        <Kpi label="Evidência completa" value={data.aiDashboard.completeEvidence} note="Obra + material vinculados" tone="blue" />
        <Kpi label="Análise por SIGCO" value={data.aiDashboard.sigcoAnalysis} note="Coerência não automática" tone="ink" />
        <Kpi label="Requerem revisão" value={data.aiDashboard.needsReview} note="Pode incluir expurgos sinalizados" tone="red" />
      </section>
      <section className="dashboard-columns">
        <article className="panel"><div className="panel-title"><div><span>Saída</span><h2>Decisões propostas</h2></div></div><BarList data={data.aiDashboard.byDecision} total={data.summary.total} /></article>
        <article className="panel"><div className="panel-title"><div><span>Explicabilidade</span><h2>Regras mais usadas</h2></div></div><BarList data={data.aiDashboard.byRule.slice(0, 7)} /></article>
      </section>
      <section className="panel editorial-note"><span>LIMITE DA IA</span><p>A confiança mede convergência das evidências; não substitui aprovação. Toda análise começa PENDENTE, mesmo quando a regra é automática.</p></section>
    </>;

    if (module === "importar") return <section className="import-grid">
      <article className="panel import-card"><span className="file-type">XLSX</span><div><h2>{data.meta.source}</h2><p>Única fonte ativa desta versão. Nenhum arquivo do caso 209 participa da carga.</p></div></article>
      <article className="panel"><div className="panel-title"><div><span>Validação</span><h2>Reconciliação concluída</h2></div></div>
        <div className="check-list">{[
          ["134", "SS únicas"], ["134", "OS únicas"], [String(data.summary.works), "obras únicas vinculadas"],
          ["52", "alertas da Base Analítica"], [data.meta.period.observedEnd, "última data observada"],
        ].map(([value, label]) => <div key={label}><b>✓</b><strong>{value}</strong><span>{label}</span></div>)}</div>
      </article>
      <article className="panel warning-note"><strong>Política de carga</strong><p>A importação cria propostas pendentes. Ela nunca aprova registros, não apaga a fonte anterior e precisa conservar o identificador da SS/OS.</p></article>
    </section>;

    if (module === "regras") return <section className="rules-grid">
      {[
        ["R-EXP-01", "Furto, roubo ou vandalismo explícito", "Expurgar automaticamente."],
        ["R-EXP-02", "Particular/terceiro ou prefixo 56", "Expurgar automaticamente."],
        ["R-EXP-03", "Auxiliar, regulador 58 ou religador 79", "Expurgar do indicador principal."],
        ["R-EXP-04", "Construção, nova ligação ou desativação", "Expurgar com motivo."],
        ["R-EXP-05", "Abalroamento, terceiro ou poste danificado", "Expurgar e enviar à revisão."],
        ["R-MAT-01", "Sem trafo + etapa terminal da obra", "Expurgar com estágio como evidência."],
        ["R-SIG-01", "Sobrecarga, TAP ou preventivo", "Revisão manual e Análise por SIGCO."],
        ["R-QUE-01", "Queima + substituição + trafo", "Propor inclusão."],
        ["R-AVA-01", "Avaria + substituição + trafo", "Propor inclusão como AVARIADO."],
        ["R-OBR-01", "Obra em CLASS_OBRA = DESPESA", "Alerta obrigatório: a obra não imobiliza o ativo. Vai para análise manual antes de contar no indicador."],
        ["R-OBR-02", "SS sem obra gerada", `Até ${data.workRules?.deadlineDays ?? 60} dias da abertura da SS fica PENDENTE TEMPORAL; acima disso, expurgar por falta de prova da troca.`],
        ["R-OBR-03", "Obra fora de manutenção corretiva emergencial", "Alerta obrigatório: CONST_MANUT ≠ MANUTENÇÃO ou TIPO_OBRA divergente muda o enquadramento de custo."],
      ].map(([code, trigger, result]) => <article className="panel rule-card" key={code}><code>{code}</code><h2>{trigger}</h2><p>{result}</p></article>)}
      {(data.fieldRules || []).map((rule) => <article className="panel rule-card field-rule-card" key={rule.id}>
        <code>{rule.id}</code><h2>{rule.label}</h2><p>{rule.description}</p>
        <em>{rule.count} de {data.summary.total} SS acionam esta regra</em>
      </article>)}
      {data.workRules ? <article className="panel editorial-note wide"><span>REGRAS DE ORDEM DE OBRA · MANUAL v0.96</span><p>
        Prazo contado contra {data.workRules.referenceDate}, a maior data de abertura de SS da base — nunca a data de hoje.
        Nesta carga: {data.workRules.expense.length} obra(s) em despesa, {data.workRules.missing.length} SS sem obra gerada
        ({data.workRules.missing.filter((item) => item.overdue).length} acima de {data.workRules.deadlineDays} dias, {data.summary.temporaryPending ?? 0} em pendência temporal)
        e {data.workRules.kindDivergent.length} obra(s) fora de manutenção corretiva emergencial.
      </p></article> : null}
      <article className="panel editorial-note wide"><span>SIGCO</span><p>20497: abalroamento · 25983: análise obrigatória · 8812: queimado · 25962: avariado · 8385: não comprova falha sozinho · #N/A: recomendar abertura/correção com motivo.</p></article>
      {data.fieldSummary ? <article className="panel editorial-note wide"><span>REGRAS DE CAMPO · R-CAMPO</span><p>
        As oito regras R-CAMPO nascem do cruzamento das 134 SS com a base de interrupções TMAE/SIGOD ({data.fieldSummary.source}).
        Elas não decidem sozinhas: marcam onde o que a equipe registrou em campo não sustenta a categoria declarada na SS.
        Hoje {data.fieldSummary.withDoubt} das {data.summary.total} SS carregam alguma evidência contrária, sendo {data.fieldSummary.strong} com evidência FORTE.
      </p></article> : null}
      {data.materialConference ? <article className="panel editorial-note wide"><span>CONFERÊNCIA DE MATERIAL</span><p>
        {data.materialConference.rule} A aba Obras só vale até a base de itens dizer outra coisa: {data.materialConference.matches} de {data.materialConference.works} obras
        conferem item a item, {data.materialConference.corrected} precisou de correção e {data.materialConference.analyticConflicts} alerta(s) analítico(s) da Base_Analitica foram refeitos a partir do material conferido.
      </p></article> : null}
      <MetodoBlocos blocos={metodo?.blocos || []} />
    </section>;

    if (module === "historico") return <section className="panel history-panel">
      <div className="panel-title"><div><span>Armazenamento local do protótipo</span><h2>{allHistory.length} eventos registrados</h2></div></div>
      {allHistory.length ? <div className="timeline">{allHistory.map((item, index) => <button key={`${item.recordId}-${item.at}-${index}`} onClick={() => openRecord(data.records.find((record) => record.id === item.recordId)!)}>
        <i /><div><strong>{item.action}</strong><span>{item.recordId} · {item.actor}</span><p>{item.comment}</p></div><time>{new Date(item.at).toLocaleString("pt-BR")}</time>
      </button>)}</div> : <div className="empty"><strong>Nenhuma alteração registrada</strong><span>Comentários, aprovações e rejeições aparecerão aqui.</span></div>}
    </section>;

    if (module === "manuais") return <section className="manual-grid">
      <article className="manual-card rules-manual"><span>MANUAL 01 · V1.0</span><h2>Manual de Regras</h2><p>Escopo, dimensões, critérios de inclusão, expurgo, revisão, SIGCO, aprovação e controles da New Base.</p>
        <ul><li>Regras reproduzíveis</li><li>Decisões e exceções</li><li>Governança de Mateus Gracia</li></ul>
        <div><a href={assetUrl("manuais/Manual_de_Regras_Auditoria_Transformadores_134_v1.0.docx")} download>Baixar Word</a><a className="secondary" href={assetUrl("manuais/Manual_de_Regras_Auditoria_Transformadores_134_v1.0.pdf")} download>Baixar PDF</a></div>
      </article>
      <article className="manual-card operation-manual"><span>MANUAL 02 · V1.0</span><h2>Manual de Funcionamento</h2><p>Como carregar, navegar, analisar SS e OS, usar a New Base, interpretar dashboards, revisar e aprovar.</p>
        <ul><li>Roteiro por módulo</li><li>Leitura dos dashboards</li><li>Rotina completa de aprovação</li></ul>
        <div><a href={assetUrl("manuais/Manual_de_Funcionamento_Sistema_Auditoria_134_v1.0.docx")} download>Baixar Word</a><a className="secondary" href={assetUrl("manuais/Manual_de_Funcionamento_Sistema_Auditoria_134_v1.0.pdf")} download>Baixar PDF</a></div>
      </article>
      <article className="panel editorial-note wide"><span>ALINHAMENTO</span><p>Os dois manuais usam os mesmos nomes, regras, contagens, período, papéis e valores exibidos no site.</p></article>
    </section>;

    return <section className="admin-grid">
      <article className="panel profile"><b>{user.initials}</b><div><span>Sessão atual · {user.role}</span><h2>{user.name}</h2><p>{user.description}</p></div></article>
      <article className="panel"><div className="panel-title"><div><span>Governança</span><h2>Separação de responsabilidades</h2></div></div>
        <div className="permission-list"><div><b>Todos os perfis</b><span>Analisam, comentam e solicitam expurgo.</span></div><div><b>Aprovadores</b><span>Matheus Alves, Danillo e Mateus Gracia.</span></div><div><b>Rastreabilidade</b><span>Registra nome, data e comentário de quem aprovou.</span></div></div>
      </article>
      <article className="panel user-directory wide"><div className="panel-title"><div><span>Acessos da apresentação</span><h2>Usuários e papéis</h2></div></div>
        <div>{DEMO_USERS.map((item) => <article key={item.id}><b>{item.initials}</b><span><strong>{item.name}</strong><small>{item.role}</small><p>{item.description}</p></span>{item.canApprove ? <em>Aprova</em> : null}</article>)}</div>
      </article>
      <article className="panel warning-note wide"><strong>Ambiente de demonstração</strong><p>O login e o histórico funcionam neste navegador para apresentação. A etapa de produção substituirá as credenciais visíveis por autenticação segura e banco centralizado.</p></article>
    </section>;
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><i>T</i><div><strong>Transforma</strong><span>{universe ? `Auditoria · ${scopeLabel}` : "Auditoria · 1.510 SS"}</span></div></div>
      <nav>{NAV.map((group) => <div className="nav-group" key={group.group}><span>{group.group}</span>{group.items.map((item) => <button className={module === item.id ? "active" : ""} key={item.id} onClick={() => { setModule(item.id); setQuery(""); }}>
        <b>{item.code}</b><em>{item.label}</em>
        {item.id === "universo" && universe ? <small>{universe.totals.universo.toLocaleString("pt-BR")}</small> : null}
        {item.id === "newbase" ? <small>{scoped.total.toLocaleString("pt-BR")}</small> : null}
        {item.id === "aprovacoes" ? <small>134</small> : null}
      </button>)}</div>)}</nav>
      <div className="side-user"><b>{user.initials}</b><div><strong>{user.name}</strong><span>{user.role}</span></div>
        <select value={user.id} onChange={(event) => trocarIdentidade(event.target.value)} title="Quem é você — usado só para assinar aprovação">
          {EQUIPE.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></div>
    </aside>
    <main className="workspace">
      <header className="page-header"><div><span>{title.eyebrow}</span><h1>{title.title}</h1><p>{pageDescription}</p></div>
        <div className="header-meta"><span>{user.role}</span><strong>{user.name}</strong><small>{scoped.total.toLocaleString("pt-BR")} registros · {scopeLabel}</small></div>
      </header>
      {renderModule()}
    </main>

    {selected && <div className="drawer-layer">
      <button className="drawer-backdrop" aria-label="Fechar" onClick={() => setSelected(null)} />
      <aside className="drawer">
        <header><div><span>{selected.id} · {selected.openedAtLabel}</span><h2>{selected.ss}</h2><p>{selected.os} · {selected.location}</p></div><button onClick={() => setSelected(null)}>×</button></header>
        <div className="drawer-status"><b className={`pill ${decisionClass(selected.consolidated.decision)}`}>{selected.consolidated.decision}</b><span>{selected.consolidated.condition}</span><span>{selected.consolidated.confidence}% confiança</span><em>{statusOf(selected)}</em></div>
        {(selected.requestType || selected.type) ? <div className={`request-strip ${requestTone(selected.requestType || selected.type)}`}>
          <i /><strong>{selected.requestType || selected.type}</strong>
          <span>ORIGEM {selected.origin || "—"}</span><span>SOLICITANTE {selected.requester || "—"}</span>
        </div> : null}
        {/* Estado das tres analises nesta SS. Aparece antes de qualquer aba para que ninguem
            leia uma aba vazia achando que o dado nao existe quando na verdade ele nao foi coletado. */}
        {selected.universe ? <div className="coverage-strip">
          {([["SS", selected.universe.COBERTURA_SS, "ANALISADA"],
             ["OS", selected.universe.COBERTURA_OS, "ANALISADA"],
             ["MATERIAL", selected.universe.COBERTURA_MATERIAL, "CONFERIDO"]] as const)
            .filter(([, state]) => Boolean(state))
            .map(([axis, state, good]) => <b key={axis} className={state === good ? "" : "miss"}
              title={state === good ? `${axis}: analisada` : `${axis}: ${state}`}>
              {axis} · {state === good ? "ok" : String(state).toLowerCase()}</b>)}
        </div> : null}
        {selected.lite ? <article className="lite-warn">
          <span>{selected.fieldAnalysis ? "DOSSIÊ AUTOMÁTICO · CAMPO CRUZADO, SEM LEITURA HUMANA" : "DOSSIÊ REDUZIDO · SEM CAMADA DE CAMPO"}</span>
          <p>{selected.fieldAnalysis
            ? "Esta SS não está entre as 134 auditadas. Ela tem a camada de campo automática — o código do transformador foi cruzado com a base de interrupção, e a aba Análise por Intervenções mostra o resultado. O que não existe aqui é a leitura humana caso a caso, a conferência item a item do material e a verificação de SIGCO. A decisão continua sendo uma triagem apoiada pelo campo, não um veredito assinado."
            : "Esta SS não está entre as 134 auditadas. O que você vê aqui vem só das colunas da base — texto da SS e da OS, datas, prazo, material da obra e a regra que a triagem acionou. Não houve conferência item a item, cruzamento com a base de intervenções (R-CAMPO) nem verificação de SIGCO. A decisão é uma triagem, não um veredito."}</p>
          <em>Coorte {selected.cohort || "—"} · camada {selected.universe?.CAMADA || "BASE"}</em>
        </article> : null}
        {selected.universe?.DECISAO_COM_CAMPO ? <article className={`field-decision ${selected.universe.MUDOU_COM_CAMPO === "SIM" ? "changed" : ""}`}>
          <span>DECISÃO COM A CAMADA DE CAMPO</span>
          <div><em>{selected.universe.DECISAO_FINAL || "—"}</em><i>→</i><strong>{selected.universe.DECISAO_COM_CAMPO}</strong>
            <b className={selected.universe.MUDOU_COM_CAMPO === "SIM" ? "pill amber" : "pill"}>{selected.universe.MUDOU_COM_CAMPO === "SIM" ? "mudaria" : "sem mudança"}</b></div>
          <p>{selected.universe.MOTIVO_DA_MUDANCA}</p>
          <small>Proposta da camada de campo. A decisão oficial continua sendo a da esquerda até alguém aprovar a mudança.</small>
        </article> : null}
        <nav>{(["consolidado", "ss", "os", "obra", "campo", "historico"] as const).map((tab) => <button key={tab} className={`${detailTab === tab ? "active" : ""}${tab === "campo" ? " no-caps" : ""}`.trim()} onClick={() => setDetailTab(tab)}>{tab === "obra" ? "Obra / material" : tab === "campo" ? "Análise por Intervenções" : tab}</button>)}</nav>
        <div className="drawer-body">
          {detailTab === "consolidado" && <>
            <h3>New Base — Análise Consolidada</h3>
            <section className="decision-sheet">
              <div><span>Decisão proposta</span><strong>{selected.consolidated.decision}</strong></div>
              <div><span>Condição</span><strong>{selected.consolidated.condition}</strong></div>
              <div><span>Causa</span><strong>{selected.consolidated.cause}</strong></div>
              <div><span>Ação</span><strong>{selected.consolidated.action}</strong></div>
              <div><span>Material</span><strong>{selected.consolidated.materialEvidence}</strong></div>
              <div><span>Regra / confiança</span><strong>{selected.consolidated.rule} · {selected.consolidated.confidence}%</strong></div>
            </section>
            <article className="rationale"><span>JUSTIFICATIVA DA IA</span><p>{selected.consolidated.rationale}</p></article>
            <article className="sigco-box"><div><span>SIGCO {selected.sigco || "não informado"}</span><strong>{selected.consolidated.sigcoStatus}</strong></div><p>{selected.consolidated.sigcoReason}</p></article>
            {selected.consolidated.flags.length ? <div className="flags">{selected.consolidated.flags.map((flag) => <b key={flag}>{flag}</b>)}</div> : null}
          </>}
          {detailTab === "ss" && <><h3>Análise de SS</h3><RequestSource record={selected} tab="ss" /><article className="source-text"><span>DESCRIÇÃO ORIGINAL DA SS</span><p>{selected.ssAnalysis.description}</p></article><section className="detail-grid"><div><span>Condição recebida</span><strong>{selected.ssAnalysis.category}</strong></div><div><span>Causa sugerida</span><strong>{selected.ssAnalysis.causeHint}</strong></div></section><article className="evidence"><span>EVIDÊNCIA DESTACADA</span><p>{selected.ssAnalysis.evidence || "Nenhum trecho conclusivo."}</p></article></>}
          {detailTab === "os" && <><h3>Análise por OS</h3><RequestSource record={selected} tab="os" /><article className="source-text"><span>DESCRIÇÃO ORIGINAL DA OS</span><p>{selected.osAnalysis.description}</p></article><section className="detail-grid"><div><span>Ação</span><strong>{selected.osAnalysis.action}</strong></div><div><span>Evidência de material</span><strong>{selected.osAnalysis.transformerEvidence}</strong></div></section><article className="evidence"><span>EVIDÊNCIA DESTACADA</span><p>{selected.osAnalysis.evidence || "Nenhum trecho conclusivo."}</p></article></>}
          {detailTab === "obra" && <><h3>Obra e material</h3><section className="detail-grid">
            <div><span>Obra</span><strong>{selected.work.number || "Não localizada"}</strong></div><div><span>Status</span><strong>{selected.work.status}</strong></div>
            <div><span>Descrição</span><strong>{selected.work.description || "—"}</strong></div><div><span>Alerta analítico</span><strong>{selected.work.analyticReason || "Sem alerta"}</strong></div>
            <div><span>Transformadores / postes / para-raios</span><strong>{selected.material.transformers} / {selected.material.poles} / {selected.material.lightningArresters}</strong></div><div><span>Valor de material</span><strong>{money(selected.material.value)}</strong></div>
            <div><span>SIGCO da ocorrência</span><strong>{selected.sigco && selected.sigco !== "#N/A" ? `${selected.sigco}${SIGCO_MEANING[selected.sigco] ? ` · ${SIGCO_MEANING[selected.sigco]}` : ""}` : "Não informado"}</strong></div><div><span>Coerência do SIGCO</span><strong>{selected.consolidated.sigcoStatus}</strong></div>
            <div><span>Total orçado</span><strong>{money(selected.finance.totalBudgeted)}</strong></div><div><span>Total realizado</span><strong>{money(selected.finance.totalRealized)}</strong></div>
            <div><span>SS aberta por</span><strong>{selected.requester || "Não informado"}{selected.openedAtLabel ? ` · ${selected.openedAtLabel}` : ""}</strong></div><div><span>Obra aberta por</span><strong>{selected.work.openedBy || (selected.work.number ? "Não informado no cadastro" : "Sem obra gerada")}{selected.work.openedAtLabel ? ` · ${selected.work.openedAtLabel}` : ""}{sameOpener(selected) ? " · mesma pessoa da SS" : ""}</strong></div>
            <div><span>Origem da SS</span><strong>{selected.origin || "—"}</strong></div><div><span>Setor responsável da obra</span><strong>{selected.work.openedSector || "—"}</strong></div>
            <div><span>Classe da obra</span><strong>{selected.work.workClass || "Sem obra gerada"}</strong></div><div><span>Natureza / tipo</span><strong>{[selected.work.workNature, selected.work.workKind].filter(Boolean).join(" · ") || "—"}</strong></div>
            <div><span>Dias desde a abertura da SS</span><strong>{selected.work.ssAgeDays ?? "—"}{selected.work.overdue ? " · acima do limite" : ""}</strong></div><div><span>Prova da troca</span><strong>{selected.work.number ? "Obra disponível para consulta SIAGO" : "Sem obra: troca não comprovável"}</strong></div>
          </section>
          <MaterialConferenceBox record={selected} />
          {(() => {
            // O SIGCO é o da SS/OS — a base não traz código próprio da obra. O que interessa
            // aqui é confrontá-lo com o material que a obra realmente movimentou.
            const confront = sigcoVsMaterial(selected);
            const project = (selected.work.projectSigco || "").trim();
            const projectDiffers = Boolean(project) && project !== (selected.sigco || "").trim();
            return <article className={`sigco-box${projectDiffers ? " alert" : confront.tone ? ` ${confront.tone}` : ""}`}>
              <div><span>SIGCO {selected.sigco && selected.sigco !== "#N/A" ? selected.sigco : "não informado"} · CONFRONTO COM O MATERIAL DA OBRA</span><strong>{selected.consolidated.sigcoStatus}</strong></div>
              <p>{selected.consolidated.sigcoReason}</p>
              <p>{confront.text}</p>
              {project ? <p>{projectDiffers
                ? `Atenção: o projeto da obra está cadastrado com o SIGCO ${project}, diferente do ${selected.sigco || "ausente"} da ocorrência — os dois precisam ser reconciliados.`
                : `O cadastro da obra registra o mesmo código no projeto (NUM_PROJETO_SIGCO ${project}): ocorrência e obra estão alinhadas.`}</p> : null}
            </article>;
          })()}
          {selected.work.alerts?.length ? <article className="work-alerts"><span>REGRAS DE ORDEM DE OBRA</span><ul>{selected.work.alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul></article> : null}</>}
          {detailTab === "campo" && <FieldTab record={selected} rules={fieldRuleCatalog} onUseReason={setExpurgeReason} />}
          {detailTab === "historico" && <><h3>Histórico do registro</h3>{(overrides[selected.id] || []).length ? <div className="timeline">{overrides[selected.id].slice().reverse().map((item, index) => <div className="timeline-item" key={`${item.at}-${index}`}><i /><div><strong>{item.action}</strong><span>{item.actor} · {new Date(item.at).toLocaleString("pt-BR")}</span><p>{item.comment}</p></div></div>)}</div> : <div className="empty"><strong>Sem alterações</strong><span>A proposta original da IA está preservada.</span></div>}</>}
        </div>
        {selected.lite ? <footer className="approval-bar lite">
          <p>Aprovação e expurgo formal só estão liberados para as 134 SS auditadas. Para decidir esta SS é preciso rodar a camada de campo sobre ela.</p>
        </footer> : <footer className="approval-bar">
          <label className="reason-field"><span>Motivo do expurgo</span><select value={expurgeReason} onChange={(event) => setExpurgeReason(event.target.value)}>
            <option value="">Selecione uma justificativa</option>
            {EXPURGE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
          </select></label>
          <label><span>Comentário obrigatório</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Registre a evidência e o motivo da decisão…" /></label>
          <button className="note-button" disabled={!comment.trim()} onClick={() => saveChange(selected, { comment, action: "Observação registrada" })}>Registrar observação</button>
          <button className="expurge-button" disabled={!comment.trim() || !expurgeReason} onClick={() => saveChange(selected, { status: "EXPURGADO", comment: `${expurgeReason}: ${comment.trim()}`, action: "Expurgo solicitado" })}>Expurgar</button>
          {user.canApprove ? <button className="reject-button" disabled={!comment.trim()} onClick={() => saveChange(selected, { status: "REJEITADO", comment, action: "Análise rejeitada" })}>Rejeitar</button> : null}
          {user.canApprove ? <button className="approve-button" disabled={!comment.trim()} onClick={() => saveChange(selected, { status: "APROVADO", comment, action: "Análise aprovada" })}>Aprovar análise</button> : null}
        </footer>}
      </aside>
    </div>}

    {drill && <DrillSheet
      title={drill.title}
      note={drill.note}
      rows={drill.rows}
      onClose={() => setDrill(null)}
      onOpenRecord={(ss) => {
        const record = allRecords.find((item) => item.ss === ss);
        if (record) { setDrill(null); openRecord(record); }
      }}
    />}
  </div>;
}
