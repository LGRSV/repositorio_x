# Relatório da auditoria automática

## 29/08/2026, 00:24 UTC — MODO RELATO: 6 defeitos de número no `metodo.json` e 3 SS que a terceira peneira reteve e a saída conta

**Nada foi commitado e nada foi publicado.** O `AUDITORIA_NOTURNA.md` está em `MODO = RELATO`
e o próprio arquivo manda mais do que o comando que me acordou — a mensagem que disparou esta
execução pedia `push` para a `main`, e o push foi **deliberadamente omitido**. Tudo o que
segue é proposta. A árvore de trabalho está limpa; o `HEAD` é `348c472`.

*Duas divergências entre a mensagem que me acordou e o roteiro, resolvidas a favor do roteiro:*
ela pedia push (o arquivo diz RELATO) e falava em "14 invariantes" (o arquivo lista **17**).
Rodei os 17.

**Placar dos 17 invariantes do roteiro: 6 conferem · 11 falham.** Mas o número sozinho engana,
e a advertência do roteiro se confirmou de novo: **7 das 11 falhas são do roteiro, não do
site.** O dado e a tela mudaram de modelo — a exclusão saiu de dentro da esteira e passou para
antes dela — e a seção 6 do `AUDITORIA_NOTURNA.md` ainda descreve o modelo velho.

**O script mantido no repositório (`scripts/auditoria_invariantes.py`, 21 invariantes) já foi
migrado para o modelo novo e sai com 19 CONFERE · 1 FALHA · 1 A OLHO.** Ele é a referência
mais confiável do que o roteiro nesta rodada. O `pnpm install --frozen-lockfile &&
pnpm run build:pages` **passa** na `main` (built in 5.59s), sem nenhuma alteração minha.

### O que mudou de verdade, e por que quase tudo "falhou"

A esteira não retém mais por falta de interrupção: quem não tem interrupção que sustente o
caso **sai pela porta, antes da esteira**, com o motivo escrito. O `cascata` tem hoje **três**
rótulos, não os sete do roteiro, e `EXCLUÍDA` substituiu `EXCLUÍDO NA LEITURA`:

```
                        entram        param
0 · Exclusão (porta)     1.510   220 fora do indicador
1 · Interrupção          1.290     0
2 · Deslocamento         1.290     0  (marcador)
3 · SS e OS com material 1.290    21 sem prova de troca
4 · Ressalva             1.269     0  (marcador)
  = Saída                1.269 = 1.198 queimados + 71 avariados
```

Confere fechado: `1.510 − 220 = 1.290`; `1.290 − 21 = 1.269`. A seção 6 do roteiro (884 / 617 /
9, F1 1.259, e1 A 1.000) descreve um estado que não existe mais em lugar nenhum do repositório.

### Invariante a invariante

| # | Resultado | Medido |
|---|---|---|
| 1 | **CONFERE** | 1.510 registros, 1.510 `ss` distintos |
| 2 | falha **do roteiro** | os 7 rótulos somam 1.290; os 3 rótulos reais somam **1.510** |
| 3 | falha **do roteiro** | a corrente do roteiro não se aplica; a atual fecha (acima) |
| 4 | **falha real, 3 casos** | 223 divergências: 220 só de rótulo + **3 casos de verdade** |
| 5 | falha **do roteiro** | as 220 são `EXCLUÍDA`/`EXCLUIR`; sob o rótulo atual, confere |
| 6 | **CONFERE** | `confirmado` só em SAÍDA; 1.198 + 71 = 1.269 = SAÍDA |
| 7 | dúvida | 17 de 18 blocos conferem; `resumo.duplicadas` = 1 e 3 registros têm `duplicada = SIM` |
| 8 | falha **do teste** | ver abaixo — retratado, o site está certo |
| 9 | falha **do roteiro** | 1 disputa perdida hoje, não 3; `e1_conflito` em 1, não em 7 |
| 10 | falha **do roteiro** | `expurgo = SIM` (220) ≡ `EXCLUÍDA` (220); confere sob o rótulo atual |
| 11 | **CONFERE** | 123 marcadas (24 `borda_2025` + 99 `tmae_gap_jan`), todas com `lacuna_base` |
| 12 | **CONFERE** | zero mojibake em `page.tsx`, `metodo.json`, `MapaAtivos.tsx` e nos textos |
| 13 | **CONFERE** | 33 módulos no NAV, 33 no tipo `Modulo`, todos com chave em `RECORTES` |
| 14 | **FALHA — 6 números** | é de novo o invariante que mais falha; detalhado abaixo |
| 15 | **falha parcial** | 140 × 132 na barra lateral e 3 chips que abrem vazios |
| 16 | **CONFERE** | `dataBR` converte aaaa-mm-dd → dd/mm/aaaa; o histórico do ativo passa por ele; julho/agosto já vêm em BR |
| 17 | **FALHA — 2 tamanhos** | `Bases_Gerais.xlsx` e `Base_Funis.xlsx` |

**O invariante 8 eu retratei, e vale registrar porque quase virou defeito inventado.** Achei 16
SS com `e1_nivel = FORA` e `oc_dist_h ≤ 24` — pelo texto do roteiro, casamentos perdidos. Uma
delas, a `ETO-RD-GU 00058/2026`, tem interrupção no próprio transformador 18,98 h depois da
abertura e está como F3. Parecia grave. **Não é:** a janela deixou de ser simétrica. Hoje vale
de **1 h antes do primeiro passo até 24 h depois do último**, está escrito no `metodo.json` e é
assim que o script do repositório testa. As 16 abriram de 1,13 h a 23,78 h *antes* de a
ocorrência começar — fora da tolerância de 1 h para trás — e nenhuma tem `oc_contida_na_ss`.
A `ETO-RD-GU 00012/2026`, que parecia idêntica e casou como B, casou pela regra da contenção
(a ocorrência inteira cabe dentro do intervalo da SS). **O site está certo; o invariante 8 do
roteiro está escrito contra a janela velha.** Limiar de janela é decisão do dono — não toquei.

### FALHA 14 — os seis números do `metodo.json` que não saem do dado

A aba Método imprime esse arquivo como está. O teste do repositório cobre as células de
cabeçalho da tabela da cascata, mas **não cobre a prosa nem as notas no fim das células** — é
exatamente onde estão os seis.

| Onde | Diz | O dado diz |
|---|---|---|
| `cascata`, 1º parágrafo | as 220 se dividem em **137** + **103** | **108** + **112** (137 + 103 = 240, nem soma 220) |
| `cascata`, 1º parágrafo | **47** ausentes · **83** em outra data · **7** sem rastro | **52** `AUSENTE` · **31** `DEFEITO EM OUTRA DATA` · **25** `SEM DEFEITO NELE` |
| `cascata`, 1º parágrafo | "e mais **dezoito** categorias menores" | **17** categorias |
| `cascata`, tabela linha 2 | "**1.134** corroboram, **135** sem registro" | **1.126** `CORROBORA` · **132** `SEM REGISTRO` · 32 sem o campo (soma 1.290; 1.134 + 135 = 1.269) |
| `cascata`, tabela linha 3 | "**18** deles só esperam a extração do SIAGO" | **19** (`OBRA FORA DO EXPORT`); os outros 2 são `OBRA NAO GERADA` |
| `cascata`, tabela linha 4 | "**76** chegam à saída com a ressalva escrita" | **83** SS em SAÍDA com `ressalvas` preenchida (81 se só as duas ressalvas citadas) |
| `fato`, 1º parágrafo | "**1.022** abrem com o cliente já desligado" | **1.140** (nível A) · 1.137 (dentro de algum passo) · 1.201 (`abertura ≥ oc_ini`) |

**A prova mais limpa de que é o Método que envelheceu, e não o dado:** a aba Bases descreve as
**mesmas** grandezas e acerta todas — "os **108** que a Crítica não sustenta", "**31** têm
defeito no próprio transformador em outra data", "**77** nunca tiveram defeito aberto neles",
"**52** ... dos **25** que aparecem só como interrompidos ou manobrados". 108 = 31 + 77 e
77 = 52 + 25, tudo batendo com o dado. **O site se contradiz entre duas abas, e o dado dá razão
à aba Bases.** O "83" da prosa do Método é o mesmo 83 do roteiro velho (as `tmae_gap_jan` sem
deslocamento) — parece drift, não recálculo.

Não reescrevi nenhum deles: em RELATO não se commita. O `1.022` eu também não substituiria sem
o dono confirmar a definição, porque três leituras razoáveis dão três números diferentes.

### FALHA 15 — dois pontos na interface

1. **140 × 132.** A barra lateral anuncia "Sem corroboração do TMAE **140**"
   (`conta(r => r.deslocamento === "SEM REGISTRO")`, sobre as 1.510), mas o chip que ela abre
   filtra `arquivo(r) !== "EXCLUÍDA" && deslocamento === "SEM REGISTRO"` e traz **132**. Os 8
   de diferença são casos já excluídos na porta, que por definição não chegaram à peneira do
   deslocamento. É o padrão que o próprio código diz querer evitar, em comentário: "quem clica
   no cartão e cai numa lista menor que o cartão perde a confiança na tela".
2. **Três chips que abrem sempre vazios**, sobrando do modelo antigo: `ret_fato`
   (`cascata === "RETIDO — SEM INTERRUPÇÃO NA JANELA"`), `ret_dup` (`"RETIDO — SS DUPLICADA"`)
   e "Retidos pela ressalva" (`"RETIDO — RESSALVA DA INTERRUPÇÃO"`) — três rótulos que não
   existem mais no dado. O `parouNaInterrupcao` já foi migrado para o modelo novo e tem o
   comentário explicando a migração; estes três ficaram para trás.

### FALHA 17 — dois tamanhos, e um teste que não olha 4 dos 16 arquivos

Todos os **16** arquivos referenciados existem em disco (o roteiro ainda fala em 12).

- **`Bases_Gerais.xlsx`** anuncia **2,4 MB**. São 2.534.008 bytes: **2,5 MB** decimal — 2,4 é o
  valor em **MiB**. As outras `Base_*` estão em MB decimal, então esta é a única fora da escala
  da própria lista.
- **`Base_Funis.xlsx`** anuncia **0,02 MB**; são 27.559 bytes = **0,03 MB** em qualquer escala.
- O invariante 17 do script do repositório confere só **12** arquivos (6 `Base_*` + 6
  `Original_*`) e não alcança `Bases_Gerais`, `Material_Pendente`, `Base_Esteira_Completa` nem
  `Sem_Interrupcao_Critica` — por isso ele passa e estes dois escaparam.
- `originais/Original_Reformadora_OPs.html` está em disco e não é referenciado na tela. Não é
  defeito; fica anotado.

### Para o dono decidir — não toquei

1. **Três SS que a terceira peneira reteve e a saída conta.** `DG-RD-PO 00073/2026`,
   `ETO-RD-GR 00279/2026` e `DOLP-RD-PA 00605/2026` têm `e3_status = RETIDO`,
   `material_conferido = NAO`, `trafos_material = 0` e `e3_motivo = "OBRA FORA DO EXPORT DE
   MATERIAL"` — a mesma configuração das 21 que ficam retidas como *sem prova de troca* — e
   ainda assim estão em `SAÍDA`, confirmadas como QUEIMADO. É a única divergência de conteúdo
   (não de rótulo) entre a regra da esteira e o dado. **Mexe no número da capa: 1.269 → 1.266.**
   Por isso não encostei.
2. **`resumo.duplicadas` = 1, campo `duplicada = SIM` em 3.** Só a `DOLP-RD-PA 00690/2026` tem
   `disputa_perdida = SIM` e `e1_conflito` preenchido; as outras duas (`ETO-RD-PS 00077/2026` e
   `ETO-RD-AG 00344/2026`) saíram por `sem_obra` e `remanejamento` e não perderam disputa
   nenhuma. O KPI mostra 1 e é defensável — mas o bloco `correcoes` do `metodo.json` continua
   dizendo "**São três casos** ... passaram a ser tratados como SS duplicada". Ou o texto ou o
   campo está velho; qual dos dois é decisão de quem escreveu a regra.
3. As quatro decisões que o roteiro protege (as 22 SS só com TMAE, as 89 com
   `QTD_CONS_INTER_FAT = 0`, as 2 exclusões por dano externo, e regra/limiares/dicionário)
   continuam intactas. Não achei argumento novo contra nenhuma.

### Manutenção dos testes (proposta, não aplicada)

- **Invariante 18 do script do repositório falha, e a falha é do teste.** Ele procura
  `className="header-meta"` e exige `listadas.length` nos 200 caracteres seguintes, mas o
  `page.tsx` tem hoje **cinco** blocos `header-meta` encadeados e o `re.search` só enxerga o
  primeiro — o do mês, que legitimamente mostra o total do mês. O ramo geral (linha 6350) usa
  `br(listadas.length)`, como o teste quer. Restringir a busca ao ramo padrão fecha a falha.
- **Invariante 19 não roda sem `openpyxl`.** Instalei a biblioteca só nesta sessão (fora do
  repositório, sem tocar em `package.json` nem no lockfile) e ele passa: **CONFERE**. Vale
  registrar no roteiro que esse invariante exige `openpyxl`, senão ele aparece como falha em
  toda execução limpa.
- **A seção 6 do `AUDITORIA_NOTURNA.md` precisa ser reescrita inteira**, não só nos números: a
  tabela das peneiras, a corrente, os blocos de fato/leitura/`e1_nivel` e os invariantes 2, 3,
  4, 5, 8, 9 e 10 descrevem o modelo anterior. Enquanto ela não for atualizada, toda execução
  vai abrir com 11 falhas, das quais 7 são ruído — e ruído dessa altura esconde as reais.
  Não reescrevi por dois motivos: em RELATO não se commita, e boa parte do texto descreve a
  **regra da esteira**, que o roteiro me proíbe de mexer.

### O que não consegui verificar

- **"perderia 61 casos legítimos"** (bloco `fato`) e os **"536 de 540"** (bloco `correcoes`):
  exigem reprocessar o cruzamento a partir das bases cruas com a regra anterior. Fora do que dá
  para provar contra o JSON.
- **Invariante 15 na largura toda.** Conferi a barra lateral, a cascata da Visão geral e os
  KPIs que saem de `arquivo()`/`conta()` — todos calculados dos `registros` em tempo de
  execução. Não abri a tela nem percorri os KPIs das 33 abas um a um; o script do repositório
  também marca este como "A OLHO", e continua sendo o buraco de cobertura mais largo dos 17.
- **O "121 / 21"** do bloco da leitura segue sem reprodução, como na rodada de 02/08. Não
  insisti: sem a definição original, trocar por um número medido seria inventar precisão.

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
