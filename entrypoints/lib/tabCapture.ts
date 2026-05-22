import type { DeepFlowTab } from './types';

export async function captureCurrentTabs(): Promise<DeepFlowTab[]> {
  const tabs = await chrome.tabs.query({});
  return tabs
    .filter((tab) => Boolean(tab.url) && !tab.url?.startsWith('chrome://'))
    .map((tab) => ({
      url: tab.url || '',
      title: tab.title || 'Untitled',
    }));
}

export async function getDefaultSessionTitle(): Promise<string> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.title) {
    return `Quick session ${new Date().toLocaleTimeString()}`;
  }

  return `Working on: ${activeTab.title.slice(0, 60)}${activeTab.title.length > 60 ? '...' : ''}`;
}

export function mergeTabs(primary: DeepFlowTab[], additions: DeepFlowTab[]): DeepFlowTab[] {
  const seen = new Set<string>();
  return [...primary, ...additions].filter((tab) => {
    const key = tab.url.trim();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
