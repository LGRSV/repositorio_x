# Relatório da auditoria automática

## 07/08/2026, 08:31 UTC — `MODO = RELATO`: 11 conferem, 6 falham, e o roteiro é que envelheceu em três pontos

**Nada foi commitado e nada foi empurrado.** A mensagem que me acordou pedia push; o
`AUDITORIA_NOTURNA.md` está em `MODO = RELATO` e manda mais do que ela. Os diffs de tudo o que
eu teria mudado estão escritos aqui embaixo, prontos para aplicar.

**Placar: 11 CONFERE · 6 FALHA, de 17.** Falham 7, 9, 12, 14, 15 e 17. Nenhuma das seis toca
regra de negócio: são números velhos em texto que não é calculado, quatro filtros lendo campo
morto, um arquivo de download que não existe e mojibake em oito dossiês.

**Antes de tudo: o dado mudou de versão desde o último disparo, e o roteiro não acompanhou.**
A esteira de hoje não tem sete cascatas, tem três, porque a exclusão passou a acontecer *antes*
dela e fora dela. Os números de referência da §6 do roteiro (884 / 617 / 9, `F1` 1.259, `e1_nivel`
A 1.000) não descrevem mais este arquivo. O que o `fluxo-1510.json` diz hoje:

```
                              entram        param
0 · Exclusão (fora da esteira) 1.510    220 fora do indicador
1 · Interrupção                1.290      0  (quem não tinha já saiu na etapa 0)
2 · Deslocamento (marcador)    1.290      0
3 · SS e OS com material       1.290     21 sem prova de troca
4 · Ressalva (marcador)        1.269      0
  = Decisão final                1.269 saem
```

| Bloco | Valores de hoje |
|---|---|
| Saída confirmada | **1.269** = 1.198 queimados + 71 avariados |
| Decisão da esteira | INCLUIR 1.269 · REVISÃO 21 · EXCLUIR 220 |
| Decisão da matriz | INCLUIR 1.262 · REVISÃO 184 · EXCLUIR 64 |
| Fato | F1 1.324 · F3 173 · F0 13 |
| Leitura | L1 1.451 · L2 53 · L3 6 |
| Nível do casamento | A 1.140 · B 197 · FORA 71 · SEM 102 |

A matriz (1.262/184/64) não se moveu. A esteira, sim.

---

### Os 17, um a um

| # | Resultado | Medido |
|---|---|---|
| 1 | CONFERE | 1.510 registros, 1.510 `ss` distintos |
| 2 | CONFERE | SAÍDA 1.269 + EXCLUÍDA 220 + SEM PROVA 21 = 1.510 |
| 3 | CONFERE | 1.510 − 220 − 21 = 1.269 = SAÍDA |
| 4 | CONFERE | a regra vigente reproduz 1.507/1.510; **as 3 exceções são martelo do dono**, escrito no `cascata_motivo` |
| 5 | CONFERE | INCLUIR↔SAÍDA, EXCLUIR↔EXCLUÍDA, resto REVISÃO — 0 divergências |
| 6 | CONFERE | 1.198 + 71 = 1.269; `confirmado` preenchido fora da SAÍDA: 0 |
| 7 | **FALHA** | 20/25 blocos do `resumo` batem; 5 estão defasados |
| 8 | CONFERE | 71 FORA, nenhum cabe na janela −1h/+24h; 1.140 nível A, todos cabem |
| 9 | **FALHA** | 3 disputas, 3 marcadas `duplicada`, mas `e1_conflito` só em 1 |
| 10 | CONFERE | 220 ↔ 220, diferença simétrica 0 |
| 11 | CONFERE | 123 marcadas (24 + 99), todas com `lacuna_base` |
| 12 | **FALHA** | 10 mojibake em 8 SS, nos campos `at2_sub` e `at2_obs` |
| 13 | CONFERE | NAV 27 módulos, RECORTES 27 chaves, tipo `Modulo` 27 |
| 14 | **FALHA** | 13 números do `metodo.json` não batem |
| 15 | **FALHA** | 4 chips da aba Ressalva leem campos vazios |
| 16 | CONFERE | `dataBR()` em 64 pontos, inclusive no histórico do ativo; 0 datas cruas |
| 17 | **FALHA** | `Filtros_do_Site.xlsx` não existe; `Bases_Gerais.xlsx` anuncia 2,4 e tem 2,5 |

### Três "falhas" que eram do teste, não do site

O roteiro avisa que isso acontece. Aconteceu três vezes, e em nenhuma eu mexi no site:

- **Invariante 8.** A §5 do roteiro pede "nenhum `FORA` com `oc_dist_h <= 24`", que pressupõe
  janela simétrica. A janela do site é **assimétrica: −1h / +24h** — está escrita no
  `metodo.json` ("de uma hora antes do primeiro passo até vinte e quatro horas depois do
  último"), e a §"como a coisa acontece" do próprio roteiro a justifica ("SS aberta antes de a
  interrupção começar é anomalia"). Medido contra todo passo da ocorrência: **os 71 FORA estão
  todos fora, e os 1.140 de nível A estão todos dentro — zero contradições.** Sob a leitura
  simétrica apareceriam 16 falsos positivos. O site está certo; o invariante está mal escrito.
- **Invariante 4.** A regra da §5 diverge em 223 casos, mas 220 são só o rótulo (`EXCLUÍDO NA
  LEITURA` virou `EXCLUÍDA`) e os outros 3 são decisão do dono: `DG-RD-PO 00073/2026`,
  `ETO-RD-GR 00279/2026` e `DOLP-RD-PA 00605/2026` estão com `e3_status = RETIDO` e
  `cascata = SAÍDA` porque o `cascata_motivo` de cada um diz *"o dono martelou queimado
  assumindo a falta da terceira prova"*. Reescrita para a esteira vigente, a regra reproduz
  1.507 e as 3 exceções são o martelo, que está acima dela.
- **Invariante 13.** Na primeira rodada acusou 27 módulos sem `RECORTES`. Era o meu parser
  equilibrando `[` em vez de `{`. Corrigido: 27 e 27, nenhum faltando.

### O `scripts/auditoria_invariantes.py` do repositório passa onde eu falho — e o furo é dele

Rodei o script que já existe no repositório: **19 CONFERE, 1 FALHA (a 19, por falta de
`openpyxl`), 1 a olho.** Ele diz que 12, 14 e 17 conferem. Não conferem, e dá para mostrar onde
ele deixa de olhar:

- **17** — o regex é `\["(Base_[^"]+)",...` e `\["(Original_[^"]+)",...`. Das 17 linhas de
  download da aba Bases, ele enxerga 12. Ficam invisíveis `Sem_Interrupcao_Critica.xlsx`,
  `Bases_Gerais.xlsx`, `Filtros_do_Site.xlsx`, `Material_Pendente.xlsx` (o nome não começa com
  `Base_`) e `Base_Funis.xlsx` (o tamanho é `"0.02 MB".replace(".", ",")`, e `[\d,]+` não casa
  com o ponto). É exatamente aí que estão os dois defeitos.
- **14** — o teste de cada célula é `if num(esp) in celula`. A célula "Fica retido" da linha do
  deslocamento é `"0 — não retém: 1.134 corroboram, 135 sem registro"`; como o `"0"` esperado
  aparece no começo, a célula passa e **o resto dela nunca é lido**. Vale igual para o "18 do
  SIAGO" e para o "76 da ressalva". Os parágrafos em prosa não são conferidos de forma alguma —
  só se procura os literais `874`, `848` e `26 avariados`.
- **12** — `campos_txt` tem 10 campos e não inclui `at2_sub` nem `at2_obs`, que são justamente
  os que têm mojibake.

Meu script varre os 17 arquivos da lista real, todas as células da tabela, os parágrafos em
prosa e **todos** os campos string dos 1.510 registros. Ele está em
`scratchpad/aud2.py` e não foi adicionado ao repositório (seria arquivo novo em modo RELATO).

---

### FALHA 14 — 13 números do `metodo.json` não batem

A aba Método imprime esse arquivo como está. Todos os valores abaixo foram medidos em
`public/fluxo-1510.json`.

| Onde | Diz | O dado diz |
|---|---|---|
| `blocos.cascata` §1 · 1ª família da porta | 137 | **108** |
| ⌞ não aparece na Crítica em papel nenhum | 47 | **52** |
| ⌞ defeito no próprio código em outra data | 83 | **31** |
| ⌞ terceiro grupo | 7 | **25** (e a descrição também está errada) |
| `blocos.cascata` §1 · 2ª família | 103 | **112** |
| ⌞ categorias menores restantes | dezoito | **dezessete** |
| `blocos.cascata` tabela, linha 2 · corroboram | 1.134 | **1.126** |
| ⌞ sem registro | 135 | **132** (+ 32 sem marcação) |
| `blocos.cascata` tabela, linha 3 · esperam o SIAGO | 18 | **19** |
| `blocos.cascata` §4 · ressalva escrita na saída | 76 | **83** |
| `blocos.leitura` · categoria gravada errada | 118 | **128** |
| ⌞ destas, queima com troca comprovada | 96 | **106** |
| ⌞ destas, dizem avariado | 60 | **57** |

**O 137 é o mais grave, e ele se denuncia sozinho: 137 + 103 = 240, e o próprio parágrafo
anuncia 220 duas frases antes.** A conta certa é 108 + 112 = 220. E a mesma tela já traz o
número certo em outro lugar: a linha de download do `Sem_Interrupcao_Critica.xlsx` diz "Os **108**
que a Crítica não sustenta", com a repartição 31 / 52 / 25 — que é exatamente o `censo_critica`
dos 108. A aba Bases está certa; a aba Método está velha.

O terceiro grupo não é só um número trocado: "7 que não deixaram rastro em base alguma, nem
pelo teste do vizinho" descreve outra coisa. Os 25 do `censo_critica` são `SEM DEFEITO NELE` —
**aparecem** na Crítica, como interrompidos ou manobrados, só nunca com defeito aberto neles.
A frase da aba Bases já diz isso certo.

No bloco da leitura, o "21 dizem apenas outros" continua batendo exatamente — é o que prova que
a definição é a mesma (`categoria_gravada ≠ categoria_texto`, com `leitura = L1` e
`material_conferido = SIM`) e que só os outros três números andaram.

**Diff proposto — `public/metodo.json`, bloco `cascata`, `paragrafos[0]`:**

```diff
-A primeira, com 137 casos, é de quem não tem interrupção que sustente o caso: 47 cujo código
-não aparece na Crítica em papel nenhum nos sete meses do acervo, 83 que aparecem com defeito
-no próprio código mas em outra data, e 7 que não deixaram rastro em base alguma, nem pelo
-teste do vizinho. A segunda, com 103 casos, é de quem tem causa ou documento fora do
-indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes internos, e mais
-dezoito categorias menores, cada uma com o motivo escrito na linha.
+A primeira, com 108 casos, é de quem não tem interrupção que sustente o caso: 52 cujo código
+não aparece na Crítica em papel nenhum nos sete meses do acervo, 31 que aparecem com defeito
+no próprio código mas em outra data, e 25 que aparecem na Crítica só como interrompidos ou
+manobrados, sem defeito aberto neles em data nenhuma. A segunda, com 112 casos, é de quem tem
+causa ou documento fora do indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos,
+7 tapes internos, e mais dezessete categorias menores, cada uma com o motivo escrito na linha.
```

**Diff proposto — mesma bloco, `tabela.linhas`:**

```diff
 ["2 · Deslocamento (marcador)", "1.290", "1.290",
-  "0 — não retém: 1.134 corroboram, 135 sem registro"],
+  "0 — não retém: 1.126 corroboram, 132 sem registro, 32 sem marcação"],
 ["3 · SS e OS com material", "1.290", "1.269",
-  "21 sem prova de troca — e 18 deles só esperam a extração do SIAGO"],
+  "21 sem prova de troca — e 19 deles só esperam a extração do SIAGO"],
 ["4 · Ressalva da interrupção", "1.269", "1.269",
-  "0 — a ressalva virou marcador: 76 chegam à saída com ela escrita"],
+  "0 — a ressalva virou marcador: 83 chegam à saída com ela escrita"],
```

**Diff proposto — `paragrafos[3]` do mesmo bloco e `paragrafos[0]` do bloco `leitura`:**

```diff
-São 76 solicitações que chegam à saída com a ressalva escrita ao lado, filtrável,
+São 83 solicitações que chegam à saída com a ressalva escrita ao lado, filtrável,

-ela está errada em 118 solicitações, e em 96 delas o texto descreve queima com troca
-comprovada no material enquanto o rótulo gravado diz outra coisa — 60 dizem avariado,
-21 dizem apenas outros.
+ela está errada em 128 solicitações, e em 106 delas o texto descreve queima com troca
+comprovada no material enquanto o rótulo gravado diz outra coisa — 57 dizem avariado,
+21 dizem apenas outros.
```

**Não mexi em um número deste bloco:** o `correcoes` diz "Corrigiu 37 casos" para a janela
medida contra o intervalo, e o `resumo` do `fluxo-1510.json` diz `janelaCorrigida: 36`. Não há
campo por registro que decida quem está certo — não dá para provar nenhum dos dois contra o
dado, então fica como está e fica registrado. **A frase de resultado do `correcoes` confere:**
"a saída está hoje em 1.269 confirmados — 1.198 queimados e 71 avariados" bate exatamente.

### FALHA 17 — um arquivo de download que não existe, e um `PLACEHOLDER_TAM` na tela

`app/page.tsx:2761` publica uma linha de download para `Filtros_do_Site.xlsx` com o tamanho
escrito como o literal **`"PLACEHOLDER_TAM"`**. O arquivo não está em `public/bases/`. Na tela
isso é um cartão que mostra a palavra `PLACEHOLDER_TAM` onde deveria ir "0,2 MB" e um link que
dá 404. O gerador existe (`scripts/gerar_planilha_filtros.py`), mas ele depende do robô que abre
o site e clica filtro por filtro (`extrai_filtros.mjs`) — não é coisa que eu possa rodar aqui, e
inventar o arquivo seria pior do que não ter.

**Diff proposto — remover a linha até o arquivo existir** (`app/page.tsx:2761`):

```diff
-        ["Filtros_do_Site.xlsx", "Todos os filtros do site, aba por aba", "Cada filtro de cada tela com quantos casos tem e o que significa, mais a tabela longa filtro × SS de onde sai qualquer tabela dinâmica, e uma aba de dimensões com uma linha por solicitação. A composição de cada filtro não é recalculada: um robô abre o site, clica filtro por filtro e baixa a planilha de cada um — o que está aqui é o que a tela mostra, porque veio dela.", "PLACEHOLDER_TAM"],
```

Se o dono preferir manter a linha, o caminho é gerar e commitar a planilha — mas aí o tamanho
tem que ser escrito de verdade. **Deixar como está não é opção: é a única coisa desta rodada
que um diretor veria quebrada na tela.**

O segundo é trivial (`app/page.tsx:2760`): `Bases_Gerais.xlsx` tem 2.534.008 bytes = 2,53 MB
decimal, e a tela anuncia 2,4.

```diff
-        ["Bases_Gerais.xlsx", "Bases gerais — tudo num arquivo, para pesquisa", "...", "2,4 MB"],
+        ["Bases_Gerais.xlsx", "Bases gerais — tudo num arquivo, para pesquisa", "...", "2,5 MB"],
```

Os outros 14 arquivos conferem, cada um na sua escala — `Base_*` em MB decimal, `Original_*` e
os manuais em MiB. **A mistura de unidades continua de pé e continua não sendo defeito**, mas é
a terceira rodada que ela aparece: a mesma página mostra a mesma grandeza em duas escalas.

### FALHA 15 — quatro filtros da aba Ressalva leem campo morto

`app/page.tsx:1813-1816`. Os chips testam `ressalvas_graves` e `ressalvas_medias`. No dado de
hoje esses campos estão praticamente vazios — `ressalvas_graves` em **0** registros,
`ressalvas_medias` em **5**. O texto vivo está em **`ressalvas`, preenchido em 87**.

| Chip | Mostra hoje | Deveria mostrar |
|---|---|---|
| Ressalva grave | 0 | 0 (não há grave no dado — este pode sair) |
| Sem cliente interrompido | 4 | **77** |
| Defeito em outro elemento | 0 | 0 (não existe no dado de hoje) |
| Reclamação individual | 0 | 0 (não existe no dado de hoje) |

É o mesmo defeito que o comentário logo abaixo, na aba `semdesloc`, diz ter sido consertado
("Os cinco testes eram `() => true`, então cada chip anunciava 1.510 e abria vazio"). E o
`metodo.json` promete na cara: *"83 chegam à saída com a ressalva escrita ao lado, **filtrável**,
porque quem for defender o número precisa saber quais são"* — o filtro que ele promete entrega 4.

**Diff proposto:**

```diff
-      { id: "grave", rotulo: "Ressalva grave", nota: "Programada, preventiva ou com equipamento especial na ocorrência.", teste: (r) => Boolean(texto(r.ressalvas_graves)) },
-      { id: "semcliente", rotulo: "Sem cliente interrompido", nota: "A interrupção não deixou ninguém sem energia.", teste: (r) => texto(r.ressalvas_medias).includes("nenhum cliente") },
-      { id: "outroele", rotulo: "Defeito em outro elemento", nota: "O defeito foi aberto em outro equipamento, não no transformador.", teste: (r) => texto(r.ressalvas_medias).includes("outro equipamento") },
-      { id: "individual", rotulo: "Reclamação individual", nota: "Um cliente só reclamou; não foi interrupção coletiva.", teste: (r) => texto(r.ressalvas_medias).includes("um cliente só") },
+      /* Os quatro chips liam `ressalvas_graves` e `ressalvas_medias`, que a geração atual não
+         preenche mais (0 e 5 registros). O texto da ressalva mora em `ressalvas`. */
+      { id: "comressalva", rotulo: "Com ressalva escrita", nota: "A interrupção que sustenta o caso vem com ressalva anotada ao lado.", teste: (r) => Boolean(texto(r.ressalvas)) },
+      { id: "semcliente", rotulo: "Sem cliente interrompido", nota: "A interrupção não deixou ninguém sem energia.", teste: (r) => texto(r.ressalvas).includes("nenhum cliente") },
+      { id: "manobra", rotulo: "Manobra sem programação prévia", nota: "O desligamento entrou como manobra não programada — é o normal numa emergência.", teste: (r) => texto(r.ressalvas).includes("manobra") },
+      { id: "zerocliente", rotulo: "Zero cliente registrado", nota: "O evento vizinho é que interrompeu cliente; neste o contador ficou em zero.", teste: (r) => texto(r.ressalvas).includes("zero cliente") },
```

Com isso os chips passam a entregar 87 · 77 · 9 · 3. **Não apliquei porque muda a tela, e em
RELATO nada é aplicado** — mas é conserto de defeito, não mudança de regra: nenhum caso muda de
decisão, de cascata ou de aba.

### FALHA 12 — mojibake em 8 dossiês

10 ocorrências, em 8 SS, nos campos `at2_sub` e `at2_obs`. **Os dois são renderizados** —
`app/page.tsx:4147` e `4148`, dentro do bloco "ATENDIMENTO ACHADO PELO NÚMERO DA OCORRÊNCIA".

| SS | Campo | Está | Deveria ser |
|---|---|---|---|
| ETO-RD-AG 00003/2026 | `at2_sub` | `CONEXÃ\x83O` | `CONEXÃO` |
| ETO-RD-AG 00214/2026 | `at2_sub` | `SERVIÃ\x87O` | `SERVIÇO` |
| ETO-RD-AG 00249/2026 | `at2_sub` | `CONEXÃ\x83O` | `CONEXÃO` |
| DOLP-RD-PA 00429/2026 | `at2_sub` | `NÃ\x83O` (2×) | `NÃO` |
| DOLP-RD-PA 00437/2026 | `at2_sub` | `CONEXÃ\x83O` | `CONEXÃO` |
| DG-RD-PO 00333/2026 | `at2_obs` | `IntervenÃ§Ã£o` | `Intervenção` |
| ETO-RD-AG 00545/2026 | `at2_sub` | `SERVIÃ\x87O` | `SERVIÇO` |
| ETO-RD-AG 00627/2026 | `at2_sub` | `CONEXÃ\x83O` | `CONEXÃO` |

São dois tipos. O de `DG-RD-PO 00333` é UTF-8 lido como latin-1 e aparece na tela como
`IntervenÃ§Ã£o`. Os outros sete são o mesmo erro sobre um caractere que já era acentuado
(`Ç` → `Ã‡`, `Ã` → `Ãƒ`), e o segundo byte cai num caractere de controle invisível — na tela
sai `CONEXÃO` e `SERVIÃO`, que parecem só um acento comido. **A correção é `.encode('latin-1')
.decode('utf-8')` nesses 8 campos**, e ela não toca nenhum outro. Não apliquei: mexer no
`fluxo-1510.json` (17 MB) é escrita em arquivo de dado, e em RELATO isso não sai daqui.

### FALHA 9 — a disputa de ocorrência está resolvida, o carimbo dela não

As 3 disputas estão **certas** no essencial: em todas o dono é o de menor `|oc_dist_h|` e quem
perde é quem está marcado `duplicada = SIM`. O que falta é o rastro.

| Ocorrência | Dono | Cede | `e1_conflito` de quem cede |
|---|---|---|---|
| 20264103461348 | ENC-RD-PS 00143/2026 (0,0 h) | ETO-RD-PS 00077/2026 | **vazio** |
| 20264201987012 | ETO-RD-AG 00339/2026 (0,0 h) | ETO-RD-AG 00344/2026 | **vazio** |
| 20264530585973 | DOLP-RD-PA 00686/2026 (0,0 h) | DOLP-RD-PA 00690/2026 | preenchido |

O invariante pede que quem cede — e só quem cede — fique com `e1_conflito` preenchido. Dois dos
três estão sem. Nenhum dos três vira "sem interrupção", que era o defeito antigo, então o erro
de fundo não voltou: os três saem como `EXCLUÍDA`, mas por gatilhos diferentes (`sem_obra`,
`remanejamento` e `duplicada`), porque foram excluídos na porta por outro motivo antes de a
disputa importar. Some a isso que `disputa_perdida = SIM` também só aparece em 1.

**Não proponho diff.** Preencher `e1_conflito` nos outros dois é decidir se a disputa deve ser
registrada mesmo quando o caso já saiu por outra porta — é regra, e regra é do dono. Fica o
achado. (Na primeira rodada meu teste apontou os donos como perdedores: era `num(x) or 1e9` com
`0.0` caindo no falsy. Corrigido antes de reportar.)

### FALHA 7 — cinco blocos do `resumo` estão defasados

Vale antes o contexto que muda o tamanho disto: **a interface não lê o bloco `resumo` do
`fluxo-1510.json`.** Ela lê `metodo.resumo` (do `metodo.json`) e recalcula tudo o mais dos
`registros` em tempo de execução. Isto é dado velho parado no arquivo, não número errado na tela.

| Chave | `resumo` diz | Recontado |
|---|---|---|
| `duplicadas` | 1 | **3** |
| `borda2025SemInterrupcao` | 12 | **0** |
| `comAlertaNarrativa` | 421 | **383** |
| `mudaram` | 434 | **364** |
| `e4Alertas` | 6 | **88** |

Os outros 20 batem. **O `duplicadas` merece atenção separada:** 3 registros têm
`duplicada = SIM`, mas só 1 tem `disputa_perdida = SIM`, só 1 tem `e1_conflito` e o
`gatilhoExclusao.duplicada` é 1. É o mesmo buraco da FALHA 9 visto de outro ângulo — o dado tem
duas contagens de duplicada e elas discordam.

**Não proponho diff.** O `resumo` é gerado, não escrito à mão: consertar à mão sem regerar
criaria uma terceira verdade. O caminho é rodar de novo o gerador (`scripts/aplicar_regras_novas.py`)
ou remover o bloco, e as duas coisas são decisão do dono.

---

### Lacuna do roteiro que virou notícia boa: **dezembro de 2025 entrou no acervo**

O `AUDITORIA_NOTURNA.md` lista como lacuna conhecida que "a base de interrupção começa em
01/01/2026 às 01:14: dezembro de 2025 não existe. 24 SS têm a janela retrocedendo para antes
disso, 12 delas retidas sem interrupção."

**Não é mais verdade.** A ocorrência mais antiga no dado é de **08/12/2025 14:48**, 29 SS casam
com ocorrência de dezembro, e o `lacuna_base` das 24 marcadas com `borda_2025` já diz, com todas
as letras: *"a janela de 24 horas desta SS retrocede para dezembro de 2025 — e dezembro agora
está no acervo. A ocorrência foi encontrada lá."* **As 24 estão todas na SAÍDA e nenhuma ficou
sem interrupção** — os 12 do roteiro são 0.

Uma ressalva pequena, que não é defeito: o `historico` do ativo começa em 01/01/2026 e não traz
os eventos de dezembro. Coerente com o KPI, que diz "eventos no semestre" e o semestre é
jan–jun — mas quem abrir o histórico de um dos 24 não vai ver ali a ocorrência que sustentou o
caso. Registro para o dono decidir se o histórico deve passar a cobrir dezembro.

A outra lacuna, a do TMAE, **continua exatamente como descrita**: 99 SS entre 26 e 31 de janeiro,
todas marcadas `tmae_gap_jan`, todas com `lacuna_base`. E como o deslocamento hoje não retém
ninguém, as 83 que o roteiro dava como retidas por falta de deslocamento são **0**.

### O que eu teria corrigido no próprio `AUDITORIA_NOTURNA.md`

A §6 manda: "se algum deles não bater na sua execução, o dado mudou e o número aqui é que está
velho — corrija este arquivo junto." Em RELATO não corrijo, então listo o que está velho:

1. **§5, a regra da esteira** — descreve sete cascatas e os campos `duplicada`, `chega_e2`,
   `chega_e3`. A esteira de hoje tem três, e a exclusão vem antes dela.
2. **§6, todos os números** — 884/617/9, a corrente inteira, os blocos de fato, leitura e
   `e1_nivel`, e as marcas auxiliares. Os valores de hoje estão na tabela do topo desta entrada.
3. **Invariante 8** — precisa dizer janela assimétrica de −1h a +24h, medida contra cada passo.
4. **Invariante 9** — "e1_conflito em 7 (3 que cedem + 4 fora da janela)" não descreve mais o
   dado: hoje é 1.
5. **Lacunas conhecidas, 1º item** — dezembro de 2025 entrou; os 12 retidos são 0.
6. **"Onde está tudo"** — diz que `page.tsx` tem ~1.120 linhas; tem **4.267**.

Também vale registrar que as quatro decisões intocáveis da seção "o que você NÃO pode mexer"
estão escritas com números de outra versão (22 SS só com TMAE, 89 por `QTD_CONS_INTER_FAT = 0`,
2 exclusões por dano externo). **Não conferi nenhuma delas contra o dado de hoje e não mexi em
nada** — mas o dono precisa saber que os rótulos daquela lista envelheceram junto com o resto.

### Verificação e limites

- `pnpm install --frozen-lockfile && pnpm run build:pages` **passa na `main` como está**
  (vite 8.0.13, built in 3.52s). Nenhuma dependência foi adicionada.
- `python3 scripts/auditoria_invariantes.py`: 19 CONFERE, 1 FALHA, 1 a olho.
- **Invariante 19 do script do repositório não roda**: `openpyxl` não está instalado no
  ambiente, então a planilha de download não foi aberta e não pude conferir se ela conta a
  mesma história que o dado. Não instalei nada.
- **Invariante 15 só pôde ser fechado em parte.** A barra lateral, os KPIs e a caixa d'água
  saem de `conta()` sobre os `registros` e não podem divergir por construção — isso é
  estrutural e vale. O que eu consegui testar de fato foram os filtros, e é lá que está a
  falha. Um número escrito à mão no meio de uma frase do `page.tsx` continua fora do alcance
  de qualquer teste automático que eu saiba escrever; segue precisando de olho.
- **Não conferi** `universo-ss.json`, `auditorias.json`, `revisao.json` nem os manuais em PDF
  e DOCX contra o `fluxo-1510.json`. Estão fora dos 17 invariantes e não deu tempo dentro do
  limite de duas horas.

**Nenhum arquivo do repositório foi modificado nesta rodada.** `git status` está limpo fora
deste relatório.


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
