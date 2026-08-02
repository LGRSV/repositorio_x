"use client";

import { useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ tipos */

type Modulo =
  | "visao" | "interrupcao" | "deslocamento" | "ssos" | "obra" | "decisao"
  | "profunda"
  | "semdesloc"
  | "semfato" | "expurgos" | "ativos" | "regras" | "bases";

type Registro = Record<string, string | number | boolean | null>;

type Fluxo = {
  meta: { titulo: string; janelaHoras: number; regra?: string; fontes: string[]; lacunas: string[] };
  resumo: Record<string, number | Record<string, number>>;
  registros: Registro[];
  historico: Array<Array<string | number | null>>;
};

type Metodo = {
  resumo: { titulo: string; paragrafos: string[] };
  blocos: Array<{
    id: string; titulo: string; paragrafos?: string[];
    itens?: Array<{ rotulo: string; texto: string }>;
    tabela?: { cabecalho: string[]; linhas: string[][] };
    quadrinhos?: Array<{ n: string; titulo: string; texto: string; base: string; pergunta: string }>;
  }>;
};

type Par = { label: string; value: number };

/* ------------------------------------------------------------------ utilidades */


// O JSON guarda a data em ISO porque assim ela ordena como texto. Na tela sai em
// dia/mês/ano, que é como se lê aqui — a conversão fica num lugar só.
const dataBR = (valor: unknown) => {
  const v = texto(valor);
  if (!v) return "—";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return v;
  return m[4] ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : `${m[3]}/${m[2]}/${m[1]}`;
};
const soData = (valor: unknown) => dataBR(valor).slice(0, 10);
const br = (v: number) => v.toLocaleString("pt-BR");
const pct = (v: number, total: number) => (total ? Math.round((v / total) * 100) : 0);
const normalize = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const assetUrl = (p: string) => `${import.meta.env.BASE_URL || "/"}${p.replace(/^\/+/, "")}`;
const texto = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(v));
const decisaoClasse = (v: string) => (v === "INCLUIR" ? "good" : v === "EXCLUIR" ? "bad" : "warn");
const fatoClasse = (v: string) => (v === "F1" ? "good" : v === "F3" ? "bad" : "pend");

const FATO_ROTULO: Record<string, string> = {
  F1: "Fato pleno", F0: "Fato com ressalva", F2: "Fato provável", F3: "Sem fato",
};
const LEITURA_ROTULO: Record<string, string> = {
  L1: "Texto diz falha", L2: "Texto diz outra causa", L3: "Texto não decide",
};

function contar(linhas: Registro[], campo: string, limite = 12): Par[] {
  const mapa = new Map<string, number>();
  linhas.forEach((l) => {
    const chave = texto(l[campo]) || "—";
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  });
  return [...mapa.entries()].map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value).slice(0, limite);
}

function mediana(valores: number[]) {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
}

/* As colunas da planilha. Uma lista só, usada na tela, no CSV e no dossiê — se o número
   da caixa e a lista divergirem, é porque alguém criou uma segunda fonte de verdade. */
const COLUNAS: Array<[string, string]> = [
  ["SS", "ss"], ["OS", "os"], ["Obra", "obra"], ["Ativo", "trafo"],
  ["Decisão", "decisao"], ["Fato", "fato"], ["Leitura", "leitura"],
  ["Categoria pelo texto", "categoria_texto"], ["Categoria gravada", "categoria_gravada"],
  ["Motivo da decisão", "motivo_decisao"], ["Abertura da SS", "abertura"], ["Término", "termino"],
  ["Situação da SS", "situacao"], ["Criticidade", "criticidade"],
  ["Ocorrência", "oc_num"], ["Início da ocorrência", "oc_ini"], ["Fim da ocorrência", "oc_fim"],
  ["Duração (h)", "oc_dur_h"], ["Clientes interrompidos", "oc_cons"], ["Distância (h)", "oc_dist_h"],
  ["Papel do trafo", "oc_papel"], ["Elemento do defeito", "oc_prob_ele"], ["Tipo da ocorrência", "oc_tipo"],
  ["Causa em campo", "oc_causa"], ["Subcausa em campo", "oc_sub"], ["Ressalvas", "ressalvas"],
  ["Atendimento", "at_num"], ["Início do atendimento", "at_ini"], ["Equipe", "at_equipe"],
  ["TMP", "at_tmp"], ["TMD", "at_tmd"], ["TME", "at_tme"], ["TMA", "at_tma"],
  ["Causa (atendimento)", "at_causa"], ["Subcausa (atendimento)", "at_sub"],
  ["Corrobora?", "tmae_corrobora"], ["Na lacuna de janeiro", "tmae_gap_jan"],
  ["Material", "e3_motivo"], ["Trafos no material", "trafos_material"],
  ["Material conferido", "material_conferido"],
  ["Alertas de obra", "e4_alertas"], ["Classe da obra", "obra_classe"],
  ["Natureza", "obra_natureza"], ["Tipo da obra", "obra_tipo"],
  ["SIGCO da SS", "sigco"], ["SIGCO do projeto", "obra_sigco_proj"],
  ["Última movimentação", "obra_ultimo_nome"], ["Setor", "obra_setor"],
  ["Empreiteira", "obra_empreiteira"], ["Realizado", "obra_realizado"],
  ["Solicitante", "solicitante"], ["Origem", "origem"], ["Equipe da SS", "equipe_ss"],
  ["Tipo da solicitação", "tipo_ss"], ["Localidade", "localidade"], ["Alimentador", "alimentador"],
  ["Potência retirada", "pot_ret"], ["Potência instalada", "pot_inst"],
  ["Ocorrências do ativo", "ocorrencias_ativo"], ["Atendimentos do ativo", "atendimentos_ativo"],
  ["Teste do vizinho", "vizinho"], ["Decisão anterior", "decisao_anterior"],
  ["Mudou na revisão", "mudou_na_revisao"],
  ["Observação em campo", "oc_obs"], ["Observação do executante", "at_obs"],
  ["Descrição da SS", "desc_ss"], ["Descrição da OS", "desc_os"],
];

function baixarCSV(linhas: Registro[], titulo: string, janela: number) {
  const cabec = [...COLUNAS.map(([r]) => r), "janela_horas"].join(";");
  const corpo = linhas.map((l) => [
    ...COLUNAS.map(([, c]) => texto(l[c]).replace(/[;\r\n]+/g, " ").trim()),
    String(janela),
  ].join(";")).join("\r\n");
  const nome = titulo.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60) || "recorte";
  const blob = new Blob([`﻿${cabec}\r\n${corpo}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `${nome}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ------------------------------------------------------------------ peças */

function Kpi({ rotulo, valor, nota, tom = "neutral", aoClicar }: {
  rotulo: string; valor: string | number; nota: string; tom?: string; aoClicar?: () => void;
}) {
  const conteudo = <><span>{rotulo}</span><strong>{valor}</strong><small>{nota}</small></>;
  if (!aoClicar) return <article className={`kpi ${tom}`}>{conteudo}</article>;
  return <button type="button" className={`kpi ${tom} kpi-open`} onClick={aoClicar}>{conteudo}</button>;
}

function Barras({ dados, total, aoSelecionar }: {
  dados: Par[]; total?: number; aoSelecionar?: (label: string) => void;
}) {
  const max = Math.max(...dados.map((d) => d.value), 1);
  return <div className="bar-list">
    {dados.map((d) => {
      const corpo = <>
        <div><span>{d.label}</span><strong>{br(d.value)}</strong></div>
        <i><b style={{ width: `${(d.value / max) * 100}%` }} /></i>
        {total ? <small>{pct(d.value, total)}% do recorte</small> : null}
      </>;
      return aoSelecionar
        ? <button type="button" className="bar-row" key={d.label} onClick={() => aoSelecionar(d.label)}>{corpo}</button>
        : <div className="bar-row" key={d.label}>{corpo}</div>;
    })}
  </div>;
}

/* A tabela é a mesma em todas as abas; o que muda são as três colunas do meio, que
   contam a história daquele estágio. */
const CLASSES_CURTAS: Array<[string, string, string]> = [
  ["QUEIMADO", "Q", "good"], ["AVARIADO", "A", "pend"],
  ["REGRA", "R", "warn"], ["PROFUNDA", "P", "bad"],
];

function Tabela({ linhas, modo, aoAbrir, classificacoes, aoClassificar }: {
  linhas: Registro[]; modo: Modulo; aoAbrir: (r: Registro) => void;
  classificacoes: Record<string, { classe: string; quem: string; quando: string }>;
  aoClassificar: (ss: string, classe: string) => void;
}) {
  const cabecalho: Record<string, string[]> = {
    interrupcao: ["Ocorrência", "O que o campo registrou", "Casamento"],
    deslocamento: ["Atendimento", "Equipe e tempos", "Corroboração"],
    ssos: ["Leitura do texto", "Material", "Solicitação"],
    obra: ["Obra", "Enquadramento", "Responsáveis"],
    decisao: ["Fato", "Leitura", "Motivo"],
    semfato: ["O que se procurou", "Teste do vizinho", "Leitura"],
    expurgos: ["Motivo da exclusão", "Solicitação", "Obra"],
    visao: ["Fato", "Leitura", "Motivo"],
    ativos: ["Fato", "Leitura", "Motivo"],
    regras: ["Fato", "Leitura", "Motivo"],
    bases: ["Fato", "Leitura", "Motivo"],
  };
  const colunas = cabecalho[modo] || cabecalho.decisao;
  return <div className="table-scroll"><table className="records-table">
    <thead><tr>
      <th>Identificação</th><th>Data e local</th>
      <th>{colunas[0]}</th><th>{colunas[1]}</th><th>{colunas[2]}</th><th>Decisão</th><th>Minha classificação</th>
    </tr></thead>
    <tbody>{linhas.map((r) => <tr key={texto(r.ss)} onClick={() => aoAbrir(r)}>
      <td><strong>{texto(r.ss)}</strong><span>{texto(r.os) || "sem OS"}</span><code>{texto(r.trafo)}</code></td>
      <td><strong>{dataBR(r.abertura)}</strong><span>{texto(r.localidade)}</span><small>{texto(r.equipe_ss)} · {texto(r.origem)}</small></td>

      {modo === "interrupcao" && <>
        <td><strong>{texto(r.oc_num) || "sem ocorrência"}</strong><span>{dataBR(r.oc_ini)}</span><small>{r.oc_dur_h ? `${r.oc_dur_h}h · ${texto(r.oc_cons)} clientes` : ""}</small></td>
        <td><strong>{texto(r.oc_causa) || "—"}</strong><span>{texto(r.oc_sub)}</span><small>{texto(r.oc_papel)}</small></td>
        <td><b className={`pill ${fatoClasse(texto(r.fato))}`}>{FATO_ROTULO[texto(r.fato)] || texto(r.fato)}</b><span>{r.oc_dist_h !== null && r.oc_dist_h !== undefined ? `${r.oc_dist_h}h da abertura` : "—"}</span><small>{texto(r.ressalvas)}</small></td>
      </>}

      {modo === "deslocamento" && <>
        <td><strong>{texto(r.at_num) || "sem atendimento"}</strong><span>{dataBR(r.at_ini)}</span><small>{texto(r.at_causa)}</small></td>
        <td><strong>{texto(r.at_equipe) || "—"}</strong><span>{r.at_tma ? `TMA ${r.at_tma} min` : ""}</span><small>{r.at_tmd ? `deslocamento ${r.at_tmd} · execução ${texto(r.at_tme)}` : ""}</small></td>
        <td><strong>{texto(r.tmae_corrobora)}</strong><span>{texto(r.at_sub)}</span><small>{r.tmae_gap_jan === "SIM" ? "aberta na lacuna de 26 a 31 de janeiro" : ""}</small></td>
      </>}

      {modo === "ssos" && <>
        <td><b className={`condition ${texto(r.categoria_texto).toLowerCase()}`}>{texto(r.categoria_texto)}</b><span>{LEITURA_ROTULO[texto(r.leitura)]}</span><small>{texto(r.regra_leitura)}</small></td>
        <td><strong>{texto(r.trafos_material)} trafo</strong><span>{texto(r.material_conferido) === "SIM" ? "material conferido" : "material não conferido"}</span><small>{texto(r.e3_motivo)}</small></td>
        <td><strong>{texto(r.solicitante) || "—"}</strong><span>{texto(r.tipo_ss)}</span><small>{texto(r.pot_ret)} → {texto(r.pot_inst)} kVA</small></td>
      </>}

      {modo === "obra" && <>
        <td><strong>{texto(r.obra) || "sem obra"}</strong><span>{texto(r.obra_classe)}</span><small>{texto(r.obra_empreiteira)}</small></td>
        <td><strong>{texto(r.obra_tipo) || "—"}</strong><span>SIGCO {texto(r.sigco) || "—"}{r.obra_sigco_proj ? ` · projeto ${texto(r.obra_sigco_proj)}` : ""}</span><small>{texto(r.e4_alertas)}</small></td>
        <td><strong>{texto(r.obra_ultimo_nome) || "—"}</strong><span>{texto(r.obra_setor)}</span><small>abriu a SS: {texto(r.solicitante)}</small></td>
      </>}

      {modo === "semfato" && <>
        <td><strong>{texto(r.ocorrencias_ativo)} ocorrências no ativo</strong><span>{texto(r.atendimentos_ativo)} atendimentos</span><small>alimentador {texto(r.alimentador)}</small></td>
        <td><p className="clip">{texto(r.vizinho) || "—"}</p></td>
        <td><b className={`condition ${texto(r.categoria_texto).toLowerCase()}`}>{texto(r.categoria_texto)}</b><span>{texto(r.material_conferido) === "SIM" ? `${texto(r.trafos_material)} trafo no material` : "material não conferido"}</span></td>
      </>}

      {modo === "expurgos" && <>
        <td><p className="clip">{texto(r.motivo_decisao)}</p></td>
        <td><strong>{texto(r.solicitante) || "—"}</strong><span>{texto(r.origem)} · {texto(r.equipe_ss)}</span><small>{texto(r.tipo_ss)}</small></td>
        <td><strong>{texto(r.obra) || "sem obra"}</strong><span>SIGCO {texto(r.sigco) || "—"}</span><small>{texto(r.at_equipe) ? `atendeu ${texto(r.at_equipe)}` : "sem atendimento"}</small></td>
      </>}

      {(modo === "decisao" || modo === "visao" || modo === "ativos" || modo === "regras" || modo === "bases") && <>
        <td><b className={`pill ${fatoClasse(texto(r.fato))}`}>{FATO_ROTULO[texto(r.fato)] || texto(r.fato)}</b><span>{texto(r.oc_num) ? `ocorrência ${texto(r.oc_num)}` : "sem ocorrência"}</span><small>{texto(r.ressalvas)}</small></td>
        <td><strong>{LEITURA_ROTULO[texto(r.leitura)] || "—"}</strong><span>{texto(r.categoria_texto)}</span><small>{texto(r.categoria_texto) !== texto(r.categoria_gravada) ? `gravada como ${texto(r.categoria_gravada)}` : ""}</small></td>
        <td><p className="clip">{texto(r.motivo_decisao)}</p></td>
      </>}

      <td><b className={`pill ${decisaoClasse(texto(r.decisao))}`}>{texto(r.decisao)}</b>
        {r.mudou_na_revisao === "SIM" ? <span className="expurgo-tag">mudou na revisão</span> : null}
      </td>
      <td className="col-classificar" onClick={(e) => e.stopPropagation()}>
        <div className="classificar-linha">{CLASSES_CURTAS.map(([id, curto, tom]) => <button key={id} type="button"
          title={id}
          className={classificacoes[texto(r.ss)]?.classe === id ? `marcado ${tom}` : tom}
          onClick={() => aoClassificar(texto(r.ss), id)}>{curto}</button>)}</div>
        {classificacoes[texto(r.ss)] ? <span>{classificacoes[texto(r.ss)].classe.toLowerCase()}</span> : null}
      </td>
    </tr>)}</tbody>
  </table></div>;
}

/* ------------------------------------------------------------------ tela */

export default function Page() {
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const [modulo, setModulo] = useState<Modulo>("visao");
  const [busca, setBusca] = useState("");
  const [recorte, setRecorte] = useState<{ id: string; rotulo: string } | null>(null);
  const [aberto, setAberto] = useState<Registro | null>(null);
  const [abaDossie, setAbaDossie] = useState("consolidado");
  const [ativo, setAtivo] = useState("");
  // A classificação do analista mora no navegador. Não sobrescreve a decisão do fluxo:
  // fica ao lado dela, com quem marcou e quando, para virar decisão oficial depois.
  const [classificacao, setClassificacao] = useState<Record<string, { classe: string; quem: string; quando: string }>>({});
  const [janela, setJanela] = useState(24);

  useEffect(() => {
    fetch(assetUrl("fluxo-1510.json")).then((r) => r.json()).then(setFluxo).catch(() => setFluxo(null));
    fetch(assetUrl("metodo.json")).then((r) => r.json()).then(setMetodo).catch(() => setMetodo(null));
    const salvo = localStorage.getItem("fluxo-1510-classificacao");
    if (salvo) Promise.resolve().then(() => setClassificacao(JSON.parse(salvo)));
  }, []);

  const registros = fluxo?.registros ?? [];

  /* O nível de casamento é recalculado no navegador para a janela escolhida. A decisão
     gravada continua sendo a de 24h — o controle serve para ver a sensibilidade, e a tela
     diz quantos casos mudariam. */
  const comJanela = useMemo(() => registros.map((r) => {
    const dist = typeof r.oc_dist_h === "number" ? Math.abs(r.oc_dist_h) : null;
    const casa = r.oc_num ? (dist !== null && dist <= janela) : false;
    return { ...r, casa_na_janela: casa ? "SIM" : "NÃO" } as Registro;
  }), [registros, janela]);

  const mudamComJanela = useMemo(() => comJanela.filter((r) => {
    const fatoBase = r.fato === "F1" || r.fato === "F0";
    return fatoBase !== (r.casa_na_janela === "SIM");
  }).length, [comJanela]);

  const RECORTES: Record<Modulo, Array<{ id: string; rotulo: string; nota: string; teste: (r: Registro) => boolean }>> = {
    visao: [],
    interrupcao: [
      { id: "casou", rotulo: "Casou em até 24h", nota: "A abertura da SS cai dentro da ocorrência ou a até 24 horas dela.", teste: (r) => r.fato === "F1" || r.fato === "F0" },
      { id: "ressalva", rotulo: "Com ressalva", nota: "Programada, preventiva, sem cliente, de outro elemento ou reclamação individual.", teste: (r) => Boolean(texto(r.ressalvas)) },
      { id: "fora", rotulo: "Aparece em outra data", nota: "O ativo tem ocorrência no semestre, mas nenhuma perto da SS.", teste: (r) => r.e1_nivel === "FORA" },
      { id: "sem", rotulo: "Sem nenhuma ocorrência", nota: "O código não aparece na base de interrupção em seis meses.", teste: (r) => r.e1_nivel === "SEM" },
    ],
    deslocamento: [
      { id: "corrobora", rotulo: "Atendimento na janela", nota: "Equipe registrada no próprio transformador dentro da janela.", teste: (r) => texto(r.tmae_corrobora) !== "não" },
      { id: "semat", rotulo: "Sem atendimento", nota: "Nenhuma nota no código do trafo. Não é contraprova: a base tem lacuna.", teste: (r) => r.e2_status === "SEM ATENDIMENTO" },
      { id: "lacuna", rotulo: "Na lacuna de janeiro", nota: "SS aberta entre 26 e 31 de janeiro, período sem nenhum atendimento no arquivo.", teste: (r) => r.tmae_gap_jan === "SIM" },
      { id: "outra", rotulo: "Atendimento em outra data", nota: "Existe atendimento, mas longe da abertura da SS.", teste: (r) => r.e2_status === "RETIDO" },
    ],
    semdesloc: [
      { id: "todos", rotulo: "Toda a fila", nota: "Interrupção na janela, sem atendimento no código do trafo.", teste: (r) => r.cascata === "RETIDO — SEM DESLOCAMENTO" },
      { id: "lacuna", rotulo: "Na lacuna de janeiro", nota: "Aberta entre 26 e 31/01, quando o arquivo do TMAE não tem registro.", teste: (r) => r.cascata === "RETIDO — SEM DESLOCAMENTO" && r.tmae_gap_jan === "SIM" },
      { id: "comcliente", rotulo: "Com cliente interrompido", nota: "A interrupção atingiu gente, então houve evento de verdade.", teste: (r) => r.cascata === "RETIDO — SEM DESLOCAMENTO" && (Number(r.oc_cons) || 0) > 0 },
      { id: "proprio", rotulo: "Defeito no próprio trafo", nota: "O campo apontou o transformador como causador.", teste: (r) => r.cascata === "RETIDO — SEM DESLOCAMENTO" && texto(r.oc_papel).includes("próprio") },
      { id: "outroat", rotulo: "Ativo com atendimento em outra data", nota: "A equipe já esteve nesse transformador no semestre.", teste: (r) => r.cascata === "RETIDO — SEM DESLOCAMENTO" && (Number(r.atendimentos_ativo) || 0) > 0 },
    ],
    profunda: [
      { id: "todos", rotulo: "Tudo que você classificou", nota: "A sua leitura, ao lado da decisão do fluxo.", teste: () => true },
      { id: "q", rotulo: "Queimado", nota: "Martelo batido por você.", teste: () => true },
      { id: "a", rotulo: "Avariado", nota: "Martelo batido por você.", teste: () => true },
      { id: "r", rotulo: "Vale a regra", nota: "Você concordou com a decisão do fluxo.", teste: () => true },
      { id: "p", rotulo: "Análise profunda", nota: "Precisa de campo ou de documento que não temos.", teste: () => true },
    ],
    ssos: [
      { id: "falha", rotulo: "Texto diz falha", nota: "Queima ou avaria descrita no texto da SS ou da OS.", teste: (r) => r.leitura === "L1" },
      { id: "outra", rotulo: "Texto diz outra causa", nota: "Furto, abalroamento, preventivo, auxiliar, construção ou desativação.", teste: (r) => r.leitura === "L2" },
      { id: "indef", rotulo: "Texto não decide", nota: "Nunca decide sozinho: vai para leitura humana.", teste: (r) => r.leitura === "L3" },
      { id: "corrigida", rotulo: "Categoria corrigida", nota: "O rótulo gravado na base não corresponde ao que o texto descreve.", teste: (r) => Boolean(texto(r.categoria_texto)) && r.categoria_texto !== r.categoria_gravada },
      { id: "semmat", rotulo: "Sem material conferido", nota: "Obra fora do export de material ou obra não gerada.", teste: (r) => r.material_conferido !== "SIM" },
    ],
    obra: [
      { id: "alerta", rotulo: "Com alerta", nota: "R-OBR-01, R-OBR-02, R-OBR-03 ou divergência de SIGCO.", teste: (r) => r.e4_status === "ALERTA" },
      { id: "semobra", rotulo: "Sem obra gerada — análise à parte", nota: "Sem obra não existe consulta de material nem encerramento: o caso sai do fluxo e vai para análise própria.", teste: (r) => !texto(r.obra) },
      { id: "despesa", rotulo: "Obra em despesa", nota: "A obra não imobiliza o ativo.", teste: (r) => normalize(texto(r.obra_classe)).includes("DESPESA") },
      { id: "sigco", rotulo: "SIGCO divergente", nota: "O código do projeto difere do código da ocorrência.", teste: (r) => texto(r.e4_alertas).includes("SIGCO") },
    ],
    decisao: [
      { id: "saida", rotulo: "Saíram pela cascata", nota: "Passaram por interrupção, deslocamento, texto e material.", teste: (r) => r.cascata === "SAÍDA" },
      { id: "ret_fato", rotulo: "Retidos sem fato", nota: "O campo não registrou nada na janela.", teste: (r) => r.cascata === "RETIDO — SEM INTERRUPÇÃO NA JANELA" },
      { id: "ret_desl", rotulo: "Retidos sem deslocamento", nota: "Houve interrupção, mas nenhum atendimento no código do trafo.", teste: (r) => r.cascata === "RETIDO — SEM DESLOCAMENTO" },
      { id: "ret_prova", rotulo: "Retidos sem prova de troca", nota: "Chegaram ao fim, mas o material não comprova ou o texto não decide.", teste: (r) => r.cascata === "RETIDO — SEM PROVA DE TROCA" },
      { id: "incluir", rotulo: "INCLUIR", nota: "Passou nas três peneiras: campo, texto e material.", teste: (r) => r.decisao === "INCLUIR" },
      { id: "revisao", rotulo: "REVISÃO", nota: "Espera leitura humana, com o motivo escrito. Não é expurgo.", teste: (r) => r.decisao === "REVISÃO" },
      { id: "excluir", rotulo: "EXCLUIR", nota: "A leitura mostrou outra causa.", teste: (r) => r.decisao === "EXCLUIR" },
      { id: "mudou", rotulo: "Mudou na revisão", nota: "A decisão é diferente da que o funil anterior dava.", teste: (r) => r.mudou_na_revisao === "SIM" },
      { id: "queimados", rotulo: "Queimados", nota: "Incluídos cujo texto descreve queima.", teste: (r) => r.decisao === "INCLUIR" && r.categoria_texto === "QUEIMADO" },
      { id: "avariados", rotulo: "Avariados", nota: "Incluídos cujo texto descreve avaria.", teste: (r) => r.decisao === "INCLUIR" && r.categoria_texto === "AVARIADO" },
    ],
    semfato: [
      { id: "todos", rotulo: "Todos sem fato", nota: "Nem interrupção nem atendimento na janela de 24 horas.", teste: (r) => r.fato === "F3" },
      { id: "vizinho", rotulo: "Vizinho encontrado", nota: "Existe ocorrência em outro ativo do mesmo alimentador ou localidade na janela.", teste: (r) => r.fato === "F3" && Boolean(texto(r.vizinho)) && !texto(r.vizinho).startsWith("Nada") },
      { id: "nada", rotulo: "Nada encontrado", nota: "Nem vizinho. É a lista que sobe para investigação de campo.", teste: (r) => r.fato === "F3" && texto(r.vizinho).startsWith("Nada") },
      { id: "borda", rotulo: "Borda de dezembro", nota: "SS aberta nos primeiros dias de janeiro: a ocorrência pode estar em dezembro de 2025.", teste: (r) => r.fato === "F3" && texto(r.abertura) <= "2026-01-03" },
    ],
    expurgos: [
      { id: "todos", rotulo: "Excluídos na leitura", nota: "Chegaram ao terceiro estágio e o texto mostrou outra causa.", teste: (r) => r.cascata === "EXCLUÍDO NA LEITURA" },
      { id: "antes", rotulo: "Outra causa, retidos antes", nota: "O texto também diz outra causa, mas o caso parou numa peneira anterior.", teste: (r) => r.leitura === "L2" && r.cascata !== "EXCLUÍDO NA LEITURA" },
      { id: "furto", rotulo: "Furto e vandalismo", nota: "Vai para o projeto de reposição de ativos furtados.", teste: (r) => r.decisao === "EXCLUIR" && r.categoria_texto === "FURTADO" },
      { id: "abalroamento", rotulo: "Abalroamento", nota: "Dano de terceiro ou poste.", teste: (r) => r.decisao === "EXCLUIR" && r.categoria_texto === "ABALROAMENTO" },
      { id: "preventivo", rotulo: "Preventivo e programado", nota: "Não houve defeito.", teste: (r) => r.decisao === "EXCLUIR" && (r.categoria_texto === "PREVENTIVO" || r.categoria_texto === "SOBRECARGA") },
      { id: "auxiliar", rotulo: "Auxiliar e particular", nota: "Não é unidade de distribuição da concessionária.", teste: (r) => r.decisao === "EXCLUIR" && (r.categoria_texto === "TRAFO AUXILIAR" || r.categoria_texto === "PARTICULAR") },
    ],
    ativos: [],
    regras: [],
    bases: [], regras: [], bases: [],
  };

  const recortesDoModulo = RECORTES[modulo] || [];
  const recorteAtivo = recorte && recortesDoModulo.find((x) => x.id === recorte.id);
  const agulha = normalize(busca).trim();

  const filtraProfunda = (linha: Registro, recorte: string) => {
    const marca = classificacao[texto(linha.ss)];
    if (!marca) return false;
    if (recorte === "q") return marca.classe === "QUEIMADO";
    if (recorte === "a") return marca.classe === "AVARIADO";
    if (recorte === "r") return marca.classe === "REGRA";
    if (recorte === "p") return marca.classe === "PROFUNDA";
    return true;
  };
  const listadas = useMemo(() => {
    let base = comJanela;
    // a matriz de decisão cria um recorte próprio (fato × leitura) que não está em RECORTES
    if (recorte?.id.startsWith("matriz-")) {
      const [, f, l] = recorte.id.split("-");
      base = base.filter((r) => r.fato === f && r.leitura === l);
    } else if (modulo === "profunda") {
      base = base.filter((r) => filtraProfunda(r, recorte?.id || "todos"));
    } else if (recorteAtivo) {
      base = base.filter(recorteAtivo.teste);
    }
    if (!agulha) return base;
    return base.filter((r) => normalize([
      r.ss, r.os, r.obra, r.trafo, r.localidade, r.alimentador, r.solicitante, r.origem,
      r.equipe_ss, r.at_equipe, r.categoria_texto, r.oc_causa, r.oc_sub, r.decisao, r.motivo_decisao,
    ].join(" ")).includes(agulha));
  }, [comJanela, recorte, recorteAtivo, agulha, modulo, classificacao]);

  if (!fluxo) return <main className="loading"><i /><span>Carregando as 1.510 solicitações…</span></main>;

  const total = registros.length;
  const conta = (teste: (r: Registro) => boolean) => registros.filter(teste).length;
  const CAP = 300;
  const historicoDoAtivo = ativo ? fluxo.historico.filter((l) => texto(l[0]) === ativo) : [];
  const ssDoAtivo = ativo ? registros.filter((r) => texto(r.trafo) === ativo) : [];

  const classificar = (ss: string, classe: string) => {
    const atual = { ...classificacao };
    if (classe === "LIMPAR") delete atual[ss];
    else atual[ss] = { classe, quem: "análise local", quando: new Date().toISOString().slice(0, 16).replace("T", " ") };
    setClassificacao(atual);
    localStorage.setItem("fluxo-1510-classificacao", JSON.stringify(atual));
  };
  const CLASSES: Array<[string, string, string]> = [
    ["QUEIMADO", "Queimado", "good"],
    ["AVARIADO", "Avariado", "pend"],
    ["REGRA", "Vale a regra do fluxo", "warn"],
    ["PROFUNDA", "Análise profunda", "bad"],
  ];

  const NAV: Array<{ grupo: string; itens: Array<{ id: Modulo; rotulo: string; codigo: string; marca?: number }> }> = [
    { grupo: "Fluxo", itens: [
      { id: "visao", rotulo: "Visão geral", codigo: "01" },
      { id: "interrupcao", rotulo: "Interrupção", codigo: "02", marca: conta((r) => r.chega_e1 === "SIM") },
      { id: "deslocamento", rotulo: "Deslocamento", codigo: "03", marca: conta((r) => r.chega_e2 === "SIM") },
      { id: "ssos", rotulo: "Análise de SS e OS", codigo: "04", marca: conta((r) => r.chega_e3 === "SIM") },
      { id: "obra", rotulo: "Obra e SIGCO", codigo: "05", marca: conta((r) => !texto(r.obra)) },
      { id: "decisao", rotulo: "Decisão final", codigo: "06", marca: conta((r) => r.cascata === "SAÍDA") },
    ]},
    { grupo: "Filas", itens: [
      { id: "semfato", rotulo: "Sem interrupção", codigo: "07", marca: conta((r) => r.cascata === "RETIDO — SEM INTERRUPÇÃO NA JANELA") },
      { id: "semdesloc", rotulo: "Sem deslocamento", codigo: "08", marca: conta((r) => r.cascata === "RETIDO — SEM DESLOCAMENTO") },
      { id: "expurgos", rotulo: "Excluídos", codigo: "09", marca: conta((r) => r.cascata === "EXCLUÍDO NA LEITURA") },
      { id: "ativos", rotulo: "Por transformador", codigo: "10" },
    ]},
    { grupo: "Minha análise", itens: [
      { id: "profunda", rotulo: "Análise profunda", codigo: "11", marca: Object.values(classificacao).filter((c) => c.classe === "PROFUNDA").length },
    ]},
    { grupo: "Controle", itens: [
      { id: "regras", rotulo: "Regras e método", codigo: "12" },
      { id: "bases", rotulo: "Bases usadas", codigo: "13" },
    ]},
  ];

  const TITULOS: Record<Modulo, { olho: string; titulo: string; texto: string }> = {
    visao: { olho: "1.510 SS · jan a jun/2026", titulo: "Visão geral", texto: "O caminho das solicitações pelas quatro peneiras, do fato de campo até a decisão." },
    interrupcao: { olho: "Estágio 1 · o fato", titulo: "Interrupção", texto: "O cliente ficou sem energia? Quando, quantos e por qual causa. É a prova primária." },
    deslocamento: { olho: "Estágio 2 · corroboração", titulo: "Deslocamento", texto: "Alguém foi lá? Qual equipe, quanto tempo levou e o que registrou em campo." },
    ssos: { olho: "Estágio 3 · a leitura", titulo: "Análise de SS e OS", texto: "O que foi pedido, o que foi executado e o que o material comprova." },
    obra: { olho: "Fora da cascata", titulo: "Obra e SIGCO", texto: "Não decide causa: lê o enquadramento de custo. A única situação que interrompe o fluxo é a obra não existir." },
    decisao: { olho: "Saída do funil", titulo: "Decisão final", texto: "O cruzamento do fato com a leitura, caso a caso, com o motivo escrito." },
    semdesloc: { olho: "Fila de revisão", titulo: "Sem deslocamento", texto: "Houve interrupção no transformador e não há atendimento registrado no código dele. Raro, e por isso mesmo suspeito dos dois lados." },
    profunda: { olho: "Minha análise", titulo: "Análise profunda", texto: "O que você classificou à mão, com o seu nome e a hora. Fica ao lado da decisão do fluxo, nunca por cima." },
    semfato: { olho: "Investigação", titulo: "Sem interrupção na janela", texto: "Nem interrupção nem atendimento na janela de 24 horas. Antes de cobrar, o teste do vizinho." },
    expurgos: { olho: "Fora do indicador", titulo: "Excluídos", texto: "Saíram porque a leitura mostrou outra causa. Continuam na base, marcados." },
    ativos: { olho: "Histórico", titulo: "Por transformador", texto: "Tudo o que aconteceu com um código de ativo no semestre, em ordem." },
    regras: { olho: "Método", titulo: "Regras e método", texto: "Como a decisão é tomada, o que foi corrigido no caminho e o que ficou em aberto." },
    bases: { olho: "Procedência", titulo: "Bases usadas", texto: "De onde vem cada número e o que cada base não consegue responder." },
  };

  const titulo = TITULOS[modulo];
  const abrirRecorte = (id: string) => {
    const alvo = recortesDoModulo.find((x) => x.id === id);
    setRecorte(alvo ? { id, rotulo: alvo.rotulo } : null);
  };

  /* ---------------------------------------------------------------- cabeçalhos por módulo */

  const painel = () => {
    if (modulo === "visao") {
      const decisoes = ["INCLUIR", "REVISÃO", "EXCLUIR"].map((d) => ({ label: d, value: conta((r) => r.decisao === d) }));
      const fatos = ["F1", "F0", "F2", "F3"].map((f) => ({ label: FATO_ROTULO[f], value: conta((r) => r.fato === f) }));
      // A cascata é literal: cada peneira só recebe o que a anterior deixou passar.
      const chegaE1 = conta((r) => r.chega_e1 === "SIM");
      const chegaE2 = conta((r) => r.chega_e2 === "SIM");
      const chegaE3 = conta((r) => r.chega_e3 === "SIM");
      const saida = conta((r) => r.cascata === "SAÍDA");
      const excluidos = conta((r) => r.cascata === "EXCLUÍDO NA LEITURA");
      const caixas: Array<[string, string, number, number, Modulo]> = [
        ["Entram", "solicitações de troca de transformador", total, 0, "visao"],
        ["1 · Interrupção", "o campo registrou o evento na janela de 24 horas", chegaE2, total - chegaE2, "interrupcao"],
        ["2 · Deslocamento", "houve equipe no código do transformador", chegaE3, chegaE2 - chegaE3, "deslocamento"],
        ["3 · SS e OS com material", "o texto diz falha e o material comprova a troca", saida, chegaE3 - saida, "ssos"],
      ];
      return <>
        <section className="scope-strip">
          <div><span>Recorte</span><strong>{br(total)} SS · jan a jun/2026</strong></div>
          <div><span>Janela do fato</span><strong>{fluxo.meta.janelaHoras}h antes ou depois</strong></div>
          <div><span>Saída</span><strong>{br(conta((r) => r.decisao === "INCLUIR"))} incluir</strong></div>
          <p>{fluxo.meta.regra}</p>
        </section>
        <section className="kpi-grid">
          <Kpi rotulo="Solicitações" valor={br(total)} nota="transformador, jan a jun" tom="ink" />
          <Kpi rotulo="Incluir" valor={br(conta((r) => r.decisao === "INCLUIR"))} nota="passaram no fato e na leitura" tom="green" aoClicar={() => { setModulo("decisao"); setRecorte({ id: "incluir", rotulo: "INCLUIR" }); }} />
          <Kpi rotulo="Revisão" valor={br(conta((r) => r.decisao === "REVISÃO"))} nota="esperam leitura humana" tom="amber" aoClicar={() => { setModulo("decisao"); setRecorte({ id: "revisao", rotulo: "REVISÃO" }); }} />
          <Kpi rotulo="Excluir" valor={br(conta((r) => r.decisao === "EXCLUIR"))} nota="outra causa comprovada" tom="red" aoClicar={() => { setModulo("expurgos"); setRecorte({ id: "todos", rotulo: "Todos os excluídos" }); }} />
          <Kpi rotulo="Sem interrupção na janela" valor={br(conta((r) => r.fato === "F3"))} nota="nada nas duas bases" tom="red" aoClicar={() => { setModulo("semfato"); setRecorte({ id: "todos", rotulo: "Todos sem fato" }); }} />
          <Kpi rotulo="Categoria corrigida" valor={br(conta((r) => Boolean(texto(r.categoria_texto)) && r.categoria_texto !== r.categoria_gravada))} nota="o texto contradiz o rótulo" tom="blue" aoClicar={() => { setModulo("ssos"); setRecorte({ id: "corrigida", rotulo: "Categoria corrigida" }); }} />
        </section>
        <section className="panel caixa-dagua">
          <div className="panel-title"><div><span>Caixa d'água</span><h2>Onde cada solicitação para</h2></div><small>clique para abrir o estágio</small></div>
          {caixas.map(([nome, nota, valor, retido, destino]) => <button key={nome} type="button" className="caixa-linha" onClick={() => { setModulo(destino); setRecorte(null); }}>
            <b>{br(valor)}</b>
            <span><strong>{nome}</strong><small>{nota}{retido ? ` · ${br(retido)} ficam retidos aqui` : ""}</small></span>
            <i><em style={{ width: `${pct(valor, total)}%` }} /></i>
            <u>{pct(valor, total)}%</u>
          </button>)}
          <p className="fluxo-nota">Furto, abalroamento, preventivo e auxiliar são separados no terceiro estágio, na leitura do texto — {br(excluidos)} casos. Antes disso ninguém é descartado por categoria: o campo fala primeiro. Obra e SIGCO não entram na cascata: são leitura de enquadramento de custo, não de causa. A única situação que interrompe o fluxo é a obra não existir, e aí o caso vai para análise à parte.</p>
        </section>
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Saída</span><h2>Decisão</h2></div></div><Barras dados={decisoes} total={total} /></article>
          <article className="panel"><div className="panel-title"><div><span>Estágio 1</span><h2>O que o campo provou</h2></div></div><Barras dados={fatos} total={total} /></article>
        </section>
        {metodo ? <section className="panel editorial-note wide">
          <span>{metodo.resumo.titulo.toUpperCase()}</span>
          {metodo.resumo.paragrafos.map((p, i) => <p key={i}>{p}</p>)}
        </section> : null}
      </>;
    }

    if (modulo === "regras") {
      if (!metodo) return <section className="panel editorial-note"><span>MÉTODO</span><p>O arquivo metodo.json não carregou.</p></section>;
      return <>{metodo.blocos.map((b) => <section key={b.id} className="panel editorial-note wide">
        <span>{b.titulo.toUpperCase()}</span>
        {(b.paragrafos || []).map((p, i) => <p key={i}>{p}</p>)}
        {b.itens ? <div className="check-list">{b.itens.map((it) => <div key={it.rotulo}>
          <b>·</b><strong>{it.rotulo}</strong><span>{it.texto}</span>
        </div>)}</div> : null}
        {b.quadrinhos ? <div className="quadrinhos">
          {b.quadrinhos.map((q) => <article key={q.n} className="quadrinho">
            <b>{q.n}</b>
            <h4>{q.titulo}</h4>
            <p>{q.texto}</p>
            <footer><span>{q.base}</span><em>{q.pergunta}</em></footer>
          </article>)}
        </div> : null}
        {b.tabela ? <div className="table-scroll"><table className="records-table">
          <thead><tr>{b.tabela.cabecalho.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{b.tabela.linhas.map((linha, i) => <tr key={i}>{linha.map((celula, j) => <td key={j}>{j === 0 ? <strong>{celula}</strong> : <span>{celula}</span>}</td>)}</tr>)}</tbody>
        </table></div> : null}
      </section>)}</>;
    }

    if (modulo === "bases") {
      return <>
        <section className="panel editorial-note wide"><span>DE ONDE VEM CADA NÚMERO</span>
          {fluxo.meta.fontes.map((f) => <p key={f}>· {f}</p>)}
        </section>
        <section className="panel warning-note wide"><strong>O que estas bases não respondem</strong>
          {fluxo.meta.lacunas.map((l) => <p key={l}>· {l}</p>)}
        </section>
        <section className="panel editorial-note wide"><span>PEDIDOS EM ABERTO</span>
          <p>· Reextração do TMAE de 26 a 31 de janeiro de 2026 — o arquivo termina no dia 25.</p>
          <p>· Crítica de dezembro de 2025, para fechar as solicitações abertas nos primeiros dias de janeiro.</p>
          <p>· Export de material das obras que ficaram de fora, hoje {br(conta((r) => r.material_conferido !== "SIM"))} solicitações.</p>
        </section>
      </>;
    }

    if (modulo === "ativos") {
      return <>
        <section className="panel busca-ativo">
          <div className="panel-title"><div><span>Histórico</span><h2>Um transformador de cada vez</h2></div><small>{br(new Set(registros.map((r) => texto(r.trafo))).size)} ativos no recorte</small></div>
          <label className="search"><span>⌕</span><input value={ativo} onChange={(e) => setAtivo(e.target.value.trim())} placeholder="Código do transformador, ex.: 5700268028" /></label>
        </section>
        {ativo && historicoDoAtivo.length ? <>
          <section className="kpi-grid ativo-kpis">
            <Kpi rotulo="Solicitações" valor={ssDoAtivo.length} nota={ssDoAtivo.map((r) => texto(r.ss)).join(" · ")} tom="ink" />
            <Kpi rotulo="Interrupções" valor={historicoDoAtivo.filter((l) => texto(l[4]).startsWith("Interrupção")).length} nota="registros na base de interrupção" tom="red" />
            <Kpi rotulo="Atendimentos" valor={historicoDoAtivo.filter((l) => texto(l[4]).startsWith("Atendimento")).length} nota="equipes deslocadas" tom="blue" />
            <Kpi rotulo="Eventos no semestre" valor={historicoDoAtivo.length} nota="tudo somado, em ordem" tom="amber" />
          </section>
          <section className="panel list-panel">
            <div className="list-head"><div><span>{historicoDoAtivo.length} eventos</span><strong>Ativo {ativo}</strong></div></div>
            <div className="table-scroll"><table className="records-table">
              <thead><tr><th>Evento</th><th>Quando</th><th>Número</th><th>Papel</th><th>Clientes</th><th>Causa</th><th>Observação</th></tr></thead>
              <tbody>{historicoDoAtivo.map((l, i) => <tr key={i}>
                <td><strong>{texto(l[4])}</strong><span>{texto(l[1])}</span></td>
                <td><strong>{texto(l[5]).slice(0, 16) || "—"}</strong><span>{texto(l[6]).slice(0, 16)}</span></td>
                <td><code>{texto(l[7])}</code></td>
                <td><span>{texto(l[8])}</span></td>
                <td><strong>{l[9] === null ? "—" : texto(l[9])}</strong></td>
                <td><span>{texto(l[10])}</span></td>
                <td><small>{texto(l[11])}</small>{texto(l[12]) ? <code>{texto(l[12])}</code> : null}</td>
              </tr>)}</tbody>
            </table></div>
          </section>
        </> : ativo ? <section className="panel empty"><strong>Nenhum evento para {ativo}</strong><span>O código não aparece na base de interrupção nem na de atendimento no semestre.</span></section> : null}
      </>;
    }

    /* módulos de estágio: indicadores, quebras e a lista */
    const cabecalho = () => {
      if (modulo === "interrupcao") {
        const chegam = registros.filter((r) => r.chega_e1 === "SIM");
        const casados = chegam.filter((r) => r.fato === "F1" || r.fato === "F0");
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Chegam neste estágio" valor={br(chegam.length)} nota="todas as solicitações do recorte" tom="ink" />
            <Kpi rotulo="Casaram em 24h" valor={br(casados.length)} nota={`${pct(casados.length, chegam.length)}% dos que chegam`} tom="green" aoClicar={() => abrirRecorte("casou")} />
            <Kpi rotulo="Com ressalva" valor={br(conta((r) => Boolean(texto(r.ressalvas))))} nota="programada, sem cliente, outro elemento" tom="amber" aoClicar={() => abrirRecorte("ressalva")} />
            <Kpi rotulo="Em outra data" valor={br(conta((r) => r.e1_nivel === "FORA"))} nota="o ativo aparece, mas longe da SS" tom="blue" aoClicar={() => abrirRecorte("fora")} />
            <Kpi rotulo="Sem ocorrência" valor={br(conta((r) => r.e1_nivel === "SEM"))} nota="o código não aparece em seis meses" tom="red" aoClicar={() => abrirRecorte("sem")} />
            <Kpi rotulo="Distância mediana" valor={`${mediana(casados.map((r) => Math.abs(Number(r.oc_dist_h) || 0)))} h`} nota={`da SS até a ocorrência — ${br(conta((r) => Number(r.oc_dist_h) === 0))} abrem dentro dela`} tom="ink" />
            <Kpi rotulo="Clientes interrompidos" valor={br(registros.reduce((s, r) => s + (Number(r.oc_cons) || 0), 0))} nota="somados nas ocorrências casadas" tom="ink" />
          </section>
          <section className="janela-controle">
            <span>Janela do fato</span>
            <div className="janela-botoes">{[12, 24, 48].map((h) => <button key={h} type="button" className={janela === h ? "ativo" : ""} onClick={() => setJanela(h)}>{h}h</button>)}</div>
            <small>{janela === fluxo.meta.janelaHoras ? "Janela padrão, a mesma da decisão gravada." : `${br(mudamComJanela)} solicitações mudariam de lado com ${janela}h. A decisão gravada continua a de ${fluxo.meta.janelaHoras}h.`}</small>
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Causa registrada</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(registros.filter((r) => r.oc_num), "oc_causa", 8)} total={total} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Elemento do defeito</h2></div></div>
              <Barras dados={contar(registros.filter((r) => r.oc_num), "oc_prob_ele", 6)} total={total} /></article>
          </section>
        </>;
      }
      if (modulo === "deslocamento") {
        const chegam = registros.filter((r) => r.chega_e2 === "SIM");
        const comAt = chegam.filter((r) => texto(r.at_num));
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Chegam neste estágio" valor={br(chegam.length)} nota="passaram pela interrupção" tom="ink" />
            <Kpi rotulo="Com atendimento" valor={br(comAt.length)} nota={`${pct(comAt.length, chegam.length)}% dos que chegam`} tom="green" aoClicar={() => abrirRecorte("corrobora")} />
            <Kpi rotulo="Sem atendimento" valor={br(conta((r) => r.e2_status === "SEM ATENDIMENTO"))} nota="não é contraprova: a base tem lacuna" tom="amber" aoClicar={() => abrirRecorte("semat")} />
            <Kpi rotulo="Na lacuna de janeiro" valor={br(conta((r) => r.tmae_gap_jan === "SIM"))} nota="26 a 31/01 sem nenhum registro" tom="red" aoClicar={() => abrirRecorte("lacuna")} />
            <Kpi rotulo="TMA mediano" valor={`${mediana(comAt.map((r) => Number(r.at_tma) || 0))} min`} nota="atendimento de ponta a ponta" tom="ink" />
            <Kpi rotulo="Deslocamento mediano" valor={`${mediana(comAt.map((r) => Number(r.at_tmd) || 0))} min`} nota="da comunicação até chegar" tom="blue" />
            <Kpi rotulo="Equipes distintas" valor={br(new Set(comAt.map((r) => texto(r.at_equipe))).size)} nota="atenderam as solicitações" tom="ink" />
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Quem atendeu</span><h2>Equipes</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(comAt, "at_equipe", 10)} total={comAt.length} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Subcausa registrada</h2></div></div>
              <Barras dados={contar(comAt, "at_sub", 8)} total={comAt.length} /></article>
          </section>
        </>;
      }
      if (modulo === "ssos") {
        const chegam = registros.filter((r) => r.chega_e3 === "SIM");
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Chegam neste estágio" valor={br(chegam.length)} nota="passaram pela interrupção e pelo deslocamento" tom="ink" />
            <Kpi rotulo="Texto diz falha" valor={br(chegam.filter((r) => r.leitura === "L1").length)} nota={`${pct(chegam.filter((r) => r.leitura === "L1").length, chegam.length)}% dos que chegam`} tom="green" aoClicar={() => abrirRecorte("falha")} />
            <Kpi rotulo="Outra causa" valor={br(chegam.filter((r) => r.leitura === "L2").length)} nota="furto, abalroamento, preventivo, auxiliar — separados aqui" tom="red" aoClicar={() => abrirRecorte("outra")} />
            <Kpi rotulo="Não decide" valor={br(conta((r) => r.leitura === "L3"))} nota="vai para leitura humana" tom="amber" aoClicar={() => abrirRecorte("indef")} />
            <Kpi rotulo="Categoria corrigida" valor={br(conta((r) => Boolean(texto(r.categoria_texto)) && r.categoria_texto !== r.categoria_gravada))} nota="o rótulo gravado não bate com o texto" tom="blue" aoClicar={() => abrirRecorte("corrigida")} />
            <Kpi rotulo="Material comprova" valor={br(conta((r) => (Number(r.trafos_material) || 0) > 0))} nota="transformador movimentado na obra" tom="green" />
            <Kpi rotulo="Sem conferência" valor={br(conta((r) => r.material_conferido !== "SIM"))} nota="obra fora do export ou não gerada" tom="amber" aoClicar={() => abrirRecorte("semmat")} />
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Leitura</span><h2>Categoria pelo texto</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(registros, "categoria_texto", 10)} total={total} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Origem</span><h2>Quem abriu a solicitação</h2></div></div>
              <Barras dados={contar(registros, "origem", 6)} total={total} /></article>
          </section>
        </>;
      }
      if (modulo === "obra") {
        return <>
          <section className="panel warning-note wide"><strong>Esta tela não decide</strong>
            <p>Obra e SIGCO dizem se o custo foi enquadrado certo, não se o transformador queimou. Por isso ficam fora da cascata: um alerta aqui não retém o caso no fluxo, ele acompanha o registro como observação. A única exceção é a obra não existir — sem obra não há consulta de material nem encerramento, e aí o caso vai para análise à parte.</p>
          </section>
          <section className="kpi-grid">
            <Kpi rotulo="Sem obra gerada" valor={br(conta((r) => !texto(r.obra)))} nota="vão para análise à parte" tom="red" aoClicar={() => abrirRecorte("semobra")} />
            <Kpi rotulo="Com alerta" valor={br(conta((r) => r.e4_status === "ALERTA"))} nota="observação, não retenção" tom="amber" aoClicar={() => abrirRecorte("alerta")} />
            <Kpi rotulo="Obra em despesa" valor={br(conta((r) => normalize(texto(r.obra_classe)).includes("DESPESA")))} nota="não imobiliza o ativo" tom="red" aoClicar={() => abrirRecorte("despesa")} />
            <Kpi rotulo="SIGCO divergente" valor={br(conta((r) => texto(r.e4_alertas).includes("SIGCO")))} nota="código da SS diferente do projeto" tom="blue" aoClicar={() => abrirRecorte("sigco")} />
            <Kpi rotulo="Empreiteiras" valor={br(new Set(registros.map((r) => texto(r.obra_empreiteira)).filter(Boolean)).size)} nota="executaram as obras" tom="ink" />
            <Kpi rotulo="Realizado" valor={`R$ ${br(Math.round(registros.reduce((s, r) => s + (Number(r.obra_realizado) || 0), 0)))}`} nota="soma do custo das obras" tom="ink" />
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Enquadramento</span><h2>Tipo da obra</h2></div></div>
              <Barras dados={contar(registros.filter((r) => texto(r.obra)), "obra_tipo", 8)} total={total} /></article>
            <article className="panel"><div className="panel-title"><div><span>Responsáveis</span><h2>Setor da última movimentação</h2></div></div>
              <Barras dados={contar(registros.filter((r) => texto(r.obra_setor)), "obra_setor", 8)} /></article>
          </section>
        </>;
      }
      if (modulo === "decisao") {
        const celula = (f: string, l: string) => conta((r) => r.fato === f && r.leitura === l);
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Incluir" valor={br(conta((r) => r.decisao === "INCLUIR"))} nota="contam no indicador" tom="green" aoClicar={() => abrirRecorte("incluir")} />
            <Kpi rotulo="Revisão" valor={br(conta((r) => r.decisao === "REVISÃO"))} nota="esperam leitura humana" tom="amber" aoClicar={() => abrirRecorte("revisao")} />
            <Kpi rotulo="Excluir" valor={br(conta((r) => r.decisao === "EXCLUIR"))} nota="outra causa comprovada" tom="red" aoClicar={() => abrirRecorte("excluir")} />
            <Kpi rotulo="Mudaram na revisão" valor={br(conta((r) => r.mudou_na_revisao === "SIM"))} nota="decisão diferente do funil anterior" tom="blue" aoClicar={() => abrirRecorte("mudou")} />
            <Kpi rotulo="Queimados" valor={br(conta((r) => r.decisao === "INCLUIR" && r.categoria_texto === "QUEIMADO"))} nota="pelo texto, não pelo rótulo" tom="red" aoClicar={() => abrirRecorte("queimados")} />
            <Kpi rotulo="Avariados" valor={br(conta((r) => r.decisao === "INCLUIR" && r.categoria_texto === "AVARIADO"))} nota="vazamento, bucha, tensão, fase" tom="blue" aoClicar={() => abrirRecorte("avariados")} />
          </section>
          <section className="panel"><div className="panel-title"><div><span>A matriz</span><h2>Fato contra leitura</h2></div><small>clique numa célula para abrir os casos</small></div>
            <div className="table-scroll"><table className="records-table matriz">
              <thead><tr><th>Fato ↓ / Leitura →</th><th>Texto diz falha</th><th>Texto diz outra causa</th><th>Texto não decide</th></tr></thead>
              <tbody>{["F1", "F0", "F2", "F3"].map((f) => <tr key={f}>
                <td><strong>{FATO_ROTULO[f]}</strong></td>
                {["L1", "L2", "L3"].map((l) => {
                  const dentro = registros.filter((r) => r.fato === f && r.leitura === l);
                  const composicao = contar(dentro, "decisao", 3);
                  const dominante = composicao[0]?.label || "";
                  return <td key={l} className={dentro.length ? `cell-${decisaoClasse(dominante)}` : ""}
                    onClick={() => { if (dentro.length) { setBusca(""); setRecorte({ id: `matriz-${f}-${l}`, rotulo: `${FATO_ROTULO[f]} × ${LEITURA_ROTULO[l]}` }); } }}>
                    <strong>{dentro.length ? br(dentro.length) : "—"}</strong>
                    {dentro.length ? <span>{composicao.map((c) => `${br(c.value)} ${c.label.toLowerCase()}`).join(" · ")}</span> : null}</td>;
                })}
              </tr>)}</tbody>
            </table></div>
          </section>
        </>;
      }
      if (modulo === "semdesloc") {
        const fila = registros.filter((r) => r.cascata === "RETIDO — SEM DESLOCAMENTO");
        const naLacuna = fila.filter((r) => r.tmae_gap_jan === "SIM").length;
        const comCliente = fila.filter((r) => (Number(r.oc_cons) || 0) > 0).length;
        const proprioTrafo = fila.filter((r) => texto(r.oc_papel).includes("próprio")).length;
        const outroAtendimento = fila.filter((r) => (Number(r.atendimentos_ativo) || 0) > 0).length;
        return <>
          <section className="panel editorial-note wide"><span>O QUE ESTA FILA É</span>
            <p>Houve interrupção no transformador dentro da janela, mas não há atendimento registrado no código dele. É raro e merece desconfiança dos dois lados: pode ser nota não lançada, pode ser atendimento gravado sob outro equipamento — a chave do TMAE é o elemento onde o defeito foi aberto —, e pode ser lacuna de arquivo.</p>
            <p>Antes de cobrar qualquer coisa: <strong>{br(naLacuna)}</strong> destas SS foram abertas entre 26 e 31 de janeiro, período em que o arquivo do TMAE não tem um único registro. Essas não provam nada até a reextração chegar.</p>
          </section>
          <section className="kpi-grid">
            <Kpi rotulo="Nesta fila" valor={br(fila.length)} nota="interrupção sim, atendimento não" tom="amber" aoClicar={() => abrirRecorte("todos")} />
            <Kpi rotulo="Na lacuna de janeiro" valor={br(naLacuna)} nota="26 a 31/01, sem arquivo" tom="blue" aoClicar={() => abrirRecorte("lacuna")} />
            <Kpi rotulo="Com cliente interrompido" valor={br(comCliente)} nota="a interrupção atingiu gente" tom="ink" />
            <Kpi rotulo="Defeito no próprio trafo" valor={br(proprioTrafo)} nota="o campo apontou o transformador" tom="red" />
            <Kpi rotulo="O ativo tem atendimento em outra data" valor={br(outroAtendimento)} nota="a equipe já esteve nesse trafo no semestre" tom="amber" />
            <Kpi rotulo="Com material" valor={br(fila.filter((r) => (Number(r.trafos_material) || 0) > 0).length)} nota="a obra movimentou transformador" tom="green" />
          </section>
        </>;
      }

      if (modulo === "profunda") {
        const marcadas = registros.filter((r) => classificacao[texto(r.ss)]);
        const porClasse = (c: string) => marcadas.filter((r) => classificacao[texto(r.ss)].classe === c).length;
        return <>
          <section className="panel editorial-note wide"><span>SUA ANÁLISE</span>
            <p>O que você classificou fica aqui, ao lado da decisão do fluxo — nunca por cima dela. A marcação é gravada neste navegador, com o seu nome e a hora, e aparece em todas as listas.</p>
            <p>Marque <strong>Queimado</strong> ou <strong>Avariado</strong> quando bater o martelo, <strong>Vale a regra do fluxo</strong> quando concordar com o que o sistema decidiu, e <strong>Análise profunda</strong> quando o caso precisar de campo ou de documento que não temos.</p>
          </section>
          <section className="kpi-grid">
            <Kpi rotulo="Classificadas por você" valor={br(marcadas.length)} nota={`de ${br(total)} no recorte`} tom="ink" aoClicar={() => abrirRecorte("todos")} />
            <Kpi rotulo="Queimado" valor={br(porClasse("QUEIMADO"))} nota="martelo batido" tom="green" aoClicar={() => abrirRecorte("q")} />
            <Kpi rotulo="Avariado" valor={br(porClasse("AVARIADO"))} nota="martelo batido" tom="blue" aoClicar={() => abrirRecorte("a")} />
            <Kpi rotulo="Vale a regra" valor={br(porClasse("REGRA"))} nota="concorda com o fluxo" tom="amber" aoClicar={() => abrirRecorte("r")} />
            <Kpi rotulo="Análise profunda" valor={br(porClasse("PROFUNDA"))} nota="precisa de campo ou documento" tom="red" aoClicar={() => abrirRecorte("p")} />
            <Kpi rotulo="Ainda sem sua leitura" valor={br(total - marcadas.length)} nota="seguem só com a decisão do fluxo" tom="ink" />
          </section>
        </>;
      }

      if (modulo === "semfato") {
        const semFato = registros.filter((r) => r.cascata === "RETIDO — SEM INTERRUPÇÃO NA JANELA");
        return <>
        <section className="panel editorial-note wide"><span>O QUE O TEXTO DESSES CASOS DIZ</span>
          <p>A ausência de interrupção não significa a mesma coisa em todos eles. {br(semFato.filter((r) => r.leitura === "L2").length)} têm texto de furto, abalroamento, preventivo ou auxiliar — e nesses a ausência é esperada, porque não são falha de equipamento. Os outros {br(semFato.filter((r) => r.leitura !== "L2").length)} descrevem queima ou avaria e não deixaram rastro em nenhuma das duas bases: são esses que sobem para investigação.</p>
        </section>
        <section className="kpi-grid">
          <Kpi rotulo="Sem interrupção na janela" valor={br(conta((r) => r.fato === "F3"))} nota="nada nas duas bases na janela" tom="red" aoClicar={() => abrirRecorte("todos")} />
          <Kpi rotulo="Vizinho encontrado" valor={br(conta((r) => r.fato === "F3" && Boolean(texto(r.vizinho)) && !texto(r.vizinho).startsWith("Nada")))} nota="número operativo provavelmente trocado" tom="amber" aoClicar={() => abrirRecorte("vizinho")} />
          <Kpi rotulo="Nada encontrado" valor={br(conta((r) => r.fato === "F3" && texto(r.vizinho).startsWith("Nada")))} nota="sobe para investigação de campo" tom="red" aoClicar={() => abrirRecorte("nada")} />
          <Kpi rotulo="Borda de dezembro" valor={br(conta((r) => r.fato === "F3" && texto(r.abertura) <= "2026-01-03"))} nota="a ocorrência pode estar em dez/2025" tom="blue" aoClicar={() => abrirRecorte("borda")} />
          <Kpi rotulo="Com texto de falha" valor={br(conta((r) => r.fato === "F3" && r.leitura === "L1"))} nota="texto diz queima, campo não registra" tom="amber" />
          <Kpi rotulo="Com material" valor={br(conta((r) => r.fato === "F3" && (Number(r.trafos_material) || 0) > 0))} nota="a obra movimentou transformador" tom="ink" />
        </section></>;
      }
      if (modulo === "expurgos") {
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Excluídos na leitura" valor={br(conta((r) => r.cascata === "EXCLUÍDO NA LEITURA"))} nota="passaram pelo campo e o texto mostrou outra causa" tom="red" aoClicar={() => abrirRecorte("todos")} />
            <Kpi rotulo="Outra causa, retidos antes" valor={br(conta((r) => r.leitura === "L2" && r.cascata !== "EXCLUÍDO NA LEITURA"))} nota="pararam numa peneira anterior" tom="amber" aoClicar={() => abrirRecorte("antes")} />
            <Kpi rotulo="Furto" valor={br(conta((r) => r.decisao === "EXCLUIR" && r.categoria_texto === "FURTADO"))} nota="vai para o projeto 61993" tom="ink" aoClicar={() => abrirRecorte("furto")} />
            <Kpi rotulo="Abalroamento" valor={br(conta((r) => r.decisao === "EXCLUIR" && r.categoria_texto === "ABALROAMENTO"))} nota="dano de terceiro ou poste" tom="amber" aoClicar={() => abrirRecorte("abalroamento")} />
            <Kpi rotulo="Preventivo" valor={br(conta((r) => r.decisao === "EXCLUIR" && (r.categoria_texto === "PREVENTIVO" || r.categoria_texto === "SOBRECARGA")))} nota="não houve defeito" tom="blue" aoClicar={() => abrirRecorte("preventivo")} />
            <Kpi rotulo="Auxiliar e particular" valor={br(conta((r) => r.decisao === "EXCLUIR" && (r.categoria_texto === "TRAFO AUXILIAR" || r.categoria_texto === "PARTICULAR")))} nota="não é unidade de distribuição" tom="ink" aoClicar={() => abrirRecorte("auxiliar")} />
            <Kpi rotulo="Com fato de campo" valor={br(conta((r) => r.decisao === "EXCLUIR" && r.fato !== "F3"))} nota="houve interrupção, mas a causa é outra" tom="amber" />
          </section>
          <section className="panel editorial-note wide"><span>COMO LER ESTA FILA</span>
            <p>Exclusão aqui significa que o evento aconteceu, mas não é queima nem avaria de transformador: é furto, abalroamento, preventivo, auxiliar de equipamento especial, construção ou desativação. O registro continua na base, marcado, com o motivo escrito ao lado — nada é apagado.</p>
          </section>
        </>;
      }
      return null;
    };

    return <>
      {cabecalho()}
      <section className="panel list-panel">
        <div className="list-head">
          <div><span>{br(listadas.length)} solicitações{listadas.length > CAP ? ` · mostrando as ${CAP} primeiras` : ""}</span>
            <strong>{recorteAtivo ? recorteAtivo.rotulo : recorte ? recorte.rotulo : titulo.titulo}</strong></div>
          <label className="search"><span>⌕</span><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="SS, OS, obra, ativo, equipe, solicitante, causa…" /></label>
          <button type="button" className="sheet-download" onClick={() => baixarCSV(listadas, recorteAtivo ? recorteAtivo.rotulo : recorte ? recorte.rotulo : titulo.titulo, janela)}>Baixar planilha ({br(listadas.length)})</button>
        </div>
        {recortesDoModulo.length ? <div className="fluxo-abas">
          <button type="button" className={!recorte ? "ativo" : ""} onClick={() => setRecorte(null)}>Todas ({br(comJanela.length)})</button>
          {recortesDoModulo.map((x) => <button key={x.id} type="button" className={recorte?.id === x.id ? "ativo" : ""}
            onClick={() => abrirRecorte(x.id)} title={x.nota}>{x.rotulo} ({br(registros.filter(x.teste).length)})</button>)}
        </div> : null}
        {recorteAtivo ? <p className="fluxo-nota">{recorteAtivo.nota}</p>
          : recorte?.id.startsWith("matriz-") ? <p className="fluxo-nota">Célula da matriz: {recorte.rotulo}.</p> : null}
        {listadas.length
          ? <Tabela classificacoes={classificacao} aoClassificar={classificar} linhas={listadas.slice(0, CAP)} modo={modulo} aoAbrir={(r) => { setAberto(r); setAbaDossie("consolidado"); }} />
          : <div className="empty"><strong>Nenhuma solicitação neste recorte</strong><span>Ajuste a busca ou escolha outro filtro acima.</span></div>}
      </section>
    </>;
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><i>T</i><div><strong>Transforma</strong><span>Auditoria · 1.510 SS</span></div></div>
      <nav>{NAV.map((g) => <div className="nav-group" key={g.grupo}>
        <span>{g.grupo}</span>
        {g.itens.map((item) => <button key={item.id} className={modulo === item.id ? "active" : ""}
          onClick={() => { setModulo(item.id); setRecorte(null); setBusca(""); }}>
          <b>{item.codigo}</b><em>{item.rotulo}</em>{item.marca ? <small>{br(item.marca)}</small> : null}
        </button>)}
      </div>)}</nav>
      <div className="side-user"><b>1.5k</b><div><strong>Janeiro a junho</strong><span>de 2026</span></div></div>
    </aside>

    <main className="workspace">
      <header className="page-header">
        <div><span>{titulo.olho}</span><h1>{titulo.titulo}</h1><p>{titulo.texto}</p></div>
        <div className="header-meta"><span>Recorte</span><strong>{br(total)}</strong><small>solicitações</small></div>
      </header>
      {painel()}
    </main>

    {aberto ? <div className="drawer-layer">
      <button className="drawer-backdrop" aria-label="Fechar" onClick={() => setAberto(null)} />
      <aside className="drawer">
        <header>
          <div><span>{texto(aberto.trafo)} · {texto(aberto.localidade)}</span><h2>{texto(aberto.ss)}</h2><p>{texto(aberto.os) || "sem OS"} · obra {texto(aberto.obra) || "não gerada"}</p></div>
          <button onClick={() => setAberto(null)}>×</button>
        </header>
        <div className="drawer-status">
          <b className={`pill ${decisaoClasse(texto(aberto.decisao))}`}>{texto(aberto.decisao)}</b>
          <span>{FATO_ROTULO[texto(aberto.fato)]}</span>
          <span>{LEITURA_ROTULO[texto(aberto.leitura)]}</span>
          <em>{texto(aberto.categoria_texto)}</em>
        </div>
        <div className="classificar">
          <span>Sua classificação</span>
          <div>{CLASSES.map(([id, rotulo, tom]) => <button key={id}
            className={classificacao[texto(aberto.ss)]?.classe === id ? `marcado ${tom}` : tom}
            onClick={() => classificar(texto(aberto.ss), id)}>{rotulo}</button>)}
            {classificacao[texto(aberto.ss)] ? <button className="limpar" onClick={() => classificar(texto(aberto.ss), "LIMPAR")}>limpar</button> : null}
          </div>
          <em>{classificacao[texto(aberto.ss)]
            ? `${classificacao[texto(aberto.ss)].quem} · ${dataBR(classificacao[texto(aberto.ss)].quando)}`
            : "A decisão do fluxo continua registrada. Isto é a sua leitura ao lado dela."}</em>
        </div>
        <nav>{([["consolidado", "Consolidado"], ["interrupcao", "Interrupção"], ["deslocamento", "Deslocamento"],
                ["ssos", "SS e OS"], ["obra", "Obra e SIGCO"], ["historico", "Histórico do ativo"]] as const).map(([id, rotulo]) => <button key={id}
          className={`${abaDossie === id ? "active" : ""} no-caps`.trim()} onClick={() => setAbaDossie(id)}>{rotulo}</button>)}</nav>
        <div className="drawer-body">
          {abaDossie === "consolidado" && <>
            <h3>Como esta solicitação foi decidida</h3>
            <article className="rationale"><span>MOTIVO DA DECISÃO</span><p>{texto(aberto.motivo_decisao)}</p></article>
            <section className="detail-grid">
              <div><span>Decisão</span><strong>{texto(aberto.decisao)}</strong></div>
              <div><span>Decisão anterior</span><strong>{texto(aberto.decisao_anterior)}</strong></div>
              <div><span>Fato</span><strong>{texto(aberto.fato_texto)}</strong></div>
              <div><span>Leitura</span><strong>{LEITURA_ROTULO[texto(aberto.leitura)]}</strong></div>
              <div><span>Categoria pelo texto</span><strong>{texto(aberto.categoria_texto)}</strong></div>
              <div><span>Categoria gravada</span><strong>{texto(aberto.categoria_gravada)}</strong></div>
              <div><span>Regra da leitura</span><strong>{texto(aberto.regra_leitura)}</strong></div>
              <div><span>Confiança</span><strong>{texto(aberto.confianca_leitura)}</strong></div>
            </section>
            {texto(aberto.ressalvas) ? <article className="work-alerts"><span>RESSALVAS</span><ul>{texto(aberto.ressalvas).split(" · ").map((x) => <li key={x}>{x}</li>)}</ul></article> : null}
          </>}
          {abaDossie === "interrupcao" && <>
            <h3>O que a base de interrupção registra</h3>
            <section className="detail-grid">
              <div><span>Ocorrência</span><strong>{texto(aberto.oc_num) || "nenhuma"}</strong></div>
              <div><span>Distância da SS</span><strong>{aberto.oc_dist_h !== null ? `${texto(aberto.oc_dist_h)} h` : "—"}</strong></div>
              <div><span>Início</span><strong>{dataBR(aberto.oc_ini)}</strong></div>
              <div><span>Fim</span><strong>{dataBR(aberto.oc_fim)}</strong></div>
              <div><span>Duração</span><strong>{texto(aberto.oc_dur_h)} h</strong></div>
              <div><span>Clientes interrompidos</span><strong>{texto(aberto.oc_cons)}</strong></div>
              <div><span>Papel do transformador</span><strong>{texto(aberto.oc_papel)}</strong></div>
              <div><span>Elemento do defeito</span><strong>{texto(aberto.oc_prob_ele)}</strong></div>
              <div><span>Causa</span><strong>{texto(aberto.oc_causa)}</strong></div>
              <div><span>Subcausa</span><strong>{texto(aberto.oc_sub)}</strong></div>
            </section>
            <article className="source-text"><span>OBSERVAÇÃO REGISTRADA EM CAMPO</span><p>{texto(aberto.oc_obs) || "Sem observação."}</p></article>
            {texto(aberto.vizinho) ? <article className="work-alerts"><span>TESTE DO VIZINHO</span><ul><li>{texto(aberto.vizinho)}</li></ul></article> : null}
          </>}
          {abaDossie === "deslocamento" && <>
            <h3>O atendimento da equipe</h3>
            <section className="detail-grid">
              <div><span>Atendimento</span><strong>{texto(aberto.at_num) || "nenhum"}</strong></div>
              <div><span>Equipe</span><strong>{texto(aberto.at_equipe) || "—"}</strong></div>
              <div><span>Início</span><strong>{dataBR(aberto.at_ini)}</strong></div>
              <div><span>Corrobora o fato</span><strong>{texto(aberto.tmae_corrobora)}</strong></div>
              <div><span>Preparação (TMP)</span><strong>{texto(aberto.at_tmp)}</strong></div>
              <div><span>Deslocamento (TMD)</span><strong>{texto(aberto.at_tmd)}</strong></div>
              <div><span>Execução (TME)</span><strong>{texto(aberto.at_tme)}</strong></div>
              <div><span>Total (TMA)</span><strong>{texto(aberto.at_tma)}</strong></div>
              <div><span>Causa</span><strong>{texto(aberto.at_causa)}</strong></div>
              <div><span>Subcausa</span><strong>{texto(aberto.at_sub)}</strong></div>
            </section>
            <article className="source-text"><span>OBSERVAÇÃO DO EXECUTANTE</span><p>{texto(aberto.at_obs) || "Sem observação."}</p></article>
            {aberto.tmae_gap_jan === "SIM" ? <article className="work-alerts danger"><span>LACUNA CONHECIDA</span><ul><li>Esta SS foi aberta entre 26 e 31 de janeiro, período em que o arquivo de atendimento não tem nenhum registro. A ausência aqui não é contraprova.</li></ul></article> : null}
          </>}
          {abaDossie === "ssos" && <>
            <h3>O que foi pedido e o que foi executado</h3>
            <article className="source-text"><span>DESCRIÇÃO ORIGINAL DA SS</span><p>{texto(aberto.desc_ss) || "Sem texto."}</p></article>
            <article className="source-text"><span>DESCRIÇÃO ORIGINAL DA OS</span><p>{texto(aberto.desc_os) || "Sem texto."}</p></article>
            <section className="detail-grid">
              <div><span>Solicitante</span><strong>{texto(aberto.solicitante)}</strong></div>
              <div><span>Origem</span><strong>{texto(aberto.origem)}</strong></div>
              <div><span>Equipe da SS</span><strong>{texto(aberto.equipe_ss)}</strong></div>
              <div><span>Tipo da solicitação</span><strong>{texto(aberto.tipo_ss)}</strong></div>
              <div><span>Abertura</span><strong>{dataBR(aberto.abertura)}</strong></div>
              <div><span>Término</span><strong>{dataBR(aberto.termino)}</strong></div>
              <div><span>Potência retirada</span><strong>{texto(aberto.pot_ret)} kVA</strong></div>
              <div><span>Potência instalada</span><strong>{texto(aberto.pot_inst)} kVA</strong></div>
              <div><span>Transformadores no material</span><strong>{texto(aberto.trafos_material)}</strong></div>
              <div><span>Material conferido</span><strong>{texto(aberto.material_conferido)}</strong></div>
            </section>
          </>}
          {abaDossie === "obra" && <>
            <h3>A obra e o enquadramento</h3>
            <section className="detail-grid">
              <div><span>Obra</span><strong>{texto(aberto.obra) || "não gerada"}</strong></div>
              <div><span>Classe</span><strong>{texto(aberto.obra_classe) || "—"}</strong></div>
              <div><span>Natureza</span><strong>{texto(aberto.obra_natureza) || "—"}</strong></div>
              <div><span>Tipo</span><strong>{texto(aberto.obra_tipo) || "—"}</strong></div>
              <div><span>SIGCO da SS</span><strong>{texto(aberto.sigco) || "—"}</strong></div>
              <div><span>SIGCO do projeto</span><strong>{texto(aberto.obra_sigco_proj) || "—"}</strong></div>
              <div><span>Empreiteira</span><strong>{texto(aberto.obra_empreiteira) || "—"}</strong></div>
              <div><span>Última movimentação</span><strong>{texto(aberto.obra_ultimo_nome) || "—"}</strong></div>
              <div><span>Setor</span><strong>{texto(aberto.obra_setor) || "—"}</strong></div>
              <div><span>Realizado</span><strong>R$ {br(Math.round(Number(aberto.obra_realizado) || 0))}</strong></div>
            </section>
            {texto(aberto.e4_alertas) ? <article className="work-alerts"><span>ALERTAS DE OBRA</span><ul>{texto(aberto.e4_alertas).split(" · ").map((x) => <li key={x}>{x}</li>)}</ul></article> : null}
            <article className="editorial-note"><span>SOBRE O NOME DA OBRA</span><p>O cadastro não guarda quem abriu a obra: o nome registrado é o de quem fez a última movimentação. Quem origina o fluxo é o solicitante da SS, porque a obra nasce dela.</p></article>
          </>}
          {abaDossie === "historico" && <>
            <h3>Histórico do transformador {texto(aberto.trafo)}</h3>
            <section className="detail-grid">
              <div><span>Ocorrências no semestre</span><strong>{texto(aberto.ocorrencias_ativo)}</strong></div>
              <div><span>Atendimentos no semestre</span><strong>{texto(aberto.atendimentos_ativo)}</strong></div>
            </section>
            <div className="table-scroll"><table className="records-table">
              <thead><tr><th>Evento</th><th>Quando</th><th>Causa</th><th>Equipe</th></tr></thead>
              <tbody>{fluxo.historico.filter((l) => texto(l[0]) === texto(aberto.trafo)).map((l, i) => <tr key={i}>
                <td><strong>{texto(l[4])}</strong><code>{texto(l[7])}</code></td>
                <td><strong>{texto(l[5]).slice(0, 16)}</strong><span>{texto(l[6]).slice(0, 16)}</span></td>
                <td><span>{texto(l[10])}</span></td>
                <td><span>{texto(l[12]) || "—"}</span></td>
              </tr>)}</tbody>
            </table></div>
          </>}
        </div>
      </aside>
    </div> : null}
  </div>;
}
