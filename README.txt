Windy Flight Route Analyzer v0.8.0 - patch for missing buildWindyPlannerRequest export

Install:
1. Upload ZIP to project root in Codespaces.
2. unzip -o Windy-RoutePlanner-Export-HOTFIX-v0.8.0.zip
3. python3 tools/repair_route_planner.py
4. npm run typecheck:core && npm test && npm run build
5. git add src/routePlanner.ts tools/repair_route_planner.py
6. git commit -m "Fix routePlanner export for v0.8.0" && git push origin main
7. GitHub Actions -> publish-plugin -> Run workflow (only if v0.8.0 was not published).

Important: the internal Windy Route Planner has no publicly documented route-injection
API. This patch makes the code compile but does not guarantee that the internal
planner will accept the passed coordinates. GPX export remains the fallback.

The patch preserves all existing functions in src/routePlanner.ts and makes a backup
(src/routePlanner.ts.before-route-fix.bak). It does not change the navigation database,
Google Drive, or plugin version number.
