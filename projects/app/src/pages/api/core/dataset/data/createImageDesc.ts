import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';

export type Response = {
  id: string;
  q: string;
  a: string;
  source: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { image, type } = req.body as {
      image: string;
      type: string;
    };
    const response = await fetch(`${process.env.VL_URL}/api/image/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image_url: image, text_content: type })
    });
    const result = await response.json();
    const { success, message, data } = result;
    if (!success) {
      throw new Error(message);
    }
    jsonRes(res, {
      data: {
        ...data
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
