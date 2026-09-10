/* 게임 방법 안내: 실제 화면을 흉내 낸 그림이 단계별로 움직이며 설명한다. (js/microbe-fx.js 공용 모션 사용) */
(()=>{'use strict';
const $=id=>document.getElementById(id),F=window.MicrobeFX,{el,txt,rect,showAt,hideAt,pop,microbe}=F;
const INK=F.INK,GREEN='#287760',PURPLE=F.PURPLE,MINT='#dcefe6';
let layout=[],step=0,loop=null;

function btn(parent,x,y,w,h,label,kind='primary',size=17){const g=el('g',{},parent);rect(g,x,y,w,h,kind==='primary'?GREEN:'white',kind==='primary'?'none':'#b7c8c0',12);txt(g,label,x+w/2,y+h/2+size*.36,size,{bold:true,fill:kind==='primary'?'white':INK,anchor:'middle'});return g;}
/* 마우스 포인터: points=[[x,y,t],...] 순서대로 이동, clicks=[t,...] 시점에 클릭 효과 */
function cursor(parent,points,clicks=[]){const g=el('g',{},parent);for(const t of clicks){const p=points.filter(q=>q[2]<=t).pop();const c=el('circle',{cx:p[0],cy:p[1],r:6,fill:'none',stroke:'#dfac30','stroke-width':4,opacity:0},g);el('animate',{attributeName:'r',from:6,to:26,begin:t+'s',dur:'.5s',fill:'freeze'},c);el('animate',{attributeName:'opacity',values:'0;1;0',keyTimes:'0;.15;1',begin:t+'s',dur:'.5s',fill:'freeze'},c);}
 const arrow=el('path',{d:'M0 0 L0 22 L6 17 L10 26 L14 24 L10 15 L17 15 Z',fill:'white',stroke:INK,'stroke-width':2,'stroke-linejoin':'round',filter:'drop-shadow(0 2px 2px #0005)'},g);
 const total=points[points.length-1][2]||1;const values=points.map(p=>`${p[0]} ${p[1]}`).join(';'),keyTimes=points.map(p=>(p[2]/total).toFixed(3)).join(';');
 el('animateTransform',{attributeName:'transform',type:'translate',values,keyTimes,dur:total+'s',fill:'freeze',calcMode:'spline',keySplines:points.slice(1).map(()=>'.4 0 .2 1').join(';')},arrow);return g;}
function scene(){const s=el('svg',{viewBox:'0 0 640 360',role:'img'});rect(s,0,0,640,360,'#fffcf5','none',0);return s;}
function statusBar(parent,y,text){const g=el('g',{},parent);rect(g,20,y,600,44,MINT,'none',12);txt(g,text,320,y+29,18,{bold:true,anchor:'middle'});return g;}
function panel(s,title){const p=el('g',{},s);rect(p,380,30,240,300,'white','#d5dfd7',18);if(title)txt(p,title,400,64,20,{bold:true});return p;}

/* 실제 게임판과 같은 좌표(mm)로 그린 미니 게임판 */
function board(parent,ox,oy,size,o){const scale=size/222,g=el('g',{transform:`translate(${ox} ${oy}) scale(${scale}) translate(-37 -47)`},parent);el('circle',{cx:148,cy:158,r:108,fill:'#fffdf7',stroke:'#95b5a3','stroke-width':1},g);const sites={};
 for(const s of layout){const cand=o.candidates?.includes(s.id),grp=el('g',{},g);sites[s.id]=grp;
  if(cand){const c=el('circle',{cx:s.x,cy:s.y,r:10.4,fill:'#ecdefb',stroke:'#a185c2','stroke-width':.4},grp);if(o.pulse)el('animate',{attributeName:'r',values:'10.4;12.5;10.4',dur:'1.2s',repeatCount:'indefinite'},c);}
  el('circle',{cx:s.x,cy:s.y,r:7.5,fill:s.nutrient?'#fff0c3':'white',stroke:s.nutrient?'#bc8b30':'#a4b8ab','stroke-width':.6},grp);
  if(o.board[s.id])microbe(grp,s,o.board[s.id]);else if(o.pending===s.id)txt(grp,'★',s.x,s.y+2.8,9,{fill:'#7757a0',anchor:'middle'});else if(s.nutrient)txt(grp,'★',s.x,s.y+2.4,7,{fill:'#b68a30',anchor:'middle'});
  txt(grp,String(s.id).padStart(2,'0'),s.x,s.y+12,5,{anchor:'middle'});}
 return {g,sites,scale,site:id=>layout.find(s=>s.id===id),toScreen:(x,y)=>[ox+(x-37)*scale,oy+(y-47)*scale]};}
const SAMPLE={5:'red',6:'blue',17:'blue',18:'red',31:'red',32:'blue',19:'red',23:'blue',13:'red',9:'blue',7:'red',26:'blue',30:'red'};
const CANDS=[25,3,28],PICK=25;
function nearest(site,n=3){return layout.filter(x=>SAMPLE[x.id]).map(x=>({...x,color:SAMPLE[x.id],d:Math.hypot(x.x-site.x,x.y-site.y)})).sort((a,c)=>a.d-c.d).slice(0,n);}
const cname=c=>c==='red'?'빨강':'파랑';

const steps=[
 {title:'방 고르기',text:'친구와 같은 번호의 방에 들어가요. 예를 들어 둘 다 3번 방!',dur:6,draw(s){
  txt(s,'실험실 15개',20,42,22,{bold:true});txt(s,'방 하나를 골라 주세요',160,42,15,{fill:'#607766'});
  for(let i=0;i<8;i++){const x=20+(i%4)*150,y=64+Math.floor(i/4)*128,g=el('g',{},s);rect(g,x,y,138,112,'white','#bfd3c8',12);txt(g,`${i+1}번 방`,x+14,y+34,20,{bold:true});txt(g,i===4?'2/2명 · 게임 중':'0/2명 · 빈방',x+14,y+62,13,{fill:i===4?'#8a9690':INK});txt(g,i===4?'게임 중':'들어가기',x+14,y+90,13,{fill:i===4?'#8a9690':GREEN,bold:true});if(i===4)rect(g,x,y,138,112,'#e9eeeb88','none',12);}
  const x=320,y=64,mine=el('g',{},s);rect(mine,x,y,138,112,'#f4effa',PURPLE,12);txt(mine,'3번 방',x+14,y+34,20,{bold:true});txt(mine,'1/2명 · 친구 기다리는 중',x+14,y+62,12);txt(mine,'내 자리',x+14,y+90,13,{fill:PURPLE,bold:true});showAt(mine,1.7,false);
  const c2=el('g',{},s);rect(c2,x+6,y+48,128,20,'#f4effa','none',4);txt(c2,'2/2명 · 게임 준비 중',x+14,y+62,12,{bold:true});showAt(c2,3.6,false);
  const bubble=el('g',{},s);rect(bubble,190,300,260,50,'#fff3d7','#e4bc58',14);txt(bubble,'친구도 3번 방에 들어왔어요!',320,331,16,{bold:true,anchor:'middle'});showAt(bubble,3.8);
  cursor(s,[[560,330,0],[390,120,1.2],[390,120,1.8],[390,120,6]],[1.6]);}},
 {title:'게임 준비',text:'두 사람 모두 "게임 준비"를 누르면 게임이 시작돼요.',dur:6,draw(s){
  const p=el('g',{},s);rect(p,140,40,360,220,'white','#d5dfd7',18);txt(p,'게임 준비',170,84,24,{bold:true});const n1=txt(p,'두 사람 다 준비해야 시작해요.',170,120,16);
  btn(p,170,150,300,52,'게임 준비');const b2=btn(p,170,150,300,52,'준비 완료','secondary');b2.setAttribute('opacity',.6);showAt(b2,1.6,false);
  const n2=txt(p,'나는 준비 완료! 상대를 기다려요.',170,120,16,{bold:true});hideAt(n1,1.6);showAt(n2,1.6,false);
  const friend=el('g',{},s);rect(friend,170,215,300,34,'#fff3d7','none',10);txt(friend,'상대도 준비 완료!  ✓',320,238,16,{bold:true,anchor:'middle'});showAt(friend,3.2);
  const st=statusBar(s,285,'게임 시작! 내 차례예요.');showAt(st,4.2);
  cursor(s,[[560,330,0],[340,178,1.1],[340,178,1.6],[340,178,6]],[1.5]);}},
 {title:'카드 고르기',text:'카드 3장 중 1장만 보여요. 보이는 카드를 쓰거나, 뒤집힌 카드를 눌러 뒤집어 봐요. 뒤집은 카드는 꼭 써야 해요!',dur:7,draw(s){
  const p=el('g',{},s);rect(p,110,18,420,326,'white','#d5dfd7',18);txt(p,'이번 차례 카드',135,54,20,{bold:true});txt(p,'보이는 카드를 쓰거나, 뒤집힌 카드를 뒤집어 봐요.',135,80,14,{fill:'#607766'});
  const X=i=>135+i*128,Y=96,W=114,H=199.5;
  el('image',{href:'img/microbe/basic.svg',x:X(0),y:Y,width:W,height:H},p);
  el('image',{href:'img/microbe/back.svg',x:X(1),y:Y,width:W,height:H},p);
  /* 3번째 카드: 뒷면이 세로축으로 접히듯 사라지고 앞면(한 번 더)이 펼쳐진다 */
  const cx=X(2)+W/2,back=el('g',{},p),front=el('g',{},p);
  el('image',{href:'img/microbe/back.svg',x:X(2),y:Y,width:W,height:H},back);el('image',{href:'img/microbe/retry.svg',x:X(2),y:Y,width:W,height:H},front);
  const flipAt=1.7;el('animateTransform',{attributeName:'transform',type:'scale',from:'1 1',to:'0 1',begin:flipAt+'s',dur:'.3s',fill:'freeze',calcMode:'spline',keySplines:'.4 0 1 1'},back);back.setAttribute('style',`transform-origin:${cx}px ${Y+H/2}px`);
  front.setAttribute('transform','scale(0 1)');front.setAttribute('style',`transform-origin:${cx}px ${Y+H/2}px`);el('animateTransform',{attributeName:'transform',type:'scale',from:'0 1',to:'1 1',begin:(flipAt+.3)+'s',dur:'.3s',fill:'freeze',calcMode:'spline',keySplines:'0 0 .6 1'},front);
  const sel=el('rect',{x:X(2)-4,y:Y-4,width:W+8,height:H+8,rx:8,fill:'none',stroke:PURPLE,'stroke-width':4},p);showAt(sel,flipAt+.6,false);
  const dim=el('g',{},p);rect(dim,X(0)-2,Y-2,W+4,H+4,'#ffffff99','none',6);rect(dim,X(1)-2,Y-2,W+4,H+4,'#ffffff99','none',6);showAt(dim,flipAt+.6,false);
  const d=el('g',{},p);rect(d,135,306,370,30,'#eef5ef','none',8);txt(d,'뒤집은 카드예요! 한 번 더 · 이 카드로 해요.',320,326,14,{bold:true,anchor:'middle'});showAt(d,flipAt+.7);
  cursor(s,[[580,330,0],[cx,200,1.2],[cx,200,flipAt,],[cx,200,7]],[flipAt-.1]);}},
 {title:'자리 고르기',text:'보라색 동그라미 3곳 중 1곳을 골라요. 여기에 새 미생물이 태어나요.',dur:6,draw(s){
  const b=board(s,30,20,320,{board:SAMPLE,candidates:CANDS,pulse:true});
  const p=panel(s,'자리 고르기');txt(p,'보라색 자리 25, 3, 28번',400,96,14);txt(p,'중에서 골라요.',400,116,14);
  CANDS.forEach((id,i)=>{btn(p,400+i*70,138,60,44,id+'번','secondary',16);if(id===PICK){const chosen=btn(p,400+i*70,138,60,44,id+'번','secondary',16);chosen.querySelector('rect').setAttribute('fill','#eee0fb');chosen.querySelector('rect').setAttribute('stroke',PURPLE);showAt(chosen,1.8,false);}});
  const site=b.site(PICK),[cx,cy]=b.toScreen(site.x,site.y);const ring=el('circle',{cx:site.x,cy:site.y,r:7.5,fill:'none',stroke:'#7753a4','stroke-width':2},b.sites[PICK]);showAt(ring,1.8,false);
  const note=el('g',{},p);rect(note,400,250,200,60,'#fff3d7','#e4bc58',14);txt(note,'25번 자리를 골랐어요!',500,278,16,{bold:true,anchor:'middle'});txt(note,'다음은 K 뽑기',500,298,13,{anchor:'middle'});showAt(note,2);
  cursor(s,[[580,330,0],[cx+2,cy+2,1.2],[cx+2,cy+2,1.8],[cx+2,cy+2,6]],[1.7]);}},
 {title:'K 뽑기',text:'K를 뽑아요. K는 1, 3, 5 중 하나! "가까운 미생물 몇 마리에게 물어볼까?"를 정하는 수예요.',dur:7,draw(s){
  board(s,30,20,320,{board:SAMPLE,pending:PICK});
  const p=panel(s);btn(p,400,50,200,48,'이대로! K 뽑기','primary',16);const cover=btn(p,400,50,200,48,'뽑는 중…','secondary',16);showAt(cover,1.3,false);hideAt(cover,2.7);
  F.dice(p,468,116,64,3,{begin:1.3});
  const chips=el('g',{},p);[['K=1','1마리에게'],['K=3','3마리에게'],['K=5','5마리에게']].forEach(([k,d],i)=>{const x=400+i*68,g=el('g',{},chips);rect(g,x,198,60,52,i===1?'#eee0fb':'#f4f7f4',i===1?PURPLE:'#d5dfd7',10);txt(g,k,x+30,220,15,{bold:true,fill:i===1?PURPLE:INK,anchor:'middle'});txt(g,d,x+30,240,11,{anchor:'middle'});});showAt(chips,3.0);
  const note=el('g',{},p);rect(note,400,266,200,48,'#fff3d7','none',10);txt(note,'가까운 미생물 3마리에게',500,286,13,{anchor:'middle'});txt(note,'물어보기로 정해졌어요!',500,304,13,{bold:true,anchor:'middle'});showAt(note,3.4);
  cursor(s,[[580,340,0],[500,76,1.0],[500,76,1.3],[590,330,2.3],[590,330,7]],[1.2]);}},
 {title:'이웃 세기',text:'투명 관찰판의 가운데를 새 자리에 맞춰요. 가까운 미생물부터 1, 2, 3… K마리까지 세어요.',dur:7,draw(s){
  const b=board(s,30,20,320,{board:SAMPLE,pending:PICK}),site=b.site(PICK),near=nearest(site);
  F.sheet(b.g,site.x,site.y,{from:[118,-128],begin:.5,dur:1.3});
  const reach=near[2].d+4;F.scan(b.g,site.x,site.y,reach,2.4,1.8);
  const p=panel(s);txt(p,'K = 3',400,66,22,{bold:true,fill:PURPLE});txt(p,'가까운 순서로 3마리!',400,92,14);
  near.forEach((n,i)=>{const t=2.4+1.8*(n.d/reach);F.badge(b.g,n.x+7,n.y-7,i+1,t);
   const row=el('g',{},p),y=118+i*44;rect(row,400,y,200,36,i%2?'#f4f7f4':'#fffcf6','#e3e8e4',8);el('circle',{cx:418,cy:y+18,r:9,fill:F.RED},row);txt(row,String(i+1),418,y+22.5,12,{bold:true,fill:'white',anchor:'middle'});txt(row,`${n.id}번 · ${cname(n.color)} 미생물`,436,y+23,14,{bold:true});showAt(row,t);});
  const done=el('g',{},p);rect(done,400,258,200,56,'#fff3d7','none',10);txt(done,'3마리 다 셌어요!',500,282,15,{bold:true,anchor:'middle'});txt(done,'이제 투표할 차례',500,302,13,{anchor:'middle'});showAt(done,4.6);
  const [hx,hy]=b.toScreen(site.x+118,site.y-128),[sx,sy]=b.toScreen(site.x,site.y);cursor(s,[[hx,hy,0],[hx,hy,.5],[sx,sy,1.8],[590,330,2.6],[590,330,7]]);}},
 {title:'투표하기',text:'세어 둔 K마리가 한 표씩 투표해요. 많은 색이 이겨요! 빨강 2표, 파랑 1표 → 빨강 미생물이 태어나요.',dur:7,draw(s){
  const b=board(s,30,20,320,{board:SAMPLE,pending:PICK}),site=b.site(PICK),near=nearest(site);
  F.sheet(b.g,site.x,site.y).setAttribute('opacity',.55);near.forEach((n,i)=>F.badge(b.g,n.x+7,n.y-7,i+1,0));
  const p=panel(s);txt(p,'투표함',500,64,20,{bold:true,anchor:'middle'});const box=el('g',{},p);rect(box,430,82,140,70,'#f4f7f4','#8a9690',12);rect(box,455,74,90,12,'#8a9690','none',4);
  let red=0,blue=0;const tallies=[[0,0]];near.forEach(n=>{if(n.color==='red')red++;else blue++;tallies.push([red,blue]);});
  tallies.forEach(([r,bl],i)=>{const t=txt(p,`빨강 ${r}표 : 파랑 ${bl}표`,500,190,20,{bold:true,anchor:'middle'});if(i>0)showAt(t,.6+i*.9+.75,false);if(i<tallies.length-1)hideAt(t,.6+(i+1)*.9+.75);});
  near.forEach((n,i)=>F.ballot(s,b.toScreen(n.x,n.y),[500,117],n.color,.6+i*.9,1,.8));
  const w=cname(red>blue?'red':'blue');const win=el('g',{},p);rect(win,400,212,200,44,red>blue?'#fde3df':'#dcecf5','none',10);txt(win,`${w}이 더 많아요 → ${w} 승리!`,500,240,15,{bold:true,anchor:'middle'});showAt(win,3.6);
  const born=el('g',{},b.g);el('circle',{cx:site.x,cy:site.y,r:7.5,fill:'white'},born);microbe(born,site,red>blue?'red':'blue');pop(born,4.4);
  const res=el('g',{},p);rect(res,400,268,200,48,'#fff3d7','none',10);txt(res,`${w} 미생물 탄생! +1점`,500,298,17,{bold:true,anchor:'middle'});showAt(res,4.6);}},
 {title:'점수와 승리',text:'태어난 색이 점수를 얻어요. 12번 하면 1판 끝! 색을 바꿔 2판을 하고, 두 판 점수를 더해 많은 사람이 이겨요.',dur:8,draw(s){
  const score=(g,x,y,who,color,pts)=>{rect(g,x,y,290,80,'white',color==='red'?'#e6a09b':'#92c7df',16);txt(g,`${who} · ${cname(color)}`,x+20,y+48,18);txt(g,pts+'점',x+270,y+54,32,{bold:true,anchor:'end'});};
  txt(s,'1/2판 · 12/12차례',20,40,20,{bold:true});const s1=el('g',{},s);score(s1,20,60,'나','red',5);score(s1,330,60,'상대','blue',4);
  const st=statusBar(s,160,'1판 끝! 이번엔 색을 바꿔서 2판을 해요.');showAt(st,1.6);
  const cover=rect(s,15,20,300,30,'#fffcf5','none',0);cover.setAttribute('opacity',0);el('set',{attributeName:'opacity',to:1,begin:'3.2s',fill:'freeze'},cover);const lab2=txt(s,'2/2판 · 1/12차례',20,40,20,{bold:true});showAt(lab2,3.2,false);
  const s2=el('g',{},s);score(s2,20,60,'나','blue',0);score(s2,330,60,'상대','red',0);showAt(s2,3.2,false);
  const st2=statusBar(s,160,'2판 시작! 이번엔 상대가 먼저 해요.');showAt(st2,3.4,false);
  const tot=el('g',{},s);rect(tot,20,230,600,100,'#fff3d7','#e4bc58',16);txt(tot,'두 판 점수를 더하면',320,268,16,{anchor:'middle'});txt(tot,'나 5+6 = 11점   상대 4+5 = 9점  →  내가 이겼어요!',320,304,20,{bold:true,anchor:'middle'});showAt(tot,5.4);}},
 {title:'점수 더 얻기',text:'금색(★) 자리는 7번째 차례부터 2점, 영양분 카드는 1점 더, "한 번 더" 카드는 K를 한 번 더 뽑을 수 있어요.',dur:7,draw(s){
  const tile=(i,head,body)=>{const x=20+i*205,g=el('g',{},s);rect(g,x,20,190,320,'white','#d5dfd7',18);txt(g,head,x+95,56,19,{bold:true,anchor:'middle'});body.forEach((t,j)=>txt(g,t,x+95,270+j*24,14,{anchor:'middle'}));showAt(g,.4+i*1.4);return [g,x];};
  const [g1,x1]=tile(0,'금색 ★ 자리',['7번째 차례부터','여기에 태어나면 2점!']);el('circle',{cx:x1+95,cy:150,r:52,fill:'#fff0c3',stroke:'#bc8b30','stroke-width':4},g1);txt(g1,'★',x1+95,170,56,{fill:'#b68a30',anchor:'middle'});const badge=el('g',{},g1);el('circle',{cx:x1+150,cy:110,r:26,fill:F.RED},badge);txt(badge,'2점',x1+150,118,18,{bold:true,fill:'white',anchor:'middle'});pop(badge,1.6);
  const [g2,x2]=tile(1,'영양분 발견 카드',['태어난 색이','1점을 더 받아요']);el('image',{href:'img/microbe/nutrient.svg',x:x2+45,y:72,width:100,height:175},g2);const b2=el('g',{},g2);el('circle',{cx:x2+150,cy:110,r:26,fill:GREEN},b2);txt(b2,'+1',x2+150,119,20,{bold:true,fill:'white',anchor:'middle'});pop(b2,3.0);
  const [g3,x3]=tile(2,'한 번 더 카드',['K 결과가 별로면','딱 한 번 더 뽑아요']);el('image',{href:'img/microbe/retry.svg',x:x3+45,y:72,width:100,height:175},g3);const k1=el('g',{},g3);rect(k1,x3+120,86,56,44,'#fff3d7','none',10);txt(k1,'K=1',x3+148,116,20,{bold:true,fill:PURPLE,anchor:'middle'});pop(k1,4.2);const arrow=txt(g3,'↓',x3+148,166,26,{bold:true,fill:PURPLE,anchor:'middle'});showAt(arrow,4.9,false);const k5=el('g',{},g3);rect(k5,x3+120,176,56,44,'#eee0fb',PURPLE,10);txt(k5,'K=5',x3+148,206,20,{bold:true,fill:PURPLE,anchor:'middle'});pop(k5,5.4);}},
];

function renderStep(){const st=steps[step];$('howto-title').textContent=`${step+1}단계 · ${st.title}`;$('howto-text').textContent=st.text;
 document.querySelectorAll('#howto-dots button').forEach((b,i)=>{b.classList.toggle('on',i===step);b.setAttribute('aria-current',i===step?'step':'false');});
 $('howto-prev').disabled=step===0;$('howto-next').textContent=step===steps.length-1?'다 봤어요!':'다음 ▶';
 play();}
/* 한 단계 모션을 다 보여 주면 화면을 잠깐 어둡게 전환했다가 처음부터 다시 튼다(무한 반복). 안내는 기본 2배속 */
function play(){clearTimeout(loop);const stage=$('howto-stage');stage.classList.remove('fade');stage.replaceChildren();const s=F.run('howto',()=>{const s=scene();steps[step].draw(s);return s;});stage.append(s);try{s.setCurrentTime(0);}catch{}
 loop=setTimeout(()=>{if(!$('howto').open)return;stage.classList.add('fade');loop=setTimeout(()=>{if($('howto').open)play();},450);},(steps[step].dur*1000+900)/F.getSpeed('howto'));}
function go(n){step=Math.max(0,Math.min(steps.length-1,n));renderStep();}
function open(){if(!layout.length)return;$('howto').showModal();go(0);localStorage.setItem('knn-microbe-howto','1');}
function close(){clearTimeout(loop);$('howto').close();}
function init(){const dots=$('howto-dots');steps.forEach((st,i)=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.innerHTML=`<b>${i+1}</b><span>${st.title}</span>`;b.onclick=()=>go(i);dots.append(b);});
 $('howto-prev').onclick=()=>go(step-1);$('howto-next').onclick=()=>step===steps.length-1?close():go(step+1);$('howto-close').onclick=close;$('howto-replay').onclick=play;
 $('howto').addEventListener('close',()=>clearTimeout(loop));$('howto').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||(e.key==='Enter'&&e.target.tagName!=='BUTTON')){e.preventDefault();go(step+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(step-1);}});
 document.querySelectorAll('.howto-open').forEach(b=>b.onclick=open);F.bindSpeedButtons();}
fetch('js/microbe-layout.json').then(r=>r.json()).then(d=>{layout=d.sites;init();
 /* 처음 온 학생에게는 방 목록 화면에서 한 번 자동으로 보여 준다 */
 if(!localStorage.getItem('knn-microbe-howto')&&!localStorage.getItem('knn-microbe-room'))setTimeout(()=>{if(!$('lobby').hidden)open();},900);
}).catch(()=>{});
})();
