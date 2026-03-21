import { useState, useEffect } from 'react'
import api from '../lib/api'

export default function BookingModal({ mentor, onClose }) {
  console.log('MENTOR ID:', mentor.id)
  console.log('MENTOR OBJECT:', mentor)
  
  const token = localStorage.getItem('accessToken')
  console.log('TOKEN EXISTS:', !!token)
  console.log('TOKEN:', token?.substring(0, 20))
  
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)

  if (!mentor) return null

  // Generate next 14 days for calendar
  const generateDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date)
    }
    
    return dates
  }

  const dates = generateDates()

  // Fetch available slots when date is selected
  useEffect(() => {
    if (selectedDate && mentor) {
      fetchAvailableSlots()
    }
  }, [selectedDate, mentor])

  const fetchAvailableSlots = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      console.log('Fetching slots for mentor ID:', mentor.id)
      console.log('Date string:', dateStr)
      console.log('Full API URL:', `/bookings/slots/${mentor.id}?date=${dateStr}`)
      
      const res = await api.get(`/bookings/slots/${mentor.id}?date=${dateStr}`)
      console.log('API response:', res.data)
      
      // Fix: Extract slots from the correct response structure
      const slots = res.data.data?.slots || res.data.data || []
      console.log('SLOTS SET:', slots)
      setAvailableSlots(slots)
    } catch (error) {
      console.error('Error fetching slots:', error)
      setAvailableSlots([])
    }
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setStep(2)
  }

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot)
    setStep(3)
  }

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      alert('Please select a slot')
      return
    }

    console.log('BOOKING - Token before API call:', !!token)
    console.log('BOOKING - API instance has token:', !!api.defaults.headers.Authorization)

    setLoading(true)
    try {
      const bookingData = {
        slotId: selectedSlot.id
      }
      
      console.log('BOOKING - Making API call to /bookings')
      console.log('BOOKING - Data:', bookingData)
      
      const response = await api.post('/bookings', bookingData)
      console.log('BOOKING - Response:', response.status, response.data)
      
      setStep('success')
    } catch (error) {
      console.error('Error booking slot:', error)
      console.log('BOOKING - Error response:', error.response?.status, error.response?.data)
      
      if (error.response?.status === 401) {
        alert('Your session has expired. Please log in again.')
        // Optionally redirect to login
        window.location.href = '/login'
      } else {
        alert('Failed to book session. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      {/* Modal Content */}
      <div style={{
        background: '#1A2235',
        border: '1px solid #1F2A40',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#9CA3AF',
            fontSize: '24px',
            cursor: loading ? 'not-allowed' : 'pointer',
            padding: '4px'
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            margin: '0 0 8px 0',
            color: '#F9FAFB'
          }}>
            Book Session
          </h3>
          <p style={{ 
            color: '#9CA3AF', 
            margin: 0,
            fontSize: '16px'
          }}>
            with <span style={{ color: '#60A5FA', fontWeight: '600' }}>{mentor.name}</span>
          </p>
        </div>

        {/* Success Message */}
        {step === 'success' ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ color: '#fff', marginBottom: 8 }}>Booking Confirmed!</h3>
            <p style={{ color: '#94a3b8', marginBottom: 8 }}>
              Your session with {mentor.name} is scheduled
            </p>
            <p style={{ color: '#6366f1', fontWeight: 600, marginBottom: 24 }}>
              {new Date(selectedSlot.startAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} — {new Date(selectedSlot.endAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
            <button onClick={() => { onClose(); window.location.href = '/my-bookings'; }}
              style={{ padding: '12px 24px', background: '#6366f1', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              View My Bookings →
            </button>
          </div>
        ) : (
          <>
            {/* Step 1: Calendar */}
            {step === 1 && (
              <div>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#F9FAFB',
                  margin: '0 0 16px 0'
                }}>
                  Select a Date
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)', 
                  gap: '8px',
                  marginBottom: '24px'
                }}>
                  {dates.map((date, index) => (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(date)}
                      style={{
                        padding: '12px 8px',
                        background: selectedDate === date ? '#3B82F6' : '#374151',
                        border: selectedDate === date ? '1px solid #3B82F6' : '1px solid #4B5563',
                        borderRadius: '8px',
                        color: '#F9FAFB',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div>{date.getDate()}</div>
                      <div style={{ fontSize: '10px', marginTop: '2px' }}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Time Slots */}
            {step === 2 && (
              <div>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#F9FAFB',
                  margin: '0 0 8px 0'
                }}>
                  Available Time Slots for {formatDate(selectedDate)}
                </h4>
                <p style={{ 
                  color: '#6B7280', 
                  fontSize: '14px',
                  margin: '0 0 16px 0'
                }}>
                  {availableSlots.length === 0 ? 'No available slots for this date' : `Click a time to continue`}
                </p>
                
                {/* Debug line - remove later */}
                <div style={{color: '#10b981', fontSize: '12px', marginBottom: '8px'}}>
                  Slots count: {availableSlots.length}
                </div>
                
                {availableSlots.length > 0 && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '8px',
                    marginBottom: '24px'
                  }}>
                    {availableSlots.map((slot) => {
                      const time = new Date(slot.startAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'UTC'
                      })
                      return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotSelect(slot)}
                          style={{
                            padding: '12px',
                            background: selectedSlot?.id === slot.id ? '#3B82F6' : '#374151',
                            border: selectedSlot?.id === slot.id ? '1px solid #3B82F6' : '1px solid #4B5563',
                            borderRadius: '8px',
                            color: '#F9FAFB',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            textAlign: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          {time}
                        </button>
                      )
                    })}
                  </div>
                )}

                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid #4B5563',
                    borderRadius: '8px',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  ← Back to Calendar
                </button>
              </div>
            )}

            {/* Step 3: Topic */}
            {step === 3 && (
              <div>
                <div style={{ 
                  background: '#374151',
                  border: '1px solid #4B5563',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#9CA3AF', 
                    marginBottom: '8px'
                  }}>
                    Selected Session
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#F9FAFB',
                    marginBottom: '4px'
                  }}>
                    {formatDate(selectedDate)} at {formatTime(new Date(selectedSlot.startAt).toTimeString().slice(0,5))}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#60A5FA'
                  }}>
                    with {mentor.name}
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#F9FAFB',
                    marginBottom: '8px'
                  }}>
                    What do you want to discuss? *
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Tell us what you'd like to discuss in this session..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      background: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB',
                      padding: '12px',
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6B7280', 
                    marginTop: '4px' 
                  }}>
                    {topic.length}/200 characters
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => setStep(2)}
                    disabled={loading}
                    style={{
                      padding: '12px 24px',
                      background: 'transparent',
                      border: '1px solid #4B5563',
                      borderRadius: '8px',
                      color: '#9CA3AF',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    disabled={loading || !topic.trim()}
                    style={{
                      padding: '12px 24px',
                      background: loading || !topic.trim() ? '#4B5563' : 'linear-gradient(135deg,#3B82F6,#8B5CF6)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: loading || !topic.trim() ? 0.7 : 1
                    }}
                  >
                    {loading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

