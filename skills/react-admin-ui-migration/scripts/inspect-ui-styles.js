/**
 * 在目标浏览器的只读 evaluate/控制台执行整段表达式，返回当前已挂载控件的检查结果。
 * 不发请求、不修改 DOM/业务状态；not-mounted 表示还需打开相应控件后再验。
 */
(() => {
  const checks = [];
  function check(name, selector, predicate) {
    const elements = [...document.querySelectorAll(selector)].filter((element) => element.getBoundingClientRect().height > 0);
    if (!elements.length) {
      checks.push({ name, status: 'not-mounted' });
      return;
    }
    checks.push({ name, status: elements.every((element) => predicate(element, getComputedStyle(element))) ? 'pass' : 'fail', elements: elements.length });
  }
  check('table-width', '.base-table .ant-table table', (element) => element.getBoundingClientRect().width >= element.parentElement.getBoundingClientRect().width - 2);
  check('table-header-spacing', '.base-table .ant-table-thead th', (_element, style) => +style.paddingLeft.replace('px', '') >= 8);
  check('cascader-menu', '.ant-cascader-menu', (_element, style) => style.listStyleType === 'none' && /auto|scroll/.test(style.overflowY));
  check('number-input', '.ant-input-number', (element, style) => style.display === 'inline-block' && (element.classList.contains('ant-input-number-borderless') || +style.borderTopWidth.replace('px', '') > 0));
  // 分页可能是 flex item，计算后的 display 会由 inline-block 变为 block。
  check('pagination', '.ant-pagination-item', (element, style) => style.listStyleType === 'none' && element.getBoundingClientRect().width >= 20 && element.getBoundingClientRect().height >= 20);
  check('modal', '.ant-modal', (_element, style) => style.position === 'relative');
  check('drawer', '.ant-drawer', (_element, style) => style.position === 'fixed');
  const mounted = checks.filter((item) => item.status !== 'not-mounted');
  return {
    verdict: !mounted.length ? 'unverified' : mounted.some((item) => item.status === 'fail') ? 'fail' : 'pass',
    checks,
    // 只验证样式结构，不能替代主题比对、业务交互和滚动可达性验收。
    scope: 'mounted-component-styles',
  };
})()
