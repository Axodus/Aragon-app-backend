#!/usr/bin/env node
/* eslint-disable */
/*
  encode_uninstall_calldata.js

  Goal:
    Generate the calldata required to uninstall a bricked plugin.

  Recommended usage (auto-discovery from chain logs):
    node scripts/encode_uninstall_calldata.js \
      --rpc <rpcUrl> \
      --dao <dao> \
      --plugin <plugin> \
      --psp <pspAddress>

  Optional:
    - --lookbackBlocks <n>      (default: 300000) scan window for applied logs
    - --wrapDaoExecute          print DAO.execute calldata wrapping PSP call
    - --uninstallData <0x..>    optional data passed to prepareUninstallation (default: 0x)
    - --preparedTxHash <0x..>   if provided, fetches receipt and encodes applyUninstallation using emitted permissions

  Manual mode (only if you already know repo+version+helpers):
    node scripts/encode_uninstall_calldata.js \
      --dao <dao> --plugin <plugin> --psp <pspAddress> \
      --pluginRepo <pluginSetupRepo> --versionRelease <r> --versionBuild <b> \
      --helpersFile <pathToJsonArray>

  Notes:
    - `prepareUninstallation` WILL revert with InvalidAppliedSetupId if `currentHelpers` are not exactly the same
      (order included) as the helpers from the latest applied setup (installation or update).
    - `applyUninstallation` usually must be executed via DAO.execute with temporary ROOT granted to the PSP.
*/
const { console, process } = globalThis;

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      const hasValue = Boolean(next) && !next.startsWith('--');
      if (hasValue) {
        out[k] = next;
        i += 1;
      } else {
        out[k] = true;
      }
    }
  }
  return out;
}

(async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    Interface,
    JsonRpcProvider,
    getAddress,
    isHexString,
    zeroPadValue,
    ZeroHash,
  } = await import('ethers');
  const args = parseArgs();

  function resolveJsonArtifact(relPathFromRepoRoot) {
    const fromCwd = path.resolve(process.cwd(), relPathFromRepoRoot);
    if (fs.existsSync(fromCwd)) return fromCwd;

    const scriptPath = path.resolve(process.argv[1]);
    const scriptDir = path.dirname(scriptPath);
    const fromScript = path.resolve(scriptDir, '..', relPathFromRepoRoot);
    if (fs.existsSync(fromScript)) return fromScript;

    return null;
  }

  function assertAddress(name, value) {
    try {
      return getAddress(value);
    } catch {
      console.error(`Invalid --${name} address:`, value);
      process.exit(1);
    }
  }

  function assertHex(name, value, { expectedBytes = null } = {}) {
    if (typeof value !== 'string') {
      console.error(`Invalid --${name} hex value (expected string):`, value);
      process.exit(1);
    }

    // Common copy/paste placeholder mistakes.
    if (value.includes('...') || value.includes('…')) {
      console.error(`Invalid --${name} hex value (looks like placeholder):`, value);
      console.error(`Tip: replace "0x..." with the full hex string (or omit --${name} to use the default).`);
      process.exit(1);
    }

    // ethers' isHexString is permissive; BytesLike encoding is stricter (must be even-length hex).
    if (!/^0x[0-9a-fA-F]*$/.test(value)) {
      console.error(`Invalid --${name} hex value (must match /^0x[0-9a-fA-F]*$/):`, value);
      process.exit(1);
    }

    const nibbles = value.length - 2;
    if (nibbles % 2 !== 0) {
      console.error(`Invalid --${name} hex value (odd length; must be even-length BytesLike):`, value);
      console.error(`Tip: if you meant a single byte, use e.g. 0x0f (not 0xf).`);
      process.exit(1);
    }

    if (Number.isFinite(expectedBytes) && expectedBytes !== null) {
      const expectedNibbles = expectedBytes * 2;
      if (nibbles !== expectedNibbles) {
        console.error(
          `Invalid --${name} hex value length: expected ${expectedBytes} bytes (0x + ${expectedNibbles} hex chars), got ${nibbles / 2} bytes:`,
          value
        );
        process.exit(1);
      }
    }

    // Keep the older check too (it also validates 0x prefix, etc.).
    if (!isHexString(value)) {
      console.error(`Invalid --${name} hex value:`, value);
      process.exit(1);
    }

    return value;
  }

  const dao = assertAddress('dao', args.dao);
  const plugin = assertAddress('plugin', args.plugin);
  const psp = assertAddress('psp', args.psp);
  const rpc = args.rpc;
  const wrapDaoExecute = Boolean(args.wrapDaoExecute);
  const uninstallData = args.uninstallData ? assertHex('uninstallData', args.uninstallData) : '0x';
  const lookbackBlocks = args.lookbackBlocks ? Number(args.lookbackBlocks) : 300000;
  const appliedBlockHint = args.appliedBlockHint ? Number(args.appliedBlockHint) : null;
  const preparedTxHash = args.preparedTxHash
    ? assertHex('preparedTxHash', args.preparedTxHash, { expectedBytes: 32 })
    : null;
  const permissionsFile = args.permissionsFile;
  const helpersFile = args.helpersFile;

  if (!dao || !plugin || !psp) {
    console.error('Missing required args: --dao, --plugin, --psp');
    process.exit(1);
  }

  const pspAbiPath =
    resolveJsonArtifact(path.join('src', 'aragonContracts', 'PluginSetupProcessor.json')) ||
    resolveJsonArtifact(path.join('src', 'artifacts', 'PluginSetupProcessor.ts'));

  if (!pspAbiPath) {
    console.error('PSP ABI not found. Expected src/aragonContracts/PluginSetupProcessor.json under Aragon-app-backend repo root.');
    process.exit(1);
  }

  const daoAbiPath = resolveJsonArtifact(path.join('src', 'aragonContracts', 'DAO.json'));

  const pspArtifact = JSON.parse(fs.readFileSync(pspAbiPath, 'utf8'));
  const pspIface = new Interface(pspArtifact.abi);

  const daoIface = daoAbiPath ? new Interface(JSON.parse(fs.readFileSync(daoAbiPath, 'utf8')).abi) : null;

  function printDaoExecuteWrapper(pspCallData) {
    if (!wrapDaoExecute) return;
    if (!daoIface) {
      console.log('\n[wrapDaoExecute] DAO ABI not found; skipping DAO.execute calldata generation.');
      return;
    }

    const action = { to: psp, value: 0n, data: pspCallData };

    // Prefer the canonical signature with callId; some deployments might expose a legacy overload.
    const sigWithCallId = 'execute(bytes32,(address,uint256,bytes)[],uint256)';
    const sigNoCallId = 'execute((address,uint256,bytes)[],uint256)';

    const hasWithCallId = daoIface.fragments.some((f) => f.type === 'function' && f.format() === sigWithCallId);
    const hasNoCallId = daoIface.fragments.some((f) => f.type === 'function' && f.format() === sigNoCallId);

    let executeCalldata;
    if (hasWithCallId) {
      executeCalldata = daoIface.encodeFunctionData(sigWithCallId, [ZeroHash, [action], 0n]);
    } else if (hasNoCallId) {
      executeCalldata = daoIface.encodeFunctionData(sigNoCallId, [[action], 0n]);
    } else {
      console.log('\n[wrapDaoExecute] Could not find DAO.execute overload in DAO ABI; skipping wrapper.');
      return;
    }

    console.log('\n=== DAO.execute wrapper (single action calling PSP) ===');
    console.log('DAO address:', dao);
    console.log('Action JSON:', JSON.stringify({ to: psp, value: '0', data: pspCallData }, null, 2));
    console.log('DAO.execute calldata:', executeCalldata);
  }

  async function findLatestAppliedLog(provider) {
    const latest = await provider.getBlockNumber();

    const installAppliedTopic = pspIface.getEvent('InstallationApplied').topicHash;
    const updateAppliedTopic = pspIface.getEvent('UpdateApplied').topicHash;

    const daoTopic = zeroPadValue(dao, 32);
    const pluginTopic = zeroPadValue(plugin, 32);

    // Harmony's RPC often enforces eth_getLogs range <= 1024 blocks.
    const chunkSize = 900;
    const maxScanBack = Number.isFinite(lookbackBlocks) && lookbackBlocks > 0 ? lookbackBlocks : 300000;

    async function getAppliedLogsInRange(fromBlock, toBlock) {
      const [instLogs, updLogs] = await Promise.all([
        provider.getLogs({
          address: psp,
          fromBlock,
          toBlock,
          topics: [installAppliedTopic, daoTopic, pluginTopic],
        }),
        provider.getLogs({
          address: psp,
          fromBlock,
          toBlock,
          topics: [updateAppliedTopic, daoTopic, pluginTopic],
        }),
      ]);

      return instLogs
        .map((l) => ({ ...l, __eventName: 'InstallationApplied' }))
        .concat(updLogs.map((l) => ({ ...l, __eventName: 'UpdateApplied' })));
    }

    // If user provides a hint block, check a small window around it.
    if (Number.isFinite(appliedBlockHint) && appliedBlockHint >= 0) {
      const radius = 200;
      const fromBlock = Math.max(0, appliedBlockHint - radius);
      const toBlock = Math.min(latest, appliedBlockHint + radius);
      const hintLogs = await getAppliedLogsInRange(fromBlock, toBlock);
      if (hintLogs.length > 0) {
        hintLogs.sort((a, b) => (a.blockNumber !== b.blockNumber ? a.blockNumber - b.blockNumber : a.index - b.index));
        return hintLogs[hintLogs.length - 1];
      }
    }

    let toBlock = latest;
    let scanned = 0;
    while (toBlock >= 0 && scanned <= maxScanBack) {
      const fromBlock = Math.max(0, toBlock - chunkSize + 1);
      const logs = await getAppliedLogsInRange(fromBlock, toBlock);

      if (logs.length > 0) {
        logs.sort((a, b) => (a.blockNumber !== b.blockNumber ? a.blockNumber - b.blockNumber : a.index - b.index));
        return logs[logs.length - 1];
      }

      if (fromBlock === 0) break;
      toBlock = fromBlock - 1;
      scanned += chunkSize;
    }

    return null;
  }

  async function findPreparedInfoFor(preparedSetupId, provider, nearBlock) {
    const installPreparedTopic = pspIface.getEvent('InstallationPrepared').topicHash;
    const updatePreparedTopic = pspIface.getEvent('UpdatePrepared').topicHash;

    const daoTopic = zeroPadValue(dao, 32);

    // Expand the search range progressively if not found.
    const baseLookback = Math.max(50000, Math.floor(lookbackBlocks / 2));
    const multipliers = [1, 3, 10];

    const chunkSize = 900;

    async function scanLogsInRange(fromBlock, toBlock) {
      const instPreparedLogs = await provider.getLogs({
        address: psp,
        fromBlock,
        toBlock,
        topics: [installPreparedTopic, null, daoTopic],
      });
      for (const log of instPreparedLogs) {
        const parsed = pspIface.parseLog(log);
        if (String(parsed.args.preparedSetupId).toLowerCase() !== String(preparedSetupId).toLowerCase()) continue;
        if (getAddress(parsed.args.plugin) !== plugin) continue;

        return {
          preparedType: 'InstallationPrepared',
          pluginSetupRepo: getAddress(parsed.args.pluginSetupRepo),
          versionTag: {
            release: Number(parsed.args.versionTag.release),
            build: Number(parsed.args.versionTag.build),
          },
          currentHelpers: parsed.args.preparedSetupData.helpers.map((h) => getAddress(h)),
        };
      }

      const updPreparedLogs = await provider.getLogs({
        address: psp,
        fromBlock,
        toBlock,
        topics: [updatePreparedTopic, null, daoTopic],
      });
      for (const log of updPreparedLogs) {
        const parsed = pspIface.parseLog(log);
        if (String(parsed.args.preparedSetupId).toLowerCase() !== String(preparedSetupId).toLowerCase()) continue;
        if (getAddress(parsed.args.setupPayload.plugin) !== plugin) continue;

        return {
          preparedType: 'UpdatePrepared',
          pluginSetupRepo: getAddress(parsed.args.pluginSetupRepo),
          versionTag: {
            release: Number(parsed.args.versionTag.release),
            build: Number(parsed.args.versionTag.build),
          },
          currentHelpers: parsed.args.preparedSetupData.helpers.map((h) => getAddress(h)),
        };
      }

      return null;
    }

    for (const m of multipliers) {
      const start = Math.max(0, nearBlock - baseLookback * m);
      const end = nearBlock;

      for (let fromBlock = start; fromBlock <= end; fromBlock += chunkSize) {
        const toBlock = Math.min(end, fromBlock + chunkSize - 1);
        const found = await scanLogsInRange(fromBlock, toBlock);
        if (found) return found;
      }
    }

    return null;
  }

  async function autoDiscoverSetup() {
    if (!rpc) {
      console.error('Missing --rpc. Auto-discovery needs an RPC endpoint.');
      process.exit(1);
    }

    const provider = new JsonRpcProvider(rpc);
    const latestApplied = await findLatestAppliedLog(provider);
    if (!latestApplied) {
      console.error('Could not find InstallationApplied/UpdateApplied logs for this DAO+plugin on the provided PSP.');
      console.error('Try increasing --lookbackBlocks or verify addresses and RPC.');
      process.exit(1);
    }

    const parsedApplied = pspIface.parseLog(latestApplied);
    const preparedSetupId = parsedApplied.args.preparedSetupId;

    const preparedInfo = await findPreparedInfoFor(preparedSetupId, provider, latestApplied.blockNumber);
    if (!preparedInfo) {
      console.error('Found applied setup, but could not find matching InstallationPrepared/UpdatePrepared in the scanned range.');
      console.error('Try increasing --lookbackBlocks.');
      process.exit(1);
    }

    return {
      provider,
      preparedSetupId,
      appliedEvent: latestApplied.__eventName,
      appliedBlockNumber: latestApplied.blockNumber,
      ...preparedInfo,
    };
  }

  async function encodeApplyFromReceipt(provider) {
    if (!preparedTxHash) return null;

    const rc = await provider.getTransactionReceipt(preparedTxHash);
    if (!rc) {
      console.error('Receipt not found for --preparedTxHash:', preparedTxHash);
      process.exit(1);
    }

    for (const log of rc.logs) {
      if (getAddress(log.address) !== psp) continue;
      let parsed;
      try {
        parsed = pspIface.parseLog(log);
      } catch {
        continue;
      }
      if (parsed.name !== 'UninstallationPrepared') continue;
      if (getAddress(parsed.args.dao) !== dao) continue;
      if (getAddress(parsed.args.setupPayload.plugin) !== plugin) continue;

      const pluginSetupRef = {
        versionTag: {
          release: Number(parsed.args.versionTag.release),
          build: Number(parsed.args.versionTag.build),
        },
        pluginSetupRepo: getAddress(parsed.args.pluginSetupRepo),
      };

      const permissions = parsed.args.permissions;
      const applyArgs = [dao, { plugin, pluginSetupRef, permissions }];
      return {
        applyCalldata: pspIface.encodeFunctionData('applyUninstallation', applyArgs),
        pluginSetupRef,
        permissions,
      };
    }

    console.error('No UninstallationPrepared event found in receipt for the provided --preparedTxHash.');
    process.exit(1);
  }

  let pluginSetupRepo;
  let versionTag;
  let currentHelpers;

  if (args.pluginRepo && args.versionRelease && args.versionBuild) {
    pluginSetupRepo = assertAddress('pluginRepo', args.pluginRepo);
    versionTag = { release: Number(args.versionRelease), build: Number(args.versionBuild) };
    if (helpersFile) {
      if (!fs.existsSync(helpersFile)) {
        console.error('helpersFile not found:', helpersFile);
        process.exit(1);
      }
      currentHelpers = JSON.parse(fs.readFileSync(helpersFile, 'utf8')).map((h) => getAddress(h));
    } else {
      currentHelpers = [];
    }
  } else {
    const discovered = await autoDiscoverSetup();
    pluginSetupRepo = discovered.pluginSetupRepo;
    versionTag = discovered.versionTag;
    currentHelpers = discovered.currentHelpers;

    console.log('\n=== auto-discovered current setup ===');
    console.log('Applied event:', discovered.appliedEvent);
    console.log('Applied block:', discovered.appliedBlockNumber);
    console.log('Prepared type:', discovered.preparedType);
    console.log('Plugin repo:', pluginSetupRepo);
    console.log('Version tag:', versionTag);
    console.log('Helpers:', currentHelpers);

    // If the user provided a tx hash, keep using the same provider instance.
    if (preparedTxHash) {
      const applyFromReceipt = await encodeApplyFromReceipt(discovered.provider);
      if (applyFromReceipt) {
        console.log('\n=== applyUninstallation calldata (from prepare receipt) ===');
        console.log(applyFromReceipt.applyCalldata);
        console.log('\nPSP address:', psp);
        printDaoExecuteWrapper(applyFromReceipt.applyCalldata);
      }
    }
  }

  const pluginSetupRef = { versionTag, pluginSetupRepo };
  const setupPayload = { plugin, currentHelpers, data: uninstallData };
  const prepareArgs = [dao, { pluginSetupRef, setupPayload }];
  let prepareCalldata;
  try {
    prepareCalldata = pspIface.encodeFunctionData('prepareUninstallation', prepareArgs);
  } catch (e) {
    console.error('Failed to ABI-encode prepareUninstallation calldata.');
    console.error('Inputs summary:');
    console.error('- dao:', dao);
    console.error('- plugin:', plugin);
    console.error('- psp:', psp);
    console.error('- pluginSetupRepo:', pluginSetupRepo);
    console.error('- versionTag:', versionTag);
    console.error('- currentHelpers.length:', Array.isArray(currentHelpers) ? currentHelpers.length : '(not an array)');
    console.error('- uninstallData:', uninstallData);
    console.error('\nOriginal error:', e?.shortMessage || e?.message || e);
    process.exit(1);
  }

  console.log('\n=== prepareUninstallation calldata ===');
  console.log(prepareCalldata);
  console.log('\nPSP address:', psp);
  printDaoExecuteWrapper(prepareCalldata);

  if (permissionsFile) {
    if (!fs.existsSync(permissionsFile)) {
      console.error('permissionsFile not found:', permissionsFile);
      process.exit(1);
    }
    const permissions = JSON.parse(fs.readFileSync(permissionsFile, 'utf8'));
    const applyArgs = [dao, { plugin, pluginSetupRef, permissions }];
    const applyCalldata = pspIface.encodeFunctionData('applyUninstallation', applyArgs);

    console.log('\n=== applyUninstallation calldata (from permissionsFile) ===');
    console.log(applyCalldata);
    console.log('\nPSP address:', psp);
    printDaoExecuteWrapper(applyCalldata);
  } else if (!preparedTxHash) {
    console.log('\nTo compute applyUninstallation calldata, you can either:');
    console.log('- re-run with --preparedTxHash <txHash> (preferred), or');
    console.log('- save the `permissions` array from UninstallationPrepared event into JSON and pass --permissionsFile <path>');
  }

})();
