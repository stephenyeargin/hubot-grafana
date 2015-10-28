# Grafana for Hubot

[![npm version](https://badge.fury.io/js/hubot-grafana.svg)](http://badge.fury.io/js/hubot-grafana) [![Build Status](https://travis-ci.org/stephenyeargin/hubot-grafana.png)](https://travis-ci.org/stephenyeargin/hubot-grafana)

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
- `HUBOT_GRAFANA_S3_BUCKET` - Optional; Name of the S3 bucket to copy the graph into
- `HUBOT_GRAFANA_S3_ACCESS_KEY_ID` - Optional; Access key ID for S3
- `HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY` - Optional; Secret access key for S3
- `HUBOT_GRAFANA_S3_PREFIX` - Optional; Bucket prefix (useful for shared buckets)
- `HUBOT_GRAFANA_S3_REGION` - Optional; Bucket region (defaults to us-standard)

Example:

```
export HUBOT_GRAFANA_HOST=http://play.grafana.org
export HUBOT_GRAFANA_API_KEY=abcd01234deadbeef01234
export HUBOT_GRAFANA_S3_BUCKET=mybucket
export HUBOT_GRAFANA_S3_ACCESS_KEY_ID=ABCDEF123456XYZ
export HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY=aBcD01234dEaDbEef01234
export HUBOT_GRAFANA_S3_PREFIX=graphs
export HUBOT_GRAFANA_S3_REGION=us-standard
```

## Sample Interaction

```
user1>> hubot graf db graphite-carbon-metrics
hubot>> Graphite Carbon Metrics: http://play.grafana.org/render/dashboard/solo/graphite-carbon-metrics/?panelId=1&width=1000&height=500&from=now-6h - http://play.grafana.org/dashboard/db/graphite-carbon-metrics/?panelId=1&fullscreen&from=now-6h
```

## All Commands

- `hubot graf db graphite-carbon-metrics` - Get all panels in the dashboard
- `hubot graf db graphite-carbon-metrics:3` - Get only the third panel of a particular dashboard
- `hubot graf db graphite-carbon-metrics:cpu` - Get only the panels containing "cpu" (case insensitive) in the title
- `hubot graf db graphite-carbon-metrics now-12hr` - Get a dashboard with a window of 12 hours ago to now
- `hubot graf db graphite-carbon-metrics now-24hr now-12hr` - Get a dashboard with a window of 24 hours ago to 12 hours ago
- `hubot graf db graphite-carbon-metrics:3 now-8d now-1d` - Get only the third panel of a particular dashboard with a window of 8 days ago to yesterday
- `hubot graf db graphite-carbon-metrics host=carbon-a` - Get a templated dashboard with the `$host` parameter set to `carbon-a`
- `hubot graf list` - Lists the available dashboards
- `hubot graf list production` - Lists all dashboards tagged `production`
- `hubot graf search elb` - Search for dashboards that match `elb`
