"use client";

import { useEffect, useMemo, useState } from "react";
import MapaAtivos, { type PontoAtivo } from "./MapaAtivos";

/* ------------------------------------------------------------------ tipos */

type Modulo =
  | "visao" | "interrupcao" | "deslocamento" | "ssos" | "obra" | "decisao"
  | "profunda"
  | "ressalva"
  | "semdesloc"
  | "semfato" | "expurgos" | "exclusoes" | "preventivos"
  | "ativos" | "regras" | "revisao" | "bases" | "mapa";

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
  sem_obra: "Obra nunca gerada — prazo vencido",
  sem_fato: "Sem fato em base nenhuma",
};

const CLASSES_CURTAS: Array<[string, string, string]> = [
  ["QUEIMADO", "Q", "good"], ["AVARIADO", "A", "pend"],
  ["PREVENTIVO", "V", "warn"], ["EXCLUIDO", "X", "bad"],
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
    expurgos: ["Motivo da parada", "Solicitação", "Obra"],
    exclusoes: ["Por que foi excluída", "Solicitação", "Obra"],
    preventivos: ["Por que é preventivo", "Solicitação", "Obra"],
    visao: ["Fato", "Leitura", "Motivo"],
    ativos: ["Fato", "Leitura", "Motivo"],
    mapa: ["Fato", "Leitura", "Motivo"],
    regras: ["Fato", "Leitura", "Motivo"],
    bases: ["Fato", "Leitura", "Motivo"],
  };
  const colunas = cabecalho[modo] || cabecalho.decisao;
  return <div className="table-scroll"><table className="records-table">
    <thead><tr>
      <th>Identificação</th><th>Data e local</th>
      <th>{colunas[0]}</th><th>{colunas[1]}</th><th>{colunas[2]}</th><th>Decisão</th><th>Minha classificação</th>
    </tr></thead>
    <tbody>{linhas.map((r) => {
      /* A cor da linha diz de longe o que a coluna do motivo diz por escrito: este caso saiu do
         indicador. Mais forte quando a exclusão foi batida à mão — essa é a que precisa ser
         distinguida da exclusão por regra. */
      const meu = classificacoes[texto(r.ss)]?.classe;
      const excluida = meu === "EXCLUIDO" || (!meu && texto(r.cascata) === "EXCLUÍDA");
      const cor = meu === "QUEIMADO" ? "linha-queimada"
        : meu === "AVARIADO" ? "linha-avariada"
        : meu === "PREVENTIVO" ? "linha-preventiva"
        : excluida ? `linha-excluida${meu === "EXCLUIDO" ? " por-mim" : ""}`
        : undefined;
      return <tr key={texto(r.ss)} className={cor} onClick={() => aoAbrir(r)}>
      <td><strong>{texto(r.ss)}</strong><span>{texto(r.os) || "sem OS"}</span><code>{texto(r.trafo)}</code></td>
      <td><strong>{dataBR(r.abertura)}</strong><span>{texto(r.localidade)}</span><small>{texto(r.equipe_ss)} · {texto(r.origem)}</small></td>

      {modo === "interrupcao" && <>
        <td><strong>{texto(r.oc_num) || "sem ocorrência"}</strong><span>{dataBR(r.oc_ini)}</span><small>{r.oc_dur_h ? `${r.oc_dur_h}h · ${texto(r.oc_cons)} clientes` : ""}</small></td>
        <td><strong>{texto(r.oc_causa) || "—"}</strong><span>{texto(r.oc_sub)}</span><small>{texto(r.oc_papel)}</small></td>
        <td><b className={`pill ${fatoClasse(texto(r.fato))}`}>{FATO_ROTULO[texto(r.fato)] || texto(r.fato)}</b><span>{r.oc_dist_h !== null && r.oc_dist_h !== undefined ? `${r.oc_dist_h}h da borda do intervalo` : "—"}</span><small>{texto(r.ressalvas)}</small></td>
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
        ? <><b className={`pill ${MEU_TOM[meu] || "pend"}`}>{MEU_ROTULO[meu] || meu}</b>
            <span className="decisao-fluxo">o fluxo dizia {texto(r.decisao).toLowerCase()}</span></>
        : <><b className={`pill ${decisaoClasse(texto(r.decisao))}`}>{texto(r.decisao)}</b>
            {r.mudou_na_revisao === "SIM" ? <span className="expurgo-tag">mudou na revisão</span> : null}</>}
        {/* Onde o caso parou, não por quê — são perguntas diferentes e a cascata só respondia a
            segunda. O degrau numerado responde de relance, e a distância entre "parou na 1" e
            "parou na 4" é a distância entre não ter prova nenhuma e ter prova com ressalva. */}
        <span className="etapa-flag" title={texto(r.etapa_rotulo)}>{r.etapa_num === 5 ? "✓ saiu pela ponta" : r.etapa_num === 0 ? "não entrou na esteira" : `parou na etapa ${texto(r.etapa_num)}`}</span>
      </td>
      <td className="col-classificar" onClick={(e) => e.stopPropagation()}>
        <div className="classificar-linha">{CLASSES_CURTAS.map(([id, curto, tom]) => <button key={id} type="button"
          title={id}
          className={classificacoes[texto(r.ss)]?.classe === id ? `marcado ${tom}` : tom}
          onClick={() => aoClassificar(texto(r.ss), id)}>{curto}</button>)}</div>
        {classificacoes[texto(r.ss)] ? <span>{classificacoes[texto(r.ss)].classe.toLowerCase()}</span> : null}
      </td>
    </tr>;
    })}</tbody>
  </table></div>;
}

/* ------------------------------------------------------------------ tela */

export default function Page() {
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const [revisao, setRevisao] = useState<Revisao | null>(null);
  const [recorteRev, setRecorteRev] = useState<string>("todos");
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
    fetch(assetUrl("revisao.json")).then((r) => r.json()).then(setRevisao).catch(() => setRevisao(null));
    const salvo = localStorage.getItem("fluxo-1510-classificacao");
    if (salvo) Promise.resolve().then(() => setClassificacao(JSON.parse(salvo)));
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
    if (c === "EXCLUIDO") return "EXCLUÍDA";
    if (c === "PREVENTIVO") return "PREVENTIVO";
    return texto(r.cascata);
  };
  const rearquivado = (r: Registro) => arquivo(r) !== texto(r.cascata);

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
    // A revisão não filtra registros da esteira: ela tem os próprios chips, montados a partir
    // das famílias de motivo do revisao.json. Fica vazio aqui de propósito.
    revisao: [],
    interrupcao: [
      /* ELEMENTO DO DEFEITO. A Crítica diz duas coisas diferentes sobre o mesmo transformador:
         onde o defeito foi aberto e o que ficou sem energia. A esteira casa pelo primeiro — o
         defeito tem de ser no próprio ativo. Estes filtros mostram o segundo, sem mudar o
         casamento: em 19.378 ocorrências da base um transformador foi interrompido com o
         defeito noutro elemento. Marcador, não peneira. */
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
      { id: "lacuna", rotulo: "Na lacuna de janeiro", nota: "SS aberta entre 26 e 31 de janeiro, período sem nenhum atendimento no arquivo.", teste: (r) => r.tmae_gap_jan === "SIM" },
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
      { id: "v", rotulo: "Preventivo", nota: "Troca sem defeito. Sai da esteira e vai para a aba de preventivos.", teste: (r) => classificacao[texto(r.ss)]?.classe === "PREVENTIVO" },
      { id: "x", rotulo: "Excluído", nota: "Fora do indicador pela sua leitura. Sai da esteira e vai para a aba de exclusões.", teste: (r) => classificacao[texto(r.ss)]?.classe === "EXCLUIDO" },
      { id: "r", rotulo: "Vale a regra", nota: "Você concordou com a decisão do fluxo.", teste: (r) => classificacao[texto(r.ss)]?.classe === "REGRA" },
      { id: "p", rotulo: "Análise profunda", nota: "Precisa de campo ou de documento que não temos.", teste: (r) => classificacao[texto(r.ss)]?.classe === "PROFUNDA" },
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
      { id: "saida", rotulo: "Saíram pela cascata", nota: "Passaram por interrupção, deslocamento, texto e material.", teste: (r) => r.cascata === "SAÍDA" },
      { id: "ret_fato", rotulo: "Retidos sem fato", nota: "O campo não registrou nada na janela.", teste: (r) => r.cascata === "RETIDO — SEM INTERRUPÇÃO NA JANELA" },
      { id: "ret_desl", rotulo: "Retidos sem deslocamento", nota: "Houve interrupção, mas nenhum atendimento no código do trafo.", teste: (r) => r.cascata === "RETIDO — SEM DESLOCAMENTO" },
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
      { id: "pararaio", rotulo: "Queima do para-raio, avaria do trafo", nota: "O texto cita queima, mas do para-raio; o que o transformador tem é vazamento de óleo. Relidos como avaria — não muda o total, muda de que lado contam.", teste: (r) => Boolean(texto(r.leitura_pararaio)) },
    ],
    semfato: [
      // A primeira peneira hoje retém por um motivo só. A SS duplicada saiu daqui: ela não é
      // caso pendente de leitura, é o mesmo evento contado duas vezes — e foi para as exclusões.
      { id: "parados", rotulo: "Tudo que parou aqui", nota: "Nem interrupção na Crítica nem atendimento no TMAE dentro da janela de 24 horas. É exatamente o número que a etapa da Interrupção anuncia.", teste: (r) => arquivo(r) === "RETIDO — SEM INTERRUPÇÃO NA JANELA" },
      { id: "todos", rotulo: "Sem interrupção na janela", nota: "Nem interrupção nem atendimento na janela de 24 horas.", teste: (r) => arquivo(r) === "RETIDO — SEM INTERRUPÇÃO NA JANELA" },
      { id: "vizinho", rotulo: "Vizinho encontrado", nota: "Existe ocorrência em outro ativo do mesmo alimentador ou localidade na janela.", teste: (r) => arquivo(r) === "RETIDO — SEM INTERRUPÇÃO NA JANELA" && Boolean(texto(r.vizinho)) && !texto(r.vizinho).startsWith("Nada") },
      { id: "nada", rotulo: "Nada encontrado", nota: "Nem vizinho. É a lista que sobe para investigação de campo.", teste: (r) => arquivo(r) === "RETIDO — SEM INTERRUPÇÃO NA JANELA" && texto(r.vizinho).startsWith("Nada") },
      // O chip "provavelmente no histórico de 2025" saiu daqui: apontava para um arquivo que
      // faltava, dezembro/2025 entrou no acervo e as 24 SS de borda foram reprocuradas — as 24
      // acharam ocorrência. Filtro que promete explicação já respondida é pior que nenhum.
      { id: "antes", rotulo: "Aberta antes da interrupção", nota: "A ocorrência existe no mesmo transformador, mas começou depois de a SS ser aberta por mais de uma hora. Não é \u201csem evento\u201d: é registro atrasado ou evento diferente, e a pergunta que ela levanta é essa. A tolerância para trás é de uma hora porque a ordem normal do campo é o cliente ligar, a SS nascer e a ocorrência ser registrada minutos depois.", teste: (r) => r.aberta_antes === "SIM" },
      { id: "antes_q", rotulo: "Aberta antes · texto diz queima ou avaria", nota: "Dos abertos antes da interrupção, os que o texto descreve como falha do equipamento. São os que merecem leitura à mão primeiro.", teste: (r) => r.aberta_antes === "SIM" && ["QUEIMADO", "AVARIADO"].includes(texto(r.categoria_texto)) },
      { id: "def_outro", rotulo: "Interrupção com defeito em outro elemento", nota: "Não há ocorrência com defeito neste transformador na janela, mas há ocorrência que o deixou sem energia com o defeito noutro elemento — unidade consumidora, chave ou disjuntor. É informação, não prova: o transformador ficou sem energia, o que não quer dizer que ele falhou.", teste: (r) => arquivo(r) === "RETIDO — SEM INTERRUPÇÃO NA JANELA" && Boolean(texto(r.def_elemento)) },
      { id: "outro_assunto", rotulo: "A ocorrência mostrada não é deste serviço", nota: "A SS e o transformador são os do caso; o que não bate é a ocorrência exibida no painel. O caso não casou, e a ocorrência que aparece no dossiê é só a mais próxima. A nota de campo dela descreve conexão, cabo, medidor ou disjuntor, sem citar transformador nenhum: ela não explica nada sobre este ativo. Vale só fora da janela — dentro dela, a nota omitir a palavra é rotina, acontece em 858 casos.", teste: (r) => r.oc_outro_assunto === "SIM" },
    ],
    expurgos: [
      // A terceira peneira hoje tem UM motivo de parada: a obra não comprova a troca. A
      // exclusão por causa saiu daqui — ela acontece antes da esteira e tem aba própria.
      { id: "parados", rotulo: "Tudo que parou aqui", nota: "A terceira peneira retém por um motivo só: a obra não comprova que um transformador foi movimentado. É exatamente o número que a etapa da Análise de SS e OS anuncia.", teste: (r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" },
      { id: "semprova", rotulo: "Sem prova de troca", nota: "Chegaram ao terceiro estágio, mas o material não comprova a troca ou o texto não decide. Não é exclusão: é ausência de prova.", teste: (r) => arquivo(r) === "RETIDO — SEM PROVA DE TROCA" },
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
      { id: "g_furto", rotulo: "Furto, roubo ou vandalismo", nota: "O texto declara furto. Vai para o projeto de reposição de ativo furtado, não é falha de equipamento.", teste: (r) => texto(r.expurgo_gatilho) === "furto" },
      { id: "g_abalro", rotulo: "Abalroamento", nota: "Colisão de veículo. Vira ressarcimento de terceiro, não indicador de falha.", teste: (r) => texto(r.expurgo_gatilho) === "abalroamento" },
      { id: "g_prev", rotulo: "Preventivo ou programado", nota: "Não houve defeito: a troca foi programada.", teste: (r) => texto(r.expurgo_gatilho) === "preventivo" },
      { id: "g_div", rotulo: "Divisão de circuito", nota: "Obra de capacidade — entra como preventivo, não como falha.", teste: (r) => texto(r.expurgo_gatilho) === "divisao" },
      { id: "g_constr", rotulo: "Construção ou desativação", nota: "Obra nova, ou retirada definitiva do posto de transformação.", teste: (r) => texto(r.expurgo_gatilho) === "construcao" || texto(r.expurgo_gatilho) === "desativacao" },
      { id: "g_aux", rotulo: "Auxiliar de religador ou regulador", nota: "Não é unidade de distribuição da concessionária.", teste: (r) => texto(r.expurgo_gatilho) === "auxiliar" },
      { id: "g_part", rotulo: "Transformador particular", nota: "O ativo é do cliente ou de terceiro.", teste: (r) => texto(r.expurgo_gatilho) === "particular" },
      { id: "g_semos", rotulo: "Sem OS e sem obra", nota: "A ordem de serviço não tem descrição e a obra não foi gerada: não há relato do executante nem consulta de material. Não é afirmação sobre a causa — é ausência de documento. O caso é investigável, não confirmável.", teste: (r) => texto(r.expurgo_gatilho) === "sem_os" },
      { id: "g_semfato", rotulo: "Sem fato em base nenhuma", nota: "Nem ocorrência na Crítica, nem atendimento no TMAE, nem vizinho no alimentador, na localidade ou em código parecido. Só entram aqui os casos em que a busca por vizinhança não achou absolutamente nada — nos que acharam, o fato provavelmente existe sob outro código e o caso continua retido.", teste: (r) => texto(r.expurgo_gatilho) === "sem_fato" },
      { id: "g_semobra", rotulo: "Obra nunca gerada", nota: "A obra não foi aberta e a SS já passou de 60 dias. Sem obra não há consulta de material, e depois de dois meses ela não vem mais: o caso deixa de ser espera e vira promessa vazia. As que ainda estão no prazo continuam retidas.", teste: (r) => texto(r.expurgo_gatilho) === "sem_obra" },
      { id: "g_seg", rotulo: "Obra de poste — segurança", nota: "A obra é de poste e o transformador desceu junto: foi movido por necessidade estrutural, não por ter falhado. A regra só vale quando o texto não declara nenhuma falha do equipamento — das oito SS que pedem troca de poste, sete dizem também o que o transformador tinha.", teste: (r) => texto(r.expurgo_gatilho) === "seguranca" },
      { id: "g_tap", rotulo: "Tape interno", nota: "O transformador foi trocado para regularizar tensão porque o tape é interno e não pode ser ajustado em campo. Nunca dispara pelo campo do formulário \u201cPOS. TAP : 03\u201d, que aparece em 627 das 1.510 descrevendo o equipamento retirado e não é causa de nada.", teste: (r) => texto(r.expurgo_gatilho) === "tap" },
      { id: "g_dup", rotulo: "SS duplicada", nota: "Divide o mesmo evento e o mesmo transformador com outra SS. A interrupção prova uma troca, não duas — e a prova fica com a SS mais próxima do evento.", teste: (r) => texto(r.expurgo_gatilho) === "duplicada" },
      { id: "commat", rotulo: "Excluídas que TÊM material", nota: "Instalaram um transformador no lugar — no furto, no lugar do que levaram. O material prova que houve troca; não prova por quê.", teste: (r) => arquivo(r) === "EXCLUÍDA" && (Number(r.trafos_material) || 0) > 0 },
      { id: "presumida", rotulo: "Exclusão por presunção, não constatação", nota: "O texto diz \u201cpossivelmente furtado\u201d, \u201cao que tudo indica\u201d, \u201csinais de vandalismo\u201d ou \u201ctentativa de furto\u201d. A equipe supôs a partir do que viu; não constatou. Continuam fora do indicador, mas ficam marcadas — suposição arquivada como fato é o que ninguém revisa depois.", teste: (r) => r.exclusao_presumida === "SIM" },
      { id: "suas_regras", rotulo: "Saíram por regra que você pediu", nota: "A categoria existe porque você mandou criar, e em várias delas você apontou o caso que convenceu. O dossiê de cada uma diz qual foi. Autoria não é detalhe: quem defende o número precisa poder dizer de onde veio cada corte.", teste: (r) => r.exclusao_pedida_pelo_dono === "SIM" },
      { id: "manual", rotulo: "Excluídas por você à mão", nota: "Não saíram por regra: você bateu o martelo. A decisão do fluxo continua registrada ao lado.", teste: (r) => ["EXCLUIDO", "FURTADO"].includes(classificacao[texto(r.ss)]?.classe || ""),
 },
      { id: "manual_furto", rotulo: "Marcadas por você como furto", nota: "Furto, roubo ou vandalismo pela sua leitura, não pela régua.", teste: (r) => classificacao[texto(r.ss)]?.classe === "FURTADO" },
    ],
    preventivos: [
      { id: "todos", rotulo: "Todos os preventivos", nota: "Troca sem defeito: programada, por divisão de circuito ou marcada por você. Não conta como falha de equipamento.", teste: (r) => arquivo(r) === "PREVENTIVO" || texto(r.expurgo_gatilho) === "preventivo" || texto(r.expurgo_gatilho) === "divisao" },
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
    if (!marca) return false;
    if (recorte === "q") return marca.classe === "QUEIMADO";
    if (recorte === "a") return marca.classe === "AVARIADO";
    if (recorte === "r") return marca.classe === "REGRA";
    if (recorte === "p") return marca.classe === "PROFUNDA";
    if (recorte === "v") return marca.classe === "PREVENTIVO";
    if (recorte === "x") return marca.classe === "EXCLUIDO";
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
      r.obra_tipo, r.obra_descricao, r.sigco, r.autorizacao, r.expurgo_gatilho,
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
  /* Os botões do dossiê. Preventivo e Excluído chegaram à tabela como V e X e não chegaram
     aqui — o dono classificava pela lista e não pelo caso aberto, que é justamente onde ele lê
     o texto inteiro antes de bater o martelo. A ordem segue a do fluxo: primeiro as duas causas
     que contam, depois as duas que tiram do indicador, por último as duas de procedimento. */
  const CLASSES: Array<[string, string, string]> = [
    ["QUEIMADO", "Queimado", "good"],
    ["AVARIADO", "Avariado", "pend"],
    ["PREVENTIVO", "Preventivo", "warn"],
    ["EXCLUIDO", "Excluído", "bad"],
    ["REGRA", "Vale a regra do fluxo", "warn"],
    ["PROFUNDA", "Análise profunda", "bad"],
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
  const preventivos = conta((r) => arquivo(r) === "PREVENTIVO"
    || texto(r.expurgo_gatilho) === "preventivo" || texto(r.expurgo_gatilho) === "divisao");
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
      { id: "semfato", rotulo: "Parados na interrupção", codigo: "02·1", param: entramE1 - entramE2, recorte: "parados" },
      { id: "deslocamento", rotulo: "Deslocamento", codigo: "03", entram: entramE2, recorte: "todos" },
      { id: "semdesloc", rotulo: "Sem corroboração do TMAE", codigo: "03·1", marca: conta((r) => r.deslocamento === "SEM REGISTRO"), tom: "cinza", recorte: "todos" },
      { id: "ssos", rotulo: "Análise de SS e OS", codigo: "04", entram: entramE3, recorte: "todos" },
      { id: "expurgos", rotulo: "Parados na análise", codigo: "04·1", param: paramE3, recorte: "parados" },
      { id: "ressalva", rotulo: "Ressalva da interrupção", codigo: "05", entram: entramE3 - paramE3, recorte: "fila" },
      { id: "ressalva", rotulo: "Retidos pela ressalva", codigo: "05·1", param: paramE4, recorte: "todos" },
      { id: "decisao", rotulo: "Decisão final", codigo: "06", marca: naSaida, tom: "verde", recorte: "saida" },
    ]},
    /* As exclusões vêm DEPOIS da esteira na barra e ANTES dela no tempo. Não é contradição: o
       leitor precisa entender a esteira para entender o que foi tirado dela, mas o caso
       excluído nunca chegou a descer nenhum degrau. Ficam aqui embaixo, com o motivo escrito
       em cada linha, em vez de poluírem a fila de quem ainda espera leitura. */
    { grupo: "Fora da esteira", itens: [
      { id: "exclusoes", rotulo: "Exclusões", codigo: "07", marca: excluidas, tom: "cinza", recorte: "todos" },
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
      { id: "profunda", rotulo: "Excluídos", codigo: "11·4", marca: porClasseNav("EXCLUIDO"), tom: "cinza", recorte: "x" },
      { id: "profunda", rotulo: "Análise profunda", codigo: "11·5", marca: porClasseNav("PROFUNDA"), tom: "cinza", recorte: "p" },
    ]},
    { grupo: "Controle", itens: [
      { id: "regras", rotulo: "Regras e método", codigo: "12" },
      { id: "revisao", rotulo: "Revisão da auditoria", codigo: "12·1", marca: revisao?.meta.mudam, tom: "cinza" },
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
  };
  const irPara = (id: Modulo, recorteId?: string) => {
    setModulo(id);
    setBusca("");
    const alvo = (RECORTES[id] || []).find((x) => x.id === (recorteId || PADRAO[id]));
    setRecorte(alvo ? { id: alvo.id, rotulo: alvo.rotulo } : null);
  };

  /* ---------------------------------------------------------------- cabeçalhos por módulo */

  const painel = () => {
    if (modulo === "visao") {
      const decisoes = ["INCLUIR", "REVISÃO", "EXCLUIR"].map((d) => ({ label: d, value: conta((r) => r.decisao === d) }));
      const fatos = ["F1", "F0", "F2", "F3", "FD"].map((f) => ({ label: FATO_ROTULO[f], value: conta((r) => r.fato === f) }));
      // A cascata é literal: cada peneira só recebe o que a anterior deixou passar.
      const chegaE1 = conta((r) => r.chega_e1 === "SIM");
      const chegaE2 = conta((r) => r.chega_e2 === "SIM");
      const chegaE3 = conta((r) => r.chega_e3 === "SIM");
      const saida = conta((r) => r.cascata === "SAÍDA");
      const excluidos = conta((r) => r.cascata === "EXCLUÍDO NA LEITURA");
      /* Cada linha mostra quantos SOBREVIVEM à peneira, então o clique tem de abrir a aba de
         quem sobreviveu — não a etapa que os produziu. Antes clicar em 1.300 na linha da
         Interrupção abria a fila de 1.510: o número clicado nunca era o número que aparecia. */
      const caixas: Array<[string, string, number, number, Modulo]> = [
        ["Entram", "solicitações de troca de transformador", total, 0, "interrupcao"],
        // quem para aqui para por dois motivos diferentes: não ter interrupção, ou tê-la
        // e dividir o mesmo evento com outra SS. Vale dizer os dois, não só somar.
        ["1 · Interrupção", `o campo registrou o evento na janela de 24 horas${conta((r) => r.cascata === "RETIDO — SS DUPLICADA") ? ` · dos que param aqui, ${br(conta((r) => r.cascata === "RETIDO — SS DUPLICADA"))} têm a interrupção mas dividem o evento com outra SS` : ""}`, chegaE2, total - chegaE2, "deslocamento"],
        ["2 · Deslocamento", `marcador, não retém — ${br(conta((r) => r.deslocamento === "CORROBORA"))} com atendimento de equipe e ${br(conta((r) => r.deslocamento === "SEM REGISTRO"))} sem registro`, chegaE3, chegaE2 - chegaE3, "semdesloc"],
        ["3 · SS e OS com material", "o texto diz falha e o material comprova a troca", chegaE3 - conta((r) => r.cascata === "EXCLUÍDO NA LEITURA") - conta((r) => r.cascata === "RETIDO — SEM PROVA DE TROCA"), conta((r) => r.cascata === "EXCLUÍDO NA LEITURA") + conta((r) => r.cascata === "RETIDO — SEM PROVA DE TROCA"), "ressalva"],
        ["4 · Ressalva da interrupção", "a interrupção sustenta chamar isso de falha?", saida, conta((r) => r.cascata === "RETIDO — RESSALVA DA INTERRUPÇÃO"), "decisao"],
      ];
      return <>
        <section className="scope-strip">
          <div><span>Recorte</span><strong>{br(total)} SS · jan a jun/2026</strong></div>
          <div><span>Janela da interrupção</span><strong>{fluxo.meta.janelaHoras}h contra o intervalo inteiro</strong></div>
          <div><span>Saída</span><strong>{br(conta((r) => r.decisao === "INCLUIR"))} incluir</strong></div>
          <p>{fluxo.meta.regra}</p>
        </section>
        {(fluxo.meta.correcoes || []).length > 0 && (
          <section className="panel editorial-note wide"><span>CORREÇÕES APLICADAS AO CRUZAMENTO</span>
            <p>Todas vieram da conferência linha a linha contra os arquivos originais. As primeiras são defeitos de cruzamento entre as bases: o que mudou foi a verdade do que está escrito em cada caso. Depois vieram as que movem número — três arquivos que faltavam e duas regras que o dono redefiniu. A saída está hoje em <strong>{br(conta((r) => r.cascata === "SAÍDA"))}</strong>, com {br(conta((r) => r.cascata === "EXCLUÍDO NA LEITURA"))} excluídos na leitura.</p>
            <ul className="lista-correcoes">{(fluxo.meta.correcoes || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
          </section>
        )}
        <section className="kpi-grid">
          <Kpi rotulo="Solicitações" valor={br(total)} nota="transformador, jan a jun" tom="ink" />
          {/* "Incluir" não dizia o que era incluído, e "Revisão"/"Excluir" descreviam a fila
              interna em vez do resultado. Os rótulos passam a dizer o que o caso É. */}
          <Kpi rotulo="Queimados ou avariados" valor={br(conta((r) => r.decisao === "INCLUIR"))} nota={`${br(conta((r) => r.confirmado === "QUEIMADO"))} queimados · ${br(conta((r) => r.confirmado === "AVARIADO"))} avariados`} tom="green" aoClicar={() => irPara("decisao", "saida")} />
          <Kpi rotulo="Retidos com motivo" valor={br(conta((r) => r.decisao === "REVISÃO"))} nota="cada um com a razão escrita ao lado" tom="amber" aoClicar={() => irPara("decisao", "revisao")} />
          <Kpi rotulo="Outra causa comprovada" valor={br(conta((r) => r.decisao === "EXCLUIR"))} nota="furto, abalroamento, auxiliar, preventivo" tom="red" aoClicar={() => irPara("expurgos", "todos")} />
          <Kpi rotulo="Sem interrupção na janela" valor={br(conta((r) => r.fato === "F3"))} nota="nem a Crítica nem o TMAE registram nada" tom="red" aoClicar={() => irPara("semfato", "parados")} />
          <Kpi rotulo="Sem corroboração do TMAE" valor={br(conta((r) => r.deslocamento === "SEM REGISTRO"))} nota="marcador, não retém ninguém" tom="blue" aoClicar={() => irPara("semdesloc", "todos")} />
          <Kpi rotulo="Categoria corrigida" valor={br(conta((r) => Boolean(texto(r.categoria_texto)) && r.categoria_texto !== r.categoria_gravada))} nota="o texto contradiz o rótulo" tom="blue" aoClicar={() => irPara("ssos", "corrigida")} />
          <Kpi rotulo="Sob suspeita no texto" valor={br(conta((r) => r.sob_suspeita === "SIM"))} nota="sinal para conferir à mão, não motivo para excluir" tom="amber" aoClicar={() => irPara("ssos", "suspeita")} />
        </section>
        <section className="resultado-esteira">
          <span>Resultado da esteira</span>
          <div>
            <article><b>{br(conta((r) => r.confirmado === "QUEIMADO"))}</b><em>queimados</em></article>
            <article><b>{br(conta((r) => r.confirmado === "AVARIADO"))}</b><em>avariados</em></article>
            <article className="total"><b>{br(conta((r) => Boolean(texto(r.confirmado))))}</b><em>transformadores com causa confirmada</em></article>
          </div>
          <p>Campo, texto e material contam a mesma história e a interrupção não tem ressalva. Os outros {br(total - conta((r) => Boolean(texto(r.confirmado))))} não são negativa: estão nas filas de revisão, cada um com o motivo escrito.</p>
        </section>
        <section className="panel caixa-dagua">
          <div className="panel-title"><div><span>Caixa d'água</span><h2>Onde cada solicitação para</h2></div><small>clique para abrir o estágio</small></div>
          {caixas.map(([nome, nota, valor, retido, destino]) => <button key={nome} type="button" className="caixa-linha" onClick={() => irPara(destino)}>
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
            if (achado) { setAberto(achado); setAbaDossie("consolidado"); }
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
        ["Base_Esteira_Completa.xlsx", "Esteira completa", "Uma linha por SS com a posição na esteira, o motivo, a decisão, a causa confirmada, o gatilho da exclusão com a frase que a explica, o intervalo inteiro da ocorrência e o marcador de deslocamento.", "0,35 MB"],
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
      return <>
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
                  <b className={dentro ? "dentro" : "fora"}>{dentro ? "a SS abre dentro da ocorrência" : `a SS abre a ${Math.abs(Number(r.oc_dist_h) || 0)} h da borda`}</b>
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
        return <>
          <section className="panel editorial-note wide"><span>COMO LER OS NÚMEROS DESTA ETAPA</span>
            <p>Esta aba mostra as <strong>{br(chegam.length)}</strong> solicitações do recorte, porque todas passam por aqui — não porque todas tenham interrupção. Destas, <strong>{br(naJanela.length)}</strong> têm interrupção dentro da janela de 24 horas. {br(duplicadas.length)} delas ficam retidas mesmo assim, porque dividem o mesmo evento com outra SS no mesmo transformador e a interrupção prova uma troca, não duas — sobram <strong>{br(casados.length)}</strong> com fato. Somando <strong>{br(soAtendimento.length)}</strong> que não têm interrupção nenhuma mas têm atendimento de equipe no TMAE, <strong>{br(seguem.length)}</strong> seguem para o deslocamento e <strong>{br(chegam.length - seguem.length)}</strong> param aqui. É essa a conta que aparece na caixa d&apos;água.</p>
          </section>
          <section className="kpi-grid">
            <Kpi rotulo="Passam por esta etapa" valor={br(chegam.length)} nota="todas do recorte: aqui ninguém foi filtrado ainda" tom="ink" />
            <Kpi rotulo="Com interrupção na janela" valor={br(naJanela.length)} nota={`${pct(naJanela.length, chegam.length)}% do recorte`} tom="green" aoClicar={() => abrirRecorte("casou")} />
            <Kpi rotulo="Seguem para o deslocamento" valor={br(seguem.length)} nota={`${br(casados.length)} com fato + ${br(soAtendimento.length)} só com atendimento`} tom="green" />
            <Kpi rotulo="Com ressalva" valor={br(conta((r) => Boolean(texto(r.ressalvas))))} nota="programada, sem cliente, outro elemento" tom="amber" aoClicar={() => abrirRecorte("ressalva")} />
            <Kpi rotulo="Em outra data" valor={br(conta((r) => r.e1_nivel === "FORA"))} nota="o ativo aparece, mas longe da SS" tom="blue" aoClicar={() => abrirRecorte("fora")} />
            <Kpi rotulo="Sem ocorrência" valor={br(conta((r) => r.e1_nivel === "SEM"))} nota="o código não aparece em seis meses" tom="red" aoClicar={() => abrirRecorte("sem")} />
            <Kpi rotulo="Distância mediana" valor={`${mediana(casados.map((r) => Math.abs(Number(r.oc_dist_h) || 0)))} h`} nota={`da SS até a ocorrência — ${br(conta((r) => Number(r.oc_dist_h) === 0))} abrem dentro dela`} tom="ink" />
            <Kpi rotulo="Clientes interrompidos" valor={br(registros.reduce((s, r) => s + (Number(r.oc_cons) || 0), 0))} nota="somados nas ocorrências casadas" tom="ink" />
          </section>
          <section className="janela-controle">
            <span>Janela da interrupção</span>
            <div className="janela-botoes">{[12, 24, 48].map((h) => <button key={h} type="button" className={janela === h ? "ativo" : ""} onClick={() => setJanela(h)}>{h}h</button>)}</div>
            <small>{janela === fluxo.meta.janelaHoras ? "Janela padrão, a mesma da decisão gravada." : `${br(mudamComJanela)} solicitações mudariam de lado com ${janela}h. A decisão gravada continua a de ${fluxo.meta.janelaHoras}h.`}</small>
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
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Chegam neste estágio" valor={br(chegam.length)} nota="passaram pela interrupção" tom="ink" />
            <Kpi rotulo="Com atendimento" valor={br(comAt.length)} nota={`${pct(comAt.length, chegam.length)}% dos que chegam`} tom="green" aoClicar={() => abrirRecorte("corrobora")} />
            <Kpi rotulo="Sem atendimento" valor={br(conta((r) => r.e2_status === "SEM ATENDIMENTO"))} nota="não é contraprova: a base tem lacuna" tom="amber" aoClicar={() => abrirRecorte("semat")} />
            <Kpi rotulo="Na lacuna de janeiro" valor={br(conta((r) => r.tmae_gap_jan === "SIM"))} nota="26 a 31/01 sem nenhum registro" tom="red" aoClicar={() => abrirRecorte("lacuna")} />
            <Kpi rotulo="Achados pela ocorrência" valor={br(conta((r) => r.at2_achado === "SIM"))} nota="equipe deslocou, com o defeito aberto noutro elemento" tom="green" aoClicar={() => abrirRecorte("porocorrencia")} />
            <Kpi rotulo="TMA mediano" valor={`${mediana(comAt.map((r) => Number(r.at_tma) || 0))} min`} nota="atendimento de ponta a ponta" tom="ink" />
            <Kpi rotulo="Deslocamento mediano" valor={`${mediana(comAt.map((r) => Number(r.at_tmd) || 0))} min`} nota="da comunicação até chegar" tom="blue" />
            <Kpi rotulo="Equipes distintas" valor={br(new Set(comAt.map((r) => texto(r.at_equipe))).size)} nota="atenderam as solicitações" tom="ink" />
          </section>
          <section className="dashboard-columns">
            {/* Era "Equipes" e "Subcausa". A equipe diz quem foi, não o que houve — e o que
                interessa nesta etapa é o que o atendimento declarou. Causa e subcausa ocupam o
                painel, as duas clicáveis; quem quiser a equipe continua achando pela busca. */}
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Causa registrada no atendimento</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(comAt, "at_causa", 10)} total={comAt.length} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Campo</span><h2>Subcausa registrada</h2></div><small>clique para filtrar</small></div>
              <Barras dados={contar(comAt, "at_sub", 10)} total={comAt.length} aoSelecionar={(l) => { setBusca(l); setRecorte(null); }} /></article>
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
      /* A quarta peneira é a que fecha o 884 e era a única sem cabeçalho: caía no return null
         e abria direto na lista, sem KPI e sem uma linha explicando o que é uma ressalva.
         Numa aba que decide o número final, isso é o pior lugar para ficar mudo. */
      if (modulo === "ressalva") {
        const entram = registros.filter((r) => r.chega_e3 === "SIM"
          && r.cascata !== "EXCLUÍDO NA LEITURA" && r.cascata !== "RETIDO — SEM PROVA DE TROCA");
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
            <Kpi rotulo="Marcados sem cliente interrompido" valor={br(marcadas.filter((r) => r.sem_cliente_interrompido === "SIM").length)} nota="a ocorrência não penalizou ninguém — sem DEC nem FEC" tom="amber" aoClicar={() => abrirRecorte("sem_cliente")} />
            <Kpi rotulo="Ainda sem sua leitura" valor={br(total - marcadas.length)} nota="seguem só com a decisão do fluxo" tom="ink" />
          </section>
        </>;
      }

      if (modulo === "semfato") {
        // Só entra aqui quem realmente não tem interrupção própria na janela. Quem tem a
        // interrupção mas divide o evento com outra SS saiu daqui e virou SS duplicada.
        const aqui = (r: Registro) => r.cascata === "RETIDO — SEM INTERRUPÇÃO NA JANELA";
        const semFato = registros.filter(aqui);
        const duplicadas = registros.filter((r) => r.cascata === "RETIDO — SS DUPLICADA");
        return <>
        <section className="panel editorial-note wide"><span>O QUE O TEXTO DESSES CASOS DIZ</span>
          <p>Esta etapa retém por dois motivos: {br(semFato.length)} por não terem interrupção na janela e {br(duplicadas.length)} por SS duplicada, que é o painel abaixo. Dentro dos {br(semFato.length)}, a ausência de interrupção não significa a mesma coisa em todos. {br(semFato.filter((r) => r.leitura === "L2").length)} têm texto de furto, abalroamento, preventivo ou auxiliar — e nesses a ausência é esperada, porque não são falha de equipamento. Os outros {br(semFato.filter((r) => r.leitura !== "L2").length)} descrevem queima ou avaria e não deixaram rastro em nenhuma das duas bases: são esses que sobem para investigação.</p>
        </section>
        {duplicadas.length > 0 && (
          <section className="panel editorial-note wide"><span>SAÍRAM DESTA ETAPA NA CORREÇÃO</span>
            <p>{br(duplicadas.length)} SS estavam aqui carimbadas como sem interrupção, mas o próprio registro delas guarda a ocorrência, o horário e a observação do eletricista. O que existe nelas é outra coisa: duas SS abertas para o mesmo transformador e o mesmo evento. A interrupção fica com a SS mais próxima do evento — porque um apagão prova uma troca, não duas — e a outra passa a ser tratada como <strong>SS duplicada</strong>, que é o que ela é. {duplicadas.map((r) => `${texto(r.ss)} (gêmea da ${texto(r.ss_gemea)})`).join(" · ")}.</p>
          </section>
        )}
        <section className="kpi-grid">
          <Kpi rotulo="Sem interrupção na janela" valor={br(conta(aqui))} nota="nada nas duas bases na janela" tom="red" aoClicar={() => abrirRecorte("todos")} />
          <Kpi rotulo="Vizinho encontrado" valor={br(conta((r) => aqui(r) && Boolean(texto(r.vizinho)) && !texto(r.vizinho).startsWith("Nada")))} nota="número operativo provavelmente trocado" tom="amber" aoClicar={() => abrirRecorte("vizinho")} />
          <Kpi rotulo="Nada encontrado" valor={br(conta((r) => aqui(r) && texto(r.vizinho).startsWith("Nada")))} nota="sobe para investigação de campo" tom="red" aoClicar={() => abrirRecorte("nada")} />
          <Kpi rotulo="Casaram em dezembro de 2025" valor={br(conta((r) => r.borda_2025 === "SIM" && String(r.oc_ini || "").startsWith("2025")))} nota="a janela retrocedia para antes de 2026 e a base de dezembro respondeu" tom="green" />
          <Kpi rotulo="Com texto de falha" valor={br(conta((r) => aqui(r) && r.leitura === "L1"))} nota="texto diz queima, campo não registra" tom="amber" />
          <Kpi rotulo="SS duplicada" valor={br(duplicadas.length)} nota="mesmo trafo e mesmo evento de outra SS" tom="amber" aoClicar={() => abrirRecorte("duplicada")} />
        </section></>;
      }
      if (modulo === "expurgos") {
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Parados sem prova de troca" valor={br(paramE3)} nota="a obra não comprova movimentação de transformador" tom="amber" aoClicar={() => abrirRecorte("semprova")} />
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
        const g = (k: string) => conta((r) => texto(r.expurgo_gatilho) === k);
        return <>
          <section className="kpi-grid">
            <Kpi rotulo="Total de exclusões" valor={br(excluidas)} nota="saíram antes da esteira" tom="red" aoClicar={() => abrirRecorte("todos")} />
            <Kpi rotulo="Furto, roubo ou vandalismo" valor={br(g("furto"))} nota="vai para o projeto de ativo furtado" tom="ink" aoClicar={() => abrirRecorte("g_furto")} />
            <Kpi rotulo="Danos a terceiro" valor={br(g("abalroamento"))} nota="colisão de veículo — vira ressarcimento, não indicador" tom="amber" aoClicar={() => abrirRecorte("g_abalro")} />
            <Kpi rotulo="Obra de poste — segurança" valor={br(g("seguranca"))} nota="o transformador desceu com o poste" tom="blue" aoClicar={() => abrirRecorte("g_seg")} />
            <Kpi rotulo="Tape interno" valor={br(g("tap"))} nota="troca para regularizar tensão, não por falha" tom="blue" aoClicar={() => abrirRecorte("g_tap")} />
            <Kpi rotulo="Preventivo ou divisão" valor={br(g("preventivo") + g("divisao"))} nota="obra de capacidade, não falha" tom="blue" aoClicar={() => abrirRecorte("g_prev")} />
            <Kpi rotulo="Construção ou desativação" valor={br(g("construcao") + g("desativacao"))} nota="obra nova ou retirada definitiva" tom="ink" aoClicar={() => abrirRecorte("g_constr")} />
            <Kpi rotulo="Auxiliar de religador" valor={br(g("auxiliar"))} nota="serve ao equipamento, não ao cliente" tom="ink" aoClicar={() => abrirRecorte("g_aux")} />
            <Kpi rotulo="Transformador particular" valor={br(g("particular"))} nota="o ativo é do cliente ou de terceiro" tom="ink" aoClicar={() => abrirRecorte("g_part")} />
            <Kpi rotulo="SS duplicada" valor={br(g("duplicada"))} nota="o mesmo evento contado duas vezes" tom="amber" aoClicar={() => abrirRecorte("g_dup")} />
            <Kpi rotulo="Sem OS e sem obra" valor={br(g("sem_os"))} nota="nada para ler, nada para conferir — investigar" tom="amber" aoClicar={() => abrirRecorte("g_semos")} />
            <Kpi rotulo="Sem fato em base nenhuma" valor={br(g("sem_fato"))} nota="nem ocorrência, nem atendimento, nem vizinho" tom="red" aoClicar={() => abrirRecorte("g_semfato")} />
            <Kpi rotulo="Obra nunca gerada" valor={br(g("sem_obra"))} nota="passou de 60 dias — a prova de material não vem mais" tom="amber" aoClicar={() => abrirRecorte("g_semobra")} />
            <Kpi rotulo="Por presunção, não constatação" valor={br(conta((r) => r.exclusao_presumida === "SIM"))} nota="a equipe supôs a partir do que viu" tom="amber" aoClicar={() => abrirRecorte("presumida")} />
            <Kpi rotulo="Por regra que você pediu" valor={br(conta((r) => r.exclusao_pedida_pelo_dono === "SIM"))} nota="a categoria existe porque você mandou criar" tom="ink" aoClicar={() => abrirRecorte("suas_regras")} />
            <Kpi rotulo="Excluídas por você à mão" valor={br(porClasseNav("EXCLUIDO"))} nota="martelo batido no navegador" tom="ink" aoClicar={() => abrirRecorte("manual")} />
          </section>
          {/* O mesmo analítico que a Interrupção tem: barra por categoria, clicável. Sem ele a
              aba respondia "quantas saíram" e não "por quê", que é a pergunta de quem audita.
              Danos a terceiro ficam separados de furto: um é acidente e vira ressarcimento, o
              outro é crime patrimonial e vai para projeto próprio. Somá-los apaga a diferença. */}
          <section className="dashboard-columns">
            <article className="panel"><div className="panel-title"><div><span>Exclusões</span><h2>Motivo da saída</h2></div><small>clique para filtrar</small></div>
              {/* a barra filtra de verdade: cada rótulo volta ao gatilho que o gerou */}
              <Barras dados={contar(registros.filter((r) => arquivo(r) === "EXCLUÍDA").map((r) => ({ ...r, _g: GATILHO_ROTULO[texto(r.expurgo_gatilho)] || "Marcada por você" })), "_g", 12)} total={excluidas} aoSelecionar={(l) => {
                const chave = Object.entries(GATILHO_ROTULO).find(([, v]) => v === l)?.[0];
                const chip: Record<string, string> = { furto: "g_furto", abalroamento: "g_abalro", preventivo: "g_prev", divisao: "g_div", construcao: "g_constr", desativacao: "g_constr", auxiliar: "g_aux", particular: "g_part", duplicada: "g_dup", sem_os: "g_semos", sem_obra: "g_semobra", seguranca: "g_seg", tap: "g_tap" };
                setBusca(""); abrirRecorte(chave ? chip[chave] || "todos" : "manual");
              }} /></article>
            <article className="panel"><div className="panel-title"><div><span>Exclusões</span><h2>Natureza do motivo</h2></div></div>
              <Barras dados={contar(registros.filter((r) => arquivo(r) === "EXCLUÍDA").map((r) => ({ ...r, _n: NATUREZA[texto(r.expurgo_gatilho)] || "Classificada por você" })), "_n", 8)} total={excluidas} /></article>
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
          <button type="button" className={!recorte ? "ativo" : ""} onClick={() => setRecorte(null)} title="Sai do recorte desta aba e mostra a base inteira.">Todas as SS ({br(comJanela.length)})</button>
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
        {g.itens.map((item) => <button key={item.codigo} className={modulo === item.id && (item.recorte ? recorte?.id === item.recorte : true) ? "active" : ""}
          onClick={() => irPara(item.id, item.recorte)}>
          <b>{item.codigo}</b><em>{item.rotulo}</em>
          {item.entram ? <i className="nav-entram">{br(item.entram)}</i> : null}
          {item.param ? <small title="ficam presos nesta etapa">{br(item.param)}</small> : null}
          {item.marca ? <small className={item.tom === "verde" ? "nav-verde" : "nav-cinza"}>{br(item.marca)}</small> : null}
        </button>)}
      </div>)}</nav>
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
          <em>{classificacao[texto(aberto.ss)]
            ? `${classificacao[texto(aberto.ss)].quem} · ${dataBR(classificacao[texto(aberto.ss)].quando)}`
            : "A decisão do fluxo continua registrada. Isto é a sua leitura ao lado dela."}</em>
        </div>
        <nav>{([["consolidado", "Consolidado"], ["interrupcao", "Interrupção"], ["deslocamento", "Deslocamento"],
                ["ssos", "SS e OS"], ["obra", "Obra e SIGCO"], ["historico", "Histórico do ativo"]] as const).map(([id, rotulo]) => <button key={id}
          className={`${abaDossie === id ? "active" : ""} no-caps`.trim()} onClick={() => setAbaDossie(id)}>{rotulo}</button>)}</nav>
        <div className="drawer-body">
          {abaDossie === "consolidado" && <>
            {texto(aberto.narrativa) ? <article className="narrativa">
              <span>COMO ESTE CASO FOI ANALISADO</span>
              <p>{texto(aberto.narrativa)}</p>
              {Array.isArray(aberto.alertas_narrativa) && (aberto.alertas_narrativa as string[]).length
                ? <ul>{(aberto.alertas_narrativa as string[]).map((a) => <li key={a}>{a}</li>)}</ul> : null}
            </article> : null}
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
              <div><span>Distância da SS</span><strong>{aberto.oc_dist_h !== null ? `${texto(aberto.oc_dist_h)} h` : "—"}</strong></div>
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
            {texto(aberto.vizinho) ? <article className="work-alerts"><span>TESTE DO VIZINHO</span><ul><li>{texto(aberto.vizinho)}</li></ul></article> : null}
            {/* OS PASSOS, UM POR UM. O resumo da ocorrência (primeira abertura, último
                fechamento) apaga o meio do caminho — e é o meio que conta a história: qual
                elemento atuou primeiro, quando o transformador entrou, quantos clientes cada
                manobra atingiu. Cada linha aqui é uma linha da Crítica. */}
            {Array.isArray(aberto.oc_detalhe) && (aberto.oc_detalhe as unknown[]).length ? <>
              <h3>Os passos da ocorrência {texto(aberto.oc_num)}</h3>
              <p className="fonte-detalhe">Base Crítica CHEIO · {(aberto.oc_detalhe as unknown[]).length} passo{(aberto.oc_detalhe as unknown[]).length > 1 ? "s" : ""} de manobra, em ordem de abertura</p>
              <div className="table-scroll"><table className="records-table passos-oc">
                <thead><tr><th>Abertura</th><th>Fechamento</th><th>Elemento com defeito</th><th>Interrompido</th><th>Manobrado para restabelecer</th><th>Clientes</th></tr></thead>
                <tbody>{(aberto.oc_detalhe as Array<Record<string, string>>).map((p, i) => <tr key={i}>
                  <td><strong>{dataBR(p.ini)}</strong></td>
                  <td><strong>{dataBR(p.fim)}</strong></td>
                  <td><code>{p.def || "—"}</code>{p.def === texto(aberto.trafo) ? <span>é este transformador</span> : null}</td>
                  <td><code>{p.int || "—"}</code><span>{p.int_t}</span></td>
                  <td><code>{p.fec || "—"}</code><span>{p.fec_t}</span></td>
                  <td><strong>{p.cons || "0"}</strong></td>
                </tr>)}</tbody>
              </table></div>
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
              <div><span>Transformadores no material</span><strong>{(Number(aberto.trafos_material) || 0) > 0 ? `${texto(aberto.trafos_material)} — a obra movimentou transformador` : "0 — a obra não movimentou transformador"}</strong></div>
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
              <div><span>Material movimentado</span><strong>{(Number(aberto.trafos_material) || 0) > 0 ? `${texto(aberto.trafos_material)} transformador` : "nenhum transformador"}{(Number(aberto.postes_material) || 0) > 0 ? ` · ${texto(aberto.postes_material)} poste` : ""}</strong></div>
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
          </>}
        </div>
      </aside>
    </div> : null}
  </div>;
}
