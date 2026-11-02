import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Button, Empty, Input, Popover, Spin, Tooltip } from 'antd';
import PageLayoutMenuIcon from './MenuIcon';
import type { PageLayoutApplicationItem } from '../utils/applications';

export type PageLayoutApplicationPanelProps = {
  loadApplications: () => Promise<PageLayoutApplicationItem[]>;
};

type LoadState = 'idle' | 'loading' | 'success' | 'error';

/** 应用展示与交互；鉴权、接口和响应适配由目标项目注入。 */
function PageLayoutApplicationPanel({ loadApplications }: PageLayoutApplicationPanelProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [applications, setApplications] = useState<PageLayoutApplicationItem[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!open || hasLoaded) return;

    let active = true;
    setLoadState('loading');
    Promise.resolve().then(loadApplications)
      .then((list) => {
        if (!active) return;
        setApplications(list);
        setLoadState('success');
        setHasLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setApplications([]);
        setLoadState('error');
        setHasLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [hasLoaded, open, loadApplications]);

  useEffect(() => {
    if (!open) setSearchText('');
  }, [open]);

  const filteredApplications = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase();
    if (!keyword) return applications;
    return applications.filter((application) =>
      application.name.toLocaleLowerCase().includes(keyword),
    );
  }, [applications, searchText]);

  const content = (
    <div
      className="page-layout-application-content"
      role="dialog"
      aria-label="我的应用"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }}
    >
      <div className="page-layout-application-search">
        <Input
          allowClear
          className="page-layout-application-search-input"
          placeholder="搜索应用"
          aria-label="搜索应用"
          prefix={<SearchOutlined aria-hidden="true" />}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </div>

      <Spin spinning={loadState === 'idle' || loadState === 'loading'}>
        {loadState === 'error' ? (
          <div className="page-layout-platform-empty">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="应用加载失败">
              <Button
                size="small"
                onClick={() => {
                  setLoadState('idle');
                  setHasLoaded(false);
                }}
              >
                重试
              </Button>
            </Empty>
          </div>
        ) : loadState === 'success' && filteredApplications.length > 0 ? (
          <div className="page-layout-application-grid">
            {filteredApplications.map((application) => (
              <Tooltip
                key={application.key}
                title={application.name}
                placement="bottom"
                mouseEnterDelay={0.3}
              >
                <a
                  className="page-layout-application-card"
                  href={application.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => setOpen(false)}
                >
                  <span className="page-layout-application-card-icon-wrapper">
                    {application.icon ? (
                      <img
                        src={application.icon}
                        alt=""
                        className="page-layout-application-card-icon"
                      />
                    ) : (
                      <PageLayoutMenuIcon name="gc-quanbuyingyong"
                        className="page-layout-application-card-icon-fallback"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="page-layout-application-card-label">{application.name}</span>
                </a>
              </Tooltip>
            ))}
          </div>
        ) : loadState === 'success' ? (
          <div className="page-layout-platform-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={searchText.trim() ? '未找到相关应用' : '暂无应用'}
            />
          </div>
        ) : (
          <div className="page-layout-platform-loading" role="status">加载应用…</div>
        )}
      </Spin>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      overlayClassName="page-layout-application-popover"
      overlayInnerStyle={{ padding: 0 }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="page-layout-platform-trigger"
        aria-label="我的应用"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <PageLayoutMenuIcon name="gc-quanbuyingyong" className="page-layout-platform-trigger-icon" aria-hidden="true" />
        <span className="page-layout-platform-trigger-label">我的应用</span>
      </button>
    </Popover>
  );
}

export default PageLayoutApplicationPanel;
