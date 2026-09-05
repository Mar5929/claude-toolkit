---
name: unslop
description: Strip the patterns that make writing read as machine-written from a file, pasted text, or the last answer, then hand back a version with a human voice. Use when the owner types /unslop, or says "this reads like AI wrote it", "unslop this", "take the AI out of this", "make this sound human", "remove the AI tells", or asks for a draft to be cleaned up rather than rewritten from scratch. Runs only when asked, never on its own.
---

# Unslop

Take writing that already exists, name every pattern in it that reads as
machine-written, and hand back a version with those patterns gone and a voice
put back.

This runs when the owner asks for it. It never fires on its own during an
ordinary reply. How Claude writes new text is the job of the project's output
style; this is the other direction, cleaning up text that is already written.

## What it works on

In this order:

1. A file, or several files, the owner named.
2. Text the owner pasted in the same message.
3. Your own last substantial answer in this conversation.

If none of those exist, say so in one line and ask what to clean up. Never guess
at a file.

Before starting on anything long, say roughly how much text it is and get a
go-ahead.

## Run it in this order

1. **Read the project's active output style first.** Find it at
   `.claude/output-styles/<name>.md`, where `<name>` is the `outputStyle` value
   in `.claude/settings.local.json`, then `.claude/settings.json`, then
   `~/.claude/settings.json`. Where a pattern below and that style disagree, the
   style wins, because it is this project's own voice. Say in one line which
   rule you followed. Where there is no style file, the patterns below stand on
   their own.
2. **Scan for the patterns.** Work through the lists.
3. **Rewrite.** Keep the meaning. Match the tone the writing was aiming for.
4. **Put a voice back in.** See "Adding a voice" below. This half is not
   optional.
5. **Ask yourself the audit question.** "What still makes this read as machine
   written?" Fix whatever the answer names.
6. **Show the findings, then the rewrite.** Then wait.

## What never changes

The rewrite keeps all of this exactly as it was:

- Numbers, counts, dates, money, times.
- File paths, file names, branch names, commands.
- People's real names, company names, product names.
- Record ids, org names, object names, field names, and any other code
  identifier, even when the word matches something on the banned list below.
  `dd_Universe_Identifier__c` stays spelled that way. Only the prose around it
  changes.
- Quoted material, block quotes, and anything somebody else said. Rewriting a
  quotation changes what a person said.
- Code blocks and their contents.

If a pattern cannot be removed without losing one of these, keep the fact and
leave the pattern. Say in one line which one you left and why.

## Patterns to find and fix

### What the text claims

1. **Puffery.** "pivotal moment", "testament to", "evolving landscape", "setting
   the stage for", "indelible mark", "deeply rooted". Cut it and say what
   happened.
2. **Name-dropping.** Listing outlets, tools, or companies with no context. Pick
   one and say what it actually said or did.
3. **Trailing -ing clauses that add nothing.** "highlighting the need for...",
   "ensuring that...", "reflecting a wider...", "showcasing...", "fostering...".
   Delete them, or replace with a real source and a real fact.
4. **Promotional words.** "nestled", "vibrant", "breathtaking", "groundbreaking",
   "renowned", "stunning", "must-visit", "seamless". Describe the thing plainly.
5. **Attribution with nobody in it.** "Experts believe", "Industry reports
   suggest", "Some critics argue", "It is widely considered". Name the source or
   delete the sentence.
6. **The formula challenge sentence.** "Despite these challenges, X continues to
   thrive." Replace with a specific fact about what happened.
7. **Generic endings.** "The future looks bright." "Only time will tell." State
   a plan, a date, or a number, or end the piece one sentence earlier.

### The words

8. **AI vocabulary.** additionally, crucial, delve, enduring, enhance, fostering,
   garner, interplay, intricate, landscape (as an abstract noun), pivotal,
   showcase, tapestry (as an abstract noun), testament, underscore, vibrant.
   Swap in the plain word.
9. **Long ways to say "is".** "serves as", "stands as", "acts as", "boasts",
   "features". Say "is" or "has".
10. **Plain word swaps.** "utilize" becomes "use". "leverage" becomes "use".
    "facilitate" becomes "help". "numerous" becomes "many". "in the event that"
    becomes "if". "commence" becomes "start". "sufficient" becomes "enough". The
    fancier word is almost never clearer.
11. **Metaphor nouns doing technical work.** substrate, wedge, vector, locus,
    vantage, nexus, primitive (as a noun), harness (as a metaphor), surface (as
    in "API surface"), bedrock, scaffolding (as a metaphor), modality, paradigm,
    gold-plating, ratchet (as a metaphor), evacuate (for moving code), endgame,
    north star, flywheel. Each has a plainer concrete word. "substrate" becomes
    "base". "wedge in" becomes "add". "vector" becomes "way" or "method".
    "gold-plating" becomes "more than the job needs". "ratchet" becomes the real
    mechanism's name, or "a limit that only tightens". "evacuate" becomes "move
    out". "endgame" becomes "the last phase". Pick the concrete word.
12. **Adverbs propping up a weak verb.** "runs quickly" becomes "is fast" or the
    measured number. "significantly improves" becomes the measured difference.
    An adverb holding a verb up means the verb is the wrong verb.
13. **Hedge stacking.** "could potentially possibly be argued that it might"
    becomes "may". One hedge at most, and only where the doubt is real.
14. **Filler openers.** "In order to" becomes "To". "Due to the fact that"
    becomes "Because". "It is important to note that" gets deleted whole.

### The shapes

15. **"Not just X, but Y."** Say the point directly.
16. **Groups of three.** Three examples where the real number is two or five.
    Use the real number.
17. **Synonym cycling.** Protagonist, main character, central figure, and hero
    all inside one paragraph. Pick one word and repeat it. Repeating a noun is
    not a mistake.
18. **False ranges.** "from X to Y" where X and Y sit on no shared scale ("from
    scheduling to company culture"). List the items instead.
19. **Sentences the reader has to read twice.** If parsing needs a backtrack,
    split it in two or drop the clauses. One idea per sentence.
20. **Passive voice with a hidden actor.** Catch "is/are/was/were" plus a past
    participle and name who did it. "queries are validated" becomes "the
    compiler validates queries". "the file is parsed by the loader" becomes "the
    loader parses the file". Passive is fine only where the actor is unknown or
    genuinely does not matter.

### The punctuation and formatting

21. **Em dashes.** Remove them. Use a comma, a colon, or a new sentence.
    Swapping in parentheses or a hyphen-as-dash trades one tell for another. If
    a thought needs separating, end the sentence.
22. **Colons mid-sentence.** A colon before a list or an example is fine. A
    colon as a connector inside a sentence is a crutch. Rewrite so the point
    stands without it.
23. **Bold on everything.** Do not bold every proper noun, acronym, or number.
24. **Inline-header lists.** The tell is a bold label and a colon restating the
    line that follows: "**Performance:** Performance improved by 12%." Turn
    those into prose. A bold lead-in that ends in a period, names the item, and
    is followed by genuinely new detail ("**Schema in TypeScript.** Tables live
    in one file.") is fine and is not a tell.
25. **Title Case Headings.** Use sentence case.
26. **Decorative emoji.** Remove from headings and bullets. Emoji carrying real
    meaning in a status table stay.
27. **Curly quotes and curly apostrophes.** Replace with straight ones.

### The assistant leaking through

28. **Chatbot phrases.** "I hope this helps!", "Let me know if you need
    anything", "Of course!", "Certainly!", "Great question", "Found the smoking
    gun". Delete.
29. **Sycophancy.** "You're absolutely right!", "That's a fantastic point."
    Delete and answer directly.
30. **Cutoff and knowledge disclaimers.** "While specific details are limited",
    "As of my last update". Find the fact or cut the sentence.

### Sentences that name a feeling instead of a fact

31. **Say what it does, not how it feels.** "the database stays close at hand",
    "SQL you can read", "types that follow your schema" all name a feeling. The
    fix names the mechanism or a number: "`.toSQL()` returns the exact string
    sent to the database", "a column rename fails the build". Ask what the
    sentence tells the reader to do or know, then write that. If it cannot be
    restated as a concrete instruction, fact, or number, cut it.

    One more check on the same sentence: if it could sit unchanged in another
    project's documents, it says nothing about this one. Cut it.

## Adding a voice

Removing patterns is half the job. Text with every tell stripped out and nothing
put back reads as machine-written too, just blander. Do this part as well.

- **Have an opinion.** React to a fact instead of listing its pros and cons
  neutrally.
- **Vary the rhythm.** Short sentences. Then a longer one that takes its time
  and earns the length. Mix them.
- **Let a thing be two things at once.** "Impressive and slightly unsettling"
  beats "impressive."
- **Use "I" where it fits.** First person is not unprofessional.
- **Allow some mess.** Perfectly parallel structure looks machine-made.
- **Be specific.** Not "this is concerning" but "agents still churning at 3am
  with nobody watching."

The one limit: adding voice never adds a claim. Do not invent an opinion about a
fact you cannot check, and do not add colour that asserts something the original
did not say.

## What to show the owner

Two parts, findings first.

**The findings.** One line each, in the order they appear in the text. Name the
pattern, quote the phrase, give the replacement.

```text
Line 4   metaphor noun       "the north star for the team"  ->  "what the team is aiming at"
Line 11  passive voice       "the records are merged"       ->  "the batch job merges the records"
Line 19  inline-header list  "**Cost:** Cost dropped 40%."  ->  "Cost dropped 40%."
Line 26  em dash             two of them                    ->  full stops
```

Roughly 25 lines is the ceiling. Past that, group the repeats ("em dashes, 14
places") and keep the individual lines for the ones worth seeing.

**The rewrite.** The full rewritten text. For a long file, the changed sections
with enough around them to read.

Then stop and wait.

## Writing it

- Write to a file only after the owner says yes.
- The owner may take some fixes and not others. Apply those, leave the rest, and
  say in one line what was left.
- Where the owner approved nothing, change nothing. Say so in one line.
- Never rewrite a file the owner did not name.

## When the text is already clean

Say so in one line and stop. Do not invent findings to look useful, and do not
rewrite clean writing into different clean writing. A short honest "nothing to
fix here" is the right answer more often than it feels like it is.

## Where this came from

The pattern list started from the public `unslop` skill in the `cursor/plugins`
repository, then was adapted: the always-on instruction was dropped so this runs
only when asked, the approval and write-only-on-yes behaviour was added, and the
rule about deferring to the project's own output style was added so it does not
compete with the project's voice.
