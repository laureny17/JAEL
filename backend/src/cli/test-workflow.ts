#!/usr/bin/env node
import { startDanceProject } from '../agents/danceAgent.js';
import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const topic = args[0] || 'Freytag`s pyramid';
const mood = args[1] || 'upbeat';
const genre = args[2] || 'pop';

console.log('\n🎵 Dance Agent Workflow Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📝 Topic: ${topic}`);
console.log(`🎭 Mood: ${mood}`);
console.log(`🎸 Genre: ${genre}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function runWorkflow() {
  try {
    console.log('⏳ Starting agent workflow...\n');

    const result = await startDanceProject(topic, 60, mood, genre);

    console.log('\n✅ Workflow Complete!\n');

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `workflow-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    // Save full result
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`💾 Full result saved to: ${filepath}\n`);

    // Also save a human-readable version
    const readableFilename = `workflow-${timestamp}.txt`;
    const readableFilepath = path.join(outputDir, readableFilename);

    let readableContent = `Dance Project Workflow Result
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Topic: ${topic}
Mood: ${mood}
Genre: ${genre}
Generated: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULT:
${JSON.stringify(result, null, 2)}
`;

    fs.writeFileSync(readableFilepath, readableContent);
    console.log(`📄 Readable output saved to: ${readableFilepath}\n`);

    // Print summary to console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RESULT SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(result, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error running workflow:', error);
    process.exit(1);
  }
}

runWorkflow();
