/**
 * OAuth 2.0 for Clothwork's shareable build.
 * Authorization Code + PKCE, no client secret or users' API keys.
 * Browser-session storage only. Each Chrome profile signs in separately.
 */
const ROOT='https://apis.roblox.com/oauth/v1';
const SESSION_KEY='clothwork_oauth_session_v1';
const CLIENT_KEY='clothwork_oauth_client_id_v1';
export const SCOPES='openid profile asset:read asset:write';

export function validateClientId(id){return /^\d{6,40}$/.test(String(id||'').trim());}
export function buildAuthorizationUrl({clientId,redirectUri,challenge,state}){
  if(!validateClientId(clientId))throw new Error('Enter your registered Roblox OAuth app client ID.');
  if(!redirectUri.startsWith('https://')||!challenge||!state)throw new Error('Missing required OAuth configuration.');
  const url=new URL(ROOT+'/authorize');
  for(const [k,v] of Object.entries({client_id:clientId,redirect_uri:redirectUri,scope:SCOPES,response_type:'code',code_challenge:challenge,code_challenge_method:'S256',state,prompt:'consent'}))url.searchParams.set(k,v);
  return url.href;
}
const randomString=(bytes=48)=>{
  const chars=new Uint8Array(bytes);crypto.getRandomValues(chars);
  return Array.from(chars,n=>('0'+n.toString(16)).slice(-2)).join('');
};
function base64url(bytes){
  let raw='';for(const b of bytes)raw+=String.fromCharCode(b);
  return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export async function challengeFor(verifier){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}
export function verifyRedirect(returned,redirectUri,state){
  if(!returned)throw new Error('Roblox did not return an authorization response.');
  const actual=new URL(returned),expected=new URL(redirectUri);
  if(actual.origin!==expected.origin||actual.pathname!==expected.pathname)throw new Error('OAuth redirect did not match this extension.');
  if(!actual.searchParams.get('state')||actual.searchParams.get('state')!==state)throw new Error('OAuth state mismatch. Sign-in was cancelled for safety.');
  if(actual.searchParams.has('error'))throw new Error('Roblox authorization: '+(actual.searchParams.get('error_description')||actual.searchParams.get('error')).slice(0,180));
  const code=actual.searchParams.get('code');
  if(!code)throw new Error('Roblox authorization code was missing.');
  return code;
}
async function tokenRequest(payload){
  const res=await fetch(ROOT+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(payload),credentials:'omit'});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.access_token)throw new Error('Roblox authorization failed ('+(data.error_description||data.error||'HTTP '+res.status).toString().slice(0,180)+').');
  return data;
}
async function clientId(){
  const {[CLIENT_KEY]:value}=await chrome.storage.local.get(CLIENT_KEY);
  return validateClientId(value)?String(value):'';
}
export async function getClientId(){return clientId();}
export function redirectUri(){return chrome.identity.getRedirectURL('roblox');}
export async function setClientId(id){
  const next=String(id||'').trim();
  if(!validateClientId(next))throw new Error('Client ID must be the numeric ID of a registered Roblox OAuth app.');
  const previous=await clientId();
  if(previous!==next){await chrome.storage.session.remove(SESSION_KEY);await chrome.storage.local.set({[CLIENT_KEY]:next});}
}
async function stored(){return (await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY]||null;}
async function storeTokens(data,id,identity){
  const session={clientId:id,accessToken:String(data.access_token),refreshToken:String(data.refresh_token||''),expiresAt:Date.now()+Math.max(60,Number(data.expires_in)||900)*1000,identity};
  await chrome.storage.session.set({[SESSION_KEY]:session});
  return session;
}
async function readIdentity(accessToken){
  try{
    const res=await fetch(ROOT+'/userinfo',{headers:{Authorization:'Bearer '+accessToken},credentials:'omit'});
    if(!res.ok)return null;
    const user=await res.json();
    return {id:String(user.sub||''),username:String(user.preferred_username||user.name||user.nickname||'')};
  }catch{return null;}
}
export async function signIn(){
  const id=await clientId();
  if(!id)throw new Error('Set up the Clothwork OAuth app client ID before connecting.');
  const verifier=randomString(48),state=randomString(24),redirect=redirectUri();
  const challenge=await challengeFor(verifier);
  const response=await chrome.identity.launchWebAuthFlow({url:buildAuthorizationUrl({clientId:id,redirectUri:redirect,challenge,state}),interactive:true});
  const code=verifyRedirect(response,redirect,state);
  const tokens=await tokenRequest({grant_type:'authorization_code',client_id:id,code,code_verifier:verifier,redirect_uri:redirect});
  const identity=await readIdentity(tokens.access_token);
  await storeTokens(tokens,id,identity);
  return identity;
}
let refreshInFlight=null;
async function doRefresh(session,id){
  if(!session.refreshToken)throw new Error('Roblox sign-in expired. Connect your account again.');
  try{
    const tokens=await tokenRequest({grant_type:'refresh_token',client_id:id,refresh_token:session.refreshToken});
    return await storeTokens(tokens,id,session.identity);
  }catch(e){await chrome.storage.session.remove(SESSION_KEY);throw e;}
}
export async function accessToken(forceRefresh=false){
  const id=await clientId(),session=await stored();
  if(!id||!session||session.clientId!==id)throw new Error('Connect with Roblox before editing.');
  if(!forceRefresh&&session.accessToken&&session.expiresAt>Date.now()+60000)return session.accessToken;
  if(!refreshInFlight){refreshInFlight=doRefresh(session,id).finally(()=>{refreshInFlight=null;});}
  return (await refreshInFlight).accessToken;
}
export async function getSessionInfo(){
  const id=await clientId(),session=await stored();
  if(!id||!session||session.clientId!==id)return null;
  try{await accessToken();return {id:session.identity?.id||'',username:session.identity?.username||''};}
  catch{return null;}
}
export async function signOut(){
  const session=await stored(),id=await clientId();
  await chrome.storage.session.remove(SESSION_KEY);
  if(session?.refreshToken&&id){
    try{await fetch(ROOT+'/token/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:session.refreshToken,client_id:id}),credentials:'omit'});}catch{}
  }
}
