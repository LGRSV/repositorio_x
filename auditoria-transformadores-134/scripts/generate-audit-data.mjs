import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const [classificationPath, materialPath, crossingPath, worksPath, reprocessPath, outputPath] = process.argv.slice(2);
if (!classificationPath || !materialPath || !crossingPath || !worksPath || !reprocessPath || !outputPath) {
  throw new Error("Uso: node generate-audit-data.mjs classificacao.xlsx material.xlsx cruzamento.xlsx obras.xlsx reprocessamento.xlsx saida.json");
}

const text = (value) => String(value ?? "").trim();
const normalize = (value) =>
  text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const number = (value) => Number(value || 0);
const yes = (value) => normalize(value) === "SIM";
const normalizeId = (value) => text(value).replace(/\D/g, "").replace(/^0+/, "");

function parseDate(value) {
  if (value instanceof Date) return value;
  const [day, month, year] = text(value).split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}
function excelDateLabel(value) {
  if (!value) return "";
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "number") return formatDate(new Date(Date.UTC(1899, 11, 30 + value)));
  return text(value);
}
function toRows(values) {
  const headers = values[0].map(text);
  return values.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])),
  );
}
async function readSheet(file, sheetName) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
  const sheet = workbook.worksheets.items.find((item) => item.name === sheetName);
  if (!sheet) throw new Error(`Aba ${sheetName} não encontrada em ${file}`);
  return toRows(sheet.getUsedRange(true).values);
}
function snippet(source, pattern) {
  const parts = text(source).split(/(?<=[.;:!?])\s+|\n+/).filter(Boolean);
  return (parts.find((part) => pattern.test(normalize(part))) || "").slice(0, 240);
}

const classification = await readSheet(classificationPath, "Classificacao_Definitiva");
const materials = await readSheet(materialPath, "Cruzamento_Material");
const crossings = await readSheet(crossingPath, "Cruzamento");
const works = await readSheet(worksPath, "Export");
const reprocessing = await readSheet(reprocessPath, "Reprocessamento");
const materialBySs = new Map(materials.map((row) => [normalize(row.NUMERO_SS), row]));
const crossingBySs = new Map(crossings.map((row) => [normalize(row.NUMERO_SS), row]));
const workByNumber = new Map(works.map((row) => [normalizeId(row.NUM_OBRA), row]).filter(([key]) => key));
const reprocessBySs = new Map(reprocessing.map((row) => [normalize(row.NUMERO_SS), row]));

function workStageOf(work) {
  const status = normalize(work?.DSC_STATUS);
  if (!Object.keys(work ?? {}).length) return "SEM_OBRA_LOCALIZADA";
  if (work.DTH_ENCERRAMENTO_TECNICO || status.includes("ENCERRAMENTO TECNICO")) return "ENCERRAMENTO_TECNICO";
  if (work.DTH_FISC_APROVADA) return "FISCALIZACAO_APROVADA";
  if (work.DTH_TERMINO_FISICO || work.DATA_CONCLUSAO_FISICA) return "TERMINO_FISICO";
  if (work.DTH_INICIO_FISICO) return "INICIO_FISICO";
  if (status.includes("REPROV")) return "REPROVADA";
  return "SEM_ESTAGIO_PROBATORIO";
}

function classify(row, material, crossing, work, reprocessed) {
  const ss = text(reprocessed?.["DESCRICAO_SS (solicitado)"] || row.DESCRICAO_SS_COMPLETA || row.RESUMO_SS);
  const os = text(reprocessed?.["DESCRICAO_OS (executado)"] || row.DESCRICAO_OS_COMPLETA || row["RESUMO_OS (executado)"]);
  const obra = text(work?.DESCRICAO_OBRA || work?.DESCRICAO || row.DESCRICAO_OBRA || crossing?.DESC_OBRA);
  const all = normalize([ss, os, obra].join(" "));
  const osText = normalize(os);
  const qtdTrafo = Math.max(number(row.QTD_TRAFO), number(material?.QTD_TRAFO), number(crossing?.QTD_TRAFO));
  const qtdPoste = Math.max(number(row.QTD_POSTE), number(material?.QTD_POSTE), number(crossing?.QTD_POSTE));
  const hasTransformerMaterial = qtdTrafo > 0 || normalize(material?.MATERIAL_TRAFO).includes("TRANSF");
  const hasPoleMaterial = qtdPoste > 0;
  const materialConsulted = Boolean(Object.keys(material ?? {}).length);
  const hasOs = yes(row.TEM_OS) && Boolean(text(row.NUMERO_OS));
  const hasWork = yes(row.TEM_OBRA) || Boolean(text(row.NUM_OBRA));
  const workStage = workStageOf(work);
  const terminalMaterialStage = ["TERMINO_FISICO", "FISCALIZACAO_APROVADA", "ENCERRAMENTO_TECNICO"].includes(workStage);
  const workClosed = workStage === "ENCERRAMENTO_TECNICO";

  const explicitTheft = /\b(FURT|ROUB|VANDAL)/.test(all);
  const particular = /\b(PARTICULAR|PROPRIEDADE DO CLIENTE|TERCEIRO)\b/.test(all) || /\b56\d{7,}\b/.test(all);
  const auxiliary = /\b(TRAFO AUXILIAR|TRANSFORMADOR AUXILIAR)\b/.test(all);
  const nonTransformerPrefix = /\b(58|79)\d{7,}\b/.test(all);
  const prefixConflict = nonTransformerPrefix && /\b(TRAFO|TRANSFORMADOR)\b.{0,35}\b(DISTRIBUICAO|REDE)\b/.test(all);
  const construction = /\b(CONSTRUCAO|DESATIVACAO|RETIRADA DEFINITIVA|DESLIGAMENTO DEFINITIVO)\b/.test(all);
  const vehicle = /\b(ABALRO|COLISA|VEICUL|ATROPEL|BATID)\w*/.test(all);
  const damagedPole = /\bPOSTE\b.{0,45}\b(QUEBR|TOMB|INCLIN|DETERIOR|DANIFIC)\w*/.test(all);
  const negatedBurn = /\b(NAO|SEM)\b.{0,28}\bQUEIM\w*/.test(all);
  const negatedDefect = /\b(NAO|SEM)\b.{0,28}\b(DEFEIT|AVARI)\w*/.test(all);
  const burned = /\bQUEIM\w*/.test(all) && !negatedBurn;
  const damaged = /\b(AVARI|VAZAMENTO|BUCHA|ESTOUR|DANIFIC|DEFEIT)\w*/.test(all) && !negatedDefect;
  const repairOnly = /\b(COLA|FITA|REPARO|REPARAR)\b/.test(all) && !hasTransformerMaterial;
  const overload = /\b(SOBRECARG|ALTERANDO TAP|ALTERAR TAP|PREVENTIV)\w*/.test(all);
  const groundWithoutCause = /\b(TRAFO|TRANSFORMADOR)\b.{0,25}\b(NO CHAO|AUSENTE|SUMIU)\b/.test(all) && !explicitTheft;
  const action = /\b(SUBSTITU|TROCA|INSTALA.+NOVO)\w*/.test(osText)
    ? "SUBSTITUIDO"
    : /\b(COLA|FITA|REPAR)\w*/.test(osText)
      ? "REPARADO"
      : /\b(INSPEC|VISTOR)\w*/.test(osText)
        ? "INSPECIONADO"
        : /\b(DESATIV|RETIRADA DEFINITIVA)\w*/.test(osText)
          ? "DESATIVADO"
          : hasOs ? "INDETERMINADA" : "NAO_EXECUTADO";
  const materialEvidence = !materialConsulted
    ? "SEM_CONSULTA"
    : hasTransformerMaterial && hasPoleMaterial
      ? "TRAFO_E_POSTE"
      : hasTransformerMaterial ? "TRAFO_MOVIMENTADO" : "SEM_TRAFO";

  let decision = "REVISAO_MANUAL";
  let condition = "INDETERMINADA";
  let cause = "INDETERMINADA";
  let ruleId = "R-OUT-01";
  let rationale = "Texto genérico ou evidências insuficientes; requer análise manual.";
  let confidence = 54;
  let needsReview = true;
  let provisional = false;
  const flags = [];
  const conflicts = [];
  if (negatedBurn || negatedDefect) conflicts.push("Negação textual impede gatilho simples.");

  if (explicitTheft) {
    [decision, condition, cause, ruleId, rationale, confidence, needsReview] = [
      "EXPURGAR", burned ? "QUEIMADO" : damaged ? "AVARIADO" : "INDETERMINADA",
      "FURTO_VANDALISMO", "R-EXP-01", "Furto, roubo ou vandalismo explicitamente descrito.", 96, false,
    ];
  } else if (particular) {
    [decision, condition, cause, ruleId, rationale, confidence, needsReview] = [
      "EXPURGAR", burned ? "QUEIMADO" : damaged ? "AVARIADO" : "INDETERMINADA",
      "PARTICULAR", "R-EXP-02", "Equipamento particular/terceiro ou prefixo 56 identificado.", 94, false,
    ];
  } else if (prefixConflict) {
    condition = burned ? "QUEIMADO" : damaged ? "AVARIADO" : "INDETERMINADA";
    cause = "EQUIPAMENTO_ESPECIAL";
    rationale = "Prefixo 58/79 conflita com narrativa de transformador de distribuição.";
    confidence = 58;
    conflicts.push("Código operativo e texto descrevem equipamentos diferentes.");
  } else if (auxiliary || nonTransformerPrefix) {
    [decision, condition, cause, ruleId, rationale, confidence, needsReview] = [
      "EXPURGAR", burned ? "QUEIMADO" : damaged ? "AVARIADO" : "INDETERMINADA",
      auxiliary ? "TRAFO_AUXILIAR" : "EQUIPAMENTO_ESPECIAL", "R-EXP-03",
      "Transformador auxiliar, regulador ou religador não integra o indicador principal.", 93, false,
    ];
  } else if (construction) {
    [decision, condition, cause, ruleId, rationale, confidence, needsReview] = [
      "EXPURGAR", burned ? "QUEIMADO" : damaged ? "AVARIADO" : "INDETERMINADA",
      "CONSTRUCAO_DESATIVACAO", "R-EXP-04", "Construção, nova ligação ou desativação identificada.", 90, false,
    ];
  } else if (vehicle || damagedPole) {
    [decision, condition, cause, ruleId, rationale, confidence, needsReview] = [
      "EXPURGAR", burned ? "QUEIMADO" : damaged ? "AVARIADO" : "INDETERMINADA",
      "ABALROAMENTO", damagedPole ? "R-REV-01" : "R-EXP-05",
      "Abalroamento ou poste quebrado/deteriorado: expurgar e enviar à revisão.", 86, true,
    ];
    flags.push("Fila Revisões", "Possível abalroamento");
  } else if (groundWithoutCause) {
    condition = "INDETERMINADA";
    cause = "POSSIVEL_FURTO_OU_ABALROAMENTO";
    ruleId = "R-ALT-01";
    rationale = "Trafo no chão/unidade ausente sem causa explícita.";
    confidence = 72;
    flags.push("Possível furto ou abalroamento");
  } else if (!hasOs) {
    condition = burned ? "QUEIMADO" : damaged ? "AVARIADO" : "INDETERMINADA";
    cause = "SEM_OS";
    ruleId = "R-SEM-01";
    rationale = "Sem OS há mais de 15 dias corridos: análise manual sem contabilização.";
    confidence = 84;
    flags.push("Responsável: Matheus Gracia");
  } else if (repairOnly) {
    [decision, condition, cause, ruleId, rationale, confidence, needsReview] = [
      "EXPURGAR", "AVARIADO", "REPARO_SEM_SUBSTITUICAO", "R-AVA-02",
      "Reparo com cola/fita sem movimentação de transformador.", 89, false,
    ];
  } else if (overload && !hasTransformerMaterial) {
    [decision, condition, cause, ruleId, rationale, confidence, needsReview] = [
      "EXPURGAR", burned ? "QUEIMADO" : damaged ? "AVARIADO" : "SEM_DEFEITO_COMPROVADO",
      "SOBRECARGA_TAP_PREVENTIVO", "R-OPS-02",
      "TAP, sobrecarga ou preventivo sem movimentação de transformador.", 88, false,
    ];
  } else if (overload && hasTransformerMaterial) {
    condition = burned ? "QUEIMADO" : damaged ? "AVARIADO" : "INDETERMINADA";
    cause = "SOBRECARGA";
    ruleId = burned ? "R-SIG-03" : "R-OPS-01";
    rationale = "Troca por TAP/sobrecarga/preventivo exige análise técnica e por SIGCO.";
    confidence = 82;
  } else if (burned && hasTransformerMaterial && hasPoleMaterial) {
    condition = "QUEIMADO";
    cause = "QUEIMA";
    ruleId = "R-QUE-02";
    rationale = "Queimado com trafo e poste movimentados exige investigação estrutural.";
    confidence = 84;
    flags.push("Trafo + poste");
  } else if (burned && hasTransformerMaterial) {
    [decision, condition, cause, ruleId, rationale, confidence, needsReview] = [
      "INCLUIR", "QUEIMADO", "QUEIMA", "R-QUE-01",
      "Queima explícita, somente transformador movimentado e sem contraponto.", 95, false,
    ];
  } else if (burned) {
    condition = "QUEIMADO";
    cause = "QUEIMA";
    rationale = "Queimado sem trafo; falta estágio da obra para decidir o expurgo.";
    confidence = 67;
    flags.push("Status da obra ausente");
  } else if (damaged && hasTransformerMaterial && hasPoleMaterial) {
    condition = "AVARIADO";
    cause = "AVARIA";
    rationale = "Avaria com trafo e poste movimentados exige investigação estrutural.";
    confidence = 72;
    flags.push("Trafo + poste");
  } else if (damaged && hasTransformerMaterial) {
    [decision, condition, cause, ruleId, rationale, confidence, needsReview] = [
      "INCLUIR", "AVARIADO", "AVARIA", "R-AVA-01",
      "Avaria explícita e substituição comprovada por material.", 92, false,
    ];
  } else if (damaged) {
    condition = "AVARIADO";
    cause = "AVARIA";
    rationale = "Avaria sem trafo e sem reparo conclusivo; não assumir substituição.";
    confidence = 64;
  } else if (hasTransformerMaterial && !hasPoleMaterial && !negatedBurn && !negatedDefect) {
    decision = "PROVISORIO";
    condition = "QUEIMADO";
    cause = "SUBSTITUICAO_INFERIDA";
    ruleId = "R-SUB-01";
    rationale = "Só transformador movimentado, sem contraponto: queimado provisório + revisão.";
    confidence = 58;
    provisional = true;
  } else if (!materialConsulted) {
    cause = "CONSULTA_AUSENTE";
    rationale = "Consulta de materiais ausente; não tratar como ausência de movimentação.";
    confidence = 42;
  }

  if (!hasTransformerMaterial && terminalMaterialStage && ["QUEIMADO", "AVARIADO"].includes(condition) && decision !== "EXPURGAR") {
    decision = "EXPURGAR";
    ruleId = condition === "QUEIMADO" ? "R-QUE-03" : "R-MAT-01";
    rationale = `Sem movimentação de transformador e obra em ${workStage.replaceAll("_", " ").toLowerCase()}.`;
    confidence = 91;
    needsReview = false;
  } else if (decision === "INCLUIR" && Object.keys(work ?? {}).length && !workClosed) {
    decision = "PROVISORIO";
    ruleId = "R-PRO-01";
    rationale = `Condição incluível com material, mas a obra está em ${workStage.replaceAll("_", " ").toLowerCase()}; fora do total oficial.`;
    confidence = Math.min(confidence, 80);
    needsReview = true;
    provisional = true;
    flags.push("Obra não encerrada");
  }

  const sigco = normalize(row.SIGCO).replace(/\.0$/, "");
  let sigcoReview = false;
  let sigcoCoherence = "INDETERMINADO";
  let suggestedSigco = "";
  let sigcoReason = "Código sem conclusão automática.";
  if (sigco === "25983") {
    sigcoReview = true;
    sigcoCoherence = "ANALISE_OBRIGATORIA";
    sigcoReason = "25983 é permitido, mas sempre segue à análise por SIGCO.";
  } else if (sigco === "20497") {
    sigcoCoherence = cause === "ABALROAMENTO" ? "COERENTE" : "POTENCIALMENTE_ERRADO";
    sigcoReview = sigcoCoherence !== "COERENTE";
    sigcoReason = "20497 é o código corrigido para a regra administrativa de abalroamento.";
  } else if (sigco === "8385") {
    sigcoCoherence = overload ? "COERENTE" : "POTENCIALMENTE_ERRADO";
    sigcoReview = sigcoCoherence !== "COERENTE";
    sigcoReason = overload ? "8385 coerente com finalidade operacional." : "8385 não comprova falha do transformador.";
  } else if (sigco === "8812") {
    sigcoCoherence = condition === "QUEIMADO" ? "COERENTE" : "POTENCIALMENTE_ERRADO";
    sigcoReview = sigcoCoherence !== "COERENTE";
    suggestedSigco = condition === "AVARIADO" ? "25962" : "";
    sigcoReason = "8812 é esperado para transformador queimado.";
  } else if (sigco === "25962") {
    sigcoCoherence = condition === "AVARIADO" ? "COERENTE" : "POTENCIALMENTE_ERRADO";
    sigcoReview = sigcoCoherence !== "COERENTE";
    sigcoReason = "25962 é esperado para transformador avariado.";
  } else if (["8481", "8495"].includes(sigco)) {
    sigcoCoherence = auxiliary || nonTransformerPrefix ? "COERENTE" : "POTENCIALMENTE_ERRADO";
    sigcoReview = sigcoCoherence !== "COERENTE";
    sigcoReason = "Código de regulador/religador deve corresponder a equipamento auxiliar.";
  } else if (["INCLUIR", "PROVISORIO"].includes(decision) || normalize(row.CONFERE_OBRA) === "DIVERGE") {
    sigcoReview = true;
    sigcoCoherence = "POTENCIALMENTE_ERRADO";
    sigcoReason = "Código não mapeado ou divergência operacional.";
  }
  if (sigcoReview) flags.push("Análise do SIGCO");
  if (normalize(row.CONFERE_OBRA) === "DIVERGE") {
    flags.push("Divergência com a obra");
    conflicts.push("CONFERE_OBRA = DIVERGE.");
  }
  if (normalize(crossing?.["BATE?"]) === "NAO") {
    flags.push("Cruzamento obra/material não confere");
    conflicts.push("BATE? = NAO.");
  }

  const causePattern = /(FURT|ROUB|VANDAL|ABALRO|COLISA|VEICUL|SOBRECARG|TAP|PARTICULAR|DESATIV|CONSTRUCAO)/;
  const conditionPattern = /(QUEIM|AVARI|VAZAMENTO|BUCHA|ESTOUR|DEFEIT|DANIFIC)/;
  const actionPattern = /(SUBSTITU|TROCA|INSTALA|COLA|FITA|REPAR|INSPEC|DESATIV)/;
  const evidence = {
    cause: { ss: snippet(ss, causePattern), os: snippet(os, causePattern) },
    condition: { ss: snippet(ss, conditionPattern), os: snippet(os, conditionPattern) },
    action: { ss: snippet(ss, actionPattern), os: snippet(os, actionPattern) },
  };
  const confidenceLabel = confidence >= 85 ? "ALTA" : confidence >= 60 ? "MEDIA" : "BAIXA";
  if (confidenceLabel === "BAIXA") needsReview = true;
  const validations = [];
  if (decision === "INCLUIR" && !["QUEIMADO", "AVARIADO"].includes(condition)) validations.push("V-01");
  if (sigcoReview && sigcoCoherence === "POTENCIALMENTE_ERRADO") validations.push("V-08");
  if (provisional && decision === "INCLUIR") validations.push("V-15");

  return {
    decision, condition, cause, action, materialEvidence, ruleId, rationale,
    confidence, confidenceLabel, needsReview, provisional, sigcoReview,
    sigcoCoherence, suggestedSigco, sigcoReason,
    flcRecommended: sigcoReview, flcReason: sigcoReview ? sigcoReason : "",
    evidence, conflicts, validations, flags: [...new Set(flags)],
    signals: {
      explicitTheft, particular, auxiliary, nonTransformerPrefix,
      vehicle: vehicle || damagedPole, burned, damaged, overload,
      hasTransformerMaterial, hasPoleMaterial, materialConsulted, hasOs, hasWork, workClosed,
    },
    p3: {
      event: `${action.replaceAll("_", " ").toLowerCase()} — ${cause.replaceAll("_", " ").toLowerCase()}`,
      cause: `${cause} · ${evidence.cause.ss || evidence.cause.os || "sem trecho conclusivo"}`,
      condition, action,
      materials: `${materialEvidence} · ${qtdTrafo} trafo(s) · ${qtdPoste} poste(s) · estágio ${workStage}`,
      materialAlert: groundWithoutCause ? "POSSIVEL_FURTO_OU_ABALROAMENTO" : flags.includes("Trafo + poste") ? "POSSIVEL_ABALROAMENTO" : "NENHUM",
      conflicts: conflicts.length ? conflicts.join(" ") : "NENHUM",
      sigco: `${sigco || "não informado"} · ${sigcoCoherence}${suggestedSigco ? ` · sugerido ${suggestedSigco}` : ""}`,
      decision, ruleId, rationale, confidence: confidenceLabel,
    },
  };
}

const records = classification.map((row, index) => {
  const key = normalize(row.NUMERO_SS);
  const material = materialBySs.get(key) ?? {};
  const crossing = crossingBySs.get(key) ?? {};
  const work = workByNumber.get(normalizeId(row.NUM_OBRA)) ?? {};
  const reprocessed = reprocessBySs.get(key) ?? {};
  const result = classify(row, material, crossing, work, reprocessed);
  const openedAt = parseDate(row.DATA_ABERTURA);
  return {
    id: `AUD-209-${String(index + 1).padStart(3, "0")}`,
    line: number(row.LINHA),
    ss: text(row.NUMERO_SS),
    os: text(row.NUMERO_OS) || "Sem OS",
    sigco: text(row.SIGCO) || "Não informado",
    openedAt: openedAt.toISOString(),
    openedAtLabel: formatDate(openedAt),
    month: openedAt.getUTCMonth() + 1,
    source: {
      categoryText: text(row.CATEGORIA_TEXTO),
      classification: text(row["CLASSIFICACAO FINAL"]),
      group: text(row.GRUPO),
      reason: text(row.MOTIVO),
      materialRevisedCause: text(material.CAUSA_REVISADA),
      crossingFinalCategory: text(crossing.CAT_FINAL),
      hasOs: text(row.TEM_OS),
      hasWork: text(row.TEM_OBRA),
      workNumber: text(row.NUM_OBRA),
      workDescription: text(row.DESCRICAO_OBRA || crossing.DESC_OBRA),
      workCategory: text(row.CATEGORIA_PELA_OBRA || crossing.CAT_OBRA),
      workMatch: text(row.CONFERE_OBRA),
      crossingMatch: text(crossing["BATE?"]),
      ssDescription: text(reprocessed["DESCRICAO_SS (solicitado)"] || row.DESCRICAO_SS_COMPLETA || row.RESUMO_SS),
      osDescription: text(reprocessed["DESCRICAO_OS (executado)"] || row.DESCRICAO_OS_COMPLETA || row["RESUMO_OS (executado)"]),
      originalSsDescription: text(row.DESCRICAO_SS_COMPLETA || row.RESUMO_SS),
      originalOsDescription: text(row.DESCRICAO_OS_COMPLETA || row["RESUMO_OS (executado)"]),
      reprocessedCategory: text(reprocessed.CATEGORIA),
      reprocessedReason: text(reprocessed.MOTIVO),
      ssSummary: text(row.RESUMO_SS),
      osSummary: text(row["RESUMO_OS (executado)"]),
    },
    work: {
      matched: Boolean(Object.keys(work).length),
      number: text(work.NUM_OBRA || row.NUM_OBRA),
      status: text(work.DSC_STATUS),
      occurrence: text(work.DSC_OCORRENCIA),
      sigcoProject: text(work.NUM_PROJETO_SIGCO),
      description: text(work.DESCRICAO_OBRA || work.DESCRICAO),
      constructionMaintenance: text(work.CONST_MANUT),
      stage: workStageOf(work),
      openedAt: excelDateLabel(work.DTH_ABERTURA),
      startedAt: excelDateLabel(work.DTH_INICIO_FISICO),
      physicalEndAt: excelDateLabel(work.DTH_TERMINO_FISICO || work.DATA_CONCLUSAO_FISICA),
      inspectionApprovedAt: excelDateLabel(work.DTH_FISC_APROVADA),
      technicalClosedAt: excelDateLabel(work.DTH_ENCERRAMENTO_TECNICO),
    },
    material: {
      transformerQty: Math.max(number(row.QTD_TRAFO), number(material.QTD_TRAFO), number(crossing.QTD_TRAFO)),
      poleQty: Math.max(number(row.QTD_POSTE), number(material.QTD_POSTE), number(crossing.QTD_POSTE)),
      transformer: text(material.MATERIAL_TRAFO),
      assessment: text(material.AVALIACAO),
      flag: text(material.FLAG),
      mappingVersion: "caso-209/2026-07-25",
      queryStatus: Object.keys(material).length ? "CONSULTA_REALIZADA" : "CONSULTA_AUSENTE",
    },
    workflow: {
      state: "PENDENTE_APROVACAO",
      revision: 1,
      official: false,
      responsible: result.needsReview ? "Matheus Gracia" : "Fila de aprovação",
    },
    result,
    approval: {
      status: "PENDENTE_APROVACAO",
      reviewer: "Matheus Gracia",
      history: [{
        at: "25/07/2026 10:00",
        actor: "Claude · motor de regras",
        action: "Análise proposta",
        detail: `${result.ruleId} — ${result.rationale}`,
      }],
    },
  };
});

const countBy = (selector) => records.reduce((acc, record) => {
  const key = selector(record);
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
const monthly = [1, 2, 3, 4, 5, 6].map((month) => {
  const rows = records.filter((record) => record.month === month);
  return {
    month, total: rows.length,
    officialBurned: 0, officialDamaged: 0,
    proposedBurned: rows.filter((record) => record.result.decision === "INCLUIR" && record.result.condition === "QUEIMADO").length,
    proposedDamaged: rows.filter((record) => record.result.decision === "INCLUIR" && record.result.condition === "AVARIADO").length,
    review: rows.filter((record) => record.result.decision === "REVISAO_MANUAL" || record.result.needsReview).length,
    provisional: rows.filter((record) => record.result.provisional).length,
    expunged: rows.filter((record) => record.result.decision === "EXPURGAR").length,
  };
});
const payload = {
  meta: {
    generatedAt: "25/07/2026 10:00",
    period: { start: "01/01/2026", end: "30/06/2026" },
    total: records.length,
    reviewer: "Matheus Gracia",
    environment: "Protótipo local",
    manualVersion: "0.99.1",
    sourceFiles: [
      path.basename(classificationPath), path.basename(materialPath), path.basename(crossingPath),
      path.basename(worksPath), path.basename(reprocessPath),
    ],
    notes: [
      "Unidade oficial: uma OS.",
      "Mês definido pela abertura da SS.",
      "Nenhum registro compõe o total oficial antes da aprovação.",
      "A base de obras foi vinculada por NUM_OBRA; ausências permanecem explícitas.",
      "O reprocessamento XML acrescenta texto e categoria, mas não é fonte de materiais.",
    ],
  },
  importBatch: {
    id: "LOT-209-2026-001",
    status: "PRE_VALIDADO",
    files: 7,
    read: 209,
    valid: 209,
    errors: 0,
    alerts: records.filter((record) => record.result.flags.length).length,
    duplicates: 0,
    outsidePeriod: 0,
    reconciliation: { new: 0, equal: 193, changed: 16, conflicting: 82, notFound: 14 },
    changes: { classifications: 5, groups: 5, reasons: 11 },
    worksMatched: records.filter((record) => record.work.matched).length,
    worksNotMatched: records.filter((record) => !record.work.matched).length,
  },
  summary: {
    official: { total: 0, burned: 0, damaged: 0 },
    proposals: {
      burned: records.filter((record) => record.result.decision === "INCLUIR" && record.result.condition === "QUEIMADO").length,
      damaged: records.filter((record) => record.result.decision === "INCLUIR" && record.result.condition === "AVARIADO").length,
      provisional: records.filter((record) => record.result.provisional).length,
    },
    decisions: countBy((record) => record.result.decision),
    conditions: countBy((record) => record.result.condition),
    rules: countBy((record) => record.result.ruleId),
    sigcoReview: records.filter((record) => record.result.sigcoReview).length,
    manualReview: records.filter((record) => record.result.needsReview || record.result.decision === "REVISAO_MANUAL").length,
    conflicts: records.filter((record) => record.result.conflicts.length).length,
    monthly,
  },
  records,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload.summary, null, 2));
