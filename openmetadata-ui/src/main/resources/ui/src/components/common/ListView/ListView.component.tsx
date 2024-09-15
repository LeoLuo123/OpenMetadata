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
import Icon from '@ant-design/icons';
import { Col, Radio, Row, Space, Switch, Typography } from 'antd';
import { isEmpty, isUndefined } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as GridIcon } from '../../../assets/svg/ic-grid.svg';
import { ReactComponent as ListIcon } from '../../../assets/svg/ic-list.svg';
import Searchbar from '../SearchBarComponent/SearchBar.component';
import Table from '../Table/Table';
import { ListViewOptions, ListViewProps } from './ListView.interface';

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export const ListView = <T extends object = any>({
  tableProps,
  cardRenderer,
  searchProps: { search, onSearch },
  handleDeletedSwitchChange,
  deleted = false,
}: ListViewProps<T>) => {
  const [currentView, setCurrentView] = useState<ListViewOptions>(
    ListViewOptions.TABLE
  );
  const { t } = useTranslation();

  const cardRender = useMemo(() => {
    if (isEmpty(tableProps.dataSource)) {
      return tableProps.locale?.emptyText;
    }

    return (
      <Row gutter={[16, 16]}>
        {(tableProps.dataSource ?? []).map((dataSource) =>
          cardRenderer(dataSource)
        )}
      </Row>
    );
  }, [tableProps, cardRenderer]);

  return (
    <Row gutter={[16, 16]}>
      <Col span={10}>
        <Searchbar
          removeMargin
          placeholder={t('label.search-entity', {
            entity: t('label.service-plural'),
          })}
          searchValue={search}
          onSearch={onSearch}
        />
      </Col>
      <Col className="text-right" span={14}>
        <Space align="center">
          {!isUndefined(handleDeletedSwitchChange) && (
            <span>
              <Switch
                checked={deleted}
                data-testid="show-deleted-switch"
                onChange={handleDeletedSwitchChange}
              />
              <Typography.Text className="m-l-xs">
                {t('label.deleted')}
              </Typography.Text>
            </span>
          )}

          <Radio.Group
            value={currentView}
            onChange={(e) => setCurrentView(e.target.value)}>
            <Radio.Button value={ListViewOptions.CARD}>
              <Icon component={GridIcon} data-testid="grid" />
            </Radio.Button>
            <Radio.Button value={ListViewOptions.TABLE}>
              <Icon component={ListIcon} data-testid="list" />
            </Radio.Button>
          </Radio.Group>
        </Space>
      </Col>
      <Col span={24}>
        {currentView === ListViewOptions.TABLE ? (
          <Table {...tableProps} />
        ) : (
          cardRender
        )}
      </Col>
    </Row>
  );
};
