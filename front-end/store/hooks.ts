/** Redux의 store를 제공하는 컴포넌트 */
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '.';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();