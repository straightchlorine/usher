/* eslint-disable testing-library/no-unnecessary-act -- plain react-dom, no RTL installed */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PAGES, usePageMeta } from './usePageTitle';

window.IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ k }) {
  usePageMeta(k);
  return null;
}

test('every page has a title of 50-60 and description of 150-160 chars', () => {
  Object.values(PAGES).forEach((p) => {
    expect(p.title.length).toBeGreaterThanOrEqual(50);
    expect(p.title.length).toBeLessThanOrEqual(60);
    expect(p.description.length).toBeGreaterThanOrEqual(150);
    expect(p.description.length).toBeLessThanOrEqual(160);
  });
});

test('sets meta, canonical and toggles noindex', () => {
  const root = createRoot(document.createElement('div'));
  act(() => root.render(<Probe k="about" />));
  expect(document.title).toBe(PAGES.about.title);
  expect(document.querySelector('link[rel=canonical]').href).toBe('https://usher.piotrkrzysztof.dev/about');
  expect(document.querySelector('meta[name=robots]')).toBeNull();
  act(() => root.render(<Probe k="login" />));
  expect(document.querySelector('meta[name=robots]').content).toBe('noindex');
  act(() => root.unmount());
  expect(document.querySelector('meta[name=robots]')).toBeNull();
});
