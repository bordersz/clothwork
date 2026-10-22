
// User preferences are local to this browser profile, not synchronized.
const THEME_KEY='clothwork_theme_v04';
async function setTheme(next){
  const theme=next==='light'?'light':'dark';
  document.documentElement.dataset.theme=theme;
  const button=document.getElementById('themeToggle');
  if(button) button.textContent=theme==='dark'?'Light mode':'Dark mode';
  try{await chrome.storage.local.set({[THEME_KEY]:theme});}catch{}
}
async function restoreTheme(){
  try{const prefs=await chrome.storage.local.get(THEME_KEY);await setTheme(prefs[THEME_KEY]||'dark');}
  catch{document.documentElement.dataset.theme='dark';}
}

import {TYPES,normalizeItem,dedupeItems,plan,archiveEligibility,ownerOf,parseCsv,toCsv,isId,CLOTHING_TAGS,parseClothingTags} from './core.js';

const $=id=>document.getElementById(id);
const SETTINGS_KEY='clothwork_v01_state';
const LIVE_KEY='clothwork_live_v03';
const CONTROL_KEY='clothwork_control_v03';
const DEFAULTS={nameMode:'keep',nameText:'',editDescription:true,description:'Made by {group}',includeTags:false,tagText:'',archiveReview:false,delay:5000};
let state={groupId:'',groupName:'',verified:false,manualMode:false,items:[],logs:[],options:{...DEFAULTS}};
let running=false,stop=false,dirtySave=null,loading=false,previewSignature=null;
const PAGE_SIZE=100;
let currentPage=0;
let liveTimer=null;
let activity={phase:'idle',message:'Open the Clothwork editor to get started.',total:0,current:0,currentName:'',
  runIds:[],lastBatch:null,startedAt:null};
function liveCounts(){
  if(!activity.runIds.length&&activity.lastBatch){
    const {done=0,failed=0,skipped=0}=activity.lastBatch;
    return {done,failed,skipped};
  }
  const ids=new Set(activity.runIds);
  const rows=state.items.filter(i=>ids.has(i.id));
  return {
    done:rows.filter(i=>['edited','already'].includes(i.status)).length,
    failed:rows.filter(i=>i.status==='failed').length,
    skipped:rows.filter(i=>i.status==='skipped').length
  };
}
function publishLiveSoon(){
  clearTimeout(liveTimer);
  liveTimer=setTimeout(publishLive,160);
}
async function publishLive(){
  const recent=state.logs.slice(0,12).map(({time,status,message,id})=>({time,status,message,id}));
  const lastBatch=activity.lastBatch;
  try{
    await chrome.storage.local.set({[LIVE_KEY]:{
      phase:activity.phase,message:activity.message,groupId:state.groupId,groupName:state.groupName,
      current:activity.current,total:activity.total,currentName:activity.currentName,
      ...liveCounts(),recent,lastBatch,updatedAt:Date.now()
    }});
  }catch(e){console.warn('Could not update Clothwork companion:',e);}
}
// A pause requested in the Roblox page is accepted only while the editor itself is open.
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local'||!changes[CONTROL_KEY])return;
  if(changes[CONTROL_KEY].newValue?.action==='pause'&&(running||loading)){
    stop=true;
    activity.message='Pause requested. Finishing the current request safely.';
    log('WAIT','Pause requested from Creator Dashboard companion');
    publishLiveSoon();
  }
});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const humanError=e=>String(e?.message||e).slice(0,400);

async function restore(){
  const restored=await chrome.storage.local.get([SETTINGS_KEY,LIVE_KEY]);
  const saved=restored[SETTINGS_KEY];
  const prior=restored[LIVE_KEY];
  if(prior?.lastBatch){activity.lastBatch=prior.lastBatch;activity.phase=prior.lastBatch.paused?'paused':'finished';activity.message='Last batch results are available.';activity.current=prior.lastBatch.processed||0;activity.total=prior.lastBatch.total||0;}

  if(saved && typeof saved==='object'){
    state.groupId=String(saved.groupId||'');state.groupName=String(saved.groupName||'');state.manualMode=!!saved.manualMode;
    state.items=Array.isArray(saved.items)?saved.items:[];state.logs=Array.isArray(saved.logs)?saved.logs:[];
    state.options={...DEFAULTS,...saved.options};
    // Preserve the user's chosen naming mode.
    // Keep the existing naming preference without silently enabling bulk renaming.
    // Safety: every new tab must verify group again, independent of saved settings.
    state.verified=false;
  }
  $('groupId').value=state.groupId;
  $('nameMode').value=state.options.nameMode;$('renameAll').checked=state.options.nameMode!=='keep';$('nameText').value=state.options.nameText;
  for(const radio of document.querySelectorAll('input[name="nameChoice"]'))radio.checked=radio.value===state.options.nameMode;
  $('editDescription').checked=state.options.editDescription;$('description').value=state.options.description;
  $('includeTags').checked=!!state.options.includeTags;renderTagChoices();
  $('archiveReview').checked=state.options.archiveReview;$('delay').value=String(state.options.delay);
  updateRuleInputs();render();publishLiveSoon();
}
async function save(){
  try{
    const safe={groupId:state.groupId,groupName:state.groupName,manualMode:state.manualMode,items:state.items,logs:state.logs.slice(0,1000),options:state.options};
    await chrome.storage.local.set({[SETTINGS_KEY]:safe});publishLiveSoon();
  }catch(e){notice('Could not save local progress: '+humanError(e),'danger');}
}
function saveSoon(){clearTimeout(dirtySave);dirtySave=setTimeout(save,450);}
function notice(message,kind=''){const el=$('notice');el.textContent=message;el.className='notice '+kind;}
function log(status,message,id=''){
  const item={time:new Date().toISOString(),status,message:String(message).slice(0,450),id:String(id)};
  state.logs.unshift(item);state.logs=state.logs.slice(0,1000);renderLogs();saveSoon();publishLiveSoon();
}
function renderLogs(){
  const root=$('logs');root.replaceChildren();
  if(!state.logs.length){const empty=document.createElement('div');empty.className='hint';empty.textContent='Activity will appear here.';root.append(empty);return;}
  for(const line of state.logs.slice(0,100)){
    const row=document.createElement('div');row.className='log '+(line.status==='ERROR'?'error':line.status==='OK'?'ok':'');
    for(const [cls,txt] of [['logtime',new Date(line.time).toLocaleTimeString()],['logstatus',line.status],['', (line.id?'#'+line.id+': ':'')+line.message]]){
      const col=document.createElement('div');col.className=cls;col.textContent=txt;row.append(col);
    }root.append(row);
  }
}
function mk(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;}
function link(url,label){const a=mk('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.style.color='#bbb5ff';return a;}
async function copyPrepared(value,label){
  try{await navigator.clipboard.writeText(String(value));notice(label+' copied. Paste and save in Roblox Creator Hub.','success');}
  catch(e){notice('Copy failed. Select text in the preview and copy manually.','danger');}
}
function filtered(){
  const search=$('search').value.toLowerCase().trim(),status=$('statusFilter').value;
  return state.items.filter(i=>(!search||`${i.id} ${i.name} ${i.type}`.toLowerCase().includes(search)) &&
    (status==='all'||(status==='pending'&&i.status==='pending')|| (status==='failed'&&i.status==='failed') ||
     (status==='skipped'&&i.status==='skipped') ||(status==='edited'&&['edited','already'].includes(i.status))||
     (status==='archive'&&i.archive==='manual_review')||(status==='archive_ready'&&archiveEligibility(i).eligible&&i.archive!=='manual_done')));
}
function compute(i){return plan(i,state.options,state.groupName||'GROUP',state.items.indexOf(i));}
function render(){
  const all=state.items;
  $('countAll').textContent=all.length.toLocaleString();$('countSelected').textContent=all.filter(x=>x.selected).length.toLocaleString();
  $('countDone').textContent=all.filter(x=>['edited','already'].includes(x.status)).length.toLocaleString();
  $('archiveEligibleCount').textContent=all.filter(x=>archiveEligibility(x).eligible&&x.archive!=='manual_done').length.toLocaleString()+' items eligible by age';
  $('countIssues').textContent=all.filter(x=>['failed','skipped'].includes(x.status)).length.toLocaleString();
  $('loadAssets').disabled=!state.verified||loading||running;
  $('verifyGroup').disabled=running||loading;
  $('preview').disabled=running||loading||(!state.verified&&!state.manualMode)||!all.some(i=>i.selected);
  $('pause').disabled=!running&&!loading;
  $('pause').textContent=loading?'Stop loading':'Pause';
  const items=filtered();
  const pages=Math.max(1,Math.ceil(items.length/PAGE_SIZE));
  currentPage=Math.min(currentPage,pages-1);
  const start=currentPage*PAGE_SIZE;
  $('visibleCount').textContent=`Showing ${items.length?start+1:0}–${Math.min(items.length,start+PAGE_SIZE)} of ${items.length.toLocaleString()} matching (${all.length.toLocaleString()} loaded)`;
  $('pageInfo').textContent=`Page ${currentPage+1} of ${pages}`;
  $('previousPage').disabled=currentPage===0;
  $('nextPage').disabled=currentPage===pages-1;
  $('selectAll').checked=items.length>0&&items.every(x=>x.selected);
  const tbody=$('rows');tbody.replaceChildren();
  if(!items.length){const tr=mk('tr');const td=mk('td','empty','Nothing to show here. Load clothing or change your search.');td.colSpan=6;tr.append(td);tbody.append(tr);}else{
    // Render first 400 rows for responsiveness. Filters and export still operate on full inventory.
    const listed=items.slice(start,start+PAGE_SIZE);
    for(const i of listed){
      const p=compute(i),tr=mk('tr');
      const ch=mk('td'),check=document.createElement('input');check.type='checkbox';check.checked=!!i.selected;
      check.addEventListener('change',()=>{i.selected=check.checked;invalidatePreview();saveSoon();render();});ch.append(check);tr.append(ch);
      const asset=mk('td');asset.append(mk('div','asset-name',i.name||'(untitled)'),mk('div','mini',`${i.type} · #${i.id}`));if(i.created)asset.append(mk('div','mini',new Date(i.created).toLocaleDateString()));tr.append(asset);
      const planned=mk('td');planned.append(mk('div','mini','Current: '+(i.name||'(no name)')));
      if(p.newName!==null)planned.append(mk('div','planned','→ '+(p.newName||'(blank)')));
      else planned.append(mk('div','notchange','Name unchanged'));
      if(p.changeDescription)planned.append(mk('div','mini','Description will change'));
      if(p.issues.length)planned.append(mk('div','detail',p.issues.join('; ')));
      tr.append(planned);
      const custom=mk('td','advancedColumn');const inp=document.createElement('input');inp.className='custom';inp.value=i.customName||'';inp.placeholder='Leave blank to keep name';inp.maxLength=50;inp.setAttribute('aria-label','New name for '+(i.name||'item '+i.id));
      inp.addEventListener('change',()=>{i.customName=inp.value;invalidatePreview();saveSoon();render();});custom.append(inp);tr.append(custom);
      const status=mk('td'),actions=mk('td');status.append(mk('span','tag '+i.status,(i.status||'pending').replaceAll('_',' ')));
      if(i.detail)status.append(mk('div','detail',i.detail));
      if(archiveEligibility(i).eligible && i.archive!=='manual_done'){
        const archiveLink=link('https://create.roblox.com/dashboard/creations?activeTab=AvatarItems-classics','Archive on Roblox ↗');
        archiveLink.title='Find this item in Roblox Creator Hub, click its three-dot menu and choose Archive in Marketplace. Clothwork does not archive automatically.';
        const note=mk('div','mini','Eligible by age · find ⋯ in Roblox');
        actions.append(document.createElement('div'),archiveLink,note);
      }
      if(i.archive!=='manual_done'&&(i.archive==='manual_review'||archiveEligibility(i).eligible)){const e=archiveEligibility(i);status.append(mk('div','detail',`Archive: ${e.reason}`));}
      tr.append(status);
      const open=link(`https://create.roblox.com/dashboard/creations/catalog/${encodeURIComponent(i.id)}/configure`,'Open in Roblox ↗');
      actions.append(open);
      const plannedName=p.newName===null?i.name:p.newName;
      const plannedDesc=p.newDescription===null?i.description:p.newDescription;
      const copyName=mk('button','smallbtn',p.newName===null?'Name unchanged':'Copy name');
      copyName.type='button';copyName.disabled=p.newName===null;
      copyName.title=p.newName===null?'Name is not being changed':'Copy your prepared new name';
      copyName.addEventListener('click',()=>copyPrepared(p.newName||'','Name'));
      const copyDesc=mk('button','smallbtn',p.newDescription===null?'Description unchanged':'Copy description');
      copyDesc.type='button';copyDesc.disabled=p.newDescription===null;
      copyDesc.title=p.newDescription===null?'Description is not being changed':'Copy your prepared description with spacing';
      copyDesc.addEventListener('click',()=>copyPrepared(p.newDescription||'','Description'));
      const mark=mk('button','smallbtn',i.status==='edited'?'Saved ✓':'Mark saved');
      mark.type='button';mark.addEventListener('click',()=>{
        if(i.status==='edited')return;
        i.status='edited';i.detail='Manually saved in Roblox (user confirmed)';
        i.name=String(plannedName||i.name);i.description=String(plannedDesc??i.description);
        archiveAfter(i,state.options.archiveReview);log('OK','Confirmed saved in Roblox',i.id);saveSoon();render();
      });
      actions.append(document.createElement('div'),copyName,copyDesc,mark);
      if(i.archive==='manual_review'){
        const b=mk('button','smallbtn',i.archive==='manual_done'?'Archived ✓':'Mark archived');b.style.marginTop='7px';b.title='Only mark after actually archiving it on Roblox';
        b.addEventListener('click',()=>{if(confirm('Did you personally confirm Marketplace archiving for asset '+i.id+' on Roblox?')){i.archive='manual_done';log('OK','Manually marked as Marketplace archived',i.id);saveSoon();render();}});
        actions.append(document.createElement('div'),b);
      }
      tr.append(actions);tbody.append(tr);
    }
  }
  renderLogs();
  refreshExample();
  refreshPreviewAccess();
}
function selectedTagText(){
  return [...document.querySelectorAll('.clothingTag:checked')].map(x=>x.value).join(', ');
}
function renderTagChoices(){
  const root=$('tagChoices');root.replaceChildren();
  const selected=new Set(parseClothingTags(state.options.tagText).tags);
  for(const tag of CLOTHING_TAGS){
    const label=mk('label','tagChoice'),input=document.createElement('input');
    input.type='checkbox';input.className='clothingTag';input.value=tag;input.checked=selected.has(tag);
    input.addEventListener('change',updateOptions);
    label.append(input,document.createTextNode(tag));root.append(label);
  }
}
function updateRuleInputs(){
  const mode=$('nameMode').value;
  $('renameAll').checked=mode!=='keep';
  $('nameArea').hidden=mode!=='same'&&mode!=='template';
  $('individualHelp').hidden=mode!=='custom';
  document.body.classList.toggle('individual-names',mode==='custom');
  for(const radio of document.querySelectorAll('input[name="nameChoice"]'))radio.checked=radio.value===mode;
  $('nameText').disabled=mode!=='same'&&mode!=='template';
  $('nameText').placeholder=mode==='template'?'Example: {oldName} | {group}':'Example: vintage black jeans';
  $('descriptionArea').hidden=!$('editDescription').checked;
  $('description').disabled=!$('editDescription').checked;
  $('includeTags').disabled=!$('editDescription').checked;
  $('tagOptions').hidden=!$('editDescription').checked||!$('includeTags').checked;
  $('nameCount').textContent=$('nameText').value.length+' / 50';
  $('descriptionCount').textContent=$('description').value.length+' / 1000';
  $('tagCount').textContent=parseClothingTags(selectedTagText()).tags.length+' selected';
}
function updateOptions(){
  state.options={nameMode:$('nameMode').value,nameText:$('nameText').value,editDescription:$('editDescription').checked,
    description:$('description').value,includeTags:$('includeTags').checked,tagText:selectedTagText(),archiveReview:$('archiveReview').checked,delay:Number($('delay').value)};
  invalidatePreview();updateRuleInputs();saveSoon();render();
}
function invalidatePreview(){
  if(previewSignature!==null){
    previewSignature=null;
    $('previewSummary').textContent='Selections changed. Select Start editing again to prepare the updated choices.';
    $('previewSummary').className='previewSummary';
  }
}
function makeSignature(){
  return JSON.stringify({groupId:state.groupId,groupName:state.groupName,verified:state.verified,manualMode:state.manualMode,options:state.options,
    items:state.items.filter(i=>i.selected).map(i=>[i.id,i.type,i.name,i.description,i.customName])});
}
function planCandidates(options=state.options){
  const candidates=[];
  for(let index=0;index<state.items.length;index++){
    const item=state.items[index];if(!item.selected)continue;
    const p=plan(item,options,state.groupName,index);
    if(p.changeName||p.changeDescription||(options.archiveReview&&item.archive!=='manual_done'))candidates.push(item);
  }
  return candidates;
}
function refreshExample(){
  const selected=state.items.find(i=>i.selected)||state.items[0]||{name:'Example item',description:'',id:'123',type:'Shirt'};
  const p=plan(selected,state.options,state.groupName||'your group',Math.max(0,state.items.indexOf(selected)));
  $('sampleOld').textContent=selected.name||'(untitled clothing)';
  $('sampleNew').textContent=p.newName===null?'Name stays the same':p.newName||'Type a new name above';
  $('sampleDesc').textContent=p.newDescription===null?'Description stays the same':p.newDescription||'(empty description)';
  $('sampleDesc').classList.remove('expanded');
  requestAnimationFrame(()=>{
    const body=$('sampleDesc'),button=$('sampleReadMore');
    const overflowing=body.scrollHeight>body.clientHeight+3;
    button.hidden=!overflowing;
    button.textContent='Read more';
  });
}
function refreshPreviewAccess(){
  const ready=!!previewSignature && previewSignature===makeSignature() && (state.verified||state.manualMode);
  $('liveSection').hidden=true; // A single start action, no extra go step.
  $('confirmGroupLabel').textContent='“'+(state.groupName||'your group')+'”';
  const count=planCandidates().length;
  $('apply').textContent='Go to clothing list · '+count.toLocaleString()+' ready ↓';
  $('apply').disabled=running||loading||!ready||!count;
  $('preview').disabled=running||loading||(!state.verified&&!state.manualMode)||!state.items.some(i=>i.selected);
  $('nameCount').textContent=$('nameText').value.length+' / 50';
  $('descriptionCount').textContent=$('description').value.length+' / 1000';
}
function previewBatch(){
  if(running||loading)return;
  if(!state.verified&&!state.manualMode){notice('Check a group or add one item using a clothing link or ID.','danger');return;}
  updateOptions();
  if(!state.verified&&state.options.editDescription&&/\{group\}/i.test(state.options.description)){
    notice('Replace {group} in your description with the real creator or group name before previewing a manually added item.','danger');return;
  }
  const selected=state.items.filter(i=>i.selected);
  if(!selected.length){notice('Load and select at least one clothing item first.','danger');return;}
  const {nameMode,editDescription,archiveReview}=state.options;
  if(nameMode==='keep'&&!editDescription&&!archiveReview){notice('Turn on changing names or descriptions in Step 2.','danger');return;}
  const invalid=selected.map(i=>({item:i,issues:compute(i).issues})).filter(x=>x.issues.length);
  const candidates=planCandidates();
  if(invalid.length){
    previewSignature=null;
    const first=invalid.slice(0,3).map(x=>`#${x.item.id}: ${x.issues.join(', ')}`).join(' | ');
    $('previewSummary').textContent=`Can't continue yet: ${invalid.length} item(s) have a problem. ${first}`;
    $('previewSummary').className='previewSummary bad';
    notice('Fix the name or description in Step 2, then select Start editing.','danger');
    render();return;
  }
  if(!candidates.length){
    previewSignature=null;$('previewSummary').textContent='All selected clothing already matches these changes. There is nothing new to apply.';
    $('previewSummary').className='previewSummary';notice('No changes needed.','success');render();return;
  }
  const shirts=candidates.filter(x=>x.type==='Shirt').length,pants=candidates.filter(x=>x.type==='Pants').length,tees=candidates.filter(x=>x.type==='TShirt').length;
  const changes=[];
  if(nameMode!=='keep')changes.push('name');
  if(editDescription)changes.push('description');
  if(archiveReview)changes.push('manual archive checklist');
  $('previewSummary').textContent=`✓ Ready to review ${candidates.length.toLocaleString()} item(s): ${shirts} shirts, ${pants} pants${tees?`, ${tees} T-shirts`:''}. Changes: ${changes.join(' + ')}. Nothing has been changed on Roblox.`;
  $('previewSummary').className='previewSummary ok';
  previewSignature=makeSignature();activity.phase='preview';activity.message=`${candidates.length} item(s) ready for preview. No edits made.`;publishLiveSoon();
  notice('Ready. Work through your clothing list and save each change in Roblox.','success');
  log('READY',`Prepared ${candidates.length} selected item(s). No Roblox assets changed.`);
  currentPage=0;
  render();
  document.querySelector('.inventory')?.scrollIntoView({behavior:'smooth',block:'start'});
}

async function fetchJson(url,opts={},maxAttempts=4){
  let last;
  for(let attempt=0;attempt<maxAttempts;attempt++){
    if(stop)throw new Error('Paused by user');
    let resp;
    try{resp=await fetch(url,{...opts,signal:AbortSignal.timeout(25000)});}
    catch(e){last=new Error('Network failure: '+humanError(e));if(attempt===maxAttempts-1)throw last;await sleep(1000*2**attempt);continue;}
    const text=await resp.text();let data;try{data=text?JSON.parse(text):{};}catch{data={message:text.slice(0,250)};}
    if(resp.ok)return data;
    const detail=data?.errors?.[0]?.message||data?.message||data?.error?.message||`HTTP ${resp.status}`;
    last=new Error(`HTTP ${resp.status}: ${String(detail).slice(0,220)}`);
    last.httpStatus=resp.status;
    if(![429,500,502,503,504].includes(resp.status)||attempt===maxAttempts-1)throw last;
    const header=Number(resp.headers.get('Retry-After'));
    const wait=resp.status===429?Math.min(120000,Math.max(10000,Number.isFinite(header)&&header>0?header*1000:10000*2**attempt)):
      Math.min(30000,1800*2**attempt);
    log('WAIT',`Roblox ${resp.status}; retrying after ${Math.ceil(wait/1000)} seconds`);
    await sleep(wait);
  }
  throw last||new Error('Unknown request failure');
}
async function verifyGroup(){
  const id=$('groupId').value.trim();state.verified=false;invalidatePreview();
  if(!isId(id)){notice('Enter a valid numeric Roblox group ID.','danger');render();return;}
  if(state.groupId&&state.groupId!==id){
    if(!confirm('Switching groups clears the current item list. Export the report first if you need it. Continue?'))return;
    state.items=[];state.logs=[];
  }
  state.groupId=id;activity.phase='idle';activity.message='Checking group ownership';publishLiveSoon();
  $('groupVerified').className='verification';$('groupVerified').textContent='Checking Roblox...';
  try{
    const g=await fetchJson('https://groups.roblox.com/v1/groups/'+encodeURIComponent(id),{credentials:'omit'});
    if(String(g.id)!==id||!g.name)throw Error('Group lookup returned an unexpected identity');
    state.groupName=g.name;state.verified=true;
    $('groupVerified').className='verification ok';$('groupVerified').textContent=`✓ ${g.name} · Group #${id}`;
    notice(`Group found: “${g.name}” (#${id}). Choose clothing, preview it, and save changes through Roblox.`,'success');
    log('OK','Verified group '+g.name);await save();
  }catch(e){$('groupVerified').className='verification bad';$('groupVerified').textContent=humanError(e);notice('Group verification failed. No changes allowed.','danger');}
  render();
}
async function loadAssets(){
  if(!state.verified)return;
  const selected=[...document.querySelectorAll('.typeSelect:checked')].map(x=>x.value);
  if(!selected.length){notice('Select at least one clothing type.','danger');return;}
  if(state.items.length&&!confirm('Load new inventory from this group? Existing per-item statuses will be preserved when IDs match.'))return;
  invalidatePreview();loading=true;stop=false;activity.phase='loading';activity.message='Loading group clothing inventory…';activity.currentName='';publishLiveSoon();render();
  const keep=new Map(state.items.filter(x=>selected.includes(x.type)).map(x=>[x.id,x]));let count=0,partial=0;
  state.items=[...keep.values()];render();
  for(const type of selected){
    if(stop){partial++;log('WARN','Clothing loading stopped by user. The inventory is incomplete.');break;}
    let cursor='',page=0;
    try{
      do{
        page++;const query=new URLSearchParams({assetType:type,groupId:state.groupId,limit:'50',sortOrder:'Asc',isArchived:'false'});
        if(cursor)query.set('cursor',cursor);
        const json=await fetchJson('https://itemconfiguration.roblox.com/v1/creations/get-assets?'+query,
          {credentials:'include'});
        const data=Array.isArray(json.data)?json.data:Array.isArray(json.assets)?json.assets:[];
        for(const raw of data){
          const item=normalizeItem(raw,type);if(!item)continue;
          // Never import an explicitly contradictory group owner.
          if(item.ownerId && item.ownerId!==state.groupId){log('SKIP','Inventory asset has a different reported owner',item.id);continue;}
          const existing=keep.get(item.id);
          if(existing){const preserved={...existing,...item,selected:existing.selected,customName:existing.customName,status:existing.status,detail:existing.detail,before:existing.before,after:existing.after,archive:existing.archive,lastRun:existing.lastRun};keep.set(item.id,preserved);}
          else keep.set(item.id,item);
          count++;
        }
        state.items=dedupeItems([...keep.values()]);render();await save();
        cursor=json.nextPageCursor||json.nextCursor||'';
        if(page%5===0)log('LOAD',`${type}: page ${page}, ${count} total rows retrieved`);
        if(cursor){await sleep(1000);} // steady pacing between Roblox inventory pages
      }while(cursor&&!stop);
      if(cursor){partial++;log('WARN',`${type}: stopped at page ${page}. Loading is partial; export the inventory and try again.`);}
      else log('OK',`${type}: completed ${page} page(s)`);
    }catch(e){partial++;log('ERROR',`${type} inventory stopped at page ${page}: ${humanError(e)}`);}
  }
  loading=false;activity.phase=stop?'paused':'idle';activity.message=partial?'Some items could not be loaded. Review the log.':'Clothing loaded. Ready to preview.';render();await save();publishLiveSoon();
  notice(`Loaded ${count} inventory records (${state.items.length} unique items). ${partial?`${partial} type(s) only partially loaded; see log.`:'Ready to review.'}`,partial?'danger':'success');
}
function archiveAfter(item,archiveReview){
  if(!archiveReview)return;
  if(item.status==='failed'||item.status==='skipped')return;
  item.archive='manual_review';
  const e=archiveEligibility(item);
  log(e.eligible?'REVIEW':'SKIP',e.eligible?'Eligible by age for manual archive review':`Cannot confirm archive eligibility: ${e.reason}`,item.id);
}
async function startBatch(){notice('Use Copy name / Copy description in each clothing row, save in Roblox, then select Mark saved.','success');document.querySelector('.inventory')?.scrollIntoView({behavior:'smooth'});}

function exportText(name,content,type='text/csv'){
  const blob=new Blob([content],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function wire(){
  $('verifyGroup').addEventListener('click',verifyGroup);
  $('renameAll').addEventListener('change',()=>{$('nameMode').value=$('renameAll').checked?'same':'keep';updateOptions();});
  for(const radio of document.querySelectorAll('input[name="nameChoice"]'))radio.addEventListener('change',()=>{if(radio.checked){$('nameMode').value=radio.value;updateOptions();}});
  $('goToNames').addEventListener('click',()=>document.querySelector('.inventory')?.scrollIntoView({behavior:'smooth',block:'start'}));
  $('showArchiveEligible').addEventListener('click',()=>{const eligible=state.items.filter(i=>archiveEligibility(i).eligible&&i.archive!=='manual_done');if(!eligible.length){notice('No loaded items are confirmed old enough for the archiving checklist.','danger');return;}$('statusFilter').value='archive_ready';render();document.querySelector('.inventory')?.scrollIntoView({behavior:'smooth',block:'start'});});
  $('nameMode').addEventListener('change',updateOptions);
  $('creditShortcut').addEventListener('click',()=>{$('description').value='Made by {group}';$('editDescription').checked=true;updateOptions();});
  $('preview').addEventListener('click',previewBatch);
  $('includeTags').addEventListener('change',updateOptions);
  $('sampleReadMore').addEventListener('click',()=>{
    const expanded=$('sampleDesc').classList.toggle('expanded');
    $('sampleReadMore').textContent=expanded?'Read less':'Read more';
  });
  $('testOne').addEventListener('change',refreshPreviewAccess);
  $('groupId').addEventListener('input',()=>{
    if($('groupId').value.trim()!==state.groupId){invalidatePreview();state.verified=false;$('groupVerified').textContent='Unverified group ID';$('groupVerified').className='verification';render();}
  });
  $('loadAssets').addEventListener('click',loadAssets);
  for(const name of ['nameText','editDescription','description','archiveReview','delay']) $(name).addEventListener('input',updateOptions);
  $('search').addEventListener('input',()=>{currentPage=0;render();});
   $('statusFilter').addEventListener('change',()=>{currentPage=0;render();});
   $('previousPage').addEventListener('click',()=>{currentPage=Math.max(0,currentPage-1);render();document.querySelector('.inventory')?.scrollIntoView({block:'start'});});
   $('nextPage').addEventListener('click',()=>{currentPage++;render();document.querySelector('.inventory')?.scrollIntoView({block:'start'});});
  $('selectAll').addEventListener('change',e=>{for(const item of filtered())item.selected=e.target.checked;invalidatePreview();saveSoon();render();});
  $('selectVisible').addEventListener('click',()=>{for(const i of filtered())i.selected=true;invalidatePreview();saveSoon();render();});
  $('deselectAll').addEventListener('click',()=>{for(const i of state.items)i.selected=false;invalidatePreview();saveSoon();render();});
  $('apply').addEventListener('click',startBatch);
  $('pause').addEventListener('click',()=>{stop=true;$('runMessage').textContent=loading?'Stopping inventory loading after the current request...':'Pausing after the current item or cooldown...';});
  $('resetFailures').addEventListener('click',()=>{
    const failed=state.items.filter(i=>['failed','skipped'].includes(i.status));
    if(!failed.length){notice('No failed or skipped items to retry.');return;}
    for(const i of state.items){i.selected=failed.includes(i);if(failed.includes(i)){i.status='pending';i.detail='';}}
    invalidatePreview();
    $('statusFilter').value='all';notice(`Selected ${failed.length} failed/skipped items for another attempt. Check group and errors before retry.`);saveSoon();render();
  });
  $('addItem').addEventListener('click',()=>{
    const input=$('addItemInput').value.trim();let assetId='';
    if(/^\d+$/.test(input))assetId=input;
    else{
      try{
        const url=new URL(input);
        if(!url.protocol.startsWith('http')||!/(^|\.)roblox\.com$/i.test(url.hostname))throw Error('Not a Roblox link');
        const match=url.pathname.match(/\/(?:catalog|library|assets?|creations)\/(?:catalog\/)?(\d+)(?:\/|$)/i);
        if(!match)throw Error('No asset ID found in link');
        assetId=match[1];
      }catch{notice('Enter a numeric clothing asset ID or a Roblox catalog/configuration URL.','danger');return;}
    }
    if(!isId(assetId)){notice('Please enter a valid asset ID.','danger');return;}
    const existing=state.items.find(x=>x.id===assetId);
    if(existing){existing.selected=true;notice('This item is already in your list and is selected.','success');}
    else{
      const item=normalizeItem({assetId,assetType:$('addItemType').value,name:$('addItemName').value.trim()||'Item #'+assetId});
      if(!item){notice('Could not prepare the clothing ID.','danger');return;}
      state.items.push(item);
      notice('Added item #'+assetId+'. Review its name and description before copying.','success');
    }
    state.manualMode=true;
    $('addItemInput').value='';$('addItemName').value='';
    invalidatePreview();render();saveSoon();document.querySelector('.inventory')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('importCsv').addEventListener('click',()=>{$('csvFile').click();});
  $('csvFile').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!state.verified){notice('Verify the target group before importing items.','danger');e.target.value='';return;}
    try{
      const raw=parseCsv(await file.text());const imported=[];
      for(const entry of raw){
        const item=normalizeItem({...entry,assetType:entry.type,creatorGroupId:entry.ownerId||entry.groupId,createdAt:entry.created,displayName:entry.name});
        if(!item)continue;
        if(item.ownerId&&item.ownerId!==state.groupId){log('SKIP','CSV owner ID differs from verified group',item.id);continue;}
        imported.push(item);
      }
      if(!imported.length)throw Error('No valid clothing rows. Required: id, type, name; optional: created, customName, ownerId.');
      invalidatePreview();state.items=dedupeItems([...state.items,...imported]);await save();render();notice(`Imported ${imported.length} rows. Review each item and save changes manually in Roblox.`,'success');
    }catch(err){notice('CSV import failed: '+humanError(err),'danger');}finally{e.target.value='';}
  });
  $('exportCsv').addEventListener('click',()=>exportText('clothwork-assets-'+(state.groupId||'group')+'.csv',toCsv(state.items)));
  $('exportLog').addEventListener('click',()=>exportText('clothwork-report-'+(state.groupId||'group')+'.json',JSON.stringify({exported:new Date().toISOString(),group:{id:state.groupId,name:state.groupName},items:state.items,activity:state.logs},null,2),'application/json'));
  $('themeToggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
  $('clearHistory').addEventListener('click', async()=>{
    if(running||loading){notice('Pause the running batch before clearing local data.','danger');return;}
    if(!confirm('Erase the locally saved clothing inventory, activity history, and last results? This does NOT change anything on Roblox. Export a report first if you want to keep it.'))return;
    await chrome.storage.local.remove([SETTINGS_KEY,LIVE_KEY,CONTROL_KEY]);
    location.reload();
  });
}
wire();await restoreTheme();await restore();
// A running batch does not survive closing this tab. Heartbeats let the companion
// distinguish a working editor from a tab that crashed or was closed.
setInterval(()=>{if(running||loading)publishLiveSoon();},5000);

