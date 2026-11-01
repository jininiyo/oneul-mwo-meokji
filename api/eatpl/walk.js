// v52: bounded concurrent geocoding and TMAP pedestrian routing.
const cache=new Map();
// eat.pl uses legacy KOTI-KATEC (TM128, Bessel) projected coordinates.
// Convert locally to WGS84 before requesting TMAP walking routes.
const valid=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=33&&lat<=39&&lng>=124&&lng<=132;
const point=(lat,lng)=>{lat=Number(lat);lng=Number(lng);return valid(lat,lng)?{lat,lng}:null};
function upstream(r){return point(r.coordY,r.coordX)||point(r.coordX,r.coordY)||projectedPoint(r)}
const A=6377397.155,invF=299.1528128,F=1/invF,E2=2*F-F*F,K0=.9999;
function invTM(x,y){const phi0=38*Math.PI/180;const M0=A*((1-E2/4-3*E2**2/64-5*E2**3/256)*phi0-(3*E2/8+3*E2**2/32+45*E2**3/1024)*Math.sin(2*phi0)+(15*E2**2/256+45*E2**3/1024)*Math.sin(4*phi0)-(35*E2**3/3072)*Math.sin(6*phi0));let M=M0+(y-600000)/K0;const mu=M/(A*(1-E2/4-3*E2**2/64-5*E2**3/256));const e1=(1-Math.sqrt(1-E2))/(1+Math.sqrt(1-E2));const phi1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);const ep2=E2/(1-E2),s=Math.sin(phi1),c=Math.cos(phi1),t=Math.tan(phi1),N=A/Math.sqrt(1-E2*s*s),R=A*(1-E2)/(1-E2*s*s)**1.5,D=(x-400000)/(N*K0),T=t*t,C=ep2*c*c;const lat=phi1-(N*t/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ep2)*D**4/24+(61+90*T+298*C+45*T*T-252*ep2-3*C*C)*D**6/720);const lon=128*Math.PI/180+(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C*C+8*ep2+24*T*T)*D**5/120)/c;return [lat,lon]}
function geoToEcef(lat,lon,a,e2){const N=a/Math.sqrt(1-e2*Math.sin(lat)**2);return [(N)*Math.cos(lat)*Math.cos(lon),(N)*Math.cos(lat)*Math.sin(lon),(N*(1-e2))*Math.sin(lat)]}
function ecefToGeo(x,y,z){const a=6378137,f=1/298.257223563,e2=2*f-f*f,p=Math.hypot(x,y);let lat=Math.atan2(z,p*(1-e2));for(let i=0;i<7;i++){const N=a/Math.sqrt(1-e2*Math.sin(lat)**2);lat=Math.atan2(z+e2*N*Math.sin(lat),p)}return [lat,Math.atan2(y,x)]}
function katec(x,y,sign=1){const [lat,lon]=invTM(x,y);let [X,Y,Z]=geoToEcef(lat,lon,A,E2);const [dx,dy,dz,rx,ry,rz,ds]=[-115.8,474.99,674.11,1.16,-2.31,-1.63,6.43];const k=1+ds*1e-6,r=Math.PI/(180*3600);const XX=dx+k*X+sign*(-rz*r*Y+ry*r*Z),YY=dy+k*Y+sign*(rz*r*X-rx*r*Z),ZZ=dz+k*Z+sign*(-ry*r*X+rx*r*Y);const [la,lo]=ecefToGeo(XX,YY,ZZ);return {lat:la*180/Math.PI,lng:lo*180/Math.PI}}

function projectedPoint(r){
 const x=Number(r.coordX),y=Number(r.coordY);
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<100000||x>600000||y<300000||y>800000)return null;
 const candidate=katec(x,y);
 return point(candidate.lat,candidate.lng);
}

function meters(a,b){const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad,h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;return Math.round(12742000*Math.asin(Math.min(1,Math.sqrt(h))))}
async function getJson(url,options={},ms=3500){const r=await fetch(url,{...options,signal:AbortSignal.timeout(ms)});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
async function geocode(address,key){
 const a=String(address||'').trim().replace(/\s+/g,' ').slice(0,160);
 if(!a)return null;
 if(cache.has(a))return cache.get(a);
 let result=null;
 // Use the same TMAP provider as the route API, rather than depending solely on OSM coverage.
 try{
  const u=new URL('https://apis.openapi.sk.com/tmap/geo/fullAddrGeo');
  u.searchParams.set('version','1');u.searchParams.set('fullAddr',a);u.searchParams.set('coordType','WGS84GEO');
  const d=await getJson(u,{headers:{appKey:key,Accept:'application/json'}},3000);
  const c=d.coordinateInfo?.coordinate?.[0];
  if(c)result=point(c.newLat,c.newLon)||point(c.lat,c.lon)||point(c.newLat,c.newLon)||point(c.latitude,c.longitude);
 }catch(e){}
 if(!result){
  try{
   const u=new URL('https://nominatim.openstreetmap.org/search');
   u.searchParams.set('q',a.replace(/\s*\([^)]*\)/g,'').trim());u.searchParams.set('format','jsonv2');u.searchParams.set('limit','1');u.searchParams.set('countrycodes','kr');
   const d=await getJson(u,{headers:{'User-Agent':'OneulMwoMeokji/1.0 (walking directions)','Accept':'application/json'}},2600);
   result=d[0]?point(d[0].lat,d[0].lon):null;
  }catch(e){}
 }
 if(cache.size>500)cache.clear();cache.set(a,result);return result;
}
async function route(r,origin,key){
 const id=String(r.id||'').slice(0,250);if(!id)return null;
 try{
  const target=upstream(r)||await geocode(r.address,key);
  if(!target)return {id,status:'no_geocode'};
  const straightMeters=meters(origin,target);
  if(straightMeters>10000)return {id,status:'far',straightMeters};
  const body={startX:origin.lng,startY:origin.lat,endX:target.lng,endY:target.lat,startName:'출발 위치',endName:String(r.name||'식당').slice(0,60),reqCoordType:'WGS84GEO',resCoordType:'WGS84GEO',searchOption:'0'};
  const data=await getJson('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1',{method:'POST',headers:{appKey:key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)},5000);
  const props=data.features?.[0]?.properties||{};
  const seconds=Number(props.totalTime),dist=Number(props.totalDistance);
  if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(dist)||dist<0)return {id,status:'route_unavailable',straightMeters};
  return {id,status:'routed',walkMinutes:Math.max(1,Math.ceil(seconds/60)),walkMeters:Math.round(dist),straightMeters};
 }catch(e){return {id,status:'route_unavailable',reason:String(e.message||'').slice(0,70)}}
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({message:'POST only'});
 const origin=point(req.body?.origin?.lat,req.body?.origin?.lng),restaurants=req.body?.restaurants;
 if(!origin||!Array.isArray(restaurants)||restaurants.length<1||restaurants.length>5)return res.status(400).json({message:'출발 좌표 또는 식당 수(1~5개)를 확인해 주세요.'});
 const key=process.env.TMAP_APP_KEY||'';
 if(!key)return res.status(200).json({routingConfigured:false,items:restaurants.map(r=>({id:r.id,status:'key_required'}))});
 const items=(await Promise.all(restaurants.map(r=>route(r,origin,key)))).filter(Boolean);
 return res.status(200).json({routingConfigured:true,items});
};
