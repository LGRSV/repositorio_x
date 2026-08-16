"""Raio e chuva para as 1.305 de janeiro a junho de 2026.

Ele pediu depois de ver o cruzamento de causa: 1.055 das 1.305 declaram descarga
atmosférica em alguma das duas fontes, e 51 casos têm a Crítica dizendo SOBRECARGA
enquanto a SS diz DESCARGA. Sobrecarga é falha de planejamento da rede; descarga é ato da
natureza. Não podem ser as duas, e nenhuma das duas bases arbitra a outra — as duas são
declarações humanas sobre o mesmo evento.

O satélite é o terceiro voto, e é independente das duas.

O QUE MUDA EM RELAÇÃO A JULHO E AGOSTO: aqui é estação chuvosa. Em julho o Tocantins
inteiro passou dias com zero raio, e "não houve raio" era quase sempre verdade. De janeiro
a junho há raio quase todo dia em algum lugar do estado — então a pergunta deixa de ser
"houve tempestade no estado" e passa a ser "houve tempestade NESTE ponto, nesta hora". Um
achado do tipo "declarou descarga e não houve raio" vale MUITO mais aqui do que valeria na
seca, justamente porque o normal é haver.

E o contrário fica mais fraco: raio perto na estação chuvosa é o esperado, não é
corroboração. A tela e a planilha dizem isso.

Detalhes de engenharia que o volume exigiu:
  - 190 dias × 24 h × ~172 arquivos = ~784 mil arquivos de 20 segundos. A 61 por segundo,
    com 64 conexões, dá cerca de três horas e meia.
  - Nada disso cabe na memória como lista Python. Cada dia vira um .npz no disco (hora,
    lat, lon) e o processamento anda com uma janela deslizante de nove dias.
  - O cache por dia torna a rodada retomável: se cair na hora 300, recomeça de onde parou.
"""

import json
import os
import subprocess
import sys
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import h5py
import numpy as np
import pygrib

GLM = "https://noaa-goes19.s3.amazonaws.com"
MERGE = "http://ftp.cptec.inpe.br/modelos/tempo/MERGE/GPM"
LAT_TO, LON_TO = (-13.6, -5.0), (-50.9, -45.6)
TMP, DIAS = "/tmp/clima1305tmp", "/tmp/glmdias"
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
for p in (TMP, DIAS):
    os.makedirs(p, exist_ok=True)

plano = json.load(open("/tmp/plano_1305.json"))
casos, dias = plano["casos"], plano["dias"]
por_dia = {}
for c in casos:
    por_dia.setdefault(c["quando"][:10], []).append(c)


def aviso(*a):
    print(*a, flush=True)


aviso(f"{len(casos)} casos · {len(dias)} dias a varrer")


# ── um dia de raios sobre o Tocantins ──────────────────────────────────────
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
    saida = None
    try:
        if os.path.getsize(d) > 1000:
            with h5py.File(d, "r") as f:
                if "flash_lat" in f:
                    la, lo = f["flash_lat"][:], f["flash_lon"][:]
                    m = ((la >= LAT_TO[0]) & (la <= LAT_TO[1])
                         & (lo >= LON_TO[0]) & (lo <= LON_TO[1]))
                    if m.any():
                        nome = os.path.basename(k).split("_s")[1][:13]
                        t0 = (datetime.strptime(nome[:11], "%Y%j%H%M")
                              + timedelta(seconds=int(nome[11:13]))).timestamp()
                        saida = (np.full(int(m.sum()), t0), la[m].astype("float32"),
                                 lo[m].astype("float32"))
    except Exception:
        pass
    finally:
        try:
            os.remove(d)
        except OSError:
            pass
    return saida


def dia_de_raios(d):
    """O dia LOCAL inteiro (03:00 UTC do dia até 02:59 UTC do seguinte), em cache."""
    cam = f"{DIAS}/{d}.npz"
    if os.path.exists(cam):
        z = np.load(cam)
        return z["t"], z["la"], z["lo"]
    ini = datetime.strptime(d, "%Y-%m-%d") + timedelta(hours=3)
    horas = [(ini + timedelta(hours=h)).strftime("%Y/%j/%H") for h in range(24)]
    with ThreadPoolExecutor(24) as ex:
        chaves = [k for lote in ex.map(listar, horas) for k in lote]
    with ThreadPoolExecutor(64) as ex:
        partes = [r for r in ex.map(pega, chaves, chunksize=4) if r is not None]
    if partes:
        t = np.concatenate([p[0] for p in partes])
        la = np.concatenate([p[1] for p in partes])
        lo = np.concatenate([p[2] for p in partes])
    else:
        t = np.array([]); la = np.array([]); lo = np.array([])
    np.savez_compressed(cam, t=t, la=la, lo=lo)
    return t, la, lo


# ── chuva ──────────────────────────────────────────────────────────────────
def grib(url, destino):
    if not os.path.exists(destino):
        subprocess.run(["curl", "-sL", "--max-time", "120", "-o", destino, url],
                       capture_output=True)
    return destino if os.path.exists(destino) and os.path.getsize(destino) > 5000 else None


def diario(d):
    aa, mm, dd = d.split("-")
    cam = grib(f"{MERGE}/DAILY/{aa}/{mm}/MERGE_CPTEC_{aa}{mm}{dd}.grib2", f"{TMP}/d{aa}{mm}{dd}.grib2")
    if not cam:
        return None
    try:
        return next(iter(pygrib.open(cam))).data()
    except Exception:
        return None


def horario(d, h_local):
    u = datetime.strptime(d, "%Y-%m-%d") + timedelta(hours=3 + h_local)
    aa, mm, dd, hh = u.strftime("%Y"), u.strftime("%m"), u.strftime("%d"), u.strftime("%H")
    cam = grib(f"{MERGE}/HOURLY/{aa}/{mm}/{dd}/MERGE_CPTEC_{aa}{mm}{dd}{hh}.grib2",
               f"{TMP}/h{aa}{mm}{dd}{hh}.grib2")
    if not cam:
        return None
    try:
        return next(iter(pygrib.open(cam))).data()
    except Exception:
        return None


def ponto(dados, lat, lon):
    if dados is None:
        return None
    v, la, lo = dados
    i = int(np.argmin(np.abs(la[:, 0] - lat)))
    j = int(np.argmin(np.abs(lo[0, :] - (lon % 360))))
    x = float(v[i, j])
    return None if np.isnan(x) else round(x, 2)


def km(lat1, lon1, la, lo):
    R = 6371.0
    dp = np.radians(la - lat1)
    dl = np.radians(lo - lon1)
    a = (np.sin(dp / 2) ** 2
         + np.cos(np.radians(lat1)) * np.cos(np.radians(la)) * np.sin(dl / 2) ** 2)
    return 2 * R * np.arcsin(np.sqrt(a))


# ── a passada: janela deslizante de nove dias, com um dia de atraso ────────
PARCIAL = "/tmp/clima1305_parcial.json"
saida = json.load(open(PARCIAL)) if os.path.exists(PARCIAL) else {}
aviso(f"já processados: {len(saida)} casos")

buf = {}
t0 = time.time()
for n, d in enumerate(dias):
    buf[d] = dia_de_raios(d)
    for velho in [x for x in buf if x < (datetime.strptime(d, "%Y-%m-%d")
                                         - timedelta(days=8)).strftime("%Y-%m-%d")]:
        del buf[velho]
    # processa o dia ANTERIOR, para já ter o dia seguinte carregado (a janela do dia é ±12 h)
    alvo = dias[n - 1] if n else None
    if not alvo or alvo not in por_dia:
        continue
    if all(c["ss"] in saida for c in por_dia[alvo]):
        continue

    janela = sorted(x for x in buf
                    if (datetime.strptime(alvo, "%Y-%m-%d") - timedelta(days=7)).strftime("%Y-%m-%d")
                    <= x <= (datetime.strptime(alvo, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d"))
    tt = np.concatenate([buf[x][0] for x in janela if len(buf[x][0])]) if janela else np.array([])
    ll = np.concatenate([buf[x][1] for x in janela if len(buf[x][0])]) if janela else np.array([])
    gg = np.concatenate([buf[x][2] for x in janela if len(buf[x][0])]) if janela else np.array([])

    dia_ch = diario(alvo)
    horas_ch = {h: horario(alvo, h) for h in range(24)}
    sem_ch = [diario((datetime.strptime(alvo, "%Y-%m-%d") - timedelta(days=k)).strftime("%Y-%m-%d"))
              for k in range(7, -1, -1)]

    for c in por_dia[alvo]:
        if c["ss"] in saida:
            continue
        q = datetime.fromisoformat(c["quando"])
        qutc = (q + timedelta(hours=3)).timestamp()
        it = {k: c[k] for k in ("quando", "fonte_hora", "classe", "trafo",
                                "oc_causa", "oc_sub", "defeito_ss", "origem_ss")}
        it["lat"], it["lon"] = round(c["lat"], 5), round(c["lon"], 5)
        if len(tt):
            dist = km(c["lat"], c["lon"], ll, gg)
            dt_min = (tt - qutc) / 60.0
            no_dia = np.abs(dt_min) <= 12 * 60
            na_sem = (tt >= qutc - 7 * 86400) & (tt <= qutc + 12 * 3600)
            for r in (5, 20, 50):
                it[f"raios_{r}km_dia"] = int(((dist <= r) & no_dia).sum())
                it[f"raios_{r}km_3h"] = int(((dist <= r) & (np.abs(dt_min) <= 180)).sum())
                it[f"raios_{r}km_semana"] = int(((dist <= r) & na_sem).sum())
            perto = np.where(no_dia & (dist <= 100))[0]
            if len(perto):
                i = perto[int(np.argmin(dist[perto]))]
                it["mais_perto_km"] = round(float(dist[i]), 1)
                it["mais_perto_min"] = int(round(float(dt_min[i])))
                j = perto[int(np.argmin(np.abs(dt_min[perto])))]
                it["mais_proximo_no_tempo_min"] = int(round(float(dt_min[j])))
                it["mais_proximo_no_tempo_km"] = round(float(dist[j]), 1)
        else:
            for r in (5, 20, 50):
                it[f"raios_{r}km_dia"] = it[f"raios_{r}km_3h"] = it[f"raios_{r}km_semana"] = 0
        it["chuva_dia_mm"] = ponto(dia_ch, c["lat"], c["lon"])
        serie = {h: ponto(v, c["lat"], c["lon"]) for h, v in horas_ch.items()}
        serie = {h: v for h, v in serie.items() if v is not None}
        if serie:
            it["chuva_horas"] = [serie.get(h, 0.0) for h in range(24)]
            it["chuva_horas_lidas"] = len(serie)
            it["chuva_hora_do_evento_mm"] = serie.get(q.hour)
            it["chuva_3h_antes"] = round(sum(serie.get(hh, 0.0)
                                             for hh in range(max(0, q.hour - 3), q.hour + 1)), 2)
        sem = [ponto(x, c["lat"], c["lon"]) for x in sem_ch]
        it["semana_chuva_por_dia"] = sem
        vals = [x for x in sem if x is not None]
        it["semana_chuva_mm"] = round(sum(vals), 2) if vals else None
        saida[c["ss"]] = it

    json.dump(saida, open(PARCIAL, "w"))
    feito = n + 1
    aviso(f"  {feito}/{len(dias)} dias · {len(saida)}/{len(casos)} casos · "
          f"{(time.time()-t0)/feito:.0f}s/dia · faltam ~{(len(dias)-feito)*(time.time()-t0)/feito/60:.0f} min")

aviso(f"\nterminado: {len(saida)} casos em {(time.time()-t0)/60:.0f} min")
json.dump({
    "gerado_em": "16/08/2026",
    "casos": len(saida),
    "dias": len(dias),
    "periodo": "janeiro a junho de 2026 — as 1.305",
    "estacao": "Estação CHUVOSA. Raio perto aqui é o esperado e NÃO corrobora nada. "
               "O que pesa é o contrário: declarou descarga e não houve raio no ponto.",
    "fontes": [
        {"nome": "GOES-19 · GLM (Geostationary Lightning Mapper)",
         "orgao": "NOAA", "onde": "noaa-goes19.s3.amazonaws.com · GLM-L2-LCFA",
         "resolucao": "arquivos de 20 s · erro de posição da ordem de 10 km",
         "o_que_mede": "o clarão do raio visto do espaço",
         "limite": "detecta de 70% a 90% dos raios e não diz onde o raio tocou o chão."},
        {"nome": "MERGE/CPTEC · precipitação", "orgao": "INPE",
         "onde": "ftp.cptec.inpe.br/modelos/tempo/MERGE/GPM",
         "resolucao": "grade de 0,1 grau (~11 km)",
         "o_que_mede": "satélite GPM combinado com os pluviômetros brasileiros",
         "limite": "uma célula de chuva tem 5 km: a grade pode registrar chuva que não caiu no poste."},
    ],
    "por_ss": saida,
}, open(f"{APP}/clima-1305.json", "w"), ensure_ascii=False, separators=(",", ":"))
aviso(f"gravado public/clima-1305.json ({os.path.getsize(f'{APP}/clima-1305.json')/1024:.0f} KB)")
