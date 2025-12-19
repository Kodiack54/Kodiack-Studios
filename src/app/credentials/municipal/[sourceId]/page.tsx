'use client';

import { use } from 'react';
import SourceDetailPage from '../../components/SourceDetailPage';

export default function MunicipalSourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);

  return (
    <SourceDetailPage
      sourceId={sourceId}
      category="municipal"
      backPath="/credentials/municipal"
      showPscCodes={false}
      showCategories={false}
    />
  );
}
