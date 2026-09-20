#!/usr/bin/env node
/** Check package/read-route integrity; actual model/host acceptance is separate. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STARTUP_FILES, loadKnowledge, systemGuideOffMessage } from '../plugins/second-brain/hooks/knowledge-session-start.mjs';
import { buildReminder } from '../plugins/second-brain/hooks/memory-reminder.mjs';
import { MANUAL_SHA256, checkKnowledge } from '../plugins/second-brain/tools/check-knowledge.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manualSource='plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md';
const read=path=>readFileSync(resolve(root,path),'utf8').replace(/\r\n/g,'\n');
const failures=[];let checks=0;
const check=(name,run)=>{try{run();checks++;}catch(e){failures.push(`${name}: ${e.message}`);}};
const fixture=()=>mkdtempSync(join(tmpdir(),'knowledge-startup-'));
const write=(root,path,text)=>{mkdirSync(dirname(resolve(root,path)),{recursive:true});writeFileSync(resolve(root,path),text);};
const order=['SOUL.md','knowledge/project.md','knowledge/knowledge-manual.md','knowledge/memory/current.md','knowledge/memory/memory-index.md','knowledge/prds/prd-index.md'];
check('new startup read order',()=>assert.deepEqual(STARTUP_FILES.map(x=>x.path),order));
check('bounded read route survives large files without hiding tail content in hook output',()=>{
 const f=fixture();try{
  for(const path of order)write(f,path,path===order[2]?read(manualSource):'FIRST\n'+'body\n'.repeat(20000)+'LAST_SENTINEL');
  const out=loadKnowledge(f);let prev=-1;
  for(const path of order){const index=out.indexOf(`Read all of \`${path}\``);assert.ok(index>prev,path);prev=index;}
  assert.ok(out.length<3500);assert.ok(!out.includes('LAST_SENTINEL'));assert.match(out,/additional chunks/);
  assert.match(out,/checklist is not proof/);assert.match(out,/memory-inbox/);assert.match(out,/terminology-glossary/);assert.match(out,/ai-external-knowledge/);
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('legacy paths stay discoverable until authorized migration',()=>{
 const f=fixture();try{
  for(const p of ['SOUL.md','knowledge/project.md','knowledge/current.md','knowledge/memory/memory-index.md','knowledge/prds/spec-index.md'])write(f,p,'legacy content');
  write(f,'knowledge/README.md','<!-- claude-toolkit:knowledge-manual -->\nLegacy manual');
  const out=loadKnowledge(f);assert.match(out,/3\. Read all of `knowledge\/README.md`/);assert.match(out,/legacy/);assert.match(out,/knowledge\/current.md/);
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('missing, empty and conflicting required guidance withholds its read claim',()=>{
 const f=fixture();try{
  write(f,'SOUL.md','Soul');write(f,'knowledge/project.md','');
  assert.match(loadKnowledge(f),/file missing: knowledge\/knowledge-manual.md/);
  assert.match(loadKnowledge(f),/file empty: knowledge\/project.md/);
  write(f,'knowledge/knowledge-manual.md',read(manualSource));write(f,'knowledge/README.md','<!-- claude-toolkit:knowledge-manual -->\nConflicting meaning');
  const before=readFileSync(resolve(f,'knowledge/README.md'),'utf8');
  const out=loadKnowledge(f);assert.match(out,/Conflicting marked/);assert.doesNotMatch(out,/Read all of `knowledge\/knowledge-manual.md`/);
  assert.doesNotMatch(buildReminder(f),/Friendly reminder/);assert.equal(readFileSync(resolve(f,'knowledge/README.md'),'utf8'),before);
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('copied module bundle runs through aliases and nested cwd',()=>{
 const f=fixture();try{
  for(const n of ['knowledge-session-start.mjs','memory-reminder.mjs','knowledge-completion.mjs','knowledge-manual.mjs'])write(f,`.claude/hooks/${n}`,read(`plugins/second-brain/hooks/${n}`));
  write(f,'knowledge/knowledge-manual.md',read(manualSource));mkdirSync(resolve(f,'packages/nested'),{recursive:true});
  const env={...process.env};delete env.CLAUDE_PROJECT_DIR;delete env.CODEX_PROJECT_DIR;
  const out=execFileSync(process.execPath,[resolve(f,'.claude/hooks/knowledge-session-start.mjs')],{cwd:resolve(f,'packages/nested'),env,encoding:'utf8'});
  assert.match(out,/3\. Read all of `knowledge\/knowledge-manual.md`/);assert.doesNotMatch(out,/schema:2/);
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('manual is one complete current source with exact installed bytes/hash',()=>{
 const s=read(manualSource);assert.equal(read('knowledge/knowledge-manual.md'),s);
 assert.equal(s.split('<!-- claude-toolkit:knowledge-manual -->').length,2);
 assert.equal(createHash('sha256').update(s).digest('hex'),MANUAL_SHA256);
 assert.match(s,/knowledge-schema:2/);assert.doesNotMatch(s,/procedure draft|inactive draft/i);
});
check('normal skill discovery exposes four procedures; compatibility commands contain no second writer',()=>{
 for(const name of ['knowledge-find','knowledge-save','knowledge-review','knowledge-setup']){
  const s=read(`plugins/second-brain/skills/${name}/SKILL.md`);assert.match(s,new RegExp(`name: ${name}`));assert.doesNotMatch(s,/disable-model-invocation: true/);
 }
 for(const name of ['recall','remember','retire','reflect','session-search','second-brain']){
  const s=read(`plugins/second-brain/skills/${name}/SKILL.md`);assert.match(s,/disable-model-invocation: true/);assert.match(s,/\.\.\/knowledge-/);assert.ok(s.length<600);
 }
});
check('prompt and completion registered once on both hosts with supported recovery routes',()=>{
 for(const p of ['.claude/settings.json','.codex/hooks.json']){
  const c=JSON.parse(read(p));
  for(const [event,file] of [['SessionStart','knowledge-session-start.mjs'],['UserPromptSubmit','memory-reminder.mjs'],['Stop','knowledge-completion.mjs']]){
   const matches=c.hooks[event].flatMap(g=>g.hooks.map(h=>({...h,matcher:g.matcher}))).filter(h=>h.command.includes(file));
   assert.equal(matches.length,1,`${p} ${event}`);assert.equal(matches[0].type,'command');
   if(event==='SessionStart')for(const source of ['startup','resume','clear','compact','fork'])assert.ok(matches[0].matcher.split('|').includes(source));
  }
 }
});
check('root route and Toolkit route point to the current manual/map',()=>{
 const c=read('CLAUDE.md');for(const path of order.slice(0,4))assert.ok(c.includes(path),path);
 assert.ok(c.includes('memory-inbox.md'));assert.ok(c.includes('completely'));
 const a=read('AGENTS.md').trim();assert.equal(a.split('\n').length,1);assert.match(a,/CLAUDE.md/);assert.doesNotMatch(a,/@CLAUDE/);
});
check('unconfigured/disabled Guide remains separate and an enabled Guide is not re-created',()=>{
 const f=fixture();try{
  assert.equal(systemGuideOffMessage(f),'System Guide is not configured.');
  write(f,'.system-guide.json',JSON.stringify({enabled:true,guidePath:'custom'}));assert.equal(systemGuideOffMessage(f),'');
  write(f,'.system-guide.json','malformed');assert.equal(systemGuideOffMessage(f),'');
  write(f,'.system-guide.json',JSON.stringify({enabled:false}));assert.equal(systemGuideOffMessage(f),'System Guide is not configured.');
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('actual equipped records pass current validator',()=>{
 const result=checkKnowledge(root);assert.deepEqual(result.problems,[]);
});
check('manual drift and missing manual are diagnosed without writes',()=>{
 const f=fixture();try{
  mkdirSync(resolve(f,'knowledge'));assert.ok(checkKnowledge(f).problems.some(x=>x.includes('missing')));
  write(f,'knowledge/knowledge-manual.md','Changed manual');const before=readFileSync(resolve(f,'knowledge/knowledge-manual.md'),'utf8');
  assert.ok(checkKnowledge(f).problems.some(x=>x.includes('managed operating manual')));assert.equal(readFileSync(resolve(f,'knowledge/knowledge-manual.md'),'utf8'),before);
 }finally{rmSync(f,{recursive:true,force:true});}
});
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`ALL PASS (${checks} knowledge startup/package checks). Actual agent/host acceptance is separate.`);
