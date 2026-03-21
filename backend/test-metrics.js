#!/usr/bin/env node

import { normalizeRoute, getStatusClass } from './src/utils/productionMetrics.js';
import client from 'prom-client';

// Test individual components of HTTP metrics
const startTime = process.hrtime.bigint();

console.log('🧪 Testing HTTP metrics components...');

// Test 1: normalizeRoute function
const routeStart = process.hrtime.bigint();
const normalized = normalizeRoute('/api/v1/posts');
const routeEnd = process.hrtime.bigint();
console.log(`📍 normalizeRoute: ${Number(routeEnd - routeStart) / 1e6}ms`);

// Test 2: getStatusClass function  
const statusStart = process.hrtime.bigint();
const statusClass = getStatusClass(200);
const statusEnd = process.hrtime.bigint();
console.log(`📊 getStatusClass: ${Number(statusEnd - statusStart) / 1e6}ms`);

// Test 3: Prometheus metric operations
const promStart = process.hrtime.bigint();

// Simulate the operations from HTTP metrics
const httpRequestDuration = new client.Histogram({
  name: 'test_http_request_duration',
  help: 'Test HTTP request duration',
  labelNames: ['method', 'route', 'status_class']
});

const httpRequestsTotal = new client.Counter({
  name: 'test_http_requests_total', 
  help: 'Test HTTP requests total',
  labelNames: ['method', 'route', 'status_class']
});

// Simulate metric recording
httpRequestDuration.labels('GET', normalized, statusClass).observe(0.1);
httpRequestsTotal.labels('GET', normalized, statusClass).inc();

const promEnd = process.hrtime.bigint();
console.log(`📈 Prometheus operations: ${Number(promEnd - promStart) / 1e6}ms`);

const totalTime = Number(process.hrtime.bigint() - startTime) / 1e6;
console.log(`⏱️  Total test time: ${totalTime}ms`);

if (totalTime > 100) {
  console.log('🚨 SLOW: HTTP metrics components are blocking!');
} else {
  console.log('✅ FAST: HTTP metrics components are not the issue');
}
