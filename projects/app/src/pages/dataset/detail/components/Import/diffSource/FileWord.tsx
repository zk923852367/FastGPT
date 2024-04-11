import React, { useEffect, useMemo, useState } from 'react';
import { ImportDataComponentProps } from '@/web/core/dataset/type.d';
import { Box, Button, Flex } from '@chakra-ui/react';
import { ImportSourceItemType } from '@/web/core/dataset/type.d';
import FileSelector, { type SelectFileItemType } from '@/web/core/dataset/components/FileSelector';
import { getFileIcon } from '@fastgpt/global/common/file/icon';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
import { useTranslation } from 'next-i18next';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import MyTooltip from '@/components/MyTooltip';
import { useImportStore } from '../Provider';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useRouter } from 'next/router';
import { TabEnum } from '../../../index';
import dynamic from 'next/dynamic';
import Loading from '@fastgpt/web/components/common/MyLoading';
import { RenderUploadFiles } from '../components/RenderFiles';
import { postWordCollection } from '@/web/core/dataset/api';

const DataProcess = dynamic(() => import('../commonProgress/DataProcess'), {
  loading: () => <Loading fixed={false} />
});
const Upload = dynamic(() => import('../commonProgress/Upload'));

export type PreviewRawTextProps = {
  icon: string;
  title: string;
  rawText: string;
};
const fileType = '.docx';
const maxSelectFileCount = 1;

const FileLocal = ({ activeStep, goToNext }: ImportDataComponentProps) => {
  return (
    <>
      {activeStep === 0 && <SelectFile goToNext={goToNext} />}
      {activeStep === 1 && <DataProcess showPreviewChunks goToNext={goToNext} />}
      {activeStep === 2 && <Upload />}
    </>
  );
};

export default React.memo(FileLocal);

const SelectFile = React.memo(function SelectFile({ goToNext }: { goToNext: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { feConfigs } = useSystemStore();
  const { datasetDetail } = useDatasetStore();
  const { sources, setSources } = useImportStore();
  // @ts-ignore
  const [selectFiles, setSelectFiles] = useState<ImportSourceItemType[]>(sources);
  const successFiles = useMemo(() => selectFiles.filter((item) => !item.errorMsg), [selectFiles]);

  useEffect(() => {
    setSources(successFiles);
  }, [successFiles]);

  const { mutate: onSelectFile, isLoading } = useRequest({
    mutationFn: async (files: SelectFileItemType[]) => {
      {
        for await (const selectFile of files) {
          const { file, folderPath } = selectFile;
          const formData = new FormData();
          formData.append('file', file);
          formData.append('dataset_id', datasetDetail._id);
          const data = await postWordCollection(formData);

          const item: ImportSourceItemType = {
            id: getNanoid(32),
            file,
            rawText: '',
            createStatus: 'finish',
            metadata: {
              'Content-Type': file.type
            },
            uploadedFileRate: 100,
            dbFileId: folderPath,
            sourceName: file.name,
            sourceSize: formatFileSize(file.size),
            icon: getFileIcon(file.name),
            errorMsg: data.insertLen === 0 ? t('common.file.Empty file tip') : ''
          };

          setSelectFiles((state) => {
            const results = [item].concat(state).slice(0, maxSelectFileCount);
            return results;
          });
        }
      }
    }
  });

  return (
    <Box>
      <FileSelector
        isLoading={isLoading}
        fileType={fileType}
        maxCount={maxSelectFileCount}
        maxSize={(feConfigs?.uploadFileMaxSize || 500) * 1024 * 1024}
        onSelectFile={onSelectFile}
      />

      {/* render files */}
      <RenderUploadFiles files={selectFiles} setFiles={setSelectFiles} />

      <Box textAlign={'right'}>
        <Button
          isDisabled={successFiles.length === 0 || isLoading}
          onClick={() =>
            router.replace({
              query: {
                ...router.query,
                currentTab: TabEnum.collectionCard
              }
            })
          }
        >
          {selectFiles.length > 0
            ? `${t('core.dataset.import.Total files', { total: selectFiles.length })} | `
            : ''}
          {t('common.Exit')}
        </Button>
      </Box>
    </Box>
  );
});
