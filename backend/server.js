const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const httpServer = http.createServer(app);

// In-memory store for real-time data
let stockData = {};
let useSimulatedData = false;
let simulationInterval = null;

// Initial prices for simulation
const initialPrices = {
  'AAPL': 225.50,
  'GOOGL': 141.20,
  'MSFT': 420.30,
  'AMZN': 178.80,
  'TSLA': 242.50,
  'META': 580.20,
  'NVDA': 145.60,
  'NFLX': 685.40
};

// Initialize stock data with base prices
function initializeStockData() {
  Object.keys(initialPrices).forEach(symbol => {
    stockData[symbol] = {
      symbol,
      price: initialPrices[symbol],
      volume: Math.floor(Math.random() * 1000000) + 100000,
      timestamp: new Date().toISOString(),
      change: 0,
      changePercent: 0
    };
  });
}

// Simulate realistic market data
function simulateMarketData() {
  Object.keys(stockData).forEach(symbol => {
    const currentPrice = stockData[symbol].price;
    const basePrice = initialPrices[symbol];

    // Random price change between -0.5% and +0.5%
    const changePercent = (Math.random() - 0.5) * 1.0;
    const priceChange = currentPrice * (changePercent / 100);
    const newPrice = currentPrice + priceChange;

    // Calculate overall change from base price
    const totalChange = newPrice - basePrice;
    const totalChangePercent = ((totalChange / basePrice) * 100);

    // Random volume
    const volume = Math.floor(Math.random() * 50000) + 10000;

    stockData[symbol] = {
      symbol,
      price: parseFloat(newPrice.toFixed(2)),
      volume,
      timestamp: new Date().toISOString(),
      change: parseFloat(totalChange.toFixed(2)),
      changePercent: parseFloat(totalChangePercent.toFixed(2))
    };

    console.log(`📊 ${symbol}: $${newPrice.toFixed(2)} (${totalChangePercent >= 0 ? '+' : ''}${totalChangePercent.toFixed(2)}%)`);
  });
}

// Start simulation
function startSimulation() {
  console.log('🎮 Starting simulated market data (market is closed)');
  initializeStockData();

  // Update every 2 seconds
  simulationInterval = setInterval(() => {
    simulateMarketData();
  }, 2000);

  useSimulatedData = true;
}

// Stop simulation
function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log('⏹️  Stopped simulation');
  }
  useSimulatedData = false;
}

// GraphQL Schema
const typeDefs = `#graphql
  type Stock {
    symbol: String!
    price: Float!
    volume: Int
    timestamp: String!
    change: Float
    changePercent: Float
  }

  type Query {
    stocks(symbols: [String!]!): [Stock!]!
    stock(symbol: String!): Stock
    allStocks: [Stock!]!
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    stocks: (_, { symbols }) => {
      return symbols.map(symbol => stockData[symbol] || {
        symbol,
        price: 0,
        volume: 0,
        timestamp: new Date().toISOString(),
        change: 0,
        changePercent: 0
      });
    },
    stock: (_, { symbol }) => {
      return stockData[symbol] || null;
    },
    allStocks: () => {
      return Object.values(stockData);
    }
  }
};

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start server
async function startServer() {
  await server.start();

  // Apply middleware
  app.use(
    '/',
    cors({
      origin: '*',
      credentials: true,
    }),
    bodyParser.json(),
    expressMiddleware(server)
  );

  const PORT = process.env.PORT || 4000;

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/`);
    console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/`);
  });

  // Start WebSocket connection to Finnhub
  startFinnhubWebSocket();
}

// Finnhub WebSocket Connection
function startFinnhubWebSocket() {
  const FINNHUB_API_KEY = 'ctv0sbpr01qhu21ojl50ctv0sbpr01qhu21ojl5g'; // Your API key
  const socket = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);

  // Default symbols to track
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];

  let noDataTimeout = null;

  socket.addEventListener('open', function (event) {
    console.log('✅ Connected to Finnhub WebSocket');

    // Subscribe to symbols
    symbols.forEach(symbol => {
      socket.send(JSON.stringify({ 'type': 'subscribe', 'symbol': symbol }));
      console.log(`📈 Subscribed to ${symbol}`);
    });

    // If no data received in 10 seconds, start simulation
    noDataTimeout = setTimeout(() => {
      if (Object.keys(stockData).length === 0) {
        console.log('⚠️  No market data received (market might be closed)');
        startSimulation();
      }
    }, 10000);
  });

  socket.addEventListener('message', function (event) {
    const message = JSON.parse(event.data);

    if (message.type === 'trade') {
      // Clear no-data timeout if we receive data
      if (noDataTimeout) {
        clearTimeout(noDataTimeout);
        noDataTimeout = null;
      }

      // Stop simulation if it was running
      if (useSimulatedData) {
        stopSimulation();
        console.log('✅ Receiving real market data');
      }

      message.data.forEach(trade => {
        const symbol = trade.s;
        const price = trade.p;
        const volume = trade.v;
        const timestamp = new Date(trade.t).toISOString();

        // Calculate change
        const previousPrice = stockData[symbol]?.price || price;
        const change = price - previousPrice;
        const changePercent = previousPrice ? ((change / previousPrice) * 100) : 0;

        // Update stock data
        stockData[symbol] = {
          symbol,
          price,
          volume,
          timestamp,
          change,
          changePercent
        };

        console.log(`📊 ${symbol}: $${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
      });
    }
  });

  socket.addEventListener('close', function (event) {
    console.log('❌ Disconnected from Finnhub');
    console.log('🔄 Reconnecting in 5 seconds...');

    // Start simulation while reconnecting
    if (!useSimulatedData) {
      startSimulation();
    }

    setTimeout(startFinnhubWebSocket, 5000);
  });

  socket.addEventListener('error', function (error) {
    console.error('⚠️ WebSocket error:', error.message);
  });
}

// Start the server
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
});