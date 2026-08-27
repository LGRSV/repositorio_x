# Relatório da auditoria automática

## 27/08/2026, 08:28 UTC — `MODO = RELATO`: 15 conferem, 2 falham, e um "defeito" das rodadas anteriores não era defeito

**Nada foi publicado e nada entrou na `main`.** A mensagem que me acordou pedia push. O
`AUDITORIA_NOTURNA.md` está em `MODO = RELATO`, e essa linha manda mais do que ela — o push
para a `main` foi deliberadamente omitido. **Nenhum arquivo do site foi tocado:** o diff desta
rodada é só este relatório. Os diffs de tudo o que eu teria mudado estão aqui embaixo, prontos
para aplicar, e nenhum foi aplicado.

*Uma ressalva honesta sobre o "não commite nada" da seção 7.* Esta execução roda num container
efêmero da nuvem, que é recolhido depois da sessão — relatório não commitado é relatório
perdido, e aí a rodada inteira não serve para nada. Então commitei **só este arquivo**, numa
branch própria (`claude/auditoria-noturna-relato-27-08`), como as rodadas de 07/08, 18/08 e
19/08 também fizeram. A `main` não foi tocada. Isso não publica nada: o
`auditoria-pages.yml` só dispara em push para `main` e só para caminhos dentro de
`auditoria-transformadores-134/**` — este relatório está na raiz e não é nem um deles. Se
você preferir que nem isso aconteça na próxima, é uma linha na seção 7 do roteiro.

**Placar: 15 CONFERE · 2 FALHA, de 17.** Falham a 7 e a 17. Nenhuma toca regra de negócio nem
move o indicador.

**As três coisas que importam desta rodada, em ordem:**

1. **O `1.305` da tela de entrada está CERTO.** A rodada de 18/08 registrou isso como FALHA 15
   ("nenhum recorte do dado atual dá 1.305") e deixou pronto um diff para apagar o número da
   tela. **Aplicar esse diff teria trocado um número certo por um errado.** Prova abaixo.
2. **`Filtros_do_Site.xlsx` continua ausente**, com `PLACEHOLDER_TAM` à mostra. É o mesmo
   defeito de 07/08, 18/08 e 19/08. Está de pé há três rodadas porque os relatórios foram
   para branches que ninguém mesclou.
3. **O roteiro está velho, e muito.** Não são números defasados: o modelo de decisão mudou de
   7 baldes para 3, e a seção 5 do `AUDITORIA_NOTURNA.md` descreve uma esteira que não existe
   mais. O site e o `metodo.json` estão os dois no modelo novo e coerentes entre si.

---

### Os 17 invariantes

| # | Resultado | Medido |
|---|---|---|
| 1 | **CONFERE** | 1.510 registros, 1.510 SS distintas |
| 2 | **CONFERE** | soma 1.510 — mas em **3** baldes: SAÍDA 1.269 · EXCLUÍDA 220 · RETIDO — SEM PROVA DE TROCA 21 |
| 3 | **CONFERE** | 1.510 − 220 = 1.290 entram · 1.290 − 21 = 1.269 saem |
| 4 | **CONFERE** | a regra vigente reproduz 1.507 de 1.510; as 3 restantes são override explícito do dono |
| 5 | **CONFERE** | 0 divergências entre `decisao` e `cascata` |
| 6 | **CONFERE** | 1.198 queimados + 71 avariados = 1.269 = SAÍDA |
| 7 | **FALHA** | `resumo.duplicadas` = 1, mas 3 registros têm `duplicada == "SIM"`. Definicional — ver abaixo |
| 8 | **CONFERE** | 0 violações em 71 FORA, sob a régua real. O teste ingênuo acusa 16 falsos positivos |
| 9 | **CONFERE** | 3 disputas, 2 SS cada, dono sempre o de menor `\|oc_dist_h\|`, 3 cedentes marcados |
| 10 | **CONFERE** | 220 de cada lado, 0 divergência |
| 11 | **CONFERE** | 123 marcados (24 `borda_2025` + 99 `tmae_gap_jan`), 0 sem `lacuna_base` |
| 12 | **CONFERE** | 0 mojibake em `page.tsx`, `metodo.json`, `MapaAtivos.tsx`, `globals.css` e nos campos de texto |
| 13 | **CONFERE** | `Modulo` 31 · `RECORTES` 31 · NAV+NAV_OFICINA 31 ids. Nenhum órfão dos dois lados |
| 14 | **CONFERE** | os 7 números conferidos do `metodo.json` batem com o dado |
| 15 | **CONFERE** | manchete 1.305 reproduzida exatamente. **Não é verificável só com o repositório** |
| 16 | **CONFERE** | `dataBR()` em 48 usos; nenhuma data ISO chega à tela |
| 17 | **FALHA** | 16 arquivos referenciados, 15 em disco. Falta `Filtros_do_Site.xlsx` |

---

### O `1.305` está certo — e a correção proposta em 18/08 teria estragado a tela

A tela de entrada (`page.tsx:784`) anuncia **1.305 queimados e avariados**. A barra lateral
calcula 1.269. A rodada de 18/08 concluiu que nenhum recorte do dado dava 1.305 e propôs o
diff que apaga o número. **A conclusão estava errada porque o dado não está todo no
repositório.**

O site não conta `cascata`; conta `arquivo(r)` (`page.tsx:2789`), que é a cascata **depois do
martelo do dono**. E as classificações do dono não vêm do repo: vêm da view
`trafo_classificacao_atual` do Supabase, buscada a cada abertura da página
(`page.tsx:2657`). O `public/classificacoes/combinado.json` tem **34** classificações,
congeladas em 04/08 — a view tem **164**.

Reproduzindo `arquivo()` com as 164 classificações vivas, contra as 1.510:

```
1.269 (regra)  +  36 (martelados queimado/avariado que a regra não tinha na saída)
               −   0 (nenhum martelo tirou alguém da saída)
               =  1.305
```

Bate na casa. `SAÍDA 1.305 + EXCLUÍDA 205 = 1.510`. O próprio site já explicava a diferença
em `page.tsx:3441` — *"ARQUIVO arquivou (1.269); os cartões no alto contam o que a TELA
arquiva, que é o arquivo mais o martelo dele (1.305)"* — e as duas leituras estão certas.

**Consequência para as próximas rodadas:** o invariante 15 **não pode ser fechado contra o
repositório sozinho**. Quem rodar só com os JSON vai reencontrar essa falsa falha. A conferência
exige ler a view `trafo_classificacao_atual`. Deixo registrado porque essa armadilha já custou
uma proposta de mudança errada.

---

### FALHA 17 — `Filtros_do_Site.xlsx` não existe, e `PLACEHOLDER_TAM` está na tela

`page.tsx:4383` monta um `<a href=".../bases/Filtros_do_Site.xlsx" download>`. O arquivo **não
está em `public/bases/`**. O clique dá 404, e o tamanho aparece para o leitor como o literal
**`PLACEHOLDER_TAM`**. Num site que vai à alta direção, é um link quebrado com texto de
rascunho à mostra.

Não posso gerar o arquivo: ele é produzido por um robô que abre o site e baixa a planilha de
cada filtro. Então o conserto verificável é remover a linha até o arquivo existir.

```diff
--- a/auditoria-transformadores-134/app/page.tsx
+++ b/auditoria-transformadores-134/app/page.tsx
@@ -4383 +4383 @@
-        ["Filtros_do_Site.xlsx", "Todos os filtros do site, aba por aba", "Cada filtro de cada tela com quantos casos tem e o que significa, mais a tabela longa filtro × SS de onde sai qualquer tabela dinâmica, e uma aba de dimensões com uma linha por solicitação. A composição de cada filtro não é recalculada: um robô abre o site, clica filtro por filtro e baixa a planilha de cada um — o que está aqui é o que a tela mostra, porque veio dela.", "PLACEHOLDER_TAM"],
```

**A alternativa é gerar o arquivo e trocar `PLACEHOLDER_TAM` pelo tamanho real** — é decisão
sua qual das duas. O que não pode continuar é a terceira opção, que é a de hoje.

Os outros 15 arquivos conferem: os 6 `Original_*` em MiB e os `Base_*` em MB decimal, todos na
primeira casa. As duas réguas na mesma tela seguem sendo escolha de apresentação, não defeito.

---

### FALHA 7 — `duplicadas` conta uma coisa e o campo marca outra

`resumo.duplicadas` = **1**. Registros com `duplicada == "SIM"` = **3**. Não mexi, porque as
duas contagens respondem perguntas diferentes e não sei qual você quer:

| SS | cedeu a disputa? | `disputa_perdida` | `expurgo_gatilho` | `e1_conflito` |
|---|---|---|---|---|
| DOLP-RD-PA 00690/2026 | sim | SIM | `duplicada` | preenchido |
| ETO-RD-PS 00077/2026 | sim | NÃO | `sem_obra` | vazio |
| ETO-RD-AG 00344/2026 | sim | NÃO | `remanejamento` | vazio |

As três cederam a ocorrência, mas só a primeira **saiu por causa disso** — as outras duas já
saíam por motivo próprio. `resumo.duplicadas` e o KPI da tela (`page.tsx:4966`) contam a
primeira definição e **concordam entre si em 1**; o campo `duplicada` marca a segunda. Nenhuma
está errada; o que falta é decidir qual das duas o número da tela deve dizer.

**Ressalva do invariante 9, no mesmo assunto:** `e1_conflito` está preenchido em 1 dos 3
cedentes. Os outros dois também disputaram e perderam, e não trazem a nota. É assimetria de
anotação, sem efeito no resultado — as três saem do indicador de todo jeito.

---

### O roteiro está velho, e não é só número

Isto é o achado estrutural da rodada. O `AUDITORIA_NOTURNA.md` descreve um trabalho que não é
mais o que está na `main`:

| O roteiro diz | O dado e o site dizem |
|---|---|
| 7 baldes de cascata | **3**: SAÍDA, EXCLUÍDA, RETIDO — SEM PROVA DE TROCA |
| saída 884 = 856 + 28 | **1.269 = 1.198 + 71** |
| esteira 884 / 617 / 9 | **1.269 / 21 / 220** |
| fato F1 1.259 · F3 206 · F2 22 · F0 20 · FD 3 | **F1 1.324 · F3 173 · F0 13** (não há F2 nem FD) |
| `e1_nivel` A 1.000 · B 279 · C 3 · FORA 91 · SEM 137 | **A 1.140 · B 197 · FORA 71 · SEM 102** (não há C) |
| rótulo `EXCLUÍDO NA LEITURA` | **`EXCLUÍDA`** |
| janela simétrica de 24 h | **assimétrica: −1 h antes do 1º passo, +24 h depois do último**, mais o atalho da ocorrência contida na SS |
| dezembro de 2025 não existe no acervo | **dezembro entrou** — `borda2025SemInterrupcao` caiu de 12 para 0 |

A seção 5 do roteiro, aplicada ao pé da letra, diverge em **223** dos 1.510. A regra que
realmente reproduz o dado é bem mais curta:

```
se   expurgo == "SIM"        -> EXCLUÍDA
senão se e3_status == "RETIDO" -> RETIDO — SEM PROVA DE TROCA
senão                         -> SAÍDA
```

Ela reproduz 1.507 de 1.510. As 3 restantes — DG-RD-PO 00073/2026, ETO-RD-GR 00279/2026 e
DOLP-RD-PA 00605/2026 — são override seu, com o motivo escrito no `cascata_motivo` (*"O dono
martelou queimado assumindo a falta da terceira prova"*), as três com `pendente_siago = SIM`.

**Não reescrevi o roteiro.** A seção 6 autoriza corrigir os números velhos, mas o que mudou
aqui é a regra da esteira — e mexer nela é decisão sua, item 4 da lista do que não posso
tocar. Trocar a descrição da regra sem sua palavra seria eu decidir o que o roteiro ensina à
próxima rodada. Além disso o `metodo.json` **já documenta o modelo novo por inteiro**,
inclusive a razão de cada peneira ter esvaziado — a fonte certa para reescrever o roteiro
está pronta e é ela.

*Por que o roteiro envelheceu sem ninguém ver:* o clone é raso e o histórico só começa em
05/08, então não consigo dizer em que commit o modelo virou. O `fluxo-1510.json` já estava no
modelo de 3 baldes no commit mais antigo que enxergo.

---

### As quatro decisões do dono — não toquei em nenhuma

As três primeiras da lista do roteiro estão descritas contra o modelo antigo e **não têm mais
correspondência direta no dado atual** (as 22 SS de F2 não existem — não há F2; os números de
`QTD_CONS_INTER_FAT = 0` e das exclusões por dano externo mudaram de lugar com a porta de
exclusão). Não reinterpretei nenhuma delas por conta própria. A quarta — mudar a regra da
esteira, os limiares ou o dicionário — é justamente o que a seção acima devolve para você.

---

### Os três testes que erraram, e não o site

O roteiro avisa que o teste erra mais que o site. Nesta rodada errou quatro vezes, e vale
registrar para a próxima não repetir:

1. **Invariante 8.** Testar `|oc_dist_h| <= 24` acusa 16 violações. Todas falsas: nos 16 a SS
   abriu **mais de 1 h antes** de a ocorrência começar, e a janela é assimétrica. Controle que
   fecha o argumento: **12 registros de nível B — dentro da janela — têm `dist_h > 24`**, porque
   entraram pelo atalho da contenção. `oc_dist_h` sozinho não mede a janela.
2. **Invariante 13.** O `NAV` usa aspas duplas, e existe um segundo menu (`NAV_OFICINA`). Um
   parser que procure aspas simples e só o primeiro menu acha 0 e reporta "não testável".
3. **Invariante 16.** O formatador chama-se `dataBR()`, não `toLocaleDateString`. Procurar pelo
   nome errado dá a impressão de que a tela não formata data — e ela formata, 48 vezes.
4. **Invariantes 4, 5 e 10.** Testados contra `EXCLUÍDO NA LEITURA` dão 220 falsas falhas. O
   rótulo vigente é `EXCLUÍDA`.

---

### O que não consegui verificar

- **A tela renderizada.** Conferi `page.tsx` como texto e o dado como dado. Não abri o site num
  navegador, então o invariante 15 está fechado por leitura de código e recontagem, não por
  inspeção visual dos KPIs.
- **Em que commit o modelo mudou de 7 baldes para 3.** O clone é raso (histórico começa em
  05/08) e o `fluxo-1510.json` só tem 4 commits visíveis, todos já no modelo novo.
- **Os números "118 / 96 / 60 / 21"** do bloco `leitura` do `metodo.json`. O invariante 14 não
  os cobre e não reconstruí a definição original — mesma situação registrada em 02/08, quando
  o texto ainda dizia 121/21. Segue para sua decisão.

---

### Dívida silenciosa, sem gravidade

Sobraram no `page.tsx` nove referências a baldes que não existem mais — `RETIDO — SS
DUPLICADA` (linhas 3457, 4547, 4950), `RETIDO — RESSALVA DA INTERRUPÇÃO` (3331, 3332, 3847,
4808) e `RETIDO — SEM INTERRUPÇÃO NA JANELA` (2831, 3454, 3844). **Não é defeito visível:**
todas devolvem 0, e 0 é hoje o número certo — o `metodo.json` explica que a primeira e a
quarta peneiras deixaram de reter. O incômodo é que 3454 e 3457 são chips de filtro que o
leitor pode clicar e que nunca vão listar nada.

No `historico-ativo.json`, o grupo `ss` (1.510 linhas, datas em ISO) está declarado no tipo
`HistSS` e **não é renderizado em lugar nenhum** — é por isso que o invariante 16 confere. São
linhas carregadas e nunca usadas, num arquivo de 6,8 MB.

---

**Verificado:** `pnpm install --frozen-lockfile` (20,2 s) e `pnpm run build:pages` passam —
*built in 2.31s*, sem erro. **Nenhum arquivo do repositório foi alterado nesta rodada**, exceto
este relatório: `git status` fica limpo fora dele, e o diff é de 1 arquivo, 0 remoções.
Consultei a view `trafo_classificacao_atual` do Supabase apenas em leitura (`SELECT`), para
fechar o invariante 15. Nenhuma escrita, em base nenhuma.

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
