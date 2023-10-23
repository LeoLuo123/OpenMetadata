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

import { EntityDetailsObjectInterface } from '../../../Explore/explore.interface';
import { OperationPermission } from '../../../PermissionProvider/PermissionProvider.interface';

export enum AssetsOfEntity {
  GLOSSARY = 'GLOSSARY',
  DOMAIN = 'DOMAIN',
  DATA_PRODUCT = 'DATA_PRODUCT',
  TEAM = 'TEAM',
  MY_DATA = 'MY_DATA',
  FOLLOWING = 'FOLLOWING',
}

export enum AssetsViewType {
  PILLS = 'PILLS',
  TABS = 'TABS',
}

export interface AssetsTabsProps {
  onAddAsset: () => void;
  permissions: OperationPermission;
  assetCount: number;
  onAssetClick?: (asset?: EntityDetailsObjectInterface) => void;
  isSummaryPanelOpen: boolean;
  type?: AssetsOfEntity;
  viewType?: AssetsViewType;
  queryFilter?: string;
  noDataPlaceholder?: boolean | AssetNoDataPlaceholderProps;
}

export interface AssetNoDataPlaceholderProps {
  message: string;
}
