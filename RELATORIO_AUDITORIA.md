# Relatório da auditoria automática

## 29/08/2026, 08:21 UTC — MODO RELATO · duas falhas reais (mojibake e `metodo.json`) e o roteiro está velho

**Placar: 14 conferem · 2 falham · 1 a olho, de 17.** Falham a **12** (mojibake em 8 campos que
aparecem na tela) e a **14** (8 números escritos à mão no `metodo.json` que não batem com o dado).
**Nada foi publicado e nenhuma correção foi aplicada.** `AUDITORIA_NOTURNA.md` está em
`MODO = RELATO`, e essa linha manda mais do que o comando que me acordou — o comando pedia push
para `main`, e esse push foi **deliberadamente omitido**. Nenhum dos defeitos abaixo foi corrigido:
os diffs exatos do que eu teria mudado estão no fim desta entrada, para você decidir.

*Sobre este arquivo:* ele vai commitado sozinho para o branch de inspeção
`claude/auditoria-noturna-relato-29-08-0821`, que é o que as execuções anteriores em RELATO fizeram
(`...-27-08`, `...-28-08`, `...-29-08`). O branch não é `main`, então **não dispara o
`auditoria-pages.yml` e não republica o site**. Nenhum arquivo do site entrou no commit.
Houve uma execução anterior hoje, às 00:24 UTC, que deixou o relatório dela no branch
`claude/auditoria-noturna-relato-29-08`; esta entrada não a substitui.

Rodado em `348c472` (origem/main). Build conferido antes de qualquer conclusão:
`pnpm install --frozen-lockfile && pnpm run build:pages` passa em 5,31 s, sem dependência nova.

### O aviso mais importante: o roteiro descreve um site que não existe mais

A seção 6 do `AUDITORIA_NOTURNA.md` — "o retrato contra o qual você confere" — está velha por
inteiro, e não por um número ou outro. O modelo mudou de forma:

| O que o roteiro diz | O que o dado diz hoje |
|---|---|
| Saída 884 (856 queimados + 28 avariados) | **1.269** (1.198 queimados + 71 avariados) |
| Esteira INCLUIR 884 · REVISÃO 617 · EXCLUIR 9 | **1.269 · 21 · 220** |
| Sete baldes de cascata | **Três**: SAÍDA 1.269, EXCLUÍDA 220, RETIDO — SEM PROVA DE TROCA 21 |
| `F1` 1.259 · `F3` 206 · `F2` 22 · `F0` 20 · `FD` 3 | **F1 1.324 · F3 173 · F0 13** (F2 e FD não existem mais) |
| `e1_nivel` A 1.000 · B 279 · C 3 · FORA 91 · SEM 137 | **A 1.140 · B 197 · FORA 71 · SEM 102** (C vazio) |
| Rótulo `EXCLUÍDO NA LEITURA` | **`EXCLUÍDA`** |
| Janela simétrica de 24 h | **Assimétrica: 1 h antes do primeiro passo, 24 h depois do último** |
| Interrupção começa em 01/01/2026; dezembro não existe | **Dezembro de 2025 entrou no acervo** — `borda2025SemInterrupcao` é 0, não 12 |
| Base de jan a jun | Os textos do site já falam em **sete meses** de acervo |

A matriz (1.262 / 184 / 64) e a leitura (L1 1.451 · L2 53 · L3 6) são as duas únicas linhas da
seção 6 que ainda batem. A decisão da esteira mudou de sentido: **quem não tem interrupção na
janela deixou de ficar retido e passou a sair pela porta** — é decisão registrada do dono, está
escrita no código e no `metodo.json`, e explica sozinha a diferença entre 884 e 1.269. Não toquei
nela e não a discuto aqui; registro só que o roteiro ainda descreve o mundo de antes.

**Consequência prática:** três dos cinco invariantes que reprovaram no meu primeiro teste
reprovaram porque **o teste seguia o roteiro velho**, não porque o site esteja errado. Foi
exatamente a armadilha que o próprio roteiro avisa. Detalhe de cada um abaixo.

### Os 17 invariantes, um a um

| # | Resultado | Medido |
|---|---|---|
| 1 | CONFERE | 1.510 registros, 1.510 `ss` distintos, 0 repetidos |
| 2 | CONFERE | soma das cascatas = 1.510 (em 3 baldes, não 7) |
| 3 | CONFERE | 1.510 − 220 = 1.290 = `chega_e2`; 1.290 − 0 = 1.290 = `chega_e3`; 1.290 − 21 = 1.269; 1.269 − 0 = 1.269 = SAÍDA |
| 4 | CONFERE | a regra reproduz 1.507 dos 1.510; as 3 restantes são vereditos do dono (`veredito_do_dono = SIM`, 57 no total), que ficam fora da esteira por decisão |
| 5 | CONFERE | 0 fora do casamento decisão↔cascata |
| 6 | CONFERE | 1.198 + 71 = 1.269 = SAÍDA; 0 `confirmado` preenchido fora da saída |
| 7 | CONFERE | 7 blocos e 4 totais batem com a recontagem |
| 8 | CONFERE | 0 violações da janela válida (1 h antes, 24 h depois) |
| 9 | CONFERE | 0 ocorrências disputadas por mais de uma SS na esteira; 1 perdedora, marcada e excluída |
| 10 | CONFERE | `expurgo = SIM` 220 = cascata `EXCLUÍDA` 220; diferença simétrica 0 |
| 11 | CONFERE | 123 marcadas (24 `borda_2025` + 99 `tmae_gap_jan`), 0 sem `lacuna_base` |
| **12** | **FALHA** | **8 campos com mojibake** em `at2_sub` e `at2_obs` de 8 SS |
| 13 | CONFERE | NAV 23 + oficina 11; RECORTES 33; tipo `Modulo` 33; nada faltando dos dois lados |
| **14** | **FALHA** | **8 números escritos à mão** no `metodo.json` não batem |
| 15 | A OLHO | barra lateral e KPIs são calculados dos `registros` em tempo de execução; mas ver a contradição do SIAGO abaixo |
| 16 | CONFERE | `dataBR` converte aaaa-mm-dd → dd/mm/aaaa e preserva hora; 0 literais ISO no `page.tsx` |
| 17 | CONFERE, com 1 ressalva | 16 arquivos anunciados (não 12), todos existem; 15 batem na unidade certa |

### FALHA 12 — mojibake em 8 campos que a tela mostra

Oito registros carregam texto mal decodificado (latin-1 lido como UTF-8) nos campos `at2_sub` e
`at2_obs`. **Eles aparecem na tela**: o dossiê renderiza os dois no painel "ATENDIMENTO ACHADO PELO
NÚMERO DA OCORRÊNCIA" (`app/page.tsx:6792` e `6793`). São campos do cruzamento do TMAE pelo número
da ocorrência — os 23 casos recuperados —, gerados por um passo que leu o arquivo na codificação
errada.

| Campo | Está | Deveria ser | SS |
|---|---|---|---|
| `at2_sub` | `REGULARIZADO-DEFEITO EM CONEXÃ\x83O` | `REGULARIZADO-DEFEITO EM CONEXÃO` | ETO-RD-AG 00003, ETO-RD-AG 00249, DOLP-RD-PA 00437, ETO-RD-AG 00627 |
| `at2_sub` | `REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÃ\x87O` | `REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÇO` | ETO-RD-AG 00214, ETO-RD-AG 00545 |
| `at2_sub` | `NÃ\x83O REGULARIZADO-CAUSA NÃ\x83O IDENTIFICADA` | `NÃO REGULARIZADO-CAUSA NÃO IDENTIFICADA` | DOLP-RD-PA 00429 |
| `at2_obs` | `IntervenÃ§Ã£o gerada pelo PDA-Sigod…` | `Intervenção gerada pelo PDA-Sigod…` | DG-RD-PO 00333 |

A correção é determinística: os 8 campos fazem `v.encode("latin-1").decode("utf-8")` sem exceção
(0 falhas de round-trip). Nenhum outro campo de `fluxo-1510.json` tem a assinatura, e
`fluxo-1582.json`, `universo-ss.json`, `auditorias.json`, `page.tsx`, `MapaAtivos.tsx`,
`globals.css` e `metodo.json` estão limpos.

**Por que o teste do repositório não pegou:** `scripts/auditoria_invariantes.py:216` varre uma lista
fixa de 10 campos (`campos_txt`) que não inclui `at2_sub` nem `at2_obs`. O teste está estreito, não
errado — mas por isso a falha ficou invisível.

### FALHA 14 — 8 números do `metodo.json` não batem

A aba Método imprime esse arquivo literalmente. O bloco `cascata` é o que envelheceu.

| Onde | Escrito | Medido | |
|---|---|---|---|
| `blocos[5].paragrafos[0]` | primeira família, **137** casos | **108** | ✗ |
| `blocos[5].paragrafos[0]` | **47** ausentes da Crítica | **52** | ✗ |
| `blocos[5].paragrafos[0]` | **83** com defeito em outra data | **31** | ✗ |
| `blocos[5].paragrafos[0]` | **7** sem rastro em base alguma | **0** (o gatilho `sem_fato` não existe; o terceiro grupo real é **25** "só interrompidos ou manobrados") | ✗ |
| `blocos[5].paragrafos[0]` | segunda família, **103** casos | **112** | ✗ |
| `blocos[5].paragrafos[0]` | mais **dezoito** categorias menores | **dezessete** | ✗ |
| `blocos[5].paragrafos[3]` e `tabela.linhas[4][3]` | **76** chegam à saída com a ressalva escrita | **83** | ✗ |
| `blocos[5].tabela.linhas[3][3]` | **18** só esperam a extração do SIAGO | **19** | ✗ |
| `blocos[5].tabela.linhas[2][3]` | **1.134** corroboram, **135** sem registro | nenhum universo do dado reproduz esse par — ver abaixo | ✗ |

O parágrafo se contradiz sozinho: diz que saem 220 pela porta e logo depois soma 137 + 103 = **240**.
As duas famílias medidas dão 108 + 112 = 220, que fecha.

A decomposição correta das 108, conferida por `expurgo_gatilho` e por `censo_critica`, é
**52 ausentes + 31 com defeito em outra data + 25 só interrompidos ou manobrados**. É exatamente a
mesma divisão que o próprio site já publica na descrição do download `Sem_Interrupcao_Critica.xlsx`
(`app/page.tsx:4459`: "Os 108 que a Crítica não sustenta… 31… 77… 52… 25"). Ou seja: **o site já
conta a história certa em um lugar e a errada em outro.**

O mesmo vale para o SIAGO: o `metodo.json` diz 18, e o KPI da tela (`app/page.tsx:4162`), que é
calculado dos registros, diz **19**. Dois números na mesma tela para a mesma pergunta — é o único
ponto em que o invariante 15 fica de fato manchado.

**A linha do deslocamento não tem correção óbvia.** Medi os quatro universos plausíveis e nenhum dá
1.134 / 135:

| Universo | Corrobora | Sem registro | Sem informação |
|---|---|---|---|
| as 1.290 da esteira (é o que a coluna "Recebe" da própria linha anuncia) | 1.126 | 132 | 32 |
| tudo que não parou na interrupção (1.402) | 1.145 | 140 | 117 |
| os 1.510 | 1.148 | 140 | 222 |
| a saída (1.269) | 1.106 | 131 | 32 |

Proponho o primeiro, por coerência com a coluna "Recebe" da linha, mas **isto é escolha de
redação e fica para o dono** — não inventei o par.

**Um número fora do bloco `cascata`, com ressalva:** `blocos[1].paragrafos[0]` diz que
"**1.022** abrem com o cliente já desligado". Medindo abertura contida no intervalo da ocorrência —
definição que reproduz exatamente o nível A — dá **1.140**. Como não tenho a definição original
escrita em lugar nenhum, **reporto como dúvida e não proponho troca**. O "perderia 61 casos
legítimos", na mesma frase, não é recomputável a partir deste arquivo.

Números do `metodo.json` que **conferem**: 1.510, 1.290, 1.269, 1.262/184/64, 1.198 + 71, 220,
30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes, 21 sem prova. Os 6.628 e os 62.616
são fatos das bases brutas, não recomputáveis a partir de `fluxo-1510.json`; os 1.305 do bloco 8
são outro universo (ativos congelados) e também não se checam aqui.

### Ressalva do invariante 17 — uma unidade fora do lugar

Os 16 arquivos anunciados existem em disco. Quinze batem no arredondamento de uma casa, cada um na
sua unidade (`Base_*` em MB decimal, `Original_*` em MiB), como o roteiro manda. A exceção:

- `Bases_Gerais.xlsx` — anunciado **2,4 MB**; o arquivo tem 2.534.008 bytes, que dá **2,5 MB
  decimal** e **2,4 MiB**. Ele está na lista das cruzadas, onde os outros nove usam MB decimal.
  Ou o rótulo está 0,1 MB baixo, ou é o único da lista em MiB. Efeito: um décimo de MB num rótulo
  de download. Reporto; não é erro de número na análise.

O roteiro fala em "os 12 arquivos"; hoje são **16** anunciados na tela. Também está velho.

### Os três invariantes que reprovaram no meu teste e não no site

Registro para a próxima execução não repetir o caminho:

1. **Invariante 8** — meu teste acusou 16 registros `FORA` com `oc_dist_h ≤ 24`. Os **16 têm
   `aberta_antes = SIM`**: a SS abriu antes de a ocorrência começar, que é a anomalia que o próprio
   roteiro descreve na seção "como a coisa acontece no mundo real". A janela hoje é assimétrica
   (1 h antes, 24 h depois); o invariante escrito no roteiro pressupõe a simétrica. **Teste velho,
   site certo.**
2. **Invariante 4** — as 3 divergências são as SS `DG-RD-PO 00073`, `ETO-RD-GR 00279` e
   `DOLP-RD-PA 00605`, todas com `veredito_do_dono = SIM` e `cascata_motivo` começando em "O dono
   martelou queimado". A regra da seção 5 não tem o degrau do veredito. **Teste incompleto, site
   certo** — e é matéria que eu não posso tocar de qualquer forma.
3. **Invariante 7** — acusei `duplicadas` 1 ≠ 3 porque recontei pelo campo `duplicada`. O `resumo`
   conta `expurgo_gatilho == "duplicada"`, que é 1, e é a definição certa: das 3 marcadas, só
   **uma** perdeu disputa (`disputa_perdida = SIM`); as outras duas dividem ocorrência com outra SS
   mas saíram por causa própria (`sem_obra` e `remanejamento`). **Teste meu errado, site certo.**

### Dois defeitos no próprio script de invariantes do repositório

Não são defeitos do site, mas cegam a auditoria:

1. **`scripts/auditoria_invariantes.py:216`** — `campos_txt` não inclui `at2_sub`/`at2_obs`, e por
   isso o invariante 12 diz CONFERE com 8 campos sujos no dado. É a causa direta de a FALHA 12 ter
   passado despercebida.
2. **`scripts/auditoria_invariantes.py:419`** — o invariante 18 reprova por bug do teste, não do
   site. A regex `re.search(r'className="header-meta".{0,200}')` pega **o primeiro** dos cinco
   blocos `header-meta` do `page.tsx` (a linha 6343, do módulo do mês) e cobra `listadas.length`
   dele. O contador padrão, na linha **6350**, usa `listadas.length`; os outros quatro leem outro
   arquivo de propósito, e o comentário logo acima (6339–6341) explica por quê. **O site está
   certo; o teste olha o bloco errado.**

O invariante 19 do mesmo script reprovava por `openpyxl` ausente no contêiner. Instalei (é
ferramenta local de conferência, não dependência do site — `package.json` e o lockfile não foram
tocados) e ele **confere**: a planilha traz 1.510 linhas, saída 1.269, 1.198 queimados + 71
avariados, igual ao JSON.

### O que eu teria mudado — diffs exatos

Nada disto foi aplicado. O único arquivo que este commit toca é este relatório.

**1. `public/fluxo-1510.json` — mojibake (8 campos, 4 strings distintas)**

As linhas `-` abaixo carregam o byte estragado de verdade, e ele é **invisível** num editor: a
diferença para a linha `+` é um byte a mais logo depois do `Ã`. A tabela da FALHA 12, mais acima,
mostra as mesmas quatro strings com escapes (`\x83`, `\x87`, `Ã§Ã£`), que é a forma legível.

```
- "at2_sub": "REGULARIZADO-DEFEITO EM CONEXÃO"
+ "at2_sub": "REGULARIZADO-DEFEITO EM CONEXÃO"
      em ETO-RD-AG 00003/2026, ETO-RD-AG 00249/2026, DOLP-RD-PA 00437/2026, ETO-RD-AG 00627/2026

- "at2_sub": "REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÃO"
+ "at2_sub": "REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÇO"
      em ETO-RD-AG 00214/2026, ETO-RD-AG 00545/2026

- "at2_sub": "NÃO REGULARIZADO-CAUSA NÃO IDENTIFICADA"
+ "at2_sub": "NÃO REGULARIZADO-CAUSA NÃO IDENTIFICADA"
      em DOLP-RD-PA 00429/2026

- "at2_obs": "IntervenÃ§Ã£o gerada pelo PDA-Sigod - Reclamacao OS 05-…"
+ "at2_obs": "Intervenção gerada pelo PDA-Sigod - Reclamacao OS 05-…"
      em DG-RD-PO 00333/2026
```

Regra de aplicação, para os 8 e só para os 8: se `re.search(r"[ÃÂ][\x80-\xBF]", v)`, então
`v = v.encode("latin-1").decode("utf-8")`.

**2. `public/metodo.json` — bloco `cascata`**

```
  blocos[5].paragrafos[0]
- A primeira, com 137 casos, é de quem não tem interrupção que sustente o caso: 47 cujo
- código não aparece na Crítica em papel nenhum nos sete meses do acervo, 83 que aparecem
- com defeito no próprio código mas em outra data, e 7 que não deixaram rastro em base
- alguma, nem pelo teste do vizinho. A segunda, com 103 casos, […] e mais dezoito
- categorias menores, cada uma com o motivo escrito na linha.
+ A primeira, com 108 casos, é de quem não tem interrupção que sustente o caso: 52 cujo
+ código não aparece na Crítica em papel nenhum nos sete meses do acervo, 31 que aparecem
+ com defeito no próprio código mas em outra data, e 25 que aparecem só como interrompidos
+ ou manobrados, sem defeito aberto neles. A segunda, com 112 casos, […] e mais dezessete
+ categorias menores, cada uma com o motivo escrito na linha.

  blocos[5].paragrafos[3]
- São 76 solicitações que chegam à saída com a ressalva escrita ao lado
+ São 83 solicitações que chegam à saída com a ressalva escrita ao lado

  blocos[5].tabela.linhas[2][3]
- 0 — não retém: 1.134 corroboram, 135 sem registro
+ 0 — não retém: 1.126 corroboram, 132 sem registro e 32 sem informação

  blocos[5].tabela.linhas[3][3]
- 21 sem prova de troca — e 18 deles só esperam a extração do SIAGO
+ 21 sem prova de troca — e 19 deles só esperam a extração do SIAGO

  blocos[5].tabela.linhas[4][3]
- 0 — a ressalva virou marcador: 76 chegam à saída com ela escrita
+ 0 — a ressalva virou marcador: 83 chegam à saída com ela escrita
```

**3. `scripts/auditoria_invariantes.py` — os dois bugs de teste**

```
  linha 216
- campos_txt = ["desc_ss", "desc_os", "narrativa", "oc_obs", "at_obs", "motivo_decisao",
-               "cascata_motivo", "fato_texto", "leitura_texto", "lacuna_base"]
+ # varre todo campo de texto do registro: a lista fixa deixou passar at2_sub/at2_obs, que
+ # o dossiê renderiza, por oito rodadas seguidas
+ campos_txt = None   # None = todos os campos string do registro

  linha 419
- cab = re.search(r'className="header-meta".{0,200}', page, re.S)
- if not cab or "listadas.length" not in cab.group(0):
+ # há cinco header-meta: quatro leem outro arquivo de propósito (mês, jan–jul, cadastro,
+ # visão) e o quinto é o contador do recorte. Cobrar listadas.length do primeiro reprovava
+ # o site por um defeito que ele não tem.
+ cabs = re.findall(r'className="header-meta".{0,200}', page, re.S)
+ if not any("listadas.length" in c for c in cabs):
```

**4. `AUDITORIA_NOTURNA.md` — seções 1, 5, 6, 7 e "lacunas conhecidas"**

Não escrevo o diff porque não é troca de números: é reescrita do modelo (sete baldes viraram três,
a peneira 1 virou porta, a janela virou assimétrica, dezembro de 2025 entrou no acervo, F2/FD e o
nível C deixaram de existir). Os valores medidos para a nova seção 6 estão na tabela do começo
desta entrada. **Isto é decisão de quem escreve o roteiro, não conserto de defeito** — e enquanto
não for feita, toda execução deste roteiro vai reprovar os mesmos três invariantes por engano.

### O que ficou para o dono

- A reescrita do `AUDITORIA_NOTURNA.md` acima.
- A escolha do universo da linha do deslocamento no `metodo.json` (os quatro candidatos medidos
  estão na tabela).
- O "1.022 abrem com o cliente já desligado": medi 1.140 pela definição mais natural, mas sem a
  definição original escrita não proponho a troca.
- `Bases_Gerais.xlsx`: 2,4 MiB ou 2,5 MB decimal.
- As quatro decisões intocáveis da seção "o que você NÃO pode mexer" não foram examinadas e
  continuam como estão.

### O que não consegui verificar

- **Invariante 15 na íntegra.** A barra lateral, os KPIs e a caixa d'água são calculados dos
  `registros` em tempo de execução e não podem divergir por construção; conferi o único ponto em
  que um número escrito à mão contradiz um calculado (SIAGO 18 × 19). Uma varredura visual aba a
  aba não foi feita — não abri o site num navegador.
- **Invariante 16 na íntegra.** `dataBR` converte e não há literal ISO no `page.tsx`, mas não
  garanto que todo campo de data da tela passe por ele.
- Os números `6.628`, `62.616` e `1.305` do `metodo.json`: vêm de bases brutas e de outro universo,
  fora do alcance de `fluxo-1510.json`.

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
