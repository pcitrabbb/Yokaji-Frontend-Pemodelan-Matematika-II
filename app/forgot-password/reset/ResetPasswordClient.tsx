'use client';

import { useSearchParams } from 'next/navigation';
import ResetPasswordForm from './ResetPasswordForm.tsx';

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') ?? '';

  return <ResetPasswordForm emailFromQuery={emailFromQuery} />;
}