import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const QuickStartCards = [
  {
    icon: '🚀',
    title: 'Getting Started',
    description: 'Set up Scryon and process your first call in minutes.',
    link: '/docs/getting-started/overview',
    linkText: 'Start here →',
    color: '#7C3AED',
  },
  {
    icon: '✨',
    title: 'Features',
    description: 'Transcription, diarization, AI analysis and more.',
    link: '/docs/features/transcription',
    linkText: 'Explore features →',
    color: '#0EA5E9',
  },
  {
    icon: '🏗️',
    title: 'Architecture',
    description: 'Understand the call processing pipeline and data model.',
    link: '/docs/architecture/system-overview',
    linkText: 'View architecture →',
    color: '#10B981',
  },
  {
    icon: '📱',
    title: 'Android',
    description: 'Integrate Scryon into your Android application.',
    link: '/docs/android/permissions',
    linkText: 'Android docs →',
    color: '#F59E0B',
  },
];

const FeatureCards = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Transcription',
    description: 'High-accuracy speech-to-text with word-level timestamps and confidence scores.',
    link: '/docs/features/transcription',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: 'Speaker Diarization',
    description: 'Automatically identify and separate individual speakers in multi-party calls.',
    link: '/docs/features/diarization',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: 'AI Analysis',
    description: 'Extract sentiment, key topics, action items, and summaries from every call.',
    link: '/docs/features/analysis',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
      </svg>
    ),
    title: 'Voice Embeddings',
    description: 'Vector representations of speaker voices for cross-call speaker identification.',
    link: '/docs/features/voice-embedding',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    title: 'Semantic Search',
    description: 'Find calls by meaning, not just keywords — powered by vector similarity.',
    link: '/docs/features/semantic-search',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Privacy & Security',
    description: 'Enterprise-grade encryption at rest and in transit, with full audit logging.',
    link: '/docs/privacy-and-security',
  },
];

function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className="container">
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Remember Every<br />Phone Call
          </h1>
          <p className={styles.heroSubtitle}>
            Scryon transforms raw call recordings into structured intelligence —
            transcription, speaker identification, AI analysis, and semantic search,
            all in one platform.
          </p>
          <div className={styles.heroButtons}>
            <Link
              className={clsx('button', styles.btnPrimary)}
              to="/docs/getting-started/overview"
            >
              Get Started
            </Link>
            <Link
              className={clsx('button', styles.btnGhost)}
              to="/docs/getting-started/quickstart"
            >
              Quick Start Guide
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Jump right in</h2>
        <p className={styles.sectionSubtitle}>
          Get up to speed with Scryon quickly.
        </p>
        <div className={styles.quickGrid}>
          {QuickStartCards.map((card) => (
            <Link key={card.title} to={card.link} className={styles.quickCard}>
              <div className={styles.quickCardIcon} style={{'--card-color': card.color}}>
                {card.icon}
              </div>
              <h3 className={styles.quickCardTitle}>{card.title}</h3>
              <p className={styles.quickCardDesc}>{card.description}</p>
              <span className={styles.quickCardLink}>{card.linkText}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Everything you need</h2>
        <p className={styles.sectionSubtitle}>
          A complete platform for call intelligence.
        </p>
        <div className={styles.featureGrid}>
          {FeatureCards.map((feat) => (
            <Link key={feat.title} to={feat.link} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feat.icon}</div>
              <h3 className={styles.featureTitle}>{feat.title}</h3>
              <p className={styles.featureDesc}>{feat.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to get started?</h2>
          <p className={styles.ctaSubtitle}>
            Set up Scryon in your project and start extracting intelligence from your calls today.
          </p>
          <div className={styles.heroButtons}>
            <Link className={clsx('button', styles.btnPrimary)} to="/docs/getting-started/overview">
              Read the Docs
            </Link>
            <Link
              className={clsx('button', styles.btnGhost)}
              href="https://github.com/FluxonLabs/scryon-docs"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <main>
        <QuickStart />
        <Features />
        <BottomCTA />
      </main>
    </Layout>
  );
}
