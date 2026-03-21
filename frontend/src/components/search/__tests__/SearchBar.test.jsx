import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchBar from '../SearchBar';
import * as searchAPI from '../../../services/searchAPI';

// Mock the API
jest.mock('../../../services/searchAPI');

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
  TrendingUp: () => <div data-testid="trending-icon">Trending</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  FileText: () => <div data-testid="file-icon">File</div>,
  ChevronDown: () => <div data-testid="chevron-down">Down</div>,
}));

describe('SearchBar', () => {
  const mockSuggestions = [
    { type: 'post', id: 1, text: 'React Tutorial', description: 'Learn React basics' },
    { type: 'user', id: 1, text: 'John Doe', description: 'React Developer' },
    { type: 'mentor', id: 1, text: 'Jane Smith', description: 'React Expert' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => '[]'),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });

    // Mock API responses
    searchAPI.getAutocompleteSuggestions.mockResolvedValue({
      suggestions: mockSuggestions
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <SearchBar {...props} />
      </BrowserRouter>
    );
  };

  test('renders search bar with placeholder', () => {
    renderComponent();
    
    expect(screen.getByPlaceholderText('Search posts, users, mentors...')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  test('shows suggestions when typing', async () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.change(input, { target: { value: 'react' } });
    
    await waitFor(() => {
      expect(searchAPI.getAutocompleteSuggestions).toHaveBeenCalledWith('react', 'general', 8);
    });
  });

  test('does not show suggestions for short queries', async () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.change(input, { target: { value: 'a' } });
    
    // Should not call API for queries shorter than 2 characters
    expect(searchAPI.getAutocompleteSuggestions).not.toHaveBeenCalled();
  });

  test('displays suggestions dropdown', async () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'react' } });
    
    await waitFor(() => {
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
      expect(screen.getByText('React Tutorial')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  test('handles suggestion click', async () => {
    const mockOnSearch = jest.fn();
    renderComponent({ onSearch: mockOnSearch });
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'react' } });
    
    await waitFor(() => {
      expect(screen.getByText('React Tutorial')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('React Tutorial'));
    
    expect(mockOnSearch).toHaveBeenCalledWith('React Tutorial');
  });

  test('handles search submission', () => {
    const mockOnSearch = jest.fn();
    renderComponent({ onSearch: mockOnSearch });
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.change(input, { target: { value: 'react tutorial' } });
    fireEvent.submit(input);
    
    expect(mockOnSearch).toHaveBeenCalledWith('react tutorial');
  });

  test('clears search input', () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.change(input, { target: { value: 'react' } });
    
    expect(input.value).toBe('react');
    
    const clearButton = screen.getByTestId('x-icon');
    fireEvent.click(clearButton);
    
    expect(input.value).toBe('');
  });

  test('shows recent searches', () => {
    // Mock recent searches
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify(['react', 'javascript', 'css'])),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });

    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.focus(input);
    
    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('css')).toBeInTheDocument();
  });

  test('clears recent searches', () => {
    // Mock recent searches
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify(['react', 'javascript'])),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });

    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.focus(input);
    
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('recentSearches');
  });

  test('shows quick actions', () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.focus(input);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Trending Posts')).toBeInTheDocument();
    expect(screen.getByText('Find Mentors')).toBeInTheDocument();
  });

  test('handles keyboard navigation', async () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'react' } });
    
    await waitFor(() => {
      expect(screen.getByText('React Tutorial')).toBeInTheDocument();
    });
    
    // Test arrow down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // First suggestion should be active
    
    // Test enter key
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Should trigger search with first suggestion
    // This would need more complex testing to verify the exact behavior
  });

  test('hides suggestions on escape', async () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'react' } });
    
    await waitFor(() => {
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
    });
    
    fireEvent.keyDown(input, { key: 'Escape' });
    
    // Suggestions should be hidden
    expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();
  });

  test('hides suggestions on click outside', async () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'react' } });
    
    await waitFor(() => {
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
    });
    
    // Click outside
    fireEvent.mouseDown(document.body);
    
    // Suggestions should be hidden
    expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();
  });

  test('shows no results message', async () => {
    searchAPI.getAutocompleteSuggestions.mockResolvedValue({ suggestions: [] });
    
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'xyz123' } });
    
    await waitFor(() => {
      expect(screen.getByText('No suggestions found')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term')).toBeInTheDocument();
    });
  });

  test('shows loading state', async () => {
    searchAPI.getAutocompleteSuggestions.mockImplementation(() => new Promise(() => {}));
    
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.change(input, { target: { value: 'react' } });
    
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    searchAPI.getAutocompleteSuggestions.mockRejectedValue(new Error('API Error'));
    
    renderComponent();
    
    const input = screen.getByPlaceholderText('Search posts, users, mentors...');
    fireEvent.change(input, { target: { value: 'react' } });
    
    await waitFor(() => {
      // Should not crash and should not show suggestions
      expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();
    });
  });
});
