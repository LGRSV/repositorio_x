/* Gera o Manual de Regras em .docx a partir de manual-dados.json.
 *
 * Nenhum número é digitado aqui: todos vêm do JSON que gerar_manual_regras.py apura contra o
 * fluxo e contra a Crítica crua. O texto é escrito à mão porque explicar é trabalho de escrita;
 * o valor dentro da frase, não.
 *
 * Uso:  python3 scripts/gerar_manual_regras.py && node scripts/manual_docx.js
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableOfContents,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
  Header, Footer, PageNumber, LevelFormat, convertInchesToTwip,
} = require("docx");

const RAIZ = path.join(__dirname, "..");
const D = JSON.parse(fs.readFileSync(path.join(RAIZ, "public/manuais/manual-dados.json"), "utf8"));
const SAIDA = path.join(RAIZ, "public/manuais/Manual_de_Regras_Auditoria_Transformadores_v2.docx");

const br = (x) => Number(x).toLocaleString("pt-BR");
/* decimal com vírgula: o manual é lido em português, e "24.9 horas" trava a leitura */
const dec = (x) => Number(x).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TINTA = "1F2A37";
const VERMELHO = "A52A34";
const CINZA = "5B6577";

/* ---------------------------------------------------------------- blocos de texto */
const H1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } });
const H2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 } });
const P = (t, o = {}) => new Paragraph({
  spacing: { after: 120, line: 300 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: t, size: 21, color: o.cor || "222222", italics: o.italico })],
});
/* Um parágrafo em que trechos entram em negrito: cada item é string ou {b:"..."}. */
const PM = (partes) => new Paragraph({
  spacing: { after: 120, line: 300 },
  alignment: AlignmentType.JUSTIFIED,
  children: partes.map((x) => typeof x === "string"
    ? new TextRun({ text: x, size: 21, color: "222222" })
    : new TextRun({ text: x.b, size: 21, bold: true, color: TINTA })),
});
const LI = (t) => new Paragraph({
  numbering: { reference: "pontos", level: 0 },
  spacing: { after: 80, line: 290 },
  children: [new TextRun({ text: t, size: 21, color: "222222" })],
});
const NOTA = (t) => new Paragraph({
  spacing: { before: 120, after: 200 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: VERMELHO, space: 12 } },
  indent: { left: convertInchesToTwip(0.12) },
  children: [new TextRun({ text: t, size: 20, color: CINZA, italics: true })],
});

/* ------------------------------------------------------------------------ tabela */
function tabela(cabecalho, linhas, larguras) {
  const total = larguras.reduce((a, b) => a + b, 0);
  // Só a coluna de números é alinhada à direita. Uma coluna de texto encostada na borda direita
  // fica ilegível, e havia tabela aqui com três colunas, duas delas de frase.
  const numerica = (i) => linhas.length > 0 && linhas.every((l) => /^[\d.,]+$/.test(String(l[i])));
  const celula = (txt, o = {}) => new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.cab ? { type: ShadingType.CLEAR, fill: TINTA, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: o.dir ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [new TextRun({
        text: String(txt), size: 19, bold: Boolean(o.cab),
        color: o.cab ? "FFFFFF" : "222222",
      })],
    })],
  });
  return new Table({
    columnWidths: larguras,
    width: { size: total, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: cabecalho.map((c, i) => celula(c, { cab: true, w: larguras[i], dir: numerica(i) })),
      }),
      ...linhas.map((l) => new TableRow({
        children: l.map((c, i) => celula(c, { w: larguras[i], dir: numerica(i) })),
      })),
    ],
  });
}

/* ------------------------------------------------------------------------ corpo */
const e = D.esteira, p = D.porta, c = D.critica;
const filhos = [];

// -------------------------------------------------------------------------- capa
filhos.push(
  new Paragraph({ spacing: { before: 2400, after: 0 },
    children: [new TextRun({ text: "AUDITORIA DE TRANSFORMADORES", size: 20, bold: true, color: VERMELHO, characterSpacing: 60 })] }),
  new Paragraph({ spacing: { before: 160, after: 0 },
    children: [new TextRun({ text: "Manual de Regras", size: 64, color: TINTA })] }),
  new Paragraph({ spacing: { before: 80, after: 400 },
    children: [new TextRun({ text: "Da Crítica ao resultado final, passo a passo", size: 28, color: CINZA })] }),
  new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: "D8D5CF", space: 8 } },
    spacing: { before: 200, after: 200 }, children: [],
  }),
  PM([{ b: `${br(D.total)} solicitações` }, " de troca de transformador · janeiro a junho de 2026 · janela de ",
      { b: `${D.janela_horas} horas` }]),
  PM(["Resultado: ", { b: `${br(e.saida)} queimados e avariados` }, ` — ${br(e.queimados)} queimados e ${br(e.avariados)} avariados.`]),
  P(`Versão 2.0 · dados de ${D.carimbo} · documento gerado em ${D.gerado_em}`, { cor: CINZA, italico: true }),
  NOTA("Este manual não tem número digitado. Todo valor que aparece no texto é apurado na hora "
     + "da geração, contra o arquivo da esteira e contra os arquivos originais da Crítica. Se a "
     + "auditoria mudar e o manual não for regerado, a data acima denuncia."),
  new Paragraph({ children: [new PageBreak()] }),
);

// ------------------------------------------------------------------------ sumário
filhos.push(
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Sumário", size: 36, color: TINTA })] }),
  new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ------------------------------------------------------------------ 1. o que mede
filhos.push(
  H1("O que esta auditoria mede"),
  PM(["A pergunta é uma só: das ", { b: `${br(D.total)} solicitações` },
      " de troca de transformador abertas de janeiro a junho de 2026, quantas foram de fato falha do equipamento — queima ou avaria — e quantas foram outra coisa."]),
  P("Outra coisa é muita coisa: furto, colisão de veículo, obra de rede, troca programada por sobrecarga, remanejamento de potência, equipamento que nem transformador é. Cada uma dessas sai do indicador, e sai com nome — não existe categoria \"outros\"."),
  PM(["A resposta de hoje: ", { b: `${br(e.saida)}` }, " contam, ", { b: `${br(p.total)}` },
      " não são deste indicador e ", { b: `${br(e.retidos)}` }, " esperam prova. Os três somam ", { b: br(D.total) }, "."]),
  NOTA("A regra da casa, e ela vale em cada página deste manual: o campo é fato consumado, o "
     + "texto é declaração. A leitura nunca cria um fato que o campo não registrou."),
);

// ------------------------------------------------------------ 2. bases
filhos.push(
  H1("As bases, e o que cada uma responde"),
  P("São quatro bases, e a ordem entre elas não é de importância — é de pergunta. Cada uma responde uma coisa que as outras não conseguem responder."),
  tabela(["Base", "O que ela responde"], [
    ["Crítica de interrupção", "Houve apagão neste transformador? Quando começou, quando terminou, quantos clientes."],
    ["TMAE — atendimentos", "Uma equipe foi ao local? Quando, quanto tempo, qual causa ela registrou."],
    ["SS e OS", "O que o campo escreveu: o que pediram e o que a equipe encontrou."],
    ["Obra e material", "Um transformador saiu mesmo do poste? Item a item do que foi movimentado."],
  ], [2600, 6400]),
  P("A Crítica é a prova primária porque é a única que mede o efeito no cliente. O TMAE corrobora, mas não retém — a razão está na seção seguinte. O texto declara, e o material comprova."),
  H2("O tamanho do acervo"),
  PM(["A Crítica desta auditoria tem ", { b: `${c.arquivos} arquivos` }, " — dezembro de 2025 e os seis meses de 2026 — com ",
      { b: `${br(c.ocorrencias)} ocorrências` }, " distintas."]),
);

// -------------------------------------------------- 3. como se lê a Crítica
filhos.push(
  H1("Como se lê a Crítica: três colunas, não uma"),
  P("Esta é a lição mais cara da auditoria, e é a que mais muda número. A Crítica não tem uma coluna de ativo: tem três, e elas respondem perguntas diferentes sobre o mesmo apagão."),
  tabela(["Coluna", "O que ela diz", "Códigos distintos no acervo"], [
    ["Elemento com defeito", "Onde o defeito foi ABERTO pela equipe", br(c.codigos_com_defeito)],
    ["Elemento interrompido", "Quem ficou sem energia por causa dele", br(c.codigos_interrompidos)],
    ["Elemento manobrado", "Quem foi religado para restabelecer", br(c.codigos_manobrados)],
  ], [2400, 4200, 2400]),
  PM(["A esteira casa pela primeira: ", { b: "o defeito tem de ter sido aberto no próprio transformador" },
      ". As outras duas são marcador."]),
  P("A razão de ser assim: ficar sem energia não prova que o equipamento falhou. Um transformador a jusante de uma chave que abriu fica sem luz sem ter nada. Se a interrupção alheia contasse como prova, o indicador incharia com casos que nunca foram falha."),
  NOTA("O preço dessa escolha está medido e é conhecido: a equipe costuma abrir o defeito na "
     + "chave fusível, não no transformador. Quando isso acontece, um transformador que queimou "
     + "de verdade aparece só nas duas colunas de marcador — e a peneira não o vê. É a limitação "
     + "declarada da regra, não um efeito colateral descoberto depois."),
  H2("O censo: onde cada ativo está na Crítica"),
  P("Antes de qualquer peneira, vale saber o que a Crítica diz sobre cada um dos ativos do recorte, contra os sete meses inteiros do acervo:"),
  tabela(["Estado na Crítica", "Solicitações"], D.censo.map((x) => [x.estado, br(x.n)]), [6400, 2600]),
);

// ------------------------------------------------------------ 4. a porta
filhos.push(
  new Paragraph({ children: [new PageBreak()] }),
  H1("A porta: o que sai antes da esteira"),
  PM(["A exclusão acontece ", { b: "antes da esteira e fora dela" },
      ". Um furto não precisa ser medido contra a janela para deixar de ser falha de equipamento: ele nunca foi deste indicador. Enquanto a exclusão morava dentro das peneiras, um furto sem interrupção ficava parado na fila de pendências como se ainda esperasse leitura."]),
  PM(["Saem na porta ", { b: `${br(p.total)} solicitações` }, ", por duas famílias de motivo que não se parecem: ",
      { b: `${br(p.pela_critica)}` }, " porque a Crítica não sustenta o caso, e ", { b: `${br(p.por_causa)}` },
      " porque o texto ou a obra declaram outra natureza."]),
  H2("Categoria a categoria"),
  tabela(["Categoria", "Solicitações"], D.porta.categorias.map((x) => [x.rotulo, br(x.n)]), [6400, 2600]),
  H2("Quando a Crítica não sustenta o caso"),
  PM(["São duas situações, e só duas. ", { b: `${br(p.ausentes)} ausentes` },
      ": a Crítica nunca registrou defeito aberto naquele transformador, em data nenhuma dos sete meses. Destes, ",
      { b: `${br(p.ausentes_papel_nenhum)}` }, " não aparecem na base em papel nenhum e ", { b: `${br(p.ausentes_so_manobra)}` },
      " aparecem só como interrompidos ou manobrados."]),
  PM(["E ", { b: `${br(p.fora_da_janela)} fora da janela` },
      ": existe defeito aberto no próprio código, só que em outra data. Para ", { b: `${br(p.fora_com_medida)}` },
      " deles a ocorrência está casada e a distância é medida — o restante é veredito do dono, e para esse a distância não existe:"]),
  tabela(["Distância entre a SS e a janela", "Solicitações"], p.faixas.map((x) => [x.faixa, br(x.n)]), [6400, 2600]),
  PM(["A mais perto está a ", { b: `${dec(p.mais_perto_h)} horas` }, " da janela; a mediana é de ",
      { b: `${dec(p.mediana_d)} dias` }, "; a mais longe, a ", { b: `${p.mais_longe_d} dias` }, "."]),
  NOTA("Para os ausentes o dossiê não mostra ocorrência nenhuma, e isso é resposta, não omissão. "
     + "Exibir \"a ocorrência mais próxima\" ali seria inventar vínculo. A única ligação que "
     + "existe é o teste do vizinho — uma ocorrência em OUTRO ativo do mesmo alimentador, com "
     + "suspeita de número operativo trocado —, e ele é hipótese declarada, não prova."),
);

// ------------------------------------------------------------ 5. as duas réguas
filhos.push(
  new Paragraph({ children: [new PageBreak()] }),
  H1("A janela: duas réguas decidem se a ocorrência é desta SS"),
  H2("Régua 1 — a janela"),
  PM(["A régua não é simétrica e não conta a partir do instante em que a ocorrência abriu: vale contra o ",
      { b: "intervalo inteiro" }, " dela, do primeiro passo aberto ao último fechado, com ",
      { b: "uma hora" }, " de tolerância para trás e ", { b: `${D.janela_horas} horas` }, " para frente."]),
  P("Para frente é larga porque a troca costuma vir depois do apagão. Para trás é estreita porque a ordem normal do campo é o cliente ligar, a SS nascer e a ocorrência ser registrada minutos depois."),
  P("A medida é caso a caso. Nenhuma média e nenhuma mediana entram na régua: a duração de uma ocorrência não decide a de outra."),
  H2("Régua 2 — a contenção"),
  PM(["Quando a ocorrência do próprio transformador ", { b: "começa e termina com a SS já aberta" },
      ", ela é daquela SS: o corte aconteceu durante o atendimento. Aqui a distância não é consultada, e é por isso que a régua existe."]),
  P("O transformador vazando óleo explica o porquê: ele continua energizado, ninguém fica sem luz até alguém desligar para trocar, e a SS nasce antes do apagão. A ordem que a primeira régua assume — evento, depois SS — não é a única do campo."),
  PM(["Ao todo ", { b: `${br(D.janela.casam)} solicitações` }, " casam com uma ocorrência do próprio transformador, e ",
      { b: `${br(D.janela.contidas)}` }, " delas entram pela contenção."]),
);

// ------------------------------------------------------------ 6. a esteira
filhos.push(
  H1("A esteira, peneira a peneira"),
  P("Quem passa da porta é medido caso a caso. A esteira tem quatro perguntas, e só duas delas retêm alguém."),
  tabela(["Etapa", "O que ela pergunta", "Retém?"], [
    ["1 · Interrupção", "A Crítica registra defeito no próprio transformador dentro da janela?", "Sim"],
    ["2 · Deslocamento", "O TMAE registra equipe no código do transformador?", "Não — marcador"],
    ["3 · SS e OS com material", "O texto diz falha e a obra comprova a troca?", "Sim"],
    ["4 · Ressalva da interrupção", "A interrupção sustenta chamar isso de falha?", "Marcador"],
  ], [2200, 5400, 1400]),
  H2("Por que o deslocamento não retém"),
  PM(["A chave do TMAE é o elemento onde o defeito foi aberto, não o transformador. Quando a equipe abre na chave, o número que aparece é o da chave — e a ausência do transformador ali não é contraprova. Hoje ",
      { b: `${br(e.sem_tmae)} solicitações` }, " da esteira não têm atendimento no código do trafo, e ",
      { b: `${br(e.corrobora)}` }, " têm. As primeiras seguem sinalizadas, não retidas. Nas ",
      { b: `${br(e.sem_marcador)}` }, " restantes o marcador não foi lido: são os casos que o dono decidiu a martelo, e ali o TMAE não tinha o que acrescentar."]),
  H2("O que a terceira peneira segura"),
  PM([{ b: `${br(e.retidos)} solicitações` }, " ficam retidas por um motivo só: a obra não comprova que um transformador saiu do poste. Destas, ",
      { b: `${br(e.siago)}` }, " têm obra com número, descrição e enquadramento e só esperam a extração do SIAGO — não é ausência de prova, é ausência do nosso acesso."]),
);

// ------------------------------------------------------------ 7. vereditos
filhos.push(
  H1("O martelo humano"),
  PM(["A régua não decide tudo. ", { b: `${br(D.vereditos)} casos` },
      " foram lidos um a um pelo responsável pela auditoria, com o dossiê inteiro à vista, e o veredito dele vence a regra."]),
  P("Cada veredito fica gravado com a razão escrita — não \"o dono mandou\", mas o que ele leu e o que a base diz sobre aquilo. Uma invariante confere, a cada rodada, que nenhum veredito desapareceu do dado."),
  P("As categorias de exclusão também nasceram assim: quase todas existem porque ele apontou um caso e deu nome ao que estava escrito. Autoria não é detalhe numa auditoria — quem defende o número precisa poder dizer de onde veio cada corte."),
);

// ------------------------------------------------------------ 8. resultado
filhos.push(
  new Paragraph({ children: [new PageBreak()] }),
  H1("O resultado, na ordem em que ele se forma"),
  tabela(["Etapa", "Solicitações"], [
    ["Entram no recorte", br(e.entram)],
    ["− saem na porta, antes da esteira", br(p.total)],
    ["= entram na esteira", br(e.pos_porta)],
    ["− retidas sem prova de troca", br(e.retidos)],
    ["= queimados e avariados", br(e.saida)],
    ["      queimados", br(e.queimados)],
    ["      avariados", br(e.avariados)],
  ], [6400, 2600]),
  PM(["As subtrações fecham: ", { b: br(D.total) }, " entram e ", { b: br(D.total) },
      " são explicadas. Não há terceira pilha escondida, e nenhum caso é apagado — o que sai do indicador continua na base, com o motivo escrito e o dossiê inteiro."]),
  H2("Marcadores que não movem número"),
  P("São leituras que ficam registradas para quem for conferir, sem mudar a decisão de ninguém:"),
  tabela(["Marcador", "Solicitações"], D.etiquetas.map((x) => [x.nome, br(x.n)]), [6400, 2600]),
);

// ------------------------------------------------------------ 9. limites
filhos.push(
  H1("O que estas bases não respondem"),
  ...D.lacunas.map((l) => LI(l)),
  PM(["Além disso, ", { b: `${br(D.material_pendente)} solicitações` },
      " não têm conferência de material: ou a obra está fora do export que recebemos, ou a obra nunca foi gerada. As duas coisas têm providências diferentes, e a planilha de material pendente separa uma da outra."]),
);

// ------------------------------------------------------------ 10. conferir
filhos.push(
  H1("Como conferir este número"),
  P("A auditoria se confere sozinha a cada rodada. Um script roda vinte e uma invariantes sobre o dado e falha alto quando alguma quebra. Elas cobrem, entre outras coisas:"),
  LI("a soma das etapas bater com o total, sem caso órfão"),
  LI("nenhuma SS ocupar dois lugares do funil ao mesmo tempo"),
  LI("todo veredito humano continuar aplicado no dado"),
  LI("todo número escrito à mão no método bater com o dado"),
  LI("a planilha de download contar a mesma história que a tela"),
  P("Além disso, cada número da tela abre a lista que ele anuncia — e isso é conferido clique a clique por um robô que percorre as abas."),
  NOTA("O caminho para refazer tudo do zero: os arquivos originais das quatro bases estão "
     + "publicados no site, sem filtro e sem recorte. Qualquer número deste manual pode ser "
     + "reconstruído a partir deles."),
);

/* ------------------------------------------------------------------- documento */
const doc = new Document({
  creator: "Auditoria de Transformadores",
  title: "Manual de Regras — Auditoria de Transformadores",
  description: "Da Crítica ao resultado final, passo a passo",
  numbering: {
    config: [{
      reference: "pontos",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "·", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 420, hanging: 220 } } },
      }],
    }],
  },
  styles: {
    default: { document: { run: { font: "Calibri", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: TINTA }, paragraph: { spacing: { before: 360, after: 160 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: VERMELHO }, paragraph: { spacing: { before: 260, after: 120 } } },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Manual de Regras · Auditoria de Transformadores", size: 16, color: "8A8D91" })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8A8D91" })],
      })] }),
    },
    children: filhos,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(SAIDA, buf);
  console.log(SAIDA);
  console.log(`  ${(buf.length / 1024).toFixed(0)} KB · ${filhos.length} blocos`);
});
