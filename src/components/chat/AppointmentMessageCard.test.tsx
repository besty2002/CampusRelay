import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppointmentMessageCard } from './AppointmentMessageCard';
import type { ChatMessage } from '../../types';

const baseMessage: ChatMessage = {
  id: 'msg-1',
  room_id: 'room-1',
  sender_id: 'user-1',
  text: '取引予定を提案しました。',
  is_read: false,
  created_at: '2026-05-16T10:00:00.000Z',
  profiles: {
    display_name: 'Student',
  },
  appointment_data: {
    date: '2026-05-17T12:30:00',
    location: '北千住駅',
    status: 'proposed',
  },
};

describe('AppointmentMessageCard', () => {
  it('shows accept and cancel actions for the receiver on a proposed appointment', () => {
    const onAccept = vi.fn();
    const onCancel = vi.fn();

    render(
      <AppointmentMessageCard
        message={{ ...baseMessage, sender_id: 'other-user' }}
        isMe={false}
        onAccept={onAccept}
        onCancel={onCancel}
        onEdit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('承認する'));
    fireEvent.click(screen.getByText('取消'));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows a retry action when an appointment was canceled', () => {
    const onEdit = vi.fn();

    render(
      <AppointmentMessageCard
        message={{
          ...baseMessage,
          appointment_data: {
            ...baseMessage.appointment_data!,
            status: 'canceled',
          },
        }}
        isMe={true}
        onAccept={vi.fn()}
        onCancel={vi.fn()}
        onEdit={onEdit}
      />
    );

    fireEvent.click(screen.getByText('再提案する'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('shows a completion-waiting badge for accepted appointments', () => {
    render(
      <AppointmentMessageCard
        message={{
          ...baseMessage,
          appointment_data: {
            ...baseMessage.appointment_data!,
            status: 'accepted',
          },
        }}
        isMe={false}
        onAccept={vi.fn()}
        onCancel={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('完了待ち')).toBeTruthy();
  });
});
