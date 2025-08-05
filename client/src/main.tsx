import { createTheme, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { SharedValueProvider } from './components/context/shareValue.tsx';
import './index.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#5932EA',
    },
    secondary: {
      main: '#FBBF24',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },

  },
}
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <HelmetProvider>
        <SharedValueProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SharedValueProvider>
      </HelmetProvider>
    </ThemeProvider>
  </StrictMode>,
)
