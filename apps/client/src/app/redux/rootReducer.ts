import { combineReducers } from '@reduxjs/toolkit';
import { apiSlice } from 'common/services/api';
import authReducer from 'features/auth/slices/authSlice';

const rootReducer = combineReducers({
  [apiSlice.reducerPath]: apiSlice.reducer,
  auth: authReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
