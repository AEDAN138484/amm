require('dotenv').config();
const app = require('./src/app');    
const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));