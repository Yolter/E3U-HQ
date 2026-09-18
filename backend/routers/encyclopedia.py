"""Battle encyclopedia — server-owned knowledge base (i18n-ready keys + content)."""

from fastapi import APIRouter

router = APIRouter(prefix="/encyclopedia", tags=["encyclopedia"])

ENTRIES = [
    {
        "id": "formation-424",
        "section": "formations",
        "title": "4/2/4",
        "summary": "Balanced rally split — 40% front, 20% mid, 40% back.",
        "body": "Use against mixed defences when you cannot scout. Front absorbs, back carries damage. "
        "Never run 4/2/4 into a confirmed single-troop wall — counter-pick instead.",
        "tags": ["rally", "balanced"],
    },
    {
        "id": "formation-433",
        "section": "formations",
        "title": "4/3/3",
        "summary": "Front-heavy split for attrition fights.",
        "body": "Best when the defender stacks ranged troops. The wider front line keeps your carries alive "
        "one extra round, which decides long turf fights.",
        "tags": ["turf", "attrition"],
    },
    {
        "id": "formation-333",
        "section": "formations",
        "title": "3/3/3",
        "summary": "Even split for unknown compositions.",
        "body": "The safe default for solo hits and Governor Battle skirmishes. Low risk, low ceiling.",
        "tags": ["solo", "safe"],
    },
    {
        "id": "counters",
        "section": "counters",
        "title": "Troop counters",
        "summary": "Rock-paper-scissors core of every fight.",
        "body": "Brawler beats Gunner. Gunner beats Biker. Biker beats Brawler. Scout first; a correct "
        "counter is worth more than 20% extra power.",
        "tags": ["core"],
    },
    {
        "id": "heroes",
        "section": "heroes",
        "title": "Hero priority",
        "summary": "Level leaders before damage specialists.",
        "body": "Ascend one leader per troop type first, then damage skills. Spreading shards across six "
        "heroes is the most common mid-game mistake.",
        "tags": ["progression"],
    },
    {
        "id": "weapons",
        "section": "weapons",
        "title": "Weapons",
        "summary": "Craft for your main troop type only.",
        "body": "Refine one full set before starting a second. Mixed half-sets give no meaningful bonus.",
        "tags": ["crafting"],
    },
    {
        "id": "gems",
        "section": "gems",
        "title": "Gems",
        "summary": "Attack gems for rally leaders, defence gems for wall holders.",
        "body": "Fuse to the highest tier you can sustain; low-tier gems in every slot lose to two high-tier ones.",
        "tags": ["gear"],
    },
    {
        "id": "investments",
        "section": "investments",
        "title": "Investments",
        "summary": "Troop capacity first, then healing speed.",
        "body": "Capacity compounds with every rally. Healing speed keeps you in consecutive truck runs "
        "and Governor Battle waves.",
        "tags": ["economy"],
    },
    {
        "id": "cheatsheet",
        "section": "cheatsheet",
        "title": "Quick cheat sheet",
        "summary": "Before any clan event.",
        "body": "1) Scout. 2) Counter-pick troops. 3) Match formation to the defence. 4) Shield before logging off. "
        "5) Report the result in the forum so officers can plan the next wave.",
        "tags": ["checklist"],
    },
]

SECTIONS = ["formations", "counters", "heroes", "weapons", "gems", "investments", "cheatsheet"]


@router.get("")
async def list_entries(section: str = ""):
    items = [e for e in ENTRIES if not section or e["section"] == section]
    return {"sections": SECTIONS, "entries": items}
