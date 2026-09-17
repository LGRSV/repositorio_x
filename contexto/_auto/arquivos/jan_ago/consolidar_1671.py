"""O quadro do período inteiro: as 1.671 SS de substituição de janeiro a agosto, categorizadas.

Cada SS recebe uma categoria só, e ela vem de uma de três fontes, nesta ordem:
  1. a leitura caso a caso das 252 fora do Infotrafo;
  2. a leitura caso a caso das 79 de agosto;
  3. a categoria que o site já tinha decidido (janeiro a julho).
"""
import collections, json, os, re, sys

SC = os.path.dirname(os.path.abspath(__file__))
REPO = "/home/user/repositorio_x/auditoria-transformadores-134"
sys.path.insert(0, os.path.join(REPO, "scripts"))
from gerar_planilha_categorias import rotular  # noqa: E402

import openpyxl  # noqa: E402

norm = lambda s: re.sub(r"\s+", " ", str(s or "").strip().upper())
CONTA = {"QUEIMADO", "AVARIADO"}
# a categoria do site traduzida para o vocabulário da leitura caso a caso
DO_SITE = {
    "QUEIMADO": "QUEIMADO", "AVARIADO": "AVARIADO", "FURTO": "FURTO",
    "ABALROAMENTO": "ABALROAMENTO", "PREVENTIVO": "PREVENTIVO/PROGRAMADO",
    "REMANEJAMENTO": "REMANEJAMENTO", "DIVISÃO DE CIRCUITO": "DIVISÃO DE CIRCUITO",
    "TAPE E REGULARIZAÇÃO DE TENSÃO": "TAPE/REGULARIZAÇÃO DE TENSÃO",
    "TRAFO AUXILIAR DE RELIGADOR": "AUXILIAR DE RELIGADOR",
    "DESATIVAÇÃO DE POSTO": "SEM TROCA (não substituído)",
    "CONSTRUÇÃO": "SEM TROCA (não substituído)",
    "COLA E FITA": "SEM TROCA (não substituído)",
}
SINONIMO = {"SEM TROCA": "SEM TROCA (não substituído)"}


def universo():
    p = "/root/.claude/uploads/74dc9c64-5026-54ee-a81e-173d2f38a735/ebe7fd56-Trafo.xlsx"
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    ws = wb["BASE_SS_OS"]
    it = ws.iter_rows(values_only=True)
    hdr = list(next(it))
    linhas = [dict(zip(hdr, r)) for r in it if any(v is not None for v in r)]
    info = {norm(r["NUMERO_SS"]) for r in linhas if not str(r.get("TIPOSS") or "").strip()}
    cheias = {}
    for r in linhas:
        if str(r.get("TIPOSS") or "").strip():
            cheias.setdefault(norm(r["NUMERO_SS"]), r)
    mes = lambda r: str(r.get("DATA_ABERTURA_SS"))[:7] if r.get("DATA_ABERTURA_SS") else ""
    univ = {s: r for s, r in cheias.items()
            if str(r.get("ESQUEMA") or "") == "MC - SUBSTITUIÇÃO DE TRANSFORMADOR"
            and "2026-01" <= mes(r) <= "2026-08"}
    return univ, info


def main():
    univ, info = universo()
    a252 = {norm(l["ss"]): l for l in json.load(open(f"{SC}/as_252.json", encoding="utf-8"))}
    ago = {}
    for i in (1, 2, 3):
        p = f"{SC}/saida_ago_{i}.json"
        if os.path.exists(p):
            for v in json.load(open(p, encoding="utf-8")):
                ago[norm(v["ss"])] = v
    site = {norm(r["ss"]): r for r in json.load(open(f"{REPO}/public/fluxo-1582.json"))["registros"]}
    mapa = json.load(open(f"{REPO}/public/categorias-extracao.json"))

    linhas, faltam = [], []
    for s, r in univ.items():
        base = {"ss": r["NUMERO_SS"], "os": r.get("NUMERO_OS"), "obra": r.get("NUM_OBRA"),
                "trafo": r.get("NUM_TRAFO"),
                "abertura": str(r.get("DATA_ABERTURA_SS") or "").replace("T", " ")[:16],
                "localidade": r.get("LOCALIDADE"), "equipe": r.get("COD_EQUIPE"),
                "origem_ss": r.get("ORIGEM_SS"), "defeito_ss": r.get("DEFEITO_SS"),
                "tipo_ss": r.get("TIPOSS"), "situacao": r.get("SITUACAO_SS"),
                "no_infotrafo": "SIM" if s in info else "não"}
        if s in a252:
            a = a252[s]
            base.update({"categoria": SINONIMO.get(a["categoria_padrao"], a["categoria_padrao"]),
                         "fonte": a["origem_da_analise"], "confianca": a.get("confianca", ""),
                         "motivo": a.get("motivo", "")})
        elif s in ago:
            v = ago[s]
            base.update({"categoria": SINONIMO.get(v["classificacao"], v["classificacao"]),
                         "fonte": "leitura caso a caso (agosto)", "confianca": v.get("confianca", ""),
                         "motivo": v.get("justificativa", "")})
        elif s in site:
            cat = rotular(site[s], mapa)
            cat = SINONIMO.get(DO_SITE.get(cat, cat), DO_SITE.get(cat, cat))
            base.update({"categoria": cat, "fonte": "site (jan–jul, já analisado)",
                         "confianca": "", "motivo": site[s].get("cascata_motivo") or ""})
        else:
            faltam.append(r["NUMERO_SS"])
            continue
        base["conta_no_indicador"] = base["categoria"] in CONTA
        base["mes"] = base["abertura"][:7]
        linhas.append(base)

    if faltam:
        print(f"AINDA FALTAM {len(faltam)} sem categoria: {faltam[:5]}…")
        return 1
    linhas.sort(key=lambda l: l["abertura"])
    json.dump(linhas, open(f"{SC}/as_1671.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    conta = sum(1 for l in linhas if l["conta_no_indicador"])
    print(f"{len(linhas)} SS de substituição jan–ago · contam {conta} · não contam {len(linhas)-conta}")
    print()
    for k, n in collections.Counter(l["categoria"] for l in linhas).most_common():
        print(f"  {n:5}  {k}{'  ← conta' if k in CONTA else ''}")
    print()
    print("por mês (contam / total):")
    for m in sorted({l["mes"] for l in linhas}):
        g = [l for l in linhas if l["mes"] == m]
        q = sum(1 for l in g if l["categoria"] == "QUEIMADO")
        a = sum(1 for l in g if l["categoria"] == "AVARIADO")
        print(f"  {m}: {q+a:4} / {len(g):4}   (queimado {q}, avariado {a})")
    print()
    print("dentro × fora do Infotrafo:")
    for chave in ("SIM", "não"):
        g = [l for l in linhas if l["no_infotrafo"] == chave]
        print(f"  {'no Infotrafo' if chave=='SIM' else 'fora do Infotrafo'}: {len(g):5} · contam {sum(1 for l in g if l['conta_no_indicador'])}")
    print()
    print("fonte da categoria:", collections.Counter(l["fonte"] for l in linhas).most_common())
    return 0


if __name__ == "__main__":
    sys.exit(main())
