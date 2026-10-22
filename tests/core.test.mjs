import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeItem,plan,archiveEligibility,ownerOf,parseCsv,toCsv,parseClothingTags,appendClothingTags} from '../core.js';
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

test('keeps paragraphs and author spacing in descriptions',()=>{
 const item=normalizeItem({assetId:123,type:'Shirt'});
 const desc='made by {group}\n\ntags';
 const p=plan(item,{nameMode:'keep',editDescription:true,description:desc},'Example');
 assert.equal(p.newDescription,'made by Example\n\ntags');
});
test('adds only selected preset tags below the description',()=>{
 const item=normalizeItem({assetId:123,type:'Shirt'});
 const p=plan(item,{nameMode:'keep',editDescription:true,description:'made by {group}\n\ntags',includeTags:true,tagText:'black, vintage, tie dye'},'Example');
 assert.equal(p.newDescription,'made by Example\n\ntags\nblack, vintage, tie dye');
});
test('rejects any term outside the allowed vocabulary',()=>{
 const item=normalizeItem({assetId:123,type:'Shirt'});
 const p=plan(item,{nameMode:'keep',editDescription:true,description:'hello',includeTags:true,tagText:'black, otherword'},'Example');
 assert.ok(p.issues.some(x=>x.includes('unrecognized tags')));
 assert.equal(parseClothingTags('black, black, grey').tags.join(','),'black,grey');
});
test('prevents exceeding Roblox description character limit after tags',()=>{
 const item=normalizeItem({assetId:123,type:'Pants'});
 const p=plan(item,{nameMode:'keep',editDescription:true,description:'a'.repeat(990),includeTags:true,tagText:'black, grey'},'Example');
 assert.ok(p.issues.some(x=>x.includes('1000')));
});
