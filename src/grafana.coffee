# Description:
#   Query Grafana dashboards
#
#   Examples:
#   - `hubot graf db graphite-carbon-metrics` - Get all panels in the dashboard
#   - `hubot graf db graphite-carbon-metrics:3` - Get only the third panel of a particular dashboard
#   - `hubot graf db graphite-carbon-metrics now-12hr` - Get a dashboard with a window of 12 hours ago to now
#   - `hubot graf db graphite-carbon-metrics now-24hr now-12hr` - Get a dashboard with a window of 24 hours ago to 12 hours ago
#   - `hubot graf db graphite-carbon-metrics:3 now-8d now-1d` - Get only the third panel of a particular dashboard with a window of 8 days ago to yesterday
#
# Configuration:
#   HUBOT_GRAFANA_HOST - Host for your Grafana 2.0 install, e.g. 'http://play.grafana.org'
#   HUBOT_GRAFANA_API_KEY - API key for a particular user
#
# Commands:
#   hubot graph db <dashboard slug>[:<panel id>][ <from clause>][ <to clause>]
#

module.exports = (robot) ->

  grafana_host = process.env.HUBOT_GRAFANA_HOST
  grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY

  robot.respond /(?:grafana|graph|graf) (?:dash|dashboard|db) ([A-Za-z0-9\-\:_]+)(| [A-Za-z0-9\-\+]+)?(| [A-Za-z0-9\-\+]+)?/i, (msg) ->

    slug = msg.match[1].trim()
    from = msg.match[2] || 'now-6h'
    to   = msg.match[3] || 'now'
    pid  = false

    # Parse out a specific panel
    if /\:/.test slug
      parts = slug.split(':')
      slug = parts[0]
      pid = parseInt parts[1], 10

    robot.logger.debug msg.match
    robot.logger.debug slug
    robot.logger.debug from
    robot.logger.debug to
    robot.logger.debug pid

    # Call the API to get information about this dashboard
    getDashboardInformation slug, (dashboard) ->
      robot.logger.debug dashboard

      # Check dashboard information
      if !dashboard
        return sendError "An error ocurred. Check your logs for more details.", msg
      if dashboard.message
        return sendError dashboard.message, msg

      # Support for templated dashboards
      robot.logger.debug dashboard.model.templating.list
      if dashboard.model.templating.list
        template_map = []
        for template in dashboard.model.templating.list
          template_map['$' + template.name] = template.current.text

      # Return dashboard rows
      for row in dashboard.model.rows
        for panel in row.panels
          robot.logger.debug panel

          # Skip if panel ID was specified and didn't match
          if pid && pid != panel.id
            continue

          # Clean up attributes
          from = from.trim()
          to = to.trim()

          imageUrl = "#{grafana_host}/render/dashboard/solo/db/#{slug}/?panelId=#{panel.id}&width=1000&height=500&from=#{from}&to=#{to}"
          link = "#{grafana_host}/dashboard/db/#{slug}/?panelId=#{panel.id}&fullscreen&from=#{from}&to=#{to}"
          msg.send "#{formatTitleWithTemplate(panel.title, template_map)}: #{imageUrl} - #{link}"

  sendError = (message, msg) ->
    robot.logger.error message
    msg.send message

  formatTitleWithTemplate = (title, template_map) ->
    title.replace /\$\w+/g, (match) ->
      if template_map[match]
        return template_map[match]
      else
        return match

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
        robot.logger.error err
        return callback(false)
      dashboard = JSON.parse(body)
      return callback(dashboard)
