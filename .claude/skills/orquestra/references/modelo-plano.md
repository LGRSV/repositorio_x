# Modelo do plano (`<scratchpad>/orquestra/plano.md`)

```markdown
# Plano — <objetivo em poucas palavras> — <data>

## Objetivo em forma de pergunta
<uma pergunta que se responde com sim/não ou com um número>

## Critério de pronto
<o que precisa existir para dizer "acabou": arquivo, número conferido, entrega enviada>

## Entradas
| base | caminho absoluto | linhas | se faltar |
|---|---|---|---|

## Etapas
| # | agente | modelo | entrada | saída (arquivo) | devolve |
|---|---|---|---|---|---|
| 1 | extrator | haiku | … | orquestra/01_extrato.json | contagens |
| 2 | cruzador | sonnet | 01_extrato.json | orquestra/02_cruzado.json | casados/órfãos |
| 3 | conferente | opus | base original + pergunta | orquestra/03_conferencia.json | confirma ou contesta |

Paralelo: etapas <…> saem no mesmo disparo. Sequência: <…> depende de <…>.

## Conferência
| invariante | como se prova |
|---|---|
| a soma fecha | <a> + <b> = <total da base> |
| ninguém duplicado | chaves únicas entre lotes |
| caminho alternativo | o conferente chega ao mesmo número por outra via |

## Riscos
<o que pode dar errado e o que fazer: base faltando, divergência entre agentes, limite de tamanho>
```
