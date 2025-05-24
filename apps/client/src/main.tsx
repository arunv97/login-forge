import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import MainApp from 'app/MainApp';
import { store } from 'app/redux/store';


async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return;
  }

  const { worker } = await import('mocks/browser');
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  root.render(
    <StrictMode>
      <Provider store={store}>
        <BrowserRouter basename="/">
          <MainApp />
        </BrowserRouter>
      </Provider>
    </StrictMode>
  );
});
