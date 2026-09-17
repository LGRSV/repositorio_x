# Catálogo das bases da auditoria — 17/09/2026

Levantado por dois agentes extratores e conferido linha a linha pelo orquestrador.
As contagens são **linhas de dados**, já sem o cabeçalho.

## Bases em texto (separador `;`, codificação `iso-8859-1`)

| base | linhas | colunas | tamanho | Parquet estimado | coluna de data | período |
|---|---|---|---|---|---|---|
| Critica-CHEIO_01-2026.txt | 20.099 | 64 | 17.3 MB | 5.9 MB | DTA_ABERT (coluna 12) | 2026-01-01 a 2026-02-10 |
| Critica-CHEIO_02-2026.txt | 15.699 | 64 | 13.2 MB | 3.5 MB | DTA_ABERT (coluna 12) | 2026-02-01 a 2026-02-28 |
| Critica-CHEIO_03-2026.txt | 14.679 | 64 | 12.3 MB | 3.3 MB | DTA_ABERT (coluna 12) | 2026-03-01 a 2026-03-31 |
| Critica-CHEIO_04-2026.txt | 12.086 | 64 | 10.3 MB | 3.0 MB | DTA_ABERT (coluna 12) | 2026-04-01 a 2026-04-30 |
| Critica-CHEIO_05-2026.txt | 7.691 | 64 | 7.0 MB | 2.1 MB | DTA_ABERT (coluna 12) | 2026-05-01 a 2026-05-31 |
| Critica-CHEIO_06-2026.txt | 6.376 | 64 | 5.8 MB | 1.8 MB | DTA_ABERT (coluna 12) | 2026-06-01 a 2026-06-30 |
| Critica__082026_1.txt | 7.475 | 64 | 6.8 MB | 2.1 MB | DTA_ABERT (coluna 12) | 2026-08-01 a 2026-08-31 |
| TMAE_2026_Jan_Jun_Consolidado.txt | 62.616 | 40 | 27.5 MB | 6.6 MB | DTA_CMPT_TNT (coluna 1) | 2026-01-01 a 2026-06-01 |
| TMAE_072026_2.txt | 6.626 | 40 | 2.9 MB | 0.8 MB | DTA_CMPT_TNT (coluna 1) | 2026-07-01 a 2026-07-01 |
| TMAE_082026_1.txt | 6.717 | 40 | 2.9 MB | 0.8 MB | DTA_CMPT_TNT (coluna 1) | 2026-08-01 a 2026-08-01 |
| FIS_ETO_2026_07_E_TRANSFORMADORES_ID.csv | 96.037 | 52 | 37.5 MB | 10.2 MB | DATA_FABRICACAO (coluna 45) | 1021-12-26 a 9999-09-07 |

## Bases em Excel

| base | aba principal | linhas | colunas | tamanho | Parquet estimado |
|---|---|---|---|---|---|
| OS_STATUS_2026.xlsx | Dados | 78.840 | 30 | 15.9 MB | 7.2 MB |
| AIC_2026_12-09.xlsx | Export | 11.323 | 93 | 2.0 MB | 1.4 MB |
| Trafo.xlsx | BASE_SS_OS | 3.601 | 65 | 2.7 MB | 0.8 MB |
| Base_de_Expurgos_jan_ago_3_2.xlsx | Expurgos | 227 | 30 | 0.2 MB | 0.1 MB |
| analise_trafos_rurais_1125_e_150.xlsx | Trafos 112.5 e 150 rural | 16 | 29 | 2.4 MB | 0.0 MB |

## Total

| | linhas | tamanho hoje | em Parquet |
|---|---|---|---|
| texto | 256.101 | — | — |
| Excel | 94.007 | — | — |
| **soma** | **350.108** | **166.8 MB** | **49.9 MB** |

Convertida para Parquet, a auditoria inteira cabe em cerca de 49.9 MB: entra no
repositório, no plano gratuito de qualquer banco analítico e na faixa livre do BigQuery.

## Chaves e armadilhas confirmadas

- `BASE_SS_OS` do Trafo.xlsx: 3.601 linhas, 3.600 com número de SS preenchido, e
  **1.444 SS repetidas** (a segunda linha vem quase vazia). Ao montar dicionário por SS,
  fique com a linha mais preenchida. A aba `BASE SS_OS`, sem sublinhado, é a versão antiga
  de 1.694 linhas.
- `OS_STATUS_2026`: 1.057 números de obra repetidos, esperado — uma obra tem várias OS.
- `AIC`: nenhuma obra repetida; a primeira linha é o cabeçalho, e `max_row` do openpyxl a conta.
- O arquivo mensal da Crítica extrapola o mês: o de janeiro vai até 10/02.
- A data da TMAE na coluna 1 é competência, não atendimento.
- O FIS traz datas de fabricação entre 1021 e 9999.

Detalhe completo, com nomes de todas as colunas, em `contexto/<data>/arquivos/orquestra/`.
