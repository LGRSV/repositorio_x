"""A narrativa dos casos de julho e agosto — a mesma leitura que jan–jun tem.

Nas 1.510 de janeiro a junho, cada caso abre um dossiê que começa por um texto corrido:
"a base de interrupção traz uma ocorrência no transformador X, de tal data, por tanto
tempo, N clientes, causa Y; o defeito foi aberto no próprio transformador…". É esse texto
que permite ler o caso inteiro sem cruzar tabela com tabela.

Julho e agosto não tinham isso. As duas prévias nasceram como lista, e o caso não abria.
Este script escreve a mesma narrativa a partir do que o mês tem — e só do que ele tem.

Regra de honestidade que vale a pena dizer em voz alta: nada aqui é inventado nem
suavizado. Quando a informação não existe, o texto diz que não existe, com o nome do
campo que está vazio. Quando a régua parou por falta de informação de campo, o texto diz
qual informação falta. Uma narrativa que preenche buraco com suposição é pior que
nenhuma: ela some com o buraco.
"""

import json
import os
import re

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")


def txt(v):
    return "" if v is None else str(v).strip()


def limpa(s, n=None):
    s = re.sub(r"\s+", " ", txt(s))
    return s[:n] + "…" if n and len(s) > n else s


def horas(v):
    try:
        h = float(v)
    except (TypeError, ValueError):
        return ""
    if abs(h) < 1:
        return f"{abs(h) * 60:.0f} minutos"
    if abs(h) < 48:
        return f"{abs(h):.1f} horas".replace(".", ",")
    return f"{abs(h) / 24:.1f} dias".replace(".", ",")


def narrar(c):
    """O caso contado como quem explica para alguém que não viu a tabela."""
    p = []
    ss, trafo, loc = txt(c.get("ss")), txt(c.get("trafo")), txt(c.get("localidade"))
    pot_r, pot_i = txt(c.get("pot_ret")), txt(c.get("pot_inst"))

    # ── de onde o caso vem
    abre = (f"A solicitação {ss} foi aberta em {txt(c.get('abertura'))} sobre o "
            f"transformador {trafo}, em {loc}, no alimentador {txt(c.get('alimentador')) or '—'}")
    origem, defeito = txt(c.get("origem")), txt(c.get("defeito"))
    if origem or defeito:
        abre += f", com origem {origem or 'não declarada'} e defeito {defeito or 'não declarado'}"
    abre += (f". A situação dela é {txt(c.get('situacao')) or 'não informada'}"
             f"{f', criticidade {txt(c.get(chr(99)+chr(114)+chr(105)+chr(116)+chr(105)+chr(99)+chr(105)+chr(100)+chr(97)+chr(100)+chr(101)))}' if txt(c.get('criticidade')) else ''}"
             f", e o tipo é {txt(c.get('tipo_ss')) or 'não informado'}.")
    p.append(abre)

    # ── o que a Crítica diz
    ocs = c.get("ocorrencias") or []
    critica = txt(c.get("critica"))
    if not ocs:
        p.append("A base de interrupção NÃO traz ocorrência para este ativo no mês. "
                 "Isso não é contraprova: a ocorrência só entra na Crítica quando finaliza, "
                 "e a extração usada pode ser anterior ao fechamento. É por isso que o caso "
                 "fica pendente em vez de ser excluído.")
    else:
        dentro = [o for o in ocs if o.get("na_janela")]
        base = dentro[0] if dentro else ocs[0]
        frase = (f"A base de interrupção traz {len(ocs)} ocorrência"
                 f"{'s' if len(ocs) > 1 else ''} ligada{'s' if len(ocs) > 1 else ''} a este "
                 f"ativo no mês. A que sustenta o caso vai de {txt(base.get('inicio'))} a "
                 f"{txt(base.get('fim'))}")
        if txt(base.get("duracao_min")):
            frase += f", {txt(base.get('duracao_min'))} minutos"
        if txt(base.get("clientes")):
            frase += f", {txt(base.get('clientes'))} cliente(s) afetado(s)"
        frase += (f", causa {txt(base.get('causa')) or 'não informada'}"
                  f"{f', subcausa {txt(base.get(chr(115)+chr(117)+chr(98)+chr(99)+chr(97)+chr(117)+chr(115)+chr(97))).lower()}' if txt(base.get('subcausa')) else ''}")
        if txt(base.get("papeis")):
            frase += f"; nela o ativo aparece como {txt(base.get('papeis'))}"
        frase += "."
        p.append(frase)

        if dentro:
            p.append(f"A abertura da solicitação cai DENTRO da janela dessa ocorrência — "
                     f"{horas(base.get('delta_inicio_h'))} "
                     f"{'antes' if _neg(base.get('delta_inicio_h')) else 'depois'} do início e "
                     f"{horas(base.get('delta_fim_h'))} "
                     f"{'antes' if _neg(base.get('delta_fim_h')) else 'depois'} do fim. "
                     f"É casamento pleno pela régua: prova elétrica própria.")
        elif critica == "AUSENTE":
            p.append("Nenhuma dessas ocorrências cita o ativo desta solicitação — por isso "
                     "ele está marcado como ausente da Crítica.")
        else:
            p.append(f"A abertura da solicitação fica FORA da janela: "
                     f"{horas(base.get('delta_inicio_h'))} "
                     f"{'antes' if _neg(base.get('delta_inicio_h')) else 'depois'} do início da "
                     f"ocorrência, e a régua admite uma hora para trás e vinte e quatro para "
                     f"frente contra o intervalo inteiro. Perder a janela não prova que o "
                     f"evento é outro: prova que a régua, sozinha, não fecha este caso.")

        obs = [limpa(o.get("observacao")) for o in ocs if txt(o.get("observacao"))]
        if obs:
            p.append(f"A equipe escreveu na ocorrência: “{limpa(obs[0], 400)}”"
                     + (f" Há mais {len(obs) - 1} observação(ões) nas outras ocorrências."
                        if len(obs) > 1 else ""))

    # ── o que o campo escreveu
    t_ss, t_os = limpa(c.get("texto_ss")), limpa(c.get("texto_os"))
    if t_ss:
        p.append(f"O texto da solicitação diz: “{limpa(t_ss, 420)}”")
    if t_os:
        p.append(f"A ordem de serviço {txt(c.get('os')) or 'não apontada'} registra: "
                 f"“{limpa(t_os, 420)}”")
    if pot_r or pot_i:
        if pot_r and pot_i and pot_r != pot_i:
            p.append(f"A potência mudou no poste: saiu {pot_r} kVA e entrou {pot_i} kVA. "
                     f"Aumento de potência pede segunda leitura — melhoria de rede não é "
                     f"queima.")
        elif pot_r and pot_i:
            p.append(f"A potência foi mantida em {pot_r} kVA, que é o padrão de uma troca "
                     f"por falha e não de uma melhoria.")

    # ── as bandeiras, uma por uma
    band = []
    if txt(c.get("auxiliar")) and txt(c.get("auxiliar")) != "NAO":
        band.append(f"há suspeita de transformador de serviço auxiliar ({txt(c.get('auxiliar'))})"
                    + (f", pelas evidências: {'; '.join(c.get('auxiliar_evidencias') or [])}"
                       if c.get("auxiliar_evidencias") else ""))
    if c.get("flag_sem_os"):
        band.append("a solicitação não tem ordem de serviço apontada")
    if c.get("flag_gemea") or (c.get("gemeas") or []):
        g = ", ".join(txt(x.get("ss")) for x in (c.get("gemeas") or []))
        band.append(f"existe solicitação gêmea de repasse{f' ({g})' if g else ''}, que é o "
                    f"mesmo evento aberto duas vezes — só uma pode contar")
    if txt(c.get("flag_tmae")):
        band.append(f"sobre o deslocamento: {txt(c.get('flag_tmae'))}")
    if band:
        p.append("Bandeiras deste caso: " + "; ".join(band) + ".")

    # ── e a decisão, com o nome de quem decidiu
    entra = txt(c.get("entra"))
    veredito = ("Passa e entra no indicador do mês" if entra == "SIM"
                else "Fica pendente, sem entrar" if entra == "PENDENTE"
                else "Fica fora do indicador")
    p.append(f"{veredito}: {limpa(c.get('categoria'))}. {limpa(c.get('justificativa'))} "
             f"Quem decidiu: {txt(c.get('decidido_por')) or 'não registrado'}"
             f"{f' em {txt(c.get(chr(100)+chr(101)+chr(99)+chr(105)+chr(100)+chr(105)+chr(100)+chr(111)+chr(95)+chr(101)+chr(109)))}' if txt(c.get('decidido_em')) else ''}.")
    if txt(c.get("decidido_por")).startswith("a régua"):
        p.append("Este mês é prévia: a régua apurou e parou. Nenhuma pessoa bateu martelo "
                 "neste caso ainda, e a régua sozinha não fecha caso que depende de "
                 "informação de campo.")
    if c.get("capturado_por"):
        p.append(f"O caso foi capturado por: {', '.join(c['capturado_por'])}.")
    return " ".join(p)


def _neg(v):
    try:
        return float(v) < 0
    except (TypeError, ValueError):
        return False


for arq in ("julho-2026.json", "agosto-2026.json"):
    cam = os.path.join(APP, arq)
    d = json.load(open(cam, encoding="utf-8"))
    n = 0
    for chave in ("registros", "ampliado"):
        for c in d.get(chave, []):
            c["narrativa"] = narrar(c)
            n += 1
    json.dump(d, open(cam, "w"), ensure_ascii=False, indent=1)
    print(f"{arq}: {n} narrativas escritas")
    ex = d["registros"][0]
    print(f"   exemplo — {ex['ss']}:\n   {ex['narrativa'][:400]}…\n")
