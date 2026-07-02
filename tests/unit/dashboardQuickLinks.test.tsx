// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardQuickLinks } from '@/components/DashboardQuickLinks';

describe('DashboardQuickLinks', () => {
  it('links to the Daily Log, DSA Tracker, and Weekly Review pages', () => {
    render(<DashboardQuickLinks />);

    expect(screen.getByRole('link', { name: /daily log/i })).toHaveAttribute('href', '/daily-log');
    expect(screen.getByRole('link', { name: /dsa tracker/i })).toHaveAttribute('href', '/dsa');
    expect(screen.getByRole('link', { name: /weekly review/i })).toHaveAttribute(
      'href',
      '/weekly-review',
    );
  });
});
