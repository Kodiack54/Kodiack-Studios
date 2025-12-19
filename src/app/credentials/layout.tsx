'use client';

import { useContext, useEffect } from 'react';
import { PageTitleContext } from '@/app/layout';

export default function CredentialsLayout({ children }: { children: React.ReactNode }) {
  const setPageTitle = useContext(PageTitleContext);

  useEffect(() => {
    setPageTitle({
      title: 'Credentials & Sources',
      description: 'Manage API keys, logins, and portal configurations across all sources'
    });
  }, [setPageTitle]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {children}
    </div>
  );
}
