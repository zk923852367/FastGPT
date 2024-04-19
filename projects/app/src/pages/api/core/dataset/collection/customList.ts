import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { DatasetTrainingCollectionName } from '@fastgpt/service/core/dataset/training/schema';
import { Types } from '@fastgpt/service/common/mongo';
import type { DatasetCollectionsListItemType } from '@/global/core/dataset/type.d';
import type { GetDatasetCollectionsProps } from '@/global/core/api/datasetReq';
import { PagingData } from '@/types';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { DatasetCollectionTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { authDataset } from '@fastgpt/service/support/permission/auth/dataset';
import { DatasetDataCollectionName } from '@fastgpt/service/core/dataset/data/schema';
import { startTrainingQueue } from '@/service/core/dataset/training/utils';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    let {
      pageNum = 1,
      pageSize = 10,
      datasetId,
      parentId = null,
      searchText = '',
      selectFolder = false,
      simple = false
    } = req.body as GetDatasetCollectionsProps;
    searchText = searchText?.replace(/'/g, '');
    pageSize = Math.min(pageSize, 30);
    debugger;
    const dataset = await MongoDataset.findById(datasetId);

    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const match = {
      teamId: new Types.ObjectId(dataset.teamId),
      datasetId: new Types.ObjectId(datasetId),
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      ...(selectFolder ? { type: DatasetCollectionTypeEnum.folder } : {}),
      ...(searchText
        ? {
            name: new RegExp(searchText, 'i')
          }
        : {})
    };

    // not count data amount
    if (simple) {
      const collections = await MongoDatasetCollection.find(match, '_id parentId type name')
        .sort({
          updateTime: -1
        })
        .lean();
      return jsonRes<PagingData<DatasetCollectionsListItemType>>(res, {
        data: {
          pageNum,
          pageSize,
          data: await Promise.all(
            collections.map(async (item) => ({
              ...item,
              dataAmount: 0,
              trainingAmount: 0,
              canWrite: true // admin or team owner can write
            }))
          ),
          total: await MongoDatasetCollection.countDocuments(match)
        }
      });
    }

    const [collections, total]: [DatasetCollectionsListItemType[], number] = await Promise.all([
      MongoDatasetCollection.aggregate([
        {
          $match: match
        },
        {
          $sort: { updateTime: -1 }
        },
        {
          $skip: (pageNum - 1) * pageSize
        },
        {
          $limit: pageSize
        },
        // count training data
        {
          $lookup: {
            from: DatasetTrainingCollectionName,
            let: { id: '$_id', team_id: match.teamId, dataset_id: match.datasetId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$teamId', '$$team_id'] }, { $eq: ['$collectionId', '$$id'] }]
                  }
                }
              },
              { $count: 'count' }
            ],
            as: 'trainingCount'
          }
        },
        // count collection total data
        {
          $lookup: {
            from: DatasetDataCollectionName,
            let: { id: '$_id', team_id: match.teamId, dataset_id: match.datasetId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$teamId', '$$team_id'] },
                      { $eq: ['$datasetId', '$$dataset_id'] },
                      { $eq: ['$collectionId', '$$id'] }
                    ]
                  }
                }
              },
              { $count: 'count' }
            ],
            as: 'dataCount'
          }
        },
        {
          $project: {
            _id: 1,
            parentId: 1,
            tmbId: 1,
            name: 1,
            type: 1,
            status: 1,
            updateTime: 1,
            fileId: 1,
            rawLink: 1,
            dataAmount: {
              $ifNull: [{ $arrayElemAt: ['$dataCount.count', 0] }, 0]
            },
            trainingAmount: {
              $ifNull: [{ $arrayElemAt: ['$trainingCount.count', 0] }, 0]
            }
          }
        }
      ]),
      MongoDatasetCollection.countDocuments(match)
    ]);

    const data = await Promise.all(
      collections.map(async (item, i) => ({
        ...item,
        canWrite: String(item.tmbId) === dataset.tmbId
      }))
    );

    if (data.find((item) => item.trainingAmount > 0)) {
      startTrainingQueue();
    }

    // count collections
    jsonRes<PagingData<DatasetCollectionsListItemType>>(res, {
      data: {
        pageNum,
        pageSize,
        data,
        total
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
