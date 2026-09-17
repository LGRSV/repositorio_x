import json
base='/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/lote205/'
d=json.load(open(base+'lote_4.json'))
R=json.load(open(base+'saida_4.json'))
def add(i,cl,dec,conf,just,ev,div):
    c=d[i]
    R.append({"ss":c["ss"],"trafo":c["trafo"],"classificacao":cl,"decisao":dec,"confianca":conf,
              "justificativa":just,"evidencia":ev[:200],"diverge_do_site":div})

add(22,"QUEIMADO","MANTER","alta",
 "Check list de trafo queimado por descarga, troca executada com séries e tombamentos e interrupção casada no próprio trafo.",
 "*CHECK LIST TRAFO QUEIMADO* Trafo: 5700841148 Potência: 5 kva ... Para raios: Queimado Causa: Descarga Atmosferica",False)

add(23,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria de aterramento, assim classificada pelo dono, com a ocorrência do trafo fora da janela.",
 "MELHORIA DE ATERRAMENTO — tipo SS: MELHORIA POSTO DE TRANSFORMAÇÃO / Crítica: TRAFO FORA DA JANELA",False)

add(24,"QUEIMADO","MANTER","alta",
 "Trafo de 25 kVA queimado com para-raio queimado, troca documentada e interrupção casada pelo próprio trafo.",
 "Substitui trafo 5700002210 queimado potência 25kva tensão 34,5kv acesso livre para-raio queimado — Crítica obs: 'TRAFO QUEIMADO'",False)

add(25,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS aberta como melhoria de posto de transformação e não há qualquer interrupção associada ao trafo.",
 "Mlehoria posto transformação 5710138077 — tipo SS: MELHORIA POSTO DE TRANSFORMAÇÃO / Crítica: AUSENTE — nem trafo nem chave",False)

add(26,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria no posto, com troca 10->15 kVA e ocorrência do trafo fora da janela da SS.",
 "Realizar mehoria no trafo 5700214080 — tipo SS: MELHORIA POSTO DE TRANSFORMAÇÃO / Crítica: TRAFO FORA DA JANELA",False)

add(27,"QUEIMADO","MANTER","alta",
 "Trafo queimado com troca 10->15 kVA documentada (séries/CITD) e interrupção casada por descarga no próprio trafo.",
 "trafo 5701399019 queimado / PROVÁVEL_MOTIVO_DO_DEFEITO: DESCARGA ATMOSFERICA — Crítica: TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA",False)

add(28,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria de aterramento classificada pelo dono como melhoria de posto; interrupção do trafo fora da janela.",
 "REALIZAR MELHORIA DE ATERRAMENTO NO TRAFO 5710157004 — Crítica: TRAFO FORA DA JANELA",False)

add(29,"PREVENTIVO/PROGRAMADO","EXPURGAR","alta",
 "Troca planejada de 112,5 para 150 kVA com reforço de saída BT — aumento de capacidade, não falha do equipamento.",
 "Topologia 06792 trocar transformador de 112,5 kVA para 150 KVA. Fazer saída com CABO 120MM e dupla os perfurantes da BT.",False)

add(30,"QUEIMADO","MANTER","baixa",
 "É a SS corretiva que aponta o trafo certo queimado, com troca comprovada; a Crítica não casa provavelmente porque a interrupção ficou registrada na SS 751/2026 — verificar duplicidade com ela antes de contar.",
 "NOTA ABERTA PARA CORREÇÃO DA SS 751/2026 POIS O TRAFO QUE ESTAVA QUEIMADO E O 5710235080",True)

add(31,"QUEIMADO","MANTER","media",
 "SS e OS declaram trafo queimado e a Crítica casou pelo próprio trafo (vazamento/tanque deteriorado); falta formulário de campo.",
 "Trafo 5700859081 queimado Potencia: 15 KVA Tensão: 34,5 KV Para raio: Queimado — Crítica: TRANSFORMADOR / VAZAMENTO DE OLEO / TANQUE DETERIORADO",False)

add(32,"QUEIMADO","MANTER","media",
 "Trafo de 150 kVA queimado com desarme de disjuntor e troca comprovada por séries; o campo marca vandalismo, que não é furto nem abalroamento e não afasta a queima.",
 "Desarme DJ 434r100 proteção atuada sim, ICC 4710,00 ... Causa trafo queimado / PROVÁVEL_MOTIVO_DO_DEFEITO: VANDALISMO",False)

add(33,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria de aterramento no posto, classificada assim pelo dono, com ocorrência do trafo fora da janela.",
 "fazer melhoria de aterramento no posto de transformaçao no trafo 5724871053 — Crítica: TRAFO FORA DA JANELA",False)

add(34,"QUEIMADO","MANTER","media",
 "Transformador queimado com interrupção casada e troca comprovada pelo formulário de campo (série e tombamento dos dois lados), suprindo a prova de material que faltava ao site.",
 "transformador queimado acesso livre / TRAFO SUBSTITUIDO PELA TAVARES — NS_RETIRADO 574203 -> NS_INSTALADO 1540535",False)

add(35,"PREVENTIVO/PROGRAMADO","EXPURGAR","alta",
 "Serviço de instalação de P600 e remanejamento de UCs com aumento de 75 para 112,5 kVA; a abertura foi para transferir cargas, não por falha.",
 "Instalar P600 no trafo 5766833004 e ajudar na abertura para remanejamentos de UC´s do trafo — Crítica obs: 'ABERTURA EMERGENCIAL PARA ABRIR S4 E TRANSFERIR CARGAS'",False)

add(36,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria no posto de transformação, classificada assim pelo dono, com ocorrência fora da janela.",
 "fazer melhoria poste de transformaçao no trafo 5701380004 — tipo SS: MELHORIA POSTO DE TRANSFORMAÇÃO",False)

add(37,"ABALROAMENTO","EXPURGAR","alta",
 "A própria SS diz que a queda da estrutura (poste quebrado) danificou o transformador; campo e dono registram ABALROADO.",
 "obs. com a queda da estrutura veio a danificar o transformador . provalvel motivo briga de boi. / PROVÁVEL_MOTIVO_DO_DEFEITO: ABALROADO",True)

add(38,"ABALROAMENTO","EXPURGAR","alta",
 "Substituição decorrente de poste abalroado, confirmada pelo campo e pela Crítica (POSTE DE AT / ABALROADO).",
 "Segue Solicitação de Serviço para substituição de transformador que teve o poste abalroado.",False)

add(39,"QUEIMADO","MANTER","alta",
 "Trafo queimado e com vazamento de óleo, troca 5->15 kVA documentada e interrupção casada no próprio trafo.",
 "Enviar equipe da manutenção para substituir trafo 5700968080 queimado e com vazamento de oleo — Crítica obs: 'trafo queimado aberto nota'",False)

add(40,"MELHORIA DE POSTO","EXPURGAR","alta",
 "SS de melhoria de aterramento no posto de transformação, classificada assim pelo dono, com ocorrência fora da janela.",
 "FAZER MELHORIA DE ATERRAMENTO NO POSTO DE TRANSFORMAÇAO NO TRAFO 5710093040 — Crítica: TRAFO FORA DA JANELA",False)

json.dump(R,open(base+'saida_4.json','w'),ensure_ascii=False,indent=1)
print("total",len(R))
ss=[c['ss'] for c in d]
assert [r['ss'] for r in R]==ss, "ordem/faltantes"
from collections import Counter
print(Counter(r['classificacao'] for r in R))
print(Counter(r['decisao'] for r in R))
print("diverge:",[r['ss'] for r in R if r['diverge_do_site']])
print("baixa:",[(r['ss'],r['classificacao']) for r in R if r['confianca']=='baixa'])
print("media:",sum(1 for r in R if r['confianca']=='media'))
