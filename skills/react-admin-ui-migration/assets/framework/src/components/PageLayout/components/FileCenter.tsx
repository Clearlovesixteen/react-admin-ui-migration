import { useEffect, useRef, useState } from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import { Button, Empty, Input, Pagination, Popover, Spin } from 'antd';
import type { PageLayoutFileItem, PageLayoutFileQuery, PageLayoutFilePage } from '../files';

const DEFAULT_PAGE_SIZE = 10;

function FileCenterIcon() {
  return (
    <svg className="page-layout-platform-trigger-icon" viewBox="0 0 1024 1024" aria-hidden="true">
      <path
        d="M139.776 716.8V307.2c0-65.991 53.476-119.467 119.467-119.467h143.986a62.578 62.578 0 0 1 36.579 11.776l4.438 3.527 102.342 88.747h201.956c65.991 0 119.466 53.532 119.466 119.523V716.8a119.467 119.467 0 0 1-119.466 119.467H259.186A119.467 119.467 0 0 1 139.776 716.8Zm68.21 0a51.2 51.2 0 0 0 51.2 51.2h489.358a51.2 51.2 0 0 0 51.2-51.2V411.307a51.2 51.2 0 0 0-51.2-51.2H544.427a62.578 62.578 0 0 1-40.96-15.303L401.067 256H259.186a51.2 51.2 0 0 0-51.2 51.2v409.6Z"
        fill="currentColor"
      />
      <path
        d="M649.33 591.644a34.133 34.133 0 1 1 0 68.267H512.057a34.133 34.133 0 1 1-.114-68.267H649.33Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** 文件中心展示与交互；项目注入真实加载器，关闭浮层时隔离过期请求。 */
function PageLayoutFileCenter({ loadFiles }: { loadFiles: (query: PageLayoutFileQuery) => Promise<PageLayoutFilePage> }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [files, setFiles] = useState<PageLayoutFileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);
    setError(false);
    loadFiles({
      pageNum,
      pageSize: DEFAULT_PAGE_SIZE,
      keyword: searchKeyword,
    })
      .then((page) => {
        if (!active) return;
        setFiles(page.list);
        setTotal(page.total);
      })
      .catch(() => {
        if (!active) return;
        setFiles([]);
        setTotal(0);
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, pageNum, requestVersion, searchKeyword, loadFiles]);

  const handleSearch = (value: string) => {
    const nextKeyword = value.trim();
    setKeyword(value);
    setPageNum(1);
    setSearchKeyword(nextKeyword);
    setRequestVersion((current) => current + 1);
  };

  const content = (
    <div
      className="page-layout-file-center-content"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }}
    >
      <div className="page-layout-file-center-search">
        <Input.Search
          allowClear
          placeholder="搜索文件名"
          value={keyword}
          onChange={(event) => {
            const value = event.target.value;
            setKeyword(value);
            if (!value) {
              setPageNum(1);
              setSearchKeyword('');
            }
          }}
          onSearch={handleSearch}
        />
      </div>

      <Spin spinning={loading}>
        {error ? (
          <div className="page-layout-platform-empty">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="文件加载失败">
              <Button size="small" onClick={() => setRequestVersion((current) => current + 1)}>
                重试
              </Button>
            </Empty>
          </div>
        ) : files.length > 0 ? (
          <div className="page-layout-file-list">
            {files.map((file) => (
              <div key={file.key} className="page-layout-file-item">
                <div className="page-layout-file-info">
                  <div className="page-layout-file-name" title={file.name}>
                    {file.name}
                  </div>
                  {file.time && <div className="page-layout-file-time">{file.time}</div>}
                </div>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  disabled={!file.url}
                >
                  下载
                </Button>
              </div>
            ))}
          </div>
        ) : !loading ? (
          <div className="page-layout-platform-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={searchKeyword ? '暂无匹配文件' : '暂无文件'}
            />
          </div>
        ) : (
          <div className="page-layout-platform-loading" aria-hidden="true" />
        )}
      </Spin>

      {!error && total > DEFAULT_PAGE_SIZE && (
        <div className="page-layout-file-center-pagination">
          <Pagination
            size="small"
            current={pageNum}
            pageSize={DEFAULT_PAGE_SIZE}
            total={total}
            showSizeChanger={false}
            onChange={setPageNum}
          />
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      overlayClassName="page-layout-file-center-popover"
      overlayInnerStyle={{ padding: 0 }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="page-layout-platform-trigger"
        aria-label="文件中心"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FileCenterIcon />
        <span className="page-layout-platform-trigger-label">文件中心</span>
      </button>
    </Popover>
  );
}

export default PageLayoutFileCenter;
