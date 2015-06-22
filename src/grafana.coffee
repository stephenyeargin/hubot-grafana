# Description:
#   Query Grafana dashboards
#
# Configuration:
#   HUBOT_GRAFANA_HOST - Host for your Grafana 2.0 install, e.g. 'http://play.grafana.org'
#   HUBOT_GRAFANA_API_KEY - API key for a particular user
#
# Commands:
#   hubot graph <dashboard slug>[ <from clause>] - obtains all panels in a given dashboard, with optional time clause
#

module.exports = (robot) ->

  grafana_host = process.env.HUBOT_GRAFANA_HOST
  grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY

  robot.respond /(?:grafana|graph) (?:dash|dashboard|db) (.*)(| .*)/i, (msg) ->

    # Get the dashboard slug
    slug = msg.match[1]
    from = msg.match[2] || 'now-6h'

    # Call the API to get information about this dashboard
    getDashboardInformation slug, (dashboard) ->
      robot.logger.debug dashboard
      if !dashboard
        return msg.send "An error ocurred. Check your logs for more details."
      if dashboard.message
        return msg.send dashboard.message

      for row in dashboard.model.rows
        for panel in row.panels
          imageUrl = "#{grafana_host}/render/dashboard/solo/db/#{slug}/?panelId=#{panel.id}&width=1000&height=500"
          link = "#{grafana_host}/dashboard/db/#{slug}/?panelId=#{panel.id}&fullscreen"
          if from
            imageUrl += "&from=#{from}"
            link += "&from=#{from}"
          robot.logger.debug panel
          msg.send "#{panel.title}: #{imageUrl} - #{link}"

  getDashboardInformation = (slug, callback) ->
    if grafana_api_key
      authHeader = {
        'Accept': 'application/json',
        'Authorization': "Bearer #{grafana_api_key}"
      }
    else
      authHeader = {
        'Accept': 'application/json'
      }
    robot.http("#{grafana_host}/api/dashboards/db/#{slug}").headers(authHeader).get() (err, res, body) ->
      if (err)
        robot.logger.warning err
        return callback(false)
      dashboard = JSON.parse(body)
      return callback(dashboard)
