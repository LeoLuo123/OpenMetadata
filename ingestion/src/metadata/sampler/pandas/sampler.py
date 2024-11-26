#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
"""
Helper module to handle data sampling
for the profiler
"""
import math
import random
from copy import deepcopy
from typing import List, Optional, cast

from metadata.data_quality.validations.table.pandas.tableRowInsertedCountToBeBetween import (
    TableRowInsertedCountToBeBetweenValidator,
)
from metadata.generated.schema.entity.data.table import (
    PartitionIntervalTypes,
    PartitionProfilerConfig,
    ProfileSampleType,
    TableData,
)
from metadata.mixins.pandas.pandas_mixin import PandasInterfaceMixin
from metadata.sampler.sampler_interface import SamplerInterface
from metadata.utils.constants import COMPLEX_COLUMN_SEPARATOR
from metadata.utils.datalake.datalake_utils import GenericDataFrameColumnParser
from metadata.utils.sqa_like_column import SQALikeColumn


class DatalakeSampler(SamplerInterface, PandasInterfaceMixin):
    """
    Generates a sample of the data to not
    run the query in the whole table.
    """

    def __init__(self, *args, **kwargs):
        """Init the pandas sampler"""
        super().__init__(*args, **kwargs)
        self._table = None
        self.complex_dataframe_sample = deepcopy(self.random_sample(is_sampled=True))

    @property
    def table(self):
        if not self._table:
            self._table = self.return_ometa_dataframes_sampled(
                service_connection_config=self.service_connection_config,
                client=self.client.client,
                table=self.entity,
                profile_sample_config=self.sample_config.profile_sample,
            )
        return self._table

    def get_client(self):
        return self.connection.client

    def _partitioned_table(self):
        """Get partitioned table"""
        self.partition_details = cast(PartitionProfilerConfig, self.partition_details)
        partition_field = self.partition_details.partitionColumnName
        if (
            self.partition_details.partitionIntervalType
            == PartitionIntervalTypes.COLUMN_VALUE
        ):
            return [
                df[df[partition_field].isin(self.partition_details.partitionValues)]
                for df in self.table
            ]
        if (
            self.partition_details.partitionIntervalType
            == PartitionIntervalTypes.INTEGER_RANGE
        ):
            return [
                df[
                    df[partition_field].between(
                        self.partition_details.partitionIntegerRangeStart,
                        self.partition_details.partitionIntegerRangeEnd,
                    )
                ]
                for df in self.table
            ]
        return [
            df[
                df[partition_field]
                >= TableRowInsertedCountToBeBetweenValidator._get_threshold_date(  # pylint: disable=protected-access
                    self.partition_details.partitionIntervalUnit.value,
                    self.partition_details.partitionInterval,
                )
            ]
            for df in self.table
        ]

    def _fetch_sample_data_from_user_query(self) -> TableData:
        """Fetch sample data from user query"""
        cols, rows = self.get_col_row(data_frame=self._rdn_sample_from_user_query())
        return TableData(columns=cols, rows=rows)

    def _rdn_sample_from_user_query(self):
        """Generate sample from user query"""
        return [df.query(self.sample_query) for df in self.table]

    def _get_sampled_dataframe(self):
        """
        returns sampled ometa dataframes
        """
        random.shuffle(self.table)  # we'll shuffle the list of dataframes
        # sampling data based on profiler config (if any)
        if self.sample_config.profile_sample_type == ProfileSampleType.PERCENTAGE:
            try:
                profile_sample = self.sample_config.profile_sample / 100
            except TypeError:
                # if the profile sample is not a number or is None
                # we'll set it to 100
                profile_sample = self.sample_config.profile_sample = 100
            return [
                df.sample(
                    frac=profile_sample,
                    random_state=random.randint(0, 100),
                    replace=True,
                )
                for df in self.table
            ]

        # we'll distribute the sample size equally among the dataframes
        sample_rows_per_chunk: int = math.floor(
            self.sample_config.profile_sample / len(self.table)
        )
        num_rows = sum(len(df) for df in self.table)

        # if we have less rows than the sample size
        # we'll return the whole table
        if sample_rows_per_chunk > num_rows:
            return self.table
        return [
            df.sample(
                n=sample_rows_per_chunk,
                random_state=random.randint(0, 100),
                replace=True,
            )
            for df in self.table
        ]

    def get_col_row(self, data_frame, columns: Optional[List[SQALikeColumn]] = None):
        """
        Fetches columns and rows from the data_frame
        """
        if columns:
            cols = [col.name for col in columns]
        else:
            # we'll use the first dataframe to get the columns
            cols = data_frame[0].columns.tolist()
        rows = []
        # Sample Data should not exceed sample limit
        for chunk in data_frame:
            rows.extend(self._fetch_rows(chunk[cols])[: self.sample_limit])
            if len(rows) >= self.sample_limit:
                break
        return cols, rows

    def random_sample(self, is_sampled: bool = False, **__):
        """Generate random sample from the table

        Returns:
            List[DataFrame]
        """
        if self.sample_query:
            return self._rdn_sample_from_user_query()

        if self.partition_details:
            self._table = self._partitioned_table()

        if not self.sample_config.profile_sample or is_sampled:
            return self.table
        return self._get_sampled_dataframe()

    def _fetch_rows(self, data_frame):
        return data_frame.dropna().values.tolist()

    def fetch_sample_data(
        self, columns: Optional[List[SQALikeColumn]] = None
    ) -> TableData:
        """Fetch sample data from the table

        Returns:
            TableData:
        """
        if self.sample_query:
            return self._fetch_sample_data_from_user_query()

        cols, rows = self.get_col_row(data_frame=self.table, columns=columns)
        return TableData(columns=cols, rows=rows)

    def get_columns(self) -> List[Optional[SQALikeColumn]]:
        """Get SQALikeColumns for datalake to be passed for metric computation"""
        sqalike_columns = []
        if self.complex_dataframe_sample:
            for column_name in self.complex_dataframe_sample[0].columns:
                complex_col_name = None
                if COMPLEX_COLUMN_SEPARATOR in column_name:
                    complex_col_name = ".".join(
                        column_name.split(COMPLEX_COLUMN_SEPARATOR)[1:]
                    )
                    if complex_col_name:
                        for df in self.complex_dataframe_sample:
                            df.rename(
                                columns={column_name: complex_col_name}, inplace=True
                            )
                column_name = complex_col_name or column_name
                sqalike_columns.append(
                    SQALikeColumn(
                        column_name,
                        GenericDataFrameColumnParser.fetch_col_types(
                            self.complex_dataframe_sample[0], column_name
                        ),
                    )
                )
            return sqalike_columns
        return []
