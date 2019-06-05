Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper('./../src/grafana.coffee')

expect = chai.expect

describe 'static configuration', ->
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

  context 'ensure configuration listener is registered', ->
    it 'register configuration listener', ->
      expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) set (host|api_key) (.+)/i)

  context 'ask hubot to configure grafana host', ->
    beforeEach (done) ->
      room.user.say 'alice', 'hubot graf set host http://play.grafana.org'
      setTimeout done, 100

    it 'hubot should respond it cannot configure the host', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf set host http://play.grafana.org' ]
        [ 'hubot', "Set HUBOT_GRAFANA_PER_ROOM=1 to use multiple configurations."]
      ]

  context 'ask hubot to configure grafana api_key', ->
    beforeEach (done) ->
      room.user.say 'alice', 'hubot graf set api_key AABBCC'
      setTimeout done, 100

    it 'hubot should respond it cannot configure the api_key', ->
      expect(room.messages).to.eql [
        [ 'alice', 'hubot graf set api_key AABBCC' ]
        [ 'hubot', "Set HUBOT_GRAFANA_PER_ROOM=1 to use multiple configurations."]
      ]
