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

// Authentication endpoints
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // For now, simple admin login - will be replaced with proper authentication
    if (username === 'admin' && password === 'admin123') {
      const adminUser = {
        id: 1,
        username: 'admin',
        name: 'Admin User',
        role: 'super_admin',
        tenantId: 1
      };
      
      res.json({
        message: 'Login successful',
        user: adminUser
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logout successful' });
});

app.get('/api/auth/user', (req: Request, res: Response) => {
  // For now, return mock user - will be replaced with session-based auth
  const mockUser = {
    id: 1,
    username: 'admin',
    name: 'Admin User',
    email: 'admin@apmc.com',
    role: 'super_admin',
    tenantId: 1,
    isActive: true
  };
  
  res.json(mockUser);
});

// Database setup endpoint
app.post('/api/setup', async (req: Request, res: Response) => {
  try {
    // Create basic tables and setup
    const setupQueries = [
      // Create sessions table for authentication
      `CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions ("expire")`,
      
      // Create tenants table
      `CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        apmc_code TEXT UNIQUE NOT NULL,
        mobile_number TEXT NOT NULL,
        gst_number TEXT,
        pan_number TEXT NOT NULL,
        subscription_plan TEXT NOT NULL DEFAULT 'basic',
        max_users INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        settings JSONB DEFAULT '{}'
      )`,
      
      // Create users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff',
        tenant_id INTEGER REFERENCES tenants(id),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // Create farmers table
      `CREATE TABLE IF NOT EXISTS farmers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        place TEXT NOT NULL,
        bank_name TEXT,
        bank_account_number TEXT,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // Insert default tenant
      `INSERT INTO tenants (name, apmc_code, mobile_number, pan_number) 
       VALUES ('Demo APMC', 'DEMO001', '9999999999', 'ABCDE1234F')
       ON CONFLICT (apmc_code) DO NOTHING`,
       
      // Insert default admin user
      `INSERT INTO users (username, password, name, email, role, tenant_id)
       VALUES ('admin', '$2b$10$rH/kqnKzGkz5FZ8M9..8oeQBhZoJ1E7ZRGxqBjK9QvXqhGK7vH8QC', 'Admin User', 'admin@apmc.com', 'super_admin', 1)
       ON CONFLICT DO NOTHING`
    ];

    const client = await pool.connect();
    
    for (const query of setupQueries) {
      await client.query(query);
    }
    
    client.release();
    
    res.json({ 
      message: 'Database setup completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ 
      message: 'Database setup failed', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Basic API endpoints for testing
app.get('/api/farmers', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM farmers ORDER BY created_at DESC');
    client.release();
    
    res.json(result.rows);
  } catch (error) {
    console.error('Farmers fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch farmers' });
  }
});

app.post('/api/farmers', async (req: Request, res: Response) => {
  try {
    const { name, mobile, place, bankName, bankAccountNumber } = req.body;
    
    if (!name || !mobile || !place) {
      return res.status(400).json({ message: 'Name, mobile, and place are required' });
    }

    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO farmers (name, mobile, place, bank_name, bank_account_number, tenant_id) VALUES ($1, $2, $3, $4, $5, 1) RETURNING *',
      [name, mobile, place, bankName, bankAccountNumber]
    );
    client.release();
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Farmer creation error:', error);
    res.status(500).json({ message: 'Failed to create farmer' });
  }
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    
    const farmersCount = await client.query('SELECT COUNT(*) FROM farmers WHERE tenant_id = 1');
    
    client.release();
    
    res.json({
      totalFarmers: parseInt(farmersCount.rows[0].count),
      activeLots: 0,
      totalBagsToday: 0,
      revenueToday: 0
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

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