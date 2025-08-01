import express, { type Request, Response, NextFunction } from "express";
import pkg from 'pg';
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// PostgreSQL connection for Render database
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const app = express();

// Essential middleware only
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 50000 }));

// CORS for frontend connection
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Request logging for API calls only
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

// Root endpoint - minimal info
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'APMC Backend API',
    status: 'running'
  });
});

// Your actual API routes will go here
// Example: Authentication, farmers, lots, bags, buyers, etc.
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    message: 'API connected',
    timestamp: new Date().toISOString()
  });
});

// Add your actual API routes here based on your frontend needs
// app.use('/api/auth', authRoutes);
// app.use('/api/farmers', farmerRoutes);
// app.use('/api/lots', lotRoutes);
// etc.

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || "Internal Server Error" 
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start server
const port = parseInt(process.env.PORT || '10000', 10);

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend API running on port ${port}`);
  console.log(`Ready for frontend connections`);
});

// Test database connection on startup
pool.connect()
  .then(client => {
    console.log('Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });