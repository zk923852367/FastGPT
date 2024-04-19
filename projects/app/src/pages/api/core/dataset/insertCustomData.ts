/* 
    Create one dataset collection
*/
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type {
  CreateDatasetCollectionParams,
  PushDatasetDataProps,
  PushDatasetDataResponse
} from '@fastgpt/global/core/dataset/api.d';
import {
  authDataset,
  authDatasetCollection
} from '@fastgpt/service/support/permission/auth/dataset';
import { createOneCollection } from '@fastgpt/service/core/dataset/collection/controller';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { checkDatasetLimit } from '@fastgpt/service/support/permission/teamLimit';
import { predictDataLimitLength } from '@fastgpt/global/core/dataset/utils';
import { pushDataListToTrainingQueue } from '@fastgpt/service/core/dataset/training/controller';
import { getCollectionWithDataset } from '@fastgpt/service/core/dataset/controller';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const body = req.body as CreateDatasetCollectionParams & PushDatasetDataProps;
    const dataset = await MongoDataset.findById(body.datasetId);

    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const { _id } = await createOneCollection({
      ...body,
      teamId: dataset.teamId,
      tmbId: dataset.tmbId
    });

    if (!_id) {
      throw new Error('创建数据集合失败');
    }
    const { data } = body;

    if (!Array.isArray(data)) {
      throw new Error('data is empty');
    }

    if (data.length > 200) {
      throw new Error('Data is too long, max 200');
    }

    const collection = await getCollectionWithDataset(_id);

    // auth dataset limit
    await checkDatasetLimit({
      teamId: dataset.teamId,
      insertLen: predictDataLimitLength(collection.trainingType, data)
    });

    jsonRes<PushDatasetDataResponse>(res, {
      data: await pushDataListToTrainingQueue({
        ...body,
        collectionId: collection._id,
        teamId: dataset.teamId,
        tmbId: dataset.tmbId,
        datasetId: body.datasetId,
        agentModel: collection.datasetId.agentModel,
        vectorModel: collection.datasetId.vectorModel
      })
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
