// Variables used by Scriptable.
// icon-color: deep-brown; icon-glyph: hat-cowboy;

// OverdueShepherd
// Version: 1.2.0 (2026-04-30)
// Repo:    https://github.com/khidaka/overdue-shepherd
//
// Apple リマインダーの期限切れタスクを毎朝「世話」するスクリプト。
//
// 全リスト横断で未完了リマインダーを走査し、以下 3 ケースを処理する。
//   ケース A: 期日が今日以降 + (N日遅延) タグあり -> タグ除去 (リセット)
//   ケース B: 期日が過去      + (N日遅延) タグあり -> N+1 にして期日を今日へ
//   ケース C: 期日が過去      + タグなし           -> (1日遅延) を付与し期日を今日へ
//
// 期日を今日に変更する際、元の時刻成分は保持する (年月日のみ書き換え)。
// 完了済み・期日なしのリマインダーは触らない。
//
// 注: 旗(isFlagged)の朝リセットは Scriptable の Reminder API が flag 属性を
//     公開していないため不可能。iOS ショートカット側で「フラグ付きリマインダーを
//     取得 → フラグを外す」を本スクリプト実行前後に挟んで対応する (README 参照)。

const TAG_RE = /\((\d+)日遅延\)/;

function makeTag(n) {
  return `(${n}日遅延)`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function shiftDateKeepingTime(originalDue) {
  const today = new Date();
  const d = new Date(originalDue);
  d.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
  return d;
}

function cleanTitle(title) {
  return title.replace(/\s+/g, " ").trim();
}

// EventKit priority: 0=none, 1=High, 5=Medium, 9=Low
// 1d -> Low, 2d -> Medium, 3d+ -> High
function priorityForDays(n) {
  if (n >= 3) return 1;
  if (n === 2) return 5;
  return 9;
}

async function main() {
  const today0 = startOfToday();
  const reminders = await Reminder.allIncomplete();

  let resetCount = 0;
  let bumpedCount = 0;
  let taggedCount = 0;

  for (const r of reminders) {
    if (r.isCompleted) continue;
    const due = r.dueDate;
    if (!due) continue;

    const m = r.title.match(TAG_RE);

    if (due >= today0 && m) {
      r.title = cleanTitle(r.title.replace(TAG_RE, ""));
      r.priority = 0;
      r.save();
      resetCount++;
    } else if (due < today0 && m) {
      const n = parseInt(m[1], 10) + 1;
      r.title = cleanTitle(r.title.replace(TAG_RE, makeTag(n)));
      r.dueDate = shiftDateKeepingTime(due);
      r.priority = priorityForDays(n);
      r.save();
      bumpedCount++;
    } else if (due < today0 && !m) {
      r.title = `${cleanTitle(r.title)} ${makeTag(1)}`;
      r.dueDate = shiftDateKeepingTime(due);
      r.priority = priorityForDays(1);
      r.save();
      taggedCount++;
    }
  }

  const summary = `OverdueShepherd: reset=${resetCount} bumped=${bumpedCount} tagged=${taggedCount}`;
  console.log(summary);

  if (config.runsInApp) {
    const a = new Alert();
    a.title = "OverdueShepherd";
    a.message = summary;
    a.addAction("OK");
    await a.present();
  }
}

await main();
Script.complete();
