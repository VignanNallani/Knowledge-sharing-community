import React, { useEffect, useState, useCallback } from "react";
import { getAvailableTimeSlots, createBooking, getMentorSessions } from "./mentorshipAPI";
import { format, addDays, startOfWeek, addWeeks, isSameDay, isToday } from "date-fns";
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react";

const BookingCalendar = ({ mentorId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [view, setView] = useState('week'); // 'week' or 'month'

  const fetchAvailableSlots = useCallback(async () => {
    if (!mentorId) return;
    
    try {
      setLoading(true);
      const startDate = startOfWeek(addDays(new Date(), currentWeek * 7), { weekStartsOn: 0 });
      const endDate = addDays(startDate, 6);
      
      const slots = await getAvailableTimeSlots(
        mentorId,
        startDate.toISOString(),
        endDate.toISOString(),
        60
      );
      
      setAvailableSlots(slots);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load available slots");
    } finally {
      setLoading(false);
    }
  }, [mentorId, currentWeek]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  const handleBooking = async () => {
    if (!selectedSlot) return;

    try {
      setBooking(true);
      setError(null);
      
      const bookingData = {
        mentorshipId: 1, // You might need to get this from context
        title: "Mentorship Session",
        description: "Booked through availability calendar",
        scheduledAt: selectedSlot.startTime.toISOString(),
        duration: selectedSlot.duration,
        mentorId: mentorId,
        menteeId: JSON.parse(localStorage.getItem('user') || '{}').id
      };

      await createBooking(bookingData);
      setSuccess("Session booked successfully!");
      setSelectedSlot(null);
      
      // Refresh available slots
      fetchAvailableSlots();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to book session");
    } finally {
      setBooking(false);
    }
  };

  const getSlotsForDate = (date) => {
    return availableSlots.filter(slot => 
      isSameDay(new Date(slot.startTime), date)
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(addDays(new Date(), currentWeek * 7), { weekStartsOn: 0 });
    const weekDays = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      weekDays.push(day);
    }

    return (
      <div className="space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentWeek(currentWeek - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-semibold text-gray-900">
            {format(weekStart, 'MMM dd')} - {format(addDays(weekStart, 6), 'MMM dd, yyyy')}
          </h3>
          
          <button
            onClick={() => setCurrentWeek(currentWeek + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const daySlots = getSlotsForDate(day);
            const isSelected = selectedSlot && isSameDay(new Date(selectedSlot.startTime), day);
            const isPast = day < new Date() && !isToday(day);
            
            return (
              <div
                key={index}
                onClick={() => !isPast && setSelectedDate(day)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  isPast ? 'bg-gray-50 border-gray-200 cursor-not-allowed' :
                  isSelected ? 'border-blue-500 bg-blue-50' :
                  'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="text-center">
                  <p className="text-xs text-gray-600">
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-lg font-semibold ${
                    isToday(day) ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {daySlots.length} slots
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Slots for Selected Date */}
        {selectedDate && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Available slots for {format(selectedDate, 'MMMM dd, yyyy')}
            </h4>
            
            {getSlotsForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No available slots for this date</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {getSlotsForDate(selectedDate).map((slot, index) => {
                  const isSelected = selectedSlot?.startTime.getTime() === slot.startTime.getTime();
                  
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-300 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {format(new Date(slot.startTime), 'h:mm a')}
                          </span>
                        </div>
                        
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {slot.duration} minutes
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="booking-calendar max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Book a Session</h1>
        <p className="text-gray-600">Select an available time slot to book your mentorship session</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Available Time Slots</h2>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1 text-sm rounded ${
                  view === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1 text-sm rounded ${
                  view === 'month' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {view === 'week' ? renderWeekView() : (
            <div className="text-center py-8 text-gray-500">
              Month view coming soon...
            </div>
          )}
        </div>
      </div>

      {/* Booking Summary */}
      {selectedSlot && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-gray-900">
                {format(new Date(selectedSlot.startTime), 'MMMM dd, yyyy')}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-gray-900">
                {format(new Date(selectedSlot.startTime), 'h:mm a')} - {selectedSlot.duration} minutes
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-500" />
              <span className="text-gray-900">
                Mentor ID: {mentorId}
              </span>
            </div>
          </div>
          
          <div className="mt-6 flex space-x-3">
            <button
              onClick={handleBooking}
              disabled={booking}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {booking ? 'Booking...' : 'Confirm Booking'}
            </button>
            
            <button
              onClick={() => setSelectedSlot(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
