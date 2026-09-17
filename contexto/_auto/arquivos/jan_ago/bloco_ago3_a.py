# -*- coding: utf-8 -*-
import json
d = json.load(open('ago_3.json'))

BLOCO_A = [
{
 "classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS e OS descrevem trafo com vazamento de oleo pela bucha secundaria; o formulario de campo confirma vazamento e aponta o mesmo motivo. Vazamento de oleo e falha do proprio equipamento, sem queima de enrolamento, logo AVARIADO. Serie e tombamento do instalado e serie do retirado preenchidos e detalhados na OS (retirado 954903 / instalado 451481), houve troca fisica. A critica ficou como TRAFO FORA DA JANELA (dist 2,79h), mas a propria observacao da ocorrencia cita a manutencao no trafo 5700855045 para atender esta SS, o que reforca o caso.",
 "evidencia":"substituir trafo com vazamento de oleo pela bucha secundaria / EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO = Sim / PROVAVEL_MOTIVO_DO_DEFEITO = VAZAMENTO DE OLEO",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS aberta por transformador e para-raios queimados; a conclusao da OS registra a substituicao do trafo de 30 kVA por outro de 30 kVA (mesma potencia, portanto nao e remanejamento). A critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA e observacao 'queimado'. Serie e tombamento dos dois lados preenchidos.",
 "evidencia":"TRAFO DE 30KV DA 19,9KV (MINERAL), SUBSTITUIDO POR TRFO DE 30KV(MINERAL) / critica: causa TRANSFORMADOR, subcausa QUEIMADO POR CAUSA NAO IDENTIFICADA",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de substituicao de transformador queimado; a OS confirma a troca na RDR de Parana. O aumento de 5 para 15 kVA e consequencia do estoque/normalizacao e nao caracteriza remanejamento, porque o motivo declarado e a queima. A critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA. Serie e tombamento dos dois lados preenchidos.",
 "evidencia":"SUBSTITUICAO DE TRANSFORMADOR QUEIMADO E PARA RAIO TOPOLOGIA 5700386021 / critica: TRANSFORMADOR - QUEIMADO POR CAUSA NAO IDENTIFICADA",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"O texto da SS diz 'queimado' e a OS acrescenta que o trafo foi substituido por equipe propria da ETO em periodo de paralisacao da DOLP. A critica achou ocorrencia no mesmo trafo com causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA, confirmando a queima. Confianca media porque a data de termino (16/03/2026) e anterior a abertura da SS (07/08/2026) e a ocorrencia esta a 3.410h de distancia: e uma SS de agosto regularizando servico executado em marco, o que pode gerar dupla contagem se o evento ja foi computado no mes da falha.",
 "evidencia":"Trafo 5710041092, 30 Kva, 34,5 Kv queimado acesso livre TF substituito pela equipe propria ETO (periodo de paralizacao dolp) / termino 2026-03-16T12:00",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de trafo e para-raios queimados com numero de interrupcao ja informado na abertura; a critica casou exatamente essa ocorrencia (20264747803028), dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA, 7 clientes. A OS confirma a substituicao emergencial. Mesma potencia (15/15) e serie e tombamento dos dois lados preenchidos.",
 "evidencia":"medido_ emergencial_ substituicao de trafo queimado rdr porto / critica obs: 'Queima de elo no TR 5720754001.'",
 "prova_de_troca":"série"
},
{
 "classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A SS abriu como queimado, mas o texto da OS e copia literal do texto da SS acrescido apenas da ficha dos equipamentos, ou seja, nao ha relato proprio do executante no corpo. O que o executante efetivamente preencheu foi o formulario de campo: vazamento de oleo Sim e provavel motivo VAZAMENTO DE OLEO; a critica, por sua vez, traz subcausa FALHA BUCHA DE BT. Ambos apontam avaria do equipamento, nao queima de enrolamento. Confianca media pelo conflito entre a origem da SS (QUEIMADO / SOBRECARGA) e o formulario; de todo modo QUEIMADO e AVARIADO contam igualmente no indicador. Troca fisica comprovada (retirado 976306/104530, instalado 1537475/136900).",
 "evidencia":"EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO = Sim; PROVAVEL_MOTIVO_DO_DEFEITO = VAZAMENTO DE OLEO / critica subcausa: FALHA BUCHA DE BT",
 "prova_de_troca":"série"
},
{
 "classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A SS pediu substituicao de trafo queimado, mas as duas evidencias de execucao apontam avaria: o formulario marca vazamento de oleo Sim e a critica casou pelo trafo (dist 0h) com subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO, coerente com um equipamento TOSHIBA de 1995. A OS registra a troca (retirado 25 kVA, instalado 15 kVA) e traz medicoes pos-troca. A reducao de potencia acompanha a substituicao emergencial e nao caracteriza remanejamento. Confianca media porque o numero de serie do instalado nao foi preenchido no formulario (so o tombamento 152626).",
 "evidencia":"critica: causa TRANSFORMADOR, subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO; campo EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO = Sim",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de substituicao de trafo queimado no setor Sonho Meu; o texto da OS repete o da SS e acrescenta so os dados do atendimento, mas a critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA e 32 clientes interrompidos, com observacao expressa de trafo queimado. Mesma potencia (25/25) e serie e tombamento dos dois lados preenchidos.",
 "evidencia":"critica obs: 'Queima de ELO no(a) TR/CH 5705035122 Penalizando cargas da RDR/RDU PALMAS, Causa TRAFO QUEIMADO'",
 "prova_de_troca":"série"
},
{
 "classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"SS e defeito de execucao registram bucha primaria danificada, que e falha do proprio equipamento sem queima de enrolamento. A conclusao da OS confirma a troca (15 kVA mineral por 15 kVA de oleo vegetal), mesma potencia. Confianca media porque a critica classificou a ocorrencia como QUEIMADO POR CAUSA NAO IDENTIFICADA e sua observacao cita um codigo de trafo diferente (5700821049); alem disso o numero de serie do instalado nao foi preenchido, ficando so o tombamento (retirado 10516 / instalado 150604).",
 "evidencia":"transformador com a bucha primaria danificada, acesso livre / PROVAVEL_MOTIVO_DO_DEFEITO = BUCHA DANIFICADA",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"A equipe esteve no local e registrou trafo em curto; curto no enrolamento e queima. A critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA. A OS traz a ficha completa dos dois equipamentos de 112,5 kVA, mesma potencia, com serie e tombamento dos dois lados.",
 "evidencia":"014OP01 ESTEVE NO LOCAL TRAFO EM CURTO PARA RAIOS / critica: TRANSFORMADOR - QUEIMADO POR CAUSA NAO IDENTIFICADA",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de trafo e para-raios queimados; a critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA e observacao 'trafo queimado aberto nota'. Mesma potencia (30/30) e serie e tombamento dos dois lados preenchidos. O texto da OS repete o da SS, acrescido dos dados do atendimento.",
 "evidencia":"TR-5730823070 Queimado para raios queimado / critica: TRANSFORMADOR - QUEIMADO POR DESCARGA ATMOSFERICA",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de substituicao de trafo queimado com para-raios queimado na rural de Dianopolis; a conclusao da OS confirma a troca do trafo de 10 kVA mineral por um de 15 kVA vegetal. A critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA, repetindo o texto da SS na observacao. O aumento de potencia acompanha a substituicao emergencial e nao configura remanejamento.",
 "evidencia":"TRAFO DE 10 KVA MINERAL DA 19.9KV, SUBSTITIDO POR TRAFO DE 15KVA VEGETAL / critica: QUEIMADO POR CAUSA NAO IDENTIFICADA",
 "prova_de_troca":"série"
},
{
 "classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS aberta como avariado por vazamento de oleo e bucha avariada; a critica casou pelo trafo com dist 0h, subcausa FALHA BUCHA DE BT, e a observacao da ocorrencia descreve neutro rompido na bucha e vazamento de oleo. A OS repete o texto da SS, mas o formulario traz serie e tombamento de retirado (362795/17359) e instalado (273712/145858), o que comprova a troca fisica apesar de a observacao da ocorrencia falar em 'reparo'. Mesma potencia (25/25). Falha do proprio equipamento, sem queima: AVARIADO.",
 "evidencia":"critica obs: 'NETRO ROMPIDO NA BUCHA DO TRAFO, E VAZANDO OLEO' / PROVAVEL_MOTIVO_DO_DEFEITO = VAZAMENTO DE OLEO",
 "prova_de_troca":"série"
},
]

out = []
for o, v in zip(d[:13], BLOCO_A):
    out.append({
        "ss": o["ss"], "trafo": str(o["trafo"]),
        "classificacao": v["classificacao"],
        "conta_no_indicador": v["conta_no_indicador"],
        "confianca": v["confianca"],
        "justificativa": v["justificativa"],
        "evidencia": v["evidencia"],
        "prova_de_troca": v["prova_de_troca"],
    })
json.dump(out, open('saida_ago_3.json','w'), ensure_ascii=False, indent=1)
print("gravados", len(out))
