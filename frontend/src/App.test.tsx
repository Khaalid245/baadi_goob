import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { Button } from './components/ui/Button';
import { StatusBadge } from './components/ui/StatusBadge';
import { StatsCard } from './components/ui/StatsCard';

describe('App and Core UI Primitives', () => {
  it('renders the layout navbar with Furan branding', () => {
    render(<App />);
    expect(screen.getAllByText('Furan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Find opportunities').length).toBeGreaterThan(0);
  });

  it('renders the Button with primary variant and 44px min-height style', () => {
    render(<Button variant="primary">Get started</Button>);
    const btn = screen.getByRole('button', { name: 'Get started' });
    expect(btn).toBeTruthy();
    expect(btn.className).toContain('min-h-[44px]');
    expect(btn.className).toContain('bg-[#1F5FBF]');
  });

  it('renders StatusBadge with verified semantic swatches', () => {
    render(<StatusBadge status="SHORTLISTED" />);
    expect(screen.getByText('Shortlisted')).toBeTruthy();
  });

  it('renders StatsCard with prominent metric', () => {
    render(<StatsCard label="Active opportunities" value="03" supportingText="Open for applications" />);
    expect(screen.getByText('Active opportunities')).toBeTruthy();
    expect(screen.getByText('03')).toBeTruthy();
    expect(screen.getByText('Open for applications')).toBeTruthy();
  });
});
