'use client';

/**
 * Swagger UI Component
 *
 * Client-side wrapper for swagger-ui-react.
 * Loads the OpenAPI spec from /api/docs/openapi and renders interactive documentation.
 */

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function SwaggerUIComponent() {
  const [spec, setSpec] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/docs/openapi')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load API specification');
        return res.json();
      })
      .then(setSpec)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#dc3545' }}>
        Error loading API documentation: {error}
      </div>
    );
  }

  if (!spec) {
    return (
      <div style={{ padding: '20px', color: '#666' }}>
        Loading API documentation...
      </div>
    );
  }

  return <SwaggerUI spec={spec} />;
}
