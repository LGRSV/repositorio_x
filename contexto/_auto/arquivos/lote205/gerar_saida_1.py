# -*- coding: utf-8 -*-
import json, os
OUT = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/lote205/saida_1.json"

R = []
def add(ss, trafo, cl, dec, conf, just, ev, div):
    R.append({"ss": ss, "trafo": trafo, "classificacao": cl, "decisao": dec,
              "confianca": conf, "justificativa": just, "evidencia": ev[:200],
              "diverge_do_site": div})
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(R, f, ensure_ascii=False, indent=1)

add("ETO-RD-GR 00002/2026","5700022078","AVARIADO","MANTER","alta",
    "Troca fisica comprovada (serie/tombamento nos dois lados) com motivo de defeito registrado como vazamento de oleo no proprio trafo.",
    "PROVÁVEL_MOTIVO_DO_DEFEITO: VAZAMENTO DE OLEO; NS_RETIRADO 372895 / NS_INSTALADO 375092", False)

add("DOLP-RD-PA 00026/2026","5700267059","AVARIADO","MANTER","alta",
    "Vazamento de oleo no proprio transformador, confirmado pela critica (causa TRANSFORMADOR) e pela troca executada.",
    "causa TRANSFORMADOR / subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO; obs: 'trafo abeerto para ser substituido deviso vaz. de oleo'", False)

add("ETO-RD-AG 00035/2026","5301105039","TAPE/REGULARIZAÇÃO DE TENSÃO","EXPURGAR","média",
    "A troca foi motivada por tensao baixa que nao sobe nem mudando o tape: e questao de nivel de tensao/cadastro de potencia, nao falha do equipamento.",
    "problemas de tensão baixa, Obs. Não esta aumentando tensão mesmo alterando TAP", False)

add("ETO-RD-GU 00073/2026","5701108076","QUEIMADO","MANTER","média",
    "SS e campo apontam trafo queimado por descarga com vazamento; o site excluiu so por ausencia de registro de interrupcao, que nao e motivo de natureza.",
    "transformador e para raio queimado | PROVÁVEL_MOTIVO_DO_DEFEITO: DESCARGA ATMOSFERICA; VAZAMENTO DE OLEO: Sim", True)

add("DOLP-RD-PA 00091/2026","5703917001","QUEIMADO","MANTER","alta",
    "Trafo queimado por descarga, interrupcao casada no proprio trafo e troca com series registradas.",
    "Transformador queimado 5703917001 potencia 15 kva ... para raio queimado ... causa descarga", False)

add("ETO-RD-GU 00129/2026","5710624052","QUEIMADO","MANTER","média",
    "O titulo da OS diz 'remanejamento', mas SS, campo e critica convergem em queima do proprio trafo (causa TRANSFORMADOR / QUEIMADO POR SOBRECARGA) casada na janela.",
    "causa TRANSFORMADOR / subcausa QUEIMADO POR SOBRECARGA; SS: 'substituiçao de transformador queimado'", True)

add("ETO-RD-AG 00114/2026","5700307002","QUEIMADO","MANTER","alta",
    "Trafo queimado por descarga atmosferica com interrupcao casada no proprio trafo e tombamento retirado/instalado preenchidos.",
    "trafo 5700307002 queimado pot 15 kva | CASOU PELO TRAFO, MEIO AMBIENTE / DESCARGA ATMOSFERICA", False)

add("ETO-RD-AG 00117/2026","5700011032","AVARIADO","MANTER","alta",
    "Vazamento de oleo constatado em campo e troca fisica documentada na OS.",
    "TRafo ... com vazamento de oleo | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim", False)

add("ETO-RD-AR 00216/2026","5700024177","QUEIMADO","MANTER","alta",
    "Queima por descarga atmosferica confirmada pela critica no proprio trafo, com troca completa de serie e tombamento.",
    "causa TRANSFORMADOR / subcausa QUEIMADO POR DESCARGA ATMOSFERICA", False)

add("ETO-RD-AR 00243/2026","5701262019","AVARIADO","MANTER","alta",
    "Trafo avariado com vazamento de oleo confirmado no formulario e troca fisica na OS; o site excluiu apenas por falta de registro de interrupcao.",
    "Trafo 5701262019 avariado | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim", True)

add("ETO-RD-AG 00160/2026","5700271002","QUEIMADO","MANTER","média",
    "SS/OS descrevem o trafo com fase queimada e a troca foi executada; a melhoria de estrutura U4 foi servico acessorio no mesmo poste.",
    "substituir o trafo 5700271002 com a fase queimada e para raio", False)

add("ETO-RD-AR 00293/2026","5702795004","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS aberta e tipificada como melhoria de posto (aterramento); a troca de 5 para 15 kVA foi parte da melhoria, nao atendimento de falha.",
    "realizar melhoria de aterramento 5702795004 | tipo: MELHORIA POSTO DE TRANSFORMAÇÃO", False)

add("ENC-RD-PS 00231/2026","5700695012","QUEIMADO","MANTER","alta",
    "Trafo queimado por descarga com interrupcao casada no proprio ativo e troca comprovada.",
    "tr 5700695012 queimado | causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA", False)

add("ETO-RD-AR 00316/2026","5700309053","QUEIMADO","MANTER","alta",
    "Queima por descarga atmosferica casada pelo trafo na janela, com troca de serie e tombamento registrada.",
    "CASOU PELO TRAFO; causa TRANSFORMADOR / subcausa QUEIMADO POR DESCARGA ATMOSFERICA", False)

add("ETO-RD-GU 00233/2026","5700641107","QUEIMADO","MANTER","alta",
    "Teste a vazio constatou o trafo queimado e a critica casou no proprio ativo; o poste deteriorado foi problema adicional, nao a causa.",
    "REALIZADO TESTE A VAZIO NO TRAFO E CONSTATADO QUEIMADO DEVITO TER TENSÃO NA BUCHA PRIMARIA POREM NADA CONSTA NA SECUNDARIA", False)

add("ETO-RD-AR 00341/2026","5700309053","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS de melhoria de posto que compartilha a mesma OS e o mesmo trafo da SS 316/2026 — e o mesmo evento ja contado, nao uma segunda troca.",
    "realizar melhoria em posto de transformador 5700309053 | mesma OS ENC-MLAR02 000036/2026 da SS ETO-RD-AR 00316/2026", False)

add("ETO-RD-AG 00211/2026","5741261039","QUEIMADO","MANTER","alta",
    "Trafo queimado por descarga com interrupcao casada e troca de serie/tombamento nos dois lados.",
    "5741261039 queimado pot. 15kva | CASOU PELO TRAFO, MEIO AMBIENTE / DESCARGA ATMOSFERICA", False)

add("ETO-RD-AR 00372/2026","5703232004","MELHORIA DE POSTO","EXPURGAR","alta",
    "Servico declarado como melhoria de aterramento, com SS tipificada como melhoria de posto de transformacao.",
    "REALIZAR MELHORIA DE ATERRAMENTO | tipo: MELHORIA POSTO DE TRANSFORMAÇÃO", False)

add("ETO-RD-AR 00382/2026","5701346060","MELHORIA DE POSTO","EXPURGAR","alta",
    "Melhoria de aterramento programada, com aumento de potencia de 5 para 25 kVA no mesmo servico.",
    "Favor executar melhoria no aterramento do trafo 5701346060", False)

add("ETO-RD-AR 00415/2026","5700402060","AVARIADO","MANTER","alta",
    "Trafo vazando oleo, confirmado no formulario de campo, com troca fisica documentada; a exclusao do site foi so por ausencia de interrupcao.",
    "TR-5700402060 vazando oleo | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim", True)

add("ETO-RD-GU 00294/2026","5710467076","QUEIMADO","MANTER","alta",
    "Trafo e para-raio queimados com interrupcao casada no proprio trafo (causa TRANSFORMADOR) e troca executada.",
    "Transformador e para raio queimado | causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA", False)

print("parcial gravada:", len(R))

add("DOLP-RD-PA 00338/2026","5704202122","QUEIMADO","MANTER","média",
    "SS e OS declaram TF queimado na bucha e a troca foi feita (series retirada/instalada); a exclusao do site foi so por janela, nao por natureza.",
    "Segue esse para substituição de TF queimado (bucha do TF) 5704202122", True)

add("ETO-RD-AR 00473/2026","5710760004","AVARIADO","MANTER","alta",
    "Trafo encontrado com vazamento de oleo e amassado na lateral, com interrupcao casada no proprio ativo e troca executada.",
    "FOI ENCONTRADO TRABFORMADOR 5710760004 COM VAZAMENTO DE OLHO E COM AMACADO NA LATERAL", False)

add("ETO-RD-GU 00335/2026","5710342076","QUEIMADO","MANTER","alta",
    "Trafo queimado na RDR de Duere, interrupcao casada pelo proprio trafo e troca de 5 para 15 kVA confirmada na OS.",
    "SEGUE SS DE TRAFO QUEIMADO NA RDR DE DUERÉ ... PARA RAIOS QUEIMADO | FOI FEITO A TROCA DO TRANSFORMADOR DE 5KVA PARA 15KVA", False)

add("ETO-RD-GR 00339/2026","5700661111","QUEIMADO","MANTER","alta",
    "OS declara textualmente troca de trafo queimado, com interrupcao casada no proprio trafo (queimado por sobrecarga).",
    "TROCA DE TRAFO QUEIMADO 5700661111 ETO-RD-GR 339/2026", False)

add("ETO-RD-AG 00344/2026","5700002210","REMANEJAMENTO","EXPURGAR","alta",
    "SS de plano de medida para remanejar 15 para 25 kVA por carga; a queima ja tinha sido atendida na SS 339/2026, entao aqui seria dupla contagem.",
    "REAMANEJAR TRAFO DE 15KVA-19.9KV POR TRAFO DE 25KVA-19.9KV - DEVIDO ATENDER 27 UNIDADES CONSUMIDORAS ... CONFORME ATENDIMENTO DA SS ETO-RD-AG 339/2026 DE TRAFO QUEIMADO", False)

add("ETO-RD-AR 00596/2026","5710104077","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS de melhoria no posto, com a critica apontando nivel de tensao e nao falha do equipamento.",
    "Realizar melhoria no trafo 5710104077 | causa NIVEL DE TENSAO / NÃO REGULARIZADO-CARGA PERTURBADORA NO CIRCUITO", False)

add("ETO-RD-AR 00607/2026","5700799193","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS aberta e tipificada como melhoria de posto de transformacao; troca de potencia dentro da melhoria.",
    "REALIZAR MELHORIA 5700799193 | tipo: MELHORIA POSTO DE TRANSFORMAÇÃO", False)

add("ETO-RD-AR 00619/2026","5710227004","MELHORIA DE POSTO","EXPURGAR","alta",
    "Servico de melhoria no posto, mesma potencia 15/15, sem qualquer declaracao de queima ou avaria.",
    "Realizar melhoria de atendimento 5710227004 | tipo: MELHORIA POSTO DE TRANSFORMAÇÃO", False)

add("ETO-RD-AR 00692/2026","5703106004","QUEIMADO","MANTER","média",
    "A SS declara o trafo queimado/avariado e a OS comprova a troca de 112,5 para 150 kVA; a critica registra condutor de BT partido, o que nao afasta a queima do trafo.",
    "Trafo 5703106004 QUEIMADO AVARIADO 112,5 | PROVÁVEL_MOTIVO_DO_DEFEITO: SOBRECARGA", True)

add("ETO-RD-AG 00448/2026","5766930077","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS de melhoria no posto, sem interrupcao associada; a troca ocorreu dentro da melhoria programada.",
    "fazer melhoria no trafo 5766930077 | AUSENTE — nem trafo nem chave", False)

add("ETO-RD-AR 00781/2026","5700752004","QUEIMADO","MANTER","alta",
    "SS declara trafo de 45 kVA queimado, com interrupcao casada no proprio trafo e troca de serie/tombamento comprovada.",
    "trafo 5700752004 45kva 34.5kv queimado CHACARA MORADA DO SOL", False)

add("ETO-RD-AR 00807/2026","5701063077","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS explicita de melhoria no posto de transformacao; a ocorrencia de queima na base esta a 160 h da SS, fora da janela.",
    "FAZER MELHORIA NO POSTO DE TRANFORMAÇAO DO TRAFO 5701063077", False)

add("ETO-RD-GR 00530/2026","5700001112","AVARIADO","MANTER","alta",
    "OS declara troca de trafo avariado por vazamento de oleo, com campo e critica confirmando tanque deteriorado; o site so aguarda o material.",
    "TROCA DE TRAFO AVARIADO 5700001112 | ABERTURA EMERGENCIAL DO TRAFO 5700001112 PARA CORRIGIR VAZAMENTO DE ÓLEO", False)

add("DG-RD-PO 00401/2026","5701079026","QUEIMADO","MANTER","alta",
    "OS registra substituicao de trafo queimado, com interrupcao casada no proprio trafo.",
    "substituição de trafo queimado rdr ponte alta | causa TRANSFORMADOR / QUEIMADO POR CAUSA NAO IDENTIFICADA", False)

add("DOLP-RD-PA 00652/2026","5701422122","SEM TROCA (não substituído)","EXPURGAR","alta",
    "Desativacao de posto de transformacao por deterioracao da estrutura: trafo retirado sem instalacao de outro, nao houve falha do equipamento.",
    "Desativar posto de transformação, pois o mesmo está deteriorando com as ações do tempo. | NS_INSTALADO: 0", False)

add("ETO-RD-AR 00991/2026","5755060004","FURTO","EXPURGAR","média",
    "SS e defeito gravado apontam vandalismo/furto no posto, nao falha do equipamento; o texto e de constatacao indireta ('sinais'), dai a confianca media.",
    "Trafo 5755060004 25kva ... Sinais de vandalismo | defeito_ss: VANDALISMO", False)

add("ETO-RD-AR 01030/2026","5700408058","AVARIADO","MANTER","média",
    "SS e campo declaram vazamento de oleo no proprio trafo; a exclusao do site por 'tape interno' se apoia so na posicao de tap da OS, o que nao explica o vazamento.",
    "segue SS para substituir trafo com vazamento na rdu de Santa Fé | EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim", True)

add("ENC-RD-PS 00606/2026","5702266007","ABALROAMENTO","EXPURGAR","alta",
    "Poste/estrutura quebrada com o transformador no chao, causa de terceiros; o dano e externo, nao falha do equipamento.",
    "Estrutura do trafo 5702266007 quebrado e transformador no chão | causa CAUSADA POR TERCEIROS / VANDALISMO | defeito_ss: ABALROADO", False)

add("ETO-RD-AR 01095/2026","5710025025","TAPE/REGULARIZAÇÃO DE TENSÃO","EXPURGAR","alta",
    "Troca motivada por tap submerso e tensao baixa, com a critica registrando nivel de tensao/ajuste de tap e mesma potencia 25/25.",
    "Substitui trafo 5710025025 TAP submerso e a tensão esta baixa em campo | causa NIVEL DE TENSAO / AJUSTE TAP", False)

add("ETO-RD-AR 01113/2026","5700443155","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS de melhoria de aterramento no posto de transformacao, com a ocorrencia da base a 172 h de distancia.",
    "FAZER MELHORIA DE ATERRAMENTO NO POSTO DE TRANSFORMAÇAO NO TRAFO 5700443155", False)

print("total gravado:", len(R))
