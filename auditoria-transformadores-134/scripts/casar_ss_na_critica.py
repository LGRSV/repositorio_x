"""Casa uma lista de SS contra a Crítica, com a mesma janela do site.

Ocorrência = todos os passos que compartilham NUM_SEQ_OPER_INIC_HDE; a janela vai do
primeiro DTA_ABERT ao último DTA_FECH; a SS casa quando sua abertura cai entre
(início − 1h) e (fim + 24h). Três colunas de ativo: problema, interrompido, fechado.
Quando o trafo não aparece em papel nenhum, procura a chave gêmea (03 + 8 dígitos finais).
"""
import collections, csv, datetime as dt, glob, io, json, os, re, sys

csv.field_size_limit(10 ** 8)  # a observação da Crítica tem campos enormes

ANTES = dt.timedelta(hours=1)
DEPOIS = dt.timedelta(hours=24)
ORDEM_PAPEL = {"problema": 0, "interrompido": 1, "fechado": 2}


def data(v):
    v = str(v or "").strip()
    v = v.replace("T", " ")
    for f in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d"):
        try:
            return dt.datetime.strptime(v, f)
        except ValueError:
            pass
    return None


def ler_critica(pastas):
    ocs = collections.defaultdict(lambda: {"ini": None, "fim": None, "passos": 0, "papeis": set(),
                                           "causa": "", "sub": "", "cons": 0, "obs": "", "cods": set()})
    por_codigo = collections.defaultdict(set)
    for caminho in sorted(glob.glob(os.path.join(pastas, "Critica-CHEIO_*.txt"))):
        with io.open(caminho, encoding="latin-1", newline="") as fh:
            leitor = csv.DictReader(fh, delimiter=";")
            for linha in leitor:
                seq = str(linha.get("NUM_SEQ_OPER_INIC_HDE") or "").strip()
                if not seq:
                    continue
                o = ocs[seq]
                ab, fe = data(linha.get("DTA_ABERT")), data(linha.get("DTA_FECH"))
                if ab and (o["ini"] is None or ab < o["ini"]):
                    o["ini"] = ab
                if fe and (o["fim"] is None or fe > o["fim"]):
                    o["fim"] = fe
                o["passos"] += 1
                for col, papel in (("COD_ELE_PROBLEMA", "problema"),
                                   ("COD_ELE_INTERROMPIDO", "interrompido"),
                                   ("COD_ELE_FECHADO", "fechado")):
                    cod = str(linha.get(col) or "").strip()
                    if cod:
                        o["cods"].add((cod, papel))
                        por_codigo[cod].add(seq)
                if not o["causa"]:
                    o["causa"] = str(linha.get("DES_CAUSA_INTER_CAU") or "").strip()
                    o["sub"] = str(linha.get("DES_SUB_CAUSA_INTER_SCR") or "").strip()
                obs = str(linha.get("OBSERVACAO") or "").strip()
                if obs and not o["obs"]:
                    o["obs"] = obs
                try:
                    o["cons"] = max(o["cons"], int(float(str(linha.get("QTD_CONS_INTER_FAT") or 0).replace(",", "."))))
                except ValueError:
                    pass
    return ocs, por_codigo


def distancia(abertura, ini, fim):
    if abertura < ini - ANTES:
        return (ini - ANTES - abertura).total_seconds() / 3600
    if abertura > fim + DEPOIS:
        return (abertura - fim - DEPOIS).total_seconds() / 3600
    return 0.0


def procurar(codigo, abertura, ocs, por_codigo):
    seqs = por_codigo.get(codigo)
    if not seqs:
        return None, None, 0
    dentro, fora = [], []
    for seq in seqs:
        o = ocs[seq]
        if not o["ini"]:
            continue
        fim = o["fim"] or o["ini"]
        papeis = sorted({p for c, p in o["cods"] if c == codigo}, key=lambda p: ORDEM_PAPEL.get(p, 9))
        d = distancia(abertura, o["ini"], fim)
        alvo = dentro if d == 0 else fora
        alvo.append((0 if "problema" in papeis else 1, abs((abertura - o["ini"]).total_seconds()), d, seq, papeis))
    if dentro:
        dentro.sort()
        _, _, d, seq, papeis = dentro[0]
        return seq, papeis, len(seqs)
    if fora:
        fora.sort(key=lambda x: x[2])
        _, _, d, seq, papeis = fora[0]
        return seq, papeis, len(seqs)
    return None, None, len(seqs)


def main():
    entrada, pasta_crit, saida = sys.argv[1], sys.argv[2], sys.argv[3]
    casos = json.load(open(entrada, encoding="utf-8"))
    ocs, por_codigo = ler_critica(pasta_crit)
    print(f"Crítica: {len(ocs)} ocorrências, {len(por_codigo)} códigos")
    fora_cobertura = []
    for c in casos:
        ab = data(c.get("DATA_ABERTURA_SS"))
        trafo = re.sub(r"\D", "", str(c.get("NUM_TRAFO") or ""))
        c["_abertura"] = ab.isoformat(sep=" ") if ab else ""
        c["critica"] = {}
        if not ab or not trafo:
            c["critica"] = {"resultado": "SEM DATA OU SEM TRAFO"}
            continue
        if ab.strftime("%Y-%m") == "2026-07":
            c["critica"] = {"resultado": "SEM CRÍTICA — julho não carregado"}
            fora_cobertura.append(c["NUMERO_SS"])
            continue
        seq, papeis, n = procurar(trafo, ab, ocs, por_codigo)
        via = "trafo"
        if seq is None:
            chave = "03" + trafo[-8:]
            seq, papeis, n = procurar(chave, ab, ocs, por_codigo)
            via = "chave gêmea"
        if seq is None:
            c["critica"] = {"resultado": "AUSENTE DA CRÍTICA", "n_ocorrencias": n}
            continue
        o = ocs[seq]
        fim = o["fim"] or o["ini"]
        d = distancia(ab, o["ini"], fim)
        c["critica"] = {
            "resultado": ("CASOU PELO TRAFO" if via == "trafo" and d == 0 else
                          "CASOU PELA CHAVE GÊMEA" if d == 0 else
                          ("TRAFO FORA DA JANELA" if via == "trafo" else "CHAVE FORA DA JANELA")),
            "ocorrencia": seq, "inicio": o["ini"].isoformat(sep=" "), "fim": fim.isoformat(sep=" "),
            "papel": "+".join(papeis or []), "dist_h": round(d, 2), "causa": o["causa"], "subcausa": o["sub"],
            "clientes": o["cons"], "obs": o["obs"][:300], "n_ocorrencias": n, "passos": o["passos"],
        }
    json.dump(casos, open(saida, "w", encoding="utf-8"), ensure_ascii=False, default=str, indent=1)
    print(collections.Counter(c["critica"].get("resultado") for c in casos).most_common())
    print(f"sem Crítica de julho: {len(fora_cobertura)}")
    print(saida)


if __name__ == "__main__":
    main()
