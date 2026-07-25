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
  ssAnalysis: { description: string; category: string; causeHint: string; evidence: string };
  osAnalysis: { description: string; action: string; transformerEvidence: string; evidence: string };
  work: { number: string; description: string; status: string; contractor: string; terminal: boolean; analyticReason: string };
  material: { transformers: number; poles: number; lightningArresters: number; items: number; value: number };
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
};

type Pair = { label: string; value: number };
type AuditData = {
  meta: {
    title: string; period: { start: string; end: string; observedEnd: string }; total: number;
    source: string; generatedAt: string; reviewer: string; approvalPolicy: string; note: string;
  };
  summary: {
    total: number; burned: number; damaged: number; included: number; expurged: number;
    review: number; approved: number; pending: number; works: number; analyticAlerts: number;
  };
  financial: {
    materialValue: number; totalBudgeted: number; totalRealized: number;
    materialBudgeted: number; materialRealized: number; laborBudgeted: number; laborRealized: number;
  };
  byMonth: Array<{
    month: number; label: string; total: number; burned: number; damaged: number;
    expurged: number; included: number; review: number; realized: number;
  }>;
  expurgeDashboard: { total: number; value: number; materialValue: number; byCause: Pair[]; byRule: Pair[]; sentToReview: number };
  aiDashboard: {
    highConfidence: number; mediumConfidence: number; lowConfidence: number; needsReview: number;
    sigcoAnalysis: number; completeEvidence: number; byDecision: Pair[]; byRule: Pair[];
  };
  records: AuditRecord[];
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
  "Outro motivo técnico",
];

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
  regras: { eyebrow: "Manual v1.0", title: "Regras de decisão", description: "Critérios operacionais reproduzidos no motor de análise." },
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
  value === "INCLUIR" ? "good" : value === "EXPURGAR" ? "bad" : "warn";

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

function RecordTable({
  records, mode, onOpen, statusOf,
}: {
  records: AuditRecord[]; mode: "ss" | "os" | "newbase"; onOpen: (record: AuditRecord) => void;
  statusOf: (record: AuditRecord) => string;
}) {
  return <div className="table-scroll"><table className="records-table">
    <thead><tr>
      <th>Identificação</th>
      <th>Data / local</th>
      {mode === "ss" && <><th>Leitura da SS</th><th>Evidência</th></>}
      {mode === "os" && <><th>Ação da OS</th><th>Obra / material</th></>}
      {mode === "newbase" && <><th>Consolidado</th><th>Regra / confiança</th><th>Aprovação</th></>}
    </tr></thead>
    <tbody>{records.map((record) => <tr key={record.id} onClick={() => onOpen(record)}>
      <td><strong>{record.ss}</strong><span>{record.os}</span><code>{record.id}</code></td>
      <td><strong>{record.openedAtLabel}</strong><span>{record.location}</span><small>SIGCO {record.sigco || "—"}</small></td>
      {mode === "ss" && <><td><b className={`condition ${record.category.toLowerCase()}`}>{record.category}</b><span>{record.ssAnalysis.causeHint}</span></td><td><p className="clip">{record.ssAnalysis.evidence || record.ssAnalysis.description}</p></td></>}
      {mode === "os" && <><td><strong>{record.osAnalysis.action}</strong><span>{record.osAnalysis.transformerEvidence}</span></td><td><strong>{record.work.number || "Sem obra"}</strong><span>{record.work.description || record.work.status}</span><small>{record.material.transformers} trafo · {record.material.poles} poste</small></td></>}
      {mode === "newbase" && <><td><b className={`pill ${decisionClass(record.consolidated.decision)}`}>{record.consolidated.decision}</b><span>{record.consolidated.cause}</span><small>{record.consolidated.rationale}</small></td><td><code>{record.consolidated.rule}</code><span>{record.consolidated.confidence}% · {record.consolidated.confidenceBand}</span></td><td><b className={`pill ${statusOf(record) === "APROVADO" ? "good" : statusOf(record) === "REJEITADO" ? "bad" : "warn"}`}>{statusOf(record)}</b><span>{record.consolidated.reviewer.replace("Matheus Gracia", "Mateus Gracia")}</span></td></>}
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
  const [detailTab, setDetailTab] = useState<"consolidado" | "ss" | "os" | "obra" | "historico">("consolidado");
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
    if (module === "expurgos") return bySearch.filter((record) => record.consolidated.decision === "EXPURGAR");
    if (module === "sigco") return bySearch.filter((record) => record.consolidated.flags.includes("Análise por SIGCO"));
    if (module === "revisoes") return bySearch.filter((record) => record.consolidated.review);
    if (module === "aprovacoes") return bySearch.filter((record) =>
      (overrides[record.id]?.at(-1)?.status || record.consolidated.approvalStatus) === "PENDENTE");
    return bySearch;
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
      <section className="panel editorial-note"><span>LEITURA DE CONTROLE</span><p>Os números de inclusão, expurgo e revisão são propostas geradas pelas regras do Manual v1.0. O total oficial permanece separado até um dos aprovadores autorizados revisar e aprovar cada caso.</p></section>
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

    if (module === "auto-expurge") return <>
      <section className="kpi-grid">
        <Kpi label="Expurgos automáticos" value={data.expurgeDashboard.total} note={`${pct(data.expurgeDashboard.total, data.summary.total)}% da base`} tone="red" />
        <Kpi label="Valor realizado associado" value={compactMoney(data.expurgeDashboard.value)} note={money(data.expurgeDashboard.value)} tone="ink" />
        <Kpi label="Material associado" value={compactMoney(data.expurgeDashboard.materialValue)} note={money(data.expurgeDashboard.materialValue)} tone="blue" />
        <Kpi label="Também em revisão" value={data.expurgeDashboard.sentToReview} note="Possível furto ou abalroamento" tone="amber" />
      </section>
      <section className="dashboard-columns">
        <article className="panel"><div className="panel-title"><div><span>Motivos</span><h2>Expurgos por causa</h2></div></div><BarList data={data.expurgeDashboard.byCause} total={data.summary.total} /></article>
        <article className="panel"><div className="panel-title"><div><span>Motor</span><h2>Regras acionadas</h2></div></div><BarList data={data.expurgeDashboard.byRule} /></article>
      </section>
      <section className="panel"><div className="list-head"><div><span>{data.expurgeDashboard.total} casos</span><strong>Dossiês que acionaram expurgo automático</strong></div></div>
        <RecordTable records={data.records.filter((record) => record.consolidated.automaticExpurge)} mode="newbase" onOpen={openRecord} statusOf={statusOf} /></section>
    </>;

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
      ].map(([code, trigger, result]) => <article className="panel rule-card" key={code}><code>{code}</code><h2>{trigger}</h2><p>{result}</p></article>)}
      <article className="panel editorial-note wide"><span>SIGCO</span><p>20497: abalroamento · 25983: análise obrigatória · 8812: queimado · 25962: avariado · 8385: não comprova falha sozinho · #N/A: recomendar abertura/correção com motivo.</p></article>
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
        <nav>{(["consolidado", "ss", "os", "obra", "historico"] as const).map((tab) => <button key={tab} className={detailTab === tab ? "active" : ""} onClick={() => setDetailTab(tab)}>{tab === "obra" ? "Obra / material" : tab}</button>)}</nav>
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
          {detailTab === "ss" && <><h3>Análise de SS</h3><article className="source-text"><span>DESCRIÇÃO ORIGINAL DA SS</span><p>{selected.ssAnalysis.description}</p></article><section className="detail-grid"><div><span>Condição recebida</span><strong>{selected.ssAnalysis.category}</strong></div><div><span>Causa sugerida</span><strong>{selected.ssAnalysis.causeHint}</strong></div></section><article className="evidence"><span>EVIDÊNCIA DESTACADA</span><p>{selected.ssAnalysis.evidence || "Nenhum trecho conclusivo."}</p></article></>}
          {detailTab === "os" && <><h3>Análise por OS</h3><article className="source-text"><span>DESCRIÇÃO ORIGINAL DA OS</span><p>{selected.osAnalysis.description}</p></article><section className="detail-grid"><div><span>Ação</span><strong>{selected.osAnalysis.action}</strong></div><div><span>Evidência de material</span><strong>{selected.osAnalysis.transformerEvidence}</strong></div></section><article className="evidence"><span>EVIDÊNCIA DESTACADA</span><p>{selected.osAnalysis.evidence || "Nenhum trecho conclusivo."}</p></article></>}
          {detailTab === "obra" && <><h3>Obra e material</h3><section className="detail-grid">
            <div><span>Obra</span><strong>{selected.work.number || "Não localizada"}</strong></div><div><span>Status</span><strong>{selected.work.status}</strong></div>
            <div><span>Descrição</span><strong>{selected.work.description || "—"}</strong></div><div><span>Alerta analítico</span><strong>{selected.work.analyticReason || "Sem alerta"}</strong></div>
            <div><span>Transformadores / postes</span><strong>{selected.material.transformers} / {selected.material.poles}</strong></div><div><span>Valor de material</span><strong>{money(selected.material.value)}</strong></div>
            <div><span>Total orçado</span><strong>{money(selected.finance.totalBudgeted)}</strong></div><div><span>Total realizado</span><strong>{money(selected.finance.totalRealized)}</strong></div>
          </section></>}
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
