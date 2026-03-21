# Days 3 & 4 Integration Instructions - Search & Discovery System

## 1. Backend Integration (Day 3)

### Database Migration
Run the search features migration:

```bash
cd backend
npx prisma migrate dev --name add_search_features
npx prisma generate
```

### Install Backend Dependencies
```bash
cd backend
npm install node-cache express-rate-limit
npm install --save-dev jest
```

### Add Search Routes to Main App
Update your main server file (app.js or server.js):

```javascript
// Add search routes
const searchRoutes = require('./src/routes/search.routes');
app.use('/api/v1/search', searchRoutes);
```

### Update Prisma Schema
Add these models to your existing schema.prisma:

```prisma
model SearchAnalytics {
  id          Serial      @id @default(autoincrement())
  query       String      @db.Text
  userId      Int?
  resultsCount Int        @default(0)
  searchType  String      @db.VarChar(50)
  filters     Json?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  user        User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@index([query])
  @@index([userId])
  @@index([searchType])
  @@index([createdAt])
  @@map("search_analytics")
}

model TrendingPosts {
  id             Serial      @id @default(autoincrement())
  postId         Int         @unique
  score          Decimal      @default(0)
  viewCount      Int         @default(0)
  likeCount      Int         @default(0)
  commentCount   Int         @default(0)
  lastCalculated DateTime    @default(now())
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  
  post           Post        @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  @@index([score(sort: Desc)])
  @@index([postId])
  @@map("trending_posts")
}

model SearchSuggestions {
  id          Serial      @id @default(autoincrement())
  query       String      @db.Text
  suggestion  String      @db.Text
  weight      Int         @default(1)
  searchType  String      @db.VarChar(50)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@unique([query, suggestion, searchType])
  @@index([query])
  @@index([searchType])
  @@map("search_suggestions")
}

// Add search vector columns to existing models
model Post {
  // ... existing fields
  searchVector Tsvector?  @map("search_vector")
  
  // ... existing relations and indexes
  @@index([searchVector]) using GIN
  @@map("posts")
}

model User {
  // ... existing fields
  searchVector Tsvector?  @map("search_vector")
  
  // ... existing relations and indexes
  @@index([searchVector]) using GIN
  @@map("users")
}
```

### Run Backend Tests
```bash
cd backend
npm test -- tests/unit/search.service.test.js
```

## 2. Frontend Integration (Day 4)

### Install Frontend Dependencies
```bash
cd frontend
npm install date-fns lucide-react
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Create Search Components Directory
```
frontend/src/components/search/
├── SearchBar.jsx
├── SearchResults.jsx
├── TrendingPosts.jsx
├── RecommendedMentors.jsx
└── __tests__/
    ├── SearchBar.test.jsx
    └── TrendingPosts.test.jsx
```

### Create Search Services
```
frontend/src/services/
├── searchAPI.js
```

### Create Search Pages
```
frontend/src/pages/
├── SearchPage.jsx
```

### Update Router Configuration
Add these routes to your main router file:

```jsx
import SearchPage from './pages/SearchPage';

// Add search routes
<Route path="/search" element={<SearchPage />} />
<Route path="/trending" element={<SearchPage />} />
<Route path="/discover" element={<SearchPage />} />
```

### Update Main App Component
Add the SearchBar to your main navigation:

```jsx
import SearchBar from './components/search/SearchBar';

// In your navigation component
<SearchBar onSearch={(query) => navigate(`/search?q=${encodeURIComponent(query)}`)} />
```

## 3. Environment Variables

Add to your frontend `.env` file:

```env
REACT_APP_BACKEND_URL=http://localhost:4000
```

## 4. Socket.io Integration for Real-time Updates

### Backend Socket Events
Add to your socket.io server setup:

```javascript
// Search-related socket events
socket.on("search_performed", (data) => {
  // Broadcast trending updates
  socket.to("search_updates").emit("trending_updated", data);
});

socket.on("post_interaction", (data) => {
  // Update trending scores in real-time
  updateTrendingScores(data.postId);
  socket.to("search_updates").emit("trending_updated", data);
});
```

### Frontend Socket Integration
Update your socket.js file:

```javascript
// Join search updates room
export const joinSearchRoom = () => {
  socket.emit("join_search_room");
};

// Listen for trending updates
export const onTrendingUpdate = (callback) => {
  socket.on("trending_updated", callback);
};
```

## 5. Component Usage Examples

### SearchBar Component
```jsx
import SearchBar from './components/search/SearchBar';

// Basic usage
<SearchBar />

// With custom callback
<SearchBar onSearch={(query) => handleSearch(query)} />

// With custom placeholder
<SearchBar placeholder="Search mentors, skills, topics..." />
```

### SearchResults Component
```jsx
import SearchResults from './components/search/SearchResults';

// With initial query
<SearchResults initialQuery="react" initialType="posts" />

// Full page search
<SearchResults />
```

### TrendingPosts Component
```jsx
import TrendingPosts from './components/search/TrendingPosts';

// Basic usage
<TrendingPosts />

// With custom limit
<TrendingPosts limit={12} />

// With custom time range
<TrendingPosts timeRange="week" />
```

### RecommendedMentors Component
```jsx
import RecommendedMentors from './components/search/RecommendedMentors';

// Basic usage
<RecommendedMentors />

// Without skill match display
<RecommendedMentors showSkillMatch={false} />
```

## 6. Search Features

### Full-Text Search
- **Posts**: Search titles and content with relevance scoring
- **Users**: Search names, bios, and skills
- **Mentors**: Search with rating and availability filters

### Autocomplete Suggestions
- Real-time suggestions as you type
- Categorized by type (posts, users, mentors)
- Recent search history
- Quick action shortcuts

### Advanced Filtering
- **Skills**: Filter by specific skills
- **Date Range**: Filter by creation date
- **Role**: Filter by user role
- **Availability**: Filter mentor availability
- **Rating**: Filter by mentor ratings

### Sorting Options
- **Relevance**: Best match to query
- **Newest**: Most recently created
- **Oldest**: Earliest created
- **Most Liked**: Highest like count
- **Most Commented**: Highest comment count

### Discovery Features
- **Trending Posts**: Algorithmically ranked popular content
- **Recommended Mentors**: Personalized mentor recommendations
- **Real-time Updates**: Live updates via Socket.io

## 7. Performance Optimizations

### Backend Optimizations
- **Caching**: 5-minute cache for search results
- **Database Indexes**: GIN indexes for full-text search
- **Trigram Search**: Fuzzy matching capabilities
- **Rate Limiting**: 100 requests per 15 minutes

### Frontend Optimizations
- **Debounced Search**: 300ms debounce for autocomplete
- **Memoization**: Cached search results
- **Lazy Loading**: Load more pagination
- **Skeleton Loaders**: Loading states for better UX

## 8. Testing

### Backend Tests
```bash
cd backend
npm test -- tests/unit/search.service.test.js
```

### Frontend Tests
```bash
cd frontend
npm test -- src/components/search/__tests__/SearchBar.test.jsx
npm test -- src/components/search/__tests__/TrendingPosts.test.jsx
```

### Integration Testing
```bash
# Test search endpoints
curl "http://localhost:4000/api/v1/search/posts?q=react"

# Test autocomplete
curl "http://localhost:4000/api/v1/search/autocomplete?q=re&type=posts"

# Test trending posts
curl "http://localhost:4000/api/v1/search/trending/posts"
```

## 9. Monitoring and Analytics

### Search Analytics
- Track search queries and results
- Monitor popular search terms
- Analyze search patterns
- Track click-through rates

### Performance Monitoring
- Search response times
- Cache hit rates
- Database query performance
- API rate limiting metrics

## 10. Troubleshooting

### Common Issues

#### Search Not Working
- **Check**: Database migration applied
- **Check**: Search vectors populated
- **Check**: API routes registered

#### Autocomplete Not Showing
- **Check**: Minimum query length (2 characters)
- **Check**: API response format
- **Check**: Network connectivity

#### Trending Posts Empty
- **Check**: Recent activity in database
- **Check**: Trending score calculation
- **Check**: Time range filters

#### Real-time Updates Not Working
- **Check**: Socket.io connection
- **Check**: Room subscriptions
- **Check**: Event broadcasting

### Debug Mode
Enable debug logging:

```javascript
// Backend
DEBUG=search:* npm start

// Frontend
localStorage.setItem('debug', 'search:*');
```

## 11. Next Steps

After completing Days 3 & 4:

1. **Performance Testing**: Load test search endpoints
2. **User Testing**: Get feedback on search UX
3. **Analytics Setup**: Configure search analytics
4. **A/B Testing**: Test different ranking algorithms
5. **Search Optimization**: Fine-tune relevance scoring

## 12. Ready for Days 5-7

The Search & Discovery System is now fully integrated and ready for:
- **Day 5**: Email Notifications
- **Day 6**: Push Notifications & Real-time Updates  
- **Day 7**: Advanced User Features

The search system provides a powerful foundation for content discovery and user engagement with full-text search, autocomplete, trending content, and personalized recommendations.
