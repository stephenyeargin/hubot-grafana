const fs = require('fs');
const path = require('path');

module.exports = function(robot, scripts) {
  const scriptsPath = path.resolve(__dirname, 'src');
  if (fs.existsSync(scriptsPath)) {
    return (() => {
      const result = [];
      for (let script of Array.from(fs.readdirSync(scriptsPath).sort())) {
        if ((scripts != null) && !Array.from(scripts).includes('*')) {
          if (Array.from(scripts).includes(script)) { result.push(robot.loadFile(scriptsPath, script)); } else {
            result.push(undefined);
          }
        } else {
          result.push(robot.loadFile(scriptsPath, script));
        }
      }
      return result;
    })();
  }
};
