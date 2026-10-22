/** @file Pure planning and validation helpers. No network calls or credentials. */
export const TYPES = ['Shirt', 'Pants', 'TShirt'];
export const DAY = 86_400_000;
/** Suggested descriptive terms. Only user-selected terms from this set are appended automatically. */
export const CLOTHING_TAGS=Object.freeze([
  'black','grey','white','pink','red','blue','cute','casual','aesthetic',
  'vintage','retro','y2k','emo','goth','gothic','kawaii','alt','alternative',
  'fairy','cottagecore','cyber','cybergoth','pastel','neon','floral','flowers',
  'mushroom','cat','space','tie dye','skull','graphic','textured','clothing',
  'shirt','pants','outfit','r6'
]);
const clothingTagSet=new Set(CLOTHING_TAGS);
export function parseClothingTags(raw){
  const values=String(raw??'').replace(/\r\n?/g,'\n').split(/[,\n]+/).map(x=>x.trim().toLowerCase()).filter(Boolean);
  const invalid=[...new Set(values.filter(x=>!clothingTagSet.has(x)))];
  return {tags:[...new Set(values.filter(x=>clothingTagSet.has(x)))],invalid};
}
/** Retain all author-entered line breaks; never pad with invisible text to force a fold. */
export function formatDescription(raw){
  return String(raw??'').replace(/\r\n?/g,'\n');
}
export function appendClothingTags(description,tags){
  if(!tags.length)return formatDescription(description);
  const src=formatDescription(description);
  const list=tags.join(', ');
  // Respect a final standalone "tags" line already written by the author.
  if(/(?:^|\n)[ \t]*tags[ \t]*$/.test(src))return src+'\n'+list;
  if(!src)return 'tags\n'+list;
  return src+(src.endsWith('\n\n')?'':src.endsWith('\n')?'\n':'\n\n')+'tags\n'+list;
}


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
    : options.nameMode==='custom' ? (String(item.customName||'').trim()||null) : null;
  const selectedTags=options.editDescription&&options.includeTags?parseClothingTags(options.tagText):{tags:[],invalid:[]};
  const newDescription=options.editDescription
    ? appendClothingTags(formatDescription(expand(options.description,item,group,index)),selectedTags.tags)
    : null;
  const changeName=newName!==null && newName!==item.name;
  const changeDescription=newDescription!==null && newDescription!==item.description;
  const issues=[];
  if((options.nameMode==='same'||options.nameMode==='template') && !newName) issues.push('Name is blank');
  if(newName!==null && newName.length>50) issues.push('Name exceeds 50 characters');
  if(options.editDescription&&options.includeTags){
    if(selectedTags.invalid.length)issues.push('Remove unrecognized tags: '+selectedTags.invalid.join(', ').slice(0,180));
    if(!selectedTags.tags.length)issues.push('Select at least one clothing tag');
  }
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
