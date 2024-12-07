import { v4 as uuidv4 } from 'uuid';

function generateUuid(): string {
  return uuidv4().replace(/-/g, '');
}

