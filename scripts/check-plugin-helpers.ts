import mongoose from 'mongoose';
import config from '@config';
import { Models } from '@dbModels';

async function checkPluginHelpers() {
  console.log('🔍 Checking plugin helpers in MongoDB\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoDbUri);
    console.log('✅ Connected to MongoDB');

    const pluginAddress = '0x48D6E7Dc4A289417D6878119092d2Bb040162995'.toLowerCase();
    const network = 'harmony-mainnet';

    // Find InstallationPrepared event
    const installationPrepared = await Models.LogPluginSetupProcessor.findOne({
      network,
      pluginAddress,
      event: 'InstallationPrepared',
    }).sort({ blockNumber: -1 });

    if (!installationPrepared) {
      console.log(`❌ No InstallationPrepared event found for plugin ${pluginAddress}`);
      await mongoose.disconnect();
      return;
    }

    console.log('\n📋 InstallationPrepared Event Details:');
    console.log('═══════════════════════════════════════');
    console.log(`Block Number: ${installationPrepared.blockNumber}`);
    console.log(`Transaction: ${installationPrepared.transactionHash}`);
    console.log(`DAO: ${installationPrepared.daoAddress}`);
    console.log(`Plugin: ${installationPrepared.pluginAddress}`);
    console.log(`Prepared Setup ID: ${installationPrepared.preparedSetupId}`);

    // Check if helpers field exists
    const hasHelpersField = 'helpers' in installationPrepared;
    console.log(`\n🔧 Helpers Field Present: ${hasHelpersField ? '✅ YES' : '❌ NO'}`);

    if (hasHelpersField && installationPrepared.helpers) {
      console.log(`\n📦 Helpers Array (${installationPrepared.helpers.length} items):`);
      installationPrepared.helpers.forEach((helper, index) => {
        console.log(`  [${index}] ${helper}`);
      });

      // Validate against expected helpers
      const expectedHelpers = [
        '0xc405df188019c1a28000d302ee10e224081c8736',
        '0xa4a72cb0c1cde087b40d79f28f559b047df1760f',
      ];

      const normalizedHelpers = installationPrepared.helpers.map((h: string) => h.toLowerCase());
      const match =
        normalizedHelpers.length === expectedHelpers.length &&
        normalizedHelpers.every((h: string, i: number) => h === expectedHelpers[i]);

      console.log(`\n✅ Matches Expected Helpers: ${match ? '✅ YES' : '❌ NO'}`);

      if (!match) {
        console.log('\n⚠️  Expected helpers:');
        expectedHelpers.forEach((helper, index) => {
          console.log(`  [${index}] ${helper}`);
        });

        console.log('\n⚠️  Differences detected:');
        if (normalizedHelpers.length !== expectedHelpers.length) {
          console.log(`  - Length mismatch: got ${normalizedHelpers.length}, expected ${expectedHelpers.length}`);
        }
        normalizedHelpers.forEach((h: string, i: number) => {
          if (h !== expectedHelpers[i]) {
            console.log(`  - Index ${i}: got ${h}, expected ${expectedHelpers[i]}`);
          }
        });
      }
    } else {
      console.log('\n⚠️  Helpers field is empty or missing');
      console.log('📝 This event was likely indexed before the helpers field was added to the schema');
      console.log('\n💡 Recommended Actions:');
      console.log('   1. Re-index this specific event from the chain');
      console.log('   2. Or run a migration script to backfill helpers from event logs');
      console.log('   3. Or manually insert helpers via MongoDB update');
    }

    // Find related InstallationApplied event
    console.log('\n\n🔍 Checking for related InstallationApplied event...');
    const installationApplied = await Models.LogPluginSetupProcessor.findOne({
      network,
      pluginAddress,
      event: 'InstallationApplied',
      daoAddress: installationPrepared.daoAddress,
    }).sort({ blockNumber: -1 });

    if (installationApplied) {
      console.log('✅ Found InstallationApplied event');
      console.log(`   Block: ${installationApplied.blockNumber}`);
      console.log(`   Transaction: ${installationApplied.transactionHash}`);
      console.log(`   Applied Setup ID: ${installationApplied.appliedSetupId}`);

      // Expected appliedSetupId from brute-force validation
      const expectedAppliedSetupId =
        '0xf25638beb8498cd500d3097e547a78f9d0e490474b29f5099bf8caf4d3ec25af';
      const matchesExpected =
        installationApplied.appliedSetupId?.toLowerCase() === expectedAppliedSetupId.toLowerCase();

      console.log(`\n✅ Applied Setup ID Matches: ${matchesExpected ? '✅ YES' : '❌ NO'}`);
      if (!matchesExpected) {
        console.log(`   Expected: ${expectedAppliedSetupId}`);
        console.log(`   Got:      ${installationApplied.appliedSetupId}`);
      }
    } else {
      console.log('❌ No InstallationApplied event found');
    }

    await mongoose.disconnect();
    console.log('\n\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkPluginHelpers().catch(console.error);
