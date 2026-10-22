
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

import {TYPES,normalizeItem,dedupeItems,plan,archiveEligibility,ownerOf,parseCsv,toCsv,isId} from './core.js';
import {getClientId,setClientId,redirectUri,signIn,signOut,getSessionInfo,accessToken} from './oauth.js';

const $=id=>document.getElementById(id);
const SETTINGS_KEY='clothwork_v01_state';
const LIVE_KEY='clothwork_live_v03';
const CONTROL_KEY='clothwork_control_v03';
const DEFAULTS={nameMode:'same',nameText:'',editDescription:true,description:'Made by {group}',archiveReview:false,delay:5000};
let state={groupId:'',groupName:'',verified:false,items:[],logs:[],options:{...DEFAULTS}};
let running=false,stop=false,dirtySave=null,loading=false,previewSignature=null;
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
    state.groupId=String(saved.groupId||'');state.groupName=String(saved.groupName||'');
    state.items=Array.isArray(saved.items)?saved.items:[];state.logs=Array.isArray(saved.logs)?saved.logs:[];
    state.options={...DEFAULTS,...saved.options};
    // v0.1 default was 'keep'; the easy editor starts with 'same' for blank legacy defaults.
    if (state.options.nameMode==='keep' && !state.options.nameText) state.options.nameMode='same';
    // Safety: every new tab must verify group again, independent of saved settings.
    state.verified=false;
  }
  $('groupId').value=state.groupId;
  $('nameMode').value=state.options.nameMode;$('renameAll').checked=state.options.nameMode!=='keep';$('nameText').value=state.options.nameText;
  $('editDescription').checked=state.options.editDescription;$('description').value=state.options.description;
  $('archiveReview').checked=state.options.archiveReview;$('delay').value=String(state.options.delay);
  updateRuleInputs();render();publishLiveSoon();
}
async function save(){
  try{
    const safe={groupId:state.groupId,groupName:state.groupName,items:state.items,logs:state.logs.slice(0,1000),options:state.options};
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
function filtered(){
  const search=$('search').value.toLowerCase().trim(),status=$('statusFilter').value;
  return state.items.filter(i=>(!search||`${i.id} ${i.name} ${i.type}`.toLowerCase().includes(search)) &&
    (status==='all'||(status==='pending'&&i.status==='pending')|| (status==='failed'&&i.status==='failed') ||
     (status==='skipped'&&i.status==='skipped') ||(status==='edited'&&['edited','already'].includes(i.status))||
     (status==='archive'&&i.archive==='manual_review')));
}
function compute(i){return plan(i,state.options,state.groupName||'GROUP',state.items.indexOf(i));}
function render(){
  const all=state.items;
  $('countAll').textContent=all.length.toLocaleString();$('countSelected').textContent=all.filter(x=>x.selected).length.toLocaleString();
  $('countDone').textContent=all.filter(x=>['edited','already'].includes(x.status)).length.toLocaleString();
  $('countIssues').textContent=all.filter(x=>['failed','skipped'].includes(x.status)).length.toLocaleString();
  $('loadAssets').disabled=!state.verified||loading||running;
  $('verifyGroup').disabled=running||loading;
  $('preview').disabled=running||loading||!state.verified||!all.some(i=>i.selected);
  $('pause').disabled=!running&&!loading;
  $('pause').textContent=loading?'Stop loading':'Pause';
  const items=filtered();$('visibleCount').textContent=`Showing ${items.length.toLocaleString()} of ${all.length.toLocaleString()}`;
  $('selectAll').checked=items.length>0&&items.every(x=>x.selected);
  const tbody=$('rows');tbody.replaceChildren();
  if(!items.length){const tr=mk('tr');const td=mk('td','empty','Nothing to show here. Load clothing or change your search.');td.colSpan=6;tr.append(td);tbody.append(tr);}else{
    // Render first 400 rows for responsiveness. Filters and export still operate on full inventory.
    const listed=items.slice(0,400);
    for(const i of listed){
      const p=compute(i),tr=mk('tr');
      const ch=mk('td'),check=document.createElement('input');check.type='checkbox';check.checked=!!i.selected;
      check.addEventListener('change',()=>{i.selected=check.checked;invalidatePreview();saveSoon();render();});ch.append(check);tr.append(ch);
      const asset=mk('td');asset.append(mk('div','asset-name',i.name||'(untitled)'),mk('div','mini',`${i.type} · #${i.id}`));if(i.created)asset.append(mk('div','mini',new Date(i.created).toLocaleDateString()));tr.append(asset);
      const planned=mk('td');planned.append(mk('div','mini','Current: '+(i.name||'(no name)')));
      if(state.options.nameMode!=='keep')planned.append(mk('div','planned','→ '+(p.newName||'(blank)')));
      else planned.append(mk('div','notchange','Name unchanged'));
      if(p.changeDescription)planned.append(mk('div','mini','Description will change'));
      if(p.issues.length)planned.append(mk('div','detail',p.issues.join('; ')));
      tr.append(planned);
      const custom=mk('td');const inp=document.createElement('input');inp.className='custom';inp.value=i.customName||'';inp.placeholder='Optional override';
      inp.addEventListener('change',()=>{i.customName=inp.value;invalidatePreview();saveSoon();render();});custom.append(inp);tr.append(custom);
      const status=mk('td');status.append(mk('span','tag '+i.status,(i.status||'pending').replaceAll('_',' ')));
      if(i.detail)status.append(mk('div','detail',i.detail));
      if(i.archive==='manual_review'){const e=archiveEligibility(i);status.append(mk('div','detail',`Archive: ${e.reason}`));}
      tr.append(status);
      const actions=mk('td');actions.append(link(`https://create.roblox.com/dashboard/creations/catalog/${encodeURIComponent(i.id)}/configure`,'Configure ↗'));
      if(i.archive==='manual_review'){
        const b=mk('button','smallbtn','Mark archived');b.style.marginTop='7px';b.title='Only mark after actually archiving it on Roblox';
        b.addEventListener('click',()=>{if(confirm('Did you personally confirm Marketplace archiving for asset '+i.id+' on Roblox?')){i.archive='manual_done';log('OK','Manually marked as Marketplace archived',i.id);saveSoon();render();}});
        actions.append(document.createElement('div'),b);
      }
      tr.append(actions);tbody.append(tr);
    }
    if(items.length>400){const tr=mk('tr'),td=mk('td','empty','Displaying the first 400 matches. Narrow your search to access the rest.');td.colSpan=6;tr.append(td);tbody.append(tr);}
  }
  renderLogs();
  refreshExample();
  refreshPreviewAccess();
}
function updateRuleInputs(){
  const mode=$('nameMode').value;
  $('renameAll').checked=mode!=='keep';
  $('nameArea').hidden=mode==='keep';
  $('nameText').disabled=mode==='keep'||mode==='custom';
  $('nameText').placeholder=mode==='template'?'Example: {oldName} | {group}':'Example: vintage black jeans';
  $('descriptionArea').hidden=!$('editDescription').checked;
  $('description').disabled=!$('editDescription').checked;
  $('nameCount').textContent=$('nameText').value.length+' / 50';
  $('descriptionCount').textContent=$('description').value.length+' / 1000';
}
function updateOptions(){
  state.options={nameMode:$('nameMode').value,nameText:$('nameText').value,editDescription:$('editDescription').checked,
    description:$('description').value,archiveReview:$('archiveReview').checked,delay:Number($('delay').value)};
  invalidatePreview();updateRuleInputs();saveSoon();render();
}
function invalidatePreview(){
  if(previewSignature!==null){
    previewSignature=null;
    $('previewSummary').textContent='Settings or selections changed. Click “Preview changes” again before saving anything.';
    $('previewSummary').className='previewSummary';
  }
}
function makeSignature(){
  return JSON.stringify({groupId:state.groupId,groupName:state.groupName,verified:state.verified,options:state.options,
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
}
function refreshPreviewAccess(){
  const ready=!!previewSignature && previewSignature===makeSignature() && state.verified;
  $('liveSection').hidden=!ready;
  $('confirmGroupLabel').textContent='“'+(state.groupName||'your group')+'”';
  const count=planCandidates().length;
  $('apply').textContent=$('testOne').checked?'Test edit on 1 item':'Apply to '+count.toLocaleString()+' selected items';
  $('apply').disabled=running||loading||!ready||!count;
  $('preview').disabled=running||loading||!state.verified||!state.items.some(i=>i.selected);
  $('nameCount').textContent=$('nameText').value.length+' / 50';
  $('descriptionCount').textContent=$('description').value.length+' / 1000';
}
function previewBatch(){
  if(running||loading)return;
  if(!state.verified){notice('Please check the group in Step 1 first.','danger');return;}
  updateOptions();
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
    notice('Fix the name or description in Step 2, then preview again.','danger');
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
  notice('Preview ready! Review the example above, then decide whether to test a real edit.','success');
  log('PREVIEW',`Checked ${candidates.length} selected item(s). No Roblox assets changed.`);
  render();
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
    notice(`Verified “${g.name}” (#${id}). All live edits require matching creator ownership in the Open Cloud response.`,'success');
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
        if(cursor){await sleep(700);} // respectful listing pace
      }while(cursor&&page<1000&&!stop);
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
async function cloud(url,options={}){
  const makeOpts=async (refresh=false)=>({...options,headers:{...options.headers,Authorization:'Bearer '+await accessToken(refresh)},credentials:'omit'});
  try{return await fetchJson(url,await makeOpts());}
  catch(e){if(e.httpStatus===401)return fetchJson(url,await makeOpts(true));throw e;}
}
async function runOne(item,index,options){
  const p=plan(item,options,state.groupName,index);item.lastRun=new Date().toISOString();
  if(p.issues.length){item.status='skipped';item.detail=p.issues.join('; ');log('SKIP',item.detail,item.id);return;}
  let actual;
  try{actual=await cloud('https://apis.roblox.com/assets/v1/assets/'+item.id);}
  catch(e){item.status='failed';item.detail='Could not verify asset via Open Cloud: '+humanError(e);log('ERROR',item.detail,item.id);return;}
  const owner=ownerOf(actual);
  if(owner.groupId!==state.groupId){item.status='skipped';item.detail=owner.groupId?'Owner mismatch: group #'+owner.groupId:'No verified group owner in API response';log('SKIP',item.detail,item.id);return;}
  const advertised=String(actual.assetType||'').toLowerCase(),expected=item.type.toLowerCase();
  if(advertised&&(/shirt|pants|tshirt/.test(advertised))&&!advertised.replace(/[^a-z]/g,'').includes(expected)){
    item.status='skipped';item.detail='API type did not match selected clothing type';log('SKIP',item.detail,item.id);return;
  }
  const currentName=String(actual.displayName??item.name),currentDesc=String(actual.description??item.description);
  item.before={name:currentName,description:currentDesc};
  const newName=p.newName,newDesc=p.newDescription;
  const mask=[],body={assetId:item.id};
  if(newName!==null&&newName!==currentName){mask.push('displayName');body.displayName=newName;}
  if(newDesc!==null&&newDesc!==currentDesc){mask.push('description');body.description=newDesc;}
  if(!mask.length){item.status='already';item.detail='Requested metadata already matches';item.after=item.before;log('OK',item.detail,item.id);archiveAfter(item,options.archiveReview);return;}
  const form=new FormData();form.append('request',JSON.stringify(body));
  const url='https://apis.roblox.com/assets/v1/assets/'+item.id+'?updateMask='+encodeURIComponent(mask.join(','));
  try{
    const result=await cloud(url,{method:'PATCH',body:form}),opPath=String(result.path||'');
    if(opPath.startsWith('operations/')){
      let complete=false;
      for(let n=0;n<6;n++){await sleep(Math.min(5000,1000*(n+1)));const op=await cloud('https://apis.roblox.com/assets/v1/'+opPath);
        if(op.done){if(op.error)throw Error(op.error.message||'Roblox asset operation failed');complete=true;break;}
      }
      if(!complete)throw Error('Update operation still pending; inspect manually before retry');
    }
    await sleep(600);
    const check=await cloud('https://apis.roblox.com/assets/v1/assets/'+item.id);
    if((mask.includes('displayName')&&check.displayName!==newName)||(mask.includes('description')&&check.description!==newDesc))throw Error('Update returned but was not confirmed by follow-up GET');
    item.status='edited';item.name=String(check.displayName??item.name);item.description=String(check.description??item.description);item.after={name:item.name,description:item.description};item.detail='Updated and verified';log('OK','Updated: '+mask.join(', '),item.id);
    archiveAfter(item,options.archiveReview);
  }catch(e){
    try{const check=await cloud('https://apis.roblox.com/assets/v1/assets/'+item.id);
      if((!mask.includes('displayName')||check.displayName===newName)&&(!mask.includes('description')||check.description===newDesc)){item.status='edited';item.name=String(check.displayName??item.name);item.description=String(check.description??item.description);item.after={name:item.name,description:item.description};item.detail='Update confirmed after ambiguous error';log('OK',item.detail,item.id);archiveAfter(item,options.archiveReview);return;}
    }catch{}
    item.status='failed';item.detail='Edit failed: '+humanError(e);log('ERROR',item.detail,item.id);
  }
}
async function startBatch(){
  if(running||loading)return;
  if(!state.verified){notice('Check your group in Step 1 again.','danger');return;}
  if(!previewSignature||previewSignature!==makeSignature()){notice('Click Preview changes first.','danger');return;}
  const options={...state.options},candidates=planCandidates(options);
  const items=$('testOne').checked?candidates.slice(0,1):candidates;
  if(!items.length){notice('Nothing left to edit. Preview again.','danger');return;}
  try{await accessToken();}catch(e){notice('Connect with Roblox before applying changes: '+humanError(e),'danger');return;}
  if($('confirm').value!==state.groupName){notice('Type the verified group name exactly into the safety check box.','danger');return;}
  if(!confirm(($('testOne').checked?'TEST ONE ITEM':'APPLY CHANGES')+': '+items.length+' item(s) in '+state.groupName+'.\n\nThis attempts real metadata changes. Continue?'))return;
  running=true;stop=false;
  activity.phase='running';activity.startedAt=new Date().toISOString();activity.total=items.length;
  activity.current=0;activity.currentName='';activity.runIds=items.map(i=>i.id);activity.message='Live edit started. Each item is verified before editing.';
  publishLiveSoon();render();log('START','LIVE edit of '+items.length+' item(s) in group '+state.groupName);
  for(const [index,item] of items.entries()){
    if(stop)break;
    activity.current=index;activity.currentName=item.name+' (#'+item.id+')';activity.message='Editing item '+(index+1)+' of '+items.length;
    $('runMessage').textContent=activity.message;publishLiveSoon();
    await runOne(item,index,options);
    activity.current=index+1;activity.message='Processed '+(index+1)+' of '+items.length;
    await save();render();publishLiveSoon();
    if(index<items.length-1&&!stop)await sleep(options.delay);
  }
  running=false;const stopped=stop;stop=false;previewSignature=null;
  const counts=liveCounts();activity.phase=stopped?'paused':'finished';activity.currentName='';
  activity.message=stopped?'Batch paused. Review results before continuing.':'Batch finished. Review successes and failures.';
  activity.lastBatch={...counts,finishedAt:new Date().toISOString(),startedAt:activity.startedAt,total:activity.total,processed:activity.current,paused:stopped,groupId:state.groupId,groupName:state.groupName};
  publishLiveSoon();$('runMessage').textContent=activity.message;log(stopped?'WARN':'OK',activity.message);render();await save();
  notice(activity.message,stopped?'':'success');
}

function exportText(name,content,type='text/csv'){
  const blob=new Blob([content],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function updateAuthUi(){
  const id=await getClientId();
  $('oauthClientId').value=id;
  $('oauthRedirect').value=redirectUri();
  const session=await getSessionInfo();
  $('oauthConnect').disabled=!id||running;
  $('oauthDisconnect').disabled=!session||running;
  $('oauthStatus').textContent=session?'Connected as '+(session.username?'@'+session.username:'Roblox user')+(session.id?' (#'+session.id+')':''):'Not connected. Preview works without sign-in.';
  $('oauthStatus').className='verification'+(session?' ok':'');
}
async function configureOauth(){
  if(running||loading)return;
  try{await setClientId($('oauthClientId').value);await updateAuthUi();notice('Roblox OAuth client configured. Click Connect with Roblox to authorize.','success');}
  catch(e){notice(humanError(e),'danger');}
}
async function connectOauth(){
  $('oauthConnect').disabled=true;$('oauthStatus').textContent='Opening Roblox authorization…';
  try{await signIn();await updateAuthUi();notice('Connected to Roblox! Test an edit on one item first.','success');}
  catch(e){await updateAuthUi();notice('Roblox connection could not be completed: '+humanError(e),'danger');}
}
function wire(){
  $('oauthSaveClient').addEventListener('click',configureOauth);
  $('oauthConnect').addEventListener('click',connectOauth);
  $('oauthDisconnect').addEventListener('click',async()=>{if(running)return;await signOut();await updateAuthUi();notice('Disconnected from Roblox.','success');});
  $('oauthCopyRedirect').addEventListener('click',()=>navigator.clipboard.writeText(redirectUri()).then(()=>notice('Redirect URL copied. Register this exact URL in Roblox Creator Hub.','success')).catch(e=>notice(humanError(e),'danger')));
  $('verifyGroup').addEventListener('click',verifyGroup);
  $('renameAll').addEventListener('change',()=>{$('nameMode').value=$('renameAll').checked?'same':'keep';updateOptions();});
  $('nameMode').addEventListener('change',updateOptions);
  $('creditShortcut').addEventListener('click',()=>{$('description').value='Made by {group}';$('editDescription').checked=true;updateOptions();});
  $('preview').addEventListener('click',previewBatch);
  $('testOne').addEventListener('change',refreshPreviewAccess);
  $('groupId').addEventListener('input',()=>{
    if($('groupId').value.trim()!==state.groupId){invalidatePreview();state.verified=false;$('groupVerified').textContent='Unverified group ID';$('groupVerified').className='verification';render();}
  });
  $('loadAssets').addEventListener('click',loadAssets);
  for(const name of ['nameText','editDescription','description','archiveReview','delay']) $(name).addEventListener('input',updateOptions);
  $('search').addEventListener('input',render);$('statusFilter').addEventListener('change',render);
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
      invalidatePreview();state.items=dedupeItems([...state.items,...imported]);await save();render();notice(`Imported ${imported.length} rows. Live updates still require independent API ownership verification.`,'success');
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
wire();await restoreTheme();await restore();await updateAuthUi();
// A running batch does not survive closing this tab. Heartbeats let the companion
// distinguish a working editor from a tab that crashed or was closed.
setInterval(()=>{if(running||loading)publishLiveSoon();},5000);

// Never persist the secret credential and clear the field when the workspace closes.
window.addEventListener('pagehide',()=>{const key=document.getElementById('apiKey');if(key)key.value='';});
