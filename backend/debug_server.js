import { spawn } from 'child_process';

const serverProcess = spawn('node', ['index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/knowledge_sharing',
    REDIS_URL: 'redis://localhost:6379',
    PORT: '3000'
  },
  stdio: 'pipe'
});

serverProcess.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

serverProcess.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

serverProcess.on('error', (error) => {
  console.error('Process error:', error);
});

serverProcess.on('close', (code) => {
  console.log('Process exited with code:', code);
});

// Kill after 10 seconds
setTimeout(() => {
  serverProcess.kill();
}, 10000);
