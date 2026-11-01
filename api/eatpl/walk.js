// Optional TMAP pedestrian route integration. Requires TMAP_APP_KEY in Vercel.
const geoCache=new Map();let lastGeo=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function geocode(address){
 const key=String(address||'').trim().slice(0,180);if(geoCache.has(key))return geoCache.get(key);
 const wait=1100-(Date.now()-lastGeo);if(wait>0)await sleep(wait);lastGeo=Date.now();
 const u=new URL('https://nominatim.openstreetmap.org/search');u.searchParams.set('q',key);u.searchParams.set('format','jsonv2');u.searchParams.set('limit','1');u.searchParams.set('countrycodes','kr');
 const r=await fetch(u,{headers:{'User-Agent':'OneulMwoMeokji/1.0 (restaurant address geocoding)','Accept':'application/json'},signal:AbortSignal.timeout(6500)});
 if(!r.ok)throw Error('주소 좌표 변환 실패');const a=await r.json();const p=a[0]?{lat:Number(a[0].lat),lng:Number(a[0].lon)}:null;if(geoCache.size>500)geoCache.clear();geoCache.set(key,p);return p;
}
const dist=(a,b)=>{const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad,h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;return Math.round(12742000*Math.asin(Math.min(1,Math.sqrt(h))))};
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({message:'POST only'});
 const {origin,restaurants}=req.body||{};const lat=Number(origin?.lat),lng=Number(origin?.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<33||lat>39||lng<124||lng>132||!Array.isArray(restaurants)||restaurants.length>5)return res.status(400).json({message:'위치 또는 요청 수 오류'});
 const key=process.env.TMAP_APP_KEY||'';const result=[];
 for(const r of restaurants){const id=String(r.id||'').slice(0,80),address=String(r.address||'').slice(0,180);if(!id||!address)continue;
  try{const target=await geocode(address);if(!target){result.push({id,status:'no_geocode'});continue}
   const meters=dist({lat,lng},target);if(meters>10000){result.push({id,status:'far',straightMeters:meters});continue}
   if(!key){result.push({id,status:'key_required',straightMeters:meters});continue}
   const body={startX:lng,startY:lat,endX:target.lng,endY:target.lat,startName:'현재 위치',endName:String(r.name||'식당').slice(0,70),reqCoordType:'WGS84GEO',resCoordType:'WGS84GEO',searchOption:'0'};
   const response=await fetch('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1',{method:'POST',headers:{'appKey':key,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
   if(!response.ok){result.push({id,status:'route_unavailable',straightMeters:meters});continue}
   const data=await response.json();const props=data.features?.[0]?.properties||{};const totalTime=Number(props.totalTime),totalDistance=Number(props.totalDistance);
   if(!Number.isFinite(totalTime)||totalTime<0){result.push({id,status:'route_unavailable',straightMeters:meters});continue}
   result.push({id,status:'routed',walkMinutes:Math.max(1,Math.ceil(totalTime/60)),walkMeters:Number.isFinite(totalDistance)?Math.round(totalDistance):null,straightMeters:meters});
  }catch(e){result.push({id,status:'unavailable'})}
 }
 return res.status(200).json({items:result,routingConfigured:Boolean(key),note:key?'도보 경로 API 기준':'도보 경로를 계산하려면 TMAP_APP_KEY 환경변수가 필요합니다.'});
};
