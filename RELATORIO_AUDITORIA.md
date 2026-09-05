# Relatório da auditoria automática

## 05/09/2026, 08:20 UTC — `MODO = RELATO`: mojibake na tela, sete números velhos no `metodo.json`, e o roteiro envelheceu

**Placar: 21 conferem · 2 falham · 1 a olho, de 24 invariantes conferidos.**
Rodada sobre `d1dd201` (`main`, em dia com a origem). Árvore limpa; nada foi commitado.

> **O push pedido no comando que me acordou foi deliberadamente omitido.** `AUDITORIA_NOTURNA.md`
> está em `MODO = RELATO`, e o próprio arquivo manda obedecer a ele e não à mensagem. Nenhum
> arquivo do site foi alterado: só esta entrada de relatório foi escrita. Os dois defeitos
> abaixo vêm com o diff exato, prontos para aplicar quando o modo virar `CORRIGE`.

### O que muda o dia de quem lê

1. **Tem mojibake no ar.** 8 dossiês mostram `CONEXÃƒO`, `SERVIÃ‡O`, `NÃƒO REGULARIZADO` e
   `IntervenÃ§Ã£o` na tela. Correção conferida, 4 valores distintos, sem efeito em número nenhum.
2. **Sete números escritos à mão no `metodo.json` não batem com o dado** — entre eles uma soma
   impossível: o texto diz que as 220 exclusões se dividem em duas famílias de **137 e 103**,
   que somam 240.
3. **O `AUDITORIA_NOTURNA.md` está velho.** A seção 6 inteira, a regra da esteira da seção 5 e
   os graus de prova da seção 1 descrevem um dado que não existe mais desde o PR #127. Enquanto
   ele não for atualizado, cada rodada volta a comparar o site com um retrato de julho.

---

### O dado mudou de tamanho, e o roteiro não acompanhou

O site não roda mais em 1.510 SS: roda em **1.582** (`public/fluxo-1582.json`, jan–jul), com as
1.510 de jan–jun congeladas em `fluxo-1510.json` e 72 de julho em prévia. E o `fluxo-1510.json`
**também foi regerado**: a esteira ganhou a porta de exclusão antes das peneiras, e os rótulos
de cascata mudaram de nome.

| O que o roteiro diz (seção 6) | O que o dado diz hoje (jan–jun) |
|---|---|
| Saída 884 = 856 queimados + 28 avariados | **1.269** = 1.198 queimados + 71 avariados |
| Esteira INCLUIR 884 · REVISÃO 617 · EXCLUIR 9 | INCLUIR **1.269** · REVISÃO **21** · EXCLUIR **220** |
| Matriz INCLUIR 1.262 · REVISÃO 184 · EXCLUIR 64 | igual — 1.262 / 184 / 64 |
| 206 sem interrupção · 299 sem deslocamento · 41 sem prova · 68 ressalva · 3 duplicada | **0 · 0 · 21 · 0 · 0** — quem não tem interrupção sai pela porta, não fica retido |
| Fato F1 1.259 · F3 206 · F2 22 · F0 20 · FD 3 | F1 **1.324** · F3 **173** · F0 **13** (F2 e FD não existem mais) |
| Leitura L1 1.451 · L2 53 · L3 6 | igual — 1.451 / 53 / 6 |
| `e1_nivel` A 1.000 · B 279 · C 3 · FORA 91 · SEM 137 | A **1.140** · B **197** · FORA **71** · SEM **102** (C não existe mais) |
| Cascata: 7 rótulos, com `EXCLUÍDO NA LEITURA` | 3 rótulos em jan–jun: `SAÍDA`, `EXCLUÍDA`, `RETIDO — SEM PROVA DE TROCA` |
| Regra da esteira: `expurgo` → `duplicada` → `chega_e2` → … | a porta é `fora_da_esteira`/`expurgo`, e os dois campos coincidem (220 = 220, diferença simétrica 0) |

A corrente de hoje, medida: **1.582 − 220 excluídas = 1.362 → −15 sem interrupção = 1.347 →
−0 sem deslocamento = 1.347 → −21 sem prova = 1.326 → −2 ressalva = 1.324 na saída.**
Em jan–jun: **1.510 − 220 = 1.290 → 1.290 → 1.290 → −21 = 1.269 → 1.269.**

**Não corrigi o roteiro** porque em `RELATO` não commito, e porque a seção 6 manda "corrigir este
arquivo junto" — que é edição, não relato. Os números acima são o que deve entrar lá.

---

### FALHA 12 — mojibake em 8 dossiês, visível na tela

`public/fluxo-1510.json` e `public/fluxo-1582.json` têm UTF-8 duplamente codificado em
`at2_sub` (7 registros) e `at2_obs` (1). São os mesmos 8 casos nos dois arquivos, porque jan–jun
é cópia byte a byte. Os dois campos **são renderizados** em `app/page.tsx:6821-6822`, dentro do
bloco *ATENDIMENTO ACHADO PELO NÚMERO DA OCORRÊNCIA*.

| SS | campo | está na tela | deveria ser |
|---|---|---|---|
| ETO-RD-AG 00003/2026 · 00249/2026 · 00627/2026 · DOLP-RD-PA 00437/2026 | `at2_sub` | `REGULARIZADO-DEFEITO EM CONEXÃƒO` | `…CONEXÃO` |
| ETO-RD-AG 00214/2026 · 00545/2026 | `at2_sub` | `REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÃ‡O` | `…SERVIÇO` |
| DOLP-RD-PA 00429/2026 | `at2_sub` | `NÃƒO REGULARIZADO-CAUSA NÃƒO IDENTIFICADA` | `NÃO REGULARIZADO-CAUSA NÃO IDENTIFICADA` |
| DG-RD-PO 00333/2026 | `at2_obs` | `IntervenÃ§Ã£o gerada pelo PDA-Sigod…` | `Intervenção gerada pelo PDA-Sigod…` |

São 4 valores distintos. Correção conferida em ensaio: `valor.encode("latin-1").decode("utf-8")`
resolve os quatro sem resíduo — a assinatura `[ÃÂ][\x80-\xBF]` some e nada mais no arquivo é
tocado. **Não mexe em número nenhum:** são campos de texto do dossiê, não entram em contagem.

```python
# a aplicar em public/fluxo-1510.json E em public/fluxo-1582.json, nos dois igualmente
import json, re
MOJI = re.compile(r"[ÃÂ][\x80-\xBF]")
for arq in ("public/fluxo-1510.json", "public/fluxo-1582.json"):
    d = json.load(open(arq, encoding="utf-8"))
    for r in d["registros"]:
        for k in ("at2_sub", "at2_obs"):
            v = r.get(k)
            if isinstance(v, str) and MOJI.search(v):
                r[k] = v.encode("latin-1").decode("utf-8")
    json.dump(d, open(arq, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
```

> **Atenção ao terceiro arquivo.** `public/versoes/2026-08-11/fluxo-1510.json` tem as mesmas 10
> ocorrências e **não deve ser corrigido**: é o site congelado daquele dia, e mexer nele apaga o
> registro de como a tela estava. Fica anotado de propósito.

**Por que o teste da casa não pegou:** o invariante 12 de `scripts/auditoria_invariantes.py`
varre só 10 campos nomeados (`desc_ss`, `desc_os`, `narrativa`, `oc_obs`, `at_obs`, …) e
`at2_sub`/`at2_obs` não estão na lista. Trocar a lista fixa por "todo campo string do registro"
fecha o buraco:

```diff
-campos_txt = ["desc_ss", "desc_os", "narrativa", "oc_obs", "at_obs", "motivo_decisao",
-              "cascata_motivo", "fato_texto", "leitura_texto", "lacuna_base"]
 n_reg_moji = 0
 for r in regs:
-    for c in campos_txt:
+    for c in r:
         if isinstance(r.get(c), str) and MOJI.search(r[c]):
```

---

### FALHA 14 — sete números do `metodo.json` não batem com o dado

A aba Método imprime esses blocos como estão; nenhum número passa pelo dado. Todos os valores
"medido" abaixo são do subconjunto congelado jan–jun (`fluxo-1510.json`, 1.510 registros).

| # | Onde | Está escrito | Medido |
|---|---|---|---|
| 1 | `cascata` §1 | as 220 exclusões se dividem em **137** + **103** | **137 + 103 = 240 ≠ 220.** Soma impossível |
| 2 | `cascata` §1 | a família "sem interrupção que sustente" tem 137: **47** ausentes da Crítica, **83** com defeito em outra data, **7** sem rastro | pelos gatilhos, `sem_interrupcao` 77 + `fora_da_janela` 31 = **108**; pelo censo dentro deles, **52** AUSENTE · **31** DEFEITO EM OUTRA DATA · **25** SEM DEFEITO NELE |
| 3 | `cascata` tabela, linha 2 | Deslocamento: "não retém: **1.134** corroboram, **135** sem registro" | das 1.290 que entram: **1.126** CORROBORA · **132** SEM REGISTRO · 32 em branco |
| 4 | `cascata` tabela, linha 3 | "21 sem prova de troca — e **18** deles só esperam a extração do SIAGO" | **19** dos 21 (`pendente_siago = SIM`, motivo "OBRA FORA DO EXPORT DE MAT"); os outros 2 são "OBRA NAO GERADA" |
| 5 | `cascata` §4 e tabela, linha 4 | "São **76** solicitações que chegam à saída com a ressalva escrita ao lado" | **83** com ressalva na saída: 75 "nenhum cliente interrompido", 8 "manobra sem programação prévia" (2 têm as duas) e 2 "zero cliente registrado". Só as duas ressalvas nomeadas no texto dão **81** |
| 6 | `leitura` | a categoria gravada "está errada em **118** solicitações, e em **96** delas o texto descreve queima com troca comprovada — **60** dizem avariado, **21** dizem apenas outros" | `categoria_gravada ≠ categoria_texto` = **128**; destas, texto QUEIMADO com material conferido = **100**; dentro das 100, **57** avariado e **21** outros. Só o 21 sobreviveu |
| 7 | `fato` | "entre 12 e 24 horas a densidade é de cerca de **2,4** solicitações por hora" | 26 casos em 12 h = **2,17/h**. O par seguinte reproduz exato: 24–48 h traz **16** casos, **0,67/h** ≈ 0,7 |

**Não reescrevi nenhum deles** — `MODO = RELATO`. Os valores medidos acima são o que deve
entrar, com uma ressalva sobre o item 2: o texto e o dado partem a mesma população por critérios
diferentes (o texto por rastro na Crítica, o dado por gatilho de exclusão), então trocar 137 por
108 exige alguém decidir qual das duas perguntas o parágrafo quer responder. **Refazer aquele
parágrafo é escrita, não correção aritmética** — deixo para o dono.

**De onde veio o 137:** o próprio `app/page.tsx:1342` explica. A barra "Motivo da saída" mostrava
um bloco único de 137, e o dono pediu que fosse dividido em "o registro não existe" (77) e "o
registro existe noutra data" (31). O `metodo.json` ficou com o número de antes da divisão.

#### Números do `metodo.json` que **conferem**

`resumo`: matriz 1.262 / 184 / 64 ✓ · esteira 1.269 / 21 / 220 ✓ · 1.510 em jan–jun ✓.
`cascata`: tabela linha 0 (1.510 → 1.290, retendo 220) ✓ · linha 1 (1.290 → 1.290, 0 retidos) ✓ ·
linha 3 recebe 1.290 e passa 1.269 ✓ · "as 1.290 restantes" ✓.
`correcoes`: "a saída está hoje em 1.269 confirmados — 1.198 queimados e 71 avariados" ✓ exato.
`limites`: "61 solicitações não têm material conferido" ✓ exato (`material_conferido = NAO` = 61).
`fato`: "alargar para 48 horas traria só 16 casos" ✓ exato.
`mensal`: "o prefixo 57 responde por 97,6%" ✓ exato sobre a saída (o 53 dá 2,2% contra 2,1% escrito).

---

### Os invariantes, um a um

Executado `python3 scripts/auditoria_invariantes.py` (leitura pura, não escreve nada), mais as
conferências independentes descritas acima. O `openpyxl` não vinha instalado no contêiner e foi
instalado só aqui, com `pip` — **não encosta no `package.json` nem no `pnpm-lock.yaml`**, e sem
ele o invariante 19 não roda.

| # | Invariante | Resultado | Medido |
|---|---|---|---|
| 0 | jan–jun é o `fluxo-1510.json` sem mudar um caractere | CONFERE | 1.510 = 1.510, 0 registros diferentes, 72 de julho |
| 1 | 1.582 registros, `ss` único | CONFERE | 1.582 registros, 1.582 SS distintas |
| 2 | a soma das cascatas dá o total | CONFERE | 1.324 + 220 + 21 + 15 + 2 = 1.582 |
| 3 | a corrente fecha nas quatro passagens | CONFERE | 1.362 / 1.347 / 1.347 batem com `chega_e1/e2/e3` gravados |
| 4 | a regra da esteira reproduz os rótulos | CONFERE | 0 divergências em 1.582 · 57 vereditos do dono contados à parte |
| 5 | decisão ≡ cascata | CONFERE | 0 fora do casamento (1.324 / 220 / 38) |
| 6 | `confirmado` só na saída, e soma a saída | CONFERE | 1.246 + 78 = 1.324 = SAÍDA · 0 preenchidos fora |
| 7 | todo bloco de `resumo` bate com a recontagem | CONFERE | 7 blocos e 4 totais |
| 8 | nenhum `FORA` dentro da janela válida | CONFERE | 0 violações |
| 9 | toda ocorrência disputada é resolvida | CONFERE | 0 ocorrências disputadas hoje · 1 perdedora, excluída, com `e1_conflito` |
| 10 | expurgo ≡ cascata excluída | CONFERE | 220 = 220 = 220, diferença simétrica 0, tanto por `expurgo` quanto por `fora_da_esteira` |
| 10·1 | uma SS ocupa um lugar só no funil | CONFERE | 0 repetidas na base, 0 na saída |
| 11 | lacuna de base carrega o aviso no dossiê | CONFERE | 123 marcadas (24 `borda_2025` + 99 `tmae_gap_jan`), 0 sem `lacuna_base` |
| 12 | nenhum mojibake | **FALHA** | 8 registros em cada fluxo, campos `at2_sub` e `at2_obs` — ver acima. `page.tsx`, `MapaAtivos.tsx`, `MapView.tsx`, `layout.tsx`, `globals.css`, `index.html` e todo o resto de `public/` estão limpos |
| 13 | NAV, RECORTES e o tipo `Modulo` listam os mesmos módulos | CONFERE | conferido no bloco inteiro: NAV 23 + NAV_OFICINA 11 = 33 módulos distintos, 33 chaves em RECORTES, 33 no tipo; 0 faltando dos dois lados, e todo `recorte:` citado existe como id |
| 14 | todo número à mão no `metodo.json` bate com o dado | **FALHA** | 7 divergências — ver a tabela acima |
| 15 | números escritos na interface | A OLHO | barra lateral, KPIs e caixa d'água são calculados dos registros em tempo de execução. Dos literais fixos que confiro: "tira 87 casos, de 1.269 para 1.182" ✓ exato · "1.474 das 1.510" ✓ exato · "632 das 1.510" para POS. TAP ✓ exato · julho "55 na saída e 17 retidos" ✓ exato · "Indicador jan–jun 1.305 · 1.225 + 80" ✓ bate com `resumo.indicador_jan_jun`. Um só destoa: `page.tsx:3650` diz "627 das 1.510" e a contagem mais próxima dá **628** |
| 16 | datas em dd/mm/aaaa | CONFERE | `dataBR` converte e preserva hora · 0 literais ISO no `page.tsx` · o histórico do ativo passa as duas colunas de data pelo `dataBR` · julho e agosto já guardam dd/mm/aaaa na origem |
| 17 | os 12 arquivos de base existem, com o tamanho anunciado | CONFERE | 12 de 12 em disco; as 6 `Base_*` batem em MB decimal e as 6 `Original_*` em MiB, todas no arredondamento de uma casa |
| 18 | cada peneira é seguida pela aba de quem ela reteve | CONFERE | 258 retidos + 1.324 na saída = 1.582, nenhum caso órfão |
| 19 | a planilha para download conta a mesma história | CONFERE | `Base_Esteira_Completa.xlsx`: 1.510 linhas, saída 1.269, 1.198 queimados + 71 avariados — igual ao congelado |
| 20 | todo veredito do dono está aplicado | CONFERE | 57 vereditos, 0 divergências |
| 21 | julho desce a esteira como prévia | CONFERE | 55 saída · 15 retidos na interrupção · 2 na ressalva · 0 expurgos |

**Build:** `pnpm install --frozen-lockfile` e `pnpm run build:pages` passam
(vite 8.0.13, `built in 5.15s`). Nenhuma dependência foi adicionada.

---

### O que eu NÃO toquei

As quatro decisões do dono seguem intactas: as SS que passam só com o atendimento do TMAE, as
retidas por `QTD_CONS_INTER_FAT = 0`, as 2 exclusões por dano externo e a regra da esteira. Os
57 vereditos do dono estão todos aplicados e conferidos, um a um. Nenhum dado, nenhum texto de
dossiê e nenhuma narrativa foi alterado — **nenhum arquivo do site foi alterado, ponto.**

### O que não consegui verificar

- **"1.022 abrem com o cliente já desligado"** (`metodo.json`, bloco `fato`). Duas definições
  plausíveis dão números diferentes e nenhum é 1.022: `oc_nivel_decisao = "DENTRO"` dá **1.018**,
  e comparar a abertura da SS contra o intervalo `oc_ini`–`oc_fim` dá **1.140**. Como não
  reconstruí a definição original, **não reescrevi** — trocar por um número que talvez responda
  outra pergunta seria inventar precisão. Fica para o dono dizer qual das duas é a conta.
- **"perderia 61 casos legítimos"** (mesmo bloco): depende de reprocessar o cruzamento ancorando
  só na abertura da ocorrência, que este relatório não refaz.
- **"a aba BASE GERAL, com 1.581 linhas e 40 colunas"** (`page.tsx:4499`) e **"14 com pelo menos
  um campo assim"** (`page.tsx:3333`): exigem abrir o XLSX de origem e reimplementar o `paraRever`
  da tela. Não conferidos.
- Os números do bloco `garantia` (597 cadeias, 178 com retirada em 2026, 106 declaradas, 95 sem
  série) são internamente coerentes — a tabela de graus soma 36+45+50+33+14 = 178 — mas não os
  conferi contra a base da reformadora.

### Observações sem gravidade

- **Dois números de jan–jun convivem no site, e isso é declarado.** O indicador congelado é
  **1.305** (1.225 queimados + 80 avariados, `resumo.indicador_jan_jun`, com a nota "não
  recalculado"); a esteira deste arquivo entrega **1.269**. O `meta.o_que_nao_e` e o comentário
  de `page.tsx:3509` explicam a diferença — o 1.305 é o arquivo mais o martelo do dono. Não é
  defeito, mas são 36 casos de distância entre dois números que aparecem na mesma tela, e quem
  for defender o número em reunião precisa saber disso de cor.
- A aba Bases continua anunciando as `Base_*` em MB decimal e as `Original_*` em MiB. Nenhum
  número errado dentro da própria régua; duas réguas na mesma página.
- `public/bases/originais/Original_Reformadora_OPs.html` (3,2 MB) está em disco e não é oferecido
  na aba Bases. Os outros 12 estão todos listados.
- O `scripts/auditoria_invariantes.py` tem duas frouxidões que hoje não escondem nada, mas
  escondem amanhã: o invariante 13 lê só os primeiros 4.000 caracteres do literal `NAV` (que tem
  6.149) e ignora o `NAV_OFICINA` inteiro; e o invariante 14 aceita qualquer célula da tabela
  quando o valor esperado é `0`, porque procura o literal `"0"` como substring. Conferi os dois
  invariantes por fora e ambos passam de verdade.

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
