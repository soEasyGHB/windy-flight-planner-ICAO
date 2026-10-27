import type { ExternalPluginConfig } from '@windy/interfaces';
const config: ExternalPluginConfig = {
  name: 'windy-plugin-flight-route-analyzer',
  version: '0.7.4',
  icon: '✈️',
  title: 'Flight Route Analyzer',
  description: 'Маршруты IFR и предварительный метеоанализ по эшелонам; не для оперативной навигации.',
  author: 'Flight Route Analyzer — prototype',
  desktopUI: 'rhpane',
  mobileUI: 'fullscreen',
  routerPath: '/flight-route-analyzer',
  private: true,
};
export default config;
