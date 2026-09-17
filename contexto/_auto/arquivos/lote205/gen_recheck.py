# -*- coding: utf-8 -*-
import json

saida = [
 {
  "ss": "DOLP-RD-PA 00294/2026",
  "trafo": "5703857001",
  "classificacao": "TAPE/REGULARIZAÇÃO DE TENSÃO",
  "decisao": "EXPURGAR",
  "confianca": "média",
  "justificativa": "A reclamação e a OS descrevem tensão baixa com TAP interno (não ajustável em campo), e a troca subiu a potência de 15 para 25 kVA — regularização de tensão/reforço de posto, não falha do equipamento. A crítica reforça: a ocorrência ficou FORA DA JANELA (8,9 h antes), com causa CONDUTOR DE BT / PARTIDO NA FASE, ou seja, a interrupção não foi do transformador. O único ponto em contrário é o formulário de campo repetindo o código de defeito da SS (BUCHA DANIFICADA / origem AVARIADO), sem nenhuma descrição de bucha quebrada, vazamento ou queima no texto do executante — por isso a confiança fica em média, mas o expurgo se sustenta.",
  "evidencia": "TRAFO 5703857001 com tensão baixa. TAP Interno.  \nPotência: 15 KVA - Tensão: 13,8 KV",
  "diverge_do_site": False,
  "mudou_com_texto_completo": False,
  "o_que_o_texto_completo_acrescentou": "Nada relevante — a OS tem 746 caracteres e nunca chegou a ser cortada; o que existe além do pedido é só cabeçalho de programação (MANUTENÇÃO / SUBSTITUIÇÃO DE TRANSFORMADOR E MELHORIA DE MALHA DE ATERRAMENTO, equipe e contatos)."
 },
 {
  "ss": "DOLP-RD-PA 00317/2026",
  "trafo": "5700082082",
  "classificacao": "QUEIMADO",
  "decisao": "MANTER",
  "confianca": "alta",
  "justificativa": "Tudo converge para queima do próprio transformador: a SS abre como trafo queimado, o formulário de campo aponta DESCARGA ATMOSFERICA como provável motivo, e a crítica casou pelo trafo com causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA, chave aberta com elo queimado penalizando a carga. A potência retirada e instalada é a mesma (15 kVA), então não há remanejamento de potência. Troca comprovada no material (série 520381 retirada, 827861 instalada).",
  "evidencia": "Segue SS de transformador 5700082082 queimado",
  "diverge_do_site": False,
  "mudou_com_texto_completo": False,
  "o_que_o_texto_completo_acrescentou": "Nada relevante — depois do caractere 900 só vem a lista de atividades contempladas, composição da equipe, supervisor, fiscal e o aviso de segurança do COI; nenhuma informação técnica nova sobre a causa da troca."
 },
 {
  "ss": "ETO-RD-AG 00344/2026",
  "trafo": "5700002210",
  "classificacao": "REMANEJAMENTO",
  "decisao": "EXPURGAR",
  "confianca": "alta",
  "justificativa": "O executante descreve remanejamento puro de potência: o trafo de 15 kVA tinha sido instalado em caráter provisório no atendimento da SS ETO-RD-AG 339/2026 (essa sim, de trafo queimado, em 26/03) por falta de 25 kVA no estoque; depois abriu-se O.S. de plano de medida para colocar o 25 kVA por causa das 27 unidades consumidoras. A queima já foi contabilizada na SS 339/2026 — contar esta seria dupla contagem. Campo confirma: PROVÁVEL MOTIVO DO DEFEITO = NÃO IDENTIFICADO, sem vazamento. A ocorrência de queima que a crítica casou (26/03 08:30) é a da SS anterior, não desta.",
  "evidencia": "FOI ABERTO UMA O.S DE PLANO DE MEDIDA PARA FAZERMOS O REMANEJAMENTO DO TRAFO DE 15KVA-19.9KV POR TRAFO DE 25KVA-19.9KV - DEVIDO ATENDER 27 UNIDADES CONSUMIDORAS",
  "diverge_do_site": False,
  "mudou_com_texto_completo": False,
  "o_que_o_texto_completo_acrescentou": "Nada relevante — o corte tirou apenas os últimos 62 caracteres (posição do tap, impedância e medição do trafo instalado: 6,01 / 7,84 / 7,83); toda a narrativa do remanejamento e a referência à SS 339/2026 já estavam dentro dos 900 caracteres."
 },
 {
  "ss": "ETO-RD-AG 00389/2026",
  "trafo": "5700140090",
  "classificacao": "QUEIMADO",
  "decisao": "MANTER",
  "confianca": "média",
  "justificativa": "O motivo da troca é defeito do próprio equipamento: bucha secundária do neutro quebrada, vazamento de óleo confirmado no formulário de campo e provável motivo DESCARGA ATMOSFERICA; a crítica casou pelo trafo com causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA. O executante ainda registra que o serviço foi de substituição de trafo queimado. A NOTA AC de remanejamento é acessória — o trafo novo e a chave fusível foram deslocados de poste dentro do mesmo serviço, não foi essa a razão da troca; pela regra, título/menção de remanejamento não vale quando o corpo descreve queima/avaria. Confiança média porque a descrição física (bucha quebrada, vazamento) é mais avaria do que queima e há a mudança de potência 10 para 15 kVA junto, mas em qualquer das duas leituras a decisão é MANTER.",
  "evidencia": "SERVIÇO EXECUTADO NO ATENDIMENTO DA SS ETO-RD-AG 0389/2026 DE SUBST DE TRAFO QUEIMADO.",
  "diverge_do_site": True,
  "mudou_com_texto_completo": False,
  "o_que_o_texto_completo_acrescentou": "Nada relevante — a OS tem 866 caracteres e não sofreu corte; a NOTA AC com o remanejamento de poste (ID-68007499 para ID-68007490) já estava visível na leitura anterior e continua sendo acessória ao serviço."
 },
 {
  "ss": "DOLP-RD-PA 00635/2026",
  "trafo": "5710177010",
  "classificacao": "AVARIADO",
  "decisao": "MANTER",
  "confianca": "alta",
  "justificativa": "Avaria do próprio transformador: o check list aponta vazamento de óleo como causa, o formulário de campo confirma EQUIPAMENTO APRESENTA VAZAMENTO DE OLEO = Sim com provável motivo VAZAMENTO DE OLEO, e a crítica casou pelo trafo com causa TRANSFORMADOR / VAZAMENTO DE OLEO / TANQUE DETERIORADO, 5 clientes, dentro da janela. Trafo de 2002 (ABB), tanque deteriorado. Sem mudança de potência registrada (15 para 15) e troca comprovada no material. Classifico como AVARIADO em vez de QUEIMADO porque o defeito é vazamento/tanque, não queima do enrolamento — de todo modo conta no indicador.",
  "evidencia": "- Causa: vazamento de óleo",
  "diverge_do_site": False,
  "mudou_com_texto_completo": False,
  "o_que_o_texto_completo_acrescentou": "Nada relevante — os 1.659 caracteres que vieram depois do corte são integralmente o texto padrão de segurança da equipe (Peso 10, manobras de ré, hidratação, atenção no fim do turno); nenhum dado técnico sobre o trafo."
 }
]

p = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/lote205/saida_recheck.json"
with open(p, "w", encoding="utf-8") as f:
    json.dump(saida, f, ensure_ascii=False, indent=2)

ent = json.load(open("/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/lote205/lote_recheck.json"))
chaves = ["ss","trafo","classificacao","decisao","confianca","justificativa","evidencia","diverge_do_site","mudou_com_texto_completo","o_que_o_texto_completo_acrescentou"]
assert len(saida)==len(ent)
for a,b in zip(saida, ent):
    assert a["ss"]==b["ss"] and a["trafo"]==b["trafo"], (a["ss"],b["ss"])
    assert list(a.keys())==chaves, a.keys()
    # evidencia literal
    txt = (b["texto_os"] or "") + "\n" + (b["texto_ss"] or "")
    assert a["evidencia"] in txt, ("EVID NAO LITERAL", a["ss"], a["evidencia"])
print("OK", p)
