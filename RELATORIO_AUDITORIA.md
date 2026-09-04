# Relatório da auditoria automática

## 04/09/2026, 08:30 UTC — MODO RELATO · três defeitos novos que nenhum teste estava vendo

**Placar: 14 conferem · 3 falham, de 17.** As três falhas são **12 (mojibake)**, **16 (datas)**
e **7 (`resumo` × recontagem)** — e as três vinham saindo como CONFERE. Não porque o site
tenha piorado hoje, mas porque cada um desses testes olha um recorte estreito do que o
invariante promete: a 12 varre uma lista fixa de dez campos de texto e o mojibake está em dois
campos que não estão nela; a 16 procura literais ISO escritos no `page.tsx` e o defeito é um
campo do dado renderizado cru; a 7 reconta sete blocos e quatro totais, e as duas chaves
erradas estão fora dessa lista.

A **FALHA 14** que a rodada das 00:18 de hoje levantou continua aberta e foi **remedida uma a
uma, do zero, sem olhar a entrada anterior**: bate número por número com o que ela reportou.
Confirmação independente, não cópia.

**Nada foi commitado no site e nada foi para o ar.** O `AUDITORIA_NOTURNA.md` está em
`MODO = RELATO` e essa linha manda mais do que o comando que me acordou — a mensagem que
disparou esta execução pedia push, e **o push para `main` foi deliberadamente omitido**.
Nenhum arquivo de `auditoria-transformadores-134/` foi tocado. A única escrita é este
relatório, que vai para um branch próprio (o contêiner é descartado no fim da sessão; deixar o
arquivo só no diretório de trabalho seria jogá-lo fora). O branch não publica: o workflow
`auditoria-pages.yml` dispara em push para `main`, e `main` não foi tocada.

### Os três defeitos novos

**1 · Mojibake em 8 registros, e eles aparecem na tela (invariante 12).** Os campos são
`at2_sub` (7 casos) e `at2_obs` (1), que o dossiê imprime no painel *ATENDIMENTO ACHADO PELO
NÚMERO DA OCORRÊNCIA* (`page.tsx:6821-6822`). São idênticos nos dois arquivos —
`fluxo-1510.json` e `fluxo-1582.json` — e também na cópia de `public/versoes/2026-08-11/`.

| SS | Campo | Está na tela como | Deveria ser |
|---|---|---|---|
| ETO-RD-AG 00003/2026 · 00249/2026 · 00627/2026 · DOLP-RD-PA 00437/2026 | `at2_sub` | `REGULARIZADO-DEFEITO EM CONEX`+`Ã\x83O` | `REGULARIZADO-DEFEITO EM CONEXÃO` |
| ETO-RD-AG 00214/2026 · 00545/2026 | `at2_sub` | `...RAMAL DE SERVI`+`Ã\x87O` | `...RAMAL DE SERVIÇO` |
| DOLP-RD-PA 00429/2026 | `at2_sub` | `N`+`Ã\x83O` `REGULARIZADO-CAUSA N`+`Ã\x83O IDENTIFICADA` | `NÃO REGULARIZADO-CAUSA NÃO IDENTIFICADA` |
| DG-RD-PO 00333/2026 | `at2_obs` | `IntervenÃ§Ã£o gerada pelo PDA-Sigod...` | `Intervenção gerada pelo PDA-Sigod...` |

É a dupla codificação clássica: o TMAE é latin-1 com texto já gravado em UTF-8. O
`aplicar_regras_novas.py` tem a função que desfaz isso (`conserta_acento`, linha 222) e a
aplica na causa, na subcausa e na observação do atendimento por transformador (linhas 283-285)
— o cruzamento por **número da ocorrência**, que produziu os campos `at2_*`, não passou por
ela. Nenhum script versionado escreve `at2_*`: a varredura por `at2_sub` em todo o repositório
só acha `page.tsx` e o bundle. Ou seja, **não há gerador para reprocessar** — o conserto é no
JSON, e o teste é que evita a reincidência.

Por que a 12 não via: o teste percorre uma lista fixa de dez campos (`desc_ss`, `desc_os`,
`narrativa`, `oc_obs`, `at_obs`, …) e `at2_sub`/`at2_obs` não estão nela. Varrendo **todo campo
string de todo registro**, aparecem os 8 — e mais nada: são exatamente estes.

**2 · A tabela das 72 de julho mostra data em ISO (invariante 16).** `page.tsx:4592` renderiza
`{r.abertura}` cru. As 72 de julho guardam `abertura` em ISO com hora (`2026-07-01 17:40`),
igual às 1.510 — a hipótese de que as prévias já viriam em dd/mm/aaaa (comentário da linha 924)
não vale para este campo. Resultado: na aba *Janeiro a julho · 1.582*, seção "As 72 de julho —
uma por uma", a coluna Abertura sai **`2026-07-01 17:40`** enquanto o resto do site mostra
`01/07/2026 17:40`. É a **única** ocorrência: varri todos os campos de data renderizados
(`abertura`, `termino`, `revisado_em`, `*_ini`, `*_fim`) e as outras 48 passam por `dataBR`.

Por que a 16 não via: ela confere que `dataBR` existe, que converte e que não há literal
`"aaaa-mm-dd"` escrito no `page.tsx` — as três coisas são verdade. Campo do dado renderizado
sem passar pelo formatador é outro defeito, e não tinha teste.

**3 · Duas chaves do `resumo` do `fluxo-1582.json` ficaram com o número de jan–jun
(invariante 7).**

| Chave | `resumo` diz | Recontado nos 1.582 | Certo em `fluxo-1510.json`? |
|---|---|---|---|
| `semFato` | 173 | **188** (`fato == "F3"`) | sim, 173 = 173 |
| `comAlertaNarrativa` | 383 | **455** (`alertas_narrativa` não vazio) | sim, 383 = 383 |

A causa está à vista no gerador: `gerar_fluxo_1582.py:327` faz `resumo = dict(f10["resumo"])`
e o `resumo.update()` seguinte recalcula 30 chaves — estas duas não estão na lista, então
sobrevivem com o valor de janeiro a junho. **Nenhuma das duas é renderizada** (a aba jan–jul
só lê `total`, `jan_jun`, `julho`, `entram*`, `pendentes_julho`, `expurgados`, `em_revisao` e
as duas de categoria, todas recalculadas), então não há número errado na tela hoje. Mas o
invariante 7 diz "todo bloco de `resumo` bate com a recontagem", e estes dois não batem — e
qualquer tela nova que os leia vai publicar o número de outro universo.

### Os 17 invariantes, um a um

| # | Invariante | Resultado | Medido |
|---|---|---|---|
| 1 | `registros` e `ss` único | CONFERE | 1.582 registros, 1.582 SS distintas (1.510 jan–jun + 72 julho) |
| 2 | soma das cascatas | CONFERE | 1.324 SAÍDA + 220 EXCLUÍDA + 21 sem prova + 15 sem interrupção + 2 ressalva = 1.582 |
| 3 | a corrente fecha | CONFERE | 1.582 − 220 = 1.362 → −15 = 1.347 → −0 = 1.347 → −21 = 1.326 → −2 = 1.324 |
| 4 | a regra da esteira reproduz `cascata` | CONFERE, com ressalva | a regra do motor reproduz 1.582 de 1.582. A regra **como está escrita na seção 5 do roteiro** diverge em 223: 220 são só o rótulo (`EXCLUÍDO NA LEITURA` virou `EXCLUÍDA`) e 3 são vereditos do dono (`e3_status = RETIDO` com saída martelada) |
| 5 | `decisao` ↔ `cascata` | CONFERE | 0 fora do casamento · INCLUIR 1.324 · EXCLUIR 220 · REVISÃO 38 |
| 6 | `confirmado` só na saída | CONFERE | 1.246 queimados + 78 avariados = 1.324 = SAÍDA; 0 preenchidos fora da saída |
| 7 | `resumo` × recontagem | **FALHA** | `semFato` 173≠188 e `comAlertaNarrativa` 383≠455 no `fluxo-1582.json` — detalhe acima |
| 8 | nenhum `FORA` dentro da janela | CONFERE | 0 violações (janela de 1h antes a 24h depois) |
| 9 | disputa de ocorrência resolvida | CONFERE | 0 ocorrências disputadas hoje · 1 perdedor, excluído e com `e1_conflito` |
| 10 | `EXCLUÍDA` ↔ `expurgo = SIM` | CONFERE | 220 / 220, diferença simétrica 0 |
| 11 | lacuna de base tem aviso no dossiê | CONFERE | 123 marcadas (24 `borda_2025` + 99 `tmae_gap_jan`), 0 sem `lacuna_base` |
| 12 | mojibake | **FALHA** | 8 registros, `at2_sub` (7) e `at2_obs` (1) — nos dois fluxos e na versão de 11/08 |
| 13 | `NAV` ⊆ `RECORTES` ⊆ tipo `Modulo` | CONFERE | NAV 15 · RECORTES 33 · tipo `Modulo` 33 · nenhum faltando dos dois lados |
| 14 | números à mão no `metodo.json` | **FALHA** (a mesma de 00:18) | 10 números na prosa dos blocos `cascata` e `leitura` — tabela abaixo |
| 15 | números da interface | CONFERE | barra lateral, KPIs e caixa d'água são calculados dos registros. Dos literais escritos à mão que conferi: `1.474 das 1.510` (obra emergencial) = 1.474 ✓ · `Estes 27` do SIAGO = 27 ✓ · nenhum `884`/`874` sobrou |
| 16 | datas em dd/mm/aaaa | **FALHA** | `page.tsx:4592` imprime `{r.abertura}` cru e julho guarda ISO |
| 17 | os 12 arquivos de base | CONFERE | 12/12 existem. `Base_*` batem em MB decimal (0,474→0,5 · 0,269→0,3 · 0,262→0,3 · 0,375→0,4 · 0,882→0,9), `Original_*` em MiB (2,307→2,3 · 28,791→28,8 · 18,684→18,7 · 4,870→4,9 · 3,549→3,5 · 0,108→0,1). A armadilha da unidade é real e o teste a trata certo |

O script traz ainda seis conferências que o roteiro não lista (**0, 10·1, 18, 19, 20, 21**) e
**todas conferem** — inclusive a 0, que prova que o subconjunto jan–jun do `fluxo-1582.json` é
o `fluxo-1510.json` caractere a caractere, e a 19, que abre a planilha de download e confirma
1.510 linhas, saída 1.269, 1.198 queimados + 71 avariados.

> **`openpyxl`, de novo.** O invariante 19 saiu FALHA na primeira execução de hoje só porque o
> pacote não está no contêiner. Instalei com `pip` (ferramenta de teste em Python, não encosta
> no `pnpm-lock.yaml`) e ele passa. **Isso vai se repetir toda rodada** enquanto o `openpyxl`
> não entrar no setup do ambiente — a rodada de 00:18 pediu a mesma coisa.

### FALHA 14 — os dez números, remedidos hoje

Medidos no subconjunto **jan–jun**, que é o universo que o `metodo.json` diz descrever.

| Bloco | O que a tela diz | O dado diz | Como medi |
|---|---|---|---|
| `cascata` | 1ª família, **137** casos | **108** | `expurgo_gatilho` ∈ {`sem_interrupcao`, `fora_da_janela`} |
| `cascata` | **47** sem aparecer na Crítica | **52** | `censo_critica = AUSENTE` |
| `cascata` | **83** com defeito em outra data | **31** | `censo_critica = DEFEITO EM OUTRA DATA` |
| `cascata` | **7** sem rastro em base alguma | **25** | `censo_critica = SEM DEFEITO NELE` |
| `cascata` | 2ª família, **103** casos | **112** | as 220 menos as 108 |
| `cascata` | "mais **dezoito** categorias menores" | **dezessete** | 21 gatilhos na 2ª família menos os 4 nomeados |
| `cascata` | "**1.134** corroboram, **135** sem registro" | **1.126 · 132** (+32 sem classificação) | campo `deslocamento` nas 1.290 da esteira |
| `cascata` | "**18** deles só esperam o SIAGO" | **19** | `pendente_siago = SIM` entre os 21 sem prova |
| `leitura` | errada em **118** solicitações | **128** | `categoria_texto ≠ categoria_gravada` — a mesma regra do KPI "Categoria corrigida" da tela |
| `leitura` | em **96** delas · **60** dizem avariado | **100 · 57** | dos 128, texto `QUEIMADO` com `material_conferido = SIM` |

O parágrafo da 1ª/2ª família **se contradiz sozinho**: 137 + 103 = 240, e as exclusões são 220.
E a própria tela já publica os números certos noutro lugar: a descrição do download
`Sem_Interrupcao_Critica.xlsx` (`page.tsx:4490`) diz "**os 108** que a Crítica não sustenta …
**31** têm defeito … em outra data … **77** nunca tiveram defeito aberto neles … **52** que não
aparecem na Crítica … **25** que aparecem só como interrompidos". Bate com o dado, campo a
campo. O bloco `cascata` do `metodo.json` é o único lugar que ainda conta a história antiga.

**Confirmados certos** no mesmo bloco: 220 exclusões · 1.290 entram na esteira · 30 furtos ·
16 obras nunca geradas · 11 remanejamentos · 7 tapes · 21 sem prova · 1.269 na saída · e, no
bloco `correcoes`, "1.269 confirmados — 1.198 queimados e 71 avariados". No bloco `limites`,
"61 sem material conferido" = 61 e "só 134 com parecer escrito" = 134.

### Dúvidas que eu não converti em correção

1. **"São 76 solicitações que chegam à saída com a ressalva escrita ao lado"** (bloco
   `cascata`). Não reproduzo 76 com leitura nenhuma: saída com uma das **duas ressalvas
   nomeadas** no parágrafo dá **81** (73 "nenhum cliente interrompido" + 6 "manobra sem
   programação prévia" + 2 com as duas); saída com **qualquer** ressalva dá **83**. O dono diz
   qual é o recorte e aí vira correção de uma linha. *(A rodada de 00:18 parou no mesmo ponto,
   com os mesmos dois números.)*
2. **"Corrigiu 37 casos"** (bloco `correcoes`, a janela medida contra o intervalo) contra
   **`resumo.janelaCorrigida = 36`** nos dois fluxos. São dois números do mesmo fato, e nenhum
   dos dois é recontável a partir dos registros — não há campo que marque quem foi corrigido.
   Não sei qual está certo, então não mexo. Vale registrar que o `AUDITORIA_NOTURNA.md`
   também diz 37.
3. **"aparece em 627 das 1.510"** (`page.tsx:3650`, o campo POS. TAP do formulário). Procurando
   `POS. TAP` no `desc_os` acho 686, e "TAP" em qualquer forma acha 695 — nenhum dos dois é
   627, mas nenhum dos dois é a definição escrita na nota, que fala de uma grafia específica.
   Um comentário três telas acima (`page.tsx:3014`) diz **632** para o que parece ser a mesma
   coisa. Dois números diferentes para o mesmo campo é sinal de que um envelheceu, mas sem a
   definição exata eu não sei qual. Fica para o dono.
4. **`Base_Esteira_Completa.xlsx` anunciada como "0,37 MB"** e o arquivo tem 0,379 MB. Passa no
   teste e não é erro — é a única das doze anunciada com duas casas, e a segunda casa está
   truncada, não arredondada. Nit, não defeito.

### O que encontrei e é decisão do dono

1. **O `AUDITORIA_NOTURNA.md` continua velho, e agora em três frentes.** A seção 6 inteira
   (884 / 617 / 9, 206 + 3, 1.301, 1.002, 952, os blocos `fato`, `leitura`, `e1_nivel` e as
   marcas auxiliares) descreve um estado que a `main` não tem mais: hoje jan–jun entrega
   **1.269 na saída e 220 excluídos**, e o universo do site é **1.582**. O roteiro manda
   corrigi-lo nesse caso ("o número aqui é que está velho — corrija este arquivo junto"), mas
   a seção 5 é **regra da esteira**, item 4 da lista do que eu não posso tocar em hipótese
   alguma. Medido: a regra literal da seção 5 diverge em **223 dos 1.582** — 220 só de rótulo
   (`EXCLUÍDO NA LEITURA` → `EXCLUÍDA`; o campo `expurgo` ainda existe e é idêntico a
   `fora_da_esteira`) e 3 por veredito do dono. O campo `duplicada` **não existe mais** (virou
   `expurgo_gatilho = "duplicada"`, 1 caso). **Não toquei.**
2. **A seção "o que você NÃO pode mexer" descreve casos que o dado de hoje já não tem.** As
   **22 SS** que passavam só pelo TMAE eram `fato = F2`, e hoje **não há nenhum F2**; as
   **89 SS** retidas por `QTD_CONS_INTER_FAT = 0` hoje estão na saída com a ressalva escrita
   ao lado (a 4ª peneira virou marcador, por decisão registrada no próprio `metodo.json`); e as
   **2 exclusões por dano externo** convivem com **6** registros de `expurgo_gatilho =
   abalroamento`, que saíram por outra ordem do dono ("uma queima atribuída a caminhão que
   estava na saída"). Nada disso é defeito — é a lista de intocáveis que ficou desatualizada
   junto com o resto. **Não toquei em nenhum caso.**
3. **A prosa do `metodo.json` não tem teste.** É o terceiro relatório seguido em que a 14
   aparece, e desta vez foi pelo mesmo vão da vez passada. Recomendo estender o invariante 14
   para varrer todo número da prosa, não só as células da tabela.

### O que eu não consegui verificar

- **Os números históricos do bloco `correcoes`** (536 de 540, 6.628 janelas, 14 casos, 34
  casos, 62.616 linhas, 23 do TMAE, os 13/11/2 do dano externo). São afirmações sobre estados
  **anteriores** do processamento; não há como reconstruí-los do JSON de hoje.
- **`resumo.foraDaBase` (45), `janelaCorrigida` (36), `atendimentoPorOcorrencia` (23) e
  `reclassificadosExterno` (11).** Não achei campo no registro que reproduza nenhuma das
  quatro — são contagens históricas carregadas no `resumo`, não recontáveis. É por isso que a
  minha varredura da 7 não as marca nem como certas nem como erradas.
- **Os números dos blocos `garantia` e `mensal`** (597 cadeias, 178, 106 declaradas, 95 sem
  série, 370, 712 auxiliares no KML, os percentuais do prefixo 57). Saem de bases que não estão
  no `fluxo-1582.json`.
- **A cobertura visual do invariante 16.** Provei que `dataBR` converte e que só um campo
  escapa dele no código; que a tela renderizada não tenha outro caminho exige olho humano.

### Sanidade

`pnpm install --frozen-lockfile && pnpm run build:pages` **passa** no estado atual da `main`,
sem nenhuma alteração minha (`✓ built in 8.15s`, exit 0). Nenhuma dependência foi adicionada.
`git status` limpo em `auditoria-transformadores-134/`.

### O diff exato que eu teria aplicado, se o modo fosse CORRIGE

Além das quatro linhas do `metodo.json` já escritas na entrada de 00:18 (que eu remedi e
confirmo), estas três:

**a) O mojibake — `public/fluxo-1510.json`, depois `python3 scripts/gerar_fluxo_1582.py`**
para propagar mantendo o invariante 0. Quatro substituições de texto, 8 registros, nenhum
número, nenhuma regra. **Nas linhas `-` abaixo, entre o `Ã` e o `O` existe um caractere de
controle invisível** (`\x83`, ou `\x87` no caso do Ç) — é ele o defeito; as linhas `+` são o
texto limpo. Na prática é uma linha de Python por campo,
`s.encode("latin-1").decode("utf-8")`, que é exatamente a `conserta_acento` já existente no
`aplicar_regras_novas.py`:

```diff
-  "at2_sub": "REGULARIZADO-DEFEITO EM CONEXÃO"      (4 registros)
+  "at2_sub": "REGULARIZADO-DEFEITO EM CONEXÃO"
-  "at2_sub": "REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÃO"   (2 registros)
+  "at2_sub": "REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÇO"
-  "at2_sub": "NÃO REGULARIZADO-CAUSA NÃO IDENTIFICADA"   (1 registro)
+  "at2_sub": "NÃO REGULARIZADO-CAUSA NÃO IDENTIFICADA"
-  "at2_obs": "IntervenÃ§Ã£o gerada pelo PDA-Sigod - Reclamacao OS 05-..."   (1 registro)
+  "at2_obs": "Intervenção gerada pelo PDA-Sigod - Reclamacao OS 05-..."
```

**b) A data de julho — `app/page.tsx`, linha 4592:**

```diff
-              <td>{r.ss}</td><td><code>{r.trafo}</code></td><td>{r.abertura}</td><td>{r.localidade}</td>
+              <td>{r.ss}</td><td><code>{r.trafo}</code></td><td>{dataBR(r.abertura)}</td><td>{r.localidade}</td>
```

**c) As duas chaves do `resumo` — `scripts/gerar_fluxo_1582.py`, dentro do `resumo.update()`,
e depois rodar o gerador:**

```diff
     "comNarrativa": sum(1 for r in registros if txt(r.get("narrativa"))),
+    "comAlertaNarrativa": sum(1 for r in registros if r.get("alertas_narrativa")),
+    "semFato": sum(1 for r in registros if r.get("fato") == "F3"),
     "comCoordenada": sum(1 for r in registros if r.get("lat") is not None),
```

**E as três emendas no `scripts/auditoria_invariantes.py` que fecham os vãos por onde estes
defeitos passaram** — sem elas, os três voltam calados na próxima regeração:

- **12:** varrer **todo campo string** de todo registro, em vez da lista fixa de dez campos.
- **16:** além de procurar literal ISO, procurar **campo de data renderizado sem `dataBR`** —
  um `{r.<campo>}` cru cujo nome esteja na família `abertura|termino|revisado_em|*_ini|*_fim`.
- **7:** recontar **todas** as chaves recontáveis do `resumo` e listar explicitamente, como
  "não recontável", as quatro históricas (`foraDaBase`, `janelaCorrigida`,
  `atendimentoPorOcorrencia`, `reclassificadosExterno`), em vez de simplesmente ignorá-las.

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
