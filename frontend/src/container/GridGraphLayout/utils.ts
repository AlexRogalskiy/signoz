import { NotificationInstance } from 'antd/es/notification/interface';
import updateDashboardApi from 'api/dashboard/update';
import {
	initialClickHouseData,
	initialQueryBuilderFormValues,
	initialQueryPromQLData,
} from 'constants/queryBuilder';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { Layout } from 'react-grid-layout';
import store from 'store';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

export const UpdateDashboard = async (
	{
		data,
		graphType,
		generateWidgetId,
		layout,
		selectedDashboard,
		isRedirected,
		widgetData,
	}: UpdateDashboardProps,
	notify: NotificationInstance,
): Promise<Dashboard | undefined> => {
	const copyTitle = `${widgetData?.title} - Copy`;
	const updatedSelectedDashboard: Dashboard = {
		...selectedDashboard,
		data: {
			title: data.title,
			description: data.description,
			name: data.name,
			tags: data.tags,
			variables: data.variables,
			widgets: [
				...(data.widgets || []),
				{
					description: widgetData?.description || '',
					id: generateWidgetId,
					isStacked: false,
					nullZeroValues: widgetData?.nullZeroValues || '',
					opacity: '',
					panelTypes: graphType,
					query: widgetData?.query || {
						queryType: EQueryType.QUERY_BUILDER,
						promql: [initialQueryPromQLData],
						clickhouse_sql: [initialClickHouseData],
						builder: {
							queryFormulas: [],
							queryData: [initialQueryBuilderFormValues],
						},
					},
					timePreferance: widgetData?.timePreferance || 'GLOBAL_TIME',
					title: widgetData ? copyTitle : '',
				},
			],
			layout,
		},
		uuid: selectedDashboard.uuid,
	};

	const response = await updateDashboardApi(updatedSelectedDashboard);

	if (response.payload) {
		store.dispatch({
			type: 'UPDATE_DASHBOARD',
			payload: response.payload,
		});
	}

	if (isRedirected) {
		if (response.statusCode === 200) {
			return response.payload;
		}
		notify.error({
			message: response.error || 'Something went wrong',
		});
		return undefined;
	}
	return undefined;
};

interface UpdateDashboardProps {
	data: Dashboard['data'];
	graphType: GRAPH_TYPES;
	generateWidgetId: string;
	layout: Layout[];
	selectedDashboard: Dashboard;
	isRedirected: boolean;
	widgetData?: Widgets;
}
