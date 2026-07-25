import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Uso: node generate-134-data.mjs Painel_134_Completo.xlsx public/auditorias.json");

const text = (value) => String(value ?? "").trim();
const normalize = (value) =>
  text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const number = (value) => Number(value || 0);
const money = (value) => Math.round(number(value) * 100) / 100;
const excelDate = (value) => {
  if (!value) return "";
  if (typeof value === "number") return new Date(Date.UTC(1899, 11, 30 + value)).toISOString().slice(0, 10);
  const match = text(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text(value);
};
const dateLabel = (value) => {
  const iso = excelDate(value);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
};
const rowsFrom = (sheet, headerIndex = 0) => {
  const values = sheet.getUsedRange(true)?.values ?? [];
  const headers = values[headerIndex].map(text);
  return values.slice(headerIndex + 1)
    .filter((row) => row.some((value) => value !== null && value !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
};
const extract = (source, pattern) => {
  const sentences = text(source).split(/(?<=[.;!?])\s+|\n+/).filter(Boolean);
  return (sentences.find((item) => pattern.test(normalize(item))) || sentences[0] || "").slice(0, 260);
};
// Prazo sempre contado contra a maior data de abertura de SS observada na base, nunca contra a data de hoje.
const REFERENCE_DATE = "2026-06-25";
const DEADLINE_DAYS = 60;
const daysUntilReference = (iso) => {
  const match = text(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const opened = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const [ry, rm, rd] = REFERENCE_DATE.split("-").map(Number);
  return Math.round((Date.UTC(ry, rm - 1, rd) - opened) / 86400000);
};
const counts = (items, getter) =>
  [...items.reduce((map, item) => {
    const key = getter(item) || "Não informado";
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map())].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(input));
const sheet = (name) => {
  const found = workbook.worksheets.items.find((item) => item.name === name);
  if (!found) throw new Error(`Aba ${name} não encontrada.`);
  return found;
};
const ssRows = rowsFrom(sheet("SS_OS"));
const fullSsRows = rowsFrom(sheet("SS_OS_COMPLETA"));
const workRows = rowsFrom(sheet("Obras"));
const fullWorkRows = rowsFrom(sheet("OBRAS_COMPLETA"));
const analyticRows = rowsFrom(sheet("Base_Analitica"), 2);

const fullSsBySs = new Map(fullSsRows.map((row) => [normalize(row.NUMERO_SS), row]));
const workBySs = new Map(workRows.map((row) => [normalize(row.SS), row]));
const fullWorkBySs = new Map(fullWorkRows.map((row) => [normalize(row.NUMERO_SS), row]));
const analyticBySs = new Map(analyticRows.map((row) => [normalize(row.NUMERO_SS), row]));

function evaluate(base, full, work, fullWork, analytic, index) {
  const ssDescription = text(base["SS(solic)"] || full.DESCRIPTION);
  const osDescription = text(base["OS(exec)"] || full.DESCRICAO_OS);
  const workDescription = text(work.DESC_OBRA || fullWork.DESCRICAO || fullWork.DESCRICAO_OBRA);
  const all = normalize([ssDescription, osDescription, workDescription].join(" "));
  const osOnly = normalize(osDescription);
  const asset = normalize([full.NUM_TRAFO, ssDescription, osDescription].join(" "));
  const transformerQty = number(work.TRAFOS);
  const poleQty = number(work.POSTES);
  const hasTransformer = transformerQty > 0;
  const terminal = Boolean(
    fullWork.DTH_ENCERRAMENTO_TECNICO || fullWork.DTH_TERMINO_FISICO ||
    fullWork.DTH_FISC_APROVADA || normalize(work.STATUS).includes("ENCERRAMENTO TECNICO") ||
    normalize(work.STATUS).includes("FISCALIZACAO APROVADA"),
  );
  const workMissing = !text(work.NUM_OBRA);
  const workClass = text(fullWork.CLASS_OBRA);
  const workNature = text(fullWork.CONST_MANUT);
  const workKind = text(fullWork.TIPO_OBRA);
  const expenseOrder = normalize(workClass).includes("DESPESA");
  const openedIso = excelDate(base.DATA);
  const ssAgeDays = daysUntilReference(openedIso);
  const overdueWork = workMissing && ssAgeDays !== null && ssAgeDays > DEADLINE_DAYS;
  const kindDivergent = !workMissing &&
    (normalize(workNature) !== "MANUTENCAO" || normalize(workKind) !== "MANUTENCAO CORRET EMERGENCIAL");
  const workAlerts = [];
  if (expenseOrder) workAlerts.push(`R-OBR-01 · Obra em CLASS_OBRA = ${workClass}: não imobiliza o ativo, incorporação a confirmar.`);
  if (workMissing) {
    workAlerts.push(overdueWork
      ? `R-OBR-02 · Obra não gerada há ${ssAgeDays} dias da abertura da SS (limite de ${DEADLINE_DAYS}).`
      : `R-OBR-02 · Obra ainda não gerada, ${ssAgeDays} dias da abertura da SS (dentro do limite de ${DEADLINE_DAYS}).`);
  }
  if (kindDivergent) workAlerts.push(`R-OBR-03 · Obra fora de manutenção corretiva emergencial (${workNature || "—"} / ${workKind || "—"}).`);

  const theft = /\b(FURT|ROUB|VANDAL)/.test(all);
  const particular = /\b(PARTICULAR|PROPRIEDADE DO CLIENTE|TERCEIRO)\b/.test(all) || /\b56\d{7,}\b/.test(asset);
  const auxiliary = /\b(TRAFO AUXILIAR|TRANSFORMADOR AUXILIAR)\b/.test(all);
  const specialAsset = /\b(58|79)\d{7,}\b/.test(asset);
  const construction = /\b(CONSTRUCAO|DESATIVACAO|RETIRADA DEFINITIVA|DESLIGAMENTO DEFINITIVO|NOVA LIGACAO)\b/.test(all);
  const collision = /\b(ABALRO|COLISA|VEICUL|BATID|DANO.+TERCEIR)\w*/.test(all);
  const damagedPole = /\bPOSTE\b.{0,70}\b(QUEBR|TOMB|INCLIN|DETERIOR|DANIFIC)\w*/.test(all) || poleQty > 0;
  const overload = /\b(SOBRECARG|ALTERANDO TAP|ALTERAR TAP|TAP|PREVENTIV)\w*/.test(all);
  const burned = /\bQUEIM\w*/.test(all) && !/\b(NAO|SEM)\b.{0,25}\bQUEIM/.test(all);
  const damaged = /\b(AVARI|VAZAMENTO|BUCHA|ESTOUR|DANIFIC|DEFEIT|TENSAO BAIXA)\w*/.test(all);
  const repaired = /\b(COLA|FITA|REPAR)\w*/.test(osOnly);
  const substituted = /\b(SUBSTITU|TROCA|RETIRADO|INSTALADO)\w*/.test(osOnly);
  const ground = /\b(TRAFO|TRANSFORMADOR)\b.{0,30}\b(NO CHAO|AUSENTE|SUMIU)\b/.test(all) && !theft;

  let decision = "REVISÃO MANUAL";
  let cause = "Evidência insuficiente";
  let rule = "R-REV-00";
  let rationale = "A decisão não pode ser fechada automaticamente com as evidências disponíveis.";
  let confidence = 58;
  let automaticExpurge = false;
  let review = true;
  const flags = [];

  if (theft) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["EXPURGAR", "Furto ou vandalismo", "R-EXP-01", "Furto, roubo ou vandalismo está explicitamente descrito.", 97, true, false];
  } else if (particular) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["EXPURGAR", "Equipamento particular", "R-EXP-02", "Equipamento particular/terceiro ou prefixo 56 identificado.", 95, true, false];
  } else if (auxiliary || specialAsset) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["EXPURGAR", auxiliary ? "Transformador auxiliar" : "Regulador/religador", "R-EXP-03", "O ativo não integra o indicador principal de transformadores.", 94, true, false];
  } else if (construction) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["EXPURGAR", "Construção ou desativação", "R-EXP-04", "A ocorrência está ligada a construção, nova ligação ou desativação.", 92, true, false];
  } else if (collision || damagedPole) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["EXPURGAR", "Possível furto ou abalroamento", "R-EXP-05", "Abalroamento, dano de terceiros ou movimentação de poste exige expurgo e reavaliação.", 87, true, true];
    flags.push("Fila de Revisões", "Possível furto ou abalroamento");
  } else if (!hasTransformer && terminal) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["EXPURGAR", "Sem movimentação de transformador", "R-MAT-01", "A obra está em etapa terminal sem movimentação de transformador.", 93, true, false];
  } else if (workMissing) {
    // R-OBR-02 — sem obra não existe consulta SIAGO nem prova de troca; até 60 dias a SS ainda pode gerar obra.
    if (overdueWork) {
      [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
        ["EXPURGAR", "Obra não gerada em 60 dias", "R-OBR-02",
          `A SS foi aberta há ${ssAgeDays} dias e nenhuma obra foi gerada. Sem obra não existe consulta SIAGO, movimentação de material nem encerramento, então não há como provar a troca do transformador.`,
          88, true, false];
      flags.push("Regra de obra");
    } else {
      [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
        ["PENDENTE TEMPORAL", "Obra ainda não gerada", "R-OBR-02",
          `A SS foi aberta há ${ssAgeDays} dias e a obra ainda pode ser gerada dentro do prazo de ${DEADLINE_DAYS} dias. O caso fica pendente até a obra aparecer ou o prazo vencer.`,
          60, false, true];
      flags.push("Regra de obra", "Pendência temporal");
    }
  } else if (ground) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["REVISÃO MANUAL", "Possível furto ou abalroamento", "R-REV-03", "Transformador no chão ou ausente sem causa explícita.", 68, false, true];
    flags.push("Possível furto ou abalroamento");
  } else if (overload) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["REVISÃO MANUAL", "Sobrecarga/TAP", "R-SIG-01", "Sobrecarga ou ajuste de TAP deve ser avaliado pelo SIGCO antes da decisão.", 76, false, true];
    flags.push("Análise por SIGCO");
  } else if (repaired && !hasTransformer) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["EXPURGAR", "Reparo sem substituição", "R-AVA-02", "A OS indica reparo e não há movimentação do transformador.", 90, true, false];
  } else if (hasTransformer && (burned || normalize(base.CAT) === "QUEIMADO")) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["INCLUIR", "Queima confirmada", "R-QUE-01", "Queima e substituição possuem evidência convergente em SS, OS e material.", 94, false, false];
  } else if (hasTransformer && (damaged || normalize(base.CAT) === "AVARIADO")) {
    [decision, cause, rule, rationale, confidence, automaticExpurge, review] =
      ["INCLUIR", "Avaria confirmada", "R-AVA-01", "Avaria e substituição possuem evidência convergente em SS, OS e material.", 92, false, false];
  }

  // R-OBR-01 e R-OBR-03 não mudam a decisão: obrigam análise manual antes de o caso contar no indicador.
  if (expenseOrder) {
    review = true;
    flags.push("Ordem de despesa", "Análise manual");
  }
  if (kindDivergent) {
    review = true;
    flags.push("Natureza da obra", "Análise manual");
  }

  const sigco = text(base.SIGCO);
  let sigcoStatus = "Analisar";
  let sigcoReason = "Código sem regra conclusiva; validar contra a causa e a condição.";
  if (sigco === "20497") {
    sigcoStatus = collision || damagedPole ? "Coerente" : "Divergente";
    sigcoReason = "20497 é o código corrigido para abalroamento.";
  } else if (sigco === "25983") {
    sigcoStatus = "Análise obrigatória";
    sigcoReason = "25983 é permitido, mas sempre exige análise por SIGCO.";
  } else if (sigco === "8812") {
    sigcoStatus = normalize(base.CAT) === "QUEIMADO" ? "Coerente" : "Divergente";
    sigcoReason = "8812 é esperado para transformador queimado.";
  } else if (sigco === "25962") {
    sigcoStatus = normalize(base.CAT) === "AVARIADO" ? "Coerente" : "Divergente";
    sigcoReason = "25962 é esperado para transformador avariado.";
  } else if (sigco === "8385") {
    sigcoStatus = overload ? "Coerente com finalidade" : "Analisar";
    sigcoReason = "8385 não comprova sozinho a falha do transformador.";
  } else if (sigco === "#N/A" || !sigco) {
    sigcoStatus = "Não informado";
    sigcoReason = "Código ausente; a New Base deve recomendar abertura/correção com motivo.";
  }
  if (["Divergente", "Analisar", "Análise obrigatória", "Não informado"].includes(sigcoStatus)) {
    if (!flags.includes("Análise por SIGCO")) flags.push("Análise por SIGCO");
  }

  const condition = normalize(base.CAT) === "QUEIMADO" ? "QUEIMADO" : "AVARIADO";
  const action = substituted ? "Substituído" : repaired ? "Reparado" : "Não conclusivo";
  const date = openedIso;
  const approvalStatus = "PENDENTE";

  return {
    id: `AUD-134-${String(index + 1).padStart(3, "0")}`,
    ss: text(base.SS),
    os: text(base.OS),
    openedAt: date,
    openedAtLabel: dateLabel(base.DATA),
    month: Number(date.slice(5, 7)),
    category: condition,
    location: text(base.LOCAL),
    type: text(base.TIPOSS),
    sigco,
    powerRemoved: number(base.POT_RET),
    powerInstalled: number(base.POT_INST),
    ssAnalysis: {
      description: ssDescription,
      category: condition,
      causeHint: theft ? "Furto/vandalismo" : collision ? "Abalroamento" : overload ? "Sobrecarga/TAP" : burned ? "Queima" : damaged ? "Avaria" : "Não conclusiva",
      evidence: extract(ssDescription, /(FURT|ROUB|VANDAL|ABALRO|COLISA|VEICUL|SOBRECARG|TAP|QUEIM|AVARI|VAZAMENTO|DEFEIT)/),
    },
    osAnalysis: {
      description: osDescription,
      action,
      transformerEvidence: hasTransformer ? "Movimentação registrada na obra" : "Sem movimentação de transformador",
      evidence: extract(osDescription, /(SUBSTITU|TROCA|RETIRADO|INSTALADO|REPAR|QUEIM|AVARI|VAZAMENTO)/),
    },
    work: {
      number: text(work.NUM_OBRA),
      description: workDescription,
      status: text(work.STATUS) || "Sem obra localizada",
      contractor: text(work.EMPREITEIRA),
      terminal,
      analyticReason: text(analytic.MOTIVO),
      workClass,
      workNature,
      workKind,
      expenseOrder,
      ssAgeDays,
      overdue: overdueWork,
      alerts: workAlerts,
    },
    material: {
      transformers: transformerQty,
      poles: poleQty,
      lightningArresters: number(work.PARARAIOS),
      items: number(work.ITENS),
      value: money(work.VALOR_MAT),
    },
    finance: {
      totalBudgeted: money(fullWork.VAL_TOTAL_ORCADO),
      totalRealized: money(fullWork.TOTAL_REALIZADO),
      materialBudgeted: money(fullWork.MT_ORCADO),
      materialRealized: money(fullWork.MT_REALIZADO),
      laborBudgeted: money(fullWork.MO_ORCADO),
      laborRealized: money(fullWork.MO_REALIZADO),
    },
    consolidated: {
      decision,
      condition,
      cause,
      action,
      materialEvidence: hasTransformer ? `${transformerQty} transformador(es)` : "Sem transformador",
      rule,
      rationale,
      confidence,
      confidenceBand: confidence >= 85 ? "Alta" : confidence >= 65 ? "Média" : "Baixa",
      automaticExpurge,
      review,
      sigcoStatus,
      sigcoReason,
      flags: [...new Set(flags)],
      approvalStatus,
      reviewer: "Matheus Gracia",
      official: false,
    },
    requestType: text(full.TIPOSS || base.TIPOSS),
    origin: text(full.ORG_SOLIC),
    requester: text(full.SOLICITANTE),
    originReason: text(full.ORIGEM_SS),
  };
}

const records = ssRows.map((base, index) => evaluate(
  base,
  fullSsBySs.get(normalize(base.SS)) || {},
  workBySs.get(normalize(base.SS)) || {},
  fullWorkBySs.get(normalize(base.SS)) || {},
  analyticBySs.get(normalize(base.SS)) || {},
  index,
));

const byMonth = [1, 2, 3, 4, 5, 6].map((month) => {
  const items = records.filter((record) => record.month === month);
  return {
    month,
    label: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"][month - 1],
    total: items.length,
    burned: items.filter((record) => record.category === "QUEIMADO").length,
    damaged: items.filter((record) => record.category === "AVARIADO").length,
    expurged: items.filter((record) => record.consolidated.decision === "EXPURGAR").length,
    included: items.filter((record) => record.consolidated.decision === "INCLUIR").length,
    review: items.filter((record) => record.consolidated.decision === "REVISÃO MANUAL").length,
    realized: money(items.reduce((sum, record) => sum + record.finance.totalRealized, 0)),
  };
});

const financial = {
  materialValue: money(records.reduce((sum, record) => sum + record.material.value, 0)),
  totalBudgeted: money(records.reduce((sum, record) => sum + record.finance.totalBudgeted, 0)),
  totalRealized: money(records.reduce((sum, record) => sum + record.finance.totalRealized, 0)),
  materialBudgeted: money(records.reduce((sum, record) => sum + record.finance.materialBudgeted, 0)),
  materialRealized: money(records.reduce((sum, record) => sum + record.finance.materialRealized, 0)),
  laborBudgeted: money(records.reduce((sum, record) => sum + record.finance.laborBudgeted, 0)),
  laborRealized: money(records.reduce((sum, record) => sum + record.finance.laborRealized, 0)),
};

const automaticExpurges = records.filter((record) => record.consolidated.automaticExpurge);
const aiReview = records.filter((record) => record.consolidated.review);
const data = {
  meta: {
    title: "Auditoria de Transformadores — Base 134",
    period: { start: "01/01/2026", end: "30/06/2026", observedEnd: "25/06/2026" },
    total: records.length,
    source: "Painel_134_Completo.xlsx",
    generatedAt: new Date().toISOString(),
    reviewer: "Matheus Gracia",
    approvalPolicy: "Somente o administrador aprova; comentário obrigatório.",
    note: "Resultados são propostas da IA até aprovação de Matheus Gracia.",
  },
  summary: {
    total: records.length,
    burned: records.filter((record) => record.category === "QUEIMADO").length,
    damaged: records.filter((record) => record.category === "AVARIADO").length,
    included: records.filter((record) => record.consolidated.decision === "INCLUIR").length,
    expurged: records.filter((record) => record.consolidated.decision === "EXPURGAR").length,
    review: records.filter((record) => record.consolidated.decision === "REVISÃO MANUAL").length,
    approved: 0,
    pending: records.length,
    works: new Set(records.map((record) => record.work.number).filter(Boolean)).size,
    analyticAlerts: analyticRows.length,
    temporaryPending: records.filter((record) => record.consolidated.decision === "PENDENTE TEMPORAL").length,
    expenseOrders: records.filter((record) => record.work.expenseOrder).length,
    missingWork: records.filter((record) => !record.work.number).length,
    overdueWork: records.filter((record) => record.work.overdue).length,
  },
  financial,
  byMonth,
  expurgeDashboard: {
    total: automaticExpurges.length,
    value: money(automaticExpurges.reduce((sum, record) => sum + record.finance.totalRealized, 0)),
    materialValue: money(automaticExpurges.reduce((sum, record) => sum + record.material.value, 0)),
    byCause: counts(automaticExpurges, (record) => record.consolidated.cause),
    byRule: counts(automaticExpurges, (record) => record.consolidated.rule),
    sentToReview: automaticExpurges.filter((record) => record.consolidated.review).length,
  },
  aiDashboard: {
    highConfidence: records.filter((record) => record.consolidated.confidenceBand === "Alta").length,
    mediumConfidence: records.filter((record) => record.consolidated.confidenceBand === "Média").length,
    lowConfidence: records.filter((record) => record.consolidated.confidenceBand === "Baixa").length,
    needsReview: aiReview.length,
    sigcoAnalysis: records.filter((record) => record.consolidated.flags.includes("Análise por SIGCO")).length,
    completeEvidence: records.filter((record) => record.material.transformers > 0 && record.work.number).length,
    byDecision: counts(records, (record) => record.consolidated.decision),
    byRule: counts(records, (record) => record.consolidated.rule),
  },
  records,
  workRules: {
    referenceDate: dateLabel(REFERENCE_DATE),
    deadlineDays: DEADLINE_DAYS,
    expense: records.filter((record) => record.work.expenseOrder).map((record) => ({
      id: record.id, ss: record.ss, work: record.work.number,
      workClass: record.work.workClass, decision: record.consolidated.decision,
    })),
    missing: records.filter((record) => !record.work.number).map((record) => ({
      id: record.id, ss: record.ss, openedAtLabel: record.openedAtLabel,
      ssAgeDays: record.work.ssAgeDays, overdue: record.work.overdue, decision: record.consolidated.decision,
    })),
    kindDivergent: records.filter((record) => record.work.number &&
      (normalize(record.work.workNature) !== "MANUTENCAO" || normalize(record.work.workKind) !== "MANUTENCAO CORRET EMERGENCIAL"))
      .map((record) => ({
        id: record.id, ss: record.ss, work: record.work.number,
        workNature: record.work.workNature, workKind: record.work.workKind,
      })),
  },
  requestSources: {
    byType: counts(records, (record) => record.requestType),
    byOrigin: counts(records, (record) => record.origin),
    byRequester: counts(records, (record) => record.requester),
  },
};

await fs.writeFile(output, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Gerado ${output}: ${records.length} registros.`);
