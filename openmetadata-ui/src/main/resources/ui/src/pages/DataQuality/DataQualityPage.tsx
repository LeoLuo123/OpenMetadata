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

import { Col, Menu, MenuProps, Row, Typography } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Redirect,
  Route,
  Switch,
  useHistory,
  useParams,
} from 'react-router-dom';
import LeftPanelCard from '../../components/common/LeftPanelCard/LeftPanelCard';
import ResizableLeftPanels from '../../components/common/ResizablePanels/ResizableLeftPanels';
import TabsLabel from '../../components/common/TabsLabel/TabsLabel.component';
import PageLayoutV1 from '../../components/PageLayoutV1/PageLayoutV1';
import { ROUTES } from '../../constants/constants';
import { getDataQualityPagePath } from '../../utils/RouterUtils';
import './data-quality-page.less';
import DataQualityClassBase from './DataQualityClassBase';
import { DataQualityPageTabs } from './DataQualityPage.interface';
import DataQualityProvider from './DataQualityProvider';

const DataQualityPage = () => {
  const { t } = useTranslation();
  const { tab: activeTab } = useParams<{ tab: DataQualityPageTabs }>();
  const history = useHistory();

  const menuItems: MenuProps['items'] = useMemo(() => {
    const data = DataQualityClassBase.getLeftSideBar();

    return data.map((value) => {
      const SvgIcon = value.icon;

      return {
        key: value.key,
        label: (
          <TabsLabel
            description={value.description}
            id={value.id}
            name={value.label}
          />
        ),
        icon: <SvgIcon {...value.iconProps} height={16} width={16} />,
      };
    });
  }, []);

  const tabDetailsComponent = useMemo(() => {
    return DataQualityClassBase.getDataQualityTab();
  }, []);

  const handleTabChange: MenuProps['onClick'] = (event) => {
    const activeKey = event.key;
    if (activeKey !== activeTab) {
      history.push(getDataQualityPagePath(activeKey as DataQualityPageTabs));
    }
  };

  return (
    <PageLayoutV1 pageTitle={t('label.data-quality')}>
      <ResizableLeftPanels
        className="content-height-with-resizable-panel"
        firstPanel={{
          className: 'content-resizable-panel-container',
          minWidth: 280,
          flex: 0.13,
          children: (
            <LeftPanelCard id="data-quality">
              <Menu
                className="custom-menu custom-menu-with-description data-quality-page-left-panel-menu"
                data-testid="tabs"
                items={menuItems}
                mode="inline"
                selectedKeys={[
                  activeTab ?? DataQualityClassBase.getDefaultActiveTab(),
                ]}
                onClick={handleTabChange}
              />
            </LeftPanelCard>
          ),
        }}
        pageTitle="Quality"
        secondPanel={{
          children: (
            <DataQualityProvider>
              <Row
                className="page-container"
                data-testid="data-insight-container"
                gutter={[16, 16]}>
                <Col span={24}>
                  <Typography.Title
                    className="m-b-md p-x-md"
                    data-testid="page-title"
                    level={5}>
                    {t('label.data-quality')}
                  </Typography.Title>
                  <Typography.Paragraph
                    className="text-grey-muted p-x-md"
                    data-testid="page-sub-title">
                    {t('message.page-sub-header-for-data-quality')}
                  </Typography.Paragraph>
                </Col>
                <Col span={24}>
                  <Switch>
                    {tabDetailsComponent.map((tab) => (
                      <Route
                        exact
                        component={tab.component}
                        key={tab.key}
                        path={tab.path}
                      />
                    ))}

                    <Route exact path={ROUTES.DATA_QUALITY}>
                      <Redirect
                        to={getDataQualityPagePath(
                          DataQualityClassBase.getDefaultActiveTab()
                        )}
                      />
                    </Route>
                  </Switch>
                </Col>
              </Row>
            </DataQualityProvider>
          ),
          className: 'content-resizable-panel-container p-t-sm',
          minWidth: 800,
          flex: 0.87,
        }}
      />
    </PageLayoutV1>
  );
};

export default DataQualityPage;
