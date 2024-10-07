/*
 *  Copyright 2024 Collate.
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
import test, { expect, Page } from '@playwright/test';
import { GlobalSettingOptions } from '../../constant/settings';
import {
  getApiContext,
  redirectToHomePage,
  toastNotification,
} from '../../utils/common';
import { settingClick } from '../../utils/sidebar';

// use the admin user to login
test.use({ storageState: 'playwright/.auth/admin.json' });

const verifyLastExecutionStatus = async (page: Page) => {
  const { apiContext } = await getApiContext(page);

  await expect
    .poll(
      async () => {
        const response = await apiContext
          .get(
            '/api/v1/apps/name/SearchIndexingApplication/status?offset=0&limit=1'
          )
          .then((res) => res.json());

        return response.data[0]?.status;
      },
      {
        // Custom expect message for reporting, optional.
        message: 'To get the last run execution status as success',
        intervals: [30_000],
        timeout: 300_000,
      }
    )
    .toBe('success');

  await page.reload();

  await page.waitForSelector('[data-testid="app-run-history-table"]');

  await expect(page.getByTestId('pipeline-status')).toContainText('Success');
};

const verifyLastExecutionRun = async (page: Page) => {
  const response = await page.waitForResponse(
    '/api/v1/apps/name/SearchIndexingApplication/status?offset=0&limit=1'
  );

  expect(response.status()).toBe(200);

  const responseData = await response.json();
  if (responseData.data.length > 0) {
    expect(responseData.data).toHaveLength(1);

    if (responseData.data[0].status === 'running') {
      // wait for success status
      await verifyLastExecutionStatus(page);
    } else {
      expect(responseData.data[0].status).toBe('success');
    }
  }
};

test('Search Index Application', async ({ page }) => {
  await test.step('Visit Application page', async () => {
    await redirectToHomePage(page);
    await settingClick(page, GlobalSettingOptions.APPLICATIONS);
  });

  await test.step('Verify last execution run', async () => {
    await page
      .locator(
        '[data-testid="search-indexing-application-card"] [data-testid="config-btn"]'
      )
      .click();
    await verifyLastExecutionRun(page);
  });

  await test.step('Edit application', async () => {
    await page.click('[data-testid="edit-button"]');
    await page.click('[data-testid="cron-type"]');
    await page.click('.rc-virtual-list [title="None"]');

    const deployResponse = page.waitForResponse('/api/v1/apps/*');
    await page.click('.ant-modal-body [data-testid="deploy-button"]');
    await deployResponse;

    await toastNotification(page, 'Schedule saved successfully');

    expect(await page.innerText('[data-testid="schedule-type"]')).toContain(
      'None'
    );

    await page.click('[data-testid="configuration"]');
    await page.fill('#root\\/batchSize', '0');

    await page.getByTestId('tree-select-widget').click();

    // uncheck the entity
    await page.getByRole('tree').getByTitle('Topic').click();

    await page.click(
      '[data-testid="select-widget"] > .ant-select-selector > .ant-select-selection-item'
    );
    await page.click('[data-testid="select-option-JP"]');

    const responseAfterSubmit = page.waitForResponse('/api/v1/apps/*');
    await page.click('[data-testid="submit-btn"]');
    await responseAfterSubmit;

    await toastNotification(page, 'Configuration saved successfully');
  });

  await test.step('Uninstall application', async () => {
    await page.click('[data-testid="manage-button"]');
    await page.click('[data-testid="uninstall-button-title"]');

    const deleteRequest = page.waitForResponse(
      '/api/v1/apps/name/SearchIndexingApplication?hardDelete=true'
    );
    await page.click('[data-testid="save-button"]');
    await deleteRequest;

    await toastNotification(page, 'Application uninstalled successfully');

    const card1 = page.locator(
      '[data-testid="search-indexing-application-card"]'
    );

    expect(await card1.isVisible()).toBe(false);
  });

  await test.step('Install application', async () => {
    await page.click('[data-testid="add-application"]');

    // Verify response status code
    const getMarketPlaceResponse = await page.waitForResponse(
      '/api/v1/apps/marketplace?limit=*'
    );

    expect(getMarketPlaceResponse.status()).toBe(200);

    await page.click(
      '[data-testid="search-indexing-application-card"] [data-testid="config-btn"]'
    );
    await page.click('[data-testid="install-application"]');
    await page.click('[data-testid="save-button"]');
    await page.click('[data-testid="submit-btn"]');
    await page.click('[data-testid="cron-type"]');
    await page.click('.rc-virtual-list [title="None"]');

    expect(await page.innerText('[data-testid="cron-type"]')).toContain('None');

    const installApplicationResponse = page.waitForResponse('api/v1/apps');
    await page.click('[data-testid="deploy-button"]');
    await installApplicationResponse;

    await toastNotification(page, 'Application installed successfully');

    const card = page.locator(
      '[data-testid="search-indexing-application-card"]'
    );

    expect(await card.isVisible()).toBe(true);
  });

  if (process.env.PLAYWRIGHT_IS_OSS) {
    await test.step('Run application', async () => {
      test.slow(true); // Test time shouldn't exceed while re-fetching the history API.

      await page.click(
        '[data-testid="search-indexing-application-card"] [data-testid="config-btn"]'
      );

      const triggerPipelineResponse = page.waitForResponse(
        '/api/v1/apps/trigger/SearchIndexingApplication'
      );
      await page.click('[data-testid="run-now-button"]');

      await triggerPipelineResponse;

      await toastNotification(page, 'Application triggered successfully');

      await page.reload();

      await verifyLastExecutionRun(page);
    });
  }
});
