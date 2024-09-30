'use client';
import React, { useState } from "react";
import { Button, Form, Select, Typography } from "antd";
import { useRouter } from "next/navigation";
import { SizeRow } from "@/app/lib/data/queries";

const { Option } = Select;
const { Title } = Typography;

const SizeSelection = ({ sizes = [] }: { sizes: SizeRow[]}) => {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<number>();

  const handleNext = () => {
    router.push(`${window.location.pathname}/${selectedSize}`);
  };

  return (
    <div style={{ padding: "24px", background: "#f7f7f7", borderRadius: "8px" }}>
      <Title level={4}>Select a size</Title>
      <Form layout="vertical">
      
        <Form.Item label="Size">
          <Select value={selectedSize} onChange={(value) => setSelectedSize(value)}>
            {sizes.map(({id, name, description}) => (
              <Option key={id} value={id}>
                {`${name} ${description}`}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Button type="primary" block style={{ marginTop: "16px" }} onClick={handleNext}>
        Next
      </Button>
      </Form>
    </div>
  );
};

export default SizeSelection;
