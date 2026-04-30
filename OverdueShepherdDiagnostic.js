// Variables used by Scriptable.
// icon-color: deep-gray; icon-glyph: stethoscope;

// OverdueShepherdDiagnostic
// Version: 1.2.0 (2026-04-30)
// Repo:    https://github.com/khidaka/overdue-shepherd
//
// 全リスト横断で未完了リマインダーをダンプし、OverdueShepherd 本体が
// どのケース判定をするかを副作用なしで確認する診断スクリプト。
// v1.2.0: アプリ内実行時に QuickLook で全件、Alert でサマリを表示。
//         ショートカット実行時はレポート全文を返す。

const TAG_RE = /\((\d+)日遅延\)/;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmt(date) {
  if (!date) return "(no due)";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function classify(r, today0) {
  if (r.isCompleted) return "skip(completed)";
  const due = r.dueDate;
  if (!due) return "skip(no due)";
  const m = r.title.match(TAG_RE);
  if (due >= today0 && m) return `A:reset (drop (${m[1]}日遅延))`;
  if (due < today0 && m) return `B:bump ((${m[1]}日遅延) -> (${parseInt(m[1], 10) + 1}日遅延))`;
  if (due < today0 && !m) return "C:tag (add (1日遅延))";
  return "skip(no-op)";
}

async function main() {
  const today0 = startOfToday();
  const reminders = await Reminder.allIncomplete();

  const lines = [];
  lines.push(`Found ${reminders.length} incomplete reminder(s). today0=${fmt(today0)}`);
  lines.push("---");

  const buckets = { A: 0, B: 0, C: 0, skip: 0 };

  for (const r of reminders) {
    const verdict = classify(r, today0);
    lines.push(`[${verdict}] "${r.title}" due=${fmt(r.dueDate)} list=${r.calendar ? r.calendar.title : "?"}`);
    if (verdict.startsWith("A")) buckets.A++;
    else if (verdict.startsWith("B")) buckets.B++;
    else if (verdict.startsWith("C")) buckets.C++;
    else buckets.skip++;
  }

  lines.push("---");
  const summary = `Summary: A(reset)=${buckets.A} B(bump)=${buckets.B} C(tag)=${buckets.C} skip=${buckets.skip}`;
  lines.push(summary);

  const report = lines.join("\n");
  console.log(report);

  if (config.runsInApp) {
    // 件数が多いと Alert では読めないため QuickLook で全文表示
    await QuickLook.present(report, false);
    const a = new Alert();
    a.title = "OverdueShepherdDiagnostic";
    a.message = summary;
    a.addAction("OK");
    await a.present();
  } else {
    Script.setShortcutOutput(report);
  }
}

await main();
Script.complete();
