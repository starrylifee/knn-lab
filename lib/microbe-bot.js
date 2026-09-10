'use strict';
/* 컴퓨터 상대. 사람과 같은 규칙(apply)으로만 움직이며 K·후보·카드를 고를 수 없다. uid는 'bot'. */
const E=require('./microbe-engine');
const BOT='bot',THINK_MS=1000,WATCH_MS=9000;
const byId=Object.fromEntries(E.sites.map(s=>[s.id,s]));

/* 후보 자리·카드 조합마다 "내 색이 태어날 확률 × 점수"를 어림해 가장 좋은 수를 고른다 */
function decide(r,bi,random){
  const g=r.game,own=bi===r.redIndex?'red':'blue',turn=g.turn;
  const options=[];
  for(const site of g.candidates){
    let wins=0;for(const k of[1,3,5]){try{if(E.classify(g.board,site,k).color===own)wins++;}catch{}}
    const p=wins/3,base=1+Number(byId[site].nutrient&&turn>=7);
    for(const card of g.cards){
      const bonus=card.type==='nutrient'?1:0,pts=base+bonus;
      let value=(p*pts)-((1-p)*pts);
      if(card.type==='retry'&&p>0&&p<1)value+=(1-p)*p*pts;   // 다시 뽑을 기회의 가치
      if(card.type==='nutrient'&&p<.5)value-=.6;              // 상대 색이 나올 판에 보너스 카드 낭비 방지
      options.push({site,cardId:card.id,value:value+random(100)/400});
    }
  }
  options.sort((a,b)=>b.value-a.value);return options[0];
}
/* 방 상태를 보고 컴퓨터가 움직일 차례면 한 걸음 진행한다. 바뀐 방을 돌려준다(없으면 같은 객체). */
function act(room,random,now=Date.now(),opts={}){const watch=opts.watchMs||WATCH_MS;
  const bi=room.players.indexOf(BOT);if(bi<0)return room;
  let r=room;
  if(['waiting','between','finished'].includes(r.status)){
    if(r.ready[1-bi]&&!r.ready[bi])r=E.apply(r,BOT,{type:'ready',version:r.version},random,now);
    return r;
  }
  if(r.status!=='playing'||E.actorIndex(r)!==bi)return r;
  const g=r.game;
  if(g.phase==='choose'){if(now-r.updatedAt<THINK_MS)return r;const {site,cardId}=decide(r,bi,random);return E.apply(r,BOT,{type:'choose',version:r.version,site,cardId},random,now);}
  if(g.phase==='reveal'){
    if(now-r.updatedAt<watch)return r;   // 사람이 결과 모션을 다 볼 때까지 기다린다(2배속이면 절반)
    const p=g.pending,own=bi===r.redIndex?'red':'blue';
    if(p.card.type==='retry'&&!p.rerolled&&E.classify(g.board,p.site,p.k).color!==own)return E.apply(r,BOT,{type:'reroll',version:r.version},random,now);
    return E.apply(r,BOT,{type:'confirm',version:r.version},random,now);
  }
  return r;
}
function newBotRoom(id,uid,now){const r=E.newRoom(id,now);r.players=[uid,BOT];r.bot=true;r.seen=[now,now];return r;}
module.exports={BOT,act,decide,newBotRoom,THINK_MS,WATCH_MS};
