'use client';

import React, { useState } from 'react';
import { Select, Form } from 'antd';
import { useRouter } from 'next/navigation';

const getSelectedItem = (urlPrefix: string, valueIsNumber = false) => {
  if (!window) {
    return null;
  }
  const [ , value = null] = window.location.pathname.replace(urlPrefix, '').split('/');
  
  if (valueIsNumber) {
    const parsedValue = Number(value);
    return parsedValue || null;
  }
  return value;
  
}

export type SelectionFormItemOptions = {
  value: string | number;
  label?: string;
}

export type SelectionFormItemProps = {
  entityName: string;
  label: string;
  items: SelectionFormItemOptions[];
  urlPrefix: string;
  navigate: boolean;
}
const SelectionFormItem = ({ entityName, label, items, urlPrefix, navigate = true }: SelectionFormItemProps) => {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState(getSelectedItem(urlPrefix, typeof items[0].value === 'number'));
  
  const onChange = (value: string | number) => {
    setSelectedItem(value);
    if (!navigate) {
      return;
    }

    if (value !== null) {
      router.push(`${urlPrefix}/${value}`)  
    } else {
      router.push(urlPrefix)
    }
  }
  return (
    
      <Form.Item label={label}>
        <Select value={selectedItem} onChange={onChange}
          options={[
            { value: null, label: `Please select a ${entityName}` },
            ...items
          ]}
          />
      </Form.Item>
      
  );
};

export default SelectionFormItem;
