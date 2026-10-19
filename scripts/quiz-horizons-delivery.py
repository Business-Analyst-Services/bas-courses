# Adds questions to each Horizons: Delivery session so every quiz has 10,
# drawn from that session's content, and rotates the correct-answer position.
# Run: python3 scripts/quiz-horizons-delivery.py
import json, os
P = os.path.join(os.path.dirname(__file__), "..", "content", "courses", "horizons-delivery.json")
d = json.load(open(P, encoding="utf-8"))

def q(qq, right, wrong, why):  # right answer first; positions rotated later
    return {"q": qq, "opts": [right] + wrong, "a": 0, "why": why}

ADD = {
"hd-s1": [
 q("At the Delivery Horizon, the analysis question is…", "How each backlog item should be understood, elaborated and verified", ["Which investments to fund", "Which product to build next year", "How to restructure the team"], "Delivery focuses on understanding, elaborating and verifying individual backlog items."),
 q("What does the Delivery Horizon turn the product vision into?", "Working software, validated business rules and real user experiences", ["A business case", "A portfolio roadmap", "A requirements document for sign-off"], "This is where vision becomes tangible."),
 q("Analysis at the Delivery Horizon is best described as…", "Continuous, collaborative and embedded in the iteration rhythm", ["A phase completed before development", "The analyst's private activity", "A review at the end of each release"], "Section 7.1 describes analysis that is continuous and collaborative."),
 q("In the iteration cycle, what sits at the centre?", "A potentially releasable increment", ["A requirements specification", "The project plan", "A status report"], "Each iteration aims to produce a potentially releasable increment."),
 q("Which events run alongside the cycle throughout the iteration?", "Daily standup and Three Amigos conversations", ["Steering committee and budget review", "Annual planning", "Change advisory board"], "Questions are answered as they surface, not saved for the end."),
 q("In the running case, what is the top backlog item?", "Receiver delivery-window confirmation", ["A parcel-tracking app", "New depot locations", "Driver rostering"], "Receivers confirm or choose a safe drop before routes lock."),
 q("Why does the running case matter to the product?", "Failed first attempts hold on-time delivery at 79% against a 92% goal", ["Drivers want new vans", "The website is slow", "Depots are closing"], "Receiver confirmation targets failed first attempts."),
 q("What will you leave the day with?", "One backlog item fully elaborated", ["A full product roadmap", "A business case", "A project plan"], "The course builds one item from feature to buildable story."),
],
"hd-s2": [
 q("Where do most Agile BAs spend most of their working time?", "The Delivery Horizon", ["Portfolio planning", "Vendor management", "Annual budgeting"], "Section 7.2: closest to the customer, the code and the moment of truth."),
 q("At the Delivery Horizon the Agile BA is best described as…", "A full member of the Agile Product Team", ["A gatekeeper between business and IT", "An external reviewer", "The team's manager"], "The analyst participates in delivery itself."),
 q("Who answers the delivery team's questions about what to build and what done looks like?", "The Product Owner, as voice of the customer", ["The Iteration Manager", "The tester", "The architect"], "The Agile BA supports by elaborating, documenting and facilitating."),
 q("The Iteration Manager is focused on…", "How the team works together", ["What the team builds", "How the code is written", "Approving requirements"], "In Scrum this role is the Scrum Master."),
 q("'Business analysis as a shared capability' means…", "Everyone contributes analysis; the dedicated analyst adds depth and continuity", ["Nobody needs an analyst", "Only the analyst asks questions", "Analysis is outsourced"], "All team members ask questions and challenge assumptions."),
 q("The Agile BA acts as a bridge to stakeholders together with…", "The Product Owner", ["The Iteration Manager", "The developers", "The tester"], "Both translate needs into backlog items and report back what was learned."),
 q("A key skill the book highlights at Delivery is recognising when…", "Apparent clarity is concealing genuine ambiguity", ["Velocity is falling", "The sprint is over", "A stakeholder is senior"], "Requirements can look clear while hiding different interpretations."),
 q("Why keep a line of sight from each item to the user need?", "So the team avoids solving the wrong problem, even when requirements are technically correct", ["For audit only", "To increase story points", "Because the tool requires it"], "Context keeps delivery from becoming technically proficient but adrift."),
],
"hd-s3": [
 q("What shapes the time available for Delivery analysis outcomes?", "Team capacity and velocity", ["The budget cycle", "Stakeholder seniority", "Document templates"], "Section 7.3: capacity and historical velocity shape realistic commitments."),
 q("A well-elaborated backlog item is…", "Small enough for an iteration, clear enough to start, testable enough to verify", ["Fully specified for the whole release", "Signed off by the sponsor", "Written by the developer"], "These are the book's three tests."),
 q("Who takes responsibility for recording clarifications on the backlog item?", "The Agile Business Analyst", ["Nobody — conversation is enough", "The Iteration Manager", "The sponsor"], "Clarifications shouldn't remain undocumented knowledge held by individuals."),
 q("Which supporting artefact suits a change to a business process?", "A process flow showing current and future state", ["A Gantt chart", "A budget spreadsheet", "A stakeholder email"], "Diagrams and models cut ambiguity that prose can't."),
 q("What are the primary tools for preparing the backlog?", "Decomposition, elaboration and prioritisation", ["Estimation, velocity and burndown", "Templates and sign-offs", "Status reports and RAID logs"], "Section 7.3.2."),
 q("Shared understanding is easy to underestimate because…", "It is invisible when present", ["It is written down", "Only testers need it", "It can be measured precisely"], "Its absence shows up as defects, rework and surprise at review."),
 q("Outcome 7.3.5 asks the analyst to counteract…", "The gravitational pull of detail", ["Changing priorities", "Stakeholder feedback", "Iteration reviews"], "Keep the team connected to vision, customer and value."),
],
"hd-s4": [
 q("How long is a typical Delivery iteration?", "One to four weeks", ["One day", "Three to six months", "A year"], "Section 7.4."),
 q("In a flow-based approach such as Kanban, work items…", "Move through the pipeline as capacity allows", ["Wait for the next fixed iteration", "Are all planned up front", "Skip refinement"], "No fixed-length iterations."),
 q("Within an iteration, analysis activity is…", "Distributed across the full time box", ["Front-loaded on day one", "Saved for the review", "Done by the PO alone"], "Items are elaborated just before or just after they're picked up."),
 q("When context flowing into delivery is ambiguous or absent, the team…", "Is forced to make assumptions — a primary source of rework", ["Delivers faster", "Needs no analysis", "Skips the review"], "Section 7.5."),
 q("Without feedback, iteration is merely…", "Repetition", ["Planning", "Documentation", "Estimation"], "Feedback is the engine of agile delivery."),
 q("Which is a feedback source during the iteration itself?", "Developer and tester questions revealing ambiguity", ["The annual report", "The budget review", "The org chart"], "Questions during build are early signals."),
 q("A pattern shows users aren't engaging with a delivered capability. The analyst should…", "Bring it to the Product Owner, as it may change what's built next", ["Ignore it until next quarter", "Add more stories to the same feature", "Close the feature"], "Delivery learning informs priority and scope decisions."),
],
"hd-s5": [
 q("How many principles of agile business analysis does the book define?", "Nine", ["Five", "Seven", "Twelve"], "STAG US Pursue, Avoid and Embrace."),
 q("Which principle is described as perhaps the most practically powerful at Delivery?", "Get Real Using Examples", ["See the Whole", "Avoid Waste", "Stimulate Collaboration"], "Concrete examples remove ambiguity."),
 q("'Think as a Customer' is most directly expressed through…", "Acceptance criteria and examples written from the user's perspective", ["Velocity charts", "Technical design documents", "Status reports"], "Criteria framed as user outcomes, not system behaviours."),
 q("'Analyze to Determine What is Valuable' shows up as…", "Focusing elaboration on the parts with most risk or uncertainty", ["Specifying every detail", "Estimating every story", "Writing longer stories"], "Selectivity keeps elaboration efficient."),
 q("'Embrace Uncertainty and Change' treats misunderstandings and surprises as…", "Information to learn from", ["Failures to be reported", "Reasons to stop the iteration", "The tester's fault"], "Each iteration is a chance to learn what the team didn't know."),
 q("Where is 'Pursue Continuous Improvement' most visible?", "In the retrospective and reflecting on the analysis process", ["In the business case", "In the contract", "In the org chart"], "Are items well enough elaborated? Are criteria testable?"),
 q("In the mnemonic STAG US…, the 'U' stands for…", "Understand What is Feasible", ["Use Cases", "User Stories", "Uncover Risks"], "S-T-A-G-U-S-P-A-E, in the book's order."),
],
"hd-s6": [
 q("What is the user story format?", "As a [user], I want [capability], so that [benefit]", ["When [situation], I want to [motivation], so I can [outcome]", "Given / When / Then", "Shall / Must / Should"], "The job story uses the situation–motivation–outcome form instead."),
 q("Job stories are especially useful when…", "The situation and motivation drive behaviour more than the user's role", ["The team has no Product Owner", "Writing NFRs", "Estimating"], "They capture context that drives behaviour."),
 q("What does splitting a feature by technical layer usually produce?", "Dependencies, and 'done' stories with nothing to show users", ["Faster delivery", "Better tests", "Clearer acceptance criteria"], "Split along value lines instead."),
 q("Story elaboration is described as…", "The central analysis activity at the Delivery Horizon", ["An optional step", "The developer's job", "A post-release activity"], "It's the output of most refinement and Three Amigos sessions."),
 q("In specification by example, which comes first?", "Concrete examples agreed with the team", ["Acceptance criteria", "Test scripts", "UI design"], "Criteria are distilled from examples."),
 q("With behaviour-driven development, examples can become…", "Executable specifications that are also automated tests", ["Business cases", "Release notes", "User manuals"], "Section 7.3.1."),
 q("Metrics and KPIs at the Delivery Horizon let the team verify…", "That a feature delivers the value it was designed for, not just that it was built", ["Developer productivity", "Budget spend", "Meeting attendance"], "Criteria anchored to measurable outcomes."),
],
"hd-s7": [
 q("Which technique keeps the user's goals and context visible while the team is deep in detail?", "Personas", ["Relative Estimation", "Kanban Board", "Spikes"], "Referencing the persona keeps decisions grounded in a real need."),
 q("A complex or contested requirement can't be resolved informally. Which technique fits?", "Discovery Workshop", ["Storyboarding", "Planning Poker", "Product Roadmap"], "A structured session within the iteration."),
 q("Event Storming models…", "Domain events, commands and aggregates", ["Team capacity", "Budget allocation", "Release dates"], "It builds shared understanding of complex domain behaviour."),
 q("Recurring defects suggest a systemic issue. Which technique fits?", "Root Cause Analysis", ["Personas", "Storyboarding", "MVP"], "Prevents patching symptoms repeatedly."),
 q("Minimum Viable Product thinking at Delivery helps the team…", "Find the simplest implementation that genuinely delivers value", ["Build every feature at once", "Avoid user feedback", "Skip testing"], "Defer enhancement until feedback justifies it."),
 q("Stakeholder Analysis at Delivery identifies…", "Who to consult, who can accept a feature, and who may be affected", ["The team's velocity", "The release date", "The test environment"], "Not all stakeholders are relevant to all features."),
 q("Problem Definition and Analysis is most useful at Delivery when…", "A requirement starts drifting from the original problem", ["Estimating", "Writing release notes", "Running the standup"], "It anchors scope conversations."),
],
"hd-s8": [
 q("How many people typically take part in a Three Amigos conversation?", "Three to five", ["Exactly two", "The whole department", "Ten or more"], "Enough to bring all three mindsets to the table."),
 q("What is the output of a Three Amigos session?", "Shared understanding, examples and acceptance criteria — not a document", ["A signed specification", "A project plan", "A test environment"], "Section 2.8.4."),
 q("When should a Three Amigos session stop?", "When the team can estimate and start", ["When every scenario is written", "After exactly an hour", "When the sponsor approves"], "Avoid waste — enough, not everything."),
 q("What is the primary planning workshop at the Delivery Horizon?", "Iteration planning", ["Portfolio planning", "Annual budgeting", "Release retrospective"], "The Agile BA prepares items and resolves questions during it."),
 q("Planning Poker is an example of…", "A collaborative game", ["A Kanban metric", "A product roadmap", "An NFR"], "Games surface hidden differences in understanding."),
 q("At the Delivery Horizon, the Product Roadmap is used as…", "Context, with delivery learning fed back when it should change", ["The team's task list", "A replacement for the backlog", "A contract"], "Learning can flow back upstream."),
 q("Which event is the natural home of Relative Estimation?", "Iteration planning and backlog refinement", ["The daily standup", "The retrospective only", "The sponsor briefing"], "Estimation needs well-understood items."),
],
"hd-s9": [
 q("Which is the best evidence that acceptance criteria are good?", "They trace to agreed examples and are observable", ["They are long", "They repeat the story", "They name the developer"], "Observable results for specific examples."),
 q("Your finished item can't fit in one iteration. What should you do?", "Decompose it further into value slices", ["Extend the iteration", "Remove the acceptance criteria", "Split it by technical layer"], "Small enough for an iteration is part of 'well-elaborated'."),
 q("Where should NFRs appear on the finished item?", "In explicit acceptance criteria or the definition of done", ["Nowhere — they're implied", "In a separate document for later", "Only in the test plan"], "So they aren't deferred indefinitely."),
 q("Which supporting artefact did the running case add to reduce ambiguity?", "A consignment state diagram", ["A business case", "A Gantt chart", "An org chart"], "Notified → confirmed / safe drop / no response → route locked."),
 q("The remaining risk on the running-case item is handled by…", "A spike on the route-lock integration", ["Ignoring it", "Adding more stories", "Delaying the whole feature"], "A time-boxed investigation to resolve uncertainty."),
 q("What does a 'measurable indicator' on a story tell you?", "Whether the story is delivering the value it was meant to", ["How many hours it took", "Who built it", "How many points it was"], "Section 7.7.1, Metrics and KPIs."),
 q("Which commitment is strongest?", "Run a Three Amigos on the next story before refinement", ["Be more engaged", "Communicate better", "Read the book again"], "Specific, near-term and observable."),
 q("Why check the finished item against the five outcomes?", "They describe what good Delivery analysis produces", ["They're required for sign-off", "They replace testing", "They set the budget"], "Section 7.3."),
],
}
for m in d["modules"]:
    qs = [x for x in m["participant"]["quiz"]]
    # normalise existing to right-first
    norm = []
    for x in qs:
        opts = x["opts"][:]; r = opts.pop(x["a"]); norm.append({"q": x["q"], "opts": [r] + opts, "a": 0, "why": x["why"]})
    seen = {x["q"] for x in norm}
    norm += [x for x in ADD[m["id"]] if x["q"] not in seen]
    norm = norm[:10]
    assert len(norm) == 10, (m["id"], len(norm))
    for i, x in enumerate(norm):  # rotate correct answer position
        pos = (i * 3 + int(m["id"][-1]) * 2 + i // 4) % len(x["opts"])
        r = x["opts"].pop(0); x["opts"].insert(pos, r); x["a"] = pos
    m["participant"]["quiz"] = norm
json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print({m["id"]: [x["a"] for x in m["participant"]["quiz"]] for m in d["modules"]})
