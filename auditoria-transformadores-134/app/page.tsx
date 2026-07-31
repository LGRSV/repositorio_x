"use client";

import { useEffect, useMemo, useState } from "react";
import MapView from "./MapView";

type Module =
  | "overview" | "ss" | "os" | "newbase" | "map" | "financial" | "auto-expurge" | "ai"
  | "expurgos" | "sigco" | "revisoes" | "aprovacoes" | "importar" | "regras"
  | "historico" | "manuais" | "admin";

type AuditRecord = {
  id: string; ss: string; os: string; openedAt: string; openedAtLabel: string; month: number;
  category: string; location: string; type: string; sigco: string;
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
  aiDashboard: {
    highConfidence: number; mediumConfidence: number; lowConfidence: number; needsReview: number;
    sigcoAnalysis: number; completeEvidence: number; byDecision: Pair[]; byRule: Pair[];
  };
  records: AuditRecord[];
  workRules?: {
    referenceDate: string; deadlineDays: number;
    expense: Array<{ id: string; ss: string; work: string; workClass: string; decision: string }>;
    missing: Array<{ id: string; ss: string; openedAtLabel: string; ssAgeDays: number | null; overdue: boolean; decision: string }>;
    kindDivergent: Array<{ id: string; ss: string; work: string; workNature: string; workKind: string }>;
  };
  requestSources?: { byType: Pair[]; byOrigin: Pair[]; byRequester: Pair[] };
  fieldRules?: FieldRule[];
  fieldSummary?: {
    total: number; withDoubt: number; strong: number; medium: number; weak: number;
    withSignal: number; noIntervention: number; insideReview74: number; outsideReview74: number;
    confrontation: Pair[]; source: string;
  };
  materialConference?: {
    works: number; matches: number; corrected: number; withoutWork: number;
    analyticConflicts: number; transformerWorks: number; items: number; value: number;
    source: string; rule: string;
    correctedList: Array<{ id: string; ss: string; work: string; detail: string; decision: string; rule: string }>;
    conflictList: Array<{ id: string; ss: string; work: string; sheet: string; checked: string; transformers: number; value: number }>;
  };
};

type Change = { status?: string; comment: string; at: string; actor: string; action: string };
type Overrides = Record<string, Change[]>;
type DemoUser = {
  id: string; name: string; role: string; initials: string; username: string; password: string;
  description: string; canApprove: boolean;
};
type Municipality = { ibge: string; name: string; latitude: number; longitude: number; capital: boolean };

const DEMO_USERS: DemoUser[] = [
  { id: "matheus-alves", name: "Matheus Alves", role: "Supervisor", initials: "MA", username: "matheus.alves", password: "Supervisor@134", description: "Controle operacional, acompanhamento das equipes e aprovação.", canApprove: true },
  { id: "joao-antonio", name: "João Antônio", role: "Desenvolvedor", initials: "JA", username: "joao.antonio", password: "Dev@134", description: "Acesso técnico total e configuração do protótipo.", canApprove: false },
  { id: "mateus-gracia", name: "Mateus Gracia", role: "Engenheiro", initials: "MG", username: "mateus.gracia", password: "Engenharia@134", description: "Análise de engenharia e aprovação oficial.", canApprove: true },
  { id: "andressa", name: "Andressa", role: "Analista", initials: "AN", username: "andressa", password: "Analise@134", description: "Análise de SS, OS, SIGCO e consolidação.", canApprove: false },
  { id: "ronnald", name: "Ronnald", role: "Técnico terceiro", initials: "RO", username: "ronnald", password: "Tecnico@134", description: "Registro técnico, evidências e solicitação de expurgo.", canApprove: false },
  { id: "gustavo", name: "Gustavo", role: "Técnico terceiro", initials: "GU", username: "gustavo", password: "Tecnico@134", description: "Registro técnico, evidências e solicitação de expurgo.", canApprove: false },
  { id: "danillo", name: "Danillo", role: "Coordenador", initials: "DA", username: "danillo", password: "Coordenador@134", description: "Coordenação da operação, acompanhamento das filas e aprovação.", canApprove: true },
  { id: "carlos", name: "Carlos", role: "Desenvolvedor 2", initials: "CA", username: "carlos", password: "Dev2@134", description: "Acesso técnico ao protótipo, manutenção e apoio à configuração.", canApprove: false },
];

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
  overview: { eyebrow: "Base 134 · jan–jun/2026", title: "Visão geral", description: "Leitura operacional da carga, das propostas da IA e das pendências." },
  ss: { eyebrow: "Primeira leitura", title: "Análise de SS", description: "O que foi solicitado, alegado e identificado no texto original da SS." },
  os: { eyebrow: "Execução registrada", title: "Análise por OS", description: "O que a equipe executou e quais evidências foram deixadas na OS." },
  newbase: { eyebrow: "Camada de decisão", title: "New Base — Análise Consolidada", description: "Os 134 casos reunidos com regra, justificativa, confiança e aprovação." },
  map: { eyebrow: "Distribuição territorial", title: "Mapa dos transformadores", description: "Visualização municipal aproximada dos 134 atendimentos. Clique em um ponto para consultar os casos." },
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

function DemoLogin({ onLogin }: { onLogin: (user: DemoUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const match = DEMO_USERS.find((item) =>
      item.username.toLowerCase() === username.trim().toLowerCase() && item.password === password);
    if (!match) {
      setError("Usuário ou senha de demonstração inválidos.");
      return;
    }
    localStorage.setItem("auditoria-134-demo-user", match.id);
    onLogin(match);
  };

  return <main className="login-page">
    <section className="login-intro">
      <div className="login-brand"><i>T</i><span>Transforma</span></div>
      <div><span className="login-kicker">AUDITORIA TÉCNICA · BASE 134</span><h1>Decisões rastreáveis, do campo à aprovação.</h1>
        <p>Ambiente demonstrativo para análise de SS, OS, obras, materiais, expurgos e indicadores financeiros.</p></div>
      <small>Protótipo funcional · dados de janeiro a junho de 2026</small>
    </section>
    <section className="login-panel">
      <form onSubmit={submit}>
        <span>ACESSO AO SISTEMA</span><h2>Entrar</h2><p>Use uma das credenciais temporárias da apresentação.</p>
        <label>Usuário<input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} placeholder="nome.sobrenome" /></label>
        <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••••" /></label>
        {error ? <strong className="login-error">{error}</strong> : null}
        <button type="submit">Acessar painel</button>
      </form>
      <details className="demo-credentials">
        <summary>Ver acessos de demonstração</summary>
        {DEMO_USERS.map((item) => <button key={item.id} onClick={() => { setUsername(item.username); setPassword(item.password); }}>
          <b>{item.initials}</b><span><strong>{item.name}</strong><small>{item.username} · {item.password}</small></span><em>{item.role}</em>
        </button>)}
      </details>
      <p className="prototype-note">As credenciais desta tela servem apenas para apresentação. A versão definitiva usará autenticação segura e senhas individuais não exibidas.</p>
    </section>
  </main>;
}

function Kpi({ label, value, note, tone = "neutral" }: { label: string; value: string | number; note: string; tone?: string }) {
  return <article className={`kpi ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function BarList({ data, total, moneyValues = false }: { data: Pair[]; total?: number; moneyValues?: boolean }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return <div className="bar-list">
    {data.map((item) => <div className="bar-row" key={item.label}>
      <div><span>{item.label}</span><strong>{moneyValues ? money(item.value) : item.value}</strong></div>
      <i><b style={{ width: `${(item.value / max) * 100}%` }} /></i>
      {total ? <small>{pct(item.value, total)}% da base</small> : null}
    </div>)}
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
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [module, setModule] = useState<Module>("overview");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AuditRecord | null>(null);
  const [detailTab, setDetailTab] = useState<"consolidado" | "ss" | "os" | "obra" | "campo" | "historico">("consolidado");
  const [comment, setComment] = useState("");
  const [expurgeReason, setExpurgeReason] = useState("");
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    fetch(assetUrl("auditorias.json")).then((response) => response.json()).then(setData);
    fetch(assetUrl("municipios-to.json")).then((response) => response.json()).then(setMunicipalities);
    const saved = localStorage.getItem("auditoria-134-historico");
    if (saved) Promise.resolve().then(() => setOverrides(JSON.parse(saved)));
    const savedUser = localStorage.getItem("auditoria-134-demo-user");
    const match = DEMO_USERS.find((item) => item.id === savedUser);
    if (match) Promise.resolve().then(() => setUser(match));
  }, []);

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
    const bySearch = data.records.filter((record) => !needle || normalize([
      record.ss, record.os, record.location, record.sigco, record.category, record.consolidated.decision,
      record.consolidated.cause, record.consolidated.rule, record.work.number,
    ].join(" ")).includes(needle));
    // uma busca por "R-CAMPO-03" passa a encontrar os dossiês pela regra de campo acionada
    const byField = needle && FIELD_RULE_IDS.some((id) => normalize(id).includes(needle))
      ? data.records.filter((record) => (record.fieldAnalysis?.rules || []).some((id) => normalize(id).includes(needle)))
      : [];
    const merged = byField.length ? Array.from(new Set([...bySearch, ...byField])) : bySearch;
    if (module === "expurgos") return merged.filter((record) => record.consolidated.decision === "EXPURGAR");
    if (module === "sigco") return merged.filter((record) => record.consolidated.flags.includes("Análise por SIGCO"));
    if (module === "revisoes") return merged.filter((record) => record.consolidated.review);
    if (module === "aprovacoes") return merged.filter((record) =>
      (overrides[record.id]?.at(-1)?.status || record.consolidated.approvalStatus) === "PENDENTE");
    return merged;
  }, [data, query, module, overrides]);

  if (!data) return <main className="loading"><i /><span>Carregando os 134 registros…</span></main>;
  if (!user) return <DemoLogin onLogin={setUser} />;

  const approved = data.records.filter((record) => statusOf(record) === "APROVADO").length;
  const title = TITLES[module];
  const openRecord = (record: AuditRecord) => { setSelected(record); setDetailTab("consolidado"); setComment(""); setExpurgeReason(""); };
  const logout = () => {
    localStorage.removeItem("auditoria-134-demo-user");
    setUser(null);
  };
  const municipalityIndex = new Map(municipalities.map((item) => [normalize(item.name), item]));
  const mapPoints = Object.values(data.records.reduce<Record<string, {
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

  const Queue = ({ mode = "newbase" }: { mode?: "ss" | "os" | "newbase" }) => <section className="panel list-panel">
    <div className="list-head"><div><span>{filtered.length} registros</span><strong>{module === "newbase" ? "New Base completa" : title.title}</strong></div>
      <label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar SS, OS, local, SIGCO, regra…" /></label>
    </div>
    <RecordTable records={filtered} mode={mode} onOpen={openRecord} statusOf={statusOf} />
  </section>;

  const renderModule = () => {
    if (module === "overview") return <>
      <section className="scope-strip">
        <div><span>Fonte ativa</span><strong>{data.meta.source}</strong></div>
        <div><span>Período</span><strong>{data.meta.period.start} — {data.meta.period.end}</strong></div>
        <div><span>Governança</span><strong>{approved} oficiais · {data.summary.total - approved} pendentes</strong></div>
        <p>{data.meta.note.replace("Matheus Gracia", "Mateus Gracia")}</p>
      </section>
      <section className="kpi-grid">
        <Kpi label="Base carregada" value={data.summary.total} note="134 SS · 134 OS" tone="ink" />
        <Kpi label="Queimados na origem" value={data.summary.burned} note={`${pct(data.summary.burned, data.summary.total)}% da carga`} tone="red" />
        <Kpi label="Avariados na origem" value={data.summary.damaged} note={`${pct(data.summary.damaged, data.summary.total)}% da carga`} tone="blue" />
        <Kpi label="Proposta: incluir" value={data.summary.included} note="Ainda não oficial" tone="green" />
        <Kpi label="Proposta: expurgar" value={data.summary.expurged} note={`${data.expurgeDashboard.sentToReview} também em revisão`} tone="red" />
        <Kpi label="Revisão manual" value={data.summary.review} note="Responsável: Mateus Gracia" tone="amber" />
      </section>
      <section className="dashboard-columns">
        <article className="panel chart-panel"><div className="panel-title"><div><span>Distribuição mensal</span><h2>Abertura da SS</h2></div><small>Origem: data da SS</small></div>
          <div className="month-chart">{data.byMonth.map((month) => <div className="month" key={month.month}>
            <strong>{month.total}</strong><div className="stack" title={`${month.burned} queimados · ${month.damaged} avariados`}>
              <i className="burned" style={{ height: `${(month.burned / Math.max(...data.byMonth.map((item) => item.total))) * 150}px` }} />
              <i className="damaged" style={{ height: `${(month.damaged / Math.max(...data.byMonth.map((item) => item.total))) * 150}px` }} />
            </div><span>{month.label}</span>
          </div>)}</div>
          <div className="legend"><span><i className="burned" />Queimado</span><span><i className="damaged" />Avariado</span></div>
        </article>
        <article className="panel pipeline"><div className="panel-title"><div><span>Processo</span><h2>Três leituras, uma decisão</h2></div></div>
          {[
            ["01", "Análise de SS", "Solicitação, condição alegada e causa provável", 134],
            ["02", "Análise por OS", "Execução, ação e contrapontos", 134],
            ["03", "New Base", "Consolidação pendente de aprovação", 134],
          ].map((item) => <button key={item[0]} onClick={() => setModule(item[0] === "01" ? "ss" : item[0] === "02" ? "os" : "newbase")}>
            <b>{item[0]}</b><span><strong>{item[1]}</strong><small>{item[2]}</small></span><em>{item[3]}</em>
          </button>)}
        </article>
      </section>
      {data.materialConference ? <section className="panel conference-panel">
        <div className="panel-title"><div><span>Conferência de material</span><h2>A base de itens da obra confirma as análises</h2></div><small>{data.materialConference.works} obras conferidas</small></div>
        <section className="kpi-grid">
          <Kpi label="Obras batendo item a item" value={`${data.materialConference.matches}/${data.materialConference.works}`} note="Transformadores, postes, para-raios, itens e valor" tone="green" />
          <Kpi label="Obras corrigidas" value={data.materialConference.corrected} note="A aba Obras contava acessório como equipamento" tone="red" />
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
    </>;

    if (module === "ss") return <Queue mode="ss" />;
    if (module === "os") return <Queue mode="os" />;
    if (module === "newbase" || ["expurgos", "sigco", "revisoes", "aprovacoes"].includes(module)) return <Queue mode="newbase" />;
    if (module === "map") return <>
      <section className="map-layout">
        <article className="panel map-panel">
          <div className="panel-title"><div><span>Localização aproximada</span><h2>{mapPoints.length} municípios identificados</h2></div><small>Centro municipal · não representa coordenada do ativo</small></div>
          <MapView points={mapPoints} onSelect={(name) => setQuery(name)} />
        </article>
        <aside className="panel map-summary">
          <span>LEITURA DO MAPA</span><h2>134 atendimentos</h2>
          <p>O tamanho do círculo acompanha a quantidade de casos. Pontos vermelhos possuem ao menos uma proposta de expurgo.</p>
          <div><b>{mapPoints.length}</b><span>municípios no mapa</span></div>
          <div><b>{data.summary.burned}</b><span>transformadores queimados</span></div>
          <div><b>{data.summary.damaged}</b><span>transformadores avariados</span></div>
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
      <section className="kpi-grid">
        <Kpi label="Expurgos automáticos" value={data.expurgeDashboard.total} note={`${pct(data.expurgeDashboard.total, data.summary.total)}% da base`} tone="red" />
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
      <div className="brand"><i>T</i><div><strong>Transforma</strong><span>Auditoria · Base 134</span></div></div>
      <nav>{NAV.map((group) => <div className="nav-group" key={group.group}><span>{group.group}</span>{group.items.map((item) => <button className={module === item.id ? "active" : ""} key={item.id} onClick={() => { setModule(item.id); setQuery(""); }}>
        <b>{item.code}</b><em>{item.label}</em>{item.id === "newbase" ? <small>134</small> : null}
      </button>)}</div>)}</nav>
      <div className="side-user"><b>{user.initials}</b><div><strong>{user.name}</strong><span>{user.role}</span></div><button onClick={logout} title="Sair">↗</button></div>
    </aside>
    <main className="workspace">
      <header className="page-header"><div><span>{title.eyebrow}</span><h1>{title.title}</h1><p>{title.description}</p></div>
        <div className="header-meta"><span>{user.role}</span><strong>{user.name}</strong><small>{data.summary.total} registros · demonstração</small></div>
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
        <nav>{(["consolidado", "ss", "os", "obra", "campo", "historico"] as const).map((tab) => <button
          key={tab}
          className={`${detailTab === tab ? "active" : ""}${tab === "campo" ? " no-caps" : ""}`.trim()}
          onClick={() => setDetailTab(tab)}
        >{tab === "obra" ? "Obra / material" : tab === "campo" ? "Análise por Intervenções" : tab}</button>)}</nav>
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
          {detailTab === "campo" && <FieldTab record={selected} rules={data.fieldRules || []} onUseReason={setExpurgeReason} />}
          {detailTab === "historico" && <><h3>Histórico do registro</h3>{(overrides[selected.id] || []).length ? <div className="timeline">{overrides[selected.id].slice().reverse().map((item, index) => <div className="timeline-item" key={`${item.at}-${index}`}><i /><div><strong>{item.action}</strong><span>{item.actor} · {new Date(item.at).toLocaleString("pt-BR")}</span><p>{item.comment}</p></div></div>)}</div> : <div className="empty"><strong>Sem alterações</strong><span>A proposta original da IA está preservada.</span></div>}</>}
        </div>
        <footer className="approval-bar">
          <label className="reason-field"><span>Motivo do expurgo</span><select value={expurgeReason} onChange={(event) => setExpurgeReason(event.target.value)}>
            <option value="">Selecione uma justificativa</option>
            {EXPURGE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
          </select></label>
          <label><span>Comentário obrigatório</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Registre a evidência e o motivo da decisão…" /></label>
          <button className="note-button" disabled={!comment.trim()} onClick={() => saveChange(selected, { comment, action: "Observação registrada" })}>Registrar observação</button>
          <button className="expurge-button" disabled={!comment.trim() || !expurgeReason} onClick={() => saveChange(selected, { status: "EXPURGADO", comment: `${expurgeReason}: ${comment.trim()}`, action: "Expurgo solicitado" })}>Expurgar</button>
          {user.canApprove ? <button className="reject-button" disabled={!comment.trim()} onClick={() => saveChange(selected, { status: "REJEITADO", comment, action: "Análise rejeitada" })}>Rejeitar</button> : null}
          {user.canApprove ? <button className="approve-button" disabled={!comment.trim()} onClick={() => saveChange(selected, { status: "APROVADO", comment, action: "Análise aprovada" })}>Aprovar análise</button> : null}
        </footer>
      </aside>
    </div>}
  </div>;
}
