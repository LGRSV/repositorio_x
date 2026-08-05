#!/usr/bin/env python3
"""Resume o material de cada obra e grava material-obra.json — quantos transformadores saíram.

A pergunta que este arquivo responde: a obra pagou quantos transformadores, e isso bate com
quantas SS ela atende? É a conta que denuncia obra servindo duas trocas com uma peça só.

DOIS CUIDADOS, e os dois já me fizeram errar hoje:

1. O ZIP tem DOIS exports, não um. Eles são complementares — 192 obras num, 1.257 no outro — e
   exatamente UMA obra aparece nos dois, com as mesmas 16 linhas. Ler os dois em sequência sem
   deduplicar dobra o material dessa obra, e foi assim que eu vi "dois transformadores" onde há
   um. A deduplicação é por linha inteira.

2. Linha de transformador não é transformador. Em várias obras existem DUAS linhas para a mesma
   troca: a prevista, com realizado zero, e a que de fato saiu. É a substituição de tipo — sai
   OMI (óleo mineral) do plano e entra OVI (óleo vegetal) na execução, mesma potência. Contar
   linhas dá dois; contar quantidade realizada dá um, que é o certo.

Uso:  python3 scripts/gerar_material_obra.py
"""
import collections
import csv
import datetime
import json
import os
import re
import zipfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTE = os.path.join(RAIZ, "public", "bases", "originais", "Original_Material_SIAGO.zip")
SAIDA = os.path.join(RAIZ, "public", "material-obra.json")


def num(v):
    try:
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0


def main():
    z = zipfile.ZipFile(FONTE)
    vistas, obras = set(), {}
    dup = 0
    for nome in z.namelist():
        dados = z.read(nome).decode("latin-1", "replace").splitlines()
        rd = csv.reader(dados, delimiter="\t")
        cab = next(rd)
        i = {c.strip(): k for k, c in enumerate(cab)}
        for row in rd:
            if len(row) <= i["descricao"]:
                continue
            chave = tuple(row)
            if chave in vistas:
                dup += 1
                continue
            vistas.add(chave)
            ob = row[i["num_obra"]].strip().lstrip("0")
            d = obras.setdefault(ob, {"trafos": 0.0, "linhas": [], "itens": 0, "valor": 0.0})
            d["itens"] += 1
            d["valor"] += num(row[i["val_requisitado"]])
            desc = row[i["descricao"]].strip()
            if desc.upper().startswith("TRANSF"):
                real, prev = num(row[i["qtdrealizada"]]), num(row[i["qtdprevista"]])
                d["trafos"] += real
                m = re.search(r"([\d,\.]+)\s*KVA", desc.upper())
                d["linhas"].append({
                    "desc": desc, "kva": m.group(1).replace(".", ",") if m else "",
                    "prev": prev, "real": real, "valor": num(row[i["val_material"]]),
                })

    for ob, d in obras.items():
        # substituição de tipo: uma linha prevista que não saiu e outra que saiu no lugar
        d["troca_tipo"] = (len(d["linhas"]) > 1
                           and any(l["real"] == 0 and l["prev"] > 0 for l in d["linhas"])
                           and any(l["real"] > 0 for l in d["linhas"]))

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump({"gerado_em": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                   "obras": len(obras), "linhas_repetidas_entre_os_dois_exports": dup,
                   "por_obra": obras}, fh, ensure_ascii=False)
    com = sum(1 for d in obras.values() if d["trafos"] > 0)
    print(SAIDA)
    print(f"  {len(obras)} obras no export · {com} com transformador realizado")
    print(f"  linhas idênticas nos dois exports, contadas uma vez: {dup}")
    print(f"  obras com substituição de tipo (previsto ≠ realizado): "
          f"{sum(1 for d in obras.values() if d['troca_tipo'])}")
    print(f"  obras com mais de um transformador realizado: "
          f"{sum(1 for d in obras.values() if d['trafos'] > 1)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
