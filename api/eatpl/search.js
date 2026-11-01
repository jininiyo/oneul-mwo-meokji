const crypto = require('node:crypto');
const ALLOWED = ['https://dev-api.paybooc.ai/api/mer','https://api.paybooc.ai/api/mer'];
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET') return res.status(405).json({message:'GET 요청만 지원합니다.'});
  const inst=process.env.EATPL_INST_NM||'';
  const base=process.env.EATPL_BASE_URL||'https://dev-api.paybooc.ai/api/mer';
  if(!inst||!ALLOWED.includes(base))return res.status(503).json({message:'eat.pl 실데이터 연결 전입니다. 기관코드와 호출 IP 등록이 필요해요. 가상 결과 보기로 테스트할 수 있어요.'});
  const location=String(req.query.location||'').trim();
  const category=String(req.query.category||'').trim();
  if(location.length<2||location.length>80||category.length>40)return res.status(400).json({message:'지역을 2~80자로 입력해 주세요.'});
  const ymd=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
  const seq=crypto.randomInt(0,10000000000).toString().padStart(10,'0');
  const payload={trnsTrceNo:`${inst}${ymd}${seq}`,instNm:inst,location};
  if(category)payload.merTpbuzNm=category;
  try{
    const response=await fetch(base+'/v1/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
    if(!response.ok)return res.status(502).json({message:`eat.pl 서버 응답 오류 (${response.status}). 기관코드·등록 IP·접근 권한을 확인해 주세요.`});
    const result=await response.json();
    if(result.rspCode!=='00000'||!Array.isArray(result.data))return res.status(502).json({message:'eat.pl 검색 응답을 확인해 주세요: '+String(result.rspMessage||result.rspCode||'응답 형식 오류').slice(0,100)});
    const items=result.data.map(x=>({name:x.merNm||'',address:x.merAddr||'',category:x.merTpbuzNm||'',phone:x.merTpno||'',nationalTop:typeof x.allSaleRnk==='number'?x.allSaleRnk:null,localTop:typeof x.ccgSaleRnk==='number'?x.ccgSaleRnk:null,localFavorite:x.loclPrsnPpltYn===true,url:typeof x.merUrl==='string'&&/^https:\/\/web\.paybooc\.ai\/mer\/web\/profile\/[a-zA-Z0-9_-]+$/.test(x.merUrl)?x.merUrl:null}));
    return res.status(200).json({items,source:'eat.pl · BC카드 결제 데이터 기반',isDemo:false});
  }catch(e){return res.status(502).json({message:'eat.pl 연결 실패: '+(e.name==='TimeoutError'?'응답 시간 초과':'서버 연결 또는 네트워크 설정을 확인해 주세요.')});}
};
