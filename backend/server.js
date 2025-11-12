const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const WebSocket = require('ws');

// In-memory store for real-time data
let stockData = {};

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
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });

  console.log(`🚀 Server ready at ${url}`);
  console.log(`📊 GraphQL Playground: ${url}`);

  // Start WebSocket connection to Finnhub
  startFinnhubWebSocket();
}

// Finnhub WebSocket Connection
function startFinnhubWebSocket() {
  const FINNHUB_API_KEY = 'd4a09i9r01qlaebjhvf0d4a09i9r01qlaebjhvfg';
  const socket = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);

  // Default symbols to track
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];

  socket.addEventListener('open', function (event) {
    console.log('✅ Connected to Finnhub WebSocket');

    // Subscribe to symbols
    symbols.forEach(symbol => {
      socket.send(JSON.stringify({ 'type': 'subscribe', 'symbol': symbol }));
      console.log(`📈 Subscribed to ${symbol}`);
    });
  });

  socket.addEventListener('message', function (event) {
    const message = JSON.parse(event.data);

    if (message.type === 'trade') {
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