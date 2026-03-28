/** Redux의 store를 제공하는 컴포넌트 */
"use client";

import { store } from '@/store';
import { Provider } from 'react-redux';

export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider store={store}>{children}</Provider>;
}