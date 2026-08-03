#!/usr/bin/env python3
"""Monta public/revisao.json a partir dos vereditos da revisão caso a caso.

A aba "Revisão da auditoria" não guarda texto nenhum no page.tsx: tudo o que ela mostra
sai daqui. Rodar de novo depois que chegar veredito novo é o jeito de atualizar a aba.

Fontes, todas em .../scratchpad/revisao:
  todos_vereditos.json   993 SS — sem prova de troca, ressalva e as 884 da saída
  b_vereditos.json        78 SS — encadeamento Sonnet -> Opus -> Fable
  vereditos/*.json        os lotes crus, caso o consolidado não exista
  resto_D_resto_*.json   os lotes que faltavam para fechar 1.510, um arquivo por lote
  revisor_a.json         funcionalidades do site
  revisor_b.json         análise crítica dos números
"""

import collections
import datetime
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
SAIDA = os.path.join(RAIZ, "public", "revisao.json")
REV = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/revisao"

CATEGORIAS = [
    "SAÍDA", "RETIDO — SEM INTERRUPÇÃO NA JANELA", "RETIDO — SS DUPLICADA",
    "RETIDO — SEM DESLOCAMENTO", "RETIDO — SEM PROVA DE TROCA",
    "RETIDO — RESSALVA DA INTERRUPÇÃO", "EXCLUÍDO NA LEITURA",
]


def carrega(nome):
    caminho = os.path.join(REV, nome)
    if not os.path.exists(caminho):
        return []
    with open(caminho, encoding="utf-8") as fh:
        dado = json.load(fh)
    if isinstance(dado, dict):
        dado = dado.get("casos", [])
    return dado


def vereditos():
    """Junta todas as fontes. Quando a mesma SS aparece duas vezes, vale a última."""
    por_ss = {}
    fontes = collections.Counter()
    # Os lotes do resto chegam um a um, não de uma vez. Ler cada arquivo que existir deixa a
    # aba absorver o que já foi julgado sem precisar esperar o conjunto fechar.
    lotes_resto = sorted(a for a in os.listdir(REV)
                         if a.startswith("resto_") and a.endswith(".json"))
    for nome, origem in ([("todos_vereditos.json", "cobertura"),
                          ("b_vereditos.json", "encadeamento")]
                         + [(a, "cobertura") for a in lotes_resto]):
        for c in carrega(nome):
            if not c.get("ss"):
                continue
            c["_origem"] = origem
            por_ss[c["ss"]] = c
            fontes[origem] += 1
    if not por_ss:
        for arq in sorted(os.listdir(os.path.join(REV, "vereditos"))):
            if not arq.endswith(".json"):
                continue
            for c in carrega(os.path.join("vereditos", arq)):
                if c.get("ss"):
                    c["_origem"] = "cobertura"
                    por_ss[c["ss"]] = c
    return list(por_ss.values()), dict(fontes)


def limpa(s, n=420):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    return s[:n] + ("…" if len(s) > n else "")


# ---------------------------------------------------------------- os grupos de mudança
# O rótulo e a explicação são do grupo, não do caso: o que a esteira fez, e por que a
# leitura do auditor derruba. O número e o exemplo saem dos vereditos.
GRUPOS = {
    ("SAÍDA", "EXCLUÍDO NA LEITURA"): (
        "falso-positivo-leitura", "Saiu como bom, mas o texto mostra outra causa",
        "A esteira deixou o caso chegar à saída porque os campos de interrupção, deslocamento e "
        "material fecharam.",
        "A leitura do registro mostra causa diferente de queima ou avaria — abalroamento, furto, "
        "preventivo, auxiliar ou construção. O campo não contradiz: ele apenas não descreve a causa."),
    ("SAÍDA", "RETIDO — RESSALVA DA INTERRUPÇÃO"): (
        "falso-positivo-ressalva", "Saiu como bom, mas a interrupção tem ressalva",
        "A esteira não marcou ressalva e o caso foi direto para a saída.",
        "A ocorrência que sustenta o caso tem sinal que a enfraquece — programada, sem cliente "
        "interrompido, defeito aberto em outro elemento ou reclamação individual."),
    ("SAÍDA", "RETIDO — SEM DESLOCAMENTO"): (
        "falso-positivo-deslocamento", "Saiu como bom sem atendimento no próprio trafo",
        "A esteira aceitou o atendimento do TMAE como corroboração.",
        "O atendimento não é do transformador: foi aberto em outro equipamento, ou está fora da "
        "janela de 24 horas. A segunda peneira deveria ter retido."),
    ("RETIDO — RESSALVA DA INTERRUPÇÃO", "RETIDO — SEM DESLOCAMENTO"): (
        "ordem-das-peneiras", "Parou na peneira errada",
        "A esteira levou o caso até a quarta peneira e o reteve por ressalva.",
        "Ele já deveria ter parado na segunda: não há atendimento do TMAE no código do trafo. "
        "O caso continua retido — muda o motivo, não o destino."),
    ("RETIDO — SEM PROVA DE TROCA", "RETIDO — SEM DESLOCAMENTO"): (
        "ordem-das-peneiras", "Parou na peneira errada",
        "A esteira levou o caso à terceira peneira e o reteve por falta de prova de troca.",
        "Ele já deveria ter parado na segunda, por falta de atendimento no trafo. O caso continua "
        "retido — muda o motivo, não o destino."),
    ("RETIDO — RESSALVA DA INTERRUPÇÃO", "SAÍDA"): (
        "ressalva-indevida", "Ficou retido por uma ressalva que não se sustenta",
        "A esteira marcou ressalva na interrupção e segurou o caso na quarta peneira.",
        "O sinal que motivou a ressalva não se confirma no registro: a ocorrência é do próprio "
        "transformador, com cliente interrompido e causa de falha."),
    ("RETIDO — SEM INTERRUPÇÃO NA JANELA", "EXCLUÍDO NA LEITURA"): (
        "motivo-mais-forte", "Retido por falta de fato quando havia motivo mais forte",
        "A esteira reteve na primeira peneira, por não achar interrupção na janela.",
        "O texto já mostra outra causa. O destino é o mesmo — fora da saída —, mas o motivo "
        "correto é a leitura, e não a ausência de registro."),
    ("RETIDO — SS DUPLICADA", "EXCLUÍDO NA LEITURA"): (
        "motivo-mais-forte", "Retido como duplicada quando havia motivo mais forte",
        "A esteira reteve por dividir evento e transformador com outra SS.",
        "O texto mostra outra causa, que decide sozinha e antes da duplicidade."),
    ("EXCLUÍDO NA LEITURA", "SAÍDA"): (
        "exclusao-derrubada", "Excluído por uma causa que o texto não declara",
        "A esteira excluiu o caso na leitura, apontando outra causa.",
        "Nem a SS nem a OS declaram essa causa: ela foi inferida do silêncio do texto, contra "
        "campos que registram queima e atendimento no próprio transformador. A regra de ouro "
        "proíbe a leitura de criar um fato que o campo não registrou."),
    ("RETIDO — SEM DESLOCAMENTO", "RETIDO — SEM INTERRUPÇÃO NA JANELA"): (
        "ordem-das-peneiras", "Parou na peneira errada",
        "A esteira reteve na segunda peneira, por falta de atendimento.",
        "Não havia nem interrupção na janela: o caso já deveria ter parado na primeira."),
}


def grupo_de(atual, correta):
    ch = (atual, correta)
    if ch in GRUPOS:
        return GRUPOS[ch]
    return ("outras", f"{atual} → {correta}",
            "A esteira classificou como está publicado.",
            "A revisão caso a caso aponta outra categoria com base no próprio registro.")


def main():
    with open(FLUXO, encoding="utf-8") as fh:
        registros = json.load(fh)["registros"]
    por_ss = {str(r.get("ss", "")).strip(): r for r in registros}
    saida_hoje = sum(1 for r in registros if r.get("cascata") == "SAÍDA")

    casos, fontes = vereditos()
    if not casos:
        print("nenhum veredito encontrado em", REV, file=sys.stderr)
        return 1

    mudam = [c for c in casos if c.get("muda")]
    naoclaro = [c for c in casos if c.get("claro") == "NAO_CLARO"]
    confirmados = [c for c in casos if not c.get("muda")]

    # ---- cada caso ganha os campos do registro que o leitor vai querer conferir
    def enriquece(c):
        r = por_ss.get(c["ss"], {})
        g = grupo_de(c.get("categoria_atual", ""), c.get("categoria_correta", ""))
        return {
            "ss": c["ss"],
            "grupo": g[0],
            "atual": c.get("categoria_atual", ""),
            "correta": c.get("categoria_correta", ""),
            "claro": c.get("claro", "CLARO"),
            "muda": bool(c.get("muda")),
            "motivo": limpa(c.get("motivo")),
            "evidencia": limpa(c.get("evidencia"), 520),
            "origem": c.get("_origem", ""),
            "localidade": r.get("localidade", ""),
            "abertura": r.get("abertura", ""),
            "trafo": r.get("trafo", ""),
            "equipe": r.get("equipe_ss", ""),
            "obra": r.get("obra", ""),
            "categoria": r.get("categoria", ""),
            "desc_ss": limpa(r.get("desc_ss"), 300),
        }

    mudam_ricos = [enriquece(c) for c in mudam]

    # ---- os falsos positivos da saída: o que passou e não deveria
    falsos = [c for c in mudam_ricos if c["atual"] == "SAÍDA"]

    # ---- agrupa por motivo, do maior para o menor
    grupos = []
    for chave, itens in collections.Counter(
            (c["atual"], c["correta"]) for c in mudam_ricos).most_common():
        gid, rotulo, fez, errado = grupo_de(*chave)
        deste = [c for c in mudam_ricos if (c["atual"], c["correta"]) == chave]
        exemplo = max(deste, key=lambda c: len(c["evidencia"] or ""))
        grupos.append({
            "id": f"{gid}--{len(grupos)}",
            "familia": gid,
            "rotulo": rotulo,
            "de": chave[0],
            "para": chave[1],
            "n": itens,
            "esteira_fez": fez,
            "por_que_errado": errado,
            "afeta_saida": chave[0] == "SAÍDA" or chave[1] == "SAÍDA",
            "exemplo": {"ss": exemplo["ss"], "trecho": exemplo["evidencia"] or exemplo["motivo"],
                        "motivo": exemplo["motivo"]},
            "ss": [c["ss"] for c in deste],
        })

    # ---- o que ficou sem resposta
    sem_resposta = [{
        "ss": c["ss"],
        "atual": c.get("categoria_atual", ""),
        "falta": limpa(c.get("motivo")),
    } for c in naoclaro]

    # ---- o que foi confirmado como correto
    conf_por_cat = collections.Counter(c.get("categoria_atual", "") for c in confirmados)

    # ---- cenários: o efeito de cada escolha sobre a saída de hoje
    entram = sum(1 for c in mudam if c.get("categoria_correta") == "SAÍDA")
    saem = sum(1 for c in mudam if c.get("categoria_atual") == "SAÍDA")
    cen = json.load(open(os.path.join(REV, "cenarios.json"), encoding="utf-8")) \
        if os.path.exists(os.path.join(REV, "cenarios.json")) else {}

    cenarios = [{
        "id": "A",
        "rotulo": "Aplicar a revisão caso a caso",
        "descricao": "Reincluir os casos que a leitura da esteira excluiu sem o texto declarar a causa, "
                     "e retirar da saída os falsos positivos que a revisão fundamentou.",
        "entram": entram,
        "saem": saem,
        "saida": saida_hoje + entram - saem,
        "base": f"{len(mudam)} mudanças fundamentadas caso a caso; "
                f"{entram} passam a ser saída e {saem} deixam de ser.",
    }, {
        "id": "B",
        "rotulo": "A, mais medir a janela pela borda da ocorrência",
        "descricao": "Hoje a distância entre a SS e a ocorrência é medida a partir do início da "
                     "ocorrência. A regra manda medir pela borda mais próxima — início ou fim.",
        "entram": cen.get("B_entram", 0),
        "saem": 0,
        "saida": saida_hoje + entram - saem + cen.get("B_entram", 0),
        "base": cen.get("B_base", "Recalculado caso a caso a partir de abertura, oc_ini e oc_fim."),
    }, {
        "id": "C",
        "rotulo": "B, mais rebaixar a segunda peneira a sinalizador",
        "descricao": "O deslocamento do TMAE deixa de bloquear e passa a apenas sinalizar. Quem "
                     "parou ali segue para a análise de material e para a ressalva.",
        "entram": cen.get("C_entram", 0),
        "saem": 0,
        "saida": saida_hoje + entram - saem + cen.get("B_entram", 0) + cen.get("C_entram", 0),
        "base": cen.get("C_base", "Dos retidos por deslocamento, os que têm material provando a "
                                  "troca e não recebem ressalva."),
    }]

    # ---- a tela determinística das que ainda não foram lidas
    # Não é leitura caso a caso e não pode ser apresentada como se fosse. Ela só pergunta se o
    # MOTIVO da retenção se sustenta contra os campos do próprio registro. Confirma ou contradiz.
    ROTULOS = {
        "1": ("contradiz", "Retido por falta de fato, mas há registro dentro da janela",
              "A primeira peneira disse que não havia nem interrupção nem atendimento em 24 h. "
              "Medindo pela borda mais próxima em vez do início da ocorrência, há."),
        "2": ("lacuna", "Retido por falta de fato, mas a janela retrocede para 2025",
              "A base de interrupção começa em 01/01/2026 01:14. A ocorrência que sustentaria "
              "esses casos ficou no arquivo de dezembro, que não temos."),
        "3": ("lacuna", "Retido por falta de fato, mas a SS caiu no vão do TMAE",
              "O TMAE não tem nenhum atendimento entre 26 e 31 de janeiro. Não é ausência de "
              "atendimento: é ausência de arquivo."),
        "4": ("contradiz", "Retido por falta de deslocamento, mas há atendimento com deslocamento",
              "A segunda peneira disse que não havia atendimento do TMAE no código do trafo. "
              "O próprio registro traz o número do atendimento, dentro da janela, com a equipe deslocada."),
        "5": ("lacuna", "Retido por falta de deslocamento, mas a SS caiu no vão do TMAE",
              "Mesmo vão de 26 a 31 de janeiro, agora barrando na segunda peneira."),
    }
    caminho_tela = os.path.join(REV, "tela_439.json")
    tela = {"n": 0, "confirmadas": 0, "grupos": []}
    if os.path.exists(caminho_tela):
        with open(caminho_tela, encoding="utf-8") as fh:
            bruto = json.load(fh)
        grupos_tela = []
        for chave, itens in sorted(bruto.items()):
            n = chave.split(" ")[0]
            tipo, rotulo, explicacao = ROTULOS.get(n, ("contradiz", chave, ""))
            chegariam = [i for i in itens if i.get("e3") == "SEGUE" and i.get("e4") == "OK"]
            grupos_tela.append({
                "id": f"tela-{n}", "tipo": tipo, "rotulo": rotulo, "explicacao": explicacao,
                "n": len(itens), "chegariam_a_saida": len(chegariam),
                "ss": [i["ss"] for i in itens],
                "exemplo": {"ss": itens[0]["ss"], "porque": itens[0]["porque"]} if itens else None,
            })
        grupos_tela.sort(key=lambda g: (g["tipo"] != "contradiz", -g["n"]))
        marcadas = sum(g["n"] for g in grupos_tela)
        tela = {
            "n": len(registros) - len(casos),
            "confirmadas": len(registros) - len(casos) - marcadas,
            "merecem_leitura": marcadas,
            "nota": "Estas ainda não foram lidas caso a caso. Passaram por uma verificação "
                    "automática que só confere se o motivo da retenção se sustenta contra os "
                    "campos do próprio registro. Confirmar aqui não é o mesmo que ler.",
            "grupos": grupos_tela,
        }

    def revisor(nome):
        caminho = os.path.join(REV, nome)
        if not os.path.exists(caminho):
            return None
        with open(caminho, encoding="utf-8") as fh:
            return json.load(fh)

    saida_json = {
        "meta": {
            "gerado": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            "universo": len(registros),
            "revisadas": len(casos),
            "cobertura_pct": round(100 * len(casos) / len(registros), 1),
            "mudam": len(mudam),
            "confirmadas": len(confirmados),
            "sem_resposta": len(naoclaro),
            "saida_hoje": saida_hoje,
            "fontes": fontes,
            "postura": "Quando a leitura do auditor diverge da esteira, prevalece a do auditor, "
                       "desde que fundamentada no registro. Confirmar o que está certo conta "
                       "tanto quanto contestar.",
            "regra_de_ouro": "O campo é fato consumado, o texto é declaração. A leitura pode "
                             "derrubar um fato quando mostra outra causa, mas nunca cria um fato "
                             "que o campo não registrou — nem a partir do silêncio do texto.",
        },
        "falsos_positivos": {
            "n": len(falsos),
            "nota": "Casos que chegaram à saída e não deveriam. É o que infla o indicador e a "
                    "primeira pergunta de uma plateia técnica.",
            "casos": falsos,
        },
        "grupos": grupos,
        "sem_resposta": sem_resposta,
        "confirmado": {
            "n": len(confirmados),
            "nota": "Revisadas caso a caso e mantidas na categoria em que já estavam.",
            "por_categoria": [{"categoria": k, "n": v}
                              for k, v in sorted(conf_por_cat.items(), key=lambda x: -x[1]) if k],
        },
        "tela_nao_lidas": tela,
        "cenarios": cenarios,
        "revisores": {"site": revisor("revisor_a.json"), "numeros": revisor("revisor_b.json")},
        "casos": mudam_ricos,
    }

    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump(saida_json, fh, ensure_ascii=False, indent=1)

    print(f"revisao.json · {len(casos)} SS revisadas de {len(registros)} "
          f"({saida_json['meta']['cobertura_pct']}%)")
    print(f"  mudam {len(mudam)} · confirmadas {len(confirmados)} · sem resposta {len(naoclaro)}")
    print(f"  falsos positivos da saída: {len(falsos)}")
    print(f"  grupos de motivo: {len(grupos)}")
    if tela["grupos"]:
        print(f"  tela das não lidas: {tela['confirmadas']} confirmadas, "
              f"{tela['merecem_leitura']} merecem leitura, em {len(tela['grupos'])} grupos")
    for c in cenarios:
        print(f"  cenário {c['id']}: saída {saida_hoje} → {c['saida']}")
    print(f"  gravado em {SAIDA} ({os.path.getsize(SAIDA)//1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
