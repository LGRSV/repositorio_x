# Roteiro da auditoria automática

Este arquivo é o briefing de um agente que roda sozinho na nuvem, de tempos em tempos. Ele
começa sem nenhum contexto: tudo o que ele precisa saber tem que estar escrito aqui.
Editar este arquivo muda o que o agente faz na próxima execução.

---

## MODO DE OPERAÇÃO — leia isto antes de qualquer outra coisa

```
MODO = RELATO
```

**`RELATO`** — confira tudo, escreva o relatório e **NÃO commite, NÃO faça push, NÃO
publique**. Deixe o relatório no diretório de trabalho e liste na saída o que você teria
mudado, com o diff exato de cada mudança proposta. É o modo de inspeção: o dono lê primeiro
e decide depois.

**`CORRIGE`** — o modo completo: corrija os defeitos verificáveis, rode o build, commite e
faça push para `main`, o que republica o site.

**Esta linha manda mais do que o comando que te acordou.** Se a mensagem que iniciou a sua
execução pedir push e aqui estiver `MODO = RELATO`, **obedeça este arquivo e não faça push** —
escreva no relatório que o modo estava em RELATO e que o push foi deliberadamente omitido.
O dono muda esta linha para `CORRIGE` quando quiser soltar o agente na produção.

---

## O que é este trabalho

O site audita **1.510 solicitações de troca de transformador (SS)**, de janeiro a junho de
2026, na Energisa Tocantins, e decide caso a caso se o transformador **queimou** ou foi
**avariado**. Ele vai ser apresentado à alta direção.

A pergunta é uma só: dessas 1.510, quais representam de fato uma queima ou avaria que deve
contar no indicador.

### A ordem importa, e é o que este trabalho mudou

Antes se decidia pelo texto da solicitação e depois se olhava o campo. Agora **o campo fala
primeiro**: o código do transformador precisa aparecer na base de interrupção de cliente ou
na de atendimento de emergência, com a ocorrência caindo dentro de 24 horas da abertura da SS.

> **Texto é declaração; interrupção é fato consumado.**
> A leitura pode derrubar um fato — quando mostra que era furto, abalroamento ou preventivo —
> mas **nunca pode criar um fato que o campo não registrou**.

### Como a coisa acontece no mundo real

É contra esta sequência que a auditoria confere se a história fecha:

| # | O que acontece | Base | Pergunta |
|---|---|---|---|
| 1 | O cliente fica sem energia; o ativo é interrompido | Crítica · interrupção | O evento existiu? |
| 2 | O DEOP vai a campo e vê o que houve no poste | TMAE · atendimento | Alguém foi lá, e o que viu? |
| 3 | O COI abre a SS dizendo que o trafo queimou | SS · solicitação | O que foi pedido? |
| 4 | A OS registra o que a equipe fez, com a placa do trafo retirado e do instalado | OS · execução | O que foi feito? |
| 5 | A obra carrega o custo e a movimentação de material | Obra · material e SIGCO | Onde o dinheiro entrou? |

Três consequências disso, que valem como critério:

- **A SS nasce depois do atendimento.** SS aberta antes de a interrupção começar é anomalia,
  não casamento normal.
- **Quem viu foi o executante.** A observação do TMAE é a evidência mais próxima do poste e
  vem antes do texto da SS. Quando as duas discordam, a do campo pesa mais.
- **O material fecha a conta.** Texto é declaração; transformador dado baixa no almoxarifado
  é fato caro e verificável.

---

## Onde está tudo

| O quê | Onde |
|---|---|
| Aplicação | `auditoria-transformadores-134/` — vinext + Next 16 + React 19 + Vite 8 + Leaflet |
| Interface inteira | `app/page.tsx` (~1.120 linhas) e `app/MapaAtivos.tsx`; estilos em `app/globals.css` |
| Dado principal | `public/fluxo-1510.json` (~17 MB): `meta`, `resumo`, `registros` (1.510), `historico` |
| Textos das regras | `public/metodo.json` — **é renderizado literalmente na aba Método** |
| Universo e auditorias | `public/universo-ss.json`, `public/auditorias.json` |
| Bases para download | `public/bases/` (cruzadas, 6 arquivos) e `public/bases/originais/` (cruas, 6 arquivos) |
| Publicação | `.github/workflows/auditoria-pages.yml`, dispara em push para `main` |

Build: `cd auditoria-transformadores-134 && pnpm install --frozen-lockfile && pnpm run build:pages`

> **Regra absoluta:** nunca adicione dependência nova. O CI usa `--frozen-lockfile` e
> qualquer pacote novo quebra o deploy do site inteiro.

> **Atenção ao `metodo.json`.** A aba Método não tem texto próprio: ela imprime os blocos
> desse arquivo como estão. Todo número escrito lá aparece no site **sem passar pelo dado** —
> é o único lugar do site onde um número pode envelhecer sem ninguém perceber. Confira todos.
> A barra lateral e os KPIs, ao contrário, são calculados dos `registros` em tempo de
> execução e não podem divergir por construção.

---

## 1. A regra do fato

O casamento é pelo **código do transformador** contra a base de interrupção, considerando o
**intervalo inteiro de cada passo da ocorrência**, não só o instante de abertura. Das SS que
casam, 1.022 abrem com o cliente já desligado; ancorar só na abertura perderia 61 casos
legítimos.

A janela de **24 horas** foi testada: entre 12 e 24 horas a densidade é de ~2,4 SS por hora;
entre 24 e 48 cai para 0,7. Alargar para 48 traria só 16 casos, todos duvidosos. O padrão é
24 horas, ajustável na tela para 12 ou 48.

Os quatro graus de prova, no campo `fato`:

| Código | Nome | O que é |
|---|---|---|
| `F1` | Fato pleno | Interrupção aberta no próprio transformador, dentro da janela. A prova mais forte que existe. |
| `F0` | Fato com ressalva | Houve interrupção, mas é programada, preventiva, de equipamento especial, ou com o defeito aberto em outro equipamento. Conta, com alerta. |
| `F2` | Fato provável | A interrupção não casa, mas o atendimento registra equipe no transformador dentro da janela. |
| `F3` | Sem interrupção na janela | Nem interrupção nem atendimento registram nada. **Não é prova de que não aconteceu — é ausência de lastro.** |
| `FD` | SS duplicada | Tem interrupção na janela, mas divide o mesmo evento com outra SS no mesmo transformador. |

## 2. Por que a ausência no atendimento não conta contra

A base de atendimento tem dois defeitos conhecidos que impedem tratá-la como contraprova:

1. O arquivo de janeiro termina no dia 25 e não traz **nenhum** atendimento de 26 a 31 — são
   99 SS abertas nesse intervalo.
2. A chave da base é o código do equipamento **onde o defeito foi aberto**. Quando a equipe
   abre na chave, o número que aparece é o da chave, não o do transformador abaixo dela.

Por isso a interrupção é a prova primária e o atendimento apenas corrobora. Estar ausente do
atendimento **não retém ninguém** — mas fica marcado na tela, porque continua sendo informação.

## 3. A regra da leitura

Usa o texto da SS e da OS, na ordem de precedência do dicionário de regras, com o material da
obra como prova de troca. **A categoria gravada na base não decide nada**: ela está errada em
121 SS, e em 21 delas o texto descreve queima com troca comprovada enquanto o rótulo diz
outra coisa.

| Código | Nome | O que é |
|---|---|---|
| `L1` | Falha | O texto e o material descrevem queima ou avaria do transformador. |
| `L2` | Não é falha | O texto descreve furto, abalroamento, preventivo, auxiliar de equipamento especial, construção ou desativação. |
| `L3` | Indefinida | O texto não permite concluir. **Nunca decide sozinha:** vai para leitura humana. |

## 4. A matriz de decisão

Toda SS cai em uma célula. Não existe caso fora da matriz.

| Fato ↓ / Leitura → | Falha | Não é falha | Indefinida |
|---|---|---|---|
| Fato pleno | INCLUIR | EXCLUIR | REVISÃO |
| Fato com ressalva | INCLUIR se o material comprova; senão REVISÃO | EXCLUIR | REVISÃO |
| Fato provável (só atendimento) | INCLUIR | EXCLUIR | REVISÃO |
| Sem interrupção na janela | REVISÃO | EXCLUIR | REVISÃO |

- **INCLUIR** — conta no indicador de queima e avaria.
- **REVISÃO** — espera leitura humana, com o motivo escrito ao lado. **Não é expurgo.**
- **EXCLUIR** — sai do indicador porque a leitura mostrou outra causa. Continua na base, marcado.

## 5. A ordem das peneiras

Cada peneira só recebe o que a anterior deixou passar, e a esteira **começa pelo fato, não
pelo rótulo** — nenhuma SS é descartada por categoria antes de o campo falar.

Use exatamente esta regra para conferir o campo `cascata` de cada registro. Ela foi validada
contra os 1.510 rótulos e reproduz todos eles:

```
se   expurgo == "SIM"                          -> EXCLUÍDO NA LEITURA
senão se duplicada == "SIM"                    -> RETIDO — SS DUPLICADA
senão se chega_e2 == "NÃO"                     -> RETIDO — SEM INTERRUPÇÃO NA JANELA
senão se chega_e3 == "NÃO"                     -> RETIDO — SEM DESLOCAMENTO
senão se e3_status == "RETIDO"                 -> RETIDO — SEM PROVA DE TROCA
senão se ressalvas_graves ou ressalvas_medias  -> RETIDO — RESSALVA DA INTERRUPÇÃO
senão                                          -> SAÍDA
```

Obra e SIGCO **ficam fora da esteira**: leem enquadramento de custo, não causa. A única
exceção é a obra não existir — sem obra não há consulta de material nem encerramento, e o
caso vai para análise à parte. Mapa e Visão geral também não retêm ninguém.

Um furto que não gerou interrupção fica retido como **sem interrupção**, não como furto — mas
a tela mostra a categoria do texto ao lado, porque nesses casos a ausência de interrupção é
esperada e **explica** o caso em vez de acusá-lo.

## 6. Os números de agora — o retrato contra o qual você confere

Medidos em `public/fluxo-1510.json` no estado atual da `main`. Se algum deles não bater na sua
execução, **o dado mudou e o número aqui é que está velho** — corrija este arquivo junto.

```
                        entram        param
1 · Interrupção          1.510   206 sem interrupção + 3 SS duplicada
2 · Deslocamento         1.301   299 sem deslocamento
3 · SS e OS com material 1.002    41 sem prova de troca + 9 excluídos na leitura
4 · Ressalva               952    68 ressalva da interrupção
  = Decisão final          884 saem
```

A corrente, escrita como conta:

```
1.510 − (206 + 3) = 1.301      1.301 − 299 = 1.002
1.002 − 41 − 9 = 952           952 − 68 = 884
```

| Bloco | Valores |
|---|---|
| Saída confirmada | **884** = 856 queimados + 28 avariados |
| Decisão da esteira | INCLUIR 884 · REVISÃO 617 · EXCLUIR 9 |
| Decisão da matriz | INCLUIR 1.262 · REVISÃO 184 · EXCLUIR 64 |
| Fato | F1 1.259 · F3 206 · F2 22 · F0 20 · FD 3 |
| Leitura | L1 1.451 · L2 53 · L3 6 |
| Nível do casamento (`e1_nivel`) | A 1.000 · B 279 · C 3 · FORA 91 · SEM 137 |

Marcas e contagens auxiliares: `borda_2025` 24 (12 delas sem interrupção) · `tmae_gap_jan` 99
(83 delas sem deslocamento) · duplicadas 3 · `e1_conflito` preenchido em 7 · sem coordenada 1
· janela corrigida 37 · atendimento recuperado por ocorrência 23 · reclassificados de dano
externo 11.

> **Cuidado com dois pares de números que se parecem e não são a mesma coisa.**
> **884 / 617 / 9** é a decisão *depois* da esteira; **1.262 / 184 / 64** é a decisão da
> *matriz*, antes das peneiras de deslocamento, material e ressalva. E **209** é a soma
> histórica de "parou no primeiro estágio" — hoje ela se abre em **206 + 3**, e é assim que
> a barra lateral mostra.

## 7. O que foi corrigido no caminho

Três auditorias independentes revisaram este trabalho. O que elas acharam:

- **Ocorrência longa não enfraquece.** A primeira versão rebaixava a evidência quando a
  interrupção durava mais de 24 horas. Em 536 de 540 casos o defeito era no próprio
  transformador — ele fica desligado até a troca, então a duração longa é a assinatura do
  evento, não uma janela frouxa.
- **Passos da ocorrência.** A deduplicação anterior descartava 6.628 janelas, e em 14 casos a
  janela visível não continha a SS enquanto outra continha.
- **Nível impossível.** Havia um nível "mesmo dia, fora das 24 horas" — conjunto vazio por
  construção.
- **Teste do vizinho.** Só considera transformador vizinho do mesmo alimentador; a primeira
  versão aceitava chave e religador.
- **Peneira de entrada incompleta.** Abalroamento, construção, desativação, sobrecarga e TAP
  passavam direto; 34 casos que não são queima nem avaria contavam no indicador.
- **Teste vazio.** "Equipe não deslocou" dava sempre zero porque o campo está preenchido nas
  62.616 linhas. Era tautologia.
- **A janela passou a ser medida contra o intervalo**, não contra o instante de início.
  Corrigiu 37 casos.
- **A ocorrência pertence à SS mais próxima do evento**, não à primeira da fila. Quem perde a
  disputa vira **SS duplicada**, não "sem interrupção" — são 3 casos.
- **O TMAE passou a ser cruzado também pelo número da ocorrência**, não só pelo código do
  trafo: 23 casos tidos como sem atendimento têm equipe identificada.
- **A exclusão por dano externo passou a exigir prova de dano externo.** O dicionário
  classificava por palavra: bastava "poste" aparecer no texto para o caso virar abalroamento.
  Nos 13 casos assim, Crítica e TMAE declaram a mesma causa entre si, e em 11 dessa causa é
  TRANSFORMADOR. Excluídos caíram de 20 para 9; a saída subiu de 874 para 884.

As quatro primeiras correções de cruzamento não moveram o resultado. **A do dano externo
moveu**: 874 → 884. Qualquer texto do site que ainda diga "o resultado ficou igual" com os
números antigos está errado.

---

## Os invariantes — confira todos, um por um

Escreva um script Python que carregue o JSON e teste cada item. Reporte cada um como
**CONFERE** ou **FALHA**, sempre com os números medidos ao lado. Não pule nenhum; se um não
puder ser testado, diga por quê em vez de omitir.

### Integridade do dado

1. `len(registros) == 1510` e todo `ss` é único.
2. A soma das sete cascatas dá exatamente 1.510.
3. A corrente fecha, nas quatro passagens:
   `1510 − (sem interrupção + SS duplicada) == chega_e2`;
   `chega_e2 − sem deslocamento == chega_e3`;
   `chega_e3 − (sem prova + excluídos) == chega ressalva`;
   `chega ressalva − ressalva == SAÍDA`.
4. A regra da esteira (seção 5) reproduz o `cascata` de **todos** os 1.510 registros.
5. `decisao == "INCLUIR"` se e só se `cascata == "SAÍDA"`; `"EXCLUIR"` se e só se
   `cascata == "EXCLUÍDO NA LEITURA"`; todo o resto é `"REVISÃO"`.
6. `confirmado` só está preenchido em `SAÍDA`, e `queimados + avariados == total de SAÍDA`.
7. Todo bloco de `resumo` bate com a recontagem feita a partir de `registros`.

### Coerência das regras

8. Nenhum registro tem `e1_nivel == "FORA"` com `oc_dist_h <= 24` — a janela é medida contra
   o intervalo da interrupção, não contra o instante em que ela começou.
9. Toda ocorrência disputada é resolvida. Uma ocorrência só é *reivindicada* quando o
   casamento é A, B ou C — duas SS podem apontar para a mesma `oc_num` sem disputá-la, e é o
   que acontece em 4 casos onde a segunda está `FORA` da janela (118 a 1.648 horas): ela não
   reivindica nada e é retida como sem interrupção, corretamente. Quando há disputa de
   verdade, são exatamente 2 SS, o dono é o de menor `|oc_dist_h|`, e quem cede — e **só**
   quem cede — fica com `e1_conflito` preenchido e vira `RETIDO — SS DUPLICADA`, nunca
   `SEM INTERRUPÇÃO`. Hoje: 3 disputas, 3 duplicadas, `e1_conflito` em 7 (3 que cedem + 4 que
   apontam para ocorrência alheia estando fora da janela).
10. Toda SS com `cascata == "EXCLUÍDO NA LEITURA"` tem `expurgo == "SIM"`, e vice-versa.
11. Toda SS marcada `borda_2025` ou `tmae_gap_jan` tem o aviso de lacuna no dossiê
    (`lacuna_base` preenchido).

### Interface

12. Nenhum texto com mojibake: a assinatura é `[ÃÂ][\x80-\xBF]`. Cuidado — `Ã` sozinho é
    legítimo em TENSÃO, MANUTENÇÃO, CONTINUAÇÃO. Confira `page.tsx`, `metodo.json` e os
    campos de texto dos registros.
13. Todo módulo listado em `NAV` tem chave correspondente em `RECORTES` **e** está no tipo
    `Modulo` no `page.tsx`. Chave faltando derruba a aba inteira em tempo de execução; tipo
    faltando não quebra o build (o Vite não checa tipo) mas é dívida silenciosa.
14. **Todo número escrito à mão em `metodo.json` bate com o dado.** Em especial: a tabela do
    bloco `cascata`, a frase de resultado do bloco `correcoes` e os totais do `resumo`. Este é
    o invariante que mais falha, porque esse arquivo não é calculado.
15. Todo número escrito na interface bate com o dado — barra lateral, KPIs de cada aba e a
    caixa d'água.
16. As datas aparecem em dd/mm/aaaa em toda a interface, inclusive no histórico do ativo.
17. Todos os 12 arquivos referenciados em `public/bases/` e `public/bases/originais/` existem
    em disco, e o tamanho anunciado bate no arredondamento de uma casa decimal. **Atenção à
    unidade:** as `Base_*` estão anunciadas em MB decimal (÷10⁶) e as `Original_*` em MiB
    (÷1024²). Testar tudo numa escala só produz falso positivo — foi o que aconteceu na
    primeira versão deste teste.

> **Um invariante que falha não é necessariamente um defeito do site.** Nos primeiros três
> disparos deste roteiro, 3 das 5 falhas eram erro do próprio teste: unidade trocada,
> formatador procurado pelo nome errado e uma regra escrita mais rígida do que o site.
> **Antes de corrigir o site, prove que o teste está certo.** Se a dúvida sobrar, reporte
> como dúvida e não mexa.

---

## O que você PODE corrigir sozinho

Defeito verificável: número que não bate com o dado, texto que contradiz o que o dado diz, aba
que quebra, arquivo referenciado que não existe, rótulo antigo que sobrou, data no formato
errado, mojibake, inconsistência entre `resumo` e `registros`, número velho no `metodo.json`.

## O que você NÃO pode mexer, em hipótese alguma

Estas quatro são **decisões do dono**, não defeitos. Elas mudam o resultado final e estão
esperando a palavra dele. Se você achar argumento novo, escreva no relatório — não aplique.

1. As **22 SS** que passam a etapa 1 só com o atendimento do TMAE, sem interrupção nenhuma
   (16 delas estão na saída).
2. As **89 SS** retidas por `QTD_CONS_INTER_FAT = 0` — todas com o defeito no próprio trafo,
   76 com causa TRANSFORMADOR e 82 com trafo no material.
3. As **2 exclusões** que restaram por dano externo: o campo diz poste de BT abalroado e
   vandalismo de terceiros.
4. Qualquer mudança na regra da esteira, nos limiares de janela ou no dicionário de categorias.

Também não mexa nos detalhamentos e nas narrativas por SS sem que haja erro factual.

## Lacunas conhecidas das bases — não são defeito, não "conserte"

- A base de interrupção começa em **01/01/2026 às 01:14**: dezembro de 2025 não existe. 24 SS
  têm a janela retrocedendo para antes disso, 12 delas retidas sem interrupção. No dia 1º de
  janeiro 52% das SS ficaram sem interrupção, contra 13% de média nos outros dias — o sinal é
  medido, não suposto. Marcadas com `borda_2025`.
- O arquivo de atendimento não tem **nenhum registro de 26 a 31 de janeiro**, seis dias
  inteiros. 99 SS caem nessa faixa, 83 delas retidas por falta de deslocamento. Marcadas com
  `tmae_gap_jan`.
- A chave do TMAE é o elemento onde o defeito foi aberto, não o transformador.
- **Material não cobre 61 SS**: obra fora do export ou obra não gerada.
- Só **134 SS** passaram por leitura humana com parecer escrito. O resto é triagem apoiada por
  campo, não veredito assinado.
- Nenhuma das bases brutas identifica cliente. A Crítica traz contagem de consumidores
  atingidos, não quem são.

---

## Como trabalhar

1. `git pull` antes de qualquer coisa.
2. Rode os 17 invariantes e anote os resultados, um a um, com os números medidos.
3. Corrija só o que for defeito verificável, conforme as regras acima.
4. **Antes de commitar, o build tem que passar**:
   `pnpm install --frozen-lockfile && pnpm run build:pages`. Se falhar, desfaça a mudança e
   registre no relatório.
5. Um commit por assunto, com mensagem explicando o defeito, o motivo e o tamanho do efeito.
   Sem emoji.
6. Acrescente uma entrada no **topo** de `RELATORIO_AUDITORIA.md` (crie se não existir) com
   data e hora, o modo em que você rodou, cada invariante e seu resultado, o que foi
   corrigido, o que foi encontrado mas deixado para o dono decidir, e o que você não
   conseguiu verificar. Se nada foi encontrado, escreva isso — **"tudo confere" é um
   resultado legítimo e útil.**
7. **Só então, e só se `MODO = CORRIGE`**, faça push para `main` — é o que publica o site. Em
   `MODO = RELATO`, pare aqui e não commite nada.
8. Se algo passar de duas horas de trabalho, pare, registre onde parou e — em `CORRIGE` —
   faça push do que já estiver pronto e conferido.

Escreva o relatório em português claro, direto, para alguém que vai ler de manhã com pressa.
Números primeiro, explicação depois.
