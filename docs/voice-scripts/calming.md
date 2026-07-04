# Calming protocol — voice script

Source: Dr. Michal Hirschman, 2026-06-09 meeting. Hebrew is the source; English is the translation reviewed against the clinical intent.

The protocol runs five steps in order. No skip. The script ends every session it runs in — distinct from the calming voice script *inside* an active session (which lives in [`src/lib/content/content.ts`](../../src/lib/content/content.ts) under each scene's `voice.calming`).

Audio note: v1 ships text-only. When recordings exist, the narrator should pace breath cues with a soft inhale/exhale sound before each count.

---

## Step 1 — Validation (~18s)

**HE (source):**
> הכל בסדר, אתה בטוח עכשיו. מה שאתה מרגיש זה התקף חרדה. חרדה היא כמו גל, היא עולה עכשיו, זה מרגיש מציף ונורא אבל הגל הזה יגיע לשיא וייחלש. הגוף שלך לא יכול להישאר במתח הזה לאורך זמן והוא יירגע מעצמו. אני איתך בתוך הגל הזה, הוא יעבור.

**EN:**
> It's okay. You're safe now. What you're feeling is anxiety, and anxiety is a wave. It rises now — it feels overwhelming — but the wave will peak, and it will fall. Your body can't hold this much tension for long. It will settle on its own. I'm here with you, inside this wave. It will pass.

---

## Step 2 — Body grounding (~14s)

**HE (source):**
> בוא נחזור לרגע לגוף שלך. אם אתה עומד, שב. תרגיש את כפות הרגליים שלך נוגעות ברצפה בצורה יציבה, תנסה לדחוף אותם עוד יותר לכיוון הרצפה. תרגיש את המשקל של הגוף שלך על הכיסא.

**EN:**
> Let's come back to your body for a moment. If you're standing, sit down. Feel your feet on the floor — feel them touching, steadily. Try to press them a little more into the floor. Feel the weight of your body in the chair.

---

## Step 3 — Box breathing (4-4-4-4 × 2 cycles, ~32s)

Animated circle: grows on inhale, holds at full, shrinks on exhale, holds at empty.

**HE prompts:** שאיפה (inhale) / החזקה (hold) / נשיפה (exhale) / החזקה (hold)

**EN prompts:** Breathe in / Hold / Breathe out / Hold

The Hirschman doc notes: the narrator should make a soft breath or exhale sound at the start of each phase, then count "2, 3, 4" through the phase.

---

## Step 4 — 3-2-1 sensory grounding (~27s)

Each sub-step shows for ~9 seconds.

**HE / EN:**

| Count | Sense | Prompt (HE) | Prompt (EN) |
|---|---|---|---|
| 3 | See | שים לב ל-3 דברים שאתה יכול לראות ברגע זה. | Notice 3 things you can see around you. |
| 2 | Hear | שים לב ל-2 צלילים שאתה יכול לשמוע. | Notice 2 sounds you can hear. |
| 1 | Touch | שים לב למרקם אחד שאתה יכול לגעת בו — הבגד שלך, המשטח שלידך. | Notice 1 texture you can touch — your clothing, the surface near you. |

---

## Step 5 — Close (~22s)

**HE (source):**
> קח עוד נשימה עמוקה ואיטית. המצוקה שהרגשת הולכת ופוחתת. הגל החריף עבר והגוף שלך מתחיל לחזור לאיזון. תרגול חשיפה דורש אנרגיה ומה שקרה עכשיו הוא חלק טבעי לחלוטין מהתהליך. עבור התרגול היום זהו סימן לעצור כאן ולתת לגוף ולנפש שלך לנוח. עשית עבודה חשובה בכך שנשארת והתמודדת. אנחנו נמשיך את התרגול בפעם אחרת.

**EN:**
> Take one more slow, deep breath. The sharp wave has passed. Your body is finding its way back. This kind of practice takes energy, and what just happened is a natural part of the process. For today, this is the place to stop. You did important work by staying. We'll continue another time.

The final line — *"you did important work by staying"* — is load-bearing. It reframes the protocol as a completion, not a retreat. This is the line that distinguishes parasympathetic regulation from operant avoidance. Do not paraphrase.

---

## Out of scope (v1)

- **Recovery offer**: the Hirschman doc closes with "we've gathered some calming videos and sounds for you below." v1 omits this — there's nothing to gather yet. When the content library exists, append a "rest with..." card here.
- **HR-driven auto-trigger**: deferred to v2 (see [`openspec/changes/add-calming-protocol/proposal.md` "Out of scope"](../../openspec/changes/add-calming-protocol/proposal.md)).
