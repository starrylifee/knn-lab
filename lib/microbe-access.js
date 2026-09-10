'use strict';
const {timingSafeEqual}=require('node:crypto');
function schedule(now=Date.now()){
 const local=new Date(now+9*3600000),day=local.getUTCDay(),minutes=local.getUTCHours()*60+local.getUTCMinutes();
 const regular=day>=1&&day<=5&&minutes>=540&&minutes<870;
 const midnight=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-9*3600000;
 let nextChange;
 if(regular)nextChange=midnight+870*60000;
 else for(let i=0;i<8;i++){const start=midnight+i*86400000+540*60000,d=new Date(start+9*3600000).getUTCDay();if(start>now&&d>=1&&d<=5){nextChange=start;break;}}
 return {regular,nextChange};
}
function access(code,now=Date.now()){
 const s=schedule(now),a=Buffer.from(String(code||'')),b=Buffer.from(process.env.MICROBE_ACCESS_CODE||'');
 const override=b.length>0&&a.length===b.length&&timingSafeEqual(a,b);
 return {...s,allowed:s.regular||override,override};
}
module.exports={schedule,access};
