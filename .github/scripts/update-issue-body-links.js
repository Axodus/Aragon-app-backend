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
if(!input){ console.error('Usage: update-issue-body-links.js <json-file>'); process.exit(2); }
const json = JSON.parse(fs.readFileSync(input, 'utf8'));

function getRepo(){ if(process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY; try{ const out = execFileSync('git',['config','--get','remote.origin.url'],{encoding:'utf8'}).trim(); const m = out.match(/github\.com[:/](.+)\/([^/.]+)(?:\.git)?$/); if(m) return `${m[1]}/${m[2]}`;}catch(e){ void e; } throw new Error('Unable to determine repo'); }

const repo = getRepo();

for(const it of json.items){
	const stableId = crypto.createHash('sha1').update(`${json.file}:${it.line}:${it.text}`).digest('hex');
	const out = runGh(['api', `repos/${repo}/issues?state=all&per_page=200`], 3);
	const issues = JSON.parse(out);
	const issue = issues.find(i=> typeof i.body === 'string' && i.body.includes(`Stable-ID: ${stableId}`));
	if(!issue) { console.log('No issue found for', it.text, 'stableId', stableId); continue; }
	const linkLine = `\n\n**Source:** ${json.file} (line ${it.line})`;
	if(issue.body && issue.body.includes(linkLine)){ console.log('Issue', issue.number, 'already has source link'); continue; }
	const newBody = (issue.body || '') + linkLine;
	try{ runGh(['api', `repos/${repo}/issues/${issue.number}`, '-X', 'PATCH', '-f', `body=${newBody}`], 3); console.log('Updated issue', issue.number, 'with source link'); }
	catch(e){ console.error('Failed to update issue', issue.number, e.message); }
}

console.log('Done');
