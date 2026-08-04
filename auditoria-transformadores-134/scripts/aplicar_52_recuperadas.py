#!/usr/bin/env python3
"""Aplica no fluxo-1510.json as 52 solicitações que ganharam lastro com as bases corrigidas.

De onde vêm as 52:
  44  a Crítica de 2026 relida com o leitor certo. O leitor anterior tratava a aspa do campo
      OBSERVACAO como delimitador de texto e engolia tudo até a aspa seguinte — 5.548 linhas
      sumiam antes de serem contadas, quase todas de janeiro. Todas as 44 vêm dessas linhas.
   8  a Crítica de dezembro/2025, que não existia no acervo. São ocorrências que atravessaram
      a virada do ano e sustentam SS abertas na manhã de 01/01.

O que este script NÃO faz: inventar. Cada uma das 52 recebe a ocorrência real que a sustenta,
com número, datas, causa e clientes copiados do arquivo de origem. A partir daí a esteira roda
como sempre rodou — quem não tem atendimento no TMAE continua parando na segunda peneira.

Rodar de novo é seguro: quem já está com o oc_num aplicado não é tocado outra vez.
"""
import datetime
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
REV = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad"

# Horário de Brasília, para o dono conseguir filtrar o que mudou e quando.
BRASILIA = datetime.timezone(datetime.timedelta(hours=-3))
CARIMBO = datetime.datetime.now(BRASILIA).strftime("%Y-%m-%d %H:%M")
ORIGEM = "2026-08-04 · bases corrigidas (leitor de CSV + dezembro/2025)"


def horas(a, b):
    return round((a - b).total_seconds() / 3600, 2)


def dt(s):
    for f in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.datetime.strptime(str(s)[:19], f)
        except (ValueError, TypeError):
            pass
    return None


def main():
    with open(FLUXO, encoding="utf-8") as fh:
        fluxo = json.load(fh)
    reg = {str(r.get("ss", "")).strip(): r for r in fluxo["registros"]}

    novas = []
    for arq, fonte in (("etapa1_44.json", "Crítica de 2026, linha antes ilegível"),
                       ("etapa2_dezembro.json", "Crítica de dezembro/2025")):
        with open(os.path.join(REV, arq), encoding="utf-8") as fh:
            for x in json.load(fh):
                x["_fonte"] = fonte
                novas.append(x)
    print(f"{len(novas)} solicitações a aplicar")

    mudou = collections_counter = {}
    aplicadas = 0
    for x in novas:
        r = reg.get(x["ss"])
        if r is None:
            print(f"  !! {x['ss']} não está no fluxo", file=sys.stderr)
            continue
        # Só mexe em quem a primeira peneira reteve. Quem já passou dela não muda de lugar
        # por esta correção — a ocorrência nova só reforça o que já estava sustentado.
        if r.get("cascata") not in ("RETIDO — SEM INTERRUPÇÃO NA JANELA", "RETIDO — SS DUPLICADA"):
            continue
        ini, fim = dt(x.get("oc_ini")), dt(x.get("oc_fim"))
        ab = dt(r.get("abertura"))
        borda = x.get("distancia_borda_h", x.get("borda_h"))

        r["oc_num"] = x.get("ocorrencia") or x.get("oc")
        r["oc_ini"] = f"{ini:%Y-%m-%d %H:%M}" if ini else None
        r["oc_fim"] = f"{fim:%Y-%m-%d %H:%M}" if fim else None
        r["oc_dur_h"] = horas(fim, ini) if ini and fim else None
        r["oc_cons"] = x.get("clientes")
        r["oc_causa"] = x.get("causa", "TRANSFORMADOR")
        r["oc_sub"] = x.get("subcausa") or x.get("sub")
        r["oc_prob_ele"] = "TR"
        r["oc_dist_h"] = borda
        # A distância vale contra o intervalo INTEIRO da ocorrência, não contra o início dela.
        # Era esse o vício do campo antigo: numa ocorrência de 46 h, quem abriu a SS sete horas
        # depois do religamento aparecia a 53 h do começo e caía fora da janela.
        r["e1_delta_h"] = borda
        r["e1_nivel"] = "A" if borda == 0 else "B"
        r["e1_status"] = "SEGUE"
        r["e1_sinais"] = ""
        r["chega_e2"] = "SIM"
        r["fato"] = "F1"
        r["fato_texto"] = ("Fato pleno — a Crítica registra interrupção no próprio transformador "
                           "dentro da janela")
        r["revisado_em"] = CARIMBO
        r["revisao_origem"] = ORIGEM
        r["revisao_fonte"] = x["_fonte"]

        # A ressalva tem que ser recalculada contra a ocorrência NOVA, não herdada da antiga.
        # Sem isto, um caso cuja interrupção recuperada não deixou nenhum cliente sem energia
        # passaria direto para a saída carregando o e4_status de uma ocorrência que nem é mais
        # a dele. Foi o que aconteceu com a ETO-RD-GR 00048 na primeira rodada.
        sinais = []
        cs = f"{r.get('oc_causa','')} {r.get('oc_sub','')}".upper()
        if "PREVENTIV" in cs:
            sinais.append("interrupção preventiva")
        if r.get("oc_tipo") == "ITP" or "PROGRAMADA" in cs:
            sinais.append("desligamento programado")
        if "SEM PROGRAMACAO PREVIA" in cs:
            sinais.append("manobra sem programação prévia")
        if "PARTICULAR" in cs:
            sinais.append("transformador particular")
        if not (r.get("oc_cons") or 0):
            sinais.append("nenhum cliente interrompido")
        if r.get("oc_prob_ele") not in ("TR", "", None):
            sinais.append("defeito em outro elemento")
        if r.get("oc_tipo") in ("FEN", "FFA"):
            sinais.append("reclamacao individual (FEN/FFA)")
        r["ressalvas"] = " · ".join(sinais)
        r["e4_status"] = "ALERTA" if sinais else "OK"
        r["e4_alertas"] = " · ".join(sinais)

        # --- daqui em diante a esteira roda como sempre rodou
        if r.get("e2_status") == "SEM ATENDIMENTO" or not str(r.get("at_num") or "").strip():
            r["e2_status"] = "SEM ATENDIMENTO"
            r["chega_e3"] = "NÃO"
            r["cascata"] = "RETIDO — SEM DESLOCAMENTO"
            r["cascata_motivo"] = ("A interrupção existe e é do próprio transformador, mas não há "
                                   "atendimento de equipe registrado no código dele")
        elif r.get("e2_status") == "ATENDIMENTO SEM DESLOCAMENTO":
            r["chega_e3"] = "NÃO"
            r["cascata"] = "RETIDO — SEM DESLOCAMENTO"
            r["cascata_motivo"] = "A nota do TMAE existe, mas a equipe não se deslocou"
        else:
            r["e2_status"] = "SEGUE"
            r["chega_e3"] = "SIM"
            if r.get("e3_status") != "SEGUE":
                r["cascata"] = "RETIDO — SEM PROVA DE TROCA"
                r["cascata_motivo"] = r.get("e3_motivo", "")
            elif r.get("e4_status") != "OK":
                r["cascata"] = "RETIDO — RESSALVA DA INTERRUPÇÃO"
                r["cascata_motivo"] = "A interrupção tem sinal que a enfraquece: " + str(r.get("e4_alertas", ""))
            else:
                r["cascata"] = "SAÍDA"
                r["cascata_motivo"] = ("Campo, texto e material convergem: interrupção no próprio "
                                       "transformador, atendimento de equipe e troca comprovada")
                r["decisao"] = "INCLUIR"
                # o campo confirmado só existe para quem está na saída, e é ele que soma
                # os 856 queimados + 28 avariados. Quem entra agora precisa dele preenchido.
                r["confirmado"] = r.get("categoria_texto") or r.get("categoria") or "QUEIMADO"
        aplicadas += 1
        mudou[x["ss"]] = r["cascata"]

    import collections
    print(f"  aplicadas: {aplicadas}")
    for k, v in collections.Counter(mudou.values()).most_common():
        print(f"    {v:4}  agora em {k}")
    print()
    c = collections.Counter(r["cascata"] for r in fluxo["registros"])
    print("cascata depois:")
    for k, v in c.most_common():
        print(f"  {v:5}  {k}")
    print(f"  {sum(c.values()):5}  TOTAL")

    with open(FLUXO, "w", encoding="utf-8") as fh:
        json.dump(fluxo, fh, ensure_ascii=False)
    print(f"\ngravado · carimbo {CARIMBO} (Brasília)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
