import { getHealthAll, getTradelines, getEngineAnalytics } from './api';
import TradelinesClient from './components/TradelinesClient';

export default async function TradelinesPage() {
  let healthAll: any = { success: false, tradelines: {} };
  let tradelines: any[] = [];
  let analytics: any = null;
  let error: string | null = null;

  try {
    const [healthRes, tradelinesRes, analyticsRes] = await Promise.all([
      getHealthAll().catch(() => ({ success: false, tradelines: {} })),
      getTradelines().catch(() => ({ tradelines: [] })),
      getEngineAnalytics().catch(() => ({ success: false, data: null }))
    ]);

    healthAll = healthRes;
    tradelines = (tradelinesRes as any).tradelines || [];
    analytics = analyticsRes?.data || null;
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <TradelinesClient
      tradelines={tradelines}
      healthAll={healthAll}
      analytics={analytics}
      initialError={error}
    />
  );
}
