import { useState, useEffect } from 'react'
import api from '../lib/api'

export default function MyBookingsPage() {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🗓️</div>
      <h3 style={{ color: '#fff' }}>Booking Coming Soon</h3>
      <p>Mentor session booking will be available shortly.</p>
    </div>
  )
}
