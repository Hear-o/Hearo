---
title: First-session psycho-education — source text
tags: [clinical, content, research]
audience: clinician, product
status: source
---

# First-session psycho-education

Source: Dr. Michal Hirschman, 2026-06-09 meeting. Hebrew is the source language; English is the translation reviewed against the clinical intent. The Hebrew text is reproduced verbatim from her doc.

This content appears once, on the user's first session, between Home → Begin and the session itself. The screen is also reachable on demand from `/setup` via the "Re-read the intro" link.

The intent is therapeutic, not informational. Two messages must come through:

1. **The body's response is not a malfunction.** It's an adaptive system stuck at maximum sensitivity. Naming this changes the user's relationship to their own arousal.
2. **The upcoming practice will teach the system the danger has passed.** The exercise itself is the treatment; the screen is the priming.

---

## Step 1 — Amygdala as smoke detector

**HE (source):**
> כדי להבין למה טריגרים מציפים אותנו, חשוב להכיר את האמיגדלה, אזור במוח שמתפקד כ'גלאי העשן' של הגוף. במצב סכנה, האמיגדלה מפעילה מיד את מערכת החירום הפיזיולוגית. הדופק נהיה מהיר, הנשימה נהיית שטחית, לפעמים נחווה מין 'ראיית מנהרה', מתח השרירים עולה והגוף מכין אותנו לתגובת הישרדות של הילחם או ברח.

**EN:**
> To understand why triggers overwhelm us, it helps to know the amygdala — a region in the brain that works as the body's smoke detector. In a moment of danger, it activates the body's emergency system instantly: heart races, breath gets shallow, tunnel vision, muscles tense, the body prepares to fight or flee.

## Step 2 — Sensitivity dialed up while under threat

**HE (source):**
> כשאנו נמצאים באזור סכנה או תחת איום מתמשך, מערכת העצבים מבצעת התאמה חיונית. היא מכוונת את רגישות הגלאי למקסימום כדי לשמור עלינו ערניים.

**EN:**
> When we live inside danger — or under continuous threat — the nervous system makes a vital adjustment. It turns the detector's sensitivity all the way up. That's what keeps us alive.

## Step 3 — Sensitivity doesn't come back down

**HE (source):**
> הבעיה היא שגם כשהאיום חולף והסביבה חוזרת להיות בטוחה, הגלאי לרוב נשאר ברגישות שיא. במצב זה, כל גירוי קטן שמזכיר את האירוע המקורי, צליל, ריח או מקום מסוים, מקפיץ מיד את האזעקה, רק שהפעם זוהי אזעקת שווא. המוח מאותת על סכנת חיים מיידית, למרות שבמציאות הנוכחית הכל רגוע ובטוח.

**EN:**
> The problem is that even after the threat passes and the world is safe again, the detector usually stays at maximum sensitivity. So any small reminder of the original event — a sound, a smell, a place — instantly fires the alarm. The brain signals an immediate life-threat, while the actual present is calm and safe. A false alarm.

## Step 4 — Not a malfunction

**HE (source):**
> המצוקה והתגובה הגופנית שאתה חווה אינן מעידות על קלקול, אלא דווקא על מערכת הגנה יעילה שהתאימה את עצמה לפעול על 'הגדרות חירום' בשביל לעזור לך לשרוד בתוך מציאות כאוטית ומסוכנת.

**EN:**
> The distress and the physical response you feel are not a sign of malfunction. They're a protection system that adapted to operate on 'emergency settings' so you could survive a chaotic and dangerous reality.

This is the load-bearing reframe. Without it the user enters exposure with the implicit model "something is wrong with me." With it, the model is "my body learned this; my body can also unlearn this."

## Step 5 — What the practice does

**HE (source):**
> בתרגיל הקרוב אנחנו נלמד את המערכת, בצורה הדרגתית ובסביבה מוגנת, שהסכנה חלפה ושניתן להוריד את הרגישות.

**EN:**
> In the practice that follows, gradually and in a protected space, we'll teach the system that the danger has passed — and that the sensitivity can come down.

---

## Implementation note

The rendered screen ([`src/app/psychoed.tsx`](../../src/app/psychoed.tsx)) reads from [`getPsychoEducation()`](../../src/lib/content/content.ts) and renders the five paragraphs as separate `<Text>` blocks. The continue label is `"I'm ready"` / `"אני מוכן"`.

The `psychoEducationSeen` boolean ([`storage.ts`](../../src/lib/storage/storage.ts)) gates the screen — shown once on first launch, then skipped on subsequent Begin presses. Re-reading from Setup does NOT reset the flag.
