import { GET, POST, PUT } from '@/web/common/api/request';
import type { PagingData, RequestPaging } from '@/types';
import type { UserInformSchema } from '@fastgpt/global/support/user/inform/type';

export const getInforms = (data: RequestPaging) =>
  POST<PagingData<UserInformSchema>>(`/support/user/inform/list`, data);

export const getUnreadCount = () => GET<number>(`/support/user/inform/countUnread`);
export const readInform = (id: string) => GET(`/support/user/inform/read`, { id });
