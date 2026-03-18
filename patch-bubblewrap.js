/**
 * patch-bubblewrap.js
 * 
 * This script patches the Bubblewrap CLI's MIME detection logic to be more robust.
 * It defaults to 'image/png' if the Content-Type header is missing or malformed,
 * and ignores Content-Disposition.
 * 
 * Usage:
 * 1. Copy this file to your local machine.
 * 2. Run: node patch-bubblewrap.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function patch() {
  try {
    // 1. Find global npm root
    console.log('Finding global npm root...');
    const npmRoot = execSync('npm root -g').toString().trim();
    
    // 2. Target file in @bubblewrap/core
    // Note: The logic often resides in @bubblewrap/core which is a dependency of @bubblewrap/cli
    const targetFile = path.join(npmRoot, '@bubblewrap', 'core', 'dist', 'lib', 'FetchUtils.js');
    
    if (!fs.existsSync(targetFile)) {
      console.error(`Could not find Bubblewrap core at: ${targetFile}`);
      console.log('Try searching for it in your local node_modules if you installed it locally.');
      return;
    }

    console.log(`Patching ${targetFile}...`);
    let content = fs.readFileSync(targetFile, 'utf8');

    // 3. Identify and replace the MIME detection logic
    // We look for where it reads response.headers.get('content-type')
    const searchPattern = /const\s+contentType\s*=\s*response\.headers\.get\(['"]content-type['"]\);/g;
    
    if (!searchPattern.test(content)) {
      console.error('Could not find the MIME detection pattern in the target file.');
      return;
    }

    const replacement = `
      let contentType = response.headers.get('content-type') || 'image/png';
      contentType = contentType.split(';')[0].trim();
      if (!contentType || contentType === 'application/octet-stream') {
          contentType = 'image/png';
      }
    `.trim();

    const patchedContent = content.replace(searchPattern, replacement);
    
    fs.writeFileSync(targetFile, patchedContent);
    console.log('Successfully patched Bubblewrap MIME detection!');
    console.log('You can now run "bubblewrap init" again.');

  } catch (err) {
    console.error('Error patching Bubblewrap:', err.message);
  }
}

patch();
