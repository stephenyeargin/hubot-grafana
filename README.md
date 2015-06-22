# Grafana for Hubot

Query Grafana dashboards.

## Installation

In hubot project repo, run:

`npm install hubot-grafana --save`

Then add **hubot-grafana** to your `external-scripts.json`:

```json
[
  "hubot-grafana"
]
```

## Configuration Variables

- `HUBOT_GRAFANA_HOST` - Host for your Grafana 2.0 install, e.g. 'http://play.grafana.org'
- `HUBOT_GRAFANA_API_KEY` - API key for a particular user

Example:

```
export HUBOT_GRAFANA_HOST=http://play.grafana.org
export HUBOT_GRAFANA_API_KEY=abcd01234deadbeef01234
```

## Sample Interaction

```
user1>> hubot grafana dashboard graphite-carbon-metrics
hubot>> Graphite Carbon Metrics: http://play.grafana.org/render/dashboard/solo/graphite-carbon-metrics/?panelId=1&width=1000&height=500&from=now-6h - http://play.grafana.org/dashboard/db/graphite-carbon-metrics/?panelId=1&fullscreen&from=now-6h
```
