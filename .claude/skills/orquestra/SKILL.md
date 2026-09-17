---
name: orquestra
description: Planejar um objetivo grande de análise e dividir o processamento entre vários agentes com funções específicas, escolhendo o agente e o modelo certos para cada etapa, definindo o contrato de entrega de cada um e conferindo o resultado no fim. Use quando o pedido envolver várias bases, muitos itens do mesmo tipo (meses, SS, transformadores, obras), etapas encadeadas (extrair, cruzar, verificar, redigir) ou quando o usuário pedir para "dividir", "paralelizar", "montar um plano", "usar vários agentes", "orquestrar" ou "fazer uma análise maior". Não use para pergunta de uma base só que se responde com um script.
---

# Orquestra: do objetivo ao plano, do plano aos agentes

Orquestrar é caro. Um agente custa contexto, tempo e uma chance de errar em silêncio.
A regra desta skill é: **decidir primeiro se vale dividir**, e só então dividir com
contrato escrito. Um agente sem contrato devolve parágrafo em vez de dado, e aí o
trabalho volta para você refazer.

## 1 · Decidir a forma antes de dividir

| como é o trabalho | forma | por quê |
|---|---|---|
| uma base, uma pergunta, um script | **faça você mesmo** | dividir custa mais que fazer |
| "onde está X" em muitos arquivos | **Explore** (1 a 3, em paralelo) | é busca, não análise; devolve o caminho, não o arquivo |
| N itens independentes, mesmo tratamento (12 meses de Crítica, 16 trafos, 227 SS em lotes) | **leque**: um agente por lote, todos no mesmo disparo | o tempo passa a ser o do lote mais lento, não a soma |
| etapas que dependem umas das outras (extrair → cruzar → conferir → redigir) | **linha**: um agente por etapa, o arquivo de saída de um é a entrada do outro | cada etapa começa com contexto limpo e uma entrada só |
| leque seguido de conferência | **leque + conferente**, e o conferente entra assim que o primeiro lote fecha | não espera o leque inteiro para começar a conferir |
| número que vai para diretoria, COPO ou regulador | **sempre um conferente separado**, por outro caminho de cálculo | quem produziu o número é o pior juiz dele |
| dezenas de agentes, roteiro fixo, sem julgamento no meio | **ferramenta Workflow** | só com o usuário pedindo em palavras dele; consome muito |

Se o objetivo couber em duas frases e uma base, pare aqui e faça direto.

## 2 · Escrever o plano antes de disparar

Preencha `<scratchpad>/orquestra/plano.md` com o modelo de `references/modelo-plano.md`.
O plano tem cinco campos e nenhum a mais: **objetivo em pergunta**, **critério de pronto**,
**entradas** (caminho absoluto de cada base, e o que fazer se faltar), **etapas** (agente,
modelo, entrada, saída, o que devolve) e **conferência** (qual invariante prova que está certo).

Antes de disparar, confira as entradas com as próprias mãos: `ls -la` em cada caminho e o
número de linhas de cada base. Agente que recebe caminho errado inventa um caminho parecido
e trabalha na base errada sem avisar.

## 3 · Escolher o agente e o modelo

Agentes próprios da auditoria estão em `.claude/agents/`: `extrator-base`, `cruzador-bases`,
`conferente-numeros`, `investigador-critica`, `entregador-planilha`. Cada um já carrega as
convenções de dados e o que não deve fazer. Para o resto, use `Explore` (busca), `Plan`
(desenho) e `general-purpose` (o que não se encaixa).

**Agente recém-criado não existe na sessão em que foi escrito.** O `Agent` responde
"agent type not found" e lista só os embutidos. Enquanto a sessão não reinicia, dispare com
`subagent_type: general-purpose` e abra o prompt com uma linha:

```
Seu papel está definido em /home/user/repositorio_x/.claude/agents/<nome>.md — leia esse
arquivo primeiro e siga-o à risca.
```

O `model` da chamada continua valendo, então a escolha de modelo abaixo não se perde.

| trabalho da etapa | modelo | por quê |
|---|---|---|
| extrair, contar, converter, aplicar um script já especificado | **haiku** | é mecânico; modelo grande aqui é dinheiro jogado fora |
| escrever o script de uma especificação clara, analisar uma base, montar xlsx/pptx no padrão | **sonnet** | precisa de código correto, não de julgamento |
| cruzar bases, decidir divergência, conferir número de diretoria, escrever o texto final | **opus** | erra menos onde o erro é caro |
| plano, arbitragem entre resultados que se contradizem | **opus** (ou fable, quando disponível) | é o que você não terceiriza |

Regra de bolso: **o modelo sobe conforme a consequência do erro**, não conforme o tamanho
do dado. Contar 92.424 linhas é haiku. Decidir se um transformador pertence à seleção é opus.

## 4 · O contrato de cada agente

Todo prompt de agente tem estas seis partes, nesta ordem. Falta de qualquer uma já causou retrabalho:

```
OBJETIVO: uma frase, verificável.
LEIA PRIMEIRO: .claude/skills/orquestra/references/convencoes-dados.md (as armadilhas
  desta base já custaram entrega; não redescubra).
ENTRADAS: <caminhos absolutos>, com nº de linhas esperado.
SAÍDA: escreva <caminho absoluto>.json no formato {…}. É o único produto que conta.
DEVOLVA: no máximo 10 linhas — caminho do arquivo, contagens principais, o que não
  conseguiu fazer. NÃO cole linhas de dados, NÃO resuma em prosa longa.
NÃO FAÇA: não escreva no repositório, não mande arquivo ao usuário, não publique nada,
  não mude de escopo. Se a entrada não existir, pare e diga; não procure substituto.
```

O relatório final do agente **não chega ao usuário**. Quem conversa com o usuário é você.

## 5 · Disparar

- Tudo que é independente vai **num único disparo**, várias chamadas do Agent na mesma mensagem.
- Deixe em segundo plano (padrão). Só use `run_in_background: false` quando a próxima ação
  depender daquele resultado e não houver mais nada a fazer.
- Agente que edita o repositório em paralelo com outro precisa de `isolation: "worktree"`,
  senão dois escrevem no mesmo arquivo.
- Enquanto eles rodam, adiante o que não depende deles. Não invente o resultado de um
  agente que ainda não voltou.
- Precisa continuar um agente já criado, com o contexto dele? `SendMessage` com o nome.
  Chamar `Agent` de novo começa do zero.

## 5.1 · Esperar do jeito certo

**O arquivo de saída aparece quando o agente começa a escrever, não quando termina.** Ler o
contrato antes da notificação de conclusão faz você julgar um rascunho: já aconteceu aqui,
e o "defeito" que eu tinha encontrado era só o arquivo pela metade.

- Espere a **notificação de conclusão** do agente. Não faça laço de espera pelo arquivo existir.
- Enquanto espera, adiante o que não depende daquele agente.
- Antes de redisparar uma etapa, confira com `ListAgents` se a primeira ainda está viva.
  **Dois agentes escrevendo o mesmo caminho é corrida**: ou pare o primeiro (`TaskStop`), ou
  mande o segundo escrever em outro arquivo.
- Redisparo sempre cita o defeito e o número certo já conferido; agente que recebe só
  "refaça" repete o mesmo caminho.

## 6 · Reunir, conferir, decidir

Você **não** repete a análise dos agentes. Você confere invariantes:

1. **Soma fecha?** As partes somam o total da base (ex.: 115 + 112 = 227).
2. **Ninguém em dois lugares?** Chaves duplicadas entre lotes.
3. **Ninguém sumiu?** Itens de entrada sem linha de saída, e o motivo de cada um.
4. **Caminho diferente dá o mesmo número?** É para isso que serve o conferente.
5. **Campo vazio é falha, não resultado.** Agente que devolve `null` numa contagem e diz
   "catalogado" passou batido na primeira rodada deste projeto. Confira campo a campo antes
   de aceitar, e redispare só o que falhou, com o erro citado no prompt.
6. **Contradição entre agentes é notícia**, não erro de arredondamento: investigue antes
   de escolher um lado, e conte ao usuário que houve divergência.

Só depois disso escreva a resposta. Divergência que você resolveu no meio do caminho entra
na resposta em uma linha.

## 7 · Registrar

Terminou o objetivo, rode `/salvar-contexto <slug>`: o plano, os JSONs dos agentes e as
entregas entram no repositório e o resumo vai para o Drive. Um leque de oito agentes que
não foi salvo é um leque que vai ser refeito.

## Armadilhas já vistas

- **Agente sem contrato devolve prosa.** Quando o prompt não diz "escreva este arquivo",
  o resultado volta no relatório e some quando o relatório fecha.
- **Leque grande sem lote é desperdício.** 227 SS não são 227 agentes: são 4 lotes de ~57.
  Um agente por item só se cada item exigir julgamento próprio.
- **Dois agentes lendo a mesma base grande** gastam o dobro do tempo de leitura. Extraia
  uma vez para JSON ou Parquet e mande os outros lerem o extrato.
- **Conferente que recebe o resultado pronto concorda com ele.** Dê a ele a base e a
  pergunta, não a resposta; peça o caminho alternativo de cálculo.
- **O subagente não vê a conversa.** Tudo que ele precisa saber vai no prompt, incluindo o
  que o usuário já decidiu e o que já foi descartado.
- **Fuso e formato**: datas destas bases vêm como texto `dd/mm/aaaa hh:mm`. Diga isso no
  prompt ou cada agente decide um formato diferente.
- **Agente novo só vale na próxima sessão** (veja a seção 3). Testar a orquestração no
  mesmo turno em que os agentes foram criados exige o desvio pelo `general-purpose`.
- **Não julgue pelo arquivo, julgue pela notificação** (seção 5.1). Um agente que ainda
  escreve deixa campos nulos no caminho.
- **Não leia o arquivo de transcrição do agente** (`tasks/<id>.output`): ele traz a conversa
  inteira do subagente e estoura o contexto. O produto é o JSON que o contrato mandou escrever.
