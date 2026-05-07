import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TABS, TAB_ALIASES, type TabId } from '../constants';

const VALID_IDS = new Set<TabId>(TABS.map((t) => t.id));

function parseTab(value: string | null): TabId {
  if (!value) return 'overview';
  if (VALID_IDS.has(value as TabId)) return value as TabId;
  // Fold legacy ids like ?tab=orders / ?tab=library / ?tab=brand onto the new tabs.
  const aliased = TAB_ALIASES[value];
  if (aliased) return aliased;
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
