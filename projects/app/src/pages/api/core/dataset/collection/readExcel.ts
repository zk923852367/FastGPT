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
        files: { file: { filepath: string; originalFilename: string } }
      ) => {
        if (err) {
          jsonRes(res, {
            code: 500,
            error: 'Error parsing form data'
          });
          return;
        }
        try {
          // 构建 FormData 对象，用于传递文件给第三方服务
          const formData = new FormData();
          formData.append('file', fs.createReadStream(files.file.filepath), {
            filename: files.file.originalFilename
          });
          formData.append('dataset_id', fields.dataset_id);
          // 使用 Axios 发送文件给第三方服务
          const response = await axios.post(
            `${process.env.LLM_URL}/api/excel/process_excel`,
            formData,
            {
              headers: {
                formData: formData.getHeaders()
              }
            }
          );
          const { success, message, data } = response.data;
          // 返回第三方服务的响应给客户端
          if (success) {
            jsonRes(res, {
              data: data
            });
          } else {
            jsonRes(res, {
              code: 500,
              error: message
            });
          }
        } catch (error) {
          jsonRes(res, {
            code: 500,
            error: 'Error uploading file to llm-server'
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
