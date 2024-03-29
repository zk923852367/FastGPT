import formidable, { File } from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
var Minio = require('minio');
var fs = require('fs');

interface CustomFile {
  filepath: string;
  originalFilename: string;
  size: number;
  mimetype: string;
}

function extractIPAndPort() {
  let minioIp = '';
  let minioPort = 9000;
  let minioUrl = process.env.MINIO_URL;
  if (minioUrl) {
    const url = new URL(minioUrl);
    minioIp = url.hostname;
    minioPort = Number(url.port);
  }
  return {
    minioIp,
    minioPort,
    minioUrl,
    minioAccessKey: process.env.MINIO_ACCESS_KEY,
    minioSecretKey: process.env.MINIO_SECRET_KEY
  };
}

const minioServer = extractIPAndPort();

const client = new Minio.Client({
  endPoint: minioServer.minioIp,
  port: minioServer.minioPort,
  useSSL: false,
  accessKey: minioServer.minioAccessKey,
  secretKey: minioServer.minioSecretKey
});

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    // 解析请求，获取文件
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      const bucket = process.env.MINIO_BUCKET_NAME || 'default';
      const image = files.image as CustomFile;
      const fileName = `${Date.now()}-${image.originalFilename}`; // 生成文件名
      const fileStream = fs.createReadStream(image.filepath);
      const metaData = {
        'Content-Type': image.mimetype // 设置图片的类型，如jpeg、png等
      };
      // 上传文件到MinIO
      await client.putObject(
        'fastgpt', // 桶名
        fileName, // 文件名
        fileStream,
        image.size,
        metaData
      );
      await client.getObject(bucket, fileName);
      jsonRes(res, {
        data: {
          url: `${minioServer.minioUrl}/${bucket}/${fileName}`
        }
      });
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: 'Error uploading file'
    });
  }
}
