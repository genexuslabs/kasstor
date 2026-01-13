export const sortByFilePath = <T extends { filePath: string }[]>(
  arrayToSort: T
) => arrayToSort.sort((a, b) => (a.filePath <= b.filePath ? -1 : 0));

