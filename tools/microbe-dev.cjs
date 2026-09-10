const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const accessFile=path.join(root,'.env.microbe-access');if(!process.env.MICROBE_ACCESS_CODE&&fs.existsSync(accessFile))process.env.MICROBE_ACCESS_CODE=fs.readFileSync(accessFile,'utf8').trim();
process.env.FIREBASE_SERVICE_ACCOUNT_JSON=fs.readFileSync(path.join(root,'.env.microbe-service-account.json'),'utf8');
const api=require('../api/microbe');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/api/microbe'){let data='';for await(const c of req)data+=c;if(data.length>4096){res.writeHead(413);return res.end();}try{req.body=data?JSON.parse(data):{};}catch{res.writeHead(400);return res.end();}req.query=Object.fromEntries(u.searchParams);res.status=n=>{res.statusCode=n;return res;};res.json=d=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d));};return api(req,res);}
 const p=u.pathname==='/'?'/microbe.html':decodeURIComponent(u.pathname);if(!/^\/(?:[a-z0-9-]+\.html|favicon\.svg|(?:js|css|img)\/[^.][\w./-]+)$/.test(p)||p.includes('..')){res.writeHead(404);return res.end();}const f=path.join(root,p);try{res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}
}).listen(8788,'127.0.0.1',()=>console.log('KNN game preview: http://127.0.0.1:8788/microbe.html'));
