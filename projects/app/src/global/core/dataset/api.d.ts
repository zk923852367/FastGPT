import { PushDatasetDataChunkProps } from '@fastgpt/global/core/dataset/api';
import {
  DatasetSearchModeEnum,
  DatasetTypeEnum,
  TrainingModeEnum
} from '@fastgpt/global/core/dataset/constants';
import {
  DatasetDataIndexItemType,
  ImageItemType,
  SearchDataResponseItemType
} from '@fastgpt/global/core/dataset/type';
import { ModuleInputKeyEnum } from '@fastgpt/global/core/module/constants';

/* ================= dataset ===================== */
export type CreateDatasetParams = {
  parentId?: string;
  type: `${DatasetTypeEnum}`;
  name: string;
  intro: string;
  avatar: string;
  vectorModel?: string;
  agentModel?: string;
};

/* ================= collection ===================== */

/* ================= data ===================== */
export type InsertOneDatasetDataProps = PushDatasetDataChunkProps & {
  image: string;
  collectionId: string;
};

export type UpdateDatasetDataProps = {
  id: string;
  q?: string; // embedding content
  a?: string; // bonus content
  image?: string;
  indexes: (Omit<DatasetDataIndexItemType, 'dataId'> & {
    dataId?: string; // pg data id
  })[];
};

export type GetTrainingQueueProps = {
  vectorModel: string;
  agentModel: string;
};
export type GetTrainingQueueResponse = {
  vectorTrainingCount: number;
  agentTrainingCount: number;
};

/* -------------- search ---------------- */
export type SearchTestProps = {
  datasetId: string;
  text: string;
  [ModuleInputKeyEnum.datasetSimilarity]?: number;
  [ModuleInputKeyEnum.datasetMaxTokens]?: number;
  [ModuleInputKeyEnum.datasetSearchMode]?: `${DatasetSearchModeEnum}`;
  [ModuleInputKeyEnum.datasetSearchUsingReRank]?: boolean;
  [ModuleInputKeyEnum.datasetSearchUsingExtensionQuery]?: boolean;
  [ModuleInputKeyEnum.datasetSearchExtensionModel]?: string;
  [ModuleInputKeyEnum.datasetSearchExtensionBg]?: string;
};
export type SearchTestResponse = {
  list: SearchDataResponseItemType[];
  duration: string;
  limit: number;
  searchMode: `${DatasetSearchModeEnum}`;
  usingReRank: boolean;
  similarity: number;
  usingQueryExtension: boolean;
};

export type ImageResponseType = ImageItemType & {
  image: string;
};
