// Variables used by Scriptable.
// icon-color: deep-brown; icon-glyph: tag;

// OverdueShepherdMigrateTag
// Version: 1.0.0 (2026-04-29)
// Repo:    https://github.com/khidaka/overdue-shepherd
//
// 単発の移行スクリプト。
// 旧タグ `#postponed_Nd` を新タグ `(N日遅延)` に書き換える。
// それ以外 (期日・優先度・完了状態) は一切触らない。
// 1 回実行したら役目は終了 (再実行しても旧タグが無ければ何もしない)。

const LEGACY_TAG_RE = /#postponed_(\d+)d\b/g;

function cleanTitle(title) {
  return title.replace(/\s+/g, " ").trim();
}

async function main() {
  const reminders = await Reminder.allIncomplete();

  let migratedCount = 0;
  const samples = [];

  for (const r of reminders) {
    if (r.isCompleted) continue;
    if (!LEGACY_TAG_RE.test(r.title)) continue;
    LEGACY_TAG_RE.lastIndex = 0;

    const before = r.title;
    const after = cleanTitle(
      before.replace(LEGACY_TAG_RE, (_, n) => `(${n}日遅延)`)
    );
    if (before === after) continue;

    r.title = after;
    r.save();
    migratedCount++;
    if (samples.length < 5) samples.push(`${before}  ->  ${after}`);
  }

  const summary = `OverdueShepherdMigrateTag: migrated=${migratedCount}`;
  console.log(summary);
  for (const s of samples) console.log(s);

  if (config.runsInApp) {
    const a = new Alert();
    a.title = "OverdueShepherdMigrateTag";
    a.message = `${summary}\n\n${samples.join("\n") || "(no legacy tag found)"}`;
    a.addAction("OK");
    await a.present();
  }
}

await main();
Script.complete();
