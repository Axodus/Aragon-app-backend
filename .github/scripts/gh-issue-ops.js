#!/usr/bin/env node
/* eslint-env node */
/* global require, process, console */
const fs = require('fs');
const {execFileSync} = require('child_process');
const crypto = require('crypto');

function sleep(ms) { const start = Date.now(); while (Date.now() - start < ms) { 0; } }
function runGh(args, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return execFileSync('gh', args, {encoding: 'utf8'}); }
    catch (e) { if (attempt === maxRetries) throw e; const backoff = 200 * attempt; console.error('gh command failed, retrying in', backoff, 'ms'); sleep(backoff); }
  }
}

const input = process.argv[2];
if (!input) { console.error('Usage: gh-issue-ops.js <json-file> [--project-node-id <id>]'); process.exit(2); }
const json = JSON.parse(fs.readFileSync(input,'utf8'));

let projectNodeId = null;
const pIdx = process.argv.indexOf('--project-node-id');
if (pIdx !== -1 && process.argv[pIdx+1]) projectNodeId = process.argv[pIdx+1];

function getRepo(){
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const out = execFileSync('git', ['config', '--get', 'remote.origin.url'], {encoding: 'utf8'}).trim();
    const m = out.match(/github\.com[:/](.+)\/([^/.]+)(?:\.git)?$/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch (e) { void e; }
  try { const out = runGh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], 1); if (out) return out.trim(); } catch (e) { void e; }
  throw new Error('Unable to determine repo (set GITHUB_REPOSITORY)');
}

function findExistingIssueByTitleOrId(title, stableId){
  const repo = getRepo();
  const out = runGh(['api',`repos/${repo}/issues?state=all&per_page=100`], 3);
  const issues = JSON.parse(out);
  let found = issues.find(i=>i.title===title);
  if(found) return found;
  if(stableId){ found = issues.find(i => typeof i.body === 'string' && i.body.includes(`Stable-ID: ${stableId}`)); if(found) return found; }
  return null;
}

function createIssue(title, body, labels=[]){
  const repo = getRepo();
  const args = ['api',`repos/${repo}/issues`,'-f',`title=${title}`,'-f',`body=${body}`];
  if(labels.length){ for(const lab of labels) args.push('-f', `labels[]=${lab}`); }
  const out = runGh(args, 3);
  return JSON.parse(out);
}

function updateIssue(number, fields){
  const repo = getRepo();
  const args = ['api', `repos/${repo}/issues/${number}`, '-X', 'PATCH'];
  Object.entries(fields).forEach(([k,v])=> args.push('-f', `${k}=${v}`));
  const out = runGh(args, 3);
  return JSON.parse(out);
}

function closeIssue(number){ return updateIssue(number, {state:'closed'}); }

function attachToProjectIfPresent(issueObj){
  if(!projectNodeId) return null;
  try{
    const contentId = issueObj.node_id;
    const query = `mutation ($projectId: ID!, $contentId: ID!) { addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) { item { id } } }`;
    const args = ['api','graphql','-f',`query=${query}`,'-f',`projectId=${projectNodeId}`,'-f',`contentId=${contentId}`];
    const out = runGh(args, 3);
    return JSON.parse(out);
  }catch(e){ console.error('attachToProject failed:', e.message); return null; }
}

console.log('Syncing issues for', json.file);
for(const it of json.items){
  const stableId = crypto.createHash('sha1').update(`${json.file}:${it.line}:${it.text}`).digest('hex');
  const title = `${it.text} [source:${json.file}]`;
  let body = `Source: ${json.file}\n\nAutomated sync from PLAN.md.\n\nStable-ID: ${stableId}`;
  const existing = findExistingIssueByTitleOrId(title, stableId);
  if(!existing && !it.checked){
    console.log('Creating issue:', title);
    const created = createIssue(title, body, ['sync-md']);
    if(projectNodeId){ const res = attachToProjectIfPresent(created); console.log('Attached to project:', res ? 'ok' : 'failed'); }
  } else if(existing && it.checked && existing.state !== 'closed'){
    console.log('Closing issue:', existing.number, title); closeIssue(existing.number);
  } else if(existing){
    console.log('Issue already exists:', existing.number, title);
    if(!existing.body || !existing.body.includes(`Stable-ID: ${stableId}`)){
      try{ updateIssue(existing.number, { body: (existing.body || '') + '\n\nStable-ID: ' + stableId }); }catch(e){ console.error('Failed to update existing issue with Stable-ID', e.message); }
    }
    if(projectNodeId){ const res = attachToProjectIfPresent(existing); if(res) console.log('Ensured attached to project'); }
  }
}

console.log('Done');
