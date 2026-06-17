// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/overview',
        'getting-started/quickstart',
        'getting-started/configuration',
        'getting-started/local-setup',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/transcription',
        'features/diarization',
        'features/analysis',
        'features/speaker-resolution',
        'features/voice-embedding',
        'features/semantic-search',
        'features/search',
        'features/audio-preprocessing',
        'features/analysis-sharing',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/system-overview',
        'architecture/call-processing-pipeline',
        'architecture/data-model',
        'architecture/storage-layout',
        'architecture/observability',
      ],
    },
    {
      type: 'category',
      label: 'Android',
      items: [
        'android/permissions',
        'android/notifications',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'development/contributing',
        'development/coding-conventions',
        'development/testing',
        'development/database-migrations',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'operations/deployment',
        'operations/monitoring',
        'operations/runbook',
        'operations/troubleshooting',
      ],
    },
    {
      type: 'doc',
      id: 'privacy-and-security',
      label: 'Privacy & Security',
    },
  ],
};

export default sidebars;
