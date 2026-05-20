import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatRoomHeader } from './ChatRoomHeader';

describe('ChatRoomHeader', () => {
  it('shows Japanese connection copy and menu actions', () => {
    const onOpenPost = vi.fn();
    const onOpenProfile = vi.fn();
    const onCreateAppointment = vi.fn();
    const onReportChat = vi.fn();
    const onCloseChat = vi.fn();

    render(
      <ChatRoomHeader
        partnerName="partner-user"
        connectionState="reconnecting"
        lastActiveLabel="最終確認 12:30"
        showHeaderMenu={true}
        onBack={vi.fn()}
        onToggleMenu={vi.fn()}
        onOpenPost={onOpenPost}
        onOpenProfile={onOpenProfile}
        onCreateAppointment={onCreateAppointment}
        onReportChat={onReportChat}
        onCloseChat={onCloseChat}
      />
    );

    expect(screen.getByText('再接続中')).toBeTruthy();
    expect(screen.getByText('商品詳細を見る')).toBeTruthy();
    expect(screen.getByText('相手のプロフィールを見る')).toBeTruthy();
    expect(screen.getByText('取引予定を作成')).toBeTruthy();

    fireEvent.click(screen.getByText('商品詳細を見る'));
    fireEvent.click(screen.getByText('相手のプロフィールを見る'));
    fireEvent.click(screen.getByText('取引予定を作成'));
    fireEvent.click(screen.getByText('通報する'));
    fireEvent.click(screen.getByText('チャットを閉じる'));

    expect(onOpenPost).toHaveBeenCalledTimes(1);
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
    expect(onCreateAppointment).toHaveBeenCalledTimes(1);
    expect(onReportChat).toHaveBeenCalledTimes(1);
    expect(onCloseChat).toHaveBeenCalledTimes(1);
  });
});
