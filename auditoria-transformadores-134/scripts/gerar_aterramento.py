#!/usr/bin/env python3
"""Extrai as medições de aterramento do formulário da OS e grava aterramento.json.

O DADO QUE ESTAVA PARADO. A base da OS traz SEIS colunas de resistência de aterramento — três
hastes medidas ANTES do serviço e três DEPOIS — mais duas perguntas de sim ou não: se a equipe
fez melhoria de aterramento e se o aterramento está conectado ao tanque do transformador. Nada
disso tinha sido aberto até aqui, e é o formulário que a equipe preenche no poste.

ZERO NÃO É MEDIÇÃO. Ordem dele: "aqueles que não têm nada ou 0 preenchimento traga como não
preenchidos". Resistência zero é fisicamente impossível num aterramento de distribuição — é o
campo em branco lançado como zero. Contá-los como medição empurraria a mediana para baixo e
diria que o parque está bem aterrado quando ninguém mediu. São 258 das 1.305 nessa situação, e
elas aparecem na tela como NÃO PREENCHIDO, não como bom.

ANTES, NÃO DEPOIS. Ordem dele: "na verdade deveria ser com a de antes, né?" — e está certo. A
medição de DEPOIS é o ponto já corrigido; a que descreve o mundo em que o transformador viveu e
queimou é a de ANTES do serviço. A régua usa só ela. Os 330 casos que trazem apenas a medição
posterior não viram "medidos": ganham categoria própria, porque dizer que o ponto estava bom
usando o número de depois da melhoria seria contar a correção como se fosse o estado original.

QUAL DAS TRÊS HASTES VALE. A pior. Aterramento é caminho: de nada adianta uma haste de 5 Ω se a
do lado tem 800 — a corrente de descarga procura o pior caminho disponível, e é ele que define
o que o transformador aguenta. Por isso a régua usa o máximo das três, não a média.

O QUE ELE PERGUNTOU E A RESPOSTA HONESTA. Cruzar com a causa da Crítica NÃO separa: entre os
queimados por descarga atmosférica, 33% estão acima de 25 Ω; entre as demais causas, 32%. Não há
correlação a defender aqui, e dizer que há seria inventar. O achado é outro, e é maior: um em
cada três transformadores que queimaram estava num ponto com aterramento acima do limite da
norma, a distribuidora MEDIU isso na hora da troca, e em 253 deles não fez melhoria nenhuma.

Uso:  python3 scripts/gerar_aterramento.py
"""
import collections
import datetime
import json
import os

import openpyxl

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
OS_XLSX = os.path.join(RAIZ, "public", "bases", "originais", "Original_OS.xlsx")
SAIDA = os.path.join(RAIZ, "public", "aterramento.json")

# as colunas repetem nome no cabeçalho ("..._ANTES_X1" e "..._X1"), então vão por POSIÇÃO
COL_CONECT, COL_MELHORIA = 46, 49
COL_ANTES = (55, 56, 57)
COL_DEPOIS = (58, 59, 60)
LIMITE = 25.0   # o limite usual da norma para aterramento de distribuição
GRAVE = 100.0


def t(v):
    return "" if v is None else str(v).strip()


def num(v):
    """Zero e vazio são a mesma coisa aqui: ninguém mediu."""
    try:
        f = float(t(v).replace(",", "."))
    except ValueError:
        return None
    return f if f > 0 else None


def main():
    with open(FLUXO, encoding="utf-8") as fh:
        fluxo = json.load(fh)
    por_os = {t(r.get("os")): t(r.get("ss")) for r in fluxo["registros"] if t(r.get("os"))}

    wb = openpyxl.load_workbook(OS_XLSX, read_only=True, data_only=True)
    ws = wb["BASE SS_OS"]
    it = ws.iter_rows(values_only=True)
    cab = list(next(it))
    kos = cab.index("NUMERO_OS")

    saida = {}
    for row in it:
        ss = por_os.get(t(row[kos]) if kos < len(row) else "")
        if not ss:
            continue
        antes = [x for x in (num(row[i]) if i < len(row) else None for i in COL_ANTES) if x]
        depois = [x for x in (num(row[i]) if i < len(row) else None for i in COL_DEPOIS) if x]
        saida[ss] = {
            "antes": antes, "depois": depois,
            # a PIOR haste manda, e só a de ANTES: é o estado em que o trafo queimou
            "pior": max(antes) if antes else None,
            "so_depois": bool(depois and not antes),
            "pior_depois": max(depois) if depois else None,
            "medido": bool(antes),
            "melhoria": t(row[COL_MELHORIA]) if COL_MELHORIA < len(row) else "",
            "conectado": t(row[COL_CONECT]) if COL_CONECT < len(row) else "",
        }
    wb.close()

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump({"gerado_em": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                   "limite": LIMITE, "grave": GRAVE, "por_ss": saida}, fh, ensure_ascii=False)

    med = [v for v in saida.values() if v["medido"]]
    ruins = [v for v in med if v["pior"] > LIMITE]
    sem_mel = [v for v in ruins if not t(v["melhoria"]).upper().startswith("S")]
    vs = sorted(v["pior"] for v in med)
    print(SAIDA)
    so_dep = sum(1 for v in saida.values() if v["so_depois"])
    print(f"  {len(saida)} solicitações · com medição ANTES do serviço {len(med)}"
          f" · só depois {so_dep} · NÃO PREENCHIDAS (vazio ou zero) {len(saida)-len(med)-so_dep}")
    print(f"  pior haste: mediana {vs[len(vs)//2]:.1f} Ω · p90 {vs[int(len(vs)*.9)]:.0f} Ω · máx {vs[-1]:.0f} Ω")
    print(f"  acima de {LIMITE:.0f} Ω: {len(ruins)} · destes, SEM melhoria de aterramento: {len(sem_mel)}")
    print(f"  acima de {GRAVE:.0f} Ω: {sum(1 for v in med if v['pior'] > GRAVE)}")
    print(f"  melhoria declarada: {dict(collections.Counter(t(v['melhoria']) or '(vazio)' for v in saida.values()).most_common())}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
