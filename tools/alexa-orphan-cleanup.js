/*
 * Alexa orphan device cleanup
 * ---------------------------------------------------------------------------
 * Bulk-deletes smart home devices left behind by your own (development-stage)
 * Alexa skills, such as old Home Assistant skills you rebuilt or deleted.
 *
 * Uses Amazon's UNDOCUMENTED internal API. It can break without notice.
 *
 * Usage:
 *   1. Sign in to amazon.com in a desktop browser.
 *   2. Open https://alexa.amazon.com/api/behaviors/entities?skillId=amzn1.ask.1p.smarthome
 *      (or the pitangui / layla / alexa.amazon.de / alexa.amazon.co.jp equivalent)
 *      and confirm it returns JSON. Stay on that tab.
 *   3. Open DevTools (F12) -> Console, paste this entire file, press Enter.
 *   4. Review the dry-run output. Then set DRY_RUN = false and run again.
 *   5. Refresh the tab and re-run with DRY_RUN = true to verify.
 *
 * Safety:
 *   - Only targets devices whose applianceId decodes to stage "development".
 *     Published third-party skills ("live") and Echo built-ins are never touched.
 *   - Add any skill ID you want to keep to KEEP_SKILL_IDS.
 *
 * Based on work shared in https://github.com/Shereef/Python-Delete-Alexa-Devices/issues/9
 */
(async () => {
  // ---------------- settings ----------------
  const DRY_RUN = true;          // set to false to actually delete
  const KEEP_SKILL_IDS = [       // skill IDs whose devices should be kept
    // 'amzn1.ask.skill.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  ];
  const CSRF = '';               // only needed if deletes don't stick (see docs)
  const DELAY_MS = 150;          // pause between deletes
  // ------------------------------------------

  const parse = id => {
    const m = id?.match(/^SKILL_([A-Za-z0-9+/=]+)_(.+)$/);
    if (!m) return null;
    try { return { ...JSON.parse(atob(m[1])), endpoint: m[2] }; } catch { return null; }
  };

  const res = await fetch('/nexus/v1/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query: 'query { endpoints { items { friendlyName legacyAppliance { applianceId } } } }' }),
  });
  if (!res.ok) {
    console.error('Device list request failed:', res.status, '- are you on an alexa.amazon.* tab and signed in?');
    return;
  }
  const items = (await res.json())?.data?.endpoints?.items ?? [];

  const parsed = items.map(d => ({
    name: d.friendlyName,
    id: d.legacyAppliance?.applianceId,
    meta: parse(d.legacyAppliance?.applianceId),
  }));

  // Summary by skill
  const counts = parsed.reduce((acc, d) => {
    const key = d.meta ? `${d.meta.skillId} [${d.meta.stage}]` : '(non-skill)';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log(`Total smart home endpoints: ${parsed.length}`);
  console.table(Object.entries(counts).map(([skill, count]) => ({ skill, count })));

  const targets = parsed.filter(d =>
    d.id && d.meta?.stage === 'development' && !KEEP_SKILL_IDS.includes(d.meta.skillId)
  );

  console.log(`Targets (development-stage, not kept): ${targets.length}`);
  console.table(targets.map(d => ({ name: d.name, skill: d.meta.skillId.slice(-12), endpoint: d.meta.endpoint })));

  if (DRY_RUN) {
    console.log('DRY RUN - nothing deleted. Set DRY_RUN = false to delete.');
    return;
  }
  if (!targets.length) {
    console.log('Nothing to delete.');
    return;
  }

  const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  if (CSRF) headers.csrf = CSRF;

  let n = 0;
  for (const d of targets) {
    const r = await fetch(`/api/phoenix/appliance/${encodeURIComponent(d.id)}`, { method: 'DELETE', headers });
    n++;
    if (n % 25 === 0 || r.status !== 200) console.log(`${n}/${targets.length}`, r.status, d.name);
    await new Promise(ok => setTimeout(ok, DELAY_MS));
  }
  console.log(`Done: ${n} delete requests sent. HTTP 200 does NOT guarantee deletion - refresh and re-run with DRY_RUN = true to verify.`);
})();
