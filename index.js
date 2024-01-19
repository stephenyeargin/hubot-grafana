const fs = require('fs');
const path = require('path');

module.exports = function (robot) {
  const scriptsPath = path.resolve(__dirname, 'src');
  if (fs.existsSync(scriptsPath)) {
    let scripts = ['grafana.js'].sort();
    for (let script of scripts) {
      robot.loadFile(scriptsPath, script);
    }
  }
};
