# A geometria da rede, salva do descarte

## Por que este arquivo existe

Os 176 KML da rede Energisa 2025 somam **294 MB** e viviam só no diretório temporário de
uma sessão. Esse diretório é descartável: quando a sessão encerra ou fica muito tempo
parada, ele é reciclado e os arquivos somem. Nada disso estava no repositório.

O que sumiria junto é a única fonte de coordenada dos equipamentos — e é ela que sustenta a
prova de transformador auxiliar, a que tirou o `DOLP-RD-PA 00820/2026` do indicador de
agosto. Sem geometria, aquele caso volta a ser opinião.

## O que ficou, o que saiu

| | |
|---|---|
| **antes** | 176 arquivos, 308 MB |
| **depois** | 1 arquivo, 12,1 MB — **96,1% menor** |
| **pontos guardados** | 227.600 |

Ficou tudo o que tem coordenada e serve para medir distância:

| tipo | quantos |
|---|---|
| `ET` — estação transformadora, o código operativo do trafo | 79.037 |
| `Chave` — chave, religador e disjuntor | 73.725 |
| `Suporte` — o vínculo estrutura↔equipamento (ver abaixo) | 73.725 |
| `EP` | 859 |
| `Regulador` | 146 |
| `Capacitor` | 98 |
| `Gerador` | 7 |
| `Reator` | 3 |

Saíram as linhas de rede — `Trecho`, `TrechoBT`, `RedeBT`. Num circuito típico são 27.166
linhas contra 3.974 pontos, e cada linha carrega uma lista inteira de coordenadas. É ali
que estavam os 294 MB.

## As duas coisas que quase se perderam

**A contagem de TrechoBT.** Jogar a rede de baixa tensão fora apagaria uma prova: o
auxiliar se reconhece por ter **zero** TrechoBT pendurado nele, enquanto um trafo de
cliente tem de 1 a 388. A geometria não é necessária para isso — o número é. Cada circuito
guarda `trechos_bt`, um dicionário de código do ET para a contagem. Um inteiro no lugar de
centenas de coordenadas.

**O `Suporte Chave <código>`.** A primeira versão desta extração guardava só pontos, e este
placemark é uma *LineString* — foi descartado, e a prova quebrou no teste. Ele importa
porque o primeiro vértice dele cai **exatamente** em cima do transformador que a estrutura
sustenta, e o nome dele diz de qual chave a estrutura é. É o vínculo nomeado entre os dois.
Agora é guardado como ponto, usando só o primeiro vértice: quatro números que preservam o
argumento inteiro.

## A prova, refeita contra este arquivo

O caso `DOLP-RD-PA 00820/2026`:

```
ET 5750099122            → Suporte Chave 7950099122 :  0,00 m
ET 5750099122            → Chave 7950099122         :  2,18 m
TrechoBT do ET 5750099122                           :  0
no mesmo circuito, TrechoBT por ET                  :  mediana 47, máximo 388, em 91 ET
```

O transformador e o religador estão na **mesma estrutura**, e o transformador não tem um
único trecho de baixa tensão saindo dele enquanto os vizinhos têm dezenas. Não alimenta
cliente.

## Uma armadilha que este arquivo revelou

**O prefixo do código muda entre a SS e o KML, para o mesmo equipamento.** A solicitação
chama o auxiliar de `5150099122` (prefixo 51, o espelho do religador 79). O cadastro do
KML chama de `5750099122` (prefixo 57). Mesmos oito dígitos finais, prefixo diferente.

Procurar no KML pelo código que está na SS **não acha**. Isso derrubou a primeira
conferência desta extração, e é armadilha para qualquer análise futura: case pelos dígitos
finais, não pelo código inteiro.

## Formato

```json
{
  "circuitos": {
    "AL04059122": {
      "se": "SE-2PA2",
      "pontos": [ ["ET", "5750099122", -48.314931, -10.212508], … ],
      "trechos_bt": { "5750099122": 0, "5700014055": 125, … }
    }
  }
}
```

Coordenada em 6 casas decimais — 0,1 m de resolução, contra distâncias medidas em metros.
Guardar 14 casas seria guardar ruído.

## Como refazer

```bash
python3 scripts/analise-mensal/kml_extrai.py <pasta com os KML> dados/kml-pontos.json
```

Este arquivo **não** fica em `public/`, de propósito: ele não é lido pelo site em execução,
e mandá-lo para o GitHub Pages engordaria cada publicação em 12 MB sem ninguém usar.

## fis-2026-07-energisa.json.gz · fis-2026-07-particulares.json

O cadastro FIS do parque, extração oficial de **julho/2026**
(`FIS_ETO_2026_07_E_TRANSFORMADORES_ID.csv`, 96.037 transformadores, 52 colunas). O CSV
cru tem 36 MB e não entra no repositório; o que fica aqui é o que
`scripts/gerar_cadastro_fis.py` deriva dele:

| arquivo | o que é |
|---|---|
| `fis-2026-07-energisa.json.gz` | os **92.424** transformadores da Energisa, por código operativo (6,7 MB comprimido, 81 MB abertos) |
| `fis-2026-07-particulares.json` | só os **3.612** códigos com `PROPRIETARIO = Particular` |

**Por que os dois estão separados.** A pergunta que mais se repete é "este ativo entra no
indicador?", e ela se responde com a lista pequena. Quem só precisa dela não deve ter que
abrir os 92 mil.

**O filtro é a coluna `PROPRIETARIO`, não o prefixo 56 do código operativo.** Os dois
discordam em 206 ativos: 30 têm prefixo 56 e são da Energisa, e 176 são particulares sem
prefixo 56 — seis deles com prefixo **57**, que é o prefixo de 97,6% do indicador.

Para usar: `base.ler_fis()`, `base.ler_particulares()` e `base.e_particular(codigo)` em
`scripts/analise-mensal/base.py`. `e_particular` devolve `None` quando o código não está
em cadastro nenhum — ausente não é o mesmo que da Energisa, e o caso precisa ser listado.

**O que esta extração não preenche:** capacidade do elo em 349 dos 96.037 (para elo, use o
KMZ da Rede de Distribuição, que preenche 53,6%); `DATA_FABRICACAO` vem `01/01/2000` em
73,5% dos registros, então idade do parque não sai daqui; fabricante conhecido em 25,2% e
tombamento em 104 registros.
