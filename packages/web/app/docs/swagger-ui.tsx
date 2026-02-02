'use client';

/**
 * Swagger UI Component
 *
 * Client-side wrapper for swagger-ui-react.
 * Loads the OpenAPI spec from /openapi.json (generated at build time).
 */

import { useEffect, useState } from 'react';
import { Alert, Spin, Typography } from 'antd';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import styles from './docs.module.css';

const { Text, Paragraph } = Typography;

type LoadState = 'loading' | 'success' | 'not-found' | 'error';

export default function SwaggerUIComponent() {
  const [spec, setSpec] = useState<object | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    fetch('/openapi.json')
      .then((res) => {
        if (res.status === 404) {
          setLoadState('not-found');
          return null;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setSpec(data);
          setLoadState('success');
        }
      })
      .catch((err) => {
        setLoadState('error');
        setErrorMessage(err.message);
      });
  }, []);

  if (loadState === 'loading') {
    return (
      <div className={styles.swaggerLoading}>
        <Spin size="large" />
        <div className={styles.swaggerLoadingText}>
          <Text type="secondary">Loading API documentation...</Text>
        </div>
      </div>
    );
  }

  if (loadState === 'not-found') {
    return (
      <Alert
        type="warning"
        message="OpenAPI Specification Not Generated"
        description={
          <div>
            <Paragraph className={styles.swaggerInstructions}>
              The OpenAPI specification file has not been generated yet. This is expected during local development.
            </Paragraph>
            <Paragraph className={styles.swaggerInstructionsFinal}>
              Run the following command to generate it:
            </Paragraph>
            <pre className={styles.swaggerCommandBlock}>
              npm run generate:openapi
            </pre>
            <Paragraph type="secondary" className={styles.swaggerNote}>
              In production, this runs automatically during the build process.
            </Paragraph>
          </div>
        }
        className={styles.swaggerAlert}
      />
    );
  }

  if (loadState === 'error') {
    return (
      <Alert
        type="error"
        message="Failed to Load API Documentation"
        description={`Error: ${errorMessage}`}
        className={styles.swaggerAlert}
      />
    );
  }

  return <SwaggerUI spec={spec ?? undefined} />;
}
