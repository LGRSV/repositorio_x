const pptxgen = require('pptxgenjs');
const P = __dirname + '/unpacked/ppt/media/';
const IC = __dirname + '/icons/';
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Squad Equipamentos Especiais';
pres.title  = 'Expurgos de Transformadores — Jan a Ago 2026';

const NAVY='1F1F4C', ORANGE='F37021', ORANGE2='D9541E', TEAL='08A2BB', GREEN='44B986', LIME='8DD645';
const GRAY='5B5B6B', CARD='F6F7FA', TINT='FDF1E9', LINE='E6E8EF';
const HF='Arial', BF='Calibri';
const BGC={path:P+'image2.png'};

function titulo(s,t,sub){
  s.addText(t,{x:0.55,y:0.34,w:12.2,h:0.62,fontFace:HF,fontSize:30,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
  if(sub) s.addText(sub,{x:0.55,y:1.00,w:12.2,h:0.34,fontFace:BF,fontSize:14,color:GRAY,isTextBox:true,margin:0,valign:'middle'});
}
function card(s,x,y,w,h,fill){
  s.addShape(pres.ShapeType.roundRect,{x,y,w,h,rectRadius:0.1,fill:{color:fill||CARD},line:{color:LINE,width:0.5},
    shadow:{type:'outer',blur:7,offset:2,angle:90,color:'1F1F4C',opacity:0.10}});
}
function ico(s,name,x,y,d,color){
  s.addShape(pres.ShapeType.ellipse,{x,y,w:d,h:d,fill:{color}});
  const k=d*0.5; s.addImage({path:IC+name+'.png',x:x+(d-k)/2,y:y+(d-k)/2,w:k,h:k});
}
function txt(s,t,o){ s.addText(t,Object.assign({isTextBox:true,margin:0},o)); }

// ===== 1. CAPA =====
let s=pres.addSlide(); s.background={path:P+'image1.png'};
txt(s,'Expurgos de Transformadores',{x:8.0,y:3.32,w:4.95,h:0.96,fontFace:HF,fontSize:29,bold:true,color:NAVY,valign:'top'});
txt(s,'Janeiro a agosto de 2026',{x:8.0,y:4.34,w:4.95,h:0.34,fontFace:HF,fontSize:16,bold:true,color:TEAL,valign:'middle'});
txt(s,'Squad Equipamentos Especiais',{x:8.0,y:4.74,w:4.95,h:0.3,fontFace:BF,fontSize:11.5,color:GRAY,valign:'top'});
s.addNotes('Base: 227 SS expurgadas de janeiro a agosto de 2026. Metade ainda depende de análise do COPO.');

// ===== 2. A MENSAGEM =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'Metade dos expurgos ainda não fechou','Das 227 solicitações retiradas do indicador, 112 aguardam explicação do COPO sobre a falta de registro de interrupção.');
card(s,0.55,1.55,4.5,4.45);
s.addChart(pres.ChartType.doughnut,[{name:'Expurgos',labels:['Com decisão fechada','Aguardando o COPO'],values:[115,112]}],
 {x:0.7,y:1.7,w:4.2,h:4.15,holeSize:62,chartColors:[GREEN,ORANGE],showLegend:false,showLabel:false,showValue:false,showPercent:false,showTitle:false,
  dataBorder:{pt:2,color:'FFFFFF'}});
txt(s,'227',{x:1.6,y:3.36,w:2.4,h:0.8,fontFace:HF,fontSize:44,bold:true,color:NAVY,align:'center',valign:'middle'});
txt(s,'expurgos',{x:1.6,y:4.12,w:2.4,h:0.3,fontFace:BF,fontSize:12,color:GRAY,align:'center',valign:'top'});
const st=[{ic:'FaCheckCircle',c:GREEN,n:'115',l:'Com decisão fechada',d:'Mérito técnico resolvido — não retornam ao indicador.'},
          {ic:'FaHourglassHalf',c:ORANGE,n:'112',l:'Aguardando o COPO',d:'49% do total — retidos, mas reversíveis.'}];
st.forEach((v,i)=>{
  const y=1.55+i*1.5; card(s,5.4,y,7.38,1.32);
  ico(s,v.ic,5.72,y+0.3,0.72,v.c);
  txt(s,v.n,{x:6.7,y:y+0.18,w:1.7,h:0.96,fontFace:HF,fontSize:40,bold:true,color:v.c,valign:'middle'});
  txt(s,v.l,{x:8.45,y:y+0.28,w:4.1,h:0.36,fontFace:HF,fontSize:15,bold:true,color:NAVY,valign:'middle'});
  txt(s,v.d,{x:8.45,y:y+0.66,w:4.1,h:0.5,fontFace:BF,fontSize:11.5,color:GRAY,valign:'top'});
});
card(s,5.4,4.55,7.38,1.45,TINT);
txt(s,'O que separa os dois grupos',{x:5.75,y:4.7,w:6.8,h:0.28,fontFace:HF,fontSize:12.5,bold:true,color:ORANGE,valign:'middle'});
s.addText([
 {text:'Os 115 saíram por mérito ',options:{bold:true,color:NAVY}},
 {text:'— furto, remanejamento, preventivo, falta de documento. Decididos.',options:{color:GRAY,breakLine:true}},
 {text:'Os 112 saíram por ausência de registro ',options:{bold:true,color:NAVY}},
 {text:'— o texto descreve a falha e em 81 deles a troca está documentada, mas a Crítica não registrou a interrupção.',options:{color:GRAY}}
],{x:5.75,y:5.0,w:6.8,h:0.92,fontFace:BF,fontSize:11.5,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.16});
s.addNotes('115 decididos x 112 pendentes. Expurgo por mérito não volta; expurgo por ausência de registro volta se a prova aparecer.');

// ===== 3. MACRO CATEGORIAS =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'Como se dividem os 227 expurgos','Cinco macro categorias. A maior delas é justamente a que ainda não tem resposta.');
s.addChart(pres.ChartType.bar,[{name:'Expurgos',labels:['Não houve troca','Sem documento','Troca sem falha','Causa externa ao transformador','Sem interrupção comprovada'],values:[12,16,38,49,112]}],
 {x:0.5,y:1.62,w:7.5,h:4.35,barDir:'bar',chartColors:[NAVY,LIME,GREEN,TEAL,ORANGE],varyColors:true,
  showValue:true,dataLabelPosition:'outEnd',dataLabelFontFace:HF,dataLabelFontSize:13,dataLabelColor:NAVY,dataLabelFontBold:true,
  catAxisLabelColor:NAVY,catAxisLabelFontFace:BF,catAxisLabelFontSize:11.5,
  valAxisHidden:true,valGridLine:{style:'none'},catGridLine:{style:'none'},showLegend:false,barGapWidthPct:45,valAxisMaxVal:130});
card(s,8.35,1.62,4.43,4.35);
ico(s,'FaListUl',8.7,1.86,0.6,ORANGE);
txt(s,'A leitura',{x:9.45,y:1.86,w:3.1,h:0.6,fontFace:HF,fontSize:14,bold:true,color:NAVY,valign:'middle'});
s.addText([
 {text:'“Sem interrupção comprovada” concentra 112 dos 227 — quase metade.',options:{bold:true,color:NAVY,breakLine:true}},
 {text:'Ela reúne dois motivos: 82 SS em que a Crítica não registra defeito no ativo e 30 em que o registro existe, mas fora da janela da SS.',options:{color:GRAY,breakLine:true}},
 {text:'\nAs outras quatro categorias somam 115 e estão encerradas.',options:{bold:true,color:NAVY,breakLine:true}},
 {text:'Nelas o expurgo não depende da base de interrupção: o motivo está no próprio caso.',options:{color:GRAY}}
],{x:8.7,y:2.62,w:3.75,h:3.2,fontFace:BF,fontSize:12,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.22});
s.addNotes('112 de 227 na macro categoria pendente. As outras quatro estão fechadas.');

// ===== 4. OS 115 FECHADOS =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'Os 115 expurgos com decisão fechada','Saíram do indicador por mérito próprio. Não dependem da base de interrupção e não retornam.');
const bl=[
 {ic:'FaExclamationTriangle',t:'Causa externa ao transformador',n:49,c:TEAL,it:['Furto — 36','Abalroamento — 7','Erro de cadastro — 2','Falta de fase — 2','Dano de terceiros e trafo auxiliar — 2']},
 {ic:'FaSyncAlt',t:'Troca sem falha',n:38,c:GREEN,it:['Remanejamento — 14','Preventivo — 12','Tape e tensão — 7','Divisão de circuito — 4','Melhoria de posto — 1']},
 {ic:'FaFolderOpen',t:'Sem documento',n:16,c:LIME,it:['Sem obra — 9','Obra sem transformador — 3','Sem OS — 3','Obra sem execução — 1']},
 {ic:'FaBan',t:'Não houve troca',n:12,c:NAVY,it:['Sem troca — 11','SS duplicada — 1']}];
bl.forEach((b,i)=>{
  const li=Math.floor(i/2), alt=li===0?2.3:2.0, x=0.55+(i%2)*6.34, y=li===0?1.58:4.06;
  card(s,x,y,6.06,alt);
  ico(s,b.ic,x+0.3,y+0.3,0.72,b.c);
  txt(s,b.t,{x:x+1.22,y:y+0.3,w:3.6,h:0.72,fontFace:HF,fontSize:14,bold:true,color:NAVY,valign:'middle'});
  txt(s,String(b.n),{x:x+4.7,y:y+0.22,w:1.1,h:0.88,fontFace:HF,fontSize:34,bold:true,color:b.c,align:'right',valign:'middle'});
  s.addText(b.it.map((t,j)=>({text:t,options:{bullet:true,breakLine:j<b.it.length-1}})),
    {x:x+1.22,y:y+1.0,w:4.6,h:alt-1.12,fontFace:BF,fontSize:11,color:GRAY,isTextBox:true,margin:0,valign:'top',paraSpaceAfter:1});
});
s.addNotes('49 causa externa, 38 troca sem falha, 16 sem documento, 12 não houve troca. Total 115.');

// ===== 5. OS 112 PENDENTES =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'Os 112 que dependem do COPO','Foram expurgados por falta de registro de interrupção — não por descaracterização da falha.');
const dois=[
 {ic:'FaPowerOff',t:'Sem interrupção',n:82,c:ORANGE,d:'A Crítica não registra defeito aberto no ativo em data nenhuma do período. Sem registro, não há evento a medir.'},
 {ic:'FaRegClock',t:'Fora da janela',n:30,c:ORANGE2,d:'A Crítica registra defeito aberto no transformador, mas em data que não cabe na janela da SS.'}];
dois.forEach((b,i)=>{
  const x=0.55+i*6.34; card(s,x,1.62,6.06,1.62);
  ico(s,b.ic,x+0.3,x?1.92:1.92,0.76,b.c);
  txt(s,String(b.n),{x:x+1.24,y:1.72,w:1.4,h:0.9,fontFace:HF,fontSize:42,bold:true,color:b.c,valign:'middle'});
  txt(s,b.t,{x:x+2.7,y:1.78,w:3.1,h:0.34,fontFace:HF,fontSize:15,bold:true,color:NAVY,valign:'middle'});
  txt(s,b.d,{x:x+2.7,y:2.14,w:3.1,h:1.0,fontFace:BF,fontSize:11,color:GRAY,valign:'top',lineSpacingMultiple:1.14});
});
card(s,0.55,3.5,12.23,2.46,TINT);
txt(s,'O que o campo registrou nesses 112 casos',{x:0.95,y:3.7,w:11.4,h:0.32,fontFace:HF,fontSize:14,bold:true,color:ORANGE,valign:'middle'});
const tres=[{ic:'FaBolt',c:NAVY,n:'89',l:'descritos como QUEIMADO'},{ic:'FaExclamationTriangle',c:NAVY,n:'23',l:'descritos como AVARIADO'},{ic:'FaQuestionCircle',c:GRAY,n:'31',l:'sem prova de troca'}];
tres.forEach((v,i)=>{
  const x=1.0+i*3.92;
  ico(s,v.ic,x,4.2,0.58,v.c);
  txt(s,v.n,{x:x+0.72,y:4.1,w:1.1,h:0.78,fontFace:HF,fontSize:32,bold:true,color:NAVY,valign:'middle'});
  txt(s,v.l,{x:x+1.85,y:4.1,w:2.0,h:0.78,fontFace:BF,fontSize:12,color:GRAY,valign:'middle'});
});
txt(s,'Em nenhum dos 112 a leitura do texto aponta causa diferente de falha do próprio transformador.',{x:1.0,y:5.16,w:11.3,h:0.42,fontFace:BF,fontSize:12,italic:true,color:NAVY,valign:'middle'});
s.addNotes('82 sem interrupção, 30 fora da janela. 89 queimado, 23 avariado. 81 com prova de troca, 31 sem.');

// ===== 6. O NUCLEO =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'O núcleo do problema: 81 casos com troca provada','A série retirada difere da instalada — a substituição está documentada. Falta apenas a interrupção.');
card(s,0.55,1.62,4.5,4.34,TINT);
txt(s,'81',{x:0.9,y:1.98,w:3.8,h:1.4,fontFace:HF,fontSize:92,bold:true,color:ORANGE,valign:'middle'});
txt(s,'dos 112 pendentes têm prova de troca',{x:0.9,y:3.4,w:3.8,h:0.62,fontFace:HF,fontSize:14.5,bold:true,color:NAVY,valign:'top',lineSpacingMultiple:1.1});
// barra de proporcao
s.addShape(pres.ShapeType.roundRect,{x:0.9,y:4.22,w:3.8,h:0.34,rectRadius:0.17,fill:{color:'E4E6EE'},line:{color:'E4E6EE',width:0}});
s.addShape(pres.ShapeType.roundRect,{x:0.9,y:4.22,w:3.8*81/112,h:0.34,rectRadius:0.17,fill:{color:ORANGE},line:{color:ORANGE,width:0}});
txt(s,'81 com troca documentada',{x:0.9,y:4.62,w:2.6,h:0.26,fontFace:BF,fontSize:10.5,bold:true,color:ORANGE,valign:'top'});
txt(s,'31 sem',{x:3.5,y:4.62,w:1.2,h:0.26,fontFace:BF,fontSize:10.5,bold:true,color:GRAY,align:'right',valign:'top'});
txt(s,'Os 31 também descrevem falha no texto, mas a troca não está documentada.',{x:0.9,y:5.02,w:3.8,h:0.7,fontFace:BF,fontSize:11,color:GRAY,valign:'top',lineSpacingMultiple:1.14});
const det=[{t:'Por motivo do expurgo',a:'56 sem interrupção',b:'25 fora da janela'},{t:'Pelo que o texto descreve',a:'65 queimados',b:'16 avariados'}];
det.forEach((d,i)=>{
  const y=1.62+i*1.42; card(s,5.35,y,7.43,1.26);
  txt(s,d.t,{x:5.68,y:y+0.16,w:6.8,h:0.3,fontFace:HF,fontSize:12.5,bold:true,color:NAVY,valign:'middle'});
  txt(s,d.a,{x:5.68,y:y+0.52,w:3.3,h:0.56,fontFace:HF,fontSize:20,bold:true,color:TEAL,valign:'middle'});
  txt(s,d.b,{x:9.1,y:y+0.52,w:3.3,h:0.56,fontFace:HF,fontSize:20,bold:true,color:GREEN,valign:'middle'});
});
card(s,5.35,4.46,7.43,1.5,TINT);
ico(s,'FaCheckCircle',5.68,4.68,0.56,ORANGE);
txt(s,'Por que isso importa',{x:6.38,y:4.66,w:6.1,h:0.6,fontFace:HF,fontSize:13,bold:true,color:ORANGE,valign:'middle'});
txt(s,'São 81 transformadores comprovadamente trocados, com laudo de campo descrevendo queima ou avaria. Se a interrupção for localizada, voltam ao indicador — e o indicador do período muda.',
 {x:5.68,y:5.28,w:6.8,h:0.62,fontFace:BF,fontSize:11.5,color:GRAY,valign:'top',lineSpacingMultiple:1.14});
s.addNotes('81 de 112 com prova de troca: 56 sem interrupção + 25 fora da janela; 65 queimados + 16 avariados.');

// ===== 7. CONCENTRACAO =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'A pendência está concentrada no início do ano','Janeiro a abril respondem por 90 dos 112 casos em aberto — 80% do total.');
s.addChart([
 {type:pres.ChartType.bar,data:[{name:'Expurgos no mês',labels:['jan','fev','mar','abr','mai','jun','jul','ago'],values:[47,35,34,31,16,28,13,23]}],options:{chartColors:['C9CEDB'],barGapWidthPct:40}},
 {type:pres.ChartType.bar,data:[{name:'Aguardando COPO',labels:['jan','fev','mar','abr','mai','jun','jul','ago'],values:[23,24,24,19,7,9,0,6]}],options:{chartColors:[ORANGE],barGapWidthPct:40}}],
 {x:0.5,y:1.62,w:8.1,h:4.34,barDir:'col',barGrouping:'clustered',
  showValue:true,dataLabelPosition:'outEnd',dataLabelFontFace:HF,dataLabelFontSize:10.5,dataLabelColor:NAVY,
  catAxisLabelColor:NAVY,catAxisLabelFontFace:HF,catAxisLabelFontSize:12,catAxisLabelFontBold:true,
  valAxisHidden:true,valGridLine:{style:'none'},catGridLine:{style:'none'},
  showLegend:true,legendPos:'t',legendFontFace:BF,legendFontSize:11,legendColor:NAVY,valAxisMaxVal:56});
card(s,8.9,1.62,3.88,4.34);
ico(s,'FaCalendarAlt',9.22,1.86,0.56,ORANGE);
txt(s,'O que o gráfico mostra',{x:9.9,y:1.86,w:2.7,h:0.56,fontFace:HF,fontSize:13,bold:true,color:NAVY,valign:'middle'});
s.addText([
 {text:'Janeiro a abril: 90 pendentes',options:{bold:true,color:NAVY,breakLine:true}},
 {text:'Em fevereiro e março a pendência alcança 7 de cada 10 expurgos do mês.',options:{color:GRAY,breakLine:true}},
 {text:'\nMaio, junho e agosto: 22 pendentes',options:{bold:true,color:NAVY,breakLine:true}},
 {text:'Um terço dos 67 expurgos desses meses — metade da proporção do primeiro quadrimestre.',options:{color:GRAY,breakLine:true}},
 {text:'\nJulho não entra na comparação',options:{bold:true,color:ORANGE,breakLine:true}},
 {text:'A Crítica do mês se perdeu. Os 13 expurgos foram lidos só pelo texto, sem conferência de interrupção: o zero é ausência de teste, não ausência de caso.',options:{color:GRAY}}
],{x:9.22,y:2.58,w:3.24,h:3.3,fontFace:BF,fontSize:11,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.18});
s.addNotes('jan 23/47, fev 24/35, mar 24/34, abr 19/31, mai 7/16, jun 9/28, ago 6/23. Julho 0/13 porque a Crítica de julho se perdeu e a conferência de interrupção não rodou — não comparar.');

// ===== 8. O PEDIDO =====
s=pres.addSlide(); s.background=BGC;
titulo(s,'O que precisamos do COPO','Três respostas fecham os 112 casos e encerram o ciclo de janeiro a agosto.');
const asks=[
 {ic:'FaSearch',c:ORANGE,p:'PASSO 1',t:'Confirmar as 82 ausências',d:'Para cada SS em que a Crítica não registra defeito no ativo, dizer se houve interrupção não registrada ou se o evento realmente não existiu. É o maior bloco e destrava 56 casos com troca provada.'},
 {ic:'FaRegClock',c:TEAL,p:'PASSO 2',t:'Avaliar as 30 fora da janela',d:'A interrupção existe, mas em data que não cabe na janela da SS. Verificar se a janela deve ser ajustada ou se o vínculo entre a ocorrência e a solicitação é outro.'},
 {ic:'FaFlag',c:GREEN,p:'PASSO 3',t:'Priorizar janeiro a abril',d:'Concentram 90 dos 112 casos. Fechar esses quatro meses resolve 80% da pendência e permite congelar o resultado do primeiro quadrimestre.'}];
asks.forEach((a,i)=>{
  const y=1.62+i*1.46; card(s,0.55,y,12.23,1.3);
  ico(s,a.ic,0.92,y+0.29,0.72,a.c);
  txt(s,a.p,{x:1.92,y:y+0.14,w:2,h:0.22,fontFace:HF,fontSize:9,bold:true,color:a.c,charSpacing:2,valign:'middle'});
  txt(s,a.t,{x:1.92,y:y+0.36,w:10.5,h:0.32,fontFace:HF,fontSize:14.5,bold:true,color:NAVY,valign:'middle'});
  txt(s,a.d,{x:1.92,y:y+0.7,w:10.5,h:0.56,fontFace:BF,fontSize:11,color:GRAY,valign:'top',lineSpacingMultiple:1.12});
});
txt(s,'Enquanto as três respostas não chegam, os 112 permanecem retidos — fora do indicador, mas reversíveis.',{x:0.55,y:6.04,w:12.23,h:0.36,fontFace:BF,fontSize:12,italic:true,color:NAVY,valign:'middle'});
s.addNotes('Três pedidos: confirmar as 82 ausências, avaliar as 30 fora da janela, priorizar jan-abr.');

// ===== 9. FECHAMENTO =====
s=pres.addSlide(); s.background={path:P+'image3.png'};
txt(s,'Obrigado',{x:0.9,y:0.85,w:11.5,h:0.8,fontFace:HF,fontSize:40,bold:true,color:NAVY,valign:'middle'});
txt(s,'Squad Equipamentos Especiais  ·  Expurgos de janeiro a agosto de 2026',{x:0.9,y:1.68,w:11.5,h:0.4,fontFace:BF,fontSize:14,color:GRAY,valign:'middle'});
s.addNotes('Fechamento.');

pres.writeFile({fileName:__dirname+'/out/Expurgos_Jan_Ago_2026.pptx'}).then(f=>console.log('gerado:',f));
