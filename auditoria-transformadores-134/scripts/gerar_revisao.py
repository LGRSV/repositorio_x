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
    ("RETIDO — SEM DESLOCAMENTO", "EXCLUÍDO NA LEITURA"): (
        "motivo-mais-forte", "Retido por falta de deslocamento quando havia motivo mais forte",
        "A esteira reteve na segunda peneira, por não achar atendimento do TMAE no código do trafo.",
        "O texto já mostra outra causa — furto, abalroamento, remanejamento preventivo ou divisão "
        "de circuito. O destino é o mesmo, fora da saída, mas o motivo correto é a leitura, e não "
        "a ausência de atendimento. Registrar o motivo certo importa: 'sem deslocamento' sugere "
        "falha de processo da equipe, quando o caso simplesmente não era queima de transformador."),
    ("RETIDO — SEM INTERRUPÇÃO NA JANELA", "SAÍDA"): (
        "retencao-indevida", "Retido por falta de fato que o próprio registro traz",
        "A primeira peneira concluiu que nem a interrupção nem o atendimento registram algo na "
        "janela de 24 horas.",
        "O registro traz: a abertura da SS cai DENTRO do intervalo do atendimento do TMAE, com "
        "nível de casamento A. A distância pela borda é zero — não é caso de fronteira. A régua "
        "que mede a partir do início da ocorrência escondeu o casamento."),
    ("RETIDO — SEM INTERRUPÇÃO NA JANELA", "RETIDO — SS DUPLICADA"): (
        "motivo-mais-forte", "Retido por falta de fato quando o caso é duplicidade",
        "A esteira reteve por não achar interrupção na janela.",
        "Existe interrupção: ela só já está sendo usada por outra solicitação, para o mesmo "
        "transformador e o mesmo evento. O caso continua retido — muda o motivo, não o destino."),
    ("RETIDO — SEM DESLOCAMENTO", "RETIDO — SS DUPLICADA"): (
        "motivo-mais-forte", "Retido por falta de deslocamento quando o caso é duplicidade",
        "A esteira reteve na segunda peneira, por falta de atendimento no código do trafo.",
        "A própria narrativa registra que outra solicitação já usou a mesma ocorrência para o "
        "mesmo transformador. O caso continua retido — muda o motivo, não o destino."),
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
    # Onde o caso está parado muda o peso da dúvida. Um indeciso já retido continua retido e
    # não mexe em nada; um indeciso na SAÍDA é falso positivo em potencial que a revisão não
    # conseguiu fechar — e esse merece aparecer separado, não diluído na lista.
    sem_resposta = [{
        "ss": c["ss"],
        "atual": c.get("categoria_atual", ""),
        "na_saida": c.get("categoria_atual") == "SAÍDA",
        "falta": limpa(c.get("motivo")),
    } for c in naoclaro]
    sem_resposta.sort(key=lambda x: (not x["na_saida"], x["ss"]))
    sem_resposta_saida = sum(1 for x in sem_resposta if x["na_saida"])
    sem_resposta_onde = [{"categoria": k, "n": v} for k, v in
                         collections.Counter(x["atual"] for x in sem_resposta).most_common()]

    # ---- o que foi confirmado como correto
    conf_por_cat = collections.Counter(c.get("categoria_atual", "") for c in confirmados)

    # ---- cenários: o efeito de cada escolha sobre a saída de hoje
    entram = sum(1 for c in mudam if c.get("categoria_correta") == "SAÍDA")
    saem = sum(1 for c in mudam if c.get("categoria_atual") == "SAÍDA")
    cen = json.load(open(os.path.join(REV, "cenarios.json"), encoding="utf-8")) \
        if os.path.exists(os.path.join(REV, "cenarios.json")) else {}

    # Os cenários B e C deixaram de ser cenário: viraram regra em 04/08/2026, por decisão do
    # dono. Continuar oferecendo os dois como "e se?" seria mentir sobre o estado da esteira.
    # Sobra o A — aplicar a revisão caso a caso —, e ele precisa de um aviso: os vereditos
    # foram escritos contra a cascata antiga, então parte deles julgou uma categoria que o
    # caso não tem mais. Esses são contados à parte em vez de somados às cegas.
    atual = {ss: r.get("cascata") for ss, r in por_ss.items()}
    ainda_vale = [c for c in mudam if atual.get(c["ss"]) == c.get("categoria_atual")]
    desatualizados = [c for c in mudam if atual.get(c["ss"]) != c.get("categoria_atual")]
    entram = sum(1 for c in ainda_vale if c.get("categoria_correta") == "SAÍDA")
    saem = sum(1 for c in ainda_vale if c.get("categoria_atual") == "SAÍDA")

    cenarios = [{
        "id": "A",
        "rotulo": "Aplicar o que sobrou da revisão caso a caso",
        "descricao": "Dos vereditos escritos na leitura, aplicar os que ainda descrevem a "
                     "situação atual do caso.",
        "entram": entram,
        "saem": saem,
        "saida": saida_hoje + entram - saem,
        "base": f"{len(mudam)} mudanças foram escritas caso a caso. {len(ainda_vale)} ainda "
                f"batem com a categoria que o caso tem hoje; {len(desatualizados)} julgaram uma "
                f"categoria que mudou depois, com as bases corrigidas e as regras novas, e por "
                f"isso não entram na conta sem releitura.",
    }]
    aplicados = [{
        "id": "B", "rotulo": "Medir a janela pela borda da ocorrência", "quando": "04/08/2026",
        "efeito": "A janela passou a valer contra o intervalo inteiro da ocorrência, do primeiro "
                  "passo aberto ao último fechado. Uma ocorrência abre quando a primeira chave "
                  "atua, não quando o transformador queima.",
    }, {
        "id": "C", "rotulo": "Rebaixar o deslocamento de peneira a marcador", "quando": "04/08/2026",
        "efeito": "O atendimento do TMAE deixou de reter. Em 848 casos o número do atendimento era "
                  "idêntico ao da ocorrência, e dos 235 que ele barrava nenhum era 'a equipe não "
                  "saiu' — todos eram 'não há nota no código'.",
    }]


    # ---- a verificação automática, agora aferida contra a leitura
    # Enquanto faltava ler, este bloco era uma tela: dizia o que os campos sozinhos conseguiam
    # decidir sobre quem ainda não tinha sido lido. Fechada a cobertura, ele vira outra coisa,
    # mais útil: o boletim da própria verificação. Cada regra dela agora tem um placar contra a
    # leitura, e o placar é duro com uma delas. Fica publicado assim de propósito — uma
    # verificação automática que ninguém aferiu é uma opinião com cara de número.
    REGRAS = {
        "1": ("Abertura da SS dentro do intervalo do atendimento",
              "A primeira peneira disse que não havia nada na janela. Medindo pela borda mais "
              "próxima em vez do início da ocorrência, a abertura da SS cai dentro do intervalo "
              "do atendimento do TMAE — distância zero."),
        "4": ("Existe atendimento com deslocamento dentro da janela",
              "A segunda peneira disse que não havia atendimento no código do trafo. O registro "
              "traz número de atendimento, dentro da janela, com a equipe deslocada."),
        "2": ("A janela retrocede para dezembro de 2025",
              "A base de interrupção começa em 01/01/2026 01:14. A ocorrência que sustentaria o "
              "caso ficaria no arquivo do mês anterior, que não temos."),
        "3": ("A SS caiu no vão do TMAE, barrando na primeira peneira",
              "O TMAE não tem nenhum atendimento entre 26 e 31 de janeiro."),
        "5": ("A SS caiu no vão do TMAE, barrando na segunda peneira",
              "Mesmo vão de 26 a 31 de janeiro."),
    }
    caminho_placar = os.path.join(REV, "tela_placar.json")
    aferida = None
    if os.path.exists(caminho_placar):
        with open(caminho_placar, encoding="utf-8") as fh:
            bruto = json.load(fh)
        lidos = {c["ss"]: c for c in casos}
        regras = []
        for chave, itens in sorted(bruto.items()):
            n = chave.split(" ")[0]
            rotulo, explicacao = REGRAS.get(n, (chave, ""))
            confirmadas = [i for i in itens
                           if lidos.get(i["ss"], {}).get("categoria_correta") == "SAÍDA"]
            regras.append({
                "id": f"regra-{n}",
                "tipo": "contradiz" if n in ("1", "4") else "lacuna",
                "rotulo": rotulo, "explicacao": explicacao,
                "apontou": len(itens), "confirmadas": len(confirmadas),
                "acerto_pct": round(100 * len(confirmadas) / len(itens)) if itens else 0,
                "ss": [i["ss"] for i in itens],
            })
        regras.sort(key=lambda r: (r["tipo"] != "contradiz", -r["apontou"]))
        contr = [r for r in regras if r["tipo"] == "contradiz"]
        lac = [r for r in regras if r["tipo"] == "lacuna"]
        aferida = {
            "nota": "Antes de as 439 serem lidas, uma verificação automática tentou decidir com "
                    "os campos sozinhos se o motivo da retenção se sustentava. Fechada a leitura, "
                    "dá para medir o que ela acertou. Onde as duas divergiram, a leitura valeu.",
            "contradicoes_apontadas": sum(r["apontou"] for r in contr),
            "contradicoes_confirmadas": sum(r["confirmadas"] for r in contr),
            "lacunas_apontadas": sum(r["apontou"] for r in lac),
            "lacunas_confirmadas": sum(r["confirmadas"] for r in lac),
            "licao": "Uma das duas regras de contradição acertou tudo e a outra errou tudo, e a "
                     "diferença entre elas é a lição: a verificação automática pergunta se o "
                     "campo do atendimento EXISTE dentro da janela; a leitura pergunta se aquele "
                     "atendimento CORROBORA o caso. Nos oito que ela errou, o atendimento era de "
                     "outro código, de outra equipe ou de outra causa — um deles termina 18 horas "
                     "antes de a ocorrência começar. Existir não é corroborar.",
            "lacunas_licao": "Nenhum dos casos de lacuna de base virou saída na leitura. Buraco "
                             "de arquivo não vira prova: quando o registro não existe, o caso "
                             "fica retido, e isso é o comportamento certo.",
            "regras": regras,
        }

    def revisor(nome):
        caminho = os.path.join(REV, nome)
        if not os.path.exists(caminho):
            return None
        with open(caminho, encoding="utf-8") as fh:
            return json.load(fh)

    # ---- a conferência dos achados do revisor dos números
    # Revisor não é oráculo. O achado mais grave desta rodada foi reconferido contra o arquivo
    # cru com um parser independente e não reproduziu. Publicar isso ao lado do achado é o que
    # impede a aba de virar caixa de eco: quem lê vê a alegação E a medição que a contesta.
    caminho_conf = os.path.join(REV, "conferencia_revisor_b.json")
    conferencia = None
    if os.path.exists(caminho_conf):
        with open(caminho_conf, encoding="utf-8") as fh:
            conferencia = json.load(fh)

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
        "sem_resposta_resumo": {
            "n": len(sem_resposta),
            "na_saida": sem_resposta_saida,
            "onde": sem_resposta_onde,
            "nota": "Casos em que a revisão não fechou com o que existe hoje. Os que já estavam "
                    "retidos continuam retidos e não mexem em nada. Os que estão na SAÍDA são "
                    "outra história: cada um é um falso positivo em potencial que ficou sem "
                    "resolução, e são eles que aparecem primeiro na lista.",
        },
        "confirmado": {
            "n": len(confirmados),
            "nota": "Revisadas caso a caso e mantidas na categoria em que já estavam.",
            "por_categoria": [{"categoria": k, "n": v}
                              for k, v in sorted(conf_por_cat.items(), key=lambda x: -x[1]) if k],
        },
        "verificacao_aferida": aferida,
        "cenarios": cenarios,
        "cenarios_aplicados": aplicados,
        "revisores": {"site": revisor("revisor_a.json"), "numeros": revisor("revisor_b.json")},
        "conferencia_dos_achados": conferencia,
        "casos": mudam_ricos,
    }

    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump(saida_json, fh, ensure_ascii=False, indent=1)

    print(f"revisao.json · {len(casos)} SS revisadas de {len(registros)} "
          f"({saida_json['meta']['cobertura_pct']}%)")
    print(f"  mudam {len(mudam)} · confirmadas {len(confirmados)} · sem resposta {len(naoclaro)}")
    print(f"  falsos positivos da saída: {len(falsos)}")
    print(f"  grupos de motivo: {len(grupos)}")
    if aferida:
        print(f"  verificação aferida: {aferida['contradicoes_confirmadas']}/"
              f"{aferida['contradicoes_apontadas']} contradições confirmadas pela leitura, "
              f"{aferida['lacunas_confirmadas']}/{aferida['lacunas_apontadas']} lacunas")
    for c in cenarios:
        print(f"  cenário {c['id']}: saída {saida_hoje} → {c['saida']}")
    print(f"  gravado em {SAIDA} ({os.path.getsize(SAIDA)//1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
