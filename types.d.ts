type DashboardChart = {
  imageUrl: string;
  grafanaChartLink: string;
  title: string;
};

declare namespace GrafanaDashboardResponse {
  type Response = {
    meta: Meta;
    dashboard: Dashboard;
    message?: string;
  };

  type Dashboard = {
    annotations: Annotations;
    editable: boolean;
    gnetId: null;
    graphTooltip: number;
    id: number;
    links: any[];
    panels: Panel[];
    refresh: boolean;
    schemaVersion: number;
    style: string;
    tags: string[];
    templating: Templating;
    time: Time;
    timepicker: Timepicker;
    timezone: string;
    title: string;
    uid: string;
    version: number;
    rows: Array<Dashboard>;
  };

  type Annotations = {
    enable: boolean;
    list: AnnotationsList[];
  };

  type AnnotationsList = {
    builtIn: number;
    datasource: string;
    enable: boolean;
    hide: boolean;
    iconColor: string;
    name: string;
    type: string;
  };

  type Panel = {
    cacheTimeout?: null;
    colorBackground?: boolean;
    colorValue?: boolean;
    colors?: string[];
    datasource: string;
    format?: string;
    gauge?: Gauge;
    gridPos: GridPos;
    id: number;
    interval?: null | string;
    links: any[];
    mappingType?: number;
    mappingTypes?: MappingType[];
    maxDataPoints?: number;
    nullPointMode: string;
    nullText?: null;
    postfix?: string;
    postfixFontSize?: string;
    prefix?: string;
    prefixFontSize?: string;
    rangeMaps?: RangeMap[];
    repeat?: null | string;
    repeatDirection?: string;
    scopedVars?: ScopedVars;
    sparkline?: Sparkline;
    tableColumn?: string;
    targets: Target[];
    thresholds: any[] | string;
    title: string;
    type: string;
    valueFontSize?: string;
    valueMaps?: ValueMap[];
    valueName?: string;
    repeatIteration?: number;
    repeatPanelId?: number;
    aliasColors?: AliasColors;
    annotate?: Annotate;
    bars?: boolean;
    dashLength?: number;
    dashes?: boolean;
    editable?: boolean;
    error?: boolean;
    fill?: number;
    grid?: AliasColors;
    legend?: { [key: string]: boolean };
    lines?: boolean;
    linewidth?: number;
    percentage?: boolean;
    pointradius?: number;
    points?: boolean;
    renderer?: string;
    resolution?: number;
    scale?: number;
    seriesOverrides?: any[];
    spaceLength?: number;
    stack?: boolean;
    steppedLine?: boolean;
    timeFrom?: null;
    timeShift?: null;
    tooltip?: Tooltip;
    xaxis?: Xaxis;
    yaxes?: Yax[];
    yaxis?: Yaxis;
    zerofill?: boolean;
  };

  type AliasColors = {};

  type Annotate = {
    enable: boolean;
  };

  type Gauge = {
    maxValue: number;
    minValue: number;
    show: boolean;
    thresholdLabels: boolean;
    thresholdMarkers: boolean;
  };

  type GridPos = {
    h: number;
    w: number;
    x: number;
    y: number;
  };

  type MappingType = {
    name: string;
    value: number;
  };

  type RangeMap = {
    from: string;
    text: string;
    to: string;
  };

  type ScopedVars = {
    host: Host;
  };

  type Host = {
    selected: boolean;
    text: string;
    value: string;
  };

  type Sparkline = {
    fillColor: string;
    full: boolean;
    lineColor: string;
    show: boolean;
  };

  type Target = {
    groupBy: GroupBy[];
    measurement: string;
    orderByTime: string;
    policy: string;
    refId: string;
    resultFormat: string;
    select: Array<GroupBy[]>;
    tags: Tag[];
    target: string;
    alias?: string;
    dsType?: string;
    query?: string;
  };

  type GroupBy = {
    params: string[];
    type: string;
  };

  type Tag = {
    key: string;
    operator: string;
    value: string;
    condition?: string;
  };

  type Tooltip = {
    msResolution?: boolean;
    query_as_alias?: boolean;
    shared: boolean;
    sort: number;
    value_type: string;
  };

  type ValueMap = {
    op: string;
    text: string;
    value: string;
  };

  type Xaxis = {
    buckets: null;
    mode: string;
    name: null;
    show: boolean;
    values: any[];
  };

  type Yax = {
    format: string;
    logBase: number;
    max: null;
    min: null;
    show: boolean;
    label?: null;
  };

  type Yaxis = {
    align: boolean;
    alignLevel: null;
  };

  type Templating = {
    list: TemplatingList[];
  };

  type TemplatingList = {
    allValue?: null;
    current?: Current;
    datasource: null | string;
    hide: number;
    includeAll?: boolean;
    label: null | string;
    multi?: boolean;
    name: string;
    options?: Host[];
    query?: string;
    refresh?: number;
    regex?: string;
    skipUrlSync: boolean;
    sort?: number;
    tagValuesQuery?: null;
    tags?: any[];
    tagsQuery?: null;
    type: string;
    useTags?: boolean;
    allFormat?: string;
    multiFormat?: string;
    refresh_on_load?: boolean;
    auto?: boolean;
    auto_count?: number;
    auto_min?: string;
    filters?: any[];
  };

  type Current = {
    tags: any[];
    text: string;
    value: string[] | string;
    selected?: boolean;
  };

  type Time = {
    from: string;
    to: string;
  };

  type Timepicker = {
    collapse: boolean;
    enable: boolean;
    notice: boolean;
    now: boolean;
    refresh_intervals: string[];
    status: string;
    time_options: string[];
    type: string;
  };

  type Meta = {
    type: string;
    canSave: boolean;
    canEdit: boolean;
    canAdmin: boolean;
    canStar: boolean;
    slug: string;
    url: string;
    expires: Date;
    created: Date;
    updated: Date;
    updatedBy: string;
    createdBy: string;
    version: number;
    hasAcl: boolean;
    isFolder: boolean;
    folderId: number;
    folderUid: string;
    folderTitle: string;
    folderUrl: string;
    provisioned: boolean;
    provisionedExternalId: string;
  };
}

type GrafanaSearchResponse = {
  id: number;
  uid: string;
  title: string;
  uri: string;
  url: string;
  slug: string;
  type: string;
  tags: string[];
  isStarred: boolean;
  folderId: number;
  folderUid: string;
  folderTitle: string;
  folderUrl: string;
  sortMeta: number;
};

type DownloadedFile = { body: Buffer; contentType: string };
