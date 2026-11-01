const cache=new Map();let lastCall=0;
export default async function handler(req,res){
 res.setHeader('Cache-Control','public, max-age=3600');
 const lat=Number(req.query.lat),lng=Number(req.query.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({message:'좌표 오류'});
 const key=lat.toFixed(3)+','+lng.toFixed(3);if(cache.has(key))return res.status(200).json({location:cache.get(key)});
 try{if(Date.now()-lastCall<1100)return res.status(429).json({message:'잠시 후 다시 시도해 주세요.'});lastCall=Date.now();
 const url='https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=14&accept-language=ko&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lng);
 const response=await fetch(url,{headers:{'User-Agent':'OneulMwoMeokji/1.0 (location lookup for user-initiated restaurant search)','Accept':'application/json'},signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error('위치 변환 실패');
 const j=await response.json(),a=j.address||{};const city=a.city||a.province||a.state||a.county||'',district=a.borough||a.city_district||a.suburb||a.county||a.quarter||a.neighbourhood||'';const location=[city,district].filter((v,i,ar)=>v&&ar.indexOf(v)===i).join(' ').trim();
 if(!location)throw Error('지역 미확인');if(cache.size>300)cache.clear();cache.set(key,location);return res.status(200).json({location});
 }catch(e){return res.status(502).json({message:'현재 위치를 지역명으로 변환하지 못했어요. 직접 지역을 검색해 주세요.'})}
}
