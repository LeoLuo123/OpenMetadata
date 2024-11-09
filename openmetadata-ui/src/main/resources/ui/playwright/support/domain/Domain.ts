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
import { APIRequestContext } from '@playwright/test';
import { uuid } from '../../utils/common';

type UserTeamRef = {
  name: string;
  type: string;
};

type ResponseDataType = {
  name: string;
  displayName: string;
  description: string;
  domainType: string;
  id?: string;
  fullyQualifiedName?: string;
  owners?: UserTeamRef[];
  experts?: UserTeamRef[];
};

export class Domain {
  id: string;
  data: ResponseDataType;

  responseData: ResponseDataType;

  constructor(data?: ResponseDataType) {
    this.id = uuid();
    this.data = data ?? {
      name: `PW%domain.${this.id}`,
      displayName: `PW Domain ${this.id}`,
      description: 'playwright domain description',
      domainType: 'Aggregate',
      // eslint-disable-next-line no-useless-escape
      fullyQualifiedName: `\"PW%domain.${this.id}\"`,
    };
  }

  async create(apiContext: APIRequestContext) {
    const response = await apiContext.post('/api/v1/domains', {
      data: this.data,
    });
    const data = await response.json();
    this.responseData = data;

    return data;
  }

  get() {
    return this.data;
  }

  async delete(apiContext: APIRequestContext) {
    const response = await apiContext.delete(
      `/api/v1/domains/name/${encodeURIComponent(
        this.responseData?.fullyQualifiedName ?? this.data.name
      )}?recursive=true&hardDelete=true`
    );

    return response.body;
  }
}
