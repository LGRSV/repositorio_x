import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const [input] = process.argv.slice(2);
if (!input) throw new Error("Informe o arquivo XLSX.");

const text = (value) => String(value ?? "").trim();
const number = (value) => Number(value || 0);
const rowsFrom = (sheet, headerIndex = 0) => {
  const values = sheet.getUsedRange(true)?.values ?? [];
  const headers = values[headerIndex].map(text);
  return values.slice(headerIndex + 1)
    .filter((row) => row.some((value) => value !== null && value !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
};
const counts = (rows, key) =>
  Object.fromEntries([...rows.reduce((map, row) => {
    const value = text(row[key]) || "(vazio)";
    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map())].sort((a, b) => b[1] - a[1]));

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(input));
const byName = (name) => workbook.worksheets.items.find((sheet) => sheet.name === name);
const ss = rowsFrom(byName("SS_OS"));
const works = rowsFrom(byName("Obras"));
const full = rowsFrom(byName("SS_OS_COMPLETA"));
const fullWorks = rowsFrom(byName("OBRAS_COMPLETA"));
const analytic = rowsFrom(byName("Base_Analitica"), 2);

const totals = {
  sourceRows: ss.length,
  uniqueSs: new Set(ss.map((row) => text(row.SS))).size,
  uniqueOs: new Set(ss.map((row) => text(row.OS))).size,
  uniqueWorks: new Set(works.map((row) => text(row.NUM_OBRA))).size,
  period: {
    min: ss.map((row) => text(row.DATA)).sort((a, b) => {
      const [da, ma, ya] = a.split("/").map(Number);
      const [db, mb, yb] = b.split("/").map(Number);
      return Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db);
    })[0],
    max: ss.map((row) => text(row.DATA)).sort((a, b) => {
      const [da, ma, ya] = a.split("/").map(Number);
      const [db, mb, yb] = b.split("/").map(Number);
      return Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db);
    }).at(-1),
  },
  categories: counts(ss, "CAT"),
  sigco: counts(ss, "SIGCO"),
  locations: counts(ss, "LOCAL"),
  statuses: counts(works, "STATUS"),
  workDescriptions: counts(works, "DESC_OBRA"),
  analyticReasons: counts(analytic, "MOTIVO"),
  financial: {
    material: works.reduce((sum, row) => sum + number(row.VALOR_MAT), 0),
    budgeted: fullWorks.reduce((sum, row) => sum + number(row.VAL_TOTAL_ORCADO), 0),
    realized: fullWorks.reduce((sum, row) => sum + number(row.TOTAL_REALIZADO), 0),
    materialBudgeted: fullWorks.reduce((sum, row) => sum + number(row.MT_ORCADO), 0),
    materialRealized: fullWorks.reduce((sum, row) => sum + number(row.MT_REALIZADO), 0),
    laborBudgeted: fullWorks.reduce((sum, row) => sum + number(row.MO_ORCADO), 0),
    laborRealized: fullWorks.reduce((sum, row) => sum + number(row.MO_REALIZADO), 0),
  },
  material: {
    transformers: works.reduce((sum, row) => sum + number(row.TRAFOS), 0),
    poles: works.reduce((sum, row) => sum + number(row.POSTES), 0),
    lightningArresters: works.reduce((sum, row) => sum + number(row.PARARAIOS), 0),
    items: works.reduce((sum, row) => sum + number(row.ITENS), 0),
    noTransformer: works.filter((row) => number(row.TRAFOS) === 0).length,
    withPole: works.filter((row) => number(row.POSTES) > 0).length,
  },
  sourceValidation: {
    validation: counts(full, "VALIDAÇÃO"),
    reason: counts(full, "MOTIVO"),
    sigcoCorrect: counts(full, "SIGCO CORRETO?"),
  },
  analyticCount: analytic.length,
};

console.log(JSON.stringify(totals, null, 2));
