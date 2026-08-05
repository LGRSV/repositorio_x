#!/usr/bin/env python3
"""Apura os números do Manual de Regras e grava manual-dados.json.

O manual não pode ter número digitado. Ele é escrito em texto, mas todo valor sai daqui — deste
script, contra fluxo-1510.json e contra a Crítica crua. Se a esteira mudar e o manual não for
regerado, a data no rodapé denuncia; se alguém digitar um número no meio do texto, a invariante
que confere o metodo.json não pega, mas este arquivo pega: é ele que o gerador do .docx consome.

Uso:  python3 gerar_manual_regras.py [pasta com os .txt da Crítica]
      node   scripts/manual_docx.js
"""
import collections
import csv
import datetime
import glob
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
SAIDA = os.path.join(RAIZ, "public", "manuais", "manual-dados.json")

ROTULO = {
    "sem_interrupcao": "Ausente da base de interrupções",
    "fora_da_janela": "Fora da janela da interrupção",
    "furto": "Furto, roubo ou vandalismo",
    "sem_obra": "Obra nunca gerada — prazo vencido",
    "preventivo": "Preventivo ou programado",
    "remanejamento": "Remanejamento de potência ou de poste",
    "tap": "Tape interno — regularização de tensão",
    "sem_os": "Sem OS e sem obra — investigar",
    "abalroamento": "Abalroamento",
    "obra_sem_transformador": "Obra encerrada sem transformador movimentado",
    "erro_cadastro": "O código do ativo não é de transformador",
    "falta_fase": "Falta de fase interna",
    "auxiliar": "Auxiliar de religador ou regulador",
    "divisao": "Divisão de circuito",
    "cola_fita": "Cola e fita — reparo, não troca",
    "desativacao": "Desativação do posto",
    "obra_sem_execucao": "Obra aberta que não executou nada",
    "terceiros": "Causada por terceiros",
    "avaliar_matheus": "Avaliar com o Matheus",
    "particular": "Transformador particular",
    "construcao": "Construção ou obra nova",
    "obra_chave": "A obra trocou chave fusível",
    "duplicada": "SS duplicada",
}


def t(v):
    return "" if v is None else str(v).strip()


def papeis_da_critica(padroes):
    """Reconstrói, do arquivo cru, em que papéis cada código aparece na Crítica."""
    defeito, interrompido, manobrado = set(), set(), set()
    ocorrencias = set()
    arquivos = [a for p in padroes for a in glob.glob(p)]
    for f in arquivos:
        with open(f, encoding="latin-1", newline="") as fh:
            rd = csv.reader(fh, delimiter=";", quoting=csv.QUOTE_NONE)
            cab = next(rd)
            i = {c: k for k, c in enumerate(cab)}
            for row in rd:
                if len(row) < len(cab):
                    continue
                ocorrencias.add(row[i["NUM_SEQ_OPER_INIC_HDE"]].strip())
                if row[i["COD_ELE_REDE_PROBLEMA"]].strip() == "TR" and row[i["COD_ELE_PROBLEMA"]].strip():
                    defeito.add(row[i["COD_ELE_PROBLEMA"]].strip())
                if row[i["COD_ELE_INTERROMPIDO"]].strip():
                    interrompido.add(row[i["COD_ELE_INTERROMPIDO"]].strip())
                if row[i["COD_ELE_FECHADO"]].strip():
                    manobrado.add(row[i["COD_ELE_FECHADO"]].strip())
    return defeito, interrompido, manobrado, len(ocorrencias - {""}), len(arquivos)


def main(argv):
    padroes = argv or [
        "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/crit/*.txt",
        "/root/.claude/uploads/74dc9c64-5026-54ee-a81e-173d2f38a735/*Critica*.txt",
    ]
    defeito, interrompido, manobrado, n_oc, n_arq = papeis_da_critica(padroes)
    with open(FLUXO, encoding="utf-8") as fh:
        fluxo = json.load(fh)
    R = fluxo["registros"]
    meta = fluxo["meta"]
    n = len(R)

    exc = [r for r in R if t(r.get("cascata")) == "EXCLUÍDA"]
    ret = [r for r in R if t(r.get("cascata")).startswith("RETIDO")]
    saida = [r for r in R if t(r.get("cascata")) == "SAÍDA"]
    PAROU = {"sem_interrupcao", "fora_da_janela"}
    critica = [r for r in exc if t(r.get("expurgo_gatilho")) in PAROU]
    causa = [r for r in exc if t(r.get("expurgo_gatilho")) not in PAROU]

    gat = collections.Counter(t(r.get("expurgo_gatilho")) for r in exc)
    categorias = [{"chave": k, "rotulo": ROTULO.get(k, k), "n": v} for k, v in gat.most_common()]

    ausentes = [r for r in critica if t(r.get("expurgo_gatilho")) == "sem_interrupcao"]
    aus_papel_nenhum = sum(1 for r in ausentes
                           if t(r.get("trafo")) not in interrompido and t(r.get("trafo")) not in manobrado)

    # Só entra na estatística de distância quem tem ocorrência e distância medidas. Um caso de
    # veredito do dono pode estar em "fora da janela" sem ocorrência casada — contá-lo daria uma
    # distância de zero hora, que é justamente o que ele não é.
    fora = [r for r in critica if t(r.get("expurgo_gatilho")) == "fora_da_janela"]
    dist = sorted(abs(float(r["oc_dist_h"])) for r in fora
                  if t(r.get("oc_dist_h")) and t(r.get("oc_num")))
    FAIXAS = [("até 24 horas", lambda x: x <= 24), ("1 a 7 dias", lambda x: 24 < x <= 168),
              ("7 a 30 dias", lambda x: 168 < x <= 720), ("1 a 3 meses", lambda x: 720 < x <= 2160),
              ("mais de 3 meses", lambda x: x > 2160)]

    dados = {
        "carimbo": meta.get("revisado_em") or str(datetime.date.today()),
        "gerado_em": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
        "janela_horas": meta.get("janelaHoras"),
        "total": n,
        "fontes": meta.get("fontes", []),
        "lacunas": meta.get("lacunas", []),
        "critica": {"arquivos": n_arq, "ocorrencias": n_oc,
                    "codigos_com_defeito": len(defeito),
                    "codigos_interrompidos": len(interrompido),
                    "codigos_manobrados": len(manobrado)},
        "porta": {
            "total": len(exc),
            "pela_critica": len(critica),
            "por_causa": len(causa),
            "categorias": categorias,
            "ausentes": len(ausentes),
            "ausentes_papel_nenhum": aus_papel_nenhum,
            "ausentes_so_manobra": len(ausentes) - aus_papel_nenhum,
            "fora_da_janela": len(fora),
            "fora_com_medida": len(dist),
            "faixas": [{"faixa": rot, "n": sum(1 for x in dist if teste(x))} for rot, teste in FAIXAS],
            "mais_perto_h": round(dist[0], 1) if dist else 0,
            "mediana_d": round(dist[len(dist) // 2] / 24, 1) if dist else 0,
            "mais_longe_d": round(dist[-1] / 24) if dist else 0,
        },
        "janela": {
            "casam": sum(1 for r in R if t(r.get("e1_nivel")) in ("A", "B", "C")),
            "contidas": sum(1 for r in R if t(r.get("oc_contida_na_ss")) == "SIM"),
        },
        "censo": [{"estado": k or "—", "n": v} for k, v in
                  collections.Counter(t(r.get("censo_critica")) for r in R).most_common()],
        "esteira": {
            "entram": n,
            "pos_porta": n - len(exc),
            "sem_tmae": sum(1 for r in R if t(r.get("cascata")) != "EXCLUÍDA"
                            and t(r.get("deslocamento")) == "SEM REGISTRO"),
            # O marcador do TMAE só existe para quem passou pela peneira; nos casos decididos a
            # martelo pelo dono o campo fica vazio de propósito, e somá-los aqui daria um total
            # que não fecha com a esteira.
            "corrobora": sum(1 for r in R if t(r.get("cascata")) != "EXCLUÍDA"
                             and t(r.get("deslocamento")) == "CORROBORA"),
            "sem_marcador": sum(1 for r in R if t(r.get("cascata")) != "EXCLUÍDA"
                                and not t(r.get("deslocamento"))),
            "retidos": len(ret),
            "siago": sum(1 for r in ret if t(r.get("pendente_siago")) == "SIM"),
            "saida": len(saida),
            "queimados": sum(1 for r in saida if t(r.get("confirmado")) == "QUEIMADO"),
            "avariados": sum(1 for r in saida if t(r.get("confirmado")) == "AVARIADO"),
        },
        "vereditos": sum(1 for r in R if t(r.get("veredito_do_dono")) == "SIM"),
        "material_pendente": sum(1 for r in R if t(r.get("material_conferido")) != "SIM"),
        "etiquetas": [{"nome": k, "n": v} for k, v in collections.Counter(
            e for r in R for e in t(r.get("etiquetas")).split(" · ") if e).most_common()],
        "correcoes": meta.get("correcoes", []),
    }
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump(dados, fh, ensure_ascii=False, indent=1)
    print(SAIDA)
    print(f"  {n} solicitações · porta {len(exc)} · retidos {len(ret)} · saída {len(saida)} "
          f"({dados['esteira']['queimados']} + {dados['esteira']['avariados']})")
    print(f"  Crítica: {n_arq} arquivos · {n_oc} ocorrências · {len(defeito)} códigos com defeito próprio")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
