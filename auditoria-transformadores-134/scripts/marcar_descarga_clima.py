"""Marca, em cada caso, se ele DECLARA descarga atmosférica — e fecha o cruzamento.

O valor deste mapeamento não é dizer que houve raio. É o contrário: caso que declara
descarga atmosférica e não tem raio nenhum detectado perto, num dia de boa cobertura, é
caso para revisar.

Uma armadilha que quase inflou o número: "PARA-RAIOS" é o equipamento, não a descarga.
Contar "PARA-RAIOS CURTO-CIRCUITADO" como declaração de raio levaria 33 para 38 — e achado
inflado não vale nada numa auditoria.
"""
import json
import re

DESC = re.compile(r"DESCARGA\s*ATMOSF|ATMOSFERIC|ATMOSFÉRIC")
APP = "public"
c = json.load(open(f"{APP}/clima-mes.json", encoding="utf-8"))
P = c["por_ss"]

meta = {}
for arq, mes in (("julho-2026.json", "julho"), ("agosto-2026.json", "agosto")):
    d = json.load(open(f"{APP}/{arq}", encoding="utf-8"))
    for k in ("registros", "ampliado"):
        for x in d.get(k, []):
            t = json.dumps({"o": x.get("origem"), "d": x.get("defeito"),
                            "c": [o.get("causa") for o in (x.get("ocorrencias") or [])],
                            "s": [o.get("subcausa") for o in (x.get("ocorrencias") or [])]},
                           ensure_ascii=False).upper()
            meta[x["ss"]] = {"declara": bool(DESC.search(t)), "recorte": k == "registros"}

for ss, v in P.items():
    m = meta.get(ss, {})
    v["declara_descarga"] = bool(m.get("declara"))
    v["no_recorte"] = bool(m.get("recorte"))

decl = [s for s, v in P.items() if v["declara_descarga"]]
rec = [s for s in decl if P[s]["no_recorte"]]
c["cruzamento"] = {
    "declaram_descarga": len(decl),
    "declaram_sem_raio_20km": sum(1 for s in decl if P[s]["raios_20km_dia"] == 0),
    "declaram_sem_raio_50km": sum(1 for s in decl if P[s]["raios_50km_dia"] == 0),
    "recorte_declaram": len(rec),
    "recorte_sem_raio_20km": sum(1 for s in rec if P[s]["raios_20km_dia"] == 0),
    "recorte_sem_raio_50km": sum(1 for s in rec if P[s]["raios_50km_dia"] == 0),
    "casos_com_raio_20km": sum(1 for v in P.values() if v["raios_20km_dia"] > 0),
    "casos_com_chuva": sum(1 for v in P.values() if (v.get("chuva_dia_mm") or 0) > 0.1),
    "nota_para_raios": "'PARA-RAIOS' é o equipamento, não a descarga: subcausa de "
                       "para-raios curto-circuitado NÃO conta como declaração de raio.",
}
json.dump(c, open(f"{APP}/clima-mes.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps(c["cruzamento"], ensure_ascii=False, indent=1))
