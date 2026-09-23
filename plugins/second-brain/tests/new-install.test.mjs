// Exercises copied executable entry points; does not claim host or model acceptance.
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repo=resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function assertCurrentFeedbackGuidance(text) {
 assert.match(text,/There is no arbitrary character cap\./);
 assert.match(text,/merge repeated or obsolete guidance without losing useful sourced\s+feedback\./);
 assert.match(text,/Record a line only when the owner changes or corrects what counts as memory or\s+how selection should work\./);
 assert.match(text,/Ordinary save outcomes are not logged\./);
 assert.match(text,/stated reason or "no reason given"\./);
 assert.match(text,/Never restate a rejected fact as a lesson\./);
 assert.doesNotMatch(text,/8,000|8000|one line per candidate|checker enforces it/i);
}

test('feedback template and project copy keep the same cap and decision-log policy', () => {
 for (const path of [
  'plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/memory-self-improvement.md',
  'knowledge/memory-self-improvement.md'
 ]) assertCurrentFeedbackGuidance(readFileSync(resolve(repo,path),'utf8'));
});

test('empty installed project runs copied startup, prompt and Stop commands from nested cwd', () => {
const root=realpathSync(mkdtempSync(join(tmpdir(),'knowledge-new-install-')));
const actionSessions=['fixture-codex-pr','fixture-codex-close'];
const template='plugins/second-brain/skills/knowledge-setup/references/templates/';
const write=(path,text)=>{mkdirSync(dirname(resolve(root,path)),{recursive:true});writeFileSync(resolve(root,path),text)};
const copy=(from,to)=>{mkdirSync(dirname(resolve(root,to)),{recursive:true});copyFileSync(resolve(repo,from),resolve(root,to))};
try {
 for(const name of ['knowledge/knowledge-manual.md','knowledge/README.md','knowledge/memory-inbox.md','knowledge/memory/memory-entries/terminology-glossary.md','knowledge/memory-self-improvement.md'])copy(template+name,name);
 assertCurrentFeedbackGuidance(readFileSync(resolve(root,'knowledge/memory-self-improvement.md'),'utf8'));
 copy('plugins/project-init/library/templates/toolkit-manual.md','knowledge/toolkit-manual.md');
 for(const name of ['knowledge-session-start','knowledge-manual','memory-reminder','knowledge-completion','save-reminder','work-item-close','command-parsing'])copy(`plugins/second-brain/hooks/${name}.mjs`,`.claude/hooks/${name}.mjs`);
 for(const name of ['frontmatter','build-knowledge-index','check-knowledge','inspect-knowledge-save'])copy(`plugins/second-brain/tools/${name}.mjs`,`.claude/tools/${name}.mjs`);
 write('SOUL.md','# Fixture role\n\nSupport the fictional delivery test.\n');
 write('knowledge/project.md','# Fixture project\n\nSynthetic project to test empty Knowledge installation. No standing save grant.\n');
 write('knowledge/memory/current.md','# Current working memory\nUpdated: 2026-09-19\n\n## Project goal\nTest empty installation.\n\n## Active work\nNone.\n\n## General project to-dos\nNone.\n\n## Session handoffs\nNone.\n');
 mkdirSync(resolve(root,'knowledge/prds'),{recursive:true});mkdirSync(resolve(root,'ai-external-knowledge'),{recursive:true});
 execFileSync('git',['init','-b','main'],{cwd:root});
 execFileSync('git',['config','user.name','Fixture Agent'],{cwd:root});
 execFileSync('git',['config','user.email','fixture@example.invalid'],{cwd:root});
 execFileSync('git',['add','SOUL.md','knowledge','.claude'],{cwd:root});
 execFileSync('git',['commit','-m','Initialize fixture'],{cwd:root});
 const run=(name)=>execFileSync(process.execPath,[resolve(root,'.claude/tools',name+'.mjs'),root],{encoding:'utf8'});
 assert.match(run('build-knowledge-index'),/0 file\(s\)/);
 const check=run('check-knowledge');assert.match(check,/ALL PASS/);
 const nav=readFileSync(resolve(root,'knowledge/README.md'),'utf8');
 for(const [,p] of nav.matchAll(/\]\(([^)]+)\)/g))readFileSync(resolve(root,'knowledge',p));
 mkdirSync(resolve(root,'packages/feature'),{recursive:true});const env={...process.env};delete env.CLAUDE_PROJECT_DIR;delete env.CODEX_PROJECT_DIR;
 const startup=execFileSync(process.execPath,[resolve(root,'.claude/hooks/knowledge-session-start.mjs')],{cwd:resolve(root,'packages/feature'),env,encoding:'utf8'});
 assert.doesNotMatch(startup,/missing:|file empty:/);assert.match(startup,/1\. `SOUL\.md`\n2\. `knowledge\/project\.md`\n3\. `knowledge\/memory\/current\.md`/);assert.doesNotMatch(startup,/acknowledg|confirmation/i);
 const input={session_id:'fixture-session',hook_event_name:'UserPromptSubmit',cwd:resolve(root,'packages/feature')};
 const prompt=execFileSync(process.execPath,[resolve(root,'.claude/hooks/memory-reminder.mjs')],{cwd:resolve(root,'packages/feature'),env,input:JSON.stringify(input),encoding:'utf8'});
 assert.match(prompt,/Before you finish, run: `node "[^"]*\/\.claude\/hooks\/knowledge-completion\.mjs" review /);assert.doesNotMatch(prompt,/unavailable:/);
 const firstStop=execFileSync(process.execPath,[resolve(root,'.claude/hooks/knowledge-completion.mjs')],{cwd:resolve(root,'packages/feature'),env,input:JSON.stringify({...input,hook_event_name:'Stop'}),encoding:'utf8'});
 assert.equal(JSON.parse(firstStop).decision,'block');
 const generation=prompt.match(/knowledge-completion\.mjs" review "[^"]*" "[^"]*" "[^"]*" ([\w-]+) OUTCOME/)[1];
 execFileSync(process.execPath,[resolve(root,'.claude/hooks/knowledge-completion.mjs'),'review',root,input.session_id,'root',generation,'no-change'],{encoding:'utf8'});
 const stop=execFileSync(process.execPath,[resolve(root,'.claude/hooks/knowledge-completion.mjs')],{cwd:resolve(root,'packages/feature'),env,input:JSON.stringify({...input,hook_event_name:'Stop'}),encoding:'utf8'});
 assert.deepEqual(JSON.parse(stop),{});
 for(const [sessionId,file,command] of [
  [actionSessions[0],'save-reminder.mjs','gh pr create --title fixture --body fixture'],
  [actionSessions[1],'work-item-close.mjs','gh issue close 42'],
 ]){
  const actionInput={session_id:sessionId,turn_id:'fixture-turn',cwd:resolve(root,'packages/feature'),hook_event_name:'PreToolUse',tool_name:'Bash',tool_input:{command}};
  const run=()=>execFileSync(process.execPath,[resolve(root,'.claude/hooks',file)],{cwd:resolve(root,'packages/feature'),env,input:JSON.stringify(actionInput),encoding:'utf8'});
  const output=run();
  assert.notEqual(output,'',`${file} must return a Codex deny decision`);
  const decision=JSON.parse(output).hookSpecificOutput;
  assert.equal(decision.hookEventName,'PreToolUse');assert.equal(decision.permissionDecision,'deny');assert.match(decision.permissionDecisionReason,/Held action: /);
  assert.equal(run(),'',`${file} allows the plain retry`);
 }

} finally {
 const key=createHash('sha256').update(JSON.stringify([realpathSync(root),'fixture-session','root'])).digest('hex');
 rmSync(join(tmpdir(),'toolkit-knowledge-review',key+'.json'),{force:true});
 for(const sessionId of actionSessions){
  const hold=createHash('sha256').update(JSON.stringify([sessionId,'root'])).digest('hex');
  rmSync(join(tmpdir(),'second-brain-action-hold',hold+'.json'),{force:true});
 }
 rmSync(root,{recursive:true,force:true});
}
});
