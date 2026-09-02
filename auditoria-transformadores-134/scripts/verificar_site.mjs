/* Abre o site construído num navegador de verdade e diz se alguma aba quebrou.
 *
 *   pnpm build:pages && node scripts/verificar_site.mjs
 *
 * POR QUE ISTO EXISTE. Numa entrega recente o `build` passou, o `tsc` passou, e a tela
 * publicada estava quebrada: as abas novas usavam classes de CSS que não existem neste
 * projeto (`cartoes`, `cartao`, `tabela`), então os cartões viravam número colado no texto
 * e as tabelas viravam texto cru. Nenhuma ferramenta de tipo pega isso — só abrir a página
 * pega. O dono viu antes de mim, e é isso que este script impede de repetir.
 *
 * DOIS DETALHES QUE FAZEM O TESTE SER VÁLIDO:
 *  1. O bundle usa base `/repositorio_x/`. Servir na raiz dá 404 nos assets, a página fica
 *     em branco, e você conclui que está tudo quebrado quando é só o servidor errado.
 *  2. A porta de apresentação guarda quem entrou em localStorage. O próprio código diz que
 *     ela não é segurança. Aqui a chave é semeada para o teste ver as abas — é o build
 *     local, não um sistema de terceiro.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const DIST = join(RAIZ, "pages-dist");
const BASE = "/repositorio_x/";
const PORTA = Number(process.env.PORTA || 8931);

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".woff2": "font/woff2", ".xlsx": "application/octet-stream" };

/* as abas que precisam abrir sem erro; o rótulo é o texto clicável na barra lateral */
const ABAS = [
  ["Visão geral", "1.582"],
  ["Interrupção", "1.362"],
  ["Retidos na interrupção", "15"],
  ["Queimados e avariados", "1.324"],
  ["Exclusões", "220"],
  ["Janeiro a julho", "1.582"],
  ["Cadastro do parque", "92.424"],
  ["Julho 2026", null],
  ["Agosto 2026", null],
  ["Regras e método", null],
  ["Bases usadas", null],
];

const servidor = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (!p.startsWith(BASE)) { res.writeHead(404).end(); return; }
    p = p.slice(BASE.length) || "index.html";
    let alvo = join(DIST, p);
    if ((await stat(alvo).catch(() => null))?.isDirectory()) alvo = join(alvo, "index.html");
    const buf = await readFile(alvo);
    res.writeHead(200, { "content-type": MIME[extname(alvo)] || "application/octet-stream" });
    res.end(buf);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => servidor.listen(PORTA, "127.0.0.1", r));

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1100 } });
await ctx.addInitScript(() => {
  try { localStorage.setItem("auditoria-134-demo-user", "matheus-alves"); } catch { /* sem storage */ }
});
const pg = await ctx.newPage();
const falhas = [];
/* fonte do Google é bloqueada em ambiente com proxy e não diz nada sobre a tela */
const ruido = (t) => /TUNNEL|CONNECTION_RESET|fonts\.g/.test(t);
pg.on("pageerror", (e) => falhas.push(`erro de página: ${String(e).slice(0, 300)}`));
pg.on("console", (m) => { if (m.type() === "error" && !ruido(m.text())) falhas.push(`console: ${m.text().slice(0, 200)}`); });

await pg.goto(`http://127.0.0.1:${PORTA}${BASE}index.html`, { waitUntil: "networkidle", timeout: 90000 });
await pg.waitForTimeout(3500);

let ok = 0;
for (const [rotulo, esperado] of ABAS) {
  /* `text=` casa também com nó escondido — a barra tem duplicata para o menu de celular.
     Sem o filtro de visível, o clique fica esperando um elemento que nunca aparece. */
  const link = pg.locator(`text=${rotulo}`).locator("visible=true").first();
  if (!(await link.count())) { falhas.push(`aba não encontrada na barra: ${rotulo}`); continue; }
  await link.click({ timeout: 15000 }).catch((e) => falhas.push(`não deu para clicar em ${rotulo}: ${String(e).slice(0,120)}`));
  await pg.waitForTimeout(2500);
  const txt = await pg.evaluate(() => document.body.innerText);
  if (txt.trim().length < 200) { falhas.push(`aba abriu praticamente vazia: ${rotulo}`); continue; }
  if (esperado && !txt.includes(esperado)) { falhas.push(`aba ${rotulo}: não achei "${esperado}" na tela`); continue; }
  /* o defeito das classes fantasma: número colado no texto, sem espaço */
  const colado = /\d\.\d{3}[a-zA-Zà-ú]/.test(txt);
  if (colado) falhas.push(`aba ${rotulo}: número colado no texto — provável classe de CSS inexistente`);
  else { ok += 1; console.log(`  ok  ${rotulo}`); }
}

/* A GAVETA DE UM CASO DE JULHO. Os 72 chegaram à esteira traduzidos para o esquema de
   jan–jun, sem os campos que só o motor de jan–jun preenche (TMAE, material, passos). A gaveta
   precisa abrir para eles sem erro e sem "null" na tela. Um da saída e um retido. */
const CASOS = [
  ["Queimados e avariados", "ENC-RD-PS 00611/2026"],
  ["Retidos na interrupção", "ETO-RD-GR 00683/2026"],
];
for (const [aba, ss] of CASOS) {
  /* a gaveta do caso anterior cobre a barra; recarregar a página é o jeito certo de fechar */
  await pg.goto(`http://127.0.0.1:${PORTA}${BASE}index.html`, { waitUntil: "networkidle", timeout: 90000 });
  const link = pg.locator(`text=${aba}`).locator("visible=true").first();
  if (!(await link.count())) { falhas.push(`gaveta: aba não encontrada: ${aba}`); continue; }
  await link.click({ timeout: 15000 }).catch(() => falhas.push(`gaveta: não deu para abrir ${aba}`));
  await pg.waitForTimeout(1500);
  const busca = pg.locator('input[placeholder^="SS, OS, obra"]').first();
  if (!(await busca.count())) { falhas.push(`gaveta: caixa de busca ausente em ${aba}`); continue; }
  await busca.fill(ss);
  await pg.waitForTimeout(1200);
  /* a aba pode ter mais de uma tabela (a dos pares que dividem ocorrência vem antes da
     lista): a linha certa é a que traz o número da SS, não a primeira da página */
  const linha = pg.locator("table.records-table tbody tr", { hasText: ss }).first();
  if (!(await linha.count())) { falhas.push(`gaveta: ${ss} não apareceu na lista de ${aba}`); continue; }
  await linha.click({ timeout: 10000 }).catch(() => falhas.push(`gaveta: não deu para clicar em ${ss}`));
  await pg.waitForTimeout(2000);
  const txt = await pg.evaluate(() => document.body.innerText);
  if (!txt.includes(ss)) { falhas.push(`gaveta: abriu sem o número da SS ${ss}`); continue; }
  if (/\bnull\b|undefined|NaN/.test(txt)) { falhas.push(`gaveta ${ss}: apareceu null/undefined/NaN na tela`); continue; }
  if (!/prévia de julho/i.test(txt)) { falhas.push(`gaveta ${ss}: não diz que é prévia de julho`); continue; }
  console.log(`  ok  gaveta ${ss} (${aba})`);
}

await navegador.close();
servidor.close();

console.log(`\n${ok} de ${ABAS.length} abas abriram limpas`);
if (falhas.length) {
  console.log("\nFALHAS:");
  for (const f of falhas) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("nenhuma falha");
