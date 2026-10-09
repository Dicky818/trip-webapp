import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '../api/supabaseApi';
import HomePage from '../pages/HomePage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  fetchTrips: vi.fn().mockResolvedValue(undefined),
  showToast: vi.fn(),
  updateTrip: vi.fn().mockResolvedValue({ success: true, data: { Trip_ID: 'trip-owner' } }),
}));

const { navigate, fetchTrips, showToast, updateTrip } = mocks;

let trips: Trip[] = [];

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    trips,
    tripsLoading: false,
    fetchTrips,
    showToast,
  }),
}));

vi.mock('../api/supabaseApi', async () => {
  const actual = await vi.importActual<typeof import('../api/supabaseApi')>('../api/supabaseApi');
  return {
    ...actual,
    api: {
      createTrip: vi.fn(),
      updateTrip: mocks.updateTrip,
      deleteTrip: vi.fn(),
      generateShareCode: vi.fn(),
      joinTripByCode: vi.fn(),
    },
  };
});

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    Trip_ID: 'trip-owner',
    Trip_Name: '大阪京都之旅',
    Start_Date: '2027-01-13T00:00:00.000Z',
    End_Date: '2027-01-20T00:00:00.000Z',
    Base_Currency: 'HKD',
    Created_At: '2026-10-09T00:00:00.000Z',
    Updated_At: '2026-10-09T00:00:00.000Z',
    Status: 'Active',
    Is_Owner: true,
    ...overrides,
  };
}

describe('home trip-card editing', () => {
  beforeEach(() => {
    trips = [makeTrip()];
    navigate.mockReset();
    fetchTrips.mockClear();
    showToast.mockClear();
    updateTrip.mockClear();
    updateTrip.mockResolvedValue({ success: true, data: { Trip_ID: 'trip-owner' } });
    window.scrollTo = vi.fn();
  });

  it('opens the matching owner-card editor with the saved trip details', () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: '修改行程：大阪京都之旅' }));

    const dialog = screen.getByRole('dialog', { name: '修改「大阪京都之旅」' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/行程名稱/)).toHaveValue('大阪京都之旅');
    expect(within(dialog).getByLabelText(/出發日期/)).toHaveValue('2027-01-13');
    expect(within(dialog).getByLabelText(/結束日期/)).toHaveValue('2027-01-20');
    expect(within(dialog).getByLabelText(/基礎貨幣/)).toHaveValue('HKD');
  });

  it('validates and saves a card edit without changing sharing controls', async () => {
    render(<HomePage />);
    fetchTrips.mockClear();

    fireEvent.click(screen.getByRole('button', { name: '修改行程：大阪京都之旅' }));
    const dialog = screen.getByRole('dialog', { name: '修改「大阪京都之旅」' });
    fireEvent.change(within(dialog).getByLabelText(/行程名稱/), { target: { value: '北海道雪祭' } });
    fireEvent.change(within(dialog).getByLabelText(/出發日期/), { target: { value: '2027-02-03' } });
    fireEvent.change(within(dialog).getByLabelText(/結束日期/), { target: { value: '2027-02-10' } });
    fireEvent.change(within(dialog).getByLabelText(/基礎貨幣/), { target: { value: 'JPY' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '儲存變更' }));

    await waitFor(() => {
      expect(updateTrip).toHaveBeenCalledWith('trip-owner', {
        Trip_Name: '北海道雪祭',
        Start_Date: '2027-02-03',
        End_Date: '2027-02-10',
        Base_Currency: 'JPY',
      });
    });
    expect(fetchTrips).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('行程卡已更新');
  });

  it('does not display the editor for a collaborative read-only card', () => {
    trips = [makeTrip({ Trip_ID: 'trip-collaborator', Trip_Name: '同行者行程', Is_Owner: false })];

    render(<HomePage />);

    expect(screen.queryByRole('button', { name: '修改行程：同行者行程' })).not.toBeInTheDocument();
    expect(screen.getByText('協作')).toBeInTheDocument();
  });
});
