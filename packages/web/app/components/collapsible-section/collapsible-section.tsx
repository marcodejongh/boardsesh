'use client';

import React, { useState } from 'react';
import styles from './collapsible-section.module.css';

export interface CollapsibleSectionConfig {
  key: string;
  label: string;
  title: string;
  defaultSummary: string;
  getSummary: () => string[];
  content: React.ReactNode;
  /** When true, content is only mounted while this section is the active one. */
  lazy?: boolean;
  /** When true, this section should be the initially active one (overrides defaultActiveKey). */
  defaultActive?: boolean;
}

interface CollapsibleSectionProps {
  sections: CollapsibleSectionConfig[];
  defaultActiveKey?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  sections,
  defaultActiveKey,
}) => {
  const sectionDefaultActive = sections.find((s) => s.defaultActive);
  const [activeKey, setActiveKey] = useState<string | null>(
    sectionDefaultActive?.key ?? defaultActiveKey ?? null,
  );

  return (
    <div className={styles.steppedContainer}>
      {sections.map((section) => {
        const isActive = activeKey === section.key;
        const summaryParts = section.getSummary();
        const summaryText = summaryParts.length > 0
          ? summaryParts.join(' \u00B7 ')
          : section.defaultSummary;

        const shouldRenderContent = section.lazy ? isActive : true;

        return (
          <div
            key={section.key}
            className={`${styles.sectionCard} ${isActive ? styles.sectionCardActive : ''}`}
            {...(!isActive ? { onClick: () => setActiveKey(section.key) } : {})}
          >
            <div className={`${styles.collapsedRow} ${isActive ? styles.collapsedRowActive : ''}`}>
              <span className={styles.collapsedLabel}>{isActive ? section.title : section.label}</span>
              <span className={`${styles.collapsedSummary} ${isActive ? styles.collapsedSummaryHidden : ''}`}>
                {summaryText}
              </span>
            </div>
            <div className={`${styles.expandableContent} ${isActive ? styles.expandableContentOpen : ''}`}>
              <div className={styles.expandableInner}>
                <div className={styles.expandableInnerPadding}>
                  {shouldRenderContent ? section.content : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CollapsibleSection;
