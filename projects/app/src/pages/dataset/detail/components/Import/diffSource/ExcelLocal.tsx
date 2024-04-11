import React, { useEffect, useMemo, useState } from 'react';
import { ImportDataComponentProps } from '@/web/core/dataset/type.d';
import { Box, Button, Flex } from '@chakra-ui/react';
import { ImportSourceItemType } from '@/web/core/dataset/type.d';
import FileSelector, { type SelectFileItemType } from '@/web/core/dataset/components/FileSelector';
import { getFileIcon } from '@fastgpt/global/common/file/icon';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
import { useTranslation } from 'next-i18next';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { useImportStore } from '../Provider';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useRouter } from 'next/router';
import { TabEnum } from '../../../index';
import { postExcelCollection } from '@/web/core/dataset/api';
import { RenderUploadFiles } from '../components/RenderFiles';

const fileType = '.xlsx';
const maxSelectFileCount = 1;

const FileLocal = ({ activeStep, goToNext }: ImportDataComponentProps) => {
  return <>{activeStep === 0 && <SelectFile goToNext={goToNext} />}</>;
};

export default React.memo(FileLocal);

// const csvTemplate = `index,content
// "必填内容","可选内容。CSV 中请注意内容不能包含双引号，双引号是列分割符号"
// "结合人工智能的演进历程,AIGC的发展大致可以分为三个阶段，即:早期萌芽阶段(20世纪50年代至90年代中期)、沉淀积累阶段(20世纪90年代中期至21世纪10年代中期),以及快速发展展阶段(21世纪10年代中期至今)。",""
// "AIGC发展分为几个阶段？","早期萌芽阶段(20世纪50年代至90年代中期)、沉淀积累阶段(20世纪90年代中期至21世纪10年代中期)、快速发展展阶段(21世纪10年代中期至今)"`;

const SelectFile = React.memo(function SelectFile({ goToNext }: { goToNext: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { feConfigs } = useSystemStore();
  const { datasetDetail } = useDatasetStore();
  const { sources, setSources } = useImportStore();
  // @ts-ignore
  const [selectFiles, setSelectFiles] = useState<FileItemType[]>(sources);
  const successFiles = useMemo(() => selectFiles.filter((item) => !item.errorMsg), [selectFiles]);
  useEffect(() => {
    setSources(successFiles);
  }, [successFiles]);

  const { mutate: onSelectFile, isLoading } = useRequest({
    mutationFn: async (files: SelectFileItemType[]) => {
      for await (const selectFile of files) {
        const { file, folderPath } = selectFile;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('dataset_id', datasetDetail._id);
        const data = await postExcelCollection(formData);
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
          const results = [item].concat(state).slice(0, 10);
          return results;
        });
      }
    },
    errorToast: t('common.file.Select failed')
  });

  return (
    <Box>
      <FileSelector
        maxCount={maxSelectFileCount}
        maxSize={(feConfigs?.uploadFileMaxSize || 500) * 1024 * 1024}
        isLoading={isLoading}
        fileType={fileType}
        onSelectFile={onSelectFile}
      />

      {/* <Box
        mt={4}
        color={'primary.600'}
        textDecoration={'underline'}
        cursor={'pointer'}
        onClick={() =>
          fileDownload({
            text: csvTemplate,
            type: 'text/csv;charset=utf-8',
            filename: 'template.csv'
          })
        }
      >
        {t('core.dataset.import.Down load csv template')}
      </Box> */}

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
