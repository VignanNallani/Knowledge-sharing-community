console.log('🔍 MINIMAL TEST: Starting...');
import express from 'express';

const app = express();
app.get('/test', (req, res) => {
  res.json({ message: 'Minimal test working' });
});

app.listen(4001, () => {
  console.log('🔍 MINIMAL TEST: Server running on port 4001');
});
