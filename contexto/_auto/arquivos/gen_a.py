import json
d=json.load(open('/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/lote205/lote_4.json'))
R=[]
def add(i,cl,dec,conf,just,ev,div):
    c=d[i]
    R.append({"ss":c["ss"],"trafo":c["trafo"],"classificacao":cl,"decisao":dec,"confianca":conf,
              "justificativa":just,"evidencia":ev[:200],"diverge_do_site":div})

add(0,"QUEIMADO","MANTER","alta",
 "Troca 5->15 kVA com série e tombamento dos dois lados e interrupção no próprio trafo por descarga na janela.",
 "TRAFO RETIRADO POTÊNCIA : 5 KVA Nº DE SÉRIE : 125062 / TRAFO INSTALADO 15 KVA Nº DE SÉRIE : 455521 — Crítica: TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA",False)

add(1,"ABALROAMENTO","EXPURGAR","alta",
 "SS e campo atribuem o vazamento à colisão no poste; falha não é do equipamento.",
 "TR 5700247131 15 KVA COM VAZAMENTO DEVIDO ABALROAMENTO DO POSTE 19,9KV / PROVÁVEL_MOTIVO_DO_DEFEITO: ABALROADO",False)

add(2,"QUEIMADO","MANTER","alta",
 "Trafo e para-raio queimados por descarga, com bucha BT estourada e interrupção casada no próprio trafo.",
 "TRAFO E PARA RAIO QUEIMADOS TRAFO 15KVA 7,9KV ... BUCHA BT ESTOURADA POR DESCARGA ATIMOSFERICA",False)

add(3,"QUEIMADO","MANTER","alta",
 "Trafo queimado na RDR de Paranã, substituído 5->15 kVA, com interrupção casada por descarga.",
 "SEGUE SS DE TRAFO QUEIMADO NA RDR DE PARANÃ, TRAFO DE 5KVA NA REDE DE 19.9KV, PARA RAIO QUEIMADO",True and False)

add(4,"QUEIMADO","MANTER","baixa",
 "Campo e OS registram trafo retirado com série/tombamento legíveis e queima por descarga — incompatível com furto; a prova de furto está só no enquadramento contábil da obra, que não consta nos dados.",
 "TRAFO RETIRADO ... Nº ENERGISA (CITD) : 06114 Nº DE SÉRIE : 370550 MARCA : TOSHIBA / PROVÁVEL_MOTIVO_DO_DEFEITO: DESCARGA ATMOSFERICA",True)

add(5,"QUEIMADO","MANTER","alta",
 "Trafo de 30 kVA e para-raios queimados, atendimento emergencial e troca com série/tombamento nos dois lados.",
 "Segue ss de 01 trafo de 30 kvar e 03 para raios queimados ... trafo aberto queimado atendido na porta pela equipe 092op01",False)

add(6,"QUEIMADO","MANTER","alta",
 "Trafo queimado na RDR de Duerê com troca executada e interrupção casada por descarga atmosférica.",
 "SEGUE SS DE TRAFO QUEIMADO NA RDR DE DUERE, TRAFO DE 15KVA NA REDE DE 19.9KV, PARA RAIO QUEIMADO",False)

add(7,"QUEIMADO","MANTER","alta",
 "Trafo queimado e vazando óleo, motivo de campo sobrecarga, troca 5->15 kVA com séries e interrupção casada.",
 "TRAFO QUEIMADO, VAZANDO ÓLEO ... PARA RAIO QUEIMADO / PROVÁVEL_MOTIVO_DO_DEFEITO: SOBRECARGA",False)

add(8,"QUEIMADO","MANTER","media",
 "Texto declara trafo e para-raio queimados e a Crítica casou pelo próprio trafo; falta formulário de campo, mas o material confirma 1 trafo.",
 "trafo 5712496033 15kva e para raio queimado 19,9 acesso livre 048op02 — Crítica: TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA",False)

add(9,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS aberta como melhoria em posto de transformação, com relatório/book de melhoria, e a interrupção do trafo está fora da janela.",
 "--MELHORIA EM POSTO DE TRANSFORMAÇÃO PREENCHER RELATÓRIO E BOOK PARA MELHORIAS EM POSTO DE TRANSFORMAÇÃO QUE ESTA EM ANEXO.",False)

add(10,"QUEIMADO","MANTER","media",
 "SS aponta trafo de 5 kVA e para-raios queimados e a Crítica casou pelo próprio trafo; a OS só traz o plano de medida, sem formulário de campo.",
 "Trafo de 5 kva na 19,9kv mais para raio de MT e BT queimados / PLANO DE MEDIDA - Realizar substituição do trafo 5700277134 de 5 kVA para 15 kVA.",False)

add(11,"QUEIMADO","MANTER","media",
 "Apesar de defeito_ss e do dono marcarem ABALROADO, nenhum texto cita colisão: campo aponta descarga atmosférica e a Crítica registra TR QUEIMADO.",
 "PROVÁVEL_MOTIVO_DO_DEFEITO: DESCARGA ATMOSFERICA — Crítica obs: 'TR QUEIMADO' / SS: 'PARA RAIO DANIFICADO ACESSO PARA CAMINHONETE'",False)

add(12,"AVARIADO","MANTER","media",
 "Bucha secundária e para-raio do trafo danificados por queda de árvore sobre a BT — dano ao próprio equipamento, sem furto nem abalroamento por veículo.",
 "necessario substituir 50mt cabos BT Multiplex devido avore cair sobe rede BT danifcando cabo e bucha secundaria para raio tbm esta danificado",False)

add(13,"AVARIADO","MANTER","media",
 "Vazamento de óleo com tanque deteriorado confirmado na Crítica pelo próprio trafo; substituição 10->15 kVA no plano de medida.",
 "PLANO DE MEDIDA - Realizar substituição do trafo 5702229039 de 10 kVA para 15 kVA — Crítica: TRANSFORMADOR / VAZAMENTO DE OLEO / TANQUE DETERIORADO",False)

add(14,"QUEIMADO","MANTER","alta",
 "Trafo queimado com troca 5->15 kVA documentada (séries e CITD) e interrupção casada por descarga.",
 "tr 5700046068 queimado pot 5kva tensão 19.9kv para-raio ruim / NS_RETIRADO 460157 -> NS_INSTALADO 339870",False)

add(15,"POSTE/REDE (não é o trafo)","EXPURGAR","alta",
 "A OS declara que o poste caiu e danificou o trafo; a SS é de melhoria de posto e a Crítica aponta conexão danificada, não falha do equipamento.",
 "DEVIDO POSTE DANIFICADO ESTAR NO CHAO FOI DANIFICADO TRAFO TAMBEM ASSIM TEVE QUE FAZER SUBST TRAFO DE 25 KVA 34.5 KV",False)

add(16,"AVARIADO","MANTER","alta",
 "Vazamento de óleo no trafo com tanque deteriorado confirmado pela Crítica no próprio equipamento.",
 "Trafo: 5719933077 vazamento de oleo ... Para raio: queimado — Crítica: TRANSFORMADOR / VAZAMENTO DE OLEO / TANQUE DETERIORADO",False)

add(17,"MELHORIA DE POSTO","EXPURGAR","media",
 "SS aberta e classificada pelo dono como melhoria de aterramento; a única menção a queima vem de ocorrência fora da janela.",
 "REALIZAR MELHORIA DE ATERRAMENTO — tipo SS: MELHORIA POSTO DE TRANSFORMAÇÃO / Crítica: TRAFO FORA DA JANELA",False)

add(18,"QUEIMADO","MANTER","alta",
 "Trafo e para-raios queimados com troca 10->15 kVA documentada e interrupção casada no próprio trafo.",
 "TR-5700664060 Queimado para raios queimado potência 10kva tensão 13,8kv",False)

add(19,"QUEIMADO","MANTER","alta",
 "Transformador queimado com troca comprovada (séries/tombamentos) e interrupção casada por descarga; a melhoria de malha foi serviço agregado.",
 "Segue SS de transformador 5700082082 queimado Potencia 15 KVA — Crítica: TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA",False)

add(20,"ABALROAMENTO","EXPURGAR","baixa",
 "defeito_ss e a classificação do dono dizem ABALROADO e a ocorrência casada é POSTE DE AT / ABALROADO com 1.096 clientes (evento de rede); o site conta como queimado por decisão posterior do dono — conflito não resolvido nos dados.",
 "defeito_ss: ABALROADO / Crítica: POSTE DE AT / ABALROADO — 'CABO FORA DO ISOLADOR 6° ESTRUTURA APOS CHAVE 0301085084'",True)

add(21,"QUEIMADO","MANTER","baixa",
 "Pelo mérito é queima: campo aponta descarga com vazamento e a troca está documentada; o site expurgou por ausência de interrupção (regra de janela), não por causa externa.",
 "TRAFO RETIRADO 15 KVA Nº DE SÉRIE : 141362 -> INSTALADO Nº DE SÉRIE : 826192 / PROVÁVEL_MOTIVO_DO_DEFEITO: DESCARGA ATMOSFERICA",True)

json.dump(R,open('/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/lote205/saida_4.json','w'),ensure_ascii=False,indent=1)
print("parcial",len(R))
