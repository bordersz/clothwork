/** @file Pure planning and validation helpers. No network calls or credentials. */
export const TYPES = ['Shirt', 'Pants', 'TShirt'];
export const DAY = 86_400_000;

export function isId(value) { return /^\d+$/.test(String(value ?? '').trim()) && BigInt(String(value).trim()) > 0n; }
export function normalizeType(t) {
  const s=String(t||'').toLowerCase().replace(/[^a-z]/g,'');
  if (s==='shirt'||s==='classicshirt') return 'Shirt';
  if (s==='pants'||s==='classicpants') return 'Pants';
  if (s==='tshirt'||s==='classictshirt'||s==='graphictee') return 'TShirt';
  return '';
}
export function normalizeItem(raw, fallbackType='Shirt') {
  const id=String(raw.assetId ?? raw.id ?? raw.asset_id ?? '').trim();
  if (!isId(id)) return null;
  const t=normalizeType(raw.assetType ?? raw.type ?? fallbackType);
  if (!t) return null;
  return {
    id, type:t,
    name: String(raw.name ?? raw.displayName ?? raw.assetName ?? ''),
    description: String(raw.description ?? ''),
    created: String(raw.created ?? raw.createdAt ?? raw.creationTime ?? raw.createdUtc ?? ''),
    ownerId: String(raw.creatorGroupId ?? raw.creatorTargetId ?? raw.groupId ?? ''),
    customName: String(raw.customName ?? ''), selected: raw.selected !== false && String(raw.selected ?? 'true') !== 'false',
    status: 'pending', detail:'', before:null, after:null, archive:'not_requested', lastRun:''
  };
}
export function dedupeItems(items) {
  const m=new Map();for(const item of items) if(item) m.set(item.id,item);return [...m.values()];
}
export function expand(template, item, group, index=0) {
  return String(template||'').replace(/\{(group|oldName|id|type|index)\}/g,(_,name)=>({group,oldName:item.name,id:item.id,type:item.type,index:String(index+1)})[name]);
}
export function plan(item, options, group, index=0) {
  const newName=options.nameMode==='same' ? String(options.nameText||'').trim()
    : options.nameMode==='template' ? expand(options.nameText,item,group,index).trim()
    : options.nameMode==='custom' ? String(item.customName||'').trim() : null;
  const newDescription=options.editDescription ? expand(options.description,item,group,index).trim() : null;
  const changeName=newName!==null && newName!==item.name;
  const changeDescription=newDescription!==null && newDescription!==item.description;
  const issues=[];
  if(options.nameMode!=='keep' && !newName) issues.push('Name is blank');
  if(newName!==null && newName.length>50) issues.push('Name exceeds 50 characters');
  if(newDescription!==null && newDescription.length>1000) issues.push('Description exceeds 1000 characters');
  return {newName,newDescription,changeName,changeDescription,issues};
}
export function archiveEligibility(item,now=Date.now()) {
  if(!item.created || !Number.isFinite(Date.parse(item.created))) return {eligible:false,reason:'Unknown upload date; check manually'};
  const age=now-Date.parse(item.created);
  if(age<0) return {eligible:false,reason:'Creation date is in the future'};
  const days=Math.floor(age/DAY);
  if(days<180)return {eligible:false,reason:`Only ${days} days old (requires 180 days)`};
  return {eligible:true,reason:`${days} days old; review on Roblox`};
}
export function ownerOf(asset) {
  const c=asset?.creationContext?.creator ?? {};
  return {groupId:String(c.groupId??c.group_id??''),userId:String(c.userId??c.user_id??'')};
}
export function parseCsv(text) {
  const rows=[];let row=[],cell='',quote=false;
  text=String(text).replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}
    else if(!quote&&ch===','){row.push(cell);cell='';}
    else if(!quote&&(ch==='\n'||ch==='\r')){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  if(quote)throw new Error('CSV has an unclosed quotation mark.');
  const heads=(rows.shift()||[]).map(x=>x.trim());if(!heads.includes('id'))throw new Error('CSV must include an id column.');
  return rows.map(line=>Object.fromEntries(heads.map((h,i)=>[h,line[i]??''])));
}
export function toCsv(rows) {
  const heads=['id','type','name','description','created','ownerId','customName','selected','status','detail','archive','lastRun'];
  const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  return [heads.join(','),...rows.map(item=>heads.map(k=>esc(item[k])).join(','))].join('\r\n');
}
