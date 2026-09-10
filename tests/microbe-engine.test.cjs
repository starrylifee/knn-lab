const {test}=require('node:test');const assert=require('node:assert/strict');
const E=require('../lib/microbe-engine');
const rng=n=>n-1;
function start(){let r=E.newRoom('1',1);r.players=['alice','bob'];r=E.apply(r,'alice',{type:'ready',version:r.version},rng);assert.equal(r.status,'waiting');return E.apply(r,'bob',{type:'ready',version:r.version},rng);}
function move(r,extra={}){return {type:'choose',version:r.version,site:r.game.candidates[0],cardId:r.game.cards.find(c=>c.open).id,...extra};}
test('both players must ready; server draws 3 distinct empty candidates',()=>{const r=start();assert.equal(r.status,'playing');assert.equal(new Set(r.game.candidates).size,3);assert.ok(r.game.candidates.every(i=>!r.game.board[i]));assert.equal(Object.keys(r.game.board).length,6);});
test('nonparticipant, wrong actor, forged site/card and stale version cannot act',()=>{const r=start(),actor=r.players[E.actorIndex(r)],other=r.players.find(x=>x!==actor);assert.throws(()=>E.apply(r,'intruder',move(r),rng));assert.throws(()=>E.apply(r,other,move(r),rng));assert.throws(()=>E.apply(r,actor,move(r,{site:99}),rng));assert.throws(()=>E.apply(r,actor,move(r,{cardId:'fake'}),rng));assert.throws(()=>E.apply(r,actor,move(r,{version:-1}),rng));});
test('revealed choice is immutable and retry only works once with retry card',()=>{let r=start();const actor=r.players[E.actorIndex(r)];r.game.cards[0]={id:'test-retry',type:'retry',open:true,flipped:false};const original=structuredClone(r);r=E.apply(r,actor,move(r),rng);assert.deepEqual(original.game.pending,null);assert.throws(()=>E.apply(r,actor,move(r),rng));r=E.apply(r,actor,{type:'reroll',version:r.version},()=>0);assert.equal(r.game.pending.k,1);assert.throws(()=>E.apply(r,actor,{type:'reroll',version:r.version},rng));r=E.apply(r,actor,{type:'confirm',version:r.version},rng);assert.equal(r.game.turn,2);assert.throws(()=>E.apply(r,actor,{type:'confirm',version:r.version},rng));});
test('ordinary cards cannot reroll; clients cannot supply K or score',()=>{let r=start();const uid=r.players[E.actorIndex(r)];r.game.cards[0]={id:'b',type:'basic',open:true,flipped:false};r=E.apply(r,uid,move(r,{k:999,score:999}),()=>1);assert.equal(r.game.pending.k,3);assert.throws(()=>E.apply(r,uid,{type:'reroll',version:r.version},rng));assert.deepEqual(r.totals,[0,0]);});
test('two full boards: 24 moves, swap colors and first player, exact birth scores',()=>{let r=start();const first=r.firstIndex,red=r.redIndex;let expected=[0,0],count=0;
 for(let leg=1;leg<=2;leg++){
  for(let t=1;t<=12;t++){
   const actor=r.players[E.actorIndex(r)];r=E.apply(r,actor,move(r),rng);const p=r.game.pending;const ids=E.sites.filter(s=>r.game.board[s.id]).sort((a,b)=>{const q=E.sites.find(s=>s.id===p.site);return Math.hypot(a.x-q.x,a.y-q.y)-Math.hypot(b.x-q.x,b.y-q.y)||a.id-b.id;}).slice(0,p.k);
   const color=ids.filter(s=>r.game.board[s.id]==='red').length>p.k/2?'red':'blue';const site=E.sites.find(s=>s.id===p.site),points=1+Number(site.nutrient&&t>=7)+Number(p.card.type==='nutrient');expected[color==='red'?r.redIndex:1-r.redIndex]+=points;
   r=E.apply(r,actor,{type:'confirm',version:r.version},rng);assert.deepEqual(r.totals,expected);count++;
  }
  assert.equal(r.game.log.length,12);assert.equal(Object.keys(r.game.board).length,18);assert.equal(r.game.cards.length,0);
  if(leg===1){assert.equal(r.status,'between');r=E.apply(r,'alice',{type:'ready',version:r.version},rng);r=E.apply(r,'bob',{type:'ready',version:r.version},rng);assert.equal(r.firstIndex,1-first);assert.equal(r.redIndex,1-red);}
 }
 assert.equal(count,24);assert.equal(r.status,'finished');assert.deepEqual(r.totals,expected);
});
test('public view hides player UIDs and undealt deck; nonmembers cannot see game',()=>{const r=start(),v=E.view(r,'alice');assert.equal(v.game.deck,undefined);assert.equal(v.players,undefined);assert.equal(JSON.stringify(v).includes('bob'),false);assert.equal(E.view(r,'x').game,undefined);});
test('layout is color-mirrored, including nutrient pairs',()=>{for(const s of E.sites){const mirror=E.sites.find(t=>Math.abs(t.x-(296-s.x))<.001&&t.y===s.y);assert.ok(mirror);assert.equal(mirror.nutrient,s.nutrient);assert.equal(mirror.start,s.start?(s.start==='red'?'blue':'red'):null);}});
test('one open card and two hidden; hidden card must be flipped first, flipped card must be used, one flip per turn',()=>{
 let r=start();const actor=r.players[E.actorIndex(r)],v=E.view(r,actor);
 assert.deepEqual(v.game.cards.map(c=>c.open),[true,false,false]);assert.equal(v.game.cards[1].type,undefined);assert.equal(v.game.cards[1].hidden,true);assert.equal(v.game.cards[0].type,r.game.cards[0].type);
 assert.throws(()=>E.apply(r,actor,move(r,{cardId:r.game.cards[1].id}),rng));            // hidden card cannot be chosen directly
 assert.throws(()=>E.apply(r,actor,{type:'flip',version:r.version,cardId:r.game.cards.find(c=>c.open).id},rng)); // open card cannot be flipped
 r=E.apply(r,actor,{type:'flip',version:r.version,cardId:r.game.cards[1].id},rng);
 assert.equal(r.game.cards[1].flipped,true);assert.equal(E.view(r,actor).game.cards[1].type,r.game.cards[1].type);
 assert.throws(()=>E.apply(r,actor,{type:'flip',version:r.version,cardId:r.game.cards[2].id},rng)); // only one flip per turn
 assert.throws(()=>E.apply(r,actor,move(r),rng));                                        // open card no longer allowed
 const used=r.game.cards[1].id;r=E.apply(r,actor,move(r,{cardId:used}),rng);r=E.apply(r,actor,{type:'confirm',version:r.version},rng);
 assert.equal(r.game.flipped,null);assert.ok(!r.game.cards.some(c=>c.id===used));assert.equal(r.game.cards.filter(c=>c.open).length,1);assert.equal(r.game.cards.length,3);assert.equal(r.game.cards[2].open,false);
 const next=r.players[E.actorIndex(r)];r=E.apply(r,next,move(r),rng);r=E.apply(r,next,{type:'confirm',version:r.version},rng);assert.equal(r.game.cards.filter(c=>c.open).length,1);
});
test('rooms created before hidden cards (no open flag) are treated as first card open',()=>{
 let r=start();r.game.cards=r.game.cards.map(({id,type})=>({id,type}));const actor=r.players[E.actorIndex(r)];
 const v=E.view(r,actor);assert.deepEqual(v.game.cards.map(c=>c.open),[true,false,false]);assert.equal(v.game.cards[0].type,r.game.cards[0].type);
 r=E.apply(r,actor,{type:'choose',version:r.version,site:r.game.candidates[0],cardId:r.game.cards[0].id},rng);assert.equal(r.game.phase,'reveal');assert.equal(r.game.cards[0].open,true);
});
