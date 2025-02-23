import { VariableSuggestion, GrafanaThemeV2 } from '@grafana/data';
import { css, cx } from '@emotion/css';
import { groupBy, capitalize } from 'lodash';
import React, { useRef, useMemo } from 'react';
import useClickAway from 'react-use/lib/useClickAway';
import { List } from '../index';
import { useStyles2 } from '../../themes';

interface DataLinkSuggestionsProps {
  suggestions: VariableSuggestion[];
  activeIndex: number;
  onSuggestionSelect: (suggestion: VariableSuggestion) => void;
  onClose?: () => void;
}

const getStyles = (theme: GrafanaThemeV2) => {
  return {
    list: css`
      border-bottom: 1px solid ${theme.colors.border.weak};
      &:last-child {
        border: none;
      }
    `,
    wrapper: css`
      background: ${theme.colors.background.primary};
      z-index: 1;
      width: 250px;
      box-shadow: 0 5px 10px 0 ${theme.shadows.z1};
    `,
    item: css`
      background: none;
      padding: 2px 8px;
      color: ${theme.colors.text.primary};
      cursor: pointer;
      &:hover {
        background: ${theme.colors.action.hover};
      }
    `,
    label: css`
      color: ${theme.colors.text.secondary};
    `,
    activeItem: css`
      background: ${theme.colors.background.secondary};
      &:hover {
        background: ${theme.colors.background.secondary};
      }
    `,
    itemValue: css`
      font-family: ${theme.typography.fontFamilyMonospace};
      font-size: ${theme.typography.size.sm};
    `,
  };
};

export const DataLinkSuggestions: React.FC<DataLinkSuggestionsProps> = ({ suggestions, ...otherProps }) => {
  const ref = useRef(null);

  useClickAway(ref, () => {
    if (otherProps.onClose) {
      otherProps.onClose();
    }
  });

  const groupedSuggestions = useMemo(() => {
    return groupBy(suggestions, (s) => s.origin);
  }, [suggestions]);

  const styles = useStyles2(getStyles);

  return (
    <div ref={ref} className={styles.wrapper}>
      {Object.keys(groupedSuggestions).map((key, i) => {
        const indexOffset =
          i === 0
            ? 0
            : Object.keys(groupedSuggestions).reduce((acc, current, index) => {
                if (index >= i) {
                  return acc;
                }
                return acc + groupedSuggestions[current].length;
              }, 0);

        return (
          <DataLinkSuggestionsList
            {...otherProps}
            suggestions={groupedSuggestions[key]}
            label={`${capitalize(key)}`}
            activeIndex={otherProps.activeIndex}
            activeIndexOffset={indexOffset}
            key={key}
          />
        );
      })}
    </div>
  );
};

DataLinkSuggestions.displayName = 'DataLinkSuggestions';

interface DataLinkSuggestionsListProps extends DataLinkSuggestionsProps {
  label: string;
  activeIndexOffset: number;
}

const DataLinkSuggestionsList: React.FC<DataLinkSuggestionsListProps> = React.memo(
  ({ activeIndex, activeIndexOffset, label, onClose, onSuggestionSelect, suggestions }) => {
    const styles = useStyles2(getStyles);

    return (
      <>
        <List
          className={styles.list}
          items={suggestions}
          renderItem={(item, index) => {
            return (
              <div
                className={cx(styles.item, index + activeIndexOffset === activeIndex && styles.activeItem)}
                onClick={() => {
                  onSuggestionSelect(item);
                }}
                title={item.documentation}
              >
                <span className={styles.itemValue}>
                  <span className={styles.label}>{label}</span> {item.label}
                </span>
              </div>
            );
          }}
        />
      </>
    );
  }
);

DataLinkSuggestionsList.displayName = 'DataLinkSuggestionsList';
