# Contagens — auditoria SS x Crítica (analista independente A)

Recorte: NUM_TRAFO com 10 dígitos e prefixo 42/52/53/57; DATA_ABERTURA_SS entre 01/01/2026 e 31/07/2026.

## Total

- SS no recorte: **3357**

## Por resultado

| resultado | SS | % |
|---|---:|---:|
| CASOU PELO TRAFO | 1772 | 52.8% |
| TRAFO FORA DA JANELA | 930 | 27.7% |
| CASOU PELA CHAVE GÊMEA | 6 | 0.2% |
| CHAVE GÊMEA FORA DA JANELA | 12 | 0.4% |
| AUSENTE — nem trafo nem chave | 490 | 14.6% |
| AUSENTE pelo trafo — chave não conferível | 112 | 3.3% |
| SEM CRÍTICA — não conferível | 35 | 1.0% |

## Por fonte

| fonte | SS |
|---|---:|
| critica jan-jun | 3057 |
| julho-2026.json | 265 |
| sem critica | 35 |

## Mês x resultado

| mês | CASOU PELO TRAFO | TRAFO FORA DA JANELA | CASOU PELA CHAVE GÊMEA | CHAVE GÊMEA FORA DA JANELA | AUSENTE — nem trafo nem chave | AUSENTE pelo trafo — chave não conferível | SEM CRÍTICA — não conferível | total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 01/2026 | 480 | 141 | 2 | 2 | 80 | 0 | 0 | 705 |
| 02/2026 | 378 | 148 | 1 | 3 | 78 | 0 | 0 | 608 |
| 03/2026 | 357 | 145 | 1 | 2 | 70 | 0 | 0 | 575 |
| 04/2026 | 212 | 172 | 1 | 2 | 74 | 0 | 0 | 461 |
| 05/2026 | 129 | 142 | 0 | 2 | 89 | 0 | 0 | 362 |
| 06/2026 | 118 | 127 | 1 | 1 | 99 | 0 | 0 | 346 |
| 07/2026 | 98 | 55 | 0 | 0 | 0 | 112 | 35 | 300 |

## Por TIPOSS

| TIPOSS | SS |
|---|---:|
| FORMS SUBST DE TRANSFORMADOR | 1660 |
| MELHORIA POSTO DE TRANSFORMAÇÃO | 593 |
| FORMS SUBST DE POSTES | 415 |
| AVISO DE ANOMALIA | 392 |
| NOTA DE SERVIÇO (NS) - LINHA VIVA | 133 |
| SOLICITAÇÃO DE SERVIÇO | 81 |
| PM TRANSFORMADOR | 56 |
| AVISO DE CADASTRO | 20 |
| NOTA DE SERVIÇO (NS) - PODA | 2 |
| AJUSTES DE PROTEÇÃO | 1 |
| CLUSTER | 1 |
| ANOMALIA EM RELIGADOR | 1 |
| FORM DE NS | 1 |
| EM OPERAÇÃO COM ANOMALIA | 1 |

## Leitura da Crítica (jan-jun)

| arquivo | linhas de dados | passos lidos | ocorrências distintas | linhas c/ ';' extra (juntadas na OBSERVACAO) | linhas descartadas (campos a menos) |
|---|---:|---:|---:|---:|---:|
| Critica-CHEIO_01-2026.txt | 20099 | 20099 | 14030 | 0 | 0 |
| Critica-CHEIO_02-2026.txt | 15699 | 15699 | 11318 | 0 | 0 |
| Critica-CHEIO_03-2026.txt | 14679 | 14679 | 10518 | 0 | 0 |
| Critica-CHEIO_04-2026.txt | 12086 | 12086 | 8853 | 0 | 0 |
| Critica-CHEIO_05-2026.txt | 7691 | 7691 | 5677 | 0 | 0 |
| Critica-CHEIO_06-2026.txt | 6376 | 6376 | 4787 | 0 | 0 |
| **TOTAL** | 76630 | 76630 | 54205 (globais, sem repetir entre meses) | 0 | 0 |

## Anomalias dos dados

- Base SS/OS: 9297 linhas de dados; 0 com número de colunas != 64.
- NUM_TRAFO vazio: 133 linha(s). NUM_TRAFO malformado (não são 10 dígitos): 446 linha(s).
- DATA_ABERTURA_SS inválida dentro do recorte de prefixo: 0.
- SS duplicadas no recorte (contadas uma vez): 0.
- Prefixos de 10 dígitos descartados (fora de 42/52/53/57), top 12: 03=1592, 79=1332, 88=1171, 33=323, 40=266, 58=208, 90=174, 31=106, 59=56, 68=46, 02=38, 41=15.
- Crítica: passos com DTA_ABERT inválida/vazia: 0; com DTA_FECH inválida/vazia: 22 (ocorrência em aberto — usa-se o outro extremo).
- Cabeçalho de janeiro traz QTD_IFEC_COEC/QTD_IDEC_POLO em posição diferente dos demais meses; o mapeamento é feito por nome, então não afeta as colunas usadas.
- Julho: crítica bruta indisponível; 300 SS de julho no recorte, das quais 265 resolvidas pelo julho-2026.json, 0 casadas já nos arquivos de junho e 35 sem cobertura.
- Carryover jun->jul verificado: os arquivos de junho vao ate DTA_FECH 01/07/2026 17:43, mas nenhuma SS de julho do recorte cai na janela [inicio-1h, fim+24h] de uma ocorrencia de jan-jun (0 casos) — por isso julho depende inteiramente do julho-2026.json.
- Nenhuma linha da Critica veio com numero de campos diferente de 64: as aspas soltas nao quebraram o split por ';' (nenhum registro tem ';' na OBSERVACAO nem quebra de linha).
- Criterio de desempate: havendo varias ocorrencias na janela, escolhe-se a de |abertura - inicio| minimo; fora da janela, a de menor distancia ate a borda.
