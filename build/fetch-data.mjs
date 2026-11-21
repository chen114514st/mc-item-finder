import fs from 'fs';
const MIRRORS=[
  v=>`https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-data@master/data/pc/${v}/`,
  v=>`https://fastly.jsdelivr.net/gh/PrismarineJS/minecraft-data@master/data/pc/${v}/`,
  v=>`https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/${v}/`,
];
const VERSIONS=['26.1','1.21.11','1.21.8','1.21.4','1.20.6','1.20.1'];
const FILES=['items.json','blocks.json','foods.json','version.json'];
async function dl(v,f){
  for(const m of MIRRORS){ const u=m(v)+f; for(let i=0;i<2;i++){ try{ const r=await fetch(u,{signal:AbortSignal.timeout(40000)}); if(!r.ok){ if(r.status===404) return null; throw new Error(r.status);} const b=Buffer.from(await r.arrayBuffer()); return b; }catch(e){ console.log('  retry',f,e.message.slice(0,30)); } } }
  throw new Error('all mirrors failed '+v+'/'+f);
}
fs.mkdirSync('cache/mcdata',{recursive:true});
for(const v of VERSIONS){
  for(const f of FILES){
    const p=`cache/mcdata/${v}-${f}`;
    if(fs.existsSync(p)&&fs.statSync(p).size>100){ console.log('cached',v,f); continue; }
    const b=await dl(v,f);
    if(b){ fs.writeFileSync(p,b); console.log('ok',v,f,b.length); } else console.log('404',v,f);
  }
}
