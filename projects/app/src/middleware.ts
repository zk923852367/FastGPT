import { MINIO_BASE_URL } from '@fastgpt/global/core/dataset/constants';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APM_BASE_URL = '/api/proxy/apm';

const APM_API_URL: string = process.env.ELASTIC_APM_SERVER_URL || '';
const MINIO_API_URL: string = process.env.MINIO_URL || '';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  let server_url = '';
  let suffix_path = '';
  let matchPath: string[] = [];
  if (request.nextUrl.pathname.startsWith(APM_BASE_URL)) {
    server_url = APM_API_URL;
    const regex = new RegExp(`${APM_BASE_URL}/(.*)`); // 匹配 /api/proxy/apm/ 后的任意字符
    matchPath = request.url.match(regex) || [];
  }
  if (request.nextUrl.pathname.startsWith(MINIO_BASE_URL)) {
    server_url = MINIO_API_URL;
    const regex = new RegExp(`${MINIO_BASE_URL}/(.*)`); // 匹配 /api/proxy/apm/ 后的任意字符
    matchPath = request.url.match(regex) || [];
  }
  if (matchPath) {
    suffix_path = matchPath[1]; // 提取匹配的部分
  } else {
    console.log('未找到匹配的部分');
  }
  return NextResponse.rewrite(new URL(`${server_url}/${suffix_path}`, request.url));
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/api/proxy/apm/:path*', '/api/minio/:path*']
};
