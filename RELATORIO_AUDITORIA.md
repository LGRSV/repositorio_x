# Relatório da auditoria automática

## 18/08/2026, 00:28 UTC — MODO RELATO · o roteiro está velho, e há 3 defeitos reais no site

> **Reconferido às 03:06 UTC, depois que a `main` andou.** O PR #109 ("Os 72 de julho em
> grade e em arquivo baixável") entrou na `main` às 01:48 e mexeu em `page.tsx` (+120/−3) e
> `globals.css`. **Os três defeitos continuam de pé** e `Filtros_do_Site.xlsx` continua
> ausente do disco; `metodo.json` e `fluxo-1510.json` não foram tocados, então os seis números
> velhos seguem velhos. O que mudou foram **duas linhas citadas aqui**, já corrigidas no texto
> abaixo: o literal `1.305` saiu da linha 648 para a **730**, e o `PLACEHOLDER_TAM` saiu da
> linha 4231 para a **4320**, as duas em `app/page.tsx`. Invariantes rodados de
> novo contra o código novo: mesmo placar, 19 CONFERE · 1 FALHA (a 18, falso positivo) · 1 A
> OLHO. Build passa (`built in 7.67s`).
>
> Uma observação que o #109 reforça: as mensagens dele repetem treze vezes "não toca no
> 1.305", usando o número como **nome do conjunto**. Isso apoia a decisão de não renomear as
> 16 ocorrências e deixá-las para o dono.
>
> **Reconferido de novo às 14:00 UTC.** O PR #110 entrou na `main` às 13:18 e mexeu outra vez
> só em `page.tsx` (+38/−2) e `globals.css`. **Nada mudou de substância pela terceira vez:**
> os três defeitos continuam de pé, `Filtros_do_Site.xlsx` continua ausente do disco, e
> `metodo.json` e `fluxo-1510.json` seguem intactos. Uma única citação deslocou — o
> `PLACEHOLDER_TAM` foi da linha 4320 para a **4321**, já corrigido abaixo; a linha 730 do
> literal `1.305` não se moveu. Invariantes: mesmo placar de sempre, 19 CONFERE · 1 FALHA (a
> 18, falso positivo) · 1 A OLHO. Build passa (`built in 9.27s`).
>
> **Reconferido às 23:48 UTC, e desta vez o dado mudou.** O PR #111 entrou na `main` às 22:50
> e mexeu em `page.tsx`, no **`fluxo-1510.json`** (+583.221 linhas) e num script novo,
> `scripts/conferir_numeros.py`. **O crescimento do JSON é reformatação, não conteúdo:** o
> arquivo era minificado (0 quebras de linha) e passou a indentado (583.219). Mesmas cinco
> chaves de topo, mesmos 177 campos por registro, e **todos os números remedidos deram
> igual** — 1.269 SAÍDA, 220 EXCLUÍDA, 21 retidos, 1.198 + 71 confirmados, e os seis números
> da FALHA 14 (108 · 52 · 31 · 25 · 112 · dezessete) idênticos. `metodo.json` intacto, as
> linhas 730 e 4321 não se moveram, `Filtros_do_Site.xlsx` continua ausente. Invariantes e
> build: mesmo placar, `built in 8.43s`.
>
> **O #111 traz uma auditoria paralela, e vale ler junto.** O cabeçalho do
> `conferir_numeros.py` diz que "cinco auditores varreram o site em 18/08/2026 e acharam 40 e
> poucos números envelhecidos", todos corrigidos, e que o script é a guarda para o problema
> não voltar. Rodei: **passa** (`tudo bate: 6 frases conferidas + 6 invariantes`).
> **Mas os três defeitos deste relatório continuam de pé, e sobrevivem justamente porque
> estão fora do alcance dele.** A guarda lê só `app/page.tsx`, `fluxo-1510.json` e
> `aterramento.json`, e confere 6 frases nomeadas (corte do atendimento fora da janela,
> observação casada sem citar transformador, TMAE faltando na saída, `at_ini` copiado da
> ocorrência, os 77 ausentes, e o aterramento pela pior haste). Ela **não olha o
> `metodo.json`** (FALHA 14), **não olha a tela de login** (o `1.305` da linha 730) e **não
> confere existência de arquivo** (o `PLACEHOLDER_TAM` da linha 4321). Fechar esses três
> buracos na guarda é barato e evitaria a próxima rodada.
>
> **Reconferido às 01:52 UTC de 19/08, e este é o teste mais duro que os achados passaram.**
> O #112 entrou na `main` e trouxe, entre outras coisas, um commit chamado *"Rodada de
> verificação: 5 auditores, ~405 conferências, 33 correções"*. **Os três defeitos passaram
> intactos por essa varredura.** O literal `1.305` continua na tela de login (agora na linha
> **763**), o `PLACEHOLDER_TAM` continua anunciando um arquivo que não existe (agora na linha
> **4362**), `Filtros_do_Site.xlsx` continua fora de `public/bases/`, e `metodo.json` e
> `fluxo-1510.json` não foram tocados — os seis números velhos seguem velhos. Invariantes,
> `conferir_numeros.py` e build: todos no mesmo lugar (`built in 14.15s`).
>
> Isso reforça o parágrafo acima em vez de contradizê-lo: duas rodadas de auditoria humana
> (~40 números numa, ~405 conferências e 33 correções na outra) e uma guarda automatizada
> passaram por cima dos mesmos três pontos. Não é descuido de quem varreu — é que **os três
> moram fora do que qualquer uma dessas varreduras olha**: um arquivo que não é lido
> (`metodo.json`), uma tela que não é varrida (o login) e uma classe de defeito que não é
> testada (link para arquivo inexistente).

**Modo: `RELATO`.** O comando que me acordou pedia push. O `AUDITORIA_NOTURNA.md` diz
`MODO = RELATO` e manda o arquivo valer mais do que o comando. **Obedeci o arquivo: nada foi
commitado, nada foi publicado.** Só este relatório foi escrito no diretório de trabalho. Os
diffs exatos do que eu teria mudado estão no fim.

**Placar: 18 conferem · 3 falham · 1 a olho, de 21** (o script do repositório tem 21
invariantes; o roteiro descreve 17 — a numeração abaixo segue a do roteiro).

### O achado que manda em todos os outros: o roteiro descreve um site que não existe mais

A seção 6 do `AUDITORIA_NOTURNA.md` diz medir o estado atual da `main`. Não mede. **Nenhum
dos números dela bate, e a diferença não é drift — é outro regime.**

| | Roteiro diz | Medido hoje |
|---|---|---|
| Saída confirmada | 884 = 856 queimados + 28 avariados | **1.269 = 1.198 + 71** |
| Decisão da esteira | INCLUIR 884 · REVISÃO 617 · EXCLUIR 9 | **INCLUIR 1.269 · REVISÃO 21 · EXCLUIR 220** |
| Baldes da cascata | 7 | **3** (`SAÍDA`, `EXCLUÍDA`, `RETIDO — SEM PROVA DE TROCA`) |
| Fato | F1 1.259 · F3 206 · F2 22 · F0 20 · FD 3 | **F1 1.324 · F3 173 · F0 13** (F2 e FD não existem) |
| `e1_nivel` | A 1.000 · B 279 · C 3 · FORA 91 · SEM 137 | **A 1.140 · B 197 · FORA 71 · SEM 102** (C não existe) |
| Decisão da matriz | 1.262 / 184 / 64 | 1.262 / 184 / 64 — **o único bloco que bate** |

O `AUDITORIA_NOTURNA.md` foi editado pela última vez em `d17e949` (05/08). O
`fluxo-1510.json` mudou em cinco commits **depois** disso (`#60`, `#61`, `#62`, `#67`, `#68`).
Já em `d17e949` o dado era 1.269 — ou seja, a seção 6 **já estava velha quando o roteiro foi
escrito**. O clone é raso (69 commits), então não consegui achar o commit em que 884 existiu;
o comentário do invariante 19 no script do repositório confirma que 884 foi real um dia.

**Consequência prática:** a seção 5 (regra da esteira), a seção 6 inteira, o invariante 8 e as
lacunas conhecidas descrevem o regime antigo. Conferi o site contra **o dado**, não contra o
roteiro. Quem for atualizar o roteiro precisa reescrever a seção 6 com os valores acima.

### Os 17 invariantes, um a um

| # | Resultado | Medido |
|---|---|---|
| 1 | **CONFERE** | 1.510 registros, 1.510 `ss` distintos, 0 duplicados |
| 2 | **CONFERE** | SAÍDA 1.269 + EXCLUÍDA 220 + RETIDO SEM PROVA 21 = 1.510 |
| 3 | **CONFERE** | 1.510 − 220 = 1.290 = `chega_e1/e2/e3`; 1.290 − 21 = 1.269 = SAÍDA. *(Minha primeira versão falhou porque eu apliquei a corrente de 4 passagens do roteiro, que pressupõe 7 baldes. Teste meu errado, não o site.)* |
| 4 | **CONFERE** | 0 divergências, com 57 vereditos do dono fora da conta. *(Falhava no meu teste em 3 casos — os três são "o dono martelou queimado", override explícito, não defeito.)* |
| 5 | **CONFERE** | INCLUIR↔SAÍDA, EXCLUIR↔EXCLUÍDA, resto REVISÃO: 0 fora do casamento |
| 6 | **CONFERE** | 1.198 QUEIMADO + 71 AVARIADO = 1.269 = SAÍDA; 0 preenchidos fora da saída |
| 7 | **CONFERE** | 7 blocos e 4 totais batem. *(Meu teste acusou `duplicadas` 1 vs 3: o `resumo` conta `expurgo_gatilho == "duplicada"` (1), eu contei `duplicada == "SIM"` (3). Definições diferentes, resumo internamente coerente — teste meu errado. Fica a observação: dois campos com o mesmo nome e contagens diferentes é armadilha para o próximo leitor.)* |
| 8 | **CONFERE** | 0 violações. *(Meu teste achou 16. Nos 16 a ocorrência **começa depois** da abertura da SS — 16 de 16, conferido. A janela real do site é assimétrica: 1h antes do primeiro passo até 24h depois do último. O invariante 8 escrito no roteiro não tem a cláusula de direção e por isso é mais rígido que o site. Teste do roteiro errado.)* |
| 9 | **CONFERE** | 3 disputas, cada uma com exatamente 2 SS; o dono é o de menor `\|oc_dist_h\|`; 3 perdedores marcados `duplicada=SIM`, 0 fora da exclusão. **Ressalva medida:** dos 3 perdedores só **1** tem `e1_conflito` e `disputa_perdida=SIM` preenchidos (`DOLP-RD-PA 00690/2026`); `ETO-RD-PS 00077/2026` e `ETO-RD-AG 00344/2026` estão sem os dois. Não é falha do invariante como o site o define, mas é inconsistência interna do dado. Registrada, não corrigida — é dado gerado por script. |
| 10 | **CONFERE** | `expurgo=SIM` 220 ↔ cascata EXCLUÍDA 220, diferença simétrica 0 |
| 11 | **CONFERE** | 123 marcadas (24 `borda_2025` + 99 `tmae_gap_jan`), 0 sem `lacuna_base` |
| 12 | **CONFERE** | 0 ocorrências de `[ÃÂ][\x80-\xBF]` em `page.tsx`, `MapaAtivos.tsx`, `metodo.json` e em 12 campos de texto dos 1.510 registros |
| 13 | **CONFERE** | 31 módulos distintos entre `NAV` (21 itens) e `NAV_OFICINA` (11 itens — `decisao` aparece nos dois); 31 chaves em `RECORTES`; 31 no tipo `Modulo`. 0 faltando nos dois sentidos |
| 14 | **FALHA** | 6 números velhos no `metodo.json`. Detalhe abaixo |
| 15 | **FALHA** | `page.tsx:763` renderiza "1.305 queimados e avariados" — o dado diz 1.269. Detalhe abaixo |
| 16 | **CONFERE** | `dataBR` converte aaaa-mm-dd→dd/mm/aaaa e preserva hora; 0 literais ISO renderizados; o histórico do ativo já vem em dd/mm/aaaa no JSON, então o `{x.d}` cru está certo |
| 17 | **FALHA** | `Filtros_do_Site.xlsx` é oferecido para download, não existe em disco, e anuncia o tamanho como o literal `PLACEHOLDER_TAM`. Detalhe abaixo |

Invariantes extras do script do repositório: **18 FALHA** (falso positivo, provado abaixo),
**19 CONFERE** (destravado nesta rodada), **20 CONFERE** (57 vereditos, 0 divergências).

### FALHA 17 — o site oferece um arquivo que não existe

`app/page.tsx:4362` lista `Filtros_do_Site.xlsx` na aba **Bases**, com descrição completa, e
o tamanho escrito como **`"PLACEHOLDER_TAM"`** — que é o que aparece na tela. O arquivo não
está em `public/bases/`, não está no `.gitignore` e nunca foi commitado. O gerador existe
(`scripts/gerar_planilha_filtros.py`) e nunca rodou para valer.

**Efeito:** na apresentação à alta direção, um cartão de download com a palavra
`PLACEHOLDER_TAM` no lugar do tamanho, e o clique dá 404. É o defeito mais visível dos três.

Os outros 16 arquivos anunciados existem e o tamanho bate — **respeitada a diferença de
unidade**: `Base_*` em MB decimal, `Original_*` em MiB. Uma exceção conferida com cuidado:
`Bases_Gerais.xlsx` anuncia 2,4 MB e tem 2.534.008 bytes = 2,53 MB decimal ou **2,42 MiB**.
Só ele é grande o bastante para distinguir as duas escalas, e ele bate em MiB — o contrário
do que o roteiro afirma sobre as `Base_*`. O arquivo não mudou de tamanho em todo o histórico
disponível. **Não mexi: a dúvida sobrou.**

### FALHA 14 — seis números velhos no `metodo.json`

A aba Método imprime o `metodo.json` como está. Todos os seis estão no bloco `cascata`.

**a) `blocos[5].paragrafos[0]` — a soma não fecha dentro da própria frase.** Ela diz que saem
220 pela porta e que elas se dividem em "137" + "103" = **240**. Medido: **108 + 112 = 220**.

| Diz | Mede |
|---|---|
| primeira família, 137 casos | **108** (`sem_interrupcao` 77 + `fora_da_janela` 31) |
| 47 sem aparecer na Crítica em papel nenhum | **52** (`censo_critica = AUSENTE`) |
| 83 com defeito no próprio código em outra data | **31** (`censo_critica = DEFEITO EM OUTRA DATA`) |
| 7 sem rastro em base alguma | **25**, e não é "sem rastro": é `SEM DEFEITO NELE` — aparecem só como interrompidos ou manobrados |
| segunda família, 103 casos | **112** |
| "mais dezoito categorias menores" | **dezessete** (21 categorias na família 2, menos as 4 nomeadas) |

O 52 / 31 / 25 não é invenção minha: é exatamente a divisão que o próprio `page.tsx` já
escreve na descrição do `Sem_Interrupcao_Critica.xlsx` ("os 52 que não aparecem na Crítica em
papel nenhum dos 25 que aparecem só como interrompidos ou manobrados", mais 31). **A tela
calculada e a aba Método estão contando histórias diferentes sobre o mesmo conjunto.**

**b) `blocos[5].tabela`, linha 2** — "1.134 corroboram, 135 sem registro". Medido nas 1.290
que a própria linha diz receber: **1.126 CORROBORA · 132 SEM REGISTRO · 32 com o campo
vazio**. Nenhum recorte do dado (1.510, 1.290 ou 1.269) produz 1.134/135.

**c) `blocos[5].tabela`, linha 3** — "18 deles só esperam a extração do SIAGO". Medido:
**19** dos 21 têm `pendente_siago = SIM`.

**d) `blocos[5].tabela`, linha 4 e `paragrafos[3]`** — "76 chegam à saída com a ressalva
escrita ao lado", nos dois lugares. Medido: **83** registros na SAÍDA com `ressalvas`
preenchido.

**O que NÃO falhou no `metodo.json`:** a tabela da cascata nas colunas Recebe/Passa
(1.510→1.290→1.269) bate; a frase de resultado do bloco `correcoes` está **atual** — diz
"1.269 confirmados — 1.198 queimados e 71 avariados", exatamente o dado. A FALHA 14 fechada
em 02/08 não voltou; estes são outros números, que o teste do repositório não cobre.

### FALHA 15 — a tela de entrada anuncia 1.305, a barra lateral calcula 1.269

`app/page.tsx:763`, na tela de login, antes de qualquer coisa:

> `1.305 queimados e avariados de janeiro a junho de 2026, mais julho e agosto em prévia`

É literal escrito à mão. A barra lateral da mesma aplicação calcula `naSaida` dos registros e
mostra **1.269**. A versão congelada `public/versoes/2026-08-11/` também traz 1.269, e
`Base_Esteira_Completa.xlsx` também. **Nenhum recorte do dado atual dá 1.305.**

Os percentuais que o `metodo.json` cita ao lado de "as 1.305" fecham com o conjunto de
**1.269**: prefixo 57 = 97,6% (1.238/1.269), 53 = 2,2%, 52 = 0,2% — o texto diz 97,6% / 2,1%
/ 0,2%. Ou seja, o número envelheceu e os percentuais ao lado dele foram recalculados.

**Onde parei de propor mudança:** "1.305" aparece **17 vezes em texto que vai para a tela**
(fora de comentário). Dezesseis delas usam o número como **nome próprio do conjunto**, e
várias estão dentro de frases que são ordem do dono — "Ordem dele: regras e método podem
mudar, mas os 1.305 não", "os 1.305 não se movem", "não soma com as 1.305, que continuam
congeladas". Renomear isso é mexer em decisão do dono, item 4 da lista do que eu não posso
tocar. **Proponho corrigir só a linha 763**, que é a única afirmação puramente factual sobre
a contagem, e deixo as outras 16 para a palavra dele. Se o conjunto de 1.305
existe de verdade e o `fluxo-1510.json` perdeu 36 casos, isso é maior que um número de texto e
precisa dele.

### FALHA 18 (script do repositório) — é o teste que está errado, não o site

`scripts/auditoria_invariantes.py:420` procura `listadas.length` nos 200 caracteres seguintes
ao **primeiro** `className="header-meta"`. Hoje há dois: a variante de mês (`page.tsx:5854`,
que usa `mes.resumo.entram`, e está certa) vem antes da geral (`page.tsx:5855`, que usa
`br(listadas.length)`, e está certa também). O regex acha a primeira e reprova.

**O contador do cabeçalho está correto.** Só o teste precisa de conserto.

### FALHA 19 destravada

Estava em "não deu para abrir a planilha — `openpyxl` não instalado". Instalei o `openpyxl`
no ambiente (`pip`, fora do repositório — **nenhuma dependência nova em `package.json` ou nos
lockfiles**, a regra do `--frozen-lockfile` está intacta) e o invariante passou:
`Base_Esteira_Completa.xlsx` tem 1.510 linhas, saída 1.269, 1.198 queimados + 71 avariados —
igual ao `fluxo-1510.json`. **A planilha de download está sincronizada com o site.**

### Deixado para o dono, não tocado

1. As **4 decisões do dono** da seção "o que você NÃO pode mexer" — não encontrei argumento
   novo em nenhuma delas nesta rodada.
2. **`e1_conflito` faltando em 2 dos 3 perdedores de disputa** (invariante 9). É dado gerado
   por script; preencher à mão seria editar derivado.
3. **`Bases_Gerais.xlsx` em MiB** quando o roteiro diz que as `Base_*` são MB decimal.
4. **As 16 ocorrências de "1.305" como nome do conjunto** (FALHA 15).
5. **O `AUDITORIA_NOTURNA.md` inteiro** — a seção 6, a regra da seção 5, o invariante 8 e as
   lacunas conhecidas descrevem o regime antigo. O roteiro autoriza corrigi-lo ("corrija este
   arquivo junto"), mas reescrever a seção 6 em `RELATO` sem o dono ver a divergência primeiro
   me pareceu errado: é o documento que decide o que o próximo agente vai fazer. **A tabela do
   topo deste relatório é o material pronto para isso.**
6. **A lacuna de dezembro de 2025 foi fechada e o roteiro não sabe.** O `lacuna_base` dos
   registros marcados hoje diz "dezembro agora está no acervo. A ocorrência foi encontrada
   lá" — o roteiro ainda a lista como lacuna aberta.

### Não consegui verificar

- **Invariante 15 na íntegra.** Conferi todo o `NAV`/`NAV_OFICINA` (todos os 31 rótulos são
  calculados dos registros em tempo de execução — nenhum literal) e varri o `page.tsx` atrás
  de literais com separador de milhar. Achei o de `:763`. Os outros 62 resultados da varredura
  são falsos positivos (`3600000`, trechos de prosa, `62.616` da base do TMAE). **Não há
  garantia automática de que não sobrou um literal em texto corrido** — o script do repositório
  também marca este como "A OLHO".
- **O regime de 884.** Clone raso; não deu para achar o commit em que ele existiu nem o que o
  substituiu.

### Verificação

`pnpm install --frozen-lockfile && pnpm run build:pages` **passa** (built in 558ms, 0 erros).
`python3 scripts/auditoria_invariantes.py`: 19 CONFERE, 1 FALHA (a 18, falso positivo), 1 A
OLHO. **Nada foi commitado. `git status` está limpo.**

### Os diffs exatos que eu teria aplicado, em `CORRIGE`

**1 — `public/metodo.json`, `blocos[5].paragrafos[0]`** (um commit: *"o parágrafo da porta
volta a somar 220"*)

```diff
-Saem por ali 220 solicitações, e elas se dividem em duas famílias que convém não misturar. A primeira, com 137 casos, é de quem não tem interrupção que sustente o caso: 47 cujo código não aparece na Crítica em papel nenhum nos sete meses do acervo, 83 que aparecem com defeito no próprio código mas em outra data, e 7 que não deixaram rastro em base alguma, nem pelo teste do vizinho. A segunda, com 103 casos, é de quem tem causa ou documento fora do indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes internos, e mais dezoito categorias menores, cada uma com o motivo escrito na linha.
+Saem por ali 220 solicitações, e elas se dividem em duas famílias que convém não misturar. A primeira, com 108 casos, é de quem não tem interrupção que sustente o caso: 52 cujo código não aparece na Crítica em papel nenhum nos sete meses do acervo, 31 que aparecem com defeito no próprio código mas em outra data, e 25 que aparecem só como interrompidos ou manobrados, sem defeito aberto neles. A segunda, com 112 casos, é de quem tem causa ou documento fora do indicador — 30 furtos, 16 obras nunca geradas, 11 remanejamentos, 7 tapes internos, e mais dezessete categorias menores, cada uma com o motivo escrito na linha.
```

**2 — `public/metodo.json`, `blocos[5].tabela.linhas`** (mesmo commit)

```diff
-['2 · Deslocamento (marcador)', '1.290', '1.290', '0 — não retém: 1.134 corroboram, 135 sem registro']
+['2 · Deslocamento (marcador)', '1.290', '1.290', '0 — não retém: 1.126 corroboram, 132 sem registro e 32 sem o campo preenchido']
-['3 · SS e OS com material', '1.290', '1.269', '21 sem prova de troca — e 18 deles só esperam a extração do SIAGO']
+['3 · SS e OS com material', '1.290', '1.269', '21 sem prova de troca — e 19 deles só esperam a extração do SIAGO']
-['4 · Ressalva da interrupção', '1.269', '1.269', '0 — a ressalva virou marcador: 76 chegam à saída com ela escrita']
+['4 · Ressalva da interrupção', '1.269', '1.269', '0 — a ressalva virou marcador: 83 chegam à saída com ela escrita']
```

**3 — `public/metodo.json`, `blocos[5].paragrafos[3]`** (mesmo commit)

```diff
-São 76 solicitações que chegam à saída com a ressalva escrita ao lado, filtrável, porque quem for defender o número precisa saber quais são.
+São 83 solicitações que chegam à saída com a ressalva escrita ao lado, filtrável, porque quem for defender o número precisa saber quais são.
```

**4 — `app/page.tsx:763`** (commit próprio: *"a tela de entrada para de anunciar 1.305"*)

```diff
-      <small>1.305 queimados e avariados de janeiro a junho de 2026, mais julho e agosto em prévia</small>
+      <small>1.269 queimados e avariados de janeiro a junho de 2026, mais julho e agosto em prévia</small>
```

**5 — `app/page.tsx:4362`** (commit próprio: *"a aba Bases para de oferecer arquivo que não
existe"*). Duas saídas, e **a escolha é do dono** — por isso não apliquei nem em `CORRIGE`
sem a palavra dele:

- *(a)* rodar `scripts/gerar_planilha_filtros.py`, commitar o `.xlsx` e trocar
  `"PLACEHOLDER_TAM"` pelo tamanho real; ou
- *(b)* remover a linha até o arquivo existir:

```diff
-        ["Filtros_do_Site.xlsx", "Todos os filtros do site, aba por aba", "Cada filtro de cada tela com quantos casos tem e o que significa, mais a tabela longa filtro × SS de onde sai qualquer tabela dinâmica, e uma aba de dimensões com uma linha por solicitação. A composição de cada filtro não é recalculada: um robô abre o site, clica filtro por filtro e baixa a planilha de cada um — o que está aqui é o que a tela mostra, porque veio dela.", "PLACEHOLDER_TAM"],
```

**6 — `scripts/auditoria_invariantes.py:419-422`** (commit próprio: *"o invariante 18 para de
reprovar o cabeçalho certo"*)

```diff
-cab = re.search(r'className="header-meta".{0,200}', page, re.S)
-if not cab or "listadas.length" not in cab.group(0):
+cabs = re.findall(r'className="header-meta".{0,200}', page, re.S)
+if not any("listadas.length" in c for c in cabs):
     p18.append('o contador do cabeçalho não usa listadas.length: ele anuncia um número '
                'diferente do que a tabela abaixo mostra')
```

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
