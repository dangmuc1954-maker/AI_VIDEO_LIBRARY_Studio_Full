const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findBroker() {
  const re = /googleFlowRecaptchaBroker/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    console.log(`Found broker at ${m.index}:`);
    console.log(content.slice(Math.max(0, m.index - 200), Math.min(content.length, m.index + 1000)));
  }
}

findBroker();
