const fs = require('fs');
const path = require('path');

module.exports = function (robot) {
  const scriptsPath = path.resolve(__dirname, 'src');
  if (fs.existsSync(scriptsPath)) {
    const scripts = ['grafana.js'].sort();
    for (const script of scripts) {
      robot.loadFile(scriptsPath, script);
    }
  }
};
