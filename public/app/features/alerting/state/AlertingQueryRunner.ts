import { GrafanaQuery } from '../../../types/unified-alerting-dto';
import { getBackendSrv } from '../../../core/services/backend_srv';
import { BackendSrvRequest, FetchResponse, toDataQueryError } from '@grafana/runtime';
import {
  compareArrayValues,
  compareDataFrameStructures,
  dataFrameFromJSON,
  DataFrameJSON,
  LoadingState,
  PanelData,
  rangeUtil,
} from '@grafana/data';
import { catchError, finalize, map, mapTo, share, takeUntil } from 'rxjs/operators';
import { merge, Observable, of, ReplaySubject, timer, Unsubscribable } from 'rxjs';
import { preProcessPanelData } from 'app/features/query/state/runRequest';

interface AlertingQueryResult {
  frames: DataFrameJSON[];
}

interface AlertingQueryResponse {
  results: Record<string, AlertingQueryResult>;
}
export class AlertingQueryRunner {
  private subject: ReplaySubject<Record<string, PanelData>>;
  private subscription?: Unsubscribable;
  private lastResult: Record<string, PanelData>;

  constructor() {
    this.subject = new ReplaySubject(1);
    this.lastResult = {};
  }

  get(): Observable<Record<string, PanelData>> {
    return this.subject.asObservable();
  }

  async run(queries: GrafanaQuery[]) {
    if (queries.length === 0) {
      const empty = initialState(queries, LoadingState.Done);
      return this.subject.next(empty);
    }

    this.subscription = runRequest(queries).subscribe({
      next: (dataPerQuery) => {
        for (const [refId, data] of Object.entries(dataPerQuery)) {
          const previous = this.lastResult[refId];
          this.lastResult[refId] = setStructureRevision(data, previous);
        }
        this.subject.next(this.lastResult);
      },
      error: (error) => console.error('PanelQueryRunner Error', error),
    });
  }
  cancel() {}
}

const runRequest = (queries: GrafanaQuery[]): Observable<Record<string, PanelData>> => {
  const initial = initialState(queries, LoadingState.Loading);
  const request = {
    data: { data: queries },
    url: '/api/v1/eval',
    method: 'POST',
  };

  const runningRequest = getBackendSrv()
    .fetch<AlertingQueryResponse>(request)
    .pipe(
      map(mapToPanelData(initial)),
      catchError(mapToError(initial)),
      finalize(cancelNetworkRequestsOnUnsubscribe(request)),
      share()
    );

  return merge(timer(200).pipe(mapTo(initial), takeUntil(runningRequest)), runningRequest);
};

const initialState = (queries: GrafanaQuery[], state: LoadingState): Record<string, PanelData> => {
  // 1. query with time range
  // 2. expression without time range
  // 2.1 classic/math condition reference multiple queries.
  // 2.2 other condition reference single query.

  return queries.reduce((dataByQuery: Record<string, PanelData>, query) => {
    dataByQuery[query.refId] = {
      state,
      series: [],
      timeRange: rangeUtil.relativeToTimeRange(query.relativeTimeRange!),
    };

    return dataByQuery;
  }, {});
};

const mapToPanelData = (
  dataByQuery: Record<string, PanelData>
): ((response: FetchResponse<AlertingQueryResponse>) => Record<string, PanelData>) => {
  return (response) => {
    const { data } = response;
    const results: Record<string, PanelData> = {};

    for (const [refId, result] of Object.entries(data.results)) {
      results[refId] = {
        timeRange: dataByQuery[refId].timeRange,
        state: LoadingState.Done,
        series: result.frames.map(dataFrameFromJSON),
      };
    }

    return results;
  };
};

const mapToError = (
  dataByQuery: Record<string, PanelData>
): ((err: Error) => Observable<Record<string, PanelData>>) => {
  return (error) => {
    const results: Record<string, PanelData> = {};
    const queryError = toDataQueryError(error);

    for (const [refId, data] of Object.entries(dataByQuery)) {
      results[refId] = {
        ...data,
        state: LoadingState.Error,
        error: queryError,
      };
    }

    return of(results);
  };
};

const cancelNetworkRequestsOnUnsubscribe = (request: BackendSrvRequest): (() => void) => {
  return () => {
    if (request.requestId) {
      getBackendSrv().resolveCancelerIfExists(request.requestId);
    }
  };
};

const setStructureRevision = (data: PanelData, lastResult: PanelData) => {
  const result = preProcessPanelData(data, lastResult);
  let structureRev = 1;

  if (lastResult?.structureRev && lastResult.series) {
    structureRev = lastResult.structureRev;
    const sameStructure = compareArrayValues(result.series, lastResult.series, compareDataFrameStructures);
    if (!sameStructure) {
      structureRev++;
    }
  }

  result.structureRev = structureRev;
  return result;
};
