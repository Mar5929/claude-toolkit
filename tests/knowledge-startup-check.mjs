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
const order=['SOUL.md','knowledge/project.md','knowledge/memory/current.md'];
check('new startup read order',()=>assert.deepEqual(STARTUP_FILES.map(x=>x.path),order));
check('three startup reads in order; no manual or index read; no acknowledgment; large files stay out of hook output',()=>{
 const f=fixture();try{
  write(f,'knowledge/knowledge-manual.md',read(manualSource));
  for(const path of order)write(f,path,'FIRST\n'+'body\n'.repeat(20000)+'LAST_SENTINEL');
  const out=loadKnowledge(f);let prev=-1;
  for(const [i,path] of order.entries()){const index=out.indexOf(`${i+1}. \`${path}\``);assert.ok(index>prev,path);prev=index;}
  assert.ok(out.length<1000);assert.ok(!out.includes('LAST_SENTINEL'));assert.match(out,/more chunks/);
  assert.match(out,/memory-inbox\.md` for unfinished saves/);assert.match(out,/Do not read the knowledge manual or the indexes now/);
  assert.doesNotMatch(out,/memory-index|prd-index|completely|confirm|acknowledg/i);
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('legacy paths stay discoverable until authorized migration',()=>{
 const f=fixture();try{
  for(const p of ['SOUL.md','knowledge/project.md','knowledge/current.md','knowledge/memory/memory-index.md','knowledge/prds/spec-index.md'])write(f,p,'legacy content');
  write(f,'knowledge/README.md','<!-- claude-toolkit:knowledge-manual -->\nLegacy manual');
  const out=loadKnowledge(f);assert.match(out,/3\. `knowledge\/current.md`/);assert.match(out,/legacy/);assert.doesNotMatch(out,/memory-inbox/);
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('missing, empty and conflicting required guidance withholds its read claim',()=>{
 const f=fixture();try{
  write(f,'SOUL.md','Soul');write(f,'knowledge/project.md','');
  assert.match(loadKnowledge(f),/Knowledge manual missing: knowledge\/knowledge-manual.md/);
  assert.match(loadKnowledge(f),/file empty: knowledge\/project.md/);
  write(f,'knowledge/knowledge-manual.md',read(manualSource));write(f,'knowledge/README.md','<!-- claude-toolkit:knowledge-manual -->\nConflicting meaning');
  const before=readFileSync(resolve(f,'knowledge/README.md'),'utf8');
  const out=loadKnowledge(f);assert.match(out,/Conflicting marked/);assert.doesNotMatch(out,/`knowledge\/knowledge-manual.md`/);
  assert.doesNotMatch(buildReminder(f),/Friendly reminder/);assert.equal(readFileSync(resolve(f,'knowledge/README.md'),'utf8'),before);
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('copied module bundle runs through aliases and nested cwd',()=>{
 const f=fixture();try{
  for(const n of ['knowledge-session-start.mjs','memory-reminder.mjs','knowledge-completion.mjs','knowledge-manual.mjs'])write(f,`.claude/hooks/${n}`,read(`plugins/second-brain/hooks/${n}`));
  write(f,'knowledge/knowledge-manual.md',read(manualSource));mkdirSync(resolve(f,'packages/nested'),{recursive:true});
  const env={...process.env};delete env.CLAUDE_PROJECT_DIR;delete env.CODEX_PROJECT_DIR;
  const out=execFileSync(process.execPath,[resolve(f,'.claude/hooks/knowledge-session-start.mjs')],{cwd:resolve(f,'packages/nested'),env,encoding:'utf8'});
  assert.match(out,/3\. `knowledge\/memory\/current.md`|file missing: knowledge\/memory\/current.md/);assert.doesNotMatch(out,/schema:2/);
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('manual is one complete current source with exact installed bytes/hash',()=>{
 const s=read(manualSource);assert.equal(read('knowledge/knowledge-manual.md'),s);
 assert.equal(s.split('<!-- claude-toolkit:knowledge-manual -->').length,2);
 assert.equal(createHash('sha256').update(s).digest('hex'),MANUAL_SHA256);
 assert.match(s,/knowledge-schema:2/);assert.doesNotMatch(s,/procedure draft|inactive draft/i);
});
check('per-message reminder is the short approved text with no acknowledgment request',()=>{
 const f=fixture();try{
  write(f,'knowledge/knowledge-manual.md',read(manualSource));
  const r=buildReminder(f);
  assert.match(r,/When the owner settles a decision, requirement, or correction, save it in its home before moving on\./);
  assert.match(r,/Open `knowledge-save` before any memory proposal or save\./);
  assert.match(r,/Policy: `knowledge\/knowledge-manual.md`\./);
  assert.doesNotMatch(r,/acknowledg|Say you will|intent/i);
  assert.ok(r.split(/\s+/).filter(Boolean).length<=60);
 }finally{rmSync(f,{recursive:true,force:true});}
});
check('knowledge skills carry their own steps and no startup-read dependency',()=>{
 for(const name of ['knowledge-find','knowledge-save','knowledge-review','knowledge-setup']){
  const s=read(`plugins/second-brain/skills/${name}/SKILL.md`);assert.doesNotMatch(s,/already read at startup|core manual if it is missing|restore the core manual/i,name);
 }
 assert.match(read('plugins/second-brain/skills/knowledge-save/SKILL.md'),/publish-docs/);
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
check('action guards are registered once on both hosts with stable Codex roots',()=>{
 const files=['save-reminder.mjs','work-item-close.mjs'];
 for(const p of ['.claude/settings.json','.codex/hooks.json']){
  const c=JSON.parse(read(p));
  const groups=c.hooks.PreToolUse || [];
  for(const file of files){
   const matches=groups.flatMap(g=>g.hooks.map(h=>({...h,matcher:g.matcher}))).filter(h=>h.command.includes(file));
   assert.equal(matches.length,1,`${p} PreToolUse ${file}`);assert.equal(matches[0].type,'command');assert.equal(matches[0].timeout,10);
   if(p==='.codex/hooks.json'){
    assert.equal(matches[0].matcher,'^Bash$');
    assert.equal(matches[0].command,`node "$(git rev-parse --show-toplevel)/.claude/hooks/${file}"`);
    assert.equal(matches[0].commandWindows,`powershell.exe -NoProfile -Command "$knowledgeRoot = git rev-parse --show-toplevel; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node (Join-Path $knowledgeRoot '.claude/hooks/${file}')"`);
   }
  }
  if(p==='.codex/hooks.json')assert.equal(groups.filter(g=>g.hooks.some(h=>files.some(file=>h.command.includes(file)))).length,1);
 }
});
check('root AGENTS.md startup names the three reads and the inbox; its one-line CLAUDE.md import',()=>{
 const a=read('AGENTS.md');for(const path of order)assert.ok(a.includes(path),path);
 assert.ok(a.includes('memory-inbox.md'));assert.ok(!a.includes('completely'));
 const c=read('CLAUDE.md').trim();assert.equal(c.split('\n').length,1);assert.equal(c,'@AGENTS.md');
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
