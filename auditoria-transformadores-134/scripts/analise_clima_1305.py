"""As 1.305 contra o céu: o raio perto do caso é mais do que o acaso da estação?

O erro que este script existe para não cometer: de janeiro a junho chove no Tocantins quase
todo dia. Dizer "90% dos casos que declaram descarga tiveram raio a 20 km" soa forte e não
significa nada, porque 90% de QUALQUER ponto do estado teria. Um número sem taxa de base é
um número decorativo.

O teste é de placebo, e controla o lugar: para cada caso, mede o mesmo ponto em dias
sorteados do MESMO mês em que nada aconteceu ali. Se o dia do evento não se distingue dos
dias placebo, a declaração de descarga não encontra apoio no satélite — nem para confirmar
nem para negar, ela simplesmente não é distinguível do tempo normal daquele mês.

O que continua valendo como achado forte, e não depende de teste nenhum: caso que declara
descarga com ZERO raio no ponto no dia inteiro. Esse é o caso em que a fonte externa
contradiz a declaração, e é ele que vira lista de trabalho.
"""

import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta

import numpy as np

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
DIAS = "/tmp/glmdias"
SORTEIOS = 8          # dias placebo por caso
SEMENTE = 20260816    # fixa: a mesma rodada tem de dar o mesmo número duas vezes

c = json.load(open(f"{APP}/clima-1305.json", encoding="utf-8"))
P = c["por_ss"]
print(f"{len(P)} casos")


def declara(v):
    t = " ".join(str(v.get(k) or "") for k in ("oc_causa", "oc_sub", "defeito_ss", "origem_ss")).upper()
    # PARA-RAIOS é o equipamento, não a descarga
    t = t.replace("PARA-RAIOS", "").replace("PARA RAIOS", "")
    return bool(re.search(r"DESCARGA\s*ATMOSF|ATMOSFERIC|ATMOSFÉRIC", t))


def km(lat1, lon1, la, lo):
    R = 6371.0
    dp = np.radians(la - lat1)
    dl = np.radians(lo - lon1)
    a = (np.sin(dp / 2) ** 2
         + np.cos(np.radians(lat1)) * np.cos(np.radians(la)) * np.sin(dl / 2) ** 2)
    return 2 * R * np.arcsin(np.sqrt(a))


cache = {}


def dia(d):
    if d not in cache:
        cam = f"{DIAS}/{d}.npz"
        if not os.path.exists(cam):
            cache[d] = None
        else:
            z = np.load(cam)
            cache[d] = (z["la"], z["lo"])
        if len(cache) > 60:                       # não segurar os 190 dias na memória
            for k in list(cache)[:20]:
                del cache[k]
    return cache[d]


disponiveis = sorted(x[:-4] for x in os.listdir(DIAS) if x.endswith(".npz"))
por_mes = defaultdict(list)
for d in disponiveis:
    por_mes[d[:7]].append(d)

rng = np.random.default_rng(SEMENTE)
obs, plc, casos = [], [], []
for ss, v in P.items():
    d0 = v["quando"][:10]
    r_obs = v.get("raios_20km_dia", 0)
    alternativos = [x for x in por_mes.get(d0[:7], []) if x != d0]
    vals = []
    for d in rng.choice(alternativos, size=min(SORTEIOS, len(alternativos)), replace=False) \
            if alternativos else []:
        z = dia(str(d))
        if z is None:
            continue
        la, lo = z
        vals.append(int((km(v["lat"], v["lon"], la, lo) <= 20).sum()) if len(la) else 0)
    if not vals:
        continue
    obs.append(r_obs)
    plc.append(float(np.median(vals)))
    casos.append((ss, v, r_obs, vals))

obs = np.array(obs, dtype=float)
plc = np.array(plc, dtype=float)
print(f"\ncasos com placebo calculado: {len(obs)} ({SORTEIOS} dias sorteados do mesmo mês)")

decl = np.array([declara(v) for _, v, _, _ in casos])
print(f"  declaram descarga: {int(decl.sum())} · não declaram: {int((~decl).sum())}")


def retrato(nome, m):
    o, p = obs[m], plc[m]
    zero = int((o == 0).sum())
    acima = int((o > p).sum())
    print(f"\n{nome}  (n={m.sum()})")
    print(f"  raios a 20 km no dia do evento — mediana {np.median(o):8.1f} · média {o.mean():8.1f}")
    print(f"  no MESMO ponto, em dias placebo  — mediana {np.median(p):8.1f} · média {p.mean():8.1f}")
    print(f"  casos com ZERO raio no dia: {zero} ({zero/len(o)*100:.1f}%)")
    print(f"  dia do evento acima do placebo: {acima} ({acima/len(o)*100:.1f}%)"
          f"  — o acaso daria ~50%")


retrato("TODAS as 1.305", np.ones(len(obs), bool))
retrato("as que DECLARAM descarga atmosférica", decl)
retrato("as que NÃO declaram", ~decl)

# a lista de trabalho: declarou e o satélite não viu nada
print("\n" + "=" * 72)
sem = [(ss, v) for ss, v, r, _ in casos if declara(v) and r == 0]
sem50 = [(ss, v) for ss, v in sem if v.get("raios_50km_dia", 0) == 0]
semsem = [(ss, v) for ss, v in sem if v.get("raios_20km_semana", 0) == 0]
print(f"DECLARAM DESCARGA E TIVERAM ZERO RAIO A 20 KM NO DIA: {len(sem)}")
print(f"  destes, zero também a 50 km: {len(sem50)}")
print(f"  destes, zero a 20 km na SEMANA inteira: {len(semsem)}")
secos = [(ss, v) for ss, v in sem if (v.get("chuva_dia_mm") or 0) <= 0.1]
print(f"  destes, também sem chuva nenhuma no dia: {len(secos)}")

# e os 51 do conflito sobrecarga x descarga
print("\n" + "=" * 72)
conf = [(ss, v) for ss, v in P.items()
        if "SOBRECARGA" in str(v.get("oc_sub") or "").upper()
        and "DESCARGA" in str(v.get("defeito_ss") or "").upper()]
conf += [(ss, v) for ss, v in P.items()
         if "DESCARGA" in str(v.get("oc_sub") or "").upper()
         and "SOBRECARGA" in str(v.get("defeito_ss") or "").upper()]
print(f"CONFLITO SOBRECARGA × DESCARGA: {len(conf)} casos")
z = sum(1 for _, v in conf if v.get("raios_20km_dia", 0) == 0)
print(f"  sem nenhum raio a 20 km no dia: {z}")
print(f"  com raio a 5 km no dia: {sum(1 for _, v in conf if v.get('raios_5km_dia', 0) > 0)}")

json.dump({"sem_raio": [ss for ss, _ in sem], "sem_raio_50km": [ss for ss, _ in sem50],
           "sem_raio_semana": [ss for ss, _ in semsem], "secos": [ss for ss, _ in secos],
           "conflito_sobrecarga": [ss for ss, _ in conf]},
          open("/tmp/achados_1305.json", "w"), ensure_ascii=False)
print("\ngravado /tmp/achados_1305.json")
