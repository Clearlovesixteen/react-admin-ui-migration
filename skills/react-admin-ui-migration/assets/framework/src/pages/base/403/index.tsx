import { Button, Result } from 'antd';
import { href } from '@/common/util';
import { reLogin } from '@/hooks/useStoreUser';

export default () => {
  return (
    <div className="app-page app-flex-center">
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您无权访问此页面。"
        extra={
          <div className="flex justify-center gap-4">
            <Button
              type="primary"
              onClick={() => {
                href(-2); // 返回两级
              }}
            >
              返回
            </Button>
            <Button
              type="primary"
              onClick={() => {
                reLogin();
              }}
            >
              首页
            </Button>
          </div>
        }
      />
    </div>
  );
};
