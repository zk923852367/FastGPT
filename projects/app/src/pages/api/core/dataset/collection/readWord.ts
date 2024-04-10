import { storeFile } from '@fastgpt/service/common/minio';
import { jsonRes } from '@fastgpt/service/common/response';
import { NextApiRequest, NextApiResponse } from 'next';
const formidable = require('formidable');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

export const config = {
  api: {
    bodyParser: false // 不使用默认的 bodyParser，以便自定义处理请求体
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(
      req,
      async (
        err: any,
        fields: { dataset_id: string },
        files: { file: { filepath: string; originalFilename: string; mimetype: string } }
      ) => {
        if (err) {
          throw new Error('Error parsing form data');
        }
        try {
          // 文件存储到minio
          const bucket = process.env.MINIO_BUCKET_NAME || 'default';
          const fileName = await storeFile(
            bucket,
            fields.dataset_id,
            files.file.originalFilename,
            files.file.filepath,
            files.file.mimetype
          );
          // 使用 Axios 发送文件给第三方服务
          const response = await axios.post(`${process.env.LLM_URL}/api/dataset/pushData`, {
            file_name: fileName,
            dataset_id: fields.dataset_id,
            bucket_name: bucket
          });
          const { success, message, data } = response.data;
          // 返回第三方服务的响应给客户端
          if (success) {
            jsonRes(res, {
              data: data
            });
          } else {
            throw new Error(message);
          }
        } catch (err) {
          jsonRes(res, {
            code: 500,
            error: err
          });
        }
      }
    );
  } else {
    jsonRes(res, {
      code: 405,
      error: 'Method Not Allowed'
    });
  }
}
