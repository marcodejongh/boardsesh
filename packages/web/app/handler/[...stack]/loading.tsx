import { Spin, Layout } from 'antd';

export default function Loading() {
  return (
    <Layout style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Spin size="large" />
    </Layout>
  );
}
