"""O clima do dia em que cada transformador de julho e agosto falhou.

Duas perguntas, duas fontes, e nenhuma delas responde a pergunta da outra:

  RAIO — GOES-19 / GLM (Geostationary Lightning Mapper), arquivo aberto da NOAA.
    O satélite enxerga o clarão do raio de cima, em arquivos de 20 segundos. Varre o dia
    LOCAL inteiro (03:00 UTC do dia até 02:59 UTC do seguinte) sobre o retângulo do
    Tocantins, e guarda cada raio com hora, latitude e longitude.
    O que ele NÃO faz: dizer onde o raio tocou o chão. O erro de posição é da ordem de
    10 km e ele detecta de 70% a 90% dos raios. Serve para "houve tempestade nesta
    região", nunca para "o raio caiu neste poste".

  CHUVA — MERGE/CPTEC do INPE, que combina satélite com os pluviômetros do país.
    Grade de 0,1 grau, cerca de 11 km. Total do dia e a série de 24 horas no ponto.
    Uma célula de verão tem 5 km: pode ter chovido no poste e não na célula da grade,
    e o contrário também.

O cruzamento que isto permite é assimétrico, e vale dizer em voz alta: caso declarado como
descarga atmosférica SEM nenhum raio detectado perto, num dia de boa cobertura, é caso para
revisar. O contrário não vale — raio perto não prova causa.

Julho e agosto são estação seca no Tocantins. Era esperado que a maioria dos dias viesse
vazia, e vir vazio é informação, não falha.
"""

import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import h5py
import numpy as np
import pygrib

GLM = "https://noaa-goes19.s3.amazonaws.com"
MERGE = "http://ftp.cptec.inpe.br/modelos/tempo/MERGE/GPM"
LAT_TO, LON_TO = (-13.6, -5.0), (-50.9, -45.6)      # Tocantins com folga
TMP = "/tmp/climatmp"
os.makedirs(TMP, exist_ok=True)
plano = json.load(open("/tmp/clima_plano.json"))
casos = plano["casos"]


def aviso(*a):
    print(*a, flush=True)


# ── as horas UTC que cobrem o dia LOCAL de cada caso ───────────────────────
dias_locais = sorted({datetime.fromisoformat(c["quando"]).strftime("%Y-%m-%d") for c in casos})
horas = set()
for d in dias_locais:
    ini = datetime.strptime(d, "%Y-%m-%d") + timedelta(hours=3)   # 00:00 local = 03:00 UTC
    for h in range(24):
        horas.add((ini + timedelta(hours=h)).strftime("%Y/%j/%H"))
horas = sorted(horas)
aviso(f"{len(dias_locais)} dias locais · {len(horas)} horas UTC · ~{len(horas)*180} arquivos GLM")


# ── raios ──────────────────────────────────────────────────────────────────
def listar(h):
    tok, ch = "", []
    while True:
        u = f"{GLM}/?list-type=2&max-keys=1000&prefix=GLM-L2-LCFA/{h}/"
        if tok:
            u += f"&continuation-token={tok}"
        xml = subprocess.run(["curl", "-s", "--max-time", "60", u],
                             capture_output=True, text=True).stdout
        ch += [l.split("</Key>")[0] for l in xml.split("<Key>")[1:]]
        if "<IsTruncated>true" in xml:
            tok = (xml.split("<NextContinuationToken>")[1].split("<")[0]
                   .replace("+", "%2B").replace("=", "%3D").replace("/", "%2F"))
        else:
            return ch


def pega(k):
    """Baixa, filtra para o Tocantins e apaga. O disco não cresce com 181 mil arquivos."""
    d = f"{TMP}/{os.path.basename(k)}"
    subprocess.run(["curl", "-s", "--max-time", "90", "-o", d, f"{GLM}/{k}"],
                   capture_output=True)
    fora = []
    try:
        if os.path.getsize(d) > 1000:
            with h5py.File(d, "r") as f:
                if "flash_lat" in f:
                    la, lo = f["flash_lat"][:], f["flash_lon"][:]
                    m = ((la >= LAT_TO[0]) & (la <= LAT_TO[1])
                         & (lo >= LON_TO[0]) & (lo <= LON_TO[1]))
                    if m.any():
                        # OR_GLM-L2-LCFA_G19_sYYYYDDDHHMMSSs -> segundo de início
                        t = os.path.basename(k).split("_s")[1][:13]
                        fora = [[t, round(float(a), 4), round(float(b), 4)]
                                for a, b in zip(la[m], lo[m])]
    except Exception:
        pass
    finally:
        try:
            os.remove(d)
        except OSError:
            pass
    return fora


CACHE = "/tmp/raios_to.json"
if os.path.exists(CACHE):
    raios = json.load(open(CACHE))
    aviso(f"raios já coletados: {len(raios)}")
else:
    raios, t0 = [], time.time()
    with ThreadPoolExecutor(24) as ex:
        chaves = [k for lote in ex.map(listar, horas) for k in lote]
    aviso(f"{len(chaves)} arquivos listados em {time.time()-t0:.0f}s")
    t0 = time.time()
    with ThreadPoolExecutor(32) as ex:
        for i, r in enumerate(ex.map(pega, chaves, chunksize=8)):
            raios += r
            if i % 20000 == 0 and i:
                aviso(f"  {i}/{len(chaves)} · {len(raios)} raios · "
                      f"{i/(time.time()-t0):.0f} arq/s")
    json.dump(raios, open(CACHE, "w"))
    aviso(f"raios no Tocantins nos {len(dias_locais)} dias: {len(raios)} "
          f"(em {time.time()-t0:.0f}s)")


# ── chuva ──────────────────────────────────────────────────────────────────
def grib(url, destino):
    if not os.path.exists(destino):
        subprocess.run(["curl", "-sL", "--max-time", "120", "-o", destino, url],
                       capture_output=True)
    return destino if os.path.exists(destino) and os.path.getsize(destino) > 5000 else None


def ponto(msg_data, lat, lon):
    """O valor da célula de 0,1 grau que contém o ponto. A longitude do MERGE é 0–360."""
    v, la, lo = msg_data
    lon360 = lon % 360
    i = int(np.argmin(np.abs(la[:, 0] - lat)))
    j = int(np.argmin(np.abs(lo[0, :] - lon360)))
    x = float(v[i, j])
    return None if np.isnan(x) else round(x, 2)


CH_CHUVA = "/tmp/chuva_to.json"
if os.path.exists(CH_CHUVA):
    chuva = json.load(open(CH_CHUVA))
    aviso(f"chuva já coletada: {len(chuva)} dias")
else:
    chuva = {}
    for d in dias_locais:
        aa, mm, dd = d.split("-")
        cam = grib(f"{MERGE}/DAILY/{aa}/{mm}/MERGE_CPTEC_{aa}{mm}{dd}.grib2",
                   f"{TMP}/d{aa}{mm}{dd}.grib2")
        dia_dados = None
        if cam:
            try:
                g = pygrib.open(cam)
                dia_dados = next(iter(g)).data()
            except Exception:
                dia_dados = None
        horas_dados = {}
        for h in range(24):                        # hora LOCAL -> UTC
            u = (datetime.strptime(d, "%Y-%m-%d") + timedelta(hours=3 + h))
            ha, hm, hd, hh = u.strftime("%Y"), u.strftime("%m"), u.strftime("%d"), u.strftime("%H")
            c2 = grib(f"{MERGE}/HOURLY/{ha}/{hm}/{hd}/MERGE_CPTEC_{ha}{hm}{hd}{hh}.grib2",
                      f"{TMP}/h{ha}{hm}{hd}{hh}.grib2")
            if c2:
                try:
                    horas_dados[h] = next(iter(pygrib.open(c2))).data()
                except Exception:
                    pass
        chuva[d] = {"dia": dia_dados, "horas": horas_dados}
        aviso(f"  chuva {d}: diário {'ok' if dia_dados is not None else 'FALTOU'} · "
              f"{len(horas_dados)}/24 horários")
    # os arrays não vão para JSON; o casamento é feito aqui mesmo, logo abaixo


# ── casar cada caso com o que aconteceu no céu dele ────────────────────────
def km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1 = np.radians(lat1)
    dp = np.radians(lat2 - lat1)
    dl = np.radians(lon2 - lon1)
    a = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(np.radians(lat2)) * np.sin(dl / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def hora_do(t):
    """YYYYDDDHHMMSS do nome do arquivo -> datetime UTC."""
    return datetime.strptime(t[:11], "%Y%j%H%M") + timedelta(seconds=int(t[11:13]))


if raios:
    rt = np.array([hora_do(r[0]).timestamp() for r in raios])
    rla = np.array([r[1] for r in raios])
    rlo = np.array([r[2] for r in raios])
else:
    rt = rla = rlo = np.array([])

saida = {}
for c in casos:
    q = datetime.fromisoformat(c["quando"])
    qutc = (q + timedelta(hours=3)).timestamp()
    d = q.strftime("%Y-%m-%d")
    item = {"quando": c["quando"], "fonte_hora": c["fonte_hora"], "mes": c["mes"],
            "lat": round(c["lat"], 5), "lon": round(c["lon"], 5)}

    # raios
    if len(rt):
        dist = km(c["lat"], c["lon"], rla, rlo)
        dt_min = (rt - qutc) / 60.0
        no_dia = np.abs(dt_min) <= 12 * 60
        for raio_km in (5, 20, 50):
            item[f"raios_{raio_km}km_dia"] = int(((dist <= raio_km) & no_dia).sum())
            item[f"raios_{raio_km}km_3h"] = int(((dist <= raio_km) & (np.abs(dt_min) <= 180)).sum())
        perto = np.where(no_dia & (dist <= 100))[0]
        if len(perto):
            i = perto[int(np.argmin(dist[perto]))]
            item["mais_perto_km"] = round(float(dist[i]), 1)
            item["mais_perto_min"] = int(round(float(dt_min[i])))
            j = perto[int(np.argmin(np.abs(dt_min[perto])))]
            item["mais_proximo_no_tempo_min"] = int(round(float(dt_min[j])))
            item["mais_proximo_no_tempo_km"] = round(float(dist[j]), 1)
    else:
        for raio_km in (5, 20, 50):
            item[f"raios_{raio_km}km_dia"] = 0
            item[f"raios_{raio_km}km_3h"] = 0

    # chuva
    cd = chuva.get(d) or {}
    if cd.get("dia") is not None:
        item["chuva_dia_mm"] = ponto(cd["dia"], c["lat"], c["lon"])
    serie = {}
    for h, dados in (cd.get("horas") or {}).items():
        v = ponto(dados, c["lat"], c["lon"])
        if v is not None:
            serie[int(h)] = v
    if serie:
        item["chuva_horas"] = [serie.get(h, 0.0) for h in range(24)]
        item["chuva_3h_antes"] = round(sum(serie.get(hh, 0.0)
                                           for hh in range(max(0, q.hour - 3), q.hour + 1)), 2)
        item["chuva_hora_do_evento_mm"] = serie.get(q.hour)
        item["chuva_horas_lidas"] = len(serie)
    saida[c["ss"]] = item

com_raio = sum(1 for v in saida.values() if v.get("raios_20km_dia", 0) > 0)
com_chuva = sum(1 for v in saida.values() if (v.get("chuva_dia_mm") or 0) > 0.1)
aviso(f"\ncasos: {len(saida)} · com raio a 20 km no dia: {com_raio} · com chuva no dia: {com_chuva}")

json.dump({
    "gerado_em": "15/08/2026",
    "casos": len(saida),
    "dias": len(dias_locais),
    "raios_no_tocantins": len(raios),
    "fontes": [
        {"nome": "GOES-19 · GLM (Geostationary Lightning Mapper)",
         "orgao": "NOAA · National Oceanic and Atmospheric Administration",
         "onde": "noaa-goes19.s3.amazonaws.com · GLM-L2-LCFA",
         "resolucao": "arquivos de 20 segundos · erro de posição da ordem de 10 km",
         "o_que_mede": "o clarão do raio visto do espaço — raio na nuvem e raio para o solo",
         "limite": "detecta de 70% a 90% dos raios e NÃO diz onde o raio tocou o chão. "
                   "Ausência de detecção não é prova de que não houve raio."},
        {"nome": "MERGE/CPTEC · precipitação",
         "orgao": "INPE · Instituto Nacional de Pesquisas Espaciais",
         "onde": "ftp.cptec.inpe.br/modelos/tempo/MERGE/GPM",
         "resolucao": "grade de 0,1 grau (~11 km) · total diário e série horária",
         "o_que_mede": "satélite GPM combinado com os pluviômetros da rede brasileira",
         "limite": "uma célula de chuva de verão tem 5 km: a grade pode ter registrado "
                   "chuva que não caiu no poste, e o contrário também."},
    ],
    "como_ler": "Raio perto NÃO prova que ele causou a queima. O cruzamento forte é o "
                "contrário: caso declarado como descarga atmosférica sem nenhum raio "
                "detectado perto, num dia de boa cobertura, é caso para revisar. Julho e "
                "agosto são estação seca no Tocantins — dia vazio é o esperado, e vir "
                "vazio é informação, não falha.",
    "por_ss": saida,
}, open("/home/user/repositorio_x/auditoria-transformadores-134/public/clima-mes.json", "w"),
    ensure_ascii=False, separators=(",", ":"))
aviso("gravado public/clima-mes.json")
