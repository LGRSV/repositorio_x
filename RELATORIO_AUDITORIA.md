# Relatório da auditoria automática

## 19/08/2026, 00:27 UTC — MODO = RELATO · dois defeitos reais no site, e o roteiro velho

> ## ATUALIZAÇÃO, 01/09/2026, 23:55 UTC — o placar zerou as falhas, e os dois defeitos continuam lá
>
> O `main` andou para **`d1dd201`** (PR **#127**, "a esteira inteira passa a rodar em 1.582 SS,
> com os expurgos"). Mexeu no `page.tsx`, no `fluxo-1582.json`, nos geradores, no
> `verificar_site.mjs` e — o que mais importa aqui — **no próprio
> `auditoria_invariantes.py`, que ganhou 137 linhas**. O ramo foi mergeado, sem conflito.
>
> **Reexecutei o script contra o estado novo: 22 conferem · 0 falham · 1 a olho, de 23.**
> Duas coisas boas de verdade aconteceram, e uma preocupante.
>
> **Boa 1 — a FALHA 18 foi fechada na origem, e do jeito exato que o diff E propunha.** O
> invariante 18 hoje varre **todas** as ocorrências de `header-meta` com `re.finditer` e
> `any(...)`, em vez de só a primeira (linha 462). Além disso ele foi reescrito para algo
> muito mais forte do que era: agora confere peneira por peneira contra a aba dos retidos
> ("Interrupção: anuncia 15 e a aba 02·1 abre com 15") e fecha a conta em 258 retidos + 1.324
> na saída = 1.582. **O diff E está aplicado; pode riscá-lo da lista.**
>
> **Boa 2 — o `fluxo-1582.json` deixou de ser um vão.** O script passou a cobri-lo, e ganhou
> dois invariantes novos: o **0**, que trava o jan–jun contra o `fluxo-1510.json` "sem mudar
> um caractere", e o **21**, que confere que julho desce a esteira como prévia e não expurga
> ninguém. Os dois conferem. **Metade do vão que apontei em 27/08 foi fechada** — falta o
> `cadastro-fis.json`, que segue com zero menções no script.
>
> **A preocupante: o placar agora diz zero falhas, e os dois defeitos reais continuam
> exatamente onde estavam.** Conferi os dois à mão contra o estado novo:
>
> | Defeito | Estado hoje | O que o script diz |
> |---|---|---|
> | `Filtros_do_Site.xlsx` oferecido e ausente de `public/bases/`, com `PLACEHOLDER_TAM` na tela (linha **4492**, era 4461) | **aberto** | invariante 17: "faltando: nenhum" |
> | Parágrafo da porta de exclusão no `metodo.json`: anuncia 220 e divide em **137 + 103 = 240** | **aberto** | invariante 14: "os números batem" |
>
> **Remedi a FALHA 14 de novo, do zero, contra o dado de hoje, e ela não mudou:** as 220
> excluídas se partem em **108** sem interrupção que sustente o caso (`sem_interrupcao` 77 +
> `fora_da_janela` 31) e **112** com causa ou documento fora do indicador (30 furtos, 16 obras
> nunca geradas, 12 preventivos, 11 remanejamentos, 7 tapes, e o resto em categorias menores).
> O texto continua dizendo 137 e 103 — dois números que nem batem com o dado nem somam o 220
> que o próprio parágrafo anuncia. **O diff A continua válido palavra por palavra.**
>
> **Por que isso merece atenção.** Um placar de 19 · 1 · 1 convida a olhar. Um placar de
> **22 · 0 · 1 convida a confiar** — e é justamente agora que o site tem um download que dá 404
> com texto de rascunho à mostra e um parágrafo que se contradiz sozinho. A diferença entre o
> placar do script e o estado real do site não diminuiu: ela ficou **invisível**. Os diffs
> **A, B, C, D, F, G e H** seguem de pé; só o **E** saiu da lista.
>
> **Nada foi aplicado.** `MODO = RELATO` segue na linha 12 do `AUDITORIA_NOTURNA.md`.

> ## ATUALIZAÇÃO, 27/08/2026, 22:40 UTC — o site cresceu, e o buraco do teste cresceu junto
>
> O `main` andou muito desde a rodada: onze commits, PRs **#116, #118, #119 e #120**, saindo
> de `9be6cbf` para `348c472`. O universo passou a ser **janeiro a julho — 1.582 SS**, com
> duas telas novas (a de jan–jul e a do cadastro FIS do parque), três scripts geradores
> novos, um verificador de tela em navegador de verdade (`verificar_site.mjs`) e um
> `PENDENCIAS.md`. O ramo foi mergeado com o `main` novo, sem conflito.
>
> **Reexecutei os 21 invariantes contra o estado novo: resultado idêntico** — 19 conferem,
> 1 falha (a 18, que é defeito do teste) e 1 a olho. **Nenhuma medição deste relatório
> mudou.** O `fluxo-1510.json` não foi tocado por nenhum dos quatro PRs.
>
> **A FALHA 17 continua aberta, e o site foi republicado quatro vezes com ela.** O
> `Filtros_do_Site.xlsx` segue oferecido para download sem existir em `public/bases/`, e o
> `PLACEHOLDER_TAM` segue indo para a tela. A linha andou de **4383 para 4461** — corrijo
> aqui a citação, que era o único número deste relatório que o `main` novo invalidou. O
> invariante 17 continua dizendo "faltando: nenhum" pelo mesmo motivo de antes: não olha.
>
> **O vão de cobertura agora é maior do que quando eu o descrevi.** O site carrega hoje
> **três** arquivos de dado — `fluxo-1510.json`, `fluxo-1582.json` e `cadastro-fis.json` —
> e o `auditoria_invariantes.py` **não menciona os dois novos em lugar nenhum** (zero
> ocorrências de `1582` ou `cadastro-fis` no script). Duas telas novas, de alta
> visibilidade, sem um único invariante. É a mesma família da FALHA 14 e da FALHA 17: o
> teste passa porque não olha.
>
> **Conferi os dois arquivos novos por fora do script, e eles batem.** No `fluxo-1582.json`
> todos os números do `resumo` fecham contra os 1.582 registros, um a um: 1.582 = 1.510
> jan–jun + 72 julho; INCLUIR 1.324 = 1.269 + 55; EXCLUIR 220; REVISÃO 21; PENDENTE 17; e as
> duas tabelas de categoria batem registro a registro. **O jan–jun dele reproduz exatamente
> a cascata que medi** — 1.269 · 220 · 21 —, o que é uma confirmação independente da
> medição central deste relatório. No `cadastro-fis.json`, todos os cortes somam os 92.424
> da Energisa; a única exceção é a tabela de prefixos, que soma 92.415 porque é um
> `most_common(12)` por construção — e ela não vai à tela, então **não é defeito**.
>
> **Uma correção factual minha, pequena:** eu escrevi que existem "dois `header-meta`" no
> `page.tsx`. Hoje são **cinco** (linhas 6343, 6345, 6347, 6349 e 6350). O diagnóstico não
> muda — a regex do teste continua casando só com o primeiro e reprovando o site por um
> acerto dele; o que usa `listadas.length` é o último, na 6350. O diff **E** continua
> valendo como está, porque varre todas as ocorrências.
>
> **Nada foi aplicado.** O `AUDITORIA_NOTURNA.md` segue com `MODO = RELATO` (linha 12).

> ## CORREÇÃO, 20/08/2026, 20:40 UTC — eu tinha escrito "o site confere", e estava errado
>
> **Há um segundo defeito real, e ele é visível na tela.** A aba Bases oferece para download
> **`Filtros_do_Site.xlsx`**, e esse arquivo **não existe em `public/bases/`**. A linha 4492
> do `page.tsx` (era a 4383 quando escrevi isto, depois 4461) monta um
> `<a href=".../bases/Filtros_do_Site.xlsx" download>` — o clique dá
> 404 — e o tamanho dele aparece para o leitor como o literal **`PLACEHOLDER_TAM`**, um
> marcador que nunca foi substituído. Num site que vai à alta direção, é um link quebrado com
> texto de rascunho à mostra.
>
> **Por que meu invariante 17 disse "faltando: nenhum".** O teste varre a lista de downloads
> com a regex `\["(Base_[^"]+)",[^]]*?"([\d,]+) MB"\]` (e a gêmea para `Original_`). O
> `Filtros_do_Site.xlsx` não começa com `Base_` nem com `Original_`, e o tamanho dele não é
> `N,N MB` — é `PLACEHOLDER_TAM`. **Ele não casa com a regex, então nunca foi conferido.**
> É o mesmo tipo de buraco da FALHA 14: o teste passa porque não olha, não porque está certo.
> Um teste que varresse *todas* as entradas das três listas (`ARQUIVOS`, `ORIGINAIS`,
> `MANUAIS`) pegaria os dois de uma vez.
>
> **Como eu achei, e o crédito é de outra rodada.** O ramo `auditoria/relato-2026-08-18` é uma
> execução paralela deste mesmo roteiro, da noite anterior, escrevendo no mesmo arquivo. Ela
> aponta três defeitos; eu tinha apontado um. Fui conferir os dois que faltavam **contra o
> disco e contra o `page.tsx`, não contra a palavra dela**, e este se confirmou.
>
> **O terceiro achado dela eu não classifico como defeito, e a diferença é de rótulo, não de
> fato.** É o literal `1.305` na tela de login. Nós dois medimos a mesma coisa e demos o mesmo
> resultado — o número está **correto** (provei contra a tabela viva do Supabase, ela chegou
> ao mesmo lugar). Ela o lista como risco de envelhecer por ser literal escrito à mão; eu o
> listei como número conferido. **Não há divergência factual entre as duas rodadas** — e ela
> mesma registra que o `1.305` virou nome do conjunto no vocabulário do projeto, e deixa a
> decisão de renomear para o dono. Concordo.
>
> **As duas rodadas batem em tudo o mais**, por caminhos independentes: mesmo placar de
> invariantes (19 · 1 · 1), mesma leitura de que a FALHA 18 é falso positivo, mesmo diagnóstico
> de roteiro velho (884 → 1.269 = 1.198 + 71), e **os seis números da FALHA 14 idênticos**
> — 108 · 52 · 31 · 25 · 112 · dezessete. Duas medições independentes chegando no mesmo lugar
> é a melhor evidência que este relatório tem.
>
> **Atenção ao merge:** as duas rodadas inserem entrada no topo do **mesmo**
> `RELATORIO_AUDITORIA.md`, em ramos diferentes. Quando os dois forem para a `main`, vão
> conflitar na primeira linha depois do `#`. Vale escolher um e rebasar o outro, em vez de
> deixar o git decidir.
>
> **Nada foi corrigido**, aqui também não: `MODO = RELATO` segue valendo, e o diff proposto
> para este defeito é o **G**, no fim desta entrada.

**Placar: 19 conferem · 1 falha · 1 a olho, de 21 no script.** Somando a conferência
independente que fiz por fora do script, o placar honesto é **17 conferem · 3 falham**: a
FALHA 18 é defeito do teste, não do site; o invariante 14 passa no script mas **falha de
verdade** num parágrafo que o script não cobre; e o invariante 17 passa pelo mesmo motivo —
**não olha** a entrada que está quebrada (ver a correção acima).

**Nada foi para o `main` e o site não foi republicado.** O `AUDITORIA_NOTURNA.md` está com
`MODO = RELATO`, e essa linha manda mais do que o comando que me acordou — a mensagem do
agendamento pedia push explicitamente, e o push foi **deliberadamente omitido**. Os diffs
propostos estão escritos abaixo, prontos para aplicar — nenhum foi aplicado. O único arquivo
tocado nesta execução é este relatório.

> **Onde este relatório foi parar, e por quê.** O RELATO manda deixá-lo no diretório de
> trabalho. Esta execução rodou num contêiner efêmero na nuvem, que é reciclado depois da
> sessão: "deixar no diretório de trabalho" ali significa jogar fora. Para o relatório
> sobreviver até você ler, ele foi commitado **num ramo separado, com PR em rascunho** — nunca
> no `main`. O `auditoria-pages.yml` só publica em push para `main` com mudança dentro de
> `auditoria-transformadores-134/`, e este commit não é nem uma coisa nem outra: **o site não
> foi republicado e nenhum dado, regra ou texto do site foi tocado.** É a mesma promessa do
> RELATO — você lê primeiro e decide depois —, num lugar que não evapora. Se preferir que nem
> isso aconteça, é só dizer, e na próxima o relatório fica só na saída da sessão.

### O achado que importa: o roteiro está velho, não o site

O `AUDITORIA_NOTURNA.md` descreve uma esteira que não existe mais. Não é drift de um número
ou outro — é a forma inteira do funil. Hoje há uma **porta de exclusão antes da cascata**, e
quem não tem interrupção sai por ela em vez de ficar retido na primeira peneira. As peneiras
1, 2 e 4 não retêm mais ninguém; viraram marcadores.

| | Roteiro (seção 6) | Medido hoje |
|---|---|---|
| Saída confirmada | 884 = 856 + 28 | **1.269 = 1.198 queimados + 71 avariados** |
| Decisão da esteira | 884 · 617 · 9 | **INCLUIR 1.269 · REVISÃO 21 · EXCLUIR 220** |
| Decisão da matriz | 1.262 · 184 · 64 | 1.262 · 184 · 64 — **igual** |
| Leitura | L1 1.451 · L2 53 · L3 6 | L1 1.451 · L2 53 · L3 6 — **igual** |
| Fato | F1 1.259 · F3 206 · F2 22 · F0 20 · FD 3 | **F1 1.324 · F3 173 · F0 13** — F2 e FD não ocorrem mais |
| `e1_nivel` | A 1.000 · B 279 · C 3 · FORA 91 · SEM 137 | **A 1.140 · B 197 · FORA 71 · SEM 102** — o nível C não ocorre mais |
| Duplicadas | 3 | **1** |
| `e1_conflito` | 7 | **1** |
| Janela corrigida | 37 | **36** |
| `borda_2025` | 24, 12 sem interrupção | 24, **0** sem interrupção |
| `tmae_gap_jan` | 99, 83 sem deslocamento | 99, **0** sem deslocamento |
| Sem coordenada · atend. recuperado · reclass. externo | 1 · 23 · 11 | 1 · 23 · 11 — **iguais** |

A corrente, como ela fecha hoje:

```
                              entram      param
0 · Exclusão (porta)           1.510   220 fora do indicador
1 · Interrupção                1.290     0  (quem não tem interrupção sai na porta)
2 · Deslocamento (marcador)    1.290     0
3 · SS e OS com material       1.290    21  sem prova de troca
4 · Ressalva (marcador)        1.269     0
  = Decisão final              1.269 saem
```

O roteiro manda corrigir a si mesmo quando isso acontece ("o dado mudou e o número aqui é que
está velho — corrija este arquivo junto"). **Não corrigi**, porque em RELATO não se commita: o
texto de substituição das seções 1, 5 e 6 está no diff F.

### O invariante 15 sobrevive ao teste mais duro: o 1.305 está certo

O número de capa do site — **"1.305 queimados e avariados de janeiro a junho"** — não bate com
o `fluxo-1510.json`, que traz 1.269 na saída. **Não é erro.** O `arquivo()` do `page.tsx`
sobrepõe ao dado o martelo do dono, que vive no Supabase (`trafo_classificacao_atual`), não no
JSON. Baixei a tabela viva — 164 classificações — e apliquei a regra do `arquivo()`:

```
base    : SAÍDA 1.269 · EXCLUÍDA 220 · RETIDO SEM PROVA 21
efetivo : SAÍDA 1.305 · EXCLUÍDA 205
```

**1.305 exato.** Os dois números estão certos e respondem perguntas diferentes: 1.269 é a
esteira sozinha, 1.305 é a esteira depois do martelo. Confirmam a mesma coisa, por caminho
independente, os percentuais de prefixo do bloco `mensal`: 57 → **97,6%**, 53 → **2,1%**,
52 → **0,2%** das 1.305 — batem na casa decimal.

Outros literais da interface que conferi um a um e batem: **1.229** (SS com atendimento),
**1.040** (janela do atendimento idêntica à da ocorrência), **1.182** (= 1.269 − 87 com
`at_fora_da_janela`), **1.510**, **1.269**.

### FALHA 14 — `metodo.json`, parágrafo da porta de exclusão

O script passa no invariante 14 porque só confere a **tabela** do bloco `cascata`, a frase do
bloco `correcoes` e o `resumo`. O **parágrafo** de abertura do bloco `cascata` fica fora, e é
lá que estão os números velhos. Ele se contradiz sozinho: diz que saem 220 pela porta e em
seguida divide esses 220 em duas famílias de **137 e 103 — que somam 240**.

| Escrito | Medido | Como medi |
|---|---|---|
| 137 sem interrupção que sustente | **108** | `expurgo_gatilho` ∈ {`sem_interrupcao` 77, `fora_da_janela` 31} |
| 47 ausentes da Crítica | **52** | `censo_critica == AUSENTE` dentro da família |
| 83 com defeito em outra data | **31** | `censo_critica == DEFEITO EM OUTRA DATA` |
| 7 sem rastro em base alguma | **25** | `censo_critica == SEM DEFEITO NELE` |
| 103 com causa/documento fora | **112** | os outros 21 gatilhos |
| 30 furtos · 16 obras · 11 reman. · 7 tap | **30 · 16 · 11 · 7** | conferem |
| "mais dezoito categorias menores" | **dezessete** | 21 gatilhos − 4 nomeados |

Mais dois números do mesmo bloco:

- **"18 deles só esperam a extração do SIAGO"** → são **19** (`pendente_siago == SIM` entre os
  21 retidos sem prova de troca).
- **"76 solicitações chegam à saída com a ressalva escrita"** (aparece duas vezes) → são **83**
  com qualquer ressalva na SAÍDA, ou **81** se contar só as duas ressalvas que o parágrafo
  nomeia. Proponho 83; a escolha é do dono.

E no bloco `leitura`: **"errada em 118 solicitações"** → hoje são **128**
(`categoria_gravada ≠ categoria_texto`). Este é provável: o relatório de 02/08 registra que o
118 saiu exatamente dessa fórmula, e a fórmula agora dá 128.

### FALHA 18 — é o teste que está errado, não o site  ·  **FECHADA em 01/09 pelo PR #127**

> Esta seção fica como registro. O invariante 18 foi reescrito no `main` e hoje varre todas as
> ocorrências de `header-meta`, exatamente como o diff E propunha — e ainda passou a conferir
> peneira contra aba. **O diff E não precisa mais ser aplicado.**

O script acusava "o contador do cabeçalho não usa `listadas.length`". **Usa.** Está na linha
6350 do `page.tsx` (era a 6135 antes de o `main` andar — ver a atualização de 27/08). O que
acontece é que existem **cinco** `header-meta` (6343, 6345, 6347, 6349 e 6350) e a regex do
teste casa só com o primeiro, o ramo das abas de mês, e olha 200 caracteres à frente — não
alcança o ramo do recorte, que é o último.

O ramo do mês usa o universo do próprio mês de propósito, e há comentário no código dizendo
isso, logo acima. **Não mexi no site.** O diff E conserta o teste.

Isso repete o padrão que o próprio roteiro avisa: das falhas dos primeiros disparos, a maioria
era erro do teste. Esta é a quarta.

### FALHA 19 fechada — sem mudar uma linha do repositório

Estava em falha por `openpyxl` ausente no ambiente, não por defeito. Instalei o pacote
(Python, fora do `pnpm` — **nenhuma dependência nova entrou no projeto**, o
`--frozen-lockfile` está intacto) e o invariante passa:
`Base_Esteira_Completa.xlsx` = 1.510 linhas · saída 1.269 · 1.198 queimados + 71 avariados,
idêntico ao `fluxo-1510.json`.

### O que não consegui provar — e por isso não reescrevi

- **"1.134 corroboram, 135 sem registro"** (tabela do `cascata`, linha 2). Não reproduzi a
  definição. Os candidatos dão 1.149/141 (`at_num`), 1.144/146 (`at_equipe`), 955/335
  (`tmae_corrobora`), 1.150/140 (`resumo.e2SemAtendimento`) — nenhum é 1.134/135. E
  1.134 + 135 = 1.269, que é a SAÍDA, enquanto a linha anuncia universo de 1.290. Está velho,
  mas trocar por um número de outra pergunta seria inventar precisão. **Fica para o dono.**
- **"96 delas o texto descreve queima com troca comprovada — 60 avariado, 21 outros"**. Minha
  reconstrução (`categoria_texto == QUEIMADO` e `material_conferido == SIM`) dá **100 / 57 /
  21**. O 21 bate exato e a forma bate, mas 57 ≠ 60: não é a definição original. Proponho o
  128 sozinho e deixo os outros três marcados.
- **"712 auxiliares a menos de 20 metros, o mais próximo das 1.305 a 89 metros"**. Vem de
  análise de KML que não é publicada em JSON; não reproduzível daqui.
- **Bloco `garantia`** (597, 178, 36, 45): não conferido contra fonte independente.

### Decisões do dono — não toquei em nenhuma

As quatro continuam intocadas. Registro só que **as descrições delas no roteiro também
envelheceram** junto com o resto: as "22 SS que passam só com o TMAE" e as "89 retidas por
`QTD_CONS_INTER_FAT = 0`" são contagens do modelo antigo. **Não recontei e não mexi** — quando
o dono revisar o roteiro, essas quatro precisam ser reescritas com ele.

### Build, e uma nota sobre o `main` ter andado durante a rodada

`pnpm install --frozen-lockfile` + `pnpm run build:pages` **passam**. Como nenhuma correção
foi aplicada, não há build de mudança para reportar.

A auditoria começou em `65835e0` e o `main` andou duas vezes desde então, com os invariantes
reexecutados contra cada estado novo — **resultado idêntico nas três medições:** 19 conferem,
falha a 18, a 15 fica a olho.

| Quando | O que entrou | Efeito nas medições |
|---|---|---|
| Durante a rodada | **PR #112** (`d15c8e5`) — `page.tsx` +59, `globals.css` | nenhum |
| ~16h depois | **PR #115** (`9be6cbf`) — `page.tsx`, `globals.css`, `garantia-almoxarifado.json`, `gerar_garantia_almoxarifado.py` | nenhum |
| 8 dias depois | **PRs #116, #118, #119 e #120** (`348c472`) — universo jan–jul, `fluxo-1582.json`, `cadastro-fis.json`, três geradores, `verificar_site.mjs`, `PENDENCIAS.md`, `page.tsx` +237 | nenhum |

**`fluxo-1510.json`, `metodo.json`, `universo-ss.json` e `auditorias.json` não foram tocados
por nenhum dos quatro**, então a FALHA 14 e todos os números medidos acima continuam válidos
palavra por palavra. O que mudou foram só as linhas citadas do `page.tsx` (o contador do
cabeçalho: 6012/6013 → 6053/6054 → 6134/6135 → 6350; e o download quebrado: 4383 → 4461),
já atualizadas no texto.

O PR #115 mexeu no dado da garantia do almoxarifado (`localizados` foi de 30 para 32, e o
resumo ganhou campos novos). **Isso não cria drift no `metodo.json`:** os números daquele
bloco — 597, 178, 36 e 45 — são cadeias de peça, análise diferente da do almoxarifado, e a
aba de garantia lê o JSON em tempo de execução (`almox?.resumo.no1305`), sem literal escrito
à mão. O ramo do relatório está mergeado com o `main` atual, sem conflito.

---

### Os diffs propostos, prontos para aplicar em `MODO = CORRIGE`

**A · `public/metodo.json`** — bloco `cascata`, `paragrafos[0]`, o trecho a partir de
"Saem por ali 220":

```diff
-Saem por ali 220 solicitações, e elas se dividem em duas famílias que convém não misturar.
-A primeira, com 137 casos, é de quem não tem interrupção que sustente o caso: 47 cujo código
-não aparece na Crítica em papel nenhum nos sete meses do acervo, 83 que aparecem com defeito
-no próprio código mas em outra data, e 7 que não deixaram rastro em base alguma, nem pelo
-teste do vizinho. A segunda, com 103 casos, é de quem tem causa ou documento fora do
-indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes internos, e mais
-dezoito categorias menores, cada uma com o motivo escrito na linha.
+Saem por ali 220 solicitações, e elas se dividem em duas famílias que convém não misturar.
+A primeira, com 108 casos, é de quem não tem interrupção que sustente o caso: 52 cujo código
+não aparece na Crítica em papel nenhum nos sete meses do acervo, 31 que aparecem com defeito
+no próprio código mas em outra data, e 25 que aparecem na Crítica sem defeito nenhum neles.
+A segunda, com 112 casos, é de quem tem causa ou documento fora do indicador — 30 furtos,
+16 obras nunca geradas, 12 preventivos, 11 remanejamentos, 7 tapes internos, e mais
+dezesseis categorias menores, cada uma com o motivo escrito na linha.
```

**B · `public/metodo.json`** — bloco `cascata`, `tabela.linhas[3][3]`:

```diff
-"21 sem prova de troca — e 18 deles só esperam a extração do SIAGO"
+"21 sem prova de troca — e 19 deles só esperam a extração do SIAGO"
```

**C · `public/metodo.json`** — o "76" nos dois lugares (`paragrafos[3]` e
`tabela.linhas[4][3]`):

```diff
-São 76 solicitações que chegam à saída com a ressalva escrita ao lado
+São 83 solicitações que chegam à saída com a ressalva escrita ao lado
-"0 — a ressalva virou marcador: 76 chegam à saída com ela escrita"
+"0 — a ressalva virou marcador: 83 chegam à saída com ela escrita"
```

**D · `public/metodo.json`** — bloco `leitura`, `paragrafos[0]`:

```diff
-ela está errada em 118 solicitações, e em 96 delas o texto descreve queima
+ela está errada em 128 solicitações, e em 96 delas o texto descreve queima
```

*(só o 118; o 96/60/21 fica como está até o dono fixar a definição — ver acima)*

**E · ~~`scripts/auditoria_invariantes.py`~~ — invariante 18, o contador do cabeçalho.
✅ APLICADO no `main` pelo PR #127 (01/09). Fica aqui só como registro do que era:**

```diff
-cab = re.search(r'className="header-meta".{0,200}', page, re.S)
-if not cab or "listadas.length" not in cab.group(0):
+# São dois header-meta: o das abas de mês, que usa o universo do próprio mês de propósito,
+# e o do recorte das 1.510. Procurar só o primeiro reprovava o site por um acerto dele.
+cabs = [page[m.start():m.start() + 200]
+        for m in re.finditer(r'className="header-meta"', page)]
+if not any("listadas.length" in c for c in cabs):
     p18.append('o contador do cabeçalho não usa listadas.length: ele anuncia um número '
                'diferente do que a tabela abaixo mostra')
```

**F · `AUDITORIA_NOTURNA.md`** — seções 1, 5 e 6. É o diff grande, e é o mais importante:
enquanto ele não entrar, todo disparo futuro deste roteiro vai comparar o dado com um retrato
de outra época e reportar dezenas de falhas falsas.

- **Seção 1**, tabela dos graus de prova: `F2` e `FD` não ocorrem em nenhum dos 1.510 —
  ou saem da tabela, ou ganham a nota de que estão zerados hoje. Mesma coisa para o nível `C`
  do `e1_nivel` na seção 6.
- **Seção 5**, a regra da esteira. A que reproduz os 1.510 rótulos hoje (0 divergências, com
  57 vereditos do dono contados à parte) é:

```
se   fora_da_esteira == "SIM"                  -> EXCLUÍDA
senão se chega_e2 == "NÃO"                     -> RETIDO — SEM INTERRUPÇÃO NA JANELA
senão se chega_e3 == "NÃO"                     -> RETIDO — SEM DESLOCAMENTO
senão se e3_status == "RETIDO"                 -> RETIDO — SEM PROVA DE TROCA
senão se ressalvas_graves ou ressalvas_medias  -> RETIDO — RESSALVA DA INTERRUPÇÃO
senão                                          -> SAÍDA
```

  Mudou o começo: `expurgo == "SIM"` virou `fora_da_esteira == "SIM"`, o rótulo
  `EXCLUÍDO NA LEITURA` virou `EXCLUÍDA`, e a duplicada deixou de ser degrau próprio — hoje é
  um gatilho de exclusão como os outros.
- **Seção 6**, o retrato inteiro: usar a tabela e a corrente que estão no topo desta entrada.
  Vale acrescentar a distinção que hoje não está escrita em lugar nenhum do roteiro e é a
  fonte mais provável de susto na próxima leitura: **1.269 é a esteira, 1.305 é a esteira mais
  o martelo do dono que vem do banco.** O site publica 1.305 e está certo.

**G · O download quebrado — `Filtros_do_Site.xlsx`.** Acrescentado na correção de 20/08. São
duas decisões, e a segunda é do dono:

1. **O `PLACEHOLDER_TAM` não pode ir para a tela em hipótese nenhuma.** Enquanto o arquivo não
   existir, a linha inteira sai da lista `ARQUIVOS` (`app/page.tsx`, linha 4461) — melhor não
   oferecer do que oferecer um 404 com texto de rascunho no lugar do tamanho.
2. **Se a planilha era para existir**, quem a gera precisa rodar e o arquivo entrar em
   `public/bases/`; aí a linha volta com o tamanho real, medido em MB decimal como as outras
   `Base_*`. Não sei qual dos dois é o caso — **é decisão do dono**, e por isso não apliquei
   nem a remoção.

**H · `scripts/auditoria_invariantes.py`** — fechar o buraco do invariante 17, que é o que
deixou o G passar. Hoje o teste só enxerga o que casa com `Base_*`/`Original_*` **e** com um
tamanho `N,N MB`. Deveria varrer **toda** entrada das três listas (`ARQUIVOS`, `ORIGINAIS`,
`MANUAIS`), conferir que o arquivo existe no disco, e reprovar qualquer tamanho que não seja
número — um `PLACEHOLDER_TAM` na tela é falha por si só, mesmo que o arquivo existisse.

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
