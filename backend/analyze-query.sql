-- EXPLAIN ANALYZE for the optimized query
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT DISTINCT
  p.id,
  p.title,
  p.content,
  p.image,
  p."authorId",
  p.version,
  p."createdAt",
  p."updatedAt",
  p."deletedAt",
  p."idempotencyKey",
  a.id as author_id,
  a.name as author_name,
  a.email as author_email,
  a.role as author_role,
  a."profileImage" as author_profileImage
FROM posts p
LEFT JOIN users a ON p."authorId" = a.id
WHERE p."deletedAt" IS NULL
ORDER BY p."createdAt" DESC
LIMIT 10;
