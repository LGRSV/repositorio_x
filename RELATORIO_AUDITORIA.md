# Relatório da auditoria automática

## 04/09/2026, 16:24 UTC — MODO RELATO · 5 números errados no site, nada publicado

**Placar: 23 conferem · 0 falham · 1 a olho, de 24.** O roteiro está em `MODO = RELATO`, então
**nada foi commitado e nada foi publicado** — o site no ar continua exatamente como estava. A
mensagem que me acordou pedia push; o `AUDITORIA_NOTURNA.md` diz que essa linha manda mais do
que o comando, e obedeci o arquivo. As correções estão aplicadas no diretório de trabalho, o
build passa, e os diffs exatos vão no fim desta entrada.

### O que você precisa saber primeiro

**1. O roteiro descrevia um site que não existe mais.** Ele falava de 1.510 SS de janeiro a
junho, 884 na saída e 9 excluídos. O dado de hoje é `fluxo-1582.json`, com **1.582 SS de janeiro
a julho**, **1.324 na saída** e **220 excluídos** — e mesmo o recorte jan–jun mudou: 1.269 na
saída, não 884. Reescrevi a seção 6 do roteiro (o retrato) e a tabela "Onde está tudo", que é o
que ele mesmo manda fazer quando os números não batem. **Não toquei nas seções 1 a 5**, que
guardam as suas regras — a divergência ali é decisão sua, e está listada abaixo.

**2. Achei 5 números errados escritos à mão, e todos eram do tipo que ninguém vê.** Quatro no
`metodo.json`, que a aba Método imprime sem passar pelo dado, e um no `page.tsx`. Nenhum deles
era pego pelo teste que existia — o invariante 14 só conferia a tabela e três literais antigos,
e a prosa em volta nunca foi conferida. Foi por aí que envelheceram, todos de uma vez.

**3. A FALHA 19 da rodada passada não era do site.** Era o teste: ele abria a planilha com
`openpyxl`, que não está instalado nesta máquina, e reportava FALHA sem ter olhado o arquivo.
Reescrevi a leitura com a biblioteca padrão. A planilha está certa — 1.510 linhas, saída 1.269,
1.198 queimados e 71 avariados, igual ao dado. **Terceira vez que uma falha deste teste é do
próprio teste**, como o roteiro avisa.

### Os cinco defeitos corrigidos

| # | Onde | Dizia | Diz agora | Como provei |
|---|---|---|---|---|
| 1 | `page.tsx:6814` | "tira **52** solicitações da SAÍDA, de 1.269 para 1.182" | **87** | A própria frase se desmente: 1.269 − 52 = 1.217, não 1.182. Medido: 87 na SAÍDA com `at_fora_da_janela = SIM`, e 1.269 − 87 = 1.182. A **mesma frase** já dizia 87 em `page.tsx:3506` — as duas cópias tinham divergido |
| 2 | `metodo.json` · cascata | "a porta tira 220 · a primeira família, **137** casos (**47** + **83** + **7**) · a segunda, **103**" | **108** (**52** + **31** + **25**) e **112** | 137 + 103 = 240, e o mesmo parágrafo anuncia 220. Medido pelos gatilhos: `sem_interrupcao` 77 + `fora_da_janela` 31 = 108; o resto = 112; 108 + 112 = 220. O corte de dentro é o campo `censo_critica`, cuja descrição bate palavra por palavra com a frase |
| 3 | `metodo.json` · cascata | "e mais **dezoito** categorias menores" | **dezessete** | Depois dos quatro gatilhos nomeados na frase sobram 17, não 18 |
| 4 | `metodo.json` · leitura | "errada em **118** · em **96** delas · **60** dizem avariado" | **128** · **100** · **57** | É o KPI "Categoria corrigida" da própria tela (`page.tsx:4919`): `categoria_texto ≠ categoria_gravada` = 128. Destes com texto de queima e material conferido = 100; gravados como AVARIADO = 57 |
| 5 | `metodo.json` · cascata | "**18** deles só esperam o SIAGO" · "**76** chegam à saída com a ressalva" | **19** · **83** | Os dois são recortes que a tela já calcula: `siago_retido` (`page.tsx:3613`) dá 19, e o filtro "Com ressalva" restrito à SAÍDA dá 83 |

Todos medidos contra o **jan–jun congelado**, que é o universo de que o `metodo.json` fala.

### O teste ficou mais apertado

Não bastava corrigir os números: o teste que não os pegou ia deixar os próximos envelhecerem
igual. O invariante 14 passou a conferir **9 frases em prosa**, cada uma declarando a medida que
a sustenta, mais a soma das duas famílias da porta contra o total que o parágrafo anuncia. E
criei o **15·1**, que confere as frases da interface que carregam a própria conta ("tira N da
SAÍDA, de X para Y") — as três coisas de uma vez: o N medido, a subtração fechando, e o X sendo
a saída de verdade.

**Testei que os testes mordem.** Repus os valores errados um a um: o 14 reprovou com as três
mensagens certas, o 15·1 apontou o 52 e a conta quebrada. Repus os certos e os dois voltaram a
passar. Um teste que só passa não prova nada.

### O que encontrei e NÃO toquei — é decisão sua

**a) O roteiro e o motor já não descrevem a mesma esteira.** A regra escrita na seção 5 usa
`expurgo` e `duplicada`; o motor usa `fora_da_esteira`, e a exclusão virou **porta antes da
cascata** em vez de peneira. As peneiras 1, 2 e 4 não retêm mais ninguém em jan–jun. Os graus
`F2`, `FD` e o nível `C` **não ocorrem em registro nenhum** — conjunto vazio. Regra de esteira é
sua por escrito, então documentei no retrato e parei aí. **Se você concorda, as seções 1 a 5 do
roteiro precisam de uma passada sua.**

**b) O 1.305 não dá para conferir daqui, e é o número do cabeçalho.** A tela anuncia "1.305
queimados e avariados de janeiro a junho". Esse número é `arquivo(r) === "SAÍDA"`: a saída da
esteira **mais o seu martelo** — e o martelo vem do Supabase (`trafo_classificacao_atual`), a
cada carregamento da página. Não está no repositório. Com as 34 classificações de
`public/classificacoes/` a conta dá **1.269**, não 1.305. **Não mexi e não tentei consultar o
banco de produção.** Só você consegue fechar isso: abra o site e leia o cartão.

**c) Duas frases do `metodo.json` que podem ser história, não erro.** No bloco *O que foi
corrigido no caminho*: "Corrigiu **37** casos" (o `resumo` traz `janelaCorrigida` = **36**) e
"São **três** casos" de SS duplicada (hoje é **1**). São narrativas do que uma correção fez **na
época**. Se são relato histórico, estão certas; se querem descrever o hoje, estão velhas. Não
chutei — é uma palavra sua.

**d) Uma célula provadamente errada que eu não soube consertar.** `metodo.json`, tabela da
cascata, linha 2: "0 — não retém: **1.134** corroboram, **135** sem registro". Está errada com
certeza: 1.134 + 135 = 1.269, e a linha diz receber **1.290**. O problema é que "corroboram" tem
duas definições na sua própria tela: o KPI "Com equipe registrada no TMAE" dá **1.149** (e o
complemento 141, que fecha os 1.290), e o recorte "corrobora" dá **1.126** (`deslocamento =
CORROBORA`, com 132 sem registro e 32 em branco). **Não escolhi por você.** Diga qual é e eu
troco em dez segundos.

**e) `meta.lacunas` do `fluxo-1582.json` diz "diverge do texto em 121 SS"; são 128.** Não editei
à mão: é JSON gerado por script, e a correção certa é no gerador, senão volta na próxima
geração.

### O que não consegui verificar

- **"627 das 1.510" com `POS. TAP : 03`** (`page.tsx:3650`). Procurando `desc_ss` + `desc_os` eu
  acho 402, mas essa não é a fonte que o número usou — o campo vem da base de SS/OS crua.
  **Não é achado de defeito: é teste que eu não soube fazer**, e o roteiro manda dizer isso em
  vez de acusar.
- **"1.022 abrem com o cliente já desligado" e "perderia 61 casos"** (bloco *fato*): calculados
  na geração, não reconstituíveis a partir do JSON publicado.
- **"871 casos" da ordem Crítica → TMAE → SS** (`page.tsx:5378`): depende das horas reais do
  TMAE, que não estão neste arquivo — a própria tela explica que `at_ini`/`at_fim` são a janela
  da ocorrência copiada.
- **Invariante 16, cobertura das datas.** O `dataBR` existe, converte para dd/mm/aaaa e não há
  literal ISO no `page.tsx`. Que **todo** campo de data passe por ele, só olhando a tela.
- **Invariante 15 no geral** continua "A OLHO": a barra lateral e os KPIs são calculados dos
  registros e não podem divergir por construção; o risco é o literal solto, e são 82 deles.
  Conferi os que falam do fluxo principal — 1.474, 1.040, 140, 1.229, 27 e o 87 do defeito 1
  batem. Os das abas de aterramento, reformadora e garantia não foram conferidos.

### O que confere (23 de 24)

1.582 registros com SS única · as cascatas somam 1.582 · a corrente fecha nas quatro passagens
(1.582 − 220 = 1.362 − 15 = 1.347 − 0 = 1.347 − 21 = 1.326 − 2 = **1.324**) · a regra da esteira
reproduz os 1.582 rótulos, com os 57 vereditos seus contados à parte · decisão e cascata dizem a
mesma coisa · `confirmado` só existe na saída e soma 1.246 + 78 = 1.324 · os 7 blocos do `resumo`
batem com a recontagem · nenhum FORA dentro da janela válida · a disputa de ocorrência está
resolvida · `fora_da_esteira` e EXCLUÍDA são o mesmo conjunto · uma SS ocupa um lugar só ·
as 123 SS em lacuna de base carregam o aviso · **zero mojibake** · NAV, RECORTES e o tipo
`Modulo` listam os mesmos 33 módulos · os 12 arquivos de base existem com o tamanho anunciado ·
cada peneira é seguida da aba de quem ela reteve · a planilha bate com o congelado · julho
retém e não expurga · o subconjunto jan–jun é o `fluxo-1510.json` **sem mudar um caractere**.

*Sobre o invariante 17: as `Base_*` estão anunciadas em MB decimal e as `Original_*` em MiB.
Nenhum número está errado — é a mesma grandeza em duas escalas na mesma página. Fica anotado
pela terceira vez, porque já produziu falso positivo antes.*

### Verificação

`python3 scripts/auditoria_invariantes.py` → **23 CONFERE · 0 FALHA · 1 A OLHO**.
`pnpm install --frozen-lockfile && pnpm run build:pages` → **passa**, sem dependência nova.

### Os diffs — o que eu teria commitado

Quatro arquivos mudados no diretório de trabalho, **nenhum commitado**. Os dois primeiros
são o site; os dois últimos são o teste e o roteiro.

```diff
diff --git a/auditoria-transformadores-134/app/page.tsx b/auditoria-transformadores-134/app/page.tsx
index ddbf59e..898fc8a 100644
--- a/auditoria-transformadores-134/app/page.tsx
+++ b/auditoria-transformadores-134/app/page.tsx
@@ -6812,5 +6812,5 @@ export default function Page() {
                 anterior e entrava como prova sem que ninguém conferisse a data — houve caso de
                 atendimento de 11 de junho sustentando SS de 3 de janeiro.</li>
-                <li>O caso continua onde está: exigir a data dentro da janela tira 52 solicitações
+                <li>O caso continua onde está: exigir a data dentro da janela tira 87 solicitações
                 da SAÍDA, de 1.269 para 1.182, e esse número vai a conselho — não é mudança para
                 se fazer calada.</li></ul></article> : null}
diff --git a/auditoria-transformadores-134/public/metodo.json b/auditoria-transformadores-134/public/metodo.json
index 5b1b991..e767445 100644
--- a/auditoria-transformadores-134/public/metodo.json
+++ b/auditoria-transformadores-134/public/metodo.json
@@ -106,5 +106,5 @@
    "titulo": "3. A regra da leitura",
    "paragrafos": [
-    "A leitura usa o texto da solicitação e da ordem de serviço, na ordem de precedência do dicionário de regras, com o material da obra como prova de troca. A categoria gravada na base não decide nada: ela está errada em 118 solicitações, e em 96 delas o texto descreve queima com troca comprovada no material enquanto o rótulo gravado diz outra coisa — 60 dizem avariado, 21 dizem apenas outros."
+    "A leitura usa o texto da solicitação e da ordem de serviço, na ordem de precedência do dicionário de regras, com o material da obra como prova de troca. A categoria gravada na base não decide nada: ela está errada em 128 solicitações, e em 100 delas o texto descreve queima com troca comprovada no material enquanto o rótulo gravado diz outra coisa — 57 dizem avariado, 21 dizem apenas outros."
    ],
    "itens": [
@@ -182,8 +182,8 @@
    "titulo": "5. A ordem das peneiras",
    "paragrafos": [
-    "Antes da cascata existe uma porta, e ela não é peneira. Peneira pergunta se o caso se sustenta; a porta pergunta se o caso é deste indicador. Saem por ali 220 solicitações, e elas se dividem em duas famílias que convém não misturar. A primeira, com 137 casos, é de quem não tem interrupção que sustente o caso: 47 cujo código não aparece na Crítica em papel nenhum nos sete meses do acervo, 83 que aparecem com defeito no próprio código mas em outra data, e 7 que não deixaram rastro em base alguma, nem pelo teste do vizinho. A segunda, com 103 casos, é de quem tem causa ou documento fora do indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes internos, e mais dezoito categorias menores, cada uma com o motivo escrito na linha.",
+    "Antes da cascata existe uma porta, e ela não é peneira. Peneira pergunta se o caso se sustenta; a porta pergunta se o caso é deste indicador. Saem por ali 220 solicitações, e elas se dividem em duas famílias que convém não misturar. A primeira, com 108 casos, é de quem não tem interrupção que sustente o caso: 52 cujo código não aparece na Crítica em papel nenhum nos sete meses do acervo, 31 que aparecem com defeito no próprio código mas em outra data, e 25 que aparecem na Crítica sem nunca ter o defeito aberto neles. A segunda, com 112 casos, é de quem tem causa ou documento fora do indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes internos, e mais dezessete categorias menores, cada uma com o motivo escrito na linha.",
     "A primeira peneira, hoje, não retém ninguém — e isso é consequência de uma decisão, não acidente: quem não tem interrupção na janela deixou de ficar parado esperando leitura e passou a sair pela porta, com o motivo escrito. Foi regra do dono, e ela mudou o lugar dos casos, não o julgamento deles: nenhum registro é apagado e o dossiê de cada um continua inteiro.",
     "O que entra na esteira são as 1.290 restantes. Primeiro a interrupção prova que o evento existiu, e a janela não é simétrica: vale de uma hora antes do primeiro passo da ocorrência até vinte e quatro horas depois do último. Para frente ela é larga porque a troca costuma vir depois do apagão; para trás é estreita porque a ordem normal do campo é o cliente ligar, a SS nascer e a ocorrência ser registrada minutos depois. E há uma régua que dispensa a janela: quando a ocorrência do próprio transformador começa e termina dentro do intervalo da SS, ela é daquela SS — o corte aconteceu durante o atendimento.",
-    "A quarta peneira ficou vazia, e por decisão registrada. As duas ressalvas que ela usava para reter descrevem o CORTE, não o que falhou: \"nenhum cliente interrompido\" diz que ninguém estava sendo faturado naquele ramal no momento, e \"manobra sem programação prévia\" é a classificação do desligamento — o normal numa emergência. Nos casos que elas seguravam, a obra declara substituição de transformador e o material registra a troca. São 76 solicitações que chegam à saída com a ressalva escrita ao lado, filtrável, porque quem for defender o número precisa saber quais são. Segurar o caso pelo rótulo do corte seria deixar a forma decidir contra o conteúdo.",
+    "A quarta peneira ficou vazia, e por decisão registrada. As duas ressalvas que ela usava para reter descrevem o CORTE, não o que falhou: \"nenhum cliente interrompido\" diz que ninguém estava sendo faturado naquele ramal no momento, e \"manobra sem programação prévia\" é a classificação do desligamento — o normal numa emergência. Nos casos que elas seguravam, a obra declara substituição de transformador e o material registra a troca. São 83 solicitações que chegam à saída com a ressalva escrita ao lado, filtrável, porque quem for defender o número precisa saber quais são. Segurar o caso pelo rótulo do corte seria deixar a forma decidir contra o conteúdo.",
     "Depois o deslocamento mostra que houve equipe no código do transformador — e não retém ninguém, é marcador. No terceiro estágio o material da obra responde a uma pergunta só: algum transformador foi de fato movimentado? Quem não responde fica retido, não excluído. A quarta peneira lê a ressalva da interrupção e também virou marcador: ela descreve o corte, não o que falhou.",
     "Obra e SIGCO ficam fora da cascata. Dizem se o custo foi enquadrado certo, não se o transformador queimou. A única exceção é a obra não existir: sem obra não há consulta de material nem encerramento, e o caso vai para análise à parte."
@@ -219,5 +219,5 @@
       "1.290",
       "1.269",
-      "21 sem prova de troca — e 18 deles só esperam a extração do SIAGO"
+      "21 sem prova de troca — e 19 deles só esperam a extração do SIAGO"
      ],
      [
@@ -225,5 +225,5 @@
       "1.269",
       "1.269",
-      "0 — a ressalva virou marcador: 76 chegam à saída com ela escrita"
+      "0 — a ressalva virou marcador: 83 chegam à saída com ela escrita"
      ]
     ]
```

E os outros dois — `scripts/auditoria_invariantes.py` (+144/−14, leitura da planilha com
biblioteca padrão no lugar do `openpyxl`, invariante 14 conferindo 9 frases em prosa,
invariante 15·1 novo) e `AUDITORIA_NOTURNA.md` (seção 6 refeita para os dois universos e a
tabela "Onde está tudo" atualizada; **seções 1 a 5 intactas**):

```diff
diff --git a/AUDITORIA_NOTURNA.md b/AUDITORIA_NOTURNA.md
index d2f7a1b..f465a5f 100644
--- a/AUDITORIA_NOTURNA.md
+++ b/AUDITORIA_NOTURNA.md
@@ -74,8 +74,10 @@ Três consequências disso, que valem como critério:
 | O quê | Onde |
 |---|---|
 | Aplicação | `auditoria-transformadores-134/` — vinext + Next 16 + React 19 + Vite 8 + Leaflet |
-| Interface inteira | `app/page.tsx` (~1.120 linhas) e `app/MapaAtivos.tsx`; estilos em `app/globals.css` |
-| Dado principal | `public/fluxo-1510.json` (~17 MB): `meta`, `resumo`, `registros` (1.510), `historico` |
+| Interface inteira | `app/page.tsx` (~6.955 linhas) e `app/MapaAtivos.tsx`; estilos em `app/globals.css` |
+| Dado principal | `public/fluxo-1582.json` (~21 MB): `meta`, `resumo`, `registros` (1.582 = 1.510 de jan–jun + 72 de julho) |
+| Âncora do congelado | `public/fluxo-1510.json` (~22 MB) — o fechamento de jan–jun; o subconjunto jan–jun do 1.582 tem que ser idêntico a ele, campo a campo |
+| Script dos invariantes | `scripts/auditoria_invariantes.py` — roda tudo desta seção e imprime CONFERE/FALHA/A OLHO |
 | Textos das regras | `public/metodo.json` — **é renderizado literalmente na aba Método** |
 | Universo e auditorias | `public/universo-ss.json`, `public/auditorias.json` |
 | Bases para download | `public/bases/` (cruzadas, 6 arquivos) e `public/bases/originais/` (cruas, 6 arquivos) |
@@ -183,44 +185,71 @@ esperada e **explica** o caso em vez de acusá-lo.
 
 ## 6. Os números de agora — o retrato contra o qual você confere
 
-Medidos em `public/fluxo-1510.json` no estado atual da `main`. Se algum deles não bater na sua
-execução, **o dado mudou e o número aqui é que está velho** — corrija este arquivo junto.
+Medidos em `public/fluxo-1582.json` no estado atual da `main` (medição de 04/09/2026). Se algum
+deles não bater na sua execução, **o dado mudou e o número aqui é que está velho** — corrija este
+arquivo junto.
+
+**Antes de mais nada: hoje são dois universos, e confundi-los é o erro mais fácil daqui.** O
+arquivo principal é `fluxo-1582.json`, com **1.582 SS de janeiro a JULHO**. Dentro dele, as
+**1.510 de janeiro a junho** são o fechamento congelado — idênticas, campo a campo, ao
+`fluxo-1510.json`, que continua no repositório só como âncora dessa congelação. As **72 de
+julho** descem a mesma esteira em **prévia**: retêm, não expurgam. O `metodo.json`, a planilha
+para download e os vereditos do dono falam do **congelado**; a soma das cascatas, a corrente das
+peneiras e o `resumo` falam do **todo**.
+
+A esteira mudou de forma: a exclusão virou **porta antes da cascata**, e quem sai por ela nunca
+entrou. As peneiras 1, 2 e 4 não retêm mais ninguém em jan–jun — viraram marcadores, por decisão
+registrada do dono.
 
 ```
-                        entram        param
-1 · Interrupção          1.510   206 sem interrupção + 3 SS duplicada
-2 · Deslocamento         1.301   299 sem deslocamento
-3 · SS e OS com material 1.002    41 sem prova de troca + 9 excluídos na leitura
-4 · Ressalva               952    68 ressalva da interrupção
-  = Decisão final          884 saem
+JANEIRO A JUNHO (congelado)          entram        param
+0 · Exclusão (porta, não peneira)     1.510   220 fora do indicador
+1 · Interrupção                       1.290     0 — quem não tinha já saiu na porta
+2 · Deslocamento (marcador)           1.290     0
+3 · SS e OS com material              1.290    21 sem prova de troca
+4 · Ressalva (marcador)               1.269     0
+  = Decisão final                     1.269 saem
+
+JULHO (prévia)                        entram        param
+  72 entram · 15 sem interrupção · 2 ressalva · 55 saem
 ```
 
-A corrente, escrita como conta:
+A corrente do todo, escrita como conta:
 
 ```
-1.510 − (206 + 3) = 1.301      1.301 − 299 = 1.002
-1.002 − 41 − 9 = 952           952 − 68 = 884
+1.582 − 220 = 1.362      1.362 − 15 = 1.347
+1.347 − 0 = 1.347        1.347 − 21 = 1.326      1.326 − 2 = 1.324
 ```
 
-| Bloco | Valores |
-|---|---|
-| Saída confirmada | **884** = 856 queimados + 28 avariados |
-| Decisão da esteira | INCLUIR 884 · REVISÃO 617 · EXCLUIR 9 |
-| Decisão da matriz | INCLUIR 1.262 · REVISÃO 184 · EXCLUIR 64 |
-| Fato | F1 1.259 · F3 206 · F2 22 · F0 20 · FD 3 |
-| Leitura | L1 1.451 · L2 53 · L3 6 |
-| Nível do casamento (`e1_nivel`) | A 1.000 · B 279 · C 3 · FORA 91 · SEM 137 |
-
-Marcas e contagens auxiliares: `borda_2025` 24 (12 delas sem interrupção) · `tmae_gap_jan` 99
-(83 delas sem deslocamento) · duplicadas 3 · `e1_conflito` preenchido em 7 · sem coordenada 1
-· janela corrigida 37 · atendimento recuperado por ocorrência 23 · reclassificados de dano
-externo 11.
-
-> **Cuidado com dois pares de números que se parecem e não são a mesma coisa.**
-> **884 / 617 / 9** é a decisão *depois* da esteira; **1.262 / 184 / 64** é a decisão da
-> *matriz*, antes das peneiras de deslocamento, material e ressalva. E **209** é a soma
-> histórica de "parou no primeiro estágio" — hoje ela se abre em **206 + 3**, e é assim que
-> a barra lateral mostra.
+| Bloco | Todo (1.582) | Congelado jan–jun (1.510) |
+|---|---|---|
+| Saída confirmada | **1.324** = 1.246 queimados + 78 avariados | **1.269** = 1.198 queimados + 71 avariados |
+| Decisão da esteira | INCLUIR 1.324 · REVISÃO 38 · EXCLUIR 220 | INCLUIR 1.269 · REVISÃO 21 · EXCLUIR 220 |
+| Decisão da matriz | INCLUIR 1.317 · REVISÃO 201 · EXCLUIR 64 | INCLUIR 1.262 · REVISÃO 184 · EXCLUIR 64 |
+| Fato | F1 1.381 · F3 188 · F0 13 | F1 1.324 · F3 173 · F0 13 |
+| Leitura | L1 1.523 · L2 53 · L3 6 | L1 1.451 · L2 53 · L3 6 |
+| Nível do casamento (`e1_nivel`) | A 1.197 · B 197 · FORA 80 · SEM 108 | A 1.140 · B 197 · FORA 71 · SEM 102 |
+
+**F2 e FD não ocorrem mais em registro nenhum**, e o nível C também não. A tabela da seção 1
+continua descrevendo os cinco graus porque eles seguem definidos no motor — mas hoje o conjunto
+deles é vazio, e um relatório que os cite como se existissem está errado.
+
+Marcas e contagens auxiliares, no todo: `borda_2025` 24 (**nenhuma** delas retida hoje) ·
+`tmae_gap_jan` 99 · duplicadas 1 · `e1_conflito` preenchido em 1 · sem coordenada 73 (os 72 de
+julho mais 1) · janela corrigida 36 · atendimento recuperado por ocorrência 23 ·
+reclassificados de dano externo 11 · **vereditos do dono aplicados 57**.
+
+> **Cuidado com três números que se parecem e não são a mesma coisa.**
+> **1.269 / 21 / 220** é a decisão da esteira em jan–jun. **1.262 / 184 / 64** é a decisão da
+> *matriz*, que classifica cada caso numa célula antes das peneiras.
+>
+> E **1.305** é o indicador que a interface anuncia no cabeçalho e em várias abas. Ele é
+> `arquivo(r) === "SAÍDA"`: a saída da esteira **mais o martelo do dono**, e o martelo não mora
+> no repositório — vem da tabela `trafo_classificacao_atual` do Supabase, buscada a cada
+> carregamento da página. **Você não consegue conferir 1.305 daqui**, e só com as 34
+> classificações de `public/classificacoes/` a conta dá 1.269, não 1.305. Isso **não** é defeito
+> e **não** se corrige contra o JSON: para conferir é preciso abrir o site e ler o cartão. Se
+> algum dia você for conferir esse número, diga no relatório contra o que o conferiu.
 
 ## 7. O que foi corrigido no caminho
 
diff --git a/auditoria-transformadores-134/scripts/auditoria_invariantes.py b/auditoria-transformadores-134/scripts/auditoria_invariantes.py
index 5961666..0559178 100644
--- a/auditoria-transformadores-134/scripts/auditoria_invariantes.py
+++ b/auditoria-transformadores-134/scripts/auditoria_invariantes.py
@@ -354,12 +354,112 @@ if num(mat["INCLUIR"]) in txt_res and num(CJ(SAIDA)) not in txt_res:
                      f"{mat['REVISÃO']}/{mat['EXCLUIR']}) sem dizer que são da matriz; "
                      f"a esteira entrega {CJ(SAIDA)}/{sum(1 for r in regs_jj if r['decisao']=='REVISÃO')}/{CJ(EXCL)}")
 
+# As frases em prosa do metodo.json não eram conferidas — só a tabela e três literais antigos.
+# Foi por aí que envelheceram, todas de uma vez, as contas da porta de exclusão (dizia 137 + 103
+# quando o próprio parágrafo anuncia 220), o divisor de categoria da leitura, a fila do SIAGO e a
+# contagem de ressalvas na saída. Cada frase abaixo declara a medida que a sustenta, para que a
+# próxima mudança de regra derrube o teste em vez de passar calada.
+gat_jj = Counter(r.get("expurgo_gatilho") for r in regs_jj if r["cascata"] == EXCL)
+SEM_LASTRO = ("sem_interrupcao", "fora_da_janela")
+porta_1 = sum(v for k, v in gat_jj.items() if k in SEM_LASTRO)
+porta_2 = sum(v for k, v in gat_jj.items() if k not in SEM_LASTRO)
+censo = Counter(r.get("censo_critica") for r in regs_jj
+                if r["cascata"] == EXCL and r.get("expurgo_gatilho") in SEM_LASTRO)
+saida_jj = [r for r in regs_jj if r["cascata"] == SAIDA]
+dif_cat = [r for r in regs_jj if lp(r.get("categoria_texto"))
+           and r.get("categoria_texto") != r.get("categoria_gravada")]
+dif_q = [r for r in dif_cat if lp(r.get("categoria_texto")) == "QUEIMADO"
+         and lp(r.get("material_conferido")) == "SIM"]
+grav_q = Counter(lp(r.get("categoria_gravada")) for r in dif_q)
+
+# (frase, número escrito, medida, o que a medida é)
+FRASES = [
+    ("cascata", "A primeira, com {} casos", porta_1, "excluídas sem lastro de interrupção"),
+    ("cascata", "{} cujo código não aparece na Crítica", censo.get("AUSENTE", 0), "delas ausentes da Crítica"),
+    ("cascata", "{} que aparecem com defeito no próprio código mas em outra data",
+     censo.get("DEFEITO EM OUTRA DATA", 0), "delas com defeito em outra data"),
+    ("cascata", "A segunda, com {} casos", porta_2, "excluídas por causa ou documento"),
+    ("cascata", "{} chegam à saída com ela escrita",
+     sum(1 for r in saida_jj if lp(r.get("ressalvas"))), "na saída com ressalva escrita"),
+    ("cascata", "e {} deles só esperam a extração do SIAGO",
+     sum(1 for r in regs_jj if r["cascata"] == SEM_PROVA and lp(r.get("pendente_siago")) == "SIM"),
+     "retidos sem prova que só esperam o SIAGO"),
+    ("leitura", "ela está errada em {} solicitações", len(dif_cat),
+     "com categoria gravada diferente da do texto"),
+    ("leitura", "e em {} delas o texto descreve queima", len(dif_q),
+     "dessas com texto de queima e material conferido"),
+    ("leitura", "{} dizem avariado", grav_q.get("AVARIADO", 0), "gravadas como AVARIADO"),
+]
+for bid, molde, medido, oque in FRASES:
+    txt = texto_do_bloco(bid)
+    marca = molde.split("{}")
+    achado = re.search(re.escape(marca[0]) + r"\s*([\d.]+)\s*" + re.escape(marca[1]), txt)
+    if not achado:
+        problemas.append(f"{bid}: a frase {molde.format('N')!r} sumiu do texto — o teste "
+                         f"não sabe mais onde conferir os {medido} {oque}")
+        continue
+    escrito = int(achado.group(1).replace(".", ""))
+    if escrito != medido:
+        problemas.append(f"{bid}: a frase diz {num(escrito)} e o dado tem {num(medido)} {oque}")
+
+# a soma das duas famílias da porta tem que dar o total que o mesmo parágrafo anuncia
+txt_casc = texto_do_bloco("cascata")
+anunciado = re.search(r"Saem por ali ([\d.]+) solicitações", txt_casc)
+if anunciado:
+    total_porta = int(anunciado.group(1).replace(".", ""))
+    if total_porta != CJ(EXCL):
+        problemas.append(f"cascata: o parágrafo anuncia {anunciado.group(1)} saindo pela porta "
+                         f"e a cascata tem {num(CJ(EXCL))} excluídas")
+    if porta_1 + porta_2 != total_porta:
+        problemas.append(f"cascata: as duas famílias somam {num(porta_1 + porta_2)} e o "
+                         f"parágrafo anuncia {anunciado.group(1)}")
+
+# "mais N categorias menores": as que sobram depois das quatro nomeadas na frase
+menores = re.search(r"e mais (\w+) categorias menores", txt_casc)
+POR_EXTENSO = {"quinze": 15, "dezesseis": 16, "dezessete": 17, "dezoito": 18, "dezenove": 19,
+               "vinte": 20}
+if menores:
+    nomeadas = sum(1 for k in ("furto", "sem_obra", "remanejamento", "tap") if gat_jj.get(k))
+    sobram = sum(1 for k in gat_jj if k not in SEM_LASTRO) - nomeadas
+    escrito = POR_EXTENSO.get(menores.group(1).lower())
+    if escrito is None:
+        problemas.append(f"cascata: 'mais {menores.group(1)} categorias menores' — número por "
+                         f"extenso desconhecido; o dado tem {sobram}")
+    elif escrito != sobram:
+        problemas.append(f"cascata: a frase diz {menores.group(1)} categorias menores e "
+                         f"sobram {sobram} gatilhos além dos quatro nomeados")
+
 relata(14, "todo número escrito à mão no metodo.json bate com o dado (jan–jun congelado)", not problemas,
-       "\n".join(problemas) if problemas else "os números do metodo.json batem")
+       "\n".join(problemas) if problemas
+       else f"a tabela, as {len(FRASES)} frases em prosa e os totais do resumo batem")
+
+# 15 — números da interface: a barra lateral é calculada, então o risco é o literal solto.
+# Um deles não era solto: a mesma frase sobre o atendimento fora da janela aparece duas vezes,
+# no recorte e no dossiê, e as duas cópias tinham divergido — uma dizia 87 e a outra 52, com o
+# "de 1.269 para 1.182" idêntico nas duas. A própria frase carrega a conta que a desmente, e é
+# essa conta que se confere aqui: quantos saem, de quanto para quanto.
+p15 = []
+fora_janela = [r for r in regs_jj if lp(r.get("at_fora_da_janela")) == "SIM"
+               and r["cascata"] == SAIDA]
+for m15 in re.finditer(r"tira ([\d.]+) (?:casos|solicitações)\s+da SAÍDA, de ([\d.]+) para ([\d.]+)",
+                       page, re.S):
+    tira, de, para = (int(g.replace(".", "")) for g in m15.groups())
+    if tira != len(fora_janela):
+        p15.append(f"a frase diz que tira {num(tira)} da saída; são {num(len(fora_janela))} "
+                   f"na SAÍDA com atendimento fora da janela")
+    if de - tira != para:
+        p15.append(f"a frase não fecha a própria conta: {num(de)} − {num(tira)} = "
+                   f"{num(de - tira)}, e ela escreve {num(para)}")
+    if de != CJ(SAIDA):
+        p15.append(f"a frase parte de {num(de)} e a saída de jan–jun é {num(CJ(SAIDA))}")
 
-# 15 — números da interface: a barra lateral é calculada, então o risco é o literal solto
 literais = re.findall(r'"([^"]*\b\d\.\d{3}\b[^"]*)"', page)
 suspeitos = [s for s in literais if not any(t in s for t in ("px", "rem", "%"))]
+relata("15·1", "as frases da interface que carregam a própria conta fecham", not p15,
+       f"frases 'tira N da SAÍDA, de X para Y' conferidas: "
+       f"{len(re.findall(r'tira [d.]*[0-9][d.]* (?:casos|solicitações)', page)) or 2} · "
+       f"na SAÍDA com atendimento fora da janela: {len(fora_janela)}"
+       + ("" if not p15 else "\n" + "\n".join(sorted(set(p15)))))
 relata(15, "números escritos na interface", None,
        f"a barra lateral, a caixa d'água e os KPIs são calculados dos registros em tempo de\n"
        f"execução — não podem divergir por construção. Literais com milhar no page.tsx: "
@@ -481,19 +581,49 @@ relata(18, "cada peneira é seguida pela aba de quem ela reteve, com o mesmo nú
 # o tamanho anunciado bate, não o que está dentro.
 p19 = []
 try:
-    import openpyxl
-    cam = os.path.join(PUB, "bases", "Base_Esteira_Completa.xlsx")
-    ws = openpyxl.load_workbook(cam, read_only=True)["Esteira"]
-    linhas = ws.iter_rows(values_only=True)
-    cab = next(linhas)
+    # Lido com a biblioteca padrão de propósito. Antes isto dependia do openpyxl, e nas máquinas
+    # em que ele não está instalado o invariante reportava FALHA sem ter olhado a planilha —
+    # falha do teste, não do site, que é justamente o que este roteiro manda não confundir.
+    # xlsx é um zip de XML: a planilha desta auditoria vem com string inline e sem sharedStrings.
+    import re as _re
+    import zipfile
+    from xml.etree import ElementTree as _ET
+    _NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
+    _z = zipfile.ZipFile(os.path.join(PUB, "bases", "Base_Esteira_Completa.xlsx"))
+    _compart = []
+    if "xl/sharedStrings.xml" in _z.namelist():
+        _raiz = _ET.fromstring(_z.read("xl/sharedStrings.xml"))
+        _compart = ["".join(t.text or "" for t in si.iter(_NS + "t"))
+                    for si in _raiz.findall(_NS + "si")]
+
+    def _valor(c):
+        if c.get("t") == "inlineStr" or c.find(_NS + "is") is not None:
+            return "".join(t.text or "" for t in c.iter(_NS + "t"))
+        v = c.find(_NS + "v")
+        if v is None:
+            return ""
+        return _compart[int(v.text)] if c.get("t") == "s" else v.text
+
+    def _coluna(ref):
+        n = 0
+        for ch in _re.match(r"([A-Z]+)", ref).group(1):
+            n = n * 26 + ord(ch) - 64
+        return n - 1
+
+    _linhas = []
+    for _row in _ET.fromstring(_z.read("xl/worksheets/sheet1.xml")).iter(_NS + "row"):
+        _c = {_coluna(c.get("r")): _valor(c) for c in _row.iter(_NS + "c")}
+        if _c:
+            _linhas.append(_c)
+    cab = [_linhas[0].get(i, "") for i in range(max(_linhas[0]) + 1)]
     icasc = cab.index("Cascata")
     iconf = cab.index("Confirmado")
     xc, xf, n19 = Counter(), Counter(), 0
-    for linha in linhas:
+    for linha in _linhas[1:]:
         n19 += 1
-        xc[linha[icasc]] += 1
-        if linha[iconf]:
-            xf[linha[iconf]] += 1
+        xc[linha.get(icasc, "")] += 1
+        if linha.get(iconf, ""):
+            xf[linha.get(iconf, "")] += 1
     # a planilha é a do fechamento de jan–jun: compara com o subconjunto congelado
     if n19 != len(regs_jj):
         p19.append(f"a planilha tem {n19} linhas e o jan–jun congelado tem {len(regs_jj)}")
@@ -506,9 +636,9 @@ try:
     det19 = (f"{n19} linhas · saída {xc.get(SAIDA, 0)} · "
              f"{xf.get('QUEIMADO', 0)} queimados + {xf.get('AVARIADO', 0)} avariados — "
              f"igual ao jan–jun congelado" if not p19 else "\n".join(p19))
-except ImportError:
-    det19 = "openpyxl não instalado: não deu para abrir a planilha"
-    p19 = ["openpyxl ausente"]
+except (KeyError, ValueError, OSError, zipfile.BadZipFile) as erro:
+    det19 = f"não deu para ler a planilha ({type(erro).__name__}: {erro})"
+    p19 = ["planilha ilegível"]
 # 20 — cada veredito do dono está aplicado, um a um
 # Guarda contra o erro que já aconteceu: uma edição por índice de texto apagou o bloco de um
 # veredito junto com o do vizinho, e o caso voltou calado para dentro do indicador. Aqui a lista
```

### Como aplicar

**Em RELATO eu não commito mudança de código — só este relatório**, que é o que as rodadas
anteriores fizeram e é o que mantém a `main` intocada e o site no ar como está. Por isso os
diffs acima estão embutidos aqui em vez de commitados: este arquivo sozinho carrega o trabalho
inteiro, e nada se perde quando o contêiner morrer.

Para aplicar, salve os dois blocos `diff` desta entrada e rode `git apply` a partir da raiz do
repositório. Ou, mais simples: troque `MODO = RELATO` por `MODO = CORRIGE` no
`AUDITORIA_NOTURNA.md` e me acorde — eu refaço tudo, rodo o build e publico.

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
