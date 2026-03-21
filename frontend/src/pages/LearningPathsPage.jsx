import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LearningPathsPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('All')

  const learningPaths = [
    {
      id: 1,
      title: 'Frontend Developer',
      emoji: '🎨',
      description: 'Master modern frontend development with React, TypeScript, and advanced CSS patterns. Build beautiful, performant web applications.',
      techStack: ['React', 'TypeScript', 'JavaScript', 'CSS', 'Next.js'],
      duration: '12 weeks',
      difficulty: 'Beginner → Advanced',
      progress: 0
    },
    {
      id: 2,
      title: 'Backend Developer',
      emoji: '⚙️',
      description: 'Learn to build scalable server-side applications with Node.js, databases, and API design. Master backend architecture.',
      techStack: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker'],
      duration: '10 weeks',
      difficulty: 'Intermediate',
      progress: 0
    },
    {
      id: 3,
      title: 'Full Stack Developer',
      emoji: '🚀',
      description: 'Combine frontend and backend skills to become a complete developer. Build end-to-end applications from scratch.',
      techStack: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'AWS'],
      duration: '20 weeks',
      difficulty: 'Intermediate → Advanced',
      progress: 0
    },
    {
      id: 4,
      title: 'DevOps Engineer',
      emoji: '🔧',
      description: 'Master deployment, containerization, and cloud infrastructure. Learn to manage production systems at scale.',
      techStack: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform'],
      duration: '14 weeks',
      difficulty: 'Advanced',
      progress: 0
    },
    {
      id: 5,
      title: 'React Native Mobile',
      emoji: '📱',
      description: 'Build native mobile apps for iOS and Android using React Native. Create cross-platform mobile applications.',
      techStack: ['React Native', 'Expo', 'TypeScript', 'Mobile Patterns'],
      duration: '8 weeks',
      difficulty: 'Intermediate',
      progress: 0
    },
    {
      id: 6,
      title: 'System Design',
      emoji: '🏗️',
      description: 'Learn to design scalable systems, databases, and architectures. Master interview-level system design concepts.',
      techStack: ['Architecture', 'Scalability', 'Databases', 'Distributed Systems'],
      duration: '6 weeks',
      difficulty: 'Advanced',
      progress: 0
    }
  ]

  const filteredPaths = learningPaths.filter(path => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Beginner') return path.difficulty.includes('Beginner')
    if (activeFilter === 'Intermediate') return path.difficulty.includes('Intermediate')
    if (activeFilter === 'Advanced') return path.difficulty.includes('Advanced')
    return true
  })

  const getDifficultyColor = (difficulty) => {
    if (difficulty.includes('Beginner')) return '#10B981'
    if (difficulty.includes('Intermediate')) return '#F59E0B'
    if (difficulty.includes('Advanced')) return '#EF4444'
    return '#6B7280'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#F9FAFB', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 24px 40px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 12px 0', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Learning Paths
          </h1>
          <p style={{ fontSize: '18px', color: '#9CA3AF', margin: 0, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            Choose your learning journey and master the skills you need to advance your career in tech
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '10px', padding: '4px', marginBottom: '40px', width: 'fit-content', margin: '0 auto 40px' }}>
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '8px 16px',
                borderRadius: '7px',
                border: 'none',
                background: activeFilter === filter ? '#3B82F6' : 'transparent',
                color: activeFilter === filter ? 'white' : '#9CA3AF',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Learning Paths Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
          {filteredPaths.map(path => (
            <div key={path.id} style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', padding: '24px', transition: 'transform 0.2s, box-shadow 0.2s' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '32px' }}>{path.emoji}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 4px 0' }}>
                    {path.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ padding: '2px 8px', background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                      {path.duration}
                    </span>
                    <span style={{ padding: '2px 8px', background: `${getDifficultyColor(path.difficulty)}20`, color: getDifficultyColor(path.difficulty), border: `1px solid ${getDifficultyColor(path.difficulty)}40`, borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                      {path.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                {path.description}
              </p>

              {/* Tech Stack */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', marginBottom: '8px' }}>Tech Stack</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {path.techStack.map((tech, index) => (
                    <span key={index} style={{ padding: '4px 10px', background: 'rgba(139,92,246,0.1)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', fontSize: '12px', fontWeight: '500' }}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF' }}>Progress</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{path.progress}%</span>
                </div>
                <div style={{ height: '6px', background: '#374151', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)', width: `${path.progress}%`, borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* Start Button */}
              <button 
                onClick={() => navigate('/community')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', 
                  border: 'none', 
                  borderRadius: '10px', 
                  color: 'white', 
                  cursor: 'pointer', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                Start Path →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
