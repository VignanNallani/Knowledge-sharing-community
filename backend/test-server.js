import express from 'express';

const app = express();

// PURE HEALTH CHECK - first thing, no middleware
app.get("/health", (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Add some middleware after health
app.use(express.json());

// Readiness endpoint with artificial delay
app.get("/readiness", async (req, res) => {
  // Simulate DB check delay
  await new Promise(resolve => setTimeout(resolve, 100));
  res.status(200).json({ status: 'ready', checks: { database: true, redis: true } });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
