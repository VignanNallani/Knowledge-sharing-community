import { useState } from "react";
import { sessionService } from "../services/sessionService";

export function useBooking() {
  const [status, setStatus] = useState("idle");
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [loading, setLoading] = useState(false);

  const openBooking = (mentor) => {
    setSelectedMentor(mentor);
    setStatus("selecting_slot");
    setBookingError(null);
  };

  const selectSlot = (slot) => {
    setSelectedSlot(slot);
    setStatus("confirming");
    setBookingError(null);
  };

  const confirmBooking = async () => {
    try {
      setLoading(true);
      setBookingError(null);
      setStatus("processing");

      // Create session via backend API
      const sessionData = {
        scheduledStart: selectedSlot.time,
        scheduledEnd: new Date(selectedSlot.time.getTime() + 60 * 60 * 1000), // 1 hour
        notes: `Session with ${selectedMentor.name}`
      };

      await sessionService.createSession(selectedSlot.relationshipId, sessionData);
      
      setStatus("confirmed");
    } catch (err) {
      setStatus("error");
      setBookingError(err.response?.data?.message || "Failed to book session");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStatus("idle");
    setSelectedMentor(null);
    setSelectedSlot(null);
    setBookingError(null);
    setLoading(false);
  };

  return {
    status,
    selectedMentor,
    selectedSlot,
    bookingError,
    loading,
    openBooking,
    selectSlot,
    confirmBooking,
    reset,
  };
}
