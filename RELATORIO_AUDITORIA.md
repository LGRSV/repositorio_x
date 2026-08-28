# Relatório da auditoria automática

## 28/08/2026, 00:22 UTC — `MODO = RELATO` · o roteiro envelheceu, o site não

**Placar: 12 conferem · 4 falham · 1 a olho, de 17.** Nada foi para a `main`, nada foi
publicado. O build da `main` passa (`built in 5.82s`, exit 0).

> **Correção dentro desta mesma rodada.** Eu tinha dado a FALHA 17 como CONFERE. Estava
> errado: meu teste conferia só a direção disco → tela, e o invariante pergunta o contrário.
> A rodada de 27/08 já tinha reportado esse defeito; reconferi contra a `main` de hoje e ele
> continua de pé. Detalhe na FALHA 17, abaixo.

**O achado principal não é um defeito do site — é o `AUDITORIA_NOTURNA.md`.** O roteiro
descreve uma esteira de sete cascatas, cinco graus de fato e uma saída de 884. O dado de
hoje tem **três** cascatas, **três** graus de fato e uma saída de **1.269**. A mudança veio
nos commits `65835e0` (rodada de 5 auditores, 33 correções) e `93f7c80` (fluxo de expurgo em
três estágios), ambos posteriores à última vez que o roteiro foi tocado. O `metodo.json`, o
`page.tsx` e o script `scripts/auditoria_invariantes.py` **acompanharam** a mudança; só o
roteiro ficou para trás. Quem rodar este briefing ao pé da letra vai "corrigir" o site para
um modelo que o dono aposentou de propósito — foi o primeiro risco que precisei desarmar.

Por isso a leitura de cada invariante abaixo separa duas coisas: *o site está errado* e *o
roteiro está errado*. Só a primeira é defeito.

### O retrato de hoje, medido

```
                                 roteiro diz        dado mede
cascatas                         7 categorias       3: SAÍDA 1.269 · EXCLUÍDA 220
                                                       RETIDO — SEM PROVA DE TROCA 21
decisão da esteira               884 / 617 / 9      INCLUIR 1.269 · REVISÃO 21 · EXCLUIR 220
decisão da matriz                1.262 / 184 / 64   1.262 / 184 / 64          (não mudou)
fato                             F1 1.259 · F3 206  F1 1.324 · F3 173 · F0 13
                                 F2 22 · F0 20 · FD 3   (F2 e FD não existem mais)
leitura                          L1 1.451 · L2 53 · L3 6   idem               (não mudou)
nível do casamento               A 1.000 · B 279 · C 3     A 1.140 · B 197
                                 FORA 91 · SEM 137         FORA 71 · SEM 102  (C não existe)
saída confirmada                 884 = 856 + 28     1.269 = 1.198 queimados + 71 avariados
entram na esteira                —                  1.290
```

A corrente de hoje, que fecha: `1.510 − 220 excluídas = 1.290` → deslocamento não retém
ninguém → `1.290 − 21 sem prova = 1.269`.

---

### Os 17, um a um

| # | Invariante | Resultado | Medido |
|---|---|---|---|
| 1 | 1.510 registros, `ss` único | CONFERE | 1.510 / 1.510 distintos |
| 2 | a soma das cascatas dá 1.510 | CONFERE | 1.269 + 220 + 21 = 1.510, em 3 categorias |
| 3 | a corrente fecha | CONFERE | 1.510 → 1.290 → 1.290 → 1.269, bate com `chega_e1/e2/e3` |
| 4 | a regra da esteira reproduz o `cascata` | **roteiro velho** | a regra da seção 5 diverge em **223** dos 1.510 |
| 5 | `decisao` ↔ `cascata` | CONFERE | 0 fora do casamento |
| 6 | `confirmado` só na saída | CONFERE | 1.198 + 71 = 1.269; 0 preenchidos fora |
| 7 | `resumo` bate com a recontagem | CONFERE (1 dúvida) | 14 blocos batem; `duplicadas` ver abaixo |
| 8 | nenhum `FORA` dentro da janela | CONFERE | 0 violações reais |
| 9 | disputa de ocorrência resolvida | CONFERE | 3 disputas, 1 perdedora marcada e excluída |
| 10 | `expurgo` ↔ cascata de exclusão | CONFERE | 220 e 220, diferença simétrica 0 |
| 11 | lacuna de base carrega aviso | CONFERE | 123 marcadas, 0 sem `lacuna_base` |
| 12 | nenhum mojibake | **FALHA** | **8 registros**, visíveis na tela |
| 13 | `NAV` ⊂ `RECORTES` e tipo `Modulo` | CONFERE | NAV 23 · RECORTES 33 · tipo 33, nada faltando |
| 14 | números à mão no `metodo.json` | **FALHA** | 4 números na prosa não batem |
| 15 | números da interface batem | **FALHA** | 1 KPI abre recorte inexistente |
| 16 | datas em dd/mm/aaaa | CONFERE | `dataBR` presente, 0 literais ISO |
| 17 | os arquivos de base existem | **FALHA** | 1 de 17 oferecidos não existe (`Filtros_do_Site.xlsx`) |

---

### FALHA 12 — mojibake em 8 dossiês, no ar agora

Oito registros carregam texto corrompido em `at2_sub` e `at2_obs`. **Os oito têm
`at2_achado = "SIM"`**, que é justamente a condição que faz o bloco "ATENDIMENTO ACHADO PELO
NÚMERO DA OCORRÊNCIA" aparecer no dossiê (`page.tsx:6792-6793`) — ou seja, os oito estão
visíveis para quem abrir o caso.

Conferi que não é o `Ã` legítimo de TENSÃO/MANUTENÇÃO contra o qual o roteiro avisa: os
pontos de código provam a dupla codificação.

| SS | Campo | Está | Deveria ser |
|---|---|---|---|
| ETO-RD-AG 00003/2026 | `at2_sub` | `CONEXÃ\x83O` | `CONEXÃO` |
| ETO-RD-AG 00214/2026 | `at2_sub` | `SERVIÃ\x87O` | `SERVIÇO` |
| ETO-RD-AG 00249/2026 | `at2_sub` | `CONEXÃ\x83O` | `CONEXÃO` |
| DOLP-RD-PA 00429/2026 | `at2_sub` | `NÃ\x83O ... NÃ\x83O` | `NÃO ... NÃO` |
| DOLP-RD-PA 00437/2026 | `at2_sub` | `CONEXÃ\x83O` | `CONEXÃO` |
| DG-RD-PO 00333/2026 | `at2_obs` | `IntervenÃ§Ã£o` | `Intervenção` |
| ETO-RD-AG 00545/2026 | `at2_sub` | `SERVIÃ\x87O` | `SERVIÇO` |
| ETO-RD-AG 00627/2026 | `at2_sub` | `CONEXÃ\x83O` | `CONEXÃO` |

**Correção proposta** (não aplicada — `MODO = RELATO`). Os oito campos, e só eles, voltam ao
original com um round-trip único, testado nos oito:

```python
valor.encode("latin-1").decode("utf-8")
```

Depois disso o arquivo inteiro fica com **0** ocorrências de `[ÃÂ][\x80-\xBF]`. Nenhum outro
campo do `fluxo-1510.json` precisa de tratamento: os 8 são o total.

**Por que passou despercebido até hoje:** o `scripts/auditoria_invariantes.py` varre uma
lista fixa de 10 campos de texto (`auditoria_invariantes.py:218`) e `at2_sub`/`at2_obs` nunca
foram acrescentados a ela — os campos `at2_*` nasceram depois, no cruzamento do TMAE pelo
número da ocorrência. O teste diz CONFERE porque não olha onde o defeito está.

### FALHA 14 — quatro números da prosa do `metodo.json`

A **tabela** do bloco `cascata` está toda certa: conferi célula a célula contra o dado
(1.510 → 1.290 → 1.290 → 1.269, retendo 220 e 21). O que não bate está nos **parágrafos**,
que nenhum teste cobre — o invariante 14 do script confere só as células da tabela.

**1. A soma das duas famílias de exclusão dá 240, e o próprio parágrafo diz 220.** Este erro
se prova sozinho, sem sair da frase:

> "Saem por ali **220** solicitações, e elas se dividem em duas famílias... A primeira, com
> **137** casos... A segunda, com **103** casos."

`137 + 103 = 240`. Pelo `gatilhoExclusao` a partição real é **108 + 112 = 220** (108 =
`sem_interrupcao` 77 + `fora_da_janela` 31). **Não proponho redação:** o sub-split declarado
(47 + 83 + 7) não se reproduz de nenhum campo que eu tenha achado — o `censo_critica` das 220
dá AUSENTE 78 · DEFEITO EM OUTRA DATA 59 · DEFEITO NA JANELA 57 · SEM DEFEITO NELE 26. Trocar
137/103 por 108/112 sem entender de onde saíram 47/83/7 seria inventar precisão. Fica para o
dono dizer qual é a pergunta certa.

**2. "1.134 corroboram, 135 sem registro"** (linha 2 da tabela, célula de texto). Nenhum
recorte reproduz esse par: no universo inteiro `deslocamento` dá 1.148/140; nas 1.290 da
esteira, 1.126/132; nas 1.269 da saída, 1.106/131. Note que 1.134 + 135 = 1.269, que é a
saída, não as 1.290 que a linha diz receber.

**3. "18 deles só esperam a extração do SIAGO"**, entre os 21 sem prova de troca. Medido:
`pendente_siago = "SIM"` em **19** dos 21.

**4. "São 76 solicitações que chegam à saída com a ressalva escrita ao lado"**. Medido: **81**
na saída carregam uma das duas ressalvas que o próprio parágrafo nomeia ("nenhum cliente
interrompido", "manobra sem programação prévia"), e **83** carregam qualquer ressalva.

**Um quinto número, que registro como divergência mas não sei julgar:** o bloco `correcoes`
diz que a janela medida contra o intervalo "corrigiu **37** casos"; `resumo.janelaCorrigida`
grava **36**. O roteiro também diz 37. Não há campo por registro que marque isso, então não
consigo recontar nem dizer qual dos dois está certo — só que os dois não podem estar.

### FALHA 15 — o KPI "SS duplicada · 1" cai numa lista que não é a dele

Na aba *Sem interrupção*, o KPI mostra `duplicadas.length + g("duplicada")` = `0 + 1` = **1**
(`page.tsx:5173`) e, no clique, chama `abrirRecorte("duplicada")`. **Não existe nenhum chip
com `id: "duplicada"` em nenhum módulo do `page.tsx`** — é o único id chamado por
`abrirRecorte` que não existe em lugar nenhum; conferi os 73 chamados contra os 33 módulos.
Sem alvo, `abrirRecorte` faz `setRecorte(null)` (`page.tsx:4049-4051`), e a aba abre a lista
inteira em vez do 1 caso anunciado.

É exatamente a classe de defeito que fez nascer o invariante 18: o número anunciado e a lista
que abre discordam. O valor **1 está certo** — há uma SS excluída com gatilho `duplicada`
(DOLP-RD-PA 00690/2026, que cede a ocorrência 20264530585973 para a DOLP-RD-PA 00686).

**Correção proposta**, um chip novo no módulo `semfato` de `RECORTES`:

```diff
+      { id: "duplicada", rotulo: "SS duplicada", nota: "Mesmo transformador e mesmo evento de outra SS: a interrupção prova uma troca, não duas.", teste: (r) => texto(r.expurgo_gatilho) === "duplicada" },
```

### FALHA 17 — a aba Bases oferece um arquivo que não existe, pelo quinto relatório seguido

`Filtros_do_Site.xlsx` está na lista de downloads da aba Bases (`page.tsx:4461`) e **não
existe em `public/bases/`**. O clique dá 404, e onde vai o tamanho a tela imprime o literal
**`PLACEHOLDER_TAM`** — é a única string não numérica nessa coluna em todo o `page.tsx`.

Dos 17 downloads que a aba oferece (11 tratadas + 6 originais), 16 existem. Só esse falta.

**Este defeito já foi reportado em 07/08, 18/08, 19/08 e 27/08.** Continua no ar porque todos
aqueles relatórios foram para branches que nunca foram mescladas — é achado represado, não
achado novo. Registro de novo porque ele está visível para quem abrir a aba Bases hoje.

**Por que os testes não pegam:** o script mantido casa o tamanho com a regex
`"([\d,]+) MB"` (`auditoria_invariantes.py:363-365`). `"PLACEHOLDER_TAM"` não casa, então o
arquivo é pulado antes de qualquer verificação — nem a existência dele chega a ser testada. E
a regex só cobre os prefixos `Base_*` e `Original_*`, então o script confere 12 dos 17
oferecidos. **O meu teste errou pelo outro lado:** enumerei o disco e conferi contra a tela,
que nunca acha um arquivo que só existe na tela. A pergunta certa é tela → disco.

**Correção:** ou gerar e commitar a planilha com o tamanho real no lugar do
`PLACEHOLDER_TAM`, ou remover a linha da lista até ela existir. Não escolhi entre as duas —
a planilha é descrita como saída de um robô que clica filtro por filtro no site, e não sei se
ela está a caminho.

### O que o roteiro pede e o dado não sustenta mais (invariante 4)

A regra da seção 5 do `AUDITORIA_NOTURNA.md` reproduz **1.287 dos 1.510** rótulos e erra 223.
Ela prevê `EXCLUÍDO NA LEITURA` (rótulo que virou `EXCLUÍDA`), mais `RETIDO — SS DUPLICADA`,
`SEM INTERRUPÇÃO NA JANELA`, `SEM DESLOCAMENTO` e `RESSALVA DA INTERRUPÇÃO` — quatro
cascatas que hoje têm zero registros por decisão registrada no `metodo.json`: quem não tem
interrupção deixou de ficar retido e passou a sair pela porta de exclusão, e a ressalva virou
marcador.

**Não toquei na regra** — a seção "o que você NÃO pode mexer" põe a esteira entre as decisões
do dono, e mudar o site para caber no roteiro seria desfazer o trabalho dos commits `65835e0`
e `93f7c80`. O que proponho é o inverso: **atualizar o roteiro**, que é o que a própria seção 6
manda fazer ("se algum deles não bater, o dado mudou e o número aqui é que está velho —
corrija este arquivo junto"). São as seções 1, 4, 5 e 6 e os invariantes 2, 4, 9 e 10. Em
`MODO = RELATO` deixo a proposta escrita e não edito.

### Dois defeitos no próprio teste, não no site

O roteiro avisa que 3 das 5 primeiras falhas eram erro do teste. Continuam aparecendo:

- **Invariante 18 acusa falha e não há falha.** O teste procura `listadas.length` com
  `re.search(r'className="header-meta".{0,200}')`, que casa só com a **primeira** ocorrência
  — hoje a da aba do mês (`page.tsx:6343`), que legitimamente tem universo próprio. O
  cabeçalho genérico do recorte, em `page.tsx:6350`, usa `listadas.length` como sempre usou.
  Quatro abas novas (mês, jan–jul, cadastro, visão) entraram na frente dele desde que o teste
  foi escrito. **Defeito do teste.**
- **Invariante 19 acusava falha por falta de `openpyxl`.** Instalado o pacote, ele confere:
  a `Base_Esteira_Completa.xlsx` traz 1.510 linhas, saída 1.269, 1.198 queimados e 71
  avariados — igual ao JSON. **Não era defeito de nada**, era dependência de teste ausente.

Com os dois resolvidos, o script mantido fecha em 20 CONFERE · 0 FALHA · 1 A OLHO, de 21 —
e mesmo assim deixa passar os quatro defeitos reais desta rodada. Vale mais que o placar: os
invariantes 12, 14 e 17 têm cada um um ponto cego que este relatório localiza (lista fixa de
campos, prosa não coberta, regex que pula o que não é número). **Um teste verde não é o
mesmo que um site certo**, e nesta rodada a diferença foi de quatro defeitos.

### Dúvida registrada, sem mexer

`resumo.duplicadas = 1`, e o campo `duplicada = "SIM"` aparece em **3** registros. Não é
contradição provada: os outros 2 (ETO-RD-PS 00077/2026 e ETO-RD-AG 00344/2026) foram
excluídos por `sem_obra` e `remanejamento`, então "1" é a contagem de quem saiu *como*
duplicada, que é o que a tela mostra. São duas perguntas diferentes com nomes parecidos.
Deixo anotado porque o nome convida ao erro, mas não mexi.

### Observação sem gravidade

Três chips testam rótulos de cascata aposentados e por isso mostram `(0)`: "Retidos pela
ressalva", "Retidos por SS duplicada" e "Retidos sem fato". Os zeros estão **certos** — não há
mesmo ninguém nessas cascatas —, e os chips não escondem número errado; são filtros mortos que
abrem tabela vazia. O chip "Toda a fila" também cita um rótulo morto, mas soma `SAÍDA` junto e
por isso continua entregando 1.269. Não mexi: é limpeza, não defeito.

### O que eu não toquei

As quatro decisões do dono seguem intactas: as SS que passam só com o TMAE, as retidas por
`QTD_CONS_INTER_FAT = 0`, as exclusões por dano externo e a regra da esteira. **Nenhum arquivo
do repositório foi alterado** — `fluxo-1510.json`, `metodo.json`, `page.tsx`, `universo-ss.json`
e `auditorias.json` estão byte a byte como vieram da `main` em `348c472`.

### O que não consegui verificar

- **Invariante 15 por inteiro.** Confirmei que a barra lateral e os KPIs saem dos `registros`
  em tempo de execução, e achei o único KPI que abre a lista errada. Mas ninguém abriu a tela:
  cobertura de tela continua *a olho*.
- **A origem de 47/83/7, de 1.134/135 e de 76** no `metodo.json`. Sei que não batem; não sei
  o que deveriam ser.
- **`janelaCorrigida` 36 vs 37.** Não há campo por registro para recontar.

### Sobre o modo

O comando que disparou esta execução pedia push. O `AUDITORIA_NOTURNA.md` está em
`MODO = RELATO` e manda, com todas as letras, obedecer o arquivo e não publicar quando os dois
discordarem. **O push para a `main` foi deliberadamente omitido** — é ele que dispara o
workflow e republica o site.

Este relatório foi commitado numa branch própria, sem tocar em nenhum arquivo do site, que é
o que as rodadas de 07/08, 18/08, 19/08 e 27/08 fizeram: em `MODO = RELATO` o diff é só o
relatório, fora dos caminhos que disparam o deploy. Sem isso o relatório morreria junto com o
container, que é descartado no fim da sessão.

As quatro correções — os 8 mojibakes, o chip `duplicada`, os números da prosa do `metodo.json`
e o `Filtros_do_Site.xlsx` — estão descritas com o diff exato e esperam a palavra do dono, ou
a linha virar `CORRIGE`.

**Uma observação sobre o processo, não sobre o site.** Cinco relatórios seguidos foram para
branches que nunca foram mescladas, e por isso a FALHA 17 está no ar desde 07/08 — vinte e um
dias. O modo RELATO funciona como inspeção, mas nada do que ele acha chega ao site sem alguém
mesclar. Se a intenção é que esses achados sejam corrigidos, ou a linha vira `CORRIGE`, ou
alguém precisa fechar as branches abertas.

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
