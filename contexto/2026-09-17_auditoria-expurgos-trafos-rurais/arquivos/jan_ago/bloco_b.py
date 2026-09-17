# -*- coding: utf-8 -*-
import json
a = json.load(open('saida_ago_1.json'))
b = [
{"ss":"DOLP-RD-PA 00858/2026","trafo":5735803122,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"A SS pede substituicao de trafo de 15 kVA e para-raio queimados e a critica casou pelo trafo com QUEIMADO POR DESCARGA ATMOSFERICA na janela do evento. O texto da OS e copia literal da SS, acrescido apenas da baixa de material e dos dados do atendimento - nao ha relato do executante, e o formulario veio zerado ('00'), o que impede prova por serie mas nao permite concluir que a troca nao ocorreu. O campo defeito registra VAZAMENTO DE OLEO, divergindo do texto e da critica, que apontam queima.",
 "evidencia":"texto_ss: '01 trafo de 15 kvar e 01 para raio da rede de 34,500kv queimado para ser subistituido'; critica subcausa: 'QUEIMADO POR DESCARGA ATMOSFERICA'","prova_de_troca":"texto"},

{"ss":"DOLP-RD-PA 00869/2026","trafo":5727563083,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"Trafo de 15 kVA queimado com para-raios queimados em Aparecida do Rio Negro. O texto da OS repete a SS e so acrescenta baixa de material e equipe; o formulario veio com zeros. A critica casou pelo trafo, mas registrou a subcausa como VAZAMENTO DE OLEO / TANQUE DETERIORADO, divergindo do 'queimado' do texto - mantive a leitura do solicitante, e nas duas hipoteses o caso conta no indicador. Confianca media pela divergencia e pela falta de relato proprio do executante.",
 "evidencia":"texto_ss: 'TR-5727563083 Queimado para raios queimado potencia 15kva'; critica subcausa: 'VAZAMENTO DE OLEO / TANQUE DETERIORADO'","prova_de_troca":"texto"},

{"ss":"ETO-RD-AR 01274/2026","trafo":5300693019,"classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"Avaria do proprio equipamento por vazamento de oleo: defeito da SS e da execucao coincidem e o formulario marca vazamento 'Sim'. A OS comprova troca fisica, com retirado (ITAM CITD 150982, serie C303362) e instalado (TRAEL CITD 130638, serie 606679, 25 kVA). Pesa contra a confianca a inconsistencia de identificacao - a OS chama o equipamento de 5700693019 enquanto a SS traz 5300693019, o formulario informa serie de retirado (C 87207) e tombamento (148070) diferentes dos da OS - e a ausencia de ocorrencia na base de interrupcao, que e falta de registro e nao prova de que a falha nao existiu. A OS ainda anota necessidade de nova substituicao.",
 "evidencia":"texto_ss: 'Trafo: 5300693019 vazamento de oleo'; texto_os: '90070 NECESSARIO FAZER A SUBST. DO TRAFO NOVAMENTE'","prova_de_troca":"serie"},

{"ss":"ETO-RD-AR 01281/2026","trafo":5744122136,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Transformador queimado em Pau d'Arco, com troca comprovada na OS (retirado TRAEL serie 573131 / CITD 127885; instalado POTENCIAL serie 1024644 / CITD 151263) e melhoria de aterramento como servico acessorio. A critica casou pelo trafo com QUEIMADO POR DESCARGA ATMOSFERICA. O 'cola e fita' marcado no formulario nao descaracteriza a troca, ja que as series dos dois lados estao preenchidas.",
 "evidencia":"critica obs: 'TR 5744122136 QUEIMADO. FASE AN, ELO 1H, Penalizando cargas da RDR de PAU D ARCO'","prova_de_troca":"serie"},

{"ss":"DOLP-RD-PA 00888/2026","trafo":5750729059,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"Trafo de 112,5 kVA queimado em Palmas com 83 clientes penalizados. O texto da OS e copia literal da SS mais a baixa de material e os dados do atendimento, sem relato do executante, e o formulario veio zerado; o caso esta ausente da critica, o que e falta de registro de interrupcao e nao evidencia de que a falha nao ocorreu. A SS foi atendida no mesmo dia por equipe de manutencao com consumo de material.",
 "evidencia":"texto_ss: '01 trafo de 112,500kva da rede de 13.800kv queimado para ser subistituido pela equipe de manutencao'; critica resultado: 'AUSENTE DA CRITICA'","prova_de_troca":"texto"},

{"ss":"ETO-RD-GR 00833/2026","trafo":5700496227,"classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"O proprio executante intitulou o servico como troca de trafo avariado por vazamento de oleo, com retirado (VIJAI serie 175493, 2010) e instalado (ITAM serie C 306341 / CITD 152600), medicoes e coordenadas. Formulario com vazamento 'Sim' e critica casada pelo trafo com VAZAMENTO DE OLEO / TANQUE DETERIORADO.",
 "evidencia":"texto_os: 'TROCA DE TRAFO AVARIADO 5700496227 ETO-RD-GR 833/2026'","prova_de_troca":"serie"},

{"ss":"ETO-RD-GU 00829/2026","trafo":5700025047,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"A SS pede substituicao de trafo queimado de 75 kVA e a critica casou pelo trafo com QUEIMADO POR SOBRECARGA, 111 clientes, citando a propria SS na observacao. A OS confirma a troca (75 kVA retirado, 150 kVA instalado) com serie dos dois lados. Confianca media por incoerencias formais: o cabecalho da OS cita a RDR de Aracacu enquanto a localidade e Figueiropolis, e o termino (24/08) e anterior a abertura (25/08).",
 "evidencia":"critica obs: 'trafo 5700025047 queimado , trafo 75kva tensao 13,8kv para raio bom acesso livre ,aberto nota (ETO-RD-GU 829/2026)'","prova_de_troca":"serie"},

{"ss":"ETO-RD-PS 00369/2026","trafo":5700067013,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Trafo de 75 kVA e para-raio queimados em Paraiso; a substituicao por 112,5 kVA foi consequencia da queima por sobrecarga, nao remanejamento programado. A OS traz retirado (TRAEL serie 20036 / CITD 135337, 2001) e instalado (ITAIPU serie 616701 / CITD 152708), e a critica casou pelo trafo com QUEIMADO POR SOBRECARGA, 106 clientes.",
 "evidencia":"texto_ss: '5700067013 75kva e para raio queimado tensao 13,8'; critica subcausa: 'QUEIMADO POR SOBRECARGA'","prova_de_troca":"serie"},

{"ss":"ETO-RD-DP 00528/2026","trafo":5746834038,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS de substituicao de trafo queimado e OS que confirma a execucao por terceirizada; o formulario traz serie e tombamento dos dois lados (retirado 1454422 / 135202; instalado 396833 / 133533), e a critica casou pelo trafo com QUEIMADO POR CAUSA NAO IDENTIFICADA.",
 "evidencia":"texto_os: 'trafo de 150 kva substituido pela tavares'; campo NS_RETIRADO 1454422 / NS_INSTALADO 396833","prova_de_troca":"serie"},

{"ss":"DOLP-RD-PA 00912/2026","trafo":5700186070,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"O relato descreve falha destrutiva do equipamento - buchas pegaram fogo no teste e houve vazamento de oleo - e a critica casou pelo trafo com QUEIMADO POR SOBRECARGA, 236 clientes, registrando na observacao que a equipe levaria trafo de 75 kVA. Classifico como queimado por causa do incendio nas buchas, embora tambem haja vazamento. O texto da OS repete a SS acrescido da baixa de material e da equipe, e o formulario veio zerado, o que impede prova por serie.",
 "evidencia":"texto_ss: 'alem das buxa pegou fogo na hora do teste vazou oleo TR-112,5KVA'; critica obs: 'leva trafo de 75kva'","prova_de_troca":"texto"},

{"ss":"ETO-RD-AG 00925/2026","trafo":5700002210,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"Trafo de 25 kVA queimado em Tocantinopolis, com troca comprovada na OS (retirado TRAEL serie 18930 / CITD 144811; instalado ITAM serie Z.303179 / CITD 151059) e medicoes apos a troca. A critica casou pelo trafo, mas lancou a causa como MEIO AMBIENTE / ARVORE NA REDE - vegetacao explica a origem do curto, sem afastar a queima do equipamento; dai a confianca media.",
 "evidencia":"texto_ss: 'Trafo: 5700002210 Queimado Potencia: 25 KVA'; critica causa: 'MEIO AMBIENTE'","prova_de_troca":"serie"},

{"ss":"ETO-RD-GU 00852/2026","trafo":5700002260,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"SS de trafo queimado de 75 kVA em Sao Valerio, com OS confirmando a substituicao 75 por 75 kVA e formulario com serie e tombamento dos dois lados (544485 / 142183 retirado; 600388 / 153739 instalado). A critica casou pelo trafo mas registrou VAZAMENTO DE OLEO / TANQUE DETERIORADO, divergindo do texto; mantive queimado pelo que foi solicitado e executado, e nas duas hipoteses o caso conta no indicador.",
 "evidencia":"texto_ss: 'substuicao de trafo queimado 75kv tesao 34,5 kv'; critica subcausa: 'VAZAMENTO DE OLEO / TANQUE DETERIORADO'","prova_de_troca":"serie"},

{"ss":"DOLP-RD-PA 00925/2026","trafo":5711775122,"classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"Avaria do proprio equipamento por vazamento intenso de oleo, com defeito da SS e da execucao coincidentes. O texto da OS e copia literal da SS mais a baixa de material e os dados do atendimento, sem relato do executante, e o formulario veio zerado ('00'); o caso esta ausente da critica, o que e falta de registro de interrupcao e nao prova de que a avaria nao existiu. Servico concluido em 01/09 pela equipe DLP-MLPA01.",
 "evidencia":"texto_ss: 'Transformador 5711775122 muito vazamento de oleo, potencia 25kva'; critica resultado: 'AUSENTE DA CRITICA'","prova_de_troca":"texto"},
]
out = a + b
assert len(out) == 27, len(out)
src = json.load(open('ago_1.json'))
for o,s in zip(out,src):
    assert o['ss']==s['ss'] and o['trafo']==s['trafo'], (o['ss'],s['ss'])
    assert set(o)=={"ss","trafo","classificacao","conta_no_indicador","confianca","justificativa","evidencia","prova_de_troca"}
json.dump(out, open('saida_ago_1.json','w'), ensure_ascii=False, indent=1)
from collections import Counter
print(Counter(o['classificacao'] for o in out))
print('contam:', sum(1 for o in out if o['conta_no_indicador']))
print(Counter(o['confianca'] for o in out))
print(Counter(o['prova_de_troca'] for o in out))
