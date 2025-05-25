import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from 'app/redux/store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
// Ref: https://redux-toolkit.js.org/usage/usage-with-typescript#getting-the-dispatch-type
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
