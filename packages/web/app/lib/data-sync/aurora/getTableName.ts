import { BoardName } from '../../types';

export const getTableName = (boardName: BoardName, tableName: string) => {
  if (!boardName) {
    throw new Error('Boardname is required, but received falsey');
  }
  switch (boardName) {
    case 'tension':
    case 'kilter':
      return `${boardName}_${tableName}`;
    default:
      return tableName;
  }
};
