'use client';

import { use } from 'react';
import SourceDetailPage from '../../components/SourceDetailPage';

export default function FederalSourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);

  return (
    <SourceDetailPage
      sourceId={sourceId}
      category="federal"
      backPath="/credentials/federal"
      showPscCodes={true}
      showCategories={false}
    />
  );
}
