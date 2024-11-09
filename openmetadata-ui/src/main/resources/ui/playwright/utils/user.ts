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

import { expect, Page, Response } from '@playwright/test';
import {
  customFormatDateTime,
  getEpochMillisForFutureDays,
} from '../../src/utils/date-time/DateTimeUtils';
import {
  GLOBAL_SETTING_PERMISSIONS,
  SETTING_PAGE_ENTITY_PERMISSION,
} from '../constant/permission';
import { VISIT_SERVICE_PAGE_DETAILS } from '../constant/service';
import {
  GlobalSettingOptions,
  SETTINGS_OPTIONS_PATH,
  SETTING_CUSTOM_PROPERTIES_PATH,
} from '../constant/settings';
import { SidebarItem } from '../constant/sidebar';
import { UserClass } from '../support/user/UserClass';
import {
  descriptionBox,
  getAuthContext,
  getToken,
  redirectToHomePage,
  toastNotification,
  visitOwnProfilePage,
} from './common';
import { settingClick, sidebarClick } from './sidebar';

export const visitUserListPage = async (page: Page) => {
  const fetchUsers = page.waitForResponse('/api/v1/users?*');
  await settingClick(page, GlobalSettingOptions.USERS);
  await fetchUsers;
};

export const performUserLogin = async (browser, user: UserClass) => {
  const page = await browser.newPage();
  await user.login(page);
  const token = await getToken(page);
  const apiContext = await getAuthContext(token);
  const afterAction = async () => {
    await apiContext.dispose();
    await page.close();
  };

  return { page, apiContext, afterAction };
};

export const nonDeletedUserChecks = async (page: Page) => {
  await expect(
    page.locator(
      '[data-testid="user-profile-details"] [data-testid="edit-persona"]'
    )
  ).toBeVisible();

  await expect(page.locator('[data-testid="edit-teams-button"]')).toBeVisible();
  await expect(page.locator('[data-testid="edit-roles-button"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="persona-list"] [data-testid="edit-persona"]')
  ).toBeVisible();
};

export const deletedUserChecks = async (page: Page) => {
  const deletedBadge = page.locator('[data-testid="deleted-badge"]');

  await expect(deletedBadge).toHaveText('Deleted');

  await expect(
    page.locator(
      '[data-testid="user-profile-details"] [data-testid="edit-persona"]'
    )
  ).not.toBeVisible();
  await expect(
    page.locator('[data-testid="change-password-button"]')
  ).not.toBeVisible();
  await expect(
    page.locator('[data-testid="edit-teams-button"]')
  ).not.toBeVisible();
  await expect(
    page.locator('[data-testid="edit-roles-button"]')
  ).not.toBeVisible();
  await expect(
    page.locator('[data-testid="persona-list"] [data-testid="edit-persona"]')
  ).not.toBeVisible();
};

export const visitUserProfilePage = async (page: Page, userName: string) => {
  await settingClick(page, GlobalSettingOptions.USERS);
  const userResponse = page.waitForResponse(
    '/api/v1/search/query?q=**&from=0&size=*&index=*'
  );
  await page.getByTestId('searchbar').fill(userName);
  await userResponse;
  await page.getByTestId(userName).click();
};

export const softDeleteUserProfilePage = async (
  page: Page,
  userName: string,
  displayName: string
) => {
  const userResponse = page.waitForResponse(
    '/api/v1/search/query?q=**&from=0&size=*&index=*'
  );
  await page.getByTestId('searchbar').fill(userName);
  await userResponse;
  await page.getByTestId(userName).click();

  await page.getByTestId('user-profile-details').click();

  await nonDeletedUserChecks(page);

  await page.click('[data-testid="manage-button"]');
  await page.click('[data-testid="delete-button"]');

  await page.waitForSelector('[role="dialog"].ant-modal');

  await expect(page.locator('[role="dialog"].ant-modal')).toBeVisible();
  await expect(page.locator('.ant-modal-title')).toContainText(displayName);

  await page.fill('[data-testid="confirmation-text-input"]', 'DELETE');

  const deleteResponse = page.waitForResponse(
    '/api/v1/users/*?hardDelete=false&recursive=true'
  );
  await page.click('[data-testid="confirm-button"]');

  await deleteResponse;

  await expect(page.locator('.Toastify__toast-body')).toHaveText(
    /deleted successfully!/
  );

  await page.click('.Toastify__close-button');

  await deletedUserChecks(page);
};

export const restoreUserProfilePage = async (page: Page, fqn: string) => {
  await page.click('[data-testid="manage-button"]');
  await page.click('[data-testid="restore-button"]');

  await page.waitForSelector('[role="dialog"].ant-modal');

  await expect(page.locator('[role="dialog"].ant-modal')).toBeVisible();
  await expect(page.locator('.ant-modal-title')).toContainText('Restore user');

  await expect(
    page.locator('[data-testid="restore-modal-body"]')
  ).toContainText(`Are you sure you want to restore ${fqn}?`);

  const restoreResponse = page.waitForResponse('/api/v1/users/restore');
  await page.click('.ant-modal-footer .ant-btn-primary');

  await restoreResponse;

  await toastNotification(page, /User restored successfully/);

  await nonDeletedUserChecks(page);
};

export const hardDeleteUserProfilePage = async (
  page: Page,
  displayName: string
) => {
  await page.getByTestId('manage-button').click();
  await page.getByTestId('delete-button').click();

  await page.waitForSelector('[role="dialog"].ant-modal');

  await expect(page.locator('[role="dialog"].ant-modal')).toBeVisible();
  await expect(page.locator('.ant-modal-title')).toContainText(displayName);

  await page.click('[data-testid="hard-delete-option"]');
  await page.check('[data-testid="hard-delete"]');
  await page.fill('[data-testid="confirmation-text-input"]', 'DELETE');

  const deleteResponse = page.waitForResponse(
    '/api/v1/users/*?hardDelete=true&recursive=true'
  );
  await page.click('[data-testid="confirm-button"]');

  await deleteResponse;

  await toastNotification(page, /deleted successfully!/);
};

export const editDisplayName = async (page: Page, editedUserName: string) => {
  await page.click('[data-testid="edit-displayName"]');
  await page.fill('[data-testid="displayName"]', '');
  await page.type('[data-testid="displayName"]', editedUserName);

  const saveResponse = page.waitForResponse('/api/v1/users/*');
  await page.click('[data-testid="inline-save-btn"]');
  await saveResponse;

  // Verify the updated display name
  const userName = await page.textContent('[data-testid="user-name"]');

  expect(userName).toContain(editedUserName);
};

export const editTeams = async (page: Page, teamName: string) => {
  await page.click('[data-testid="edit-teams-button"]');
  await page.click('.ant-select-selection-item-remove > .anticon');

  await page.click('[data-testid="team-select"]');
  await page.type('[data-testid="team-select"]', teamName);

  // Click the team from the dropdown
  await page.click('.filter-node > .ant-select-tree-node-content-wrapper');

  const updateTeamResponse = page.waitForResponse('/api/v1/users/*');
  await page.click('[data-testid="inline-save-btn"]');
  await updateTeamResponse;

  // Verify the new team link is visible
  await expect(page.locator(`[data-testid="${teamName}-link"]`)).toBeVisible();
};

export const editDescription = async (
  page: Page,
  updatedDescription: string
) => {
  await page.click('[data-testid="edit-description"]');

  // Clear and type the new description
  await page.locator(descriptionBox).fill(updatedDescription);

  const updateDescription = page.waitForResponse('/api/v1/users/*');
  await page.click('[data-testid="save"]');
  await updateDescription;

  await page.click('.ant-collapse-expand-icon > .anticon > svg');

  // Verify the updated description
  const description = page.locator(
    '[data-testid="asset-description-container"] .toastui-editor-contents > p'
  );

  await expect(description).toContainText(updatedDescription);
};

export const handleAdminUpdateDetails = async (
  page: Page,
  editedUserName: string,
  updatedDescription: string,
  teamName: string,
  role?: string
) => {
  const feedResponse = page.waitForResponse('/api/v1/feed?type=Conversation');
  await visitOwnProfilePage(page);
  await feedResponse;

  // edit displayName
  await editDisplayName(page, editedUserName);

  // edit teams
  await page.click('.ant-collapse-expand-icon > .anticon > svg');
  await editTeams(page, teamName);

  // edit description
  await editDescription(page, updatedDescription);

  await page.click('.ant-collapse-expand-icon > .anticon > svg');

  // verify role for the user
  const chipContainer = page.locator(
    '[data-testid="user-profile-roles"] [data-testid="chip-container"]'
  );

  await expect(chipContainer).toContainText(role ?? '');
};

export const handleUserUpdateDetails = async (
  page: Page,
  editedUserName: string,
  updatedDescription: string
) => {
  const feedResponse = page.waitForResponse(
    '/api/v1/feed?type=Conversation&filterType=OWNER_OR_FOLLOWS&userId=*'
  );
  await visitOwnProfilePage(page);
  await feedResponse;

  // edit displayName
  await editDisplayName(page, editedUserName);

  // edit description
  await page.click('.ant-collapse-expand-icon > .anticon > svg');
  await editDescription(page, updatedDescription);
};

export const updateUserDetails = async (
  page: Page,
  {
    updatedDisplayName,
    updatedDescription,
    isAdmin,
    teamName,
    role,
  }: {
    updatedDisplayName: string;
    updatedDescription: string;
    teamName: string;
    isAdmin?: boolean;
    role?: string;
  }
) => {
  if (isAdmin) {
    await handleAdminUpdateDetails(
      page,
      updatedDisplayName,
      updatedDescription,
      teamName,
      role
    );
  } else {
    await handleUserUpdateDetails(page, updatedDisplayName, updatedDescription);
  }
};

export const softDeleteUser = async (
  page: Page,
  username: string,
  displayName: string
) => {
  // Wait for the loader to disappear
  await page.waitForSelector('[data-testid="loader"]', { state: 'hidden' });

  const searchResponse = page.waitForResponse(
    '/api/v1/search/query?q=**&from=0&size=*&index=*'
  );
  await page.fill('[data-testid="searchbar"]', username);
  await searchResponse;

  // Click on delete button
  await page.click(`[data-testid="delete-user-btn-${username}"]`);
  // Soft deleting the user
  await page.click('[data-testid="soft-delete"]');
  await page.fill('[data-testid="confirmation-text-input"]', 'DELETE');

  const fetchUpdatedUsers = page.waitForResponse('/api/v1/users/*');
  const deleteResponse = page.waitForResponse(
    '/api/v1/users/*?hardDelete=false&recursive=false'
  );
  await page.click('[data-testid="confirm-button"]');
  await deleteResponse;
  await fetchUpdatedUsers;

  await toastNotification(page, `"${displayName}" deleted successfully!`);

  // Wait for the loader to disappear
  await page.waitForSelector('[data-testid="loader"]', { state: 'hidden' });

  // Search soft deleted user in non-deleted mode
  const searchSoftDeletedUserResponse = page.waitForResponse(
    '/api/v1/search/query*'
  );
  await page.fill('[data-testid="searchbar"]', username);
  await searchSoftDeletedUserResponse;

  // Verify the search error placeholder is visible
  const searchErrorPlaceholder = page.locator(
    '[data-testid="search-error-placeholder"]'
  );

  await expect(searchErrorPlaceholder).toBeVisible();
};

export const restoreUser = async (
  page: Page,
  username: string,
  editedUserName: string
) => {
  // Click on deleted user toggle
  const fetchDeletedUsers = page.waitForResponse(
    '/api/v1/users?**include=deleted'
  );
  await page.click('[data-testid="show-deleted"]');
  await fetchDeletedUsers;

  // Wait for the loader to disappear
  await page.waitForSelector('[data-testid="loader"]', { state: 'hidden' });

  const searchUsers = page.waitForResponse('/api/v1/search/query*');
  await page.fill('[data-testid="searchbar"]', username);
  await searchUsers;

  // Click on restore user button
  await page.click(`[data-testid="restore-user-btn-${username}"]`);

  // Verify the modal content
  const modalContent = page.locator('.ant-modal-body > p');

  await expect(modalContent).toContainText(
    `Are you sure you want to restore ${editedUserName}?`
  );

  // Click the confirm button in the modal
  const restoreUserResponse = page.waitForResponse('/api/v1/users/restore');
  await page.click('.ant-modal-footer > .ant-btn-primary');
  await restoreUserResponse;

  await toastNotification(page, 'User restored successfully');
};

export const permanentDeleteUser = async (
  page: Page,
  username: string,
  displayName: string,
  isUserSoftDeleted = true
) => {
  if (isUserSoftDeleted) {
    // Click on deleted user toggle to off it
    const fetchDeletedUsers = page.waitForResponse(
      '/api/v1/users?**include=non-deleted'
    );
    await page.click('[data-testid="show-deleted"]');
    await fetchDeletedUsers;
  }

  // Wait for the loader to disappear
  await page.waitForSelector('[data-testid="loader"]', { state: 'hidden' });

  // Search the user
  const searchUserResponse = page.waitForResponse('/api/v1/search/query*');
  await page.fill('[data-testid="searchbar"]', username);
  await searchUserResponse;

  // Wait for the loader to disappear
  await page.waitForSelector('[data-testid="loader"]', { state: 'hidden' });

  // Click on delete user button
  await page.click(`[data-testid="delete-user-btn-${username}"]`);

  // Click on hard delete
  await page.click('[data-testid="hard-delete"]');
  await page.fill('[data-testid="confirmation-text-input"]', 'DELETE');

  const reFetchUsers = page.waitForResponse(
    '/api/v1/users?**include=non-deleted'
  );
  const hardDeleteUserResponse = page.waitForResponse(
    'api/v1/users/*?hardDelete=true&recursive=false'
  );
  await page.click('[data-testid="confirm-button"]');
  await hardDeleteUserResponse;
  await reFetchUsers;

  await toastNotification(page, `"${displayName}" deleted successfully!`);

  // Wait for the loader to disappear
  await page.waitForSelector('[data-testid="loader"]', { state: 'hidden' });

  // Search the user again
  const searchUserAfterDeleteResponse = page.waitForResponse(
    '/api/v1/search/query*'
  );
  await page.fill('[data-testid="searchbar"]', username);

  await searchUserAfterDeleteResponse;

  // Verify the search error placeholder is visible
  const searchErrorPlaceholder = page.locator(
    '[data-testid="search-error-placeholder"]'
  );

  await expect(searchErrorPlaceholder).toBeVisible();
};

export const generateToken = async (page: Page) => {
  await expect(page.locator('[data-testid="no-token"]')).toBeVisible();

  await page.click('[data-testid="auth-mechanism"] > span');

  await page.click('[data-testid="token-expiry"]');

  await page.locator('[title="1 hr"] div').click();

  await expect(page.locator('[data-testid="token-expiry"]')).toBeVisible();

  const generateToken = page.waitForResponse('/api/v1/users/security/token');
  await page.click('[data-testid="save-edit"]');
  await generateToken;
};

export const revokeToken = async (page: Page, isBot?: boolean) => {
  await page.click('[data-testid="revoke-button"]');

  await expect(page.locator('[data-testid="body-text"]')).toContainText(
    `Are you sure you want to revoke access for ${
      isBot ? 'JWT Token' : 'Personal Access Token'
    }?`
  );

  await page.click('[data-testid="save-button"]');

  await expect(page.locator('[data-testid="revoke-button"]')).not.toBeVisible();
};

export const updateExpiration = async (page: Page, expiry: number | string) => {
  await page.click('[data-testid="token-expiry"]');
  await page.click(`text=${expiry} days`);

  const expiryDate = customFormatDateTime(
    getEpochMillisForFutureDays(expiry as number),
    `ccc d'th' MMMM, yyyy`
  );

  await page.click('[data-testid="save-edit"]');

  await expect(
    page.locator('[data-testid="center-panel"] [data-testid="revoke-button"]')
  ).toBeVisible();

  await expect(page.locator('[data-testid="token-expiry"]')).toContainText(
    `Expires on ${expiryDate}`
  );

  await revokeToken(page);
};

export const checkDataConsumerPermissions = async (page: Page) => {
  // check Add domain permission
  await expect(page.locator('[data-testid="add-domain"]')).not.toBeVisible();
  await expect(
    page.locator('[data-testid="edit-displayName-button"]')
  ).not.toBeVisible();

  // Check edit owner permission
  await expect(page.locator('[data-testid="edit-owner"]')).not.toBeVisible();

  // Check edit description permission
  await expect(page.locator('[data-testid="edit-description"]')).toBeVisible();

  // Check edit tier permission
  await expect(page.locator('[data-testid="edit-tier"]')).toBeVisible();

  // Check right panel add tags button
  await expect(
    page.locator(
      '[data-testid="entity-right-panel"] [data-testid="tags-container"] [data-testid="entity-tags"] .tag-chip-add-button'
    )
  ).toBeVisible();

  // Check right panel add glossary term button
  await expect(
    page.locator(
      '[data-testid="entity-right-panel"] [data-testid="glossary-container"] [data-testid="entity-tags"] .tag-chip-add-button'
    )
  ).toBeVisible();

  if (process.env.PLAYWRIGHT_IS_OSS) {
    await expect(
      page.locator('[data-testid="manage-button"]')
    ).not.toBeVisible();
  } else {
    await expect(page.locator('[data-testid="manage-button"]')).toBeVisible();

    await page.click('[data-testid="manage-button"]');

    await expect(page.locator('[data-testid="export-button"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="import-button"]')
    ).not.toBeVisible();
    await expect(
      page.locator('[data-testid="announcement-button"]')
    ).not.toBeVisible();
    await expect(
      page.locator('[data-testid="delete-button"]')
    ).not.toBeVisible();
  }

  await page.click('[data-testid="lineage"]');

  await expect(page.locator('[data-testid="edit-lineage"]')).toBeDisabled();
};

export const checkStewardServicesPermissions = async (page: Page) => {
  // Click on the sidebar item for Explore
  await sidebarClick(page, SidebarItem.EXPLORE);

  // Iterate through the service page details and check for the add service button
  for (const service of Object.values(VISIT_SERVICE_PAGE_DETAILS)) {
    await settingClick(page, service.settingsMenuId);

    await expect(
      page.locator('[data-testid="add-service-button"] > span')
    ).not.toBeVisible();
  }

  // Click on the sidebar item for Explore again
  await sidebarClick(page, SidebarItem.EXPLORE);

  // Perform search actions
  await page.click('[data-testid="search-dropdown-Data Assets"]');
  await page.locator('[data-testid="table-checkbox"]').scrollIntoViewIfNeeded();
  await page.click('[data-testid="table-checkbox"]');

  const getSearchResultResponse = page.waitForResponse(
    '/api/v1/search/query?q=*'
  );
  await page.click('[data-testid="update-btn"]');

  await getSearchResultResponse;

  // Click on the entity link in the drawer title
  await page.click(
    '.ant-drawer-title > [data-testid="entity-link"] > .ant-typography'
  );

  // Check if the edit tier button is visible
  await expect(page.locator('[data-testid="edit-tier"]')).toBeVisible();
};

export const checkStewardPermissions = async (page: Page) => {
  // Check Add domain permission
  await expect(page.locator('[data-testid="add-domain"]')).not.toBeVisible();

  await expect(
    page
      .getByRole('cell', { name: 'user_id' })
      .getByTestId('edit-displayName-button')
  ).toBeVisible();

  // Check edit owner permission
  await expect(page.locator('[data-testid="edit-owner"]')).toBeVisible();

  // Check edit description permission
  await expect(page.locator('[data-testid="edit-description"]')).toBeVisible();

  // Check edit tier permission
  await expect(page.locator('[data-testid="edit-tier"]')).toBeVisible();

  // Check right panel add tags button
  await expect(
    page.locator(
      '[data-testid="entity-right-panel"] [data-testid="tags-container"] [data-testid="entity-tags"] .tag-chip-add-button'
    )
  ).toBeVisible();

  // Check right panel add glossary term button
  await expect(
    page.locator(
      '[data-testid="entity-right-panel"] [data-testid="glossary-container"] [data-testid="entity-tags"] .tag-chip-add-button'
    )
  ).toBeVisible();

  // Check manage button
  await expect(page.locator('[data-testid="manage-button"]')).toBeVisible();

  // Click on lineage item
  await page.click('[data-testid="lineage"]');

  // Check if edit lineage button is enabled
  await expect(page.locator('[data-testid="edit-lineage"]')).toBeEnabled();
};

export const addUser = async (page: Page, { name, email, password, role }) => {
  await page.click('[data-testid="add-user"]');

  await page.fill('[data-testid="email"]', email);

  await page.fill('[data-testid="displayName"]', name);

  await page.fill(descriptionBox, 'Adding new user');

  await page.click(':nth-child(2) > .ant-radio > .ant-radio-input');
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);

  await page.click('[data-testid="roles-dropdown"] > .ant-select-selector');
  await page.type(
    '[data-testid="roles-dropdown"] > .ant-select-selector',
    role
  );
  await page.click('.ant-select-item-option-content');
  await page.click('[data-testid="roles-dropdown"] > .ant-select-selector');

  const saveResponse = page.waitForResponse('/api/v1/users');
  await page.click('[data-testid="save-user"]');
  await saveResponse;

  expect((await saveResponse).status()).toBe(201);
};

const resetPasswordModal = async (
  page: Page,
  oldPassword: string,
  newPassword: string,
  isOldPasswordCorrect = true
) => {
  await page.fill('[data-testid="input-oldPassword"]', oldPassword);
  await page.fill('[data-testid="input-newPassword"]', newPassword);
  await page.fill('[data-testid="input-confirm-newPassword"]', newPassword);

  const saveResetPasswordResponse = page.waitForResponse(
    '/api/v1/users/changePassword'
  );
  await page.click(
    '.ant-modal-footer > .ant-btn-primary:has-text("Update Password")'
  );

  await saveResetPasswordResponse;

  await toastNotification(
    page,
    isOldPasswordCorrect
      ? 'Password updated successfully.'
      : 'Old Password is not correct'
  );
};

export const resetPassword = async (
  page: Page,
  oldCorrectPassword: string,
  oldWrongPassword: string,
  newPassword: string
) => {
  await visitOwnProfilePage(page);

  await page.click('[data-testid="change-password-button"]');

  await expect(page.locator('.ant-modal-wrap')).toBeVisible();

  // Try with the wrong old password should throw an error
  await resetPasswordModal(page, oldWrongPassword, newPassword, false);

  // Try with the Correct old password should reset the password
  await resetPasswordModal(page, oldCorrectPassword, newPassword);
};

export const expectSettingEntityNotVisible = async (
  page: Page,
  path: string[]
) => {
  await expect(page.getByTestId(path[0])).not.toBeVisible();
};

// Check the permissions for the settings page for DataSteward and DataConsumer
export const settingPageOperationPermissionCheck = async (page: Page) => {
  await redirectToHomePage(page);

  for (const id of Object.values(SETTING_PAGE_ENTITY_PERMISSION)) {
    let apiResponse: Promise<Response> | undefined;
    if (id?.api) {
      apiResponse = page.waitForResponse(id.api);
    }
    // Navigate to settings and respective tab page
    await settingClick(page, id.testid);
    if (id?.api && apiResponse) {
      await apiResponse;
    }

    await expect(page.locator('.ant-skeleton-button')).not.toBeVisible();
    await expect(page.getByTestId(id.button)).not.toBeVisible();
  }

  for (const id of Object.values(GLOBAL_SETTING_PERMISSIONS)) {
    if (id.testid === GlobalSettingOptions.METADATA) {
      await settingClick(page, id.testid);
    } else {
      await sidebarClick(page, SidebarItem.SETTINGS);
      let paths = SETTINGS_OPTIONS_PATH[id.testid];

      if (id.isCustomProperty) {
        paths = SETTING_CUSTOM_PROPERTIES_PATH[id.testid];
      }

      await expectSettingEntityNotVisible(page, paths);
    }
  }
};

export const checkEditOwnerButtonPermission = async (page: Page) => {
  await expect(page.locator('[data-testid="edit-owner"]')).not.toBeVisible();
};
