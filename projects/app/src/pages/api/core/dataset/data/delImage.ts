import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { deleteFile } from '@fastgpt/service/common/minio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { image } = req.body as { image: string };
    const bucket = process.env.MINIO_BUCKET_NAME || 'default';
    await deleteFile(bucket, image);
    jsonRes(res, {
      data: {}
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
