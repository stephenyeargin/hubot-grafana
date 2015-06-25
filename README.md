# Grafana for Hubot

[![Build Status](https://travis-ci.org/stephenyeargin/hubot-grafana.png)](https://travis-ci.org/stephenyeargin/hubot-grafana)

Query Grafana dashboards.

**Note:** This package requires Grafana 2.x or higher.

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
user1>> hubot graf db graphite-carbon-metrics
hubot>> Graphite Carbon Metrics: http://play.grafana.org/render/dashboard/solo/graphite-carbon-metrics/?panelId=1&width=1000&height=500&from=now-6h - http://play.grafana.org/dashboard/db/graphite-carbon-metrics/?panelId=1&fullscreen&from=now-6h
```

## All Commands

- `hubot graf db graphite-carbon-metrics` - Get all panels in the dashboard
- `hubot graf db graphite-carbon-metrics:3` - Get only the third panel of a particular dashboard
- `hubot graf db graphite-carbon-metrics now-12hr` - Get a dashboard with a window of 12 hours ago to now
- `hubot graf db graphite-carbon-metrics now-24hr now-12hr` - Get a dashboard with a window of 24 hours ago to 12 hours ago
- `hubot graf db graphite-carbon-metrics:3 now-8d now-1d` - Get only the third panel of a particular dashboard with a window of 8 days ago to yesterday
- `hubot graf db graphite-carbon-metrics host=carbon-a` - Get a templated dashboard with the `$host` parameter set to `carbon-a`
- `hubot graf list` - Lists the available dashboards
