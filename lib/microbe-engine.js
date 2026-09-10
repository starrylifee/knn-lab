'use strict';
const sites = require('./microbe-layout.json');
const byId = Object.fromEntries(sites.map(s => [s.id, s]));
const opposite = c => c === 'red' ? 'blue' : 'red';
const ranks = Object.fromEntries(sites.map(s => [s.id, sites.filter(t => t.id !== s.id).sort((a,b) =>
  ((a.x-s.x)**2+(a.y-s.y)**2)-((b.x-s.x)**2+(b.y-s.y)**2) || a.id-b.id).map(t=>t.id)]));
function fail(message) { throw Object.assign(new Error(message), {status:409}); }
function shuffled(list, random) { const a=[...list]; for(let i=a.length-1;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a; }
function classify(board, site, k) {
  if(!byId[site] || ![1,3,5].includes(k)) fail('잘못된 자리 또는 K입니다.');
  const neighbors=ranks[site].filter(i=>board[i]).slice(0,k);
  if(neighbors.length!==k) fail('이웃 수가 부족합니다.');
  const color=neighbors.filter(i=>board[i]==='red').length>k/2?'red':'blue';
  return {color,neighbors,k};
}
function newRoom(id, now) { return {id,version:0,players:['',''],ready:[false,false],seen:[0,0],status:'waiting',leg:0,totals:[0,0],createdAt:now,updatedAt:now}; }
function startLeg(room, random) {
  if(room.leg===0){room.firstIndex=random(2);room.redIndex=random(2);room.totals=[0,0];}
  else {room.firstIndex=1-room.firstIndex;room.redIndex=1-room.redIndex;}
  room.leg++;room.ready=[false,false];room.status='playing';
  const deck=shuffled(['basic','nutrient','retry'].flatMap(t=>Array.from({length:4},(_,i)=>({id:`${room.leg}-${t}-${i}`,type:t}))),random);
  room.game={turn:1,phase:'choose',board:Object.fromEntries(sites.filter(s=>s.start).map(s=>[s.id,s.start])),cards:deck.splice(0,3),deck,score:{red:0,blue:0},log:[],pending:null};
  drawCandidates(room.game,random);
}
function drawCandidates(g,random){g.candidates=shuffled(sites.filter(s=>!g.board[s.id]).map(s=>s.id),random).slice(0,3);}
function actorIndex(r){return r.game.turn%2===1?r.firstIndex:1-r.firstIndex;}
function settle(r,random){
  const g=r.game,p=g.pending,verdict=classify(g.board,p.site,p.k);
  const points=1+Number(byId[p.site].nutrient&&g.turn>=7)+Number(p.card.type==='nutrient');
  const owner=verdict.color==='red'?r.redIndex:1-r.redIndex;
  g.board[p.site]=verdict.color;g.score[verdict.color]+=points;r.totals[owner]+=points;
  g.log.push({turn:g.turn,playerIndex:actorIndex(r),site:p.site,card:p.card.type,k:p.k,firstK:p.firstK,rerolled:p.rerolled,...verdict,points,ownerIndex:owner});
  g.cards=g.cards.filter(c=>c.id!==p.card.id);if(g.deck.length)g.cards.push(g.deck.shift());
  g.pending=null;
  if(g.turn===12){g.phase='complete';g.candidates=[];r.status=r.leg===1?'between':'finished';r.ready=[false,false];if(r.status==='finished')r.winnerIndex=r.totals[0]===r.totals[1]?null:r.totals[0]>r.totals[1]?0:1;}
  else {g.turn++;g.phase='choose';drawCandidates(g,random);}
}
function apply(room,uid,action,random,now=Date.now()){
  const r=structuredClone(room),me=r.players.indexOf(uid);
  if(me<0)fail('이 방의 참가자가 아닙니다.');
  if(action.version!==r.version)fail('화면이 새로 바뀌었어요. 다시 골라 주세요.');
  if(action.type==='ready'){
    if(!['waiting','between','finished'].includes(r.status)||!r.players.every(Boolean))fail('두 명이 다 들어온 다음 준비할 수 있어요.');
    r.ready[me]=true;if(r.ready.every(Boolean)){if(r.status==='finished'){r.leg=0;delete r.finishReason;delete r.winnerIndex;}startLeg(r,random);}
  } else if(action.type==='surrender'){
    if(!['playing','between'].includes(r.status))fail('지금 하는 게임이 없어요.');
    r.status='finished';r.winnerIndex=1-me;r.finishReason='surrender';r.ready=[false,false];
  } else {
    if(r.status!=='playing'||actorIndex(r)!==me)fail('지금은 내 차례가 아니에요.');
    const g=r.game;
    if(action.type==='choose'){
      if(g.phase!=='choose'||!Number.isInteger(action.site)||!g.candidates.includes(action.site)||g.board[action.site])fail('보라색 자리 3곳 중에서 골라 주세요.');
      const card=g.cards.find(c=>c.id===action.cardId);if(!card)fail('공개된 카드를 골라 주세요.');
      const k=[1,3,5][random(3)];g.pending={site:action.site,card,k,firstK:k,rerolled:false};g.phase='reveal';
    } else if(action.type==='reroll'){
      if(g.phase!=='reveal'||!g.pending||g.pending.card.type!=='retry'||g.pending.rerolled)fail('한 번 더 뽑기는 한 번만 할 수 있어요.');
      g.pending.k=[1,3,5][random(3)];g.pending.rerolled=true;
      // Second result remains visible before confirm, but cannot be changed again.
    } else if(action.type==='confirm'){
      if(g.phase!=='reveal'||!g.pending)fail('먼저 K를 뽑아 주세요.');settle(r,random);
    } else fail('알 수 없는 동작입니다.');
  }
  r.version++;r.updatedAt=now;r.seen[me]=now;return r;
}
function view(r,uid){
  const me=r.players.indexOf(uid),v={id:r.id,version:r.version,status:r.status,seats:r.players.map(Boolean),ready:r.ready,leg:r.leg,totals:r.totals,me,winnerIndex:r.winnerIndex??null,finishReason:r.finishReason||null,firstIndex:r.firstIndex??null,redIndex:r.redIndex??null,seen:r.seen,bot:!!r.bot};
  if(me>=0&&r.game){const {deck,...game}=r.game;v.game=structuredClone(game);v.game.deckCount=deck.length;v.actorIndex=actorIndex(r);if(game.pending)v.game.verdict=classify(game.board,game.pending.site,game.pending.k);}
  return v;
}
module.exports={sites,ranks,newRoom,apply,view,classify,actorIndex};
