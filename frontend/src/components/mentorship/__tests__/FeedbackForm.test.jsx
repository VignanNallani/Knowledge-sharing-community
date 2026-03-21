import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackForm from '../FeedbackForm';
import * as mentorshipAPI from '../mentorshipAPI';

// Mock the API
jest.mock('../mentorshipAPI');

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Star: ({ className, onClick, disabled }) => (
    <button 
      data-testid="star" 
      className={className} 
      onClick={onClick}
      disabled={disabled}
    >
      Star
    </button>
  ),
  MessageSquare: () => <div data-testid="message-icon">Message</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
}));

describe('FeedbackForm', () => {
  const mockSessionId = 'session-123';
  const mockFeedback = {
    id: 'feedback-1',
    rating: 4,
    comment: 'Great session!',
    createdAt: '2024-01-15T10:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mentorshipAPI.submitFeedback.mockResolvedValue(mockFeedback);
    mentorshipAPI.updateFeedback.mockResolvedValue(mockFeedback);
    mentorshipAPI.deleteFeedback.mockResolvedValue({});
  });

  const renderComponent = (props = {}) => {
    return render(<FeedbackForm sessionId={mockSessionId} {...props} />);
  };

  test('renders feedback form for new feedback', () => {
    renderComponent();
    
    expect(screen.getByText('Submit Feedback')).toBeInTheDocument();
    expect(screen.getByText('Rating *')).toBeInTheDocument();
    expect(screen.getByText('Comment')).toBeInTheDocument();
    expect(screen.getByText('Submit Feedback')).toBeInTheDocument();
  });

  test('renders existing feedback in view mode', () => {
    renderComponent({ existingFeedback: mockFeedback });
    
    expect(screen.getByText('Your Feedback')).toBeInTheDocument();
    expect(screen.getByText('Great session!')).toBeInTheDocument();
    expect(screen.getByText('Rating: 4/5')).toBeInTheDocument();
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
    expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
  });

  test('submits new feedback successfully', async () => {
    renderComponent();
    
    // Select rating
    const stars = screen.getAllByTestId('star');
    fireEvent.click(stars[3]); // 4 stars
    
    // Add comment
    const commentTextarea = screen.getByPlaceholderText('Share your experience with this mentorship session...');
    fireEvent.change(commentTextarea, { target: { value: 'Excellent session!' } });
    
    // Submit
    const submitButton = screen.getByText('Submit Feedback');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mentorshipAPI.submitFeedback).toHaveBeenCalledWith({
        sessionId: mockSessionId,
        rating: 4,
        comment: 'Excellent session!'
      });
      expect(screen.getByText(/Feedback submitted successfully/)).toBeInTheDocument();
    });
  });

  test('validates rating is required', async () => {
    renderComponent();
    
    // Try to submit without rating
    const submitButton = screen.getByText('Submit Feedback');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please select a rating')).toBeInTheDocument();
      expect(mentorshipAPI.submitFeedback).not.toHaveBeenCalled();
    });
  });

  test('edits existing feedback', async () => {
    renderComponent({ existingFeedback: mockFeedback });
    
    // Click edit button
    const editButton = screen.getByTestId('edit-icon');
    fireEvent.click(editButton);
    
    // Should now be in edit mode
    expect(screen.getByText('Edit Your Feedback')).toBeInTheDocument();
    
    // Change rating
    const stars = screen.getAllByTestId('star');
    fireEvent.click(stars[4]); // 5 stars
    
    // Update comment
    const commentTextarea = screen.getByDisplayValue('Great session!');
    fireEvent.change(commentTextarea, { target: { value: 'Amazing session!' } });
    
    // Submit update
    const updateButton = screen.getByText('Update Feedback');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(mentorshipAPI.updateFeedback).toHaveBeenCalledWith('feedback-1', {
        rating: 5,
        comment: 'Amazing session!'
      });
      expect(screen.getByText(/Feedback updated successfully/)).toBeInTheDocument();
    });
  });

  test('deletes existing feedback', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    renderComponent({ existingFeedback: mockFeedback });
    
    // Click delete button
    const deleteButton = screen.getByTestId('trash-icon');
    fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this feedback?');
    
    await waitFor(() => {
      expect(mentorshipAPI.deleteFeedback).toHaveBeenCalledWith('feedback-1');
      expect(screen.getByText(/Feedback deleted successfully/)).toBeInTheDocument();
    });
  });

  test('cancels edit mode', async () => {
    renderComponent({ existingFeedback: mockFeedback });
    
    // Click edit button
    const editButton = screen.getByTestId('edit-icon');
    fireEvent.click(editButton);
    
    // Should be in edit mode
    expect(screen.getByText('Edit Your Feedback')).toBeInTheDocument();
    
    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Should be back to view mode
    expect(screen.getByText('Your Feedback')).toBeInTheDocument();
    expect(screen.queryByText('Edit Your Feedback')).not.toBeInTheDocument();
  });

  test('handles API errors', async () => {
    mentorshipAPI.submitFeedback.mockRejectedValue(new Error('API Error'));
    
    renderComponent();
    
    // Select rating and add comment
    const stars = screen.getAllByTestId('star');
    fireEvent.click(stars[3]);
    
    const commentTextarea = screen.getByPlaceholderText('Share your experience with this mentorship session...');
    fireEvent.change(commentTextarea, { target: { value: 'Test comment' } });
    
    // Submit
    const submitButton = screen.getByText('Submit Feedback');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to submit feedback/)).toBeInTheDocument();
    });
  });

  test('displays character count for comment', () => {
    renderComponent();
    
    const commentTextarea = screen.getByPlaceholderText('Share your experience with this mentorship session...');
    fireEvent.change(commentTextarea, { target: { value: 'Test comment with more characters' } });
    
    expect(screen.getByText(/32\/500 characters/)).toBeInTheDocument();
  });

  test('shows feedback guidelines', () => {
    renderComponent();
    
    expect(screen.getByText('Feedback Guidelines')).toBeInTheDocument();
    expect(screen.getByText(/Be specific and constructive/)).toBeInTheDocument();
    expect(screen.getByText(/Focus on the mentorship experience/)).toBeInTheDocument();
  });

  test('prevents submission when rating is 0', () => {
    renderComponent();
    
    const submitButton = screen.getByText('Submit Feedback');
    expect(submitButton).toBeDisabled();
    
    // Select rating
    const stars = screen.getAllByTestId('star');
    fireEvent.click(stars[2]);
    
    expect(submitButton).not.toBeDisabled();
  });
});
