/* 抓取额外数据：pc 注册表（effects/enchantments/instruments）、bedrock 物品/方块/方块状态、bedrock 语言 */
import fs from 'fs';
const BASE=[
  p=>`https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-data@master/data/${p}`,
  p=>`https://fastly.jsdelivr.net/gh/PrismarineJS/minecraft-data@master/data/${p}`,
  p=>`https://gh-proxy.com/https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/${p}`,
  p=>`https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/${p}`,
];
const paths=JSON.parse(fs.readFileSync('cache/dataPaths.json','utf8'));
async function dl(rel){
  for(const m of BASE){ const u=m(rel); for(let i=0;i<2;i++){ try{
    const r=await fetch(u,{signal:AbortSignal.timeout(60000)});
    if(!r.ok){ if(r.status===404) return null; throw new Error('HTTP '+r.status); }
    return Buffer.from(await r.arrayBuffer());
  }catch(e){ console.log('  retry',rel,e.message.slice(0,40)); } } }
  return null;
}
const JAVA=['26.1','1.21.11','1.21.8','1.21.4','1.20.6','1.20.1'];
const BEDROCK=['1.26.60','1.26.30','1.21.100','1.21.50','1.20.80'];
fs.mkdirSync('cache/mcdata',{recursive:true});
const jobs=[];
for(const v of JAVA) for(const f of ['effects','enchantments','instruments']){
  const dir=paths.pc[v][f]; if(!dir) continue;
  jobs.push([`cache/mcdata/${v}-${f}.json`,`${dir}/${f}.json`]);
}
for(const v of BEDROCK) for(const f of ['items','blocks','blockStates','version']){
  const dir=paths.bedrock[v][f]; if(!dir) continue;
  jobs.push([`cache/mcdata/be-${v}-${f}.json`,`${dir}/${f}.json`]);
}
jobs.push(['cache/bedrock-language.json',`${paths.bedrock['1.26.60'].language}/language.json`]);
for(const [p,rel] of jobs){
  if(fs.existsSync(p)&&fs.statSync(p).size>50){ console.log('cached',p); continue; }
  const b=await dl(rel);
  if(b){ fs.writeFileSync(p,b); console.log('ok',p,b.length); } else console.log('FAIL',p,rel);
}
