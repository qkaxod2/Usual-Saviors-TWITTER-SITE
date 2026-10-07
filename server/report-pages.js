const pageSize=10;
const all=async(db,query,args=[])=>(await db.prepare(query).bind(...args).all()).results;

export async function reportPage(db,params,fail) {
 const date=value=>{
  if(!value)return '';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail(400,'날짜를 확인해 주세요.');
  return value;
 };
 const day=date(params.get('day')||''),from=date(params.get('from')||day),to=date(params.get('to')||day);
 if(from&&to&&from>to)fail(400,'시작일은 종료일보다 늦을 수 없습니다.');
 const requested=params.get('page')||'1';
 if(!/^[1-9]\d{0,8}$/.test(requested))fail(400,'페이지 번호를 확인해 주세요.');
 const place=(params.get('place')||'').trim(),character=(params.get('characterId')||'').trim();
 if(place.length>60||character.length>100)fail(400,'필터 내용을 확인해 주세요.');
 const where=["u.status='active'"],args=[];
 if(from){where.push('s.day>=?');args.push(from)}
 if(to){where.push('s.day<=?');args.push(to)}
 if(place){where.push('instr(lower(s.place),lower(?))>0');args.push(place)}
 if(character){
  where.push("EXISTS (SELECT 1 FROM actions f JOIN users fu ON fu.id=f.user_id WHERE f.scene_id=s.id AND f.character_id=? AND fu.status='active')");
  args.push(character);
 }
 const scope='FROM scenes s JOIN users u ON u.id=s.user_id WHERE '+where.join(' AND ');
 const count=await db.prepare('SELECT COUNT(*) AS total '+scope).bind(...args).first();
 const total=Number(count.total),totalPages=Math.max(1,Math.ceil(total/pageSize)),page=Math.min(Number(requested),totalPages);
 const rows=await all(db,'SELECT s.* '+scope+' ORDER BY s.day DESC,s.created_at DESC,s.id DESC LIMIT ? OFFSET ?',[...args,pageSize,(page-1)*pageSize]);
 const entries=rows.length?await all(db,
  `SELECT a.*,c.name,c.image_id FROM actions a JOIN characters c ON c.id=a.character_id JOIN users u ON u.id=a.user_id WHERE a.scene_id IN (${rows.map(()=>'?').join(',')}) AND u.status='active' ORDER BY a.at,a.created_at,a.id`,rows.map(row=>row.id)):[];
 const byScene=new Map(rows.map(row=>[row.id,[]]));
 for(const entry of entries)byScene.get(entry.scene_id).push(entry);
 return {items:rows.map(row=>({...row,entries:byScene.get(row.id)})),page,pageSize,total,totalPages};
}
