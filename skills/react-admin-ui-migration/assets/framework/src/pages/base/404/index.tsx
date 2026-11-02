import { Button, Result } from 'antd';
import { href } from '@/common/util';

export default () => {
  return (
    <div className="app-page app-flex-center">
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您访问的页面不存在。"
        extra={
          <div className="flex justify-center gap-4">
            <Button
              type="primary"
              onClick={() => {
                href(-1);
              }}
            >
              返回
            </Button>
            <Button
              type="primary"
              onClick={() => {
                href('/');
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
