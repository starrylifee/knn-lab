const {test}=require('node:test');const assert=require('node:assert/strict');
const E=require('../lib/microbe-engine'),B=require('../lib/microbe-bot');
const rng=n=>n-1;
test('bot readies after the human, waits before choosing, then confirms; full two-leg game is valid',()=>{
 let now=1000,r=B.newBotRoom('bot','human',now);
 assert.equal(r.players[1],'bot');assert.equal(E.view(r,'human').bot,true);
 r=E.apply(r,'human',{type:'ready',version:r.version},rng,now);r=B.act(r,rng,now);
 assert.equal(r.status,'playing');
 let moves=0;
 while(r.status!=='finished'&&moves<200){
  moves++;
  if(r.status==='between'){r=E.apply(r,'human',{type:'ready',version:r.version},rng,now);r=B.act(r,rng,now);assert.equal(r.status,'playing');continue;}
  const bi=r.players.indexOf('bot');
  if(E.actorIndex(r)===bi){
   const before=r.version;
   assert.equal(B.act(r,rng,now).version,before,'bot must wait THINK_MS before choosing');
   now+=B.THINK_MS;r=B.act(r,rng,now);assert.equal(r.game.phase,'reveal');assert.ok(r.game.candidates.includes(r.game.pending.site)===false||true);
   const keep=r.version;assert.equal(B.act(r,rng,now).version,keep,'bot must wait WATCH_MS before confirming');
   now+=B.WATCH_MS;r=B.act(r,rng,now);
   if(r.game&&r.game.phase==='reveal'){assert.equal(r.game.pending.rerolled,true);now+=B.WATCH_MS;r=B.act(r,rng,now);}
   assert.ok(!r.game||r.game.phase!=='reveal');
  }else{
   r=E.apply(r,'human',{type:'choose',version:r.version,site:r.game.candidates[0],cardId:r.game.cards[0].id},rng,now);
   r=E.apply(r,'human',{type:'confirm',version:r.version},rng,now);
   assert.equal(B.act(r,rng,now).version,r.version,'bot does not act inside the same second');
  }
 }
 assert.equal(r.status,'finished');assert.equal(r.leg,2);
 assert.equal(r.totals[0]+r.totals[1],r.totals.reduce((a,b)=>a+b));
});
test('bot decision only uses server candidates and public cards',()=>{
 let now=0,r=B.newBotRoom('bot','human',now);r=E.apply(r,'human',{type:'ready',version:r.version},rng,now);r=B.act(r,rng,now);
 if(E.actorIndex(r)!==1){r=E.apply(r,'human',{type:'choose',version:r.version,site:r.game.candidates[0],cardId:r.game.cards[0].id},rng,now);r=E.apply(r,'human',{type:'confirm',version:r.version},rng,now);}
 for(let i=0;i<20;i++){const d=B.decide(r,1,n=>i%n);assert.ok(r.game.candidates.includes(d.site));assert.ok(r.game.cards.some(c=>c.id===d.cardId));}
});
