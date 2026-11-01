// Search geocoding for user-initiated place searches. No API key required.
let lastCall=0;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const q=String(req.query.q||'').trim();
 if(q.length<2||q.length>120)return res.status(400).json({message:'검색어를 확인해 주세요.'});
 if(Date.now()-lastCall<1100)return res.status(429).json({message:'잠시 후 다시 검색해 주세요.'});
 lastCall=Date.now();
 try{
  const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kr&accept-language=ko&q='+encodeURIComponent(q);
  const r=await fetch(url,{headers:{'User-Agent':'OneulMwoMeokji/1.0 (user initiated map search)','Accept':'application/json'},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('위치 검색에 실패했어요.');
  const j=await r.json();if(!j.length)return res.status(404).json({message:'검색 결과가 없어요.'});
  res.status(200).json({lat:Number(j[0].lat),lng:Number(j[0].lon),displayName:j[0].display_name});
 }catch(e){res.status(502).json({message:e.message||'지도 검색 실패'})}
}
