# -*- coding: utf-8 -*-
import json
d = json.load(open('ago_3.json'))
out = json.load(open('saida_ago_3.json'))

BLOCO_B = [
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de transformador queimado na RDU de Porto Alegre do Tocantins; a critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR SOBRECARGA, 65 clientes interrompidos, e a observacao da ocorrencia cita a propria SS. A OS e curta ('TRAFO SUBSTITUIDO PELA WC'), mas o formulario traz serie e tombamento dos dois lados. Chama atencao o equipamento retirado ter data de fabricacao 05/2026, ou seja, falha precoce de cerca de tres meses.",
 "evidencia":"TRAFO SUBSTITUIDO PELA WC / critica: TRANSFORMADOR - QUEIMADO POR SOBRECARGA, 65 clientes",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de transformador queimado (o pedido de cruzetas novas e servico acessorio na estrutura, nao muda a natureza da troca). A OS traz a ficha completa dos dois equipamentos de 75 kVA, mesma potencia, e a critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA, com 73 clientes interrompidos. Defeito de execucao registrado como SOBRECARGA.",
 "evidencia":"TRANSFORMADOR 5700015153 QUEIMADO. FAVOR INSTALAR NOVAS CRUZETAS / critica: TRANSFORMADOR - QUEIMADO POR CAUSA NAO IDENTIFICADA",
 "prova_de_troca":"série"
},
{
 "classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS aberta como avariado por vazamento de oleo em trafo de 150 kVA na RDU de Gurupi; o formulario confirma vazamento de oleo Sim e a OS registra a troca por outro de 150 kVA, mesma potencia. A critica casou pelo trafo com dist 0h e a observacao descreve abertura emergencial por situacao de risco com trafo vazando oleo. Falha do proprio equipamento sem queima: AVARIADO.",
 "evidencia":"critica obs: 'Abertura emergencial TR 5700709003, Devido situacao de Risco: Trafo com vazamento de oleo' / EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO = Sim",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A SS descreve trafo queimado e o defeito de execucao foi fechado literalmente como QUEIMADO; a OS traz a ficha dos dois equipamentos. A critica casou pelo trafo com dist 0h, mas com subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO e observacao 'Causa Transformador avariado', enquanto o formulario aponta sobrecarga e nega vazamento. Ha divergencia entre queima e avaria; prevalece o defeito de execucao (QUEIMADO), e das duas formas o caso conta no indicador. Troca comprovada (retirado 359189, instalado 448662/110100).",
 "evidencia":"defeito_execucao = QUEIMADO / critica: subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO, obs 'Causa Transformador avariado'",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A equipe que esteve no local relatou o trafo queimado e com muito vazamento de oleo na estrutura e no solo; a OS traz a ficha completa dos dois equipamentos de 15 kVA. A critica casou pelo trafo com dist 0h, porem com subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO, e o formulario aponta descarga atmosferica. Classifiquei como QUEIMADO por ser o relato direto de quem foi ao local, com confianca media pela coexistencia de avaria; nos dois cenarios o caso conta.",
 "evidencia":"EQUIPE CHEGOU NO LOCAL TRAFO ESTAVA QUEIMADO E COM MUITO VAZAMENTO DE OLEO NA ESTRUTURA E SOLO",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A SS e generica ('substituir trafo na rdr de monte santo'), mas a origem esta registrada como QUEIMADO e a observacao da ocorrencia diz expressamente que foi localizada a chave com codoalha e trafo queimado. A OS traz a ficha completa dos dois equipamentos, com troca de 5 para 15 kVA. Confianca media porque a critica casou pela chave gemea e classificou a causa como CHAVE FUSIVEL/RELIGADORA - ELO SOBREDIMENSIONADO/CHAVE JUMPEADA, ou seja, o registro de interrupcao foi lancado na chave e nao no transformador.",
 "evidencia":"critica obs: 'Ramal com defeito foi localizado chave 0300774085 com codoalha e trafo queimado'",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de trafo de 10 kVA queimado, com teste a vazio feito e para-raios em ordem; a OS do executante e titulada 'TROCA DE TRAFO QUEIMADO' e traz a ficha dos dois equipamentos com medicoes e coordenadas. A critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA. O formulario tambem marca vazamento de oleo, mas a queima e o motivo declarado pela execucao.",
 "evidencia":"TROCA DE TRAFO QUEIMADO 5700380066 ETO-RD-GR 842/2026 / critica: TRANSFORMADOR - QUEIMADO POR CAUSA NAO IDENTIFICADA",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Embora a potencia suba de 30 para 75 kVA e a criticidade esteja como PROGRAMAVEL, o que sugeriria melhoria de posto, o corpo dos textos e claro: o trafo queimou primeiro e a equipe aproveitou para instalar um maior. A OS do executante e titulada 'TROCA DE TRAFO QUEIMADO' e a critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR SOBRECARGA, com observacao 'Causa Trafo queimado'. Titulo e potencia nao derrubam o relato de queima.",
 "evidencia":"TROCA DE TRAFO QUEIMADO 5700024023 / critica obs: 'Trafo de distribuicao Aberto TR 5700024023 ... Causa Trafo queimado'",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de substituicao de trafo queimado na RDR de Araguacema; a critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA e observacao 'trafo 5701247055 queimado'. A OS traz a ficha completa dos dois equipamentos, incluindo o numero de serie do instalado (C306413) que nao foi transcrito no formulario, alem dos tombamentos dos dois lados.",
 "evidencia":"critica obs: 'trafo 5701247055 queimado' / OS: TRAFO INSTALADO N DE SERIE : C306413, CITD 152672",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de trafo queimado de 75 kVA na RDU de Gurupi, com pedido de levar um de 112,5 kVA; a OS confirma a substituicao com medicoes pos-troca. A critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR SOBRECARGA, 25 clientes. O aumento de potencia decorre da queima por sobrecarga e nao de remanejamento programado. Equipamento retirado de 1999.",
 "evidencia":"SEGUE SS DE TRAFO QUEIMADO 5700838003 / critica: TRANSFORMADOR - QUEIMADO POR SOBRECARGA",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de trafo queimado com para-raios queimado em Araguaina; a OS traz a ficha completa dos dois equipamentos de 30 kVA, mesma potencia. A critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA. Serie e tombamento dos dois lados preenchidos.",
 "evidencia":"Trafo: 5730104004 queimado ... Para raio: queimado / critica: TRANSFORMADOR - QUEIMADO POR DESCARGA ATMOSFERICA",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS para substituir trafo de 112,5 kVA queimado na RDU de Goianorte; a OS do executante e titulada 'TROCA DE TRAFO QUEIMADO' e traz ficha, medicoes e coordenadas. A critica casou pelo trafo com dist 0h, causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA, com 122 clientes interrompidos. Mesma potencia e serie e tombamento dos dois lados.",
 "evidencia":"TROCA DE TRAFO QUEIMADO 5754952087 ETO-RD-GR 860/2026 / critica: 122 clientes, QUEIMADO POR CAUSA NAO IDENTIFICADA",
 "prova_de_troca":"série"
},
{
 "classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"SS de substituicao de trafo queimado em Caseara, com para-raios danificado; a OS traz a ficha completa dos dois equipamentos e o formulario tem serie e tombamento dos dois lados, comprovando a troca fisica (retirado 70245/014985, instalado 443048/120865). Confianca media apenas porque a busca na base de interrupcao voltou AUSENTE DA CRITICA, o que e falta de registro e nao prova de que a falha nao ocorreu; o termino em 02/09 tambem sugere que o registro possa ter caido fora da janela.",
 "evidencia":"Segue nota para substituicao de trafo queimado, TR 5700047149 10kVA 34,5KV / critica: AUSENTE DA CRITICA",
 "prova_de_troca":"série"
},
]

for o, v in zip(d[13:26], BLOCO_B):
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
print("total", len(out))
