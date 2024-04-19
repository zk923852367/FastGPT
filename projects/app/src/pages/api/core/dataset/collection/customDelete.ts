import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { findCollectionAndChild } from '@fastgpt/service/core/dataset/collection/utils';
import { delCollectionAndRelatedSources } from '@fastgpt/service/core/dataset/collection/controller';
import { authDatasetCollection } from '@fastgpt/service/support/permission/auth/dataset';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    const { id: collectionId } = req.query as { id: string };

    if (!collectionId) {
      throw new Error('CollectionIdId is required');
    }

    const collection = await MongoDatasetCollection.findById(collectionId);

    if (!collection) {
      throw new Error('知识集不存在');
    }
    // find all delete id
    const collections = await findCollectionAndChild({
      teamId: collection.teamId,
      datasetId: collection.datasetId,
      collectionId,
      fields: '_id teamId datasetId fileId metadata'
    });

    // delete
    await mongoSessionRun((session) =>
      delCollectionAndRelatedSources({
        collections,
        session
      })
    );

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
