const axios = require('axios');
require('dotenv').config();

async function checkDaoPluginsViaAPI() {
  const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783';
  const network = 'harmony-mainnet';
  
  // Check if backend API is accessible
  const API_URL = process.env.API_URL || 'http://localhost:3000';
  
  console.log('🔍 Checking DAO via Backend API\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`DAO: ${daoAddress}`);
  console.log(`Network: ${network}\n`);

  try {
    // 1. Get DAO info
    console.log('📊 Fetching DAO from API...\n');
    const daoResponse = await axios.get(`${API_URL}/v2/dao`, {
      params: {
        network,
        address: daoAddress
      }
    });

    const dao = daoResponse.data;
    console.log('DAO Name:', dao.name || dao.subdomain);
    console.log('DAO Address:', dao.address);
    console.log('Total Plugins:', dao.plugins?.length || 0);
    console.log('');

    if (dao.plugins && dao.plugins.length > 0) {
      console.log('Installed Plugins:\n');
      dao.plugins.forEach((plugin, i) => {
        console.log(`  ${i + 1}. ${plugin.name || 'Unnamed Plugin'}`);
        console.log(`     Address: ${plugin.address}`);
        console.log(`     Type: ${plugin.interfaceType}`);
        console.log(`     Is Process: ${plugin.isProcess}`);
        console.log(`     Subdomain: ${plugin.subdomain || 'N/A'}`);
        console.log('');
      });
    }

    // 2. Get proposals
    console.log('\n📝 Fetching Proposals from API...\n');
    const proposalsResponse = await axios.get(`${API_URL}/v2/proposal`, {
      params: {
        network,
        daoAddress,
        pageSize: 10
      }
    });

    const proposals = proposalsResponse.data.data || [];
    console.log(`Found ${proposals.length} proposals via API\n`);

    if (proposals.length > 0) {
      proposals.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.metadata?.title || 'Untitled'}`);
        console.log(`     Plugin: ${p.pluginAddress}`);
        console.log(`     Type: ${p.pluginInterfaceType}`);
        console.log(`     Created: ${p.createdAt}`);
        console.log('');
      });
    }

    // 3. Try to get proposals specifically for Delegation Plugin
    const delegationPlugin = '0x4d83E8fBaB950a9df568C8baa7382d97a6c0Cdf8';
    console.log(`\n📝 Fetching Proposals for Delegation Plugin specifically...\n`);
    
    const delegationProposalsResponse = await axios.get(`${API_URL}/v2/proposal`, {
      params: {
        network,
        daoAddress,
        pluginAddress: delegationPlugin,
        pageSize: 10
      }
    });

    const delegationProposals = delegationProposalsResponse.data.data || [];
    console.log(`Found ${delegationProposals.length} delegation proposals via API\n`);

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.statusText);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response from API. Is the backend running?');
      console.error('Tried to connect to:', API_URL);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

checkDaoPluginsViaAPI().catch(console.error);
