// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Scryon',
  tagline: 'AI Phone Call Intelligence Platform',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  url: 'https://docs.scryon.ai',
  baseUrl: '/',

  organizationName: 'FluxonLabs',
  projectName: 'scryon-docs',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/FluxonLabs/scryon-docs/tree/main/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/scryon-social-card.jpg',
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      navbar: {
        title: '',
        hideOnScroll: false,
        logo: {
          alt: 'Scryon',
          src: 'img/scryon_blue.png',
          srcDark: 'img/scryon_light.png',
          height: 28,
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            to: '/docs/getting-started/overview',
            label: 'Getting Started',
            position: 'left',
          },
          {
            to: '/docs/features/transcription',
            label: 'Features',
            position: 'left',
          },
          {
            to: '/docs/architecture/system-overview',
            label: 'Architecture',
            position: 'left',
          },
          {
            href: 'https://github.com/FluxonLabs/scryon-docs',
            position: 'right',
            className: 'navbar-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {label: 'Overview', to: '/docs/getting-started/overview'},
              {label: 'Quick Start', to: '/docs/getting-started/quickstart'},
              {label: 'Configuration', to: '/docs/getting-started/configuration'},
              {label: 'Local Setup', to: '/docs/getting-started/local-setup'},
            ],
          },
          {
            title: 'Features',
            items: [
              {label: 'Transcription', to: '/docs/features/transcription'},
              {label: 'Speaker Diarization', to: '/docs/features/diarization'},
              {label: 'AI Analysis', to: '/docs/features/analysis'},
              {label: 'Semantic Search', to: '/docs/features/semantic-search'},
            ],
          },
          {
            title: 'Resources',
            items: [
              {label: 'Architecture', to: '/docs/architecture/system-overview'},
              {label: 'Android SDK', to: '/docs/android/permissions'},
              {label: 'Operations', to: '/docs/operations/deployment'},
              {label: 'Privacy & Security', to: '/docs/privacy-and-security'},
            ],
          },
          {
            title: 'Company',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/FluxonLabs',
              },
              {
                label: 'Contributing',
                to: '/docs/development/contributing',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} FluxonLabs. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.oneLight,
        darkTheme: prismThemes.oneDark,
        additionalLanguages: ['kotlin', 'java', 'bash', 'json', 'yaml', 'sql'],
      },
    }),
};

export default config;
