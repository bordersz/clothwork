import test from 'node:test';
import assert from 'node:assert/strict';
import {validateClientId,buildAuthorizationUrl,verifyRedirect,challengeFor,SCOPES} from '../oauth.js';
test('validates OAuth client IDs',()=>{
 assert.equal(validateClientId('7290610391231237934964'),true);
 assert.equal(validateClientId('my-key'),false);
});
test('authorization uses PKCE and requested scopes',()=>{
 const redirectUri='https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/roblox';
 const u=new URL(buildAuthorizationUrl({clientId:'7290610391231237934964',redirectUri,challenge:'challenge',state:'state'}));
 assert.equal(u.searchParams.get('scope'),SCOPES);
 assert.equal(u.searchParams.get('code_challenge_method'),'S256');
 assert.equal(u.searchParams.get('redirect_uri'),redirectUri);
 assert.equal(u.searchParams.get('client_secret'),null);
});
test('redirect validates exact origin, path and state',()=>{
 const redirect='https://someid.chromiumapp.org/roblox';
 assert.equal(verifyRedirect(redirect+'?state=abc&code=code',redirect,'abc'),'code');
 for(const u of ['https://other.chromiumapp.org/roblox?code=x&state=abc',redirect+'?code=x&state=no',redirect+'?code=x']){
  assert.throws(()=>verifyRedirect(u,redirect,'abc'));
 }
});
test('PKCE matches RFC7636 challenge',async()=>{
 assert.equal(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
