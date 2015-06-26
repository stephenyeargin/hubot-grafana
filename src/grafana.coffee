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
#   hubot graf db <dashboard slug>[:<panel id>][ <template variables>][ <from clause>][ <to clause>] - Show grafana dashboard graphs
#   hubot graf list - Lists all dashboards available
#

module.exports = (robot) ->

  grafana_host = process.env.HUBOT_GRAFANA_HOST
  grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY

  robot.respond /(?:grafana|graph|graf) (?:dash|dashboard|db) ([A-Za-z0-9\-\:_]+)(.*)?/i, (msg) ->

    slug = msg.match[1].trim()
    remainder = msg.match[2]
    timespan = {
      from: 'now-6h'
      to: 'now'
    }
    variables = ""
    pid = false

    # Parse out a specific panel
    if /\:/.test slug
      parts = slug.split(':')
      slug = parts[0]
      pid = parseInt parts[1], 10

    # Check if we have any extra fields
    if remainder
      # The order we apply non-variables in
      timeFields = ["from", "to"]

      for part in remainder.trim().split " "

        # Check if it's a variable or part of the timespan
        if part.indexOf("=") >= 0
          variables = "#{variables}&var-#{part}"

        # Only add to the timespan if we haven't already filled out from and to
        else if timeFields.length > 0
          timespan[timeFields.shift()] = part.trim()

    robot.logger.debug msg.match
    robot.logger.debug slug
    robot.logger.debug timespan
    robot.logger.debug variables
    robot.logger.debug pid

    # Call the API to get information about this dashboard
    callGrafana "dashboards/db/#{slug}", (dashboard) ->
      robot.logger.debug dashboard

      # Check dashboard information
      if !dashboard
        return sendError "An error ocurred. Check your logs for more details.", msg
      if dashboard.message
        return sendError dashboard.message, msg

      # Handle refactor done for version 2.0.2+
      if dashboard.dashboard
        # 2.0.2+: Changed in https://github.com/grafana/grafana/commit/e5c11691203fe68958e66693e429f6f5a3c77200
        data = dashboard.dashboard
        # The URL was changed in https://github.com/grafana/grafana/commit/35cc0a1cc0bca453ce789056f6fbd2fcb13f74cb
        apiEndpoint = "dashboard-solo"
      else
        # 2.0.2 and older
        data = dashboard.model
        apiEndpoint = "dashboard/solo"

      # Support for templated dashboards
      robot.logger.debug data.templating.list
      if data.templating.list
        template_map = []
        for template in data.templating.list
          template_map['$' + template.name] = template.current.text

      # Return dashboard rows
      for row in data.rows
        for panel in row.panels
          robot.logger.debug panel

          # Skip if panel ID was specified and didn't match
          if pid && pid != panel.id
            continue

          imageUrl = "#{grafana_host}/render/#{apiEndpoint}/db/#{slug}/?panelId=#{panel.id}&width=1000&height=500&from=#{timespan.from}&to=#{timespan.to}#{variables}"
          link = "#{grafana_host}/dashboard/db/#{slug}/?panelId=#{panel.id}&fullscreen&from=#{timespan.from}&to=#{timespan.to}#{variables}"
          msg.send "#{formatTitleWithTemplate(panel.title, template_map)}: #{imageUrl} - #{link}"

  robot.respond /(?:grafana|graph|graf) list$/i, (msg) ->
    callGrafana "search", (dashboards) ->
      robot.logger.debug dashboards
      msg.send "Available dashboards:"

      # Handle refactor done for version 2.0.2+
      if dashboards.dashboards
        list = dashboards.dashboards
      else
        list = dashboards

      for dashboard in list

        robot.logger.debug dashboard

        # Handle refactor done for version 2.0.2+
        if dashboard.uri
          slug = dashboard.uri.replace /^db\//, ""
        else
          slug = dashboard.slug

        msg.send "- #{slug}: #{dashboard.title}"

  sendError = (message, msg) ->
    robot.logger.error message
    msg.send message

  formatTitleWithTemplate = (title, template_map) ->
    title.replace /\$\w+/g, (match) ->
      if template_map[match]
        return template_map[match]
      else
        return match

  callGrafana = (url, callback) ->
    if grafana_api_key
      authHeader = {
        'Accept': 'application/json',
        'Authorization': "Bearer #{grafana_api_key}"
      }
    else
      authHeader = {
        'Accept': 'application/json'
      }
    robot.http("#{grafana_host}/api/#{url}").headers(authHeader).get() (err, res, body) ->
      if (err)
        robot.logger.error err
        return callback(false)
      data = JSON.parse(body)
      return callback(data)
