import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route(':lang', 'routes/$lang.tsx'),
  route(':lang/:codeLanguage/play', 'routes/$lang.$codeLanguage.play.tsx'),
] satisfies RouteConfig;
