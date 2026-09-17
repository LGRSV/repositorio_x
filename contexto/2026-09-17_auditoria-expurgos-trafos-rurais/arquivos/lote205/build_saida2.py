# -*- coding: utf-8 -*-
import json, os

SRC = 'lote_2.json'
OUT = 'saida_2.json'
base = json.load(open(SRC, encoding='utf-8'))

# (idx, classificacao, decisao, confianca, justificativa, evidencia, diverge)
R = [
(0,"AVARIADO","MANTER","media",
 "SS aberta por vazamento de oleo no proprio trafo e a OS registra troca fisica com serie/tombamento dos dois lados (373459 -> 431837); falha do equipamento.",
 "Segue SS para recupera vazamento de oleo no trafo 570002132 ... TRAFO RETIRADO Nº SÉRIE; 373459 / TRAFO INSTALADO Nº SÉRIE; 431837",False),

(1,"AVARIADO","MANTER","alta",
 "OS declara substituicao do trafo por vazamento de oleo, campo confirma vazamento e a observacao da interrupcao cita a propria SS.",
 "SUBSTITUIDO UM TRAFO 5700761155 ... ABERTURA EMERGENCIAL PARA MANUTENÇÃO TROCAR TRAFO COM VAZAMENTO DE ÓLEO EM CAMPO SS: ETO-RD-GR 39/2026",False),

(2,"PREVENTIVO/PROGRAMADO","EXPURGAR","media",
 "A OS executa plano de medida com aumento de potencia (75 -> 112,5 kVA); a decisao foi de capacidade, nao atendimento de falha, como ja classificou o dono e a esteira.",
 "PLANO DE MEDIDA - Realizar substituição do trafo 5701235130 de 75 kVA para 112,5 kVA.",False),

(3,"QUEIMADO","MANTER","alta",
 "SS de trafo queimado, troca executada e a Critica casa pelo proprio trafo com causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA.",
 "SEGUE SS PARA SUBSTITUIR TRAFO QUEIMADO COM VASAMENTO DE OLÉO NA BUCHA SECUNDARIA | causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA",False),

(4,"QUEIMADO","MANTER","alta",
 "Trafo queimado com troca registrada na OS e interrupcao casada no proprio trafo por queima; observacao do executante confirma em campo.",
 "trafo 5710344042 queamado ... obs: trafo queimado em campo de 10 kva tensão 19.9 kv",False),

(5,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS do tipo MELHORIA POSTO DE TRANSFORMACAO com relatorio/book de melhoria; a troca 10->15 kVA faz parte da melhoria e a interrupcao esta fora da janela (90h).",
 "--MELHORIA EM POSTO DE TRANSFORMAÇÃOPREENCHER RELATÓRIO E BOOK PARA MELHORIAS EM POSTO DE TRANSFORMAÇÃO QUE ESTA EM ANEXO.",False),

(6,"QUEIMADO","MANTER","alta",
 "Substituicao de trafo com interrupcao casada no proprio trafo por queima por descarga atmosferica.",
 "SUBSTITUIÇÃO DE TRANSFORMADOR NA RDR DE ARAGUAÇU ... causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA",False),

(7,"AVARIADO","MANTER","alta",
 "Bucha primaria danificada confirmada no campo e na Critica (FALHA BUCHA DE AT), com troca executada; e falha do proprio equipamento.",
 "SEGUE SS PARA SUBSTITUIR TRAFO 5700516005 DANIFICADO BUCHA PRIMARIA ... subcausa FALHA BUCHA DE AT | obs TRAFO QUEIMADO",False),

(8,"QUEIMADO","MANTER","alta",
 "Trafo queimado com interrupcao casada no proprio trafo por sobrecarga e troca comprovada no material.",
 "Trafo 5700165096 queimado, 15 Kva, 19,9 Kv , acesso para camionete | subcausa QUEIMADO POR SOBRECARGA",False),

(9,"AVARIADO","MANTER","media",
 "Texto da SS/OS e a Critica apontam vazamento de oleo/tanque deteriorado no proprio trafo, com serie e tombamento trocados; o campo marca ABALROADO como provavel motivo, unico indicio contrario.",
 "trafo 5729815096 com vazamento esta fechado porem muito vazamento | subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO",False),
]

R += [
(10,"AVARIADO","MANTER","alta",
 "SS por vazamento de oleo no trafo, campo confirma vazamento como provavel motivo e a troca esta registrada com serie e tombamento dos dois lados.",
 "trafo 5711948122 com VAZ. DE OLEO na RDR de taquarussu | PROVÁVEL_MOTIVO_DO_DEFEITO: VAZAMENTO DE OLEO | NS_RETIRADO 634112 / NS_INSTALADO 250610",False),

(11,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS do tipo MELHORIA POSTO DE TRANSFORMACAO por aterramento, troca 15->15 kVA sem defeito declarado e interrupcao fora da janela (41h).",
 "Melhoria de aterramento 5763353155",False),

(12,"QUEIMADO","MANTER","media",
 "O texto do executante fala em substituicao de TR queimado e a Critica casa pelo proprio trafo com FALHA BUCHA DE AT; o rotulo ABALROADO aparece so no campo defeito da SS, sem qualquer relato de batida.",
 "Segue SS para substituiçao de TR  queimado | causa TRANSFORMADOR / subcausa FALHA BUCHA DE AT",False),

(13,"AVARIADO","MANTER","media",
 "Bucha secundaria quebrada confirmada pelo campo e pela Critica (FALHA BUCHA DE BT) no proprio trafo; a OS nao traz dados de placa, mas o material do site registra 1 trafo.",
 "trafo com bucha secundaria quebrada 5700737111 - 10KVA - 34,5KV | subcausa FALHA BUCHA DE BT",False),

(14,"AVARIADO","MANTER","media",
 "Vazamento de oleo com trafo que nao aceitou fechamento e interrupcao casada no proprio trafo; falta texto de OS e formulario de campo, mas o material do site comprova 1 trafo trocado.",
 "TRAFO 5700023068 DE 10KVA NA 13.9KV ESTÁ COM FAZAMENTO DE ÓLEO E NÃO ACEITOU FECHAMENTO",False),

(15,"ABALROAMENTO","EXPURGAR","alta",
 "O servico e substituicao do poste da estrutura do trafo, o campo aponta ABALROADO e a Critica registra POSTE DE AT / ABALROADO: dano externo, nao falha do equipamento.",
 "substituir poste ID 47042587 10/300 estrutura do TR 5700191054 | PROVÁVEL_MOTIVO_DO_DEFEITO: ABALROADO | causa POSTE DE AT / ABALROADO",False),

(16,"QUEIMADO","MANTER","alta",
 "Trafo queimado com troca de placa registrada na OS e interrupcao casada no proprio trafo por descarga atmosferica.",
 "5701984039 queimado | TRAFO RETIRADO Nº SÉRIE; 696947 / TRAFO INSTALADO Nº SÉRIE; C.239265",False),

(17,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS do tipo MELHORIA POSTO DE TRANSFORMACAO para aterramento, sem defeito declarado, e a interrupcao esta fora da janela (70h).",
 "REALIZAR MELHORIA DE ATERRAMENTO",False),

(18,"TAPE/REGULARIZACAO DE TENSAO","EXPURGAR","alta",
 "Trafo trocado por tensao baixa com tape interno, que nao se ajusta em campo; a interrupcao mais proxima e de condutor de BT e esta fora da janela.",
 "TRAFO 5703857001 com tensão baixa. TAP Interno.",False),

(19,"MELHORIA DE POSTO","EXPURGAR","media",
 "SS do tipo MELHORIA POSTO DE TRANSFORMACAO por aterramento e a OS so registra a troca 10->15 kVA; a ressalva e a interrupcao casada por queima dois dias antes, que nao e o objeto desta SS.",
 "REALIZAR MELHORIA DE ATERRAMENTO | tipo_ss MELHORIA POSTO DE TRANSFORMAÇÃO",False),
]

R += [
(20,"AVARIADO","MANTER","alta",
 "Vazamento de oleo e para-raio queimado, com troca de placa registrada na OS e campo apontando vazamento como provavel motivo.",
 "trafo 5700849060 - 10KVA - 13,8Kv comvazamento de oleo para raio queimado | PROVÁVEL_MOTIVO_DO_DEFEITO: VAZAMENTO DE OLEO",False),

(21,"AVARIADO","MANTER","media",
 "O trafo foi trocado por vazamento de oleo, confirmado no campo e na placa dos dois equipamentos; o site expurgou apenas por fora_da_janela, que nao descaracteriza a avaria do proprio equipamento.",
 "TR-5701543077 vazando oleo para raios bom | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim | NS_RETIRADO 239355 / NS_INSTALADO 379977",True),

(22,"AVARIADO","MANTER","alta",
 "Vazamento de oleo constatado em trafo de 112,5 kVA, troca registrada com serie e tombamento, e abertura emergencial declarada para substituir o proprio trafo.",
 "Constatado trafo 5728386045 de 112,5kVA na 13.8kV com vazamento de óleo. | obs: Abertura paa manutenção substituir trafo 5728386045",False),

(23,"QUEIMADO","MANTER","alta",
 "Trafo e para-raio queimados, troca de placa registrada e interrupcao casada no proprio trafo por queima por descarga atmosferica.",
 "o trafo 5702090039 de 5kVA e para raio estão queimados | subcausa QUEIMADO POR DESCARGA ATMOSFERICA",False),

(24,"AVARIADO","MANTER","alta",
 "Vazamento de oleo de media proporcao no proprio trafo, com serie e tombamento trocados; a ocorrencia de ramal e apenas a ressalva do corte, nao o que falhou.",
 "Transformador 5705367059, com vazamento de oleo media proporção | NS_RETIRADO 209998 / NS_INSTALADO 1637878",False),

(25,"MELHORIA DE POSTO","EXPURGAR","media",
 "SS do tipo MELHORIA POSTO DE TRANSFORMACAO por aterramento; a queima do mesmo trafo aparece em outra SS (540/2026) e fora da janela (143h), entao o evento de falha, se contar, conta por aquela SS.",
 "Melhoria de aterramento 5714167004 | obs: Trafo: 5714167004 queimado (ETO-RD-AR 540/2026)",False),

(26,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria no posto de transformacao, troca 15->15 kVA sem defeito declarado e interrupcao fora da janela (92h).",
 "Realizar melhoria no trafo 5701415077",False),

(27,"MELHORIA DE POSTO","EXPURGAR","media",
 "SS do tipo MELHORIA POSTO DE TRANSFORMACAO, troca 15->15 kVA e campo com motivo NAO IDENTIFICADO; a ressalva e a interrupcao casada por sobrecarga anterior a SS.",
 "REALIZAR MELHORIA NO TRAFO 5712189077 | PROVÁVEL_MOTIVO_DO_DEFEITO: NÃO IDENTIFICADO",False),

(28,"QUEIMADO","MANTER","media",
 "A OS declara servico de substituicao de trafo queimado com bucha secundaria quebrada e a Critica casa no proprio trafo; o gatilho remanejamento do site vem de uma NOTA AC truncada, que precisa ser lida na integra.",
 "SERVIÇO EXECUTADO NO ATENDIMENTO DA SS ETO-RD-AG 0389/2026 DE SUBST DE TRAFO QUEIMADO. | obs: TRAFO COM BUCHA SECUNDÁRIA QUEBRADA.",True),

(29,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria de aterramento com troca 15->15 kVA e interrupcao fora da janela (18h); nao ha defeito declarado no equipamento.",
 "Melhoria de aterramento no trafo 5710142016",False),
]

R += [
(30,"AVARIADO","MANTER","alta",
 "Trafo de 75 kVA com vazamento de oleo pela bucha primaria, troca comprovada por serie/tombamento e Critica com subcausa de vazamento/tanque deteriorado no proprio trafo.",
 "substituir Trafo 5764387122 de 75kva com vazamento de óleo pela bucha primaria fase B | subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO",False),

(31,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria no posto de transformacao, troca 15->15 kVA e nenhuma interrupcao na base (AUSENTE): nao ha evento de falha.",
 "FAZER MELHORIA NO POSTO DE TRANFORMÇAO 5710235080. | resultado AUSENTE — nem trafo nem chave",False),

(32,"MELHORIA DE POSTO","EXPURGAR","media",
 "SS de melhoria no posto: a OS so registra trafo instalado de 25 kVA, sem retirado (S/N) e sem interrupcao na base; melhoria ou instalacao nova, em qualquer hipotese fora do indicador.",
 "FAZER MELHORIA NO POSTO DE TRANFORMAÇAO DO TRAFO 5701196040 | TRAFO INSTALADO POTÊNCIA : 25 KVA | NS_RETIRADO: S/N",False),

(33,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria no posto de transformacao com troca 5->15 kVA e interrupcao fora da janela (161h); nenhum defeito declarado no equipamento.",
 "FAZER MELHORIA NO POSTO DE TRANFORMAÇAO NO TRAFO 5700754016",False),

(34,"QUEIMADO","MANTER","alta",
 "SS explicita de troca de trafo queimado, com interrupcao casada no proprio trafo e substituicao registrada na OS.",
 "SEGUE SOLICITAÇÃO PARA TROCA DE TRAFO QUEIMADO NA RDR DE GURUPI | subcausa QUEIMADO POR CAUSA NAO IDENTIFICADA",False),

(35,"ABALROAMENTO","EXPURGAR","alta",
 "SS de substituicao de poste apos abalroamento que danificou tambem o trafo de 150 kVA; a Critica registra POSTE DE AT / ABALROADO.",
 "obs: Poste 11/400 abalroado, e Trafo 150 Kva danificado,  quadra 603 sul | causa POSTE DE AT / subcausa ABALROADO",False),

(36,"AVARIADO","MANTER","alta",
 "Trafo declarado avariado, troca comprovada por serie/tombamento e Critica casada no proprio trafo com FALHA BUCHA DE BT.",
 "Trafo 5710312122 avariado | causa TRANSFORMADOR / subcausa FALHA BUCHA DE BT | obs: Trafo avariado",False),

(37,"REMANEJAMENTO","EXPURGAR","alta",
 "SS e OS declaram remanejamento de potencia (25 -> 15 kVA), com abertura emergencial registrada para o remanejamento; nao houve falha do equipamento.",
 "Enviar equipe de manutenção para REMANEJAR trafo 5700269132 - de 25KVA-19.9KV POR TRAFO DE 15KVA-19.9KV",False),

(38,"SEM TROCA (nao substituido)","EXPURGAR","alta",
 "O executante afirma que o transformador nao foi trocado porque nao estava queimado; so houve manutencao corretiva de para-raios e aterramento.",
 "NÃO FOI REALIZADA A TROCA DO TRANSFORMADOR, POIS O EQUIPAMENTO NÃO ESTAVA QUEIMADO. FOI EXECUTADO APENAS MANUTENÇÃO CORRETIVA",False),

(39,"DIVISAO DE CIRCUITO","EXPURGAR","alta",
 "SS e OS declaram instalacao de novo posto de transformacao em divisao de circuito, sem trafo retirado; nao e substituicao por falha.",
 "INSTALAÇÃO DE POSTO DE TRANSFORMAÇÃO EM NOVA DIVISÃO DE CIRCUITO ETO-RD-GR 720/2026 | NS_RETIRADO: 0",False),

(40,"AVARIADO","MANTER","media",
 "Trafo trocado por vazamento de oleo com para-raio queimado e placa dos dois equipamentos registrada; a Critica aponta condutor de BT partido, o que descreve o corte e nao o que falhou no equipamento.",
 "Substituiçao de trafo 5712592130 com vazamento de oleo , trafo de 15kva tensao 34,5kv para raio queimado | NS_RETIRADO 339270 / NS_INSTALADO 836252",False),
]

def build(rows):
    out = []
    for idx, cls, dec, conf, just, ev, div in rows:
        c = base[idx]
        out.append({
            "ss": c["ss"], "trafo": c["trafo"], "classificacao": cls, "decisao": dec,
            "confianca": conf, "justificativa": just, "evidencia": ev[:200],
            "diverge_do_site": div,
        })
    return out

if __name__ == '__main__':
    json.dump(build(R), open(OUT,'w',encoding='utf-8'), ensure_ascii=False, indent=1)
    print('parcial gravada:', len(R))
