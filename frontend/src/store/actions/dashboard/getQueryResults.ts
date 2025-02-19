/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { getMetricsQueryRange } from 'api/metrics/getQueryRange';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetMinMax from 'lib/getMinMax';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import getStep from 'lib/getStep';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { isEmpty } from 'lodash-es';
import store from 'store';
import { SuccessResponse } from 'types/api';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { EQueryType } from 'types/common/dashboard';
import { convertNewDataToOld } from 'lib/newQueryBuilder/convertNewDataToOld';

export async function GetMetricQueryRange({
	query,
	globalSelectedInterval,
	graphType,
	selectedTime,
	variables = {},
}: GetQueryResultsProps): Promise<SuccessResponse<MetricRangePayloadProps>> {
	const queryData = query[query.queryType];
	let legendMap: Record<string, string> = {};

	const QueryPayload = {
		compositeQuery: {
			queryType: query.queryType,
			panelType: graphType,
		},
	};

	switch (query.queryType) {
		case EQueryType.QUERY_BUILDER: {
			const { queryData: data, queryFormulas } = query.builder;
			const currentQueryData = mapQueryDataToApi(data, 'queryName');
			const currentFormulas = mapQueryDataToApi(queryFormulas, 'queryName');
			const builderQueries = {
				...currentQueryData.data,
				...currentFormulas.data,
			};
			legendMap = {
				...currentQueryData.newLegendMap,
				...currentFormulas.newLegendMap,
			};

			QueryPayload.compositeQuery.builderQueries = builderQueries;
			break;
		}
		case EQueryType.CLICKHOUSE: {
			const chQueries = {};
			queryData.map((query) => {
				if (!query.query) return;
				chQueries[query.name] = {
					query: query.query,
					disabled: query.disabled,
				};
				legendMap[query.name] = query.legend;
			});
			QueryPayload.compositeQuery.chQueries = chQueries;
			break;
		}
		case EQueryType.PROM: {
			const promQueries = {};
			queryData.map((query) => {
				if (!query.query) return;
				promQueries[query.name] = {
					query: query.query,
					disabled: query.disabled,
				};
				legendMap[query.name] = query.legend;
			});
			QueryPayload.compositeQuery.promQueries = promQueries;
			break;
		}
		default:
			return;
	}

	const { globalTime } = store.getState();

	const minMax = GetMinMax(globalSelectedInterval, [
		globalTime.minTime / 1000000,
		globalTime.maxTime / 1000000,
	]);

	const getMaxMinTime = GetMaxMinTime({
		graphType: null,
		maxTime: minMax.maxTime,
		minTime: minMax.minTime,
	});

	const { end, start } = GetStartAndEndTime({
		type: selectedTime,
		maxTime: getMaxMinTime.maxTime,
		minTime: getMaxMinTime.minTime,
	});
	const response = await getMetricsQueryRange({
		start: parseInt(start, 10) * 1e3,
		end: parseInt(end, 10) * 1e3,
		step: getStep({ start, end, inputFormat: 'ms' }),
		variables,
		...QueryPayload,
	});
	if (response.statusCode >= 400) {
		throw new Error(
			`API responded with ${response.statusCode} -  ${response.error}`,
		);
	}

	if (response.payload?.data?.result) {
		const v2Range = convertNewDataToOld(response.payload);

		response.payload = v2Range;

		response.payload.data.result = response.payload.data.result.map(
			(queryData) => {
				const newQueryData = queryData;
				newQueryData.legend = legendMap[queryData.queryName]; // Adds the legend if it is already defined by the user.
				// If metric names is an empty object
				if (isEmpty(queryData.metric)) {
					// If metrics list is empty && the user haven't defined a legend then add the legend equal to the name of the query.
					if (!newQueryData.legend) {
						newQueryData.legend = queryData.queryName;
					}
					// If name of the query and the legend if inserted is same then add the same to the metrics object.
					if (queryData.queryName === newQueryData.legend) {
						newQueryData.metric[queryData.queryName] = queryData.queryName;
					}
				}

				return newQueryData;
			},
		);
	}
	return response;
}

export interface GetQueryResultsProps {
	query: Query;
	graphType: GRAPH_TYPES;
	selectedTime: timePreferenceType;
	globalSelectedInterval: Time;
	variables?: Record<string, unknown>;
}
