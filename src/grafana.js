// Description:
//   Query Grafana dashboards
//
//   Examples:
//   - `hubot graf db graphite-carbon-metrics` - Get all panels in the dashboard
//   - `hubot graf db graphite-carbon-metrics:3` - Get only the third panel, from left to right, of a particular dashboard
//   - `hubot graf db graphite-carbon-metrics:3 width=1000` - Get only the third panel, from left to right, of a particular dashboard. Set the image width to 1000px
//   - `hubot graf db graphite-carbon-metrics:3 height=2000` - Get only the third panel, from left to right, of a particular dashboard. Set the image height to 2000px
//   - `hubot graf db graphite-carbon-metrics:panel-8` - Get only the panel of a particular dashboard with the ID of 8
//   - `hubot graf db graphite-carbon-metrics:cpu` - Get only the panels containing "cpu" (case insensitive) in the title
//   - `hubot graf db graphite-carbon-metrics now-12hr` - Get a dashboard with a window of 12 hours ago to now
//   - `hubot graf db graphite-carbon-metrics now-24hr now-12hr` - Get a dashboard with a window of 24 hours ago to 12 hours ago
//   - `hubot graf db graphite-carbon-metrics:3 now-8d now-1d` - Get only the third panel of a particular dashboard with a window of 8 days ago to yesterday
//   - `hubot graf db graphite-carbon-metrics:3 tz=Europe/Amsterdam` - Get only the third panel of a particular dashboard and render in the time zone Europe/Amsterdam
//
// Configuration:
//   HUBOT_GRAFANA_HOST - Host for your Grafana 2.0 install, e.g. 'https://play.grafana.org'
//   HUBOT_GRAFANA_API_KEY - API key for a particular user (leave unset if unauthenticated)
//   HUBOT_GRAFANA_PER_ROOM - Optional; if set use robot brain to store host & API key per room
//   HUBOT_GRAFANA_QUERY_TIME_RANGE - Optional; Default time range for queries (defaults to 6h)
//   HUBOT_GRAFANA_DEFAULT_WIDTH - Optional; Default width for rendered images (defaults to 1000)
//   HUBOT_GRAFANA_DEFAULT_HEIGHT - Optional; Default height for rendered images (defaults to 500)
//   HUBOT_GRAFANA_DEFAULT_TIME_ZONE - Optional; Default time zone (default to "")
//   HUBOT_GRAFANA_S3_BUCKET - Optional; Name of the S3 bucket to copy the graph into
//   HUBOT_GRAFANA_S3_PREFIX - Optional; Bucket prefix (useful for shared buckets)
//   HUBOT_GRAFANA_S3_REGION - Optional; Bucket region (defaults to us-standard)
//   HUBOT_GRAFANA_USE_THREADS - Optional; When set to any value, graphs are sent in thread instead of as new message.
//   ROCKETCHAT_URL - Optional; URL to your Rocket.Chat instance (already configured with the adapter)
//   ROCKETCHAT_USER - Optional; Bot username (already configured with the adapter)
//   ROCKETCHAT_PASSWORD - Optional; Bot password (already configured with the adapter)
//
// Notes:
//   If you want to use the Slack adapter's "attachment" formatting:
//     hubot: v2.7.2+
//     hubot-slack: 4.0+
//     @hubot-friends/hubot-slack: 1.0+
//
// Commands:
//   hubot graf set `[host|api_key]` <value> - Setup Grafana host or API key
//   hubot graf db <dashboard uid>[:<panel id>][ <template variables>][ <from clause>][ <to clause>] - Show grafana dashboard graphs
//   hubot graf list <tag> - Lists all dashboards available (optional: <tag>)
//   hubot graf search <keyword> - Search available dashboards by <keyword>
//   hubot graf alerts[ <state>] - Show all alerts (optional: <state>)
//   hubot graf pause alert <id> - Pause the alert with specified <id>
//   hubot graf unpause alert <id> - Un-pause the alert with specified <id>
//   hubot graf pause all alerts - Pause all alerts (admin permissions required)
//   hubot graf unpause all alerts - Un-pause all alerts (admin permissions required)
//

/// <reference path="../types.d.ts"/>

const { Bot } = require('./Bot');

/**
 * Adds the Grafana commands to Hubot.
 * @param {Hubot.Robot} robot
 */
module.exports = (robot) => {
  // Various configuration options stored in environment variables
  const grafanaPerRoom = process.env.HUBOT_GRAFANA_PER_ROOM;
  const maxReturnDashboards = process.env.HUBOT_GRAFANA_MAX_RETURNED_DASHBOARDS || 25;
  const bot = new Bot(robot);

  // Set Grafana host/api_key
  robot.respond(/(?:grafana|graph|graf) set (host|api_key) (.+)/i, (msg) => {
    if (grafanaPerRoom !== '1') {
      return bot.sendError('Set HUBOT_GRAFANA_PER_ROOM=1 to use multiple configurations.', msg);
    }

    const context = msg.message.user.room.split('@')[0];
    robot.brain.set(`grafana_${msg.match[1]}_${context}`, msg.match[2]);
    return msg.send(`Value set for ${msg.match[1]}`);
  });

  // Get a specific dashboard with options
  robot.respond(/(?:grafana|graph|graf) (?:dash|dashboard|db) ([A-Za-z0-9\-\:_]+)(.*)?/i, async (msg) => {
    const service = bot.createService(msg);
    if (!service) return;

    let str = msg.match[1].trim();
    if (msg.match[2]) {
      str += ' ' + msg.match[2].trim();
    }

    const req = service.parseToGrafanaDashboardRequest(str);
    const dashboard = await service.getDashboard(req.uid);

    // Check dashboard information
    if (!dashboard) {
      return bot.sendError('An error ocurred. Check your logs for more details.', msg);
    }
    if (dashboard.message) {
      return bot.sendError(dashboard.message, msg);
    }

    // Defaults
    const data = dashboard.dashboard;

    // Handle empty dashboard
    if (data.rows == null) {
      return bot.sendError('Dashboard empty.', msg);
    }

    const dashboards = await service.getDashboardCharts(req, dashboard, maxReturnDashboards);
    if (dashboards == null || dashboards.length === 0) {
      return bot.sendError('Could not locate desired panel.', msg);
    }

    for (let d of dashboards) {
      await bot.sendDashboardChart(msg, d);
    }
  });

  // Get a list of available dashboards
  robot.respond(/(?:grafana|graph|graf) list\s?(.+)?/i, async (msg) => {
    const service = bot.createService(msg);
    if (!service) return;

    let title = 'Available dashboards:\n';
    let tag = null;
    if (msg.match[1]) {
      tag = msg.match[1].trim();
      title = `Dashboards tagged \`${tag}\`:\n`;
    }

    const dashboards = await service.search(null, tag);
    if (dashboards == null) return;
    sendDashboardList(dashboards, title, msg);
  });

  // Search dashboards
  robot.respond(/(?:grafana|graph|graf) search (.+)/i, async (msg) => {
    const service = bot.createService(msg);
    if (!service) return;

    const query = msg.match[1].trim();
    robot.logger.debug(query);

    const dashboards = await service.search(query);
    if (dashboards == null) return;

    const title = `Dashboards matching \`${query}\`:\n`;
    sendDashboardList(dashboards, title, msg);
  });

  // Show alerts
  robot.respond(/(?:grafana|graph|graf) alerts\s?(.+)?/i, async (msg) => {
    const service = bot.createService(msg);
    if (!service) return;

    let title = 'All alerts:\n';
    let state = null;

    // all alerts of a specific type
    if (msg.match[1]) {
      state = msg.match[1].trim();
      title = `Alerts with state '${state}':\n`;
    }

    robot.logger.debug(title.trim());

    let alerts = await service.queryAlerts(state);
    if (alerts == null) return;

    robot.logger.debug(alerts);

    let text = title;

    for (const alert of alerts) {
      let line = `- *${alert.name}* (${alert.id}): \`${alert.state}\``;
      if (alert.newStateDate) {
        line += `\n  last state change: ${alert.newStateDate}`;
      }
      if (alert.executionError) {
        line += `\n  execution error: ${alert.executionError}`;
      }
      text += line + `\n`;
    }
    msg.send(text.trim());
  });

  // Pause/unpause an alert
  robot.respond(/(?:grafana|graph|graf) (unpause|pause)\salert\s(\d+)/i, (msg) => {
    const service = bot.createService(msg);
    if (!service) return;

    const paused = msg.match[1] === 'pause';
    const alertId = msg.match[2];

    const message = service.pauseSingleAlert(alertId, paused);

    if (message) {
      msg.send(message);
    }
  });

  // Pause/unpause all alerts
  // requires an API token with admin permissions
  robot.respond(/(?:grafana|graph|graf) (unpause|pause) all(?:\s+alerts)?/i, async (msg) => {
    const service = bot.createService(msg);
    if (!service) return;

    const command = msg.match[1];
    const paused = command === 'pause';
    const result = await service.pauseAllAlerts(paused);

    if (result.total == 0) return;

    msg.send(
      `Successfully tried to ${command} *${result.total}* alerts.\n*Success: ${result.success}*\n*Errored: ${result.errored}*`
    );
  });

  /**
   * Sends the list of dashboards.
   * @param {Array<GrafanaSearchResponse>} dashboards the list of dashboards
   * @param {string} title the title that is printed before the result
   * @param {Hubot.Response} res the context.
   */
  async function sendDashboardList(dashboards, title, res) {
    let remaining;
    robot.logger.debug(dashboards);
    if (!(dashboards.length > 0)) {
      return;
    }

    remaining = 0;
    if (dashboards.length > maxReturnDashboards) {
      remaining = dashboards.length - maxReturnDashboards;
      dashboards = dashboards.slice(0, maxReturnDashboards - 1);
    }

    const list = [];
    for (const dashboard of Array.from(dashboards)) {
      list.push(`- ${dashboard.uid}: ${dashboard.title}`);
    }

    if (remaining) {
      list.push(` (and ${remaining} more)`);
    }

    res.send(title + list.join('\n'));
  }
};
