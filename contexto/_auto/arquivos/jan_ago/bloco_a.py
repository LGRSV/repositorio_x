# -*- coding: utf-8 -*-
import json
b = [
{"ss":"ETO-RD-AR 01190/2026","trafo":5742281004,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"SS pede troca de trafo queimado; a OS registra retirado e instalado com serie, CITD e marca distintas (TRAEL 2020 sai, ITAM 2026 entra), e a critica casou pelo proprio trafo com causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA na mesma janela. Formulario aponta SOBRECARGA como provavel motivo, sem vazamento de oleo.",
 "evidencia":"texto_ss: 'para trocar trafo queimadoTrafo:5742281004 15KVA'; critica subcausa: 'QUEIMADO POR CAUSA NAO IDENTIFICADA'","prova_de_troca":"serie"},

{"ss":"ETO-RD-AG 00810/2026","trafo":5362570039,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"Solicitacao e OS descrevem o trafo queimado e a OS acrescenta ao texto copiado os dados completos de retirado (ABB serie 178438, CITD 143062) e instalado (serie 178761, CITD 151222), com medicao apos a troca. A critica casou pelo trafo, porem lancou a causa como MEIO AMBIENTE / ANIMAL NA REDE, o que explica a origem da queima mas nao desfaz a falha do equipamento; por isso a confianca nao e alta.",
 "evidencia":"texto_ss/texto_os: '5362570039 15kva queimado 19,9 acesso livre'; campo NS_RETIRADO 178438 / NS_INSTALADO 178761","prova_de_troca":"serie"},

{"ss":"ETO-RD-AR 01213/2026","trafo":5700308063,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Trafo de 112,5 kVA queimado na RDU de Bandeirantes, com troca registrada na OS (TRAEL 2011 retirado, ITAIPU 2026 instalado, series e CITD dos dois lados) e ocorrencia de interrupcao com causa TRANSFORMADOR / QUEIMADO afetando 79 clientes.",
 "evidencia":"texto_ss: 'Trafo 5700308063 112,5 KVa queimado, 19,9 Kv na RDU Bandeirantes'; critica obs: 'trafo queimado 5700308063, 112,5 kva ,34,5 Kv'","prova_de_troca":"serie"},

{"ss":"DOLP-RD-PA 00806/2026","trafo":5701225122,"classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"SS aberta por vazamento de oleo (defeito de execucao confirmado como VAZAMENTO DE OLEO). O texto da OS e copia literal da SS acrescida apenas da baixa de material e dos dados do atendimento, ou seja, nao existe relato proprio do executante - a ausencia de descricao nao autoriza concluir que nao houve troca. O formulario veio zerado ('00') e a critica ficou fora da janela (76,8 h), mas a propria ocorrencia de 10/08 registra 'abertura emergencial para substituicao do transformador com vazamento de oleo' citando esta SS, o que sustenta a execucao. Avaria do proprio equipamento, sem queima.",
 "evidencia":"texto_ss: 'substituicao de Trafo com vazamento de oleo Trafo 5701225122'; critica obs: 'abertura emergencial para substituicao do transformador com vazamento de oleo. Abertura de Solicitacao de Servico(DOLP-RD-PA 806/2026)'","prova_de_troca":"texto"},

{"ss":"ETO-RD-AR 01224/2026","trafo":5310153004,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Queima por descarga atmosferica: defeito da SS e da execucao coincidem, o formulario aponta DESCARGA ATMOSFERICA e para-raios substituido, a OS traz retirado (ROMAGNOLE, CITD 124858) e instalado (ABB, CITD 149652) e a critica casou pelo trafo com subcausa QUEIMADO POR DESCARGA ATMOSFERICA.",
 "evidencia":"critica subcausa: 'QUEIMADO POR DESCARGA ATMOSFERICA'; campo PROVAVEL_MOTIVO_DO_DEFEITO: 'DESCARGA ATMOSFERICA'","prova_de_troca":"serie"},

{"ss":"ETO-RD-GU 00794/2026","trafo":5700068003,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Embora tenha havido mudanca de potencia (112,5 kVA saiu, 150 kVA entrou), o motivo do servico foi a queima: a SS pede substituicao de trafo queimado, o formulario aponta SOBRECARGA e a critica casou pelo trafo com causa TRANSFORMADOR / SOBRECARGA. O aumento de potencia foi consequencia da troca, nao remanejamento programado.",
 "evidencia":"texto_os: 'FOI FEITO A TROCA DO TRANSFORMADOR 112,5KVA E INSTALACAO DO 150KVA'; critica: causa 'TRANSFORMADOR', subcausa 'SOBRECARGA'","prova_de_troca":"serie"},

{"ss":"ETO-RD-GU 00796/2026","trafo":5743503003,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"A SS e objetiva ('transformador queimado') e a critica casou pelo trafo com QUEIMADO POR CAUSA NAO IDENTIFICADA, registrando ainda que a chave do trafo foi operada e o teste nao aceitou - comportamento tipico de trafo em falha. A OS descreve apenas a troca 45 kVA -> 75 kVA 'autorizada pelo Dione', sem relatar a queima; o aumento de potencia junto com a autorizacao mantem alguma duvida sobre componente de melhoria, por isso confianca media.",
 "evidencia":"critica obs: 'CHAVE TRAFO OPERADA, FEITO TESTE N ACEITOU'; texto_ss: 'transformador queimado'","prova_de_troca":"serie"},

{"ss":"ETO-RD-AG 00831/2026","trafo":5700123039,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Trafo de 75 kVA queimado no povoado Macauba; a OS reproduz a SS e acrescenta os dados dos dois equipamentos (retirado TRAEL serie 371520 / CITD 019196, instalado serie 330032 / CITD 133463) com medicao apos a troca; a critica casou pelo trafo com QUEIMADO POR CAUSA NAO IDENTIFICADA, 49 clientes.",
 "evidencia":"critica obs: 'Intv Auto PPF TR-5700123039 queimado'","prova_de_troca":"serie"},

{"ss":"ENC-RD-PS 00688/2026","trafo":5700402031,"classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Falha do proprio equipamento por vazamento de oleo, confirmada em tres fontes independentes: texto da SS, formulario (vazamento 'Sim', motivo VAZAMENTO DE OLEO) e critica casada pelo trafo com subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO. A OS traz retirado (VIJAI serie 176593) e instalado (TRAEL serie 448669 / CITD 110107).",
 "evidencia":"campo EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: 'Sim'; critica subcausa: 'VAZAMENTO DE OLEO / TANQUE DETERIORADO'","prova_de_troca":"serie"},

{"ss":"ETO-RD-AG 00840/2026","trafo":5700042171,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Trafo queimado com para-raio queimado; a OS acrescenta ao texto copiado os dados de retirado (TRAEL serie 523103 / CITD 06122220) e instalado (ITAM serie C.306320 / CITD 152579) mais medicao, e a critica casou pelo trafo com QUEIMADO POR CURTO NA RD. O formulario marca vazamento 'Sim', mas o veredito predominante e queima do enrolamento.",
 "evidencia":"texto_ss: 'Trafo 5700042171 queimado ... Para Raio: queimado'; critica subcausa: 'QUEIMADO POR CURTO NA RD'","prova_de_troca":"serie"},

{"ss":"ENC-RD-PS 00694/2026","trafo":5701787007,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Emergencia com trafo queimado em assentamento de Miracema; a OS registra retirado (VIJAI serie 171818) e instalado (TRAEL serie 830207 / CITD 151852) e a critica casou pelo proprio trafo, na mesma intervencao citada na SS, com QUEIMADO POR CAUSA NAO IDENTIFICADA.",
 "evidencia":"texto_ss: 'TR 5701787007 15KVA/19.9KV queimado'; critica ocorrencia 20264772813019 igual a INT citada na SS","prova_de_troca":"serie"},

{"ss":"ETO-RD-AR 01251/2026","trafo":5719177025,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"Substituicao de transformador queimado em Arapoema; a OS traz retirado (TRAEL serie 337694 / CITD 06015164) e instalado (ITAM serie C303299 / CITD 150919), e a critica casou pelo trafo com QUEIMADO POR DESCARGA ATMOSFERICA.",
 "evidencia":"critica obs: 'TRAFO QUEIMADO ATENDIDO POR OS 451'","prova_de_troca":"serie"},

{"ss":"DOLP-RD-PA 00850/2026","trafo":5705138122,"classificacao":"QUEIMADO","conta_no_indicador":True,"confianca":"alta",
 "justificativa":"O texto da OS e copia da SS mais os dados da equipe, sem relato proprio, mas o formulario traz serie do retirado (178203) e do instalado (830334) com tombamento do instalado 151979, o que comprova troca fisica. A critica casou pelo trafo com QUEIMADO POR DESCARGA ATMOSFERICA e a observacao da ocorrencia registra a troca.",
 "evidencia":"critica obs: 'trafo queimado aberto nota obs, foi trocado o trafo pela equipe de manutencao'","prova_de_troca":"serie"},

{"ss":"ETO-RD-GU 00809/2026","trafo":5710709032,"classificacao":"AVARIADO","conta_no_indicador":True,"confianca":"media",
 "justificativa":"Falha do proprio equipamento por bucha secundaria danificada - defeito da SS, defeito de execucao e formulario coincidem em BUCHA DANIFICADA, o que caracteriza avaria e nao queima de enrolamento. A OS confirma a substituicao (15 kVA por 15 kVA) e o formulario traz serie dos dois lados (389613 retirado / 822940 instalado). A critica, porem, classificou a ocorrencia como QUEIMADO POR CAUSA NAO IDENTIFICADA, divergencia que mantem a confianca em media; em qualquer das duas leituras o caso conta no indicador.",
 "evidencia":"texto_ss: 'trafo 5710709032 com bucha secundaria danificada'; campo PROVAVEL_MOTIVO_DO_DEFEITO: 'BUCHA DANIFICADA'","prova_de_troca":"serie"},
]
json.dump(b, open('saida_ago_1.json','w'), ensure_ascii=False, indent=1)
print(len(b))
