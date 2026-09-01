# De onde vem cada tela

O site não guarda número no código. Cada tela lê um JSON de `public/`, e cada JSON sai de
um gerador de `scripts/`. `python3 scripts/atualizar.py --listar` imprime este mapa já
conferido contra o disco — a tabela abaixo é o resumo estável.

## Os conjuntos

| Arquivo | O que é | Estado |
|---|---|---|
| `fluxo-1510.json` | 1.510 SS de janeiro a junho de 2026 | **congelado** — entrada, nunca saída |
| `fluxo-1582.json` | jan–jun (cópia fiel) + julho traduzido para as peneiras | **o que o site lê** — derivado dos dois vizinhos |
| `julho-2026.json` | 72 do recorte de julho + 345 do entorno | prévia, decisão da régua |
| `agosto-2026.json` | 27 do recorte de agosto + 59 do entorno | aberto e parcial |
| `cadastro-fis.json` | cadastro FIS do parque, extração de julho | leitura ao lado do caso |
| `revisao.json` | revisão caso a caso, com os dois revisores | — |

## O que 1.582 é

Universo de **solicitações** de janeiro a julho: 1.510 + 72. **Não é o indicador.** O
indicador de jan–jun continua 1.305. A esteira inteira do site roda sobre ele:

| Cascata | jan–jun | julho | total |
|---|---|---|---|
| SAÍDA (queimados e avariados) | 1.269 | 55 | 1.324 |
| EXCLUÍDA (expurgos) | 220 | 0 | 220 |
| RETIDO — SEM PROVA DE TROCA | 21 | 0 | 21 |
| RETIDO — SEM INTERRUPÇÃO NA JANELA (prévia) | 0 | 15 | 15 |
| RETIDO — RESSALVA DA INTERRUPÇÃO (prévia) | 0 | 2 | 2 |

Julho: 55 casaram na Crítica sem ressalva → SAÍDA; 9 fora da janela + 6 ausentes → retidos
na primeira peneira; 2 com ressalva (SS gêmea, cola e fita) → retidos na quarta. Nenhum
expurgo em julho: nos 72 não há auxiliar nem particular. Sem TMAE e sem material do mês —
`deslocamento="SEM REGISTRO"` (marcador) e `material_conferido="NAO"`, ditos assim.

## Entradas externas

Estes geradores leem arquivo que **não** está no repositório. Se o contêiner reiniciou, o
arquivo sumiu e o gerador precisa do upload de novo:

| Gerador | Precisa de |
|---|---|
| `gerar_cadastro_fis.py` | `/tmp/fisz/FIS_ETO_2026_07_E_TRANSFORMADORES_ID.csv` (36 MB, do zip do Drive) |
| `gerar_solo_ativo.py` | `/tmp/pedo_to.json` (camada de pedologia do IBGE/BDIA) |
| geradores de clima | extrações em `/tmp/climatmp` |

O que **não** precisa de nada externo: `gerar_fluxo_1582.py` lê só `public/`. Por isso ele
roda em contêiner novo, sem preparo.

## Verificadores

- `scripts/auditoria_invariantes.py` — lê o `fluxo-1582.json`; prova que o subconjunto
  jan–jun é o `fluxo-1510.json` campo a campo (invariante 0), que as cascatas fecham em
  1.582 e que julho não expurga (21). O `metodo.json` e a planilha para download são
  conferidos contra o jan–jun congelado.
- `scripts/conferir_numeros.py` — confere os números publicados contra a origem.
- `scripts/verificar_site.mjs` — abre o bundle num navegador, aba por aba, e reprova
  tela vazia, erro de console e número colado no texto (a assinatura de classe de CSS
  inexistente).
