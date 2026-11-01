// GPS coordinates -> detailed display address + broad eat.pl search region.
// Only called on explicit user action; do not store precise coordinates server-side.
const cache = new Map();
let lastCall = 0;
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const lat = Number(req.query.lat), lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180 || !('lat' in req.query) || !('lng' in req.query)) return res.status(400).json({message:'좌표 오류'});
  const key = lat.toFixed(4)+','+lng.toFixed(4);
  if (cache.has(key)) return res.status(200).json(cache.get(key));
  try {
    if (Date.now()-lastCall<1100) return res.status(429).json({message:'잠시 후 다시 시도해 주세요.'});
    lastCall=Date.now();
    const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=ko&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lng);
    const response = await fetch(url,{headers:{'User-Agent':'OneulMwoMeokji/1.0 (user initiated location lookup)','Accept':'application/json'},signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw Error('위치 변환 실패');
    const j = await response.json(), a = j.address || {};
    const city = a.city || a.province || a.state || a.county || '';
    const district = a.borough || a.city_district || a.county || '';
    const neighborhood = a.quarter || a.neighbourhood || a.suburb || a.village || a.town || a.hamlet || '';
    const road = a.road || a.pedestrian || a.residential || '';
    const number = a.house_number || '';
    const uniq = parts => [...new Set(parts.filter(Boolean))].join(' ').trim();
    const location = uniq([city,district]) || uniq([city,neighborhood]);
    const detailedLocation = uniq([city,district,neighborhood,road,number]) || location;
    if (!location) throw Error('지역 미확인');
    const result = {location,detailedLocation,neighborhood:neighborhood||null,road:road||null,source:'OpenStreetMap Nominatim',approximate:true};
    if (cache.size>250) cache.clear();
    cache.set(key,result);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(502).json({message:'상세 위치를 확인하지 못했어요. 지역을 직접 검색해 주세요.'});
  }
}
