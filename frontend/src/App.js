import React, { useState } from 'react';
import { CssBaseline, Container, Paper, Box, Tabs, Tab } from '@mui/material';
import OptionChain from './components/OptionChain';
import RealtimeInspector from './components/RealtimeInspector';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  // Using a fixed tab state only
  const [activeTab, setActiveTab] = useState(0);

  // Create a fixed dark theme
  const theme = createTheme({
    palette: {
      mode: 'dark', // Always use dark mode
    },
  });

  // This function is kept for backward compatibility but no longer changes the theme
  const toggleDarkMode = () => {
    // No-op function (kept for compatibility with component props)
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Paper elevation={3} sx={{ p: 0, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            variant="fullWidth"
          >
            <Tab label="Option Chain" />
            <Tab label="Realtime Inspector" />
          </Tabs>

          <Box sx={{ height: 'calc(100vh - 128px)' }}>
            {activeTab === 0 && (
              <OptionChain darkMode={true} toggleDarkMode={toggleDarkMode} />
            )}
            {activeTab === 1 && (
              <RealtimeInspector darkMode={true} toggleDarkMode={toggleDarkMode} />
            )}
          </Box>
        </Paper>
      </Container>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </ThemeProvider>
  );
}

export default App;
