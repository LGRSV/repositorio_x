# Janeiro a agosto de 2026 — a análise por SS

Três arquivos, todos com uma linha por SS e a mesma chave (`ss`). São o material de
onde saíram a apresentação e as planilhas; qualquer hipótese nova se testa contra eles
sem precisar reprocessar nada.

| Arquivo | O que é |
|---|---|
| `as_1696.json` | O universo do dono: as 1.444 do Infotrafo mais as 252 de fora. 45 campos por SS. |
| `as_252.json` | Só as 252 que não estão no Infotrafo, com a leitura caso a caso completa. |
| `as_1671.json` | O recorte por esquema de serviço `MC - Substituição de transformador`. |

## O que cada linha traz

Identificação (`ss`, `trafo`, `os`, `obra`, `abertura`, `termino`, `localidade`, `equipe`),
o veredito (`categoria`, `conta_no_indicador`/`conta`, `fonte`, `confianca`, `motivo`,
`evidencia`, `prova_de_troca`), a Crítica (`cr*`: resultado, ocorrência, janela, papel do
trafo, causa, subcausa, clientes, observação), a decisão do site (`site_cascata`,
`site_gatilho`), o formulário de campo e os textos integrais da SS e da OS.

`no_infotrafo` diz se a SS está na lista do Infotrafo — as 1.444 pintadas de vermelho na
coluna A da aba `BASE_SS_OS`, conferidas contra o export `data_77.xlsx` (batem uma a uma).

## De onde vêm as categorias

1.536 vieram prontas do site (janeiro a julho, `public/fluxo-1582.json`); 135 foram lidas
caso a caso porque estavam fora do Infotrafo; 79 são de agosto, mês que o site ainda não
cobre. Nenhuma SS ficou sem categoria.

`QUEIMADO` e `AVARIADO` somados são o indicador. As demais categorias são o motivo de a SS
não contar. `AUSENTE DA CRÍTICA` e `FORA DA JANELA DA CRÍTICA` significam falta de registro
de interrupção — não são prova de que a falha não existiu.

## Lacuna conhecida

A Crítica bruta de julho se perdeu. As SS de julho que não estavam no site foram julgadas
só por texto e formulário, sem conferência na base de interrupção.

Leitura ao lado do caso: não recalcula o 1.305 nem o 1.582.
