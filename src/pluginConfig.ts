import type { ExternalPluginConfig } from '@windy/interfaces';
const config: ExternalPluginConfig = {
  name: 'windy-plugin-flight-route-analyzer',
  version: '1.2.3',
  icon: '✈️',
  title: 'Flight Route Analyzer',
  description: 'Визуализация маршрута ICAO, GPX для Windy и настройки навигационных баз; не для оперативной навигации.',
  author: 'Flight Route Analyzer — prototype',
  desktopUI: 'rhpane',
  mobileUI: 'fullscreen',
  routerPath: '/flight-route-analyzer',
  private: true,
};
export default config;
