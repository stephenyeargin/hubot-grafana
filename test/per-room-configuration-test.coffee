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
    process.env.HUBOT_GRAFANA_HOST = 'http://play.grafana.org'
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
      room_one.user.say 'alice', 'hubot graf set host http://play.grafana.org'
      setTimeout done, 100

    it 'hubot should respond it has configured the host', ->
      expect(room_one.messages).to.eql [
        [ 'alice', 'hubot graf set host http://play.grafana.org' ]
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
      nock('http://play.grafana.org')
        .get('/api/search?type=dash-db&tag=demo')
        .replyWithFile(200, __dirname + '/fixtures/v5/search-tag.json')
      room_one.user.say 'alice', 'hubot graf set host http://play.grafana.org'
      room_one.user.say 'alice', 'hubot graf list demo'
      setTimeout done, 1000

    it 'hubot should respond that grafana is configured and then with a list of dashboards with tag', ->
      expect(room_one.messages).to.eql [
        [ 'alice', 'hubot graf set host http://play.grafana.org' ]
        [ 'alice', 'hubot graf list demo' ]
        [ 'hubot', "Value set for host"]
        [ 'hubot', "Dashboards tagged `demo`:\n- alerting: Alerting\n- annotations: Annotations\n- big-dashboard: Big Dashboard\n- graph-styles: Graph styles\n- templating: Templating\n"]
      ]
