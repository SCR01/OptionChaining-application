import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import './Navbar.css';

const Navbar = ({ darkMode, toggleDarkMode }) => {
  const location = useLocation();
  
  return (
    <AppBar position="static" color="default" className={`navbar ${darkMode ? 'dark-mode' : ''}`}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Realtime Option Chain
        </Typography>
        
        <Box className="navbar-links" sx={{ display: 'flex', alignItems: 'center' }}>
          <Link 
            to="/" 
            className={`navbar-link ${location.pathname === '/' ? 'active' : ''} ${darkMode ? 'dark-mode' : ''}`}
          >
            Option Chain
          </Link>
          <Link 
            to="/realtime-inspector" 
            className={`navbar-link ${location.pathname === '/realtime-inspector' ? 'active' : ''} ${darkMode ? 'dark-mode' : ''}`}
          >
            Realtime Inspector
          </Link>
          
          <IconButton onClick={toggleDarkMode} color="inherit" sx={{ ml: 2 }}>
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
