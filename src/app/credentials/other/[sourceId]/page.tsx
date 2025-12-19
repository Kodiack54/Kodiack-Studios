'use client';

import { use } from 'react';
import SourceDetailPage from '../../components/SourceDetailPage';

export default function OtherSourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);

  return (
    <SourceDetailPage
      sourceId={sourceId}
      category="other"
      backPath="/credentials/other"
      showPscCodes={false}
      showCategories={false}
    />
  );
}
