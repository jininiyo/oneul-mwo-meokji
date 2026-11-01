module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({message:'GET 요청만 지원합니다.'});
  return res.status(200).json({ok:true,configured:!!process.env.EATPL_INST_NM,mode:process.env.EATPL_INST_NM?'partner':'unconfigured'});
};
