import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeItem,plan,archiveEligibility,ownerOf,parseCsv,toCsv} from '../core.js';
test('plans substitutions without changing original item',()=>{
 const item=normalizeItem({assetId:123,displayName:'old',assetType:'Shirt'});
 const p=plan(item,{nameMode:'template',nameText:'{oldName}-{group}',editDescription:true,description:'made by {group}: {id}'},'TestGroup');
 assert.equal(p.newName,'old-TestGroup');assert.equal(p.newDescription,'made by TestGroup: 123');assert.equal(item.name,'old');
});
test('rejects overlong title and blank name',()=>{
 const item=normalizeItem({assetId:123,assetType:'Pants',name:'Old'});
 assert.ok(plan(item,{nameMode:'same',nameText:'a'.repeat(51),editDescription:false},'group').issues.length);
 assert.ok(plan(item,{nameMode:'same',nameText:' ',editDescription:false},'group').issues.length);
});
test('reports 180 day archive threshold exactly',()=>{
 const now=Date.parse('2026-10-21T12:00:00Z');
 const a=normalizeItem({id:123,type:'Pants',created:new Date(now-180*86400000).toISOString()});
 assert.equal(archiveEligibility(a,now).eligible,true);
 a.created=new Date(now-179*86400000).toISOString();assert.equal(archiveEligibility(a,now).eligible,false);
});
test('checks nested group owner rather than a title',()=>{
 assert.equal(ownerOf({creationContext:{creator:{groupId:'1234'}}}).groupId,'1234');
 assert.equal(ownerOf({creationContext:{creator:{userId:'999'}}}).groupId,'');
});
test('CSV supports quoted comma and newline',()=>{
 const items=[normalizeItem({assetId:123,type:'Shirt',name:'hello, world',description:'line\nline'})];
 const parsed=parseCsv(toCsv(items));assert.equal(parsed[0].name,'hello, world');assert.equal(parsed[0].description,'line\nline');
});
test('keeps description line breaks, blank lines and author spacing',()=>{
 const item=normalizeItem({assetId:123,assetType:'Shirt',name:'item'});
 const description='More clothes from {group}\n\ntags\ngoth grunge vintage\n\nThanks!';
 const edited=plan(item,{nameMode:'keep',editDescription:true,description},'TestGroup');
 assert.equal(edited.newDescription,'More clothes from TestGroup\n\ntags\ngoth grunge vintage\n\nThanks!');
 assert.equal(edited.changeDescription,true);
});
test('keeps intentional leading and trailing empty lines',()=>{
 const item=normalizeItem({assetId:123,assetType:'Pants'});
 const edited=plan(item,{nameMode:'keep',editDescription:true,description:'\nFirst line\n\n'},'TestGroup');
 assert.equal(edited.newDescription,'\nFirst line\n\n');
});
test('converts pasted CRLF and CR line endings to LF only',()=>{
 const item=normalizeItem({assetId:123,assetType:'Pants'});
 const edited=plan(item,{nameMode:'keep',editDescription:true,description:'A\r\n\r\nB\rC'},'TestGroup');
 assert.equal(edited.newDescription,'A\n\nB\nC');
});
test('rejects expanded descriptions longer than 1000 characters',()=>{
 const item=normalizeItem({assetId:123,assetType:'Pants'});
 const edited=plan(item,{nameMode:'keep',editDescription:true,description:'a'.repeat(999)+'\n\n'},'TestGroup');
 assert.ok(edited.issues.some(issue=>issue.includes('1000')));
});
