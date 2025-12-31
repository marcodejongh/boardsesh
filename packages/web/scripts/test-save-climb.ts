#!/usr/bin/env tsx

import { saveClimb } from '../app/lib/api-wrappers/aurora/saveClimb';

const token = 'a23ee153eaea95706536064a71ebf30df5b0687a';
const userId = 118684;

async function testSaveClimb() {
  console.log('Testing saveClimb with WEB_HOSTS pattern...\n');

  try {
    const result = await saveClimb('kilter', token, {
      layout_id: 1,
      setter_id: userId,
      name: 'API Test Climb - DELETE ME',
      description: 'Testing Aurora API fix - should be safe to delete',
      is_draft: true,
      frames: 'p1111r15',
      angle: 40,
      frames_count: 1,
      frames_pace: 0,
    });

    console.log('✅ Success!\n');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\n📊 Sync Status:', result.synced ? '✅ SYNCED' : '❌ NOT SYNCED');
    console.log('UUID:', result.uuid);

    if (result.synced) {
      console.log('\n🎉 Climb successfully synced to Aurora!');
      console.log('Check it at: https://kilterboardapp.com/climbs/' + result.uuid);
    } else {
      console.log('\n⚠️ Climb saved locally but NOT synced to Aurora');
      console.log('Check server logs for sync error details');
    }

    process.exit(result.synced ? 0 : 1);
  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

testSaveClimb();
