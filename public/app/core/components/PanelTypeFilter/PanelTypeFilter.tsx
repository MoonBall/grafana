import React, { useCallback, useMemo, useState } from 'react';
import { GrafanaThemeV2, PanelPluginMeta, SelectableValue } from '@grafana/data';
import { getAllPanelPluginMeta } from '../../../features/dashboard/components/VizTypePicker/VizTypePicker';
import { Icon, resetSelectStyles, Select, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

export interface Props {
  onChange: (plugins: PanelPluginMeta[]) => void;
}

export const PanelTypeFilter = ({ onChange: propsOnChange }: Props): JSX.Element => {
  const plugins = useMemo<PanelPluginMeta[]>(() => {
    return getAllPanelPluginMeta();
  }, []);
  const options = useMemo(
    () =>
      plugins
        .map((p) => ({ label: p.name, imgUrl: p.info.logos.small, value: p }))
        .sort((a, b) => a.label?.localeCompare(b.label)),
    [plugins]
  );
  const [value, setValue] = useState<Array<SelectableValue<PanelPluginMeta>>>([]);
  const onChange = useCallback(
    (plugins: Array<SelectableValue<PanelPluginMeta>>) => {
      const changedPlugins = [];
      for (const plugin of plugins) {
        if (plugin.value) {
          changedPlugins.push(plugin.value);
        }
      }
      propsOnChange(changedPlugins);
      setValue(plugins);
    },
    [propsOnChange]
  );
  const styles = useStyles2(getStyles);

  const selectOptions = {
    defaultOptions: true,
    getOptionLabel: (i: any) => i.label,
    getOptionValue: (i: any) => i.value,
    isMulti: true,
    noOptionsMessage: 'No Panel types found',
    placeholder: 'Filter by Panel type',
    styles: resetSelectStyles(),
    maxMenuHeight: 150,
    options,
    value,
    onChange,
  };

  return (
    <div className={styles.container}>
      {value.length > 0 && (
        <span className={styles.clear} onClick={() => onChange([])}>
          Clear types
        </span>
      )}
      <Select {...selectOptions} prefix={<Icon name="table" />} aria-label="Panel Type filter" />
    </div>
  );
};

function getStyles(theme: GrafanaThemeV2) {
  return {
    container: css`
      label: container;
      position: relative;
      min-width: 180px;
      flex-grow: 1;
    `,
    clear: css`
      label: clear;
      text-decoration: underline;
      font-size: ${theme.spacing(1.5)};
      position: absolute;
      top: -${theme.spacing(2.75)};
      right: 0;
      cursor: pointer;
      color: ${theme.colors.text.link};

      &:hover {
        color: ${theme.colors.text.maxContrast};
      }
    `,
  };
}
