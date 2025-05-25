import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import type { RootState } from 'app/redux/store';
import {
  setCredentials,
  logout,
  setRefreshedTokens,
} from 'features/auth/slices/authSlice';
import { RefreshTokenResponsePayload } from 'common/types';

interface CustomApiError {
  status?: number;
  data?: any;
  message?: string;
}

const baseQuery = axiosBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
});

function axiosBaseQuery(
  { baseUrl }: { baseUrl: string } = { baseUrl: '' }
): BaseQueryFn<
  {
    url: string;
    method?: AxiosRequestConfig['method'];
    data?: AxiosRequestConfig['data'];
    params?: AxiosRequestConfig['params'];
    headers?: AxiosRequestConfig['headers'];
  },
  unknown,
  CustomApiError
> {
  return async (
    { url, method = 'get', data, params, headers },
    { getState }
  ) => {
    const token = (getState() as RootState).auth.token;
    const dynamicHeaders: AxiosRequestConfig['headers'] = { ...headers };
    if (token) {
      dynamicHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const result = await axios({
        url: baseUrl + url,
        method,
        data,
        params,
        headers: dynamicHeaders,
      });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError as AxiosError<any>; // Use AxiosError<any> for err.response.data typing
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        },
      };
    }
  };
}

const baseQueryWithReauth: BaseQueryFn<
  {
    url: string;
    method?: AxiosRequestConfig['method'];
    data?: AxiosRequestConfig['data'];
    params?: AxiosRequestConfig['params'];
    headers?: AxiosRequestConfig['headers'];
  },
  unknown,
  CustomApiError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const currentRefreshToken = (api.getState() as RootState).auth.refreshToken;
    if (currentRefreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          data: { refreshToken: currentRefreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const refreshData = refreshResult.data as RefreshTokenResponsePayload;
        api.dispatch(
          setRefreshedTokens({
            token: refreshData.accessToken,
            refreshToken: refreshData.refreshToken,
          })
        );
        result = await baseQuery(args, api, extraOptions); 
      } else {
        api.dispatch(logout()); 
      }
    } else {
      api.dispatch(logout()); 
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Auth', 'Profile'],
  endpoints: () => ({}),
});
