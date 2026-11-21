import fs from 'fs';
const codes=['zh_cn','zh_tw','ja_jp','ko_kr','ru_ru','de_de','fr_fr','es_es','es_mx','pt_br','it_it','pl_pl','tr_tr','nl_nl','uk_ua','vi_vn','th_th','id_id','ar_sa','sv_se','cs_cz'];
fs.mkdirSync('cache/mcmeta-lang',{recursive:true});
const bases=['https://raw.githubusercontent.com/misode/mcmeta/assets/assets/minecraft/lang/','https://gh-proxy.com/https://raw.githubusercontent.com/misode/mcmeta/assets/assets/minecraft/lang/','https://raw.gitmirror.com/misode/mcmeta/assets/assets/minecraft/lang/'];
for(const c of codes){
  const p=`cache/mcmeta-lang/${c}.json`;
  if(fs.existsSync(p)&&fs.statSync(p).size>1000){console.log('cached',c);continue;}
  let ok=false;
  for(const b of bases){ for(let a=0;a<2&&!ok;a++){ try{const r=await fetch(b+c+'.json',{signal:AbortSignal.timeout(30000)}); if(!r.ok) throw new Error(r.status); const t=await r.text(); JSON.parse(t); fs.writeFileSync(p,t); console.log('ok',c,t.length); ok=true;}catch(e){} } if(ok)break; }
  if(!ok) console.log('MISS',c);
}
