# Adds the practical "Delivery in your team" session (Scrum, Kanban, tools, ready/done, WIP)
# as session 2 of Horizons: Delivery, re-times the day to fit, and carries the
# participant's team setup into every later AI prompt.
# Run: python3 scripts/delivery-in-practice.py
import json, os
P = os.path.join(os.path.dirname(__file__), "..", "content", "courses", "horizons-delivery.json")
raw = open(P, encoding="utf-8").read(); d = json.loads(raw)
M = {m["id"]: m for m in d["modules"]}
assert "hd-s1b" not in M, "already applied"
DIS = "*Illustrative worked example using a fictional organisation.*"
BEYOND = "> **Beyond the book.** The book is deliberately framework- and tool-neutral (sections 2.3 and 4.3). This session adds the practical detail you'll meet at work, using the book's terms alongside the ones your team uses."
def img(f, alt): return f"![{alt}](/visuals/horizons-delivery/{f}.svg)"
def beats(*xs): return [{"label": a, "minutes": m, "notes": n} for a, m, n in xs]
def q(qq, opts, a, why): return {"q": qq, "opts": opts, "a": a, "why": why}

new = {
 "id": "hd-s1b", "num": "2", "title": "Delivery in your team: Scrum, Kanban and your toolset",
 "subtitle": "Same analysis job, different rhythm — and where the work actually lives", "dayId": "d1",
 "time": "09:30–10:15", "minutes": 45,
 "participant": {
  "bigIdea": "Scrum and Kanban change the rhythm of Delivery analysis — not the job.",
  "overview": "Most delivery teams run some version of **Scrum** (fixed-length iterations, usually called sprints) or **Kanban** (continuous flow), often with a mix of both, and keep their work in tools such as Jira or Azure DevOps. This session makes the rest of the day practical: what the Agile BA does in each rhythm, where each piece of analysis lives in the tools, and the working agreements — ready, done and limits on work in progress — that keep analysis flowing.\n\nYou'll record your own team's setup. From here on, every AI prompt in the course carries it, so the advice fits how your team actually works.\n\n" + BEYOND,
  "objectives": ["Explain what changes for the Agile BA in Scrum and in Kanban — and what doesn't.",
     "Map each piece of Delivery analysis to where it lives in your team's tools.",
     "Use definition of ready, definition of done and WIP limits as conversation tools, not gates.",
     "Describe your own team's delivery setup so the rest of the day can be tailored to it."],
  "keyPoints": [{"title": "Same job", "body": "Elaborate just in time, build shared understanding, validate the increment — in any framework."},
     {"title": "Different rhythm", "body": "Scrum: refine one or two sprints ahead and commit at planning. Kanban: keep the Ready column topped up."},
     {"title": "Analysis lives in tools", "body": "Acceptance criteria on the ticket, examples as scenarios, decisions on a shared page."},
     {"title": "Ready, done, WIP", "body": "Agreements that keep work flowing — checklists for a conversation, never stage gates."}],
  "sections": [
   {"heading": "Same job, different rhythm", "body": img("scrum-vs-kanban", "Scrum and Kanban: what changes for the Agile BA") + "\n\n| | Scrum (iterations) | Kanban (continuous flow) |\n|---|---|---|\n| Book term | Iteration, Iteration Manager | Continuous flow (7.4) |\n| Your team may say | Sprint, Scrum Master, sprint review | Board, flow, replenishment, service delivery review |\n| When you refine | One to two sprints ahead of planning | Whenever the Ready column drops below its limit |\n| When the team commits | Sprint planning, against a sprint goal | No batch commitment — items are pulled one at a time |\n| Three Amigos | Before planning, for items heading into the next sprint | When an item is about to be pulled into Analyse or Build |\n| Feedback events | Review and retrospective every sprint | Demo when items finish; regular retrospective and review cadence |\n| What you watch | Velocity, sprint goal met, carry-over | Cycle time, items blocked, WIP limits respected |\n| Common hybrid | 'Scrumban': sprints for cadence, a board with WIP limits for flow | |\n\nThe principles, outcomes and techniques for the rest of the day apply to both. Only the timing changes."},
   {"heading": "Where the analysis lives: your delivery toolset", "body": img("tool-map", "Where Delivery analysis lives in common tools") + "\n\n**Practical habits in any tool:**\n\n- Put acceptance criteria **on the ticket**, as Given/When/Then — not in a separate document.\n- Link the story to its feature and its measure of value, so the 'why' travels with it.\n- Attach the wireframe, process flow or state diagram — or link to it — where developers and testers will see it.\n- Record decisions and clarifications as **comments or fields on the item**, not in private chats.\n- Use a **Blocked** flag or column so questions waiting on analysis are visible on the board.\n- Keep a shared **glossary and business rules** page and link to it from items.\n\nTools are examples, not endorsements — use what your organisation provides."},
   {"heading": "Ready, done and limits on work in progress", "body": "| Agreement | What it is | Running case example |\n|---|---|---|\n| **Definition of ready** | A short checklist the team uses *in conversation* before an item is planned or pulled | Small enough for an iteration · examples agreed · criteria drafted · dependencies known · measure of value named |\n| **Definition of done** | What must be true before an item counts as finished (the book places NFRs here, 7.7.1) | Criteria pass · NFRs checked (privacy, accessibility) · demonstrated to the Product Owner · measure instrumented |\n| **WIP limit** | A cap on how many items can sit in a column at once | Analyse WIP 2 — the BA finishes one elaboration before starting another |\n| **Cycle time** | How long an item takes from start to done | Receiver-confirmation stories average 4 days; anything over 8 gets a look |\n\nUsed well, these protect **avoid waste** and **just in time**. Used as gates, they create waiting — so keep them short and revisit them in retrospectives.\n\n" + DIS},
   {"heading": "One story, two rhythms", "body": "The same story — *receiver confirms the delivery window or chooses a safe drop* — run two ways:\n\n| Moment | Scrum team (2-week sprints) | Kanban team (flow) |\n|---|---|---|\n| Before work starts | Refined and Three Amigos'd in sprint 3 refinement, ready for sprint 4 planning | Elaborated when it reaches the top of Ready; Three Amigos the morning it's pulled |\n| Commitment | Planned into sprint 4 against the goal 'receivers can confirm from SMS in two pilot depots' | Pulled into Analyse when a slot frees up (WIP 2) |\n| During build | Question about expired links answered at stand-up the same day | Card flagged **Blocked** on the board; the BA clears it within hours |\n| Done | Demoed at sprint 4 review; confirmation rate shown | Demoed when it reaches Done; confirmation rate shown at the fortnightly review |\n| Learning | Retro: 'add an expired-link example to every notification story' | Cycle-time review: 6 days, 2 of them blocked on Legal — involve Legal earlier |\n\n" + DIS},
  ],
  "activities": [
   {"id": "hd-s1b-act1", "title": "My team's delivery setup", "minutes": 15,
    "instructions": "Describe how your team works today. Be specific — these answers are added to every AI prompt for the rest of the day so the advice fits your team. If you're between teams, describe your most recent one.",
    "prompts": [{"id": "hd-s1b-act1-p1", "label": "Framework and rhythm (e.g. Scrum, 2-week sprints / Kanban / hybrid)", "placeholder": ""},
                {"id": "hd-s1b-act1-p2", "label": "Events we hold, and which ones I attend", "placeholder": ""},
                {"id": "hd-s1b-act1-p3", "label": "Tools we use (backlog, docs, design, AI) and where acceptance criteria live", "placeholder": ""},
                {"id": "hd-s1b-act1-p4", "label": "Our definition of ready / done — or 'we don't have one'", "placeholder": ""},
                {"id": "hd-s1b-act1-p5", "label": "The biggest friction for analysis in our delivery today", "placeholder": ""}]},
   {"id": "hd-s1b-act2", "title": "Fix one habit in your tool", "minutes": 6,
    "instructions": "From the practical habits list, pick the one your team most needs. Write what you'll change on your next backlog item.",
    "prompts": [{"id": "hd-s1b-act2-p1", "label": "Habit I'll adopt, and on which item", "placeholder": ""}]},
  ],
  "aiContext": ["hd-s1-act1", "hd-s1b-act1", "hd-s1b-act2"],
  "aiPrompt": "Act as an experienced agile business analyst coach. Based on my team's delivery setup below, tell me: (1) where analysis is most likely to become a bottleneck in our framework and rhythm, and what to do about it; (2) a lightweight definition of ready and definition of done we could trial, in under eight lines each; (3) how to use our tools so acceptance criteria, examples and decisions are visible to the whole team; (4) one change to try in the next iteration or fortnight, with a way to tell if it helped. Use my workbook answers below; if anything important is missing, ask me before answering.",
  "quiz": [
   q("What changes for the Agile BA between Scrum and Kanban?", ["The analysis job itself", "The rhythm — when refinement and commitment happen", "Whether acceptance criteria are needed", "Whether the Product Owner prioritises"], 1, "Same job, different rhythm."),
   q("In Kanban, when should the BA elaborate the next items?", ["At sprint planning", "When the Ready column drops below its limit", "Once a quarter", "Only after release"], 1, "Flow teams keep the Ready column topped up just in time."),
   q("In Scrum, how far ahead does refinement usually look?", ["One to two sprints", "The whole release", "Only the current day", "Six months"], 0, "Enough for confident planning, not more."),
   q("Where should acceptance criteria live?", ["In a separate requirements document", "On the backlog item, where the team works", "In the BA's notes", "In email"], 1, "Criteria on the ticket keep shared understanding visible."),
   q("A WIP limit of 2 on the Analyse column means…", ["The BA can only write two stories a year", "No more than two items can be in analysis at once", "Two people must approve each story", "Stories need two examples"], 1, "Limits encourage finishing before starting."),
   q("Cycle time measures…", ["How long an item takes from start to done", "Sprint length", "Story points per sprint", "Meeting duration"], 0, "A key flow measure for Kanban teams."),
   q("Definition of ready is best used as…", ["A strict stage gate", "A short checklist for a conversation", "A contract with the business", "Optional paperwork"], 1, "As a gate it creates waiting."),
   q("Where does the book place NFRs so they aren't deferred?", ["In a separate NFR document", "In explicit acceptance criteria or the definition of done", "In the business case", "Nowhere"], 1, "Section 7.7.1."),
   q("The book's term for a Scrum Master is…", ["Delivery Lead", "Iteration Manager", "Agile Coach", "Product Owner"], 1, "Section 4.4.3 uses framework-neutral terms."),
   q("A card has sat in Build for days flagged Blocked on an analysis question. The BA should…", ["Wait for the retrospective", "Resolve the question with the right stakeholder now", "Move it back to the backlog", "Raise a change request"], 1, "Visible blockers are signals to act on quickly."),
  ],
  "takeaways": ["Same job, different rhythm.", "Put the analysis where the team works — on the item.", "Ready, done and WIP limits are conversations, not gates."],
 },
 "presenter": {
  "purpose": "Ground the day in how participants' teams actually work, and capture their setup to tailor the rest of the course.",
  "openingLine": "\"Hands up if your team says 'sprint'. Now hands up if you've got a board with columns. Most of you put both hands up — good, because today works for both.\"",
  "beats": beats(("Same job, different rhythm", 10, "Walk the Scrum vs Kanban diagram and table; poll who's Scrum, Kanban, hybrid."),
                 ("Where the analysis lives", 7, "Tool map; ask where acceptance criteria live in their team today."),
                 ("Ready, done, WIP", 5, "Stress 'conversation, not gate'."),
                 ("One story, two rhythms", 3, "Read two rows of the table."),
                 ("Activity: my team's setup", 15, "Individual. Tell them it feeds every AI prompt today."),
                 ("Activity: fix one habit", 5, "Quick individual commitment.")),
  "facilitationNotes": "This session is labelled 'beyond the book' — the book is framework-neutral by design. Map terms both ways (sprint ↔ iteration, Scrum Master ↔ Iteration Manager). Tool names are examples, not endorsements; don't let it become a tool debate. Participants new to agile can describe their organisation's intended setup.",
  "whatGood": "A specific setup (framework, cadence, tools, where criteria live) and one concrete habit tied to a real item.",
  "commonFailure": "Vague setups ('we do agile') — the fix: ask which events happen, how long iterations are, and where the criteria are written today.",
  "debrief": ["Who's Scrum, Kanban or hybrid?", "Where do your acceptance criteria live today?", "What's the biggest analysis friction you named?"],
  "answerKey": "Running case: Scrum, two-week sprints; events — planning, stand-up, refinement Wednesdays, review, retro; tools — Jira for stories and criteria, Confluence for rules and glossary, Miro for the story map, Figma for the run-sheet prototype; definition of ready exists but is used as a gate; friction — Legal questions surface mid-sprint.",
  "materials": ["Scrum vs Kanban diagram", "Tool map", "Ready/done/WIP card"],
 },
}

# Insert as session 2, renumber, re-time.
mods = d["modules"]; mods.insert(1, new)
for i, m in enumerate(mods): m["num"] = str(i + 1)
times = {"hd-s1": "09:00–09:30", "hd-s1b": "09:30–10:15", "hd-s2": "10:30–11:15", "hd-s3": "11:15–12:00",
         "hd-s4": "12:45–13:15", "hd-s5": "13:15–14:00", "hd-s6": "14:00–15:00", "hd-s7": "15:15–15:45",
         "hd-s8": "15:45–16:30", "hd-s9": "16:30–17:00"}
for m in mods: m["time"] = times[m["id"]]

# Trim three sessions to make room (45 min).
s3 = M["hd-s3"]; s3["minutes"] = 45
s3["presenter"]["beats"] = beats(("Five outcomes overview", 6, "Walk the outcomes diagram."), ("Well-elaborated items and backlog readiness", 8, "Backlog readiness diagram; just in time."),
    ("Shared understanding, validation, value", 4, "Use the running case."), ("Activity: outcome check", 15, "Individual."), ("Activity: what belongs on the item", 8, "Pairs."), ("Debrief", 4, "Which outcome is weakest across the room?"))
s3["participant"]["activities"][0]["minutes"] = 15; s3["participant"]["activities"][1]["minutes"] = 8
s4 = M["hd-s4"]; s4["minutes"] = 30
s4["presenter"]["beats"] = beats(("Time frame recap", 3, "Point back to session 2's Scrum vs Kanban table."), ("Context", 4, "What happens when context is missing."),
    ("Feedback sources", 6, "Walk the feedback diagram."), ("Activity", 12, "Individual."), ("Debrief", 5, "Collect patterns in chat."))
s4["participant"]["activities"][0]["minutes"] = 12
s4["participant"]["sections"][0]["body"] += "\n\nSee session 2 for how this plays out in Scrum and Kanban teams, and how your own team works."
s7 = M["hd-s7"]; s7["minutes"] = 30
s7["presenter"]["beats"] = beats(("Three jobs and the toolkit", 8, "Walk the table by job."), ("Running case matches", 4, "Read the matching table."),
    ("Activity", 14, "Individual, then pair if time."), ("Debrief", 4, "Most-chosen technique."))
s7["participant"]["activities"][0]["minutes"] = 14

# Every later prompt carries the team setup too.
for m in mods[2:]:
    ctx = m["participant"].get("aiContext", [])
    if "hd-s1b-act1" not in ctx:
        i = 1 if ctx[:1] == ["hd-s1-act1"] else 0
        ctx.insert(i, "hd-s1b-act1")
    m["participant"]["aiContext"] = ctx

# Day map and agenda.
s1 = M["hd-s1"]
s1["participant"]["sections"][0]["body"] = "| # | Session | Book section |\n|---|---|---|\n| 1 | Welcome · the Delivery Horizon | 7.1 |\n| 2 | Delivery in your team: Scrum, Kanban and your toolset | Practical extension |\n| 3 | The Agile Business Analyst at this horizon | 7.2 |\n| 4 | Outcomes of analysis | 7.3 |\n| 5 | Time frame · context, feedback and learning | 7.4–7.5 |\n| 6 | Applying the nine principles | 7.6 |\n| 7 | Analysis techniques: stories and elaboration | 7.7.1 |\n| 8 | Analysis techniques: understanding and uncertainty | 7.7.1 |\n| 9 | Planning and delivery techniques | 7.7.2 |\n| 10 | Exercise: elaborate one backlog item · close | — |"
s1["participant"]["overview"] = s1["participant"]["overview"].replace("Today follows the structure of the Delivery Horizon chapter", "After a practical session on how your own team delivers (Scrum, Kanban and tools), the day follows the structure of the Delivery Horizon chapter")
B = lambda t, ti, ty, mid=None: {k: v for k, v in {"time": t, "title": ti, "type": ty, "moduleId": mid}.items() if v}
d["days"][0]["blocks"] = [B(times["hd-s1"], "Welcome · the Delivery Horizon", "welcome", "hd-s1"),
    B(times["hd-s1b"], "Delivery in your team: Scrum, Kanban and your toolset", "session", "hd-s1b"),
    B("10:15–10:30", "Morning break", "break"),
    B(times["hd-s2"], "The Agile Business Analyst at this horizon", "session", "hd-s2"),
    B(times["hd-s3"], "Outcomes of analysis", "session", "hd-s3"),
    B("12:00–12:45", "Lunch", "break"),
    B(times["hd-s4"], "Time frame · context, feedback and learning", "session", "hd-s4"),
    B(times["hd-s5"], "Applying the nine principles", "session", "hd-s5"),
    B(times["hd-s6"], "Analysis techniques: stories and elaboration", "session", "hd-s6"),
    B("15:00–15:15", "Afternoon break", "break"),
    B(times["hd-s7"], "Analysis techniques: understanding and uncertainty", "session", "hd-s7"),
    B(times["hd-s8"], "Planning and delivery techniques", "session", "hd-s8"),
    B(times["hd-s9"], "Exercise: elaborate one backlog item · close", "exercise", "hd-s9")]
d["outcomes"].insert(1, "Apply Delivery analysis in Scrum, Kanban or hybrid teams, and in the tools your team uses.")
d["leaveWith"].insert(1, "A tailored view of your team's delivery setup, with one habit to change")
d["resources"].insert(2, {"title": "Scrum vs Kanban and tool map", "description": "What the Agile BA does in each rhythm, and where each piece of analysis lives in common tools.", "audience": "participant"})

import re
m_ = re.search(r"\n( +)\"", raw); ind = len(m_.group(1)) if m_ else 1
open(P, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=ind) + ("\n" if raw.endswith("\n") else ""))
print("modules", len(mods), [(m["num"], m["time"], m["minutes"]) for m in mods])
