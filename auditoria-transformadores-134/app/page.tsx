"use client";

import { useEffect, useMemo, useState } from "react";
import MapaAtivos, { type PontoAtivo } from "./MapaAtivos";

/* ------------------------------------------------------------------ tipos */

type ColetaItem = {
  via: string; fabricante: string; fabricacao: string; dias: number | null; suja: string;
  ns_retirado: string; tombamento: string; ns_instalado: string;
  pot_retirada: string; pot_instalada: string;
  reformado: string; reformadora: string; reforma: string; situacao: string;
  ocorrencias_12m: string; carregamento: string; gd: string;
};

type MaterialObra = {
  trafos: number; itens: number; valor: number; troca_tipo: boolean;
  linhas: Array<{ desc: string; kva: string; prev: number; real: number; valor: number }>;
};

type TmaeTempo = {
  origem: string; comunicado: string; saiu: string; chegou: string; executou: string; concluiu: string;
  tmp: string; tmd: string; tme: string; tma: string; equipe: string; ele: string; ele_t: string;
  mesmo_ativo: boolean;
};
type Aterramento = {
  antes: number[]; depois: number[]; pior: number | null; pior_depois: number | null;
  medido: boolean; so_depois: boolean; melhoria: string; conectado: string;
};
type Passo = {
  p: string; pf: string; ini: string; fim: string;
  def: string; def_t: string; int: string; int_t: string; fec: string; fec_t: string;
  dur: string; cons: string; fecho: string;
};
type PassosSS = {
  oc: string; n: number; papeis: string[]; so_manobra: boolean;
  ausente_nos_passos: boolean; nao_restabelecido: boolean; socorrido: boolean;
};

type Modulo =
  | "visao" | "interrupcao" | "deslocamento" | "ssos" | "obra" | "decisao"
  | "profunda"
  | "ressalva"
  | "semdesloc"
  | "semfato" | "expurgos" | "exclusoes" | "preventivos"
  | "ativos" | "regras" | "revisao" | "bases" | "mapa"
  | "insight_valor" | "insight_garantia" | "insight_material" | "insight_divide" | "insight_tempos"
  | "insight_revisao" | "insight_aterramento" | "insight_reincidencia";

type Registro = Record<string, string | number | boolean | null>;

/* A aba "Revisão da auditoria" não guarda texto nenhum aqui dentro: tudo vem do
   public/revisao.json, gerado por scripts/gerar_revisao.py a partir dos vereditos
   da revisão caso a caso. Chegou veredito novo, roda o script e a aba se atualiza. */
type CasoRevisto = {
  ss: string; grupo: string; atual: string; correta: string; claro: string; muda: boolean;
  motivo: string; evidencia: string; origem: string; localidade: string; abertura: string;
  trafo: string; equipe: string; obra: string; categoria: string; desc_ss: string;
};
type Revisao = {
  meta: {
    gerado: string; universo: number; revisadas: number; cobertura_pct: number; mudam: number;
    confirmadas: number; sem_resposta: number; saida_hoje: number;
    fontes: Record<string, number>; postura: string; regra_de_ouro: string;
  };
  falsos_positivos: { n: number; nota: string; casos: CasoRevisto[] };
  grupos: Array<{
    id: string; familia: string; rotulo: string; de: string; para: string; n: number;
    esteira_fez: string; por_que_errado: string; afeta_saida: boolean;
    exemplo: { ss: string; trecho: string; motivo: string }; ss: string[];
  }>;
  sem_resposta: Array<{ ss: string; atual: string; na_saida?: boolean; falta: string }>;
  sem_resposta_resumo?: { n: number; na_saida: number; nota: string; onde: Array<{ categoria: string; n: number }> };
  confirmado: { n: number; nota: string; por_categoria: Array<{ categoria: string; n: number }> };
  verificacao_aferida?: null | {
    nota: string; licao: string; lacunas_licao: string;
    contradicoes_apontadas: number; contradicoes_confirmadas: number;
    lacunas_apontadas: number; lacunas_confirmadas: number;
    regras: Array<{
      id: string; tipo: string; rotulo: string; explicacao: string;
      apontou: number; confirmadas: number; acerto_pct: number; ss: string[];
    }>;
  };
  cenarios: Array<{
    id: string; rotulo: string; descricao: string; entram: number; saem: number;
    saida: number; base: string;
  }>;
  cenarios_aplicados?: Array<{ id: string; rotulo: string; quando: string; efeito: string }>;
  revisores: {
    site: null | {
      veredito: string; resumo: string; funciona?: string[];
      quebra?: Array<{ titulo: string; aba: string; o_que: string; reproduzir: string; conserto: string }>;
      incomoda?: Array<{ titulo: string; aba: string; o_que: string; reproduzir: string; conserto: string }>;
    };
    numeros: null | {
      veredito: string; resumo: string; confirmado?: string[]; suspeitas?: string[];
      achados?: Array<{ titulo: string; gravidade: string; numero: string; criterio: string; reproduzir: string }>;
      perguntas?: Array<{ pergunta: string; resposta: string }>;
    };
  };
  conferencia_dos_achados?: null | {
    nota: string;
    itens: Array<{
      achado: string; gravidade_alegada: string; veredito: string; o_que_eu_medi: string;
      por_que_a_diferenca_importa: string; o_que_sobra_de_verdade: string;
    }>;
  };
  casos: CasoRevisto[];
};

type Fluxo = {
  meta: { titulo: string; janelaHoras: number; regra?: string; fontes: string[]; lacunas: string[]; correcoes?: string[] };
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
  F1: "Fato pleno", F0: "Fato com ressalva", F2: "Só atendimento", F3: "Sem interrupção",
  FD: "Fato duplicado",
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

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/* MÊS É EIXO, NÃO RANKING. Pedido dele: "sempre de janeiro na primeira linha até o mês mais
   atual". Um gráfico de mês ordenado por tamanho obriga quem lê a procurar a sequência que não
   está ali — e some com a leitura que importa, que é a curva. O eixo sai da base inteira, não do
   recorte, para que dois gráficos possam ser comparados lado a lado; mês sem nenhum caso aparece
   com zero, porque zero também é resposta. */
function porMes(linhas: Registro[], universo: Registro[]): Par[] {
  const chave = (r: Registro) => String(r.abertura || "").slice(0, 7);
  const todos = universo.map(chave).filter((k) => /^\d{4}-\d{2}$/.test(k)).sort();
  if (!todos.length) return [];
  const ultimo = todos[todos.length - 1];
  const conta = new Map<string, number>();
  linhas.forEach((r) => { const k = chave(r); if (k) conta.set(k, (conta.get(k) || 0) + 1); });
  const saida: Par[] = [];
  for (let a = Number(todos[0].slice(0, 4)), m = 1; ; m++) {
    if (m > 12) { m = 1; a++; }
    const k = `${a}-${String(m).padStart(2, "0")}`;
    saida.push({ label: `${MES_CURTO[m - 1]}/${a}`, value: conta.get(k) || 0 });
    if (k >= ultimo) break;
  }
  return saida;
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
  ["Motivo da decisão", "motivo_decisao"], ["Narrativa da análise", "narrativa"], ["Abertura da SS", "abertura"], ["Término", "termino"],
  ["Situação da SS", "situacao"], ["Criticidade", "criticidade"],
  ["Ocorrência", "oc_num"], ["Início da ocorrência", "oc_ini"], ["Fim da ocorrência", "oc_fim"],
  ["Duração (h)", "oc_dur_h"], ["Clientes interrompidos", "oc_cons"],
  ["Distância até o intervalo", "oc_dist_h"],
  ["Papel do trafo", "oc_papel"], ["Elemento do defeito", "oc_prob_ele"], ["Tipo da ocorrência", "oc_tipo"],
  ["Causa em campo", "oc_causa"], ["Subcausa em campo", "oc_sub"], ["Ressalvas", "ressalvas"],
  ["Atendimento", "at_num"], ["Início do atendimento", "at_ini"], ["Equipe", "at_equipe"],
  ["TMP", "at_tmp"], ["TMD", "at_tmd"], ["TME", "at_tme"], ["TMA", "at_tma"],
  ["Causa (atendimento)", "at_causa"], ["Subcausa (atendimento)", "at_sub"],
  ["Corrobora?", "tmae_corrobora"],
  ["Material", "e3_motivo"], ["Trafos no material", "trafos_material"],
  ["Material conferido", "material_conferido"],
  ["Alertas de obra", "e4_alertas"], ["Classe da obra", "obra_classe"],
  ["Natureza", "obra_natureza"], ["Tipo da obra", "obra_tipo"], ["Proteção que atuou", "protecao"],
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

/* A RÉGUA DA JANELA, DESENHADA.
   A regra da primeira peneira é a coisa mais difícil de explicar em palavras desta auditoria: a
   janela não é simétrica, ela vale contra o INTERVALO da ocorrência (do primeiro passo ao
   último) e não contra o instante em que ela abriu, e a tolerância para trás é de uma hora
   enquanto a de frente é de vinte e quatro. Uma frase leva três linhas e ainda deixa dúvida.
   Um desenho resolve: a barra é a ocorrência, a faixa clara é o que a janela ainda aceita, e o
   pino é a hora em que a SS foi aberta. Quem olha entende num segundo se o caso entrou ou não,
   e por quantas horas. */
/* A CONTA EM NÚMEROS GRANDES.
   Pedido dele, e é o pedido certo: "quero só os famosos big numbers, o que ficou preso em cada
   parte e um porquê geralzão". A tela cheia de caixinhas obriga quem apresenta a montar a
   história na hora; esta cascata já é a história. Cada degrau diz quanto entrou, quanto saiu e
   por quê, em uma linha — e o detalhe fica a um clique, que é onde ele deve estar. */
function Degrau({ n, rotulo, sinal, porques, aoClicar, forte }: {
  n: number; rotulo: string; sinal?: "menos" | "igual";
  /* `sub` recua a linha: as três razões de "sem interrupção que sustente" são partes daquela
     linha, não irmãs dela, e sem o recuo a soma parece contar o mesmo caso duas vezes. */
  porques?: Array<{ n: number; texto: string; aoClicar?: () => void; sub?: boolean }>;
  aoClicar?: () => void; forte?: boolean;
}) {
  return <div className={`degrau${forte ? " forte" : ""}`}>
    <div className={`degrau-topo${aoClicar ? " clicavel" : ""}`}
      onClick={aoClicar} role={aoClicar ? "button" : undefined} tabIndex={aoClicar ? 0 : undefined}
      onKeyDown={(e) => { if (aoClicar && (e.key === "Enter" || e.key === " ")) aoClicar(); }}>
      <i aria-hidden="true">{sinal === "menos" ? "−" : sinal === "igual" ? "=" : ""}</i>
      <b>{br(n)}</b>
      <span>{rotulo}</span>
    </div>
    {porques?.length ? <ul className="degrau-porques">{porques.map((p) => <li key={p.texto}
      className={`${p.aoClicar ? "clicavel" : ""}${p.sub ? " sub" : ""}`} onClick={p.aoClicar}
      role={p.aoClicar ? "button" : undefined} tabIndex={p.aoClicar ? 0 : undefined}
      onKeyDown={(e) => { if (p.aoClicar && (e.key === "Enter" || e.key === " ")) p.aoClicar(); }}>
      <b>{br(p.n)}</b><span>{p.texto}</span></li>)}</ul> : null}
  </div>;
}

const emMs = (v: unknown) => {
  const t = new Date(String(v || "").replace(" ", "T")).getTime();
  return Number.isFinite(t) ? t : null;
};
const H_MS = 3600000;

/* A PRIMEIRA RÉGUA. A barra escura é o intervalo da ocorrência, as faixas claras são a tolerância
   dos dois lados e o pino é a hora em que a SS foi aberta. Com `didatica` o desenho ganha a
   legenda das faixas — usado uma vez, no alto da aba; na lista ele aparece pelado, porque lá o
   leitor já sabe ler. */
function ReguaJanela({ r, didatica }: { r: Registro; didatica?: boolean }) {
  const ini = emMs(r.oc_ini), fim = emMs(r.oc_fim) ?? emMs(r.oc_ini), ab = emMs(r.abertura);
  if (!ini || !fim || !ab) return null;
  const de = Math.min(ini - H_MS, ab) - H_MS;         // começo do desenho
  const ate = Math.max(fim + 24 * H_MS, ab) + H_MS;   // fim do desenho
  const larg = Math.max(1, ate - de);
  const onde = (t: number) => `${((t - de) / larg) * 100}%`;
  const quanto = (ms: number) => `${(ms / larg) * 100}%`;
  const dentro = ab >= ini - H_MS && ab <= fim + 24 * H_MS;
  return <div className={`regua-janela${didatica ? " didatica" : ""}`}>
    <div className="regua-trilho">
      <span className="regua-antes" style={{ left: onde(ini - H_MS), width: quanto(H_MS) }} title="uma hora antes do primeiro passo" />
      <span className="regua-oc" style={{ left: onde(ini), width: quanto(Math.max(fim - ini, larg / 200)) }} title="intervalo da ocorrência, do primeiro passo ao último" />
      <span className="regua-depois" style={{ left: onde(fim), width: quanto(24 * H_MS) }} title="vinte e quatro horas depois do último passo" />
      <b className={dentro ? "regua-ss dentro" : "regua-ss fora"} style={{ left: onde(ab) }} title={`SS aberta em ${dataBR(r.abertura)}`} />
    </div>
    {didatica ? <div className="regua-chaves">
      <span className="k-antes">1 hora antes</span>
      <span className="k-oc">intervalo da ocorrência, do primeiro passo ao último</span>
      <span className="k-depois">24 horas depois</span>
      <span className="k-pino">abertura da SS</span>
    </div> : null}
    <div className="regua-legenda">
      <span>ocorrência {dataBR(r.oc_ini)} → {dataBR(r.oc_fim)}</span>
      <span>SS aberta {dataBR(r.abertura)}</span>
      <strong className={dentro ? "dentro" : "fora"}>{dentro ? "dentro da janela" : distanciaEmPalavras(r.oc_dist_h, r.aberta_antes)}</strong>
    </div>
  </div>;
}

/* A SEGUNDA RÉGUA, e ela não é a primeira desenhada de outro jeito: aqui a barra larga é o
   SERVIÇO — da abertura da SS ao encerramento — e o bloco escuro é a ocorrência inteira dentro
   dele. A pergunta muda de "a SS nasceu perto do apagão?" para "o apagão aconteceu durante o
   atendimento?", e por isso a distância não é consultada em lugar nenhum deste desenho. */
function ReguaContencao({ r }: { r: Registro }) {
  const ab = emMs(r.abertura), enc = emMs(r.termino);
  const oi = emMs(r.oc_ini), of = emMs(r.oc_fim) ?? emMs(r.oc_ini);
  if (!ab || !enc || !oi || !of || enc <= ab) return null;
  const folga = Math.max((enc - ab) * 0.09, H_MS);
  const de = ab - folga, larg = Math.max(1, (enc + folga) - de);
  const onde = (t: number) => `${((t - de) / larg) * 100}%`;
  const quanto = (ms: number) => `${(ms / larg) * 100}%`;
  const dentro = oi >= ab && of <= enc;
  return <div className="regua-janela didatica contencao">
    <div className="regua-trilho">
      <span className="regua-servico" style={{ left: onde(ab), width: quanto(enc - ab) }} title="do momento em que a SS foi aberta até o encerramento" />
      <span className="regua-oc" style={{ left: onde(oi), width: quanto(Math.max(of - oi, larg / 150)) }} title="intervalo da ocorrência" />
    </div>
    <div className="regua-chaves">
      <span className="k-servico">SS aberta → SS encerrada</span>
      <span className="k-oc">a ocorrência, inteira, dentro do serviço</span>
    </div>
    <div className="regua-legenda">
      <span>SS {dataBR(r.abertura)} → {dataBR(r.termino)}</span>
      <span>ocorrência {dataBR(r.oc_ini)} → {dataBR(r.oc_fim)}</span>
      <strong className={dentro ? "dentro" : "fora"}>{dentro ? "contida — a ocorrência é desta SS" : "não contida"}</strong>
    </div>
  </div>;
}

/* A MESMA RÉGUA DA INTERRUPÇÃO, PARA O TMAE. Pedido dele. O desenho é o da janela — uma hora
   antes, o intervalo da ocorrência, vinte e quatro depois, o pino da SS — e por cima entra a
   barra azul do atendimento, do início ao fim. Um olhar responde o que a etiqueta "atendimento
   fora da janela" dizia por escrito: a ida ao poste cai dentro do evento desta SS ou não.
   Quando o caso não tem ocorrência, a régua ancora na SS e mostra só a distância até o
   atendimento — menos informação, dita como menos, e não como nada. */
function ReguaTmae({ r }: { r: Registro }) {
  const ai = emMs(r.at_ini), af = emMs(r.at_fim) ?? emMs(r.at_ini);
  const ab = emMs(r.abertura);
  const oi = emMs(r.oc_ini), of = emMs(r.oc_fim) ?? emMs(r.oc_ini);
  if (!ai || !af || !ab) return null;
  const pontos = [ab, ai, af];
  if (oi && of) pontos.push(oi - H_MS, of + 24 * H_MS);
  const de = Math.min(...pontos) - H_MS;
  const ate = Math.max(...pontos) + H_MS;
  const larg = Math.max(1, ate - de);
  const onde = (t: number) => `${((t - de) / larg) * 100}%`;
  const quanto = (ms: number) => `${(ms / larg) * 100}%`;
  const fora = texto(r.at_fora_da_janela) === "SIM";
  return <div className="regua-janela regua-tmae">
    <div className="regua-trilho">
      {oi && of ? <>
        <span className="regua-antes" style={{ left: onde(oi - H_MS), width: quanto(H_MS) }} title="uma hora antes do primeiro passo" />
        <span className="regua-oc" style={{ left: onde(oi), width: quanto(Math.max(of - oi, larg / 200)) }} title="intervalo da ocorrência" />
        <span className="regua-depois" style={{ left: onde(of), width: quanto(24 * H_MS) }} title="vinte e quatro horas depois do último passo" />
      </> : null}
      <span className="regua-at" style={{ left: onde(ai), width: quanto(Math.max(af - ai, larg / 200)) }} title={`atendimento ${dataBR(r.at_ini)} → ${dataBR(r.at_fim)}`} />
      <b className={fora ? "regua-ss fora" : "regua-ss dentro"} style={{ left: onde(ab) }} title={`SS aberta em ${dataBR(r.abertura)}`} />
    </div>
    <div className="regua-legenda">
      <span>atendimento {dataBR(r.at_ini)} → {dataBR(r.at_fim)}</span>
      <span>SS aberta {dataBR(r.abertura)}</span>
      <strong className={fora ? "fora" : "dentro"}>{fora ? "atendimento fora da janela desta SS" : "atendimento na janela desta SS"}</strong>
    </div>
  </div>;
}

/* AS TRÊS RÉGUAS, UMA EMBAIXO DA OUTRA, NO MESMO EIXO. Pedido dele: a régua da Crítica, embaixo
   a do TMAE, embaixo a da SS da abertura ao término.
   O que faz isto valer é o eixo COMPARTILHADO: as três dividem o mesmo começo e o mesmo fim, e
   por isso a ordem dos eventos se lê de relance — quem veio antes, quem cabe dentro de quem,
   quanto tempo separa um do outro. Três réguas com escalas próprias, empilhadas, mentiriam: a
   ocorrência de duas horas ficaria do mesmo tamanho da SS de duas semanas.
   Cada faixa diz também quando ela NÃO existe, em vez de sumir — trilho vazio com a razão
   escrita ao lado. Ausência de atendimento é informação, e some do desenho se a gente deixar. */
function ReguaTempos({ r, tm }: { r: Registro; tm?: TmaeTempo }) {
  const ab = emMs(r.abertura), te = emMs(r.termino);
  const oi = emMs(r.oc_ini), of = emMs(r.oc_fim) ?? emMs(r.oc_ini);
  /* A faixa do TMAE é a ida da equipe: saiu → concluiu. Só cai para at_ini/at_fim quando não há
     tempos reais — e nesse caso o rótulo avisa, porque aqueles campos são a janela da
     ocorrência e desenhá-los como atendimento seria repetir a barra de cima noutra cor. */
  const ai = tm ? emMs(tm.saiu) ?? emMs(tm.comunicado) : emMs(r.at_ini);
  const af = tm ? emMs(tm.concluiu) ?? emMs(tm.saiu) : (emMs(r.at_fim) ?? emMs(r.at_ini));
  const chegou = tm ? emMs(tm.chegou) : null;
  const pontos = [ab, te, oi, of, ai, af].filter((x): x is number => typeof x === "number");
  if (!pontos.length) return null;
  const folga = Math.max((Math.max(...pontos) - Math.min(...pontos)) * 0.04, H_MS);
  const de = Math.min(...pontos) - folga, ate = Math.max(...pontos) + folga;
  const larg = Math.max(1, ate - de);
  const onde = (t: number) => `${((t - de) / larg) * 100}%`;
  const quanto = (ms: number) => `${(Math.max(ms, larg / 400) / larg) * 100}%`;
  const horas = (a?: number | null, b?: number | null) =>
    a && b ? `${Math.round(Math.abs(b - a) / H_MS)} h` : "";
  /* Pedido dele: um traço no início e um tracinho no fim de cada barrinha, com a data e o
     horário em negrito embaixo de cada um. O rótulo do início termina no traço e o do fim
     começa nele — assim os dois nunca se atropelam, por mais curta que a barra seja; perto
     das bordas do desenho a âncora inverte para o texto não vazar para fora. */
  const pos = (t?: number | null) => (typeof t === "number" ? ((t - de) / larg) * 100 : null);
  const riscos = (a?: number | null, b?: number | null) => <>
    {typeof a === "number" ? <i className="t-risco" style={{ left: onde(a) }} /> : null}
    {typeof b === "number" && b !== a ? <i className="t-risco" style={{ left: onde(b) }} /> : null}
  </>;
  const datas = (a: number | null | undefined, b: number | null | undefined, la: string, lb: string) => {
    const pa = pos(a), pb = pos(b);
    if (pa === null && pb === null) return null;
    const anc = (p: number, ehIni: boolean) =>
      p < 14 ? "translateX(0)" : p > 86 ? "translateX(-100%)" : ehIni ? "translateX(-100%)" : "translateX(0)";
    /* Barra curta encostada numa borda joga os dois rótulos na mesma âncora — aí o do fim
       desce para uma segunda linha em vez de escrever por cima do outro. */
    const da = pa !== null ? anc(pa, true) : "";
    const db = pb !== null ? anc(pb, false) : "";
    const colide = pa !== null && pb !== null && b !== a && da === db && Math.abs(pb - pa) < 16;
    /* Quase esquecido dele: a HORA fica embaixo da DATA — duas linhas, as duas em negrito. */
    const duas = (l: string) => { const [d, h] = l.split(" "); return <><span>{d}</span><span>{h || ""}</span></>; };
    return <div className={`tempos-datas${colide ? " duas" : ""}`}>
      {pa !== null ? <b style={{ left: `${pa}%`, transform: da }}>{duas(la)}</b> : null}
      {pb !== null && b !== a ? <b className={colide ? "linha2" : undefined} style={{ left: `${pb}%`, transform: db }}>{duas(lb)}</b> : null}
    </div>;
  };
  return <div className="tempos">
    <div className="tempos-faixa">
      <span className="tempos-nome">Crítica</span>
      <div className="tempos-eixo">
        <div className="regua-trilho">
          {oi && of ? <>
            <span className="regua-antes" style={{ left: onde(oi - H_MS), width: quanto(H_MS) }} title="uma hora antes do primeiro passo" />
            <span className="regua-oc" style={{ left: onde(oi), width: quanto(of - oi) }} title={`ocorrência ${dataBR(r.oc_ini)} → ${dataBR(r.oc_fim)}`} />
            <span className="regua-depois" style={{ left: onde(of), width: quanto(24 * H_MS) }} title="vinte e quatro horas depois do último passo" />
            {riscos(oi, of)}
          </> : null}
        </div>
        {oi ? datas(oi, of, dataBR(r.oc_ini), dataBR(r.oc_fim)) : null}
      </div>
      <span className="tempos-dado">{oi ? horas(oi, of) : "sem ocorrência na Crítica"}</span>
    </div>
    <div className="tempos-faixa">
      <span className="tempos-nome">TMAE</span>
      <div className="tempos-eixo">
        <div className="regua-trilho">
          {ai && af ? <span className="regua-at" style={{ left: onde(ai), width: quanto(af - ai) }} title={tm ? `equipe saiu ${tm.saiu} · concluiu ${tm.concluiu}` : "janela da ocorrência — não há tempos reais do TMAE"} /> : null}
          {ai && af ? riscos(ai, af) : null}
          {chegou ? <b className="regua-chegou" style={{ left: onde(chegou) }} title={`a equipe chegou em ${chegou ? tm?.chegou : ""}`} /> : null}
        </div>
        {ai ? datas(ai, af, dataBR(tm ? tm.saiu : r.at_ini), dataBR(tm ? tm.concluiu : r.at_fim)) : null}
      </div>
      <span className="tempos-dado">{ai
        ? `${horas(ai, af)}${tm ? "" : " (janela da ocorrência)"}`
        : "sem atendimento registrado"}</span>
    </div>
    <div className="tempos-faixa">
      <span className="tempos-nome">SS</span>
      <div className="tempos-eixo">
        <div className="regua-trilho">
          {ab && te ? <span className={`regua-servico${te < ab ? " invertida" : ""}`}
            style={{ left: onde(Math.min(ab, te)), width: quanto(Math.abs(te - ab)) }}
            title={`SS ${dataBR(r.abertura)} → ${dataBR(r.termino)}`} /> : null}
          {ab || te ? riscos(ab, te) : null}
          {ab ? <b className="regua-ss dentro" style={{ left: onde(ab) }} title={`SS aberta em ${dataBR(r.abertura)}`} /> : null}
        </div>
        {ab ? datas(ab, te, dataBR(r.abertura), dataBR(r.termino)) : null}
      </div>
      <span className="tempos-dado">{ab ? horas(ab, te) : "sem abertura"}</span>
    </div>
    {te && ab && te < ab ? <p className="tempos-aviso">O término está gravado ANTES da abertura — a faixa da SS anda para trás. É erro de cadastro de data, não de execução.</p> : null}
  </div>;
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

/* A MESMA BARRA, PARTIDA POR CAUSA. Pedido dele na aba do aterramento: além da barra da faixa,
   uma barra mais grossa dividida entre queimado e avariado — verde claro e azul escuro. A
   pergunta que ela responde é direta: dos que estavam sobre aterramento grave, quantos
   queimaram e quantos avariaram. As duas barras dividem a MESMA escala (o maior total manda),
   senão a faixa pequena pareceria do tamanho da grande. */
function BarrasCausa({ dados, aoSelecionar }: {
  dados: { label: string; total: number; q: number; a: number }[];
  aoSelecionar?: (label: string) => void;
}) {
  const max = Math.max(...dados.map((d) => d.total), 1);
  return <div className="bar-list">
    {dados.map((d) => {
      /* A barra de cima mede TAMANHO — cada faixa contra a maior delas. A de baixo mede
         COMPOSIÇÃO e por isso ocupa a linha inteira: dividir 6 avariados pela escala global
         dava uma fatia de dois pixels, e ele reclamou com razão de o azul não aparecer.
         Aqui os 6 viram 5% de uma barra cheia, que se enxerga. */
      const soma = d.q + d.a || 1;
      const corpo = <>
        <div><span>{d.label}</span><strong>{br(d.total)}</strong></div>
        <i><b style={{ width: `${(d.total / max) * 100}%` }} /></i>
        <i className="bar-causa">
          {d.q ? <b className="q" style={{ width: `${(d.q / soma) * 100}%` }} title={`${br(d.q)} queimados`} /> : null}
          {d.a ? <b className="a" style={{ width: `${(d.a / soma) * 100}%`, minWidth: 14 }} title={`${br(d.a)} avariados`} /> : null}
        </i>
        <small><em className="leg-q" /> {br(d.q)} queimado{d.q === 1 ? "" : "s"} · <em className="leg-a" /> {br(d.a)} avariado{d.a === 1 ? "" : "s"} ({pct(d.a, soma)}%)</small>
      </>;
      return aoSelecionar
        ? <button type="button" className="bar-row" key={d.label} onClick={() => aoSelecionar(d.label)}>{corpo}</button>
        : <div className="bar-row" key={d.label}>{corpo}</div>;
    })}
  </div>;
}

/* A tabela é a mesma em todas as abas; o que muda são as três colunas do meio, que
   contam a história daquele estágio. */
/* O gatilho da exclusão é gravado como chave curta pelo motor de regras. Aqui ele vira frase,
   uma só, usada em toda a tela — para não existirem dois nomes para o mesmo motivo. */
/* O elemento vem da Crítica em sigla — TR, UC, CH, DJ. Na tela vira palavra, uma só, para o
   gráfico e o dossiê não chamarem a mesma coisa por dois nomes. */
/* O que a classificação do dono escreve na coluna da decisão, e com que cor. */
const MEU_ROTULO: Record<string, string> = {
  QUEIMADO: "QUEIMADO", AVARIADO: "AVARIADO", PREVENTIVO: "PREVENTIVO",
  FURTADO: "FURTADO", EXCLUIDO: "EXCLUÍDO", REGRA: "VALE A REGRA", PROFUNDA: "ANÁLISE PROFUNDA",
};

const MEU_TOM: Record<string, string> = {
  QUEIMADO: "good", AVARIADO: "info", PREVENTIVO: "warn",
  FURTADO: "bad", EXCLUIDO: "bad", REGRA: "pend", PROFUNDA: "warn",
};


/* A natureza agrupa os gatilhos pelo que eles significam para quem paga a conta. Furto é crime
   patrimonial e vai para projeto de reposição; dano de terceiro é acidente e vira ressarcimento
   — somar os dois apaga a diferença que decide para onde o custo vai. */
const NATUREZA: Record<string, string> = {
  furto: "Furto, roubo e vandalismo",
  abalroamento: "Danos a terceiro",
  terceiros: "Danos a terceiro",
  avaliar_matheus: "Em avaliação",
  meta: "Executado por terceiro fora do cadastro",
  cola_fita: "Reparo sem substituição",
  preventivo: "Obra sem defeito",
  divisao: "Obra sem defeito",
  seguranca: "Obra sem defeito",
  tap: "Obra sem defeito",
  construcao: "Obra sem defeito",
  desativacao: "Retirada do ativo",
  particular: "Ativo de terceiro",
  auxiliar: "Não é unidade de distribuição",
  duplicada: "Evento contado duas vezes",
  sem_os: "Sem documento para conferir",
  sem_obra: "Sem documento para conferir",
};

const ELEMENTO_ROTULO: Record<string, string> = {
  TR: "Defeito no transformador",
  UC: "Defeito na unidade consumidora",
  CH: "Defeito em chave",
  DJ: "Defeito em disjuntor",
};

const GATILHO_ROTULO: Record<string, string> = {
  furto: "Furto, roubo ou vandalismo",
  abalroamento: "Abalroamento",
  preventivo: "Preventivo ou programado",
  divisao: "Divisão de circuito",
  construcao: "Construção ou obra nova",
  desativacao: "Desativação do posto",
  auxiliar: "Auxiliar de religador ou regulador",
  particular: "Transformador particular",
  duplicada: "SS duplicada",
  seguranca: "Obra de poste — segurança",
  tap: "Tape interno — regularização de tensão",
  sem_os: "Sem OS e sem obra — investigar",
  remanejamento: "Remanejamento de potência ou de poste",
  falta_fase: "Falta de fase interna",
  obra_sem_execucao: "Obra aberta que não executou nada",
  obra_sem_transformador: "Obra encerrada sem transformador movimentado",
  obra_chave: "A obra trocou chave fusível",
  obra_poste: "A obra trocou poste",
  obra_cabo: "A obra trocou cabo ou ramal",
  obra_pararaio: "A obra trocou para-raio",
  obra_medidor: "A obra trocou medidor",
  erro_cadastro: "Possível erro de cadastro do código",
  fora_da_janela: "Fora da janela da interrupção",
  sem_interrupcao: "Ausente da base de interrupções",  // inclui o que se chamava “sem rastro”
  sem_obra: "Obra nunca gerada — prazo vencido",
  sem_fato: "Sem interrupção na base Crítica",
  terceiros: "Causada por terceiros",
  avaliar_matheus: "Avaliar com o Matheus",
  meta: "Substituído pela Meta",
  cola_fita: "Cola e fita — reparo, não troca",
};

/* MARTELO COM CATEGORIA. Antes só existiam sete botões, e "Excluído" era um balde: o caso saía
   do indicador sem dizer por quê, e a aba de exclusões o mostrava como "marcada por você" ao
   lado de vinte e cinco categorias com nome. Ele pediu um botão para cada categoria que existe
   na aba de exclusão, para classificar rápido. O identificador é "X:<gatilho>" — o mesmo gatilho
   que a regra grava —, então o caso marcado à mão cai exatamente no mesmo chip, no mesmo
   gráfico e na mesma linha da planilha que o caso excluído por regra. Sem tradução no meio. */
/* A POTÊNCIA ESCRITA NA SS. Ordem dele: "pega pelo o que foi escrito na SS".
   A base tem três campos numéricos de potência e eles brigam entre si — POTENCIA_RET e POT_RET
   discordam em 222 das que contam. Quem não briga é o texto: quando o solicitante escreve
   "trafo de 45 kva", ele está descrevendo o equipamento que viu no poste. Por isso a leitura
   aqui é do texto, e só dele.
   Aceita 15KVA, 15 kVA, 112,5 kva, 30 kvar (o campo escreve kvar por vício, e é kVA). Só vale
   potência que existe em transformador de distribuição: número solto no meio da frase — tensão,
   telefone, número de cliente — não entra. Se a frase citar mais de uma potência, o caso não é
   julgado: duas potências no mesmo texto é ambiguidade, não achado. */
const POTENCIAS = [5, 10, 15, 25, 30, 45, 75, 112.5, 150, 225, 300];
const kvaValida = (v: string): number | null => {
  const n = Number(v.replace(",", "."));
  const c = n === 1125 ? 112.5 : n;
  return POTENCIAS.includes(c) ? c : null;
};
/* Uma potência só, escrita em qualquer lugar do texto. Se a frase citar duas, devolve nulo:
   duas potências na mesma frase é ambiguidade, e ambiguidade não é achado. */
const kvaEscrito = (txt?: string): number | null => {
  const s = String(txt || "").toUpperCase().replace(/\./g, ",");
  const achadas = new Set<number>();
  for (const m of s.matchAll(/(\d{1,4}(?:,\d)?)\s*K?\s?VA/g)) {
    const n = kvaValida(m[1]);
    if (n !== null) achadas.add(n);
  }
  return achadas.size === 1 ? [...achadas][0] : null;
};
/* O TRANSFORMADOR INSTALADO, LIDO NA OS. Ordem dele: "usa a OS, mas algumas você vai ter que
   ler o trafo instalado foi tanto; caso não encontre, usa a SS".
   A OS escreve isso de dois jeitos e os dois estão cobertos por ancorar na palavra INSTALADO e
   pegar o primeiro kVA depois dela:
     TRANSFORMADOR INSTALADO: 15 KVA TRANSFORMADOR RETIRADO: 25 KVA
     TRAFO INSTALADO POTÊNCIA : 15KVA TENSÃO : 13.8KV
   É a leitura certa para comparar com dinheiro: a obra pagou o que ENTROU no poste, não o que
   saiu. Numa troca com aumento de potência os dois são diferentes, e era o instalado que
   faltava — a SS descreve o que a equipe encontrou, que é o retirado. */
const kvaInstaladoNaOS = (txt?: string): number | null => {
  const s = String(txt || "").toUpperCase().replace(/\./g, ",");
  const m = s.match(/INSTALAD\w*[\s\S]{0,60}?(\d{1,4}(?:,\d)?)\s*K?\s?VA/);
  return m ? kvaValida(m[1]) : null;
};

const PREFIXO_EXC = "X:";
const ehExclusaoManual = (c?: string) => Boolean(c && c.startsWith(PREFIXO_EXC));
const gatilhoDaClasse = (c?: string) => (ehExclusaoManual(c) ? String(c).slice(PREFIXO_EXC.length) : "");
const meuRotulo = (c?: string) =>
  ehExclusaoManual(c) ? (GATILHO_ROTULO[gatilhoDaClasse(c)] || gatilhoDaClasse(c)).toUpperCase()
                      : (MEU_ROTULO[String(c)] || String(c || ""));
const meuTom = (c?: string) => (ehExclusaoManual(c) ? "bad" : MEU_TOM[String(c)] || "pend");

/* O chip que cada categoria abre na lista. Onde não houver entrada aqui, a aba gera um recorte
   `g:<gatilho>` sozinha — assim uma categoria nova nasce clicável no mesmo dia em que nasce, em
   vez de ficar invisível esperando alguém lembrar de escrever a caixa dela à mão. */
const GATILHO_CHIP: Record<string, string> = {
  furto: "g_furto", abalroamento: "g_abalro", falta_fase: "g_fase",
  obra_sem_transformador: "g_semtrafo", obra_sem_execucao: "g_semexec",
  remanejamento: "g_reman", preventivo: "g_prev", divisao: "g_div",
  construcao: "g_constr", desativacao: "g_desat", auxiliar: "g_aux",
  particular: "g_part", duplicada: "g_dup", sem_os: "g_semos",
  sem_fato: "g_semfato", sem_obra: "g_semobra", sem_interrupcao: "g_seminterr",
  erro_cadastro: "g_cadastro", fora_da_janela: "g_forajanela",
  seguranca: "g_seg", tap: "g_tap", terceiros: "g_terc", avaliar_matheus: "g_matheus", meta: "g_meta", cola_fita: "g_cola",
};

/* FUSÃO DE CATEGORIA — hoje vazia, e é assim de propósito.
   Ele pediu duas vezes para juntar "ausente da base de interrupções" com "sem interrupção na
   Crítica", e essa fusão foi feita ONDE ELA PERTENCE: no dado. A categoria "sem rastro" deixou
   de existir, seus casos viraram ausentes de verdade, e os dois que tinham defeito próprio em
   outra data foram para fora da janela. Fundir no dado é melhor que fundir na tela, porque a
   planilha, o gráfico e o chip passam a contar a mesma coisa sem ninguém precisar lembrar.
   Antes disto, "fora da janela" também era fundida aqui — e a barra "Motivo da saída" mostrava
   um único bloco de 137. Ele pediu a divisão: são duas perguntas diferentes, "o registro não
   existe" e "o registro existe noutra data", e a segunda tem distância para medir. */
const CATEGORIA_FUNDIDA: Record<string, string> = {};

/* A linha de baixo de cada caixa: o que a categoria quer dizer em uma frase. */
const GATILHO_NOTA: Record<string, string> = {
  furto: "vai para o projeto de ativo furtado",
  abalroamento: "colisão de veículo — vira ressarcimento",
  preventivo: "troca programada, sem defeito",
  divisao: "obra de capacidade, não falha",
  construcao: "instalação nova — não havia equipamento para falhar",
  desativacao: "o posto de transformação deixou de existir",
  auxiliar: "serve ao equipamento, não ao cliente",
  particular: "o ativo é do cliente ou de terceiro",
  duplicada: "o mesmo evento contado duas vezes",
  seguranca: "o transformador desceu com o poste",
  tap: "troca para regularizar tensão, não por falha",
  remanejamento: "troca de potência ou mudança de poste",
  falta_fase: "perdeu fase por dentro, e a troca foi de capacidade",
  sem_os: "nada para ler, nada para conferir — investigar",
  sem_obra: "passou de 60 dias — a prova de material não vem mais",
  sem_fato: "nem ocorrência, nem atendimento, nem vizinho",
  sem_interrupcao: "não há defeito aberto neste transformador — nem em data nenhuma, nem em papel nenhum",
  erro_cadastro: "o código não corresponde ao equipamento no poste",
  fora_da_janela: "o ativo existe na Crítica, mas em outra data",
  obra_sem_transformador: "obra encerrada e conferida, zero transformador",
  obra_sem_execucao: "obra aberta que não executou nada",
  obra_poste: "a obra encerrada trocou poste, não transformador",
  obra_chave: "a obra encerrada trocou chave fusível",
  obra_cabo: "a obra encerrada trocou cabo ou ramal",
  obra_pararaio: "a obra encerrada trocou para-raio",
  obra_medidor: "a obra encerrada trocou medidor",
  terceiros: "a Crítica dá a causa como dano de terceiro",
  avaliar_matheus: "parado para avaliação — as vozes do caso não fecham",
  meta: "a OS diz que quem trocou foi a Meta, não a empreiteira da obra",
  cola_fita: "colaram e vedaram a bucha — o transformador ficou no poste",
  manual: "saiu pelo seu martelo, sem categoria de regra",
};

/* "12.4h da borda do intervalo" é verdade e não comunica: não diz de que lado, e "borda" é
   palavra de quem escreveu o código, não de quem lê o caso. A mesma informação vira frase —
   antes ou depois do intervalo da ocorrência, com a unidade que couber. */
function distanciaEmPalavras(h: unknown, antes?: unknown): string {
  const n = Number(h);
  if (h === null || h === undefined || Number.isNaN(n)) return "—";
  if (n === 0) return "a SS abriu dentro do intervalo da ocorrência";
  const abs = Math.abs(n);
  const quanto = abs < 1 ? `${Math.round(abs * 60)} minutos`
    : abs < 48 ? `${abs.toFixed(1).replace(".", ",").replace(",0", "")} horas`
    : `${Math.round(abs / 24)} dias`;
  return `${quanto} ${antes === "SIM" ? "antes" : "depois"} do intervalo da ocorrência`;
}

const CLASSES_CURTAS: Array<[string, string, string]> = [
  ["QUEIMADO", "Q", "good"], ["AVARIADO", "A", "pend"],
  ["PREVENTIVO", "V", "warn"], ["FURTADO", "F", "bad"], ["EXCLUIDO", "X", "bad"],
  ["REGRA", "R", "warn"], ["PROFUNDA", "P", "bad"],
];

// Os campos que não cabem na tabela: vêm direto da linha da base, sem resumo nosso.
function BlocoDetalhe({ titulo, fonte, dados }: { titulo: string; fonte: string; dados?: Detalhe }) {
  const chaves = Object.keys(dados || {});
  if (!chaves.length) return null;
  return <>
    <h3>{titulo}</h3>
    <p className="fonte-detalhe">{fonte} · {chaves.length} campos</p>
    <section className="detail-grid">
      {chaves.map((k) => <div key={k}><span>{k}</span><strong>{/data|abertura|fechamento|conclus|início|term/i.test(k) ? dataBR(dados![k]) : dados![k]}</strong></div>)}
    </section>
  </>;
}

function Tabela({ linhas, modo, aoAbrir, classificacoes, aoClassificar, coleta = {}, potenciaDe, distanciaDe, ladoDe, materialDe, ssNaObraDe, estadoDe, parceirasOcDe, parceirasAtDe, tmaeDe, revisaoDe, terraDe, reincDe2, terraQuando = "antes" }: {
  linhas: Registro[]; modo: Modulo; aoAbrir: (r: Registro) => void;
  classificacoes: Record<string, { classe: string; quem: string; quando: string }>;
  aoClassificar: (ss: string, classe: string) => void;
  coleta?: Record<string, ColetaItem>;
  potenciaDe?: (r: Registro) => { kva: number | null; fonte: string };
  distanciaDe?: (r: Registro) => number;
  ladoDe?: (r: Registro) => string | null;
  materialDe?: (r: Registro) => MaterialObra | undefined;
  ssNaObraDe?: (r: Registro) => number;
  estadoDe?: (r: Registro) => string | null;
  parceirasOcDe?: (r: Registro) => string[];
  parceirasAtDe?: (r: Registro) => string[];
  tmaeDe?: (r: Registro) => TmaeTempo | undefined;
  revisaoDe?: (r: Registro) => { id: string; motivo: string; detalhe: string }[];
  terraDe?: (r: Registro) => Aterramento | undefined;
  reincDe2?: (r: Registro) => { dias: number; anterior: Registro; ordem: number; total: number } | undefined;
  terraQuando?: "antes" | "depois";
}) {
  const cabecalho: Record<string, string[]> = {
    interrupcao: ["Ocorrência", "O que o campo registrou", "Casamento"],
    deslocamento: ["Atendimento", "Equipe e tempos", "Corroboração"],
    ssos: ["Leitura do texto", "Material", "Solicitação"],
    obra: ["Obra", "Enquadramento", "Responsáveis"],
    decisao: ["Fato", "Leitura", "Motivo"],
    semfato: ["O que se procurou", "Teste do vizinho", "Leitura"],
    expurgos: ["Motivo da parada", "Solicitação", "Obra"],
    exclusoes: ["Por que foi excluída", "Solicitação", "Obra"],
    preventivos: ["Por que é preventivo", "Solicitação", "Obra"],
    visao: ["Fato", "Leitura", "Motivo"],
    ativos: ["Fato", "Leitura", "Motivo"],
    mapa: ["Fato", "Leitura", "Motivo"],
    regras: ["Fato", "Leitura", "Motivo"],
    bases: ["Fato", "Leitura", "Motivo"],
    insight_valor: ["Fato", "Leitura", "Motivo"],
    insight_garantia: ["Fabricação e vida", "Séries e tombamento", "Motivo"],
    insight_material: ["Obra e material", "O que saiu do almoxarifado", "Motivo"],
    insight_divide: ["Ocorrência e com quem divide", "Atendimento e com quem divide", "Motivo"],
    insight_tempos: ["Os três tempos, no mesmo eixo", "Durações", "Motivo"],
    insight_revisao: ["O que pede revisão", "O que a Crítica gravou", "Trecho que denunciou"],
    insight_aterramento: ["Aterramento medido", "Melhoria e conexão", "O que a Crítica gravou"],
    insight_reincidencia: ["Quanto tempo depois", "A troca anterior", "O que a Crítica gravou"],
  };
  const colunas = cabecalho[modo] || cabecalho.decisao;
  return <div className="table-scroll"><table className="records-table">
    <thead><tr>
      <th>Identificação</th><th>Data e local</th>
      <th>{colunas[0]}</th><th>{colunas[1]}</th><th>{colunas[2]}</th><th>Decisão</th><th>{modo === "insight_valor" ? "Obra e potência" : modo === "insight_garantia" ? "Equipamento" : "Minha classificação"}</th>
    </tr></thead>
    <tbody>{linhas.map((r) => {
      /* A cor da linha diz de longe o que a coluna do motivo diz por escrito: este caso saiu do
         indicador. Mais forte quando a exclusão foi batida à mão — essa é a que precisa ser
         distinguida da exclusão por regra. */
      const meu = classificacoes[texto(r.ss)]?.classe;
      const ficha = coleta[texto(r.ss)];
      const potencia = potenciaDe ? potenciaDe(r) : null;
      const distancia = distanciaDe ? distanciaDe(r) : 0;
      const foraMarca = (ladoDe ? ladoDe(r) : "") || "";
      const mat = materialDe ? materialDe(r) : undefined;
      const terra = terraDe ? terraDe(r) : undefined;
      const rec = reincDe2 ? reincDe2(r) : undefined;
      const ssNaObra = ssNaObraDe ? ssNaObraDe(r) : 1;
      const estado = estadoDe ? estadoDe(r) : "";
      const pOc = parceirasOcDe ? parceirasOcDe(r) : [];
      const pAt = parceirasAtDe ? parceirasAtDe(r) : [];
      const excluida = meu === "EXCLUIDO" || (!meu && texto(r.cascata) === "EXCLUÍDA");
      const cor = meu === "QUEIMADO" ? "linha-queimada"
        : meu === "AVARIADO" ? "linha-avariada"
        : meu === "PREVENTIVO" ? "linha-preventiva"
        : excluida ? `linha-excluida${meu === "EXCLUIDO" ? " por-mim" : ""}`
        : undefined;
      return <tr key={texto(r.ss)} className={cor} onClick={() => aoAbrir(r)}>
      <td><strong>{texto(r.ss)}</strong><span>{texto(r.os) || "sem OS"}</span><code>{texto(r.trafo)}</code></td>
      <td><strong>{dataBR(r.abertura)}</strong><span>{texto(r.localidade)}</span><small>{texto(r.equipe_ss)} · {texto(r.origem)}</small></td>

      {modo === "insight_tempos" && <>
        <td colSpan={1}><ReguaTempos r={r} tm={tmaeDe ? tmaeDe(r) : undefined} /></td>
        <td><strong>{r.oc_dur_h ? `${texto(r.oc_dur_h)} h de interrupção` : "sem ocorrência"}</strong>
          <span>{r.at_tma ? `TMA ${texto(r.at_tma)} min` : "sem atendimento"}</span>
          <small>SS {dataBR(r.abertura)} → {dataBR(r.termino)}</small></td>
        <td><p className="clip">{texto(r.motivo_decisao)}</p></td>
      </>}

      {modo === "insight_divide" && <>
        <td><strong>{texto(r.oc_num) || "sem ocorrência"}</strong>
          {pOc.length ? <span className="divide-com">divide com {pOc.join(", ")}</span> : <span>só desta SS</span>}
          <small>{dataBR(r.oc_ini)}</small></td>
        <td><strong>{texto(r.at_num) || "sem atendimento"}</strong>
          {pAt.length ? <span className="divide-com">divide com {pAt.join(", ")}</span> : <span>{texto(r.at_num) ? "só desta SS" : ""}</span>}
          {r.at_ini ? <ReguaTmae r={r} /> : null}</td>
        <td><p className="clip">{texto(r.motivo_decisao)}</p></td>
      </>}

      {modo === "insight_material" && <>
        <td><strong>{texto(r.obra) || "sem obra"}</strong>
          <span>{mat ? `${mat.trafos} trafo${mat.trafos === 1 ? "" : "s"} · ${mat.itens} itens` : "fora do export de material"}</span>
          <small>{ssNaObra > 1 ? `${ssNaObra} SS nesta obra` : "uma SS nesta obra"}</small></td>
        <td>{mat && mat.linhas.length
          ? <>{mat.linhas.map((l, k) => <span key={k}>{l.kva ? `${l.kva} kVA` : l.desc.slice(0, 26)} · prev {l.prev} · realiz {l.real}</span>)}</>
          : <span>nenhuma linha de transformador</span>}</td>
        <td><b className={`pill ${estado === "bate" ? "ok" : estado === "fora_export" ? "warn" : "bad"}`}>{
          estado === "mais_ss" ? "mais SS que trafos" : estado === "mais_trafos" ? "mais trafos que SS"
          : estado === "sem_trafo" ? "sem transformador" : estado === "fora_export" ? "fora do export"
          : estado === "sem_obra" ? "sem obra" : "bate"}</b>
          {mat?.troca_tipo ? <span>previsto ≠ realizado</span> : null}</td>
      </>}

      {modo === "insight_garantia" && <>
        <td><strong>{ficha?.fabricacao || "sem data"}</strong>
          <span>{ficha?.dias != null ? `${br(ficha.dias)} dias de vida · ${Math.round(ficha.dias / 30.4)} meses` : ficha?.suja ? "data não confiável" : "—"}</span>
          <small>{ficha?.suja || ficha?.fabricante || ""}</small></td>
        <td><strong>{ficha?.ns_retirado ? `série ${ficha.ns_retirado}` : "sem série do retirado"}</strong>
          <span>{ficha?.tombamento ? `tombamento ${ficha.tombamento}` : ""}</span>
          <small>{ficha?.ns_instalado ? `instalado: série ${ficha.ns_instalado}` : ""}</small></td>
        <td><p className="clip">{texto(r.desc_ss).slice(0, 180)}</p></td>
      </>}

      {modo === "insight_reincidencia" && <>
        <td>{rec
          ? <><strong>{rec.dias === 0 ? "no mesmo dia" : `${br(rec.dias)} dia${rec.dias === 1 ? "" : "s"} depois`}</strong>
              <span>{rec.dias <= 7 ? "menos de uma semana" : rec.dias <= 30 ? "dentro do mês" : rec.dias <= 90 ? "dentro do trimestre" : "mais de 90 dias"}</span>
              <small>{rec.ordem}ª troca deste ativo no recorte, de {rec.total}</small></>
          : <strong>primeira troca</strong>}</td>
        <td>{rec ? <><strong>{texto(rec.anterior.ss)}</strong><span>{dataBR(rec.anterior.abertura)}</span><small>{texto(rec.anterior.oc_sub) || "sem subcausa"}</small></> : <span>—</span>}</td>
        <td><strong>{texto(r.oc_sub) || "sem subcausa"}</strong><span>{texto(r.oc_causa)}</span></td>
      </>}

      {modo === "insight_aterramento" && <>
        {/* Ordem dele: "traga os campos de medição nessa aba, antes e depois, dos que tiverem".
            As três leituras aparecem uma a uma — X1, X2 e X3 —, porque é o trio que conta a
            história: 1.448 Ω numa haste e 1,2 Ω noutra não é o mesmo caso que três medições
            de 20 Ω, e a média esconderia isso. */}
        <td>{terra && (terra.antes.length || terra.depois.length) ? <>
          {terra.antes.length ? <p className="terra-linha"><b>antes</b> {terra.antes.map((x, i) => <em key={i} className={x > 100 ? "grave" : x > 25 ? "alto" : ""}>X{i + 1} {x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Ω</em>)}</p> : <p className="terra-linha"><b>antes</b> <em>não preenchido</em></p>}
          {terra.depois.length ? <p className="terra-linha"><b>depois</b> {terra.depois.map((x, i) => <em key={i} className={x > 100 ? "grave" : x > 25 ? "alto" : ""}>X{i + 1} {x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Ω</em>)}</p> : <p className="terra-linha"><b>depois</b> <em>não preenchido</em></p>}
          <small>vale a pior: {(terraQuando === "antes" ? terra.pior : terra.pior_depois)?.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) || "—"} Ω</small>
        </> : <><strong>não preenchido</strong><span>formulário em branco ou zerado nas três hastes</span><small>zero não é medição</small></>}</td>
        <td><b className={`pill ${texto(terra?.melhoria).toUpperCase().startsWith("S") ? "ok" : "bad"}`}>{texto(terra?.melhoria).toUpperCase().startsWith("S") ? "fez melhoria" : "sem melhoria"}</b>
          {terra?.pior_depois != null && terra?.pior != null && terra.pior_depois < terra.pior ? <span>caiu para {terra.pior_depois.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Ω depois</span> : null}
          <small>{texto(terra?.conectado).toUpperCase().startsWith("N") ? "NÃO conectado ao tanque" : texto(terra?.conectado) ? "conectado ao tanque" : ""}</small></td>
        <td><strong>{texto(r.oc_sub) || "sem subcausa"}</strong><span>{texto(r.oc_causa)}</span></td>
      </>}

      {modo === "insight_revisao" && <>
        <td>{(revisaoDe ? revisaoDe(r) : []).map((x, i) => <p key={i} className="rev-motivo"><b>{x.motivo}</b></p>)}</td>
        <td><strong>{texto(r.oc_sub) || "sem subcausa"}</strong><span>{texto(r.oc_causa)}</span><small>{texto(r.confirmado) ? `hoje conta como ${texto(r.confirmado).toLowerCase()}` : ""}</small></td>
        <td><p className="clip">{(revisaoDe ? revisaoDe(r) : []).map((x) => x.detalhe).filter(Boolean).join(" · ").slice(0, 200) || texto(r.desc_ss).slice(0, 160)}</p></td>
      </>}

      {modo === "interrupcao" && <>
        <td><strong>{texto(r.oc_num) || "sem ocorrência"}</strong><span>{dataBR(r.oc_ini)}</span><small>{r.oc_dur_h ? `${r.oc_dur_h}h · ${texto(r.oc_cons)} clientes` : ""}</small></td>
        <td><strong>{texto(r.oc_causa) || "—"}</strong><span>{texto(r.oc_sub)}</span><small>{texto(r.oc_papel)}</small></td>
        <td><b className={`pill ${fatoClasse(texto(r.fato))}`}>{FATO_ROTULO[texto(r.fato)] || texto(r.fato)}</b>
          {texto(r.int_na_janela) === "SIM" ? <span className="passo-marca">bandeira: interrompido na oc. {texto(r.int_oc)} · defeito em {texto(r.int_def_ele)} {texto(r.int_def_cod)} — só leitura, não casa</span> : null}
          {r.oc_ini ? <ReguaJanela r={r} /> : <span>{distanciaEmPalavras(r.oc_dist_h, r.aberta_antes)}</span>}
          <small>{texto(r.ressalvas)}</small></td>
      </>}

      {modo === "deslocamento" && <>
        <td><strong>{texto(r.at_num) || "sem atendimento"}</strong><span>{dataBR(r.at_ini)}</span><small>{texto(r.at_causa)}</small></td>
        <td><strong>{texto(r.at_equipe) || "—"}</strong><span>{r.at_tma ? `TMA ${r.at_tma} min` : ""}</span><small>{r.at_tmd ? `deslocamento ${r.at_tmd} · execução ${texto(r.at_tme)}` : ""}</small></td>
        <td><strong>{texto(r.tmae_corrobora)}</strong><span>{texto(r.at_sub)}</span>
          {r.at_ini ? <ReguaTmae r={r} /> : <small>{texto(r.at_obs).slice(0, 60)}</small>}</td>
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

      {(modo === "expurgos" || modo === "exclusoes" || modo === "preventivos") && <>
        {/* Nas abas de exclusão o que interessa é o motivo da EXCLUSÃO, não o motivo geral da
            decisão: quem abre esta lista já sabe que o caso saiu, quer saber por quê. */}
        <td>{modo === "expurgos"
          ? <p className="clip">{texto(r.motivo_decisao)}</p>
          : <>{/* A coluna dizia "marcada por você" para QUALQUER registro sem gatilho — inclusive
                   os que o dono tinha classificado como queimado e que aparecem aqui só porque
                   ele saiu do recorte e pediu "todas as SS". Ler "marcada por você" embaixo de
                   um cabeçalho que diz "por que foi excluída" é assustador e é falso: o caso
                   não está excluído. Agora a coluna só afirma exclusão de quem está excluído. */}
              <strong>{texto(r.expurgo_gatilho)
                ? GATILHO_ROTULO[texto(r.expurgo_gatilho)] || texto(r.expurgo_gatilho)
                : classificacoes[texto(r.ss)]?.classe === "EXCLUIDO" ? "Excluída por você"
                : texto(r.cascata) === "EXCLUÍDA" ? "Excluída"
                : "Não está excluída"}</strong>
              <p className="clip">{texto(r.expurgo_gatilho) || texto(r.cascata) === "EXCLUÍDA"
                ? texto(r.exclusao_porque) || texto(r.cascata_motivo)
                : `Está em ${texto(r.cascata).toLowerCase()}${classificacoes[texto(r.ss)] ? ` e você a classificou como ${classificacoes[texto(r.ss)].classe.toLowerCase()}` : ""}.`}</p></>}</td>
        <td><strong>{texto(r.solicitante) || "—"}</strong><span>{texto(r.origem)} · {texto(r.equipe_ss)}</span><small>{texto(r.tipo_ss)}</small></td>
        <td><strong>{texto(r.obra) || "sem obra"}</strong><span>SIGCO {texto(r.sigco) || "—"}</span><small>{texto(r.at_equipe) ? `atendeu ${texto(r.at_equipe)}` : "sem atendimento"}</small></td>
      </>}

      {(modo === "decisao" || modo === "visao" || modo === "ativos" || modo === "regras" || modo === "bases") && <>
        <td><b className={`pill ${fatoClasse(texto(r.fato))}`}>{FATO_ROTULO[texto(r.fato)] || texto(r.fato)}</b><span>{texto(r.oc_num) ? `ocorrência ${texto(r.oc_num)}` : "sem ocorrência"}</span><small>{texto(r.ressalvas)}</small></td>
        <td><strong>{LEITURA_ROTULO[texto(r.leitura)] || "—"}</strong><span>{texto(r.categoria_texto)}</span><small>{texto(r.categoria_texto) !== texto(r.categoria_gravada) ? `gravada como ${texto(r.categoria_gravada)}` : ""}</small></td>
        <td><p className="clip">{texto(r.motivo_decisao)}</p></td>
      </>}

      {/* A coluna mostrava sempre a decisão da regra, e a classificação do dono ficava numa
          coluna ao lado — duas verdades no mesmo lugar, sem dizer qual vale. Quando ele bate o
          martelo, o martelo aparece aqui; a decisão do fluxo desce para a linha de baixo, em
          cinza, para nunca sumir. */}
      <td>{meu
        ? <><b className={`pill ${meuTom(meu)}`}>{meuRotulo(meu)}</b>
            <span className="decisao-fluxo">o fluxo dizia {texto(r.decisao).toLowerCase()}</span></>
        : <><b className={`pill ${decisaoClasse(texto(r.decisao))}`}>{texto(r.decisao)}</b>
            {r.mudou_na_revisao === "SIM" ? <span className="expurgo-tag">mudou na revisão</span> : null}</>}
        {/* Onde o caso parou, não por quê — são perguntas diferentes e a cascata só respondia a
            segunda. O degrau numerado responde de relance, e a distância entre "parou na 1" e
            "parou na 4" é a distância entre não ter prova nenhuma e ter prova com ressalva. */}
        <span className="etapa-flag" title={texto(r.etapa_rotulo)}>{r.etapa_num === 5 ? "✓ saiu pela ponta" : r.etapa_num === 0 ? "não entrou na esteira" : `parou na etapa ${texto(r.etapa_num)}`}</span>
      </td>
      {/* Nas abas de insight a última coluna não classifica: mostra o que a aba está discutindo.
          Ordem dele — "ao invés de trazer classificações nessa parte da listagem traga o valor
          da obra e potência do trafo". E tem efeito de usabilidade: no celular a coluna de
          botões é a que fica debaixo do polegar depois de arrastar a tabela para o lado, e o
          toque que devia abrir o dossiê acabava classificando o caso. */}
      {modo === "insight_garantia"
        ? <td className="col-obra">
            <strong>{ficha?.pot_retirada || texto(r.pot_ret) || "—"} → {ficha?.pot_instalada || texto(r.pot_inst) || "—"} kVA</strong>
            <span>{ficha?.reformado && ficha.reformado !== "NÃO É REFORMADO" ? `reformado por ${ficha.reformado}` : "não é reformado"}</span>
            <small>{ficha?.ocorrencias_12m ? `${ficha.ocorrencias_12m} ocorrência(s) em 12 meses` : ""}{ficha?.via ? ` · casou por ${ficha.via}` : ""}</small>
          </td>
        : modo === "insight_valor"
        ? <td className="col-obra">
            <strong>{r.obra_realizado ? `R$ ${Math.round(Number(r.obra_realizado)).toLocaleString("pt-BR")}` : "sem valor"}
              {distancia > 0 ? <b className={`fora-marca ${foraMarca}`}>{foraMarca === "abaixo" ? "−" : "+"}R$ {Math.round(distancia).toLocaleString("pt-BR")}</b> : null}</strong>
            <span>{potencia?.kva ? `${String(potencia.kva).replace(".", ",")} kVA · ${potencia.fonte}` : "nem a OS nem a SS dizem a potência"}</span>
            <small>campo: {texto(r.pot_ret) || "—"} → {texto(r.pot_inst) || "—"} kVA{r.trafos_material ? ` · ${texto(r.trafos_material)} no material` : ""}</small>
          </td>
        : <td className="col-classificar" onClick={(e) => e.stopPropagation()}>
            <div className="classificar-linha">{CLASSES_CURTAS.map(([id, curto, tom]) => <button key={id} type="button"
              title={id}
              className={classificacoes[texto(r.ss)]?.classe === id ? `marcado ${tom}` : tom}
              onClick={() => aoClassificar(texto(r.ss), id)}>{curto}</button>)}</div>
            {classificacoes[texto(r.ss)] ? <span>{classificacoes[texto(r.ss)].classe.toLowerCase()}</span> : null}
          </td>}
    </tr>;
    })}</tbody>
  </table></div>;
}

/* ------------------------------------------------------------------ tela */

export default function Page() {
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const [revisao, setRevisao] = useState<Revisao | null>(null);
  /* A ficha do equipamento retirado — série, tombamento, fabricante e data de fabricação — não
     está no fluxo: mora na aba COLETA do arquivo de SS, que é o registro de quem foi ao poste.
     Sem ela não dá para perguntar há quanto tempo o transformador tinha sido fabricado quando
     queimou. gerar_coleta.py extrai e casa por ocorrência, obra ou código do ativo. */
  const [coleta, setColeta] = useState<Record<string, ColetaItem>>({});
  /* Quantos transformadores cada obra pagou de fato. Vem do export do SIAGO, deduplicado e
     contado por quantidade realizada — não por linha. gerar_material_obra.py explica por quê. */
  const [material, setMaterial] = useState<Record<string, MaterialObra>>({});
  /* Os passos e as manobras de cada ocorrência, e o papel do ativo em cada passo. É a leitura
     que faltava para entender uma interrupção: quem abriu, quem ficou sem energia, o que foi
     fechado para devolver e se voltou por onde caiu. gerar_passos.py explica os campos. */
  const [passos, setPassos] = useState<{ por_oc: Record<string, Passo[]>; por_ss: Record<string, PassosSS> }>({ por_oc: {}, por_ss: {} });
  /* OS TEMPOS REAIS DO TMAE. Os campos at_ini e at_fim do fluxo NÃO são a hora da equipe: são a
     janela da ocorrência copiada — em 1.039 das 1.160 com atendimento, at_ini é idêntico a
     oc_ini. Enquanto a régua do TMAE foi desenhada com eles, ela mostrava a barra da Crítica
     noutra cor, e dizer "o atendimento cabe dentro da ocorrência" era quase tautologia.
     Estes vêm da base do TMAE: quando a equipe saiu, quando chegou e quando concluiu. */
  const [tmae, setTmae] = useState<Record<string, TmaeTempo>>({});
  /* FURTO, ABALROAMENTO E DANO DE TERCEIRO — o que cada base diz, campo a campo. A pergunta
     dele: "além das descrições da obra tem mais algum outro campo que confirma isso?". Tem
     seis, em quatro bases, e o mais forte deles é o PROVÁVEL MOTIVO DO DEFEITO, formulário que
     a equipe preenche no poste. gerar_terceiros.py explica cada um. */
  /* AS MEDIÇÕES DE ATERRAMENTO, do formulário que a equipe preenche no poste. Seis colunas
     que ninguém tinha aberto: três hastes antes do serviço, três depois, mais melhoria feita e
     aterramento conectado ao tanque. Zero é NÃO PREENCHIDO, ordem dele — resistência zero não
     existe em campo. gerar_aterramento.py explica por que vale a pior das três hastes. */
  const [aterr, setAterr] = useState<Record<string, Aterramento>>({});
  const [terceiros, setTerceiros] = useState<Record<string, { n: number; fontes: { campo: string; valor: string }[] }>>({});
  const [recorteRev, setRecorteRev] = useState<string>("todos");
  /* O botão que ele pediu na aba do aterramento: ver as faixas pela medição de ANTES do
     serviço (o estado em que o transformador queimou) ou pela de DEPOIS (o ponto já mexido).
     Ele manda no gráfico, nos chips e na tabela ao mesmo tempo. */
  const [terraQuando, setTerraQuando] = useState<"antes" | "depois">("antes");
  const [modulo, setModulo] = useState<Modulo>("visao");
  /* A OFICINA — a área escondida atrás do T da marca. Não é outro site nem outra rota: é a
     mesma aplicação com outro menu. Por isso a primeira aba dela é o MESMO módulo da tela de
     queimados e avariados, e não uma cópia do componente: mesmo dado, mesmas classificações,
     mesmo dossiê. Sincronizada por construção, não por sincronização — o que se marca de um
     lado já está marcado do outro porque é o mesmo estado.
     Ela mora só na memória: não entra no endereço, não fica no localStorage, não aparece em
     menu nenhum. Um F5 devolve o site normal. Escondida quer dizer isso; se um dia precisar
     ser mandada por link, aí sim vira rota — e deixa de ser escondida. */
  const [oficina, setOficina] = useState(false);
  // Este useState mora aqui e não junto da função que o usa, lá embaixo: entre um e outro há um
  // `return` antecipado para o estado de carregamento, e hook declarado depois de um return
  // condicional quebra a ordem dos hooks — React #310, tela em branco. Foi o que aconteceu.
  const [exportado, setExportado] = useState("");
  const [busca, setBusca] = useState("");
  const [recorte, setRecorte] = useState<{ id: string; rotulo: string } | null>(null);
  const [aberto, setAberto] = useState<Registro | null>(null);
  const [abaDossie, setAbaDossie] = useState("consolidado");
  /* As 31 categorias de exclusão viviam abertas dentro do dossiê. No computador passava; no
     celular ocupavam mais que uma tela inteira e empurravam tudo o que interessa para baixo —
     ele descreveu como "tá foda". Agora ficam atrás de um botão, e só aparecem quando ele diz
     que quer tirar o caso do indicador. Fecham sozinhas ao escolher e ao trocar de SS. */
  const [motivosAbertos, setMotivosAbertos] = useState(false);
  /* A margem deixa de ser decisão minha e vira botão dele. De 250 em 250 até 1.500, como pediu:
     em R$ 250 a régua quase não filtra e em R$ 1.500 ela só deixa passar diferença que se
     defende em voz alta. Trocar refaz a conta na hora, sem recarregar nada. */
  const [margem, setMargem] = useState(1500);
  /* CARREGAMENTO QUE FALA. O fluxo é o único arquivo sem o qual não há tela, e o catch dele
     engolia a falha: em vez de erro aparecia "Carregando as 1.510 solicitações…" para sempre.
     Sinal ruim, rede caindo, ou a janela de segundos em que o Pages troca os arquivos depois de
     uma publicação — em qualquer um deles o site parecia fora do ar, e não estava. Agora a
     falha tem nome, botão de tentar de novo, e a demora tem aviso. */
  const [erroCarga, setErroCarga] = useState("");
  const [demorando, setDemorando] = useState(false);
  const [ativo, setAtivo] = useState("");
  // A classificação do analista mora no navegador. Não sobrescreve a decisão do fluxo:
  // fica ao lado dela, com quem marcou e quando, para virar decisão oficial depois.
  const [classificacao, setClassificacao] = useState<Record<string, { classe: string; quem: string; quando: string }>>({});
  const [janela, setJanela] = useState(24);
  // Quantas marcações ainda não entraram no banco. Enquanto isso era zero por definição —
  // escrita cega, erro engolido — o número mentia dizendo nada.
  const [pendentes, setPendentes] = useState(0);

  /* O ESPELHO NO BANCO — por que ele parou de ser cego.
     A escrita anterior não conferia a resposta, e estava falhando em TODAS: `classificar`
     gravava a hora em UTC e `espelhar` relia essa mesma string como se fosse Brasília, então
     cada martelo chegava ao banco três horas no futuro; a regra da tabela recusa qualquer
     marcado_em acima de agora + 1h, devolvia 401, e o `.catch(() => {})` engolia. Trinta e
     poucas linhas no banco, todas inseridas à mão, e nenhuma do navegador.
     Agora: a hora local e o instante andam separados — a string é para ler e comparar, o
     instante é para gravar — e o que não entra fica numa fila aqui mesmo, tentada de novo a
     cada carga e a cada novo martelo. Silêncio deixa de significar sucesso. */
  const SUPA = "https://uabpevnjfcwidbjscowq.supabase.co";
  const SUPA_KEY = "sb_publishable_SHH7EV0MT5grOTdCFM-V-w_FqPrtzPh";
  const FILA = "fluxo-1510-pendentes";
  type Marca = { ss: string; classe: string; marcado_em: string };

  const enviar = async (linha: Marca) => {
    const r = await fetch(`${SUPA}/rest/v1/trafo_classificacao`, {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({ ...linha, quem: "análise local", origem: "site" }),
    });
    if (!r.ok) throw new Error(String(r.status));
  };

  const drenar = async (novas: Marca[] = []) => {
    let fila: Marca[] = [];
    try { fila = JSON.parse(localStorage.getItem(FILA) || "[]"); } catch { fila = []; }
    const todas = [...fila, ...novas];
    if (!todas.length) { setPendentes(0); return; }
    const sobrou: Marca[] = [];
    for (const linha of todas) {
      try { await enviar(linha); } catch { sobrou.push(linha); }
    }
    localStorage.setItem(FILA, JSON.stringify(sobrou));
    setPendentes(sobrou.length);
  };

  const carregarFluxo = () => {
    setErroCarga("");
    setDemorando(false);
    fetch(assetUrl("fluxo-1510.json"))
      .then((r) => {
        if (!r.ok) throw new Error(`o servidor respondeu ${r.status}`);
        return r.json();
      })
      .then(setFluxo)
      .catch((e) => { setFluxo(null); setErroCarga(String(e?.message || e)); });
  };

  useEffect(() => {
    carregarFluxo();
    // 15 segundos sem resposta já é tempo de dizer alguma coisa, em vez de deixar girando
    const t = setTimeout(() => setDemorando(true), 15000);
    fetch(assetUrl("metodo.json")).then((r) => r.json()).then(setMetodo).catch(() => setMetodo(null));
    void t;
    fetch(assetUrl("revisao.json")).then((r) => r.json()).then(setRevisao).catch(() => setRevisao(null));
    fetch(assetUrl("coleta-ativos.json")).then((r) => r.json())
      .then((d) => setColeta(d?.por_ss || {})).catch(() => setColeta({}));
    fetch(assetUrl("material-obra.json")).then((r) => r.json())
      .then((d) => setMaterial(d?.por_obra || {})).catch(() => setMaterial({}));
    fetch(assetUrl("tmae-tempos.json")).then((r) => r.json())
      .then((d) => setTmae(d?.por_ss || {})).catch(() => setTmae({}));
    fetch(assetUrl("aterramento.json")).then((r) => r.json())
      .then((d) => setAterr(d?.por_ss || {})).catch(() => setAterr({}));
    fetch(assetUrl("terceiros.json")).then((r) => r.json())
      .then((d) => setTerceiros(d?.por_ss || {})).catch(() => setTerceiros({}));
    fetch(assetUrl("passos-critica.json")).then((r) => r.json())
      .then((d) => setPassos({ por_oc: d?.por_oc || {}, por_ss: d?.por_ss || {} }))
      .catch(() => setPassos({ por_oc: {}, por_ss: {} }));
    const salvo = localStorage.getItem("fluxo-1510-classificacao");
    const local: Record<string, { classe: string; quem: string; quando: string }> =
      salvo ? JSON.parse(salvo) : {};
    if (salvo) Promise.resolve().then(() => setClassificacao(local));
    /* E o que já está no banco entra por cima do que for mais antigo. É isto que permite trocar
       de máquina no meio do trabalho: o navegador novo chega vazio e se enche do que o outro
       gravou. O mais recente vence dos dois lados — nem o banco apaga uma decisão local mais
       nova, nem o local ignora uma decisão feita noutra máquina. A view devolve só a última
       linha de cada SS, então o histórico fica no banco sem poluir a tela. */
    fetch("https://uabpevnjfcwidbjscowq.supabase.co/rest/v1/trafo_classificacao_atual?select=ss,classe,quem,marcado_em", {
      headers: {
        "apikey": "sb_publishable_SHH7EV0MT5grOTdCFM-V-w_FqPrtzPh",
        "Authorization": "Bearer sb_publishable_SHH7EV0MT5grOTdCFM-V-w_FqPrtzPh",
      },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((linhas: Array<{ ss: string; classe: string; quem: string; marcado_em: string }>) => {
        const doBanco = Array.isArray(linhas) ? linhas : [];
        const juntos = { ...local };
        let entraram = 0;
        doBanco.forEach((l) => {
          const quando = new Date(l.marcado_em).toLocaleString("sv-SE").slice(0, 16);
          const atual = juntos[l.ss];
          if (!atual || atual.quando < quando) {
            juntos[l.ss] = { classe: l.classe, quem: l.quem || "análise local", quando };
            entraram += 1;
          }
        });
        if (entraram) {
          setClassificacao(juntos);
          localStorage.setItem("fluxo-1510-classificacao", JSON.stringify(juntos));
          setExportado(`${entraram} classificações recuperadas do banco`);
          setTimeout(() => setExportado(""), 8000);
        }
        /* E o caminho de volta, que faltava: tudo que está neste navegador e NÃO está no banco
           com a mesma classe é enfileirado agora. É o que resgata uma noite inteira de martelo
           que nunca chegou lá por causa do erro de fuso. A hora vem do próprio registro local;
           se ela for futura — o que acontece justamente com as marcações gravadas pelo código
           velho — vale agora, porque marcado_em no futuro é o que a tabela recusa. */
        const noBanco = new Map(doBanco.map((l) => [l.ss, l.classe]));
        const agora = new Date();
        const faltando: Marca[] = Object.entries(local)
          .filter(([ss, c]) => noBanco.get(ss) !== c.classe)
          .map(([ss, c]) => {
            const bruto = String(c.quando || "").replace(" ", "T");
            // a hora local é a leitura certa; se der futuro, é registro do código velho, que
            // gravava em UTC; se ainda assim der futuro, vale agora — o banco recusa futuro
            let t = new Date(bruto);
            if (Number.isNaN(t.getTime()) || t > agora) t = new Date(`${bruto}Z`);
            if (Number.isNaN(t.getTime()) || t > agora) t = agora;
            return { ss, classe: c.classe, marcado_em: t.toISOString() };
          });
        void drenar(faltando);
      })
      .catch(() => { void drenar(); });
    return () => clearTimeout(t);
  }, []);

  const registros = fluxo?.registros ?? [];

  /* ONDE O CASO MORA — a esteira arquiva, a sua classificação rearquiva.
     A decisão do fluxo continua gravada e visível no dossiê: nada é apagado, e a coluna
     "Decisão" da tabela continua mostrando o que a regra decidiu. O que muda é a aba em que o
     caso aparece. Quem bate o martelo de "queimado" num caso parado na primeira peneira está
     dizendo que aquele caso já tem resposta — deixá-lo na fila de pendências faz a fila mentir
     sobre o que ainda falta ler. Vale igual para excluído e para preventivo. */
  const arquivo = (r: Registro): string => {
    const c = classificacao[texto(r.ss)]?.classe;
    if (c === "QUEIMADO" || c === "AVARIADO") return "SAÍDA";
    // Preventivo é exclusão. Ele mesmo fechou isso lendo "trafo aberto pela equipe para
    // realizar ação preventiva": se estava em ação preventiva, sai do indicador — a aba de
    // preventivos continua existindo, mas como recorte das exclusões e não como terceiro
    // destino, senão o mesmo caso ocuparia dois lugares no funil.
    if (c === "EXCLUIDO" || c === "FURTADO" || c === "PREVENTIVO") return "EXCLUÍDA";
    // e qualquer categoria de exclusão marcada à mão faz o mesmo — é o que o botão promete
    if (ehExclusaoManual(c)) return "EXCLUÍDA";
    return texto(r.cascata);
  };
  const rearquivado = (r: Registro) => arquivo(r) !== texto(r.cascata);

  /* A categoria de uma exclusão vem da regra ou do seu martelo — quem marca FURTADO está
     dizendo furto, quem marca PREVENTIVO está dizendo troca sem defeito. Sem isto o martelo
     caía todo num balde só chamado "marcada por você", e a aba respondia quantas saíram sem
     responder por quê, que é a pergunta de quem audita. */
  const gatilhoDe = (r: Registro): string => {
    const c = classificacao[texto(r.ss)]?.classe;
    if (c === "FURTADO") return "furto";
    if (c === "PREVENTIVO") return "preventivo";
    // o martelo com categoria vence a regra: foi ele quem escolheu o nome
    if (ehExclusaoManual(c)) return gatilhoDaClasse(c);
    if (c === "EXCLUIDO") return texto(r.expurgo_gatilho) || "manual";
    return texto(r.expurgo_gatilho);
  };

  /* QUEM PAROU NA PRIMEIRA PENEIRA. Enquanto a falta de interrupção retinha, a resposta era a
     cascata. Depois que ela passou a excluir, esta aba esvaziou e passou a dizer 0 — quando o
     que ela deve mostrar é justamente quem não passou: quem não tem interrupção na janela nem
     nas 24 horas seguintes, e quem não aparece na Crítica em papel nenhum. O caso está fora do
     indicador, mas continua sendo caso que parou aqui. */
  const PAROU_NA_1 = ["fora_da_janela", "sem_interrupcao", "sem_fato"];
  const parouNaInterrupcao = (r: Registro): boolean =>
    arquivo(r) === "RETIDO — SEM INTERRUPÇÃO NA JANELA"
    || (arquivo(r) === "EXCLUÍDA" && PAROU_NA_1.includes(gatilhoDe(r)));

  const categoriaDe = (r: Registro): string => {
    const g = gatilhoDe(r);
    return CATEGORIA_FUNDIDA[g] || g;
  };

  /* AS CAUSAS, RANQUEADAS UMA VEZ SÓ. A cascata mostra as cinco maiores e junta o resto numa
     linha; o recorte que essa linha abre precisa usar exatamente o mesmo corte, senão o número
     clicado abre uma lista de outro tamanho — foi o que aconteceu na primeira tentativa, com a
     linha dizendo 33 e a lista trazendo 103. Uma conta, dois consumidores. */
  const causasRank = Object.entries(registros
    .filter((r) => arquivo(r) === "EXCLUÍDA" && !parouNaInterrupcao(r))
    .reduce<Record<string, number>>((a, r) => {
      const k = categoriaDe(r) || "manual"; a[k] = (a[k] || 0) + 1; return a;
    }, {})).sort((a, b) => b[1] - a[1]);
  const causasTop = new Set(causasRank.slice(0, 5).map(([k]) => k));

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

  /* A POTÊNCIA DE UM CASO, em cascata, na ordem que ele deu: primeiro o trafo instalado escrito
     na OS; se a OS não nomear o instalado mas citar uma potência só, vale ela; e só quando a OS
     não disser nada é que a SS entra. A fonte volta junto com o número porque quem confere
     precisa saber de onde veio — e porque as três não valem o mesmo. */
  const potenciaDoCaso = (r: Registro): { kva: number | null; fonte: string } => {
    const inst = kvaInstaladoNaOS(texto(r.desc_os));
    if (inst !== null) return { kva: inst, fonte: "OS · trafo instalado" };
    const os = kvaEscrito(texto(r.desc_os));
    if (os !== null) return { kva: os, fonte: "OS · potência única" };
    const ss = kvaEscrito(texto(r.desc_ss));
    if (ss !== null) return { kva: ss, fonte: "SS" };
    return { kva: null, fonte: "" };
  };

  /* A FAIXA DO PRATICADO, potência por potência. Nenhum valor aqui é digitado: a faixa de cada
     potência sai das próprias solicitações que contam, agrupadas pela potência que a SS
     escreveu.
     A faixa é a cerca de Tukey — do primeiro quartil menos uma vez e meia a amplitude
     interquartil até o terceiro quartil mais o mesmo. A primeira versão desta tela usava p10 a
     p90 e estava errada por construção: percentil fixo marca 20% dos casos sempre, então ela
     "achava" 188 achados numa base perfeita. A cerca não tem cota: numa potência em que todo
     mundo custa parecido ela não marca ninguém, e é isso que uma régua de exceção precisa
     poder fazer.
     Potência com menos de oito casos não vira faixa: oito é pouco para dizer o que é praticado,
     e uma faixa fraca acusaria caso bom. Quem cai nessas potências aparece como não julgável,
     e não como achado. */
  const faixaValor = useMemo(() => {
    const porKva = new Map<number, number[]>();
    for (const r of registros) {
      if (arquivo(r) !== "SAÍDA") continue;
      const k = potenciaDoCaso(r).kva;
      const v = Number(r.obra_realizado || 0);
      if (!k || !(v > 0)) continue;
      if (!porKva.has(k)) porKva.set(k, []);
      (porKva.get(k) as number[]).push(v);
    }
    const pct = (v: number[], p: number) => {
      const i = ((v.length - 1) * p) / 100;
      const b = Math.floor(i);
      return v[b] + (v[Math.min(b + 1, v.length - 1)] - v[b]) * (i - b);
    };
    const faixas = new Map<number, { n: number; p10: number; p50: number; p90: number }>();
    for (const [k, arr] of porKva) {
      arr.sort((a, b) => a - b);
      if (arr.length < 8) continue;
      const q1 = pct(arr, 25), q3 = pct(arr, 75), iqr = q3 - q1;
      faixas.set(k, { n: arr.length, p10: Math.max(0, q1 - 1.5 * iqr), p50: pct(arr, 50), p90: q3 + 1.5 * iqr });
    }
    return faixas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, classificacao]);

  /* A SS DENTRO DA CRÍTICA — o filtro que ele diz ser o que importa, e ele tem razão: o
     atendimento é marcador e pode faltar sem prejuízo, mas a SS ter nascido COM O CLIENTE SEM
     ENERGIA é a prova de que o evento e o pedido são a mesma coisa. Aqui não entra tolerância
     nenhuma: ou a abertura cai entre o primeiro passo aberto e o último fechado, ou não cai. */
  const ssDentroDaCritica = (r: Registro) => {
    const ab = emMs(r.abertura), oi = emMs(r.oc_ini), of = emMs(r.oc_fim);
    return Boolean(ab && oi && of) && (oi as number) <= (ab as number) && (ab as number) <= (of as number);
  };
  const ssNaTolerancia = (r: Registro) => {
    const ab = emMs(r.abertura), oi = emMs(r.oc_ini), of = emMs(r.oc_fim);
    if (!(ab && oi && of) || ssDentroDaCritica(r)) return false;
    return (ab as number) >= (oi as number) - H_MS && (ab as number) <= (of as number) + 24 * H_MS;
  };
  /* A pergunta do gráfico da aba Tempos, em quatro caixas que somam o total: a abertura da SS
     caiu DENTRO do intervalo da ocorrência, ANTES dele, DEPOIS dele — ou não há ocorrência. */
  const posNaCritica = (r: Registro): "dentro" | "antes" | "depois" | "sem" => {
    const ab = emMs(r.abertura), oi = emMs(r.oc_ini), of = emMs(r.oc_fim);
    if (!(ab && oi && of)) return "sem";
    if ((ab as number) < (oi as number)) return "antes";
    if ((ab as number) > (of as number)) return "depois";
    return "dentro";
  };

  /* A FILA DE REVISÃO DETALHADA. Ordem dele, depois de ler uma SS na mão: "defeito interno e tap
     submerso deveria ir para sobrecarga; tem mais alguma assim?". Tem — e o jeito de achá-las é
     ler o TEXTO de quem esteve no poste e comparar com a subcausa que a Crítica gravou.

     Nada aqui move ninguém. É fila de leitura: cada caso chega com o motivo e o trecho que o
     denunciou, para ele bater o martelo caso a caso na aba de classificação.

     O TAP EXIGE CUIDADO. A OS traz "POS. DO TAP; 3º" como campo de formulário em 588 das 1.305 —
     procurar a palavra solta traria quase todo mundo. Só conta quando o tap aparece com defeito:
     submerso, queimado, danificado, errado. */
  const TXT_TAP = /TAP\s+(SUBMERS|QUEIMAD|DANIFICAD|COM DEFEITO|SOLTO|ERRAD)|(SUBMERS\w*)\s*(O\s*)?TAP|COMUTADOR/i;
  const TXT_INTERNO = /DEFEITO INTERNO|PROBLEMA INTERNO|CURTO INTERNO/i;
  const TXT_CARGA = /SOBRECARG|SOBRE CARGA|SOBRECARREG|CARREGAMENTO (ALTO|ELEVADO)|AUMENTO DE CARGA/i;
  const TXT_TENSAO = /TENS[AÃ]O (MUITO )?(ALTA|BAIXA)|SUBTENS|SOBRETENS|N[AÃ]O MANDA\w* TENS[AÃ]O/i;
  const textoDoCaso = (r: Registro) => `${texto(r.desc_ss)} ${texto(r.desc_os)}`;
  const revisaoCarga = (r: Registro) => {
    if (arquivo(r) !== "SAÍDA") return null;
    const s = textoDoCaso(r);
    const marcas: string[] = [];
    if (TXT_TAP.test(s)) marcas.push("tap com defeito");
    if (TXT_INTERNO.test(s)) marcas.push("defeito interno");
    if (TXT_CARGA.test(s)) marcas.push("sobrecarga escrita no texto");
    if (TXT_TENSAO.test(s)) marcas.push("tensão fora do normal");
    if (!marcas.length) return null;
    // quando a própria Crítica já disse sobrecarga, não há o que rever: as duas vozes concordam
    const jaBate = /SOBRECARGA/i.test(texto(r.oc_sub));
    return { marcas, jaBate, trecho: (s.match(new RegExp(`.{0,60}(${[TXT_TAP, TXT_INTERNO, TXT_CARGA, TXT_TENSAO].map((x) => x.source).join("|")}).{0,80}`, "i")) || [""])[0].trim() };
  };
  /* Ordem dele: "na aba detalhada eu só quero as do TAP por enquanto". Os outros motivos que a
     régua sabe marcar — natureza divergente, bandeira do interrompido, zero do registro, data
     impossível — continuam vivos nos seus lugares (aba de classificação, aba Tempos, aba
     Interrupção) e voltam para cá quando ele mandar. Aqui fica só o bloco que ele abriu. */
  /* FURTO, ABALROAMENTO E DANO DE TERCEIRO. Ordem dele: "traga esses 5 casos". São os que têm
     TRÊS OU MAIS campos independentes dizendo a mesma coisa — de 16 que aparecem em alguma
     base dentro dos 1.305. Uma fonte sozinha não condena: o formulário pode ter sido preenchido
     no chute e o carimbo da obra é escolha contábil. Três ou mais é outra conversa. */
  const MIN_FONTES = 3;
  const terceiroDe = (r: Registro) => terceiros[texto(r.ss)];

  /* A FAIXA DO ATERRAMENTO. Vale a PIOR das três hastes: a corrente de descarga procura o pior
     caminho disponível, e é ele que define o que o transformador aguenta. Sem medição — vazio
     ou zero — não vira "bom": vira NÃO PREENCHIDO, com nome próprio na tela.
     E vale a medição de ANTES do serviço, não a de depois: ele corrigiu na hora certa. A de
     depois é o ponto já consertado; a de antes é o mundo em que o transformador queimou. Quem
     só tem a posterior fica numa faixa própria, porque contá-la como estado original seria
     apresentar a correção como se fosse a condição que matou o equipamento. */
  /* REINCIDÊNCIA. Pedido dele: os casos em que o MESMO transformador voltou a queimar, e
     quanto tempo depois. A conta é simples e por isso mora aqui, sem arquivo novo: agrupa as
     1.305 pelo código do ativo, ordena pela abertura e mede o intervalo entre uma troca e a
     seguinte. Cada par vira uma linha — a segunda SS carrega quantos dias se passaram desde a
     anterior, porque é ela que denuncia. Um trafo trocado três vezes gera dois pares. */
  const reincidencia = useMemo(() => {
    const porTrafo = new Map<string, Registro[]>();
    for (const r of registros) {
      if (arquivo(r) !== "SAÍDA") continue;
      const cod = texto(r.trafo);
      if (!cod) continue;
      (porTrafo.get(cod) || porTrafo.set(cod, []).get(cod)!).push(r);
    }
    const mapa: Record<string, { dias: number; anterior: Registro; ordem: number; total: number }> = {};
    porTrafo.forEach((lista) => {
      if (lista.length < 2) return;
      const ord = [...lista].sort((a, b) => (emMs(a.abertura) || 0) - (emMs(b.abertura) || 0));
      ord.forEach((r, i) => {
        if (!i) return;
        const a = emMs(ord[i - 1].abertura), b = emMs(r.abertura);
        if (a && b) mapa[texto(r.ss)] = { dias: Math.round((b - a) / (24 * H_MS)), anterior: ord[i - 1], ordem: i + 1, total: ord.length };
      });
    });
    return mapa;
  }, [registros, classificacao]);
  const reincDe = (r: Registro) => reincidencia[texto(r.ss)];

  const LIMITE_TERRA = 25, GRAVE_TERRA = 100;
  const terraDe = (r: Registro) => aterr[texto(r.ss)];
  const piorTerra = (r: Registro) => {
    const a = terraDe(r);
    if (!a) return null;
    return terraQuando === "antes" ? a.pior : a.pior_depois;
  };
  const faixaTerra = (r: Registro): "sem" | "so_depois" | "bom" | "limite" | "acima" | "grave" => {
    const a = terraDe(r);
    if (!a) return "sem";
    const v = piorTerra(r);
    // tem o número do OUTRO momento, não deste: faixa própria, nunca contado como bom
    if (v == null) return (terraQuando === "antes" ? a.depois.length : a.antes.length) ? "so_depois" : "sem";
    if (v <= 10) return "bom";
    if (v <= LIMITE_TERRA) return "limite";
    if (v <= GRAVE_TERRA) return "acima";
    return "grave";
  };
  const OUTRO_MOMENTO = terraQuando === "antes" ? "Só mediram DEPOIS do serviço" : "Só mediram ANTES do serviço";
  const fezMelhoria = (r: Registro) => texto(terraDe(r)?.melhoria).toUpperCase().startsWith("S");
  const paraRever = (r: Registro) => {
    const fila: { id: string; motivo: string; detalhe: string }[] = [];
    const c = revisaoCarga(r);
    if (c && !c.jaBate) fila.push({ id: "carga", motivo: `Texto diz ${c.marcas.join(" · ")} — a Crítica gravou "${texto(r.oc_sub).toLowerCase() || "nada"}"`, detalhe: c.trecho });
    const ter = terceiroDe(r);
    if (ter && ter.n >= MIN_FONTES) fila.push({
      id: "terceiro",
      motivo: `Furto, abalroamento ou dano de terceiro — ${ter.n} campos confirmam`,
      detalhe: ter.fontes.map((f) => `${f.campo}: ${f.valor}`).join(" · "),
    });
    return fila;
  };

  /* EXATAMENTE DENTRO. Ordem dele: sem a faixa de uma hora antes e vinte e quatro depois — a SS
     e o atendimento têm de caber INTEIROS no intervalo da ocorrência, do primeiro passo aberto
     ao último fechado. É a leitura mais dura que existe aqui: não é a SS encostar na janela, é
     o serviço inteiro ter acontecido enquanto o cliente estava sem energia. */
  const tresBases = (r: Registro) =>
    Boolean(emMs(r.oc_ini) && emMs(r.oc_fim) && emMs(r.at_ini) && emMs(r.at_fim)
            && emMs(r.abertura) && emMs(r.termino));
  const exatamenteDentro = (r: Registro) => {
    if (!tresBases(r)) return { ss: false, at: false, ambos: false };
    const oi = emMs(r.oc_ini) as number, of = emMs(r.oc_fim) as number;
    const ab = emMs(r.abertura) as number, te = emMs(r.termino) as number;
    const ai = emMs(r.at_ini) as number, af = emMs(r.at_fim) as number;
    const ss = oi <= ab && te <= of, at = oi <= ai && af <= of;
    return { ss, at, ambos: ss && at };
  };

  /* OS TEMPOS DE UM CASO. Tudo em horas, do mesmo relógio, para as perguntas de ordem: o
     atendimento veio antes da SS? depois de ela fechar? a SS fechou antes de abrir? */
  const tempos = (r: Registro) => {
    const ab = emMs(r.abertura), te = emMs(r.termino);
    const oi = emMs(r.oc_ini), ai = emMs(r.at_ini);
    return {
      ab, te, oi, ai,
      duracaoSS: ab && te ? (te - ab) / H_MS : null,
      atAntes: ab && ai ? ai < ab : false,
      atDepoisDoFim: te && ai ? ai > te : false,
      invertida: ab && te ? te < ab : false,
      semAt: !ai,
    };
  };

  /* QUEM DIVIDE O MESMO EVENTO. Dois índices, calculados só entre os que contam: quantas SS
     apontam para a mesma ocorrência da Crítica, e quantas para o mesmo atendimento do TMAE.
     Uma interrupção prova uma troca, não duas — quando duas SS carregam o mesmo número, uma
     das duas está apoiada em evento que não é dela. */
  const divideIndice = useMemo(() => {
    const oc = new Map<string, string[]>();
    const at = new Map<string, string[]>();
    for (const r of registros) {
      if (arquivo(r) !== "SAÍDA") continue;
      const ss = texto(r.ss);
      const o = texto(r.oc_num); if (o) oc.set(o, [...(oc.get(o) || []), ss]);
      const a = texto(r.at_num); if (a) at.set(a, [...(at.get(a) || []), ss]);
    }
    return { oc, at };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, classificacao]);
  const parceirasOc = (r: Registro) => (divideIndice.oc.get(texto(r.oc_num)) || []).filter((x) => x !== texto(r.ss));
  const parceirasAt = (r: Registro) => (divideIndice.at.get(texto(r.at_num)) || []).filter((x) => x !== texto(r.ss));

  /* OBRA × TRANSFORMADOR. A chave do material é o número da obra sem os zeros da frente, e a
     mesma obra pode atender mais de uma SS — é justamente o caso que se quer achar. */
  const obraDe = (r: Registro) => texto(r.obra).replace(/^0+/, "");
  const materialDa = (r: Registro): MaterialObra | undefined => material[obraDe(r)];
  const ssPorObra = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of registros) {
      if (arquivo(r) !== "SAÍDA") continue;
      const o = obraDe(r);
      if (o) m.set(o, (m.get(o) || 0) + 1);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, classificacao]);
  /* Seis estados, e cada um é uma conversa diferente com quem executou. */
  const estadoMaterial = (r: Registro): string | null => {
    if (arquivo(r) !== "SAÍDA") return null;
    const o = obraDe(r);
    if (!o) return "sem_obra";
    const m = materialDa(r);
    if (!m) return "fora_export";
    const n = ssPorObra.get(o) || 1;
    if (m.trafos === 0) return "sem_trafo";
    if (m.trafos > n) return "mais_trafos";
    if (n > m.trafos) return "mais_ss";
    return "bate";
  };

  /* A MARGEM. Ordem dele: "a diferença tem que ser expressiva, pelo menos 1.500 reais".
     Passar da cerca por trinta reais é ruído de arredondamento de obra, não achado — e uma
     lista com 38 linhas dessas some no meio de si mesma. Com a margem sobram 11, e cada uma
     tem uma diferença que se defende em voz alta. */
  const MARGEM = margem;
  /* Cinco respostas, e a diferença entre elas importa: "acima"/"abaixo" é achado; "borda" passa
     da cerca mas não chega à margem — não é achado e também não é normal, então tem lista
     própria em vez de sumir; "" é caso normal; e null é caso que esta régua não sabe julgar.
     Não julgável nunca é apresentado como suspeito. */
  const foraDaFaixa = (r: Registro): "acima" | "abaixo" | "borda" | "" | null => {
    if (arquivo(r) !== "SAÍDA") return null;
    const k = potenciaDoCaso(r).kva;
    const v = Number(r.obra_realizado || 0);
    const f = k ? faixaValor.get(k) : undefined;
    if (!k || !(v > 0) || !f) return null;
    if (v > f.p90) return v - f.p90 >= MARGEM ? "acima" : "borda";
    if (v < f.p10) return f.p10 - v >= MARGEM ? "abaixo" : "borda";
    return "";
  };
  /* Quanto o caso passa da cerca, em reais. É o número que ordena a lista e o que ele vai
     citar quando alguém perguntar por que este caso e não o vizinho. */
  const distanciaDaFaixa = (r: Registro): number => {
    const k = potenciaDoCaso(r).kva;
    const v = Number(r.obra_realizado || 0);
    const f = k ? faixaValor.get(k) : undefined;
    if (!k || !(v > 0) || !f) return 0;
    return v > f.p90 ? v - f.p90 : v < f.p10 ? f.p10 - v : 0;
  };

  const RECORTES: Record<Modulo, Array<{ id: string; rotulo: string; nota: string; teste: (r: Registro) => boolean }>> = {
    // A revisão não filtra registros da esteira: ela tem os próprios chips, montados a partir
    // das famílias de motivo do revisao.json. Fica vazio aqui de propósito.
    revisao: [],
    /* A aba de insight não move ninguém: ela só olha. Os chips são leituras do mesmo conjunto
       de queimados e avariados, e nenhum deles muda decisão, categoria ou conta. */
    insight_valor: [
      { id: "fora", rotulo: "Fora da faixa", nota: `O valor realizado da obra cai fora da cerca de Tukey da potência instalada, e por R$ ${br(margem)} ou mais — longe o bastante do que se pratica para não ser variação normal. Achado para olhar, não veredito: obra que cobre duas trocas sobe o valor com razão, e obra que só apropriou parte do custo desce.`, teste: (r) => { const f = foraDaFaixa(r); return f === "acima" || f === "abaixo"; } },
      { id: "acima", rotulo: "Custou acima do praticado", nota: "Acima da cerca superior da potência instalada. As três causas que a gente já viu: a obra pagou mais de um transformador, o material trouxe potência maior que a do texto, ou a obra levou serviço que não é a troca.", teste: (r) => foraDaFaixa(r) === "acima" },
      { id: "abaixo", rotulo: "Custou abaixo do praticado", nota: "Abaixo da cerca inferior da potência instalada. Aqui mora o caso que interessa mais: obra que custou menos do que o transformador daquela potência custa sozinho não comprova a troca que a SS pediu.", teste: (r) => foraDaFaixa(r) === "abaixo" },
      { id: "borda", rotulo: "Na borda — passa da cerca, mas por pouco", nota: `Passam da faixa praticada e não chegam à margem de R$ ${br(margem)}. Não entram como achado porque diferença de algumas centenas é ruído de arredondamento de obra, e uma lista cheia delas esconde as que importam. Ficam aqui em vez de sumirem: quem quiser conferir tem onde.`, teste: (r) => foraDaFaixa(r) === "borda" },
      { id: "dentro", rotulo: "Dentro da faixa", nota: "O valor da obra cabe no que se pratica para a potência instalada. É a maioria, e está aqui para o contraste — uma lista de achados sem a lista do normal não deixa ninguém medir o tamanho do achado.", teste: (r) => foraDaFaixa(r) === "" },
      /* Um recorte por potência, só entre os achados: é o que a barra do gráfico abre. Nasce da
         própria lista, então quando a margem muda as potências que sumiram somem daqui também. */
      ...[...new Set(registros.filter((r) => { const f = foraDaFaixa(r); return f === "acima" || f === "abaixo"; })
        .map((r) => potenciaDoCaso(r).kva))].filter((k): k is number => k !== null).sort((a, b) => a - b)
        .map((k) => ({
          id: `kva:${k}`,
          rotulo: `Fora da faixa · ${String(k).replace(".", ",")} kVA`,
          nota: `Os achados desta potência, com a margem que está na régua acima. Mudar a margem muda esta lista.`,
          teste: (r: Registro) => { const f = foraDaFaixa(r); return (f === "acima" || f === "abaixo") && potenciaDoCaso(r).kva === k; },
        })),
      { id: "nao_julgavel", rotulo: "A régua não julga", nota: "Casos que esta leitura não sabe julgar, e que por isso não entram como suspeita: nem a OS nem a SS dizem a potência, ou dizem duas e ficam ambíguas, ou a obra não tem valor realizado, ou a potência tem casos de menos para formar faixa. Estão à vista de propósito — régua que esconde o que não mede parece mais forte do que é.", teste: (r) => arquivo(r) === "SAÍDA" && foraDaFaixa(r) === null },
    ],
    /* Garantia: também só olha. A régua é o tempo entre a fabricação do equipamento RETIRADO e
       a abertura da SS — quanto o transformador viveu antes de falhar. */
    insight_garantia: [
      { id: "menos_ano", rotulo: "Falharam com menos de um ano", nota: "Entre a data de fabricação do transformador retirado e a abertura da SS passou menos de um ano. É o recorte que interessa a qualquer conversa de garantia — e o prazo, em contrato de fornecimento, costuma ser de 12 a 24 meses.", teste: (r) => { const c = coleta[texto(r.ss)]; return arquivo(r) === "SAÍDA" && c?.dias != null && c.dias < 365; } },
      { id: "um_dois", rotulo: "Entre um e dois anos", nota: "Passaram de um ano e não chegaram a dois. Entram se o contrato de fornecimento tiver prazo de 24 meses, que é a outra praxe de mercado.", teste: (r) => { const c = coleta[texto(r.ss)]; return arquivo(r) === "SAÍDA" && c?.dias != null && c.dias >= 365 && c.dias < 730; } },
      { id: "com_data", rotulo: "Todos com data confiável", nota: "Todos os casos em que a data de fabricação do retirado resiste à conferência, qualquer que seja a idade. É sobre este conjunto que as porcentagens fazem sentido.", teste: (r) => { const c = coleta[texto(r.ss)]; return arquivo(r) === "SAÍDA" && c?.dias != null; } },
      { id: "suja", rotulo: "Data de fabricação não confiável", nota: "A COLETA tem a data, mas ela não resiste: ou é posterior à abertura da SS — o equipamento teria nascido depois de queimar —, ou é idêntica à data da reforma, ou cai no mesmo ano do recorte a poucos dias da SS. Nesses o campo recebeu a data da coleta ou da reforma por cima da fabricação real. Ficam fora da conta de vida útil e à vista aqui: contá-los como “queimou em zero dia” multiplicaria o achado por mais de dois.", teste: (r) => { const c = coleta[texto(r.ss)]; return arquivo(r) === "SAÍDA" && Boolean(c?.suja); } },
      /* O filtro por fabricante estava quebrado: o gráfico jogava o nome na busca, e a busca
         varre os campos da SS — fabricante não é um deles, porque vem da COLETA. Agora cada
         fabricante é recorte de verdade, montado dos que aparecem entre os que falharam cedo. */
      ...[...new Set(registros.filter((r) => arquivo(r) === "SAÍDA" && (coleta[texto(r.ss)]?.dias ?? 1e9) < 365)
        .map((r) => coleta[texto(r.ss)]?.fabricante || "sem fabricante"))].sort()
        .map((f) => ({
          id: `fab:${f}`,
          rotulo: `Menos de um ano · ${f}`,
          nota: `Os que falharam antes de completar um ano e saíram de ${f}. A marca vem da ficha da COLETA, preenchida por quem retirou o equipamento do poste.`,
          teste: (r: Registro) => arquivo(r) === "SAÍDA" && (coleta[texto(r.ss)]?.dias ?? 1e9) < 365
            && (coleta[texto(r.ss)]?.fabricante || "sem fabricante") === f,
        })),
      { id: "sem_coleta", rotulo: "Sem ficha na COLETA", nota: "A aba COLETA não tem linha que case com esta SS — nem por ocorrência, nem por obra, nem por código do ativo. Sem ficha não há série, tombamento nem data de fabricação, e não há o que perguntar sobre garantia.", teste: (r) => arquivo(r) === "SAÍDA" && !coleta[texto(r.ss)] },
    ],
    /* Tempos: só olha. Cada recorte é uma pergunta de ordem entre as três bases. */
    insight_tempos: [
      { id: "ss_dentro", rotulo: "A SS nasceu com o cliente sem energia", nota: "A abertura da SS cai entre o primeiro passo aberto e o último fechado da ocorrência — sem tolerância nenhuma, nem a hora antes nem as 24 horas depois. É a prova mais direta de que o pedido e o apagão são o mesmo evento, e não depende de o TMAE existir.", teste: (r) => arquivo(r) === "SAÍDA" && ssDentroDaCritica(r) },
      { id: "ss_tolerancia", rotulo: "Entrou pela tolerância da janela", nota: "A abertura da SS não cai dentro do intervalo da ocorrência, mas cai na tolerância — até uma hora antes do primeiro passo ou até 24 horas depois do último. Continua casando pela régua da esteira; só não é o casamento mais forte.", teste: (r) => arquivo(r) === "SAÍDA" && ssNaTolerancia(r) },
      { id: "ss_antes_oc", rotulo: "Aberta ANTES de a interrupção começar", nota: "A ocorrência existe, mas a SS abriu antes do primeiro passo dela. Até uma hora, é a ordem normal do registro — o cliente liga, a SS nasce, a ocorrência é lançada minutos depois; mais que isso, vale ler o caso.", teste: (r) => arquivo(r) === "SAÍDA" && posNaCritica(r) === "antes" },
      { id: "ss_depois_oc", rotulo: "Aberta DEPOIS de a interrupção terminar", nota: "A SS abriu depois do último passo fechado da ocorrência — a energia já tinha voltado. Até 24 horas é a tolerância da esteira (a troca formalizada no dia seguinte); depois disso o caso entrou por contenção ou por veredito.", teste: (r) => arquivo(r) === "SAÍDA" && posNaCritica(r) === "depois" },
      { id: "ss_sem_oc", rotulo: "Não estão na Crítica", nota: "Não há ocorrência com intervalo para comparar com a abertura da SS. Entraram no indicador por outro caminho — contenção ou veredito — e a régua de tempos fica sem a faixa de cima.", teste: (r) => arquivo(r) === "SAÍDA" && posNaCritica(r) === "sem" },
      { id: "ss_fora_janela", rotulo: "A abertura não cai nem na tolerância", nota: "A SS nasceu fora do intervalo da ocorrência e fora da tolerância. Todos entraram por outro caminho: pela contenção (a ocorrência coube inteira dentro do serviço, que é a segunda régua) ou pelo veredito do dono. Nenhum entrou por distração da régua.", teste: (r) => arquivo(r) === "SAÍDA" && !ssDentroDaCritica(r) && !ssNaTolerancia(r) },
      { id: "ordem", rotulo: "A ordem esperada: Crítica → equipe sai → SS", nota: "A teoria do campo, testada com os tempos REAIS do TMAE: a ocorrência abre, a equipe sai um pouco depois e a solicitação nasce um pouco depois disso. Nos que seguem, a mediana é de 7,7 h da Crítica até a equipe sair e 2,6 h daí até a SS nascer.", teste: (r) => { const a = tmae[texto(r.ss)]; const oi = emMs(r.oc_ini), sa = a ? emMs(a.saiu) : null, ab = emMs(r.abertura); return arquivo(r) === "SAÍDA" && Boolean(oi && sa && ab) && (oi as number) <= (sa as number) && (sa as number) <= (ab as number); } },
      { id: "fora_ordem", rotulo: "Fora da ordem esperada", nota: "A equipe saiu antes de a ocorrência abrir, ou a SS nasceu antes de a equipe sair. Não é erro por si: pode ser atendimento de outro evento no mesmo ativo, SS aberta por outro canal, ou hora lançada depois. É a lista de conferência.", teste: (r) => { const a = tmae[texto(r.ss)]; const oi = emMs(r.oc_ini), sa = a ? emMs(a.saiu) : null, ab = emMs(r.abertura); return arquivo(r) === "SAÍDA" && Boolean(oi && sa && ab) && !((oi as number) <= (sa as number) && (sa as number) <= (ab as number)); } },
      { id: "sem_tmae_real", rotulo: "Sem tempos reais do TMAE", nota: "A nota do atendimento não foi encontrada na base do TMAE, então não há hora de saída nem de conclusão da equipe. Para estes a faixa do meio é desenhada com a janela da ocorrência, e o rótulo avisa — não é o tempo da equipe.", teste: (r) => arquivo(r) === "SAÍDA" && Boolean(texto(r.at_num)) && !tmae[texto(r.ss)] },
      { id: "exato", rotulo: "Exatamente dentro da interrupção", nota: "As três bases existem E o serviço inteiro cabe dentro do intervalo da ocorrência — sem a hora de tolerância antes e sem as 24 horas depois. A SS abriu e encerrou, e a equipe entrou e saiu, com o cliente ainda sem energia. É a leitura mais dura desta base: não é encostar na janela, é ter acontecido dentro dela.", teste: (r) => arquivo(r) === "SAÍDA" && exatamenteDentro(r).ambos },
      { id: "exato_ss", rotulo: "Só a SS cabe dentro", nota: "A solicitação inteira acontece durante a interrupção, mas o atendimento do TMAE escapa do intervalo — começou antes de o cliente cair ou terminou depois de a energia voltar.", teste: (r) => { const e = exatamenteDentro(r); return arquivo(r) === "SAÍDA" && e.ss && !e.at; } },
      { id: "exato_at", rotulo: "Só o atendimento cabe dentro", nota: "A equipe entrou e saiu durante a interrupção, mas a SS não: ela nasceu antes ou foi encerrada depois de a energia voltar. É o caso comum — a solicitação é o documento, e documento fecha no seu tempo.", teste: (r) => { const e = exatamenteDentro(r); return arquivo(r) === "SAÍDA" && e.at && !e.ss; } },
      { id: "tres_bases", rotulo: "Tem as três bases completas", nota: "Existe ocorrência na Crítica, atendimento no TMAE e a SS tem abertura e término. Só sobre estes é possível desenhar as três réguas e perguntar quem cabe dentro de quem.", teste: (r) => arquivo(r) === "SAÍDA" && tresBases(r) },
      { id: "so_manobra_passos", rotulo: "O ativo aparece só como manobra", nota: "Dentro dos passos da ocorrência o transformador desta SS nunca aparece com defeito nem interrompido — só como elemento FECHADO, isto é, o caminho por onde OUTRO voltou. Não é vítima do evento. A bandeira que ele pediu.", teste: (r) => arquivo(r) === "SAÍDA" && Boolean(passos.por_ss[texto(r.ss)]?.so_manobra) },
      { id: "nao_restab", rotulo: "Passo sem restabelecimento", nota: "Algum passo da ocorrência não tem data de fechamento nem elemento fechado: a energia não voltou naquele trecho, pelo menos não no registro.", teste: (r) => arquivo(r) === "SAÍDA" && Boolean(passos.por_ss[texto(r.ss)]?.nao_restabelecido) },
      { id: "socorrido", rotulo: "Voltou por manobra de socorro", nota: "Em pelo menos um passo, quem devolveu a energia foi OUTRO elemento — fechou-se um vizinho para alimentar quem tinha caído, em vez de religar o próprio. É manobra de socorro, e ela aparece passo a passo no dossiê.", teste: (r) => arquivo(r) === "SAÍDA" && Boolean(passos.por_ss[texto(r.ss)]?.socorrido) },
      { id: "invertida", rotulo: "SS encerrada antes de ser aberta", nota: "O término está gravado antes da abertura. É erro de cadastro de data, não de execução — mas enquanto estiver assim, qualquer conta de duração desta SS sai negativa, e quem somar o tempo médio de atendimento leva o erro junto.", teste: (r) => arquivo(r) === "SAÍDA" && tempos(r).invertida },
      { id: "at_depois", rotulo: "Atendimento começa depois do término da SS", nota: "A equipe aparece no TMAE depois de a solicitação já estar encerrada. Ou o atendimento exibido é de outro evento — herança do casamento por elemento —, ou o encerramento da SS foi lançado antes de o serviço acabar.", teste: (r) => arquivo(r) === "SAÍDA" && tempos(r).atDepoisDoFim },
      { id: "at_antes", rotulo: "Atendimento começa antes da SS", nota: "A ordem normal do campo: o cliente liga, a equipe é acionada e a SS nasce depois, para formalizar a troca. É a maioria — está aqui para dar tamanho às outras leituras, não como suspeita.", teste: (r) => arquivo(r) === "SAÍDA" && tempos(r).atAntes },
      { id: "sem_at_tempo", rotulo: "Sem atendimento para comparar", nota: "Não há registro do TMAE no código deste transformador, então a faixa do meio fica vazia. Não é contraprova: a chave do TMAE é o elemento onde o defeito foi aberto, e a equipe costuma abrir na chave.", teste: (r) => arquivo(r) === "SAÍDA" && tempos(r).semAt },
      { id: "ss_longa", rotulo: "SS aberta por mais de 7 dias", nota: "Da abertura ao término passaram mais de 168 horas. Não diz nada sobre a causa da falha — diz sobre o tempo que a solicitação ficou viva no sistema.", teste: (r) => { const d = tempos(r).duracaoSS; return arquivo(r) === "SAÍDA" && d !== null && d > 168; } },
      { id: "ss_curta", rotulo: "SS encerrada em menos de 6 horas", nota: "Abertura e término no mesmo turno. Costuma ser a troca feita pela equipe que já estava no local.", teste: (r) => { const d = tempos(r).duracaoSS; return arquivo(r) === "SAÍDA" && d !== null && d >= 0 && d < 6; } },
    ],
    /* A reincidência: o mesmo transformador queimando de novo, e quanto tempo depois. */
    insight_reincidencia: [
      { id: "rec_7", rotulo: "Voltou a queimar em até 7 dias", nota: "O transformador foi trocado e queimou de novo dentro de uma semana. Nesse prazo a rede não mudou: o que sobra é instalação, dimensionamento, proteção ou o ponto — e cada caso destes é uma obra paga duas vezes no mesmo poste.", teste: (r) => { const x = reincDe(r); return Boolean(x && x.dias <= 7); } },
      { id: "rec_30", rotulo: "De 8 a 30 dias", nota: "Reincidência dentro do mês. Ainda cedo demais para desgaste: vale abrir o par e comparar potência instalada, elo e aterramento entre as duas trocas.", teste: (r) => { const x = reincDe(r); return Boolean(x && x.dias > 7 && x.dias <= 30); } },
      { id: "rec_90", rotulo: "De 31 a 90 dias", nota: "Reincidência no trimestre. Já cabe evento de rede no meio, mas o ponto continua sendo o mesmo — e é o ponto que se repete.", teste: (r) => { const x = reincDe(r); return Boolean(x && x.dias > 30 && x.dias <= 90); } },
      { id: "rec_mais", rotulo: "Mais de 90 dias", nota: "O mesmo ativo queimou duas vezes no semestre, com folga entre as duas. Continua sendo reincidência, com menos urgência.", teste: (r) => { const x = reincDe(r); return Boolean(x && x.dias > 90); } },
      { id: "rec_todos", rotulo: "Todas as reincidências", nota: "Toda SS que não é a primeira daquele transformador dentro do recorte. O ativo aparece uma vez por reincidência: quem queimou três vezes gera duas linhas.", teste: (r) => Boolean(reincDe(r)) },
    ],
    /* O aterramento medido pela própria equipe, na hora da troca. Só olha. */
    insight_aterramento: [
      { id: "terra_so_depois", rotulo: OUTRO_MOMENTO, nota: "Estes só têm o número do outro momento — o que você não está vendo agora. Ficam fora das faixas de propósito: dizer que o ponto estava bom antes usando a medição de depois da melhoria seria apresentar o conserto como se fosse a condição que matou o equipamento, e o contrário também vale.", teste: (r) => arquivo(r) === "SAÍDA" && faixaTerra(r) === "so_depois" },
      { id: "terra_grave", rotulo: "Aterramento grave — acima de 100 Ω", nota: "A pior das três hastes medidas ANTES do serviço passa de 100 Ω, quatro vezes o limite usual da norma. Nestes pontos o aterramento praticamente não existe: a corrente de descarga não tem para onde ir e sobra para o equipamento.", teste: (r) => arquivo(r) === "SAÍDA" && faixaTerra(r) === "grave" },
      { id: "terra_acima", rotulo: "Acima da norma — 25 a 100 Ω", nota: "A medição de antes do serviço passa do limite usual de 25 Ω sem chegar ao extremo. Merece melhoria programada no ponto.", teste: (r) => arquivo(r) === "SAÍDA" && faixaTerra(r) === "acima" },
      { id: "terra_ruim_sem_melhoria", rotulo: "Mediu ruim e NÃO fez melhoria", nota: "A equipe mediu acima de 25 Ω ANTES do serviço, escreveu o número no formulário da OS e respondeu NÃO à pergunta “fez melhoria de aterramento”. O ponto continua como estava, e o transformador novo foi instalado ali. É a lista que vira plano de ação.", teste: (r) => arquivo(r) === "SAÍDA" && ["acima", "grave"].includes(faixaTerra(r)) && !fezMelhoria(r) },
      { id: "terra_melhorou", rotulo: "Fez melhoria — e a medição caiu", nota: "Há medição antes e depois, e a de depois é menor: a melhoria aparece no número. São os casos em que dá para provar que a intervenção funcionou.", teste: (r) => { const a = terraDe(r); return arquivo(r) === "SAÍDA" && Boolean(a?.pior && a?.pior_depois && a.pior_depois < a.pior); } },
      { id: "terra_limite", rotulo: "No limite — 10 a 25 Ω", nota: "Dentro da norma, mas sem folga. Em solo seco a medição sobe.", teste: (r) => arquivo(r) === "SAÍDA" && faixaTerra(r) === "limite" },
      { id: "terra_bom", rotulo: "Bom — até 10 Ω", nota: "Aterramento em ordem no momento da troca. A queima veio de outro caminho.", teste: (r) => arquivo(r) === "SAÍDA" && faixaTerra(r) === "bom" },
      { id: "terra_sem", rotulo: "Sem medição — não preenchido", nota: "O formulário veio em branco ou com zero nas três hastes, antes e depois. Zero não é medição: resistência zero não existe num aterramento de distribuição, é o campo vazio lançado como zero. Ordem do dono: estes contam como NÃO PREENCHIDOS, nunca como bons.", teste: (r) => arquivo(r) === "SAÍDA" && faixaTerra(r) === "sem" },
      { id: "terra_desconectado", rotulo: "Aterramento não conectado ao tanque", nota: "A equipe respondeu NÃO à pergunta se o aterramento está conectado ao tanque do transformador. Sem essa conexão, a malha não protege a carcaça do equipamento.", teste: (r) => arquivo(r) === "SAÍDA" && texto(terraDe(r)?.conectado).toUpperCase().startsWith("N") },
    ],
    /* A fila de revisão detalhada: só olha, e cada chip é um motivo de leitura. */
    insight_revisao: [
      { id: "rev_todos", rotulo: "Tudo que pedi para você reler", nota: "Toda solicitação dos 1.305 em que alguma fonte discorda de outra, ou em que o texto de campo descreve coisa que a Crítica não gravou. Nada aqui foi movido — é fila de leitura para o seu martelo.", teste: (r) => arquivo(r) === "SAÍDA" && paraRever(r).length > 0 },
      { id: "rev_terceiro", rotulo: "Furto, abalroamento ou dano de terceiro", nota: "Casos em que TRÊS OU MAIS campos independentes — o formulário que a equipe preenche na OS, o defeito da SS, a origem, o carimbo contábil da obra, a descrição livre do cadastro, a causa da Crítica ou a do TMAE — dizem furto, abalroamento, vandalismo ou dano causado por terceiro. Dentro dos 1.305 há 16 com pelo menos um campo assim; estes são os que várias bases confirmam. Furto é motivo de exclusão do indicador, e dano de terceiro abre discussão de ressarcimento: os dois merecem o seu martelo caso a caso.", teste: (r) => arquivo(r) === "SAÍDA" && paraRever(r).some((x) => x.id === "terceiro") },
      { id: "rev_carga", rotulo: "Texto diz sobrecarga, tap ou tensão — a Crítica diz outra coisa", nota: "Quem esteve no poste escreveu tap submerso, defeito interno, sobrecarga ou tensão fora do normal, e a subcausa gravada na Crítica é outra — descarga atmosférica, vazamento, RD de AT. Ordem dele a partir da DG-RD-PO 00422: estes deveriam ser lidos como sobrecarga ou regulação, e não como o que a Crítica gravou. A palavra “tap” sozinha não conta: ela aparece como campo de formulário da OS em 588 casos; só entra quando vem com defeito — submerso, queimado, danificado.", teste: (r) => arquivo(r) === "SAÍDA" && paraRever(r).some((x) => x.id === "carga") },
    ],
    /* Quem divide o mesmo evento: também só olha. */
    insight_divide: [
      { id: "divide_oc", rotulo: "Dividem a mesma ocorrência", nota: "Mais de uma SS dos queimados e avariados apoiada na MESMA ocorrência da Crítica. A interrupção prova uma troca, não duas — uma das SS do par está contando com evento que não é dela. É o mesmo teste da exclusão por SS duplicada, que na porta compara evento e transformador; aqui aparece quem passou porque o martelo trouxe de volta.", teste: (r) => arquivo(r) === "SAÍDA" && Boolean(texto(r.oc_num)) && parceirasOc(r).length > 0 },
      { id: "divide_at", rotulo: "Dividem o mesmo atendimento do TMAE", nota: "Mais de uma SS com o MESMO atendimento de equipe no dossiê. O atendimento é marcador, não retém ninguém — mas o mesmo deslocamento aparecendo em duas SS quer dizer que pelo menos uma delas exibe uma ida ao poste que não é a sua. Em geral é herança: a chave do TMAE é o elemento do defeito, e o ativo reincidiu.", teste: (r) => arquivo(r) === "SAÍDA" && Boolean(texto(r.at_num)) && parceirasAt(r).length > 0 },
      { id: "divide_qualquer", rotulo: "Dividem qualquer um dos dois", nota: "A união dos dois recortes: ocorrência dividida ou atendimento dividido. É a lista de conferência inteira desta aba.", teste: (r) => arquivo(r) === "SAÍDA" && (parceirasOc(r).length > 0 || parceirasAt(r).length > 0) },
      { id: "exclusivas", rotulo: "Evento exclusivo", nota: "A ocorrência e o atendimento desta SS não aparecem em nenhuma outra dos queimados e avariados. É a regra, e está aqui para dar tamanho à exceção.", teste: (r) => arquivo(r) === "SAÍDA" && parceirasOc(r).length === 0 && parceirasAt(r).length === 0 },
    ],
    /* Material × transformador: também só olha. A pergunta é se a obra pagou o número de
       transformadores que as SS dela pedem. */
    insight_material: [
      { id: "mais_ss", rotulo: "Mais SS do que transformadores", nota: "A obra atende mais de uma solicitação e o material dela traz menos transformadores do que isso. Uma das SS está no indicador sem prova material própria — a mesma peça não pode comprovar duas trocas.", teste: (r) => estadoMaterial(r) === "mais_ss" },
      { id: "mais_trafos", rotulo: "Mais transformadores do que SS", nota: "O material da obra traz mais transformadores do que as SS que ela atende. Não é erro por si: pode haver troca que não gerou SS neste recorte. Vale conferir para onde foi a peça a mais.", teste: (r) => estadoMaterial(r) === "mais_trafos" },
      { id: "sem_trafo", rotulo: "Obra sem transformador realizado", nota: "A obra está no export de material e nenhum transformador saiu: ou a linha existe com quantidade realizada zero, ou não há linha de transformador nenhuma. Obra que não movimentou equipamento não comprova troca.", teste: (r) => estadoMaterial(r) === "sem_trafo" },
      { id: "troca_tipo", rotulo: "Trocou o tipo do transformador", nota: "A obra previu um transformador e executou outro, da mesma potência: sai OMI, de óleo mineral, do plano, e entra OVI, de óleo vegetal, na execução. São duas linhas para uma troca só — contar linhas aqui dá dois transformadores onde há um, e foi assim que eu errei antes de conferir a quantidade realizada.", teste: (r) => arquivo(r) === "SAÍDA" && Boolean(materialDa(r)?.troca_tipo) },
      { id: "fora_export", rotulo: "Obra fora do export de material", nota: "A obra existe na SS e não está no export que recebemos do SIAGO. Não é ausência de material — é ausência do nosso acesso a ele, e a diferença importa: estas são as que precisam de extração, não de investigação.", teste: (r) => estadoMaterial(r) === "fora_export" },
      { id: "bate", rotulo: "Bate: uma SS, um transformador", nota: "O material da obra traz exatamente os transformadores que as SS dela pedem. É a maioria esmagadora, e está aqui para dar tamanho ao resto.", teste: (r) => estadoMaterial(r) === "bate" },
      { id: "sem_obra_mat", rotulo: "Sem obra gerada", nota: "A SS não tem número de obra, então não há material para comparar.", teste: (r) => estadoMaterial(r) === "sem_obra" },
    ],
    visao: [
      { id: "sem_origem", rotulo: "Sem origem gravada", nota: "A base de SS não registra qual setor abriu a solicitação. São duas, e as duas já saíram do indicador por outro motivo: uma é aviso de anomalia aberto por técnico, a outra foi criada para substituir uma SS cancelada. O campo em branco não decidiu nada em nenhuma das duas — é lacuna de cadastro, não sinal.", teste: (r) => !texto(r.origem) },
    ],
    interrupcao: [
      /* ELEMENTO DO DEFEITO. A Crítica diz duas coisas diferentes sobre o mesmo transformador:
         onde o defeito foi aberto e o que ficou sem energia. A esteira casa pelo primeiro — o
         defeito tem de ser no próprio ativo. Estes filtros mostram o segundo, sem mudar o
         casamento: em 19.378 ocorrências da base um transformador foi interrompido com o
         defeito noutro elemento. Marcador, não peneira. */
      /* CENSO DA CRÍTICA — a pergunta dele: "eu achei que tinham muito mais ativos ausentes da
         base de interrupções". A resposta não é caso a caso, é dos 1.510 de uma vez, contra os
         sete meses da Crítica (dezembro de 2025 incluído). E são quatro estados que não são
         graus do mesmo: ausente é ausente; ter defeito noutra data é outra coisa; aparecer sem
         nunca ter defeito aberto no próprio código é uma terceira. */
      { id: "casou_int", rotulo: "Interrompido na janela — bandeira", nota: "SÓ LEITURA, não move ninguém. Este transformador não casou pela coluna do defeito, mas aparece como elemento INTERROMPIDO numa ocorrência que caberia na janela — o defeito dela foi aberto noutro elemento, chave, unidade consumidora ou outro transformador. Ordem dele: regras e método podem mudar, mas os 1.305 não; a segunda coluna vira esta bandeira para conferência, sem mexer no resultado.", teste: (r) => texto(r.int_na_janela) === "SIM" },
      { id: "censo_ausente", rotulo: "Censo · ausente da Crítica", nota: "O código do transformador não aparece na Crítica em papel nenhum — nem com defeito, nem interrompido, nem manobrado — nos sete meses do acervo. Ausente aqui é ausente de verdade.", teste: (r) => texto(r.censo_critica) === "AUSENTE" },
      { id: "censo_semdef", rotulo: "Censo · aparece, nunca com defeito nele", nota: "O código aparece na Crítica, mas sempre como interrompido ou manobrado: nenhuma ocorrência foi aberta com o defeito neste transformador, em nenhuma data.", teste: (r) => texto(r.censo_critica) === "SEM DEFEITO NELE" },
      { id: "censo_outradata", rotulo: "Censo · defeito nele, mas em outra data", nota: "Existe ocorrência com o defeito aberto neste transformador, só que fora da janela desta SS. É diferente de não existir: a distância é que não fecha.", teste: (r) => texto(r.censo_critica) === "DEFEITO EM OUTRA DATA" },
      { id: "censo_janela", rotulo: "Censo · defeito nele dentro da janela", nota: "A Crítica registra ocorrência com o defeito aberto neste transformador dentro da janela desta SS. É o casamento que a esteira aceita como prova.", teste: (r) => texto(r.censo_critica) === "DEFEITO NA JANELA" },
      { id: "def_tr", rotulo: "Defeito no próprio transformador", nota: "A ocorrência foi aberta com o defeito neste transformador. É o único casamento que a esteira aceita como prova.", teste: (r) => texto(r.def_elemento) === "TR" },
      { id: "def_uc", rotulo: "Defeito na unidade consumidora", nota: "O transformador ficou sem energia, mas o defeito foi aberto na unidade consumidora — é defeito de ligação de cliente, não do equipamento.", teste: (r) => texto(r.def_elemento) === "UC" },
      { id: "def_ch", rotulo: "Defeito em chave", nota: "O defeito foi aberto numa chave. O transformador aparece como interrompido, não como defeituoso.", teste: (r) => texto(r.def_elemento) === "CH" },
      { id: "def_dj", rotulo: "Defeito em disjuntor", nota: "O defeito foi aberto num disjuntor.", teste: (r) => texto(r.def_elemento) === "DJ" },
      { id: "def_nenhum", rotulo: "Sem defeito localizado na janela", nota: "Nenhuma ocorrência na janela, nem com defeito no ativo nem com ele apenas interrompido.", teste: (r) => !texto(r.def_elemento) },
      { id: "todos", rotulo: "Toda a fila", nota: "As 1.510 chegam a esta etapa: ninguém foi filtrado ainda, porque a esteira começa aqui.", teste: () => true },
      { id: "casou", rotulo: "Com interrupção na janela", nota: "A abertura da SS cai dentro do intervalo da interrupção ou a até 24 horas de qualquer uma das duas bordas dele.", teste: (r) => ["A", "B", "C"].includes(texto(r.e1_nivel)) },
      { id: "comfato", rotulo: "Viraram fato", nota: "Têm a interrupção na janela e ela não pertence a outra SS. É este o número que segue como prova.", teste: (r) => r.fato === "F1" || r.fato === "F0" },
      { id: "soat", rotulo: "Só com atendimento", nota: "Sem interrupção na janela, mas com equipe registrada no TMAE. Passam a etapa pelo deslocamento, não pelo fato.", teste: (r) => r.fato === "F2" },
      { id: "ressalva", rotulo: "Com ressalva", nota: "Programada, preventiva, sem cliente, de outro elemento ou reclamação individual.", teste: (r) => Boolean(texto(r.ressalvas)) },
      { id: "fora", rotulo: "Aparece em outra data", nota: "O ativo tem ocorrência no semestre, mas nenhuma perto da SS.", teste: (r) => r.e1_nivel === "FORA" },
      { id: "sem", rotulo: "Sem nenhuma ocorrência", nota: "O código não aparece na base de interrupção em seis meses.", teste: (r) => r.e1_nivel === "SEM" },
    ],
    deslocamento: [
      { id: "at_trafo", rotulo: "Atendimento declara transformador", nota: "O TMAE registrou causa TRANSFORMADOR — o próprio equipamento é o assunto do atendimento.", teste: (r) => normalize(texto(r.at_causa)).includes("TRANSFORMADOR") },
      { id: "at_outra", rotulo: "Atendimento declara outra causa", nota: "Houve equipe no código do trafo, mas a causa registrada é outra: meio ambiente, condutor, conexão. Não retém ninguém — é marcador.", teste: (r) => Boolean(texto(r.at_causa)) && !normalize(texto(r.at_causa)).includes("TRANSFORMADOR") },
      { id: "at_queima", rotulo: "Subcausa de queima", nota: "A subcausa do atendimento descreve queima do equipamento.", teste: (r) => normalize(texto(r.at_sub)).includes("QUEIMAD") },
      { id: "at_vaz", rotulo: "Subcausa de vazamento", nota: "A subcausa do atendimento descreve vazamento de óleo ou tanque deteriorado.", teste: (r) => normalize(texto(r.at_sub)).includes("VAZAMENT") || normalize(texto(r.at_sub)).includes("TANQUE") },
      { id: "todos", rotulo: "Toda a fila", nota: "Quem passou pela interrupção e chega ao deslocamento.", teste: (r) => r.chega_e2 === "SIM" },
      { id: "corrobora", rotulo: "Atendimento na janela", nota: "Equipe registrada no próprio transformador dentro da janela.", teste: (r) => texto(r.tmae_corrobora) !== "não" },
      { id: "semat", rotulo: "Sem atendimento", nota: "Nenhuma nota no código do trafo. Não é contraprova: a base tem lacuna.", teste: (r) => r.e2_status === "SEM ATENDIMENTO" },
      { id: "outra", rotulo: "Atendimento em outra data", nota: "Existe atendimento, mas longe da abertura da SS.", teste: (r) => r.e2_status === "RETIDO" },
      { id: "porocorrencia", rotulo: "Achados pelo número da ocorrência", nota: "Estavam como sem atendimento porque o TMAE grava o elemento onde o defeito foi aberto, não o transformador. Buscando pelo número da ocorrência, a equipe aparece e deslocou.", teste: (r) => r.at2_achado === "SIM" },
    ],
    ressalva: [
      { id: "fila", rotulo: "Toda a fila", nota: "Quem chega à quarta peneira: passou pela interrupção, pelo deslocamento e pelo material.", teste: (r) => r.cascata === "SAÍDA" || r.cascata === "RETIDO — RESSALVA DA INTERRUPÇÃO" },
      { id: "todos", rotulo: "Retidos pela ressalva", nota: "Passaram nas três peneiras, mas a interrupção tem ressalva.", teste: (r) => r.cascata === "RETIDO — RESSALVA DA INTERRUPÇÃO" },
      { id: "grave", rotulo: "Ressalva grave", nota: "Programada, preventiva ou com equipamento especial na ocorrência.", teste: (r) => Boolean(texto(r.ressalvas_graves)) },
      { id: "semcliente", rotulo: "Sem cliente interrompido", nota: "A interrupção não deixou ninguém sem energia.", teste: (r) => texto(r.ressalvas_medias).includes("nenhum cliente") },
      { id: "outroele", rotulo: "Defeito em outro elemento", nota: "O defeito foi aberto em outro equipamento, não no transformador.", teste: (r) => texto(r.ressalvas_medias).includes("outro equipamento") },
      { id: "individual", rotulo: "Reclamação individual", nota: "Um cliente só reclamou; não foi interrupção coletiva.", teste: (r) => texto(r.ressalvas_medias).includes("um cliente só") },
    ],
    /* Esta aba deixou de listar quem ficou preso: o deslocamento não retém mais ninguém.
       Ela passa a mostrar a corroboração do campo como ela é — quem tem atendimento e quem
       não tem — sem que a ausência decida nada. A informação continua inteira e filtrável. */
    semdesloc: [
      { id: "todos", rotulo: "Sem registro de atendimento", nota: "Passaram na interrupção e não há atendimento do TMAE no código do trafo. Não retém: é marcador.", teste: (r) => r.deslocamento === "SEM REGISTRO" },
      { id: "corrobora", rotulo: "Com atendimento que corrobora", nota: "A equipe esteve no código do transformador dentro da janela.", teste: (r) => r.deslocamento === "CORROBORA" },
      { id: "semmat", rotulo: "Sem registro e sem material", nota: "Nem atendimento nem transformador baixado na obra — é aqui que a dúvida é real.", teste: (r) => r.deslocamento === "SEM REGISTRO" && (Number(r.trafos_material) || 0) <= 0 },
      { id: "comcliente", rotulo: "Sem registro, mas com cliente interrompido", nota: "A interrupção atingiu gente, então houve evento de verdade mesmo sem a nota da equipe.", teste: (r) => r.deslocamento === "SEM REGISTRO" && (Number(r.oc_cons) || 0) > 0 },
      { id: "nasaida", rotulo: "Sem registro e ainda assim na saída", nota: "O que o antigo bloqueio do TMAE teria descartado.", teste: (r) => r.deslocamento === "SEM REGISTRO" && r.cascata === "SAÍDA" },
    ],
    /* Os cinco testes eram `() => true`, então cada chip anunciava 1.510 e abria vazio: o
       filtro de verdade é filtraProfunda, que lê a classificação do localStorage. Agora o
       teste é o mesmo que a lista usa, e o número do chip é o número que ele entrega. */
    profunda: [
      { id: "todos", rotulo: "Tudo que você classificou", nota: "A sua leitura, ao lado da decisão do fluxo.", teste: (r) => Boolean(classificacao[texto(r.ss)]) },
      { id: "q", rotulo: "Queimado", nota: "Martelo batido por você.", teste: (r) => classificacao[texto(r.ss)]?.classe === "QUEIMADO" },
      { id: "a", rotulo: "Avariado", nota: "Martelo batido por você.", teste: (r) => classificacao[texto(r.ss)]?.classe === "AVARIADO" },
      /* A pergunta que o dono fez: "essas que eu to aprovando estão casando com a Crítica?"
         As marcas dele vivem no navegador, então a resposta só existe aqui, na tela — o dado
         gravado não as conhece. Três recortes respondem: com casamento pleno, com ocorrência
         mas fora do vão, e sem prova de campo nenhuma. */
      { id: "meu_casa", rotulo: "Aprovados por você COM casamento na Crítica", nota: "Você marcou como queimado ou avariado e a Crítica registra defeito neste transformador, com a SS caindo dentro do vão da ocorrência. É a prova mais forte que existe nesta base.", teste: (r) => ["QUEIMADO", "AVARIADO"].includes(classificacao[texto(r.ss)]?.classe || "") && texto(r.def_elemento) === "TR" && Number(r.oc_dist_h) === 0 },
      { id: "meu_borda", rotulo: "Aprovados por você · ocorrência fora do vão", nota: "Você marcou como falha e existe ocorrência com defeito neste transformador, mas a SS não abre dentro dela — abre perto. Vale conferir a distância caso a caso.", teste: (r) => ["QUEIMADO", "AVARIADO"].includes(classificacao[texto(r.ss)]?.classe || "") && texto(r.def_elemento) === "TR" && Number(r.oc_dist_h) !== 0 },
      { id: "meu_sem", rotulo: "Aprovados por você SEM casamento na Crítica", nota: "Você marcou como queimado ou avariado e a Crítica não registra defeito neste transformador — ou não há ocorrência nenhuma, ou o defeito é de outro elemento. A sua leitura entra no indicador do mesmo jeito, porque o martelo é seu; esta lista existe para você saber quais entram sem prova de campo.", teste: (r) => ["QUEIMADO", "AVARIADO"].includes(classificacao[texto(r.ss)]?.classe || "") && texto(r.def_elemento) !== "TR" },
      { id: "a_sigco", rotulo: "Avariado por você, no SIGCO de queima", nota: "Você leu como avaria e o custo está no projeto de queimado. Divergência de enquadramento contábil, não de causa.", teste: (r) => classificacao[texto(r.ss)]?.classe === "AVARIADO" && r.sigco_avaria_em_queima === "SIM" },
      { id: "v", rotulo: "Preventivo", nota: "Troca sem defeito. Sai da esteira e vai para a aba de preventivos.", teste: (r) => classificacao[texto(r.ss)]?.classe === "PREVENTIVO" },
      /* Furtado e excluído acabam no mesmo lugar — os dois saem do indicador — e por isso têm
         uma entrada só na barra. Os chips separados continuam aqui embaixo para quem quiser ver
         cada um: o que era duas linhas de menu virou uma linha com dois recortes. */
      { id: "xf", rotulo: "Excluídos e furtados por você", nota: "Os dois saem do indicador e vão para a mesma aba de exclusões: furto entra lá na categoria de furto, roubo e vandalismo; excluído entra com a categoria que a regra já tinha, ou como martelo puro quando não havia nenhuma.", teste: (r) => ["EXCLUIDO", "FURTADO", "PREVENTIVO"].includes(classificacao[texto(r.ss)]?.classe || "") || ehExclusaoManual(classificacao[texto(r.ss)]?.classe) },
      { id: "x", rotulo: "Excluído", nota: "Fora do indicador pela sua leitura — com ou sem categoria escolhida. Sai da esteira e vai para a aba de exclusões, no chip da categoria que você marcou.", teste: (r) => classificacao[texto(r.ss)]?.classe === "EXCLUIDO" || ehExclusaoManual(classificacao[texto(r.ss)]?.classe) },
      { id: "f", rotulo: "Furtado", nota: "Furto, roubo ou vandalismo pela sua leitura. Sai da esteira e vai para as exclusões, na categoria de furto.", teste: (r) => classificacao[texto(r.ss)]?.classe === "FURTADO" },
      { id: "r", rotulo: "Vale a regra", nota: "Você concordou com a decisão do fluxo.", teste: (r) => classificacao[texto(r.ss)]?.classe === "REGRA" },
      { id: "p", rotulo: "Análise profunda", nota: "Precisa de campo ou de documento que não temos.", teste: (r) => classificacao[texto(r.ss)]?.classe === "PROFUNDA" },
      /* Casos que a régua decidiu NÃO mexer e que merecem olho humano. Não são erro: são pontos
         em que duas fontes de campo discordam e nenhuma está errada. Chegam aqui com etiqueta,
         para o dono julgar um a um sem ter de caçá-los. */
      { id: "claude_natureza", rotulo: "Marcados por mim · natureza divergente", nota: "Conta como queimado e a Crítica declara vazamento de óleo, falha de bucha ou tanque deteriorado — ou o contrário. Um transformador que vaza óleo perde isolamento e depois queima: a subcausa registra o defeito constatado, a obra registra o que foi trocado. A régua manteve o rótulo da obra e o total não muda; estes ficam aqui para você decidir caso a caso.", teste: (r) => texto(r.analise_claude) === "natureza divergente" },
      { id: "claude_zero", rotulo: "Marcados por mim · zero que é do registro", nota: "A ocorrência veio com zero cliente, mas a ocorrência mais próxima no mesmo transformador interrompeu gente. O ativo atende cliente: o zero descreve o registro, não a rede.", teste: (r) => r.zero_e_registro === "SIM" },
      { id: "claude_int", rotulo: "Marcados por mim · casariam pelo interrompido", nota: "Os três casos que a regra plena das duas colunas levaria ao indicador: não há ocorrência com defeito neste transformador, mas ele aparece como elemento INTERROMPIDO numa que cabe na janela, com prova de troca e sem ressalva. Ordem sua: ficam fora do indicador — os 1.305 não se movem — e vêm para cá, para o seu julgamento caso a caso.", teste: (r) => texto(r.analise_claude) === "casaria pelo interrompido" },
      { id: "sem_cliente", rotulo: "Marcados por você sem nenhum cliente interrompido", nota: "Você bateu o martelo e a ocorrência do caso não penalizou ninguém — nenhum cliente ficou sem energia em passo nenhum dela. Sua classificação manda no arquivamento, então estes entram no indicador; a lista existe para eles não entrarem calados.", teste: (r) => Boolean(classificacao[texto(r.ss)]) && r.sem_cliente_interrompido === "SIM" },
    ],
    ssos: [
      { id: "todos", rotulo: "Toda a fila", nota: "Quem passou pela interrupção e pelo deslocamento e chega à leitura do texto e do material.", teste: (r) => r.chega_e3 === "SIM" },
      { id: "falha", rotulo: "Texto diz falha", nota: "Queima ou avaria descrita no texto da SS ou da OS.", teste: (r) => r.chega_e3 === "SIM" && r.leitura === "L1" },
      { id: "outra", rotulo: "Texto diz outra causa", nota: "Furto, abalroamento, preventivo, auxiliar, construção ou desativação.", teste: (r) => r.chega_e3 === "SIM" && r.leitura === "L2" },
      { id: "indef", rotulo: "Texto não decide", nota: "Nunca decide sozinho: vai para leitura humana.", teste: (r) => r.chega_e3 === "SIM" && r.leitura === "L3" },
      { id: "corrigida", rotulo: "Categoria corrigida", nota: "O rótulo gravado na base não corresponde ao que o texto descreve.", teste: (r) => Boolean(texto(r.categoria_texto)) && r.categoria_texto !== r.categoria_gravada },
      { id: "semmat", rotulo: "Sem material conferido", nota: "Obra fora do export de material ou obra não gerada.", teste: (r) => r.material_conferido !== "SIM" },
      /* Ponto de atenção, não veredito: o texto traz um sinal que pede conferência à mão —
         MEDIDO_, plano de medida, remanejamento, sobrecarga, pedido de potência específica.
         Nenhum deles tira o caso do indicador sozinho; quando há também gatilho de exclusão,
         a exclusão manda e o caso nem aparece aqui. */
      { id: "remendo", rotulo: "Reparo improvisado no texto", nota: "O texto relata cola, fita ou remendo no transformador. Não exclui — um trafo remendado que depois vaza e é trocado continua sendo troca de equipamento. Marca o histórico de manutenção do ativo.", teste: (r) => texto(r.suspeitas).includes("improvisado") },
      { id: "suspeita", rotulo: "Sob suspeita no texto", nota: "MEDIDO_, plano de medida, remanejamento, sobrecarga ou pedido de potência específica. Fica no indicador — é sinal para conferir, não motivo para excluir.", teste: (r) => r.sob_suspeita === "SIM" },
    ],
    obra: [
      // esta aba fica fora da esteira: lê enquadramento de custo, não causa. Por isso o
      // universo dela são as 1.510 e não a fila de uma peneira — mas precisa dizer isso.
      { id: "todos", rotulo: "Toda a fila", nota: "Obra e SIGCO ficam fora da esteira: leem enquadramento de custo, não causa. Por isso esta aba olha as 1.510, e não a fila de uma peneira.", teste: () => true },
      { id: "alerta", rotulo: "Com alerta", nota: "R-OBR-01, R-OBR-02, R-OBR-03 ou divergência de SIGCO.", teste: (r) => r.e4_status === "ALERTA" },
      { id: "semobra", rotulo: "Sem obra gerada — análise à parte", nota: "Sem obra não existe consulta de material nem encerramento: o caso sai do fluxo e vai para análise própria.", teste: (r) => !texto(r.obra) },
      { id: "despesa", rotulo: "Obra em despesa", nota: "A obra não imobiliza o ativo.", teste: (r) => normalize(texto(r.obra_classe)).includes("DESPESA") },
      // o alerta é gravado como "8812 espera queimado" — a palavra SIGCO não aparece nele,
      // e procurá-la deixava este filtro em zero desde sempre
      { id: "sigco_av", rotulo: "Avaria no projeto de queima", nota: "A leitura concluiu avaria e a obra foi enquadrada no SIGCO 8812, que é o projeto de transformador queimado. Não muda a causa — muda para onde o custo foi. É bandeira contábil, não veredito técnico.", teste: (r) => r.sigco_avaria_em_queima === "SIM" },
      /* Tipo de obra. Quase tudo é manutenção corretiva emergencial, e é por isso que as
         exceções importam: obra programada ou preventiva descreve troca decidida antes, não
         falha súbita. São poucas — o filtro existe para que sejam encontráveis. */
      { id: "obr_emerg", rotulo: "Manutenção corretiva emergencial", nota: "A obra padrão da troca por falha: 1.474 das 1.510.", teste: (r) => normalize(texto(r.obra_tipo)).includes("EMERGENCIAL") },
      { id: "obr_prog", rotulo: "Manutenção corretiva programada", nota: "A troca foi decidida antes, não em emergência — indício de que não houve falha súbita.", teste: (r) => normalize(texto(r.obra_tipo)).includes("PROGRAMADA") },
      { id: "obr_prev", rotulo: "Manutenção preventiva", nota: "Obra de prevenção: não pressupõe defeito.", teste: (r) => normalize(texto(r.obra_tipo)).includes("PREVENTIVA") },
      { id: "obr_outra", rotulo: "Outro tipo de obra", nota: "Linha morta, desativação e o que mais não seja manutenção corretiva emergencial.", teste: (r) => Boolean(texto(r.obra_tipo)) && !normalize(texto(r.obra_tipo)).includes("EMERGENCIAL") },
      { id: "obr_imob", rotulo: "Ordem de imobilização", nota: "A obra imobiliza o ativo — enquadramento esperado para troca de equipamento.", teste: (r) => normalize(texto(r.obra_classe)).includes("IMOBILIZA") },
      { id: "obra_diz", rotulo: "A obra diz outra causa", nota: "O cadastro de obras traz um campo de descrição preenchido depois da execução — \u201cSUBST. TRAFO QUEIMADO\u201d, \u201cFURTO DE BENS TRAFO\u201d. É a terceira voz do caso: a SS diz o que pediu, a OS o que executou, a obra sob que rótulo o custo entrou. Aqui ela não bate com a leitura.", teste: (r) => r.obra_diverge === "SIM" },
      { id: "sigco_dic", rotulo: "SIGCO divergente da leitura", nota: "O custo entrou num projeto que pressupõe uma causa e a leitura concluiu outra. O dicionário de projetos foi construído das 1.479 obras: 8812 é queima em 98%, 61993 é furto em 85%, 20497 é dano de terceiro em 100%, 8444 é vazamento de óleo. Só acusa projeto com mais de 60% de pureza — abaixo disso ele mistura causas e não pressupõe nada.", teste: (r) => r.sigco_diverge === "SIM" },
      { id: "obra_sigco", rotulo: "A obra e o SIGCO discordam entre si", nota: "O sinal mais limpo do acervo: dois campos do próprio cadastro se contradizendo, sem leitura nossa envolvida. A obra foi aberta com um rótulo e o custo entrou noutro projeto — quem escreveu os dois foi a mesma casa, depois da execução.", teste: (r) => r.obra_sigco_discordam === "SIM" },
      { id: "sigco", rotulo: "SIGCO divergente", nota: "O projeto SIGCO da obra pressupõe uma causa e o caso tem outra.", teste: (r) => texto(r.e4_alertas).includes("espera") },
    ],
    decisao: [
      { id: "reincidente_saida", rotulo: "Contaram duas vezes", nota: "O mesmo transformador saiu pela ponta da esteira mais de uma vez no semestre. Não é erro de contagem quando os dois eventos existem e cada um tem ocorrência e material próprios — mas é o primeiro lugar onde uma duplicidade apareceria.", teste: (r) => arquivo(r) === "SAÍDA" && registros.filter((x) => arquivo(x) === "SAÍDA" && texto(x.trafo) === texto(r.trafo)).length > 1 },
      { id: "reincidente", rotulo: "Ativos com mais de uma SS", nota: "O mesmo transformador aparece mais de uma vez na base do semestre — contando ou não. Não é erro de contagem quando os dois eventos existem e cada um tem ocorrência e material próprios — é informação de rede. Vale conferir quando o intervalo é curto.", teste: (r) => registros.filter((x) => texto(x.trafo) === texto(r.trafo)).length > 1 },
      { id: "reincidente_30", rotulo: "Segunda SS em 30 dias ou menos", nota: "O mesmo transformador teve outra solicitação com menos de um mês entre uma e outra — contando ou não. É onde a duplicidade, se existir, se esconde, e é onde a rede merece uma olhada de engenharia.", teste: (r) => {
        const irmas = registros.filter((x) => texto(x.trafo) === texto(r.trafo));
        if (irmas.length < 2) return false;
        const dts = irmas.map((x) => new Date(String(x.abertura).replace(" ", "T")).getTime()).sort((a, b) => a - b);
        return (dts[dts.length - 1] - dts[0]) / 86400000 <= 30;
      } },
      /* ETIQUETAS — categoria dentro do veredito, não em lugar dele. Ele leu dois casos e pediu
         nome para o que estava escrito: "ponto quente na conexão" e "substituído pela Meta". Não
         mudam nem a decisão nem o número; respondem a pergunta seguinte, que avaria e quem
         trocou. A lista se completa sozinha a partir do dado, como a das exclusões. */
      ...[...new Set(registros.flatMap((r) => texto(r.etiquetas).split(" · ")).filter(Boolean))]
        .map((e) => ({
          id: `etq:${e}`,
          rotulo: e,
          nota: "Etiqueta do caso: nomeia o que o texto diz sem mudar o veredito nem a conta. O porquê de cada uma fica escrito no dossiê.",
          teste: (r: Registro) => texto(r.etiquetas).split(" · ").includes(e),
        })),
      { id: "contida", rotulo: "Entrou pela contenção — a ocorrência coube dentro da SS", nota: "A SS abriu ANTES do apagão, e mesmo assim a ocorrência é dela: o corte começou e terminou com a SS já aberta. A ordem que a janela assume — evento, depois SS — não é a única do campo. Um transformador vazando óleo continua energizado, e ninguém fica sem luz até alguém desligar para trocar: nesses, a SS nasce primeiro e o desligamento é o serviço. Contenção é prova mais forte que distância, e por isso ela entra sem depender da janela de 24 horas.", teste: (r) => r.oc_contida_na_ss === "SIM" },
      { id: "at_forajanela", rotulo: "Atendimento exibido é de fora da janela", nota: "O dossiê mostra um atendimento do TMAE que não cai na janela desta SS — em alguns casos meses depois. O campo vinha herdado de uma rodada antiga e entrava como prova sem que ninguém olhasse a data. Continua contando enquanto você não decidir: exigir a data dentro da janela tira 52 casos da SAÍDA, de 1.269 para 1.217, e esse número vai a conselho.", teste: (r) => r.at_fora_da_janela === "SIM" },
      { id: "saida", rotulo: "Saíram pela cascata", nota: "Passaram por interrupção, deslocamento, texto e material.", teste: (r) => r.cascata === "SAÍDA" },
      /* O MESMO CONJUNTO QUE OS BIG NUMBERS DESTA ABA CONTAM. O chip acima lista o que o
         ARQUIVO arquivou (1.269); os cartões no alto contam o que a TELA arquiva, que é o
         arquivo mais o martelo dele (1.305). Os dois estão certos e respondem perguntas
         diferentes, mas quem clica no cartão e cai numa lista menor que o cartão perde a
         confiança na tela — com razão. Este chip é a lista do cartão. */
      { id: "saida_tela", rotulo: "Queimados e avariados — com a sua classificação", nota: "O conjunto que os cartões desta aba contam: quem saiu pela ponta da esteira MAIS o que você bateu a martelo como queimado ou avariado, venha de onde vier. É maior que “Saíram pela cascata” exatamente pelo tamanho da sua leitura — a diferença são os casos que a régua reteve ou excluiu e você reclassificou.", teste: (r) => arquivo(r) === "SAÍDA" },
      /* Os três destinos da conta grande, para que cada número da cascata da Visão geral abra
         exatamente a lista dele. Sem isto o clique caía num chip parecido e a lista vinha com
         outro tamanho — que é o jeito mais rápido de perder a confiança de quem confere. */
      { id: "pos_critica", rotulo: "Passaram pela Crítica", nota: "A Crítica registra interrupção no próprio transformador que sustenta o caso — ou a ocorrência coube dentro do serviço. É o que sobra depois da primeira subtração, e é sobre este conjunto que as duas perguntas seguintes são feitas.", teste: (r) => !(arquivo(r) === "EXCLUÍDA" && parouNaInterrupcao(r)) },
      { id: "sem_tmae", rotulo: "Sem deslocamento do TMAE", nota: "Passaram pela Crítica e não têm atendimento registrado no código do transformador. Marcador, não subtração: a chave do TMAE é o elemento onde o defeito foi aberto, então a ausência ali não é contraprova. Fica sinalizado para quem quiser conferir um a um.", teste: (r) => !(arquivo(r) === "EXCLUÍDA" && parouNaInterrupcao(r)) && r.deslocamento === "SEM REGISTRO" },
      { id: "na_esteira", rotulo: "Entraram na esteira", nota: "Tudo que passou da porta: não foi excluído por outra causa nem por falta de interrupção que sustente o caso. É deste conjunto que saem os queimados e avariados, e é dele que se descontam os retidos.", teste: (r) => arquivo(r) !== "EXCLUÍDA" },
      { id: "saida_queimado", rotulo: "Queimados na saída", nota: "Chegaram ao fim da esteira com a causa confirmada como queima: interrupção no próprio transformador, texto descrevendo falha e obra comprovando a troca.", teste: (r) => arquivo(r) === "SAÍDA" && texto(r.confirmado) === "QUEIMADO" },
      { id: "saida_avariado", rotulo: "Avariados na saída", nota: "Mesma esteira, causa confirmada como avaria — vazamento de óleo, tanque deteriorado, falha de bucha. Contam no indicador do mesmo jeito; o que muda é o rótulo.", teste: (r) => arquivo(r) === "SAÍDA" && texto(r.confirmado) === "AVARIADO" },
      { id: "ret_fato", rotulo: "Retidos sem fato", nota: "O campo não registrou nada na janela.", teste: (r) => r.cascata === "RETIDO — SEM INTERRUPÇÃO NA JANELA" },
      { id: "ret_desl", rotulo: "Sem corroboração do TMAE", nota: "Houve interrupção, mas nenhum atendimento registrado no código do transformador dentro da janela. Não retém ninguém desde que a segunda peneira virou marcador — o TMAE grava o defeito no elemento onde ele foi aberto, e a ausência ali não é contraprova.", teste: (r) => arquivo(r) !== "EXCLUÍDA" && r.deslocamento === "SEM REGISTRO" },
      { id: "ret_prova", rotulo: "Retidos sem prova de troca", nota: "Chegaram ao fim, mas o material não comprova ou o texto não decide.", teste: (r) => r.cascata === "RETIDO — SEM PROVA DE TROCA" },
      { id: "ret_dup", rotulo: "Retidos por SS duplicada", nota: "Mesmo transformador e mesmo evento de outra SS: a interrupção prova uma troca, não duas.", teste: (r) => r.cascata === "RETIDO — SS DUPLICADA" },
      { id: "incluir", rotulo: "INCLUIR", nota: "Passou nas três peneiras: campo, texto e material.", teste: (r) => r.decisao === "INCLUIR" },
      { id: "revisao", rotulo: "REVISÃO", nota: "Espera leitura humana, com o motivo escrito. Não é expurgo.", teste: (r) => r.decisao === "REVISÃO" },
      { id: "excluir", rotulo: "EXCLUIR", nota: "A leitura mostrou outra causa.", teste: (r) => r.decisao === "EXCLUIR" },
      { id: "mudou", rotulo: "Mudou na revisão", nota: "A decisão é diferente da que o funil anterior dava.", teste: (r) => r.mudou_na_revisao === "SIM" },
      { id: "queimados", rotulo: "Queimados", nota: "Incluídos cujo texto descreve queima.", teste: (r) => r.decisao === "INCLUIR" && r.categoria_texto === "QUEIMADO" },
      /* Zero cliente é a ressalva mais forte que existe: sem cliente sem energia não há DEC nem
         FEC, e transformador de distribuição que queima sem penalizar ninguém é no mínimo
         estranho. Conferido na base crua somando TODAS as linhas de cada ocorrência — o zero
         não é truncamento de um passo só. */
      /* Só existe porque o texto deixou de vir cortado: 688 descrições de OS terminavam em 300
         caracteres, e o corte caía no fim — que é onde a OS põe o desfecho, as medições e quem
         autorizou. O caso que revelou isso terminava em "AUTORIZADA PELO" com o nome do outro
         lado da tesoura. Autorização é governança, não causa: não move o caso de lugar. Mas é
         pergunta que se faz num conselho, e ela precisa ter resposta antes de ser feita. */
      { id: "autorizacao", rotulo: "Investigar autorização da troca", nota: "A OS registra que a substituição foi autorizada por alguém, nominalmente. Não é causa e não muda a decisão — é governança: quem mandou trocar. Este filtro só passou a existir depois que o texto da OS deixou de vir cortado em 300 caracteres, que era onde o nome ficava.", teste: (r) => r.tem_autorizacao === "SIM" },
      { id: "queima_sem_cliente", rotulo: "Queimado sem nenhum cliente interrompido", nota: "A ocorrência existe e não penalizou ninguém: nenhum cliente ficou sem energia em passo nenhum dela. Conferido na base crua, somando todas as linhas da ocorrência. Sem cliente não há DEC nem FEC — e um transformador de distribuição que queima sem penalizar ninguém pede olhar humano antes de contar.", teste: (r) => r.sem_cliente_interrompido === "SIM" && (arquivo(r) === "SAÍDA" || texto(r.categoria_texto) === "QUEIMADO") },
      { id: "avariados", rotulo: "Avariados", nota: "Incluídos cujo texto descreve avaria.", teste: (r) => r.decisao === "INCLUIR" && r.categoria_texto === "AVARIADO" },
      /* Avaria enquadrada no projeto de queima. São dois campos do mesmo cadastro discordando —
         a obra diz "SUBST. TRAFO AVARIADO" e o custo entra no SIGCO 8812, que em 98% das 1.152
         obras é "SUBST. TRAFO QUEIMADO". Não muda a causa: muda para onde o custo foi. */
      /* Influência invocada. Não é causa e não move o caso: o transformador queimou ou não
         queimou independentemente de quem o cliente conhece. Muda a FILA — quem foi atendido
         antes de quem. Numa auditoria que vai a conselho é o tipo de frase que alguém encontra
         depois, e é melhor estar marcada aqui do que descoberta lá. */
      /* Que proteção atuou. O religador não existe como elemento na Crítica — ela só classifica
         CH, TR, UC, DJ e SE. Quem conta que a proteção desarmou é a nota do executante, e é
         informação de peso: proteção que atua é confirmação operacional de corrente de falta. */
      { id: "prot_rl", rotulo: "Religador atuou", nota: "A nota de campo registra desarme de religador. Não muda a causa nem move o caso: é confirmação operacional de que houve corrente de falta — a proteção viu o defeito e agiu.", teste: (r) => texto(r.protecao) === "RELIGADOR" },
      { id: "prot_ch", rotulo: "Chave fusível ou elo queimado", nota: "A nota de campo registra elo queimado ou chave fusível atuada.", teste: (r) => texto(r.protecao) === "CHAVE FUSÍVEL" },
      { id: "prot_dj", rotulo: "Disjuntor atuou", nota: "A nota de campo registra desarme de disjuntor.", teste: (r) => texto(r.protecao) === "DISJUNTOR" },
      { id: "diretoria", rotulo: "Diretoria invocada para acelerar", nota: "A SS ou a OS pede pressa citando a diretoria — \u201cfavor agilizar devido o cliente ter contato direto com a diretoria\u201d, \u201ca pedido da diretoria\u201d. Não muda a causa nem a decisão: muda a fila de atendimento. Fica marcado porque é pergunta de conselho.", teste: (r) => r.influencia === "SIM" },
      /* Zero cliente deixou de trancar e virou marcador — decisão do dono, repetida em dois
         casos que ele nomeou. Sem cliente não há DEC nem FEC, mas o transformador falhou do
         mesmo jeito, e nos 74 a obra registra transformador movimentado. A bandeira é forte e
         precisa estar à mão: quem for defender o número tem de saber quais são. */
      { id: "q_sem_cliente", rotulo: "Queimados sem nenhum cliente interrompido", nota: "A Crítica registra defeito no próprio transformador dentro da janela e a obra comprova a troca, mas a interrupção não penalizou ninguém. Conferido na base crua somando todas as linhas da ocorrência — o zero não é truncamento de um passo só. Sem cliente não há DEC nem FEC: muda o impacto regulatório, não a existência da falha.", teste: (r) => r.sem_cliente_interrompido === "SIM" && arquivo(r) === "SAÍDA" && texto(r.confirmado) === "QUEIMADO" },
      { id: "zero_registro", rotulo: "Zero cliente que é do registro, não da rede", nota: "A ocorrência veio com zero cliente, mas o MESMO transformador aparece com cliente interrompido noutra ocorrência do acervo — o ativo atende gente. Aqui o zero descreve o registro, não a rede. Num relatório de conselho, esta é a frase que alguém vai testar.", teste: (r) => r.zero_e_registro === "SIM" },
      { id: "a_sem_cliente", rotulo: "Avariados sem nenhum cliente interrompido", nota: "O mesmo, para os casos lidos como avaria — vazamento de óleo, tanque deteriorado, falha de bucha.", teste: (r) => r.sem_cliente_interrompido === "SIM" && arquivo(r) === "SAÍDA" && texto(r.confirmado) === "AVARIADO" },
      { id: "obra_tipo_div", rotulo: "Obra de tipo preventivo descrevendo falha", nota: "A obra tem dois campos e eles discordam: o TIPO diz manutenção preventiva ou programada, e a DESCRIÇÃO diz substituição de trafo queimado. Não muda a causa — a descrição é mais específica que o tipo —, mas é divergência do próprio cadastro.", teste: (r) => r.obra_tipo_diverge === "SIM" },
      /* As duas vozes do campo discordando entre si. Não se resolve com "o campo vence o
         texto", porque aqui os dois lados SÃO campo — e nenhum está errado: um transformador
         que vaza óleo perde isolamento e depois queima. O total não muda; o rótulo é que fica
         devendo. Marcado para quem auditar achar isto já contado, em vez de descobrir. */
      { id: "natureza_discorda", rotulo: "Subcausa e obra discordam sobre a natureza", nota: "O caso conta como queimado e a Crítica declara vazamento de óleo, falha de bucha ou tanque deteriorado — ou o contrário. A subcausa registra o defeito que a equipe constatou; a obra registra o que foi trocado e sob qual projeto contábil. Como queimados e avariados contam nos dois casos, o total não muda: o que fica devendo é o rótulo.", teste: (r) => r.campo_discorda_natureza === "SIM" },
      { id: "avaria_sigco", rotulo: "Avaria no SIGCO de queima", nota: "A leitura concluiu avaria e o custo entrou no projeto SIGCO de transformador queimado. É divergência de enquadramento contábil, não de causa técnica — mas numa auditoria que vai a conselho é a divergência que se pergunta primeiro.", teste: (r) => r.sigco_avaria_em_queima === "SIM" },
      { id: "pararaio", rotulo: "Queima do para-raio, avaria do trafo", nota: "O texto cita queima, mas do para-raio; o que o transformador tem é vazamento de óleo. Relidos como avaria — não muda o total, muda de que lado contam.", teste: (r) => Boolean(texto(r.leitura_pararaio)) },
    ],
    semfato: [
      // A primeira peneira hoje retém por um motivo só. A SS duplicada saiu daqui: ela não é
      // caso pendente de leitura, é o mesmo evento contado duas vezes — e foi para as exclusões.
      { id: "parados", rotulo: "Tudo que parou aqui", nota: "Todos os que a primeira peneira não admitiu: sem interrupção no próprio transformador dentro do intervalo da ocorrência nem nas 24 horas seguintes ao último passo, ou ausentes da Crítica em papel nenhum. Hoje eles saem do indicador em vez de ficar retidos — mas continuam sendo quem parou aqui, e é aqui que se lê por quê.", teste: (r) => parouNaInterrupcao(r) },
      { id: "todos", rotulo: "Sem interrupção na janela", nota: "Nem interrupção no próprio trafo nem atendimento do TMAE dentro da janela.", teste: (r) => parouNaInterrupcao(r) },
      { id: "p_outra_data", rotulo: "Tem registro, mas em outra data", nota: "A Crítica registra defeito aberto neste transformador — só que fora do intervalo da ocorrência e das 24 horas seguintes ao último passo. A distância fica escrita em cada caso: 26 dias e 26 horas são coisas diferentes.", teste: (r) => texto(r.expurgo_gatilho) === "fora_da_janela" },
      { id: "p_ausente", rotulo: "Ausente da base de interrupções", nota: "Não há defeito aberto neste transformador que sustente o caso — e são dois jeitos de isso acontecer: o código não aparece na Crítica em papel nenhum nos sete meses, ou aparece só como interrompido e manobrado, nunca como o elemento onde o defeito foi aberto. Os dois foram somados por ordem dele, depois de ler os casos um a um.", teste: (r) => texto(r.expurgo_gatilho) === "sem_interrupcao" },
      { id: "vizinho", rotulo: "Vizinho encontrado", nota: "Existe ocorrência em outro ativo do mesmo alimentador ou localidade na janela.", teste: (r) => parouNaInterrupcao(r) && Boolean(texto(r.vizinho)) && !texto(r.vizinho).startsWith("Nada") },
      { id: "nada", rotulo: "Nada encontrado", nota: "Nem vizinho. É a lista que sobe para investigação de campo.", teste: (r) => parouNaInterrupcao(r) && texto(r.vizinho).startsWith("Nada") },
      // O chip "provavelmente no histórico de 2025" saiu daqui: apontava para um arquivo que
      // faltava, dezembro/2025 entrou no acervo e as 24 SS de borda foram reprocuradas — as 24
      // acharam ocorrência. Filtro que promete explicação já respondida é pior que nenhum.
      /* "Sem interrupção" era uma coisa só e são quatro. A conferência linha a linha na base
         crua, sobre os 115 retidos, separou: 47 não existem na Crítica em papel nenhum — esses
         saíram do indicador; 25 foram interrompidos na janela com o defeito noutro elemento;
         35 têm defeito próprio noutra data; 8 só aparecem interrompidos por defeito alheio. A
         pergunta "tem interrupção?" tem resposta diferente em cada um. */
      { id: "sem_no_trafo", rotulo: "Sem interrupção NO TRANSFORMADOR", nota: "A Crítica não registra defeito neste transformador dentro da janela. Pode haver interrupção — inclusive uma que o deixou sem energia —, mas com o defeito aberto noutro elemento: unidade consumidora, chave, disjuntor. O que falta é o registro de defeito no próprio ativo.", teste: (r) => texto(r.def_elemento) !== "TR" },
      { id: "antes", rotulo: "Aberta antes da interrupção", nota: "A ocorrência existe no mesmo transformador, mas começou depois de a SS ser aberta por mais de uma hora. Não é \u201csem evento\u201d: é registro atrasado ou evento diferente, e a pergunta que ela levanta é essa. A tolerância para trás é de uma hora porque a ordem normal do campo é o cliente ligar, a SS nascer e a ocorrência ser registrada minutos depois.", teste: (r) => r.aberta_antes === "SIM" },
      { id: "antes_q", rotulo: "Aberta antes · texto diz queima ou avaria", nota: "Dos abertos antes da interrupção, os que o texto descreve como falha do equipamento. São os que merecem leitura à mão primeiro.", teste: (r) => r.aberta_antes === "SIM" && ["QUEIMADO", "AVARIADO"].includes(texto(r.categoria_texto)) },
      { id: "def_outro", rotulo: "Interrupção com defeito em outro elemento", nota: "Não há ocorrência com defeito neste transformador na janela, mas há ocorrência que o deixou sem energia com o defeito noutro elemento — unidade consumidora, chave ou disjuntor. É informação, não prova: o transformador ficou sem energia, o que não quer dizer que ele falhou.", teste: (r) => parouNaInterrupcao(r) && Boolean(texto(r.def_elemento)) },
      { id: "outro_assunto", rotulo: "A ocorrência mostrada não é deste serviço", nota: "A SS e o transformador são os do caso; o que não bate é a ocorrência exibida no painel. O caso não casou, e a ocorrência que aparece no dossiê é só a mais próxima. A nota de campo dela descreve conexão, cabo, medidor ou disjuntor, sem citar transformador nenhum: ela não explica nada sobre este ativo. Vale só fora da janela — dentro dela, a nota omitir a palavra é rotina, acontece em 858 casos.", teste: (r) => r.oc_outro_assunto === "SIM" },
    ],
    expurgos: [
      // A terceira peneira hoje tem UM motivo de parada: a obra não comprova a troca. A
      // exclusão por causa saiu daqui — ela acontece antes da esteira e tem aba própria.
      { id: "parados", rotulo: "Tudo que parou aqui", nota: "A terceira peneira retém por um motivo só: a obra não comprova que um transformador foi movimentado. É exatamente o número que a etapa da Análise de SS e OS anuncia.", teste: (r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" },
      { id: "semprova", rotulo: "Sem prova de troca", nota: "Chegaram ao terceiro estágio, mas o material não comprova a troca ou o texto não decide. Não é exclusão: é ausência de prova.", teste: (r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" },
      /* Duas coisas que a peneira tratava como uma só. A obra que NUNCA FOI GERADA não tem o
         que conferir — e essa sai do indicador, por regra do dono. A obra que EXISTE mas não
         está no export de material tem: o que falta é a extração chegar. Chamar as duas de
         "sem prova" é dizer que a prova não existe, quando o que não existe é o nosso acesso. */
      { id: "obra_encerrada_sem_mat", rotulo: "Obra encerrada e conferida, sem transformador", nota: "A obra está no export de material, foi encerrada e tem valor realizado — e não movimentou transformador nenhum. Aqui o zero é medida, não ausência de dado: alguém executou e cobrou algo que não foi a troca do transformador.", teste: (r) => r.material_conferido === "SIM" && (Number(r.trafos_material) || 0) === 0 && (Number(r.obra_realizado) || 0) > 0 },
      { id: "siago", rotulo: "Só falta a extração do SIAGO", nota: "A obra existe, com número, descrição e enquadramento — e não está no export de material que temos. Não é ausência de prova: é ausência da extração. Estes 25 fecham sozinhos quando o SIAGO vier, e são a fila mais barata de resolver desta auditoria.", teste: (r) => r.pendente_siago === "SIM" },
      { id: "siago_retido", rotulo: "Retidos que só esperam a extração do SIAGO", nota: "Destes que a terceira peneira segurou, os que têm obra com número, descrição e enquadramento — e que simplesmente não estão no export de material que temos. Não é ausência de prova: é ausência da extração. Fecham sozinhos quando o SIAGO vier.", teste: (r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" && r.pendente_siago === "SIM" },
      { id: "semprova_mat", rotulo: "Sem prova · material não conferido", nota: "A obra está fora do export de material, ou não chegou a ser gerada.", teste: (r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" && r.material_conferido !== "SIM" },
      { id: "semprova_texto", rotulo: "Sem prova · texto não decide", nota: "A leitura ficou indefinida, e ela nunca decide sozinha.", teste: (r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" && r.leitura === "L3" },
      { id: "suspeita", rotulo: "Sob suspeita no texto", nota: "MEDIDO_, plano de medida, remanejamento ou sobrecarga. Não retém ninguém: marca para quem for conferir à mão.", teste: (r) => r.sob_suspeita === "SIM" && arquivo(r) === "RETIDO — SEM PROVA DE TROCA" },
    ],
    /* --------------------------------------------- exclusões: fora da esteira, não etapa dela
       Exclusão não é peneira. Peneira pergunta se o caso se sustenta; exclusão diz que o caso
       nunca foi deste indicador — e isso vale tenha ele interrupção na janela ou não. Enquanto
       a exclusão morava dentro da terceira peneira, um furto sem interrupção ficava parado na
       fila de pendências como se ainda esperasse leitura, e a fila mentia sobre o que falta. */
    exclusoes: [
      { id: "todos", rotulo: "Todas as exclusões", nota: "Saíram do indicador antes da esteira: por causa declarada no texto, por categoria gravada na SS, por duplicidade — ou pela sua classificação. A decisão do fluxo continua gravada em cada uma.", teste: (r) => arquivo(r) === "EXCLUÍDA" },
      /* As exclusões se dividem em duas famílias que não se parecem: uma diz "o caso é de outra
         natureza" — furto, abalroamento, obra programada — e a outra diz "não há interrupção que
         sustente este caso". Somar as duas numa caixa só é o que fazia a porta parecer arbitrária.
         Este recorte isola a primeira; a segunda tem aba própria, a da primeira peneira. */
      { id: "outra_causa_resto", rotulo: "Outras causas — a cauda", nota: "As exclusões por causa declarada que não estão entre as cinco maiores. Cada uma tem poucas SS e todas continuam clicáveis uma a uma nos filtros desta aba: o agrupamento é só para a cascata caber na tela.", teste: (r) => arquivo(r) === "EXCLUÍDA" && !parouNaInterrupcao(r) && !causasTop.has(categoriaDe(r) || "manual") },
      { id: "outra_causa", rotulo: "Fora do indicador por outra causa declarada", nota: "O texto da SS ou da OS, ou o cadastro da obra, dizem que o caso é de outra natureza — furto, abalroamento, remanejamento, troca programada, tape. Estes não dependem de haver ou não interrupção: mesmo com apagão registrado no transformador, a causa não é falha do equipamento.", teste: (r) => arquivo(r) === "EXCLUÍDA" && !parouNaInterrupcao(r) },
      { id: "g_furto", rotulo: "Furto, roubo ou vandalismo", nota: "O texto declara furto. Vai para o projeto de reposição de ativo furtado, não é falha de equipamento.", teste: (r) => gatilhoDe(r) === "furto" },
      { id: "g_abalro", rotulo: "Abalroamento", nota: "Colisão de veículo. Vira ressarcimento de terceiro, não indicador de falha.", teste: (r) => gatilhoDe(r) === "abalroamento" },
      { id: "g_cola", rotulo: "Cola e fita — reparo, não troca", nota: "A OS conta que o serviço foi colar e vedar a bucha do transformador que vazava. O equipamento ficou no poste: não há série nem tombamento de retirado e instalado, e não há transformador no material. Reparo não é substituição, e sem substituição não há falha a contar neste indicador. Atenção ao campo do formulário \u201cFEITO COLA E FITA\u201d, que diz Sim em 65 casos: na maioria deles houve troca de transformador E colagem, então o campo sozinho não decide — quem decide é o relato do executante.", teste: (r) => gatilhoDe(r) === "cola_fita" },
      { id: "g_meta", rotulo: "Substituído pela Meta", nota: "A OS declara que quem trocou o transformador foi a Meta, enquanto a obra está registrada noutra empreiteira. Quem executou não é quem o cadastro contratou — e é o texto do executante que diz isso, não uma inferência.", teste: (r) => gatilhoDe(r) === "meta" },
      { id: "g_matheus", rotulo: "Avaliar com o Matheus", nota: "Fora da conta enquanto a avaliação não decidir. Entram aqui os casos que o dono mandou parar para avaliar — não é veredito sobre o equipamento, é reconhecimento de que as fontes do caso não fecham entre si e ninguém deve resolver isso sozinho na régua.", teste: (r) => gatilhoDe(r) === "avaliar_matheus" },
      { id: "g_terc", rotulo: "Causada por terceiros", nota: "A Crítica registra a ocorrência com causa CAUSADA POR TERCEIROS. Não é falha do equipamento: alguém mexeu na rede. Vale a mesma leitura do abalroamento — vira ressarcimento, não indicador. Aqui o defeito pode estar na chave e não no transformador, e é por isso que a esteira não contava a ocorrência como fato: o dano é real, a prova de falha é que não existe.", teste: (r) => gatilhoDe(r) === "terceiros" },
      { id: "g_fase", rotulo: "Falta de fase interna", nota: "O texto declara que o transformador perdeu uma fase por dentro, e a troca foi executada como plano de medida com aumento de potência. As duas coisas cabem: o defeito existiu, e a decisão de trocar foi de capacidade.", teste: (r) => gatilhoDe(r) === "falta_fase" },
      { id: "g_semtrafo", rotulo: "Obra encerrada sem transformador movimentado", nota: "A obra está no export de material, foi encerrada e tem valor realizado — e o material conferido não traz transformador nenhum. Aqui o zero é medida, não ausência de dado: alguém executou e cobrou algo que não foi a troca. Diferente das que só esperam o SIAGO, em que o zero é lacuna.", teste: (r) => gatilhoDe(r) === "obra_sem_transformador" },
      { id: "g_semexec", rotulo: "Obra aberta que não executou nada", nota: "A obra existe, tem número e descrição — e zero transformador no material com R$ 0 realizado. Uma obra que não executou não declara causa: o que está escrito nela é o plano de quem abriu, não o registro de quem fez. Sai pela falta de execução, não pela causa que declara.", teste: (r) => gatilhoDe(r) === "obra_sem_execucao" },
      { id: "g_reman", rotulo: "Remanejamento", nota: "O texto declara troca de potência — \u201cremanejar trafo de 5 kVA por trafo de 15 kVA\u201d — ou mudança de poste. É decisão de operação: o equipamento saiu porque decidiram, não porque falhou. Era só marcador de suspeita até se ver que os 11 casos da base dizem todos a mesma coisa.", teste: (r) => gatilhoDe(r) === "remanejamento" },
      { id: "g_prev", rotulo: "Preventivo ou programado", nota: "Não houve defeito: a troca foi programada.", teste: (r) => gatilhoDe(r) === "preventivo" },
      { id: "g_div", rotulo: "Divisão de circuito", nota: "Obra de capacidade — entra como preventivo, não como falha.", teste: (r) => gatilhoDe(r) === "divisao" },
      { id: "g_constr", rotulo: "Construção ou obra nova", nota: "Obra nova: o transformador foi instalado, não substituído. Não havia equipamento anterior para falhar.", teste: (r) => gatilhoDe(r) === "construcao" },
      { id: "g_desat", rotulo: "Desativação do posto", nota: "Retirada definitiva do posto de transformação. O equipamento desceu porque o ponto deixou de existir, não porque queimou.", teste: (r) => gatilhoDe(r) === "desativacao" },
      { id: "g_aux", rotulo: "Auxiliar de religador ou regulador", nota: "Não é unidade de distribuição da concessionária.", teste: (r) => gatilhoDe(r) === "auxiliar" },
      { id: "g_part", rotulo: "Transformador particular", nota: "O ativo é do cliente ou de terceiro.", teste: (r) => gatilhoDe(r) === "particular" },
      { id: "g_semos", rotulo: "Sem OS e sem obra", nota: "A ordem de serviço não tem descrição e a obra não foi gerada: não há relato do executante nem consulta de material. Não é afirmação sobre a causa — é ausência de documento. O caso é investigável, não confirmável.", teste: (r) => gatilhoDe(r) === "sem_os" },
      { id: "g_semfato", rotulo: "Sem interrupção na base Crítica", nota: "Nem ocorrência na Crítica, nem atendimento no TMAE, nem vizinho no alimentador, na localidade ou em código parecido. Só entram aqui os casos em que a busca por vizinhança não achou absolutamente nada — nos que acharam, o fato provavelmente existe sob outro código e o caso continua retido.", teste: (r) => gatilhoDe(r) === "sem_fato" },
      { id: "g_semobra", rotulo: "Obra nunca gerada", nota: "A obra não foi aberta e a SS já passou de 60 dias. Sem obra não há consulta de material, e depois de dois meses ela não vem mais: o caso deixa de ser espera e vira promessa vazia. As que ainda estão no prazo continuam retidas.", teste: (r) => gatilhoDe(r) === "sem_obra" },
      { id: "g_tap", rotulo: "Tape interno", nota: "O transformador foi trocado para regularizar tensão porque o tape é interno e não pode ser ajustado em campo. Nunca dispara pelo campo do formulário \u201cPOS. TAP : 03\u201d, que aparece em 627 das 1.510 descrevendo o equipamento retirado e não é causa de nada.", teste: (r) => gatilhoDe(r) === "tap" },
      { id: "g_cadastro", rotulo: "Possível erro de cadastro do código", nota: "A equipe declara no texto que o código do cadastro não corresponde ao equipamento que está no poste. Enquanto isso não for resolvido, qualquer casamento por código é casamento com o ativo errado — o caso não sustenta nem inclusão nem exclusão pelo campo.", teste: (r) => gatilhoDe(r) === "erro_cadastro" },
      { id: "g_forajanela", rotulo: "Ausente da base de interrupções · registro em outra data", nota: "O ativo aparece na Crítica, mas a SS não foi aberta durante nenhuma ocorrência dele nem nas 24 horas seguintes ao último passo. A distância fica escrita em cada caso — 26 dias e 26 horas são coisas diferentes, e quem lê precisa ver qual é.", teste: (r) => gatilhoDe(r) === "fora_da_janela" },
      { id: "g_contida", rotulo: "Fora da janela · mas o corte cabe no serviço", nota: "A ocorrência começa depois de a SS abrir e termina antes de ela fechar — em alguns casos no mesmo minuto. Pode não ser evento alheio: pode ser o desligamento que a própria equipe fez para trocar o transformador. Um trafo vazando óleo continua energizado, e ninguém fica sem luz até alguém desligar. São os candidatos mais fortes a voltar para o indicador.", teste: (r) => r.oc_contida_na_ss === "SIM" },
      { id: "g_ausente", rotulo: "Ausente da base de interrupções", nota: "Reúne os dois casos de não haver interrupção que sustente a SS: o código que não aparece na Crítica em papel nenhum e o que aparece, mas em data que não cabe na janela. Você pediu que contassem juntos. Os dois recortes finos continuam aqui embaixo para separar quando for preciso.", teste: (r) => categoriaDe(r) === "sem_interrupcao" },
      { id: "g_seminterr", rotulo: "Ausente da base de interrupções · sem registro nenhum", nota: "O código do transformador não aparece na Crítica em papel nenhum — nem com defeito, nem interrompido, nem manobrado. Conferido linha a linha nos sete meses do acervo. Sem registro de interrupção não há evento a medir.", teste: (r) => gatilhoDe(r) === "sem_interrupcao" },
      { id: "g_dup", rotulo: "SS duplicada", nota: "Divide o mesmo evento e o mesmo transformador com outra SS. A interrupção prova uma troca, não duas — e a prova fica com a SS mais próxima do evento.", teste: (r) => gatilhoDe(r) === "duplicada" },
      { id: "commat", rotulo: "Excluídas que TÊM material", nota: "Instalaram um transformador no lugar — no furto, no lugar do que levaram. O material prova que houve troca; não prova por quê.", teste: (r) => arquivo(r) === "EXCLUÍDA" && (Number(r.trafos_material) || 0) > 0 },
      { id: "presumida", rotulo: "Exclusão por presunção, não constatação", nota: "O texto diz \u201cpossivelmente furtado\u201d, \u201cao que tudo indica\u201d, \u201csinais de vandalismo\u201d ou \u201ctentativa de furto\u201d. A equipe supôs a partir do que viu; não constatou. Continuam fora do indicador, mas ficam marcadas — suposição arquivada como fato é o que ninguém revisa depois.", teste: (r) => r.exclusao_presumida === "SIM" },
      { id: "suas_regras", rotulo: "Saíram por regra que você pediu", nota: "A categoria existe porque você mandou criar, e em várias delas você apontou o caso que convenceu. O dossiê de cada uma diz qual foi. Autoria não é detalhe: quem defende o número precisa poder dizer de onde veio cada corte.", teste: (r) => r.exclusao_pedida_pelo_dono === "SIM" },
      { id: "manual", rotulo: "Excluídas por você à mão", nota: "Não saíram por regra: você bateu o martelo. A decisão do fluxo continua registrada ao lado.", teste: (r) => ["EXCLUIDO", "FURTADO"].includes(classificacao[texto(r.ss)]?.classe || ""),
 },
      /* E as que ninguém escreveu à mão. Uma categoria nova nascia invisível: "obra de poste"
         tinha quatro casos e nenhuma caixa, nenhum chip, nenhum jeito de clicar. Agora a lista
         se completa sozinha a partir do dado — o que existir no gatilho existe na tela. */
      ...[...new Set(registros.map((r) => gatilhoDe(r)).filter(Boolean))]
        .filter((k) => !GATILHO_CHIP[k])
        .map((k) => ({
          id: `g:${k}`,
          rotulo: GATILHO_ROTULO[k] || k,
          nota: GATILHO_NOTA[k] || "Categoria de exclusão registrada no gatilho de cada caso.",
          teste: (r: Registro) => gatilhoDe(r) === k,
        })),
      { id: "manual_furto", rotulo: "Marcadas por você como furto", nota: "Furto, roubo ou vandalismo pela sua leitura, não pela régua.", teste: (r) => classificacao[texto(r.ss)]?.classe === "FURTADO" },
    ],
    preventivos: [
      { id: "todos", rotulo: "Todos os preventivos", nota: "Troca sem defeito: programada, por divisão de circuito ou marcada por você. Não conta como falha de equipamento — e por isso mora dentro das exclusões, não numa terceira pilha.", teste: (r) => gatilhoDe(r) === "preventivo" || gatilhoDe(r) === "divisao" },
      { id: "regra", rotulo: "Pela regra", nota: "O texto declarou preventivo ou divisão de circuito, e a exclusão foi automática.", teste: (r) => texto(r.expurgo_gatilho) === "preventivo" || texto(r.expurgo_gatilho) === "divisao" },
      { id: "manual", rotulo: "Marcados por você", nota: "Saíram da esteira pela sua leitura, não por regra.", teste: (r) => classificacao[texto(r.ss)]?.classe === "PREVENTIVO" },
      { id: "susp", rotulo: "Candidatos — ainda no indicador", nota: "Continuam dentro da conta, mas o texto traz sinal de troca programada: sobrecarga, plano de medida, remanejamento ou pedido de potência específica. É ponto de atenção, não veredito — quem decide é você.", teste: (r) => r.sob_suspeita === "SIM" && arquivo(r) === "SAÍDA" },
    ],
    ativos: [],
    mapa: [],
    regras: [],
    bases: [],
  };

  const recortesDoModulo = RECORTES[modulo] || [];
  const recorteAtivo = recorte && recortesDoModulo.find((x) => x.id === recorte.id);
  const agulha = normalize(busca).trim();

  const filtraProfunda = (linha: Registro, recorte: string) => {
    const marca = classificacao[texto(linha.ss)];
    /* Os recortes "marcados por mim" trazem casos que a régua etiquetou para o julgamento
       dele — o caso chega aqui ANTES de ele classificar, senão a lista nasceria vazia. */
    if (recorte === "claude_int") return texto(linha.analise_claude) === "casaria pelo interrompido";
    if (!marca) return false;
    if (recorte === "q") return marca.classe === "QUEIMADO";
    if (recorte === "a") return marca.classe === "AVARIADO";
    if (recorte === "r") return marca.classe === "REGRA";
    if (recorte === "p") return marca.classe === "PROFUNDA";
    if (recorte === "v") return marca.classe === "PREVENTIVO";
    if (recorte === "x") return marca.classe === "EXCLUIDO";
    if (recorte === "f") return marca.classe === "FURTADO";
    if (recorte === "a_sigco") return marca.classe === "AVARIADO" && linha.sigco_avaria_em_queima === "SIM";
    const falha = ["QUEIMADO", "AVARIADO"].includes(marca.classe);
    if (recorte === "meu_casa") return falha && texto(linha.def_elemento) === "TR" && Number(linha.oc_dist_h) === 0;
    if (recorte === "meu_borda") return falha && texto(linha.def_elemento) === "TR" && Number(linha.oc_dist_h) !== 0;
    if (recorte === "meu_sem") return falha && texto(linha.def_elemento) !== "TR";
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
      // e o teste do próprio recorte por cima, quando ele existir: os chips que não falam de
      // classe — "natureza divergente", "zero que é do registro" — caíam no `return true` do
      // filtraProfunda e a lista mostrava tudo que estava marcado, ignorando o recorte
      if (recorteAtivo) base = base.filter(recorteAtivo.teste);
    } else if (recorteAtivo) {
      base = base.filter(recorteAtivo.teste);
    }
    if (!agulha) return base;
    return base.filter((r) => normalize([
      r.ss, r.os, r.obra, r.trafo, r.localidade, r.alimentador, r.solicitante, r.origem,
      r.equipe_ss, r.at_equipe, r.categoria_texto, r.oc_causa, r.oc_sub, r.decisao, r.motivo_decisao,
      r.obra_tipo, r.obra_descricao, r.sigco, r.autorizacao, r.expurgo_gatilho,
    ].join(" ")).includes(agulha));
  }, [comJanela, recorte, recorteAtivo, agulha, modulo, classificacao]);

  if (!fluxo) return <main className="loading">
    {erroCarga ? <>
      <strong className="loading-erro">Não consegui carregar a base</strong>
      <span>{erroCarga}. O site está publicado — isto é a rede entre o seu aparelho e ele, ou a janela de alguns segundos logo depois de uma publicação.</span>
      <button type="button" className="loading-botao" onClick={() => carregarFluxo()}>Tentar de novo</button>
    </> : <>
      <i /><span>Carregando as 1.510 solicitações…</span>
      {demorando ? <>
        <span className="loading-demora">Está demorando mais que o normal. São 2 MB de dados — em sinal fraco isso leva um tempo.</span>
        <button type="button" className="loading-botao" onClick={() => carregarFluxo()}>Tentar de novo</button>
      </> : null}
    </>}
  </main>;

  const total = registros.length;
  const conta = (teste: (r: Registro) => boolean) => registros.filter(teste).length;
  const CAP = 300;
  const historicoDoAtivo = ativo ? fluxo.historico.filter((l) => texto(l[0]) === ativo) : [];
  const ssDoAtivo = ativo ? registros.filter((r) => texto(r.trafo) === ativo) : [];

  /* Tudo o que este navegador guardou, num arquivo só. Não é só a classificação: varre o
     localStorage inteiro, porque o que interessa a quem for conferir é o estado completo, e
     amanhã pode haver outra coisa guardada aqui. Vai com o carimbo de hora e a contagem, para
     quem receber saber do que se trata sem abrir. */
  const exportarLocal = () => {
    const tudo: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (!chave) continue;
      const bruto = localStorage.getItem(chave) || "";
      try { tudo[chave] = JSON.parse(bruto); } catch { tudo[chave] = bruto; }
    }
    const marcas = (tudo["fluxo-1510-classificacao"] || {}) as Record<string, { classe: string }>;
    const porClasse: Record<string, number> = {};
    Object.values(marcas).forEach((m) => { porClasse[m.classe] = (porClasse[m.classe] || 0) + 1; });
    const pacote = {
      exportado_em: new Date().toISOString().slice(0, 16).replace("T", " "),
      total_classificado: Object.keys(marcas).length,
      por_classe: porClasse,
      dados: tudo,
    };
    const texto = JSON.stringify(pacote, null, 1);
    const blob = new Blob([texto], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `minhas-classificacoes-${pacote.exportado_em.replace(/[: ]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    // e o mesmo conteúdo na área de transferência, para colar numa conversa sem anexar arquivo
    void navigator.clipboard?.writeText(texto).catch(() => {});
    setExportado(`${pacote.total_classificado} classificações exportadas e copiadas`);
    setTimeout(() => setExportado(""), 6000);
  };

  /* ---------------------------------------------------------------- espelho no Supabase
     O localStorage é frágil por natureza: some se o navegador limpar os dados do site, se o
     auditor trocar de máquina, ou se abrir numa aba anônima. Uma noite de leitura caso a caso
     não pode depender disso — e o dono disse a frase que define o requisito: "posso perder as
     análises dessa noite não".

     O espelho é ESCRITA CEGA, de propósito. Cada martelo dispara um insert e ninguém espera a
     resposta: se a rede cair, o localStorage já guardou e a tela não trava nem mente. Na volta,
     o que estiver no banco é mesclado com o que estiver no navegador, e o mais recente vence —
     assim o auditor pode trocar de máquina no meio do trabalho sem perder nada.

     A tabela não aceita update nem delete. Cada decisão é uma linha nova; mudar de ideia depois
     de ler o dossiê inteiro é o que se espera de uma revisão, e apagar isso apagaria o caminho. */
  const classificar = (ss: string, classe: string) => {
    const atual = { ...classificacao };
    const agora = new Date();
    if (classe === "LIMPAR") delete atual[ss];
    // hora local de quem está lendo, no mesmo formato que a volta do banco produz — antes uma
    // ponta era UTC e a outra local, e a comparação "qual é a mais recente" errava por 3 horas
    else atual[ss] = { classe, quem: "análise local", quando: agora.toLocaleString("sv-SE").slice(0, 16) };
    setClassificacao(atual);
    localStorage.setItem("fluxo-1510-classificacao", JSON.stringify(atual));
    if (classe !== "LIMPAR") void drenar([{ ss, classe, marcado_em: agora.toISOString() }]);
  };
  /* Os botões do dossiê. Preventivo e Excluído chegaram à tabela como V e X e não chegaram
     aqui — o dono classificava pela lista e não pelo caso aberto, que é justamente onde ele lê
     o texto inteiro antes de bater o martelo. A ordem segue a do fluxo: primeiro as duas causas
     que contam, depois as duas que tiram do indicador, por último as duas de procedimento. */
  const CLASSES: Array<[string, string, string]> = [
    ["QUEIMADO", "Queimado", "good"],
    ["AVARIADO", "Avariado", "pend"],
    ["REGRA", "Vale a regra do fluxo", "warn"],
    ["PROFUNDA", "Análise profunda", "bad"],
  ];
  /* Uma categoria por botão, tiradas do mesmo mapa que nomeia as exclusões da regra — se uma
     categoria nascer lá, o botão dela aparece aqui sozinho. Furto e preventivo já tinham botão
     próprio e continuam com ele: são os dois identificadores antigos, e trocá-los quebraria as
     marcações que já estão gravadas no banco. */
  const CATEGORIAS_EXC: Array<[string, string]> = [
    ["FURTADO", GATILHO_ROTULO.furto],
    ["PREVENTIVO", GATILHO_ROTULO.preventivo],
    ...Object.entries(GATILHO_ROTULO)
      .filter(([k]) => !["furto", "preventivo"].includes(k))
      .map(([k, v]) => [`${PREFIXO_EXC}${k}`, v] as [string, string]),
    ["EXCLUIDO", "Sem categoria — só fora do indicador"],
  ];

  /* A barra conta a DESCIDA: quantos entram em cada etapa, em cinza, e quantos ficam presos
     ali, em vermelho. E a esteira não começa mais nas 1.510 — começa no que sobra depois das
     exclusões, que acontecem antes dela e têm bloco próprio embaixo. */
  const excluidas = conta((r) => arquivo(r) === "EXCLUÍDA");
  const entramE1 = total - excluidas;
  const entramE2 = conta((r) => arquivo(r) !== "EXCLUÍDA" && arquivo(r) !== "RETIDO — SEM INTERRUPÇÃO NA JANELA");
  const entramE3 = entramE2;
  const paramE3 = conta((r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA");
  const paramE4 = conta((r) => arquivo(r) === "RETIDO — RESSALVA DA INTERRUPÇÃO");
  const naSaida = conta((r) => arquivo(r) === "SAÍDA");
  // Preventivo não é destino próprio: é recorte das exclusões. O caso continua contado uma
  // vez só — em EXCLUÍDA — e esta linha diz quantas dessas são troca sem defeito.
  const preventivos = conta((r) => gatilhoDe(r) === "preventivo" || gatilhoDe(r) === "divisao");
  const porClasseNav = (c: string) => registros.filter((r) => classificacao[texto(r.ss)]?.classe === c).length;
  const NAV: Array<{ grupo: string; itens: Array<{ id: Modulo; rotulo: string; codigo: string; entram?: number; param?: number; marca?: number; tom?: "verde" | "cinza"; recorte?: string }> }> = [
    /* Cada peneira é seguida imediatamente pela aba de quem ela reteve, e o número da aba é o
       mesmo que a peneira anuncia. Antes os retidos moravam num grupo separado no fim da barra,
       e a etapa dizia "param 209" enquanto a aba correspondente abria com 206 — os 3 restantes
       eram outra linha, noutro grupo. Quem lê a esteira agora desce sem procurar nada. */
    { grupo: "A esteira, de cima para baixo", itens: [
      { id: "visao", rotulo: "Visão geral", codigo: "01", marca: total, tom: "cinza" },
      // Só o número que ENTRA. O retido já tem linha própria logo abaixo, e o mesmo número
      // aparecendo duas vezes na mesma barra confunde mais do que informa.
      { id: "interrupcao", rotulo: "Interrupção", codigo: "02", entram: entramE1, recorte: "todos" },

      { id: "deslocamento", rotulo: "Deslocamento", codigo: "03", entram: entramE2, recorte: "todos" },
      { id: "semdesloc", rotulo: "Sem corroboração do TMAE", codigo: "03·1", marca: conta((r) => r.deslocamento === "SEM REGISTRO"), tom: "cinza", recorte: "todos" },
      { id: "ssos", rotulo: "Análise de SS e OS", codigo: "04", entram: entramE3, recorte: "todos" },
      { id: "expurgos", rotulo: "Parados na análise", codigo: "04·1", param: paramE3, recorte: "parados" },
      { id: "ressalva", rotulo: "Ressalva da interrupção", codigo: "05", entram: entramE3 - paramE3, recorte: "fila" },
      { id: "ressalva", rotulo: "Retidos pela ressalva", codigo: "05·1", param: paramE4, recorte: "todos" },
      { id: "decisao", rotulo: "Queimados e avariados", codigo: "06", marca: naSaida, tom: "verde", recorte: "saida" },
    ]},
    /* As exclusões vêm DEPOIS da esteira na barra e ANTES dela no tempo. Não é contradição: o
       leitor precisa entender a esteira para entender o que foi tirado dela, mas o caso
       excluído nunca chegou a descer nenhum degrau. Ficam aqui embaixo, com o motivo escrito
       em cada linha, em vez de poluírem a fila de quem ainda espera leitura. */
    { grupo: "Fora da esteira", itens: [
      { id: "exclusoes", rotulo: "Exclusões", codigo: "07", marca: excluidas, tom: "cinza", recorte: "todos" },
      /* Esta aba morava dentro da esteira, embaixo da primeira peneira, e anunciava 137 logo
         abaixo de uma linha que dizia "a peneira 1 retém 0". As duas coisas eram verdade e
         juntas confundiam: quem parou na interrupção não está retido, está excluído. A aba
         mudou de grupo, não de conteúdo. */
      { id: "semfato", rotulo: "…destas, sem interrupção que sustente", codigo: "07·1", marca: conta((r) => parouNaInterrupcao(r)), tom: "cinza", recorte: "parados" },
      { id: "preventivos", rotulo: "Preventivos", codigo: "07·1", marca: preventivos, tom: "cinza", recorte: "todos" },
      { id: "obra", rotulo: "Obra e SIGCO", codigo: "08", marca: conta((r) => !texto(r.obra)), tom: "cinza", recorte: "todos" },
      { id: "ativos", rotulo: "Por transformador", codigo: "09" },
      { id: "mapa", rotulo: "Mapa dos ativos", codigo: "10", marca: conta((r) => Boolean(r.lat)), tom: "cinza" },
    ]},
    /* O martelo do dono, separado por classe. Cada linha abre a mesma aba num recorte — é a
       sua leitura, contada à parte da decisão da regra, que continua gravada em cada caso. */
    { grupo: "Minha classificação", itens: [
      { id: "profunda", rotulo: "Tudo que classifiquei", codigo: "11", marca: Object.keys(classificacao).length, tom: "cinza", recorte: "todos" },
      { id: "profunda", rotulo: "Queimados", codigo: "11·1", marca: porClasseNav("QUEIMADO"), tom: "verde", recorte: "q" },
      { id: "profunda", rotulo: "Avariados", codigo: "11·2", marca: porClasseNav("AVARIADO"), tom: "cinza", recorte: "a" },
      { id: "profunda", rotulo: "Preventivos", codigo: "11·3", marca: porClasseNav("PREVENTIVO"), tom: "cinza", recorte: "v" },
      { id: "profunda", rotulo: "Excluídos e furtados", codigo: "11·4", marca: porClasseNav("EXCLUIDO") + porClasseNav("FURTADO"), tom: "cinza", recorte: "xf" },
      { id: "profunda", rotulo: "Análise profunda", codigo: "11·6", marca: porClasseNav("PROFUNDA"), tom: "cinza", recorte: "p" },
    ]},
    { grupo: "Controle", itens: [
      { id: "regras", rotulo: "Regras e método", codigo: "12" },
      { id: "revisao", rotulo: "Revisão da auditoria", codigo: "12·1", marca: revisao?.meta.mudam, tom: "cinza" },
      { id: "bases", rotulo: "Bases usadas", codigo: "13" },
    ]},
  ];

  /* O MENU DA OFICINA. Mesma forma do NAV de cima — é a mesma barra, com outra lista dentro.
     A primeira aponta para o MESMO módulo e o mesmo recorte da tela de queimados e avariados
     — é a de fora, não uma cópia dela. As seguintes são de insight: olham o mesmo conjunto e
     não movem ninguém. Aba nova aqui é uma linha nova nesta lista; nada sai da tela de origem
     para vir para cá. */
  const NAV_OFICINA: typeof NAV = [
    { grupo: "Proposta", itens: [
      // abre já no recorte que lista os 1.305 — o mesmo conjunto que os cartões contam
      { id: "decisao", rotulo: "Queimados e avariados", codigo: "01", marca: naSaida, tom: "verde", recorte: "saida_tela" },
      { id: "insight_valor", rotulo: "Valor × potência instalada", codigo: "02", marca: conta((r) => { const f = foraDaFaixa(r); return f === "acima" || f === "abaixo"; }), tom: "cinza", recorte: "fora" },
      { id: "insight_material", rotulo: "Material × trafos", codigo: "04", marca: conta((r) => ["mais_ss", "mais_trafos", "sem_trafo"].includes(String(estadoMaterial(r)))), tom: "cinza", recorte: "mais_ss" },
      { id: "insight_divide", rotulo: "Mesma interrupção", codigo: "05", marca: conta((r) => arquivo(r) === "SAÍDA" && (parceirasOc(r).length > 0 || parceirasAt(r).length > 0)), tom: "cinza", recorte: "divide_oc" },
      { id: "insight_tempos", rotulo: "Tempos", codigo: "06", marca: conta((r) => arquivo(r) === "SAÍDA" && (tempos(r).invertida || tempos(r).atDepoisDoFim)), tom: "cinza", recorte: "invertida" },
      { id: "insight_garantia", rotulo: "Garantia · vida do trafo", codigo: "03", marca: conta((r) => { const c = coleta[texto(r.ss)]; return arquivo(r) === "SAÍDA" && c?.dias != null && c.dias < 365; }), tom: "cinza", recorte: "menos_ano" },
      { id: "insight_reincidencia", rotulo: "Reincidência", codigo: "09", marca: conta((r) => Boolean(reincDe(r))), tom: "cinza", recorte: "rec_todos" },
      { id: "insight_aterramento", rotulo: "Aterramento medido", codigo: "08", marca: conta((r) => arquivo(r) === "SAÍDA" && ["acima", "grave"].includes(faixaTerra(r)) && !fezMelhoria(r)), tom: "cinza", recorte: "terra_ruim_sem_melhoria" },
      { id: "insight_revisao", rotulo: "Revisão detalhada", codigo: "07", marca: conta((r) => arquivo(r) === "SAÍDA" && paraRever(r).length > 0), tom: "cinza", recorte: "rev_carga" },
    ]},
  ];
  const navAtual = oficina ? NAV_OFICINA : NAV;

  const TITULOS: Record<Modulo, { olho: string; titulo: string; texto: string }> = {
    visao: { olho: "1.510 SS · jan a jun/2026", titulo: "Visão geral", texto: "O caminho das solicitações pelas quatro peneiras, do fato de campo até a decisão." },
    interrupcao: { olho: "Estágio 1 · o fato", titulo: "Interrupção", texto: "O cliente ficou sem energia? Quando, quantos e por qual causa. É a prova primária." },
    deslocamento: { olho: "Estágio 2 · corroboração", titulo: "Deslocamento", texto: "Alguém foi lá? Qual equipe, quanto tempo levou e o que registrou em campo." },
    ssos: { olho: "Estágio 3 · a leitura", titulo: "Análise de SS e OS", texto: "O que foi pedido, o que foi executado e o que o material comprova." },
    obra: { olho: "Fora da cascata", titulo: "Obra e SIGCO", texto: "Não decide causa: lê o enquadramento de custo. A única situação que interrompe o fluxo é a obra não existir." },
    decisao: { olho: "Saída do funil", titulo: "Queimados e avariados", texto: "Quem passou pela porta de exclusão e pelas quatro peneiras. Uma linha por solicitação: a mesma SS não entra duas vezes, e reclassificar substitui a decisão anterior em vez de somar outra." },
    ressalva: { olho: "Fila de revisão", titulo: "Ressalva da interrupção", texto: "Texto e material dizem falha, mas a interrupção tem um sinal que enfraquece: programada, sem cliente, de outro elemento ou de equipamento especial." },
    semdesloc: { olho: "Estágio 2 · marcador", titulo: "Sem corroboração do TMAE", texto: "Houve interrupção no transformador e não há atendimento de equipe registrado no código dele. Não retém ninguém: é informação, e a ausência de registro não é o mesmo que ausência de atendimento." },
    profunda: { olho: "Minha classificação", titulo: "O que eu classifiquei", texto: "O que você marcou à mão, com o seu nome e a hora. Fica ao lado da decisão do fluxo, nunca por cima dela — mas manda no arquivamento: o que você marca como queimado, excluído ou preventivo sai da fila de pendências e vai para a aba que corresponde." },
    semfato: { olho: "Parou no estágio 1", titulo: "Parados na interrupção", texto: "Tudo o que a primeira peneira reteve, pelos dois motivos que ela tem. Os filtros separam cada um — e, antes de cobrar campo, existe o teste do vizinho." },
    expurgos: { olho: "Parou no estágio 3", titulo: "Parados na análise de SS e OS", texto: "A terceira peneira retém por um motivo só: a obra não comprova que um transformador foi movimentado. Não é exclusão — é ausência de prova, e ninguém sai da base." },
    exclusoes: { olho: "Antes da esteira", titulo: "Exclusões", texto: "Casos que nunca foram deste indicador. A exclusão não é peneira: peneira pergunta se o caso se sustenta, exclusão diz que ele é de outra natureza — furto, abalroamento, desativação, obra de capacidade, ou o mesmo evento contado duas vezes. Cada linha traz o motivo escrito, e a decisão da esteira continua gravada no dossiê." },
    preventivos: { olho: "Fora do indicador", titulo: "Preventivos", texto: "Troca sem defeito: programada, por divisão de circuito ou marcada por você. E, ao lado, os candidatos — casos que continuam dentro da conta mas cujo texto traz sinal de troca programada." },
    mapa: { olho: "Onde estão", titulo: "Mapa dos ativos", texto: "Um ponto por transformador, na coordenada do próprio ativo — não no centro do município. A cor é a decisão da esteira." },
    ativos: { olho: "Histórico", titulo: "Por transformador", texto: "Tudo o que aconteceu com um código de ativo no semestre, em ordem." },
    regras: { olho: "Método", titulo: "Regras e método", texto: "Como a decisão é tomada, o que foi corrigido no caminho e o que ficou em aberto." },
    revisao: { olho: "Segunda leitura", titulo: "Revisão da auditoria", texto: "Cada solicitação relida caso a caso, fora da esteira. O que se confirma, o que muda de categoria e o efeito de cada escolha sobre o número final." },
    bases: { olho: "Procedência", titulo: "Bases usadas", texto: "De onde vem cada número e o que cada base não consegue responder." },
    insight_tempos: { olho: "Insight · não move ninguém", titulo: "Tempos: as três bases no mesmo eixo", texto: "A Crítica, o TMAE e a SS desenhadas uma embaixo da outra, dividindo o mesmo eixo de tempo. A ordem dos eventos e a distância entre eles se leem de relance — e é assim que aparece o que uma tabela de datas esconde." },
    insight_reincidencia: { olho: "Insight · não move ninguém", titulo: "Reincidência: o mesmo transformador queimando de novo", texto: "Quando o ativo trocado volta a queimar dentro do recorte, e quanto tempo depois. Prazo curto tira a rede da conversa: em uma semana o que muda não é o clima, é o que foi instalado, como foi protegido e onde." },
    insight_aterramento: { olho: "Insight · não move ninguém", titulo: "Aterramento: o que a equipe mediu no poste", texto: "Seis colunas do formulário da OS que nunca tinham sido abertas: três hastes medidas antes do serviço, três depois, mais melhoria feita e conexão ao tanque. Vale a PIOR das três — a corrente procura o pior caminho. Zero e vazio contam como NÃO PREENCHIDO, nunca como bom." },
    insight_revisao: { olho: "Insight · não move ninguém", titulo: "Revisão detalhada", texto: "A fila que eu montei para o seu martelo: casos em que uma fonte discorda da outra, ou em que quem esteve no poste escreveu coisa que a Crítica não gravou. Nasceu da sua leitura da DG-RD-PO 00422 — “defeito interno e tap submerso deveria ir para sobrecarga”. Nenhum caso daqui foi movido; a classificação continua sendo sua, na aba de classificação." },
    insight_divide: { olho: "Insight · não move ninguém", titulo: "Quem divide a mesma interrupção", texto: "Duas SS apoiadas no mesmo evento: a mesma ocorrência da Crítica, ou o mesmo atendimento do TMAE. Uma interrupção prova uma troca, não duas — esta aba lista os pares para leitura, sem mover ninguém." },
    insight_material: { olho: "Insight · não move ninguém", titulo: "Material × transformador, obra por obra", texto: "A obra pagou quantos transformadores, e isso bate com quantas SS ela atende? A conta vem do export do SIAGO, deduplicado entre os dois arquivos e contado por quantidade realizada — linha de transformador não é transformador." },
    insight_garantia: { olho: "Insight · não move ninguém", titulo: "Garantia: quanto o transformador viveu", texto: "O tempo entre a fabricação do equipamento retirado e a abertura da SS, caso a caso. A ficha vem da aba COLETA — a que a equipe preenche no poste —, e traz série, tombamento, fabricante e potência do que saiu e do que entrou." },
    insight_valor: { olho: "Insight · não move ninguém", titulo: "Valor da obra × potência do transformador instalado", texto: "A potência vem do texto, não dos campos numéricos, que discordam entre si. Vale primeiro o trafo instalado escrito na OS — é ele que a obra pagou —, depois a potência única da OS, e só então a SS. Quem cai fora da faixa é achado para olhar, não caso reclassificado." },
  };

  const titulo = TITULOS[modulo];
  const abrirRecorte = (id: string) => {
    const alvo = recortesDoModulo.find((x) => x.id === id);
    setRecorte(alvo ? { id, rotulo: alvo.rotulo } : null);
  };

  /* Entrar numa aba pela barra lateral ou pela caixa d'água precisa cair no mesmo universo
     que o número clicado anuncia. Antes o recorte era limpo na entrada, e toda aba abria com
     as 1.510 — a barra dizia "Sem interrupção 206" e a tabela mostrava 1.510. O chip "Todas"
     continua ali para quem quiser sair do recorte de propósito. */
  const PADRAO: Partial<Record<Modulo, string>> = {
    interrupcao: "todos", deslocamento: "todos", ssos: "todos", ressalva: "fila",
    obra: "todos", decisao: "saida", semfato: "parados", semdesloc: "todos", expurgos: "parados",
    profunda: "todos", exclusoes: "todos", preventivos: "todos",
    insight_valor: "fora",
    insight_garantia: "menos_ano",
    insight_material: "mais_ss",
    insight_divide: "divide_oc",
    insight_tempos: "invertida",
    insight_revisao: "rev_carga",
    insight_aterramento: "terra_ruim_sem_melhoria",
    insight_reincidencia: "rec_todos",
  };
  const irPara = (id: Modulo, recorteId?: string) => {
    setModulo(id);
    setBusca("");
    const alvo = (RECORTES[id] || []).find((x) => x.id === (recorteId || PADRAO[id]));
    setRecorte(alvo ? { id: alvo.id, rotulo: alvo.rotulo } : null);
  };
  /* Entrar na oficina cai direto na primeira aba dela; sair devolve a Visão geral. As duas
     coisas passam pelo irPara para o recorte acompanhar — trocar o menu sem trocar o recorte
     deixaria a tabela mostrando o filtro da aba anterior debaixo de um título novo. */
  const alternarOficina = () => {
    const entrando = !oficina;
    setOficina(entrando);
    const alvo = entrando ? NAV_OFICINA[0].itens[0] : { id: "visao" as Modulo, recorte: undefined };
    irPara(alvo.id, alvo.recorte);
    setAberto(null);
  };

  /* ---------------------------------------------------------------- cabeçalhos por módulo */

  const painel = () => {
    if (modulo === "visao") {
      const fatos = ["F1", "F0", "F2", "F3", "FD"].map((f) => ({ label: FATO_ROTULO[f], value: conta((r) => r.fato === f) }));
      /* A CONTA INTEIRA EM QUATRO NÚMEROS. Pedido dele, com estas palavras: "quero só os famosos
         big numbers, o que ficou preso em cada parte e um porquê geralzão — 1510 menos tantos,
         desses tantos, tantos não têm ocorrência, tantos não estão na janela". O detalhe não
         desapareceu: cada número e cada linha de porquê abre a lista correspondente. Tudo é
         contado do dado na hora, com as marcações dele por cima — nada aqui é digitado. */
      const presasNaCritica = conta((r) => arquivo(r) === "EXCLUÍDA" && parouNaInterrupcao(r));
      const posCritica = total - presasNaCritica;
      const semTmae = conta((r) => !(arquivo(r) === "EXCLUÍDA" && parouNaInterrupcao(r)) && r.deslocamento === "SEM REGISTRO");
      const outraCausa = excluidas - presasNaCritica;
      const naEsteira = total - excluidas;
      const retidos = conta((r) => String(arquivo(r)).startsWith("RETIDO"));
      const saidaFinal = conta((r) => arquivo(r) === "SAÍDA");
      const porCausa = causasRank;
      const restoCausas = porCausa.slice(5).reduce((a, [, v]) => a + v, 0);
      return <>
        <section className="scope-strip">
          <div><span>Recorte</span><strong>{br(total)} SS · jan a jun/2026</strong></div>
          <div><span>Janela da interrupção</span><strong>{fluxo.meta.janelaHoras}h contra o intervalo inteiro</strong></div>
          <div><span>Saída</span><strong>{br(conta((r) => r.decisao === "INCLUIR"))} incluir</strong></div>
          {/* A regra inteira tinha oito linhas aqui em cima. Ele pediu para tirar o monte de
              texto: fica a frase que governa tudo, e o resto mora em Regras e método. */}
          <p>A exclusão acontece antes da esteira e fora dela. Quem entra é medido caso a caso contra a própria ocorrência. <button type="button" className="strip-link" onClick={() => irPara("regras")}>Regra inteira em Regras e método →</button></p>
        </section>
        {/* A CONTA NA ORDEM QUE ELE DITOU, e a ordem importa. Ele escreveu: "se eu tenho tantas
            presas pela Crítica, 1.510 menos elas; desses eu tenho tantas sem deslocamento, aí vou
            flegar cada uma; desses, menos as excluídas de fato". Primeiro a Crítica, depois o
            marcador do TMAE, depois a exclusão por causa — não tudo junto numa porta só. Os
            números que ele citou de cabeça (136, 110, 1.264) são de uma rodada anterior; a forma
            é exatamente esta, e é a forma que manda. Só o degrau dos retidos ele não citou, e ele
            precisa estar aqui: sem ele a conta não chega em 1.249. */}
        <section className="panel cascata-panel">
          <div className="panel-title"><div><span>A conta inteira</span><h2>De {br(total)} a {br(saidaFinal)}</h2></div><small>clique em qualquer número para abrir a lista</small></div>
          <div className="cascata-simples">
            <Degrau n={total} rotulo="solicitações de troca de transformador, janeiro a junho de 2026"
              aoClicar={() => irPara("interrupcao", "todos")} />
            <Degrau n={presasNaCritica} sinal="menos" rotulo="presas pela Crítica: sem interrupção que sustente o caso"
              aoClicar={() => irPara("semfato", "parados")}
              porques={[
                /* A quebra fina usa gatilhoDe, não categoriaDe: a categoria funde as três numa só
                   na caixa e na barra — fusão que ele pediu — e usá-la aqui zerava uma linha. */
                { n: conta((r) => arquivo(r) === "EXCLUÍDA" && gatilhoDe(r) === "fora_da_janela"), texto: "tem defeito no transformador, mas em outra data", sub: true, aoClicar: () => irPara("semfato", "p_outra_data") },
                { n: conta((r) => arquivo(r) === "EXCLUÍDA" && gatilhoDe(r) === "sem_interrupcao"), texto: "nunca teve defeito aberto nele — ausente da base, ou só interrompido e manobrado", sub: true, aoClicar: () => irPara("semfato", "p_ausente") },
              ]} />
            <Degrau n={posCritica} sinal="igual" rotulo="passaram pela Crítica"
              aoClicar={() => irPara("decisao", "pos_critica")}
              porques={[
                { n: semTmae, texto: "sem deslocamento do TMAE — sinalizadas, não subtraídas", aoClicar: () => irPara("decisao", "sem_tmae") },
              ]} />
            <Degrau n={outraCausa} sinal="menos" rotulo="excluídas de fato: outra causa declarada"
              aoClicar={() => irPara("exclusoes", "outra_causa")}
              porques={porCausa.slice(0, 5).map(([k, v]) => ({
                n: v, sub: true, texto: (GATILHO_ROTULO[k] || k).toLowerCase(),
                aoClicar: () => irPara("exclusoes", GATILHO_CHIP[k] || `g:${k}`),
              })).concat(restoCausas ? [{ n: restoCausas, sub: true, texto: `em outras ${porCausa.length - 5} categorias`, aoClicar: () => irPara("exclusoes", "outra_causa_resto") }] : [])} />
            <Degrau n={retidos} sinal="menos" rotulo="sem prova de que o transformador foi trocado"
              aoClicar={() => irPara("expurgos", "parados")}
              porques={[
                { n: conta((r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" && r.pendente_siago === "SIM"), texto: "só esperam a extração do SIAGO — a obra existe", sub: true, aoClicar: () => irPara("expurgos", "siago_retido") },
              ]} />
            <Degrau n={saidaFinal} sinal="igual" forte rotulo="queimados e avariados"
              aoClicar={() => irPara("decisao", "saida")}
              porques={[
                { n: conta((r) => arquivo(r) === "SAÍDA" && texto(r.confirmado) === "QUEIMADO"), texto: "queimados", sub: true, aoClicar: () => irPara("decisao", "saida_queimado") },
                { n: conta((r) => arquivo(r) === "SAÍDA" && texto(r.confirmado) === "AVARIADO"), texto: "avariados", sub: true, aoClicar: () => irPara("decisao", "saida_avariado") },
              ]} />
          </div>
        </section>
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Saída</span><h2>Onde cada solicitação terminou</h2></div><small>clique para filtrar</small></div>
            <Barras dados={contar(registros.map((r) => ({ ...r, _a: arquivo(r) })), "_a", 6)} total={total} aoSelecionar={(l) => {
              setBusca(""); if (l === "SAÍDA") irPara("decisao", "saida"); else if (l === "EXCLUÍDA") irPara("exclusoes", "todos"); else irPara("expurgos", "parados");
            }} /></article>
          <article className="panel"><div className="panel-title"><div><span>Estágio 1</span><h2>O que o campo provou</h2></div></div><Barras dados={fatos} total={total} /></article>
        </section>
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Fora do indicador</span><h2>Por que saíram</h2></div><small>clique para filtrar</small></div>
            <Barras dados={contar(registros.filter((r) => arquivo(r) === "EXCLUÍDA").map((r) => ({ ...r, _g: GATILHO_ROTULO[categoriaDe(r)] || "Marcada por você" })), "_g", 10)} total={excluidas} aoSelecionar={(l) => {
              const chave = Object.entries(GATILHO_ROTULO).find(([, v]) => v === l)?.[0];
              setBusca(""); irPara("exclusoes", chave ? GATILHO_CHIP[chave] || `g:${chave}` : "manual");
            }} /></article>
          <article className="panel"><div className="panel-title"><div><span>Crítica</span><h2>Estado do ativo na base de interrupção</h2></div><small>clique para filtrar</small></div>
            <Barras dados={contar(registros.map((r) => ({ ...r, _c: texto(r.censo_critica) || "—" })), "_c", 5)} total={total} aoSelecionar={(l) => {
              setBusca(""); irPara("interrupcao", { "AUSENTE": "censo_ausente", "SEM DEFEITO NELE": "censo_semdef", "DEFEITO EM OUTRA DATA": "censo_outradata", "DEFEITO NA JANELA": "censo_janela" }[l] || "todos");
            }} /></article>
        </section>
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Leitura</span><h2>O que o texto declara</h2></div><small>clique para filtrar</small></div>
            <Barras dados={contar(registros.map((r) => ({ ...r, _t: texto(r.categoria_texto) || "não decide" })), "_t", 8)} total={total} aoSelecionar={(l) => { setBusca(l === "não decide" ? "" : l); setRecorte(null); }} /></article>
          <article className="panel"><div className="panel-title"><div><span>Origem</span><h2>Quem abriu a solicitação</h2></div><small>clique para filtrar</small></div>
            <Barras dados={contar(registros, "origem", 8)} total={total} aoSelecionar={(l) => {
              setBusca(""); if (l === "—") abrirRecorte("sem_origem"); else { setRecorte(null); setBusca(l); }
            }} /></article>
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

    if (modulo === "revisao") {
      if (!revisao) return <section className="panel editorial-note"><span>REVISÃO</span><p>O arquivo revisao.json não carregou.</p></section>;
      const m = revisao.meta;
      /* Os chips são as famílias de motivo, não as SS. Um motivo pode valer para dois pares
         de categoria (parou na peneira errada acontece vindo da 3 e vindo da 4), e quem lê
         quer o motivo, não o par. */
      const familias = Array.from(new Set(revisao.grupos.map((g) => g.familia)))
        .map((f) => ({ id: f, rotulo: revisao.grupos.find((g) => g.familia === f)!.rotulo,
                       n: revisao.grupos.filter((g) => g.familia === f).reduce((s, g) => s + g.n, 0) }));
      const casosDoRecorte = recorteRev === "todos" ? revisao.casos
        : recorteRev === "falsos" ? revisao.falsos_positivos.casos
        : revisao.casos.filter((c) => c.grupo === recorteRev);
      const gruposDoRecorte = recorteRev === "todos" ? revisao.grupos
        : recorteRev === "falsos" ? revisao.grupos.filter((g) => g.de === "SAÍDA")
        : revisao.grupos.filter((g) => g.familia === recorteRev);
      const baixar = () => {
        const cab = ["SS", "Motivo", "Categoria hoje", "Categoria correta", "Claro?", "Por que",
                     "Trecho do registro", "Trafo", "Abertura", "Localidade", "Equipe", "Obra", "Origem"];
        const corpo = casosDoRecorte.map((c) => [c.ss, c.grupo, c.atual, c.correta, c.claro, c.motivo,
          c.evidencia, c.trafo, c.abertura, c.localidade, c.equipe, c.obra, c.origem]
          .map((v) => String(v ?? "").replace(/[;\r\n]+/g, " ").trim()).join(";")).join("\r\n");
        const blob = new Blob([`﻿${cab.join(";")}\r\n${corpo}`], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `revisao_${recorteRev}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      };
      const revA = revisao.revisores.site;
      const revB = revisao.revisores.numeros;
      return <>
        <section className="kpi-grid">
          <Kpi rotulo="Revisadas caso a caso" valor={br(m.revisadas)} nota={`de ${br(m.universo)} · ${m.cobertura_pct}% da base`} tom={m.revisadas >= m.universo ? "green" : "amber"} />
          <Kpi rotulo="Mudam de categoria" valor={br(m.mudam)} nota="com fundamento no próprio registro" tom="blue" aoClicar={() => setRecorteRev("todos")} />
          <Kpi rotulo="Falsos positivos da saída" valor={br(revisao.falsos_positivos.n)} nota="passaram e não deveriam" tom="red" aoClicar={() => setRecorteRev("falsos")} />
          <Kpi rotulo="Confirmadas como estão" valor={br(m.confirmadas)} nota="relidas e mantidas" tom="green" />
          <Kpi rotulo="Sem resposta" valor={br(m.sem_resposta)} nota="falta dado para decidir" tom="amber" />
        </section>

        <section className="panel editorial-note wide">
          <span>COMO ESTA REVISÃO FOI FEITA</span>
          <p>{m.postura}</p>
          <p><strong>Regra de ouro.</strong> {m.regra_de_ouro}</p>
          <p className="fluxo-nota">Gerado em {m.gerado} a partir dos vereditos gravados caso a caso. Esta aba não guarda texto próprio: tudo o que está aqui sai do arquivo de vereditos.</p>
        </section>

        <section className="panel editorial-note wide">
          <span>O EFEITO SOBRE O NÚMERO DE HOJE</span>
          <p>A saída da esteira hoje é <strong>{br(m.saida_hoje)}</strong>. Nenhum cenário abaixo está aplicado — são escolhas do dono da auditoria, não conserto de defeito.</p>
          <div className="table-scroll"><table className="records-table">
            <thead><tr><th>Cenário</th><th>O que muda</th><th>Entram</th><th>Saem</th><th>Saída</th><th>De onde vem a conta</th></tr></thead>
            <tbody>{revisao.cenarios.map((c) => <tr key={c.id}>
              <td><strong>{c.id} · {c.rotulo}</strong></td>
              <td><span>{c.descricao}</span></td>
              <td><span>{c.entram ? `+${br(c.entram)}` : "—"}</span></td>
              <td><span>{c.saem ? `−${br(c.saem)}` : "—"}</span></td>
              <td><strong>{br(c.saida)}</strong></td>
              <td><span>{c.base}</span></td>
            </tr>)}</tbody>
          </table></div>
        </section>

        {revisao.cenarios_aplicados?.length ? <section className="panel editorial-note wide">
          <span>CENÁRIOS QUE DEIXARAM DE SER CENÁRIO</span>
          <p>Estes eram hipóteses nesta aba e viraram regra da esteira. Ficam registrados com a data para o histórico não se perder — quem lê hoje precisa saber que o número já mudou por causa deles.</p>
          <div className="check-list">{revisao.cenarios_aplicados.map((c) => <div key={c.id}>
            <b>·</b><strong>{c.id} · {c.rotulo} — aplicado em {c.quando}</strong><span>{c.efeito}</span>
          </div>)}</div>
        </section> : null}

        {gruposDoRecorte.map((g) => <section key={g.id} className={`panel editorial-note wide${g.afeta_saida ? " destaque" : ""}`}>
          <span>{g.rotulo.toUpperCase()} · {br(g.n)} {g.n === 1 ? "CASO" : "CASOS"}</span>
          <p><strong>O que a esteira fez.</strong> {g.esteira_fez}</p>
          <p><strong>Por que está errado.</strong> {g.por_que_errado}</p>
          <p><strong>De</strong> {g.de} <strong>para</strong> {g.para}.</p>
          <p className="fluxo-nota"><strong>Exemplo — {g.exemplo.ss}:</strong> {g.exemplo.trecho}</p>
        </section>)}

        {revisao.verificacao_aferida?.regras.length ? <section className="panel editorial-note wide">
          <span>A VERIFICAÇÃO AUTOMÁTICA, AFERIDA CONTRA A LEITURA</span>
          <p>{revisao.verificacao_aferida.nota}</p>
          <div className="table-scroll"><table className="records-table">
            <thead><tr><th>O que a verificação apontou</th><th>Casos</th><th>A leitura confirmou</th><th>Acerto</th><th>Por quê</th></tr></thead>
            <tbody>{revisao.verificacao_aferida.regras.map((g) => <tr key={g.id}>
              <td><strong>{g.rotulo}</strong>{g.tipo === "contradiz" ? <span> · contradiz o registro</span> : <span> · lacuna de base</span>}</td>
              <td><span>{br(g.apontou)}</span></td>
              <td><span>{br(g.confirmadas)}</span></td>
              <td><strong>{g.acerto_pct}%</strong></td>
              <td><span>{g.explicacao}</span></td>
            </tr>)}</tbody>
          </table></div>
          <p><strong>A lição.</strong> {revisao.verificacao_aferida.licao}</p>
          <p><strong>E sobre as lacunas.</strong> {revisao.verificacao_aferida.lacunas_licao}</p>
        </section> : null}

        {revisao.sem_resposta.length ? <section className="panel editorial-note wide">
          <span>O QUE FICOU SEM RESPOSTA · {br(revisao.sem_resposta.length)}</span>
          <p>Casos em que a revisão não conseguiu decidir com o que existe hoje. Ficam listados em vez de escondidos.</p>
          {revisao.sem_resposta_resumo ? <>
            <p>{revisao.sem_resposta_resumo.nota}</p>
            <p><strong>{br(revisao.sem_resposta_resumo.na_saida)} dos {br(revisao.sem_resposta_resumo.n)} estão na SAÍDA</strong> e vêm primeiro na lista. Onde os demais estão parados: {revisao.sem_resposta_resumo.onde.filter((o) => o.categoria !== "SAÍDA").map((o) => `${o.categoria.toLowerCase()} (${br(o.n)})`).join(" · ")}.</p>
          </> : null}
          <div className="table-scroll"><table className="records-table">
            <thead><tr><th>SS</th><th>Categoria hoje</th><th>O que falta para decidir</th></tr></thead>
            <tbody>{revisao.sem_resposta.map((s) => <tr key={s.ss}>
              <td><strong>{s.ss}</strong>{s.na_saida ? <span> · na saída</span> : null}</td>
              <td><span>{s.atual}</span></td><td><span>{s.falta}</span></td>
            </tr>)}</tbody>
          </table></div>
        </section> : null}

        <section className="panel editorial-note wide">
          <span>O QUE FOI CONFIRMADO COMO CORRETO · {br(revisao.confirmado.n)}</span>
          <p>{revisao.confirmado.nota} Confirmar o que está certo é resultado tão útil quanto contestar — sem esta seção, quem lê a lista de mudanças acha que tudo está errado.</p>
          <div className="table-scroll"><table className="records-table">
            <thead><tr><th>Categoria</th><th>Confirmadas</th></tr></thead>
            <tbody>{revisao.confirmado.por_categoria.map((c) => <tr key={c.categoria}>
              <td><strong>{c.categoria}</strong></td><td><span>{br(c.n)}</span></td>
            </tr>)}</tbody>
          </table></div>
        </section>

        {revB ? <section className="panel editorial-note wide">
          <span>REVISOR DOS NÚMEROS · {revB.veredito.replaceAll("_", " ")}</span>
          <p>{revB.resumo}</p>
          {(revB.achados || []).length ? <div className="check-list">{(revB.achados || []).map((a, i) =>
            <div key={i}><b>·</b><strong>{a.gravidade} — {a.titulo}</strong><span>{a.numero} {a.criterio}</span></div>)}</div> : null}
          {(revB.confirmado || []).length ? <><p><strong>Confirmado como correto:</strong></p>
            <div className="check-list">{(revB.confirmado || []).map((c, i) => <div key={i}><b>·</b><span>{c}</span></div>)}</div></> : null}
          {(revB.suspeitas || []).length ? <><p><strong>Suspeitas não confirmadas</strong> — ficam aqui justamente por não terem prova:</p>
            <div className="check-list">{(revB.suspeitas || []).map((s, i) => <div key={i}><b>·</b><span>{s}</span></div>)}</div></> : null}
          {(revB.perguntas || []).length ? <div className="table-scroll"><table className="records-table">
            <thead><tr><th>O que a plateia pergunta</th><th>A resposta honesta</th></tr></thead>
            <tbody>{(revB.perguntas || []).map((p, i) => <tr key={i}>
              <td><strong>{p.pergunta}</strong></td><td><span>{p.resposta}</span></td></tr>)}</tbody>
          </table></div> : null}
        </section> : null}

        {revisao.conferencia_dos_achados?.itens.length ? <section className={`panel editorial-note wide${revisao.conferencia_dos_achados.itens.some((c) => c.veredito !== "CONFIRMA") ? " destaque" : ""}`}>
          <span>CONFERÊNCIA DOS ACHADOS DO REVISOR</span>
          <p>{revisao.conferencia_dos_achados.nota}</p>
          {revisao.conferencia_dos_achados.itens.map((c, i) => <div key={i}>
            <p><strong>Alegado ({c.gravidade_alegada}):</strong> {c.achado}</p>
            <p><strong>Veredito: {c.veredito}.</strong> {c.o_que_eu_medi}</p>
            <p><strong>Por que a diferença importa.</strong> {c.por_que_a_diferenca_importa}</p>
            <p><strong>O que sobra de verdade.</strong> {c.o_que_sobra_de_verdade}</p>
          </div>)}
        </section> : null}

        {revA ? <section className="panel editorial-note wide">
          <span>REVISOR DO SITE · {revA.veredito.replaceAll("_", " ")}</span>
          <p>{revA.resumo}</p>
          {(revA.quebra || []).length ? <><p><strong>Quebra a apresentação:</strong></p>
            <div className="check-list">{(revA.quebra || []).map((q, i) =>
              <div key={i}><b>·</b><strong>{q.titulo} ({q.aba})</strong><span>{q.o_que} — conserto: {q.conserto}</span></div>)}</div></> : null}
          {(revA.incomoda || []).length ? <><p><strong>Incomoda, mas dá para viver:</strong></p>
            <div className="check-list">{(revA.incomoda || []).map((q, i) =>
              <div key={i}><b>·</b><strong>{q.titulo} ({q.aba})</strong><span>{q.o_que}</span></div>)}</div></> : null}
          {(revA.funciona || []).length ? <><p><strong>O que funciona bem:</strong></p>
            <div className="check-list">{(revA.funciona || []).map((f, i) => <div key={i}><b>·</b><span>{f}</span></div>)}</div></> : null}
        </section> : null}

        <section className="panel list-panel">
          <div className="list-head">
            <div><span>{br(casosDoRecorte.length)} {casosDoRecorte.length === 1 ? "caso" : "casos"}</span>
              <strong>{recorteRev === "todos" ? "Todas as mudanças" : recorteRev === "falsos" ? "Falsos positivos da saída" : familias.find((f) => f.id === recorteRev)?.rotulo}</strong></div>
            <button type="button" className="sheet-download" onClick={baixar}>Baixar planilha ({br(casosDoRecorte.length)})</button>
          </div>
          <div className="fluxo-abas">
            <button type="button" className={recorteRev === "todos" ? "ativo" : ""} onClick={() => setRecorteRev("todos")}
              title="Todas as solicitações que mudam de categoria.">Todas as mudanças ({br(revisao.casos.length)})</button>
            <button type="button" className={recorteRev === "falsos" ? "ativo" : ""} onClick={() => setRecorteRev("falsos")}
              title="Casos que chegaram à saída e não deveriam.">Falsos positivos ({br(revisao.falsos_positivos.n)})</button>
            {familias.map((f) => <button key={f.id} type="button" className={recorteRev === f.id ? "ativo" : ""}
              onClick={() => setRecorteRev(f.id)} title={f.rotulo}>{f.rotulo} ({br(f.n)})</button>)}
          </div>
          {recorteRev === "falsos" ? <p className="fluxo-nota">{revisao.falsos_positivos.nota}</p> : null}
          {casosDoRecorte.length ? <div className="table-scroll"><table className="records-table">
            <thead><tr><th>SS</th><th>Hoje</th><th>Deve ser</th><th>Por que</th><th>Trecho do registro</th><th>Trafo</th><th>Localidade</th><th>Aberta em</th></tr></thead>
            <tbody>{casosDoRecorte.map((c) => <tr key={c.ss}>
              <td><strong>{c.ss}</strong>{c.claro === "NAO_CLARO" ? <span> · sem resposta</span> : null}</td>
              <td><span>{c.atual}</span></td>
              <td><span>{c.correta}</span></td>
              <td><span>{c.motivo}</span></td>
              <td><span>{c.evidencia}</span></td>
              <td><span>{c.trafo}</span></td>
              <td><span>{c.localidade}</span></td>
              <td><span>{c.abertura}</span></td>
            </tr>)}</tbody>
          </table></div> : <div className="empty"><strong>Nenhum caso neste recorte</strong><span>Escolha outro filtro acima.</span></div>}
        </section>
      </>;
    }

    if (modulo === "mapa") {
      const pontos: PontoAtivo[] = registros
        .filter((r) => typeof r.lat === "number" && typeof r.lon === "number")
        .map((r) => ({
          ss: texto(r.ss), trafo: texto(r.trafo), lat: Number(r.lat), lon: Number(r.lon),
          localidade: texto(r.localidade), decisao: texto(r.decisao), cascata: texto(r.cascata),
          categoria: texto(r.categoria_texto), abertura: dataBR(r.abertura),
        }));
      const semCoord = total - pontos.length;
      return <>
        <section className="kpi-grid">
          <Kpi rotulo="Pontos no mapa" valor={br(pontos.length)} nota="coordenada do próprio transformador" tom="ink" />
          <Kpi rotulo="Incluídos" valor={br(pontos.filter((p) => p.decisao === "INCLUIR").length)} nota="verde no mapa" tom="green" />
          <Kpi rotulo="Em revisão" valor={br(pontos.filter((p) => p.decisao === "REVISÃO").length)} nota="âmbar no mapa" tom="amber" />
          <Kpi rotulo="Excluídos" valor={br(pontos.filter((p) => p.decisao === "EXCLUIR").length)} nota="vermelho no mapa" tom="red" />
          <Kpi rotulo="Municípios" valor={br(new Set(pontos.map((p) => p.localidade)).size)} nota="com ao menos um ponto" tom="blue" />
          <Kpi rotulo="Sem coordenada" valor={br(semCoord)} nota="não aparecem no mapa" tom="ink" />
        </section>
        <section className="panel">
          <div className="panel-title"><div><span>Coordenada do ativo</span><h2>Onde cada transformador está</h2></div><small>clique num ponto para abrir o dossiê</small></div>
          <MapaAtivos pontos={pontos} aoEscolher={(ss) => {
            const achado = registros.find((r) => texto(r.ss) === ss);
            if (achado) { setAberto(achado); setAbaDossie("consolidado"); setMotivosAbertos(false); }
          }} />
          <p className="fonte-detalhe">{texto(fluxo.meta.coordenada)}</p>
        </section>
      </>;
    }

    if (modulo === "bases") {
      const ARQUIVOS: Array<[string, string, string, string]> = [
        ["Base_SS_OS.xlsx", "SS e OS", "1.510 solicitações com todos os campos do cadastro, mais o texto integral da SS e da OS.", "0,5 MB"],
        ["Base_Interrupcoes.xlsx", "Interrupções", "A linha da Crítica de cada SS que casou: datas, duração, clientes, elemento do defeito, causa, subcausa e observação.", "0,3 MB"],
        ["Base_Atendimentos_TMAE.xlsx", "Atendimentos", "A linha do TMAE: cronologia completa, os quatro tempos, equipe e a observação do executante.", "0,3 MB"],
        ["Base_Obras_SIGCO.xlsx", "Obras e SIGCO", "O cadastro da obra: classe, natureza, tipo, projeto, empreiteira, setor, valores e datas.", "0,4 MB"],
        ["Base_Material.xlsx", "Material da obra", "Item a item do que saiu do almoxarifado, com código, descrição, quantidade prevista e realizada e valor.", "0,9 MB"],
        ["Base_Funis.xlsx", "Os funis do site, aba por aba", "Dez abas que reproduzem as telas: o funil degrau a degrau, o resultado, as exclusões por categoria, quem parou sem interrupção, o censo da Crítica, os retidos, as etiquetas, os ativos reincidentes, os vereditos do dono e o corte por localidade. Nenhum número é digitado — todos saem do dado na hora de gerar, e cada aba traz a nota que explica como lê-la.", "0.02 MB".replace(".", ",")],
        ["Sem_Interrupcao_Critica.xlsx", "Os 108 que a Crítica não sustenta", "Três abas, e a divisão entre elas é a que a base sustenta, não a que o rótulo diz: 31 têm defeito aberto no próprio transformador em outra data, e cada linha traz a distância em horas, em dias e a faixa de tempo; 77 nunca tiveram defeito aberto neles, e a coluna “Por que é ausente” separa os 52 que não aparecem na Crítica em papel nenhum dos 25 que aparecem só como interrompidos ou manobrados. Nos ausentes as colunas de ocorrência e de atendimento ficam vazias de propósito, e o teste do vizinho vem marcado como hipótese. Relida dos sete arquivos originais da Crítica.", "0,03 MB"],
        ["Bases_Gerais.xlsx", "Bases gerais — tudo num arquivo, para pesquisa", "As seis bases da auditoria em abas de um mesmo arquivo, com filtro automático ligado e a primeira linha congelada: SS e OS, interrupções, atendimentos, obras e SIGCO, material item a item e a esteira completa. A coluna SS liga todas elas, então dá para cruzar duas bases sem sair de dentro. Cópia fiel: nada é recalculado nem resumido.", "2,4 MB"],
        ["Filtros_do_Site.xlsx", "Todos os filtros do site, aba por aba", "Cada filtro de cada tela com quantos casos tem e o que significa, mais a tabela longa filtro × SS de onde sai qualquer tabela dinâmica, e uma aba de dimensões com uma linha por solicitação. A composição de cada filtro não é recalculada: um robô abre o site, clica filtro por filtro e baixa a planilha de cada um — o que está aqui é o que a tela mostra, porque veio dela.", "PLACEHOLDER_TAM"],
        ["Material_Pendente.xlsx", "Material pendente — as obras a extrair", "As 61 solicitações que o export de material não responde, com a obra de cada uma. Quatro abas, e a que importa é \u201cObras a extrair\u201d: 32 obras que existem no cadastro e não estão no export, agrupadas por obra porque é assim que a extração se pede. As outras 29 não têm obra gerada — para essas não adianta pedir extração, e elas ficam numa aba à parte com o motivo escrito.", "0,03 MB"],
        ["Base_Esteira_Completa.xlsx", "Esteira completa", "Uma linha por SS com a posição na esteira, o motivo, a decisão, a causa confirmada, o gatilho da exclusão com a frase que a explica, o intervalo inteiro da ocorrência e o marcador de deslocamento.", "0,37 MB"],
      ];
      // as originais são o arquivo cru, sem filtro e sem recorte: é contra elas que qualquer
      // número deste site pode ser refeito do zero por quem quiser conferir
      const ORIGINAIS: Array<[string, string, string, string, string]> = [
        ["Original_SS_TRAFOS_V4.xlsx", "XLSX", "SS e OS — arquivo de origem", "O arquivo TRAFOS V4 como veio, com as sete abas. A aba BASE GERAL, com 1.581 linhas e 40 colunas, é a que abre este trabalho: é dela que saem as 1.510 do recorte e o horário real de abertura de cada SS.", "2,3 MB"],
        ["Original_OS.xlsx", "XLSX", "OS e apoio — arquivo de origem", "O arquivo OS como veio, com sete abas: as 134 auditadas (Planilha1), a BASE SS_OS com 9.298 linhas e 64 colunas, dois detalhamentos e uma cópia do TMAE consolidado. É um arquivo de trabalho, não um extrato limpo — está aqui exatamente como foi entregue.", "28,8 MB"],
        ["Original_Critica_Interrupcoes.zip", "ZIP", "Crítica — interrupção do fornecimento", "Os seis arquivos mensais originais de janeiro a junho de 2026, 76.630 linhas e 64 colunas, delimitados por ponto e vírgula em latin-1. É a base que registra o cliente sem energia: abertura, fechamento, passo, elemento do defeito, elemento interrompido, causa e observação de campo.", "18,7 MB"],
        ["Original_TMAE_Atendimentos.zip", "ZIP", "TMAE — atendimento de emergência", "O consolidado de janeiro a junho, 62.616 atendimentos e 40 colunas. É a base do deslocamento: quem foi, quando saiu, quando chegou, quanto tempo levou e o que o executante escreveu. Cobre de 01/01 às 00:23 a 30/06 às 23:34, sem nenhum registro entre 26 e 31 de janeiro.", "4,9 MB"],
        ["Original_Cadastro_Obras.xlsx", "XLSX", "Cadastro de obras e SIGCO", "9.511 obras e 93 colunas: classe, natureza, tipo, projeto SIGCO, empreiteira, setor, responsáveis, valores e datas. É onde se lê o enquadramento de custo — não a causa da falha.", "3,5 MB"],
        ["Original_Material_SIAGO.zip", "ZIP", "Material do SIAGO", "15.568 linhas de movimentação de almoxarifado por obra, delimitadas por tabulação. É a prova material da troca: se saiu transformador para a obra, houve substituição de equipamento.", "0,1 MB"],
      ];
      // o manual é gerado do mesmo dado que a tela: nenhum número dentro dele é digitado à mão,
      // e o .pdf sai do próprio .docx — os dois nunca contam histórias diferentes
      const MANUAIS: Array<[string, string, string, string, string]> = [
        ["Manual_de_Regras_Auditoria_Transformadores_v2.pdf", "PDF", "Manual de regras — da Crítica ao resultado final", "O passo a passo inteiro em dez seções: o que a auditoria mede, as quatro bases, como se lê a Crítica pelas três colunas de ativo, o que sai na porta antes da esteira e por quê, as duas réguas da janela, as quatro peneiras, os vereditos do dono, o resultado na ordem em que ele se forma, o que estas bases não respondem e como conferir tudo. Todo valor é apurado na geração, contra a esteira e contra os arquivos originais da Crítica.", "0,2 MB"],
        ["Manual_de_Regras_Auditoria_Transformadores_v2.docx", "DOCX", "O mesmo manual, em Word", "Para quem precisa citar um trecho, comentar ou anexar. Mesmo conteúdo do PDF — o PDF é impresso deste arquivo.", "0,02 MB"],
      ];
      return <>
        <section className="panel"><div className="panel-title"><div><span>Manual</span><h2>As regras escritas, passo a passo</h2></div><small>gerado do mesmo dado da tela</small></div>
          <div className="arquivos">{MANUAIS.map(([arq, tipo, nome, nota, tam]) => <a key={arq} href={assetUrl(`manuais/${arq}`)} download>
            <b>{tipo}</b><span><strong>{nome}</strong><small>{nota}</small></span><em>{tam}</em>
          </a>)}</div>
          <p className="fonte-detalhe">O manual não tem número digitado: cada valor dentro do texto é apurado na hora da geração, contra o arquivo da esteira e contra os sete arquivos originais da Crítica. Se a auditoria mudar e o manual não for regerado, a data no rodapé da capa denuncia.</p>
        </section>
        <section className="panel"><div className="panel-title"><div><span>Bases originais</span><h2>Como os arquivos chegaram, sem tratamento</h2></div><small>nenhum filtro, nenhuma coluna nova</small></div>
          <div className="arquivos">{ORIGINAIS.map(([arq, tipo, nome, nota, tam]) => <a key={arq} href={assetUrl(`bases/originais/${arq}`)} download>
            <b>{tipo}</b><span><strong>{nome}</strong><small>{nota}</small></span><em>{tam}</em>
          </a>)}</div>
          <p className="fonte-detalhe">São os arquivos de entrada, byte por byte como foram recebidos: nenhuma linha removida, nenhuma coluna criada, nenhum acento consertado. Servem para refazer qualquer número deste site do zero. Os dois arquivos em ZIP são texto puro em latin-1 — o Excel precisa que se escolha essa codificação e o ponto e vírgula como separador na hora de importar.</p>
        </section>
        <section className="panel"><div className="panel-title"><div><span>Bases com o cruzamento</span><h2>O que o trabalho produziu a partir delas</h2></div><small>já recortadas nas 1.510 e ligadas entre si</small></div>
          <div className="arquivos">{ARQUIVOS.map(([arq, nome, nota, tam]) => <a key={arq} href={assetUrl(`bases/${arq}`)} download>
            <b>XLSX</b><span><strong>{nome}</strong><small>{nota}</small></span><em>{tam}</em>
          </a>)}</div>
          <p className="fonte-detalhe">Aqui a linha da base original já está amarrada à SS que ela sustenta. O que muda em relação à fonte é o recorte e a ligação: nenhum valor foi resumido ou recalculado. A chave entre a SS e a interrupção é o código do transformador dentro da janela de 24 horas; entre a SS e o atendimento, o código do transformador e, desde a última correção, também o número da ocorrência.</p>
        </section>
        <section className="panel editorial-note wide"><span>DE ONDE VEM CADA NÚMERO</span>
          {fluxo.meta.fontes.map((f) => <p key={f}>· {f}</p>)}
        </section>
        <section className="panel warning-note wide"><strong>O que estas bases não respondem</strong>
          {fluxo.meta.lacunas.map((l) => <p key={l}>· {l}</p>)}
        </section>
        {/* Dois pedidos saíram desta lista porque foram atendidos, e continuar pedindo o que já
            chegou é pior que não pedir: a reextração do TMAE de 26 a 31 de janeiro veio — das 99
            SS abertas naquele trecho, 91 têm atendimento hoje — e a Crítica de dezembro de 2025
            entrou no acervo, que é o que fechou as 24 SS de borda do ano. */}
        <section className="panel editorial-note wide"><span>PEDIDOS EM ABERTO</span>
          <p>· Export de material das obras que ficaram de fora, hoje {br(conta((r) => r.material_conferido !== "SIM"))} solicitações — destas, {br(conta((r) => r.pendente_siago === "SIM"))} têm obra com número e enquadramento e só esperam a extração do SIAGO.</p>
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
          {/* A cronologia da ocorrência, do primeiro passo ao último. A Crítica parte cada
              ocorrência em várias linhas — uma por trecho manobrado — e o que importa para a
              janela é o vão inteiro: ela abre quando a primeira chave atua, não quando o
              transformador queima, e fecha quando o último cliente volta. Sem ver isso, uma
              SS aberta depois do religamento parece estar a dezenas de horas do evento. */}
          {ssDoAtivo.filter((r) => texto(r.oc_num)).length ? <section className="panel editorial-note wide">
            <span>A OCORRÊNCIA QUE SUSTENTA CADA SOLICITAÇÃO</span>
            <p>A Crítica quebra uma ocorrência em várias linhas, uma por trecho manobrado. O que vale para a janela é o intervalo inteiro — do primeiro passo aberto ao último fechado. A barra mostra esse vão e onde a solicitação cai dentro dele.</p>
            {ssDoAtivo.filter((r) => texto(r.oc_num)).map((r) => {
              const ini = new Date(String(r.oc_ini).replace(" ", "T")).getTime();
              const fim = new Date(String(r.oc_fim).replace(" ", "T")).getTime();
              const ab = new Date(String(r.abertura).replace(" ", "T")).getTime();
              const dur = Math.max(fim - ini, 1);
              // a SS pode cair antes, dentro ou depois; a régua mostra 24h de folga dos dois lados
              const folga = 24 * 3600 * 1000;
              const t0 = Math.min(ini, ab) - folga / 4;
              const t1 = Math.max(fim, ab) + folga / 4;
              const esc = (t: number) => `${Math.max(0, Math.min(100, ((t - t0) / (t1 - t0)) * 100))}%`;
              const dentro = ab >= ini && ab <= fim;
              return <div key={String(r.ss)} className="ocorrencia-linha">
                <header><strong>{texto(r.ss)}</strong><code>{texto(r.oc_num)}</code>
                  <em>{texto(r.oc_passos) ? `${texto(r.oc_passos)} passos · ` : ""}{texto(r.oc_dur_h)} h de vão</em>
                  <b className={dentro ? "dentro" : "fora"}>{dentro ? "a SS abre dentro da ocorrência" : `a SS abre ${distanciaEmPalavras(r.oc_dist_h, r.aberta_antes)}`}</b>
                </header>
                <div className="ocorrencia-regua">
                  <i style={{ left: esc(ini), width: `calc(${esc(fim)} - ${esc(ini)})` }} />
                  <u style={{ left: esc(ab) }} title={`SS aberta em ${dataBR(r.abertura)}`} />
                </div>
                <footer><span>abre {dataBR(r.oc_ini)}</span><span>SS {dataBR(r.abertura)}</span><span>fecha {dataBR(r.oc_fim)}</span></footer>
                <p className="fluxo-nota">{texto(r.oc_causa)} · {texto(r.oc_sub)} · {texto(r.oc_cons)} clientes interrompidos{texto(r.at_num) ? ` · equipe ${texto(r.at_equipe)} atendeu em ${dataBR(r.at_ini)}` : " · sem atendimento registrado no TMAE"}</p>
              </div>;
            })}
          </section> : null}
          <section className="panel list-panel">
            <div className="list-head"><div><span>{historicoDoAtivo.length} eventos</span><strong>Ativo {ativo}</strong></div></div>
            <div className="table-scroll"><table className="records-table">
              <thead><tr><th>Evento</th><th>Quando</th><th>Número</th><th>Papel</th><th>Clientes</th><th>Causa</th><th>Observação</th></tr></thead>
              <tbody>{historicoDoAtivo.map((l, i) => <tr key={i}>
                <td><strong>{texto(l[4])}</strong><span>{texto(l[1])}</span></td>
                <td><strong>{dataBR(l[5])}</strong><span>{texto(l[6]) ? `até ${dataBR(l[6])}` : ""}</span></td>
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
        // três números diferentes convivem aqui e a tela precisa reconciliar os três:
        // quantas têm interrupção na janela, quantas viram fato, quantas seguem para a etapa 2
        const naJanela = chegam.filter((r) => ["A", "B", "C"].includes(texto(r.e1_nivel)));
        const duplicadas = naJanela.filter((r) => r.cascata === "RETIDO — SS DUPLICADA");
        const soAtendimento = chegam.filter((r) => r.fato === "F2");
        const seguem = chegam.filter((r) => r.chega_e2 === "SIM");
        /* Quantos dos contidos a primeira régua sozinha teria perdido. É o que mede o valor da
           segunda: se fosse zero, ela seria enfeite. São 38 dos 64 — os outros 26 passariam
           pelos dois caminhos, e para esses tanto faz por qual entraram. */
        const soPelaContencao = registros.filter((r) => {
          if (r.oc_contida_na_ss !== "SIM") return false;
          const i = emMs(r.oc_ini), f = emMs(r.oc_fim) ?? emMs(r.oc_ini), a = emMs(r.abertura);
          if (!i || !f || !a) return false;
          return !(a >= i - H_MS && a <= f + 24 * H_MS);
        }).length;
        return <>
          {/* O QUE SAIU POR AQUI, LOGO DE CARA. Ele cobrou com razão: quem abre esta aba
              precisa ver primeiro quanta gente a falta de interrupção tirou do indicador, e
              não descobrir isso três telas depois. */}
          <section className="kpi-grid">
            <Kpi rotulo="Fora do indicador por falta de interrupção" valor={br(conta((r) => parouNaInterrupcao(r)))} nota="não têm ocorrência no próprio trafo que sustente o caso" tom="red" aoClicar={() => irPara("semfato", "parados")} />
            <Kpi rotulo="…sem registro nenhum na Crítica" valor={br(conta((r) => texto(r.expurgo_gatilho) === "sem_interrupcao"))} nota="o código não aparece em papel nenhum, nos sete meses" tom="red" aoClicar={() => irPara("semfato", "p_ausente")} />
            <Kpi rotulo="…com registro, mas em outra data" valor={br(conta((r) => texto(r.expurgo_gatilho) === "fora_da_janela"))} nota="tem defeito no próprio código fora da janela" tom="amber" aoClicar={() => irPara("semfato", "p_outra_data")} />
            <Kpi rotulo="Com interrupção no próprio trafo" valor={br(conta((r) => texto(r.censo_critica) === "DEFEITO NA JANELA"))} nota="a Crítica prova o defeito neste transformador, na data" tom="green" aoClicar={() => abrirRecorte("censo_janela")} />
            <Kpi rotulo="Entraram pela contenção" valor={br(conta((r) => r.oc_contida_na_ss === "SIM"))} nota="a SS abriu antes, e o corte aconteceu com ela já aberta" tom="blue" aoClicar={() => abrirRecorte("contida")} />
          </section>
          {/* DUAS RÉGUAS, LADO A LADO. Ele pediu: "seria perfeito se você adicionasse meio que uma
              esteira com a ocorrência e a data de abertura da SS" — e depois, olhando o resultado,
              "ajuste o design disso". O que estava errado não era o desenho: era o texto de doze
              linhas em volta dele, que enterrava a segunda régua num parágrafo solto e deixava
              parecer que era a primeira dita de outro jeito. São duas perguntas diferentes, e agora
              cada uma tem seu quadro, seu desenho e seu número. */}
          <section className="panel duas-reguas">
            <div className="panel-title"><div><span>A janela, desenhada</span><h2>Duas réguas decidem se a ocorrência é desta SS</h2></div><small>a segunda dispensa a primeira</small></div>
            <div className="reguas-par">
              {(() => {
                /* Os exemplos saem do dado, não de uma escolha minha: o primeiro é o caso da
                   janela com a maior folga que ainda entra — a SS nasceu horas depois de o
                   apagão terminar —, e o segundo é a contenção mais legível. Se o dado mudar,
                   o desenho muda junto. */
                const daJanela = registros
                  .filter((r) => r.cascata === "SAÍDA" && r.oc_contida_na_ss !== "SIM" && r.oc_ini && r.oc_fim
                    && Number(r.oc_dur_h) > 0.5 && Number(r.oc_dur_h) < 8)
                  .sort((a, b) => Number(b.oc_dist_h) - Number(a.oc_dist_h))[0];
                const daContencao = registros
                  .filter((r) => r.oc_contida_na_ss === "SIM" && r.termino && r.oc_ini)
                  .sort((a, b) => Number(b.aberta_antes_h) - Number(a.aberta_antes_h))
                  .find((r) => Number(r.aberta_antes_h) < 120);
                return <>
                  <article>
                    <header><b>1</b><div><strong>A janela</strong><em>1 hora antes · 24 horas depois</em></div><u>{br(conta((r) => ["A", "B", "C"].includes(texto(r.e1_nivel))) - soPelaContencao)} pela distância</u></header>
                    <p>Vale contra o <strong>intervalo inteiro</strong> da ocorrência, do primeiro passo ao último. Larga para frente porque a troca vem depois do apagão; estreita para trás porque a SS nasce antes do registro.</p>
                    {daJanela ? <><p className="fonte-detalhe">{texto(daJanela.ss)} · trafo {texto(daJanela.trafo)}</p><ReguaJanela r={daJanela} didatica /></> : null}
                  </article>
                  <article>
                    <header><b>2</b><div><strong>A contenção</strong><em>a ocorrência cabe dentro do serviço</em></div><u>{br(soPelaContencao)} só por aqui</u></header>
                    <p>A ocorrência <strong>começa e termina com a SS já aberta</strong>: o corte aconteceu durante o atendimento. A distância não é consultada. São <strong>{br(conta((r) => r.oc_contida_na_ss === "SIM"))}</strong> ao todo, e <strong>{br(soPelaContencao)}</strong> só entram por aqui.</p>
                    {daContencao ? <><p className="fonte-detalhe">{texto(daContencao.ss)} · trafo {texto(daContencao.trafo)}</p><ReguaContencao r={daContencao} /></> : null}
                  </article>
                </>;
              })()}
            </div>
            </section>
          <section className="kpi-grid">
            <Kpi rotulo="Passam por esta etapa" valor={br(chegam.length)} nota="todas do recorte: aqui ninguém foi filtrado ainda" tom="ink" />
            <Kpi rotulo="Com interrupção na janela" valor={br(naJanela.length)} nota={`${pct(naJanela.length, chegam.length)}% do recorte`} tom="green" aoClicar={() => abrirRecorte("casou")} />
            <Kpi rotulo="Seguem para o deslocamento" valor={br(seguem.length)} nota={`${br(casados.length)} com fato + ${br(soAtendimento.length)} só com atendimento`} tom="green" />
            <Kpi rotulo="Com ressalva" valor={br(conta((r) => Boolean(texto(r.ressalvas))))} nota="programada, sem cliente, outro elemento" tom="amber" aoClicar={() => abrirRecorte("ressalva")} />
            <Kpi rotulo="Em outra data" valor={br(conta((r) => r.e1_nivel === "FORA"))} nota="o ativo aparece, mas longe da SS" tom="blue" aoClicar={() => abrirRecorte("fora")} />
            <Kpi rotulo="Sem ocorrência" valor={br(conta((r) => r.e1_nivel === "SEM"))} nota="o código não aparece em seis meses" tom="red" aoClicar={() => abrirRecorte("sem")} />
            <Kpi rotulo="Distância mediana" valor={`${mediana(casados.map((r) => Math.abs(Number(r.oc_dist_h) || 0)))} h`} nota={`da SS até o intervalo da ocorrência — ${br(conta((r) => Number(r.oc_dist_h) === 0))} abrem dentro dele`} tom="ink" />
            <Kpi rotulo="Clientes interrompidos" valor={br(registros.reduce((s, r) => s + (Number(r.oc_cons) || 0), 0))} nota="somados nas ocorrências casadas" tom="ink" />
          </section>
          <section className="janela-controle">
            <span>Janela da interrupção</span>
            <div className="janela-botoes">{[12, 24, 48].map((h) => <button key={h} type="button" className={janela === h ? "ativo" : ""} onClick={() => setJanela(h)}>{h}h</button>)}</div>
            <small>{janela === fluxo.meta.janelaHoras ? "Janela padrão, a mesma da decisão gravada." : `${br(mudamComJanela)} solicitações mudariam de lado com ${janela}h. A decisão gravada continua a de ${fluxo.meta.janelaHoras}h.`}</small>
          </section>
          <section className="kpi-grid">
            {/* O CENSO, respondendo de uma vez a "quantos ativos estão mesmo ausentes". Contado
                contra os sete meses da Crítica, dezembro de 2025 incluído — foi essa a conta que
                eu tinha feito errado uma vez, lendo só 2026, e que dava 94 em vez de 78. */}
            <Kpi rotulo="Censo · defeito nele na janela" valor={br(conta((r) => texto(r.censo_critica) === "DEFEITO NA JANELA"))} nota="a Crítica prova o defeito neste trafo, na data" tom="green" aoClicar={() => abrirRecorte("censo_janela")} />
            <Kpi rotulo="Censo · defeito nele em outra data" valor={br(conta((r) => texto(r.censo_critica) === "DEFEITO EM OUTRA DATA"))} nota="existe ocorrência com defeito nele, só que fora da janela" tom="amber" aoClicar={() => abrirRecorte("censo_outradata")} />
            <Kpi rotulo="Censo · ausente da Crítica" valor={br(conta((r) => texto(r.censo_critica) === "AUSENTE"))} nota="o código não aparece em papel nenhum, nos sete meses" tom="red" aoClicar={() => abrirRecorte("censo_ausente")} />
            <Kpi rotulo="Censo · aparece, nunca com defeito nele" valor={br(conta((r) => texto(r.censo_critica) === "SEM DEFEITO NELE"))} nota="só como interrompido ou manobrado" tom="ink" aoClicar={() => abrirRecorte("censo_semdef")} />
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Causa registrada</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(registros.filter((r) => r.oc_num), "oc_causa", 8)} total={total} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
            {/* Este gráfico lia oc_prob_ele e por isso só sabia dizer "TR": o leitor da Crítica
                indexa apenas ocorrência cujo defeito é em transformador, então o campo era
                constante por construção — uma barra de 100% que não informava nada. Agora lê
                def_elemento, que é o marcador construído do segundo índice e sabe dizer que o
                trafo ficou sem energia por defeito na chave, na UC ou no disjuntor. */}
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Elemento do defeito</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(registros.map((r) => ({ ...r, _de: ELEMENTO_ROTULO[texto(r.def_elemento)] || "Sem defeito na janela" })), "_de", 6)} total={total} aoSelecionar={(l) => abrirRecorte({ "Defeito no transformador": "def_tr", "Defeito na unidade consumidora": "def_uc", "Defeito em chave": "def_ch", "Defeito em disjuntor": "def_dj" }[l] || "def_nenhum")} /></article>
          </section>
        </>;
      }
      if (modulo === "deslocamento") {
        const chegam = registros.filter((r) => r.chega_e2 === "SIM");
        const comAt = chegam.filter((r) => texto(r.at_num));
        /* Enxuto a pedido dele: aqui o que informa é o gráfico, não a fileira de números. Esta
           etapa não retém ninguém — é marcador —, então caixa demais dava a ela um peso de
           decisão que ela não tem. Ficaram três: quantos chegam, quantos têm equipe registrada
           e quanto tempo o atendimento leva. O resto virou gráfico, e o texto foi para Regras. */
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Chegam nesta etapa" valor={br(chegam.length)} nota="passaram pela interrupção" tom="ink" />
            <Kpi rotulo="Com equipe registrada no TMAE" valor={br(comAt.length)} nota={`${pct(comAt.length, chegam.length)}% — marcador, não retém ninguém`} tom="green" aoClicar={() => abrirRecorte("corrobora")} />
            <Kpi rotulo="Atendimento mediano" valor={`${mediana(comAt.map((r) => Number(r.at_tma) || 0))} min`} nota={`deslocamento mediano de ${mediana(comAt.map((r) => Number(r.at_tmd) || 0))} min`} tom="blue" />
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Causa registrada no atendimento</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(comAt, "at_causa", 10)} total={comAt.length} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Subcausa registrada</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(comAt, "at_sub", 10)} total={comAt.length} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>O TMAE corrobora?</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(chegam.map((r) => ({ ...r, _d: texto(r.deslocamento) || "sem registro" })), "_d", 5)} total={chegam.length} aoSelecionar={(l) => abrirRecorte(l === "CORROBORA" ? "corrobora" : "semat")} /></article>
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Equipe que atendeu</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(comAt, "at_equipe", 10)} total={comAt.length} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
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
            <Kpi rotulo="Não decide" valor={br(chegam.filter((r) => r.leitura === "L3").length)} nota="vai para leitura humana" tom="amber" aoClicar={() => abrirRecorte("indef")} />
            <Kpi rotulo="Categoria corrigida" valor={br(conta((r) => Boolean(texto(r.categoria_texto)) && r.categoria_texto !== r.categoria_gravada))} nota="o rótulo gravado não bate com o texto" tom="blue" aoClicar={() => abrirRecorte("corrigida")} />
            <Kpi rotulo="Material comprova" valor={br(conta((r) => (Number(r.trafos_material) || 0) > 0))} nota="transformador movimentado na obra" tom="green" />
            <Kpi rotulo="Sem conferência" valor={br(conta((r) => r.material_conferido !== "SIM"))} nota="obra fora do export ou não gerada" tom="amber" aoClicar={() => abrirRecorte("semmat")} />
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Leitura</span><h2>Categoria pelo texto</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(registros, "categoria_texto", 10)} total={total} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Origem</span><h2>Quem abriu a solicitação</h2></div><small>clique para filtrar</small></div>
              {/* Este gráfico era o único da tela que não filtrava. Quem abre a SS muda a
                  natureza do que se lê: o COI abre pelo relato do cliente, a MANUT abre pelo que
                  a equipe viu no poste, e as duas coisas não são a mesma prova. */}
              <Barras dados={contar(registros, "origem", 8)} total={total} aoSelecionar={(l) => {
                // o "—" é a barra de quem não tem origem gravada, e clicar nela limpava a busca
                // em vez de filtrar: o único rótulo do gráfico que não levava a lugar nenhum
                setBusca(""); if (l === "—") abrirRecorte("sem_origem"); else { setRecorte(null); setBusca(l); }
              }} /></article>
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
            {/* O cartão media com "SIGCO" e o chip com "espera": o alerta é gravado como
                "8812 espera queimado", então o cartão marcava 0 e abria 126. Agora os dois
                fazem a mesma pergunta ao mesmo campo. */}
            <Kpi rotulo="SIGCO divergente" valor={br(conta((r) => texto(r.e4_alertas).includes("espera")))} nota="código da SS diferente do projeto" tom="blue" aoClicar={() => abrirRecorte("sigco")} />
            <Kpi rotulo="Empreiteiras" valor={br(new Set(registros.map((r) => texto(r.obra_empreiteira)).filter(Boolean)).size)} nota="executaram as obras" tom="ink" />
            <Kpi rotulo="Realizado" valor={`R$ ${br(Math.round(registros.reduce((s, r) => s + (Number(r.obra_realizado) || 0), 0)))}`} nota="soma do custo das obras" tom="ink" />
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Enquadramento</span><h2>Tipo da obra</h2></div></div>
              <Barras dados={contar(registros.filter((r) => texto(r.obra)), "obra_tipo", 8)} total={total} aoSelecionar={(l) => {
                const n = normalize(l);
                setBusca(""); abrirRecorte(n.includes("PROGRAMADA") ? "obr_prog" : n.includes("PREVENTIVA") ? "obr_prev" : n.includes("EMERGENCIAL") ? "obr_emerg" : "obr_outra");
              }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Responsáveis</span><h2>Setor da última movimentação</h2></div></div>
              <Barras dados={contar(registros.filter((r) => texto(r.obra_setor)), "obra_setor", 8)} /></article>
          </section>
        </>;
      }
      if (modulo === "decisao") {
        /* REINCIDENTES — pedido dele: "leva só para comparativo em queimados e avariados os
           ativos reincidentes". Não muda número nenhum: é leitura. Um transformador que sai
           duas vezes no mesmo semestre não é erro de contagem se os dois eventos existem — é
           informação de rede, e é a primeira coisa que alguém pergunta numa reunião. */
        const naSaidaLista = registros.filter((r) => arquivo(r) === "SAÍDA");
        /* REINCIDÊNCIA CONTADA NA BASE INTEIRA, não só na saída. Olhar apenas quem saiu duas
           vezes mostra 8 ativos; olhar a base mostra 34 — e os outros 26 são justamente os
           interessantes, porque neles o mesmo transformador gerou uma segunda solicitação que
           NÃO contou: parou por falta de prova, ou saiu pela porta. É onde se enxerga se a conta
           está deixando evento repetido de fora. */
        const porAtivo = new Map<string, Registro[]>();
        registros.forEach((r) => {
          const k = texto(r.trafo);
          if (!k) return;
          porAtivo.set(k, [...(porAtivo.get(k) || []), r]);
        });
        const reincidentes = [...porAtivo.entries()].filter(([, v]) => v.length > 1)
          .map(([k, v]) => {
            const ord = [...v].sort((a, b) => String(a.abertura).localeCompare(String(b.abertura)));
            const d1 = new Date(String(ord[0].abertura).replace(" ", "T"));
            const d2 = new Date(String(ord[ord.length - 1].abertura).replace(" ", "T"));
            const dias = Math.round((d2.getTime() - d1.getTime()) / 86400000);
            const mesmaOc = new Set(ord.map((r) => texto(r.oc_num)).filter(Boolean)).size < ord.filter((r) => texto(r.oc_num)).length;
            return { trafo: k, linhas: ord, dias, mesmaOc };
          }).sort((a, b) => a.dias - b.dias);
        return <>
          {/* UMA CONTA SÓ NESTA TELA. Havia duas fileiras de caixas aqui, e elas discordavam:
              uma contava pela decisão gravada no arquivo, a outra pelo arquivamento de agora,
              que inclui o martelo dele. "Queimados 1.185" em cima e "Queimados 1.188" embaixo,
              na mesma tela, é o tipo de coisa que derruba uma reunião. Ficou a conta de agora,
              que é a que a barra lateral e o funil também usam. */}
          <section className="kpi-grid">
            <Kpi rotulo="Queimados e avariados" valor={br(naSaidaLista.length)} nota="saíram pela ponta da esteira e contam no indicador" tom="green" aoClicar={() => abrirRecorte("saida")} />
            <Kpi rotulo="Queimados" valor={br(naSaidaLista.filter((r) => (classificacao[texto(r.ss)]?.classe || texto(r.confirmado)) === "QUEIMADO").length)} nota="causa confirmada: queima" tom="red" />
            <Kpi rotulo="Avariados" valor={br(naSaidaLista.filter((r) => (classificacao[texto(r.ss)]?.classe || texto(r.confirmado)) === "AVARIADO").length)} nota="vazamento, bucha, tensão, fase" tom="blue" />
            <Kpi rotulo="Em revisão" valor={br(conta((r) => String(arquivo(r)).startsWith("RETIDO")))} nota="esperam prova de material" tom="amber" aoClicar={() => irPara("expurgos", "parados")} />
            <Kpi rotulo="Fora do indicador" valor={br(excluidas)} nota="outra causa, ou sem interrupção que sustente" tom="ink" aoClicar={() => irPara("exclusoes", "todos")} />
            <Kpi rotulo="Mudaram na revisão" valor={br(conta((r) => r.mudou_na_revisao === "SIM"))} nota="decisão diferente do funil anterior" tom="blue" aoClicar={() => abrirRecorte("mudou")} />
            <Kpi rotulo="Ativos com mais de uma SS" valor={br(reincidentes.length)} nota="o mesmo transformador aparece mais de uma vez na base" tom="amber" aoClicar={() => abrirRecorte("reincidente")} />
            <Kpi rotulo="…destes, contando duas vezes" valor={br(reincidentes.filter((x) => x.linhas.filter((r) => arquivo(r) === "SAÍDA").length > 1).length)} nota="saíram pela ponta mais de uma vez" tom="red" aoClicar={() => abrirRecorte("reincidente_saida")} />
            <Kpi rotulo="Segunda SS em 30 dias ou menos" valor={br(reincidentes.filter((x) => x.dias <= 30).length)} nota="o mesmo transformador voltou a pedir troca no mesmo mês" tom="red" aoClicar={() => abrirRecorte("reincidente_30")} />
          </section>
          {reincidentes.length ? <section className="panel"><div className="panel-title"><div><span>Comparativo</span><h2>Ativos com mais de uma solicitação</h2></div><small>clique numa linha para abrir o dossiê</small></div>
            <div className="table-scroll"><table className="records-table">
              <thead><tr><th>Transformador</th><th>Intervalo</th><th>Solicitações</th><th>Ocorrências</th><th>Material</th><th>Causa</th></tr></thead>
              <tbody>{reincidentes.map((x) => <tr key={x.trafo} onClick={() => { setAtivo(x.trafo); irPara("ativos"); }}>
                <td><strong>{x.trafo}</strong><span>{texto(x.linhas[0].localidade)}</span></td>
                <td><strong>{x.dias} dias</strong><span>{x.linhas.length} saídas</span>{x.mesmaOc ? <small className="expurgo-tag">dividem ocorrência</small> : null}</td>
                <td>{x.linhas.map((r) => <span key={texto(r.ss)}>{texto(r.ss)} · {dataBR(r.abertura)}</span>)}</td>
                <td>{x.linhas.map((r) => <span key={texto(r.ss)}>{texto(r.oc_num) || "sem ocorrência"}</span>)}</td>
                <td>{x.linhas.map((r) => <span key={texto(r.ss)}>{texto(r.trafos_material)} trafo{texto(r.material_conferido) === "SIM" ? "" : " (não conferido)"}</span>)}</td>
                <td>{x.linhas.map((r) => <span key={texto(r.ss)}>{classificacao[texto(r.ss)]?.classe || texto(r.confirmado) || arquivo(r)}</span>)}</td>
              </tr>)}</tbody>
            </table></div>
          </section> : null}
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Queimados e avariados</span><h2>Causa confirmada</h2></div></div>
              <Barras dados={contar(naSaidaLista.map((r) => ({ ...r, _c: classificacao[texto(r.ss)]?.classe || texto(r.confirmado) })), "_c", 6)} total={naSaidaLista.length} /></article>
            <article className="panel"><div className="panel-title"><div><span>Queimados e avariados</span><h2>Etiquetas do caso</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(naSaidaLista.flatMap((r) => texto(r.etiquetas).split(" · ").filter(Boolean).map((e) => ({ ...r, _e: e }))), "_e", 10)} total={naSaidaLista.length} aoSelecionar={(l) => { setBusca(""); abrirRecorte(`etq:${l}`); }} /></article>
          </section>
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Queimados e avariados</span><h2>Subcausa da Crítica</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(naSaidaLista.map((r) => ({ ...r, _s: texto(r.oc_sub) || "sem ocorrência" })), "_s", 10)} total={naSaidaLista.length} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Queimados e avariados</span><h2>Mês da abertura</h2></div></div>
              <Barras dados={porMes(naSaidaLista, registros)} total={naSaidaLista.length} /></article>
          </section>
        </>;
      }
      /* A quarta peneira é a que fecha o 884 e era a única sem cabeçalho: caía no return null
         e abria direto na lista, sem KPI e sem uma linha explicando o que é uma ressalva.
         Numa aba que decide o número final, isso é o pior lugar para ficar mudo. */
      if (modulo === "ressalva") {
        const entram = registros.filter((r) => r.chega_e3 === "SIM"
          && r.cascata !== "RETIDO — SEM PROVA DE TROCA");
        const retidos = registros.filter((r) => r.cascata === "RETIDO — RESSALVA DA INTERRUPÇÃO");
        const sinais = new Map<string, number>();
        retidos.forEach((r) => texto(r.e4_alertas || r.ressalvas).split(/\s*[·;]\s*/)
          .filter(Boolean).forEach((s) => sinais.set(s, (sinais.get(s) || 0) + 1)));
        const top = [...sinais.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
        return <>
          <section className="panel editorial-note wide"><span>O QUE ESTA PENEIRA FAZ</span>
            <p>Chegam aqui <strong>{br(entram.length)}</strong> solicitações que já passaram pelas três anteriores: têm interrupção na janela, têm atendimento de equipe no transformador, e o texto mais o material comprovam a troca. Esta peneira não pergunta de novo se houve falha — ela pergunta se a <strong>interrupção que sustenta o caso</strong> tem algum sinal que a enfraquece.</p>
            <p>Um sinal não desmente a troca. Ele diz que aquela interrupção específica serve mal como prova: um desligamento programado não é falha, uma ocorrência sem nenhum cliente interrompido não mede impacto, um defeito aberto em outro elemento pode ter derrubado o transformador sem ser dele, e uma reclamação individual fala de um cliente, não do equipamento. Por isso o caso fica <strong>retido</strong>, e não excluído: sai da saída e continua na base, com o motivo escrito.</p>
            <p>Param aqui <strong>{br(retidos.length)}</strong>. Os outros <strong>{br(entram.length - retidos.length)}</strong> formam a saída da esteira.</p>
          </section>
          <section className="kpi-grid">
            <Kpi rotulo="Chegam nesta etapa" valor={br(entram.length)} nota="passaram nas três peneiras anteriores" tom="ink" />
            <Kpi rotulo="Retidos pela ressalva" valor={br(retidos.length)} nota={`${pct(retidos.length, entram.length)}% dos que chegam`} tom="amber" aoClicar={() => abrirRecorte("todos")} />
            <Kpi rotulo="Seguem para a saída" valor={br(entram.length - retidos.length)} nota="é o número que a auditoria entrega" tom="green" aoClicar={() => irPara("decisao", "saida")} />
            {top.map(([nome, n]) => <Kpi key={nome} rotulo={nome.length > 34 ? `${nome.slice(0, 33)}…` : nome}
              valor={br(n)} nota="sinal que enfraquece a interrupção" tom="blue" />)}
          </section>
        </>;
      }

      if (modulo === "semdesloc") {
        // a segunda peneira deixou de reter: o que existe é o MARCADOR de quem não tem
        // atendimento no TMAE. A fila lia uma categoria extinta e abria com 0 embaixo de uma
        // caixa que anunciava 140.
        const fila = registros.filter((r) => arquivo(r) !== "EXCLUÍDA" && r.deslocamento === "SEM REGISTRO");
        const comCliente = fila.filter((r) => (Number(r.oc_cons) || 0) > 0).length;
        const proprioTrafo = fila.filter((r) => texto(r.oc_papel).includes("próprio")).length;
        const outroAtendimento = fila.filter((r) => (Number(r.atendimentos_ativo) || 0) > 0).length;
        return <>
          <section className="panel editorial-note wide"><span>O QUE ESTA FILA É</span>
            <p>Houve interrupção no transformador dentro da janela, mas não há atendimento registrado no código dele. É raro e merece desconfiança dos dois lados: pode ser nota não lançada, pode ser atendimento gravado sob outro equipamento — a chave do TMAE é o elemento onde o defeito foi aberto —, e pode ser lacuna de arquivo.</p>
          </section>
          <section className="kpi-grid">
            <Kpi rotulo="Nesta fila" valor={br(fila.length)} nota="interrupção sim, atendimento não" tom="amber" aoClicar={() => abrirRecorte("todos")} />
            <Kpi rotulo="Com cliente interrompido" valor={br(comCliente)} nota="a interrupção atingiu gente" tom="ink" />
            <Kpi rotulo="Defeito no próprio trafo" valor={br(proprioTrafo)} nota="o campo apontou o transformador" tom="red" />
            <Kpi rotulo="O ativo tem atendimento em outra data" valor={br(outroAtendimento)} nota="a equipe já esteve nesse trafo no semestre" tom="amber" />
            <Kpi rotulo="Com material" valor={br(fila.filter((r) => (Number(r.trafos_material) || 0) > 0).length)} nota="a obra movimentou transformador" tom="green" />
            {/* O cartão "provavelmente em 2025" saiu. Ele era uma hipótese sobre um arquivo
                que faltava; dezembro/2025 está no acervo e as 24 SS de borda foram todas
                reprocuradas — as 24 acharam ocorrência, 20 delas com data em dezembro. Não há
                mais "provavelmente": há resposta. */}
            <Kpi rotulo="Casaram em dezembro de 2025" valor={br(fila.filter((r) => r.borda_2025 === "SIM" && String(r.oc_ini || "").startsWith("2025")).length)} nota="a janela retrocedia para antes de 2026 e a base de dezembro respondeu" tom="green" />
          </section>
        </>;
      }

      if (modulo === "profunda") {
        const marcadas = registros.filter((r) => classificacao[texto(r.ss)]);
        const porClasse = (c: string) => marcadas.filter((r) => classificacao[texto(r.ss)].classe === c).length;
        return <>
          <section className="panel editorial-note wide"><span>SUA ANÁLISE</span>
            <p>O que você classificou fica aqui, ao lado da decisão do fluxo — nunca por cima dela. A marcação é gravada neste navegador, com o seu nome e a hora, e aparece em todas as listas. Ela também manda no arquivamento: o que você marca como queimado, avariado, preventivo ou excluído sai da fila de pendências e vai para a aba correspondente.</p>
            <p>Marque <strong>Queimado</strong> ou <strong>Avariado</strong> quando bater o martelo, <strong>Preventivo</strong> ou <strong>Excluído</strong> quando o caso não for deste indicador, <strong>Vale a regra do fluxo</strong> quando concordar com o que o sistema decidiu, e <strong>Análise profunda</strong> quando o caso precisar de campo ou de documento que não temos.</p>
          </section>
          {/* A marcação vive no armazenamento local deste navegador. Publicar o site não a toca —
              troca o JavaScript e o dado, nunca o armazenamento —, mas ela existe num navegador
              SÓ. Classificar no computador e abrir no celular não traz nada junto, e limpar os
              dados do navegador apaga tudo sem aviso. Para um trabalho que vai para reunião isso
              é frágil demais: aqui está a saída e a entrada dele, em arquivo. */}
          <section className="panel editorial-note wide destaque"><span>GUARDE O SEU TRABALHO</span>
            <p>As {br(marcadas.length)} marcações estão gravadas <strong>neste navegador</strong>. Publicar o site não as apaga — mas trocar de máquina, usar o celular ou limpar os dados do navegador, sim. Baixe o arquivo antes de qualquer uma dessas coisas; ele traz a SS, a classe, quem marcou e quando.</p>
            <div className="classificacao-arquivo">
              <button type="button" onClick={() => {
                const linhas = [["SS", "Classe", "Quem", "Quando"].join(";")].concat(
                  Object.entries(classificacao).map(([ss, c]) => [ss, c.classe, c.quem, c.quando].join(";")));
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob(["\ufeff" + linhas.join("\n")], { type: "text/csv;charset=utf-8" }));
                a.download = `minha-classificacao-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click(); URL.revokeObjectURL(a.href);
              }}>Baixar as minhas marcações ({br(marcadas.length)})</button>
              <label className="restaurar">Restaurar de um arquivo
                <input type="file" accept=".csv,text/csv" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const leitor = new FileReader();
                  leitor.onload = () => {
                    const linhas = String(leitor.result || "").replace(/^\ufeff/, "").split(/\r?\n/).slice(1);
                    // funde em vez de substituir: quem restaura num navegador que já tem marcação
                    // não pode perder a que está aqui só por abrir o arquivo do outro
                    const novo = { ...classificacao };
                    let lidas = 0;
                    linhas.forEach((l) => {
                      const [ss, classe, quem, quando] = l.split(";");
                      if (!ss || !classe) return;
                      novo[ss] = { classe, quem: quem || "arquivo restaurado", quando: quando || "" };
                      lidas += 1;
                    });
                    setClassificacao(novo);
                    localStorage.setItem("fluxo-1510-classificacao", JSON.stringify(novo));
                    window.alert(`${lidas} marcações restauradas. As que já estavam aqui foram mantidas.`);
                  };
                  leitor.readAsText(f, "utf-8");
                  e.target.value = "";
                }} />
              </label>
            </div>
          </section>
          <section className="kpi-grid">
            <Kpi rotulo="Classificadas por você" valor={br(marcadas.length)} nota={`de ${br(total)} no recorte`} tom="ink" aoClicar={() => abrirRecorte("todos")} />
            <Kpi rotulo="Queimado" valor={br(porClasse("QUEIMADO"))} nota="martelo batido" tom="green" aoClicar={() => abrirRecorte("q")} />
            <Kpi rotulo="Avariado" valor={br(porClasse("AVARIADO"))} nota="martelo batido" tom="blue" aoClicar={() => abrirRecorte("a")} />
            <Kpi rotulo="Preventivo" valor={br(porClasse("PREVENTIVO"))} nota="troca sem defeito" tom="amber" aoClicar={() => abrirRecorte("v")} />
            <Kpi rotulo="Excluído" valor={br(porClasse("EXCLUIDO"))} nota="fora do indicador pela sua leitura" tom="red" aoClicar={() => abrirRecorte("x")} />
            <Kpi rotulo="Vale a regra" valor={br(porClasse("REGRA"))} nota="concorda com o fluxo" tom="amber" aoClicar={() => abrirRecorte("r")} />
            <Kpi rotulo="Análise profunda" valor={br(porClasse("PROFUNDA"))} nota="precisa de campo ou documento" tom="red" aoClicar={() => abrirRecorte("p")} />
            <Kpi rotulo="Aprovados COM prova de campo" valor={br(marcadas.filter((r) => ["QUEIMADO", "AVARIADO"].includes(classificacao[texto(r.ss)]?.classe || "") && texto(r.def_elemento) === "TR" && Number(r.oc_dist_h) === 0).length)} nota="a Crítica registra defeito neste trafo e a SS abre dentro da ocorrência" tom="green" aoClicar={() => abrirRecorte("meu_casa")} />
            <Kpi rotulo="Aprovados SEM prova de campo" valor={br(marcadas.filter((r) => ["QUEIMADO", "AVARIADO"].includes(classificacao[texto(r.ss)]?.classe || "") && texto(r.def_elemento) !== "TR").length)} nota="entram pelo seu martelo, sem casamento na Crítica" tom="red" aoClicar={() => abrirRecorte("meu_sem")} />
            <Kpi rotulo="Marcados sem cliente interrompido" valor={br(marcadas.filter((r) => r.sem_cliente_interrompido === "SIM").length)} nota="a ocorrência não penalizou ninguém — sem DEC nem FEC" tom="amber" aoClicar={() => abrirRecorte("sem_cliente")} />
            <Kpi rotulo="Ainda sem sua leitura" valor={br(total - marcadas.length)} nota="seguem só com a decisão do fluxo" tom="ink" />
          </section>
          {/* O gráfico que as outras abas têm e esta não tinha. Clicar numa barra filtra a
              lista, igual à Interrupção e às Exclusões — é o jeito mais rápido de ver o que já
              foi martelado e abrir só aquilo. */}
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Minha classificação</span><h2>O que eu marquei</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(marcadas.map((r) => ({ ...r, _c: meuRotulo(classificacao[texto(r.ss)].classe) })), "_c", 10)} total={marcadas.length} aoSelecionar={(l) => {
                setBusca("");
                const classe = Object.entries(MEU_ROTULO).find(([, v]) => v === l)?.[0];
                if (classe) { abrirRecorte({ QUEIMADO: "q", AVARIADO: "a", PREVENTIVO: "v", FURTADO: "f", EXCLUIDO: "x", REGRA: "r", PROFUNDA: "p" }[classe] || "todos"); return; }
                /* A barra pode ser uma CATEGORIA de exclusão marcada à mão, e aí o lugar certo
                   não é esta aba: é o chip daquela categoria nas exclusões, onde ela convive com
                   os casos que a regra excluiu pelo mesmo motivo. */
                const gat = Object.entries(GATILHO_ROTULO).find(([, v]) => v.toUpperCase() === l)?.[0];
                if (gat) irPara("exclusoes", GATILHO_CHIP[gat] || `g:${gat}`); else abrirRecorte("todos");
              }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Minha classificação</span><h2>Onde o caso foi parar</h2></div><small>para onde o seu martelo mandou</small></div>
              <Barras dados={contar(marcadas.map((r) => ({ ...r, _d: arquivo(r) })), "_d", 8)} total={marcadas.length} /></article>
          </section>
        </>;
      }

      if (modulo === "semfato") {
        /* A aba dizia 0 e o dono viu antes de mim: "deveria mostrar os excluídos na janela e as
           24 horas e os que são ausentes da base de interrupções". Enquanto a falta de
           interrupção RETINHA, esta lista era a dos retidos. Depois que ela passou a EXCLUIR, a
           cascata deixou de guardar essa gente e a aba esvaziou — mas quem não passou na
           primeira peneira continua sendo quem não passou, esteja retido ou arquivado. É por
           isto que agora ela lê pelo gatilho e não pelo lugar. */
        const aqui = parouNaInterrupcao;
        const semFato = registros.filter(aqui);
        const g = (k: string) => registros.filter((r) => texto(r.expurgo_gatilho) === k).length;
        const duplicadas = registros.filter((r) => r.cascata === "RETIDO — SS DUPLICADA");
        return <>
        <section className="panel editorial-note wide"><span>O QUE PAROU NA PRIMEIRA PENEIRA</span>
          <p>São <strong>{br(semFato.length)}</strong> solicitações que não têm interrupção no próprio transformador dentro do intervalo da ocorrência nem nas 24 horas seguintes ao último passo dela. Elas <strong>saem do indicador</strong> — a peneira 1 arquiva em vez de reter —, mas continuam listadas aqui, porque é aqui que se lê por que cada uma não passou. São duas situações, e só duas: <strong>{br(g("fora_da_janela"))}</strong> têm defeito registrado no próprio código, só que em outra data, e <strong>{br(g("sem_interrupcao"))}</strong> não aparecem na Crítica em papel nenhum nos sete meses do acervo — nem com defeito, nem interrompidas, nem manobradas.</p>
          <p>Duas ordens dele fecharam esta divisão. A categoria “sem rastro em base alguma” deixou de existir — é a mesma coisa que ausente: cinco dos sete casos foram somados aos ausentes e dois, que têm defeito próprio em outra data, foram para fora da janela. E os <strong>23</strong> que apareciam na Crítica só como interrompidos ou manobrados, nunca como o elemento com defeito, também foram para <strong>ausente</strong>, depois de ele ler os casos um a um. Com isso “fora da janela” passa a ser exatamente quem tem distância para medir: os {br(g("fora_da_janela"))} da distribuição ao lado, sem sobra.</p>
          <p>Dentro do conjunto, {br(semFato.filter((r) => r.leitura === "L2").length)} têm texto de furto, abalroamento, preventivo ou auxiliar — nesses a ausência de interrupção é esperada, porque não são falha de equipamento. Os outros {br(semFato.filter((r) => r.leitura !== "L2").length)} descrevem queima ou avaria: são esses que sobem para investigação, e é neles que a ausência de registro é a pergunta.</p>
        </section>
        <section className="kpi-grid">
          <Kpi rotulo="Pararam na interrupção" valor={br(semFato.length)} nota="não passaram na primeira peneira" tom="red" aoClicar={() => abrirRecorte("parados")} />
          <Kpi rotulo="Tem registro, mas em outra data" valor={br(g("fora_da_janela"))} nota="defeito no próprio código, fora da janela" tom="amber" aoClicar={() => abrirRecorte("p_outra_data")} />
          <Kpi rotulo="Ausente da base de interrupções" valor={br(g("sem_interrupcao"))} nota="nunca teve defeito aberto nele" tom="red" aoClicar={() => abrirRecorte("p_ausente")} />
          <Kpi rotulo="Vizinho encontrado" valor={br(conta((r) => aqui(r) && Boolean(texto(r.vizinho)) && !texto(r.vizinho).startsWith("Nada")))} nota="número operativo provavelmente trocado" tom="amber" aoClicar={() => abrirRecorte("vizinho")} />
          <Kpi rotulo="Nada encontrado" valor={br(conta((r) => aqui(r) && texto(r.vizinho).startsWith("Nada")))} nota="sobe para investigação de campo" tom="red" aoClicar={() => abrirRecorte("nada")} />
          <Kpi rotulo="Com texto de falha" valor={br(conta((r) => aqui(r) && r.leitura === "L1"))} nota="texto diz queima, campo não registra" tom="amber" />
          <Kpi rotulo="Aberta antes da interrupção" valor={br(conta((r) => aqui(r) && r.aberta_antes === "SIM"))} nota="a ocorrência começou depois de a SS abrir" tom="ink" aoClicar={() => abrirRecorte("antes")} />
          <Kpi rotulo="Casaram em dezembro de 2025" valor={br(conta((r) => r.borda_2025 === "SIM" && String(r.oc_ini || "").startsWith("2025")))} nota="a janela retrocedia para antes de 2026 e a base de dezembro respondeu" tom="green" />
          <Kpi rotulo="SS duplicada" valor={br(duplicadas.length + g("duplicada"))} nota="mesmo trafo e mesmo evento de outra SS" tom="amber" aoClicar={() => abrirRecorte("duplicada")} />
        </section>
        {/* HÁ QUANTO TEMPO, E LIGADO A QUÊ. Ele pediu as duas coisas nestas palavras: "me mostra
            pelo site quanto tempo esses realmente estão fora da janela, e os ausentes como são
            vinculados — não mostre interrupção neles". São perguntas opostas e por isso ficam
            lado a lado: de um lado a distância de quem TEM registro, do outro a única ligação
            que existe para quem não tem nenhum. */}
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Tem registro, em outra data</span><h2>Há quanto tempo, de verdade</h2></div><small>distância da SS até o intervalo da ocorrência</small></div>
            {(() => {
              const fora = registros.filter((r) => texto(r.expurgo_gatilho) === "fora_da_janela"
                && r.oc_dist_h !== null && r.oc_dist_h !== undefined && r.oc_dist_h !== "");
              const h = (r: Registro) => Math.abs(Number(r.oc_dist_h) || 0);
              const FAIXAS: Array<[string, (x: number) => boolean]> = [
                ["até 24 horas", (x) => x <= 24],
                ["1 a 7 dias", (x) => x > 24 && x <= 168],
                ["7 a 30 dias", (x) => x > 168 && x <= 720],
                ["1 a 3 meses", (x) => x > 720 && x <= 2160],
                ["mais de 3 meses", (x) => x > 2160],
              ];
              const ds = fora.map(h).sort((a, b) => a - b);
              return <>
                <Barras dados={FAIXAS.map(([rot, teste]) => ({ label: rot, value: fora.filter((r) => teste(h(r))).length }))}
                  total={fora.length} aoSelecionar={() => abrirRecorte("p_outra_data")} />
                {ds.length ? <p className="fluxo-nota">A mais perto está a <strong>{ds[0].toFixed(1)} h</strong> da janela e a mais longe a <strong>{Math.round(ds[ds.length - 1] / 24)} dias</strong>; a mediana é de <strong>{Math.round(ds[Math.floor(ds.length / 2)] / 24)} dias</strong>. A distância é medida da abertura da SS até a borda mais próxima do intervalo inteiro da ocorrência — a mesma régua da peneira, não uma régua nova.</p> : null}
              </>;
            })()}
          </article>
          <article className="panel"><div className="panel-title"><div><span>Ausentes da Crítica</span><h2>A que eles se ligam</h2></div><small>e por que nenhuma interrupção aparece</small></div>
            {(() => {
              const aus = registros.filter((r) => texto(r.expurgo_gatilho) === "sem_interrupcao");
              const comOc = aus.filter((r) => texto(r.oc_num)).length;
              const comViz = aus.filter((r) => texto(r.vizinho) && !texto(r.vizinho).startsWith("Nada")).length;
              const comAt = aus.filter((r) => texto(r.at_num)).length;
              return <>
                <Barras dados={[
                  { label: "Nenhuma ocorrência exibida", value: aus.length - comOc },
                  { label: "Vizinho no alimentador — hipótese", value: comViz },
                  { label: "Nada encontrado nem no vizinho", value: aus.length - comViz },
                  { label: "Com atendimento do TMAE", value: comAt },
                ]} total={aus.length} aoSelecionar={(l) => abrirRecorte(l.startsWith("Vizinho") ? "vizinho" : l.startsWith("Nada") ? "nada" : "p_ausente")} />
                <p className="fluxo-nota">Para estes <strong>{br(aus.length)}</strong> o dossiê <strong>não mostra ocorrência nenhuma</strong>, e não é omissão: o código não aparece na Crítica em papel nenhum — nem com defeito, nem interrompido, nem manobrado — em sete meses de acervo. Exibir “a ocorrência mais próxima” aqui seria inventar vínculo. A única ligação que existe é o <strong>teste do vizinho</strong>, e ele é hipótese declarada, não prova: aponta uma ocorrência em OUTRO ativo do mesmo alimentador na janela, com a suspeita de número operativo trocado. Quem for a campo confere isso; a tela não decide por ele.</p>
              </>;
            })()}
          </article>
        </section>
        {/* O analítico que as outras abas têm e esta não tinha. Três perguntas diferentes sobre
            o mesmo conjunto: por que parou, o que o texto do caso diz, e em que estado o ativo
            está na Crítica inteira. Cada barra filtra a lista embaixo. */}
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Parados na interrupção</span><h2>Por que parou aqui</h2></div><small>clique para filtrar</small></div>
            <Barras dados={contar(semFato.map((r) => ({ ...r, _p: GATILHO_ROTULO[texto(r.expurgo_gatilho)] || "Ainda retido" })), "_p", 10)} total={semFato.length} aoSelecionar={(l) => {
              const chave = Object.entries(GATILHO_ROTULO).find(([, v]) => v === l)?.[0];
              setBusca(""); abrirRecorte({ fora_da_janela: "p_outra_data", sem_interrupcao: "p_ausente" }[chave || ""] || "parados");
            }} /></article>
          <article className="panel"><div className="panel-title"><div><span>Parados na interrupção</span><h2>O que o texto do caso diz</h2></div><small>clique para filtrar</small></div>
            <Barras dados={contar(semFato.map((r) => ({ ...r, _t: texto(r.categoria_texto) || "não decide" })), "_t", 8)} total={semFato.length} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
        </section>
        <section className="dashboard-columns">
          <article className="panel"><div className="panel-title"><div><span>Parados na interrupção</span><h2>Onde o ativo está na Crítica</h2></div><small>clique para filtrar</small></div>
            <Barras dados={contar(semFato.map((r) => ({ ...r, _c: texto(r.censo_critica) || "—" })), "_c", 6)} total={semFato.length} aoSelecionar={(l) => {
              setBusca(""); abrirRecorte({ "AUSENTE": "censo_ausente", "SEM DEFEITO NELE": "censo_semdef", "DEFEITO EM OUTRA DATA": "censo_outradata", "DEFEITO NA JANELA": "censo_janela" }[l] || "parados");
            }} /></article>
          <article className="panel"><div className="panel-title"><div><span>Parados na interrupção</span><h2>Mês da abertura da SS</h2></div></div>
            <Barras dados={porMes(semFato, registros)} total={semFato.length} /></article>
        </section>
                <section className="panel editorial-note wide"><span>POR QUE ELAS SAEM E NÃO FICAM ESPERANDO</span>
          <p>Foi regra sua: “se do primeiro passo aberto até o último passo o cara não abriu a SS e nem 24 horas depois do último passo, desconsidere e resuma nos excluídos”. Enquanto ficavam retidas, apareciam como pendência de leitura — como se ainda faltasse alguém olhar — quando a resposta já existia. Nenhum registro é apagado: a linha continua com o motivo escrito e o dossiê inteiro.</p>
        </section></>;
      }
      if (modulo === "expurgos") {
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Parados sem prova de troca" valor={br(paramE3)} nota="a obra não comprova movimentação de transformador" tom="amber" aoClicar={() => abrirRecorte("semprova")} />
            <Kpi rotulo="Só falta a extração do SIAGO" valor={br(conta((r) => r.pendente_siago === "SIM"))} nota="a obra existe; o material dela é que não está no export" tom="blue" aoClicar={() => abrirRecorte("siago")} />
            <Kpi rotulo="Material não conferido" valor={br(conta((r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" && r.material_conferido !== "SIM"))} nota="a obra está fora do export de material" tom="ink" aoClicar={() => abrirRecorte("semprova_mat")} />
            <Kpi rotulo="Texto não decide" valor={br(conta((r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" && r.leitura === "L3"))} nota="a leitura ficou indefinida" tom="ink" aoClicar={() => abrirRecorte("semprova_texto")} />
            <Kpi rotulo="Sob suspeita no texto" valor={br(conta((r) => r.sob_suspeita === "SIM" && arquivo(r) === "RETIDO — SEM PROVA DE TROCA"))} nota="medido, plano de medida, remanejamento ou sobrecarga" tom="amber" aoClicar={() => abrirRecorte("suspeita")} />
          </section>
          <section className="panel editorial-note wide"><span>COMO LER ESTA FILA</span>
            <p>Aqui não há exclusão nenhuma. A terceira peneira faz uma pergunta só — a obra comprova que um transformador foi movimentado? — e retém quem não responde. Ausência de prova não é prova de ausência: nenhum destes casos foi tirado do indicador, todos esperam leitura. As exclusões por causa ficam no bloco <strong>Fora da esteira</strong>, porque acontecem antes dela.</p>
          </section>
        </>;
      }

      if (modulo === "exclusoes") {
        const g = (k: string) => conta((r) => categoriaDe(r) === k);
        /* UMA CAIXA POR CATEGORIA, gerada do próprio dado.
           A lista era escrita à mão e fazia duas coisas erradas ao mesmo tempo: somava
           categorias diferentes na mesma caixa — "construção ou desativação" num número só,
           quando obra nova e retirada de posto não são a mesma coisa — e deixava sem caixa
           nenhuma o que tivesse nascido depois da última vez que alguém editou esta linha.
           Agora quem manda é o gatilho: o que existir no dado aparece, na ordem do tamanho. */
        const categorias = [...new Set(registros.filter((r) => arquivo(r) === "EXCLUÍDA")
          .map((r) => categoriaDe(r)).filter(Boolean))]
          .map((k) => ({ k, n: g(k) })).sort((a, b) => b.n - a.n);
        const TOM: Record<string, "red" | "amber" | "blue" | "ink" | "green"> = {
          furto: "ink", abalroamento: "amber", sem_fato: "red", sem_interrupcao: "red",
          fora_da_janela: "red", sem_obra: "amber", sem_os: "amber", erro_cadastro: "amber",
          duplicada: "amber", manual: "ink",
        };
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Total de exclusões" valor={br(excluidas)} nota={`saíram antes da esteira · ${categorias.length} categorias`} tom="red" aoClicar={() => abrirRecorte("todos")} />
            {categorias.map(({ k, n }) => <Kpi key={k}
              rotulo={GATILHO_ROTULO[k] || k}
              valor={br(n)}
              nota={GATILHO_NOTA[k] || NATUREZA[k] || "categoria registrada no gatilho"}
              tom={TOM[k] || "blue"}
              aoClicar={() => abrirRecorte(GATILHO_CHIP[k] || `g:${k}`)} />)}
            <Kpi rotulo="…das fora da janela, o corte cabe no serviço" valor={br(conta((r) => r.oc_contida_na_ss === "SIM"))} nota="pode ser o desligamento feito para trocar, não evento alheio" tom="amber" aoClicar={() => abrirRecorte("g_contida")} />
            <Kpi rotulo="Por presunção, não constatação" valor={br(conta((r) => r.exclusao_presumida === "SIM"))} nota="a equipe supôs a partir do que viu" tom="amber" aoClicar={() => abrirRecorte("presumida")} />
            <Kpi rotulo="Por regra que você pediu" valor={br(conta((r) => r.exclusao_pedida_pelo_dono === "SIM"))} nota="a categoria existe porque você mandou criar" tom="ink" aoClicar={() => abrirRecorte("suas_regras")} />
            <Kpi rotulo="Excluídas por você à mão" valor={br(porClasseNav("EXCLUIDO") + porClasseNav("FURTADO") + porClasseNav("PREVENTIVO"))} nota="martelo batido no navegador" tom="ink" aoClicar={() => abrirRecorte("manual")} />
          </section>
          {/* O mesmo analítico que a Interrupção tem: barra por categoria, clicável. Sem ele a
              aba respondia "quantas saíram" e não "por quê", que é a pergunta de quem audita.
              Danos a terceiro ficam separados de furto: um é acidente e vira ressarcimento, o
              outro é crime patrimonial e vai para projeto próprio. Somá-los apaga a diferença. */}
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Exclusões</span><h2>Motivo da saída</h2></div><small>clique para filtrar</small></div>
              {/* a barra filtra de verdade: cada rótulo volta ao gatilho que o gerou */}
              <Barras dados={contar(registros.filter((r) => arquivo(r) === "EXCLUÍDA").map((r) => ({ ...r, _g: GATILHO_ROTULO[categoriaDe(r)] || "Marcada por você" })), "_g", 40)} total={excluidas} aoSelecionar={(l) => {
                const chave = Object.entries(GATILHO_ROTULO).find(([, v]) => v === l)?.[0];
                setBusca(""); abrirRecorte(chave ? GATILHO_CHIP[chave] || `g:${chave}` : "manual");
              }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Exclusões</span><h2>Natureza do motivo</h2></div></div>
              <Barras dados={contar(registros.filter((r) => arquivo(r) === "EXCLUÍDA").map((r) => ({ ...r, _n: NATUREZA[categoriaDe(r)] || "Classificada por você" })), "_n", 12)} total={excluidas} /></article>
          </section>
          <section className="panel editorial-note wide destaque"><span>POR QUE ISTO NÃO É UMA PENEIRA</span>
            <p>Peneira pergunta se o caso se sustenta. Exclusão diz que o caso é de outra natureza — e isso não depende de haver interrupção na janela. Um furto é furto tenha ou não a Crítica registrado corte naquele dia; a ausência de fato não muda a causa declarada, e a presença também não. Enquanto a exclusão morava dentro da terceira peneira, só era julgado quem passasse da primeira: {br(conta((r) => arquivo(r) === "EXCLUÍDA" && r.fato === "F3"))} casos com causa declarada fora do indicador ficavam parados em “sem interrupção na janela”, aparecendo como pendência de leitura quando já tinham resposta.</p>
            <p>Duas categorias não falam de causa nenhuma, e é preciso lê-las como o que são: falta de documento, não veredito sobre o equipamento. <strong>Obra nunca gerada</strong> reúne {br(g("sem_obra"))} casos em que a obra não foi aberta e a SS já passou de 60 dias — sem obra não há consulta de material, e depois de dois meses ela não vem mais. Todos já estavam retidos por falta de prova; o que muda é parar de prometer uma resposta que o sistema não vai dar. Os que ainda estão dentro do prazo continuam retidos, porque neles a espera é legítima.</p>
            <p>A outra é: <strong>sem OS e sem obra</strong>. Ali a ordem de serviço não tem descrição e a obra nunca foi gerada — não há relato do executante para ler nem material para conferir. A interrupção pode até estar registrada, e em vários destes casos está; mas afirmar “queimado” a partir só do fato seria a leitura criando o que o campo não escreveu. Saem como investigáveis, não como falha comprovada.</p>
            <p>Nenhum registro é apagado. Cada linha traz o motivo da exclusão escrito, e o dossiê continua mostrando o que a esteira decidiu — inclusive nas {br(porClasseNav("EXCLUIDO"))} que saíram pelo seu martelo, e não por regra.</p>
          </section>
          <section className="panel editorial-note wide"><span>O MATERIAL NÃO DECIDE A CAUSA</span>
            <p>{br(conta((r) => arquivo(r) === "EXCLUÍDA" && (Number(r.trafos_material) || 0) > 0))} destas exclusões têm transformador movimentado na obra. Não é contradição: no furto instalaram um novo no lugar do que levaram, na desativação retiraram o que estava lá. O material prova que houve troca — não prova por quê.</p>
          </section>
        </>;
      }

      /* INSIGHT · TEMPOS. Também só olha. */
      if (modulo === "insight_tempos") {
        const naConta = registros.filter((r) => arquivo(r) === "SAÍDA");
        const duracoes = naConta.map((r) => tempos(r).duracaoSS).filter((d): d is number => d !== null && d >= 0).sort((a, b) => a - b);
        const p = (n: number) => (duracoes.length ? duracoes[Math.floor((duracoes.length - 1) * n)] : 0);
        /* Ordem dele: fora o tanto de card — UM gráfico de barras vermelho respondendo a
           pergunta desta aba. As quatro barras somam o total, e cada uma filtra a tabela. */
        const cx = { dentro: 0, antes: 0, depois: 0, sem: 0 };
        for (const r of naConta) cx[posNaCritica(r)] += 1;
        const BARRAS_TEMPOS: [string, number, string][] = [
          ["No intervalo correto — a SS nasceu com o cliente sem energia", cx.dentro, "ss_dentro"],
          ["Antes — a SS abriu antes de a interrupção começar", cx.antes, "ss_antes_oc"],
          ["Depois — a SS abriu depois de a interrupção terminar", cx.depois, "ss_depois_oc"],
          ["Não estão na Crítica — sem ocorrência para comparar", cx.sem, "ss_sem_oc"],
        ];
        return <>
          <section className="panel">
            <div className="panel-title"><div><span>A pergunta desta aba</span><h2>A abertura da SS contra o intervalo da ocorrência</h2></div><small>as quatro barras somam as {br(naConta.length)} · clique numa barra para filtrar a tabela</small></div>
            <Barras total={naConta.length} dados={BARRAS_TEMPOS.map(([label, value]) => ({ label, value }))}
              aoSelecionar={(label) => { const alvo = BARRAS_TEMPOS.find(([l]) => l === label); if (alvo) abrirRecorte(alvo[2]); }} />
            <p className="fonte-detalhe">Duração mediana da SS: {Math.round(p(0.5))} h · p10 {Math.round(p(0.1))} h · p90 {Math.round(p(0.9))} h. As outras leituras — ordem esperada, exatamente dentro, manobra, datas impossíveis — continuam nos filtros acima da tabela.</p>
          </section>
          <section className="panel"><div className="panel-title"><div><span>Como ler</span><h2>As três bases, uma embaixo da outra</h2></div><small>abra qualquer linha na aba Tempos do dossiê</small></div>
            <div className="tempos-exemplo">
              {(() => { const alvo = naConta.find((r) => tempos(r).invertida) || naConta[0];
                return alvo ? <><p className="fonte-detalhe">{texto(alvo.ss)} · trafo {texto(alvo.trafo)}</p><ReguaTempos r={alvo} tm={tmae[texto(alvo.ss)]} /></> : null; })()}
            </div>
            <p className="fonte-detalhe">As três dividem o mesmo começo e o mesmo fim. É isso que permite comparar: com escalas próprias, uma ocorrência de duas horas ficaria do mesmo tamanho de uma SS de duas semanas. Faixa vazia quer dizer que aquela base não tem registro para este caso — e isso está escrito ao lado, em vez de a faixa sumir.</p>
          </section>
          <section className="panel editorial-note wide"><span>A TEORIA DO CAMPO, TESTADA</span>
            <p><strong>O casamento que decide é o da SS com a Crítica, não o do atendimento.</strong> O TMAE é marcador: pode faltar sem prejuízo, e falta em 145 casos. Já a SS ter nascido com o cliente ainda sem energia é a prova de que o pedido e o apagão são o mesmo evento — e isso vale em <strong>{br(naConta.filter(ssDentroDaCritica).length)}</strong> das <strong>{br(naConta.length)}</strong>, sem tolerância nenhuma. Outras <strong>{br(naConta.filter(ssNaTolerancia).length)}</strong> entram pela tolerância da janela, e as <strong>{br(naConta.filter((r) => !ssDentroDaCritica(r) && !ssNaTolerancia(r)).length)}</strong> restantes entraram pela contenção ou pelo seu veredito — nenhuma por distração da régua.</p>
            <p>A ordem esperada é esta: a ocorrência da Crítica engloba tudo, a equipe do TMAE sai um pouco depois de ela abrir, e a SS nasce um pouco depois de a equipe sair. <strong>Ela se confirma em 896 casos.</strong> Da Crítica até a equipe sair, a mediana é de <strong>7,7 horas</strong>; daí até a SS nascer, <strong>2,6 horas</strong>.</p>
            <p>Isto só pôde ser medido depois de uma correção: os campos <strong>at_ini</strong> e <strong>at_fim</strong> do fluxo <strong>não são a hora da equipe</strong> — são a janela da ocorrência copiada, idêntica a ela em 1.039 das 1.160 com atendimento. Enquanto a régua azul usou esses campos, ela desenhava a barra da Crítica noutra cor, e dizer que o atendimento cabia dentro da ocorrência era quase tautologia. Agora a faixa azul é <em>quando a equipe saiu → quando concluiu</em>, com um traço branco marcando <em>quando ela chegou</em>, direto da base do TMAE.</p>
          </section>
          <section className="panel editorial-note wide"><span>O QUE ESTA ABA NÃO DIZ</span>
            <p>Nenhum destes recortes fala sobre a <strong>causa</strong> da falha. SS aberta por muito tempo não é caso mal decidido; atendimento antes da SS é o comportamento normal do campo — o cliente liga, a equipe vai, a solicitação nasce depois para formalizar.</p>
            <p>Os dois que merecem leitura são os de <strong>ordem impossível</strong>: SS encerrada antes de ser aberta, que é erro de data no cadastro, e atendimento que começa depois de a SS fechar, que costuma ser atendimento herdado de outro evento. Nos dois casos o número do indicador continua onde está — o que está errado é a data, não a decisão.</p>
          </section>
        </>;
      }

      /* INSIGHT · REINCIDÊNCIA. O mesmo ativo queimando de novo. Não move ninguém. */
      if (modulo === "insight_reincidencia") {
        const naConta = registros.filter((r) => arquivo(r) === "SAÍDA");
        const pares = naConta.filter((r) => reincDe(r)).map((r) => ({ r, x: reincDe(r)! }));
        const ativos = new Set(pares.map((p) => texto(p.r.trafo))).size;
        const dias = pares.map((p) => p.x.dias).sort((a, b) => a - b);
        const med = dias.length ? dias[Math.floor(dias.length / 2)] : 0;
        const causa = (r: Registro) => classificacao[texto(r.ss)]?.classe || texto(r.confirmado);
        const faixa = (a: number, b: number) => pares.filter((p) => p.x.dias >= a && p.x.dias <= b);
        const barra = (rotulo: string, a: number, b: number, recorte: string) => {
          const g = faixa(a, b);
          return { label: rotulo, recorte, total: g.length,
                   q: g.filter((p) => causa(p.r) === "QUEIMADO").length,
                   a: g.filter((p) => causa(p.r) === "AVARIADO").length };
        };
        const BARRAS = [
          barra("Até 7 dias — a rede não mudou nesse prazo", 0, 7, "rec_7"),
          barra("De 8 a 30 dias", 8, 30, "rec_30"),
          barra("De 31 a 90 dias", 31, 90, "rec_90"),
          barra("Mais de 90 dias", 91, 99999, "rec_mais"),
        ];
        return <>
          <section className="panel">
            <div className="panel-title"><div><span>O mesmo transformador, de novo</span><h2>{br(pares.length)} reincidências em {br(ativos)} transformadores</h2></div><small>mediana de {br(med)} dias entre uma troca e a seguinte</small></div>
            <BarrasCausa dados={BARRAS} aoSelecionar={(label) => { const alvo = BARRAS.find((x) => x.label === label); if (alvo) abrirRecorte(alvo.recorte); }} />
            <p className="fonte-detalhe">Cada linha é um par: a SS que reincidiu carrega quantos dias se passaram desde a troca anterior no mesmo código de ativo. Quem queimou três vezes gera dois pares — por isso {br(pares.length)} reincidências em {br(ativos)} ativos.</p>
          </section>
          <section className="panel"><div className="panel-title"><div><span>As mais rápidas</span><h2>Trocou e queimou de novo em poucos dias</h2></div><small>{br(faixa(0, 7).length)} em até uma semana</small></div>
            <div className="table-scroll"><table className="records-table">
              <thead><tr><th>Intervalo</th><th>Troca anterior</th><th>Reincidência</th><th>O que a Crítica gravou nas duas</th></tr></thead>
              <tbody>{pares.filter((p) => p.x.dias <= 30).sort((a, b) => a.x.dias - b.x.dias).map(({ r, x }) => <tr key={texto(r.ss)} onClick={() => { setAberto(r); setAbaDossie("consolidado"); }} style={{ cursor: "pointer" }}>
                <td><strong>{x.dias === 0 ? "mesmo dia" : `${br(x.dias)} dia${x.dias === 1 ? "" : "s"}`}</strong><span>trafo {texto(r.trafo)}</span><small>{x.ordem}ª de {x.total} trocas</small></td>
                <td><strong>{texto(x.anterior.ss)}</strong><span>{dataBR(x.anterior.abertura)}</span><small>{texto(x.anterior.obra) ? `obra ${texto(x.anterior.obra)}` : ""}</small></td>
                <td><strong>{texto(r.ss)}</strong><span>{dataBR(r.abertura)}</span><small>{texto(r.obra) ? `obra ${texto(r.obra)}` : ""}</small></td>
                <td><p className="clip">{texto(x.anterior.oc_sub) || "sem subcausa"} → {texto(r.oc_sub) || "sem subcausa"}</p></td>
              </tr>)}</tbody>
            </table></div>
            <p className="fonte-detalhe">Prazo curto tira a rede da conversa: em uma semana o clima não mudou, a carga não mudou e o vizinho não mudou. O que muda é o que foi instalado, como foi protegido e onde — e cada uma destas linhas é uma obra paga duas vezes no mesmo poste. Abra o caso para comparar potência, elo e aterramento entre as duas trocas.</p>
          </section>
        </>;
      }

      /* INSIGHT · ATERRAMENTO. O dado que estava parado no formulário da OS. Não move ninguém. */
      if (modulo === "insight_aterramento") {
        const naConta = registros.filter((r) => arquivo(r) === "SAÍDA");
        const q = (f: (r: Registro) => boolean) => naConta.filter(f).length;
        const ruins = naConta.filter((r) => ["acima", "grave"].includes(faixaTerra(r)));
        const semMelhoria = ruins.filter((r) => !fezMelhoria(r));
        const medidos = naConta.filter((r) => !["sem", "so_depois"].includes(faixaTerra(r)));
        const vs = medidos.map((r) => terraDe(r)!.pior as number).sort((a, b) => a - b);
        const p = (n: number) => (vs.length ? vs[Math.floor((vs.length - 1) * n)] : 0);
        const ohm = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Ω`;
        const COR_TERRA: Record<string, string> = { grave: "#a52a34", acima: "#8b6428", limite: "#35634b", bom: "#35634b", sem: "#8d9199", so_depois: "#8d9199" };
        const doMapa = listadas.filter((r) => arquivo(r) === "SAÍDA");
        const pontosTerra: PontoAtivo[] = doMapa
          .filter((r) => typeof r.lat === "number" && typeof r.lon === "number")
          .map((r) => {
            const a = terraDe(r); const v = piorTerra(r);
            const leituras = (terraQuando === "antes" ? a?.antes : a?.depois) || [];
            return {
              ss: texto(r.ss), trafo: texto(r.trafo), lat: Number(r.lat), lon: Number(r.lon),
              localidade: texto(r.localidade), decisao: texto(r.decisao), cascata: texto(r.cascata),
              categoria: texto(r.categoria_texto), abertura: dataBR(r.abertura),
              cor: COR_TERRA[faixaTerra(r)] || "#8d9199",
              nota: `${v != null ? `<b>${ohm(v)}</b> — pior das hastes` : "sem medição neste momento"}`
                + (leituras.length ? `<br/>${leituras.map((x, i) => `X${i + 1} ${ohm(x)}`).join(" · ")}` : "")
                + `<br/><i>${fezMelhoria(r) ? "fez melhoria de aterramento" : "sem melhoria"}</i>`,
            };
          });
        const semCoordTerra = doMapa.length - pontosTerra.length;
        /* Pedido dele: a barra grossa partida entre queimado e avariado. A causa é a que a
           tela mostra — o martelo dele vence o que a régua tinha escrito. */
        const causa = (r: Registro) => classificacao[texto(r.ss)]?.classe || texto(r.confirmado);
        const faixa = (id: string) => naConta.filter((r) => faixaTerra(r) === id);
        const barra = (rotulo: string, id: string, recorte: string) => {
          const g = faixa(id);
          return { label: rotulo, recorte, total: g.length,
                   q: g.filter((r) => causa(r) === "QUEIMADO").length,
                   a: g.filter((r) => causa(r) === "AVARIADO").length };
        };
        const BARRAS = [
          barra("Grave — acima de 100 Ω", "grave", "terra_grave"),
          barra("Acima da norma — 25 a 100 Ω", "acima", "terra_acima"),
          barra("No limite — 10 a 25 Ω", "limite", "terra_limite"),
          barra("Bom — até 10 Ω", "bom", "terra_bom"),
          barra(OUTRO_MOMENTO, "so_depois", "terra_so_depois"),
          barra("Não preenchido — vazio ou zero", "sem", "terra_sem"),
        ];
        return <>
          <section className="panel">
            <div className="panel-title"><div><span>A pior das três hastes · medição {terraQuando === "antes" ? "ANTES" : "DEPOIS"} do serviço</span><h2>{terraQuando === "antes"
              ? `${br(semMelhoria.length)} queimaram sobre aterramento fora da norma — e ninguém consertou`
              : `${br(ruins.length)} continuaram acima da norma DEPOIS do serviço`}</h2></div><small>de {br(ruins.length)} acima de 25 Ω · {br(medidos.length)} com medição anterior · {br(naConta.length)} no total</small></div>
            <div className="terra-toggle" role="group" aria-label="momento da medição">
              {(["antes", "depois"] as const).map((k) => <button key={k} type="button"
                className={terraQuando === k ? "ativo" : ""} onClick={() => { setTerraQuando(k); setRecorte(null); }}
                title={k === "antes" ? "A medição feita ANTES do serviço: o estado em que o transformador queimou." : "A medição feita DEPOIS do serviço: o ponto já mexido pela equipe."}>
                {k === "antes" ? "medição ANTES do serviço" : "medição DEPOIS do serviço"}</button>)}
              <span>{terraQuando === "antes"
                ? "o estado em que o transformador queimou"
                : "o ponto já mexido — serve para ver o que a melhoria mudou"}</span>
            </div>
            <BarrasCausa dados={BARRAS}
              aoSelecionar={(label) => { const alvo = BARRAS.find((x) => x.label === label); if (alvo) abrirRecorte(alvo.recorte); }} />
            <p className="fonte-detalhe">A equipe mede três hastes no poste e escreve no formulário da OS, antes e depois do serviço. Vale a <strong>pior</strong> das três e a <strong>de antes</strong>: a corrente de descarga procura o pior caminho, e a medição posterior já é o ponto consertado. Mediana {ohm(p(0.5))} · p90 {ohm(p(0.9))} · máxima {ohm(p(1))}. {terraQuando === "depois" ? "Você está vendo o ponto DEPOIS do serviço: o que continua alto aqui é o que a equipe deixou como estava." : ""}</p>
          </section>
          {/* O MAPA, LOGO ABAIXO DO GRÁFICO. Ele segue o filtro: clicar numa barra recorta a
              tabela E o mapa juntos, e a cor de cada ponto é a faixa de resistência daquele
              caso, não a decisão da esteira. Pedido dele. */}
          <section className="panel">
            <div className="panel-title"><div><span>Onde estão</span><h2>{br(pontosTerra.length)} no mapa{recorteAtivo ? ` · ${recorteAtivo.rotulo.toLowerCase()}` : ""}</h2></div><small>clique numa barra do gráfico para recortar · clique num ponto para abrir o dossiê</small></div>
            <MapaAtivos pontos={pontosTerra} aoEscolher={(ss) => {
              const achado = registros.find((r) => texto(r.ss) === ss);
              if (achado) { setAberto(achado); setAbaDossie("consolidado"); setMotivosAbertos(false); }
            }} />
            <p className="fonte-detalhe"><em className="leg-terra grave" /> acima de 100 Ω · <em className="leg-terra alto" /> 25 a 100 Ω · <em className="leg-terra ok" /> até 25 Ω · <em className="leg-terra sem" /> sem medição neste momento. A coordenada é a do próprio transformador, não a do centro do município. {br(semCoordTerra)} dos casos deste recorte não têm coordenada e por isso não aparecem.</p>
          </section>
          <section className="panel editorial-note wide"><span>O QUE ISTO DIZ, E O QUE NÃO DIZ</span>
            <p><strong>Quase um em cada três transformadores que queimaram estava sobre aterramento acima do limite da norma</strong> — {br(ruins.length)} dos {br(medidos.length)} com medição anterior ao serviço, sendo {br(q((r) => faixaTerra(r) === "grave"))} acima de 100 Ω, o pior deles com {ohm(p(1))}. A distribuidora <strong>mediu isso na hora da troca</strong>, escreveu o número, e em <strong>{br(semMelhoria.length)} deles respondeu NÃO à pergunta “fez melhoria de aterramento”</strong>. O transformador novo foi instalado no mesmo ponto, com o mesmo aterramento.</p>
            <p>O que <strong>não</strong> dá para dizer: que o aterramento ruim explica a queima por raio. Cruzei, e ele não separa — entre os queimados por descarga atmosférica, 33% estão acima de 25 Ω; entre as demais causas, 32%. Quem apresentar isso como causa provada vai ser desmentido na primeira pergunta. O achado é de <strong>manutenção</strong>, não de causalidade: existe um cadastro de pontos ruins, medido pela própria equipe, e ele não virou serviço.</p>
            <p><strong>São três medições, e elas são de pontos diferentes.</strong> As colunas X1, X2 e X3 do formulário não são a mesma leitura repetida: em apenas 7% dos casos as três vêm iguais, e a razão entre a maior e a menor tem mediana de 1,3× — mas chega a 405× em casos como 1.448 Ω numa haste e 1,2 Ω noutra. Por isso a régua usa a <strong>pior</strong>: aterramento é caminho, e o pior caminho é o que define o que sobra para o equipamento. Se a régua usasse a média, os fora da norma cairiam de 228 para 185; se usasse a melhor das três, para 153. A escolha é conservadora de propósito, e está dita aqui para quem quiser refazer a conta.</p>
            <p><strong>E o que aconteceu com os ruins depois do serviço.</strong> Dos {br(228)} que estavam acima de 25 Ω antes, {br(193)} têm medição posterior: <strong>165 continuaram acima</strong> — 159 deles queimados — e só <strong>28 caíram para dentro da norma</strong>. Os outros 35 não foram medidos de novo. É a mesma história por outro ângulo: a equipe volta ao poste, mede, e o ponto continua como estava.</p>
            <p><strong>A medição que vale é a de ANTES do serviço</strong>, e é dele a correção. A de depois descreve o ponto já mexido: usá-la seria apresentar o conserto como se fosse a condição que matou o equipamento. Por isso {br(q((r) => faixaTerra(r) === "so_depois"))} solicitações que só trazem o número posterior ficam em faixa própria, fora das cinco. Entre as que têm as duas medições, {br(naConta.filter((r) => { const a = terraDe(r); return Boolean(a?.antes.length && a?.depois.length && Math.max(...a.antes) === Math.max(...a.depois)); }).length)} repetem o mesmo número nos dois campos — a equipe copiou, o que é coerente com não ter feito melhoria.</p>
            <p><strong>Zero não é medição.</strong> {br(q((r) => faixaTerra(r) === "sem"))} solicitações vieram com as três hastes vazias ou zeradas, e elas contam aqui como <em>não preenchido</em> — nunca como bom. Resistência zero não existe num aterramento de distribuição: é campo em branco lançado como zero, e somá-lo ao grupo bom empurraria a mediana para baixo e diria que o parque está bem aterrado quando ninguém mediu.</p>
            <p>Onde a melhoria foi feita, ela aparece: em <strong>{br(q((r) => { const a = terraDe(r); return Boolean(a?.pior && a?.pior_depois && a.pior_depois < a.pior); }))}</strong> casos a medição de depois é menor que a de antes — há quedas de 6.105 Ω para 967 Ω. O formulário serve; o que falta é a ordem de serviço depois dele.</p>
          </section>
        </>;
      }

      /* INSIGHT · REVISÃO DETALHADA. A fila de leitura dele. Não move ninguém. */
      if (modulo === "insight_revisao") {
        const naConta = registros.filter((r) => arquivo(r) === "SAÍDA");
        const fila = naConta.map((r) => ({ r, motivos: paraRever(r) })).filter((x) => x.motivos.length);
        const doCarga = fila.filter((x) => x.motivos.some((m) => m.id === "carga"));
        const doTerceiro = fila.filter((x) => x.motivos.some((m) => m.id === "terceiro"))
          .sort((a, b) => (terceiroDe(b.r)?.n || 0) - (terceiroDe(a.r)?.n || 0));
        const comAlgumaFonte = naConta.filter((r) => terceiroDe(r)).length;
        /* Só o bloco do tap, por ordem dele. As barras são as MARCAS que cada caso trouxe —
           tap, defeito interno, sobrecarga, tensão —, e não os motivos da fila inteira. */
        const marca = (p: RegExp) => doCarga.filter(({ r }) => p.test(`${texto(r.desc_ss)} ${texto(r.desc_os)}`)).length;
        const BARRAS: [string, number, string][] = ([
          ["Tap com defeito ou comutador", marca(TXT_TAP), "rev_carga"],
          ["Defeito interno declarado pela equipe", marca(TXT_INTERNO), "rev_carga"],
          ["Sobrecarga escrita no texto", marca(TXT_CARGA), "rev_carga"],
          ["Tensão fora do normal", marca(TXT_TENSAO), "rev_carga"],
        ] as [string, number, string][]).filter(([, v]) => v > 0);
        return <>
          <section className="panel"><div className="panel-title"><div><span>Furto, abalroamento e dano de terceiro</span><h2>{br(doTerceiro.length)} casos com três ou mais campos confirmando</h2></div><small>{br(comAlgumaFonte)} têm pelo menos um campo · ordenados por quantas fontes batem</small></div>
            <div className="table-scroll"><table className="records-table">
              <thead><tr><th>Solicitação</th><th>Fontes que confirmam</th><th>Campo a campo</th></tr></thead>
              <tbody>{doTerceiro.map(({ r }) => { const ter = terceiroDe(r); return <tr key={texto(r.ss)} onClick={() => { setAberto(r); setAbaDossie("tempos"); }} style={{ cursor: "pointer" }}>
                <td><strong>{texto(r.ss)}</strong><span>trafo {texto(r.trafo)}</span><small>hoje conta como {texto(r.confirmado).toLowerCase() || "—"}</small></td>
                <td><b className="pill bad">{ter?.n} campos</b><span>Crítica diz: {texto(r.oc_sub).toLowerCase() || "—"}</span></td>
                <td>{(ter?.fontes || []).map((f, i) => <p key={i} className="rev-motivo"><b>{f.campo}:</b> {f.valor}</p>)}</td>
              </tr>; })}</tbody>
            </table></div>
            <p className="fonte-detalhe">Uma fonte sozinha não condena — o formulário da equipe pode ter sido preenchido no chute, e o carimbo da obra é escolha contábil feita depois da execução. Por isso a lista mostra só quem tem três ou mais campos independentes dizendo o mesmo; dentro dos 1.305 há {br(comAlgumaFonte)} com pelo menos um. <strong>Furto é motivo de exclusão</strong> do indicador e <strong>dano de terceiro abre discussão de ressarcimento</strong> — nenhum deles foi movido aqui: o martelo é seu. Abrindo o caso, os campos aparecem no topo do dossiê, antes das réguas de tempo.</p>
          </section>
          <section className="panel">
            <div className="panel-title"><div><span>A fila que eu montei</span><h2>{br(doCarga.length)} solicitações pedem uma segunda leitura sua</h2></div><small>de {br(naConta.length)} · o que o campo escreveu e a Crítica não gravou</small></div>
            <Barras total={doCarga.length} dados={BARRAS.map(([label, value]) => ({ label, value }))} />
            <p className="fonte-detalhe">Um caso pode trazer mais de uma marca — a DG-RD-PO 00422 traz três. Nenhum deles foi movido: o indicador continua em {br(naConta.length)}, e o martelo é seu, na aba de classificação.</p>
          </section>
          <section className="panel"><div className="panel-title"><div><span>O que abriu esta aba</span><h2>Texto de campo × subcausa da Crítica</h2></div><small>{br(doCarga.length)} caso{doCarga.length > 1 ? "s" : ""}</small></div>
            <div className="table-scroll"><table className="records-table">
              <thead><tr><th>Solicitação</th><th>A Crítica gravou</th><th>O que quem esteve no poste escreveu</th></tr></thead>
              <tbody>{doCarga.map(({ r, motivos }) => <tr key={texto(r.ss)} onClick={() => { setAberto(r); setAbaDossie("consolidado"); }} style={{ cursor: "pointer" }}>
                <td><strong>{texto(r.ss)}</strong><span>trafo {texto(r.trafo)}</span><small>hoje conta como {texto(r.confirmado).toLowerCase() || "—"}</small></td>
                <td><strong>{texto(r.oc_sub) || "sem subcausa"}</strong><span>{texto(r.oc_causa)}</span></td>
                <td><p className="clip">{motivos.find((m) => m.id === "carga")?.detalhe || texto(r.desc_ss).slice(0, 160)}</p></td>
              </tr>)}</tbody>
            </table></div>
            <p className="fonte-detalhe">A leitura que ele fez na DG-RD-PO 00422/2026 — <em>“defeito interno e tap submerso deveria ir para sobrecarga”</em> — vale para todo este bloco: a Crítica gravou a causa do desligamento, e o texto descreve o defeito que a equipe encontrou. A palavra “tap” sozinha não entra: ela aparece como campo de formulário da OS (<em>POS. DO TAP; 3º</em>) em 588 das 1.305, e só conta quando vem com defeito — submerso, queimado, danificado.</p>
          </section>
        </>;
      }

      /* INSIGHT · QUEM DIVIDE A MESMA INTERRUPÇÃO. Também só olha. */
      if (modulo === "insight_divide") {
        const naConta = registros.filter((r) => arquivo(r) === "SAÍDA");
        const comOc = naConta.filter((r) => parceirasOc(r).length > 0);
        const comAt = naConta.filter((r) => parceirasAt(r).length > 0);
        const gruposOc = [...divideIndice.oc.values()].filter((v) => v.length > 1);
        const gruposAt = [...divideIndice.at.values()].filter((v) => v.length > 1);
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Dividem a ocorrência" valor={br(comOc.length)} nota={`${br(gruposOc.length)} ocorrência(s) com mais de uma SS`} tom="red" aoClicar={() => abrirRecorte("divide_oc")} />
            <Kpi rotulo="Dividem o atendimento" valor={br(comAt.length)} nota={`${br(gruposAt.length)} atendimento(s) do TMAE em mais de uma SS`} tom="amber" aoClicar={() => abrirRecorte("divide_at")} />
            <Kpi rotulo="Qualquer um dos dois" valor={br(naConta.filter((r) => parceirasOc(r).length > 0 || parceirasAt(r).length > 0).length)} nota="a lista de conferência inteira" tom="ink" aoClicar={() => abrirRecorte("divide_qualquer")} />
            <Kpi rotulo="Evento exclusivo" valor={br(naConta.filter((r) => parceirasOc(r).length === 0 && parceirasAt(r).length === 0).length)} nota="ocorrência e atendimento só desta SS" tom="green" aoClicar={() => abrirRecorte("exclusivas")} />
          </section>
          <section className="panel editorial-note wide"><span>COMO LER OS DOIS RECORTES</span>
            <p><strong>Ocorrência dividida é a suspeita forte.</strong> A interrupção prova uma troca, não duas: se duas SS carregam o mesmo número de ocorrência, uma delas está apoiada em evento que não é dela. A porta já exclui isso quando o evento e o transformador coincidem — a SS duplicada —, então o que aparece aqui é o que entrou por outra via, inclusive pelo martelo.</p>
            <p><strong>Atendimento dividido é herança, não fraude.</strong> O deslocamento é marcador e não retém ninguém. Mas o mesmo atendimento em duas SS significa que pelo menos uma exibe no dossiê uma ida ao poste que não é a sua — em geral porque o ativo reincidiu e o TMAE casou pelo elemento. Serve para não citar o atendimento errado numa reunião.</p>
            <p>Cada linha mostra o número dividido e com quem. O par abre pelo dossiê, como sempre.</p>
          </section>
        </>;
      }

      /* INSIGHT · MATERIAL × TRANSFORMADOR. Também só olha. */
      if (modulo === "insight_material") {
        const naConta = registros.filter((r) => arquivo(r) === "SAÍDA");
        const cnt = (e: string) => naConta.filter((r) => estadoMaterial(r) === e).length;
        const trocaTipo = naConta.filter((r) => materialDa(r)?.troca_tipo).length;
        const obrasComSS = [...ssPorObra.entries()];
        const compartilhadas = obrasComSS.filter(([, n]) => n > 1).length;
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Mais SS que transformadores" valor={br(cnt("mais_ss"))} nota="a mesma peça não comprova duas trocas" tom="red" aoClicar={() => abrirRecorte("mais_ss")} />
            <Kpi rotulo="Mais transformadores que SS" valor={br(cnt("mais_trafos"))} nota="sobrou peça — para onde ela foi?" tom="amber" aoClicar={() => abrirRecorte("mais_trafos")} />
            <Kpi rotulo="Obra sem transformador" valor={br(cnt("sem_trafo"))} nota="está no export e nada saiu" tom="red" aoClicar={() => abrirRecorte("sem_trafo")} />
            <Kpi rotulo="Trocou o tipo" valor={br(trocaTipo)} nota="previu OMI e executou OVI, mesma potência" tom="ink" aoClicar={() => abrirRecorte("troca_tipo")} />
            <Kpi rotulo="Fora do export" valor={br(cnt("fora_export"))} nota="falta a extração, não o material" tom="ink" aoClicar={() => abrirRecorte("fora_export")} />
            <Kpi rotulo="Bate" valor={br(cnt("bate"))} nota="uma SS, um transformador" tom="green" aoClicar={() => abrirRecorte("bate")} />
          </section>
          <section className="panel editorial-note wide"><span>DUAS ARMADILHAS DESTA BASE, E EU CAÍ NAS DUAS</span>
            <p><strong>O ZIP tem dois exports, não um.</strong> São complementares — 192 obras num, 1.257 no outro — e exatamente <strong>uma</strong> obra aparece nos dois, com as mesmas 16 linhas. Ler os dois em sequência sem deduplicar dobra o material dessa obra, e foi assim que eu vi “dois transformadores” onde há um.</p>
            <p><strong>Linha de transformador não é transformador.</strong> Em {br(trocaTipo)} solicitações existem duas linhas para a mesma troca: a prevista, com realizado zero, e a que saiu. É substituição de tipo — sai OMI, de óleo mineral, do plano, e entra OVI, de óleo vegetal, na execução, mesma potência. Contar linhas dá dois; contar quantidade realizada dá um, que é o certo.</p>
            <p>Hoje <strong>{br(compartilhadas)}</strong> obra atende mais de uma SS dentro dos queimados e avariados, e <strong>nenhuma</strong> obra do recorte pagou mais de um transformador.</p>
          </section>
        </>;
      }

      /* INSIGHT · GARANTIA. Também só olha. A pergunta é uma: quanto tempo o transformador que
         queimou tinha de fabricado. A resposta vem da COLETA, e o cuidado todo está em não
         contar data suja como vida curta. */
      if (modulo === "insight_garantia") {
        const naConta = registros.filter((r) => arquivo(r) === "SAÍDA");
        const ficha = (r: Registro) => coleta[texto(r.ss)];
        const comData = naConta.filter((r) => ficha(r)?.dias != null);
        const menos = comData.filter((r) => (ficha(r) as ColetaItem).dias! < 365);
        const umDois = comData.filter((r) => { const d = (ficha(r) as ColetaItem).dias!; return d >= 365 && d < 730; });
        const suja = naConta.filter((r) => Boolean(ficha(r)?.suja));
        const semFicha = naConta.filter((r) => !ficha(r));
        const porFab = contar(menos.map((r) => ({ ...r, _f: ficha(r)!.fabricante || "sem fabricante" })), "_f", 8);
        const maisNovo = menos.length ? menos.reduce((a, b) => ((ficha(a) as ColetaItem).dias! <= (ficha(b) as ColetaItem).dias! ? a : b)) : null;
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Menos de um ano" valor={br(menos.length)} nota={`de ${br(comData.length)} com data de fabricação confiável`} tom="red" aoClicar={() => abrirRecorte("menos_ano")} />
            <Kpi rotulo="Entre um e dois anos" valor={br(umDois.length)} nota="entram se o prazo do contrato for de 24 meses" tom="amber" aoClicar={() => abrirRecorte("um_dois")} />
            <Kpi rotulo="O mais novo" valor={maisNovo ? `${br((ficha(maisNovo) as ColetaItem).dias!)} d` : "—"} nota={maisNovo ? `${texto(maisNovo.ss)} · ${ficha(maisNovo)!.fabricante}` : "sem casos"} tom="ink" aoClicar={() => abrirRecorte("menos_ano")} />
            <Kpi rotulo="Data não confiável" valor={br(suja.length)} nota="a fabricação foi sobrescrita pela coleta ou pela reforma" tom="ink" aoClicar={() => abrirRecorte("suja")} />
            <Kpi rotulo="Sem ficha na COLETA" valor={br(semFicha.length)} nota="não há série, tombamento nem data para perguntar" tom="ink" aoClicar={() => abrirRecorte("sem_coleta")} />
          </section>
          {porFab.length ? <section className="panel"><div className="panel-title"><div><span>Quem fabricou</span><h2>Os que falharam com menos de um ano, por fabricante</h2></div><small>clique para filtrar</small></div>
            <Barras dados={porFab} total={menos.length} aoSelecionar={(l) => { setBusca(""); abrirRecorte(`fab:${l}`); }} /></section> : null}
          <section className="panel warning-note wide"><strong>O que esta aba não responde</strong>
            <p>· O prazo de garantia não está em nenhuma das bases. Nenhuma coluna de contrato, fornecedor ou nota fiscal existe aqui — a NBR 5440 é especificação técnica e não fixa prazo; quem fixa é o contrato de fornecimento, e a praxe de mercado é de 12 a 24 meses.</p>
            <p>· O prazo quase nunca conta da fabricação: conta da <strong>entrega</strong> ou da <strong>energização</strong>. Nenhuma dessas duas datas existe nas nossas bases — a COLETA descreve a retirada, não a instalação. Um transformador fabricado em fevereiro pode ter sido energizado só em novembro.</p>
            <p>· Para virar pleito, falta o dado de entrada do almoxarifado por número de série. A série do retirado está em cada linha desta lista, e é por ela que a nota fiscal é encontrada.</p>
          </section>
        </>;
      }

      /* INSIGHT · VALOR × POTÊNCIA ESCRITA NA SS. Aba de olhar, não de mexer: nenhum caso muda
         de lugar, de categoria ou de conta por causa dela. Tudo aqui é contado na hora, do
         mesmo conjunto de queimados e avariados que a aba ao lado mostra. */
      if (modulo === "insight_valor") {
        const naConta = registros.filter((r) => arquivo(r) === "SAÍDA");
        const acima = naConta.filter((r) => foraDaFaixa(r) === "acima");
        const abaixo = naConta.filter((r) => foraDaFaixa(r) === "abaixo");
        const borda = naConta.filter((r) => foraDaFaixa(r) === "borda");
        const dentro = naConta.filter((r) => foraDaFaixa(r) === "");
        const cego = naConta.filter((r) => foraDaFaixa(r) === null);
        const julgados = acima.length + abaixo.length + borda.length + dentro.length;
        const dinheiro = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
        const porKva = contar([...acima, ...abaixo].map((r) => ({ ...r, _k: `${String(potenciaDoCaso(r).kva).replace(".", ",")} kVA` })), "_k", 12);
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Fora da faixa" valor={br(acima.length + abaixo.length)} nota={`passam da cerca por R$ ${br(margem)} ou mais, de ${br(julgados)} julgáveis`} tom="amber" aoClicar={() => abrirRecorte("fora")} />
            <Kpi rotulo="Acima do praticado" valor={br(acima.length)} nota="passam da cerca superior da potência instalada" tom="red" aoClicar={() => abrirRecorte("acima")} />
            <Kpi rotulo="Abaixo do praticado" valor={br(abaixo.length)} nota="ficam abaixo da cerca — a obra comprova menos do que a troca custaria" tom="blue" aoClicar={() => abrirRecorte("abaixo")} />
            <Kpi rotulo="Na borda" valor={br(borda.length)} nota={`passam da cerca sem chegar aos R$ ${br(margem)} de margem`} tom="ink" aoClicar={() => abrirRecorte("borda")} />
            <Kpi rotulo="Dentro da faixa" valor={br(dentro.length)} nota="o valor cabe no que se pratica para aquela potência" tom="green" aoClicar={() => abrirRecorte("dentro")} />
            <Kpi rotulo="A régua não julga" valor={br(cego.length)} nota="nem a OS nem a SS dizem a potência, ou falta valor na obra" tom="ink" aoClicar={() => abrirRecorte("nao_julgavel")} />
          </section>
          <section className="panel"><div className="panel-title"><div><span>A margem</span><h2>Quanto a diferença precisa ser para virar achado</h2></div><small>arraste — de 250 em 250</small></div>
            <div className="regua-margem">
              <input type="range" min={0} max={1500} step={250} value={margem}
                aria-label="margem em reais"
                onChange={(e) => setMargem(Number(e.target.value))} />
              <div className="regua-marcas">{[0, 250, 500, 750, 1000, 1250, 1500].map((m) => {
                const n = naConta.filter((r) => distanciaDaFaixa(r) >= m && distanciaDaFaixa(r) > 0).length;
                return <button key={m} type="button" className={margem === m ? "ativo" : ""} onClick={() => setMargem(m)}>
                  <b>{m === 0 ? "sem margem" : br(m)}</b><small>{br(n)}</small></button>;
              })}</div>
              <p className="regua-leitura">
                Margem de <strong>R$ {br(margem)}</strong> — <strong>{br(acima.length + abaixo.length)}</strong> achados:
                {" "}<em className="para-cima">{br(acima.length)} para cima</em> e <em className="para-baixo">{br(abaixo.length)} para baixo</em>.
                {" "}Outros <strong>{br(borda.length)}</strong> passam da cerca sem chegar à margem.
              </p>
            </div>
            <p className="fonte-detalhe">Arrastar muda a conta na hora e não muda o dado: quem sai da lista de achados vai para “na borda”, e a soma continua fechando {br(naConta.length)}. Em zero a régua devolve tudo que passa da cerca; apertando, sobra só o que se defende em voz alta. O gráfico e a tabela abaixo acompanham.</p>
          </section>
          {porKva.length ? <section className="panel"><div className="panel-title"><div><span>Onde estão os achados</span><h2>Por potência instalada</h2></div><small>clique numa barra para ver a lista</small></div>
            <Barras dados={porKva} total={acima.length + abaixo.length} aoSelecionar={(l) => { setBusca(""); abrirRecorte(`kva:${l.replace(",", ".").replace(" kVA", "")}`); }} />
          </section> : null}
          <section className="panel"><div className="panel-title"><div><span>A régua</span><h2>A faixa do praticado, potência por potência</h2></div><small>tirada destas mesmas solicitações</small></div>
            <div className="table-scroll"><table className="records-table">
              <thead><tr><th>Potência instalada</th><th>Solicitações</th><th>Faixa normal (cerca de Tukey)</th><th>Mediana</th><th>Fora da faixa</th></tr></thead>
              <tbody>
                {[...faixaValor.entries()].sort((a, b) => a[0] - b[0]).map(([k, f]) => {
                  const fora = naConta.filter((r) => potenciaDoCaso(r).kva === k && (foraDaFaixa(r) === "acima" || foraDaFaixa(r) === "abaixo")).length;
                  return <tr key={k}>
                    <td><strong>{String(k).replace(".", ",")} kVA</strong></td>
                    <td>{br(f.n)}</td>
                    <td>{dinheiro(f.p10)} a {dinheiro(f.p90)}</td>
                    <td>{dinheiro(f.p50)}</td>
                    <td>{fora ? br(fora) : "—"}</td>
                  </tr>;
                })}
              </tbody>
            </table></div>
            <p className="fonte-detalhe">Nenhum número desta tabela é digitado. A faixa de cada potência sai das próprias solicitações que contam, e muda sozinha quando o conjunto muda. A faixa é a cerca de Tukey: quartis mais uma vez e meia a amplitude interquartil. Ela não tem cota — numa potência em que todo mundo custa parecido, ela não marca ninguém. Potência com menos de oito casos não forma faixa, e quem cai nelas vai para “a régua não julga”, não para a lista de achados.</p>
          </section>
          <section className="panel editorial-note wide"><span>POR QUE PELO TEXTO E NÃO PELO CAMPO</span>
            <p>A base traz três campos numéricos de potência para o mesmo transformador, e eles brigam: <strong>POTENCIA_RET</strong> e <strong>POT_RET</strong> discordam em 222 das que contam. Já o texto é escrito por quem esteve no poste.</p>
            <p>A ordem de leitura é esta, e ela importa: <strong>1.</strong> o trafo INSTALADO nomeado na OS — <em>“TRANSFORMADOR INSTALADO: 15 KVA”</em> —, que é o que a obra pagou; <strong>2.</strong> a potência única citada na OS; <strong>3.</strong> a SS, só quando a OS não disser nada. Cada linha mostra de qual das três veio.</p>
            <p>O instalado é o certo para comparar com dinheiro: numa troca com aumento de potência, o que saiu e o que entrou são diferentes, e a SS descreve o que a equipe encontrou — o retirado. Ler só a SS deixava 401 casos sem julgamento; lendo a OS primeiro, sobram menos de metade disso.</p>
            <p>Passar da cerca por pouco não vira achado: a diferença precisa ser de <strong>R$ {br(margem)} ou mais</strong> para a linha entrar. Sem margem nenhuma seriam {br(acima.length + abaixo.length + borda.length)} casos, a maioria passando por algumas centenas de reais — ruído de arredondamento de obra, que afoga as que importam. Os que ficam entre a cerca e a margem estão no recorte “na borda”, não sumiram.</p>
            <p>E o que sai daqui é <strong>achado, não veredito</strong>. Valor acima da faixa costuma ser obra que cobriu mais de uma troca ou que instalou potência maior que a do texto; valor abaixo costuma ser obra que não apropriou o custo inteiro. Nenhum dos dois, sozinho, prova erro — os dois merecem uma olhada.</p>
          </section>
        </>;
      }
      if (modulo === "preventivos") {
        const candidatos = conta((r) => r.sob_suspeita === "SIM" && arquivo(r) === "SAÍDA");
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Preventivos" valor={br(preventivos)} nota="troca sem defeito" tom="blue" aoClicar={() => abrirRecorte("todos")} />
            <Kpi rotulo="Pela regra" valor={br(conta((r) => texto(r.expurgo_gatilho) === "preventivo" || texto(r.expurgo_gatilho) === "divisao"))} nota="o texto declarou preventivo ou divisão de circuito" tom="ink" aoClicar={() => abrirRecorte("regra")} />
            <Kpi rotulo="Marcados por você" valor={br(porClasseNav("PREVENTIVO"))} nota="martelo batido à mão" tom="ink" aoClicar={() => abrirRecorte("manual")} />
            <Kpi rotulo="Candidatos no indicador" valor={br(candidatos)} nota="sinal de troca programada, ainda dentro da conta" tom="amber" aoClicar={() => abrirRecorte("susp")} />
          </section>
          <section className="panel editorial-note wide"><span>O QUE É PREVENTIVO AQUI</span>
            <p>Preventivo é troca sem defeito: o transformador foi substituído por decisão de operação, não porque falhou. Entram por regra os que declaram <strong>divisão de circuito</strong> — obra de capacidade — e os gravados como preventivo na própria SS.</p>
            <p>A linha dos <strong>candidatos</strong> é outra coisa, e é preciso não confundir: são {br(candidatos)} casos que continuam contando no indicador. O texto deles traz sinal de troca programada — sobrecarga, plano de medida, remanejamento, pedido de potência específica — mas sinal não é veredito. Sobrecarga, por exemplo, é causa legítima de queima: a própria Crítica tem a subcausa “queimado por sobrecarga”. Estão aqui para serem lidos, não para serem tirados.</p>
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
          <button type="button" className={!recorte ? "ativo" : ""} onClick={() => setRecorte(null)} title="Sai do recorte desta aba e mostra tudo que esta aba cobre.">{modulo === "profunda" ? "Tudo que classifiquei" : "Todas as SS"} ({br(modulo === "profunda" ? Object.keys(classificacao).length : comJanela.length)})</button>
          {recortesDoModulo.map((x) => <button key={x.id} type="button" className={recorte?.id === x.id ? "ativo" : ""}
            onClick={() => abrirRecorte(x.id)} title={x.nota}>{x.rotulo} ({br(modulo === "profunda"
              ? comJanela.filter((r) => filtraProfunda(r, x.id) && x.teste(r)).length
              : registros.filter(x.teste).length)})</button>)}
        </div> : null}
        {recorteAtivo ? <p className="fluxo-nota">{recorteAtivo.nota}</p>
          : recorte?.id.startsWith("matriz-") ? <p className="fluxo-nota">Célula da matriz: {recorte.rotulo}.</p> : null}
        {listadas.length
          ? <Tabela classificacoes={classificacao} aoClassificar={classificar} coleta={coleta} potenciaDe={potenciaDoCaso} distanciaDe={distanciaDaFaixa} ladoDe={foraDaFaixa} materialDe={materialDa} ssNaObraDe={(r) => ssPorObra.get(obraDe(r)) || 1} estadoDe={estadoMaterial} parceirasOcDe={parceirasOc} parceirasAtDe={parceirasAt} tmaeDe={(r) => tmae[texto(r.ss)]} revisaoDe={paraRever} terraDe={terraDe} reincDe2={reincDe} terraQuando={terraQuando} linhas={listadas.slice(0, CAP)} modo={modulo} aoAbrir={(r) => { setAberto(r); setAbaDossie(modulo === "insight_tempos" ? "tempos" : "consolidado"); setMotivosAbertos(false); }} />
          : <div className="empty"><strong>Nenhuma solicitação neste recorte</strong><span>Ajuste a busca ou escolha outro filtro acima.</span></div>}
      </section>
    </>;
  };

  return <div className="app-shell">
    <aside className="sidebar">
      {/* O T exporta. A classificação manual vive só no localStorage deste navegador — quem
          analisa do outro lado não a enxerga, e sem isso a pergunta "as que eu aprovei estão
          casando com a Crítica?" não tem como ser respondida fora daqui. Um clique baixa o
          arquivo e copia o mesmo conteúdo para a área de transferência, para poder ser colado
          numa conversa sem precisar anexar nada. */}
      <div className={`brand${oficina ? " na-oficina" : ""}`} title={oficina ? "Clique no T para voltar" : ""}>
        <i role="button" tabIndex={0} className="exportador"
          onClick={() => alternarOficina()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") alternarOficina(); }}>T</i>
        <div><strong>Transforma</strong><span>{oficina ? "Proposta · clique no T para voltar" : "Auditoria · 1.510 SS"}</span>
          {exportado ? <small className="exportou">{exportado}</small> : null}
          {/* O sinal do espelho. Verde só aparece quando a fila zera de verdade; enquanto
              houver linha esperando, o número fica à vista em vez de sumir num catch. */}
          {pendentes ? <small className="exportou pendente"
            onClick={() => void drenar()}>{br(pendentes)} sem gravar no banco — clique para tentar de novo</small> : null}</div>
      </div>
      <nav>{navAtual.map((g) => <div className="nav-group" key={g.grupo}>
        <span>{g.grupo}</span>
        {g.itens.map((item) => <button key={item.codigo} className={modulo === item.id && (item.recorte ? recorte?.id === item.recorte : true) ? "active" : ""}
          onClick={() => irPara(item.id, item.recorte)}>
          <b>{item.codigo}</b><em>{item.rotulo}</em>
          {item.entram ? <i className="nav-entram">{br(item.entram)}</i> : null}
          {item.param ? <small title="ficam presos nesta etapa">{br(item.param)}</small> : null}
          {item.marca ? <small className={item.tom === "verde" ? "nav-verde" : "nav-cinza"}>{br(item.marca)}</small> : null}
        </button>)}
      </div>)}</nav>
      {/* O export perdeu o T, que virou porta. Ele não podia sumir junto: é o único jeito de
          tirar daqui a classificação manual, que vive no navegador e no banco e não sai em
          planilha nenhuma. Ganhou botão com nome escrito, que é melhor do que era — ninguém
          adivinhava que a letra da marca baixava arquivo. */}
      <button type="button" className="side-export" onClick={() => exportarLocal()}>
        Exportar minhas classificações
      </button>
      <div className="side-user"><b>1.5k</b><div><strong>Janeiro a junho</strong><span>de 2026</span></div></div>
    </aside>

    <main className="workspace">
      <header className="page-header">
        <div><span>{titulo.olho}</span><h1>{titulo.titulo}</h1><p>{titulo.texto}</p></div>
        {/* O cabeçalho dizia "Recorte 1.510" em qualquer aba, inclusive nas que abrem com 209
            ou 50 na tabela logo abaixo. Passa a contar o que está na tela, com o universo ao
            lado, para nunca mais haver dois números diferentes falando da mesma lista. */}
        <div className="header-meta"><span>Recorte</span><strong>{br(listadas.length)}</strong><small>de {br(total)} solicitações</small></div>
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
          {/* AS CATEGORIAS, NUM BLOCO SÓ. Ficam separadas dos quatro de cima porque respondem a
              outra pergunta: os de cima decidem SE o caso conta, estes dizem POR QUE ele não
              conta. Um clique aqui tira o caso do indicador e já o entrega na categoria certa —
              o mesmo chip e o mesmo gráfico que a exclusão por regra. */}
          <button type="button" className={`classificar-abrir${motivosAbertos ? " aberto" : ""}`}
            aria-expanded={motivosAbertos}
            onClick={() => setMotivosAbertos(!motivosAbertos)}>
            {/* A caixa avisa o que já foi escolhido. Nem toda categoria vira classe com
                prefixo: furto e preventivo são classes próprias e caíam fora do teste, então a
                caixa dizia "escolher o motivo" mesmo com motivo escolhido. */}
            <span>{[ "EXCLUIDO", "FURTADO", "PREVENTIVO" ].includes(String(classificacao[texto(aberto.ss)]?.classe))
              || ehExclusaoManual(classificacao[texto(aberto.ss)]?.classe)
              ? `Fora do indicador · ${meuRotulo(classificacao[texto(aberto.ss)]?.classe)}`
              : "Fora do indicador — escolher o motivo"}</span>
            <i>{motivosAbertos ? "fechar" : `${CATEGORIAS_EXC.length} motivos`}</i>
          </button>
          {motivosAbertos ? <div className="classificar-categorias">{CATEGORIAS_EXC.map(([id, rotulo]) => <button key={id}
            type="button" title={GATILHO_NOTA[gatilhoDaClasse(id) || id.toLowerCase()] || rotulo}
            className={classificacao[texto(aberto.ss)]?.classe === id ? "marcado" : ""}
            onClick={() => { classificar(texto(aberto.ss), id); setMotivosAbertos(false); }}>{rotulo}</button>)}
          </div> : null}
          {classificacao[texto(aberto.ss)] ? <p className="classificar-aviso">Você já classificou esta solicitação como <strong>{meuRotulo(classificacao[texto(aberto.ss)].classe)}</strong>. Clicar noutro botão <strong>substitui</strong> — a SS continua contando uma vez só, e o histórico da mudança fica gravado no banco.</p> : null}
          <em>{classificacao[texto(aberto.ss)]
            ? `${classificacao[texto(aberto.ss)].quem} · ${dataBR(classificacao[texto(aberto.ss)].quando)}`
            : "A decisão do fluxo continua registrada. Isto é a sua leitura ao lado dela."}</em>
        </div>
        <nav>{([["tempos", "Tempos"], ["consolidado", "Consolidado"], ["interrupcao", "Interrupção"], ["deslocamento", "Deslocamento"],
                ["ssos", "SS e OS"], ["obra", "Obra e SIGCO"], ["historico", "Histórico do ativo"]] as const).map(([id, rotulo]) => <button key={id}
          className={`${abaDossie === id ? "active" : ""} no-caps`.trim()} onClick={() => setAbaDossie(id)}>{rotulo}</button>)}</nav>
        <div className="drawer-body">
          {abaDossie === "tempos" && <>
            {/* Ordem dele: "no card traga esses campos que confirmam na frente dos tempos".
                Vem ANTES das réguas porque é a leitura que muda a conversa sobre o caso — se
                furto ou dano de terceiro se confirma, a discussão deixa de ser sobre a hora em
                que a equipe chegou. Cada linha diz de qual base e de qual campo veio. */}
            {terceiroDe(aberto) ? <article className="work-alerts danger"><span>FURTO, ABALROAMENTO OU DANO DE TERCEIRO — {terceiroDe(aberto)!.n} CAMPO{terceiroDe(aberto)!.n > 1 ? "S" : ""} CONFIRMA{terceiroDe(aberto)!.n > 1 ? "M" : ""}</span>
              <ul>{terceiroDe(aberto)!.fontes.map((f, i) => <li key={i}><strong>{f.campo}:</strong> {f.valor}</li>)}
                <li>A Crítica gravou <strong>{texto(aberto.oc_sub).toLowerCase() || "nada"}</strong> — ela classifica o desligamento, não o equipamento. Nada aqui move o caso: furto sai do indicador e dano de terceiro abre ressarcimento, mas quem decide é você, na aba de classificação.</li></ul></article> : null}
            <h3>Os três tempos deste caso</h3>
            <p className="fonte-detalhe">As três bases no MESMO eixo: o que a Crítica registra, quando a equipe esteve lá e quanto tempo a solicitação ficou aberta. É o eixo compartilhado que faz a leitura — a ordem dos eventos e a distância entre eles se leem de relance.</p>
            <ReguaTempos r={aberto} tm={tmae[texto(aberto.ss)]} />
            <section className="detail-grid">
              <div><span>Ocorrência</span><strong>{dataBR(aberto.oc_ini)} → {dataBR(aberto.oc_fim)}</strong>{aberto.oc_dur_h ? <em>{texto(aberto.oc_dur_h)} h de interrupção</em> : null}</div>
              <div><span>Atendimento</span><strong>{aberto.at_ini ? `${dataBR(aberto.at_ini)} → ${dataBR(aberto.at_fim)}` : "nenhum no código deste trafo"}</strong>{aberto.at_tma ? <em>TMA {texto(aberto.at_tma)} min</em> : null}</div>
              <div><span>Solicitação</span><strong>{dataBR(aberto.abertura)} → {dataBR(aberto.termino)}</strong></div>
              <div><span>A SS caiu na janela?</span><strong>{texto(aberto.casa_na_janela) === "SIM" || Number(aberto.oc_dist_h) === 0 ? "sim" : distanciaEmPalavras(aberto.oc_dist_h, aberto.aberta_antes)}</strong>{texto(aberto.oc_contida_na_ss) === "SIM" ? <em>a ocorrência coube dentro do serviço</em> : null}</div>
            </section>
            {aberto.at_fora_da_janela === "SIM" ? <article className="work-alerts danger"><span>O ATENDIMENTO É DE FORA DA JANELA</span>
              <ul><li>A faixa azul não encosta na vermelha: a ida ao poste que este dossiê exibe não pertence ao evento desta SS.</li></ul></article> : null}
            {(() => {
              const lista = passos.por_oc[texto(aberto.oc_num)] || [];
              const meu = passos.por_ss[texto(aberto.ss)];
              const cod = texto(aberto.trafo);
              if (!lista.length) return null;
              return <>
                <h3>Os passos e as manobras da ocorrência {texto(aberto.oc_num)}</h3>
                <p className="fonte-detalhe">Cada linha da Crítica é um passo: um elemento que ficou sem energia, quando abriu, o que foi fechado para devolver e quando. O elemento com defeito é um só na ocorrência inteira; os interrompidos podem ser vários.</p>
                {meu ? <p className="fonte-detalhe">Neste evento o transformador <strong>{cod}</strong> aparece como {meu.papeis.length ? meu.papeis.join(", ") : "nenhum papel"}.{meu.so_manobra ? " Só como manobra — foi o caminho por onde OUTRO voltou, não a vítima do evento." : ""}</p> : null}
                <div className="table-scroll"><table className="records-table passos-tabela">
                  <thead><tr><th>Passo</th><th>Interrompido</th><th>Abriu</th><th>Fechou</th><th>Como voltou</th><th>Clientes</th></tr></thead>
                  <tbody>{lista.map((p, k) => <tr key={k} className={p.int === cod || p.def === cod ? "passo-meu" : undefined}>
                    <td><strong>{p.p} → {p.pf || "—"}</strong><span>{p.def === cod ? "defeito neste ativo" : `defeito em ${p.def_t} ${p.def}`}</span></td>
                    <td><strong>{p.int_t} {p.int}</strong>{p.int === cod ? <span className="passo-marca">é o ativo desta SS</span> : null}</td>
                    <td><strong>{p.ini}</strong><span>{p.dur ? `${p.dur} min` : ""}</span></td>
                    <td><strong>{p.fim || "não fechou"}</strong></td>
                    <td><b className={`pill ${p.fecho === "restabelecido" ? "ok" : p.fecho === "socorrido" ? "warn" : "bad"}`}>{
                      p.fecho === "restabelecido" ? "restabelecido" : p.fecho === "socorrido" ? "socorrido" : "não restabelecido"}</b>
                      <span>{p.fec ? (p.fec === p.int ? "religou o próprio elemento" : `fechou ${p.fec_t} ${p.fec}`) : "sem elemento fechado"}</span>
                      {p.fec === cod && p.int !== cod ? <span className="passo-marca">o ativo desta SS foi a manobra</span> : null}</td>
                    <td><strong>{p.cons}</strong></td>
                  </tr>)}</tbody>
                </table></div>
              </>;
            })()}
          </>}
          {abaDossie === "consolidado" && <>
            {texto(aberto.narrativa) ? <article className="narrativa">
              <span>COMO ESTE CASO FOI ANALISADO</span>
              <p>{texto(aberto.narrativa)}</p>
              {Array.isArray(aberto.alertas_narrativa) && (aberto.alertas_narrativa as string[]).length
                ? <ul>{(aberto.alertas_narrativa as string[]).map((a) => <li key={a}>{a}</li>)}</ul> : null}
            </article> : null}
            {texto(aberto.etiquetas) ? <article className="work-alerts"><span>ETIQUETAS DESTE CASO</span>
              <ul>{texto(aberto.etiquetas_porque).split(" | ").filter(Boolean).map((e) => <li key={e}>{e}</li>)}</ul>
              <p className="fluxo-nota">Etiqueta nomeia, não decide: o veredito e a conta continuam os mesmos.</p></article> : null}
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
              {aberto.oc_fora_janela === "SIM" ? <div className="fora-janela-aviso"><span>Atenção</span><strong>Esta ocorrência está FORA da janela</strong><em>Ela aparece aqui como a mais próxima no código do ativo, para referência. Não é a prova do caso — a esteira não a aceitou.</em></div> : null}
              <div><span>Distância da SS</span><strong>{distanciaEmPalavras(aberto.oc_dist_h, aberto.aberta_antes)}</strong></div>
              <div><span>Início</span><strong>{dataBR(aberto.oc_ini)}</strong></div>
              <div><span>Fim</span><strong>{dataBR(aberto.oc_fim)}</strong></div>
              <div><span>Duração</span><strong>{texto(aberto.oc_dur_h)} h</strong></div>
              <div><span>Clientes interrompidos</span><strong>{texto(aberto.oc_cons)}</strong></div>
              {/* Dizia "defeito no próprio trafo" ao lado de "sem defeito na janela", no mesmo
                  painel: duas afirmações opostas sobre o mesmo caso. O papel descreve a
                  ocorrência EXIBIDA, e quando ela está fora da janela isso precisa vir escrito
                  junto — senão o campo parece prova do que não é. */}
              <div><span>Papel do transformador</span><strong>{texto(aberto.oc_papel) || "—"}</strong>{aberto.oc_fora_janela === "SIM" ? <em>nesta ocorrência, que está fora da janela</em> : null}</div>
              <div><span>Elemento do defeito</span><strong>{ELEMENTO_ROTULO[texto(aberto.def_elemento)] || "sem defeito na janela"}</strong>{texto(aberto.def_ele_oc) ? <em>ocorrência {texto(aberto.def_ele_oc)} · {texto(aberto.def_ele_causa)}</em> : null}</div>
              <div><span>Causa</span><strong>{texto(aberto.oc_causa)}</strong></div>
              <div><span>Subcausa</span><strong>{texto(aberto.oc_sub)}</strong></div>
            </section>
            <article className="source-text"><span>OBSERVAÇÃO REGISTRADA EM CAMPO</span><p>{texto(aberto.oc_obs) || "Sem observação."}</p></article>
            {texto(aberto.int_na_janela) === "SIM" ? <article className="work-alerts"><span>BANDEIRA — INTERROMPIDO NA JANELA, SÓ LEITURA</span>
              <ul><li>Este transformador não casou pela coluna do defeito, mas aparece como elemento INTERROMPIDO na ocorrência {texto(aberto.int_oc)} — o defeito dela foi aberto em {ELEMENTO_ROTULO[texto(aberto.int_def_ele)] || texto(aberto.int_def_ele)} {texto(aberto.int_def_cod)}. A bandeira é para conferência e não move o caso: regras e método podem mudar, mas os 1.305 não.</li>
                {texto(aberto.analise_claude) === "casaria pelo interrompido" ? <li>Este é um dos três que a regra plena das duas colunas levaria ao indicador. Por ordem sua, fica fora da conta e vai para a sua análise profunda, no recorte "casariam pelo interrompido".</li> : null}</ul></article> : null}
            {aberto.oc_ini ? <article className="rationale"><span>A JANELA DESTE CASO</span>
              <ReguaJanela r={aberto} /></article> : null}
            {texto(aberto.vizinho) ? <article className="work-alerts"><span>TESTE DO VIZINHO</span><ul><li>{texto(aberto.vizinho)}</li></ul></article> : null}
            {/* OS PASSOS, UM POR UM. O resumo da ocorrência (primeira abertura, último
                fechamento) apaga o meio do caminho — e é o meio que conta a história: qual
                elemento atuou primeiro, quando o transformador entrou, quantos clientes cada
                manobra atingiu. Cada linha aqui é uma linha da Crítica. */}
            {Array.isArray(aberto.oc_passos_todos) && (aberto.oc_passos_todos as unknown[]).length ? <>
              <h3>Os passos da ocorrência {texto(aberto.oc_num)}</h3>
              {/* A ocorrência INTEIRA, e não só os passos cujo defeito é deste código. O índice
                  da esteira é por (ocorrência, elemento com defeito), porque é assim que ela
                  casa — e isso partia o evento no dossiê: sumia tudo que aconteceu no mesmo
                  corte com defeito noutro elemento, inclusive os outros transformadores que
                  ficaram sem energia junto. */}
              <p className="fonte-detalhe">Base Crítica CHEIO · {(aberto.oc_passos_todos as unknown[]).length} passo{(aberto.oc_passos_todos as unknown[]).length > 1 ? "s" : ""} de manobra, do primeiro ao último
                {texto(aberto.oc_outros_trafos) ? ` · outros transformadores no mesmo evento: ${texto(aberto.oc_outros_trafos)}` : ""}</p>
              <div className="table-scroll"><table className="records-table passos-oc">
                <thead><tr><th>Passo</th><th>Abertura</th><th>Fechamento</th><th>Elemento com defeito</th><th>Interrompido</th><th>Manobrado para restabelecer</th><th>Clientes</th></tr></thead>
                <tbody>{(aberto.oc_passos_todos as Array<Record<string, string>>).map((p, i) => <tr key={i}>
                  <td><strong>{texto(p.p) || "—"}{texto(p.pf) && p.pf !== p.p ? ` → ${texto(p.pf)}` : ""}</strong><span>abriu → fechou</span></td>
                  <td><strong>{dataBR(p.ini)}</strong></td>
                  <td><strong>{dataBR(p.fim)}</strong></td>
                  <td><code>{p.def || "—"}</code>{p.def === texto(aberto.trafo) ? <span>é este transformador</span> : null}</td>
                  <td><code>{p.int || "—"}</code><span>{p.int_t}</span></td>
                  <td><code>{p.fec || "—"}</code><span>{p.fec_t}</span></td>
                  <td><strong>{p.cons || "0"}</strong></td>
                </tr>)}</tbody>
              </table></div>
              {/* A base não escreve a manobra que não interrompeu ninguém. Quando o número do
                  passo pula, a linha existiu no sistema operativo e não veio no arquivo — e é
                  melhor dizer isso do que deixar a tabela parecer completa. */}
              {texto(aberto.oc_passos_faltam) ? <article className="work-alerts"><span>A CRÍTICA NÃO TRAZ TODAS AS MANOBRAS DESTA OCORRÊNCIA</span>
                <ul><li>Os passos <strong>{texto(aberto.oc_passos_faltam)}</strong> aconteceram no sistema operativo e não viraram linha neste arquivo. A Crítica CHEIO só registra o trecho que interrompeu cliente faturado: manobra que abriu e fechou sem tirar ninguém da luz não aparece. A tabela acima é tudo que a base tem desta ocorrência — não é tudo que a equipe fez no campo.</li></ul></article> : null}
            </> : null}
            <BlocoDetalhe titulo="A linha inteira da interrupção" fonte="Base Crítica CHEIO · interrupção de cliente" dados={aberto.det_interrupcao as Detalhe} />
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
            {aberto.at_ini ? <article className="rationale"><span>O ATENDIMENTO NO TEMPO — A MESMA RÉGUA DA INTERRUPÇÃO</span>
              <ReguaTmae r={aberto} /></article> : null}
            {aberto.at_fora_da_janela === "SIM" ? <article className="work-alerts danger"><span>ESTE ATENDIMENTO É DE FORA DA JANELA</span>
              <ul><li>A data acima não cai na janela desta SS. O campo veio herdado de uma rodada
                anterior e entrava como prova sem que ninguém conferisse a data — houve caso de
                atendimento de 11 de junho sustentando SS de 3 de janeiro.</li>
                <li>O caso continua onde está: exigir a data dentro da janela tira 52 solicitações
                da SAÍDA, de 1.269 para 1.217, e esse número vai a conselho — não é mudança para
                se fazer calada.</li></ul></article> : null}
            <article className="source-text"><span>OBSERVAÇÃO DO EXECUTANTE</span><p>{texto(aberto.at_obs) || "Sem observação."}</p></article>
            {texto(aberto.lacuna_base) ? <article className="work-alerts danger"><span>LACUNA CONHECIDA DA BASE</span><ul><li>{texto(aberto.lacuna_base)}</li></ul></article> : null}
            {aberto.at2_achado === "SIM" ? <article className="work-alerts"><span>ATENDIMENTO ACHADO PELO NÚMERO DA OCORRÊNCIA</span><ul>
              <li>{texto(aberto.at2_nota)}</li>
              <li>Nota {texto(aberto.at2_num)} · equipe {texto(aberto.at2_equipe)} · {texto(aberto.at2_causa)}{texto(aberto.at2_sub) ? ` · ${texto(aberto.at2_sub)}` : ""}</li>
              {texto(aberto.at2_obs) ? <li>Observação do executante: {texto(aberto.at2_obs)}</li> : null}
            </ul></article> : null}
            <BlocoDetalhe titulo="A linha inteira do atendimento" fonte="Base TMAE · atendimento de emergência" dados={aberto.det_atendimento as Detalhe} />
          </>}
          {abaDossie === "ssos" && <>
            <h3>O que foi pedido e o que foi executado</h3>
            {texto(aberto.motivo_reclassificacao) ? <article className="work-alerts"><span>EXCLUSÃO DESFEITA</span><ul><li>{texto(aberto.motivo_reclassificacao)}</li></ul></article> : null}
            {texto(aberto.leitura_pararaio) ? <article className="work-alerts"><span>LEITURA CORRIGIDA</span><ul><li>{texto(aberto.leitura_pararaio)}</li></ul></article> : null}
            {aberto.oc_outro_assunto === "SIM" ? <article className="work-alerts"><span>A OCORRÊNCIA MOSTRADA AQUI NÃO É DESTE SERVIÇO</span><ul><li>A solicitação e o transformador são estes mesmos — o que não bate é a <strong>ocorrência</strong> exibida no painel de Interrupção. Este caso não tem interrupção dentro da janela, e o painel mostra a mais próxima apenas como referência. A nota de campo dela descreve trabalho em conexão, cabo, medidor ou disjuntor, sem citar transformador nenhum: ela é de outro serviço e não explica este. Caso para análise profunda.</li></ul></article> : null}
            {texto(aberto.exclusao_confirmada_pelo_campo) ? <article className="work-alerts"><span>O CAMPO CONFIRMA A EXCLUSÃO</span><ul><li>{texto(aberto.exclusao_confirmada_pelo_campo)}</li></ul></article> : null}
            {texto(aberto.categoria_herdada_vencida) ? <article className="work-alerts"><span>RÓTULO HERDADO DERRUBADO PELO TEXTO</span><ul><li>{texto(aberto.categoria_herdada_vencida)}</li></ul></article> : null}
            {texto(aberto.obra_diverge_texto) ? <article className="work-alerts"><span>A OBRA DIZ OUTRA CAUSA</span><ul><li>{texto(aberto.obra_diverge_texto)}</li></ul></article> : null}
            {texto(aberto.obra_sigco_texto) ? <article className="work-alerts"><span>A OBRA E O SIGCO DISCORDAM ENTRE SI</span><ul><li>{texto(aberto.obra_sigco_texto)}</li></ul></article> : null}
            {texto(aberto.sigco_diverge_texto) ? <article className="work-alerts"><span>ENQUADRAMENTO CONTÁBIL</span><ul><li>{texto(aberto.sigco_diverge_texto)}</li></ul></article> : null}
            {texto(aberto.exclusao_origem) ? <article className="work-alerts"><span>DE ONDE VEIO ESTA REGRA</span><ul><li>{texto(aberto.exclusao_origem)}{texto(aberto.exclusao_caso_origem) ? ` — a partir de ${texto(aberto.exclusao_caso_origem)}` : ""}.</li></ul></article> : null}
            {aberto.sigco_avaria_em_queima === "SIM" ? <article className="work-alerts"><span>BANDEIRA CONTÁBIL</span><ul><li>Avaria enquadrada no SIGCO 8812, que é o projeto de transformador queimado. Não muda a causa — muda para onde o custo foi.</li></ul></article> : null}
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
              {/* Ficavam em branco quando o valor era zero ou vazio, e campo em branco lê-se
                  como campo que sumiu. Zero é resposta: quer dizer que a obra não movimentou
                  transformador nenhum, que é exatamente o que retém o caso na terceira peneira. */}
              {/* "0 — a obra não movimentou transformador" era falso quando a obra sequer está
                  no export de material: ali o zero não é medida, é ausência de dado. O dono
                  perguntou "realmente não tem movimentação?" olhando uma obra de R$ 16.361 com
                  encerramento técnico — e a resposta honesta era que não sabemos. */}
              <div><span>Transformadores no material</span><strong>{(Number(aberto.trafos_material) || 0) > 0
                ? `${texto(aberto.trafos_material)} — a obra movimentou transformador`
                : aberto.material_conferido === "SIM"
                  ? "0 — a obra está no export e não movimentou transformador"
                  : "não sabemos — esta obra não está no export de material que temos"}</strong></div>
              <div><span>Material conferido</span><strong>{texto(aberto.material_conferido) === "SIM" ? "SIM — a obra está no export de material" : "NÃO — a obra não está no export de material, ou não foi gerada"}</strong></div>
              <div><span>Postes no material</span><strong>{texto(aberto.postes_material) || "0"}</strong></div>
              <div><span>O que a obra diz que é</span><strong>{texto(aberto.obra_descricao) || "sem descrição"}</strong></div>
            </section>
            <BlocoDetalhe titulo="A linha inteira da solicitação" fonte="Base de SS e OS" dados={aberto.det_ss as Detalhe} />
          </>}
          {abaDossie === "obra" && <>
            <h3>A obra e o enquadramento</h3>
            <section className="detail-grid">
              <div><span>Obra</span><strong>{texto(aberto.obra) || "não gerada"}</strong></div>
              <div><span>Autorização da troca</span><strong>{aberto.tem_autorizacao === "SIM" ? (texto(aberto.autorizacao) || "citada na OS, sem nome legível") : "não citada na OS"}</strong></div>
              <div><span>O que a obra diz que é</span><strong>{texto(aberto.obra_descricao) || "sem descrição"}</strong></div>
              <div><span>Para que serve este SIGCO</span><strong>{texto(aberto.sigco_descricao) || "código sem obras suficientes para dizer"}{aberto.sigco_pureza ? ` (${texto(aberto.sigco_pureza)}% das obras do projeto)` : ""}</strong></div>
              <div><span>Material movimentado</span><strong>{(Number(aberto.trafos_material) || 0) > 0
                ? `${texto(aberto.trafos_material)} transformador`
                : aberto.material_conferido === "SIM" ? "nenhum transformador — conferido no export"
                : "não conferido — a obra não está no export de material"}{(Number(aberto.postes_material) || 0) > 0 ? ` · ${texto(aberto.postes_material)} poste` : ""}</strong></div>
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
            {/* O rótulo dizia "ALERTAS DE OBRA" e o conteúdo vinha de dois lugares diferentes.
                "Nenhum cliente interrompido" é da CRÍTICA — soma de QTD_CONS_INTER_FAT em todas
                as linhas da ocorrência —, e não tem nada a ver com o cadastro de obras, que é o
                assunto desta aba. Um alerta no bloco errado faz o leitor procurar a explicação
                onde ela não está. Agora cada sinal diz de onde veio. */}
            {texto(aberto.e4_alertas) ? <article className="work-alerts"><span>SINAIS DESTE CASO</span><ul>{texto(aberto.e4_alertas).split(" · ").map((x) => <li key={x}>
              <b className="fonte-sinal">{/cliente|interromp|programa|elemento|equipamento especial/i.test(x) ? "base Crítica" : "cadastro de obras"}</b> {x}
            </li>)}</ul></article> : null}
            <article className="editorial-note"><span>SOBRE O NOME DA OBRA</span><p>O cadastro não guarda quem abriu a obra: o nome registrado é o de quem fez a última movimentação. Quem origina o fluxo é o solicitante da SS, porque a obra nasce dela.</p></article>
            <BlocoDetalhe titulo="A linha inteira da obra" fonte="Cadastro de obras · 93 colunas" dados={aberto.det_obra as Detalhe} />
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
                <td><strong>{dataBR(l[5])}</strong><span>{texto(l[6]) ? `até ${dataBR(l[6])}` : ""}</span></td>
                <td><span>{texto(l[10])}</span></td>
                <td><span>{texto(l[12]) || "—"}</span></td>
              </tr>)}</tbody>
            </table></div>
            {/* OS PASSOS DE TODAS AS SS DESTE ATIVO. Ele pediu isto por escrito — "eu quero
                poder clicar na interrupção os passos do começo ao fim" — e a aba de Interrupção
                só mostra os passos da ocorrência DESTA SS. Aqui o ativo é o assunto: se ele tem
                três SS e cada uma casou com uma ocorrência, as três cronologias aparecem, em
                ordem. É onde se enxerga o transformador que queima de novo, e quando. */}
            {registros.filter((r) => texto(r.trafo) === texto(aberto.trafo)
              && Array.isArray(r.oc_passos_todos) && (r.oc_passos_todos as unknown[]).length).map((r) => <section key={texto(r.ss)} className="passos-ss">
              <h3>Ocorrência {texto(r.oc_num)} · {texto(r.ss)}{texto(r.ss) === texto(aberto.ss) ? " (esta SS)" : ""}</h3>
              <p className="fonte-detalhe">Base Crítica CHEIO · {(r.oc_passos_todos as unknown[]).length} passo{(r.oc_passos_todos as unknown[]).length > 1 ? "s" : ""} de manobra, do primeiro ao último · {texto(r.cascata)}
                {texto(r.oc_outros_trafos) ? ` · outros transformadores no mesmo evento: ${texto(r.oc_outros_trafos)}` : ""}</p>
              <div className="table-scroll"><table className="records-table passos-oc">
                <thead><tr><th>Abertura</th><th>Fechamento</th><th>Elemento com defeito</th><th>Interrompido</th><th>Manobrado para restabelecer</th><th>Clientes</th></tr></thead>
                <tbody>{(r.oc_passos_todos as Array<Record<string, string>>).map((x, i) => <tr key={i}>
                  <td><strong>{dataBR(x.ini)}</strong></td>
                  <td><strong>{dataBR(x.fim)}</strong></td>
                  <td><code>{x.def || "—"}</code>{x.def === texto(aberto.trafo) ? <span>é este transformador</span> : null}</td>
                  <td><code>{x.int || "—"}</code><span>{x.int_t}</span></td>
                  <td><code>{x.fec || "—"}</code><span>{x.fec_t}</span></td>
                  <td><strong>{x.cons || "0"}</strong></td>
                </tr>)}</tbody>
              </table></div>
            </section>)}
          </>}
        </div>
      </aside>
    </div> : null}
  </div>;
}
