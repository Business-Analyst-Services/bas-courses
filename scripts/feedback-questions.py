# Writes a 10-question feedback form into each course JSON.
# 7 rating questions (1–5), 1 likelihood-to-recommend (0–10), 2 open questions.
# Each question has an "area" (and optional session ids) so the cohort review can turn
# low scores and comments into backlog items against the right part of the course.
# Run: python3 scripts/feedback-questions.py
import json, os, re
D = os.path.join(os.path.dirname(__file__), "..", "content", "courses")

def S(i, q, area, modules=None): return {"id": i, "q": q, "type": "scale", "area": area, **({"modules": modules} if modules else {})}
def N(i, q): return {"id": i, "q": q, "type": "nps", "area": "overall"}
def T(i, q, area): return {"id": i, "q": q, "type": "text", "area": area}

F = {
"agile-ba": [
 S("f1", "The course gave me a clear understanding of what agile business analysis is and how it differs from traditional BA.", "content", ["d1-s1", "d1-s2"]),
 S("f2", "I can now place my own work on the right planning horizon (Strategy, Initiative or Delivery).", "content", ["d1-s3", "d1-ex"]),
 S("f3", "I understand the agile BA's role in the product team and how it works with the Product Owner.", "content", ["d1-s4"]),
 S("f4", "The technique selection exercise helped me choose the right technique for a real situation.", "activities", ["d2-ex", "d1-ex"]),
 S("f5", "The worked examples were realistic and relevant to my industry.", "relevance"),
 S("f6", "The facilitator explained ideas clearly and handled questions well.", "facilitation"),
 S("f7", "The two days were well paced, with enough time for activities and discussion.", "pacing"),
 N("f8", "How likely are you to recommend this course to a colleague? (0–10)"),
 T("f9", "What was the most valuable thing you'll take back to your team?", "strengths"),
 T("f10", "What would you change or add to make the course better?", "improvement"),
],
"ba-leadership": [
 S("f1", "I can articulate the value proposition of my BA practice to senior stakeholders.", "content", ["d1-s2"]),
 S("f2", "The Practice Model (roles, services, operating layer) gave me a usable structure for my practice.", "content", ["d1-s3", "d1-s5"]),
 S("f3", "I'm more confident influencing governance and decisions as a BA leader.", "confidence", ["d1-s4"]),
 S("f4", "The coaching, capability and career-path content will help me develop my team.", "content", ["d2-s3"]),
 S("f5", "I have practical KPIs I can use to measure the value of my practice.", "content", ["d2-s4"]),
 S("f6", "My 90-day practice plan and business case pitch are ready to use.", "activities", ["d2-s5", "d2-s6"]),
 S("f7", "The facilitator created a safe, challenging space for leadership discussion.", "facilitation"),
 N("f8", "How likely are you to recommend this course to another BA leader? (0–10)"),
 T("f9", "Which part of the course will make the biggest difference to your practice?", "strengths"),
 T("f10", "What would make this course more useful for leaders in your situation?", "improvement"),
],
"ba-playbooks": [
 S("f1", "The playbooks gave me a repeatable way to run BA work from discovery to delivery.", "content"),
 S("f2", "The discovery and stakeholder mapping playbook is ready to use on my next engagement.", "content", ["pb01"]),
 S("f3", "The process mapping and BPMN playbook improved how I model processes.", "content", ["pb02"]),
 S("f4", "The requirements and user stories playbook will improve the quality of my requirements.", "content", ["pb04"]),
 S("f5", "The blank templates and worked examples were clear and easy to adapt.", "materials"),
 S("f6", "The AI prompts in each playbook produced useful first drafts.", "ai"),
 S("f7", "Covering six playbooks in one day felt well paced.", "pacing"),
 N("f8", "How likely are you to recommend Playbooks in a Day to a colleague? (0–10)"),
 T("f9", "Which playbook will you use first, and on what?", "strengths"),
 T("f10", "What playbook, template or example would you add or change?", "improvement"),
],
"horizons-strategy": [
 S("f1", "I understand what the analyst does before an investment is committed.", "content", ["hs-s2"]),
 S("f2", "I can write a solution-free problem statement and an outcome tree.", "content", ["hs-s2", "hs-s3"]),
 S("f3", "Value modelling, assumption mapping and real options are techniques I can now apply.", "content", ["hs-s5"]),
 S("f4", "I could build a lean business case that states what evidence would prove it wrong.", "activities", ["hs-s6", "hs-s7"]),
 S("f5", "Applying the principles at the Strategy Horizon was clear and practical.", "content", ["hs-s4"]),
 S("f6", "The running case study made the ideas concrete.", "relevance"),
 S("f7", "The facilitator kept the day engaging and well paced.", "facilitation"),
 N("f8", "How likely are you to recommend this course to a colleague? (0–10)"),
 T("f9", "What will you do differently the next time you're shaping an investment idea?", "strengths"),
 T("f10", "What would you change or add to make the Strategy day better?", "improvement"),
],
"horizons-initiative": [
 S("f1", "I understand how the analyst's role changes once an initiative is funded.", "content", ["hi-s2"]),
 S("f2", "I can define and measure product outcomes for an initiative.", "content", ["hi-s3", "hi-s3b"]),
 S("f3", "Personas, journey mapping and impact mapping helped me understand the customer.", "content", ["hi-s5", "hi-s5b"]),
 S("f4", "Story mapping, MVP and feature decomposition are techniques I can now apply.", "content", ["hi-s5c"]),
 S("f5", "I can build an outcome-based roadmap with hypotheses and prioritisation.", "content", ["hi-s6", "hi-s6b"]),
 S("f6", "The final exercise helped me apply the day to a real funded initiative.", "activities", ["hi-s7", "hi-s6c"]),
 S("f7", "The facilitator kept the day engaging and well paced.", "facilitation"),
 N("f8", "How likely are you to recommend this course to a colleague? (0–10)"),
 T("f9", "What's the most useful technique you'll use on your current initiative?", "strengths"),
 T("f10", "What would you change or add to make the Initiative day better?", "improvement"),
],
"horizons-delivery": [
 S("f1", "I understand the Agile BA's role as a full member of the delivery team.", "content", ["hd-s2"]),
 S("f2", "The five outcomes of Delivery analysis gave me a clear picture of what good looks like.", "content", ["hd-s3"]),
 S("f3", "I can apply the nine principles in day-to-day delivery.", "content", ["hd-s5"]),
 S("f4", "I can decompose a feature into value slices and elaborate a story with examples and criteria.", "activities", ["hd-s6", "hd-s9"]),
 S("f5", "The Three Amigos role-play was a useful way to practise building shared understanding.", "activities", ["hd-s8"]),
 S("f6", "The AI prompts, carrying my own answers forward, gave useful feedback on my backlog item.", "ai"),
 S("f7", "The diagrams and running case made the content easy to follow.", "materials"),
 N("f8", "How likely are you to recommend this course to a colleague? (0–10)"),
 T("f9", "What will you change in your next iteration because of today?", "strengths"),
 T("f10", "What would you change or add to make the Delivery day better?", "improvement"),
],
"practical-ai": [
 S("f1", "I can use AI responsibly across the end-to-end BA lifecycle, from framing to benefits.", "content"),
 S("f2", "The AI-assisted process mapping sessions improved how I model As-Is and To-Be.", "content", ["wk2-mon", "wk2-wed"]),
 S("f3", "I can use AI to draft requirements, acceptance criteria and traceability I trust.", "content", ["wk4-mon", "wk4-wed"]),
 S("f4", "The options, business case and roadmap sessions helped me make a stronger case for change.", "content", ["wk5-mon", "wk5-wed", "wk6-mon"]),
 S("f5", "The prompts produced useful drafts and I know how to check and improve them.", "ai"),
 S("f6", "The weekly rhythm (two 2-hour sessions) worked well alongside my job.", "pacing"),
 S("f7", "The facilitator's coaching and feedback on my work was valuable.", "facilitation"),
 N("f8", "How likely are you to recommend this program to a colleague? (0–10)"),
 T("f9", "Which AI technique has saved you the most time or improved your work most?", "strengths"),
 T("f10", "What would you change, add or remove to make the program better?", "improvement"),
],
}
for slug, qs in F.items():
    p = os.path.join(D, f"{slug}.json"); raw = open(p, encoding="utf-8").read(); d = json.loads(raw)
    m_ = re.search(r"\n( +)\"", raw); ind = len(m_.group(1)) if m_ else 1
    ascii_ = "\\u" in raw and not any(ord(ch) > 127 for ch in raw)
    ids = {m["id"] for m in d["modules"]}
    for q in qs:
        for mid in q.get("modules", []): assert mid in ids, (slug, mid)
    assert len(qs) == 10
    d["feedback"] = qs
    out = json.dumps(d, ensure_ascii=ascii_, indent=ind) + ("\n" if raw.endswith("\n") else "")
    open(p, "w", encoding="utf-8").write(out)
    print(slug, "ok")
