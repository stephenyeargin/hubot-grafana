Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper('./../src/grafana.coffee')

expect = chai.expect

describe 'retrieve graphs by timezone', ->
  room = null

  beforeEach ->
    process.env.HUBOT_GRAFANA_HOST = 'http://play.grafana.org'
    process.env.HUBOT_GRAFANA_DEFAULT_TIME_ZONE = 'America/Chicago'
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
    delete process.env.HUBOT_GRAFANA_DEFAULT_TIME_ZONE

  context 'get a dashboard with the default timezone set', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/dashboards/db/templating')
        .replyWithFile(200, __dirname + '/fixtures/v5/dashboard-templating.json')
      room.user.say 'alice', 'hubot graf db templating:requests server=backend_01 now-6h'
      setTimeout done, 100

    it 'hubot should respond with default timezone set', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db templating:requests server=backend_01 now-6h' ]
        [ 'hubot', 'Requests / s: http://play.grafana.org/render/dashboard-solo/db/templating/?panelId=1&width=1000&height=500&from=now-6h&to=now&var-server=backend_01&tz=America%2FChicago - http://play.grafana.org/dashboard/db/templating/?panelId=1&fullscreen&from=now-6h&to=now&var-server=backend_01']
      ]

  context 'get a dashboard with the requested timezone set', ->
    beforeEach (done) ->
      nock('http://play.grafana.org')
        .get('/api/dashboards/db/templating')
        .replyWithFile(200, __dirname + '/fixtures/v5/dashboard-templating.json')
      room.user.say 'alice', 'hubot graf db templating:requests server=backend_01 now-6h tz=Europe/Amsterdam'
      setTimeout done, 100

    it 'hubot should respond with requested timezone set', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db templating:requests server=backend_01 now-6h tz=Europe/Amsterdam' ]
        [ 'hubot', 'Requests / s: http://play.grafana.org/render/dashboard-solo/db/templating/?panelId=1&width=1000&height=500&from=now-6h&to=now&var-server=backend_01&tz=Europe%2FAmsterdam - http://play.grafana.org/dashboard/db/templating/?panelId=1&fullscreen&from=now-6h&to=now&var-server=backend_01']
      ]
