import { getStatus, getConfig, getTradelines } from '../api';
import TradelineActions from '../components/TradelineActions';
import LogsViewer from '../components/LogsViewer';
import Link from 'next/link';
import TradelineDetail from './components/TradelineDetail';

interface Props {
  params: { tradeline: string };
}

export default async function TradelineDetailPage({ params }: Props) {
  const { tradeline } = params;

  let status: any = null;
  let config: any = null;
  let tradelineInfo: any = null;
  let error: string | null = null;

  try {
    const [statusRes, configRes, tradelinesRes] = await Promise.all([
      getStatus(tradeline).catch(() => null),
      getConfig(tradeline).catch(() => null),
      getTradelines().catch(() => ({ tradelines: [] }))
    ]);

    status = statusRes;
    config = configRes;

    // Find this tradeline's info
    const allTradelines = (tradelinesRes as any).tradelines || [];
    tradelineInfo = allTradelines.find((t: any) => t.name === tradeline);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/servers/tradelines" className="hover:text-white transition-colors">
              Tradeline Servers
            </Link>
            <span>/</span>
            <span className="text-white">{tradelineInfo?.displayName || tradeline}</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">
            {tradelineInfo?.displayName || tradeline}
          </h2>
          <p className="text-gray-400 text-sm">
            {tradeline} - Port {tradelineInfo?.ports?.main || 'N/A'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/servers/tradelines/credentials?tradeline=${tradeline}`}
            className="px-4 py-2 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-semibold hover:bg-purple-500 hover:text-white transition-colors"
          >
            Credentials
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tradeline Detail Component */}
      <TradelineDetail
        tradeline={tradeline}
        tradelineInfo={tradelineInfo}
        status={status}
        config={config}
      />
    </div>
  );
}
