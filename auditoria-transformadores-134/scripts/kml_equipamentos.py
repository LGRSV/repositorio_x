#!/usr/bin/env python3
"""Extrai equipamentos dos KML de rede e mede a distância até os transformadores da auditoria.

A pergunta do dono: algum dos transformadores que estão na conta é, na verdade, o auxiliar de
um equipamento especial — religador ou regulador? Um auxiliar fica no mesmo poste do equipamento
que ele alimenta, então a resposta é geométrica: distância de metros, não de quilômetros.

O KML de cada circuito vem organizado em pastas por tipo — Regulador, Transformador, Chave, EP —
e cada Placemark traz o código do ativo no <name> e a coordenada no <Point>. É tudo o que
precisamos: nada aqui depende de interpretar texto.

Uso:  python3 kml_equipamentos.py <arquivo.kml> [<arquivo.kml> ...]
Escreve/atualiza public/equipamentos-kml.json com um registro por par (transformador, equipamento).
"""
import json
import math
import os
import sys
import xml.etree.ElementTree as ET

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
SAIDA = os.path.join(RAIZ, "public", "equipamentos-kml.json")
NS = {"k": "http://www.opengis.net/kml/2.2"}

# Pastas que interessam, e a nomenclatura do KML não é a que o nome sugere: o transformador de
# distribuição está em ET — estação transformadora —, e a pasta chamada "Transformador" vem
# vazia. EP é equipamento de proteção, que é onde o religador aparece. Descobri isso contando
# placemarks pasta a pasta: ET tinha 1.069 e Transformador tinha 0.
ALVO = {"Regulador": "regulador", "EP": "religador ou proteção", "ET": "transformador"}
RAIO_M = 120  # o que ainda pode ser "o mesmo ponto da rede" com folga de cadastro


def metros(a, b):
    """Distância aproximada em metros entre (lat, lon). Boa o bastante nesta escala."""
    (la1, lo1), (la2, lo2) = a, b
    dlat = math.radians(la2 - la1)
    dlon = math.radians(lo2 - lo1)
    m = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(la1)) * math.cos(math.radians(la2)) * math.sin(dlon / 2) ** 2)
    return 6371000 * 2 * math.asin(math.sqrt(m))


def pontos(caminho):
    """Percorre as pastas do KML e devolve [(tipo, código, lat, lon)]."""
    achados = []

    def anda(no, trilha):
        nome_el = no.find("k:name", NS)
        nome = nome_el.text.strip() if nome_el is not None and nome_el.text else ""
        aqui = trilha + [nome] if no.tag.endswith("Folder") and nome else trilha
        for pm in no.findall("k:Placemark", NS):
            pt = pm.find(".//k:Point/k:coordinates", NS)
            if pt is None or not pt.text:
                continue
            partes = pt.text.strip().split(",")
            if len(partes) < 2:
                continue
            n = pm.find("k:name", NS)
            cod = n.text.strip() if n is not None and n.text else ""
            tipo = next((ALVO[t] for t in aqui if t in ALVO), None)
            if tipo:
                achados.append((tipo, cod, float(partes[1]), float(partes[0])))
        for f in no.findall("k:Folder", NS):
            anda(f, aqui)

    doc = ET.parse(caminho).getroot().find("k:Document", NS)
    if doc is not None:
        anda(doc, [])
    return achados


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    with open(FLUXO, encoding="utf-8") as fh:
        fluxo = json.load(fh)
    ativos = [r for r in fluxo["registros"] if r.get("lat") and r.get("lon")]

    antes = {}
    if os.path.exists(SAIDA):
        with open(SAIDA, encoding="utf-8") as fh:
            antes = {p["chave"]: p for p in json.load(fh).get("pares", [])}

    circuitos = []
    for caminho in argv:
        pts = pontos(caminho)
        eq = [p for p in pts if p[0] != "transformador"]
        circuitos.append((os.path.basename(caminho), len(pts), len(eq)))
        print(f"{os.path.basename(caminho)}: {len(pts)} pontos · {len(eq)} equipamentos especiais")
        for r in ativos:
            la, lo = float(r["lat"]), float(r["lon"])
            for tipo, cod, ela, elo in eq:
                d = metros((la, lo), (ela, elo))
                if d <= RAIO_M:
                    ch = f"{r['ss']}|{cod}"
                    antes[ch] = {
                        "chave": ch, "ss": r["ss"], "trafo": r.get("trafo"),
                        "localidade": r.get("localidade"), "cascata": r.get("cascata"),
                        "confirmado": r.get("confirmado"), "potencia": r.get("pot_ret"),
                        "equipamento": cod, "tipo": tipo, "metros": round(d, 1),
                        "circuito": os.path.basename(caminho),
                    }
    pares = sorted(antes.values(), key=lambda x: x["metros"])
    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump({"raio_m": RAIO_M, "circuitos_lidos": circuitos, "pares": pares}, fh,
                  ensure_ascii=False)
    print(f"\n{len(pares)} pares (transformador ↔ equipamento especial) a até {RAIO_M} m")
    for p in pares[:40]:
        print(f"  {p['metros']:>6.1f} m · {p['ss']} · trafo {p['trafo']} · {p['potencia']} kVA · "
              f"{p['cascata']} · {p['tipo']} {p['equipamento']} · {p['localidade']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
