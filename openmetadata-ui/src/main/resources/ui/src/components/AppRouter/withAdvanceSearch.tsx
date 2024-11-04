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
import React, { FC } from 'react';
import { AdvanceSearchProvider } from '../../components/Explore/AdvanceSearchProvider/AdvanceSearchProvider.component';
import { AdvanceSearchProviderProps } from '../Explore/AdvanceSearchProvider/AdvanceSearchProvider.interface';

export const withAdvanceSearch =
  <P extends Record<string, unknown>>(
    Component: FC<P>,
    providerProps?: Omit<AdvanceSearchProviderProps, 'children'>
  ) =>
  (props: P) => {
    return (
      <AdvanceSearchProvider {...providerProps}>
        <Component {...props} />
      </AdvanceSearchProvider>
    );
  };
