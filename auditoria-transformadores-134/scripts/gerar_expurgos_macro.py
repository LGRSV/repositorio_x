"""A macro categoria dos expurgos de janeiro a agosto — 227 expurgos e 49 retidos.

POR QUE ESTE ARQUIVO EXISTE. A esteira do site fala do universo de jan a jul (1.582) e o
indicador dela é congelado. Esta aba fala de outro universo: as 1.671 SS com esquema
"MC - Substituição de transformador" de janeiro a AGOSTO, lidas caso a caso. Ela não
reescreve nada da esteira — é leitura ao lado do caso, em arquivo próprio, com contador
próprio no cabeçalho.

O QUE A MACRO CATEGORIA FAZ. O gatilho responde "que regra tirou esta SS". São 23 gatilhos,
e 23 caixas na tela não formam uma ideia. A macro junta os gatilhos por PARENTESCO — pelo
tipo de dúvida que cada saída levanta:

  · Sem interrupção comprovada  — a falha pode ter existido, mas não há registro dela
  · Causa externa ao transformador — furto, batida, terceiros: o equipamento não falhou
  · Troca sem falha — preventivo, remanejamento, tape, divisão: trocou, mas não por defeito
  · Em aberto — retidos: não conta hoje, pode voltar amanhã com a prova
  · Sem documento — falta obra, OS ou material que comprove
  · Não houve troca — a equipe foi e não substituiu

EXPURGO E RETIDO SÃO COISAS DIFERENTES, e a coluna `resultado` separa. Retido não é
expurgo: é caso sem martelo batido. Inconclusivo e "avaliar com o Matheus" ficam entre os
retidos pelo mesmo motivo — quem não decidiu não excluiu.

DE ONDE VEM AGOSTO. As 15 linhas marcadas "Crítica + TMAE de agosto (novo)" entraram com as
extrações de agosto: 6 viraram expurgo por não ter interrupção nem atendimento, e 9 ficaram
retidas porque a série retirada difere da instalada — a troca está provada, falta a
interrupção.

Entrada: dados/jan-ago-2026/expurgos-macro.json  (a leitura caso a caso, versionada)
Saída:   public/expurgos-macro.json
"""

import collections
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, "..")
ENTRADA = os.path.join(RAIZ, "dados", "jan-ago-2026", "expurgos-macro.json")
SAIDA = os.path.join(RAIZ, "public", "expurgos-macro.json")

UNIVERSO = 1671
MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago"]
ORDEM_MACRO = [
    "Sem interrupção comprovada",
    "Causa externa ao transformador",
    "Troca sem falha",
    "Em aberto",
    "Sem documento",
    "Não houve troca",
]
# o que cada macro quer dizer, em uma frase, para a tela não precisar de legenda à parte
NOTA_MACRO = {
    "Sem interrupção comprovada": "o transformador não aparece na Crítica, ou aparece fora da janela da SS",
    "Causa externa ao transformador": "furto, batida, terceiros, cadastro errado — o equipamento não falhou",
    "Troca sem falha": "trocou por plano, carga ou tensão, não por defeito",
    "Em aberto": "não conta hoje e pode voltar: falta a prova, não a falha",
    "Sem documento": "falta obra, OS ou material que comprove a substituição",
    "Não houve troca": "a equipe foi ao local e o transformador não saiu do poste",
}
# as colunas que a tela usa; o resto (textos longos) fica no repositório, não no bundle
CAMPOS = ["ss", "mes", "resultado", "macro", "rotulo", "gatilho", "categoria", "trafo",
          "os", "obra", "abertura", "tipo", "equipe", "localidade", "origem_ss",
          "defeito_ss", "ns_ret", "ns_inst", "prova_troca", "cr_causa", "cr_sub",
          "tm_causa", "tm_sub", "no_infotrafo", "origem_leitura", "motivo"]


def main():
    with open(ENTRADA, encoding="utf-8") as fh:
        bruto = json.load(fh)

    registros = [{c: r.get(c, "") for c in CAMPOS} for r in bruto]
    expurgo = [r for r in registros if r["resultado"] == "EXPURGO"]
    retido = [r for r in registros if r["resultado"] == "RETIDO"]

    por_macro = []
    for macro in ORDEM_MACRO:
        gr = [r for r in registros if r["macro"] == macro]
        motivos = collections.Counter(r["rotulo"] for r in gr)
        por_macro.append({
            "macro": macro,
            "nota": NOTA_MACRO[macro],
            "expurgo": sum(1 for r in gr if r["resultado"] == "EXPURGO"),
            "retido": sum(1 for r in gr if r["resultado"] == "RETIDO"),
            "total": len(gr),
            "motivos": [
                {"rotulo": k,
                 "expurgo": sum(1 for r in gr if r["rotulo"] == k and r["resultado"] == "EXPURGO"),
                 "retido": sum(1 for r in gr if r["rotulo"] == k and r["resultado"] == "RETIDO"),
                 "total": v}
                for k, v in motivos.most_common()
            ],
        })

    por_mes = [{
        "mes": m,
        "expurgo": sum(1 for r in expurgo if r["mes"] == m),
        "retido": sum(1 for r in retido if r["mes"] == m),
        "total": sum(1 for r in registros if r["mes"] == m),
    } for m in MESES]

    saida = {
        "meta": {
            "titulo": "Expurgos por macro categoria — janeiro a agosto de 2026",
            "universo": UNIVERSO,
            "recorte": "SS com esquema MC - Substituição de transformador, jan a ago de 2026",
            "fontes": [
                "Leitura caso a caso da SS e da OS, texto integral",
                "Crítica CHEIO 01 a 06 e 08/2026 — interrupção de cliente",
                "TMAE consolidado jan–jun e TMAE 08/2026 — atendimento",
                "Formulário de campo — série retirada e instalada",
            ],
            "aviso": "Universo próprio. Não recalcula o indicador congelado de 1.305 nem a "
                     "esteira das 1.582 — corre ao lado dela.",
        },
        "resumo": {
            "universo": UNIVERSO,
            "contam": UNIVERSO - len(registros),
            "fora": len(registros),
            "expurgo": len(expurgo),
            "retido": len(retido),
            "novos_agosto": sum(1 for r in registros
                                if str(r.get("origem_leitura", "")).startswith("Crítica")),
        },
        "por_macro": por_macro,
        "por_mes": por_mes,
        "registros": registros,
    }

    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump(saida, fh, ensure_ascii=False)

    print(f"expurgos-macro.json · {len(expurgo)} expurgos + {len(retido)} retidos "
          f"= {len(registros)} fora de {UNIVERSO} · {len(por_macro)} macro categorias")


if __name__ == "__main__":
    main()
