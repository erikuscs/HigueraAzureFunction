const fs = require('fs').promises;
const path = require('path');
const walk = async (dir, fileList = []) => {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (file.name === 'node_modules') continue; // Skip node_modules
      await walk(filePath, fileList);
    } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
};

const checkForLodashIsEqual = async () => {
  console.log('Checking for lodash.isequal usage in project files...');
  const files = await walk(process.cwd());
  let found = false;

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      if (content.includes('lodash.isequal')) {
        console.log(`Found lodash.isequal in: ${file}`);
        found = true;
      }
    } catch (err) {
      console.error(`Error reading file ${file}: ${err.message}`);
    }
  }

  if (!found) {
    console.log('No lodash.isequal usage found.');
  }
};

checkForLodashIsEqual().catch(err => {
  console.error('Error during check:', err);
  process.exit(1);
});

