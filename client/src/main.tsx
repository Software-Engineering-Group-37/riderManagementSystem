import { createTheme, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ValueProvider } from './components/context/valueContext.tsx';
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
      <ValueProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ValueProvider>
    </ThemeProvider>
  </StrictMode>,
)
