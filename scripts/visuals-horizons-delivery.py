# Generates the Delivery Horizon diagrams into public/visuals/horizons-delivery/.
# Run: python3 scripts/visuals-horizons-delivery.py
import os
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "visuals", "horizons-delivery")
os.makedirs(OUT, exist_ok=True)
NAVY, NAVY2, TEAL, TEAL2, TEALDK, ICE, LIGHT, INK, GREY, LINE = "#14283F", "#1F3B59", "#1789A0", "#23A6BC", "#0E6E80", "#D9EBEF", "#F2F8FA", "#21313D", "#5B6B75", "#D5E2E7"
FONT = "Poppins, Segoe UI, Arial, sans-serif"

def svg(name, w, h, body, title):
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}" font-family="{FONT}">' \
        f'<title>{title}</title><rect width="{w}" height="{h}" rx="14" fill="#fff"/>{body}</svg>'
    open(os.path.join(OUT, name), "w", encoding="utf-8").write(s)

def t(x, y, s, size=14, fill=INK, weight=400, anchor="middle"):
    lines = s.split("\n")
    out = ""
    for i, ln in enumerate(lines):
        dy = (i - (len(lines) - 1) / 2) * size * 1.25
        out += f'<text x="{x}" y="{y + dy + size * 0.35:.1f}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{anchor}">{ln.replace("&", "&amp;")}</text>'
    return out

def box(x, y, w, h, fill=ICE, stroke=TEAL, label="", size=14, color=NAVY, weight=600, rx=10):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>' + (t(x + w / 2, y + h / 2, label, size, color, weight) if label else "")

def arrow(x1, y1, x2, y2, color=TEAL):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="2.2" marker-end="url(#ah)"/>'

DEFS = f'<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="{TEAL}"/></marker></defs>'

# 1. Delivery cycle
import math
cx, cy, r = 380, 250, 150
steps = ["Backlog\nrefinement", "Iteration\nplanning", "Build, elaborate\n& verify", "Iteration\nreview", "Iteration\nretrospective"]
b = DEFS + t(380, 34, "Analysis runs through the whole iteration — just ahead of the work that needs it", 15, NAVY, 600)
pts = [(cx + r * math.cos(math.radians(-90 + i * 72)), cy + r * math.sin(math.radians(-90 + i * 72))) for i in range(5)]
for i in range(5):
    x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % 5]
    a1 = math.atan2(y2 - y1, x2 - x1)
    b += arrow(x1 + 70 * math.cos(a1), y1 + 70 * math.sin(a1) * 0.6, x2 - 72 * math.cos(a1), y2 - 72 * math.sin(a1) * 0.6)
for (x, y), s in zip(pts, steps):
    b += box(x - 72, y - 30, 144, 60, ICE, TEAL, s, 13)
b += f'<circle cx="{cx}" cy="{cy}" r="62" fill="{NAVY}"/>' + t(cx, cy, "Potentially\nreleasable\nincrement", 13, "#fff", 600)
b += box(40, 440, 680, 44, LIGHT, LINE, "Daily standup · Three Amigos conversations · questions answered as they surface", 13, GREY, 500)
svg("delivery-cycle.svg", 760, 510, b, "The delivery iteration cycle")

# 2. Five outcomes
outs = ["7.3.1\nWell-elaborated\nbacklog items", "7.3.2\nWell-prepared\nproduct backlog", "7.3.3\nShared\nunderstanding", "7.3.4\nValidated product\nincrements", "7.3.5\nFocus on vision,\ncustomer & value"]
b = t(390, 34, "Outcomes of analysis at the Delivery Horizon", 16, NAVY, 600)
for i, s in enumerate(outs):
    x = 20 + i * 150
    b += box(x, 70, 138, 120, ICE if i < 4 else NAVY, TEAL, s, 13, NAVY if i < 4 else "#fff")
b += box(20, 215, 738, 46, LIGHT, LINE, "Shaped by team capacity and velocity · emerge through collaboration, not documents written in advance", 13, GREY, 500)
svg("outcomes.svg", 778, 285, b, "Five outcomes of Delivery Horizon analysis")

# 3. Backlog readiness (just in time)
b = DEFS + t(380, 32, "A well-prepared product backlog: elaborate just in time, not just in case", 15, NAVY, 600)
rows = [("Current iteration", "Elaborated just before or as it is picked up", NAVY, "#fff", 660), ("Next 1–2 iterations", "Ready: estimable, criteria clear, risks known", TEAL, "#fff", 590), ("Later", "Understood well enough to order and roughly size", ICE, NAVY, 520), ("Much later", "A line on the backlog — over-elaborating here is waste", LIGHT, GREY, 450)]
y = 60
for name, desc, fill, col, w in rows:
    x = 380 - w / 2
    b += f'<rect x="{x}" y="{y}" width="{w}" height="70" rx="10" fill="{fill}" stroke="{TEAL}" stroke-width="1.2"/>' + t(380, y + 24, name, 15, col, 600) + t(380, y + 48, desc, 12.5, col, 400)
    y += 82
b += arrow(60, 380, 60, 70) + t(52, 410, "Detail", 12, GREY, 600, "start")
svg("backlog-readiness.svg", 760, 430, b, "Backlog readiness by distance from delivery")

# 4. Feedback loops
b = t(380, 32, "Where Delivery feedback comes from — and where it goes", 15, NAVY, 600)
cols = [("During the iteration", "Developer and tester\nquestions; edge cases"), ("Refinement", "Stakeholders react to\nprototypes and examples"), ("Iteration review", "Users and stakeholders\nevaluate the increment"), ("Retrospective", "The team reflects on\nits analysis process")]
for i, (h, d) in enumerate(cols):
    x = 20 + i * 182
    b += box(x, 60, 170, 46, NAVY, NAVY, h, 13.5, "#fff") + box(x, 112, 170, 70, ICE, TEAL, d, 12, INK, 400)
b += DEFS + arrow(380, 190, 380, 228)
b += box(110, 232, 540, 60, LIGHT, TEAL, "The Agile BA turns signals into action: better next backlog items,\nfeedback to the Product Owner, revised assumptions about value", 13, NAVY, 500)
svg("feedback-loops.svg", 760, 312, b, "Feedback sources at the Delivery Horizon")

# 5. Decomposition: value slices vs technical layers
b = t(380, 30, "Story decomposition: slice for value, not by technical layer", 15, NAVY, 600)
layers = ["User interface", "Business rules", "Data & integration"]
for side, title, good in [(30, "✗ Split by layer", False), (400, "✓ Split by value", True)]:
    b += t(side + 165, 64, title, 14, "#dc2626" if not good else "#16a34a", 600)
    for i, L in enumerate(layers):
        b += f'<rect x="{side}" y="{82 + i * 56}" width="330" height="48" rx="8" fill="{LIGHT}" stroke="{LINE}"/>' + t(side + 12, 106 + i * 56, L, 12.5, GREY, 500, "start")
    if good:
        for j, s in enumerate(["Story A", "Story B", "Story C"]):
            x = side + 130 + j * 66
            b += f'<rect x="{x}" y="76" width="54" height="172" rx="8" fill="{TEAL}" fill-opacity=".85"/>' + t(x + 27, 162, s.replace(" ", "\n"), 12, "#fff", 600)
    else:
        for i in range(3):
            b += f'<rect x="{side + 130}" y="{86 + i * 56}" width="190" height="40" rx="6" fill="#fca5a5" fill-opacity=".6"/>' + t(side + 225, 106 + i * 56, f"Task {i + 1}", 12, "#7f1d1d", 600)
b += t(195, 272, "Nothing to show users until all three finish", 12, GREY) + t(565, 272, "Each slice is testable and demonstrable", 12, GREY)
svg("decomposition.svg", 760, 295, b, "Splitting by value versus by layer")

# 6. Examples to criteria
b = DEFS + t(400, 30, "Story elaboration: examples first, criteria follow", 15, NAVY, 600)
b += box(20, 60, 230, 150, ICE, TEAL, "", 0) + t(135, 82, "Concrete examples", 14, NAVY, 600) + t(135, 140, "House, home → confirm\nHouse, at work → porch\nSmall business → no login\nLink after route lock\n→ expired", 12, INK)
b += arrow(255, 135, 290, 135)
b += box(295, 60, 230, 150, ICE, TEAL, "", 0) + t(410, 82, "Acceptance criteria", 14, NAVY, 600) + t(410, 140, "Given a link opened\nafter route lock,\nwhen it loads,\nthen the receiver sees an\nexpiry message and no data", 12, INK)
b += arrow(530, 135, 565, 135)
b += box(570, 60, 210, 150, NAVY, NAVY, "", 0) + t(675, 82, "Executable spec", 14, "#fff", 600) + t(675, 140, "With behaviour-driven\ndevelopment, the same\nscenarios become\nautomated tests", 12, "#fff")
b += box(20, 228, 760, 44, LIGHT, LINE, "Plus what the conversation surfaced: clarifications, NFRs, metrics, and wireframes where they cut ambiguity", 12, GREY, 500)
svg("examples-to-criteria.svg", 800, 292, b, "From examples to acceptance criteria")

# 7. Three Amigos
b = t(380, 30, "The Three Amigos: three mindsets, one backlog item", 15, NAVY, 600)
for x, y, lab, sub in [(290, 175, "Analyst", "What problem?\nWhat is valuable?"), (470, 175, "Developer", "How could\nwe build it?"), (380, 320, "Tester", "What could\ngo wrong?")]:
    b += f'<circle cx="{x}" cy="{y}" r="115" fill="{TEAL}" fill-opacity=".18" stroke="{TEAL}" stroke-width="1.5"/>'
for x, y, lab, sub in [(240, 140, "Analyst", "What problem?\nWhat is valuable?"), (520, 140, "Developer", "How could\nwe build it?"), (380, 360, "Tester", "What could\ngo wrong?")]:
    b += t(x, y - 18, lab, 15, NAVY, 700) + t(x, y + 18, sub, 12, INK)
b += t(380, 222, "Examples &\ncriteria", 13, TEALDK, 700)
b += t(380, 460, "3–5 people · before the team commits · output: shared understanding, examples and criteria — not a document", 11.5, GREY)
svg("three-amigos.svg", 760, 480, b, "The Three Amigos")

# 8. Nine principles
pr = [("S", "See the Whole"), ("T", "Think as a Customer"), ("A", "Analyze to Determine\nWhat is Valuable"), ("G", "Get Real Using\nExamples"), ("U", "Understand What\nis Feasible"), ("S", "Stimulate\nCollaboration"), ("P", "Pursue Continuous\nImprovement"), ("A", "Avoid Waste"), ("E", "Embrace Uncertainty\nand Change")]
b = t(380, 30, "Nine principles — STAG US Pursue, Avoid and Embrace", 15, NAVY, 600)
for i, (l, n) in enumerate(pr):
    x, y = 20 + (i % 3) * 245, 56 + (i // 3) * 92
    b += f'<rect x="{x}" y="{y}" width="233" height="80" rx="10" fill="{ICE}" stroke="{TEAL}"/>' + f'<circle cx="{x + 34}" cy="{y + 40}" r="20" fill="{NAVY}"/>' + t(x + 34, y + 40, l, 16, "#fff", 700) + t(x + 144, y + 40, n, 12.5, NAVY, 600)
svg("principles.svg", 760, 340, b, "The nine principles of agile business analysis")
print("ok")

# 9. Scrum vs Kanban — same analysis job, different rhythm
b = DEFS + t(400, 30, "Same analysis job, different rhythm", 16, NAVY, 600)
b += t(200, 64, "Scrum (iterations)", 15, NAVY, 700) + t(600, 64, "Kanban (continuous flow)", 15, NAVY, 700)
# Scrum: sprint boxes with fixed events
for k in range(3):
    x = 30 + k * 120
    b += f'<rect x="{x}" y="84" width="110" height="64" rx="10" fill="{ICE}" stroke="{TEAL}"/>' + t(x + 55, 104, f"Sprint {k + 1}", 13, NAVY, 600) + t(x + 55, 128, "2 weeks", 11.5, GREY)
b += t(200, 172, "Plan → build → review → retro, every sprint", 12, GREY)
b += box(30, 186, 350, 54, LIGHT, LINE, "Refine 1–2 sprints ahead · commit at planning\nMeasure: velocity, sprint goal met", 12, INK, 500)
# Kanban: columns with WIP limits
cols = [("Ready", "WIP 5"), ("Analyse", "WIP 2"), ("Build", "WIP 3"), ("Test", "WIP 2"), ("Done", "")]
for k, (c, w) in enumerate(cols):
    x = 420 + k * 72
    b += f'<rect x="{x}" y="84" width="66" height="64" rx="8" fill="{ICE if k != 1 else NAVY}" stroke="{TEAL}"/>' + t(x + 33, 104, c, 12, "#fff" if k == 1 else NAVY, 700) + t(x + 33, 128, w, 11, "#fff" if k == 1 else GREY)
b += t(600, 172, "Items pulled one at a time when there's capacity", 12, GREY)
b += box(420, 186, 354, 54, LIGHT, LINE, "Keep the Ready column topped up · no commitment point\nMeasure: cycle time, items blocked", 12, INK, 500)
b += box(30, 258, 744, 46, NAVY, NAVY, "Both: elaborate just in time · Three Amigos before work starts · examples → criteria · validate in review", 13, "#fff", 600)
svg("scrum-vs-kanban.svg", 804, 324, b, "Scrum and Kanban: what changes for the Agile BA")

# 10. Where the analysis lives
rows = [("Backlog item, acceptance criteria, NFRs", "Jira · Azure DevOps Boards · Linear · Trello"),
        ("Examples / BDD scenarios", "On the ticket, or feature files (Cucumber, Reqnroll)"),
        ("Wireframes, prototypes, storyboards", "Figma · Balsamiq · Miro"),
        ("Story map, event storming, journey map", "Miro · Mural · FigJam"),
        ("Decisions, glossary, business rules", "Confluence · Notion · SharePoint"),
        ("Board, WIP limits, flow metrics", "The board in your delivery tool"),
        ("AI drafting and checking", "Rovo · Copilot · Claude — verify everything")]
b = t(400, 30, "Where the analysis lives: typical delivery tools (examples, not endorsements)", 15, NAVY, 600)
for k, (a, c) in enumerate(rows):
    y = 52 + k * 46
    b += f'<rect x="20" y="{y}" width="330" height="38" rx="8" fill="{ICE}" stroke="{TEAL}"/>' + t(32, y + 19, a, 12.5, NAVY, 600, "start")
    b += f'<rect x="360" y="{y}" width="424" height="38" rx="8" fill="{LIGHT}" stroke="{LINE}"/>' + t(372, y + 19, c, 12.5, INK, 400, "start")
svg("tool-map.svg", 804, 380, b, "Where Delivery analysis lives in common tools")
print("ok2")
