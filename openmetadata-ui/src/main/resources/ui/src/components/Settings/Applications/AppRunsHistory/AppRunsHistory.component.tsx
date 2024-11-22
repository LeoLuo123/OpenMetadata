/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { Button, Col, Row, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { AxiosError } from 'axios';
import { isNull } from 'lodash';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import {
  NO_DATA_PLACEHOLDER,
  SOCKET_EVENTS,
  STATUS_LABEL,
} from '../../../../constants/constants';
import { GlobalSettingOptions } from '../../../../constants/GlobalSettings.constants';
import { useWebSocketConnector } from '../../../../context/WebSocketProvider/WebSocketProvider';
import { AppType } from '../../../../generated/entity/applications/app';
import { Status } from '../../../../generated/entity/applications/appRunRecord';
import {
  PipelineState,
  PipelineStatus,
} from '../../../../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { Paging } from '../../../../generated/type/paging';
import { usePaging } from '../../../../hooks/paging/usePaging';
import { useFqn } from '../../../../hooks/useFqn';
import { getApplicationRuns } from '../../../../rest/applicationAPI';
import {
  getStatusFromPipelineState,
  getStatusTypeForApplication,
} from '../../../../utils/ApplicationUtils';
import {
  formatDateTime,
  formatDuration,
  getEpochMillisForPastDays,
  getIntervalInMilliseconds,
} from '../../../../utils/date-time/DateTimeUtils';
import { getLogsViewerPath } from '../../../../utils/RouterUtils';
import { showErrorToast } from '../../../../utils/ToastUtils';
import ErrorPlaceHolder from '../../../common/ErrorWithPlaceholder/ErrorPlaceHolder';
import NextPrevious from '../../../common/NextPrevious/NextPrevious';
import { PagingHandlerParams } from '../../../common/NextPrevious/NextPrevious.interface';
import StatusBadge from '../../../common/StatusBadge/StatusBadge.component';
import { StatusType } from '../../../common/StatusBadge/StatusBadge.interface';
import Table from '../../../common/Table/Table';
import KillScheduleModal from '../../../Modals/KillScheduleRun/KillScheduleRunModal';
import AppLogsViewer from '../AppLogsViewer/AppLogsViewer.component';
import {
  AppRunRecordWithId,
  AppRunsHistoryProps,
} from './AppRunsHistory.interface';

const AppRunsHistory = forwardRef(
  (
    { appData, maxRecords, showPagination = true }: AppRunsHistoryProps,
    ref
  ) => {
    const { socket } = useWebSocketConnector();
    const { t } = useTranslation();
    const { fqn } = useFqn();
    const [isLoading, setIsLoading] = useState(true);
    const [appRunsHistoryData, setAppRunsHistoryData] = useState<
      AppRunRecordWithId[]
    >([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const [isKillModalOpen, setIsKillModalOpen] = useState<boolean>(false);

    const {
      currentPage,
      paging,
      pageSize,
      handlePagingChange,
      handlePageChange,
      handlePageSizeChange,
      showPagination: paginationVisible,
    } = usePaging();

    const history = useHistory();

    const isExternalApp = useMemo(
      () => appData?.appType === AppType.External,
      [appData]
    );

    const handleRowExpandable = useCallback(
      (key?: string) => {
        if (key) {
          if (isExternalApp && appData) {
            return history.push(
              getLogsViewerPath(
                GlobalSettingOptions.APPLICATIONS,
                appData.name ?? '',
                appData.name ?? ''
              )
            );
          }
          if (expandedRowKeys.includes(key)) {
            setExpandedRowKeys((prev) => prev.filter((item) => item !== key));
          } else {
            setExpandedRowKeys((prev) => [...prev, key]);
          }
        }
      },
      [expandedRowKeys]
    );

    const showLogAction = useCallback((record: AppRunRecordWithId): boolean => {
      if (appData?.appType === AppType.External) {
        return false;
      }

      if (record.status === Status.Success && isNull(record?.successContext)) {
        return true;
      }

      return false;
    }, []);

    const getActionButton = useCallback(
      (record: AppRunRecordWithId, index: number) => {
        if (
          appData?.appType === AppType.Internal ||
          (isExternalApp && index === 0)
        ) {
          return (
            <>
              <Button
                className="p-0"
                data-testid="logs"
                disabled={showLogAction(record)}
                size="small"
                type="link"
                onClick={() => handleRowExpandable(record.id)}>
                {t('label.log-plural')}
              </Button>
              {/* For status running and supportsInterrupt is true, show kill button */}
              {Boolean(appData?.supportsInterrupt) && (
                <Button
                  className="m-l-xs p-0"
                  data-testid="kill-button"
                  size="small"
                  type="link"
                  onClick={() => setIsKillModalOpen(true)}>
                  {t('label.kill')}
                </Button>
              )}
            </>
          );
        } else {
          return NO_DATA_PLACEHOLDER;
        }
      },
      [showLogAction, appData, isExternalApp, handleRowExpandable]
    );

    const tableColumn: ColumnsType<AppRunRecordWithId> = useMemo(
      () => [
        {
          title: t('label.run-at'),
          dataIndex: 'timestamp',
          key: 'timestamp',
          render: (_, record) => formatDateTime(record.timestamp),
        },
        {
          title: t('label.run-type'),
          dataIndex: 'runType',
          key: 'runType',
          render: (runType) => (
            <Typography.Text>{runType ?? NO_DATA_PLACEHOLDER}</Typography.Text>
          ),
        },
        {
          title: t('label.duration'),
          dataIndex: 'executionTime',
          key: 'executionTime',
          render: (_, record: AppRunRecordWithId) => {
            if (record.startTime && record.endTime) {
              const ms = getIntervalInMilliseconds(
                record.startTime,
                record.endTime
              );

              return formatDuration(ms);
            } else {
              return '-';
            }
          },
        },
        {
          title: t('label.status'),
          dataIndex: 'status',
          key: 'status',
          render: (_, record: AppRunRecordWithId) => {
            const status: StatusType = getStatusTypeForApplication(
              record.status ?? Status.Stopped
            );

            return record.status ? (
              <StatusBadge
                dataTestId="pipeline-status"
                label={STATUS_LABEL[record.status]}
                status={status}
              />
            ) : (
              NO_DATA_PLACEHOLDER
            );
          },
        },
        {
          title: t('label.action-plural'),
          dataIndex: 'actions',
          key: 'actions',
          render: (_, record, index) => getActionButton(record, index),
        },
      ],
      [
        appData,
        formatDateTime,
        handleRowExpandable,
        getStatusTypeForApplication,
        showLogAction,
        getActionButton,
      ]
    );

    const fetchAppHistory = useCallback(
      async (pagingOffset?: Paging) => {
        try {
          setIsLoading(true);

          if (isExternalApp) {
            const currentTime = Date.now();
            // past 30 days
            const startDay = getEpochMillisForPastDays(30);

            const { data } = await getApplicationRuns(fqn, {
              startTs: startDay,
              endTs: currentTime,
            });

            setAppRunsHistoryData(
              data
                .map((item) => ({
                  ...item,
                  status: getStatusFromPipelineState(
                    (item as PipelineStatus).pipelineState ??
                      PipelineState.Failed
                  ),
                  id: (item as PipelineStatus).runId ?? '',
                }))
                .slice(0, maxRecords)
            );
          } else {
            const { data, paging } = await getApplicationRuns(fqn, {
              offset: pagingOffset?.offset ?? 0,
              limit: maxRecords ?? pageSize,
            });

            setAppRunsHistoryData(
              data.map((item) => ({
                ...item,
                id: `${item.appId}-${item.runType}-${item.timestamp}`,
              }))
            );
            handlePagingChange(paging);
          }
        } catch (err) {
          showErrorToast(err as AxiosError);
        } finally {
          setIsLoading(false);
        }
      },
      [fqn, pageSize, maxRecords, appData]
    );

    const handleAppHistoryPageChange = ({
      currentPage,
    }: PagingHandlerParams) => {
      handlePageChange(currentPage);
      fetchAppHistory({
        offset: (currentPage - 1) * pageSize,
      } as Paging);
    };

    const handleAppHistoryRecordUpdate = (
      updatedRecord: AppRunRecordWithId
    ) => {
      setAppRunsHistoryData((prev) => {
        const updatedData = prev.map((item) => {
          if (
            item.appId === updatedRecord.appId &&
            item.startTime === updatedRecord.startTime
          ) {
            return { ...updatedRecord, id: item.id };
          }

          return item;
        });

        return updatedData;
      });
    };

    useImperativeHandle(ref, () => ({
      refreshAppHistory() {
        fetchAppHistory();
      },
    }));

    useEffect(() => {
      fetchAppHistory();
    }, [fqn, pageSize]);

    useEffect(() => {
      if (socket) {
        socket.on(SOCKET_EVENTS.SEARCH_INDEX_JOB_BROADCAST_CHANNEL, (data) => {
          if (data) {
            const searchIndexJob = JSON.parse(data);
            handleAppHistoryRecordUpdate(searchIndexJob);
          }
        });

        socket.on(SOCKET_EVENTS.DATA_INSIGHTS_JOB_BROADCAST_CHANNEL, (data) => {
          if (data) {
            const dataInsightJob = JSON.parse(data);
            handleAppHistoryRecordUpdate(dataInsightJob);
          }
        });
      }

      return () => {
        if (socket) {
          socket.off(SOCKET_EVENTS.SEARCH_INDEX_JOB_BROADCAST_CHANNEL);
          socket.off(SOCKET_EVENTS.DATA_INSIGHTS_JOB_BROADCAST_CHANNEL);
        }
      };
    }, [socket]);

    return (
      <>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Table
              bordered
              columns={tableColumn}
              data-testid="app-run-history-table"
              dataSource={appRunsHistoryData}
              expandable={{
                expandedRowRender: (record) => (
                  <AppLogsViewer
                    data={record}
                    scrollHeight={maxRecords !== 1 ? 200 : undefined}
                  />
                ),
                showExpandColumn: false,
                rowExpandable: (record) => !showLogAction(record),
                expandedRowKeys,
              }}
              loading={isLoading}
              locale={{
                emptyText: <ErrorPlaceHolder className="m-y-md" />,
              }}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </Col>
          <Col span={24}>
            {showPagination && paginationVisible && (
              <NextPrevious
                isNumberBased
                currentPage={currentPage}
                isLoading={isLoading}
                pageSize={pageSize}
                paging={paging}
                pagingHandler={handleAppHistoryPageChange}
                onShowSizeChange={handlePageSizeChange}
              />
            )}
          </Col>
        </Row>
        {isKillModalOpen && (
          <KillScheduleModal
            appName={fqn}
            displayName={appData?.displayName ?? ''}
            isModalOpen={isKillModalOpen}
            onClose={() => {
              setIsKillModalOpen(false);
            }}
            onKillWorkflowsUpdate={() => {
              fetchAppHistory();
            }}
          />
        )}
      </>
    );
  }
);

export default AppRunsHistory;
