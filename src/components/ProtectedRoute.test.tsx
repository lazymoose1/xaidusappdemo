import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when loading is true', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      profileStatus: 'idle',
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading your Xaidus space...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('navigates to /auth when user is null and loading is false', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      profileStatus: 'idle',
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user exists', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', role: 'teen', displayName: 'Test' },
      session: { access_token: 'jwt' },
      loading: false,
      profileStatus: 'loaded',
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate while still loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      profileStatus: 'idle',
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('waits for profile resolution when session exists but user is not loaded yet', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: { access_token: 'jwt' },
      loading: false,
      profileStatus: 'loading',
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading your Xaidus space...')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
