'use client';

import { use } from 'react';
import SourceDetailPage from '../../components/SourceDetailPage';

export default function StateSourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);

  return (
    <SourceDetailPage
      sourceId={sourceId}
      category="state"
      backPath="/credentials/state"
      showPscCodes={false}
      showCategories={false}
    />
  );
}
