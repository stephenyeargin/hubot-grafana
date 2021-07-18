Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper('./../src/grafana.coffee')

expect = chai.expect

describe 'grafana v8', ->
  room = null

  beforeEach ->
    process.env.HUBOT_GRAFANA_HOST = 'https://play.grafana.org'
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
      nock('https://play.grafana.org')
        .get('/api/search?type=dash-db')
        .replyWithFile(200, __dirname + '/fixtures/v8/search.json')
      room.user.say 'alice', 'hubot graf list'
      setTimeout done, 100

    it 'hubot should respond with a list of dashboards', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf list' ]
        [ 'hubot', "Available dashboards:\n- 000000016: 1 -  Time series graphs\n- YI95GyqMz: 1 - New Features in v8.0\n- nP8rcffGk: 2 - New Features in v7.4\n- Zb3f4veGk: 2 - Stats\n- 0KapoFkMk: 3 - New Features in  v7.0\n- OhR1ID6Mk: 3 - Table\n- KIhkVD6Gk: 4 -  Gauges\n- Fbp5uPsZk: 4 - New Features in v6.6\n- ktMs4D6Mk: 5 - Bar charts and pie charts\n- ZvPm55mWk: 5 - New Features in v6.3\n- 2ZvPm55mWk: 6 - New Features in v6.2\n- qD-rVv6Mz: 6 - State timeline and Status history\n- fMyjY3R7z: Accessibility\n- 000000052: Advanced Layout\n- 4QfoqzGZk: Alert on multiple series\n- 000000074: Alerting\n- 000000019: Annotations\n- 000000010: Annotations\n- jA2cBIi7z: Annotations Copy\n- 1o-mceRnk: bar chart no room for value\n- vmie2cmWz: Bar Gauge\n- 000000045: Big Dashboard\n- 000000003: Big Dashboard Small\n- 000000079: Big Dashboard Theme\n (and 115 more)"]
      ]

  context 'ask hubot to list dashboards filterd by tag', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/search?type=dash-db&tag=demo')
        .replyWithFile(200, __dirname + '/fixtures/v8/search-tag.json')
      room.user.say 'alice', 'hubot graf list demo'
      setTimeout done, 100

    it 'hubot should respond with a list of dashboards with tag', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf list demo' ]
        [ 'hubot', "Dashboards tagged `demo`:\n- 000000016: 1 -  Time series graphs\n- Zb3f4veGk: 2 - Stats\n- OhR1ID6Mk: 3 - Table\n- KIhkVD6Gk: 4 -  Gauges\n- ktMs4D6Mk: 5 - Bar charts and pie charts\n- qD-rVv6Mz: 6 - State timeline and Status history\n- 000000074: Alerting\n- 000000010: Annotations\n- vmie2cmWz: Bar Gauge\n- 3SWXxreWk: Grafana Dashboard\n- 37Dq903mk: Graph Gradient Area Fills\n- iRY1K9VZk: Lazy Loading\n- 6NmftOxZz: Logs Panel\n- 000000100: Mixed Datasources\n- U_bZIMRMk: Table Panel Showcase\n- 000000056: Templated dynamic dashboard\n- 000000109: The Four Golden Signals\n- 000000167: Threshold example\n- 000000041: Time range override"]
      ]

  context 'ask hubot to search dashboards', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/search?type=dash-db&query=elasticsearch')
        .replyWithFile(200, __dirname + '/fixtures/v8/search-query.json')
      room.user.say 'alice', 'hubot graf search elasticsearch'
      setTimeout done, 100

    it 'hubot should respond with a matching dashboard', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf search elasticsearch' ]
        [ 'hubot', "Dashboards matching `elasticsearch`:\n- 000000030: ElasticSearch - Custom Templated query\n- VzxU55SWk: Elasticsearch Bar Gauge\n- 000000069: Elasticsearch Derivative\n- 000000014: Elasticsearch Metrics\n- 000000107: Elasticsearch Metrics Filter\n- 000000149: Elasticsearch query filter\n- CknOEXDMk: Elasticsearch Templated\n- uQRtuCoGz: Prometheus, InfluxDB, Elasticsearch DS Trends"]
      ]

  context 'ask hubot to return the first matched panel by UID', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/97PlYC7Mk')
        .replyWithFile(200, __dirname + '/fixtures/v8/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db 97PlYC7Mk'
      setTimeout done, 100

    it 'hubot should respond with a matching dashboard', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db 97PlYC7Mk' ]
        [ 'hubot', "Grafana diagram architecture: https://play.grafana.org/render/d-solo/97PlYC7Mk/?panelId=13&width=1000&height=500&from=now-6h&to=now - https://play.grafana.org/d/97PlYC7Mk/?panelId=13&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot to return a panel by slug', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/flowcharting-grafana-play-home')
        .reply(404, {message: 'Dashboard not found'})
      nock('https://play.grafana.org')
        .get('/api/search')
        .query(type: 'dash-db')
        .replyWithFile(200, __dirname + '/fixtures/v8/search.json')
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/97PlYC7Mk')
        .replyWithFile(200, __dirname + '/fixtures/v8/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db flowcharting-grafana-play-home'
      setTimeout done, 100

    it 'hubot should respond with a matching dashboard', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db flowcharting-grafana-play-home' ]
        [ 'hubot', "Try your query again with `97PlYC7Mk` instead of `flowcharting-grafana-play-home`"]
      ]

  context 'ask hubot to return a specific panel by API ID', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/97PlYC7Mk')
        .replyWithFile(200, __dirname + '/fixtures/v8/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db 97PlYC7Mk:panel-3'
      setTimeout done, 100

    it 'hubot should respond with a matching dashboard', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db 97PlYC7Mk:panel-3' ]
        [ 'hubot', "logins: https://play.grafana.org/render/d-solo/97PlYC7Mk/?panelId=3&width=1000&height=500&from=now-6h&to=now - https://play.grafana.org/d/97PlYC7Mk/?panelId=3&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot to return a specific panel by visual ID', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/97PlYC7Mk')
        .replyWithFile(200, __dirname + '/fixtures/v8/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db 97PlYC7Mk:3'
      setTimeout done, 100

    it 'hubot should respond with a matching dashboard', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db 97PlYC7Mk:3' ]
        [ 'hubot', "client side full page load: https://play.grafana.org/render/d-solo/97PlYC7Mk/?panelId=5&width=1000&height=500&from=now-6h&to=now - https://play.grafana.org/d/97PlYC7Mk/?panelId=5&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot to return a specific panel that does not exist', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/97PlYC7Mk')
        .replyWithFile(200, __dirname + '/fixtures/v8/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db 97PlYC7Mk:100'
      setTimeout done, 100

    it 'hubot should respond with an error message', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db 97PlYC7Mk:100' ]
        [ 'hubot', "Could not locate desired panel."]
      ]

  context 'ask hubot to return different default image sizes', ->
    beforeEach (done) ->
      process.env.HUBOT_GRAFANA_DEFAULT_WIDTH = 1024
      process.env.HUBOT_GRAFANA_DEFAULT_HEIGHT = 768
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/97PlYC7Mk')
        .replyWithFile(200, __dirname + '/fixtures/v8/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db 97PlYC7Mk:3'
      setTimeout done, 100
    afterEach ->
      delete process.env.HUBOT_GRAFANA_DEFAULT_WIDTH
      delete process.env.HUBOT_GRAFANA_DEFAULT_HEIGHT

    it 'hubot should respond with the custom image size set in environment', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db 97PlYC7Mk:3' ]
        [ 'hubot', "client side full page load: https://play.grafana.org/render/d-solo/97PlYC7Mk/?panelId=5&width=1024&height=768&from=now-6h&to=now - https://play.grafana.org/d/97PlYC7Mk/?panelId=5&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot to return a specific panel with a custom size', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/97PlYC7Mk')
        .replyWithFile(200, __dirname + '/fixtures/v8/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db 97PlYC7Mk:3 width=2500 height=700'
      setTimeout done, 100

    it 'hubot should respond with a resized image specified in request', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db 97PlYC7Mk:3 width=2500 height=700' ]
        [ 'hubot', "client side full page load: https://play.grafana.org/render/d-solo/97PlYC7Mk/?panelId=5&width=2500&height=700&from=now-6h&to=now - https://play.grafana.org/d/97PlYC7Mk/?panelId=5&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot to return a specific panel with a custom size in any order', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/97PlYC7Mk')
        .replyWithFile(200, __dirname + '/fixtures/v8/dashboard-grafana-play.json')
      room.user.say 'alice', 'hubot graf db 97PlYC7Mk:3 height=700 width=2500'
      setTimeout done, 100

    it 'hubot should respond with a resized image specified in request', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db 97PlYC7Mk:3 height=700 width=2500' ]
        [ 'hubot', "client side full page load: https://play.grafana.org/render/d-solo/97PlYC7Mk/?panelId=5&width=2500&height=700&from=now-6h&to=now - https://play.grafana.org/d/97PlYC7Mk/?panelId=5&fullscreen&from=now-6h&to=now"]
      ]

  context 'ask hubot for templated dashboard', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/dashboards/uid/000000091')
        .replyWithFile(200, __dirname + '/fixtures/v8/dashboard-templating.json')
      room.user.say 'alice', 'hubot graf db 000000091:graph server=backend_01 now-6h'
      setTimeout done, 100

    it 'hubot should respond with a templated graph', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db 000000091:graph server=backend_01 now-6h' ]
        [ 'hubot', 'Graph: https://play.grafana.org/render/d-solo/000000091/?panelId=1&width=1000&height=500&from=now-6h&to=now&var-server=backend_01 - https://play.grafana.org/d/000000091/?panelId=1&fullscreen&from=now-6h&to=now&var-server=backend_01']
      ]

  context 'ask hubot for list of alerts', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/alerts')
        .replyWithFile(200, __dirname + '/fixtures/v8/alerts.json')
      room.user.say 'alice', 'hubot graf alerts'
      setTimeout done, 100

    it 'hubot should respond with a list of alerts', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf alerts' ]
        [ 'hubot', 'All alerts:\n- *API Error  / 1min alert* (2): `no_data`\n  last state change: 2021-06-05T13:18:08Z\n- *Customer Reviews alert* (11): `ok`\n  last state change: 2021-06-09T14:49:08Z\n- *Dashboard Loads Peaking* (4): `alerting`\n  last state change: 2021-06-09T14:36:04Z\n- *Metric Requests Peaking* (1): `alerting`\n  last state change: 2021-06-09T14:04:01Z\n- *Multi series alerting* (29): `alerting`\n  last state change: 2021-06-09T09:51:52Z\n- *Payments Completed/s alert* (10): `ok`\n  last state change: 2021-06-06T03:57:16Z\n- *Payments Completed/s alert* (12): `ok`\n  last state change: 2021-06-09T10:56:30Z\n- *Request Time Average < 190ms alert* (3): `ok`\n  last state change: 2021-06-09T09:41:06Z\n- *Selected Servers alert* (7): `alerting`\n  last state change: 2020-10-31T13:30:08Z\n- *Selected Servers alert* (8): `alerting`\n  last state change: 2020-11-11T13:30:20Z\n- *Wind Farm - Total power is low* (30): `ok`\n  last state change: 2021-03-17T17:57:52Z']
      ]

  context 'ask hubot to pause an alert', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .post('/api/alerts/1/pause', {'paused': true})
        .reply(200, {alertId: 1, message: 'alert paused'})
      room.user.say 'alice', 'hubot graf pause alert 1'
      setTimeout done, 100

    it 'hubot should respond with a successful paused response', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf pause alert 1' ]
        [ 'hubot', 'alert paused']
      ]

  context 'ask hubot to un-pause an alert', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .post('/api/alerts/1/pause', {'paused': false})
        .reply(200, {alertId: 1, message: 'alert un-paused'})
      room.user.say 'alice', 'hubot graf unpause alert 1'
      setTimeout done, 100

    it 'hubot should respond with a successful un-paused response', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf unpause alert 1' ]
        [ 'hubot', 'alert un-paused']
      ]
