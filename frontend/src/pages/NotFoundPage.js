import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Icon, LinkButton, UpNext } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';
import './NotFoundPage.css';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  const { user } = useAuth();
  return (
    <section className="not-found">
      <div className="not-found__intro">
        <span className="not-found__icon">
          <Icon name="search" size={48} />
        </span>
        <h1 className="not-found__title">Page not found</h1>
        <p className="not-found__body">We couldn't find that page. The link may be old or mistyped; the fixtures list is the best place to start.</p>
        <div className="not-found__actions">
          <LinkButton to="/" variant="solid" size="lg">
            Back to Fixtures
          </LinkButton>
          <LinkButton to={user ? '/tickets' : '/login'} variant="quiet">
            {user ? 'My tickets' : 'Sign in'}
          </LinkButton>
        </div>
      </div>
      <div className="not-found__next">
        <UpNext />
      </div>
    </section>
  );
}
