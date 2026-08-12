# Análise mensal — o que mandar e o que roda

Este diretório existe para que a análise de um mês novo não dependa de
reconstruir o contexto do zero. Mande os arquivos abaixo, rode um comando, e
saia com a planilha e o JSON.

## O que mandar

Quatro arquivos, numa pasta só:

| arquivo | o que é | formato |
|---|---|---|
| `BASE_SS_OS_parte1.txt` | base de SS e OS, parte 1 | separador `@`, 64 colunas |
| `BASE_SS_OS_parte2.txt` | base de SS e OS, parte 2 | idem |
| `Critica_MMAAAA.txt` | a Crítica do mês | separador `;`, 64 colunas |
| `infotrafo.xlsx` | opcional — a lista de SS de transformador | aba `Export` |

Não precisa mandar mais nada. TMAE, AIC de obras e KML entram só quando a
pergunta pedir — e o script diz na tela quando a ausência deles limitou alguma
conclusão.

## Como rodar

```bash
python3 rodar_mes.py 08/2026 --pasta /caminho/das/bases
python3 rodar_mes.py 08/2026 --pasta /caminho/das/bases --ate 10   # só até o dia 10
```

Saem dois arquivos: `analise_MM_AAAA.json` (para reprocessar) e o `.xlsx`
(para ler e decidir).

## O que o script decide e o que ele NÃO decide

Ele marca **ENTRA = SIM** só quando o caso casa na Crítica dentro da janela,
não tem suspeita de auxiliar e não tem nenhuma pendência. Todo o resto sai
como **PENDENTE**, com o motivo escrito na linha.

Ele **não** decide sozinho o que depende de informação de campo:

- se o reparo foi **cola e fita** (o campo `FEITO_COLA_E_FITA` quase nunca vem
  preenchido; o texto e a observação da Crítica é que denunciam)
- se **precisou substituir** — houve caso em agosto/2026 com interrupção
  casada em que a equipe fez melhoria e não trocou o transformador
- se o **auxiliar** está mesmo colado no religador — o script levanta a
  suspeita, a distância no KML confirma
- se conta um caso com **SS aberta antes da ocorrência**

Isso é martelo do dono. A planilha existe para ele bater com o caso na frente.

## As armadilhas que o carregador já resolve

Cada uma custou retrabalho. Estão codificadas em `base.py` para não voltarem.

**A codificação muda entre extrações.** A base de 10/08/2026 veio em `utf-8` e
a de 11/08/2026 veio em `latin-1`, com o mesmo nome de arquivo. O carregador
detecta.

**O texto tem quebra de linha no meio.** Ler linha a linha perde ~60% dos
registros — e não dá erro: você simplesmente conclui que a SS não existe. O
carregador junta linhas até fechar as 64 colunas e **confere o total** contra o
número de `@` do arquivo; se não fechar, ele estoura em vez de entregar
análise furada.

**As colunas de data da Crítica variam.** `DTA_INIC_ELE` e `DTA_FIM_ELE` vieram
**vazias** na extração de agosto/2026. Quem usa elas conclui "sem ocorrência"
para todo mundo. As datas boas são `DTA_ABERT` e `DTA_FECH`, e o carregador
recusa a extração se estiverem vazias.

**O ativo aparece em três papéis.** `COD_ELE_PROBLEMA`, `COD_ELE_INTERROMPIDO`
e `COD_ELE_FECHADO`. O casamento vale em qualquer um.

**Ausente da Crítica não é contraprova.** A ocorrência só entra quando
**finaliza**. Três casos de agosto/2026 apareceram como ausentes na extração de
10/08 e passaram a casar na de 11/08. Reprocesse o mês a cada extração nova.

**Prefixo 57 é transformador normal.** Responde por 97,6% das 1.305 de
jan–jun/2026. O auxiliar é o **51**. Confundir os dois transforma o mês inteiro
em falso positivo.

**A letra da plaqueta faz o mesmo equipamento virar dois.** A ITAM grava
`C233582` e a equipe digita `233582`. A função `chave()` tira letra das pontas
— mas a letra às vezes **distingue** unidades (`C249930` e `Z249930` são
transformadores diferentes), então fundir duas chaves iguais exige
corroboração de marca ou potência. É o que `mesma_peca()` faz.

**SS gêmea de repasse.** Duas SS com o mesmo timestamp ao segundo e o mesmo
texto, uma `REPASSADA` sem OS e outra `ATENDIDA` com OS, são o mesmo evento.
Contar as duas infla o indicador.

**A peça retirada conta uma história que o código do posto esconde.** O código
operativo é do POSTE e não muda quando o transformador muda. Se a peça retirada
numa SS é a mesma que foi instalada numa SS anterior, existe uma cadeia — e o
intervalo entre as duas datas é o tempo que aquela peça durou em campo. Foi assim
que apareceram, em julho/2026, dois transformadores instalados e retirados
queimados **onze dias depois**, os dois no polo de Gurupi. `cadeias_de_peca()`
levanta isso; `grau_de_garantia()` classifica.

Cuidado com o que essa regra promete: ela **não está validada**. Das 106 SS que a
base marca `GARANTIA DE TRAFO`, 95 não têm série na peça retirada e a regra não
tem como vê-las; das 11 restantes ela reencontrou 3, e essas 3 duraram **441 dias**
de mediana. Um corte de doze meses deixaria as três de fora. O prazo real tem de
vir do contrato. E a suspeita de que peça reformada falha mais rápido **não se
confirma**: 160 dias de mediana contra 182 da peça nova.

## Os arquivos

- `base.py` — carregador, janela, detector de auxiliar, gêmeas, chave de peça,
  cadeia da peça e grau de possível garantia
- `rodar_mes.py` — o comando do mês
- `planilha.py` — gera o `.xlsx` com Leia-me, Casos e Ocorrências da Crítica

## O que este kit não toca

As **1.305 de janeiro a junho de 2026 estão congeladas**. Nenhum script daqui
escreve em `public/fluxo-1510.json` nem em qualquer JSON publicado. A análise
mensal produz arquivo novo, sempre.
