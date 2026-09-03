# Relatório da auditoria automática

## 03/09/2026, 08:23 UTC — `MODO = RELATO`: 3 defeitos reais, e o roteiro está velho

**Placar: 14 conferem · 3 falham · 1 a olho, dos 17 invariantes.** Nada foi commitado e nada
foi para o ar — o `AUDITORIA_NOTURNA.md` está em `MODO = RELATO`. **A mensagem que me acordou
pedia push; o roteiro manda o contrário e o roteiro venceu**, como está escrito na linha 23
dele. O push foi deliberadamente omitido. Os três defeitos abaixo continuam no ar.

**Antes de tudo, o achado que muda a leitura de todo o resto: este roteiro descreve um site que
não existe mais.** O `AUDITORIA_NOTURNA.md` foi congelado em 05/08. O dado foi regerado em
18/08 e a esteira inteira mudou em 01/09. Detalhes na seção 1.

---

### 1. O roteiro está quatro semanas atrás do site

O roteiro diz, na seção 6, que os números foram "medidos em `public/fluxo-1510.json` no estado
atual da `main`". Não estão mais. O que ele descreve não é um número velho: é **outra esteira**.

| O que o roteiro diz | O que o dado diz hoje |
|---|---|
| Saída 884 = 856 queimados + 28 avariados | **1.269 = 1.198 queimados + 71 avariados** |
| Esteira: INCLUIR 884 · REVISÃO 617 · EXCLUIR 9 | **INCLUIR 1.269 · REVISÃO 21 · EXCLUIR 220** |
| Sete cascatas, começando pelo fato | **Três cascatas, começando pelo expurgo** |
| Fato: F1 1.259 · F3 206 · F2 22 · F0 20 · FD 3 | **F1 1.324 · F3 173 · F0 13** — não existe F2 nem FD |
| `e1_nivel`: A 1.000 · B 279 · C 3 · FORA 91 · SEM 137 | **A 1.140 · B 197 · FORA 71 · SEM 102** — não existe C |
| 9 excluídos na leitura | **220 expurgados, antes da esteira** |
| 3 duplicadas, `e1_conflito` em 7 | **1 e 1** |
| O site serve `fluxo-1510.json` | O site serve **`fluxo-1582.json`** (jan–jul, 1.582 SS) |

A seção 5 do roteiro ("a esteira começa pelo fato, não pelo rótulo") descreve exatamente a
regra que o dado **não** aplica: hoje `expurgo == "SIM"` tira 220 SS antes da primeira peneira.
A seção 6 e a seção 1 (F2, FD, nível C) idem.

**Isto não é regressão, e por isso não mexi.** É decisão do dono, com rastro em commit:
`93f7c80` (12/08) abriu o "fluxo de expurgo em três estágios", `65835e0` (18/08) regerou o dado
em "5 auditores, ~405 conferências, 33 correções", `348c472` criou a esteira de aprovação com
assinatura (usuário → Mateus Gracia → Matheus Alves) e `d1dd201` levou tudo para 1.582 SS. Os
220 expurgos passam por essa cadeia de assinatura, e o dado carrega 57 vereditos do dono
aplicados um a um. Reescrever o roteiro para bater com o dado seria apagar o ponto de
referência do dono e transformar em "documentação desatualizada" o que pode ser uma mudança
que ele quer revisar. **Fica para o dono decidir**: ou o roteiro é atualizado, ou o dado
voltou para trás sem querer. Os dois são possíveis a partir daqui; só ele sabe qual.

Enquanto isso, rodei os 17 invariantes **contra a esteira que está no ar**, não contra a do
roteiro. É a única leitura que responde à pergunta "o site está certo hoje".

---

### 2. Os três defeitos

#### FALHA 12 — mojibake visível no dossiê de 8 SS

Oito solicitações trazem texto duplamente codificado nos campos `at2_sub` e `at2_obs`, nos
**dois** arquivos (`fluxo-1510.json` e `fluxo-1582.json`):

```
hoje                                        deveria ser
────────────────────────────────────────    ────────────────────────────────────
REGULARIZADO-DEFEITO EM CONEXÃ<83>O         REGULARIZADO-DEFEITO EM CONEXÃO      (4x)
REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÃ<87>O  REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÇO (2x)
NÃ<83>O REGULARIZADO-CAUSA NÃ<83>O IDENTIFICADA  NÃO REGULARIZADO-CAUSA NÃO IDENTIFICADA  (1x)
IntervenÃ§Ã£o gerada pelo PDA-Sigod...       Intervenção gerada pelo PDA-Sigod...  (1x)
```

As SS: `ETO-RD-AG 00003/2026`, `ETO-RD-AG 00214/2026`, `ETO-RD-AG 00249/2026`,
`ETO-RD-AG 00545/2026`, `ETO-RD-AG 00627/2026`, `DOLP-RD-PA 00429/2026`,
`DOLP-RD-PA 00437/2026`, `DG-RD-PO 00333/2026`.

**Está na tela.** `app/page.tsx:6821-6822` imprime os dois campos no painel "ATENDIMENTO ACHADO
PELO NÚMERO DA OCORRÊNCIA" do dossiê. Quem abrir uma dessas 8 SS vê o texto quebrado.

**Por que o teste do repositório não pegou:** `scripts/auditoria_invariantes.py:247` varre uma
lista fixa de 10 campos de texto, e `at2_sub`/`at2_obs` não estão nela. Varrendo **todos** os
campos string, aparecem. A causa provável é encoding na origem: a Crítica é
"delimitada por ponto e vírgula em latin-1" (descrição da própria aba Bases), e esses dois
campos foram lidos como latin-1 quando já eram UTF-8.

**Correção proposta** (não aplicada): `v.encode("latin-1").decode("utf-8")` nos dois campos,
nos dois arquivos — o round-trip fecha limpo nos 8 casos, conferido. Tem de ser nos dois para
o invariante 0 (o jan–jun de `fluxo-1582` é byte a byte o `fluxo-1510`) continuar passando.
E vale corrigir também o teste, acrescentando os campos que faltam à lista.

#### FALHA 14 — quatro números escritos à mão no `metodo.json` não batem

Na tabela do bloco `cascata`. As colunas Recebe/Passa/Fica retido estão certas; o que está
errado são os números **dentro** das células:

| Linha | A tela diz | O dado diz |
|---|---|---|
| 2 · Deslocamento | "1.134 corroboram, 135 sem registro" | **1.126 corroboram, 132 sem registro, 32 sem TMAE cruzado** |
| 3 · SS e OS com material | "18 deles só esperam a extração do SIAGO" | **19** |
| 4 · Ressalva | "76 chegam à saída com ela escrita" | **74** chegam à saída; 76 é o total na base |

O 1.134/135 é o mais claro: **a própria linha se contradiz.** A peneira 2 recebe 1.290, e
1.134 + 135 = 1.269. A partição medida do campo `deslocamento` sobre os 1.290 que entram é
1.126 `CORROBORA` + 132 `SEM REGISTRO` + 32 em branco. O 19 vem de duas medidas independentes
que concordam (`pendente_siago == "SIM"` e `e3_motivo == "OBRA FORA DO EXPORT DE MATERIAL"`,
ambas 19 dos 21 retidos). O 76 é o total de `e4_alertas == "nenhum cliente interrompido"` em
toda a base — só 74 desses chegam à saída, e a frase diz "chegam à saída".

**Cuidado com o 1.134 e o 135: não consegui reproduzi-los de definição nenhuma.** Conferi o
dado como estava em 12/08, quando o `metodo.json` foi escrito pela última vez, e ele já dava
1.126/132 — ou seja, **não é envelhecimento, esses dois nasceram errados**. Testei também as
definições que o próprio site usa (`tmae_corrobora != "não"` dá 955; o KPI de
`page.tsx:4886` dá 1.290) e nenhuma chega perto. Então **sei provar que estão errados e não
sei provar qual é o certo.** Pelo roteiro ("se a dúvida sobrar, reporte como dúvida e não
mexa"), proponho a troca pela partição medida, mas marco como decisão do dono, não como
conserto óbvio.

Já o 19 e o 74 são seguros e eu aplicaria.

**Por que o teste do repositório não pegou:** `auditoria_invariantes.py:318` aceita a célula se
`num(esperado) in celula`. A célula da linha 2 é `"0 — não retém: 1.134 corroboram, ..."` e o
esperado é `0`; o `"0"` casa como substring e a linha passa inteira, com os números auxiliares
nunca conferidos.

#### FALHA 17 — um arquivo oferecido para download não existe

`Filtros_do_Site.xlsx` está na lista `ARQUIVOS` da aba Bases (`app/page.tsx:4490`) e **não
existe em `public/bases/`**. Não está no `.gitignore`, não está em lugar nenhum do repositório.
O gerador existe (`scripts/gerar_planilha_filtros.py`); a planilha é que nunca foi commitada.
**É um link de download quebrado no site que vai à alta direção.**

Correção: rodar o gerador e commitar a planilha, ou tirar a entrada da lista. Não fiz nem um
nem outro — gerar um artefato novo e publicá-lo passa do que o roteiro me autoriza.

Junto disso: `Bases_Gerais.xlsx` anuncia 2,4 MB, que é o valor em MiB; em MB decimal — a régua
das `Base_*` — são 2,5. É o mesmo desencontro de duas réguas na mesma tela que já vem sendo
registrado, agora com um número do lado errado da régua. Baixa gravidade.

**Nota sobre o teste:** o script do repositório confere 12 arquivos; a aba Bases hoje anuncia
**17** (11 em `ARQUIVOS`, 6 em `ORIGINAIS`). Foi conferindo os 17 que o arquivo faltante
apareceu. Os outros 16 existem e batem no tamanho, cada um na sua unidade.

---

### 3. O que passou

Medido nos dois arquivos, `fluxo-1510.json` (jan–jun congelado) e `fluxo-1582.json` (no ar).

| # | Invariante | Medido |
|---|---|---|
| 1 | total e `ss` único | 1.510/1.510 e 1.582/1.582 distintos |
| 2 | a soma das cascatas fecha | 1.269+220+21 = 1.510 · 1.324+220+21+15+2 = 1.582 |
| 3 | a corrente fecha nas quatro passagens | 1.582 → 1.362 → 1.347 → 1.347 → 1.324, e bate com `chega_e1/e2/e3` gravados |
| 4 | a regra da esteira reproduz os rótulos | 3 divergências, **todas com `veredito_do_dono = SIM`** — o dono martelou queimado assumindo a falta da prova de material |
| 5 | decisão e cascata são a mesma coisa | 0 fora do casamento |
| 6 | `confirmado` só na saída | 1.198+71 = 1.269 e 1.246+78 = 1.324, nenhum preenchido fora |
| 7 | `resumo` bate com a recontagem | cascata, decisão, fato, leitura, matriz, confirmado e `e1` batem |
| 8 | nenhum `FORA` dentro da janela | 0 violações |
| 9 | disputa de ocorrência resolvida | 0 ocorrências reivindicadas por duas SS · 1 perdedor, excluído, com `e1_conflito` |
| 10 | `expurgo` = cascata excluída | 220 e 220, diferença simétrica 0 |
| 11 | lacuna de base carrega aviso | 123 marcadas, 0 sem `lacuna_base` |
| 13 | `NAV` ⊂ `RECORTES` ⊂ tipo `Modulo` | NAV 23 · RECORTES 33 · tipo 33 · 0 faltando dos dois lados |
| 16 | datas em dd/mm/aaaa | `dataBR` presente, 0 literais ISO no `page.tsx` |

O invariante 12 passa em `page.tsx` e `metodo.json` — a falha é só nos registros.

**A OLHO 15 — números escritos na interface.** A barra lateral, os KPIs e a caixa d'água são
calculados dos `registros` em tempo de execução e não podem divergir por construção. Os 82
literais com milhar no `page.tsx` são rótulos de contexto e descrição de base. Segue como *a
olho*: nenhum teste substitui abrir a tela.

**Fechou desde a última rodada:** o "121 / 21" do bloco da leitura, que a rodada anterior
deixou em aberto por não conseguir reproduzir, **não existe mais** — nem no `metodo.json` nem
no `page.tsx`. E o invariante 19 (a planilha de download contar a mesma história), que estava
como FALHA por falta de `openpyxl`, agora roda e **CONFERE**.

**Build:** `pnpm install --frozen-lockfile && pnpm run build:pages` passa, exit 0, built in
5,39s. Nenhuma dependência foi acrescentada. `openpyxl` foi instalado só no Python do
container, para poder rodar o teste; não toca `package.json` nem os lockfiles.

---

### 4. Dois testes meus que estavam errados, não o site

O roteiro avisa que isso acontece, e aconteceu duas vezes. Registro para o próximo turno:

1. **Invariante 8.** Meu teste acusou 16 e 21 violações. Todas têm `aberta_antes = "SIM"` — a
   SS foi aberta antes de a ocorrência começar, e aí a distância é medida de outro jeito e o
   `FORA` é legítimo. Escrevi a regra mais rígida do que o site. **Corrigido: 0 violações.**
2. **Invariante 13.** Acusei 23 módulos do `NAV` sem chave em `RECORTES`, o que derrubaria o
   site inteiro. Era a minha regex: `RECORTES` declara as chaves com `[`, e eu procurava `{`.
   **Corrigido: 0 faltando.**

Nenhum dos dois virou correção no site, exatamente como o roteiro manda.

---

### 5. O que eu não toquei

As quatro decisões do dono seguem intactas, e a lista cresceu desde que o roteiro foi escrito:
os 220 expurgos e a cadeia de assinatura em três estágios, os 57 vereditos do dono aplicados no
dado, os 3 casos em que ele martelou queimado sem prova de material, a ressalva virada
marcador, os limiares de janela e o dicionário de categorias. Nenhum byte de
`fluxo-1510.json`, `fluxo-1582.json`, `universo-ss.json`, `auditorias.json` ou `metodo.json`
foi alterado — o `git status` está limpo, fora este relatório.

**Nada foi commitado e nada foi publicado.** `MODO = RELATO`.

### 6. O que espera decisão

1. **O roteiro está velho ou o dado voltou atrás?** (seção 1) — é a pergunta que vale mais do
   que as outras três juntas, porque enquanto ela não for respondida nenhuma rodada futura
   consegue dizer se um número está certo.
2. **O 1.134 / 135 do `metodo.json`** — sei que estão errados, não sei qual é o certo.
3. **`Filtros_do_Site.xlsx`** — gerar e commitar, ou tirar da lista.
4. **Mojibake nas 8 SS** — a correção é mecânica e eu a aplico assim que o modo virar
   `CORRIGE`; só não aplico agora por causa do modo.

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
