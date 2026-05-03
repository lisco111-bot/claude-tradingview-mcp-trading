#!/usr/bin/env node

// Simple TradingView health check
import fetch from 'node-fetch';

async function healthCheck() {
  try {
    const response = await fetch('http://localhost:9222/json/version');
    const data = await response.json();
    console.log(`cdp_connected: true`);
    console.log(`webSocketDebuggerUrl: ${data.webSocketDebuggerUrl}`);
    console.log(`Protocol version: ${data.Protocol-Version}`);
  } catch (error) {
    console.log(`cdp_connected: false`);
    console.log(`Error: ${error.message}`);
  }
}

healthCheck();