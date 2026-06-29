'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ResetPasswordForm = dynamic(() => import('./ResetPasswordForm'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function ResetPasswordClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}