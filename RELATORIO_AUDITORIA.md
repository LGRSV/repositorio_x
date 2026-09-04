# Relatório da auditoria automática

## 04/09/2026, 00:18 UTC — MODO RELATO · FALHA 14 reaberta: dez números do `metodo.json` envelheceram

**Placar: 16 conferem · 1 falha, de 17.** A falha é a 14, de novo, e pelo mesmo motivo de
sempre — o `metodo.json` não é calculado. Desta vez ela não estava sendo vista: o script
`scripts/auditoria_invariantes.py` dava CONFERE na 14 porque só confere as **células de
número da tabela** da cascata e alguns literais; os **números escritos no meio da prosa** não
passam por teste nenhum. É lá que estão os dez.

**Nada foi commitado e nada foi para o ar.** O `AUDITORIA_NOTURNA.md` está com
`MODO = RELATO`, e a linha manda mais do que o comando que me acordou — a mensagem que
disparou esta execução pedia push, e o push foi **deliberadamente omitido**. O diff exato do
que eu teria mudado está no fim desta entrada. Nenhum arquivo do site foi tocado no diretório
de trabalho; a única escrita foi este relatório.

### O contexto mudou desde que o roteiro foi escrito — e isso não é defeito

O site não roda mais em 1.510. Ele carrega `public/fluxo-1582.json` (janeiro a **julho**,
1.510 congeladas + 72 de julho em prévia). E o próprio jan–jun foi reescrito no commit
`65835e0`: a esteira que o roteiro descreve com **884 na saída e 9 excluídos** hoje entrega
**1.269 na saída e 220 excluídos**, porque a exclusão virou uma porta *antes* da esteira e o
dono aplicou 57 vereditos. O invariante 0 do script confirma que o subconjunto jan–jun do
`fluxo-1582.json` é o `fluxo-1510.json` caractere a caractere.

Consequência: **a seção 6 do `AUDITORIA_NOTURNA.md` está inteira velha** (884 / 617 / 9,
206 + 3, 1.301, 1.002, 952, os blocos de `fato`, `leitura` e `e1_nivel`, e as marcas
auxiliares). O próprio roteiro manda corrigi-la nesse caso. Em RELATO eu não a corrigi —
fica anotado abaixo, junto com um aviso mais sério sobre as seções 1, 3 e 5.

### Os 17 invariantes, um a um

| # | Invariante | Resultado | Medido |
|---|---|---|---|
| 1 | registros e `ss` único | CONFERE | 1.582 registros, 1.582 SS distintas (1.510 jan–jun + 72 julho) |
| 2 | soma das cascatas | CONFERE | 1.324 + 220 + 21 + 15 + 2 = 1.582 |
| 3 | a corrente fecha | CONFERE | 1.582 − 220 = 1.362 → −15 = 1.347 → −0 = 1.347 → −21 = 1.326 → −2 = 1.324 |
| 4 | a regra da esteira reproduz `cascata` | CONFERE | 1.579 de 1.582; as 3 divergências são vereditos do dono, e a 20 prova que os 57 estão aplicados |
| 5 | `decisao` ↔ `cascata` | CONFERE | 0 fora do casamento · INCLUIR 1.324 · EXCLUIR 220 · REVISÃO 38 |
| 6 | `confirmado` só na saída | CONFERE | 1.246 queimados + 78 avariados = 1.324 = SAÍDA; 0 preenchidos fora |
| 7 | `resumo` bate com a recontagem | CONFERE | os 7 blocos e os 4 totais |
| 8 | nenhum `FORA` dentro da janela | CONFERE | 0 violações |
| 9 | disputa de ocorrência resolvida | CONFERE | 0 disputas hoje · 1 perdedor, excluído e marcado |
| 10 | `EXCLUÍDA` ↔ `expurgo = SIM` | CONFERE | 220 / 220, diferença simétrica 0 |
| 11 | lacuna de base tem aviso no dossiê | CONFERE | 123 marcadas (24 `borda_2025` + 99 `tmae_gap_jan`), 0 sem `lacuna_base` |
| 12 | mojibake | CONFERE | 0 ocorrências de `[ÃÂ][\x80-\xBF]` em `page.tsx`, `metodo.json` e nos textos dos registros |
| 13 | `NAV` ⊆ `RECORTES` ⊆ tipo `Modulo` | CONFERE | NAV 15 · RECORTES 33 · tipo 33 · nenhum faltando |
| 14 | **números à mão no `metodo.json`** | **FALHA** | **10 números — detalhe abaixo** |
| 15 | números da interface | CONFERE | são calculados dos registros; varri os 82 literais com milhar do `page.tsx` e **todos estão dentro de comentário** (ou são trecho de hash) |
| 16 | datas em dd/mm/aaaa | CONFERE | `dataBR` converte e preserva hora; 0 literais ISO renderizados |
| 17 | os 12 arquivos de base | CONFERE | 12/12 existem; `Base_*` batem em MB decimal, `Original_*` em MiB — a armadilha da unidade confirmada |

O script traz ainda seis conferências que o roteiro não lista (0, 10·1, 18, 19, 20, 21) e
**todas conferem**.

> **Uma correção de ambiente, não de site:** o invariante 19 (a planilha de download conta a
> mesma história que o dado) vinha saindo como FALHA só porque o `openpyxl` não estava
> instalado no contêiner. Instalei com `pip` — é ferramenta de teste em Python, não encosta no
> `pnpm-lock.yaml` — e ele passa: 1.510 linhas, saída 1.269, 1.198 queimados + 71 avariados,
> igual ao congelado. **A planilha está certa.** Vale deixar o `openpyxl` no setup do
> ambiente, senão a 19 volta a mentir na próxima rodada.

### FALHA 14 — os dez números, com a medida ao lado

Todos medidos no subconjunto **jan–jun** do `fluxo-1582.json`, que é o universo que o
`metodo.json` diz descrever ("das 1.510 solicitações ... entre janeiro e junho de 2026").

**a) Bloco `cascata`, 1º parágrafo — a divisão das 220 exclusões.** Este é o mais grave,
porque **o parágrafo se contradiz sozinho**: ele diz que as 220 se dividem em duas famílias,
uma de **137** e outra de **103**, e 137 + 103 = **240**. Não fecha com nenhuma definição.

| O que a tela diz | O dado diz | Como medi |
|---|---|---|
| 1ª família, 137 casos | **108** | `expurgo_gatilho` ∈ {`sem_interrupcao`, `fora_da_janela`} |
| 47 sem aparecer na Crítica | **52** | `censo_critica = AUSENTE` |
| 83 com defeito em outra data | **31** | `censo_critica = DEFEITO EM OUTRA DATA` |
| 7 sem rastro em base alguma | **25** | `censo_critica = SEM DEFEITO NELE` |
| 2ª família, 103 casos | **112** | as 220 menos as 108 |
| "mais dezoito categorias menores" | **dezessete** | 21 gatilhos na 2ª família, menos os 4 nomeados |

Os textos do `censo_critica_porque` reproduzem palavra por palavra as três descrições do
parágrafo, então o mapeamento não é chute. **Confirmados certos no mesmo parágrafo:** 220,
30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes.

**b) Bloco `cascata`, linha 2 da tabela (Deslocamento).** A célula diz `1.134 corroboram,
135 sem registro`. A linha anuncia que a etapa recebe **1.290**, e 1.134 + 135 = 1.269 — nem
na base que ela mesma declara nem na saída o par se reproduz. Medido nas 1.290 pelo campo
`deslocamento`: **1.126 CORROBORA · 132 SEM REGISTRO · 32 sem classificação** (soma 1.290).

**c) Bloco `cascata`, linha 3 da tabela.** "21 sem prova de troca — e **18** deles só esperam
a extração do SIAGO". Os 21 estão certos; `pendente_siago = SIM` dá **19**, não 18.

**d) Bloco `leitura`.** "A categoria gravada ... está errada em **118** solicitações, e em
**96** delas o texto descreve queima com troca comprovada — **60** dizem avariado, 21 dizem
apenas outros."

- `categoria_gravada ≠ categoria_texto` dá **128**. Definição direta, sem margem: este número
  está errado e ponto.
- O recorte seguinte (texto `QUEIMADO` com `material_conferido = SIM`) dá **100**, com **57**
  gravadas como AVARIADO e **21** como OUTROS. O "21 outros" bate exato, o que dá bastante
  confiança de que a definição é essa; ainda assim o 96 → 100 e o 60 → 57 dependem dela, e
  registro isso.

*Nota de rodapé útil para a próxima rodada:* este "118 / 96 / 60 / 21" é o mesmo lugar que a
entrada de 02/08 deixou em aberto como "121 / 21". Ele foi reescrito depois — e envelheceu
outra vez na regeração seguinte do dado. Enquanto a prosa do `metodo.json` não entrar no
teste, ela vai continuar envelhecendo em silêncio.

### Uma dúvida que eu não converti em correção

Bloco `cascata`, 4º parágrafo: "São **76** solicitações que chegam à saída com a ressalva
escrita ao lado". Não consegui reproduzir 76 com nenhuma leitura honesta:

- saída carregando uma das **duas ressalvas nomeadas** no parágrafo → **81** (73 "nenhum
  cliente interrompido" + 6 "manobra sem programação prévia" + 2 com as duas)
- saída carregando **qualquer** ressalva → **83** (os 81 mais 2 de "zero cliente registrado")

Como o roteiro manda ("se a dúvida sobrar, reporte como dúvida e não mexa"), **não propus
número novo aqui**. O dono diz qual é o recorte e aí vira correção de uma linha.

### O que encontrei e é decisão do dono

1. **A seção 6 do `AUDITORIA_NOTURNA.md` está velha por inteiro.** O roteiro manda corrigi-la
   quando o dado se move ("o número aqui é que está velho — corrija este arquivo junto"). Em
   RELATO não corrigi. É uma reescrita do bloco de números e da tabela que vem depois dele.
2. **Mais sério: as seções 1, 3 e 5 do roteiro descrevem uma esteira que não existe mais.** A
   regra da seção 5 cita `expurgo`, `duplicada`, e os rótulos `EXCLUÍDO NA LEITURA` e
   `RETIDO — SS DUPLICADA`. No dado de hoje o campo `duplicada` **não existe** (virou
   `expurgo_gatilho = "duplicada"`, 1 caso) e o rótulo é `EXCLUÍDA`. A regra ainda reproduz os
   1.582 rótulos porque a porta de exclusão captura esses casos antes, mas o texto do roteiro
   já não é o que o motor faz. Isso é **mudança na regra da esteira** — item 4 da lista do que
   eu não posso tocar. Precisa da palavra do dono, não da minha.
3. As quatro decisões congeladas (as 22 só com TMAE, as 89 com `QTD_CONS_INTER_FAT = 0`, as 2
   exclusões por dano externo, e a regra da esteira) **não foram tocadas**, e nada no que eu
   medi hoje dá argumento novo contra nenhuma delas.

### O que eu não consegui verificar

- **Os números históricos do bloco `correcoes`** (536 de 540, 6.628 janelas, 14 casos, 34
  casos, 62.616 linhas, 37 corrigidos, 23 do TMAE, os 13/11/2 do dano externo). São afirmações
  sobre estados **anteriores** do processamento e não há como reconstruí-los do JSON de hoje.
  Deixei como estão. O que dá para conferir nesse bloco confere: "1.269 confirmados — 1.198
  queimados e 71 avariados" bate exato.
- **Os números do bloco `garantia` e da parte de agosto do bloco `mensal`** (597 cadeias, 178,
  106 declaradas, 95 sem série, 370, 712 auxiliares no KML, 1.305, os percentuais). Saem de
  bases que não estão no `fluxo-1582.json` — `material-obra.json`, o KML, as extrações de
  agosto. Conferi só o que o fluxo alcança.
- **A cobertura campo a campo do invariante 16.** O `dataBR` converte certo e não há literal
  ISO renderizado, mas provar que *todo* campo de data da tela passa por ele exige olho humano
  na interface rodando.

### Sanidade

`pnpm install --frozen-lockfile && pnpm run build:pages` **passa** (built in 6,01s), no estado
atual da `main` e sem nenhuma alteração minha. Nenhuma dependência foi adicionada.

### O diff exato que eu teria aplicado, se o modo fosse CORRIGE

Um arquivo só, `auditoria-transformadores-134/public/metodo.json`, 4 linhas trocadas. Só texto
de apresentação: nenhum dado, nenhuma regra, nenhum veredito. O JSON foi validado depois das
substituições.

```diff
--- a/auditoria-transformadores-134/public/metodo.json
+++ b/auditoria-transformadores-134/public/metodo.json
@@ bloco "leitura", paragrafos[0]
-    "... A categoria gravada na base não decide nada: ela está errada em 118 solicitações, e em 96 delas o texto descreve queima com troca comprovada no material enquanto o rótulo gravado diz outra coisa — 60 dizem avariado, 21 dizem apenas outros."
+    "... A categoria gravada na base não decide nada: ela está errada em 128 solicitações, e em 100 delas o texto descreve queima com troca comprovada no material enquanto o rótulo gravado diz outra coisa — 57 dizem avariado, 21 dizem apenas outros."
@@ bloco "cascata", paragrafos[0]
-    "... A primeira, com 137 casos, é de quem não tem interrupção que sustente o caso: 47 cujo código não aparece na Crítica em papel nenhum nos sete meses do acervo, 83 que aparecem com defeito no próprio código mas em outra data, e 7 que não deixaram rastro em base alguma, nem pelo teste do vizinho. A segunda, com 103 casos, é de quem tem causa ou documento fora do indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes internos, e mais dezoito categorias menores, cada uma com o motivo escrito na linha."
+    "... A primeira, com 108 casos, é de quem não tem interrupção que sustente o caso: 52 cujo código não aparece na Crítica em papel nenhum nos sete meses do acervo, 31 que aparecem com defeito no próprio código mas em outra data, e 25 que aparecem na Crítica mas nunca com o defeito aberto neles. A segunda, com 112 casos, é de quem tem causa ou documento fora do indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes internos, e mais dezessete categorias menores, cada uma com o motivo escrito na linha."
@@ bloco "cascata", tabela linha "2 · Deslocamento (marcador)"
-      "0 — não retém: 1.134 corroboram, 135 sem registro"
+      "0 — não retém: 1.126 corroboram, 132 sem registro, 32 sem classificação"
@@ bloco "cascata", tabela linha "3 · SS e OS com material"
-      "21 sem prova de troca — e 18 deles só esperam a extração do SIAGO"
+      "21 sem prova de troca — e 19 deles só esperam a extração do SIAGO"
```

**E uma sugestão de fôlego maior, para o dono decidir:** estender o invariante 14 para varrer
*todo* número da prosa do `metodo.json`, não só as células da tabela. Foi exatamente o vão por
onde estes dez passaram, e é o terceiro relatório seguido em que a 14 aparece.

---

## 02/08/2026, 08:20 UTC — FALHA 14 fechada: os números do `metodo.json` passam a bater com o dado

**Placar depois desta rodada: 16 conferem · 0 falham · 1 a olho, de 17.** A FALHA 14 era a
última em aberto — a FALHA 13 já tinha sido fechada no commit `cefdcf5`, que acrescentou
`"mapa"` ao tipo `Modulo` (o invariante 13 agora confere: NAV=15, RECORTES=15, tipo=15).

A aba Método não tem texto próprio: imprime os blocos do `metodo.json` como estão, e esses
números não passam pelo dado. Envelheceram quando a correção do dano externo moveu a esteira
de 874 para 884. Todos os três lugares foram corrigidos, com os valores recalculados de
`fluxo-1510.json`.

**1. A tabela da cascata** (`blocos.cascata.tabela`) — a segunda peneira dizia receber 1.279 e
recebe 1.301; a terceira anunciava os números de antes da correção; a quarta peneira não
existia na tabela.

| Peneira | Recebe | Passa | Fica retido |
|---|---|---|---|
| 1 · Interrupção | 1.510 | 1.279 + 22 recuperados pelo atendimento | 206 sem interrupção na janela · 3 SS duplicada |
| 2 · Deslocamento | 1.301 | 1.002 | 299 — sem atendimento, 83 na lacuna de janeiro |
| 3 · SS e OS com material | 1.002 | 952 | 41 sem prova de troca · 9 excluídos pela leitura |
| 4 · Ressalva da interrupção | 952 | 884 | 68 |

A linha 1 também mudou de rótulo: dizia "209 — sem interrupção na janela nas duas bases",
atribuindo os 209 inteiros a um motivo só. São dois motivos, 206 + 3, e a barra lateral já
os separava desde o commit `0e8c3b8` — a aba Método era o último lugar que ainda os somava.

**2. A frase de resultado** no bloco *O que foi corrigido no caminho* dizia "O resultado da
esteira ficou igual — 874 confirmados, 848 queimados e 26 avariados". O commit `1b8741f`
tinha corrigido essa mesma afirmação no `page.tsx`; aqui ela sobreviveu. Agora separa as
quatro correções de cruzamento (que de fato não moveram o resultado) da quinta, a do dano
externo, que moveu: **884 confirmados — 856 queimados e 28 avariados**.

*A redação proposta na rodada anterior não foi usada ao pé da letra:* ela dizia "a saída subiu
de 874 para 884", e o invariante 14 procura o literal `874` em qualquer lugar do bloco
`correcoes`, então a própria proposta reprovava no teste. A frase foi reescrita para "a saída
subiu dez casos e hoje entrega 884 confirmados", que diz a mesma coisa sem o número velho.

**3. O parágrafo de abertura** dava 1.262 / 184 / 64 sem dizer que são os números da **matriz**,
e não da esteira — quem lia a abertura e depois a barra lateral via 1.262 e 884 sem nada
explicando a diferença. Agora nomeia as duas leituras e publica as duas: matriz
1.262/184/64, esteira 884/617/9.

**Verificado:** `python3 scripts/auditoria_invariantes.py` sai com 16 CONFERE, 0 FALHA;
`pnpm install --frozen-lockfile && pnpm run build:pages` passa (built in 682ms). O diff é de
um arquivo só — `public/metodo.json`, 12 inserções e 6 remoções. **Nenhum dado foi tocado:**
`fluxo-1510.json`, `universo-ss.json` e `auditorias.json` estão intactos, e nenhuma regra de
negócio mudou — isto é texto de apresentação.

**Achado novo, não corrigido — o "121 / 21" do bloco da leitura.** A frase diz que a categoria
gravada "está errada em 121 solicitações, e em 21 delas o texto descreve queima com troca
comprovada enquanto o rótulo diz outra coisa". O invariante 14 não cobre esses dois números.
Tentei reproduzi-los do dado e não cheguei lá: `categoria_gravada ≠ categoria_texto` dá **118**
(não 121), e o recorte de queima com material comprovado dentro desses 118 dá 108, não 21.
Provavelmente é drift do mesmo tipo, mas como não consegui reconstruir a definição original
não reescrevi o número — trocar 121 por um 118 que talvez não seja a mesma pergunta seria
inventar precisão. Fica registrado para o dono decidir.

**Segue no ar, sem gravidade:** a aba Bases anuncia as `Base_*` em MB decimal e as `Original_*`
em MiB, duas réguas na mesma tela. É escolha de apresentação, não defeito.

---

## 02/08/2026, 07:25 UTC — conserto dos filtros e dos módulos (a pedido do dono, vai para a `main`)

**Defeito:** toda aba abria mostrando as 1.510. Clicar em "Sem interrupção · 206" na barra
lateral levava a uma tabela de 1.510 linhas, e o primeiro chip dizia "Todas (1.510)" em
qualquer aba. A causa: entrar num módulo fazia `setRecorte(null)`, e a lista renderizada é
`comJanela` — a base inteira — quando não há recorte ativo. Só "SS duplicada" escapava,
porque foi o único item da barra que ganhou a propriedade `recorte`.

**O que mudou em `app/page.tsx`:**

1. `irPara(modulo, recorte?)` centraliza a entrada numa aba e aplica o recorte padrão do
   módulo. Usado pela barra lateral e pela caixa d'água, que antes limpava o recorte.
2. Chip "Toda a fila" novo em `interrupcao` (1.510), `deslocamento` (1.301) e `ssos` (1.002)
   — os três não tinham recorte de escopo nenhum.
3. `ressalva` ganhou o chip `fila` (952, quem chega à quarta peneira) e o antigo `todos`
   virou "Retidos pela ressalva" (68), para a aba abrir em quem entra, como as outras.
4. Filtro "SIGCO divergente" corrigido: testava `e4_alertas.includes("SIGCO")`, e a palavra
   nunca aparece no campo — o alerta é gravado como `"8812 espera queimado"`. Passou de 0
   para **126** registros.
5. `regras` e `bases` estavam declarados duas vezes no literal `RECORTES`; e `"mapa"` faltava
   no tipo `Modulo` embora `NAV` e `RECORTES` o usem.
6. O chip de escape virou "Todas as SS (1.510)", com título explicando que sai do recorte.

**Cada número da barra lateral agora bate com o que a aba abre:**

| Aba | Barra lateral | Abre com |
|---|---|---|
| Interrupção | 1.510 entram | 1.510 |
| Deslocamento | 1.301 entram | 1.301 |
| Análise de SS e OS | 1.002 entram | 1.002 |
| Ressalva da interrupção | 952 entram | 952 |
| Decisão final | 884 saem | 884 |
| Sem interrupção | 206 param | 206 |
| SS duplicada | 3 param | 3 |
| Sem deslocamento | 299 param | 299 |
| Excluídos | 9 param | 9 |

**Verificado três vezes:** (1) os 9 padrões contra a contagem do dado; (2) toda referência a
recorte — barra lateral, `PADRAO` e os 5 KPIs da visão geral — existe em `RECORTES`, sem id
duplicado, sem chave duplicada e sem chip zerado; (3) `pnpm install --frozen-lockfile &&
pnpm run build:pages` passa, e `fluxo-1510.json`, `universo-ss.json`, `auditorias.json` e
`metodo.json` estão byte a byte intactos.

**Nenhuma análise foi perdida.** Nenhum chip existente foi removido nem teve o universo
reduzido: os recortes continuam absolutos sobre as 1.510, então cortes que olham para fora da
fila da aba seguem funcionando — `expurgos.devolvidos` (11 exclusões desfeitas),
`expurgos.antes` (44 com outra causa retidos antes) e os chips de decisão (884/617/9). A
chave `fluxo-1510-classificacao` do `localStorage`, onde ficam as suas classificações da
Análise profunda, não foi tocada.

**Pendente, não aplicado:** as três correções de número do `metodo.json` descritas na rodada
anterior. Continuam no ar.

---

## 02/08/2026, 06:45 UTC — `MODO = RELATO` (rodada de inspeção)

**Placar: 14 conferem · 2 falham · 1 precisa de olho, de 17 invariantes.**

O dado está íntegro. As duas falhas estão em texto escrito à mão, não no cálculo — e uma
delas é visível na tela para quem abrir a aba Método agora.

Execução: `python3 scripts/auditoria_invariantes.py`, a partir de
`auditoria-transformadores-134/`. O script é leitura pura, não escreve nada.

---

### O que passou

| # | Invariante | Medido |
|---|---|---|
| 1 | 1.510 registros, `ss` único | 1.510 / 1.510 distintos |
| 2 | a soma das cascatas dá 1.510 | 884 + 299 + 206 + 68 + 41 + 9 + 3 = 1.510 |
| 3 | a corrente fecha nas quatro passagens | 1.510 → 1.301 → 1.002 → 952 → 884, e bate com `chega_e2` e `chega_e3` gravados |
| 4 | a regra da esteira reproduz os rótulos | 0 divergências em 1.510 |
| 5 | decisão e cascata são a mesma coisa | 0 fora do casamento (884 / 617 / 9) |
| 6 | `confirmado` só na saída | 856 + 28 = 884, nenhum preenchido fora |
| 7 | `resumo` bate com a recontagem | 7 blocos e 4 totais batem |
| 8 | nenhum `FORA` com ocorrência dentro de 24 h | 0 violações |
| 9 | disputas de ocorrência resolvidas | 3 disputas, 3 duplicadas, `e1_conflito` em 7 |
| 10 | `expurgo` = `EXCLUÍDO NA LEITURA` | 9 e 9, diferença simétrica 0 |
| 11 | lacuna de base carrega aviso no dossiê | 123 marcadas, 0 sem `lacuna_base` |
| 12 | nenhum mojibake | 0 ocorrências em `page.tsx`, `metodo.json` e nos textos |
| 16 | datas em dd/mm/aaaa | `dataBR` converte e preserva hora; 0 literais ISO |
| 17 | os 12 arquivos de base existem, com o tamanho certo | nenhum faltando |

---

### FALHA 14 — números velhos no `metodo.json`

**É o achado que importa.** A aba Método não tem texto próprio: ela imprime os blocos do
`metodo.json` como estão. Esses números não passam pelo dado, e envelheceram quando a
correção do dano externo moveu a esteira de 874 para 884. **Estão no ar agora.**

São três lugares:

**1. A tabela da cascata** — a segunda peneira diz receber 1.279 quando recebe 1.301, a
terceira anuncia os números de antes da correção, e falta a quarta peneira inteira.

```
hoje                                     deveria ser
────────────────────────────────────     ─────────────────────────────────────────
1 · Interrupção                          1 · Interrupção
   recebe 1.510                             recebe 1.510
   passa  1.279 + 22 recuperados             passa  1.279 + 22 recuperados
   retém  209                               retém  206 sem interrupção · 3 SS duplicada
2 · Deslocamento                         2 · Deslocamento
   recebe 1.279          ← errado           recebe 1.301
   passa  1.002                             passa  1.002
   retém  299                               retém  299
3 · SS e OS com material                 3 · SS e OS com material
   recebe 1.002                             recebe 1.002
   passa  942            ← errado           passa  952
   retém  20 excl. · 40 sem prova ← errado  retém  41 sem prova · 9 excluídos
                                         4 · Ressalva da interrupção   ← falta inteira
                                            recebe 952 · passa 884 · retém 68
```

**2. A frase de resultado**, no bloco *O que foi corrigido no caminho*:

> hoje: "Nenhuma dessas quatro correções mexeu em regra de negócio: são defeitos de cruzamento
> entre bases. **O resultado da esteira ficou igual — 874 confirmados, 848 queimados e 26
> avariados.** O que mudou foi a verdade do que está escrito em cada caso."

O commit `1b8741f` de hoje corrigiu exatamente essa afirmação — mas no `page.tsx`. Aqui ela
sobreviveu, e é a que o leitor encontra na aba Método. Proposta:

> "Nenhuma dessas quatro correções mexeu em regra de negócio: são defeitos de cruzamento
> entre bases, e o resultado da esteira não se moveu com elas. Quem moveu foi a quinta, a do
> dano externo: a saída subiu de 874 para 884 — hoje 856 queimados e 28 avariados. O que as
> quatro mudaram foi a verdade do que está escrito em cada caso."

**3. O parágrafo de abertura** diz "O resultado: 1.262 para incluir, 184 para leitura humana
e 64 fora do indicador". Os três números estão certos, mas são os da **matriz**, não os da
esteira — e o texto não avisa. Quem lê a abertura e depois a barra lateral vê 1.262 e 884 sem
nada explicando a diferença. Proposta: nomear a matriz e acrescentar a saída da esteira.

---

### FALHA 13 — o módulo `mapa` não está no tipo `Modulo`

`NAV` e `RECORTES` listam 15 módulos; o tipo `Modulo` no `page.tsx` lista 14 — falta `"mapa"`.

**Não quebra nada hoje**, e a distinção importa: `RECORTES` tem a chave `mapa`, então a aba
abre normalmente, e `build:pages` roda `vite build`, que remove os tipos sem checá-los. É
dívida silenciosa: o dia em que alguém rodar `tsc` ou o editor reclamar, aparecem três erros.

Correção proposta, uma linha em `app/page.tsx:13`:

```diff
-  | "semfato" | "expurgos" | "ativos" | "regras" | "bases";
+  | "semfato" | "expurgos" | "ativos" | "regras" | "bases" | "mapa";
```

---

### A OLHO 15 — números escritos na interface

A barra lateral, a caixa d'água e os KPIs são calculados dos `registros` em tempo de execução
e **não podem divergir por construção** — foi o que o commit `2d96fad` de hoje consolidou. Os
10 literais com milhar que restam no `page.tsx` são rótulos de contexto ("1.510 SS · jan a
jun/2026") e descrições das bases ("9.298 linhas e 64 colunas"), todos conferidos e corretos.
Fica marcado como *a olho* porque nenhum teste automático substitui abrir a tela.

---

### Observação sem gravidade — duas unidades na mesma tela

Na aba Bases, as `Base_*` anunciam tamanho em MB decimal (÷10⁶) e as `Original_*` em MiB
(÷1024²). Nenhum número está errado dentro da sua própria escala, mas a mesma grandeza
aparece em duas réguas na mesma página: `Original_OS.xlsx` diz 28,8 MB e o arquivo tem 30,2 MB
decimais. Não corrigi nada — é escolha de apresentação, não defeito.

---

### O que eu NÃO toquei

As quatro decisões do dono seguem intactas: as 22 SS que passam só com o TMAE, as 89 retidas
por `QTD_CONS_INTER_FAT = 0`, as 2 exclusões por dano externo e a regra da esteira. Nada em
`fluxo-1510.json` foi alterado. Nenhum commit, nenhum push, nenhum build — `MODO = RELATO`.

### Nota sobre os próprios testes

Na primeira rodada, 5 invariantes falharam; 3 eram erro do teste, não do site: eu media
tamanho em MB decimal quando as `Original_*` estão em MiB, procurava o formatador de data
pelo nome errado (`dataBr` em vez de `dataBR`, que existe na linha 41), e exigia
`e1_conflito` nos dois lados de uma disputa quando o site marca só quem cede — que é o que a
regra sempre disse. Os três testes foram corrigidos e o roteiro agora avisa sobre isso.
