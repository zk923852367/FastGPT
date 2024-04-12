var Minio = require('minio');

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

const minioClient = new Minio.Client({
  endPoint: minioServer.minioIp,
  port: minioServer.minioPort,
  useSSL: false,
  accessKey: minioServer.minioAccessKey,
  secretKey: minioServer.minioSecretKey
});

export async function storeFile(
  bucketName: string,
  dirName: string,
  fileName: string,
  filepath: string,
  mimetype: string
): Promise<string> {
  const newFileName = dirName + '/' + `${Date.now()}-${fileName}`;
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await minioClient.bucketExists(bucketName);
      if (!exist) {
        await minioClient.makeBucket(bucketName, 'us-east-1');
      }
      await minioClient.fPutObject(bucketName, newFileName, filepath, {
        'Content-Type': mimetype
      });
      resolve(newFileName);
    } catch (error) {
      reject(error);
    }
  });
}

// Check if storage directory exists, if not create it
export async function createFileUrl(
  bucketName: string,
  dirName: string,
  fileName: string,
  filepath: string,
  mimetype: string
) {
  return new Promise(async (resolve, reject) => {
    try {
      const newFileName = await storeFile(bucketName, dirName, fileName, filepath, mimetype);
      const fileUrl = `${minioServer.minioUrl}/${bucketName}/${newFileName}`;
      resolve(fileUrl);
    } catch (error) {
      reject(error);
    }
  });
}

export async function deleteFile(bucketName: string, fileUrl: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await minioClient.bucketExists(bucketName);
      const [_host, fileName] = fileUrl.split(bucketName + '/');
      if (!exist) {
        reject('bucket 不存在');
      } else {
        await minioClient.removeObject(bucketName, fileName);
        resolve('remove file success');
      }
    } catch (error) {
      resolve('mino serve error');
    }
  });
}
