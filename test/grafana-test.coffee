chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'

expect = chai.expect

describe 'grafana', ->
  beforeEach ->
    @robot =
      respond: sinon.spy()
      hear: sinon.spy()

    require('../src/grafana')(@robot)

  it 'registers a dashboard listener', ->
    expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) (?:dash|dashboard|db) ([A-Za-z0-9\-\:_]+)(.*)?/i)

  it 'registers a list listener', ->
    expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) list\s?(.+)?/i)

  it 'registers a search listener', ->
    expect(@robot.respond).to.have.been.calledWith(/(?:grafana|graph|graf) search (.+)/i)
