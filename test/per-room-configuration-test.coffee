Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper('./../src/grafana.coffee')

expect = chai.expect

describe 'per room configuration', ->
  room_one = null

  beforeEach ->
    process.env.HUBOT_GRAFANA_HOST = 'https://play.grafana.org'
    process.env.HUBOT_GRAFANA_PER_ROOM = '1'
    room_one = helper.createRoom()
    nock.disableNetConnect()

    @robot =
      respond: sinon.spy()
      hear: sinon.spy()

    require('../src/grafana')(@robot)

  afterEach ->
    room_one.destroy()
    nock.cleanAll()
    delete process.env.HUBOT_GRAFANA_HOST
    delete process.env.HUBOT_GRAFANA_PER_ROOM

  context 'ensure configuration listener is registered', ->
    it 'register configuration listener', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) set (host|api_key) (.+)/i)

  context 'ask hubot to configure grafana host', ->
    beforeEach (done) ->
      room_one.user.say 'alice', 'hubot graf set host https://play.grafana.org'
      setTimeout done, 100

    it 'hubot should respond it has configured the host', ->
      expect(room_one.messages).to.eql [
        [ 'alice', 'hubot graf set host https://play.grafana.org' ]
        [ 'hubot', "Value set for host"]
      ]

  context 'ask hubot to configure grafana api_key', ->
    beforeEach (done) ->
      room_one.user.say 'alice', 'hubot graf set api_key AABBCC'
      setTimeout done, 100

    it 'hubot should respond it has configured the api_key', ->
      expect(room_one.messages).to.eql [
        [ 'alice', 'hubot graf set api_key AABBCC' ]
        [ 'hubot', "Value set for api_key"]
      ]

  context 'ask hubot to list dashboards filterd by tag', ->
    beforeEach (done) ->
      room_one.user.say 'alice', 'hubot graf list demo'
      setTimeout done, 100

    it 'hubot should respond that grafana endpoint is not configured', ->
      expect(room_one.messages).to.eql [
        [ 'alice', 'hubot graf list demo' ]
        [ 'hubot', "No Grafana endpoint configured."]
      ]

  context 'ask hubot to configure host and then list dashboards filterd by tag', ->
    beforeEach (done) ->
      nock('https://play.grafana.org')
        .get('/api/search?type=dash-db&tag=demo')
        .replyWithFile(200, __dirname + '/fixtures/v8/search-tag.json')
      room_one.user.say 'alice', 'hubot graf set host https://play.grafana.org'
      room_one.user.say 'alice', 'hubot graf list demo'
      setTimeout done, 1000

    it 'hubot should respond that grafana is configured and then with a list of dashboards with tag', ->
      expect(room_one.messages).to.eql [
        [ 'alice', 'hubot graf set host https://play.grafana.org' ]
        [ 'alice', 'hubot graf list demo' ]
        [ 'hubot', "Value set for host"]
        [ 'hubot', "Dashboards tagged `demo`:\n- 000000016: 1 -  Time series graphs\n- Zb3f4veGk: 2 - Stats\n- OhR1ID6Mk: 3 - Table\n- KIhkVD6Gk: 4 -  Gauges\n- ktMs4D6Mk: 5 - Bar charts and pie charts\n- qD-rVv6Mz: 6 - State timeline and Status history\n- 000000074: Alerting\n- 000000010: Annotations\n- vmie2cmWz: Bar Gauge\n- 3SWXxreWk: Grafana Dashboard\n- 37Dq903mk: Graph Gradient Area Fills\n- iRY1K9VZk: Lazy Loading\n- 6NmftOxZz: Logs Panel\n- 000000100: Mixed Datasources\n- U_bZIMRMk: Table Panel Showcase\n- 000000056: Templated dynamic dashboard\n- 000000109: The Four Golden Signals\n- 000000167: Threshold example\n- 000000041: Time range override"]
      ]
