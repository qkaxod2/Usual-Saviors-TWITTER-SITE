const all=async(db,q,args=[])=>(await db.prepare(q).bind(...args).all()).results;
export function nestPosts(rows) {
 const map=new Map(rows.map(row=>[row.id,{...row,replies:[]}])) ,roots=[];
 for(const row of map.values()){
  if(row.parent_id&&map.has(row.parent_id))map.get(row.parent_id).replies.push(row);
  else if(!row.parent_id)roots.push(row);
 }
 return roots;
}
async function threads(db,ids){
 if(!ids.length)return [];
 const rows=await all(db,`SELECT p.*,c.name,c.image_id FROM visible_posts p JOIN characters c ON c.id=p.character_id WHERE p.root_id IN (${ids.map(()=>'?').join(',')}) ORDER BY p.created_at,p.id`,ids);
 const byId=new Map(nestPosts(rows).map(row=>[row.id,row]));return ids.map(id=>byId.get(id)).filter(Boolean);
}
export async function postThread(db,id,fail){
 const row=await db.prepare('SELECT root_id FROM visible_posts WHERE id=?').bind(id).first();
 if(!row)fail(404,'삭제되었거나 볼 수 없는 기록입니다.');
 return {item:(await threads(db,[row.root_id]))[0]};
}
export async function postPage(db,before){
 const roots=await all(db,'SELECT id,created_at FROM visible_posts WHERE parent_id IS NULL AND created_at<? ORDER BY created_at DESC,id DESC LIMIT 40',[before]);
 return {items:await threads(db,roots.map(row=>row.id)),next:roots.length===40?roots.at(-1).created_at:null};
}
