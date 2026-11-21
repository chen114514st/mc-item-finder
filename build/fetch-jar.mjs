import fs from 'fs';
const out='cache/client.jar';
const url='https://piston-data.mojang.com/v1/objects/e877b6a07acd633fb3bb475002175cec036e7b87/client.jar';
const r=await fetch(url,{signal:AbortSignal.timeout(300000)});
if(!r.ok) throw new Error(r.status);
const buf=Buffer.from(await r.arrayBuffer());
fs.writeFileSync(out,buf);
console.log('jar bytes',buf.length);
