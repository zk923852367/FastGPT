export type PathDataType = {
  name: string;
  description: string;
  method: string;
  path: string;
  params: any[];
  request: any;
};

export type OpenApiJsonSchema = {
  pathData: PathDataType[];
  serverPath: string;
};
