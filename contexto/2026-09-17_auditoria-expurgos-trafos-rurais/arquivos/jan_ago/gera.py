# -*- coding: utf-8 -*-
import json
ent = json.load(open('novos_1.json'))
S = []
def add(i, cls, conta, conf, just, evid, prova):
    r = ent[i]
    S.append({"ss": r["ss"], "trafo": r["trafo"], "classificacao": cls,
              "conta_no_indicador": conta, "confianca": conf,
              "justificativa": just, "evidencia": evid, "prova_de_troca": prova})

add(0, "SEM TROCA", False, "baixa",
 "SS aberta como queimado/bucha danificada, mas a conclusão da OS diz expressamente que a equipe não trocou o transformador porque ele não estava queimado — houve apenas manutenção corretiva (para-raios e medição de aterramento). Prevalece o que o executante escreveu. Confiança baixa porque o formulário de campo traz série e tombamento de retirado e instalado, contradizendo a OS. Não houve conferência na base de interrupção (julho não carregado).",
 "NÃO FOI REALIZADA A TROCA DO TRANSFORMADOR, POIS O EQUIPAMENTO NÃO ESTAVA QUEIMADO. FOI EXECUTADO APENAS MANUTENÇÃO CORRETIVA, INCLUINDO A SUBSTITUIÇÃO DOS PARA-RAIOS E A MEDIÇÃO DO ATERRAMENTO.",
 "série")

add(1, "ABALROAMENTO", False, "alta",
 "Troca motivada por poste abalroado — causa externa, não falha do equipamento. O campo confirma o motivo (ABALROADO) e não aponta vazamento. Não houve conferência na base de interrupção (julho não carregado).",
 "Segue Solicitação de Serviço para substituição de transformador que teve o poste abalroado. | PROVÁVEL_MOTIVO_DO_DEFEITO: ABALROADO",
 "série")

add(2, "AVARIADO", True, "média",
 "Substituição motivada por vazamento acentuado de óleo — falha do próprio equipamento, sem queima de enrolamento. A OS documenta retirado (10 kVA, ITB 2007, série 481357) e instalado (15 kVA, ITAM 2026, série C303325). O aumento de potência decorre do reserva disponível; não há relato de remanejamento. Confiança média porque o formulário marcou vazamento 'Não', contrariando a SS, e não houve conferência na base de interrupção (julho não carregado).",
 "Favor enviar manutenção para substituir trafo 5700443155 com muito vazamento de oléo",
 "série")

add(3, "FURTO", False, "alta",
 "Transformador furtado; a OS registra apenas a instalação do novo equipamento, sem retirada (retirado S/N). Furto não conta no indicador. Não houve conferência na base de interrupção (julho não carregado).",
 "TRAFO FURTADO 5700674080 - 15KVA - 34,5KV + PARA RAIO | PROVÁVEL_MOTIVO_DO_DEFEITO: FURTADO",
 "texto")

add(4, "AVARIADO", True, "alta",
 "Vazamento de óleo persistente mesmo após tentativa de vedação; o formulário confirma vazamento 'Sim', motivo 'VAZAMENTO DE OLEO' e uso de cola e fita. A OS traz série e tombamento de retirado e instalado. Falha do próprio equipamento = avariado. Não houve conferência na base de interrupção (julho não carregado).",
 "Favor enviar manutenção substituir trafo com muito vazamento de oléo, foi colocado vedação mais não resolveu. | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim",
 "série")

add(5, "FURTO", False, "alta",
 "Furto do núcleo do transformador, confirmado pela equipe na SS e pelo formulário de campo. Causa externa, não conta no indicador. Não houve conferência na base de interrupção (julho não carregado).",
 "OBS: equipe informou que foi furtado todo o nucleo do transformador",
 "série")

add(6, "QUEIMADO", True, "média",
 "SS de origem QUEIMADO, atendimento emergencial com troca efetiva documentada (retirado ITAIPU série 332365 / instalado TRAEL série 463521, ambos 30 kVA). A OS corrige o código do trafo — o correto é 5700096012 — mas confirma a substituição. Confiança média porque nem a OS nem o campo descrevem a avaria (motivo 'NÃO IDENTIFICADO') e não houve conferência na base de interrupção (julho não carregado).",
 "TRAFO RETIRADO POTÊNCIA : 30KVA ... Nº DE SÉRIE : 332365 ... TRAFO INSTALADO POTÊNCIA : 30KVA ... Nº DE SÉRIE : 463521",
 "série")

add(7, "SEM TROCA", False, "média",
 "A SS relata bucha do secundário danificada e vazamento de óleo, mas a OS foi encerrada apenas com plano de medida (substituir 15 para 25 kVA) e direcionamento para projeto — não há formulário de campo nem qualquer registro de troca executada. Não houve conferência na base de interrupção (julho não carregado). Se o indicador admitir avaria constatada sem substituição, este caso mudaria de lado.",
 "PLANO DE MEDIDA - Realizar substituição do trafo 5700085133 de 15 kVA para 25 kVA - DIRECIONAR PARA PROJETO 8385",
 "nenhuma")

add(8, "AVARIADO", True, "alta",
 "Vazamento de óleo confirmado no formulário ('Sim') e na SS; troca efetivada com série e tombamento de retirado (TRAEL 339270 / CITD 015657) e instalado (TRAEL 836252 / CITD 152225), mesma potência de 15 kVA — não é remanejamento. Não houve conferência na base de interrupção (julho não carregado).",
 "Substituiçao de trafo 5712592130 com vazamento de oleo , trafo de 15kva tensao 34,5kv para raio queimado | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim",
 "série")

add(9, "FURTO", False, "alta",
 "Instalação de transformador em posto cujo equipamento anterior foi furtado (retirado S/N). Não conta no indicador. Não houve conferência na base de interrupção (julho não carregado).",
 "enviar equipe de manutenção para instalar trafo 5742109004 15kva 34.5kv o antigo foi furtado.",
 "texto")

add(10, "SEM TROCA", False, "média",
 "A SS pedia correção de vazamento de óleo, mas a OS foi encerrada com plano de medida (substituir 15 para 25 kVA) e direcionamento ao projeto SIGCO 25983; não há formulário de campo nem registro de substituição. Não houve conferência na base de interrupção (julho não carregado).",
 "PLANO DE MEDIDA - Relaizar substituição do trafo 5719958068 de 15KVA para 25KVA - Direcionar serviço para o projeto SIGCO 25983.",
 "nenhuma")

add(11, "QUEIMADO", True, "média",
 "A conclusão da OS classifica o serviço como substituição de trafo queimado e o campo registra retirado (TRAEL, série 53540) e instalado (série 306279 / CITD 152545), mesma potência. A SS falava em problema de tensão e no tap interno, que também é falha interna do equipamento — de um jeito ou de outro é falha própria e conta; a fronteira queimado/avariado é que fica imprecisa. Não houve conferência na base de interrupção (julho não carregado).",
 "medido_ emergencial_ substituição de trafo queimado rdr porto",
 "série")

add(12, "SEM TROCA", False, "baixa",
 "A OS foi encerrada apenas com plano de medida (5 para 15 kVA) e direcionamento ao projeto SIGCO 25983, sem formulário de campo e sem qualquer registro de substituição. A base de interrupção, porém, casou pelo trafo no mesmo dia com causa TRANSFORMADOR e subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO, 14 clientes — a avaria existe, o que falta é a troca. Confiança baixa: se o indicador aceitar avaria constatada sem substituição, este caso vira AVARIADO.",
 "PLANO DE MEDIDA - Realizar substituição do trafo 5700565065 de 5 kVA para 15 kVA. DIRECIONAR PARA O PROJETO SIGCO 25983. | crítica: causa TRANSFORMADOR / subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO",
 "nenhuma")

add(13, "DIVISÃO DE CIRCUITO", False, "alta",
 "Instalação de trafo novo de 75 kVA para dividir o circuito do trafo 5747384004; não houve retirada de equipamento avariado (retirado 0). A ocorrência associada na base é desligamento sem programação prévia aberto para atender a própria SS, não falha de transformador.",
 "FOI INSTALADO UM TRAFO DE 75 KVA 13.8 KV ID- 74889104.TUPOLOGIA:04163 PARA FAZER DIVISAO DE CIRCUITO DO TRAFO 5747384004",
 "texto")

add(14, "FURTO", False, "alta",
 "Trafo de 75 kVA furtado em Tocantínia; a OS registra baixa de material para reposição do posto, sem qualquer indício de falha do equipamento. O trafo está ausente da base de interrupção, o que é falta de registro e não prova de que nada ocorreu — mas aqui a causa (furto) está clara no texto.",
 "MEDIDO_ 1. Baixado para consumo de material Trafo Furtao 75kva - 34,5kv",
 "texto")

add(15, "FURTO", False, "alta",
 "Trafo e para-raios furtados; a OS registra só o equipamento instalado e encerra com 'TRAFO FURTADO'; o tombamento retirado no campo está preenchido como 'FURTADO'. A crítica traz subcausa 'QUEIMADO POR CAUSA NAO IDENTIFICADA', mas a própria observação da ocorrência diz que o trafo foi furtado — a subcausa está mal apontada.",
 "TRAFO FURTADO | TOMBAMENTO_RETIRADO: FURTADO | crítica obs: trafo foi furtado",
 "texto")

add(16, "SEM TROCA", False, "alta",
 "Não é falha de equipamento: retirada do ativo por determinação judicial, sem instalação de novo transformador (tombamento instalado 00, para-raios não substituído). O formulário não aponta vazamento nem defeito. Ausente da crítica, o que aqui é coerente com uma retirada programada.",
 "Após decisão em ação judicial, segue solicitação para remoção do ativo elétrico (transformador) relacionado à demanda em questão.",
 "texto")

add(17, "FURTO", False, "alta",
 "Substituição de transformador furtado; o formulário aponta motivo FURTADO e retirado 'NA', e a observação da ocorrência na base diz literalmente que o trafo foi furtado. A subcausa registrada (vazamento de óleo / tanque deteriorado) não bate com o relato e deve ser erro de apontamento.",
 "subs trafo furtado 01- para raio acesso bom | crítica obs: trafo 5700600127 furtado",
 "texto")

add(18, "QUEIMADO", True, "alta",
 "Trafo e para-raios constatados queimados em atendimento de OS anterior; troca executada com série e tombamento de retirado (SIEMENS/TRAEL 566177024, CITD 135361) e instalado (ITAIPU 488090, CITD 135291), mesma potência de 30 kVA. A base de interrupção casou pelo trafo, causa TRANSFORMADOR, subcausa QUEIMADO POR CAUSA NAO IDENTIFICADA, 8 clientes.",
 "EM ATENDIMENTO DA OS 110398553 FOI CONSTATADO TRAFO 5760930237, 30KVA 34,5KV E PARA-RAIOS QUEIMADOS.",
 "série")

add(19, "AVARIADO", True, "média",
 "Grande vazamento de óleo na bucha secundária e no regulador de tap; o formulário confirma vazamento 'Sim' e motivo BUCHA DANIFICADA, com série e tombamento de retirado (549907 / 125537) e instalado (337383 / 151081), mesma potência de 25 kVA. Falha do próprio equipamento. Confiança média apenas porque a crítica registrou a ocorrência como QUEIMADO POR SOBRECARGA — a fronteira queimado/avariado diverge, mas nas duas leituras o caso conta.",
 "trafo 5703811122 com um grande vazamento de óleo na bucha secundária e no regulador do tap | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim",
 "série")

add(20, "QUEIMADO", True, "alta",
 "Trafo de 150 kVA queimado na RDU de Araguaína, com troca documentada (retirado TRAEL 305058 / CITD 142660; instalado ROMAGNOLE 1364988 / CITD 131915). A base casou pelo trafo com causa TRANSFORMADOR, subcausa QUEIMADO POR SOBRECARGA, 153 clientes, e a observação descreve o equipamento fervendo no teste.",
 "AO CHEGAR NO LOCAL FOI  REALIDO TESTES NO TRANSFORMADOR AONDE O MESMO FEIO A FERVER DEVIDO ESTAR QUEIMADO.",
 "série")

add(21, "AVARIADO", True, "média",
 "Vazamento de óleo na bucha secundária. Embora o texto da OS traga plano de medida (15 para 25 kVA), a base de interrupção registra, dentro do período da SS, abertura emergencial no próprio trafo por vazamento de óleo com a observação de que a troca foi feita — causa TRANSFORMADOR, subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO. Confiança média porque não há formulário de campo nem série do retirado/instalado.",
 "OBS: TROCA DO TRAFO DEVIDO VASAMENTO DE OLÉ NA SECUNDARIA (crítica, ocorrência 20264811167791)",
 "texto")

add(22, "QUEIMADO", True, "alta",
 "A SS informa transformador queimado, confirmado em campo pela equipe 079op01, e a base casou pelo trafo com causa TRANSFORMADOR e subcausa QUEIMADO POR CAUSA NAO IDENTIFICADA. Troca documentada com série e tombamento de retirado (TRAEL 435470 / CITD06105926) e instalado (ITAM C 308252 / 151683), mesma potência de 15 kVA. O título da OS diz 'avariado', mas em qualquer das duas leituras o caso conta.",
 "Transformador 5700721079 queimado.Equipe 079op01 - Gilney ... esteve no local, informou trafo de 15 e acesso livre.",
 "série")

add(23, "FURTO", False, "alta",
 "Trafo de 5 kVA e para-raios furtados; a OS encerra como substituição de trafo furtado e a base confirma com causa CAUSADA POR TERCEIROS e subcausa ROUBO DE TRANSFORMADOR. Não conta no indicador.",
 "medido_ emergencial_ substituição de trafo furtado monte do carmo | crítica: ROUBO DE TRANSFORMADOR",
 "série")

add(24, "FURTO", False, "alta",
 "Instalação de transformador em posto furtado (retirado 0, motivo FURTADO no campo, observação da OS 'INSTALAÇÃO DE TRAFO FURTADO'). Ausente da crítica — falta de registro, mas a causa está clara no texto e não é falha de equipamento.",
 "OBS: INSTALAÇÃO DE TRAFO FURTADO",
 "texto")

add(25, "FURTO", False, "alta",
 "Instalação de posto de transformação completo em substituição a trafo furtado; o formulário aponta motivo FURTADO e a observação da ocorrência confirma 'intalar trafo furtado'. A ocorrência associada é manobra de normalização, não falha de transformador.",
 "instalar trafo 5701343001 FURTADO na RDR de porto nacional acesso livre | crítica obs: Instaçoes de 01 trafo 5701343001 ... intalar trafo furtado.",
 "série")

add(26, "QUEIMADO", True, "média",
 "SS de origem QUEIMADO (defeito bucha danificada) com troca efetivada — retirado TRAEL série 18186, instalado série 827926 / CITD 150203, de 10 kVA mineral para 15 kVA vegetal. A crítica casou pelo trafo com causa TRANSFORMADOR, porém subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO; por isso a confiança é média na rotulagem entre queimado e avariado — a falha do equipamento é certa e conta em qualquer das duas.",
 "Segue SS para substituição de trafo queimado 5710005049 10 kva | OS: trafo de 10 kva, 19,9kv, mineral; substitudo por trafo 15kva, 19,9kv vegetal.",
 "série")

add(27, "QUEIMADO", True, "alta",
 "Trafo e para-raios queimados; OS encerra como substituição de trafo queimado, com série e tombamento de retirado (VIJAI 174134) e instalado (829106 / 151844). A base casou pelo trafo, causa TRANSFORMADOR, subcausa QUEIMADO POR SOBRECARGA, e a observação diz 'TRAFO QUEIMADO VAZANDO OLEO'.",
 "TRAFO 5703428001 QUEIMADO | crítica obs: OBS: TRAFO QUEIMADO VAZANDO OLEO",
 "série")

assert len(S) == len(ent) == 28
for a,b in zip(S, ent):
    assert a["ss"] == b["ss"] and a["trafo"] == b["trafo"]
json.dump(S, open('saida_novos_1.json','w'), ensure_ascii=False, indent=1)
from collections import Counter
c = Counter(x["classificacao"] for x in S)
for k,v in c.most_common(): print(k, v)
print("CONTAM:", sum(1 for x in S if x["conta_no_indicador"]))
print("conf:", Counter(x["confianca"] for x in S))
print("prova:", Counter(x["prova_de_troca"] for x in S))
