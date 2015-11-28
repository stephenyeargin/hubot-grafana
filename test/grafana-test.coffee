Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper('./../src/grafana.coffee')

expect = chai.expect

describe 'grafana', ->
  room = null

  beforeEach ->
    process.env.HUBOT_GRAFANA_HOST = 'http://play.grafana.org'
    room = helper.createRoom()
    do nock.disableNetConnect
    nock('http://play.grafana.org')
      .get('/api/dashboards/db/monitoring-default')
      .replyWithFile(200, __dirname + '/dashboard.json');

    @robot =
      respond: sinon.spy()
      hear: sinon.spy()

    require('../src/grafana')(@robot)

  afterEach ->
    room.destroy()
    nock.cleanAll()

  it 'registers a dashboard listener', ->
    expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) (?:dash|dashboard|db) ([A-Za-z0-9\-\:_]+)(.*)?/i)

  it 'registers a list listener', ->
    expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) list\s?(.+)?/i)

  it 'registers a search listener', ->
    expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) search (.+)/i)

  context 'ask hubot for templated dashboard', ->
    beforeEach (done) ->
      room.user.say 'alice', 'hubot graf db monitoring-default:network server=ww3.example.com now-6h'
      setTimeout done, 100

    it 'hubot should respond with a templated graph', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf db monitoring-default:network server=ww3.example.com now-6h' ]
        [ 'hubot', 'ww3.example.com network: http://play.grafana.org/render/dashboard-solo/db/monitoring-default/?panelId=7&width=1000&height=500&from=now-6h&to=now&var-server=ww3.example.com - http://play.grafana.org/dashboard/db/monitoring-default/?panelId=7&fullscreen&from=now-6h&to=now&var-server=ww3.example.com' ]
      ]
