# Pendências e fios soltos da auditoria

Anotações do que ficou aberto, para retomar depois. Cada item diz o que já se sabe,
o que falta e onde estão os dados.

---

## 1. As 266 substituições de transformador fora do universo da auditoria

**O que é.** O arquivo `1 - OS_STATUS.xlsx` (Drive do João, 538.985 OS, coluna Q = ELEMENTO
= código operativo do ativo) tem 9.006 ordens de "MC - SUBSTITUIÇÃO DE TRANSFORMADOR",
das quais 2.029 executadas em 2026. Separando por onde caem:

| Onde | Quantas |
|---|---|
| ativo das 1.305 / 1.510 | 1.668 |
| ativo de julho ou agosto | 107 |
| **outro ativo, fora de tudo que a auditoria olhou** | **266** (227 ativos distintos) |

Das 266: **102 têm OS que não existe na base SS/OS** e **58 estão em ativo que nunca teve
SS nenhuma**.

**O que falta decidir.** Substituição não é sinônimo de queima. A origem dessas OS é
"EQM PROGRAMADA" / "EQM EXECUTADA" — manutenção programada, e todas têm obra vinculada.
Muitas devem ser recapacitação, remanejamento ou troca preventiva, e nesses casos é
correto estarem fora do indicador.

**Como separar as duas hipóteses:**
1. Ler a `DESCRICAO_OS` das 266 e contar quantas falam em queima, defeito ou emergência
   contra ampliação, recapacitação ou melhoria.
2. Cruzar com a movimentação por obra (`/tmp/mov_obra.json` na sessão; campo `motivo`,
   que registra "queimado" na retirada).
3. Cruzar a obra (`NUM_OBRA`) com a base de obras do SIGCO para ver a classe do serviço.

**Se aparecer queima nesse grupo**, é caso que deveria estar no indicador e não está.
Se for tudo planejado, o achado vira outro: o parque tem movimentação relevante fora do
radar da auditoria.

**Dados.** A lista das 266 ficou em `/tmp/subs.json` (chave `fora`) na sessão de 23/08/2026.
Se o container tiver sido reciclado, refazer é rápido: baixar o OS_STATUS, filtrar
`DESCESQUEMA` contendo "SUBSTITUIÇÃO DE TRANSFORMADOR", `SITUACAO = EXECUTADA`, ano 2026,
e excluir os ativos dos 1.510 e de julho/agosto.

---

## 2. Outros fios abertos

- **Data da NF de retorno** (relatório de garantia do almoxarifado). É o único dado que
  separa 6 garantias de 2026 de 6 devoluções antigas — o grupo B do
  `Garantias_2026_NF_Retorno.xlsx`. Pedir ao almoxarifado junto com a data de entrada em
  estoque.
- ~~**FIS** — o cadastro com potência, marca e data de instalação por ativo.~~
  **ATENDIDO em 24/08/2026.** Ele subiu a extração oficial do parque:
  `FIS_ETO_2026_07_E_TRANSFORMADORES_ID.csv`, 96.037 transformadores de julho/2026,
  52 colunas. Lida por `scripts/gerar_cadastro_fis.py`, que grava o parque da Energisa
  em `dados/fis-2026-07-energisa.json.gz` e o recorte da auditoria em
  `public/cadastro-fis.json` (aba 13·1 do site). **O filtro de particular é a coluna
  `PROPRIETARIO`, não o prefixo 56** — os dois discordam em 206 ativos, e seis dos
  particulares têm prefixo 57.

  O que a extração não preenche, **contado sobre os 92.424 da Energisa** (o arquivo
  inteiro tem números um pouco maiores, e misturar as duas bases foi um erro da primeira
  redação desta nota): capacidade do elo lado carga em **348** (0,38%) — para elo a fonte
  boa continua sendo o KMZ da Rede de Distribuição, com 53,6%; fabricante conhecido em
  **23.276** (25,2%); número de série não zerado em **25.574** (27,7%); tombamento em
  **101** (0,11%). Coordenada, essa sim, em 100%.

  Idade do parque ainda não dá para medir: `DATA_FABRICACAO` vem `01/01/2000` em
  **67.927 dos 92.424** (73,5%), que é preenchimento padrão e não data real. Os 26,5%
  restantes trazem data plausível e servem para um recorte, não para o parque.

  Defeitos de cadastro achados na conferência, que valem para qualquer regra baseada em
  código: **um código operativo duplicado** (`5700339055`, Araguacema, 10 kVA — as duas
  linhas diferem só em `CONJUNTO`, 16699 vs 16713); **50 códigos fora do padrão de 10
  dígitos**, de 1 a 9 caracteres, entre eles `ETO281447`, `HM510096T`, `XX49331014` e um
  que é literalmente o caractere `1`; e **155 códigos de prefixo alfabético** (`PA`, `GE`,
  `T1`–`T4`, `AU`, `UC`), dos quais 149 são Particular — são entradas de consumidor e
  subestações de cliente, incluindo quatro de 5 MVA e uma de 10 MVA, cadastradas como
  "TD - Distribuição".
- ~~**Cobertura dos KML** — 176 alimentadores mapeados contra 721 citados na base SS/OS.~~
  **ATENDIDO em 23/08/2026.** A árvore KMZ da Rede de Distribuição ETO (Drive, pasta
  pública) cobre 111 subestações e ~721 alimentadores, com cinco camadas por circuito.
  Baixados até agora só os 51 alimentadores dos casos de julho; o resto se baixa por
  recorte com `scripts/kmz_fis.py` da skill.
- **166 reguladores de tensão sem estudo de ajuste** na planilha de ajustes e controle
  (que só tem religador e relé de subestação), mais 668 religadores sem estudo registrado.
  Confirmar se existe outro controle para regulador antes de tratar como lacuna.
- **11 divergências de data de fabricação** em julho (campo × texto da OS), sendo 3
  apontando 2026 no campo. Corrigir antes de reprocessar idades.
- **40 divergências de potência** nas 1.404 SS, onde os textos da SS e da OS concordam
  entre si e o campo `POTENCIA_RET` discorda. Movem casos entre as faixas de 5 e 10 kVA.
- **Detector de SS gêmea** casa por `NUM_TRAFO` idêntico e não enxerga gêmeas em códigos
  diferentes no mesmo ponto. Em julho não custou nada (nenhum par entrou duas vezes), mas
  é furo latente. Ampliar a regra para casar por coordenada + hora de abertura.
