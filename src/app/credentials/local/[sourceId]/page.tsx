'use client';

import { use } from 'react';
import SourceDetailPage from '../../components/SourceDetailPage';

export default function LocalSourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);

  return (
    <SourceDetailPage
      sourceId={sourceId}
      category="local"
      backPath="/credentials/local"
      showPscCodes={false}
      showCategories={true}
    />
  );
}
