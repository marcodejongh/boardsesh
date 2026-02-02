import { Metadata } from 'next';
import DocsClientPage from './docs-client';

export const metadata: Metadata = {
  title: 'API Documentation | Boardsesh',
  description: 'REST and WebSocket API documentation for Boardsesh - interactive climbing training board integration',
};

export default function DocsPage() {
  return <DocsClientPage />;
}
