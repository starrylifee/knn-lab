/* 미생물 게임 공용 모션(SVG + SMIL). 게임 화면과 "게임 방법" 안내가 함께 쓴다.
   좌표 단위는 부모 요소의 단위를 그대로 따른다(게임판 = 실물 mm). */
window.MicrobeFX=(()=>{'use strict';
const NS='http://www.w3.org/2000/svg',INK='#293e51',PURPLE='#7857a3',RED='#c34d48',FONT='"Malgun Gothic",system-ui,sans-serif';
let speed=1;try{speed=Number(localStorage.getItem('knn-microbe-speed'))||1;}catch{}
const TIMED=/^(animate|set|animateTransform)$/;
function el(tag,attrs={},parent=null,text=null){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,(TIMED.test(tag)&&(k==='begin'||k==='dur')&&typeof v==='string'&&/^[\d.]+s$/.test(v))?(parseFloat(v)/speed).toFixed(3)+'s':v);if(text!==null)n.textContent=text;if(parent)parent.append(n);return n;}
function txt(parent,t,x,y,size=16,o={}){return el('text',{x,y,'font-size':size,'font-family':FONT,'font-weight':o.bold?800:400,fill:o.fill||INK,'text-anchor':o.anchor||'start',...(o.attrs||{})},parent,t);}
function rect(parent,x,y,w,h,fill,stroke,rx=12,extra={}){return el('rect',{x,y,width:w,height:h,rx,fill,stroke:stroke||'none','stroke-width':2,...extra},parent);}
function showAt(node,t,slide=true,dist=10){node.setAttribute('opacity',0);el('set',{attributeName:'opacity',to:1,begin:t+'s',fill:'freeze'},node);if(slide)el('animateTransform',{attributeName:'transform',type:'translate',from:'0 '+dist,to:'0 0',begin:t+'s',dur:'.35s',fill:'freeze',calcMode:'spline',keySplines:'.2 .8 .2 1'},node);return node;}
function hideAt(node,t,fade=0){if(fade){el('animate',{attributeName:'opacity',to:0,begin:t+'s',dur:fade+'s',fill:'freeze'},node);}else el('set',{attributeName:'opacity',to:0,begin:t+'s',fill:'freeze'},node);return node;}
function pop(node,t){node.setAttribute('opacity',0);el('set',{attributeName:'opacity',to:1,begin:t+'s',fill:'freeze'},node);el('animateTransform',{attributeName:'transform',type:'scale',from:'0 0',to:'1 1',begin:t+'s',dur:'.45s',fill:'freeze',calcMode:'spline',keySplines:'.2 1.4 .4 1'},node);node.setAttribute('style','transform-origin:center;transform-box:fill-box');return node;}
function fly(node,from,to,t,dur=.7){el('animateTransform',{attributeName:'transform',type:'translate',from:'0 0',to:`${to[0]-from[0]} ${to[1]-from[1]}`,begin:t+'s',dur:dur+'s',fill:'freeze',calcMode:'spline',keySplines:'.3 0 .2 1'},node);return node;}
function microbe(parent,s,color){const x=s.x,y=s.y,fill=color==='red'?'#f29583':'#79bfdc',stroke=color==='red'?'#b74f48':'#347c9d';const g=el('g',{},parent);if(color==='red')el('circle',{cx:x,cy:y,r:5,fill,stroke,'stroke-width':.6},g);else el('polygon',{points:`${x},${y-5.7} ${x-5.4},${y+4.5} ${x+5.4},${y+4.5}`,fill,stroke,'stroke-width':.6},g);for(const dx of[-1.6,1.6])el('circle',{cx:x+dx,cy:y,r:.5,fill:INK},g);el('path',{d:`M ${x-1},${y+1.5} Q ${x},${y+3} ${x+1},${y+1.5}`,stroke:INK,'stroke-width':.45,fill:'none'},g);return g;}

/* 투명 이웃 관찰판(실물과 같은 10mm 간격 동심원). from=[dx,dy]에서 미끄러져 들어온다 */
function sheet(parent,cx,cy,o={}){const rings=o.rings||70,g=el('g',{transform:o.from?`translate(${o.from[0]} ${o.from[1]})`:'translate(0 0)'},parent);
 el('circle',{cx,cy,r:rings+6,fill:'#ffffffaa',stroke:'#9aa6a0','stroke-width':.8},g);for(let r=10;r<=rings;r+=10)el('circle',{cx,cy,r,fill:'none',stroke:'#e0524a','stroke-width':r%20?.35:.8,opacity:.85},g);el('path',{d:`M${cx-4} ${cy}h8M${cx} ${cy-4}v8`,stroke:RED,'stroke-width':.6},g);
 if(o.from)el('animateTransform',{attributeName:'transform',type:'translate',from:`${o.from[0]} ${o.from[1]}`,to:'0 0',begin:(o.begin||0)+'s',dur:(o.dur||1)+'s',fill:'freeze',calcMode:'spline',keySplines:'.3 0 .2 1'},g);return g;}
/* K 주사위: 굴러가다가 K에서 멈춘다 */
function dice(parent,x,y,size,k,o={}){const g=el('g',{},parent),b=o.begin||0,fs=size*.42;rect(g,x,y,size,size,'#fffcf6',PURPLE,size*.22,{'stroke-width':size*.05});
 const faces=[1,5,3,1,5,k];faces.forEach((f,i)=>{const t=txt(g,'K'+f,x+size/2,y+size*.66,fs,{bold:true,fill:PURPLE,anchor:'middle'});if(i<faces.length-1){t.setAttribute('opacity',i===0?1:0);if(i>0)el('set',{attributeName:'opacity',to:1,begin:(b+i*.22)+'s',fill:'freeze'},t);el('set',{attributeName:'opacity',to:0,begin:(b+(i+1)*.22)+'s',fill:'freeze'},t);}else{t.setAttribute('opacity',0);el('set',{attributeName:'opacity',to:1,begin:(b+i*.22)+'s',fill:'freeze'},t);}});
 el('animateTransform',{attributeName:'transform',type:'rotate',values:'0;360;720;1080',keyTimes:'0;.4;.75;1',begin:b+'s',dur:'1.2s',calcMode:'spline',keySplines:'.3 0 .7 1;.3 0 .7 1;.2 0 .2 1',fill:'freeze'},g);g.setAttribute('style','transform-origin:center;transform-box:fill-box');
 return g;}
/* 가까운 이웃부터 훑는 원 + 번호 딱지 */
function scan(parent,cx,cy,reach,begin,dur){const c=el('circle',{cx,cy,r:0,fill:'none',stroke:RED,'stroke-width':1.3,'stroke-dasharray':'2.5 1.5'},parent);el('animate',{attributeName:'r',from:0,to:reach,begin:begin+'s',dur:dur+'s',fill:'freeze'},c);return c;}
function badge(parent,x,y,n,t,r=5.2){const g=el('g',{},parent);el('circle',{cx:x,cy:y,r,fill:RED,stroke:'white','stroke-width':r*.15},g);txt(g,String(n),x,y+r*.42,r*1.25,{bold:true,fill:'white',anchor:'middle'});pop(g,t);return g;}
function ballot(parent,from,to,color,t,scale=1,dur=.7){const [x,y]=from,g=el('g',{},parent);rect(g,x-13*scale,y-9*scale,26*scale,18*scale,'white','#8a9690',4*scale,{'stroke-width':1.2*scale});el('circle',{cx:x,cy:y,r:5*scale,fill:color==='red'?'#f29583':'#79bfdc',stroke:color==='red'?'#b74f48':'#347c9d','stroke-width':scale},g);g.setAttribute('opacity',0);el('set',{attributeName:'opacity',to:1,begin:t+'s',fill:'freeze'},g);fly(g,from,to,t,dur);hideAt(g,t+dur+.05);return g;}
function pill(parent,x,y,w,h,text,fill,color,size){const g=el('g',{},parent);rect(g,x-w/2,y-h/2,w,h,fill,'none',h/2);txt(g,text,x,y+size*.36,size,{bold:true,fill:color,anchor:'middle'});return g;}

/* 실제 게임판 위 한 차례의 결과 모션. 좌표계는 게임판 viewBox(37 47 222 222). 총 길이(초)를 돌려준다 */
function playVerdict(svg,layout,v){const site=layout.find(s=>s.id===v.site),by=Object.fromEntries(layout.map(s=>[s.id,s]));
 const neighbors=v.neighbors.map(id=>({...by[id],color:v.board[id],d:Math.hypot(by[id].x-site.x,by[id].y-site.y)}));const k=v.k;try{svg.pauseAnimations();svg.setCurrentTime(0);svg.unpauseAnimations();}catch{}const overlay=el('g',{'class':'fx'},svg);
 let t=0;
 if(v.rerolled){const again=pill(overlay,148,60,70,14,'한 번 더 뽑기!',PURPLE,'white',7.5);pop(again,0);hideAt(again,1.6,.3);}
 dice(overlay,214,52,36,k,{begin:t});t+=1.5;
 sheet(overlay,site.x,site.y,{from:[232-site.x,52-site.y],begin:t,dur:1});
 const label=pill(overlay,222,98,72,11,`가까운 ${k}마리에게 물어봐요`,'#fff3d7',INK,5.4);showAt(label,t+.7);t+=1.2;
 const reach=(neighbors[neighbors.length-1]?.d||20)+4,sdur=k===1?.7:1.2;scan(overlay,site.x,site.y,reach,t,sdur);
 neighbors.forEach((n,i)=>badge(overlay,n.x+7,n.y-7,i+1,t+sdur*(n.d/reach)));t+=sdur+.3;
 const box=el('g',{},overlay);rect(box,196,232,60,34,'#f4f7f4','#8a9690',6,{'stroke-width':1});rect(box,206,229,40,5,'#8a9690','none',2);txt(box,'투표함',226,244,6,{anchor:'middle',fill:'#607766'});showAt(box,t-.2,false);
 let red=0,blue=0;const tally=[[0,0]];neighbors.forEach(n=>{if(n.color==='red')red++;else blue++;tally.push([red,blue]);});
 tally.forEach(([r,b],i)=>{const tx=txt(box,`빨강 ${r} : 파랑 ${b}`,226,259,7,{bold:true,anchor:'middle'});if(i>0)showAt(tx,t+i*.35+.55,false);if(i<tally.length-1)hideAt(tx,t+(i+1)*.35+.55);});
 neighbors.forEach((n,i)=>ballot(overlay,[n.x,n.y],[226,250],n.color,t+i*.35,.45,.6));t+=neighbors.length*.35+.5;
 const winner=v.color==='red'?'빨강':'파랑';const win=pill(overlay,226,222,64,12,`${winner} 승리!`,v.color==='red'?'#fde3df':'#dcecf5',INK,6.5);pop(win,t);
 const born=el('g',{},overlay);el('circle',{cx:site.x,cy:site.y,r:7.5,fill:site.nutrient?'#fff0c3':'white'},born);microbe(born,site,v.color);pop(born,t+.2);
 [...overlay.children].forEach(c=>{if(c!==born&&c!==win&&c!==box)hideAt(c,t+.3,.5);});
 t+=.7;const pts=pill(overlay,site.x,site.y-13,34,10,`+${v.points}점`,'#e4bc58',INK,6.5);pop(pts,t);
 if(v.card==='nutrient'){const nb=pill(overlay,site.x,site.y+15,50,10,'영양분 카드 +1 포함!','#dcefe6','#287760',5.2);pop(nb,t+.4);t+=.4;}
 if(site.nutrient&&v.points>=2){const gb=pill(overlay,site.x,site.y+(v.card==='nutrient'?26:15),44,10,'금색 자리 2점!','#fff0c3','#9a741d',5.2);pop(gb,t+.4);t+=.4;}
 if(v.card==='retry'&&!v.rerolled){const rb=pill(overlay,148,60,90,12,'마음에 안 들면 한 번 더 뽑기!',PURPLE,'white',6);pop(rb,t+.5);t+=.5;}
 return (t+1.0)/speed;}
/* 배속 버튼(.speed-toggle)들을 같은 설정으로 묶는다 */
function getSpeed(){return speed;}
function setSpeed(v){speed=v===2?2:1;try{localStorage.setItem('knn-microbe-speed',String(speed));}catch{}syncSpeedButtons();}
function syncSpeedButtons(){document.querySelectorAll('.speed-toggle').forEach(b=>{b.textContent=speed===2?'⚡ 모션 2배속':'모션 1배속';b.classList.toggle('on',speed===2);b.setAttribute('aria-pressed',String(speed===2));});}
function bindSpeedButtons(){document.querySelectorAll('.speed-toggle').forEach(b=>{b.onclick=()=>setSpeed(speed===2?1:2);});syncSpeedButtons();}
return {el,txt,rect,showAt,hideAt,pop,fly,microbe,sheet,dice,scan,badge,ballot,pill,playVerdict,getSpeed,setSpeed,bindSpeedButtons,INK,PURPLE,RED};
})();
