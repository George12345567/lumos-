import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TABS, type TabId } from '../constants';

const VALID_IDS = new Set<TabId>(TABS.map((t) => t.id));

function parseTab(value: string | null): TabId {
  if (value && VALID_IDS.has(value as TabId)) return value as TabId;
  return 'overview';
}

export function useProfileTab() {
  const [params, setParams] = useSearchParams();
  const [tab, setTabState] = useState<TabId>(() => parseTab(params.get('tab')));

  useEffect(() => {
    setTabState(parseTab(params.get('tab')));
  }, [params]);

  const setTab = useCallback((next: TabId) => {
    setTabState(next);
    const merged = new URLSearchParams(params);
    if (next === 'overview') merged.delete('tab');
    else merged.set('tab', next);
    setParams(merged, { replace: true });
  }, [params, setParams]);

  return { tab, setTab };
}
