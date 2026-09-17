const pptxgen = require('pptxgenjs');
const P = __dirname + '/unpacked/ppt/media/';
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Squad Equipamentos Especiais';
pres.title  = 'Expurgos de Transformadores — Jan a Ago 2026';

const NAVY='1F1F4C', ORANGE='F37021', TXT='262626', GRAY='595959', LGRAY='BFBFBF', ZEBRA='F2F2F2', GRID='D9D9D9';
const F='Calibri';
const BGC={path:P+'image2.png'};

function titulo(s,t,sub){
  s.addText(t,{x:0.55,y:0.36,w:12.2,h:0.58,fontFace:F,fontSize:26,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
  if(sub) s.addText(sub,{x:0.55,y:0.96,w:12.2,h:0.34,fontFace:F,fontSize:13,color:GRAY,isTextBox:true,margin:0,valign:'middle'});
}
function txt(s,t,o){ s.addText(t,Object.assign({isTextBox:true,margin:0,fontFace:F},o)); }
function H(t){ return {text:t,options:{bold:true,color:'FFFFFF',fill:{color:NAVY},align:'left',valign:'middle'}}; }
function C(t,o){ return {text:String(t),options:Object.assign({color:TXT,valign:'middle'},o||{})}; }
function tabela(s,rows,o){
  s.addTable(rows,Object.assign({fontFace:F,fontSize:12,border:{type:'solid',pt:0.5,color:LGRAY},margin:[0.04,0.08,0.04,0.08],rowH:0.34,autoPage:false},o));
}
function bullets(s,items,o){
  const arr=[];
  items.forEach((t,i)=>{
    const last=i===items.length-1;
    const runs=Array.isArray(t.text)?t.text:[{text:(t.text!==undefined?t.text:t),options:t.options||{}}];
    runs.forEach((r,j)=>{
      const op=Object.assign({color:TXT},r.options||{});
      if(j===0 && !(o&&o.bullet===false)) op.bullet={indent:14};
      if(j===runs.length-1 && !last) op.breakLine=true;
      arr.push({text:r.text,options:op});
    });
  });
  const oo=Object.assign({},o); delete oo.bullet;
  s.addText(arr,Object.assign({isTextBox:true,margin:0,fontFace:F,fontSize:12.5,valign:'top',paraSpaceAfter:6,lineSpacingMultiple:1.08},oo));
}
const CH={catAxisLabelFontFace:F,catAxisLabelColor:TXT,catAxisLabelFontSize:11,valAxisLabelFontFace:F,valAxisLabelColor:GRAY,valAxisLabelFontSize:10,
  valGridLine:{color:GRID,size:0.5},catGridLine:{style:'none'},dataLabelFontFace:F,dataLabelFontSize:11,dataLabelColor:TXT,showValue:true,
  legendFontFace:F,legendFontSize:11,legendColor:TXT,catAxisLineColor:LGRAY,valAxisLineColor:LGRAY,serAxisLineColor:LGRAY};

// ===== 1. CAPA =====
let s=pres.addSlide(); s.background={path:P+'image1.png'};
txt(s,'Expurgos de Transformadores',{x:8.0,y:3.32,w:4.95,h:0.96,fontSize:28,bold:true,color:NAVY,valign:'top'});
txt(s,'Janeiro a agosto de 2026',{x:8.0,y:4.34,w:4.95,h:0.34,fontSize:16,bold:true,color:GRAY,valign:'middle'});
txt(s,'Squad Equipamentos Especiais',{x:8.0,y:4.74,w:4.95,h:0.3,fontSize:12,color:GRAY,valign:'top'});
s.addNotes('Base: 227 SS expurgadas de janeiro a agosto de 2026. Metade ainda depende de análise do COPO.');

// ===== 2. A MENSAGEM =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'Metade dos expurgos ainda não fechou','Das 227 solicitações retiradas do indicador, 112 aguardam o COPO: ou não há interrupção registrada, ou ela está fora da janela de 24 horas.');
s.addChart(pres.ChartType.pie,[{name:'Expurgos',labels:['Com decisão fechada (115)','Aguardando o COPO (112)'],values:[115,112]}],
 Object.assign({},CH,{x:0.55,y:1.55,w:5.2,h:4.4,chartColors:[NAVY,ORANGE],showLegend:true,legendPos:'b',showPercent:true,showValue:false,showLabel:false,
  dataLabelColor:'FFFFFF',dataLabelFontSize:14,dataLabelFontBold:true,dataBorder:{pt:1,color:'FFFFFF'}}));
tabela(s,[
 [H('Situação'),H('SS'),H('%')],
 [C('Com decisão fechada'),C('115',{align:'right'}),C('51%',{align:'right'})],
 [C('Aguardando o COPO',{fill:{color:ZEBRA}}),C('112',{align:'right',fill:{color:ZEBRA}}),C('49%',{align:'right',fill:{color:ZEBRA}})],
 [C('Total',{bold:true}),C('227',{align:'right',bold:true}),C('100%',{align:'right',bold:true})]
],{x:6.2,y:1.6,w:6.55,colW:[4.15,1.2,1.2]});
txt(s,'O que separa os dois grupos',{x:6.2,y:3.2,w:6.55,h:0.3,fontSize:13,bold:true,color:NAVY,valign:'middle'});
bullets(s,[
 {text:[{text:'Os 115 saíram por mérito. ',options:{bold:true}},{text:'Furto, remanejamento, troca preventiva, ausência de documento — o caso está decidido e não retorna ao indicador.'}]},
 {text:[{text:'Os 112 saíram por ausência de registro. ',options:{bold:true}},{text:'O texto descreve a falha e em 81 deles a troca está documentada, mas a interrupção ou não consta na Crítica, ou consta fora da janela de 24 horas. Voltam ao indicador se a prova aparecer.'}]}
],{x:6.2,y:3.55,w:6.55,h:2.4,bullet:false});
s.addNotes('115 decididos x 112 pendentes. Expurgo por mérito não volta; expurgo por ausência de registro volta se a prova aparecer.');

// ===== 3. MACRO CATEGORIAS =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'Como se dividem os 227 expurgos','Cinco macro categorias. A maior delas é justamente a que ainda não tem resposta.');
s.addChart(pres.ChartType.bar,[{name:'Expurgos',labels:['Não houve troca nenhuma','Obra não comprova a troca','Trocado, mas sem falha','Causa externa ao transformador','Sem interrupção ou fora da janela'],values:[12,16,38,49,112]}],
 Object.assign({},CH,{x:0.5,y:1.55,w:7.6,h:4.4,barDir:'bar',chartColors:[NAVY,NAVY,NAVY,NAVY,ORANGE],varyColors:true,dataLabelPosition:'outEnd',
  showLegend:false,barGapWidthPct:55,valAxisMinVal:0,valAxisMaxVal:125,valAxisMajorUnit:25}));
txt(s,'Leitura',{x:8.5,y:1.6,w:4.3,h:0.3,fontSize:13,bold:true,color:NAVY,valign:'middle'});
bullets(s,[
 {text:[{text:'Sem interrupção ou fora da janela ',options:{bold:true}},{text:'concentra 112 dos 227 — quase metade. São 82 SS sem interrupção registrada na Crítica e 30 em que a interrupção existe, mas fora da janela de 24 horas da SS.'}]},
 {text:[{text:'As outras quatro categorias ',options:{bold:true}},{text:'somam 115 e estão encerradas. Nelas o expurgo não depende da Crítica: o motivo está no próprio caso — a causa foi externa, a troca não foi por falha, a obra não comprova a troca, ou simplesmente não houve troca.'}]},
 {text:'Em destaque (laranja) o bloco que depende do COPO.',options:{color:GRAY,italic:true}}
],{x:8.5,y:1.95,w:4.3,h:4.0,bullet:false});
s.addNotes('112 de 227 na macro categoria pendente. As outras quatro estão fechadas.');

// ===== 4. OS 115 FECHADOS =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'Os 115 expurgos com decisão fechada','Saíram do indicador por mérito próprio. Não dependem da Crítica e não retornam.');
const Z={fill:{color:ZEBRA}};
tabela(s,[
 [H('Categoria'),H('O que significa'),H('SS')],
 [C('Causa externa ao transformador',{bold:true}),C('O equipamento falhou ou foi reposto, mas por causa que não é dele: furto, colisão, terceiros, ou o código nem é de transformador de distribuição.',{fontSize:10.5}),C('49',{align:'right',bold:true})],
 [C('Trocado, mas sem falha',{bold:true,fill:{color:ZEBRA}}),C('A troca aconteceu e está documentada, só que por decisão de capacidade ou de rede — remanejamento, preventivo, ajuste de tensão — e não por defeito do transformador.',{fontSize:10.5,fill:{color:ZEBRA}}),C('38',{align:'right',bold:true,fill:{color:ZEBRA}})],
 [C('Obra não comprova a troca',{bold:true}),C('A obra é onde o material trocado fica registrado. Aqui ela nunca foi gerada, não executou nada, ou foi encerrada sem transformador no material — não há como comprovar a substituição.',{fontSize:10.5}),C('16',{align:'right',bold:true})],
 [C('Não houve troca nenhuma',{bold:true,fill:{color:ZEBRA}}),C('O próprio registro diz que nada foi substituído: a SS é de construção ou desativação de posto, ou é a segunda SS do mesmo evento.',{fontSize:10.5,fill:{color:ZEBRA}}),C('12',{align:'right',bold:true,fill:{color:ZEBRA}})],
 [C('Total',{bold:true}),C(''),C('115',{align:'right',bold:true})],
],{x:0.55,y:1.46,w:7.4,colW:[2.15,4.45,0.8],rowH:0.68,fontSize:11});
tabela(s,[
 [H('Motivo registrado caso a caso'),H('SS')],
 [C('Furto, roubo ou vandalismo'),C('36',{align:'right'})],
 [C('Remanejamento ou mudança de potência',Z),C('14',{align:'right',fill:{color:ZEBRA}})],
 [C('Troca preventiva'),C('12',{align:'right'})],
 [C('Nenhum transformador foi substituído',Z),C('11',{align:'right',fill:{color:ZEBRA}})],
 [C('Obra nunca foi gerada'),C('9',{align:'right'})],
 [C('Colisão de veículo (abalroamento)',Z),C('7',{align:'right',fill:{color:ZEBRA}})],
 [C('Ajuste de nível de tensão (tape)'),C('7',{align:'right'})],
 [C('Divisão de circuito',Z),C('4',{align:'right',fill:{color:ZEBRA}})],
 [C('Obra encerrada sem trafo no material'),C('3',{align:'right'})],
 [C('OS sem descrição e sem obra gerada',Z),C('3',{align:'right',fill:{color:ZEBRA}})],
 [C('Código não é de transformador'),C('2',{align:'right'})],
 [C('Falta de fase com ganho de potência',Z),C('2',{align:'right',fill:{color:ZEBRA}})],
 [C('Demais motivos, um caso cada',{italic:true}),C('5',{align:'right'})],
 [C('Total',{bold:true,fill:{color:ZEBRA}}),C('115',{align:'right',bold:true,fill:{color:ZEBRA}})],
],{x:8.25,y:1.46,w:4.5,colW:[3.6,0.9],rowH:0.29,fontSize:10.5});
txt(s,'Demais motivos: melhoria de posto, dano de terceiros, transformador auxiliar de religador, obra aberta e não executada, e uma SS duplicada do mesmo evento.',
  {x:0.55,y:5.78,w:7.4,h:0.6,fontSize:10.5,italic:true,color:GRAY,valign:'top'});
s.addNotes('49 causa externa, 38 trocado sem falha, 16 obra não comprova, 12 não houve troca. Total 115.');

// ===== 4B. OS 172 COM TEXTO DE QUEIMA OU AVARIA =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'Os 172 com texto de queima ou avaria','Dos 227 expurgos, 172 pareciam contar pela descrição do campo. Destes, 112 param na Crítica e 60 saíram por motivo apurado na leitura.');
s.addChart(pres.ChartType.bar,[
 {name:'Parou na Crítica',labels:['Queimado (125)','Avariado (47)'],values:[89,23]},
 {name:'Saiu por outro motivo',labels:['Queimado (125)','Avariado (47)'],values:[36,24]}],
 Object.assign({},CH,{x:0.5,y:1.5,w:6.1,h:4.45,barDir:'col',barGrouping:'stacked',chartColors:[ORANGE,NAVY],
  dataLabelPosition:'ctr',dataLabelColor:'FFFFFF',dataLabelFontBold:true,dataLabelFontSize:13,
  showLegend:true,legendPos:'b',barGapWidthPct:80,valAxisMinVal:0,valAxisMaxVal:140,valAxisMajorUnit:25}));
tabela(s,[
 [H('Dos 172 com texto de falha'),H('SS'),H('%')],
 [C('Parou na Crítica: sem interrupção ou fora da janela',{fontSize:11}),C('112',{align:'right',bold:true}),C('65%',{align:'right'})],
 [C('Saiu por outro motivo, apurado na leitura',{fontSize:11,fill:{color:ZEBRA}}),C('60',{align:'right',bold:true,fill:{color:ZEBRA}}),C('35%',{align:'right',fill:{color:ZEBRA}})],
 [C('Total',{bold:true}),C('172',{align:'right',bold:true}),C('100%',{align:'right',bold:true})],
],{x:6.95,y:1.5,w:5.8,colW:[3.9,0.95,0.95],rowH:0.36});
txt(s,'Os 60 em que a leitura discordou do texto',{x:6.95,y:3.15,w:5.8,h:0.3,fontSize:12.5,bold:true,color:NAVY,valign:'middle'});
tabela(s,[
 [H('Categoria apurada'),H('Principais motivos'),H('SS')],
 [C('Trocado, mas sem falha',{fontSize:11}),C('remanejamento 12, preventivo 8, tape 7',{fontSize:10.5}),C('29',{align:'right'})],
 [C('Causa externa ao transformador',{fontSize:11,fill:{color:ZEBRA}}),C('furto 6, colisão 2, cadastro 2, fase 2',{fontSize:10.5,fill:{color:ZEBRA}}),C('13',{align:'right',fill:{color:ZEBRA}})],
 [C('Obra não comprova a troca',{fontSize:11}),C('obra não gerada 6, sem trafo no material 3',{fontSize:10.5}),C('11',{align:'right'})],
 [C('Não houve troca nenhuma',{fontSize:11,fill:{color:ZEBRA}}),C('nenhum trafo substituído 6, SS duplicada 1',{fontSize:10.5,fill:{color:ZEBRA}}),C('7',{align:'right',fill:{color:ZEBRA}})],
 [C('Total',{bold:true}),C(''),C('60',{align:'right',bold:true})],
],{x:6.95,y:3.5,w:5.8,colW:[2.25,2.65,0.9],rowH:0.36});
bullets(s,[
 {text:[{text:'Nos 112 a leitura não contradiz o texto: ',options:{bold:true}},{text:'a queima é aceita, falta a interrupção. Nos 60 a leitura encontrou outra explicação e o caso está fechado.'}]},
 {text:[{text:'Queimado depende muito mais da Crítica: ',options:{bold:true}},{text:'71% dos 125 queimados param ali, contra 49% dos 47 avariados.'}]}
],{x:0.55,y:5.98,w:12.2,h:0.55,fontSize:11,bullet:false});
s.addNotes('172 de 227 com texto de queima/avaria: 125 queimado + 47 avariado. Destes 112 pela Crítica (89 queimado + 23 avariado) e 60 por outro motivo (36 queimado + 24 avariado). Os outros 55 do total já declaram outra causa no texto: furtado 30, preventivo 9, abalroamento 5, entre outros.');

// ===== 5. OS 112 PENDENTES =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'Os 112 que dependem do COPO','Ou não há interrupção registrada, ou ela está fora da janela de 24 horas — não é descaracterização da falha.');
tabela(s,[
 [H('Situação na Crítica'),H('O que significa'),H('SS'),H('Troca comprovada pela série'),H('Sem comprovação')],
 [C('Sem interrupção registrada',{bold:true}),C('A Crítica não tem nenhuma interrupção neste transformador em data alguma do período.',{fontSize:11}),C('82',{align:'right'}),C('56',{align:'right'}),C('26',{align:'right'})],
 [C('Fora da janela de 24 h',{bold:true,fill:{color:ZEBRA}}),C('A interrupção existe na Crítica, mas não cai na janela de 24 horas em torno da SS.',{fontSize:11,fill:{color:ZEBRA}}),C('30',{align:'right',fill:{color:ZEBRA}}),C('25',{align:'right',fill:{color:ZEBRA}}),C('5',{align:'right',fill:{color:ZEBRA}})],
 [C('Total',{bold:true}),C(''),C('112',{align:'right',bold:true}),C('81',{align:'right',bold:true}),C('31',{align:'right',bold:true})],
],{x:0.55,y:1.55,w:12.2,colW:[2.1,5.9,1.0,1.7,1.5],rowH:0.5});
txt(s,'O que o campo registrou nesses 112 casos',{x:0.55,y:3.75,w:12.2,h:0.3,fontSize:13,bold:true,color:NAVY,valign:'middle'});
tabela(s,[
 [H('Categoria pelo texto da SS'),H('SS'),H('%')],
 [C('Queimado'),C('89',{align:'right'}),C('79%',{align:'right'})],
 [C('Avariado',Z),C('23',{align:'right',fill:{color:ZEBRA}}),C('21%',{align:'right',fill:{color:ZEBRA}})],
 [C('Total',{bold:true}),C('112',{align:'right',bold:true}),C('100%',{align:'right',bold:true})],
],{x:0.55,y:4.1,w:5.6,colW:[3.6,1.0,1.0]});
bullets(s,[
 'Em nenhum dos 112 a leitura do texto aponta causa diferente de falha do próprio transformador.',
 'Troca comprovada pela série significa que o número de série do transformador retirado é diferente do instalado — a substituição de fato ocorreu. Vale para 81 dos 112. Nos outros 31 o texto descreve a falha, mas as séries não comprovam a troca.'
],{x:6.6,y:4.1,w:6.15,h:1.8});
s.addNotes('82 sem interrupção, 30 fora da janela. 89 queimado, 23 avariado. 81 com prova de troca, 31 sem.');

// ===== 6. O NUCLEO =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'O núcleo do problema: 81 casos com a troca comprovada','A série retirada difere da instalada — a substituição está documentada. Falta apenas a interrupção registrada dentro da janela de 24 horas.');
s.addChart(pres.ChartType.bar,[
 {name:'Troca comprovada pela série',labels:['Sem interrupção registrada','Fora da janela de 24 h'],values:[56,25]},
 {name:'Sem comprovação',labels:['Sem interrupção registrada','Fora da janela de 24 h'],values:[26,5]}],
 Object.assign({},CH,{x:0.5,y:1.55,w:6.4,h:4.4,barDir:'col',barGrouping:'stacked',chartColors:[NAVY,LGRAY],dataLabelPosition:'ctr',dataLabelColor:'FFFFFF',dataLabelFontBold:true,
  showLegend:true,legendPos:'b',barGapWidthPct:70,valAxisMinVal:0,valAxisMaxVal:90,valAxisMajorUnit:15}));
tabela(s,[
 [H('Os 81 com a troca comprovada'),H('SS')],
 [C('Sem interrupção registrada'),C('56',{align:'right'})],
 [C('Fora da janela de 24 h',Z),C('25',{align:'right',fill:{color:ZEBRA}})],
 [C('Descritos como queimado'),C('65',{align:'right'})],
 [C('Descritos como avariado',Z),C('16',{align:'right',fill:{color:ZEBRA}})],
 [C('Participação no grupo pendente',{bold:true}),C('72%',{align:'right',bold:true})],
],{x:7.3,y:1.6,w:5.45,colW:[4.35,1.1]});
txt(s,'Por que isso importa',{x:7.3,y:3.85,w:5.45,h:0.3,fontSize:13,bold:true,color:NAVY,valign:'middle'});
bullets(s,[
 'São 81 transformadores em que a série retirada difere da instalada — a substituição ocorreu — e o laudo de campo descreve queima ou avaria.',
 'Se a interrupção for localizada, voltam ao indicador — e o indicador do período muda.',
 'Nos outros 31 o texto também descreve falha, mas as séries retirada e instalada não comprovam a substituição — é o grupo mais frágil.'
],{x:7.3,y:4.2,w:5.45,h:1.8});
s.addNotes('81 de 112 com prova de troca: 56 sem interrupção + 25 fora da janela; 65 queimados + 16 avariados.');

// ===== 7. CONCENTRACAO =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'A pendência está concentrada no início do ano','Janeiro a abril respondem por 90 dos 112 casos em aberto — 80% do total.');
s.addChart(pres.ChartType.bar,[
 {name:'Expurgos no mês',labels:['jan','fev','mar','abr','mai','jun','jul','ago'],values:[47,35,34,31,16,28,13,23]},
 {name:'Aguardando o COPO',labels:['jan','fev','mar','abr','mai','jun','jul','ago'],values:[23,24,24,19,7,9,0,6]}],
 Object.assign({},CH,{x:0.5,y:1.55,w:8.0,h:4.4,barDir:'col',barGrouping:'clustered',chartColors:[LGRAY,NAVY],dataLabelPosition:'outEnd',dataLabelFontSize:10,
  showLegend:true,legendPos:'b',barGapWidthPct:60,valAxisMinVal:0,valAxisMaxVal:50,valAxisMajorUnit:10}));
txt(s,'Leitura',{x:8.9,y:1.6,w:3.9,h:0.3,fontSize:13,bold:true,color:NAVY,valign:'middle'});
bullets(s,[
 {text:[{text:'Janeiro a abril: 90 pendentes. ',options:{bold:true}},{text:'Em fevereiro e março a pendência alcança 7 de cada 10 expurgos do mês.'}]},
 {text:[{text:'Maio, junho e agosto: 22 pendentes. ',options:{bold:true}},{text:'Um terço dos 67 expurgos desses meses — metade da proporção do primeiro quadrimestre.'}]},
 {text:[{text:'Julho não entra na comparação. ',options:{bold:true,color:ORANGE}},{text:'A Crítica do mês se perdeu; os 13 expurgos foram lidos só pelo texto, sem conferência de interrupção. O zero é ausência de teste, não ausência de caso.'}]}
],{x:8.9,y:1.95,w:3.9,h:4.0,fontSize:12,bullet:false});
s.addNotes('jan 23/47, fev 24/35, mar 24/34, abr 19/31, mai 7/16, jun 9/28, ago 6/23. Julho 0/13 porque a Crítica de julho se perdeu — não comparar.');

// ===== 8. O PEDIDO =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'O que precisamos do COPO','Três respostas fecham os 112 casos e encerram o ciclo de janeiro a agosto.');
tabela(s,[
 [H('#'),H('Pedido'),H('Detalhe'),H('Casos')],
 [C('1',{bold:true,align:'center'}),C('Confirmar as 82 sem interrupção na Crítica',{bold:true}),C('Para cada SS sem interrupção registrada na Crítica, dizer se houve interrupção não registrada ou se o evento realmente não existiu. É o maior bloco e destrava 56 casos com troca provada.',{fontSize:11}),C('82',{align:'right'})],
 [C('2',{bold:true,align:'center',fill:{color:ZEBRA}}),C('Avaliar as 30 fora da janela de 24 h',{bold:true,fill:{color:ZEBRA}}),C('A interrupção existe, mas fora da janela de 24 horas da SS. Verificar se a janela deve ser ajustada ou se o vínculo entre a ocorrência e a solicitação é outro.',{fontSize:11,fill:{color:ZEBRA}}),C('30',{align:'right',fill:{color:ZEBRA}})],
 [C('3',{bold:true,align:'center'}),C('Priorizar janeiro a abril',{bold:true}),C('Concentram 90 dos 112 casos. Fechar esses quatro meses resolve 80% da pendência e permite congelar o resultado do primeiro quadrimestre.',{fontSize:11}),C('90',{align:'right'})],
],{x:0.55,y:1.55,w:12.2,colW:[0.5,3.0,7.7,1.0],rowH:0.85});
txt(s,'Enquanto as três respostas não chegam, os 112 permanecem retidos — fora do indicador, mas reversíveis.',{x:0.55,y:5.4,w:12.2,h:0.4,fontSize:12.5,italic:true,color:GRAY,valign:'middle'});
s.addNotes('Três pedidos: confirmar as 82 ausências, avaliar as 30 fora da janela, priorizar jan-abr.');

// ===== 9. FECHAMENTO =====
s=pres.addSlide(); s.background={path:P+'image3.png'};
txt(s,'Obrigado',{x:0.9,y:0.85,w:11.5,h:0.8,fontSize:36,bold:true,color:NAVY,valign:'middle'});
txt(s,'Squad Equipamentos Especiais  ·  Expurgos de janeiro a agosto de 2026',{x:0.9,y:1.68,w:11.5,h:0.4,fontSize:14,color:GRAY,valign:'middle'});
s.addNotes('Fechamento.');

pres.writeFile({fileName:__dirname+'/out/Expurgos_Jan_Ago_2026.pptx'}).then(f=>console.log('gerado:',f));
