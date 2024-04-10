import type { UserModelSchema } from '../type';
import type { TeamMemberRoleEnum, TeamMemberStatusEnum } from './constant';
import { LafAccountType } from './type';

export type TeamSchema = {
  _id: string;
  name: string;
  ownerId: string;
  avatar: string;
  createTime: Date;
  balance: number;
  maxSize: number;
  teamDomain: string;
  limit: {
    lastExportDatasetTime: Date;
    lastWebsiteSyncTime: Date;
  };
  lafAccount: LafAccountType;
};
export type tagsType = {
  label: string;
  key: string;
};
export type TeamTagSchema = TeamTagItemType & {
  _id: string;
  teamId: string;
  createTime: Date;
};

export type TeamMemberSchema = {
  _id: string;
  teamId: string;
  userId: string;
  createTime: Date;
  name: string;
  avatar: string;
  role: `${TeamMemberRoleEnum}`;
  status: `${TeamMemberStatusEnum}`;
  defaultTeam: boolean;
};

export type TeamMemberWithUserSchema = Omit<TeamMemberSchema, 'userId'> & {
  userId: UserModelSchema;
};
export type TeamMemberWithTeamSchema = Omit<TeamMemberSchema, 'teamId'> & {
  teamId: TeamSchema;
};
export type TeamMemberWithTeamAndUserSchema = Omit<TeamMemberWithTeamSchema, 'userId'> & {
  userId: UserModelSchema;
};

export type TeamItemType = {
  userId: string;
  teamId: string;
  teamName: string;
  memberName: string;
  avatar: string;
  balance: number;
  tmbId: string;
  maxSize: number;
  teamDomain: string;
  defaultTeam: boolean;
  role: `${TeamMemberRoleEnum}`;
  status: `${TeamMemberStatusEnum}`;
  canWrite: boolean;
  lafAccount?: LafAccountType;
};

export type TeamMemberItemType = {
  userId: string;
  tmbId: string;
  teamId: string;
  memberName: string;
  avatar: string;
  role: `${TeamMemberRoleEnum}`;
  status: `${TeamMemberStatusEnum}`;
};

export type TeamTagItemType = {
  label: string;
  key: string;
};

export type InviteResponseType = {
  userId: string;
  username: string;
};

export type InviteTeamMemberItemType = {
  userId?: string;
  teamId: string;
  name: string;
  avatar?: string;
  username: string;
  role: `${TeamMemberRoleEnum}`;
  status: `${TeamMemberStatusEnum}`;
  createTime: Date;
  defaultTeam: boolean;
};
export type LafAccountType = {
  token: string;
  appid: string;
  pat: string;
};
