# -*- coding: utf-8 -*-
import json
B2 = [
{"ss":"DOLP-RD-PA 00857/2026","trafo":"5702075001","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"SS de trafo queimado de 10 kVA com para-raio danificado; a interrupção casou pelo trafo e cobre todo o período até o término da OS. O texto da OS é cópia literal da SS mais os dados de atendimento, portanto não há relato do executante — isso impede afirmar que não houve troca, mas também deixa o caso sem descrição própria. Formulário zerado, sem série nem tombamento.",
 "evidencia":"texto_ss: 'segue nota de trafo queimado, trafo 5702075001, trafo de 10kva, tensao 13800 / 440 V, para raio danificado' | crítica: CASOU PELO TRAFO, ocorrência 20264792224538","prova_de_troca":"nenhuma"},

{"ss":"ETO-RD-GR 00814/2026","trafo":"5700666015","classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"A SS abriu como queimado, mas o executante classificou na OS como trafo avariado, o formulário aponta vazamento de óleo como provável motivo e a crítica casada traz subcausa vazamento de óleo / tanque deteriorado. Prevalece a conclusão da OS: falha do próprio equipamento por vazamento, sem queima de enrolamento. Potência mantida em 112,5 kVA, com série e CITD dos dois lados.",
 "evidencia":"texto_os: 'TROCA DE TRAFO AVARIADO 5700666015' | PROVÁVEL_MOTIVO_DO_DEFEITO: VAZAMENTO DE OLEO","prova_de_troca":"série"},

{"ss":"DOLP-RD-PA 00870/2026","trafo":"5741138092","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Trafo e para-raios queimados em Novo Acordo, com provável motivo lançado como descarga atmosférica e interrupção casada pelo trafo. Embora a OS repita o texto da SS, o formulário traz série e tombamento de retirado (TRAEL 2020, 533175) e instalado (830213 / 151858), o que comprova a troca física.",
 "evidencia":"texto_ss: 'TR-5741138092 Queimado para raios queimado potência 15kva' | PROVÁVEL_MOTIVO_DO_DEFEITO: DESCARGA ATMOSFERICA","prova_de_troca":"série"},

{"ss":"ENC-RD-PS 00713/2026","trafo":"5710120055","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"A SS é telegráfica, mas a origem é queimado e a observação da ocorrência casada diz expressamente que o trafo estava queimado, com subcausa queimado por causa não identificada. A OS traz o quadro de retirado (30 kVA, série 1232340) e instalado (45 kVA, série 1635873). A diferença de potência acompanha a emergência e não há qualquer descrição de remanejamento.",
 "evidencia":"crítica obs: 'trafo 5710120055 queimado nota aberta ENC-RD-PS 713/2026' | crítica subcausa: 'QUEIMADO POR CAUSA NAO IDENTIFICADA'","prova_de_troca":"série"},

{"ss":"DG-RD-PO 00514/2026","trafo":"5728502026","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"SS constata trafo e para-raios queimados e a OS conclui substituição de trafo queimado, com série e tombamento dos dois lados. Confiança média porque o formulário marca vazamento de óleo e a ocorrência casada tem subcausa vazamento de óleo / tanque deteriorado — evidência que puxaria para avariado. Qualquer dos dois vereditos conta no indicador.",
 "evidencia":"texto_ss: 'Constatado trafo 5728502026 de 15kVA na 19.9kV e para-raios queimados.' | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim","prova_de_troca":"série"},

{"ss":"ENC-RD-PS 00720/2026","trafo":"5700558086","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS pede substituição de trafo queimado na rural de Marianópolis e a observação da ocorrência casada confirma o trafo queimado, com subcausa sobretensão. A OS traz retirado (5 kVA, ITB, série 691030) e instalado (15 kVA, série 316882, reformado). O ajuste de potência é consequência do estoque de emergência, não há relato de remanejamento.",
 "evidencia":"crítica obs: 'trafo 5700558086 queimado' | crítica subcausa: 'SOBRETENSAO'","prova_de_troca":"série"},

{"ss":"ENC-RD-PS 00730/2026","trafo":"5700056149","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A observação da ocorrência casada afirma que o trafo estava queimado e a subcausa é queimado por causa não identificada; a OS traz retirado e instalado com série e CITD. Confiança média porque a potência saltou de 45 para 150 kVA num equipamento de abril de 2025 e nenhum texto explica o salto — poderia haver componente de melhoria de posto embutida na emergência, mas nada no relato descreve remanejamento.",
 "evidencia":"crítica obs: 'trafo 5700056149 queimado' | OS: 'TRAFO RETIRADO POTÊNCIA : 45KVA ... TRAFO INSTALADO POTÊNCIA : 150KVA'","prova_de_troca":"série"},

{"ss":"ETO-RD-GR 00844/2026","trafo":"5701018078","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A OS do executante intitula troca de trafo queimado e traz retirado (5 kVA, ITB 2011) e instalado (15 kVA, reformado) com séries e medições. Confiança média porque o formulário registra vazamento de óleo como provável motivo e a crítica casou com subcausa vazamento de óleo / tanque deteriorado, o que admitiria classificar como avariado — em ambos os casos conta no indicador.",
 "evidencia":"texto_os: 'TROCA DE TRAFO QUEIMADO 5701018078' | PROVÁVEL_MOTIVO_DO_DEFEITO: VAZAMENTO DE OLEO","prova_de_troca":"série"},

{"ss":"DG-RD-PO 00525/2026","trafo":"5720239035","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de trafo queimado no P.A. São Francisco de Assis com para-raios queimados, OS concluindo substituição de trafo queimado e observação da ocorrência casada confirmando a constatação em campo, inclusive com muito vazamento de óleo. Potência mantida em 30 kVA e formulário com série e tombamento dos dois lados.",
 "evidencia":"crítica obs: 'CONSTATADO TRAFO QUEIMADO PELA EQUIPE 059OP16. FOI ABERTO NOTA PARA SUBSTITUIÇÃO DO MESMO. TRAFO COM MUITO VAZAMENTO DE ÓLEO.'","prova_de_troca":"série"},

{"ss":"DOLP-RD-PA 00910/2026","trafo":"5703033122","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"Nota de trafo queimado com interrupção casada classificada como transformador queimado por causa não identificada. A OS é cópia literal da SS mais os dados de atendimento, sem relato próprio do executante, e o formulário está zerado. Confiança média também pela divergência de numeração apontada em campo (5766744059 x 5703033122), que precisa de conferência cadastral para o caso não ser contado no trafo errado.",
 "evidencia":"texto_ss: 'Segue nota de trafo queimado, em campo a equipe 059op20 fala que a numeração correto do trafo é 5766744059, porem no mapa é o 5703033122' | crítica subcausa: 'QUEIMADO POR CAUSA NAO IDENTIFICADA'","prova_de_troca":"nenhuma"},

{"ss":"ETO-RD-DP 00529/2026","trafo":"5701503038","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de trafo de 5 kVA queimado na rural de Taguatinga; a OS confirma a execução pela empreiteira e o formulário traz série de retirado (202655, VIJAI 2011) e instalado (304467 / CITD 149648). A crítica casou pelo trafo com subcausa queimado por sobrecarga, consistente com o defeito de execução lançado.",
 "evidencia":"crítica subcausa: 'QUEIMADO POR SOBRECARGA' | texto_os: 'substituido pela tavares'","prova_de_troca":"série"},

{"ss":"DOLP-RD-PA 00914/2026","trafo":"5700108122","classificacao":"INCONCLUSIVO","conta_no_indicador":False,"confianca":"baixa",
 "justificativa":"O pedido é expressamente de substituição de poste, e a medição de fase baixa na saída da bucha (169 V contra 219 e 216) foi anotada como observação; o sistema registrou origem avariado e defeito de bucha danificada, mas a ocorrência casada é de ventos fortes (meio ambiente), coerente com problema de poste/rede. A OS é cópia literal da SS mais os dados de atendimento, ou seja, não há relato do executante, e o formulário está todo zerado, sem série nem tombamento. Sem elemento que separe avaria interna do transformador de problema de poste, não dá para afirmar nem que houve avaria contável nem que o trafo foi trocado.",
 "evidencia":"texto_ss: 'SEGUE SS PARA SUBSTITUIÇÃO DE POSTE. EQUIPE ESTEVE NO LOCAL E FEZ TODAS AS AS VERIFICAÇÕES, TRAFO ESTA COM FASE BAIXA NA SAÍDA DA BUCHA NA FASE C. FASE A 219 FASE B 216 E FASE C 169.' | crítica subcausa: 'VENTOS FORTES'","prova_de_troca":"nenhuma"},

{"ss":"ETO-RD-GU 00853/2026","trafo":"5700020047","classificacao":"MELHORIA DE POSTO","conta_no_indicador":False,"confianca":"média",
 "justificativa":"A SS abriu como trafo queimado, mas o relato da ocorrência casada mostra que o que queimou foi o elo (5H trocado por 8H) por sobrecarga, penalizando 179 clientes, e a OS do executante não fala em queima do transformador: descreve a troca de 112,5 por 150 kVA como substituição autorizada pela gestão. O conjunto descreve adequação de potência de um posto sobrecarregado, não falha do equipamento. Houve troca física (séries 9685850 retirado e 1697622 instalado), mas ela não conta no indicador. Confiança média pela divergência entre a abertura da SS e a conclusão da OS.",
 "evidencia":"crítica obs: 'Queima de elo no TR 5700020047 Fase ABC Elo Retirado 5H Elo Instalado 8H ... Causa Sobrecarga' | texto_os: 'OBS:SUBSTITUIÇÃO DE TRANSFORMADOR AUTORIZADA PELO DIONE.'","prova_de_troca":"série"},
]
saida = json.load(open('saida_ago_2.json'))
saida.extend(B2)
json.dump(saida, open('saida_ago_2.json','w'), ensure_ascii=False, indent=1)
print('total gravado:', len(saida))
