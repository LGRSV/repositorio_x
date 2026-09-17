# -*- coding: utf-8 -*-
import json
B1 = [
{"ss":"DG-RD-PO 00484/2026","trafo":"5720245035","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS e OS convergem: trafo queimado em Monte do Carmo, atendimento emergencial. O formulário traz série e tombamento de retirado e instalado, confirmando troca física. A crítica casou pelo trafo com ocorrência no mesmo dia e a observação do despacho registra teste recusado e trafo queimado (a causa lançada como ventos fortes é da ocorrência, não descaracteriza a queima).",
 "evidencia":"texto_os: 'medido_ emergencial_ substituição de trafo queimado rdr monte do carmo' | crítica obs: 'O MESMO FOI FEITO O TESTE E NAO ACEITO TRAFO QUEIMADO'","prova_de_troca":"série"},

{"ss":"ETO-RD-AR 01201/2026","trafo":"5700408058","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A SS descreve trafo queimado com defeito interno em unidade nova e a observação da interrupção casada diz literalmente 'TRAFO QUEIMADO'. A OS não narra o motivo, mas registra retirado e instalado com série e CITD distintos, provando a troca. Confiança média porque origem_ss veio como AVARIADO e a subcausa da ocorrência é falha de bucha de AT — de todo modo, queimado e avariado contam igual no indicador.",
 "evidencia":"texto_ss: 'TR 7900408058 QUEIMADO NA RDU DE SANTA FE...TRAFO NOVO DEFEITO INTERNO' | crítica obs: 'TRAFO QUEIMADO.'","prova_de_troca":"série"},

{"ss":"DG-RD-PO 00490/2026","trafo":"5710272035","classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"Falha do próprio equipamento sem confirmação de queima de enrolamento: muito vazamento de óleo e tanque trincado, com o formulário marcando vazamento e a crítica classificando a ocorrência como vazamento de óleo / tanque deteriorado. A OS confirma que a equipe foi ao local e o trafo não funcionou. Confiança média porque a SS também cita marca de curto na carcaça, o que admitiria leitura de queima.",
 "evidencia":"texto_ss: 'TR 5710272035 15KVA COM MUITO VAZAMENTO DE OLEO E MARCA DE CURTO NA CARCARÇA , EQUPE INFORMOU QUE MESMO ESTA COM TRINCA' | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim","prova_de_troca":"série"},

{"ss":"ETO-RD-DP 00492/2026","trafo":"5700439074","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS aponta trafo queimado sem sair tensão na bucha secundária; a OS confirma a troca efetiva pela empreiteira, com retirado e instalado. A crítica casou pelo trafo e classificou a ocorrência como queimado por causa não identificada. Formulário com série e tombamento dos dois lados.",
 "evidencia":"texto_os: 'TRANFORMADOR SUBSTITUIDO PELA TAVARES, 15KVA/19,9KV MINERAL, RETIRADO E INSTALADO' | crítica subcausa: 'QUEIMADO POR CAUSA NAO IDENTIFICADA'","prova_de_troca":"série"},

{"ss":"DOLP-RD-PA 00808/2026","trafo":"5712246001","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A SS relata trafo e para-raios queimados e a interrupção casada é exatamente a INT citada na SS, classificada como transformador queimado por causa não identificada. O texto da OS é cópia literal da SS acrescida dos dados de atendimento, ou seja, não existe relato próprio do executante — a ausência de narrativa não permite concluir que não houve troca; a OS registra baixa para consumo de material e a SS está atendida. Formulário zerado (00) nos dois lados, por isso a troca não tem comprovação documental.",
 "evidencia":"texto_ss: 'Segue SS de TR 5712246001 15KVA/19.9KV e para-raios queimados.' | crítica subcausa: 'QUEIMADO POR CAUSA NAO IDENTIFICADA' (ocorrência 20264747494174, a mesma citada na SS)","prova_de_troca":"nenhuma"},

{"ss":"ETO-RD-AR 01225/2026","trafo":"5720186077","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de transformador e para-raio queimados em Goiatins e OS do executante com o quadro completo de retirado (ITB, série 978259, 2015) e instalado (ITAM, série C303245, 2026), o que prova a troca física. O defeito de execução foi lançado como sobrecarga, causa de queima. Trafo ausente da crítica, o que é apenas falta de registro de interrupção e não desmente a falha.",
 "evidencia":"texto_ss: 'TRANSFORMADOR QUEIMADO, PARA RAIO QUEIMADO.' | defeito_execucao: SOBRECARGA","prova_de_troca":"série"},

{"ss":"ETO-RD-GR 00792/2026","trafo":"5710514087","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"A OS do executante intitula troca de trafo queimado e a crítica casou pelo trafo com subcausa queimado por descarga atmosférica, com observação dizendo que o equipamento estava queimado e vazando óleo. O aumento de 112,5 para 150 kVA acompanhou a emergência, não é remanejamento: nenhum texto descreve mudança de posto ou adequação programada.",
 "evidencia":"texto_os: 'TROCA DE TRAFO QUEIMADO 5710514087' | crítica obs: 'Trafo 5710514087 queimado e vazando oleo'","prova_de_troca":"série"},

{"ss":"DG-RD-PO 00497/2026","trafo":"5720924001","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Teste a vazio feito em campo e o equipamento não aceitou carga; SS e OS descrevem trafo de 112,5 kVA queimado na RDU de Porto Nacional. A crítica casou pelo trafo com subcausa queimado por causa não identificada e reproduz o mesmo relato. Séries de retirado e instalado distintas no formulário.",
 "evidencia":"texto_ss: 'feito teste avazio as 02:01 o mesmo nao aceitou trafo de 112,5 queimado' | crítica subcausa: 'QUEIMADO POR CAUSA NAO IDENTIFICADA'","prova_de_troca":"série"},

{"ss":"ETO-RD-AG 00839/2026","trafo":"5700003109","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"SS de trafo queimado e OS com o quadro completo de retirado (TRAEL 2010, série 175606) e instalado (ROMAGNOLE 2025, série 1613781), além das medições pós-instalação — troca física comprovada. Confiança média porque a interrupção casada foi classificada como árvore na rede (meio ambiente), o que atribui a causa a agente externo mas não afasta a queima do equipamento relatada na SS e no defeito de bucha danificada.",
 "evidencia":"texto_ss: 'Trafo 5700003109 queimado Potencia: 150 KVA' | crítica subcausa: 'ARVORE DE PEQUENO/ MEDIO PORTE NA REDE / NA FAIXA'","prova_de_troca":"série"},

{"ss":"ETO-RD-AR 01249/2026","trafo":"5729034004","classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Falha do próprio equipamento sem queima: vazamento de óleo, confirmado pelo formulário e pela subcausa da ocorrência (vazamento de óleo / tanque deteriorado). A OS traz retirado e instalado com série e CITD, provando a troca. A ocorrência ficou fora da janela por pouco (26,7 h), o que é limitação de janela, não prova contrária.",
 "evidencia":"texto_ss: 'SEGUE SS DE TRAFO 5729034004 COM VAZAMENTO DE OLEO' | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim","prova_de_troca":"série"},

{"ss":"DOLP-RD-PA 00840/2026","trafo":"5729529271","classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Bucha secundária danificada por ponto quente — falha do próprio equipamento sem queima de enrolamento, o que caracteriza avaria. Origem e defeito registrados como avariado / bucha danificada, crítica casada com subcausa falha de bucha de BT, e formulário com série e tombamento de retirado e instalado.",
 "evidencia":"crítica obs: 'Bucha secundaria danificada devido ponto quente equipe 271op04 e 271op01' | crítica subcausa: 'FALHA BUCHA DE BT'","prova_de_troca":"série"},

{"ss":"ETO-RD-DP 00501/2026","trafo":"5700577150","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"A SS constata o trafo de 75 kVA queimado com barramento danificado, penalizando 21 clientes, e a OS confirma que a empreiteira retirou o de 75 kVA e instalou um de 150 kVA. A mudança de potência veio junto com a emergência e nenhum texto descreve remanejamento ou melhoria programada. Confiança média porque o executante não repete o motivo e a ocorrência casada está fora da janela (43,8 h) e é de conexão/jumper, não do trafo.",
 "evidencia":"texto_ss: 'FOI CONSTATADO TRAFO 5700577150 75KVA EM CAMPO, 34,5KV QUEIMADO E BARRAMENTO DANIFICDO' | texto_os: 'atendida pela wc trafo de 150kva da 34,9kv oleo vegetal, retirado um de 75 kva mineral'","prova_de_troca":"série"},

{"ss":"DG-RD-PO 00501/2026","trafo":"5720755001","classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"média",
 "justificativa":"SS constata o trafo queimado com chave fusível danificada e a OS do executante conclui substituição de trafo queimado; formulário com série e tombamento dos dois lados. Confiança média porque a observação da ocorrência casada atribui o evento a porta-fusível danificado por árvore sobre a rede, sem mencionar queima do transformador.",
 "evidencia":"texto_ss: 'Constatado trafo 5720755001 de 25kVA na 19.9kV queimado e chave fusível danificada.' | crítica obs: 'Constatado trafo 5720755001 com porta fusível danificado e aberto, causa árvore sobre a rede'","prova_de_troca":"série"},
]
json.dump(B1, open('saida_ago_2.json','w'), ensure_ascii=False, indent=1)
print('bloco A gravado:', len(B1))
