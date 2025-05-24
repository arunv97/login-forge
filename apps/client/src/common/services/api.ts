import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import type { RootState } from 'app/redux/store';

const axiosBaseQuery =
  (
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
    { status?: number; data?: any; message?: string }
  > =>
  async ({ url, method = 'get', data, params, headers }, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth ? state.auth.token : null;
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
      const err = axiosError as AxiosError;
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data || err.message,
          message: err.message,
        },
      };
    }
  };

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  }),
  tagTypes: ['User', 'Auth', 'Profile'],
  endpoints: () => ({}),
});
