import fs from 'fs';
const DP=JSON.parse(fs.readFileSync('cache/dataPaths.json','utf8')).pc;
const JSD=u=>`https://cdn.jsdelivr.net/gh/${u}`;
const mirrors=(u)=>[JSD(u),`https://fastly.jsdelivr.net/gh/${u}`,`https://raw.githubusercontent.com/${u}`];
async function fetchAny(urls,timeout=45000){
  for(const u of urls){ for(let a=0;a<2;a++){ try{ const r=await fetch(u,{signal:AbortSignal.timeout(timeout)}); if(r.status===404) break; if(!r.ok) throw new Error(r.status); return Buffer.from(await r.arrayBuffer()); }catch(e){ } } }
  return null;
}
// extra versions (data path != version name)
const extra={ '1.20.6': DP['1.20.6'].items.split('/')[1], '1.20.1': DP['1.20.1'].items.split('/')[1] };
for(const [label,path] of Object.entries(extra)){
  for(const f of ['items','blocks','foods','version']){
    const p=`cache/mcdata/${label}-${f}.json`; if(fs.existsSync(p)&&fs.statSync(p).size>100){continue;}
    const b=await fetchAny(mirrors(`PrismarineJS/minecraft-data@master/data/pc/${path}/${f}.json`));
    if(b){fs.writeFileSync(p,b);console.log('ok',label,f,b.length);} else console.log('MISS',label,f);
  }
}
// languages from Minecraft-All-Lang
const LANGS=['zh_cn','zh_tw','ja_jp','ko_kr','ru_ru','de_de','fr_fr','es_es','es_mx','pt_br','it_it','pl_pl','tr_tr','nl_nl','uk_ua','vi_vn','th_th','id_id','ar_sa','sv_se','cs_cz'];
fs.mkdirSync('cache/lang',{recursive:true});
for(const code of LANGS){
  const p=`cache/lang/${code}.json`; if(fs.existsSync(p)&&fs.statSync(p).size>1000){console.log('cached lang',code);continue;}
  const b=await fetchAny(mirrors(`PandaDevOfficial/Minecraft-All-Lang@main/${code}.json`));
  if(b){fs.writeFileSync(p,b);console.log('ok lang',code,b.length);} else console.log('MISS lang',code);
}
