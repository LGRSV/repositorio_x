const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  HeadingLevel, AlignmentType, ShadingType, BorderStyle, TableOfContents,
  LevelFormat, PageBreak, PageNumber, Footer, Header,
} = require("docx");
const C = require("./conteudo.js");

const NAVY = "1F3864", AZUL = "4472C4", CINZA = "D9E2F3", CLARO = "F2F2F2";
const PAGE_W = 11906, MARG = 1134, USABLE = PAGE_W - 2 * MARG; // A4 portrait, 2 cm margins
const borda = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };

const run = (t, o = {}) => new TextRun({ text: t, font: "Calibri", size: 21, ...o });
const par = (t, o = {}) => new Paragraph({ spacing: { after: 120, line: 276 }, ...o, children: [run(t)] });

function tabela({ h, r, w }) {
  const widths = w.map((p) => Math.round((USABLE * p) / 100));
  const cell = (txt, i, head) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders: bordas,
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      shading: head ? { type: ShadingType.CLEAR, fill: NAVY, color: "auto" } : undefined,
      children: [new Paragraph({ spacing: { after: 0, line: 252 }, children: [
        run(String(txt), head ? { bold: true, color: "FFFFFF", size: 20 } : { size: 19, bold: i === 0 && !head }),
      ]})],
    });
  return new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: h.map((x, i) => cell(x, i, true)) }),
      ...r.map((row, k) => new TableRow({ children: row.map((x, i) => {
        const c = cell(x, i, false);
        if (k % 2 === 1) c.options ??= {};
        return c;
      }) })),
    ],
  });
}

const filhos = [];
const numRefs = [];
// capa
filhos.push(new Paragraph({ spacing: { before: 3000, after: 200 }, alignment: AlignmentType.LEFT,
  children: [run(C.titulo, { bold: true, size: 52, color: NAVY })] }));
filhos.push(new Paragraph({ spacing: { after: 600 }, children: [run(C.subtitulo, { size: 26, color: "595959" })] }));
filhos.push(par("Energisa Tocantins — auditoria de transformadores queimados e avariados. Versão de 09/09/2026."));
filhos.push(par("Este documento é um comando de trabalho: foi escrito para ser entregue a uma IA (ou a um analista) junto com as bases SS/OS e OS Status. Ele diz o que ler, em que ordem, o que conferir, o que simular e como escrever a resposta."));
filhos.push(new Paragraph({ children: [new PageBreak()] }));

// sumário
filhos.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run("Sumário", { bold: true, size: 30, color: NAVY })] }));
C.secoes.forEach((s, i) => {
  filhos.push(new Paragraph({ spacing: { before: 100, after: 40 }, children: [run(`${i + 1}. ${s.t}`, { bold: true, size: 22 })] }));
  let sub = 0;
  s.itens.forEach((it) => { if (it.h3) { sub++; filhos.push(new Paragraph({ indent: { left: 500 }, spacing: { after: 20 }, children: [run(`${i + 1}.${sub} ${it.h3}`, { size: 20, color: "404040" })] })); } });
});
filhos.push(new Paragraph({ children: [new PageBreak()] }));

C.secoes.forEach((s, i) => {
  filhos.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 },
    children: [run(`${i + 1}. ${s.t}`, { bold: true, size: 30, color: NAVY })] }));
  let sub = 0;
  s.itens.forEach((it) => {
    if (it.p) filhos.push(par(it.p));
    else if (it.q) filhos.push(new Paragraph({
      spacing: { before: 120, after: 200 }, indent: { left: 400, right: 400 },
      shading: { type: ShadingType.CLEAR, fill: "FFF2CC", color: "auto" },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: "BF9000" } },
      children: [run(it.q, { bold: true, size: 21 })] }));
    else if (it.h3) { sub++; filhos.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 },
      children: [run(`${i + 1}.${sub} ${it.h3}`, { bold: true, size: 24, color: AZUL })] })); }
    else if (it.b) it.b.forEach((t) => filhos.push(new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 80, line: 264 }, children: [run(t)] })));
    else if (it.n) { const ref = `num${i}_${sub}_${Math.random().toString(36).slice(2, 6)}`; numRefs.push(ref);
      it.n.forEach((t) => filhos.push(new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80, line: 264 }, children: [run(t)] }))); }
    else if (it.tab) { filhos.push(tabela(it.tab)); filhos.push(new Paragraph({ spacing: { after: 120 }, children: [] })); }
  });
});


const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { bold: true, size: 30, color: NAVY }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { bold: true, size: 24, color: AZUL }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ] },
  numbering: { config: [
    { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 520, hanging: 260 } } } }] },
    ...numRefs.map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 520, hanging: 320 } } } }] })),
  ] },
    sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARG, bottom: MARG, left: MARG, right: MARG } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("Protocolo de leitura de SS, OS e OS Status", { size: 17, color: "7F7F7F" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ font: "Calibri", size: 17, color: "7F7F7F", children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES] })] })] }) },
    children: filhos,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync("Protocolo_Leitura_SS_OS_Status.docx", b); console.log("docx ok", b.length); });

// versão Markdown (para colar direto numa IA)
let md = `# ${C.titulo}\n\n_${C.subtitulo}_\n\n`;
C.secoes.forEach((s, i) => {
  md += `\n## ${i + 1}. ${s.t}\n\n`; let sub = 0;
  s.itens.forEach((it) => {
    if (it.p) md += it.p + "\n\n";
    else if (it.q) md += "> **" + it.q + "**\n\n";
    else if (it.h3) { sub++; md += `### ${i + 1}.${sub} ${it.h3}\n\n`; }
    else if (it.b) md += it.b.map((t) => "- " + t).join("\n") + "\n\n";
    else if (it.n) md += it.n.map((t, k) => `${k + 1}. ` + t).join("\n") + "\n\n";
    else if (it.tab) { const esc = (x) => String(x).replace(/\|/g, "\\|");
      md += "| " + it.tab.h.map(esc).join(" | ") + " |\n|" + it.tab.h.map(() => "---").join("|") + "|\n";
      md += it.tab.r.map((r) => "| " + r.map(esc).join(" | ") + " |").join("\n") + "\n\n"; }
  });
});
fs.writeFileSync("Protocolo_Leitura_SS_OS_Status.md", md);
console.log("md ok", md.length);
