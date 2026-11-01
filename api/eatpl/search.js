const PROXY = 'https://k-skill-proxy.nomadamas.org/v1/bccard-eatpl/search';
const SAFE_LINK = /^https:\/\/web\.paybooc\.ai\/mer\/web\/profile\/[A-Za-z0-9_-]+$/;
function pct(x){if(x===null||x===undefined||x==='')return null;const n=Number(x);return Number.isFinite(n)?n:null}
function bool(x){return x===true||x==='Y'||x==='1'||x===1}
function itemsFrom(json){if(Array.isArray(json))return json;for(const a of [json?.data,json?.items,json?.results,json?.data?.items,json?.data?.list,json?.data?.merList,json?.result?.data,json?.result?.items])if(Array.isArray(a))return a;return null}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({message:'GET 요청만 지원합니다.'});
 const location=String(req.query.location||'').trim();const category=String(req.query.category||'').trim();const name=String(req.query.name||'').trim();
 if((!location&&!category&&!name)||location.length>120||category.length>60||name.length>80)return res.status(400).json({message:'지역, 업종 또는 식당명을 입력해 주세요.'});
 const q=new URLSearchParams();if(location)q.set('location',location);if(category)q.set('merTpbuzNm',category);if(name)q.set('merNm',name);
 try{
  const upstream=await fetch(PROXY+'?'+q.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000)});
  if(!upstream.ok)return res.status(502).json({message:'잇플 검색을 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',upstreamStatus:upstream.status});
  const data=await upstream.json();const raw=itemsFrom(data);
  if(!raw)return res.status(502).json({message:'잇플 검색 응답 형식을 확인할 수 없어요.'});
  const items=raw.map(x=>({name:String(x.merNm||x.name||''),address:String(x.addr||x.merAddr||x.address||''),category:String(x.merTpbuzNm||x.category||''),phone:String(x.merTpno||x.phone||''),nationalTop:pct(x.allSaleRnk),localTop:pct(x.ccgSaleRnk),localFavorite:bool(x.loclPrsnPpltYn||x.localFavorite),url:typeof x.merUrl==='string'&&SAFE_LINK.test(x.merUrl)?x.merUrl:null,estimatedStart:x.srtTime||null,estimatedEnd:x.endTime||null,closedDays:x.hldyDwk||null,visitorAges:x.vistCstmrRnkList||null,busyDay:x.congestionDwk||null,busyTime:x.congestionTizn||null,groupDining:x.empyVsitYn??null,coordX:x.xaxsVal??null,coordY:x.yaxsVal??null})).filter(x=>x.name&&x.url).slice(0,100);
  return res.status(200).json({items,source:'eat.pl 잇플 · BC카드 결제 데이터 기반',isDemo:false});
 }catch(e){return res.status(502).json({message:'잇플 검색 연결이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'})}
};
