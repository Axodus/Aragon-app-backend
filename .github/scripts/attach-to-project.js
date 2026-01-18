#!/usr/bin/env node
const {execFileSync} = require('child_process');
const args = process.argv.slice(2);
if(args.length<2){ console.error('Usage: attach-to-project.js <issue_node_id> <project_node_id>'); process.exit(2); }
const issueNodeId = args[0];
const projectNodeId = args[1];
try{
	const query = `mutation ($projectId: ID!, $contentId: ID!) { addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) { item { id } } }`;
	const out = execFileSync('gh', ['api','graphql','-f', `query=${query}`, '-f', `projectId=${projectNodeId}`, '-f', `contentId=${issueNodeId}`], {encoding:'utf8'});
	console.log('Project attach result:', out);
}catch(e){ console.error('Failed to attach to project:', e.message); process.exit(1); }
