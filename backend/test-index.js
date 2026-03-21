console.log('🔍 TEST INDEX: Starting...');
import express from "express";
import { Router } from "express";

const app = express();

// Debug test route
app.get("/debug-test", (req, res) => {
  res.json({ 
    message: "Debug test working", 
    timestamp: new Date().toISOString()
  });
});

app.listen(4002, () => {
  console.log('🔍 TEST INDEX: Server running on port 4002');
});
