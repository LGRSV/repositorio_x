# De onde vem cada tela

O site não guarda número no código. Cada tela lê um JSON de `public/`, e cada JSON sai de
um gerador de `scripts/`. `python3 scripts/atualizar.py --listar` imprime este mapa já
conferido contra o disco — a tabela abaixo é o resumo estável.

## Os conjuntos

| Arquivo | O que é | Estado |
|---|---|---|
| `fluxo-1510.json` | 1.510 SS de janeiro a junho de 2026 | **congelado** — entrada, nunca saída |
| `fluxo-1582.json` | jan–jun + julho, somados por cima | derivado dos dois abaixo |
| `julho-2026.json` | 72 do recorte de julho + 345 do entorno | prévia, decisão da régua |
| `agosto-2026.json` | 27 do recorte de agosto + 59 do entorno | aberto e parcial |
| `cadastro-fis.json` | cadastro FIS do parque, extração de julho | leitura ao lado do caso |
| `revisao.json` | revisão caso a caso, com os dois revisores | — |

## O que 1.582 é

Universo de **solicitações** de janeiro a julho: 1.510 + 72. **Não é o indicador.** O
indicador de jan–jun continua 1.305. Entram 1.324 = 1.269 de jan–jun + 55 de julho, e 17
de julho seguem pendentes de campo.

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

- `scripts/auditoria_invariantes.py` — prova que jan–jun continua com 1.510 e que as
  cascatas fecham. Falha se alguém mexeu no congelado.
- `scripts/conferir_numeros.py` — confere os números publicados contra a origem.
- `scripts/verificar_site.mjs` — abre o bundle num navegador, aba por aba, e reprova
  tela vazia, erro de console e número colado no texto (a assinatura de classe de CSS
  inexistente).
