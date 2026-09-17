const pptxgen = require("pptxgenjs");

const NAVY = "15243F", NAVY2 = "1E3A6B", GELO = "E8EEF7", BRANCO = "FFFFFF";
const AMBAR = "E8A317", ACO = "5B8FB9", TERRA = "B5503F", CINZA = "6B7280", ESCURO = "1F2937";
const H = "Cambria", B = "Calibri";

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";           // 13.3 × 7.5
p.author = "Auditoria de transformadores — Energisa Tocantins";
p.title = "As 252 fora do Infotrafo";

const W = 13.3, HT = 7.5, M = 0.7;

/* fundo escuro: capa, viradas e fechamento */
function fundoEscuro(s) { s.background = { color: NAVY }; }

/* o cabeçalho de toda tela clara: título grande e uma linha de contexto, sem barra
   decorativa nenhuma — o respiro é que separa */
function cabecalho(s, titulo, contexto) {
  s.addText(titulo, { x: M, y: 0.42, w: W - 2 * M, h: 0.75, fontSize: 34, bold: true,
    fontFace: H, color: NAVY, isTextBox: true, margin: 0 });
  if (contexto) s.addText(contexto, { x: M, y: 1.18, w: W - 2 * M, h: 0.4, fontSize: 14,
    fontFace: B, color: CINZA, isTextBox: true, margin: 0 });
}

/* o número grande em círculo — o motivo visual que se repete em todas as telas */
function bolha(s, x, y, d, cor, texto, rotulo, corTexto) {
  s.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: cor },
    line: { color: cor, width: 0 } });
  s.addText(texto, { x, y: y + d / 2 - 0.42, w: d, h: 0.84, fontSize: 34, bold: true,
    fontFace: H, color: corTexto || BRANCO, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  if (rotulo) s.addText(rotulo, { x: x - 0.35, y: y + d + 0.1, w: d + 0.7, h: 0.5, fontSize: 12,
    fontFace: B, color: CINZA, align: "center", isTextBox: true, margin: 0 });
}

function cartao(s, x, y, w, h, titulo, corpo, cor, alturaTitulo) {
  const ht = alturaTitulo || 0.42;
  s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08,
    fill: { color: GELO }, line: { color: GELO, width: 0 },
    shadow: { type: "outer", angle: 90, blur: 8, offset: 2, color: "9AA6B8", opacity: 0.25 } });
  s.addText(titulo, { x: x + 0.28, y: y + 0.22, w: w - 0.56, h: ht, fontSize: 15, bold: true,
    fontFace: H, color: cor || NAVY, isTextBox: true, margin: 0 });
  s.addText(corpo, { x: x + 0.28, y: y + 0.24 + ht, w: w - 0.56, h: h - 0.48 - ht, fontSize: 12.5,
    fontFace: B, color: ESCURO, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15 });
}

/* ---------- 1. capa ---------- */
{
  const s = p.addSlide(); fundoEscuro(s);
  s.addShape(p.ShapeType.ellipse, { x: 10.2, y: -1.5, w: 5.2, h: 5.2,
    fill: { color: NAVY2 }, line: { color: NAVY2, width: 0 } });
  s.addShape(p.ShapeType.ellipse, { x: 11.6, y: 4.6, w: 3.4, h: 3.4,
    fill: { color: NAVY2 }, line: { color: NAVY2, width: 0 } });
  s.addText("AUDITORIA DE TRANSFORMADORES · ENERGISA TOCANTINS", { x: M, y: 1.5, w: 9, h: 0.4,
    fontSize: 13, bold: true, fontFace: B, color: AMBAR, charSpacing: 2, isTextBox: true, margin: 0 });
  s.addText("As 252 que ficaram\nfora do Infotrafo", { x: M, y: 2.05, w: 9.2, h: 1.9, fontSize: 46,
    bold: true, fontFace: H, color: BRANCO, isTextBox: true, margin: 0, lineSpacingMultiple: 1.02 });
  s.addText("Quantas delas são, de fato, queimadas ou avariadas", { x: M, y: 4.0, w: 9.2, h: 0.5,
    fontSize: 19, fontFace: B, color: GELO, isTextBox: true, margin: 0 });
  s.addText("Janeiro a agosto de 2026 · base de SS e OS de 09/09", { x: M, y: 5.9, w: 9, h: 0.4,
    fontSize: 13, fontFace: B, color: ACO, isTextBox: true, margin: 0 });
  s.addNotes("Abertura. A pergunta do trabalho é uma só: das SS de substituição de transformador que não aparecem no Infotrafo, quantas são falha real do equipamento.");
}

/* ---------- 2. a pergunta ---------- */
{
  const s = p.addSlide(); s.background = { color: BRANCO };
  cabecalho(s, "A pergunta", "SS de substituição de transformador abertas de janeiro a agosto de 2026");
  bolha(s, 1.15, 2.15, 2.2, NAVY, "1.671", "SS de substituição\nno período");
  s.addText("−", { x: 3.75, y: 2.75, w: 0.9, h: 1.0, fontSize: 40, bold: true, fontFace: H,
    color: CINZA, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  bolha(s, 4.95, 2.15, 2.2, ACO, "1.419", "delas estão\nno Infotrafo");
  s.addText("=", { x: 7.55, y: 2.75, w: 0.9, h: 1.0, fontSize: 40, bold: true, fontFace: H,
    color: CINZA, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  bolha(s, 8.75, 2.15, 2.2, TERRA, "252", "perdidas — fora\ndo Infotrafo");
  cartao(s, M, 5.15, 5.6, 1.65, "O Infotrafo tem 1.444 SS",
    "Vinte e cinco delas estão fora deste filtro, porque foram abertas com outro esquema de serviço. Dentro do recorte ficam 1.419.", NAVY);
  cartao(s, M + 5.9, 5.15, 6.0, 1.65, "Por isso a subtração direta não fecha",
    "1.672 − 1.444 = 228 supõe que o Infotrafo cabe inteiro dentro do filtro. Descontando só o que casa de verdade, sobram 252.", TERRA);
  s.addNotes("1.671 é o total jan–ago com esquema de serviço MC - Substituição de transformador. O Infotrafo é a lista de 1.444 SS pintadas de vermelho na coluna A pela formatação condicional de valores duplicados.");
}

/* ---------- 3. os 25 do Infotrafo que ficam de fora ---------- */
{
  const s = p.addSlide(); s.background = { color: BRANCO };
  cabecalho(s, "Os 25 que o filtro não pega", "SS do Infotrafo abertas com outro esquema de serviço");
  const linhas = [
    ["8", "MC - Ferragens"], ["6", "MC - Remanejamento de transformador"],
    ["3", "sem esquema preenchido"], ["2", "MC - Substituição de condutor"],
    ["2", "MC - Para-raios MT"], ["4", "MC - Equipamentos, Condutor MT, Condutor BT e Conexão BT"],
  ];
  linhas.forEach((l, i) => {
    const y = 1.9 + i * 0.72;
    s.addShape(p.ShapeType.ellipse, { x: M, y, w: 0.55, h: 0.55, fill: { color: ACO }, line: { color: ACO, width: 0 } });
    s.addText(l[0], { x: M, y, w: 0.55, h: 0.55, fontSize: 15, bold: true, fontFace: H,
      color: BRANCO, align: "center", valign: "middle", isTextBox: true, margin: 0 });
    s.addText(l[1], { x: M + 0.85, y: y + 0.05, w: 6.2, h: 0.45, fontSize: 14, fontFace: B,
      color: ESCURO, valign: "middle", isTextBox: true, margin: 0 });
  });
  cartao(s, 8.15, 1.9, 4.45, 2.3, "Estão no Infotrafo",
    "São trocas registradas — só não entram no filtro de esquema MC - Substituição de transformador, que é o recorte desta análise.", NAVY);
  cartao(s, 8.15, 4.4, 4.45, 2.3, "Vale decidir",
    "Se o remanejamento de transformador e as ferragens devessem entrar, o universo sobe e a diferença cai. É uma escolha de filtro, não de dado.", TERRA);
  s.addText("Doze das 25 são de março.", { x: M, y: 6.35, w: 7, h: 0.4, fontSize: 13, italic: true,
    fontFace: B, color: CINZA, isTextBox: true, margin: 0 });
  s.addNotes("Este slide existe porque a subtração direta 1.672 − 1.444 não fecha: 25 SS do Infotrafo têm outro esquema de serviço e ficam fora do recorte.");
}

/* ---------- 4. a resposta ---------- */
{
  const s = p.addSlide(); fundoEscuro(s);
  s.addShape(p.ShapeType.ellipse, { x: -1.6, y: 4.2, w: 4.6, h: 4.6, fill: { color: NAVY2 }, line: { color: NAVY2, width: 0 } });
  s.addText("A RESPOSTA", { x: M, y: 1.15, w: 8, h: 0.4, fontSize: 13, bold: true, fontFace: B,
    color: AMBAR, charSpacing: 2, isTextBox: true, margin: 0 });
  s.addText("135", { x: M, y: 1.6, w: 3.6, h: 2.1, fontSize: 100, bold: true, fontFace: H,
    color: AMBAR, isTextBox: true, margin: 0 });
  s.addText("das 252 são queimadas\nou avariadas de fato", { x: M + 3.5, y: 2.0, w: 5.4, h: 1.5,
    fontSize: 26, bold: true, fontFace: H, color: BRANCO, isTextBox: true, margin: 0, lineSpacingMultiple: 1.05 });
  s.addText("54% do que estava perdido é falha real do equipamento", { x: M, y: 3.95, w: 9, h: 0.45,
    fontSize: 16, fontFace: B, color: GELO, isTextBox: true, margin: 0 });
  bolha(s, M, 4.85, 1.5, AMBAR, "90", null, NAVY);
  s.addText("queimados", { x: M + 1.75, y: 5.25, w: 2.4, h: 0.5, fontSize: 17, bold: true,
    fontFace: B, color: BRANCO, valign: "middle", isTextBox: true, margin: 0 });
  bolha(s, M + 4.3, 4.85, 1.5, ACO, "45", null, BRANCO);
  s.addText("avariados", { x: M + 6.05, y: 5.25, w: 2.4, h: 0.5, fontSize: 17, bold: true,
    fontFace: B, color: BRANCO, valign: "middle", isTextBox: true, margin: 0 });
  s.addText("117 não são falha do transformador", { x: 9.0, y: 5.25, w: 3.7, h: 0.5, fontSize: 15,
    fontFace: B, color: ACO, valign: "middle", isTextBox: true, margin: 0 });
  s.addNotes("135 de 252. Este é o número que responde a pergunta feita. Os 117 restantes têm motivo escrito, e o próximo slide abre cada um.");
}

/* ---------- 5. as 252 por categoria ---------- */
{
  const s = p.addSlide(); s.background = { color: BRANCO };
  cabecalho(s, "O que são as 252", "cada SS recebe um rótulo só: o que foi, ou o motivo de não contar");
  s.addChart(p.ChartType.bar, [{
    name: "SS",
    labels: ["Queimado", "Avariado", "Furto", "Ausente da Crítica", "Remanejamento",
             "Sem troca", "Abalroamento", "Preventivo", "Sem obra (60 dias)",
             "Tape e tensão", "Fora da janela", "Retido sem prova", "Outras sete"],
    values: [90, 45, 36, 16, 14, 11, 7, 6, 5, 4, 4, 4, 10],
  }], {
    x: 0.6, y: 1.7, w: 7.4, h: 5.2, barDir: "bar", barGrouping: "clustered",
    chartColors: [AMBAR, AMBAR, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY, NAVY],
    varyColors: true, showValue: true, dataLabelPosition: "outEnd",
    dataLabelColor: ESCURO, dataLabelFontSize: 11, dataLabelFontFace: B,
    catAxisLabelColor: ESCURO, catAxisLabelFontSize: 11, catAxisLabelFontFace: B,
    valAxisLabelColor: CINZA, valAxisLabelFontSize: 10, valAxisHidden: true,
    valGridLine: { style: "none" }, catGridLine: { style: "none" },
    showLegend: false, barGapWidthPct: 40,
  });
  cartao(s, 8.35, 1.85, 4.25, 2.35, "Contam no indicador",
    "Queimado e avariado somam 135. Avariado é falha do próprio equipamento sem queima de enrolamento: vazamento, tanque, bucha, falta de fase.", AMBAR);
  cartao(s, 8.35, 4.4, 4.25, 2.45, "Não contam — 117",
    "Furto e abalroamento são causa alheia ao equipamento. Remanejamento, preventivo e tape são troca sem falha. Sem troca é serviço que não chegou a substituir o transformador.", NAVY);
  s.addNotes("Outras sete: divisão de circuito 3, falta de fase 2, obra sem execução 1, trafo auxiliar 1, obra sem transformador 1, sem OS e sem obra 1, avaliar com Matheus 1.");
}

/* ---------- 6. por mês ---------- */
{
  const s = p.addSlide(); s.background = { color: BRANCO };
  cabecalho(s, "Onde estão, mês a mês", "as 135 que contam, separadas por queimado e avariado");
  s.addChart(p.ChartType.bar, [
    { name: "Queimado", labels: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago"], values: [22, 23, 16, 4, 6, 5, 5, 9] },
    { name: "Avariado", labels: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago"], values: [5, 14, 6, 1, 2, 4, 5, 8] },
  ], {
    x: 0.6, y: 1.75, w: 8.2, h: 4.9, barDir: "col", barGrouping: "stacked",
    chartColors: [NAVY, AMBAR], showValue: true, dataLabelPosition: "ctr",
    dataLabelColor: BRANCO, dataLabelFontSize: 11, dataLabelFontFace: B,
    catAxisLabelColor: ESCURO, catAxisLabelFontSize: 12, catAxisLabelFontFace: B,
    valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    showLegend: true, legendPos: "b", legendColor: ESCURO, legendFontSize: 12,
    barGapWidthPct: 55,
  });
  cartao(s, 9.15, 1.9, 3.45, 2.25, "O peso está no começo",
    "Janeiro, fevereiro e março concentram 86 das 135. É onde a falta de registro no Infotrafo mais custou.", NAVY);
  cartao(s, 9.15, 4.35, 3.45, 2.3, "Agosto é mês novo",
    "17 das 33 SS de agosto são falha real. É a primeira leitura do mês, feita com a Crítica de agosto que chegou agora.", AMBAR);
  s.addNotes("Abril tem só 5 de 21 — a maior parte daquele mês é furto e remanejamento.");
}

/* ---------- 7. os 117 que não contam ---------- */
{
  const s = p.addSlide(); s.background = { color: BRANCO };
  cabecalho(s, "Por que 117 não contam", "cinco famílias, e nenhuma delas é falha do transformador");
  const fam = [
    ["47", "Causa alheia ao trafo", "Furto 36 · abalroamento 7 · divisão de circuito 3 · trafo auxiliar de religador 1", TERRA],
    ["28", "Falta de registro ou documento", "Ausente da Crítica 16 · sem obra passados 60 dias 5 · fora da janela 4 · obra sem execução, obra sem transformador e sem OS 1 cada", ACO],
    ["26", "Troca sem falha", "Remanejamento 14 · preventivo 6 · tape e tensão 4 · falta de fase 2", NAVY],
    ["11", "Não houve troca", "O serviço foi feito, mas o transformador não foi substituído", CINZA],
    ["5", "Ainda pendente", "Quatro retidos por falta de prova de troca e um marcado para avaliar com o Matheus", AMBAR],
  ];
  fam.forEach((f, i) => {
    const y = 1.8 + i * 0.97;
    s.addShape(p.ShapeType.ellipse, { x: M, y, w: 0.8, h: 0.8, fill: { color: f[3] }, line: { color: f[3], width: 0 } });
    s.addText(f[0], { x: M, y, w: 0.8, h: 0.8, fontSize: 20, bold: true, fontFace: H,
      color: BRANCO, align: "center", valign: "middle", isTextBox: true, margin: 0 });
    s.addText(f[1], { x: M + 1.05, y: y + 0.02, w: 4.1, h: 0.4, fontSize: 16, bold: true,
      fontFace: H, color: NAVY, isTextBox: true, margin: 0 });
    s.addText(f[2], { x: M + 5.2, y: y + 0.02, w: 7.0, h: 0.78, fontSize: 12.5, fontFace: B,
      color: ESCURO, isTextBox: true, margin: 0, lineSpacingMultiple: 1.1 });
  });
  s.addText("Atenção: ausente da Crítica e fora da janela não provam que a falha não existiu — provam que não há registro de interrupção. " +
            "São 20 casos que merecem um olhar antes de virarem expurgo.",
    { x: M, y: 6.75, w: W - 2 * M, h: 0.6, fontSize: 13, italic: true, fontFace: B, color: TERRA,
      isTextBox: true, margin: 0, lineSpacingMultiple: 1.15 });
  s.addNotes("A frase final é a ressalva mais importante do trabalho: falta de registro não é prova de ausência de falha.");
}

/* ---------- 8. de onde veio a análise ---------- */
{
  const s = p.addSlide(); s.background = { color: BRANCO };
  cabecalho(s, "De onde vem cada leitura", "o que o site já tinha analisado foi aproveitado sem refazer");
  s.addShape(p.ShapeType.roundRect, { x: M, y: 1.9, w: 5.85, h: 4.3, rectRadius: 0.08,
    fill: { color: GELO }, line: { color: GELO, width: 0 } });
  s.addText("196", { x: M + 0.35, y: 2.15, w: 2.2, h: 1.1, fontSize: 54, bold: true, fontFace: H,
    color: NAVY, isTextBox: true, margin: 0 });
  s.addText("já analisadas no site", { x: M + 0.35, y: 3.2, w: 5.1, h: 0.45, fontSize: 17, bold: true,
    fontFace: H, color: NAVY, isTextBox: true, margin: 0 });
  s.addText([
    { text: "São de janeiro a julho e já passaram pela esteira das cinco peneiras.", options: { bullet: true, breakLine: true } },
    { text: "A categoria veio pronta: nada foi reclassificado.", options: { bullet: true, breakLine: true } },
    { text: "108 delas são queimadas ou avariadas.", options: { bullet: true } },
  ], { x: M + 0.35, y: 3.75, w: 5.1, h: 2.2, fontSize: 13, fontFace: B, color: ESCURO,
       isTextBox: true, margin: 0, paraSpaceAfter: 8 });

  s.addShape(p.ShapeType.roundRect, { x: M + 6.15, y: 1.9, w: 5.85, h: 4.3, rectRadius: 0.08,
    fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
  s.addText("56", { x: M + 6.5, y: 2.15, w: 2.2, h: 1.1, fontSize: 54, bold: true, fontFace: H,
    color: AMBAR, isTextBox: true, margin: 0 });
  s.addText("lidas caso a caso agora", { x: M + 6.5, y: 3.2, w: 5.1, h: 0.45, fontSize: 17, bold: true,
    fontFace: H, color: BRANCO, isTextBox: true, margin: 0 });
  s.addText([
    { text: "23 de julho e 33 de agosto — meses que o site ainda não cobre.", options: { bullet: true, breakLine: true } },
    { text: "Texto da SS, texto da OS, formulário de campo e busca na Crítica, uma a uma.", options: { bullet: true, breakLine: true } },
    { text: "27 delas são queimadas ou avariadas.", options: { bullet: true } },
  ], { x: M + 6.5, y: 3.75, w: 5.1, h: 2.2, fontSize: 13, fontFace: B, color: GELO,
       isTextBox: true, margin: 0, paraSpaceAfter: 8 });
  s.addText("108 + 27 = 135", { x: M, y: 6.5, w: W - 2 * M, h: 0.5, fontSize: 18, bold: true,
    fontFace: H, color: AMBAR, align: "center", isTextBox: true, margin: 0 });
  s.addNotes("O pedido era não refazer o que já estava analisado. As 196 vieram do site com a categoria pronta.");
}

/* ---------- 9. o que sustenta a leitura das 56 ---------- */
{
  const s = p.addSlide(); s.background = { color: BRANCO };
  cabecalho(s, "O que sustenta as 56 novas", "confiança da leitura e prova de que a troca aconteceu");
  s.addChart(p.ChartType.doughnut, [{
    name: "Prova de troca",
    labels: ["Série e tombamento", "Só o relato do texto", "Nenhuma"],
    values: [38, 11, 7],
  }], {
    x: 0.55, y: 1.85, w: 5.6, h: 4.6, chartColors: [NAVY, ACO, TERRA],
    holeSize: 55, showValue: true, dataLabelPosition: "ctr", dataLabelColor: BRANCO,
    dataLabelFontSize: 14, dataLabelFontFace: B, dataLabelFontBold: true, showLegend: true, legendPos: "b",
    legendColor: ESCURO, legendFontSize: 11, showTitle: true, title: "Prova de troca",
    titleColor: NAVY, titleFontSize: 15, titleFontFace: H,
  });
  cartao(s, 6.55, 1.9, 6.05, 1.6, "Confiança da leitura",
    "39 de confiança alta, 13 média e 4 baixa. As de confiança baixa estão nomeadas na planilha e merecem foto ou confirmação da equipe antes de virarem número.", NAVY);
  cartao(s, 6.55, 3.65, 6.05, 1.5, "Julho sem conferência",
    "As 23 SS de julho foram julgadas só por texto e formulário: o arquivo bruto da Crítica de julho se perdeu e não foi reenviado.", TERRA);
  cartao(s, 6.55, 5.3, 6.05, 1.55, "Agosto conferido",
    "As 33 de agosto casaram contra a Crítica de agosto que chegou agora: 21 casaram no próprio trafo, 7 ficaram fora da janela e 5 estão ausentes.", AMBAR);
  s.addNotes("Prova de troca por série é a mais forte: o formulário traz o número do equipamento retirado e do instalado.");
}

/* ---------- 10. ressalvas ---------- */
{
  const s = p.addSlide(); s.background = { color: BRANCO };
  cabecalho(s, "O que ainda falta", "para o número fechar sem ressalva");
  const itens = [
    ["Crítica bruta de julho", "Sem ela, 23 SS de julho ficam sem conferência na base de interrupção. É o único mês do ano nessa situação.", TERRA],
    ["Os 25 do Infotrafo com outro esquema", "Ferragens, remanejamento de transformador, para-raios. Vale decidir se algum desses esquemas deveria entrar no recorte.", ACO],
    ["Os 20 sem registro de interrupção", "Ausente da Crítica e fora da janela. Falta de registro não é prova de ausência de falha — são os casos com maior chance de estarem sendo perdidos.", NAVY],
    ["Os 4 de confiança baixa", "Nomeados na planilha. Texto que não fecha: precisam de foto, laudo ou palavra da equipe.", AMBAR],
  ];
  itens.forEach((it, i) => {
    const x = M + (i % 2) * 6.15, y = 1.9 + Math.floor(i / 2) * 2.45;
    cartao(s, x, y, 5.85, 2.2, it[0], it[1], it[2]);
  });
  s.addText("Nada aqui recalcula o indicador de janeiro a junho. É leitura ao lado do caso.",
    { x: M, y: 6.75, w: W - 2 * M, h: 0.45, fontSize: 13, italic: true, fontFace: B, color: CINZA,
      isTextBox: true, margin: 0 });
  s.addNotes("As quatro pendências, em ordem de impacto no número.");
}

/* ---------- 11. fechamento ---------- */
{
  const s = p.addSlide(); fundoEscuro(s);
  s.addShape(p.ShapeType.ellipse, { x: 10.6, y: 3.8, w: 5.0, h: 5.0, fill: { color: NAVY2 }, line: { color: NAVY2, width: 0 } });
  s.addText("EM UMA FRASE", { x: M, y: 1.55, w: 8, h: 0.4, fontSize: 13, bold: true, fontFace: B,
    color: AMBAR, charSpacing: 2, isTextBox: true, margin: 0 });
  s.addText("Das 252 SS que o Infotrafo não registrou,\n135 são queima ou avaria de verdade.",
    { x: M, y: 2.1, w: 10.2, h: 1.8, fontSize: 30, bold: true, fontFace: H, color: BRANCO,
      isTextBox: true, margin: 0, lineSpacingMultiple: 1.1 });
  s.addText("As outras 117 têm motivo escrito, caso a caso: furto, abalroamento, remanejamento, troca preventiva, " +
            "serviço sem substituição — ou falta de registro, que é coisa diferente de falta de falha.",
    { x: M, y: 4.1, w: 10.2, h: 1.1, fontSize: 15, fontFace: B, color: GELO, isTextBox: true,
      margin: 0, lineSpacingMultiple: 1.2 });
  s.addText("Planilha completa: As_252_fora_do_Infotrafo.xlsx — uma aba por categoria, com o motivo e a evidência de cada SS",
    { x: M, y: 6.15, w: 10.5, h: 0.5, fontSize: 12.5, fontFace: B, color: ACO, isTextBox: true, margin: 0 });
  s.addNotes("Fechamento. O anexo é a planilha com as 252 linha a linha.");
}

p.writeFile({ fileName: "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/jan_ago/As_252_fora_do_Infotrafo.pptx" })
  .then((f) => console.log("gravado:", f));
