Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper('./../src/grafana.coffee')

expect = chai.expect

describe 'grafana v4 and below', ->
  room = null

  beforeEach ->
    process.env.HUBOT_GRAFANA_HOST = 'http://play.grafana.org'
    room = helper.createRoom()
    nock.disableNetConnect()

    @robot =
      respond: sinon.spy()
      hear: sinon.spy()

    require('../src/grafana')(@robot)

  afterEach ->
    room.destroy()
    nock.cleanAll()
    delete process.env.HUBOT_GRAFANA_HOST

  context 'ensure all listeners are registered', ->
    it 'registers a dashboard listener', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) (?:dash|dashboard|db) ([A-Za-z0-9\-\:_]+)(.*)?/i)

    it 'registers a list listener', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) list\s?(.+)?/i)

    it 'registers a search listener', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) search (.+)/i)

  context 'ask hubot to list dashboards', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/search?type=dash-db')
        .replyWithFile(200, __dirname + '/fixtures/v4/search.json')
      room.user.say 'alice', 'hubot graf list'
      setTimeout done, 100

    it 'hubot should respond with a list of dashboards', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf list' ]
        [ 'hubot', "Available dashboards:\n- annotations: Annotations\n- big-dashboard: Big Dashboard\n- big-dashboard2: Big Dashboard2\n- elasticsearch-metrics: Elasticsearch Metrics\n- grafana-play-home: Grafana Play Home\n- graph-styles: Graph styles\n- graphite-carbon-metrics: Graphite Carbon Metrics\n- graphite-template-screencast: Graphite Template Screencast\n- influxdb: InfluxDB\n- influxdb-templated-queries: InfluxDB Templated Queries\n- issue-3275: Issue 3275\n- light-theme: Light theme\n- litmus-endpoint-web: Litmus Endpoint: |--- Web\n- matt_test_instance: Matt_Test_Instance\n- my-first-dashboard: My First Dashboard\n- new-dashboard: New dashboard\n- new-features-in-v1-8: New features in v1.8\n- new-features-in-v19: New features in v1.9\n- new-features-in-v20: New features in v2.0\n- new-features-in-v2-1: New features in v2.1\n- perftest: PerfTest\n- rogue: Rogue\n- stats: Stats\n- stats-ds: Stats DS\n- stats-trends: Stats trends\n- temp-dashboard-graphite-threshold-func: Temp dashboard graphite threshold func\n- templated-graphs: Templated Graphs\n- templated-graphs-nested: Templated Graphs Nested\n- test: Test\n- test-slides: Test Slides\n- ultimate-graphite-query-guide: Ultimate Graphite Query Guide\n- loadbalancers: loadbalancers\n- singlestat-rounding-threshold: singlestat rounding threshold\n"]
      ]

  context 'ask hubot to list dashboards filterd by tag', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/search?type=dash-db&tag=demo')
        .replyWithFile(200, __dirname + '/fixtures/v4/search-tag.json')
      room.user.say 'alice', 'hubot graf list demo'
      setTimeout done, 100

    it 'hubot should respond with a list of dashboards with tag', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf list demo' ]
        [ 'hubot', "Dashboards tagged `demo`:\n- annotations: Annotations\n- graph-styles: Graph styles\n- new-features-in-v19: New features in v1.9\n- new-features-in-v20: New features in v2.0\n- new-features-in-v2-1: New features in v2.1\n"]
      ]

  context 'ask hubot to search dashboards', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/search?type=dash-db&query=elasticsearch')
        .replyWithFile(200, __dirname + '/fixtures/v4/search-query.json')
      room.user.say 'alice', 'hubot graf search elasticsearch'
      setTimeout done, 100

    it 'hubot should respond with a matching dashboard', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf search elasticsearch' ]
        [ 'hubot', "Dashboards matching `elasticsearch`:\n- elasticsearch-metrics: Elasticsearch Metrics\n"]
      ]

  context 'ask hubot to return a specific panel by API ID', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/dashboards/db/grafana-play-home')
        .replyWithFile(200, __dirname + '/fixtures/v4/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db grafana-play-home:panel-8'
      setTimeout done, 100

    it 'hubot should respond with a matching dashboard', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db grafana-play-home:panel-8' ]
        [ 'hubot', "Graphite examples: http://play.grafana.org/render/dashboard-solo/db/grafana-play-home/?panelId=8&width=1000&height=500&from=now-6h&to=now - http://play.grafana.org/dashboard/db/grafana-play-home/?panelId=8&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot to return a specific panel by visual ID', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/dashboards/db/grafana-play-home')
        .replyWithFile(200, __dirname + '/fixtures/v4/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db grafana-play-home:3'
      setTimeout done, 100

    it 'hubot should respond with a matching dashboard', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db grafana-play-home:3' ]
        [ 'hubot', "Graphite examples: http://play.grafana.org/render/dashboard-solo/db/grafana-play-home/?panelId=8&width=1000&height=500&from=now-6h&to=now - http://play.grafana.org/dashboard/db/grafana-play-home/?panelId=8&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot to return different default image sizes', ->
    beforeEach (done) ->
      process.env.HUBOT_GRAFANA_DEFAULT_WIDTH = 1024
      process.env.HUBOT_GRAFANA_DEFAULT_HEIGHT = 768
      nock('http://play.grafana.org')
        .get('/api/dashboards/db/grafana-play-home')
        .replyWithFile(200, __dirname + '/fixtures/v4/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db grafana-play-home:3'
      setTimeout done, 100
    afterEach ->
      delete process.env.HUBOT_GRAFANA_DEFAULT_WIDTH
      delete process.env.HUBOT_GRAFANA_DEFAULT_HEIGHT

    it 'hubot should respond with the custom image size set in environment', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db grafana-play-home:3' ]
        [ 'hubot', "Graphite examples: http://play.grafana.org/render/dashboard-solo/db/grafana-play-home/?panelId=8&width=1024&height=768&from=now-6h&to=now - http://play.grafana.org/dashboard/db/grafana-play-home/?panelId=8&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot to return a specific panel with a custom size', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/dashboards/db/grafana-play-home')
        .replyWithFile(200, __dirname + '/fixtures/v4/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db grafana-play-home:3 width=2500 height=700'
      setTimeout done, 100

    it 'hubot should respond with a resized image specified in request', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db grafana-play-home:3 width=2500 height=700' ]
        [ 'hubot', "Graphite examples: http://play.grafana.org/render/dashboard-solo/db/grafana-play-home/?panelId=8&width=2500&height=700&from=now-6h&to=now - http://play.grafana.org/dashboard/db/grafana-play-home/?panelId=8&fullscreen&from=now-6h&to=now"]
      ]
  context 'ask hubot to return a specific panel with a custom size in any order', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/dashboards/db/grafana-play-home')
        .replyWithFile(200, __dirname + '/fixtures/v4/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db grafana-play-home:3 height=700 width=2500'
      setTimeout done, 100

    it 'hubot should respond with a resized image specified in request', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db grafana-play-home:3 height=700 width=2500' ]
        [ 'hubot', "Graphite examples: http://play.grafana.org/render/dashboard-solo/db/grafana-play-home/?panelId=8&width=2500&height=700&from=now-6h&to=now - http://play.grafana.org/dashboard/db/grafana-play-home/?panelId=8&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot for templated dashboard', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/dashboards/db/monitoring-default')
        .replyWithFile(200, __dirname + '/fixtures/v4/dashboard-monitoring-default.json')
      room.user.say 'alice', 'hubot graf db monitoring-default:network server=ww3.example.com now-6h'
      setTimeout done, 100

    it 'hubot should respond with a templated graph', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db monitoring-default:network server=ww3.example.com now-6h' ]
        [ 'hubot', 'ww3.example.com network: http://play.grafana.org/render/dashboard-solo/db/monitoring-default/?panelId=7&width=1000&height=500&from=now-6h&to=now&var-server=ww3.example.com - http://play.grafana.org/dashboard/db/monitoring-default/?panelId=7&fullscreen&from=now-6h&to=now&var-server=ww3.example.com' ]
      ]
