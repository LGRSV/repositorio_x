"""Junta as 252 fora do Infotrafo: 196 com a categoria do site + 56 lidas caso a caso."""
import collections, json, os, sys

SC = os.path.dirname(os.path.abspath(__file__))
# como cada categoria do site se traduz para o vocabulário da leitura caso a caso
DO_SITE = {
    "QUEIMADO": "QUEIMADO", "AVARIADO": "AVARIADO", "FURTO": "FURTO",
    "ABALROAMENTO": "ABALROAMENTO", "PREVENTIVO": "PREVENTIVO/PROGRAMADO",
    "REMANEJAMENTO": "REMANEJAMENTO", "DIVISÃO DE CIRCUITO": "DIVISÃO DE CIRCUITO",
    "TAPE E REGULARIZAÇÃO DE TENSÃO": "TAPE/REGULARIZAÇÃO DE TENSÃO",
    "TRAFO AUXILIAR DE RELIGADOR": "AUXILIAR DE RELIGADOR",
    "DESATIVAÇÃO DE POSTO": "SEM TROCA (não substituído)",
    "CONSTRUÇÃO": "SEM TROCA (não substituído)",
}
CONTA = {"QUEIMADO", "AVARIADO"}
# o mesmo fato com dois nomes: o agente escreveu "SEM TROCA", o site escreve por extenso
SINONIMO = {"SEM TROCA": "SEM TROCA (não substituído)"}


def main():
    jasite = json.load(open(os.path.join(SC, "ja_no_site.json"), encoding="utf-8"))
    vered = {}
    for i in (1, 2):
        p = os.path.join(SC, f"saida_novos_{i}.json")
        if os.path.exists(p):
            for v in json.load(open(p, encoding="utf-8")):
                vered[v["ss"]] = v
    novos = json.load(open(os.path.join(SC, "novos.json"), encoding="utf-8"))
    faltam = [c["ss"] for c in novos if c["ss"] not in vered]
    if faltam:
        print(f"AINDA FALTAM {len(faltam)} vereditos: {faltam[:5]}…")
        return 1

    linhas = []
    for c in jasite:
        s = c["site"]
        cat = s["categoria_site"]
        linhas.append({**c, "origem_da_analise": "site (jan–jul, já analisado)",
                       "categoria": cat,
                       "categoria_padrao": SINONIMO.get(DO_SITE.get(cat, cat), DO_SITE.get(cat, cat)),
                       "conta_no_indicador": cat in CONTA,
                       "motivo": s.get("motivo") or "",
                       "confianca": "", "evidencia": "", "prova_de_troca": ""})
    for c in novos:
        v = vered[c["ss"]]
        linhas.append({**c, "origem_da_analise": "leitura caso a caso (julho e agosto)",
                       "categoria": v["classificacao"], "categoria_padrao": SINONIMO.get(v["classificacao"], v["classificacao"]),
                       "conta_no_indicador": bool(v["conta_no_indicador"]),
                       "motivo": v.get("justificativa") or "",
                       "confianca": v.get("confianca") or "", "evidencia": v.get("evidencia") or "",
                       "prova_de_troca": v.get("prova_de_troca") or ""})
    linhas.sort(key=lambda l: str(l["abertura"]))
    json.dump(linhas, open(os.path.join(SC, "as_252.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    conta = sum(1 for l in linhas if l["conta_no_indicador"])
    print(f"252 fora do Infotrafo · contam no indicador: {conta} · não contam: {len(linhas) - conta}")
    print()
    for k, n in collections.Counter(l["categoria_padrao"] for l in linhas).most_common():
        marca = "  ← conta" if k in CONTA else ""
        print(f"  {n:4}  {k}{marca}")
    print()
    print("por origem da análise:")
    for k, n in collections.Counter(l["origem_da_analise"] for l in linhas).most_common():
        c = sum(1 for l in linhas if l["origem_da_analise"] == k and l["conta_no_indicador"])
        print(f"  {n:4}  {k} — {c} contam")
    print()
    print("por mês:")
    for k in sorted({str(l["abertura"])[:7] for l in linhas}):
        g = [l for l in linhas if str(l["abertura"])[:7] == k]
        print(f"  {k}: {len(g):3} · contam {sum(1 for l in g if l['conta_no_indicador'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
