"""Estende o mapeamento climático para a SEMANA anterior a cada falha.

Por que a semana e não só o dia: transformador queimado por surto nem sempre morre na
hora. Isolamento perfurado por descarga pode falhar horas ou dias depois, e o para-raios
que "salvou" o equipamento numa tempestade da terça pode ter chegado ao fim da vida útil e
deixado passar na quinta. Olhar só o dia da SS trata o caso como se o céu tivesse memória
de 24 horas.

O custo foi baixo porque os dias de evento cobrem 01/07 a 11/08 sem nenhum buraco: dos
oito dias que cada caso precisa (o dia e os sete anteriores), só faltavam os sete últimos
de junho. Os outros já estavam coletados.

O que isto NÃO autoriza a dizer: quanto mais longe do evento, mais fraca a ligação. Um raio
a 15 km seis dias antes não explica nada sozinho — é contexto, e a tela chama de contexto.
O número que continua valendo como achado é o do próprio dia.
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
LAT_TO, LON_TO = (-13.6, -5.0), (-50.9, -45.6)
TMP = "/tmp/climatmp"
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
os.makedirs(TMP, exist_ok=True)


def aviso(*a):
    print(*a, flush=True)


novos = json.load(open("/tmp/dias_novos.json"))
raios = json.load(open("/tmp/raios_to.json"))
aviso(f"{len(raios)} raios já coletados · {len(novos)} dias novos")


# ── os sete dias de junho que faltavam ─────────────────────────────────────
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


CACHE = "/tmp/raios_semana.json"
if os.path.exists(CACHE):
    raios = json.load(open(CACHE))
    aviso(f"raios (dia + semana) já coletados: {len(raios)}")
else:
    horas = []
    for d in novos:
        ini = datetime.strptime(d, "%Y-%m-%d") + timedelta(hours=3)
        horas += [(ini + timedelta(hours=h)).strftime("%Y/%j/%H") for h in range(24)]
    t0 = time.time()
    with ThreadPoolExecutor(24) as ex:
        chaves = [k for lote in ex.map(listar, horas) for k in lote]
    aviso(f"{len(chaves)} arquivos a baixar")
    novos_raios = []
    with ThreadPoolExecutor(32) as ex:
        for i, r in enumerate(ex.map(pega, chaves, chunksize=8)):
            novos_raios += r
            if i % 10000 == 0 and i:
                aviso(f"  {i}/{len(chaves)} · +{len(novos_raios)} raios")
    raios += novos_raios
    json.dump(raios, open(CACHE, "w"))
    aviso(f"+{len(novos_raios)} raios em {time.time()-t0:.0f}s · total {len(raios)}")


# ── chuva dos dias novos ───────────────────────────────────────────────────
def grib(url, destino):
    if not os.path.exists(destino):
        subprocess.run(["curl", "-sL", "--max-time", "120", "-o", destino, url],
                       capture_output=True)
    return destino if os.path.exists(destino) and os.path.getsize(destino) > 5000 else None


todos_dias = sorted(set(novos) | {v["quando"][:10]
                                  for v in json.load(open(f"{APP}/clima-mes.json",
                                                          encoding="utf-8"))["por_ss"].values()})
diarios = {}
for d in todos_dias:
    aa, mm, dd = d.split("-")
    cam = grib(f"{MERGE}/DAILY/{aa}/{mm}/MERGE_CPTEC_{aa}{mm}{dd}.grib2",
               f"{TMP}/d{aa}{mm}{dd}.grib2")
    if cam:
        try:
            diarios[d] = next(iter(pygrib.open(cam))).data()
        except Exception:
            pass
aviso(f"chuva diária disponível em {len(diarios)}/{len(todos_dias)} dias")


def ponto(dados, lat, lon):
    v, la, lo = dados
    i = int(np.argmin(np.abs(la[:, 0] - lat)))
    j = int(np.argmin(np.abs(lo[0, :] - (lon % 360))))
    x = float(v[i, j])
    return None if np.isnan(x) else round(x, 2)


# ── juntar tudo no arquivo do site ─────────────────────────────────────────
def hora_do(t):
    return datetime.strptime(t[:11], "%Y%j%H%M") + timedelta(seconds=int(t[11:13]))


rt = np.array([hora_do(r[0]).timestamp() for r in raios])
rla = np.array([r[1] for r in raios])
rlo = np.array([r[2] for r in raios])
ordem = np.argsort(rt)
rt, rla, rlo = rt[ordem], rla[ordem], rlo[ordem]


def km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dp = np.radians(lat2 - lat1)
    dl = np.radians(lon2 - lon1)
    a = (np.sin(dp / 2) ** 2
         + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dl / 2) ** 2)
    return 2 * R * np.arcsin(np.sqrt(a))


c = json.load(open(f"{APP}/clima-mes.json", encoding="utf-8"))
for ss, v in c["por_ss"].items():
    q = datetime.fromisoformat(v["quando"])
    qutc = (q + timedelta(hours=3)).timestamp()
    ini = qutc - 7 * 86400                       # sete dias antes do evento
    janela = (rt >= ini) & (rt <= qutc + 12 * 3600)
    if janela.any():
        dist = km(v["lat"], v["lon"], rla[janela], rlo[janela])
        tt = rt[janela]
        for r_km in (5, 20, 50):
            v[f"raios_{r_km}km_semana"] = int((dist <= r_km).sum())
        perto = np.where(dist <= 50)[0]
        if len(perto):
            i = perto[int(np.argmin(dist[perto]))]
            v["semana_mais_perto_km"] = round(float(dist[i]), 1)
            v["semana_mais_perto_h"] = round((float(tt[i]) - qutc) / 3600.0, 1)
    else:
        for r_km in (5, 20, 50):
            v[f"raios_{r_km}km_semana"] = 0

    # o perfil de oito dias: D-7 até D, um número por dia
    perfil_raio, perfil_chuva = [], []
    for k in range(7, -1, -1):
        d0 = (q - timedelta(days=k)).strftime("%Y-%m-%d")
        ini_d = (datetime.strptime(d0, "%Y-%m-%d") + timedelta(hours=3)).timestamp()
        m = (rt >= ini_d) & (rt < ini_d + 86400)
        if m.any():
            dd = km(v["lat"], v["lon"], rla[m], rlo[m])
            perfil_raio.append(int((dd <= 20).sum()))
        else:
            perfil_raio.append(0)
        perfil_chuva.append(ponto(diarios[d0], v["lat"], v["lon"]) if d0 in diarios else None)
    v["semana_raios_por_dia"] = perfil_raio
    v["semana_chuva_por_dia"] = perfil_chuva
    ch = [x for x in perfil_chuva if x is not None]
    v["semana_chuva_mm"] = round(sum(ch), 2) if ch else None
    v["semana_dias_com_chuva"] = sum(1 for x in ch if x > 0.1)

P = c["por_ss"]
decl = [s for s, v in P.items() if v.get("declara_descarga")]
c["cruzamento"].update({
    "declaram_sem_raio_20km_semana": sum(1 for s in decl if P[s]["raios_20km_semana"] == 0),
    "declaram_sem_raio_50km_semana": sum(1 for s in decl if P[s]["raios_50km_semana"] == 0),
    "recorte_sem_raio_20km_semana": sum(1 for s in decl
                                        if P[s]["no_recorte"] and P[s]["raios_20km_semana"] == 0),
    "casos_com_raio_20km_semana": sum(1 for v in P.values() if v["raios_20km_semana"] > 0),
})
c["janela_semana"] = ("Sete dias antes do evento, mais o próprio dia. Quanto mais longe do "
                      "evento, mais fraca a ligação: raio a quilômetros de distância seis "
                      "dias antes é CONTEXTO, não causa. O achado continua sendo o do dia.")
c["raios_no_tocantins"] = len(raios)
c["dias"] = len(todos_dias)

json.dump(c, open(f"{APP}/clima-mes.json", "w"), ensure_ascii=False, separators=(",", ":"))
aviso(f"\ngravado ({os.path.getsize(f'{APP}/clima-mes.json')/1024:.0f} KB)")
aviso(json.dumps({k: v for k, v in c["cruzamento"].items() if isinstance(v, int)},
                 ensure_ascii=False, indent=1))
