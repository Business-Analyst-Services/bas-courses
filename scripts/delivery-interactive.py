# Adds the sprint-planning and Kanban-flow simulations to Horizons: Delivery session 2,
# replacing the short "fix one habit" activity and re-timing the session.
# Run: python3 scripts/delivery-interactive.py
import json, os, re
P = os.path.join(os.path.dirname(__file__), "..", "content", "courses", "horizons-delivery.json")
raw = open(P, encoding="utf-8").read(); d = json.loads(raw)
m = next(x for x in d["modules"] if x["id"] == "hd-s1b")

sprint = {
 "type": "sprint", "id": "hd-s1b-sprint", "minutes": 8,
 "title": "Plan sprint 4",
 "intro": "You're the Agile BA in sprint planning for the receiver-confirmation feature. The Product Owner has ordered the backlog. Drag stories into Sprint 4 (or tap a story, then tap the sprint) so the team can meet the sprint goal within its capacity — then check your plan. Watch for items that aren't ready and for dependencies.",
 "goal": "Receivers in two pilot depots can confirm a delivery window or safe drop from an SMS",
 "capacity": 13, "sprintName": "Sprint 4",
 "items": [
  {"id": "a", "short": "SMS notice", "title": "Send the receiver an SMS the evening before delivery", "points": 3, "value": "high", "goal": True, "mustHave": True, "ready": True},
  {"id": "b", "short": "confirm link", "title": "Receiver confirms the window or chooses a safe drop via one-click link", "points": 5, "value": "high", "goal": True, "mustHave": True, "ready": True, "dependsOn": ["a"]},
  {"id": "c", "short": "run sheet", "title": "Show the safe-drop instruction on the driver's run sheet", "points": 3, "value": "high", "goal": True, "mustHave": True, "ready": True, "dependsOn": ["b"]},
  {"id": "g", "short": "spike", "title": "Spike: how the route-lock integration works (time-boxed, 2 days)", "points": 2, "value": "medium", "goal": True, "ready": True},
  {"id": "e", "short": "non-response flag", "title": "Flag receivers who haven't responded to the depot at route lock", "points": 5, "value": "medium", "goal": True, "ready": False, "readyNote": "the route-lock integration isn't understood yet, so it can't be estimated — that's what the spike is for"},
  {"id": "d", "short": "email fallback", "title": "Email the notice when there's no mobile number", "points": 3, "value": "medium", "goal": False, "ready": True},
  {"id": "f", "short": "no contacts", "title": "Handle consignments with no receiver contact details", "points": 2, "value": "low", "goal": False, "ready": True},
  {"id": "h", "short": "tracking page", "title": "Redesign the parcel tracking page", "points": 8, "value": "medium", "goal": False, "ready": False, "readyNote": "no examples, criteria or designs agreed yet"},
 ],
 "model": "SMS notice (3) + confirm link (5) + run-sheet instruction (3) deliver the sprint goal in dependency order — 11 points. Use the last 2 points on the route-lock spike, which makes the 'non-response flag' story ready for sprint 5. Leave the non-response flag (not ready), email fallback and no-contacts handling (not needed for the SMS pilot goal) and the tracking-page redesign (not ready, not the goal) in the backlog. Total: 13 of 13.",
 "debrief": ["Which item was most tempting to pull in, and why shouldn't you?", "How did the dependency between the SMS notice, the link and the run sheet change your plan?", "What would you need to do this sprint so the non-response flag is ready for sprint 5?"],
}
kanban = {
 "type": "kanban", "id": "hd-s1b-kanban", "minutes": 10, "days": 6, "movesPerDay": 3,
 "title": "Run a week on the Kanban board",
 "intro": "Now the same work runs on a Kanban board with WIP limits. Each day the team can make three moves — drag a card one column to the right (or tap it, then tap the column). Pull work only when there's space, and when a card gets blocked, act as the BA to clear it. Then click Next day. Aim to finish as many cards as you can, with short cycle times.",
 "columns": [{"id": "ready", "name": "Ready", "wip": 4}, {"id": "analyse", "name": "Analyse", "wip": 2}, {"id": "build", "name": "Build", "wip": 2}, {"id": "test", "name": "Test", "wip": 2}, {"id": "done", "name": "Done"}],
 "cards": [
  {"id": "k1", "title": "SMS notice the evening before", "col": "build"},
  {"id": "k2", "title": "Confirm window via one-click link", "col": "analyse"},
  {"id": "k3", "title": "Safe drop shown on run sheet", "col": "ready"},
  {"id": "k4", "title": "Expired-link message", "col": "ready"},
  {"id": "k5", "title": "Email fallback", "col": "ready"},
  {"id": "k6", "title": "No contact details", "col": "ready"},
 ],
 "events": [
  {"id": "e1", "day": 1, "text": "One card is in Build and one in Analyse. Pull new work only when a column has space."},
  {"id": "e2", "day": 2, "cardId": "k1", "block": "the developer asks whether an expired link may show the consignment number",
   "text": "A developer has a question on the SMS card — it's blocked.",
   "options": [
    {"text": "Park it until the next review", "why": "the card sits blocked for days and cycle time balloons. Analysis questions need answers now."},
    {"text": "Check the privacy rule with Legal today and add it to the card as an example and a criterion", "correct": True, "why": "the question is answered at source and recorded where the whole team can see it."},
    {"text": "Tell the developer to pick an option and fix it later", "why": "guessing on a privacy rule risks rework — or a breach."},
   ]},
  {"id": "e3", "day": 3, "text": "The tester has spare time but Build is full. Help finish what's in progress before pulling more."},
  {"id": "e4", "day": 4, "cardId": "k3", "block": "the route planner says route lock is 4:30 am, not 5 am",
   "text": "A disagreement about route-lock timing blocks the run-sheet card.",
   "options": [
    {"text": "Start another card while you wait", "why": "starting more work hides the problem and raises WIP — the blocked card still isn't moving."},
    {"text": "Get the route planner, PO and a developer together for 15 minutes, agree the time and update the examples", "correct": True, "why": "a quick Three Amigos-style conversation with the right stakeholder clears it in hours."},
    {"text": "Escalate it to the steering committee", "why": "far too slow for a delivery-level question — the right people can resolve it today."},
   ]},
  {"id": "e5", "day": 5, "text": "The Product Owner asks how long a story usually takes. Look at the cycle times on your finished cards."},
  {"id": "e6", "day": 6, "text": "Last day: finish what's started rather than starting something new."},
 ],
 "lessons": [
  "WIP limits make the team finish before starting — 'stop starting, start finishing'.",
  "Blocked cards stop the whole flow. Clearing analysis questions fast is one of the BA's biggest contributions to cycle time.",
  "Cycle time — how long a card takes from start to done — is the measure Kanban teams use to answer 'when will it be ready?'.",
  "Work is pulled when there's capacity, not pushed because it's next on the list.",
 ],
 "debrief": ["Where did work pile up on your board, and why?", "What did each blocker cost in cycle time?", "How would your team's board change if analysis had its own WIP limit?"],
}
m["participant"]["interactive"] = [sprint, kanban]
m["participant"]["activities"] = [a for a in m["participant"]["activities"] if a["id"] != "hd-s1b-act2"]
m["participant"]["activities"][0]["minutes"] = 12
m["participant"]["overview"] = m["participant"]["overview"].replace("You'll record your own team's setup.", "You'll practise both rhythms hands-on in the **Practice** tab — planning a sprint, then running a week on a Kanban board — and record your own team's setup.")
for x in d["modules"]:
    ctx = x["participant"].get("aiContext")
    if ctx and "hd-s1b-act2" in ctx: ctx.remove("hd-s1b-act2")
m["presenter"]["beats"] = [
 {"label": "Same job, different rhythm", "minutes": 7, "notes": "Walk the Scrum vs Kanban diagram; poll who's Scrum, Kanban, hybrid."},
 {"label": "Where the analysis lives", "minutes": 4, "notes": "Tool map; ask where acceptance criteria live in their team today."},
 {"label": "Ready, done, WIP", "minutes": 3, "notes": "Stress 'conversation, not gate'."},
 {"label": "Practice: plan sprint 4", "minutes": 8, "notes": "Practice tab. Individual, then compare with a neighbour. Show the model plan at the end."},
 {"label": "Practice: a week on the Kanban board", "minutes": 10, "notes": "Practice tab. Let them hit a WIP limit and a blocker before helping. Debrief cycle times."},
 {"label": "Activity: my team's setup", "minutes": 13, "notes": "Individual. Tell them it feeds every AI prompt today; include one habit they'll change."},
]
m["presenter"]["facilitationNotes"] += " The two Practice simulations save each participant's result to their workbook (visible on the roster). If time is tight, run the sprint simulation together on screen and set the Kanban one for a break."
m["presenter"]["materials"] = m["presenter"]["materials"] + ["Practice tab: sprint planning and Kanban simulations"]
m["participant"]["activities"][0]["prompts"][-1]["label"] = "The biggest friction for analysis in our delivery today — and one habit I'll change"
assert sum(b["minutes"] for b in m["presenter"]["beats"]) == m["minutes"]
m_ = re.search(r"\n( +)\"", raw); ind = len(m_.group(1)) if m_ else 1
open(P, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=ind) + ("\n" if raw.endswith("\n") else ""))
print("ok")
