import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { createFileUrl } from '@fastgpt/service/common/minio';
var fs = require('fs');
const formidable = require('formidable');

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      throw new Error('Method Not Allowed');
    }

    // 解析请求，获取文件
    const form = new formidable.IncomingForm();
    form.parse(
      req,
      async (
        err: any,
        fields: { dataset_id: string },
        files: { image: { filepath: string; originalFilename: string; mimetype: string } }
      ) => {
        const bucket = process.env.MINIO_BUCKET_NAME || 'default';
        // const fileName = `${Date.now()}-${image.originalFilename}`; // 生成文件名
        // const fileStream = fs.createReadStream(image.filepath);
        if (err) {
          jsonRes(res, {
            code: 500,
            error: 'Error parsing form data'
          });
          return;
        }
        const imageUrl = await createFileUrl(
          bucket,
          fields.dataset_id,
          files.image.originalFilename,
          files.image.filepath,
          files.image.mimetype
        );

        jsonRes(res, {
          data: {
            url: imageUrl
          }
        });
      }
    );
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
