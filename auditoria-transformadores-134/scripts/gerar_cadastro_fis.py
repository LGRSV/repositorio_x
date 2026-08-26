"""O cadastro FIS do parque — extração oficial de julho/2026.

Ele mandou a base inteira do parque: FIS_ETO_2026_07_E_TRANSFORMADORES_ID.csv, 96.037
transformadores, e disse o filtro em uma frase: "considere somente os da energisa sem
serem particulares", pela coluna PROPRIETARIO.

POR QUE ISSO IMPORTA E NÃO É CADASTRO POR CADASTRO. Transformador particular não é ativo
da distribuidora: se um deles entrar no indicador de queima, o número está errado por
construção, não por classificação. Até agora a auditoria separava particular pelo prefixo
56 do código operativo, que é uma boa aproximação — mas é só aproximação. Nesta base os
dois critérios discordam em 206 ativos: 30 têm prefixo 56 e são da Energisa, e 176 são
particulares SEM prefixo 56. Seis desses 176 têm prefixo 57, que é justamente o prefixo
que responde por 97,6% do indicador. Ou seja: o prefixo sozinho deixaria passar.

O QUE ESTE SCRIPT NÃO FAZ. Não recalcula nada. O 1.510 continua congelado. O cruzamento
abaixo é leitura ao lado do caso, e o resultado dele — um único particular no 1.510, que
a auditoria já tinha excluído por conta própria — é uma confirmação, não uma correção.

RESSALVA DE JANELA. O cadastro é uma fotografia de julho e o 1.510 é de janeiro a junho.
Ativo trocado ou retirado no meio do caminho pode ter saído do cadastro; por isso os
ausentes são listados em vez de tratados como erro.

RESSALVA DE ELO. Esta extração traz CAP_ELO_FUSIVEL_CARGA preenchido em apenas 349 dos
96.037 registros. Para elo, a fonte boa continua sendo o KMZ da Rede de Distribuição
(53,6% de preenchimento). São duas extrações do mesmo cadastro com completude muito
diferente — não troque uma pela outra sem conferir.

Entrada:  /tmp/fisz/FIS_ETO_2026_07_E_TRANSFORMADORES_ID.csv (do zip que ele subiu)
Saídas:   dados/fis-2026-07-energisa.json.gz   parque inteiro da Energisa, para scripts
          public/cadastro-fis.json             resumo + os ativos que a auditoria discute
"""

import collections
import csv
import gzip
import json
import os

csv.field_size_limit(10 ** 7)

AQUI = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(AQUI, "..", "public")
DADOS = os.path.join(AQUI, "..", "dados")
CSV_FIS = os.environ.get("FIS_CSV", "/tmp/fisz/FIS_ETO_2026_07_E_TRANSFORMADORES_ID.csv")

# os campos que a auditoria usa; o resto da linha fica no CSV de origem
CAMPOS = ["CIRCUITO", "NUMERO_OPERATIVO", "ID_ATIVO", "ID_INSTALACAO", "SPEC_NAME",
          "TENSAO_PRIMARIA", "TENSAO_SECUNDARIA", "POTENCIA_NOMINAL", "QTDFASES",
          "TIPO_LIGACAO", "TIPO_PROTECAO", "POSSUI_CH_FUSIVEL",
          "CAP_ELO_FUSIVEL_CARGA", "CAP_ELO_FUSIVEL_FONTE",
          "FABRICANTE", "DATA_FABRICACAO", "NUMERO_SERIE", "TOMBAMENTO",
          "PROPRIETARIO", "DESC_MUNICIPIO", "REGIONAL", "LOCALIZACAO", "TIPOUNIDADE",
          "NOME_SUBESTACAO", "ID_POSTE", "LAT", "LONG", "COORD_X", "COORD_Y",
          "TUC", "TI", "TIPO_BEM"]

txt = lambda v: "" if v is None else str(v).strip()


# ── ler ─────────────────────────────────────────────────────────────────────
energisa, particular, linhas = {}, {}, 0
with open(CSV_FIS, encoding="latin-1", newline="") as fh:
    for r in csv.DictReader(fh, delimiter=";"):
        linhas += 1
        cod = txt(r.get("NUMERO_OPERATIVO"))
        if not cod:
            continue
        reg = {k: txt(r.get(k)) for k in CAMPOS}
        alvo = particular if reg["PROPRIETARIO"] == "Particular" else energisa
        alvo.setdefault(cod, reg)

print(f"{linhas} linhas · Energisa {len(energisa)} · Particular {len(particular)}")

# o parque inteiro da Energisa, comprimido, para os próximos scripts
os.makedirs(DADOS, exist_ok=True)
with gzip.open(os.path.join(DADOS, "fis-2026-07-energisa.json.gz"), "wt",
               encoding="utf-8", compresslevel=9) as fh:
    json.dump(energisa, fh, ensure_ascii=False)

# a lista de particulares vai à parte e sem compressão: é pequena, e é a resposta para a
# pergunta que mais se repete — "este ativo entra no indicador?". Quem só precisa dela não
# deve ter que carregar os 92 mil da Energisa.
with open(os.path.join(DADOS, "fis-2026-07-particulares.json"), "w",
          encoding="utf-8") as fh:
    json.dump({"fonte": "FIS_ETO_2026_07 · coluna PROPRIETARIO",
               "total": len(particular),
               "codigos": sorted(particular)}, fh, ensure_ascii=False, indent=1)


# ── o prefixo 56 não é o mesmo que PROPRIETARIO=Particular ──────────────────
p56 = {c for c in list(energisa) + list(particular) if c.startswith("56")}
pt = set(particular)
so_prefixo = sorted(p56 - pt)          # 56 mas da Energisa
so_coluna = sorted(pt - p56)           # particular sem prefixo 56 — os que escapam
print(f"prefixo 56 mas Energisa: {len(so_prefixo)} · particular sem prefixo 56: {len(so_coluna)}")


# ── cruzar com os universos que a auditoria discute ─────────────────────────
# prefixos de código operativo que são transformador; o resto (chave, poste, religador)
# aparece nos JSON de mês porque o ampliado varre o entorno, e não deve ser cobrado do
# cadastro de transformadores
PREFIXO_TRAFO = ("57", "56", "53", "51", "52", "55", "42", "54")


def universo(arquivo):
    """Devolve {codigo: papel}. 'contado' = está no universo auditado do mês/período;
    'entorno' = veio só da varredura ampliada e não entra em número nenhum."""
    try:
        d = json.load(open(os.path.join(PUB, arquivo), encoding="utf-8"))
    except FileNotFoundError:
        return {}
    out = {}
    for chave, papel in (("ampliado", "entorno"), ("casos", "contado"),
                         ("registros", "contado")):
        for r in d.get(chave, []) or []:
            t = txt(r.get("trafo") or r.get("codigo") or r.get("cod"))
            if t:
                out[t] = papel          # 'registros' vem por último e sobrepõe
    return out


UNIVERSOS = {"1510": "fluxo-1510.json", "julho": "julho-2026.json",
             "agosto": "agosto-2026.json"}

cruzamento, discutidos, expurgo_indicado = {}, set(), []
for nome, arq in UNIVERSOS.items():
    papeis = universo(arq)
    cods = sorted(papeis)
    discutidos |= set(cods)
    trafos = [c for c in cods if c[:2] in PREFIXO_TRAFO]
    achados = [c for c in cods if c in energisa or c in particular]
    ausentes = [c for c in trafos if c not in energisa and c not in particular]
    pts = [c for c in cods if c in particular]
    for c in pts:
        expurgo_indicado.append({
            "codigo": c, "universo": nome, "papel": papeis[c],
            "municipio": particular[c]["DESC_MUNICIPIO"],
            "potencia": particular[c]["POTENCIA_NOMINAL"],
            "spec": particular[c]["SPEC_NAME"],
            "motivo": "PROPRIETARIO = Particular no cadastro FIS de julho/2026",
        })
    cruzamento[nome] = {
        "arquivo": arq,
        "ativos": len(cods),
        "transformadores": len(trafos),
        "no_cadastro": len(achados),
        # só transformador é cobrado do cadastro; chave, poste e religador não estão nele
        "trafos_fora_do_cadastro": ausentes,
        "outros_ativos": len(cods) - len(trafos),
        "particulares": [dict(particular[c], _codigo=c, _papel=papeis[c]) for c in pts],
    }
    print(f"{nome:8s} {len(cods):5d} ativos ({len(trafos)} trafos) · cadastro "
          f"{len(achados):5d} · trafo ausente {len(ausentes)} · particular {len(pts)}")

# só os ativos que a auditoria discute vão para o público — o parque inteiro são 81 MB
por_ativo = {c: (energisa.get(c) or particular.get(c)) for c in sorted(discutidos)
             if c in energisa or c in particular}


# ── resumo do parque ────────────────────────────────────────────────────────
def conta(base, campo, topo=None):
    c = collections.Counter(v.get(campo, "") or "(vazio)" for v in base.values())
    return dict(c.most_common(topo)) if topo else dict(c)


resumo = {
    "total": len(energisa) + len(particular),
    "energisa": len(energisa),
    "particular": len(particular),
    "prefixo": conta(energisa, "NUMERO_OPERATIVO", 0) and dict(
        collections.Counter(c[:2] for c in energisa).most_common(12)),
    "fases": conta(energisa, "QTDFASES"),
    "possui_chave_fusivel": conta(energisa, "POSSUI_CH_FUSIVEL"),
    "tipo_unidade": conta(energisa, "TIPOUNIDADE"),
    "regional": conta(energisa, "REGIONAL"),
    "potencia": dict(collections.Counter(
        v["POTENCIA_NOMINAL"] for v in energisa.values()).most_common(15)),
    "preenchimento": {
        "elo_carga": sum(1 for v in energisa.values() if v["CAP_ELO_FUSIVEL_CARGA"]),
        "elo_fonte": sum(1 for v in energisa.values() if v["CAP_ELO_FUSIVEL_FONTE"]),
        "fabricante_conhecido": sum(1 for v in energisa.values()
                                    if v["FABRICANTE"] not in ("", "Desconhecido")),
        "serie_nao_zerada": sum(1 for v in energisa.values()
                                if v["NUMERO_SERIE"].strip("0")),
        "tombamento": sum(1 for v in energisa.values() if v["TOMBAMENTO"]),
        "coordenada": sum(1 for v in energisa.values() if v["LAT"] and v["LONG"]),
    },
}

saida = {
    "meta": {
        "titulo": "Cadastro FIS do parque — extração oficial de julho/2026",
        "arquivo": "FIS_ETO_2026_07_E_TRANSFORMADORES_ID.csv",
        "linhas": linhas,
        "filtro": "PROPRIETARIO = Energisa (particular fica fora do indicador)",
        "congelado": ("O 1.305 e o 1.510 não foram recalculados. Este cruzamento é "
                      "leitura ao lado do caso."),
        "ressalvas": [
            "O cadastro é de julho e o 1.510 é de janeiro a junho: ativo trocado ou "
            "retirado no meio do caminho pode ter saído do cadastro. Os ausentes estão "
            "listados, não tratados como erro.",
            f"O prefixo 56 não equivale a PROPRIETARIO=Particular: {len(so_prefixo)} "
            f"ativos têm prefixo 56 e são da Energisa, e {len(so_coluna)} são "
            "particulares sem prefixo 56 — seis deles com prefixo 57. Use a coluna.",
            "CAP_ELO_FUSIVEL_CARGA vem preenchido em 349 dos 96.037 registros desta "
            "extração. Para elo, a fonte boa continua sendo o KMZ da Rede de "
            "Distribuição, com 53,6% de preenchimento.",
            "Fabricante e número de série são fracos aqui como em toda extração do FIS. "
            "Para identidade de equipamento, o almoxarifado continua na frente.",
        ],
    },
    "resumo": resumo,
    "particular": {
        "total": len(particular),
        "codigos": sorted(particular),
        "sem_prefixo_56": so_coluna,
        "prefixo_56_mas_energisa": so_prefixo,
    },
    "cruzamento": cruzamento,
    "expurgo_indicado": expurgo_indicado,
    "por_ativo": por_ativo,
}

os.makedirs(PUB, exist_ok=True)
with open(os.path.join(PUB, "cadastro-fis.json"), "w", encoding="utf-8") as fh:
    json.dump(saida, fh, ensure_ascii=False)

tam = os.path.getsize(os.path.join(PUB, "cadastro-fis.json")) / 1e6
print(f"public/cadastro-fis.json · {len(por_ativo)} ativos discutidos · {tam:.1f} MB")
