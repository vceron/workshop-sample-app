import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BookingForm } from './App.jsx';

const room = { id: 'cedar', name: 'Cedar', capacity: 6 };
const date = '2030-06-12';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  };
}

function fillRequiredFields() {
  fireEvent.change(screen.getByTestId('booking-form-title-input'), { target: { value: 'Product brainstorm' } });
  fireEvent.change(screen.getByTestId('booking-form-organizer-input'), { target: { value: 'Alex Morgan' } });
}

function submit() {
  fireEvent.click(screen.getByTestId('booking-form-submit-button'));
}

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BookingForm conflict handling', () => {
  it('shows the server conflict message and preserves title/organizer on a 409 (req-frontend-conflict-message, req-frontend-form-state-preserved)', async () => {
    const conflict = {
      error: 'This room is already booked from 2030-06-12T11:00:00.000Z to 2030-06-12T12:00:00.000Z.',
      conflictingBooking: { startTime: '2030-06-12T11:00:00.000Z', endTime: '2030-06-12T12:00:00.000Z' },
    };
    global.fetch.mockResolvedValue(jsonResponse(409, conflict));
    const onBooked = vi.fn();

    render(<BookingForm room={room} date={date} onBooked={onBooked} />);
    fillRequiredFields();
    submit();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(conflict.error);
    expect(screen.getByTestId('booking-form-title-input').value).toBe('Product brainstorm');
    expect(screen.getByTestId('booking-form-organizer-input').value).toBe('Alex Morgan');
    expect(onBooked).not.toHaveBeenCalled();
  });

  it('resets the form and calls onBooked on a successful booking (control case)', async () => {
    const booking = {
      id: 'b1', roomId: room.id, title: 'Product brainstorm', organizer: 'Alex Morgan',
      startTime: '2030-06-12T09:00:00.000Z', endTime: '2030-06-12T10:00:00.000Z',
    };
    global.fetch.mockResolvedValue(jsonResponse(201, booking));
    const onBooked = vi.fn();

    render(<BookingForm room={room} date={date} onBooked={onBooked} />);
    fillRequiredFields();
    submit();

    await waitFor(() => expect(onBooked).toHaveBeenCalledWith(booking));
    expect(screen.getByTestId('booking-form-title-input').value).toBe('');
    expect(screen.getByTestId('booking-form-organizer-input').value).toBe('');
  });
});
