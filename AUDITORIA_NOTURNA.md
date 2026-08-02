# Roteiro da auditoria noturna

Este arquivo é o briefing de um agente que roda sozinho na nuvem a cada 8 horas. Ele
começa sem nenhum contexto: tudo o que ele precisa saber tem que estar escrito aqui.
Editar este arquivo muda o que o agente faz na próxima execução.

## O que é este trabalho

O site audita **1.510 solicitações de troca de transformador (SS)**, de janeiro a junho
de 2026, na Energisa Tocantins, e decide caso a caso se o transformador **queimou** ou foi
**avariado**. Ele vai ser apresentado à alta direção.

A lógica é uma esteira de quatro peneiras, e a ordem importa:

1. **Interrupção** — o cliente ficou sem energia? É o fato primário.
2. **Deslocamento** — alguma equipe foi até lá?
3. **SS e OS com material** — o texto diz falha e o material comprova a troca?
4. **Ressalva da interrupção** — a interrupção sustenta chamar isso de falha?

A leitura do texto **nunca cria fato**. Obra e SIGCO ficam fora da esteira: leem
enquadramento de custo, não causa.

## Onde está tudo

| O quê | Onde |
|---|---|
| Aplicação | `auditoria-transformadores-134/` — vinext + Next 16 + React 19 + Vite 8 + Leaflet |
| Interface inteira | `app/page.tsx` e `app/MapaAtivos.tsx`; estilos em `app/globals.css` |
| Dado principal | `public/fluxo-1510.json` (~17 MB): `meta`, `resumo`, `registros` (1.510), `historico` |
| Textos das regras | `public/metodo.json` |
| Bases para download | `public/bases/` (cruzadas) e `public/bases/originais/` (cruas) |

Build: `cd auditoria-transformadores-134 && pnpm install --frozen-lockfile && pnpm run build:pages`

> **Regra absoluta:** nunca adicione dependência nova. O CI usa `--frozen-lockfile` e
> qualquer pacote novo quebra o deploy do site inteiro.

## A regra da esteira

Use exatamente esta regra para conferir o campo `cascata` de cada registro. Ela foi
validada contra os 1.510 rótulos e reproduz todos eles.

```
se   expurgo == "SIM"                          -> EXCLUÍDO NA LEITURA
senão se duplicada == "SIM"                    -> RETIDO — SS DUPLICADA
senão se chega_e2 == "NÃO"                     -> RETIDO — SEM INTERRUPÇÃO NA JANELA
senão se chega_e3 == "NÃO"                     -> RETIDO — SEM DESLOCAMENTO
senão se e3_status == "RETIDO"                 -> RETIDO — SEM PROVA DE TROCA
senão se ressalvas_graves ou ressalvas_medias  -> RETIDO — RESSALVA DA INTERRUPÇÃO
senão                                          -> SAÍDA
```

## Os invariantes — confira todos, um por um

Escreva um script Python que carregue o JSON e teste cada item. Reporte cada um como
CONFERE ou FALHA, com os números medidos.

1. `len(registros) == 1510` e todo `ss` é único.
2. A soma das cascatas dá 1.510.
3. A corrente fecha: `1510 − (sem interrupção + SS duplicada) == chega_e2`; `chega_e2 − sem deslocamento == chega_e3`; `chega_e3 − (sem prova + excluídos) − ressalva == SAÍDA`.
4. A regra acima reproduz o `cascata` de **todos** os 1.510 registros.
5. `decisao == "INCLUIR"` se e só se `cascata == "SAÍDA"`; `"EXCLUIR"` se e só se `cascata == "EXCLUÍDO NA LEITURA"`; todo o resto é `"REVISÃO"`.
6. `confirmado` só está preenchido em `SAÍDA`, e `queimados + avariados == total de SAÍDA`.
7. Todo bloco de `resumo` bate com a recontagem feita a partir de `registros`.
8. Nenhum registro tem `e1_nivel == "FORA"` com `oc_dist_h <= 24` — a janela é medida contra o intervalo da interrupção, não contra o instante em que ela começou.
9. Nenhuma ocorrência pertence a duas SS. Numa disputa, o dono é o de menor `|oc_dist_h|` e o dono precisa ter `e1_nivel` em A/B/C. Quem cede fica com `e1_conflito` preenchido.
10. Nenhum texto com mojibake: a assinatura é `[ÃÂ][\x80-\xBF]`. Cuidado, `Ã` sozinho é legítimo em TENSÃO, MANUTENÇÃO, CONTINUAÇÃO.
11. Todo módulo listado em `NAV` tem chave correspondente em `RECORTES` no `page.tsx` — chave faltando derruba a aba inteira em tempo de execução.
12. Todo número que aparece escrito na interface bate com o dado. Confira em especial os da barra lateral, os KPIs de cada aba e a caixa d'água.
13. As datas aparecem em dd/mm/aaaa em toda a interface, inclusive no histórico do ativo.
14. Todo arquivo referenciado em `public/bases/` e `public/bases/originais/` existe em disco.

## O que você PODE corrigir sozinho

Defeito verificável: número que não bate com o dado, texto que contradiz o que o dado
diz, aba que quebra, arquivo referenciado que não existe, rótulo antigo que sobrou,
data no formato errado, inconsistência entre `resumo` e `registros`.

## O que você NÃO pode mexer, em hipótese alguma

Estas quatro são **decisões do dono**, não defeitos. Elas mudam o resultado final e estão
esperando a palavra dele. Se você achar argumento novo, escreva no relatório — não aplique.

1. As **22 SS** que passam a etapa 1 só com o atendimento do TMAE, sem interrupção nenhuma (16 delas estão na saída).
2. As **89 SS** retidas por `QTD_CONS_INTER_FAT = 0` — todas com o defeito no próprio trafo, 76 com causa TRANSFORMADOR e 82 com trafo no material.
3. As **2 exclusões** que restaram por dano externo: o campo diz poste de BT abalroado e vandalismo de terceiros.
4. Qualquer mudança na regra da esteira, nos limiares de janela ou no dicionário de categorias.

Também não mexa nos detalhamentos e nas narrativas por SS sem que haja erro factual.

## Lacunas conhecidas das bases — não são defeito, não "conserte"

- A base de interrupção começa em **01/01/2026 às 01:14**: dezembro de 2025 não existe. 24 SS têm a janela retrocedendo para antes disso, 12 delas retidas sem interrupção. Estão marcadas com `borda_2025`.
- O arquivo de atendimento não tem **nenhum registro de 26 a 31 de janeiro**, seis dias inteiros. 99 SS caem nessa faixa, marcadas com `tmae_gap_jan`.
- A chave do TMAE é o elemento onde o defeito foi aberto, não o transformador. Por isso o cruzamento também é feito pelo número da ocorrência.

## Como trabalhar

1. `git pull` antes de qualquer coisa.
2. Rode os invariantes e anote os resultados.
3. Corrija só o que for defeito verificável, conforme as regras acima.
4. **Antes de commitar, o build tem que passar**: `pnpm install --frozen-lockfile && pnpm run build:pages`. Se falhar, desfaça a mudança e registre no relatório.
5. Um commit por assunto, com mensagem explicando o defeito, o motivo e o tamanho do efeito. Sem emoji.
6. Faça push para `main` — é o que publica o site.
7. Acrescente uma entrada no topo de `RELATORIO_AUDITORIA.md` (crie se não existir) com data e hora, invariantes que falharam, o que foi corrigido, o que foi encontrado mas deixado para o dono decidir, e o que você não conseguiu verificar. Se nada foi encontrado, escreva isso — "tudo confere" é um resultado legítimo e útil.
8. Se algo passar de duas horas de trabalho, pare, registre onde parou e faça push do que já estiver pronto e conferido.

Escreva o relatório em português claro, direto, para alguém que vai ler de manhã com
pressa. Números primeiro, explicação depois.
