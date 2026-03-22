import { Routes, Route } from 'react-router-dom'
import Community from './pages/Community'
import ProfilePage from './pages/ProfilePage'
import LeaderboardPage from './pages/LeaderboardPage'
import MentorsPage from './pages/MentorsPage'
import AdminPage from './pages/AdminPage'
import Login from './pages/Login'
import Signup from './pages/Signup.jsx'
import LandingPage from './pages/LandingPage'
import PostDetailPage from './pages/PostDetailPage'
import SearchPage from './pages/SearchPage'
import LearningPathsPage from './pages/LearningPathsPage'
import EventsPage from './pages/EventsPage'
import MyBookingsPage from './pages/MyBookingsPage'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Premium Navbar */}
      <Navbar />
      
      {/* Main Content */}
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected Routes */}
          <Route path="/community" element={
            <ProtectedRoute>
              <Community />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/profile/:id" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
            <ProtectedRoute><LeaderboardPage /></ProtectedRoute>
          } />
          <Route path="/mentors" element={
            <ProtectedRoute><MentorsPage /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute><AdminPage /></ProtectedRoute>
          } />
          <Route path="/posts/:id" element={
            <ProtectedRoute><PostDetailPage /></ProtectedRoute>
          } />
          <Route path="/search" element={
            <ProtectedRoute><SearchPage /></ProtectedRoute>
          } />
          <Route path="/learning-paths" element={
            <ProtectedRoute><LearningPathsPage /></ProtectedRoute>
          } />
          <Route path="/events" element={
            <ProtectedRoute><EventsPage /></ProtectedRoute>
          } />
          <Route path="/my-bookings" element={
            <ProtectedRoute><MyBookingsPage /></ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  )
}

export default App;
