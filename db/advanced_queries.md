# Advanced SQL Queries — Knowledge Sharing Tech Community

This file contains several production-grade queries with explanations and index considerations.

1) Top contributors (by posts + comments score)
```sql
SELECT u.id, u.name,
  COALESCE(p.post_count,0) AS posts,
  COALESCE(c.comment_count,0) AS comments,
  (COALESCE(p.post_count,0) * 3 + COALESCE(c.comment_count,0)) AS score
FROM users u
LEFT JOIN (
  SELECT author_id, COUNT(*) AS post_count FROM posts WHERE deleted_at IS NULL GROUP BY author_id
) p ON p.author_id = u.id
LEFT JOIN (
  SELECT author_id, COUNT(*) AS comment_count FROM comments WHERE deleted_at IS NULL GROUP BY author_id
) c ON c.author_id = u.id
ORDER BY score DESC
LIMIT 50;
```
What it solves: Identifies high-impact contributors with simple weighting.
Optimization: Ensure indexes on `posts(author_id)` and `comments(author_id)`.

2) Trending posts (recent + engagement)
```sql
SELECT p.id, p.title, p.created_at,
  COALESCE(l.likes,0) AS likes,
  COALESCE(c.comments,0) AS comments,
  (COALESCE(l.likes,0) * 2 + COALESCE(c.comments,0)) / GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at))/3600,1) AS velocity
FROM posts p
LEFT JOIN (
  SELECT post_id, COUNT(*) AS likes FROM likes GROUP BY post_id
) l ON l.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) AS comments FROM comments WHERE deleted_at IS NULL GROUP BY post_id
) c ON c.post_id = p.id
WHERE p.created_at > now() - INTERVAL '30 days' AND p.deleted_at IS NULL
ORDER BY velocity DESC
LIMIT 25;
```
What it solves: Surfaces posts gaining traction quickly.
Optimization: Index on `posts(created_at)` and `likes(post_id)`.

3) Active mentors (mentors with open slots and high accept rate)
```sql
SELECT u.id, u.name, COALESCE(s.open_slots,0) AS open_slots, COALESCE(acc.accepted,0) AS accepted
FROM users u
LEFT JOIN (
  SELECT mentor_id, COUNT(*) AS open_slots FROM slots WHERE status = 'OPEN' GROUP BY mentor_id
) s ON s.mentor_id = u.id
LEFT JOIN (
  SELECT mentor_id, COUNT(*) FILTER (WHERE status = 'accepted') AS accepted FROM mentorships GROUP BY mentor_id
) acc ON acc.mentor_id = u.id
WHERE u.role = 'USER' -- or specific mentor flag
ORDER BY open_slots DESC, accepted DESC
LIMIT 50;
```
What it solves: Finds mentors likely to accept new mentees.
Optimization: Index on `slots(mentor_id, status)` and `mentorships(mentor_id, status)`.

4) Most followed users (network hubs)
```sql
SELECT u.id, u.name, COUNT(f.follower_id) AS followers
FROM users u
LEFT JOIN followers f ON f.following_id = u.id
GROUP BY u.id, u.name
ORDER BY followers DESC
LIMIT 50;
```
Optimization: Index on `followers(following_id)`.

5) Mentor slot conflict detection (find overlapping slots for a mentor)
```sql
SELECT s1.* FROM slots s1
JOIN slots s2 ON s1.mentor_id = s2.mentor_id AND s1.id <> s2.id
WHERE s1.start_at < s2.end_at AND s1.end_at > s2.start_at
ORDER BY s1.mentor_id, s1.start_at;
```
What it solves: Detects overlapping slots to avoid double-booking.
Optimization: Index on `slots(mentor_id, start_at, end_at)`.

6) Top contributors to specific tag
```sql
SELECT u.id, u.name, COUNT(p.id) AS posts
FROM users u
JOIN posts p ON p.author_id = u.id AND p.deleted_at IS NULL
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id AND t.name = 'javascript'
GROUP BY u.id, u.name
ORDER BY posts DESC
LIMIT 20;
```
Optimization: Composite index on `post_tags(tag_id, post_id)` and `posts(author_id, deleted_at)`.

Notes on optimization
- Use covering indexes for frequent read paths.
- Avoid SELECT * in production queries; explicitly select needed columns.
- Consider materialized views for heavy aggregations (e.g., daily top contributors).

*** End of advanced queries
