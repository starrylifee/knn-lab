// Integration test against the local API and the real, isolated empty room.
const assert=require('node:assert/strict');const fs=require('node:fs');
const root=process.env.MICROBE_API_URL||'http://127.0.0.1:8788/api/microbe';const key='AIzaSyDfKrNrOLHwEZzP0YlkIlXxAC_5Ph7Duaw';
const users=[];let room;
async function call(u,type,data={}){const r=await fetch(root+(type==='get'?(data.room?'?room='+data.room:''):''),{method:type==='get'?'GET':'POST',headers:{Authorization:'Bearer '+u.idToken,'Content-Type':'application/json','X-Microbe-Access':process.env.MICROBE_ACCESS_CODE||''},...(type==='get'?{}:{body:JSON.stringify({type,...data})})});const body=await r.json();return {status:r.status,body};}
(async()=>{try{
 for(let i=0;i<3;i++){const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});const u=await r.json();assert.ok(u.idToken);users.push(u);}
 const lobby=await call(users[0],'get');assert.equal(lobby.status,200,JSON.stringify(lobby.body));assert.equal(lobby.body.rooms.length,15);room=[...lobby.body.rooms].reverse().find(r=>r.count===0).id;
 const first=await call(users[0],'join',{room});assert.equal(first.status,200);const second=await call(users[1],'join',{room});assert.equal(second.status,200);
 assert.equal((await call(users[2],'join',{room})).status,409);assert.equal((await call(users[2],'get',{room})).status,403);
 let r=second.body;
 const ready=await Promise.all(users.slice(0,2).map(u=>call(u,'ready',{room,version:r.version})));assert.ok(ready.every(x=>x.status===200));r=(await call(users[0],'get',{room})).body;assert.equal(r.status,'playing');
 let turns=0,rerolls=0;
 while(r.status!=='finished'){
  if(r.status==='between'){const rr=await Promise.all(users.slice(0,2).map(u=>call(u,'ready',{room,version:r.version})));assert.ok(rr.every(x=>x.status===200));r=(await call(users[0],'get',{room})).body;continue;}
  const actor=r.actorIndex,other=1-actor;const data={room,version:r.version,site:r.game.candidates[0],cardId:r.game.cards[0].id,k:99,score:999};
  if(turns===0){assert.equal((await call(users[other],'choose',data)).status,409);assert.equal((await call(users[actor],'choose',{...data,site:999})).status,409);}
  if(turns===0){const twice=await Promise.all([call(users[actor],'choose',data),call(users[actor],'choose',data)]);assert.equal(twice.filter(x=>x.status===200).length,1);assert.equal(twice.filter(x=>x.status===409).length,1);r=twice.find(x=>x.status===200).body;}
  else{const chosen=await call(users[actor],'choose',data);assert.equal(chosen.status,200,JSON.stringify(chosen.body));r=chosen.body;}
  assert.ok([1,3,5].includes(r.game.pending.k));assert.equal(r.game.deck,undefined);
  if(r.game.pending.card.type==='retry'){let rr=await call(users[actor],'reroll',{room,version:r.version});assert.equal(rr.status,200);r=rr.body;assert.equal((await call(users[actor],'reroll',{room,version:r.version})).status,409);rerolls++;}
  const confirmed=await call(users[actor],'confirm',{room,version:r.version});assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));r=confirmed.body;turns++;
 }
 assert.equal(turns,24);assert.equal(r.leg,2);const resumed=(await call(users[1],'get',{room})).body;assert.deepEqual(resumed.totals,r.totals);
 const report={status:'pass',rooms:15,players:2,thirdPlayerRejected:true,simultaneousReady:true,duplicateActionRejected:true,wrongTurnRejected:true,forgedSiteRejected:true,serverK:true,rerollOnce:true,turns,rerolls,reconnectPreserved:true};fs.writeFileSync('tests/microbe-api-live-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{
 if(room)for(const u of users.slice(0,2))await call(u,'leave',{room}).catch(()=>{});
 for(const u of users)await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:u.idToken})}).catch(()=>{});
}})().catch(e=>{console.error(e.message);process.exitCode=1;});
