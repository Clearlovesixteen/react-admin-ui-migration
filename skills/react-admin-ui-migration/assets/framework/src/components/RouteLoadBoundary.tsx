import { Component } from 'react';
import { BaseButton } from '@gancao-web/base-element-react';
import { Result } from 'antd';
import type { ReactNode } from 'react';

/** 路由子树的错误边界：处理懒加载拒绝和渲染异常，不推断具体 HTTP 状态。 */
export default class RouteLoadBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section role="alert">
          <Result
            status="warning"
            title="页面暂时无法显示"
            subTitle="页面加载或运行时发生异常，请重新加载后重试。"
            extra={
              <>
                <BaseButton type="primary" onClick={() => window.location.reload()}>
                  重新加载
                </BaseButton>
              </>
            }
          />
        </section>
      );
    }
    return this.props.children;
  }
}
