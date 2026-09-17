# Auditoria — `analise_ss_critica_chave.py` (SS de trafo 2026 × Crítica)

Auditor: agente B. Data: 02/09/2026.
Script auditado: `/home/user/repositorio_x/auditoria-transformadores-134/scripts/analise_ss_critica_chave.py`
(md5 `b9f02af5fd83853d9e017ddc543da64a`, 455 linhas — o arquivo mudou **duas vezes** durante a auditoria;
o que segue vale para a versão final. Onde a planilha entregue `BASE2026_SS_x_Critica.xlsx` (gerada
02/09 03:10, versão anterior) diverge, está anotado.)

Reprodução independente rodada em `agente_B/repro_atual.xlsx` — bate linha a linha com o script.

---

## 0. O que NÃO está quebrado (verificado nos dados, não presumido)

Vale registrar porque a tarefa levantou suspeita sobre esses pontos e todos foram descartados com medição:

| Suspeita | Verificação | Resultado |
|---|---|---|
| Linhas da Crítica descartadas por `len(c) < len(cab)` | contei em jan–jun | **0 linhas descartadas**, em 76.630 passos. Nenhuma tem código de trafo, porque não existe nenhuma. |
| Linhas com MAIS campos (`OBSERVACAO` com `;`) | contei | **0 linhas**. Além disso `OBSERVACAO` é a **última** coluna (índice 63 de 64), então mesmo se houvesse `;` ali as três colunas de ativo **não** deslocariam — só a observação sairia truncada. |
| Quebra de linha dentro da Crítica | 0 linhas curtas ⇒ nenhum registro multi-linha | OK |
| Cabeçalho diferente entre meses | janeiro troca `QTD_IFEC_POLO` ↔ `QTD_IFEC_COEC` (índices 40/42). Nenhuma coluna usada pelo script muda de lugar | OK — a leitura por nome já cobre |
| `NUM_SEQ_OPER_INIC_HDE` vazio | 0 ocorrências | OK (se houvesse, todos os passos vazios virariam **uma** ocorrência gigante e casariam com quase tudo) |
| `NUM_SEQ_OPER_INIC_HDE` atravessando arquivos | **978 ocorrências** aparecem em 2 arquivos | Correto e desejado: a chave carrega o ano (`2026…`), não colide entre meses; o agrupamento do script une os passos certos. |
| Agrupamento inflando janelas | duração das ocorrências que casaram: p50 27,8 h · p90 56,1 h · p99 95,1 h · 1 caso > 168 h | Sem fusão espúria |
| Agrupamento vs passo-a-passo (método do site) | **1 SS** em 1.774 casa só por causa do agrupamento (`DOLP-RD-PA 00072/2026`) | Efeito desprezível |
| `base.ler_ss_os` (arquivo @) | 9.298 linhas físicas, **todas** com exatamente 63 `@`; 9.297 registros, todos com 64 campos | Sem linha quebrada, sem `@` em texto. O parser não foi exercitado — mas ver D-8. |
| Datas | Crítica 100 % `dd/mm/aaaa hh:mm`; SS 100 % `dd/mm/aaaa hh:mm:ss` | Sem truncamento por formato só-data |
| Borda da janela | 0 casos com distância ≤ 1 h antes do início ou ≤ 24 h depois do fim entre os "fora da janela" | **Sem off-by-one na comparação**: `(ini−1h) <= abertura <= (fim+24h)` está correto e é consistente |
| SS repetida na base | 0 SS duplicada em 9.297 registros | A deduplicação é no-op |

---

## A. Defeitos que MUDAM NÚMERO

### A-1. `Resultado` fora de qualquer categoria em 3 SS conferíveis — o resumo não fecha
**Onde:** `analise_ss_critica_chave.py:310–314` (o `elif`) + `:379–382` (bloco "Resultado — só as conferíveis") e `:388–391` (lista `cats`).

**O que acontece:** o `elif s["abertura"].month == 7 and st != "SIM"` grava
`Resultado = "SEM CRÍTICA — não conferível"`, mas **não** mexe em `Cobertura da Crítica`. Para 3 SS
abertas em 01/07/2026 antes de `ultimo` (= 01/07/2026 17:43, o último `DTA_FECH` do arquivo de junho),
a cobertura continua `"Crítica carregada"` ⇒ a linha entra em `conf` (3.327) mas não cai em nenhuma
das 6 categorias listadas.

Consequência medida na saída atual:

```
"Resultado — só as conferíveis": 1774 + 930 + 6 + 12 + 490 + 112 = 3324
denominador usado nas percentagens                                 = 3327   ← 3 SS somem
"Por mês" 07/2026: 100+55+0+0+0+32 = 187, mas a coluna Total diz 302
```

As 3 SS: `DOLP-RD-PA 00709/2026`, `ETO-RD-AR 01045/2026`, `ETO-RD-AR 01046/2026`.
A aba "Não conferíveis" tem só as 32 de `nconf` — essas 3 não aparecem em aba nenhuma.

**Impacto:** 3 SS invisíveis; percentagens do resumo erradas em ~0,1 pp; a tabela "Por mês" não fecha.

**Correção:** marcar a cobertura junto com o resultado, para a linha cair em `nconf`.

```python
        elif s["abertura"].month == 7 and st != "SIM":
            resultado = "SEM CRÍTICA — não conferível"
            cobertura = "SEM CRÍTICA DESTE PERÍODO — não conferível"   # ← acrescentar
            via = "—"
            o_mostra, pap_mostra, d_mostra = None, "", None
```

E, por segurança, acrescentar a categoria à lista do resumo e a `cats`:

```python
    for k in ("CASOU PELO TRAFO", "TRAFO FORA DA JANELA", "CASOU PELA CHAVE GÊMEA",
              "CHAVE GÊMEA FORA DA JANELA", "AUSENTE — nem trafo nem chave",
              "AUSENTE pelo trafo — chave gêmea não conferível (Crítica bruta de julho perdida)",
              "SEM CRÍTICA — não conferível"):
    ...
    # e conferir que a soma fecha:
    assert sum(res.values()) == len(conf), (sum(res.values()), len(conf))
```

---

### A-2. `elif … and st != "SIM"` apaga um casamento legítimo pela chave gêmea
**Onde:** `analise_ss_critica_chave.py:310`.

**O que acontece:** a condição olha só `st` (o veredito **pelo trafo**). Se uma SS de julho fora do
`julho-2026.json` tiver o trafo ausente (`st == "AUSENTE"`) mas a **chave gêmea** casando numa
ocorrência de junho que se estende até a abertura, o resultado `CASOU PELA CHAVE GÊMEA` é
sobrescrito por `"SEM CRÍTICA — não conferível"`.

**Impacto hoje: 0 SS** (nenhuma das 35 SS de julho fora do json casa pela chave). É bomba armada:
basta a Crítica de julho ser reenviada, ou `ultimo` avançar, para o caso aparecer.

**Correção:** olhar o veredito final, não `st`.

```python
        elif s["abertura"].month == 7 and not resultado.startswith("CASOU"):
```

---

### A-3. A "melhor ocorrência" é a primeira encontrada, não a melhor
**Onde:** `analise_ss_critica_chave.py:183–184`.

```python
        if (o["ini"] - ANTES) <= abertura <= (o["fim"] + DEPOIS):
            d = 0.0
            if not casou or (melhor_d or 0) > 0:          # ← após o 1º casamento, melhor_d = 0.0
                melhor, melhor_d, melhor_pap, casou = o, d, "+".join(sorted(papeis)), True
```

Depois do primeiro casamento `casou=True` e `melhor_d=0.0`, logo `(0.0 or 0) > 0` é `False` e
`not casou` é `False`: **nenhuma ocorrência posterior consegue substituir**. A escolhida é a
primeira na ordem de inserção do `defaultdict`, ou seja, a ordem em que os arquivos da Crítica
foram lidos — arbitrária em relação ao caso.

**Impacto medido (saída atual):** 94 SS têm mais de uma ocorrência dentro da janela.
- em **39** delas a ocorrência reportada **não** é a mais próxima da abertura da SS;
- em **7** delas o `Papel do ativo` sai como `fechado` (ou `fechado+interrompido`) embora exista,
  na mesma janela, uma ocorrência em que o trafo é **`problema`** — que é o papel que sustenta
  "o trafo causou a interrupção".

Exemplos (SS · escolhida → papel · existia com `problema`):
`ETO-RD-GU 00040/2026` 20264070995733 `fechado` → 20264070968909 `interrompido+problema`;
`DOLP-RD-PA 00093/2026` 20264086091838 `fechado` → 20264086104706 `fechado+interrompido+problema`;
+5 casos.

Não muda `CASOU`/`NÃO CASOU`, mas muda **Ocorrência, Início/Fim, Papel do ativo, Causa, Subcausa,
Clientes, Duração e Observação** em até 94 linhas — e qualquer contagem por papel ou por causa
feita em cima da aba "Todas as SS".

**Correção:** ranquear explicitamente (papel `problema` primeiro, depois proximidade da abertura).

```python
def procurar(codigo, abertura, ocs, por_codigo):
    achadas = por_codigo.get(codigo)
    if not achadas:
        return "AUSENTE", None, "", None, 0
    dentro, fora = [], []
    for oc_id, papeis in achadas.items():
        o = ocs[oc_id]
        if not (o["ini"] and abertura):
            continue
        fim = o["fim"] or o["ini"]                      # ver A-4
        if (o["ini"] - ANTES) <= abertura <= (fim + DEPOIS):
            dentro.append((o, papeis))
        else:
            d = ((o["ini"] - abertura) if abertura < o["ini"] else (abertura - fim)).total_seconds() / 3600
            fora.append((d, o, papeis))
    if dentro:
        o, papeis = min(dentro, key=lambda x: ("problema" not in x[1],
                                               abs((abertura - x[0]["ini"]).total_seconds())))
        return "SIM", o, "+".join(sorted(papeis)), None, len(achadas)
    if fora:
        d, o, papeis = min(fora, key=lambda x: x[0])
        return "fora da janela", o, "+".join(sorted(papeis)), round(d, 1), len(achadas)
    return "AUSENTE", None, "", None, len(achadas)
```

---

### A-4. Ocorrência com `DTA_FECH` vazio é descartada inteira — e pode virar "AUSENTE" com n>0
**Onde:** `analise_ss_critica_chave.py:179–180` (`if not (o["ini"] and o["fim"] and abertura): continue`)
e `:189–190` (`if melhor is None: return "AUSENTE", …, len(achadas)`).

**O que acontece:** `DTA_FECH` vem vazio em **22 passos** (20 ocorrências, todas de 1 passo).
Essas ocorrências são puladas. Se **todas** as ocorrências de um código forem assim, `procurar`
devolve `"AUSENTE"` com `n = len(achadas) > 0`, e o chamador (`:298`) dispara a busca pela **chave
gêmea** — violando a regra do dono ("só quando o trafo não aparece em coluna nenhuma"), porque
nesse caso o trafo **aparece**.

**Impacto hoje: 0 SS.** Dos 36 códigos citados nessas 20 ocorrências, só `5702828122` está no
recorte (SS `ETO-RD-PA 00167/2026` e `DOLP-RD-PA 00351/2026`), e as duas já casam por outra
ocorrência. Confirmado que nenhuma das 18 linhas de chave gêmea tem `Ocorrências do trafo na
Crítica > 0`. Continua sendo defeito latente: interrupção **em aberto** é justamente a que mais
interessa numa SS recém-aberta.

**Correção:** tratar a ocorrência aberta como intervalo `[ini, ini]` (já embutido no trecho de A-3:
`fim = o["fim"] or o["ini"]`), e separar "ausente de verdade" de "presente mas sem data":

```python
    if melhor is None:
        return "SEM DATA", None, "", None, len(achadas)   # ≠ AUSENTE: não procurar a chave gêmea
```

---

### A-5. `Papel do ativo` de julho vem com os papéis em outra ordem — dois rótulos para a mesma coisa
**Onde:** `analise_ss_critica_chave.py:303` (`pap_mostra = txt(oj.get("papeis"))`), contra
`:184`/`:188` que fazem `"+".join(sorted(papeis))`.

**O que acontece:** o `julho-2026.json` guarda os papéis na ordem de `base.PAPEIS`
(`problema+interrompido+fechado`); jan–jun sai em ordem alfabética (`fechado+interrompido+problema`).

**Impacto medido:** **149** das 267 linhas de julho. Numa tabela dinâmica por "Papel do ativo",
`problema+interrompido+fechado` (144) e `fechado+interrompido+problema` (2.180) viram **dois
grupos** para o mesmo conjunto de papéis.

**Correção:**

```python
                pap_mostra = "+".join(sorted(txt(oj.get("papeis")).split("+"))) if oj.get("papeis") else ""
```

---

### A-6. `Distância à janela (h)` não é distância à janela — e mistura duas definições
**Onde:** `analise_ss_critica_chave.py:186` (jan–jun) e `:303` (julho); rótulo em `:322`;
texto do método em `:399`.

**O que acontece — dois problemas na mesma coluna:**

1. **jan–jun** mede a distância até a **borda da ocorrência** (`ini` ou `fim`), não até a borda da
   **janela** (`ini−1 h` / `fim+24 h`). A defasagem é de **1 h** de um lado e **24 h** do outro.
   Medido: 596 linhas caem antes do início (distância real = valor − 1 h) e 370 depois do fim
   (distância real = valor − 24 h). Entre estas últimas, **40** exibem um número entre 24 e 48
   que o leitor lerá como "quase casou" quando o miss real é de 0 a 24 h.
   Exemplo da amostra: `ETO-RD-GR 00205/2026` mostra `29` — a SS ficou a **28 h** da borda da janela.
2. **julho** usa `abs(delta_inicio_h)`, ou seja, distância até o **início** da ocorrência, mesmo
   quando a SS abriu depois do fim. **55 linhas** de julho na mesma coluna, com outra definição.

**Impacto:** nenhuma reclassificação, mas todo número dessa coluna está sistematicamente errado
para o rótulo que carrega, em 966 linhas (911 jan–jun + 55 julho).

**Correção:** medir contra a janela e usar a mesma definição nos dois ramos.

```python
            d = ((o["ini"] - ANTES) - abertura if abertura < (o["ini"] - ANTES)
                 else abertura - (o["fim"] + DEPOIS)).total_seconds() / 3600
```
e, no ramo de julho, recalcular a partir de `inicio`/`fim` do registro em vez de usar
`delta_inicio_h`. Se preferir não mexer na conta, renomear a coluna para
**"Distância à ocorrência (h)"** e corrigir a linha 399 do método.

---

### A-7. Duas SS somem do recorte sem entrar em nenhum contador — o "Recorte" não fecha
**Onde:** `analise_ss_critica_chave.py:283–285`.

```python
    fora_prefixo = collections.Counter(s["trafo"][:2] for s in ss if s["trafo"][:2] not in PREFIXOS)
    ss = [s for s in ss if s["trafo"][:2] in PREFIXOS and re.fullmatch(r"\d{10}", s["trafo"])]
```

O `re.fullmatch` derruba registros com prefixo bom mas código não-numérico, e eles **não** entram
em `fora_prefixo` nem em `fora_data`. Aritmética do resumo:

```
Linhas na base de SS            9299
Fora do prefixo 42/52/53/57     5938
SS no recorte                   3359      →  9299 − 5938 = 3361 ≠ 3359 + 0 + 0
```

As duas: `ETO-PROT 00045/2026` (`424R056`) e `ETO-RD-PO 00091/2026` (`424R072`) — códigos de
proteção, **corretamente** fora do recorte de transformador. O defeito é o silêncio, não a exclusão.

**Correção:**

```python
    ss_pref = [s for s in ss if s["trafo"][:2] in PREFIXOS]
    ss = [s for s in ss_pref if re.fullmatch(r"\d{10}", s["trafo"])]
    fora_formato = [s for s in ss_pref if not re.fullmatch(r"\d{10}", s["trafo"])]
    ...
    linha("Prefixo certo mas código fora do formato de 10 dígitos", len(fora_formato),
          ", ".join(f'{s["ss"]}={s["trafo"]}' for s in fora_formato))
```

---

### A-8. `Ocorrências do trafo na Crítica` conta ocorrências que o veredito ignorou
**Onde:** `analise_ss_critica_chave.py:190–191` (`len(achadas)`).

`n` é o número de ocorrências **citando o código**, incluindo as sem data que `procurar` pulou
(A-4). Quem cruzar "n>0 mas Resultado = AUSENTE" vai achar incoerência. Hoje afeta 0 linhas do
recorte, mas é a mesma latência de A-4.

**Correção:** devolver o número de ocorrências efetivamente avaliadas (`len(dentro) + len(fora)`
no trecho de A-3) ou publicar as duas colunas.

---

## B. Cosmético / robustez (não muda contagem)

- **B-1 — `analise_ss_critica_chave.py:298` (`"equipe": r["ss"].split(" ")[0]`).** Para as 2 SS de
  julho vindas do `julho-2026.json`, a coluna **Equipe** recebe o prefixo do número da SS
  (`ETO-RD-GR`), não o `COD_EQUIPE`. Correção: `txt(r.get("equipe"))` (ou `""` se o json não tiver).
- **B-2 — `:297` (`n_ch = None`)**, ramo de julho: grava célula vazia em
  "Ocorrências da chave na Crítica" onde as demais linhas trazem `0`. Use `n_ch = ""` ou `0` com
  nota, para o filtro do Excel não misturar vazio com zero.
- **B-3 — `:290–291`**, ramo de julho: o desempate prefere o papel `problema`
  (`"problema" not in txt(o.get("papeis"))`); o ramo jan–jun não tem preferência nenhuma (A-3).
  Depois de aplicar A-3 os dois ficam iguais — hoje são regras diferentes na mesma coluna.
- **B-4 — `:376`** `por_mes[...][l["Resultado"] if l in conf else …]`: `l in conf` é busca linear
  numa lista de dicts, O(n²) com comparação de dicionário completo (3.359 × 3.327 comparações de
  39 chaves). Correção: `conf_ids = {id(x) for x in conf}` e testar `id(l) in conf_ids`.
- **B-5 — `:120–121`** (`if len(c) < len(cab): continue`): descarte silencioso, sem contador.
  Hoje são 0 linhas, mas o dia em que a extração vier com `;` ou quebra de linha dentro de texto,
  o script perde registros sem avisar — exatamente a armadilha nº 2 documentada em `base.py:10-13`.
  Correção: acumular `descartadas` e `raise`/`print` se passar de, digamos, 0,1 % do arquivo.
- **B-6 — `:131`** (`"obs": txt(c[I["OBSERVACAO"]])`): se um dia houver `;` na observação, ela sai
  truncada no primeiro ponto-e-vírgula. Como é a **última** coluna, o certo é
  `";".join(c[I["OBSERVACAO"]:])`. Sem efeito hoje (0 casos), sem risco nas colunas de ativo.
- **B-7 — `:154–157`**: `causa`, `subcausa`, `clientes` e `duracao` da ocorrência vêm do **primeiro
  passo lido**, não do passo em que o ativo aparece. `Causa` coincide sempre (0 divergências em
  1.086 casamentos multi-passo), mas **`Clientes` diverge em 38 linhas**. Correção: guardar os
  metadados do passo que cita o código, não do primeiro.
- **B-8 — `base.py:150`** (`if buf.count("@") >= n - 1`) e `:152–153`
  (`campos[:n-1] + ["@".join(campos[n-1:])]`): o fechamento por contagem de `@` fecha o registro
  cedo se o `@` extra estiver numa coluna **do meio**, e o conserto empurra o excedente para a
  **última** coluna, deslocando tudo depois do `@` intruso. **Não é exercitado por esta base**
  (9.298 linhas, todas com exatamente 63 `@`), mas é a única forma de o `NUM_TRAFO` sair errado
  sem estourar erro. Vale um guarda: `if len(campos) > n: raise` quando o `@` extra não estiver
  na última coluna.

---

## C. Notas de escopo (não são defeito — são decisões que o dono precisa saber)

1. **178 SS canceladas** (`SITUACAO_SS = "SS CANCELADA"`) estão no recorte, porque o pedido foi
   por prefixo + data. Elas puxam a taxa de casamento para baixo: sem elas, `CASOU PELO TRAFO`
   sobe de **53,3 % (1.774/3.327)** para **54,6 % (1.719/3.150)**.
2. **O recorte não é só "trafo queimado".** Por tipo: 1.662 `FORMS SUBST DE TRANSFORMADOR`,
   593 `MELHORIA POSTO DE TRANSFORMAÇÃO`, 415 `FORMS SUBST DE POSTES`, 392 `AVISO DE ANOMALIA`,
   133 `NS - LINHA VIVA`… SS de melhoria e de poste não deveriam mesmo ter interrupção associada,
   e engordam o balde `AUSENTE`.
3. **Dezembro/2025 não está carregado** (o script diz isso em `:400`). Quantificado: das **41 SS**
   abertas antes de 03/01/2026, **14** estão como `AUSENTE` ou `TRAFO FORA DA JANELA`; das **24**
   abertas em 01/01, **13**. É o teto do erro atribuível à falta de dezembro.
4. **A regra da chave gêmea é conservadora, e isso importa pouco.** Entre as 930
   `TRAFO FORA DA JANELA`, só **15** têm a chave gêmea presente na Crítica e apenas **1** casaria
   na janela se a regra fosse estendida. Manter a regra do dono custa 1 SS.
5. **Julho usa outro método por baixo.** O `julho-2026.json` foi produzido por
   `base.veredito_critica`, que aplica a janela **por passo**, não pela ocorrência agrupada.
   Quantifiquei o viés em jan–jun: **1 SS em 1.774** muda. Desprezível — mas o texto do método
   (`:401`) diz "mesmo método", o que só é verdade dentro dessa margem.

---

## D. Números da saída atual, para referência

Recorte 3.359 SS · conferíveis 3.327 · não conferíveis 32 (+3 escondidas, A-1).

| Resultado | n | % de 3.327 |
|---|---:|---:|
| CASOU PELO TRAFO | 1.774 | 53,3 % |
| TRAFO FORA DA JANELA | 930 | 28,0 % |
| CASOU PELA CHAVE GÊMEA | 6 | 0,2 % |
| CHAVE GÊMEA FORA DA JANELA | 12 | 0,4 % |
| AUSENTE — nem trafo nem chave | 490 | 14,7 % |
| AUSENTE pelo trafo (julho, chave não conferível) | 112 | 3,4 % |
| **SEM CRÍTICA — não conferível (não listado no resumo)** | **3** | — |

A planilha entregue `BASE2026_SS_x_Critica.xlsx` (03:10) traz **1.773 / 932 / 492** porque foi
gerada antes da última correção do ramo de julho; 37 linhas mudaram de `Resultado` desde então
(35 para "SEM CRÍTICA — não conferível", `ETO-RD-AG 00653/2026` de AUSENTE para
`TRAFO FORA DA JANELA` e `ENC-RD-PS 00611/2026` de AUSENTE para `CASOU PELO TRAFO`).
**A planilha precisa ser regerada.**
