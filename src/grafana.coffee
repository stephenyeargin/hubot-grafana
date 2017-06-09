# Description:
#   Query Grafana dashboards
#
#   Examples:
#   - `hubot graf db graphite-carbon-metrics` - Get all panels in the dashboard
#   - `hubot graf db graphite-carbon-metrics:3` - Get only the third panel, from left to right, of a particular dashboard
#   - `hubot graf db graphite-carbon-metrics:3 width=1000` - Get only the third panel, from left to right, of a particular dashboard. Set the image width to 1000px
#   - `hubot graf db graphite-carbon-metrics:3 height=2000` - Get only the third panel, from left to right, of a particular dashboard. Set the image height to 2000px
#   - `hubot graf db graphite-carbon-metrics:panel-8` - Get only the panel of a particular dashboard with the ID of 8
#   - `hubot graf db graphite-carbon-metrics:cpu` - Get only the panels containing "cpu" (case insensitive) in the title
#   - `hubot graf db graphite-carbon-metrics now-12hr` - Get a dashboard with a window of 12 hours ago to now
#   - `hubot graf db graphite-carbon-metrics now-24hr now-12hr` - Get a dashboard with a window of 24 hours ago to 12 hours ago
#   - `hubot graf db graphite-carbon-metrics:3 now-8d now-1d` - Get only the third panel of a particular dashboard with a window of 8 days ago to yesterday
#
# Configuration:
#   HUBOT_GRAFANA_HOST - Host for your Grafana 2.0 install, e.g. 'http://play.grafana.org'
#   HUBOT_GRAFANA_API_KEY - API key for a particular user (leave unset if unauthenticated)
#   HUBOT_GRAFANA_QUERY_TIME_RANGE - Optional; Default time range for queries (defaults to 6h)
#   HUBOT_GRAFANA_S3_ENDPOINT - Optional; Endpoint of the S3 API (useful for S3 compatible API, defaults to s3.amazonaws.com)
#   HUBOT_GRAFANA_S3_BUCKET - Optional; Name of the S3 bucket to copy the graph into
#   HUBOT_GRAFANA_S3_ACCESS_KEY_ID - Optional; Access key ID for S3
#   HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY - Optional; Secret access key for S3
#   HUBOT_GRAFANA_S3_PREFIX - Optional; Bucket prefix (useful for shared buckets)
#   HUBOT_GRAFANA_S3_REGION - Optional; Bucket region (defaults to us-standard)
#
# Dependencies:
#   "knox": "^0.9.2"
#   "request": "~2"
#
# Notes:
#   If you want to use the Slack adapter's "attachment" formatting:
#     hubot: v2.7.2+
#     hubot-slack: 4.0+
#
# Commands:
#   hubot graf db <dashboard slug>[:<panel id>][ <template variables>][ <from clause>][ <to clause>] - Show grafana dashboard graphs
#   hubot graf list <tag> - Lists all dashboards available (optional: <tag>)
#   hubot graf search <keyword> - Search available dashboards by <keyword>
#

crypto  = require 'crypto'
knox    = require 'knox'
request = require 'request'

module.exports = (robot) ->
  # Various configuration options stored in environment variables
  grafana_host = process.env.HUBOT_GRAFANA_HOST
  grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY
  grafana_query_time_range = process.env.HUBOT_GRAFANA_QUERY_TIME_RANGE or '6h'
  s3_endpoint = process.env.HUBOT_GRAFANA_S3_ENDPOINT or 's3.amazonaws.com'
  s3_bucket = process.env.HUBOT_GRAFANA_S3_BUCKET
  s3_access_key = process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID
  s3_secret_key = process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY
  s3_prefix = process.env.HUBOT_GRAFANA_S3_PREFIX
  s3_style = process.env.HUBOT_GRAFANA_S3_STYLE if process.env.HUBOT_GRAFANA_S3_STYLE
  s3_region = process.env.HUBOT_GRAFANA_S3_REGION or 'us-standard'
  s3_port = process.env.HUBOT_GRAFANA_S3_PORT if process.env.HUBOT_GRAFANA_S3_PORT

  # Get a specific dashboard with options
  robot.respond /(?:grafana|graph|graf) (?:dash|dashboard|db) ([A-Za-z0-9\-\:_]+)(.*)?/i, (msg) ->
    slug = msg.match[1].trim()
    remainder = msg.match[2]
    timespan = {
      from: "now-#{grafana_query_time_range}"
      to: 'now'
    }
    variables = ''
    template_params = []
    visualPanelId = false
    apiPanelId = false
    pname = false
    imagesize = { "width": 1000, "height": 500 }

    # Parse out a specific panel
    if /\:/.test slug
      parts = slug.split(':')
      slug = parts[0]
      visualPanelId = parseInt parts[1], 10
      if isNaN visualPanelId
        visualPanelId = false
        pname = parts[1].toLowerCase()
      if /panel-[0-9]+/.test pname
        parts = pname.split('panel-')
        apiPanelId = parseInt parts[1], 10
        pname = false

    # Check if we have any extra fields
    if remainder
      # The order we apply non-variables in
      timeFields = ['from', 'to']

      for part in remainder.trim().split ' '
        # Check if it's a variable or part of the timespan
        if part.indexOf('=') >= 0
          #put imagesize stuff into its own dict
          if part.split('=')[0] of imagesize
            imagesize[part.split('=')[0]] = part.split('=')[1]
            continue
            
          variables = "#{variables}&var-#{part}"
          template_params.push { "name": part.split('=')[0], "value": part.split('=')[1] }

        # Only add to the timespan if we haven't already filled out from and to
        else if timeFields.length > 0
          timespan[timeFields.shift()] = part.trim()

    robot.logger.debug msg.match
    robot.logger.debug slug
    robot.logger.debug timespan
    robot.logger.debug variables
    robot.logger.debug template_params
    robot.logger.debug visualPanelId
    robot.logger.debug apiPanelId
    robot.logger.debug pname

    # Call the API to get information about this dashboard
    callGrafana "dashboards/db/#{slug}", (dashboard) ->
      robot.logger.debug dashboard

      # Check dashboard information
      if !dashboard
        return sendError 'An error ocurred. Check your logs for more details.', msg
      if dashboard.message
        return sendError dashboard.message, msg

      # Handle refactor done for version 2.0.2+
      if dashboard.dashboard
        # 2.0.2+: Changed in https://github.com/grafana/grafana/commit/e5c11691203fe68958e66693e429f6f5a3c77200
        data = dashboard.dashboard
        # The URL was changed in https://github.com/grafana/grafana/commit/35cc0a1cc0bca453ce789056f6fbd2fcb13f74cb
        apiEndpoint = 'dashboard-solo'
      else
        # 2.0.2 and older
        data = dashboard.model
        apiEndpoint = 'dashboard/solo'

      # Support for templated dashboards
      robot.logger.debug data.templating.list
      if data.templating.list
        template_map = []
        for template in data.templating.list
          robot.logger.debug template
          continue unless template.current
          for _param in template_params
            if template.name == _param.name
              template_map['$' + template.name] = _param.value
            else
              template_map['$' + template.name] = template.current.text

      # Return dashboard rows
      panelNumber = 0
      for row in data.rows
        for panel in row.panels
          robot.logger.debug panel

          panelNumber += 1

          # Skip if visual panel ID was specified and didn't match
          if visualPanelId && visualPanelId != panelNumber
            continue

          # Skip if API panel ID was specified and didn't match
          if apiPanelId && apiPanelId != panel.id
            continue

          # Skip if panel name was specified any didn't match
          if pname && panel.title.toLowerCase().indexOf(pname) is -1
            continue

          # Build links for message sending
          title = formatTitleWithTemplate(panel.title, template_map)
          imageUrl = "#{grafana_host}/render/#{apiEndpoint}/db/#{slug}/?panelId=#{panel.id}&width=#{imagesize.width}&height=#{imagesize.height}&from=#{timespan.from}&to=#{timespan.to}#{variables}"
          link = "#{grafana_host}/dashboard/db/#{slug}/?panelId=#{panel.id}&fullscreen&from=#{timespan.from}&to=#{timespan.to}#{variables}"

          # Fork here for S3-based upload and non-S3
          if (s3_bucket && s3_access_key && s3_secret_key)
            fetchAndUpload msg, title, imageUrl, link
          else
            sendRobotResponse msg, title, imageUrl, link

  # Get a list of available dashboards
  robot.respond /(?:grafana|graph|graf) list\s?(.+)?/i, (msg) ->
    if msg.match[1]
      tag = msg.match[1].trim()
      callGrafana "search?tag=#{tag}", (dashboards) ->
        robot.logger.debug dashboards
        response = "Dashboards tagged `#{tag}`:\n"
        sendDashboardList dashboards, response, msg
    else
      callGrafana 'search', (dashboards) ->
        robot.logger.debug dashboards
        response = "Available dashboards:\n"
        sendDashboardList dashboards, response, msg

  # Search dashboards
  robot.respond /(?:grafana|graph|graf) search (.+)/i, (msg) ->
    query = msg.match[1].trim()
    robot.logger.debug query
    callGrafana "search?query=#{query}", (dashboards) ->
      robot.logger.debug dashboards
      response = "Dashboards matching `#{query}`:\n"
      sendDashboardList dashboards, response, msg

  # Send Dashboard list
  sendDashboardList = (dashboards, response, msg) ->
    # Handle refactor done for version 2.0.2+
    if dashboards.dashboards
      list = dashboards.dashboards
    else
      list = dashboards

    robot.logger.debug list
    unless list.length > 0
      return

    for dashboard in list
      # Handle refactor done for version 2.0.2+
      if dashboard.uri
        slug = dashboard.uri.replace /^db\//, ''
      else
        slug = dashboard.slug
      response = response + "- #{slug}: #{dashboard.title}\n"

    # Remove trailing newline
    response.trim()

    msg.send response

  # Handle generic errors
  sendError = (message, msg) ->
    robot.logger.error message
    msg.send message

  # Format the title with template vars
  formatTitleWithTemplate = (title, template_map) ->
    title.replace /\$\w+/g, (match) ->
      if template_map[match]
        return template_map[match]
      else
        return match

  # Send robot response
  sendRobotResponse = (msg, title, image, link) ->
    switch robot.adapterName
      # Slack
      when 'slack'
        msg.send {
          attachments: [
            {
              fallback: "#{title}: #{image} - #{link}",
              title: title,
              title_link: link,
              image_url: image
            }
          ],
          unfurl_links: false
        }
      # Hipchat
      when 'hipchat'
        msg.send "#{title}: #{link} - #{image}"
      # Everything else
      else
        msg.send "#{title}: #{image} - #{link}"

  # Call off to Grafana
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

  # Pick a random filename
  uploadPath = () ->
    prefix = s3_prefix || 'grafana'
    "#{prefix}/#{crypto.randomBytes(20).toString('hex')}.png"

  # Fetch an image from provided URL, upload it to S3, returning the resulting URL
  fetchAndUpload = (msg, title, url, link) ->
    if grafana_api_key
        requestHeaders =
          encoding: null,
          auth:
            bearer: grafana_api_key
      else
        requestHeaders =
          encoding: null

    request url, requestHeaders, (err, res, body) ->
      robot.logger.debug "Uploading file: #{body.length} bytes, content-type[#{res.headers['content-type']}]"
      uploadToS3(msg, title, link, body, body.length, res.headers['content-type'])

  # Upload image to S3
  uploadToS3 = (msg, title, link, content, length, content_type) ->
    client = knox.createClient {
        key      : s3_access_key
        secret   : s3_secret_key,
        bucket   : s3_bucket,
        region   : s3_region,
        endpoint : s3_endpoint,
        port     : s3_port,
        style    : s3_style,
      }


    headers = {
      'Content-Length' : length,
      'Content-Type'   : content_type,
      'x-amz-acl'      : 'public-read',
      'encoding'       : null
    }

    filename = uploadPath()

    if s3_port
      image_url = client.http(filename)
    else
      image_url = client.https(filename)

    req = client.put(filename, headers)

    req.on 'response', (res) ->

      if (200 == res.statusCode)
        sendRobotResponse msg, title, image_url, link
      else
        robot.logger.debug res
        robot.logger.error "Upload Error Code: #{res.statusCode}"
        msg.send "#{title} - [Upload Error] - #{link}"
    req.end(content);
