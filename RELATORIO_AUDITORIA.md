# Relatório da auditoria automática

## 29/08/2026, 16:20 UTC — `MODO = RELATO`: o briefing envelheceu junto com o dado; 2 defeitos reais no site

**Placar: 15 conferem · 3 falham · 1 a olho, de 19.** Rodei em `MODO = RELATO`, então **nada foi
commitado e nada foi publicado** — o `AUDITORIA_NOTURNA.md` manda mais do que a mensagem que me
acordou, e a mensagem pedia push. Os diffs de tudo o que eu teria mudado estão escritos abaixo,
prontos para aplicar. O build passa no estado atual da `main`
(`pnpm install --frozen-lockfile && pnpm run build:pages`, built in 5.69s). Rodado em `348c472`.

*Sobre este arquivo:* vai commitado sozinho para o branch de inspeção
`claude/auditoria-noturna-relato-29-08-1620`, que é o que as execuções anteriores em RELATO fizeram
(`...-27-08`, `...-28-08`, `...-29-08`, `...-29-08-0821`). O branch não é `main`, então **não dispara
o `auditoria-pages.yml` e não republica o site**. Nenhum arquivo do site entrou no commit.

*Esta é a terceira execução de hoje* — houve uma às 00:24 e outra às 08:21 UTC, cada uma no seu
branch. **Cheguei aos mesmos achados da rodada das 08:21 por caminho independente**, o que é uma
boa notícia: mojibake nos mesmos 8 registros, o mesmo diagnóstico de que o roteiro descreve um site
que não existe mais, e os mesmos totais medidos. O que esta rodada acrescenta: **mais 3 números
errados no `metodo.json`** (11 no total, contra os 8 daquela), a constatação de que o parágrafo das
famílias **não fecha nem contra si mesmo** (137 + 103 = 240 para uma porta de 220), e o diagnóstico
dos **dois testes quebrados** no `scripts/auditoria_invariantes.py`, com o conserto de ambos.

### O primeiro achado é o briefing, não o site

**O dado se moveu muito desde que a seção 6 do `AUDITORIA_NOTURNA.md` foi escrita, e o roteiro não
acompanhou.** Não é defeito do site: a esteira foi reestruturada por decisão registrada — a exclusão
saiu de dentro da cascata e virou uma porta antes dela, e as peneiras 1, 2 e 4 viraram marcadores que
não retêm ninguém. O que o roteiro descreve simplesmente não existe mais no formato descrito.

| Seção 6 do roteiro | Medido hoje |
|---|---|
| Saída confirmada **884** = 856 queimados + 28 avariados | **1.269** = 1.198 queimados + 71 avariados |
| Decisão da esteira INCLUIR 884 · REVISÃO 617 · EXCLUIR 9 | INCLUIR **1.269** · REVISÃO **21** · EXCLUIR **220** |
| Fato F1 1.259 · F3 206 · F2 22 · F0 20 · FD 3 | F1 **1.324** · F3 **173** · F0 **13** (F2 e FD não existem mais) |
| `e1_nivel` A 1.000 · B 279 · C 3 · FORA 91 · SEM 137 | A **1.140** · B **197** · FORA **71** · SEM **102** (C não existe mais) |
| duplicadas 3 · `e1_conflito` em 7 | duplicadas **1** · `e1_conflito` em **1** |
| janela corrigida 37 · `borda_2025` 24, 12 sem interrupção | janela corrigida **36** · `borda_2025` **24**, **0** sem interrupção |
| Cascatas: 7 rótulos | **3 rótulos**: SAÍDA 1.269 · EXCLUÍDA 220 · RETIDO — SEM PROVA DE TROCA 21 |

Continuam batendo exatamente: **decisão da matriz 1.262 / 184 / 64**, **leitura L1 1.451 · L2 53 ·
L3 6**, `tmae_gap_jan` 99, atendimento recuperado por ocorrência 23, reclassificados de dano externo
11, sem coordenada 1.

A regra da esteira escrita na seção 5 também não roda mais: ela testa `duplicada == "SIM"`, e esse
campo **não existe** no dado de hoje; e testa `expurgo` antes de tudo, quando quem manda hoje é
`fora_da_esteira`. Aplicada ao pé da letra ela erra **223 dos 1.510** rótulos. Reescrita para o motor
de hoje, erra **3** — e os 3 são vereditos do dono, não defeito (ver invariante 4).

**Não reescrevi o roteiro.** A seção 5 é "a regra da esteira", que está na lista do que eu não posso
tocar, e a seção 6 é o retrato contra o qual eu confiro — trocar os dois de uma vez é reescrever o
meu próprio gabarito sozinho, de madrugada. Fica como a primeira decisão do dono desta rodada.

### Os invariantes, um a um

| # | Resultado | Medido |
|---|---|---|
| 1 · 1.510 registros, `ss` único | **CONFERE** | 1.510 registros, 1.510 ss distintos |
| 2 · soma das cascatas = 1.510 | **CONFERE** | 1.269 + 220 + 21 = 1.510 |
| 3 · a corrente fecha | **CONFERE** | 1.510 − 220 = 1.290 = `chega_e1` = `chega_e2` = `chega_e3`; 1.290 − 21 = 1.269 = SAÍDA |
| 4 · a regra reproduz os 1.510 rótulos | **CONFERE** | 3 divergências, e as 3 são `veredito_do_dono = SIM` (obra fora do export que o dono mandou passar) |
| 5 · decisão ⇔ cascata | **CONFERE** | 0 fora do casamento |
| 6 · `confirmado` só na saída | **CONFERE** | 1.198 + 71 = 1.269 = SAÍDA; 0 preenchidos fora, 0 vazios dentro |
| 7 · `resumo` bate com a recontagem | **CONFERE** | 7 blocos + 12 escalares + os 23 gatilhos de exclusão |
| 8 · nenhum `FORA` dentro da janela | **CONFERE** | 0 violações recalculando dos horários crus |
| 9 · disputa de ocorrência resolvida | **CONFERE** | 0 disputas de verdade, 1 perdedor marcado, e ele saiu pela exclusão |
| 10 · porta de exclusão ⇔ EXCLUÍDA | **CONFERE** | 220 = 220, diferença simétrica 0 |
| 11 · lacuna de base tem aviso no dossiê | **CONFERE** | 123 marcadas, 0 sem `lacuna_base` |
| 12 · nenhum mojibake | **FALHA** | **8 registros**, em campos que aparecem na tela |
| 13 · NAV = RECORTES = tipo `Modulo` | **CONFERE** | NAV 31, RECORTES 33, tipo 33; nenhum órfão |
| 14 · números à mão no `metodo.json` | **FALHA** | **11 números** não batem, em 3 blocos |
| 15 · números na interface | **A OLHO** | barra lateral, KPIs e caixa d'água são calculados; os 19 literais de `nota` que dá para amarrar ao dado batem |
| 16 · datas em dd/mm/aaaa | **CONFERE** | `dataBR` converte; 0 datas ISO escritas direto na tela |
| 17 · os 12 arquivos de base | **CONFERE** | 12 existem; `Base_*` batem em MB decimal (6/6), `Original_*` em MiB (6/6) |
| A · a planilha de download bate com o JSON | **CONFERE** | 1.510 linhas, SAÍDA 1.269, 1.198 + 71 — igual ao `fluxo-1510.json` |
| B · vereditos do dono aplicados | **CONFERE** | 57 vereditos, 0 divergências |

Os invariantes A e B não estão no roteiro; vieram do
`scripts/auditoria_invariantes.py`, que já os testava. Mantive.

### FALHA 12 — mojibake em 8 dossiês, na tela

Oito registros carregam texto com dupla codificação, e **os dois campos aparecem na tela**, no painel
*ATENDIMENTO ACHADO PELO NÚMERO DA OCORRÊNCIA* do dossiê (`page.tsx:6792` e `6793`):

| SS | Campo | Está gravado | Deveria ser |
|---|---|---|---|
| ETO-RD-AG 00003/2026 | `at2_sub` | `DEFEITO EM CONEXÃ\x83O` | `DEFEITO EM CONEXÃO` |
| ETO-RD-AG 00214/2026 | `at2_sub` | `PROBLEMA EM RAMAL DE SERVIÃ\x87O` | `... DE SERVIÇO` |
| ETO-RD-AG 00249/2026 | `at2_sub` | `DEFEITO EM CONEXÃ\x83O` | `DEFEITO EM CONEXÃO` |
| DOLP-RD-PA 00429/2026 | `at2_sub` | `NÃ\x83O REGULARIZADO-CAUSA NÃ\x83O IDENTIFICADA` | `NÃO REGULARIZADO-CAUSA NÃO IDENTIFICADA` |
| DOLP-RD-PA 00437/2026 | `at2_sub` | `DEFEITO EM CONEXÃ\x83O` | `DEFEITO EM CONEXÃO` |
| DG-RD-PO 00333/2026 | `at2_obs` | `IntervenÃ§Ã£o gerada pelo PDA-Sigod...` | `Intervenção gerada pelo PDA-Sigod...` |
| ETO-RD-AG 00545/2026 | `at2_sub` | `PROBLEMA EM RAMAL DE SERVIÃ\x87O` | `... DE SERVIÇO` |
| ETO-RD-AG 00627/2026 | `at2_sub` | `DEFEITO EM CONEXÃ\x83O` | `DEFEITO EM CONEXÃO` |

**Correção proposta** — só texto, nenhum número e nenhuma decisão mudam:

```python
# em auditoria-transformadores-134/, com fluxo-1510.json carregado como `f`
for r in f["registros"]:
    for campo in ("at2_sub", "at2_obs"):
        v = r.get(campo)
        if isinstance(v, str) and re.search(r"[ÃÂ][\x80-\xBF]", v):
            r[campo] = v.encode("latin-1", "ignore").decode("utf-8", "ignore")
```

Por que o teste anterior não pegou: `scripts/auditoria_invariantes.py` varre uma lista fixa de dez
campos de texto (`desc_ss`, `desc_os`, `narrativa`, …) e `at2_sub`/`at2_obs` não estão nela. O meu
varreu **todos** os campos string de todos os registros. Vale trocar a lista fixa por varredura total.

### FALHA 14 — 11 números do `metodo.json` não batem com o dado

Este é o arquivo que a aba Método imprime literalmente, sem passar pelo dado. Cada linha abaixo foi
medida do `fluxo-1510.json`; a coluna "medido" é reproduzível.

| Onde | Escrito | Medido | Como medi |
|---|---|---|---|
| `cascata` §1 · família 1 | 137 | **108** | `expurgo_gatilho` em {`sem_interrupcao` 77, `fora_da_janela` 31} |
| `cascata` §1 · sem rastro na Crítica | 47 | **52** | `censo_critica = AUSENTE` dentro da família 1 |
| `cascata` §1 · defeito em outra data | 83 | **31** | `censo_critica = DEFEITO EM OUTRA DATA` dentro da família 1 |
| `cascata` §1 · nem pelo teste do vizinho | 7 | **7 ✓** | `vizinho = "Nada encontrado…"` dentro da família 1 |
| `cascata` §1 · família 2 | 103 | **112** | os demais 21 gatilhos de exclusão |
| `cascata` §1 · categorias menores | 18 | **17** | categorias da família 2 além das 4 nomeadas |
| `cascata` §4 · ressalva na saída | 76 | **83** | campo `ressalvas` preenchido em quem está na SAÍDA |
| `cascata` tabela/2 · corroboram | 1.134 | **1.126** | `deslocamento = CORROBORA` entre as 1.290 da esteira |
| `cascata` tabela/2 · sem registro | 135 | **132** | `deslocamento = SEM REGISTRO` entre as 1.290 (restam 32 sem classificação) |
| `cascata` tabela/3 · só esperam o SIAGO | 18 | **19** | retidos na 3ª peneira com `pendente_siago = SIM` |
| `cascata` tabela/4 · ressalva na saída | 76 | **83** | idem §4 |
| `leitura` · categoria gravada errada | 118 | **128** | `categoria_gravada ≠ categoria_texto` |
| `leitura` · queima com troca comprovada | 96 | **100** | dos anteriores, `categoria_texto = QUEIMADO` e `material_conferido = SIM` |
| `leitura` · rótulo diz avariado | 60 | **57** | `categoria_gravada` dos 100 |
| `leitura` · rótulo diz outros | 21 | **21 ✓** | idem |

**O erro mais visível não depende de definição nenhuma:** o parágrafo diz que a porta tira 220 e
que as duas famílias têm 137 e 103. **137 + 103 = 240.** A conta não fecha contra o próprio 220 que
a frase acaba de escrever, três linhas acima. Medido, são 108 + 112 = 220.

**Sobre o "118":** a definição está confirmada, não reconstruída. O relatório de 02/08 registra que
`categoria_gravada ≠ categoria_texto` dava **118** na época, e foi esse número que entrou no
`metodo.json`. A mesma consulta hoje dá **128** — o dado andou, a frase ficou. E o "21 dizem apenas
outros" bate exatamente com a minha medição, o que confirma que estou usando o mesmo recorte que
quem escreveu a frase.

**Diff proposto** (`auditoria-transformadores-134/public/metodo.json`):

```diff
 bloco "cascata" · paragrafos[0]
-A primeira, com 137 casos, é de quem não tem interrupção que sustente o caso: 47 cujo
-código não aparece na Crítica em papel nenhum nos sete meses do acervo, 83 que aparecem
-com defeito no próprio código mas em outra data, e 7 que não deixaram rastro em base
-alguma, nem pelo teste do vizinho. A segunda, com 103 casos, é de quem tem causa ou
-documento fora do indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos,
-7 tapes internos, e mais dezoito categorias menores, cada uma com o motivo escrito na linha.
+A primeira, com 108 casos, é de quem não tem interrupção que sustente o caso: 52 cujo
+código não aparece na Crítica em papel nenhum nos sete meses do acervo, 31 que aparecem
+com defeito no próprio código mas em outra data, e 25 que aparecem na Crítica sem nunca
+ter o defeito aberto neles; dentro dessa família, 7 não deixaram rastro em base alguma,
+nem pelo teste do vizinho. A segunda, com 112 casos, é de quem tem causa ou documento
+fora do indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes
+internos, e mais dezessete categorias menores, cada uma com o motivo escrito na linha.

 bloco "cascata" · paragrafos[3]
-São 76 solicitações que chegam à saída com a ressalva escrita ao lado, filtrável,
+São 83 solicitações que chegam à saída com a ressalva escrita ao lado, filtrável,

 bloco "cascata" · tabela.linhas[2][3]
-0 — não retém: 1.134 corroboram, 135 sem registro
+0 — não retém: 1.126 corroboram, 132 sem registro e 32 sem classificação

 bloco "cascata" · tabela.linhas[3][3]
-21 sem prova de troca — e 18 deles só esperam a extração do SIAGO
+21 sem prova de troca — e 19 deles só esperam a extração do SIAGO

 bloco "cascata" · tabela.linhas[4][3]
-0 — a ressalva virou marcador: 76 chegam à saída com ela escrita
+0 — a ressalva virou marcador: 83 chegam à saída com ela escrita

 bloco "leitura" · paragrafos[0]
-ela está errada em 118 solicitações, e em 96 delas o texto descreve queima com troca
-comprovada no material enquanto o rótulo gravado diz outra coisa — 60 dizem avariado,
-21 dizem apenas outros.
+ela está errada em 128 solicitações, e em 100 delas o texto descreve queima com troca
+comprovada no material enquanto o rótulo gravado diz outra coisa — 57 dizem avariado,
+21 dizem apenas outros.
```

Duas ressalvas honestas sobre esse diff. **Primeira:** a linha 2 da tabela ganhou "e 32 sem
classificação" porque 1.126 + 132 dá 1.258 e a linha fala de 1.290 — os 32 restantes têm
`deslocamento` vazio e `e2_status = "—"`. Escrever só dois números ali deixaria a linha sem fechar,
que é exatamente o defeito que estou corrigindo. **Segunda:** a família 1 não parte em três grupos
disjuntos do jeito que a frase original sugeria — os 7 do teste do vizinho estão *dentro* dos outros
grupos (5 em AUSENTE, 2 em DEFEITO EM OUTRA DATA), não ao lado deles. Por isso a reescrita move o 7
para depois do ponto e vírgula. 52 + 31 + 25 = 108 fecha; a versão original não fechava.

### A OLHO 15 — o que olhei e o que não dá para automatizar

A barra lateral, os KPIs e a caixa d'água são calculados dos `registros` em tempo de execução: não
podem divergir. O risco é o literal preso em texto de `nota`. São 19 com número; o único que dá para
amarrar ao dado é o `"Estes 27 fecham sozinhos quando o SIAGO vier"` (`page.tsx:3602`), e ele
**bate**: `pendente_siago = SIM` dá exatamente 27. Os outros 18 falam de bases externas (62.616
linhas do TMAE, 7.007 passos da Crítica, 712 auxiliares no KML) que este repositório não contém —
registro que não verifiquei em vez de dar por bom.

### O que eu achei e NÃO toquei, por ser decisão do dono

1. **O roteiro está desatualizado** — a tabela lá em cima. Mexer nele exige decidir se a seção 5
   passa a descrever o motor de hoje, e regra da esteira é do dono.
2. **`resumo.e4Alertas = 6`, mas o campo `e4_alertas` está preenchido em 82 registros da saída.**
   Nenhum invariante cobre esse escalar e eu não consegui reconstruir a definição que dá 6 — pode ser
   um recorte legítimo que eu não enxerguei. Reporto como dúvida e não mexo.
3. **`metodo.json`, bloco `fato`: "1.022 abrem com o cliente já desligado".** Medindo SS cuja
   abertura cai entre `oc_ini` e `oc_fim`, entre as que casam (A/B/C), dá **1.140**. A definição é
   minha reconstrução, não uma que eu possa provar que é a mesma de quem escreveu — então **não
   proponho troca**, só registro que provavelmente é drift do mesmo tipo.
4. **Não consegui verificar**, por não estarem no repositório: "ancorar só na abertura perderia 61
   casos", "alargar para 48 traria 16 casos", "densidade de 2,4 SS/hora entre 12 e 24h", e todos os
   números de bases externas citados no bloco `mensal`. Dependem de reprocessar os arquivos crus.

### Dois testes errados que eu conserto de graça

O roteiro avisa que o teste erra mais que o site, e errou duas vezes hoje.

**`scripts/auditoria_invariantes.py`, invariante 18 — FALHA que não existe.** Ele acusa "o contador
do cabeçalho não usa `listadas.length`". Usa. O `page.tsx` tem **cinco** blocos `header-meta` numa
cadeia de ternários, e o ramo padrão — o que vale para todas as abas de jan–jun — é o quinto
(`page.tsx:6350`), justamente com `{br(listadas.length)}`. O teste faz `re.search`, que acha só o
primeiro (o ramo dos meses avulsos), e olha 200 caracteres à frente. Nunca chegaria no quinto.

```diff
-cab = re.search(r'className="header-meta".{0,200}', page, re.S)
-if not cab or "listadas.length" not in cab.group(0):
+cabs = [page[m.start():m.start() + 200] for m in re.finditer(r'className="header-meta"', page)]
+if not any("listadas.length" in c for c in cabs):
```

**Invariante 19 — FALHA de ambiente, não de dado.** Ele depende de `openpyxl`, que não está
instalado aqui, e por isso reporta falha há rodadas sem nunca ter olhado a planilha. Li o
`Base_Esteira_Completa.xlsx` com `zipfile` + `xml.etree`, ambos da biblioteca padrão: **1.510 linhas,
SAÍDA 1.269, 1.198 queimados + 71 avariados — idêntico ao `fluxo-1510.json`.** A planilha está certa;
o teste é que não conseguia abri-la. Trocar `openpyxl` pelo leitor de biblioteca padrão fecha o
invariante sem instalar nada — e "nunca adicione dependência nova" continua valendo.

*(O meu próprio script caiu na mesma armadilha do 18, por outro motivo: `.{0,220}` guloso engolia as
ocorrências seguintes. Só descobri conferindo o `page.tsx` na mão, que é o que o roteiro manda fazer
antes de acusar o site.)*

### Por que não houve push

`AUDITORIA_NOTURNA.md` está com `MODO = RELATO`, e a linha diz que ela manda mais do que a mensagem
que iniciou a execução. A mensagem pedia push; o arquivo diz para não commitar. Obedeci o arquivo.
Nada foi commitado, nada foi publicado, o site no ar está exatamente como estava. Os diffs acima são
pequenos e todos de texto — nenhum toca dado de decisão. Para soltá-los, o dono troca a linha para
`MODO = CORRIGE` e me acorda de novo.

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
