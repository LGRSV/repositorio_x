# Convenções das bases da auditoria de transformadores (Energisa Tocantins)

Leia antes de tocar em qualquer base. Cada item aqui já custou uma entrega errada.

## Identificadores

- **Obra**: o AIC guarda texto de 10 dígitos com zero à esquerda; SS/OS guardam inteiro de
  9. Compare sempre com `str(x).lstrip('0')` dos dois lados.
- **Transformador**: os prefixos **53 e 57 se confundem**. Cerca de 10 % das ocorrências de
  janeiro trazem "CODIGO INVALIDO" na OBSERVACAO da Crítica. Ao procurar um trafo, teste os
  dois prefixos e também o código "gêmeo" do mesmo poste.
- **Intervenção** (o número que o campo cita) é a **Reclamação** no formato `05-<n>-1`. Ela
  aparece na OBSERVACAO da Crítica (coluna 63) ou como `NUM_SEQ_OPER_ORIG_COS_TNT` na TMAE.
  **Não é** o número da ocorrência da Crítica. Confundir os dois inverte a resposta.
- **SS**: formato `XXX-RD-YY 00000/2026`. O mesmo número pode aparecer em várias linhas.

## Regras de tempo

- **Janela SS × interrupção**: `dh = início da ocorrência − abertura da SS`; vale se
  `−24 h ≤ dh ≤ +1 h`. Fora disso é "fora da janela", que é situação diferente de "sem
  interrupção registrada" e o usuário faz questão da distinção.
- **Prazo da SS**: abertura + 72 h.
- Datas vêm como texto `dd/mm/aaaa hh:mm`. Converta explicitamente; não confie no parser
  automático, que troca dia por mês em datas até o dia 12.

## Armadilhas de leitura

- **BASE_SS_OS (Trafo.xlsx)**: 1.444 SS aparecem duplicadas, sendo a segunda linha quase
  vazia. Ao montar dicionário por SS, **guarde a linha mais preenchida**, não a última.
- **Acentos**: procurar "contabil" não encontra "CONTÁBIL". Normalize unicode antes de
  comparar texto.
- **Extensão errada**: bases chegam como `.09`, `.txt` ou `.gz`. Confira o conteúdo, não o nome.
- **LibreOffice não recalcula** neste contêiner (timeout mesmo em arquivo de 3 células).
  Para conferir fórmula de xlsx, avalie em Python; para gravar, use `fullCalcOnLoad=True`.
- **Nunca rode `pkill -f soffice`**: mata o próprio shell.

## Colunas da Crítica bruta (arquivo texto, separador `;`)

| nº | campo |
|---|---|
| 8 | COD_ELE_PROBLEMA |
| 10 | NUM_SEQ_OPER_INIC_HDE |
| 11 | DTA_ABERT |
| 14 | COD_ELE_INTERROMPIDO |
| 17 | DTA_FECH |
| 19 | COD_ELE_FECHADO |
| 20 | QTD_CONS |
| 21 | DURACAO |
| 27 | DES_CAUSA |
| 29 | DES_SUB_CAUSA |
| 46 | LOCALIDADE |
| 53 | COD_ALIMENTADOR |
| 63 | OBSERVACAO |

## Vocabulário que o usuário exige

- "ausente da Crítica e fora da janela" = **pendência do COPO**, não conclusão da auditoria.
- Texto oficial: "ou não há interrupção registrada, ou está fora da janela de 24 horas".
- "Sem documento" está proibido; escreva "Obra não comprova a troca".
- Julho de 2026 **não é comparável** aos outros meses: a Crítica de julho foi perdida; só
  sobrou o que está em `julho-2026.json` no site.

## Formato e contagens confirmadas (17/09/2026)

| base | onde | linhas de dados | observação |
|---|---|---|---|
| Crítica mensal | `crit/Critica-CHEIO_MM-2026.txt` | jan 20.099, fev 15.699, mar 14.679, abr 12.086, mai 7.691, jun 6.376, ago 7.475 | 64 colunas, `iso-8859-1`, separador `;` |
| TMAE jan–jun | `aux/32196f1a-TMAE…txt` | 62.616 | 40 colunas |
| TMAE jul / ago | uploads | 6.626 / 6.717 | 40 colunas |
| FIS jul/2026 | `jan_ago/fis/…csv` | 96.037 | 52 colunas |
| OS_STATUS_2026 | `novas/OS_STATUS_2026.xlsx` | 78.840, aba `Dados` | 30 colunas |
| AIC 12/09 | `AIC_2026_12-09.xlsx` | 11.323, aba `Export` | 93 colunas |
| Trafo.xlsx | upload `8cfc359b` | 3.601, aba **`BASE_SS_OS`** | a aba `BASE SS_OS` (1.694) é antiga; confundir as duas já aconteceu |
| Base de Expurgos | upload `2a6cebeb` | 227, aba `Expurgos` | 30 colunas |

`max_row` do openpyxl conta o cabeçalho. Se a contagem der um a mais que a tabela acima, é isso.
As linhas acima já são **linhas de dados** (`wc -l` menos o cabeçalho); todos esses arquivos
terminam com quebra de linha.

### Três achados de 17/09 que mudam análise

- **O arquivo mensal da Crítica não é estritamente do mês.** Em janeiro, o `DTA_ABERT` vai
  de 01/01 a **10/02**. Filtrar por nome de arquivo e supor que é o mês inteiro duplica ou
  perde ocorrências na virada; filtre pela data.
- **A data da TMAE não é a data do atendimento.** `DTA_CMPT_TNT` (coluna 1) é a
  **competência**, e por isso min e max caem sempre no dia 1º. Para tempo de atendimento use
  as colunas de início e fim da operação, não a competência.
- **O FIS tem data de fabricação impossível.** `DATA_FABRICACAO` varia de **1021** a **9999**
  nos 96.037 registros. Qualquer conta de idade do transformador precisa descartar esses
  extremos e dizer quantos foram descartados.

## Onde estão as bases

`contexto/INDICE.md` aponta o último snapshot; dentro dele, `ARQUIVOS.md` lista **tudo que
existiu**, inclusive o que não coube (acima de 10 MB). Se a base que você precisa está
marcada como não copiada, **pare e diga** — ela precisa ser reenviada pelo usuário.
