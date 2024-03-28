import { delay } from '@fastgpt/global/common/system/utils';
import { MongoDatasetTraining } from './schema';
import type {
  PushDatasetDataChunkProps,
  PushDatasetDataProps,
  PushDatasetDataResponse
} from '@fastgpt/global/core/dataset/api.d';
import { getCollectionWithDataset } from '../controller';
import { TrainingModeEnum } from '@fastgpt/global/core/dataset/constants';
import { simpleText } from '@fastgpt/global/common/string/tools';
import { countPromptTokens } from '@fastgpt/global/common/string/tiktoken';

export const lockTrainingDataByTeamId = async (teamId: string): Promise<any> => {
  try {
    await MongoDatasetTraining.updateMany(
      {
        teamId
      },
      {
        lockTime: new Date('2999/5/5')
      }
    );
  } catch (error) {}
};

export async function pushDataListToTrainingQueue({
  teamId,
  tmbId,
  collectionId,
  data,
  prompt,
  billId,
  trainingMode = TrainingModeEnum.chunk
}: {
  teamId: string;
  tmbId: string;
} & PushDatasetDataProps): Promise<PushDatasetDataResponse> {
  const vectorModelList = global.vectorModels;
  const datasetModelList = global.llmModels;

  const {
    datasetId: { _id: datasetId, vectorModel, agentModel }
  } = await getCollectionWithDataset(collectionId);

  const checkModelValid = async () => {
    const agentModelData = datasetModelList?.find((item) => item.model === agentModel);
    if (!agentModelData) {
      return Promise.reject(`File model ${agentModel} is inValid`);
    }
    const vectorModelData = vectorModelList?.find((item) => item.model === vectorModel);
    if (!vectorModelData) {
      return Promise.reject(`Vector model ${vectorModel} is inValid`);
    }

    if (trainingMode === TrainingModeEnum.chunk) {
      return {
        maxToken: vectorModelData.maxToken * 1.3,
        model: vectorModelData.model,
        weight: vectorModelData.weight
      };
    }

    if (trainingMode === TrainingModeEnum.qa || trainingMode === TrainingModeEnum.auto) {
      return {
        maxToken: agentModelData.maxContext * 0.8,
        model: agentModelData.model,
        weight: 0
      };
    }

    return Promise.reject(`Training mode "${trainingMode}" is inValid`);
  };

  const { model, maxToken, weight } = await checkModelValid();

  // format q and a, remove empty char
  data.forEach((item) => {
    item.q = simpleText(item.q);
    item.a = simpleText(item.a);

    item.indexes = item.indexes
      ?.map((index) => {
        return {
          ...index,
          text: simpleText(index.text)
        };
      })
      .filter(Boolean);
  });

  // filter repeat or equal content
  const set = new Set();
  const filterResult: Record<string, PushDatasetDataChunkProps[]> = {
    success: [],
    overToken: [],
    repeat: [],
    error: []
  };

  // filter repeat content
  data.forEach((item) => {
    if (!item.q) {
      filterResult.error.push(item);
      return;
    }

    const text = item.q + item.a;

    // count q token
    const token = countPromptTokens(item.q);

    if (token > maxToken) {
      filterResult.overToken.push(item);
      return;
    }

    if (set.has(text)) {
      console.log('repeat', item);
      filterResult.repeat.push(item);
    } else {
      filterResult.success.push(item);
      set.add(text);
    }
  });

  // insert data to db
  const insertData = async (dataList: PushDatasetDataChunkProps[], retry = 3): Promise<number> => {
    try {
      const results = await MongoDatasetTraining.insertMany(
        dataList.map((item, i) => ({
          teamId,
          tmbId,
          datasetId,
          collectionId,
          billId,
          mode: trainingMode,
          prompt,
          model,
          q: item.q,
          a: item.a,
          chunkIndex: item.chunkIndex ?? 0,
          weight: weight ?? 0,
          indexes: item.indexes
        }))
      );
      await delay(500);
      return results.length;
    } catch (error) {
      if (retry > 0) {
        await delay(500);
        return insertData(dataList, retry - 1);
      }
      return Promise.reject(error);
    }
  };

  let insertLen = 0;
  const chunkSize = 50;
  const chunkList = filterResult.success.reduce(
    (acc, cur) => {
      const lastChunk = acc[acc.length - 1];
      if (lastChunk.length < chunkSize) {
        lastChunk.push(cur);
      } else {
        acc.push([cur]);
      }
      return acc;
    },
    [[]] as PushDatasetDataChunkProps[][]
  );
  for await (const chunks of chunkList) {
    insertLen += await insertData(chunks);
  }

  delete filterResult.success;

  return {
    insertLen,
    ...filterResult
  };
}
