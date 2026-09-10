'use strict';
const {getApps,initializeApp,cert}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {getAuth}=require('firebase-admin/auth');
const {randomBytes,createHmac}=require('node:crypto');
const engine=require('../lib/microbe-engine');
const bot=require('../lib/microbe-bot');
const {access}=require('../lib/microbe-access');
function db(){
  if(!getApps().length){
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if(!raw)throw Object.assign(new Error('대전 서버를 준비 중입니다.'),{status:503});
    initializeApp({credential:cert(JSON.parse(raw)),projectId:'knn-lab-2026'});
  }
  return getFirestore();
}
function reject(message,status=409){throw Object.assign(new Error(message),{status});}
function roomId(v){const n=Number(v);if(!Number.isInteger(n)||n<1||n>15)reject('방은 1~15번 중에서 골라 주세요.',400);return String(n);}
// 'bot' = 컴퓨터와 1:1 개인 방(사용자마다 하나, microbeSolo/{uid}). 공용 15개 방과 분리된다.
function locate(store,v,uid){if(v==='bot')return {id:'bot',ref:store.collection('microbeSolo').doc(uid),solo:true};const id=roomId(v);return {id,ref:store.collection('microbeRooms').doc(id),solo:false};}
// Reset the stream on a Firestore transaction retry; clients never supply or see it.
function randomStream(seed){let counter=0;return n=>{const limit=Math.floor(4294967296/n)*n;let x;do{x=createHmac('sha256',seed).update(String(counter++)).digest().readUInt32BE();}while(x>=limit);return x%n;};}
function stale(r,now){return r.players.some(Boolean)&&Math.max(...r.seen)<now-10*60*1000;}
const LIMITS=new Map();
let lobbyCache=null,lobbyCacheAt=0;
async function lobbySnapshots(store,rooms){
 if(!lobbyCache||Date.now()-lobbyCacheAt>5000){lobbyCacheAt=Date.now();lobbyCache=store.getAll(...Array.from({length:15},(_,i)=>rooms.doc(String(i+1))));}
 try{return await lobbyCache;}catch(e){lobbyCache=null;throw e;}
}
function rate(uid){const now=Date.now(),v=LIMITS.get(uid)||{at:now,n:0};if(now-v.at>60000){v.at=now;v.n=0;}v.n++;LIMITS.set(uid,v);if(LIMITS.size>5000)LIMITS.clear();if(v.n>120)reject('잠시 기다린 뒤 다시 눌러 주세요.',429);}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  if(!['GET','POST'].includes(req.method))reject('허용되지 않는 요청입니다.',405);
  const permission=access(req.headers['x-microbe-access']);
  if(req.method==='GET'&&req.query.access==='1')return res.json(permission);
  if(!permission.allowed&&!(req.method==='POST'&&req.body?.type==='leave'))return res.status(403).json({code:'HOURS_CLOSED',error:'평일 09:00~14:30에 열립니다. 이용 시간 밖에는 입장 코드를 입력해 주세요.',...permission});
  const token=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];if(!token)reject('로그인이 필요합니다.',401);
  const store=db();let uid;try{uid=(await getAuth().verifyIdToken(token)).uid;}catch{reject('접속 인증을 다시 확인해 주세요.',401);}
  rate(uid);const now=Date.now();const rooms=store.collection('microbeRooms');const member=store.collection('microbeMembership').doc(uid);
  if(req.method==='GET'&&!req.query.room){
   const snaps=await lobbySnapshots(store,rooms);
   return res.json({rooms:snaps.map((snap,i)=>{const r=snap.exists?snap.data():engine.newRoom(String(i+1),now);const expired=stale(r,now);return {id:i+1,status:expired?'waiting':r.status,count:expired?0:r.players.filter(Boolean).length,ready:expired?0:r.ready.filter(Boolean).length,mine:!expired&&r.players.includes(uid)};})});
  }
  if(req.method==='GET'){
   const {ref,solo}=locate(store,req.query.room,uid),seed=randomBytes(32);
   const result=await store.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)reject('빈방입니다. 다시 입장해 주세요.');let r=snap.data();const me=r.players.indexOf(uid);if(me<0)reject('이 방의 참가자가 아닙니다.',403);
    if(solo){const before=r.version;r=bot.act(r,randomStream(seed),now,{watchMs:req.query.speed==='2'?bot.WATCH_MS/2:bot.WATCH_MS});if(r.version!==before){r.seen[me]=now;tx.set(ref,r);return engine.view(r,uid);}}
    if(now-r.seen[me]>15000){r.seen[me]=now;tx.set(ref,r);}return engine.view(r,uid);});
   return res.json(result);
  }
  const body=req.body||{},{id,ref,solo}=locate(store,body.room,uid),seed=randomBytes(32);
  if(solo){
   const result=await store.runTransaction(async tx=>{
    const snap=await tx.get(ref);let r=snap.exists?snap.data():null;
    if(body.type==='join'){if(!r||!r.bot||r.players[0]!==uid||stale(r,now))r=bot.newBotRoom('bot',uid,now);r.seen[0]=now;tx.set(ref,r);return engine.view(r,uid);}
    if(!r||r.players[0]!==uid)reject('컴퓨터 방이 없어요. 다시 들어가 주세요.',403);
    if(body.type==='leave'){tx.delete(ref);return {left:true};}
    if(body.type==='ready'&&r.status==='playing')return engine.view(r,uid);
    const random=randomStream(seed);
    r=engine.apply(r,uid,{type:body.type,version:body.type==='ready'?r.version:body.version,site:body.site,cardId:body.cardId},random,now);
    r=bot.act(r,random,now);tx.set(ref,r);return engine.view(r,uid);
   });
   return res.json(result);
  }
  const result=await store.runTransaction(async tx=>{
   const [snap,ms]=await Promise.all([tx.get(ref),tx.get(member)]);let r=snap.exists?snap.data():engine.newRoom(id,now);
   if(body.type==='join'){
    if(ms.exists&&ms.data().room!==id){const previous=await tx.get(rooms.doc(ms.data().room));if(previous.exists&&previous.data().players.includes(uid)&&!stale(previous.data(),now))reject('이미 들어간 방에서 먼저 나와 주세요.');}
    if(stale(r,now))r=engine.newRoom(id,now);
    let me=r.players.indexOf(uid);
    if(me<0){if(r.status!=='waiting'||r.players.every(Boolean))reject('이미 두 명이 있거나 게임 중인 방입니다.');me=r.players.indexOf('');r.players[me]=uid;r.ready=[false,false];r.version++;}
    r.seen[me]=now;tx.set(member,{room:id});tx.set(ref,r);return engine.view(r,uid);
   }
   const me=r.players.indexOf(uid);if(me<0)reject('이 방의 참가자가 아닙니다.',403);
   if(body.type==='leave'){
    if(['playing','between'].includes(r.status)){r.status='finished';r.winnerIndex=1-me;r.finishReason='surrender';}
    r.players[me]='';r.ready[me]=false;r.seen[me]=0;r.version++;
    if(!r.players.some(Boolean))r=engine.newRoom(id,now);
    tx.set(ref,r);tx.delete(member);return {left:true};
   }
   if(body.type==='ready'&&r.status==='playing')return engine.view(r,uid);
   r=engine.apply(r,uid,{type:body.type,version:body.type==='ready'?r.version:body.version,site:body.site,cardId:body.cardId},randomStream(seed),now);
   tx.set(ref,r);return engine.view(r,uid);
  });
  lobbyCache=null;
  return res.json(result);
 }catch(e){if(!e.status)console.error('Microbe API:',e.code||e.name);return res.status(e.status||500).json({error:e.status?e.message:'연결이 잠시 끊겼어요. 다시 시도해 주세요.'});}
};
