import { map } from 'lodash';
import React, { PureComponent } from 'react';

// Types
import { InlineFormLabel, LegacyForms, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { PrometheusDatasource } from '../datasource';
import { PromOptions, PromQuery } from '../types';

import PromQueryField from './PromQueryField';
import PromLink from './PromLink';
import { PromExemplarField } from './PromExemplarField';

const { Switch } = LegacyForms;

export type Props = QueryEditorProps<PrometheusDatasource, PromQuery, PromOptions>;

const FORMAT_OPTIONS: Array<SelectableValue<string>> = [
  { label: 'Time series', value: 'time_series' },
  { label: 'Table', value: 'table' },
  { label: 'Heatmap', value: 'heatmap' },
];

const INTERVAL_FACTOR_OPTIONS: Array<SelectableValue<number>> = map([1, 2, 3, 4, 5, 10], (value: number) => ({
  value,
  label: '1/' + value,
}));

interface State {
  legendFormat?: string;
  formatOption: SelectableValue<string>;
  interval?: string;
  intervalFactorOption: SelectableValue<number>;
  instant: boolean;
  exemplar: boolean;
}

export class PromQueryEditor extends PureComponent<Props, State> {
  // Query target to be modified and used for queries
  query: PromQuery;

  constructor(props: Props) {
    super(props);
    // Use default query to prevent undefined input values
    const defaultQuery: Partial<PromQuery> = { expr: '', legendFormat: '', interval: '', exemplar: true };
    const query = Object.assign({}, defaultQuery, props.query);
    this.query = query;
    // Query target properties that are fully controlled inputs
    this.state = {
      // Fully controlled text inputs
      interval: query.interval,
      legendFormat: query.legendFormat,
      // Select options
      formatOption: FORMAT_OPTIONS.find((option) => option.value === query.format) || FORMAT_OPTIONS[0],
      intervalFactorOption:
        INTERVAL_FACTOR_OPTIONS.find((option) => option.value === query.intervalFactor) || INTERVAL_FACTOR_OPTIONS[0],
      // Switch options
      instant: Boolean(query.instant),
      exemplar: Boolean(query.exemplar),
    };
  }

  onFieldChange = (query: PromQuery, override?: any) => {
    this.query.expr = query.expr;
  };

  onFormatChange = (option: SelectableValue<string>) => {
    this.query.format = option.value;
    this.setState({ formatOption: option }, this.onRunQuery);
  };

  onInstantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const instant = e.target.checked;
    this.query.instant = instant;
    this.setState({ instant }, this.onRunQuery);
  };

  onIntervalChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const interval = e.currentTarget.value;
    this.query.interval = interval;
    this.setState({ interval });
  };

  onIntervalFactorChange = (option: SelectableValue<number>) => {
    this.query.intervalFactor = option.value;
    this.setState({ intervalFactorOption: option }, this.onRunQuery);
  };

  onLegendChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const legendFormat = e.currentTarget.value;
    this.query.legendFormat = legendFormat;
    this.setState({ legendFormat });
  };

  onExemplarChange = (isEnabled: boolean) => {
    this.query.exemplar = isEnabled;
    this.setState({ exemplar: isEnabled }, this.onRunQuery);
  };

  onRunQuery = () => {
    const { query } = this;
    // Change of query.hide happens outside of this component and is just passed as prop. We have to update it when running queries.
    const { hide } = this.props.query;
    this.props.onChange({ ...query, hide });
    this.props.onRunQuery();
  };

  render() {
    const { datasource, query, range, data } = this.props;
    const { formatOption, instant, interval, intervalFactorOption, legendFormat, exemplar } = this.state;

    return (
      <PromQueryField
        datasource={datasource}
        query={query}
        range={range}
        onRunQuery={this.onRunQuery}
        onChange={this.onFieldChange}
        history={[]}
        data={data}
        ExtraFieldElement={
          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel
                width={7}
                tooltip="Controls the name of the time series, using name or pattern. For example
        {{hostname}} will be replaced with label value for the label hostname."
              >
                Legend
              </InlineFormLabel>
              <input
                type="text"
                className="gf-form-input"
                placeholder="legend format"
                value={legendFormat}
                onChange={this.onLegendChange}
                onBlur={this.onRunQuery}
              />
            </div>

            <div className="gf-form">
              <InlineFormLabel
                width={7}
                tooltip={
                  <>
                    An additional lower limit for the step parameter of the Prometheus query and for the{' '}
                    <code>$__interval</code> and <code>$__rate_interval</code> variables. The limit is absolute and not
                    modified by the &quot;Resolution&quot; setting.
                  </>
                }
              >
                Min step
              </InlineFormLabel>
              <input
                type="text"
                className="gf-form-input width-8"
                placeholder={interval}
                onChange={this.onIntervalChange}
                onBlur={this.onRunQuery}
                value={interval}
              />
            </div>

            <div className="gf-form">
              <div className="gf-form-label">Resolution</div>
              <Select
                isSearchable={false}
                options={INTERVAL_FACTOR_OPTIONS}
                onChange={this.onIntervalFactorChange}
                value={intervalFactorOption}
              />
            </div>

            <div className="gf-form">
              <div className="gf-form-label width-7">Format</div>
              <Select
                width={16}
                isSearchable={false}
                options={FORMAT_OPTIONS}
                onChange={this.onFormatChange}
                value={formatOption}
              />
              <Switch label="Instant" checked={instant} onChange={this.onInstantChange} />

              <InlineFormLabel width={10} tooltip="Link to Graph in Prometheus">
                <PromLink
                  datasource={datasource}
                  query={this.query} // Use modified query
                  panelData={data}
                />
              </InlineFormLabel>
            </div>

            <PromExemplarField isEnabled={exemplar} onChange={this.onExemplarChange} datasource={datasource} />
          </div>
        }
      />
    );
  }
}
