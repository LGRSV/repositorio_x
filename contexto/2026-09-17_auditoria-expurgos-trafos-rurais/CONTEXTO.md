# Contexto — 2026-09-17 — Auditoria de transformadores: expurgos jan–ago, 16 trafos rurais, obras × SIGCO

Sessão: 74dc9c64-5026-54ee-a81e-173d2f38a735 · branch: claude/site-trafos-queimados-review-eidois · PR #128 (aberto, rascunho, monitorado de hora em hora) · scratchpad: /tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad

Usuário: auditoria de transformadores da Energisa Tocantins (Squad Equipamentos Especiais), trabalha em português.

## 1. O que foi pedido (na ordem)
1. Identificar a última base de obras (AIC) enviada; verificar se o conteúdo foi guardado; caminho inverso SIGCO 25962 / 8812 / 8385 → obras → SS/OS; contar obras por SIGCO; cruzar com OS_STATUS; explicar obra no AIC sem OS_STATUS.
2. Como organizar o processamento para não perder contexto (CLAUDE.md, manifesto, histórico de tudo).
3. Zipar o repositorio_x inteiro (entregue em 8 partes < 30 MB) e explicar como rodar o Claude Code local.
4. Apresentação gerencial dos Expurgos jan–ago (227 SS) no fundo do PPTX da Energisa, estilo escritório (Calibri, azul-marinho + um laranja, tabelas), com a visão dos 172 queimados/avariados.
5. A mesma apresentação em Excel com tabelas dinâmicas e uma aba "Leitura" explicando a extração da base.
6. Para 16 trafos rurais (112,5/150 kVA) de `analise_trafos_rurais_1125_e_150.xlsx`: levantar tudo de todas as bases e do site (Crítica), preencher no formato da planilha do usuário, versão visual em Excel (por que e quando queimou, prazo), conferir interrupções, investigar causas, checar se os 16 estão bem selecionados, intervenção na Crítica do trafo 5710016016, conferir potências e descrições das OS.
7. (17/09) Criar uma skill que guarde o contexto no Drive antes do contêiner fechar → esta skill (`salvar-contexto`).

## 2. Estado atual (tudo entregue ao usuário)
- `scratchpad/deck/gen3.js` → `deck/out/Expurgos_Jan_Ago_2026.pptx` (+ .pdf), 10 slides, fundo Energisa.
- `scratchpad/xl/build.py` → `xl/Expurgos_Jan_Ago_2026.xlsx` (abas Leitura, Resumo, Din Categoria, Din Motivo, Din Texto x Motivo, Planilha1, Detalhes1/2, Expurgos; 5 dinâmicas; 33 COUNTIFS verificados em Python).
- `scratchpad/tr/` (16 trafos): `consolidado.json` (155 col.), `dossie.json`, `critica_hits.json`, `os_blocos.json`, `os_vs_form.json`; entregas `Trafos_rurais_visual.xlsx` (abas Painel, Seleção, OS × formulário, Linha do tempo, Conferência da Crítica, Investigação, Causa, Dossiê) e `analise_trafos_rurais_1125_e_150_PREENCHIDA.xlsx` (planilha do usuário preenchida: Intervenção, Causas, Anotações OS, Dados trafo retirado/instalado, Aterramento, infos gerais; TAP em 8 células e Impedância em 10 vindas das OS).
- Página HTML publicada como artifact (https://claude.ai/artifact/3k1NC6wnxr8s8DCVkhpnCh); o usuário preferiu Excel.
- Skill `salvar-contexto` criada em `.claude/skills/salvar-contexto` com hooks em `.claude/settings.json`.

## 3. Decisões e regras adotadas (com o porquê)
- Código de obra: AIC traz texto com 10 dígitos e zero à esquerda, SS/OS traz inteiro de 9 → comparar com `lstrip('0')`.
- Prefixo de trafo: 53 × 57 se confundem ("CODIGO INVALIDO" na OBSERVACAO da Crítica, ~10 % das ocorrências de janeiro) → sempre testar os dois prefixos.
- "Intervenção" do campo = número da Reclamação `05-<n>-1` que aparece na OBSERVACAO da Crítica (col. 63) ou como TMAE NUM_SEQ_OPER_ORIG_COS_TNT; não é o número da ocorrência.
- Janela SS × interrupção: dh = início da ocorrência − abertura da SS; válida se −24 h ≤ dh ≤ +1 h. Prazo da SS = abertura + 72 h.
- BASE_SS_OS (Trafo.xlsx 10/09): 1.444 SS duplicadas com linha quase vazia → manter a linha mais preenchida (`cheia()`).
- Medição na planilha do usuário: usar "depois"; se não houver, "antes". Barramento/Cabo ficam em branco; linhas extras "Aterramento ligado ao tanque" e "Tipo de barramento".
- Deck/Excel: "ausente da Crítica e fora da janela" é pendência do COPO, texto oficial "ou não há interrupção registrada, ou está fora da janela de 24 horas"; "Sem documento" virou "Obra não comprova a troca".
- Colunas da Crítica bruta: 8 COD_ELE_PROBLEMA, 10 NUM_SEQ_OPER_INIC_HDE, 11 DTA_ABERT, 14 COD_ELE_INTERROMPIDO, 17 DTA_FECH, 19 COD_ELE_FECHADO, 20 QTD_CONS, 21 DURACAO, 27 DES_CAUSA, 29 DES_SUB_CAUSA, 46 LOCALIDADE, 53 COD_ALIMENTADOR, 63 OBSERVACAO.

## 4. Números verificados (com a fonte)
| número | significado | fonte / conferência |
|---|---|---|
| 227 | expurgos jan–ago = 115 fechados + 112 pendentes (82 sem interrupção + 30 fora da janela) | Base_de_Expurgos_jan_ago_3_2.xlsx, recontado em Python |
| 89 + 23 | QUEIMADO + AVARIADO entre os 112 pendentes | idem |
| 81 / 31 | com / sem troca comprovada pela série | idem |
| 172 | com texto de queima/avaria (112 Crítica + 60 outro motivo) | idem |
| 107 vs 112 | o usuário via 107 porque a dinâmica dele não somava "Fora da janela 5" sob AVARIADO | conferido na dinâmica |
| 9.511 / 11.323 | obras no Original_Cadastro_Obras (22/07) / AIC 12/09 | arquivos |
| 3.601 | SS em Trafo.xlsx 10/09 até 09/09 (65 col.) | arquivo |
| 78.840 | OS em OS_STATUS_2026 | arquivo |
| 14 de 15 | trafos rurais atendidos dentro de 72 h (folga média 55 h); ETO-RD-DP 00011 atrasou 28 h | dossie.json |
| 761 | TMA da TMAE 20264656205501 (trafo 5710016016, 20/07 11:58 → 21/07 00:39) | TMAE_072026 + julho-2026.json |

## 5. Erros cometidos e corrigidos
- Dicionário de BASE_SS_OS guardava a última linha (vazia) das SS duplicadas → campos em branco; corrigido mantendo a mais preenchida.
- Chaves do template 0-based contra colunas 1-based do openpyxl → células não preenchidas; corrigido para 23–26.
- Rótulos TIPO_DE_BARRAMENTO/ATERRAMENTO ligados a linhas erradas → deixados em branco com linhas próprias.
- Afirmei que o site inflava 4 durações: bug meu (comparava fim do primeiro passo); durações do site estão certas.
- Disse "nada entrou em 11/08": errado, o README registra BASE_SS_OS_11-08-2026.zip (perdido) e OBRAS_status_extracao_07-08-2026.xlsx (perdido).
- Slide 2 dizia "a troca aconteceu" para os 112 (só 81 têm prova); julho não é comparável (Crítica de julho perdida).
- pptxgenjs: bullets `[object Object]` → runs achatados; eixo −20 → `valAxisMinVal:0`; visual "de IA" → estilo escritório.
- LibreOffice Calc parou de recalcular (timeouts até em arquivo de 3 células) → `fullCalcOnLoad=True` + conferência das fórmulas em Python.
- `pkill -f soffice` matou o próprio shell (exit 144).
- Busca por "contabil" não achava "CONTÁBIL" → normalizar unicode.
- AIC veio com extensão `.09` → copiar para `.xlsx`.
- Rótulo `cmp()` dizia "só na OS" quando o valor só existia no formulário (ETO-RD-PA 00187) → corrigido na aba.

## 6. Bases de dados usadas
| base | extração | conteúdo | onde |
|---|---|---|---|
| Original_Cadastro_Obras.xlsx | 22/07 | 9.511 obras, 93 col., STATUS AIC, NUM_PROJETO_SIGCO | repo |
| Dados_do_AIC_Ano_2026_12.09 | 12/09 | 11.323 obras | upload → scratchpad/AIC_2026_12-09.xlsx |
| Trafo.xlsx [BASE_SS_OS] | 10/09 | 3.601 SS até 09/09 | upload 8cfc359b |
| Original_OS.xlsx [BASE SS_OS] | 31/07 | 9.297 SS | repo (zip p1a) |
| OS_STATUS_2026.xlsx | set/26 | 78.840 OS, NUM_OBRA, ELEMENTO | upload da2484db |
| Base_de_Expurgos_jan_ago_3_2.xlsx | set/26 | 227 linhas | upload 2a6cebeb |
| Crítica bruta jan–jun (zip) + Critica__082026_1.txt | — | 64 col. | scratchpad/crit + upload 659f2baf |
| TMAE jan–jun (zip) + TMAE_072026_2 / TMAE_082026_1 | — | atendimentos | scratchpad/aux + uploads |
| FIS jul/2026 (gz) | jul | 92.424 trafos | scratchpad |
| Site: fluxo-1582.json, passos-critica.json, julho-2026.json, historico-ativo.json | — | 180 campos/SS | repo auditoria-transformadores-134/public |

## 7. Pendências
- Ofertas feitas e não confirmadas: commitar as três bases de setembro no repo; escrever CLAUDE.md + dados/manifesto.json; incluir "recuperar a Crítica de julho" como 4º pedido ao COPO.
- Ponto para o COPO: TAP, tensão e impedância só existem na descrição da OS; DG-RD-PO e ETO-RD-DP não registram o bloco de especificação.
- Seleção dos 16: NÃO PERTENCE DG-RD-PO 00400 (45 kVA) e ETO-RD-GU 00202 (75 kVA); REVISAR ETO-RD-DP 00501 (queimou 75, instalou 150); ETO-RD-DP 00528 é 150 (formulário diz 112,5); ETO-RD-GR 00405 é 112,5 (FIS diz 150); ETO-RD-GR 00915 sem dado.
- Divergência real: ETO-RD-GR 00405 CITD do trafo retirado (OS 0610555 × formulário CITD06105557).
- PR #128 segue aberto em rascunho.

## 8. Como retomar
1. `cat contexto/INDICE.md` e ler este arquivo inteiro.
2. Scripts e entregas estão em `contexto/2026-09-17_auditoria-expurgos-trafos-rurais/arquivos/` (tr/, xl/, deck/…). Bases brutas acima de 10 MB e zips só estão listadas em ARQUIVOS.md: pedir ao usuário que reenvie se precisar.
3. Se o pedido for continuar os 16 trafos, abrir `tr/dossie.json` e `tr/visual.py`; se for expurgos, `xl/build.py` e `deck/gen3.js`.
4. Perguntar ao usuário se aceita as ofertas pendentes (bases no repo, CLAUDE.md, 4º pedido ao COPO).
