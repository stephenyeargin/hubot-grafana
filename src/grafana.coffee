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
#   HUBOT_GRAFANA_PER_ROOM - Optional; if set use robot brain to store host & API key per room
#   HUBOT_GRAFANA_QUERY_TIME_RANGE - Optional; Default time range for queries (defaults to 6h)
#   HUBOT_GRAFANA_DEFAULT_WIDTH - Optional; Default width for rendered images (defaults to 1000)
#   HUBOT_GRAFANA_DEFAULT_HEIGHT - Optional; Default height for rendered images (defaults to 500)
#   HUBOT_GRAFANA_S3_ENDPOINT - Optional; Endpoint of the S3 API (useful for S3 compatible API, defaults to s3.amazonaws.com)
#   HUBOT_GRAFANA_S3_BUCKET - Optional; Name of the S3 bucket to copy the graph into
#   HUBOT_GRAFANA_S3_ACCESS_KEY_ID - Optional; Access key ID for S3
#   HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY - Optional; Secret access key for S3
#   HUBOT_GRAFANA_S3_PREFIX - Optional; Bucket prefix (useful for shared buckets)
#   HUBOT_GRAFANA_S3_REGION - Optional; Bucket region (defaults to us-standard)
#   HUBOT_SLACK_TOKEN - Optional; Token to connect to Slack (already configured with the adapter)
#   ROCKETCHAT_URL - Optional; URL to your Rocket.Chat instance (already configured with the adapter)
#   ROCKETCHAT_USER - Optional; Bot username (already configured with the adapter)
#   ROCKETCHAT_PASSWORD - Optional; Bot password (already configured with the adapter)
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
#   hubot graf set `[host|api_key]` <value> - Setup Grafana host or API key
#   hubot graf db <dashboard slug>[:<panel id>][ <template variables>][ <from clause>][ <to clause>] - Show grafana dashboard graphs
#   hubot graf list <tag> - Lists all dashboards available (optional: <tag>)
#   hubot graf search <keyword> - Search available dashboards by <keyword>
#   hubot graf alerts[ <state>] - Show all alerts (optional: <state>)
#   hubot graf pause alert <id> - Pause the alert with specified <id>
#   hubot graf unpause alert <id> - Un-pause the alert with specified <id>
#   hubot graf pause all alerts - Pause all alerts (admin permissions required)
#   hubot graf unpause all alerts - Un-pause all alerts (admin permissions required)
#

crypto  = require 'crypto'
knox    = require 'knox-s3'
request = require 'request'

module.exports = (robot) ->
  # Various configuration options stored in environment variables
  grafana_host = process.env.HUBOT_GRAFANA_HOST
  grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY
  grafana_per_room = process.env.HUBOT_GRAFANA_PER_ROOM
  grafana_query_time_range = process.env.HUBOT_GRAFANA_QUERY_TIME_RANGE or '6h'
  s3_endpoint = process.env.HUBOT_GRAFANA_S3_ENDPOINT or 's3.amazonaws.com'
  s3_bucket = process.env.HUBOT_GRAFANA_S3_BUCKET
  s3_access_key = process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID
  s3_secret_key = process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY
  s3_prefix = process.env.HUBOT_GRAFANA_S3_PREFIX
  s3_style = process.env.HUBOT_GRAFANA_S3_STYLE if process.env.HUBOT_GRAFANA_S3_STYLE
  s3_region = process.env.HUBOT_GRAFANA_S3_REGION or 'us-standard'
  s3_port = process.env.HUBOT_GRAFANA_S3_PORT if process.env.HUBOT_GRAFANA_S3_PORT
  slack_token = process.env.HUBOT_SLACK_TOKEN
  rocketchat_url = process.env.ROCKETCHAT_URL
  rocketchat_user = process.env.ROCKETCHAT_USER
  rocketchat_password = process.env.ROCKETCHAT_PASSWORD

  if rocketchat_url && ! rocketchat_url.startsWith 'http'
    rocketchat_url = 'http://' + rocketchat_url

  site = () ->
    # prioritize S3 no matter if adpater is slack or rocketchat
    if (s3_bucket && s3_access_key && s3_secret_key)
      's3'
    else if (robot.adapterName == 'slack')
      'slack'
    else if (robot.adapterName == 'rocketchat')
      'rocketchat'
    else
      ''
  isUploadSupported = site() != ''

  get_room = (msg) ->
    # placeholder for further adapter support (i.e. MS Teams) as then room also
    # contains thread conversation id
    return msg.envelope.room

  get_grafana_endpoint = (msg) ->
    if (grafana_per_room == '1')
      room = get_room(msg)
      grafana_host = robot.brain.get('grafana_host_' + room)
      grafana_api_key = robot.brain.get('grafana_api_key_' + room)
      if not grafana_host
        return
    return { "host": grafana_host, "api_key": grafana_api_key }

  # Set Grafana host/api_key
  robot.respond /(?:grafana|graph|graf) set (host|api_key) (.+)/i, (msg) ->
    if (grafana_per_room == '1')
      context = msg.message.user.room.split('@')[0]
      robot.brain.set('grafana_' + msg.match[1] + '_' + context, msg.match[2])
      msg.send "Value set for #{msg.match[1]}"
    else
      sendError 'Set HUBOT_GRAFANA_PER_ROOM=1 to use multiple configurations.', msg

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
    imagesize =
      width: process.env.HUBOT_GRAFANA_DEFAULT_WIDTH or 1000
      height: process.env.HUBOT_GRAFANA_DEFAULT_HEIGHT or 500
    endpoint = get_grafana_endpoint(msg)
    if not endpoint
      sendError 'No Grafana endpoint configured.', msg
      return
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
    if remainder && remainder.trim() != ''
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
    callGrafana endpoint, "dashboards/db/#{slug}", (dashboard) ->
      robot.logger.debug dashboard

      # Check dashboard information
      if !dashboard
        return sendError 'An error ocurred. Check your logs for more details.', msg
      if dashboard.message
        return sendError dashboard.message, msg

      # Defaults
      apiEndpoint = 'dashboard-solo'
      data = dashboard.dashboard

      # Handle refactor done for version 5.0.0+
      if dashboard.dashboard.panels
        # Concept of "rows" was replaced by coordinate system
        data.rows = [dashboard.dashboard]

      # Handle empty dashboard
      if !data.rows?
        return sendError 'Dashboard empty.', msg

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
          imageUrl = "#{endpoint.host}/render/#{apiEndpoint}/db/#{slug}/?panelId=#{panel.id}&width=#{imagesize.width}&height=#{imagesize.height}&from=#{timespan.from}&to=#{timespan.to}#{variables}"
          link = "#{endpoint.host}/dashboard/db/#{slug}/?panelId=#{panel.id}&fullscreen&from=#{timespan.from}&to=#{timespan.to}#{variables}"

          sendDashboardChart msg, title, imageUrl, link

  # Process the bot response
  sendDashboardChart = (msg, title, imageUrl, link) ->
    if (isUploadSupported)
      uploadChart msg, title, imageUrl, link, site
    else
      sendRobotResponse msg, title, imageUrl, link

  # Get a list of available dashboards
  robot.respond /(?:grafana|graph|graf) list\s?(.+)?/i, (msg) ->
    endpoint = get_grafana_endpoint(msg)
    if not endpoint
      sendError 'No Grafana endpoint configured.', msg
    else if msg.match[1]
      tag = msg.match[1].trim()
      callGrafana endpoint, "search?type=dash-db&tag=#{tag}", (dashboards) ->
        robot.logger.debug dashboards
        response = "Dashboards tagged `#{tag}`:\n"
        sendDashboardList dashboards, response, msg
    else
      callGrafana endpoint, 'search?type=dash-db', (dashboards) ->
        robot.logger.debug dashboards
        response = "Available dashboards:\n"
        sendDashboardList dashboards, response, msg

  # Search dashboards
  robot.respond /(?:grafana|graph|graf) search (.+)/i, (msg) ->
    query = msg.match[1].trim()
    endpoint = get_grafana_endpoint(msg)
    robot.logger.debug query
    if not endpoint
      sendError 'No Grafana endpoint configured.', msg
      return
    callGrafana endpoint, "search?type=dash-db&query=#{query}", (dashboards) ->
      robot.logger.debug dashboards
      response = "Dashboards matching `#{query}`:\n"
      sendDashboardList dashboards, response, msg

  # Show alerts
  robot.respond /(?:grafana|graph|graf) alerts\s?(.+)?/i, (msg) ->
    endpoint = get_grafana_endpoint(msg)
    if not endpoint
      sendError 'No Grafana endpoint configured.', msg
      return
    # all alerts of a specific type
    if msg.match[1]
      state = msg.match[1].trim()
      callGrafana endpoint, "alerts?state=#{state}", (alerts) ->
        robot.logger.debug alerts
        sendAlerts alerts, "Alerts with state '#{state}':\n", msg
    # *all* alerts
    else
      robot.logger.debug 'Show all alerts'
      callGrafana endpoint, 'alerts', (alerts) ->
        robot.logger.debug alerts
        sendAlerts alerts, 'All alerts:\n', msg

  # Pause/unpause an alert
  robot.respond /(?:grafana|graph|graf) (unpause|pause)\salert\s(\d+)/i, (msg) ->
    paused = msg.match[1] == 'pause'
    alertId = msg.match[2]
    endpoint = get_grafana_endpoint(msg)
    if not endpoint
      sendError 'No Grafana endpoint configured.', msg
      return
    postGrafana endpoint, "alerts/#{alertId}/pause", {'paused': paused}, (result) ->
      robot.logger.debug result
      if result.message
        msg.send result.message

  # Pause/unpause all alerts
  # requires an API token with admin permissions
  robot.respond /(?:grafana|graph|graf) (unpause|pause) all(?:\s+alerts)?/i, (msg) ->
    paused = msg.match[1] == 'pause'
    endpoint = get_grafana_endpoint(msg)
    if not endpoint
      sendError 'No Grafana endpoint configured.', msg
      return
    callGrafana endpoint, 'alerts', (alerts) ->
      robot.logger.debug alerts
      errored = 0
      unless alerts.length > 0
        return
      for alert in alerts
        postGrafana endpoint, "alerts/#{alert.id}/pause", {'paused': paused}, (result) ->
          robot.logger.debug result
          if result == false
            errored = errored + 1
      msg.send "Sucessfully tried to #{msg.match[1]} *#{alerts.length}* alerts.\n*Success: #{alerts.length - errored}*\n*Errored: #{errored}*"

  # Send a list of alerts
  sendAlerts = (alerts, response, msg) ->
    unless alerts.length > 0
      return
    for alert in alerts
      line = "- *#{alert.name}* (#{alert.id}): `#{alert.state}`"
      if alert.newStateDate
        line = line + "\n  last state change: #{alert.newStateDate}"
      if alert.executionError
        line = line + "\n  execution error: #{alert.executionError}"
      response = response + line + "\n"
    msg.send response.trim()

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
      # BearyChat
      when 'bearychat'
        robot.emit 'bearychat.attachment', {
          message:
            room: msg.envelope.room
          text: "[#{title}](#{link})"
          attachments: [
            {
              fallback: "#{title}: #{image} - #{link}",
              images: [
                url: image
              ]
            }
          ],
        }
      # Everything else
      else
        msg.send "#{title}: #{image} - #{link}"

  # Call off to Grafana
  callGrafana = (endpoint, url, callback) ->
    robot.http("#{endpoint.host}/api/#{url}").headers(grafanaHeaders(endpoint)).get() (err, res, body) ->
      if (err)
        robot.logger.error err
        return callback(false)
      data = JSON.parse(body)
      return callback(data)

  # Post to Grafana
  postGrafana = (endpoint, url, data, callback) ->
    jsonPayload = JSON.stringify(data)
    robot.http("#{endpoint.host}/api/#{url}").headers(grafanaHeaders(endpoint, true)).post(jsonPayload) (err, res, body) ->
      if (err)
        robot.logger.error err
        return callback(false)
      data = JSON.parse(body)
      return callback(data)

  grafanaHeaders = (endpoint, post = false) ->
    headers = { 'Accept': 'application/json' }
    if endpoint.api_key
      headers['Authorization'] = "Bearer #{endpoint.api_key}"
    if post
      headers['Content-Type'] = 'application/json'
    headers

  # Pick a random filename
  uploadPath = () ->
    prefix = s3_prefix || 'grafana'
    "#{prefix}/#{crypto.randomBytes(20).toString('hex')}.png"

  uploadTo =
    's3': (msg, title, grafanaDashboardRequest, link) ->
      grafanaDashboardRequest (err, res, body) ->
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
          'Content-Length' : body.length,
          'Content-Type'   : res.headers['content-type'],
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

        req.end body

    'slack': (msg, title, grafanaDashboardRequest, link) ->
      testAuthData =
        url: 'https://slack.com/api/auth.test'
        formData:
          token: slack_token

      # We test auth against slack to obtain the team URL
      request.post testAuthData, (err, httpResponse, slackResBody) ->
          if err
            robot.logger.error err
            msg.send "#{title} - [Slak auth.test Error - invalid token/can't fetch team url] - #{link}"
          else
            slack_url = JSON.parse(slackResBody)["url"]

            # fill in the POST request. This must be www-form/multipart
            uploadData =
              url: slack_url.replace(/\/$/, '') + '/api/files.upload'
              formData:
                title: "#{title}"
                channels: msg.envelope.room
                token: slack_token
                # grafanaDashboardRequest() is the method that downloads the .png
                file: grafanaDashboardRequest()
                filetype: 'png'

            # Try to upload the image to slack else pass the link over
            request.post uploadData, (err, httpResponse, body) ->
              res = JSON.parse(body)

              # Error logging, we must also check the body response.
              # It will be something like: { "ok": <boolean>, "error": <error message> }
              if err
                robot.logger.error err
                msg.send "#{title} - [Upload Error] - #{link}"
              else if !res["ok"]
                robot.logger.error "Slack service error while posting data:" +res["error"]
                msg.send "#{title} - [Form Error: can't upload file] - #{link}"

    'rocketchat': (msg, title, grafanaDashboardRequest, link) ->
      authData =
        url: rocketchat_url + '/api/v1/login'
        form:
          username: rocketchat_user
          password: rocketchat_password

      # We auth against rocketchat to obtain the auth token
      request.post authData, (err, httpResponse, rocketchatResBody) ->
          if err
            robot.logger.error err
            msg.send "#{title} - [Rocketchat auth Error - invalid url, user or password/can't access rocketchat api] - #{link}"
          else
            status = JSON.parse(rocketchatResBody)["status"]
            if status != "success"
              errMsg = JSON.parse(rocketchatResBody)["message"]
              robot.logger.error errMsg
              msg.send "#{title} - [Rocketchat auth Error - #{errMsg}] - #{link}"

            auth = JSON.parse(rocketchatResBody)["data"]

            # fill in the POST request. This must be www-form/multipart
            uploadData =
              url: rocketchat_url + '/api/v1/rooms.upload/' + msg.envelope.user.roomID
              headers:
                'X-Auth-Token': auth.authToken
                'X-User-Id': auth.userId
              formData:
                msg: "#{title}: #{link}"
                # grafanaDashboardRequest() is the method that downloads the .png
                file:
                  value: grafanaDashboardRequest()
                  options:
                    filename: "#{title} #{Date()}.png",
                    contentType: 'image/png'

            # Try to upload the image to rocketchat else pass the link over
            request.post uploadData, (err, httpResponse, body) ->
              res = JSON.parse(body)

              # Error logging, we must also check the body response.
              # It will be something like: { "success": <boolean>, "error": <error message> }
              if err
                robot.logger.error err
                msg.send "#{title} - [Upload Error] - #{link}"
              else if !res["success"]
                errMsg = res["error"]
                robot.logger.error "rocketchat service error while posting data:" +errMsg
                msg.send "#{title} - [Form Error: can't upload file : #{errMsg}] - #{link}"

  # Fetch an image from provided URL, upload it to S3, returning the resulting URL
  uploadChart = (msg, title, url, link, site) ->
    if grafana_api_key
      requestHeaders =
        encoding: null,
        auth:
          bearer: grafana_api_key
    else
      requestHeaders =
        encoding: null

    # Default title if none provided
    if !title
      title = 'Image'

    # Pass this function along to the "registered" services that uploads the image.
    # The function will donwload the .png image(s) dashboard. You must pass this
    # function and use it inside your service upload implementation.
    grafanaDashboardRequest = (callback) ->
      request url, requestHeaders, (err, res, body) ->
        robot.logger.debug "Uploading file: #{body.length} bytes, content-type[#{res.headers['content-type']}]"
        if callback
          callback(err, res, body)

    uploadTo[site()](msg, title, grafanaDashboardRequest, link)
