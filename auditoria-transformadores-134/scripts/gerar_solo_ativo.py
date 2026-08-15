"""O tipo de solo debaixo de cada transformador.

Ele pediu: "traz o tipo de solo em que o transformador está instalado, já existe um
mapeamento dos tipos de solo do Tocantins". Existe — e é público: a camada de pedologia
da Base de Dados de Informações Ambientais do IBGE, servida por WFS. São 7.736 polígonos
cobrindo o retângulo do estado, com ordem, subordem, grande grupo, textura, relevo,
erosão, pedregosidade e rochosidade.

Por que isso importa nesta auditoria, e não é curiosidade: o aterramento é o caminho que
a descarga atmosférica usa para ir embora, e a resistência dele depende do solo. Areia
quartzosa seca e afloramento de rocha dão resistência alta; solo argiloso e úmido dá
baixa. A auditoria já mede a resistência das hastes antes e depois do serviço — cruzar
essa medida com o solo é a pergunta que nenhuma das duas fontes responde sozinha.

O que este script NÃO faz: dizer que o solo causou a queima. Ele só coloca o dado ao lado
do caso. Correlação com 1.473 pontos e nove meses de dados não fecha causa nenhuma, e a
tela diz isso.

Fonte: IBGE/BDIA, camada pedo_area, escala 1:250.000. Nessa escala um polígono cobre
quilômetros — o solo é o da REGIÃO do poste, não o do buraco da haste.
"""

import json
import os
from collections import Counter

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
PEDO = "/tmp/pedo_to.json"     # baixado do WFS do IBGE (ver o cabeçalho)


def txt(v):
    return "" if v is None else str(v).strip()


# ── os pontos: um por transformador ────────────────────────────────────────
ativos = {}
for arq in ("fluxo-1510.json", "julho-2026.json", "agosto-2026.json"):
    d = json.load(open(f"{APP}/{arq}", encoding="utf-8"))
    for chave in ("registros", "ampliado"):
        for r in d.get(chave, []):
            t = txt(r.get("trafo"))
            if t and t not in ativos and r.get("lat") and r.get("lon"):
                ativos[t] = (float(r["lon"]), float(r["lat"]))
print(f"{len(ativos)} transformadores com coordenada no publicado")

# ── E OS QUE NÃO TÊM. Julho e agosto nasceram sem lat/lon: nenhum dos 72 e dos 27 traz
#    coordenada no JSON do mês, então ficariam sem solo. A base de SS/OS guarda COORD_X e
#    COORD_Y por solicitação (43.414 das 46.216), em UTM 22S como as obras. É a mesma
#    fonte de que saiu a coordenada das 1.510 — só que ali ela já vinha convertida.
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "analise-mensal"))
from base import ler_ss_os, indexar          # noqa: E402
from pyproj import Transformer               # noqa: E402

BASES = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/bases_11-08-2026"
para_geo = Transformer.from_crs("EPSG:31982", "EPSG:4326", always_xy=True)
cabB, regsB = ler_ss_os(f"{BASES}/BASE_SS_OS_parte1.txt", f"{BASES}/BASE_SS_OS_parte2.txt")
campoB = indexar(cabB)
achados = 0
# só os ativos que a auditoria discute: o arquivo é lido dentro do dossiê, e carregar o
# solo dos 22 mil transformadores da base inteira seria 11 MB para mostrar um parágrafo
quero = set(json.load(open(f"{APP}/historico-ativo.json", encoding="utf-8"))["por_ativo"])
ativos = {t: v for t, v in ativos.items() if t in quero}
for r in regsB:
    t = campoB(r, "NUM_TRAFO").strip()
    if not t or t in ativos or t not in quero:
        continue
    try:
        leste, norte = float(campoB(r, "COORD_X")), float(campoB(r, "COORD_Y"))
    except ValueError:
        continue
    if not (100_000 < leste < 1_000_000 and 7_000_000 < norte < 10_500_000):
        continue
    lon, lat = para_geo.transform(leste, norte)
    ativos[t] = (lon, lat)
    achados += 1
print(f"+{achados} vindos da base de SS/OS (COORD_X/COORD_Y em UTM 22S) — total {len(ativos)}")

# ── os polígonos ───────────────────────────────────────────────────────────
pedo = json.load(open(PEDO, encoding="utf-8"))
print(f"{len(pedo['features'])} polígonos de pedologia no retângulo do estado")


def caixa(coords):
    xs, ys = [], []

    def anda(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for x in c:
                anda(x)
    anda(coords)
    return min(xs), min(ys), max(xs), max(ys)


def dentro_anel(x, y, anel):
    """Raio para a direita, contando cruzamentos — o teste clássico e suficiente aqui."""
    dentro = False
    n = len(anel)
    for i in range(n):
        x1, y1 = anel[i][0], anel[i][1]
        x2, y2 = anel[(i + 1) % n][0], anel[(i + 1) % n][1]
        if (y1 > y) != (y2 > y):
            xc = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xc:
                dentro = not dentro
    return dentro


def dentro_poligono(x, y, geom):
    partes = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    for p in partes:
        if not p:
            continue
        if dentro_anel(x, y, p[0]) and not any(dentro_anel(x, y, buraco) for buraco in p[1:]):
            return True
    return False


# grade grossa para não testar 1.473 × 7.736 polígonos inteiros
CEL = 0.5
grade = {}
prep = []
for f in pedo["features"]:
    g = f.get("geometry")
    if not g:
        continue
    b = caixa(g["coordinates"])
    prep.append((b, g, f["properties"]))
    i = len(prep) - 1
    for gx in range(int(b[0] // CEL), int(b[2] // CEL) + 1):
        for gy in range(int(b[1] // CEL), int(b[3] // CEL) + 1):
            grade.setdefault((gx, gy), []).append(i)

CAMPOS = ("legenda", "ordem", "subordem", "grande_gru", "subgrupos", "textura",
          "horizonte", "erosao", "pedregosid", "rochosidad", "relevo",
          "componente", "cd_fcim")
solo = {}
sem = []
for t, (x, y) in ativos.items():
    achou = None
    for i in grade.get((int(x // CEL), int(y // CEL)), []):
        b, g, props = prep[i]
        if not (b[0] <= x <= b[2] and b[1] <= y <= b[3]):
            continue
        if dentro_poligono(x, y, g):
            achou = props
            break
    if achou:
        solo[t] = {k: txt(achou.get(k)) for k in CAMPOS if txt(achou.get(k))}
    else:
        sem.append(t)

print(f"com solo identificado: {len(solo)} · sem polígono debaixo: {len(sem)}")
print("\nas dez classes mais comuns debaixo dos transformadores da auditoria:")
for k, q in Counter(v.get("legenda", "—") for v in solo.values()).most_common(10):
    print(f"  {q:4d}  {k[:96]}")
print("\npor ordem (o primeiro nível da classificação):")
for k, q in Counter(v.get("ordem") or "não informada" for v in solo.values()).most_common():
    print(f"  {q:4d}  {k}")

cam = f"{APP}/solo-ativo.json"
json.dump({"fonte": "IBGE · Base de Dados de Informações Ambientais · pedologia (pedo_area)",
           "escala": "1:250.000",
           "o_que_e": "A classe de solo do polígono em que a coordenada do transformador cai. "
                      "Nesta escala um polígono cobre quilômetros: é o solo da REGIÃO do poste, "
                      "não o do buraco onde a haste foi cravada.",
           "gerado_em": "15/08/2026", "com_solo": len(solo), "sem_solo": len(sem),
           "por_ativo": solo},
          open(cam, "w"), ensure_ascii=False, separators=(",", ":"))
print(f"\ngravado: {cam} ({os.path.getsize(cam)/1024:.0f} KB)")
