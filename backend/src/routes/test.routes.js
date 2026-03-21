import { Router } from "express";

const router = Router();

console.log('Test routes loaded');

router.get("/test", (req, res) => {
  res.json({ message: "Test route working" });
});

export default router;
