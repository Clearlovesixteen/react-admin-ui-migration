import { useMemo, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import {
  createPageLayoutMenuIndex,
  createPageLayoutMenuSearchItems,
  isPageLayoutMenuSearchMatch,
} from '../utils/menu';
import type { ReactNode } from 'react';
import type { PageLayoutMenuIndex, PageLayoutMenuSearchItem } from '../utils/menu';
import type { PageLayoutMenuItem } from '../types';

type PageLayoutMenuSearchOption = {
  value: string;
  label: ReactNode;
  searchText: string;
};

export type PageLayoutMenuSearchProps = {
  menuItems: PageLayoutMenuItem[];
  menuIndex?: PageLayoutMenuIndex;
  placeholder?: string;
  className?: string;
};

function PageLayoutMenuSearch({
  menuItems,
  menuIndex,
  placeholder = '快捷查找功能',
  className,
}: PageLayoutMenuSearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const resolvedIndex = useMemo(
    () => menuIndex ?? createPageLayoutMenuIndex(menuItems),
    [menuIndex, menuItems],
  );
  const searchItems = useMemo(
    () => createPageLayoutMenuSearchItems(resolvedIndex),
    [resolvedIndex],
  );
  const searchItemByKey = useMemo(
    () => new Map(searchItems.map((item) => [item.key, item])),
    [searchItems],
  );
  const options = useMemo<PageLayoutMenuSearchOption[]>(
    () =>
      searchItems.map((item) => ({
        value: item.key,
        searchText: item.searchText,
        label: (
          <div className="page-layout-menu-search-option">
            <span className="page-layout-menu-search-name">{item.label}</span>
            <span className="page-layout-menu-search-path">{item.fullLabel}</span>
          </div>
        ),
      })),
    [searchItems],
  );

  return (
    <div className={`page-layout-menu-search ${className ?? ''}`}>
      <Select<string, PageLayoutMenuSearchOption>
        showSearch
        value={null}
        searchValue={searchValue}
        placeholder={placeholder}
        defaultActiveFirstOption={false}
        showArrow={false}
        filterOption={(input, option) =>
          isPageLayoutMenuSearchMatch(option?.searchText ?? '', input)
        }
        onSearch={setSearchValue}
        onChange={(key) => {
          setSearchValue('');
          searchItemByKey.get(key)?.onClick();
        }}
        notFoundContent={null}
        bordered={false}
        options={options}
        className="page-layout-menu-search-select"
        popupClassName="page-layout-menu-popup page-layout-menu-search-dropdown"
        aria-label={placeholder}
      />
      <SearchOutlined className="page-layout-menu-search-icon" aria-hidden="true" />
    </div>
  );
}

export type { PageLayoutMenuSearchItem };
export default PageLayoutMenuSearch;
