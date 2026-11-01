// Real walking routes. Origin comes from browser GPS/map selection; destination from
// upstream WGS84 coordinates when available, otherwise address geocoding.
// Requires TMAP_APP_KEY in Vercel environment variables.
const cache = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let lastGeocode = 0;
function validPoint(lat,lng){return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=33&&lat<=39&&lng>=124&&lng<=132}
function upstreamPoint(r){
 const x=Number(r.coordX),y=Number(r.coordY);
 // Only use coordinates already in WGS84 degrees. Korean projected coordinates
 // are NOT WGS84 and must not be sent to TMAP as longitude/latitude.
 if(validPoint(y,x))return {lat:y,lng:x};
 if(validPoint(x,y))return {lat:x,lng:y};
 return null;
}
function addressVariants(address){
 const a=String(address||'').trim().replace(/\s+/g,' ');
 const candidates=[a,a.replace(/\s*\([^)]*\)/g,'').trim(),a.replace(/\s*(?:\d+층|지하\s*\d+층|\d+호).*$/,'').trim()];
 return [...new Set(candidates.filter(Boolean))].slice(0,3);
}
async function geocode(address){
 const k=String(address||'').trim().slice(0,180);
 if(cache.has(k))return cache.get(k);
 for(const q of addressVariants(k)){
  const delay=1100-(Date.now()-lastGeocode);if(delay>0)await sleep(delay);
  lastGeocode=Date.now();
  try{
   const url=new URL('https://nominatim.openstreetmap.org/search');
   url.searchParams.set('q',q);url.searchParams.set('format','jsonv2');url.searchParams.set('limit','1');url.searchParams.set('countrycodes','kr');
   const r=await fetch(url,{headers:{'User-Agent':'OneulMwoMeokji/1.0 (restaurant address lookup)','Accept':'application/json'},signal:AbortSignal.timeout(5500)});
   if(!r.ok)continue;
   const results=await r.json();const p=results[0]&&{lat:Number(results[0].lat),lng:Number(results[0].lon)};
   if(p&&validPoint(p.lat,p.lng)){if(cache.size>500)cache.clear();cache.set(k,p);return p}
  }catch(e){}
 }
 cache.set(k,null);return null;
}
function distance(a,b){const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad,h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;return Math.round(12742000*Math.asin(Math.min(1,Math.sqrt(h))))}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({message:'POST only'});
 const {origin,restaurants}=req.body||{};const lat=Number(origin?.lat),lng=Number(origin?.lng);
 if(!validPoint(lat,lng)||!Array.isArray(restaurants)||restaurants.length<1||restaurants.length>5)return res.status(400).json({message:'출발 좌표 또는 요청 수(1~5개)를 확인해 주세요.'});
 const key=process.env.TMAP_APP_KEY||'';
 const items=[];
 for(const restaurant of restaurants){
  const id=String(restaurant.id||'').slice(0,250),address=String(restaurant.address||'').slice(0,180);
  if(!id)continue;
  try{
   const target=upstreamPoint(restaurant)||(address?await geocode(address):null);
   if(!target){items.push({id,status:'no_geocode'});continue}
   const straightMeters=distance({lat,lng},target);
   if(straightMeters>10000){items.push({id,status:'far',straightMeters});continue}
   if(!key){items.push({id,status:'key_required',straightMeters});continue}
   const body={startX:lng,startY:lat,endX:target.lng,endY:target.lat,startName:'선택한 출발 위치',endName:String(restaurant.name||'식당').slice(0,70),reqCoordType:'WGS84GEO',resCoordType:'WGS84GEO',searchOption:'0'};
   const response=await fetch('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1',{method:'POST',headers:{appKey:key,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8500)});
   if(!response.ok){items.push({id,status:'route_unavailable',straightMeters});continue}
   const data=await response.json();const props=data.features?.[0]?.properties||{};
   const seconds=Number(props.totalTime),meters=Number(props.totalDistance);
   if(!Number.isFinite(seconds)||seconds<0){items.push({id,status:'route_unavailable',straightMeters});continue}
   items.push({id,status:'routed',walkMinutes:Math.max(1,Math.ceil(seconds/60)),walkMeters:Number.isFinite(meters)?Math.round(meters):null,straightMeters});
  }catch(e){items.push({id,status:'unavailable'})}
 }
 return res.status(200).json({items,routingConfigured:!!key});
};
