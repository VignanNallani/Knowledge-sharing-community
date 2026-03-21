import Navbar from "../components/Navbar"
import RightPanel from "../components/RightPanel"

export default function MainLayout({ children }) {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f9fafb'
    },
    contentWrapper: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden'
    },
    sidebar: {
      width: '256px',
      borderRight: '1px solid #e5e7eb',
      backgroundColor: 'white',
      padding: '20px',
      overflowY: 'auto'
    },
    main: {
      flex: 1,
      overflowY: 'auto',
      padding: '32px',
      backgroundColor: '#f9fafb',
      maxWidth: '768px',
      margin: '0 auto'
    },
    rightPanel: {
      width: '320px',
      borderLeft: '1px solid #e5e7eb',
      backgroundColor: 'white',
      padding: '24px',
      overflowY: 'auto'
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '24px'
    },
    navItem: {
      display: 'block',
      marginBottom: '12px',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '8px 12px',
      borderRadius: '6px',
      transition: 'background-color 0.2s'
    }
  }

  return (
    <div style={styles.container}>
      
      {/* TOP NAVIGATION */}
      <Navbar />

      <div style={styles.contentWrapper}>
        
        {/* LEFT SIDEBAR */}
        <aside style={styles.sidebar}>
          <h2 style={styles.title}>
            Knowledge Community
          </h2>
          <nav>
            <div 
              style={styles.navItem}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Community
            </div>
            <div 
              style={styles.navItem}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Mentors
            </div>
            <div 
              style={styles.navItem}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Events
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main style={styles.main}>
          {children}
        </main>

        {/* RIGHT PANEL */}
        <aside style={styles.rightPanel}>
          <RightPanel />
        </aside>

      </div>
    </div>
  )
}
