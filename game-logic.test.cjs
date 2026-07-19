"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const relationship = require("./relationship-content.js");
const content = require("./content-data.js");
const game = require("./game-logic.js");

const NOW = Date.UTC(2026, 6, 12, 12);
const CONTENT_KEYS = ["DELIVERY_NARRATIVE_PILOTS", "CUSTOMER_CONTENT", "SIGNATURE_COMMISSIONS", "AFTER_STARS_STEPS", "VILLAGE_CHAPTER", "RECIPE_LORE"];
const EXPECTED_DELIVERY_NARRATIVES = [
  { customerId: "customer-0", fromHearts: 0, toHearts: 1, kicker: "MIRA · FIRST TRUST HEART", title: "The early list", body: "Before sunrise, Mira is checking the small slate where she records which opening trays sell first and which need another try. A flour tin is holding down one corner because the bakery door keeps letting in a sharp draft. You slide a folded cloth beneath the slate so it stays level, then hold the door while she writes down the two trays already cooling. \"There,\" she says. \"Now I can tell what actually worked.\" When the first loaves come out even, Mira laughs with relief and leaves one blank line for the next tray worth testing.", footer: "1 of 3 trust hearts · Mira keeps her opening-tray slate by the oven, with one blank test line." },
  { customerId: "customer-0", fromHearts: 1, toHearts: 2, kicker: "MIRA · SECOND TRUST HEART", title: "A taste before opening", body: "Four market mornings later, Mira brings a covered basket to the workshop before the shutters lift. Inside are three little oat loaves, each wrapped in parchment and tied with a different-colored string. You cut them into equal pieces with the butter knife she packed, then point to the apple loaf after its warm scent fills the doorway. Mira tastes it, looks at the empty crumbs on that plate, and writes RED STRING on her slate before circling those words. \"That one is plainly the favorite,\" she says. \"Thank you for helping me choose.\" She leaves the basket at your counter for the morning customers.", footer: "2 of 3 trust hearts · Mira records the red-string apple loaf as her next opening batch." },
  { customerId: "customer-0", fromHearts: 2, toHearts: 3, kicker: "MIRA · THIRD TRUST HEART", title: "The last warm slice", body: "A week later, Mira arrives at dusk with the same slate tucked under her arm. The red-string apple loaf sold out before noon, and she has brought one last warm slice for you to taste. You tap the cinnamon jar beside the cauldron. Mira opens it and smells the cinnamon, then writes \"one pinch cinnamon\" beside the RED STRING note on her slate. She takes the note back to the bakery and tests the change in the next opening batch. The following morning, she returns with an empty basket and a pleased nod. She adds one clear line to the slate: \"one workshop slice with every opening batch.\"", footer: "3 of 3 trust hearts · Mira now adds a workshop slice to every opening batch." },
  { customerId: "customer-1", fromHearts: 0, toHearts: 1, kicker: "OLD MOSS · FIRST TRUST HEART", title: "The little chime", body: "After a hard shower, Old Moss stops outside the workshop with a damp coat, a tin cup, and two little acorn chimes threaded on waxed string. He says the lane by the hedges is \"thinking about becoming a pond.\" He has already walked the raised route behind the elm and knows it is clear. You hold the shop lantern while he ties one chime at the elm turn. \"It will help people find this turn when rain hides the path,\" he explains. Before leaving, he hangs the other, the spare, by the workshop door so anyone caught in bad weather knows where to meet.", footer: "1 of 3 trust hearts · The route chime marks the elm turn; the spare marks the workshop meeting door." },
  { customerId: "customer-1", fromHearts: 1, toHearts: 2, kicker: "OLD MOSS · SECOND TRUST HEART", title: "A fidgety branch", body: "Two rainy days later, the spare chime knocks gently against the workshop door. Old Moss is already outside, looking pleased and mildly offended. The elm's low branch has rubbed the route chime against a knot, leaving its string frayed. You bring fresh waxed string and hold the lantern while he moves the chime one hand higher on the branch. \"Branches are fidgety neighbors,\" he explains. Then you stand together at the workshop door and listen through the rain. From there, you can hear the route chime, while the spare still marks the place where walkers should gather first.", footer: "2 of 3 trust hearts · The repaired route chime can be heard from the workshop meeting door." },
  { customerId: "customer-1", fromHearts: 2, toHearts: 3, kicker: "OLD MOSS · THIRD TRUST HEART", title: "The dry way home", body: "The following week, rain catches the evening market just as the bakers begin packing up. Neighbors spot the spare acorn chime at the workshop door and gather beneath its awning while Old Moss brings an armful of umbrellas for everyone. You help keep the group together as he leads everyone to the elm. The repaired route chime rattles at the turn, so no one misses the raised path behind it. The neighbors follow with their shoes mostly clean. At the far gate, Moss says, \"Reliable enough for company.\" When the rain eases, the spare chime is still hanging by the workshop door.", footer: "3 of 3 trust hearts · The workshop meeting chime and elm route marker guide neighbors to the raised path." },
  { customerId: "customer-2", fromHearts: 0, toHearts: 1, kicker: "JUNIPER · FIRST TRUST HEART", title: "The missing page", body: "Behind the mill, Juniper's music pages keep lifting from their stand whenever the wheel catches a breeze. One sheet skids across the grass, and you catch it before it reaches the water. Juniper groans, then laughs. \"A dramatic exit for a very shy note.\" You fasten the pages with the plain brass clip from a supply box, and she tries the troublesome passage again. This time she makes it to the end without chasing paper. She writes a small dot beside the bar where she usually stops and folds the clipped pages carefully into her case.", footer: "1 of 3 trust hearts · A brass clip holds Juniper's pages, and one difficult bar is marked." },
  { customerId: "customer-2", fromHearts: 1, toHearts: 2, kicker: "JUNIPER · SECOND TRUST HEART", title: "One more run-through", body: "The next Friday, Juniper has set two stools behind the mill: one for her case and one facing the water. She says the marked bar still feels like a loose floorboard. You take the spare stool and turn pages when she nods. The first attempt wobbles, so she stops, makes a face, and starts again before you can politely look away. On the second pass, the brass clip flashes in the sun and she clears the bar cleanly. Juniper adds a penciled pause before it. \"That is where I remember to breathe,\" she says.", footer: "2 of 3 trust hearts · The marked bar gains a breathing pause, and the second stool stays by the mill." },
  { customerId: "customer-2", fromHearts: 2, toHearts: 3, kicker: "JUNIPER · THIRD TRUST HEART", title: "The open rehearsal", body: "Several weeks later, a delivery cart breaks a wheel in the market square, and people gather under the awning. Juniper carries her case from the mill and sets it on its usual stool. You sit on the second stool beside a dry fruit crate, the only dry surface available for her score. Juniper sets the score on the crate; you fasten it with the brass clip and turn its pages while she plays. When a few neighbors turn to listen, Juniper pauses, then says she will finish this one. She clears the marked passage, takes the penciled breathing pause, and plays on. Afterward, both stools return to the mill.", footer: "3 of 3 trust hearts · Juniper returns both stools to the mill and keeps the listener's stool ready." },
  { customerId: "customer-6", fromHearts: 0, toHearts: 1, kicker: "FERN · FIRST TRUST HEART", title: "The seed that would not wake", body: "Fern sets a blue clay pot on the counter. Its soil is dark and carefully tended, but bare. \"I've tried sun, shade, songs, and apologizing to it,\" she says. \"I keep telling everyone it just needs more time, but I'm starting to think I'm wrong.\" She asks if she can leave the pot beside your warm cauldron for a few days, and you clear it a place.", footer: "1 of 3 trust hearts · The blue pot stays in your workshop" },
  { customerId: "customer-6", fromHearts: 1, toHearts: 2, kicker: "FERN · SECOND TRUST HEART", title: "What help looks like", body: "A few days later, Fern returns to check the blue pot and finds a tiny green shoot breaking through the soil. It has grown toward the cauldron and is beginning to lean. Fern reaches to move it closer to the warmth, but you point to the morning light at the nearby window. Together you move the pot where it can have both, then brace the stem with a folded order slip. \"I thought being patient meant leaving it alone,\" Fern says. \"But sometimes patience means watching closely and helping at the right time.\"", footer: "2 of 3 trust hearts · The seedling moves to the workshop window" },
  { customerId: "customer-6", fromHearts: 2, toHearts: 3, kicker: "FERN · THIRD TRUST HEART", title: "A place by the window", body: "Some time later, Fern visits the workshop again and takes one look at the blue pot. A small violet flower has opened above the leaves. \"It bloomed!\" she says, then laughs when you point to the folded order slip still supporting the stem. Fern brushes a little soil from the sill while you turn the flower toward the light. She adds a painted label: PATIENCE. \"It did most of the work,\" she says. \"But I think it liked having both of us around.\" When Fern reaches to take the pot home, you tap its place by the window. She smiles and leaves it there.", footer: "3 of 3 trust hearts · Patience stays by the workshop window" },
  { customerId: "customer-3", fromHearts: 0, toHearts: 1, kicker: "POSTMASTER PIP · FIRST TRUST HEART", title: "The ribbon at the gate", body: "On a breezy afternoon, Pip skids into the workshop with a small bundle of blank address cards and a blue ribbon caught around his satchel strap. A garden gate on his route has been swinging open, he explains, and every gust sends the cards fluttering into the path. You hold the gate steady while he threads the ribbon through its loose latch, then use the empty cards to test the wind. They stay put. Pip checks the ribbon twice, grins, and tucks the cards back into his satchel. \"A route with fewer flying papers is a very fast route,\" he says.", footer: "1 of 3 trust hearts · The blue ribbon now keeps the garden gate latched and Pip's address cards from blowing into the path." },
  { customerId: "customer-3", fromHearts: 1, toHearts: 2, kicker: "POSTMASTER PIP · SECOND TRUST HEART", title: "The damp corner", body: "Three rainy mornings later, Pip finds you beneath the same garden gate with the blue ribbon still holding firm. One address card has a damp corner from a puddle near the hedge. You spread it on the workshop counter and press it flat under a clean jar while Pip sketches the gate and puddle in the margin of a fresh card. Together you carry a flat stepping stone from the garden border to the wet spot. Pip hops across it, then crosses again at his usual hurry. \"Officially a better crossing,\" he declares, and adds a tiny stone symbol to his route note.", footer: "2 of 3 trust hearts · A stepping stone protects the gate crossing; Pip's route note now marks it." },
  { customerId: "customer-3", fromHearts: 2, toHearts: 3, kicker: "POSTMASTER PIP · THIRD TRUST HEART", title: "The dry delivery", body: "The next week brings a proper downpour just as Pip reaches the workshop with a sealed letter for the gardener beyond the hedge. He pauses at the blue-ribbon gate, spots the stepping stone, and hands you the satchel while he closes his umbrella. You cross first, keeping the letter high and dry; Pip follows, laughing when the stone saves his polished shoes from the puddle. At the far gate, he takes back the satchel and delivers the letter without a wrinkled corner. On his return, Pip adds one neat note beside the stone symbol: \"trusted in rain.\"", footer: "3 of 3 trust hearts · Pip keeps the blue-ribbon gate and marked stepping stone on his rainy-day route." },
  { customerId: "customer-4", fromHearts: 0, toHearts: 1, kicker: "LADY BRAMBLE · FIRST TRUST HEART", title: "The small brass key", body: "Lady Bramble arrives with a tiny brass key tied to a green thread and asks you to look at its stubborn little bow. It belongs to a wooden seed chest in her back hall, she says, and the thread keeps catching whenever she opens it. You set the key on a cloth, smooth the knot, and loop the thread through a buttonhole-sized ring from a spare tag. Bramble tries the chest key again, then gives the ring an approving tap. \"Orderly, but not so orderly that it stops being charming,\" she says. She leaves the key on the workshop shelf until morning so the new loop can settle.", footer: "1 of 3 trust hearts · The brass key has a loose green-thread loop and waits on the workshop shelf overnight." },
  { customerId: "customer-4", fromHearts: 1, toHearts: 2, kicker: "LADY BRAMBLE · SECOND TRUST HEART", title: "The labeled drawers", body: "The following day, Lady Bramble returns for the key carrying three seed packets with their names rubbed away. You fetch the seed chest from her back hall and spread the packets beside it on the workshop table. She remembers one packet smelled peppery and another made a very poor hiding place for a snail. You sort the remaining clues into little paper sleeves; she writes simple labels in her tidy hand. The brass key opens the chest without catching, and Bramble slips the sleeves into its top drawer. \"You have made my disorder quite presentable,\" she says.", footer: "2 of 3 trust hearts · The seed chest now holds three labeled sleeves, opened by the green-looped brass key." },
  { customerId: "customer-4", fromHearts: 2, toHearts: 3, kicker: "LADY BRAMBLE · THIRD TRUST HEART", title: "The right drawer", body: "A few days later, Bramble finds a fourth unmarked packet on her doorstep after a night of strong wind. She brings it straight to the workshop instead of guessing. You compare its leaf shape to the sketches on the three paper sleeves, and she notices it matches the peppery packet's curled edge. Together you label it before it can disappear into a drawer. Back at the seed chest, the green-looped key turns easily and Bramble files the new sleeve beside its match. She pauses before closing the lid. \"Next time, we begin with the drawer,\" she says, pleased.", footer: "3 of 3 trust hearts · Lady Bramble uses the labeled seed chest as a shared starting place for new garden mysteries." },
  { customerId: "customer-5", fromHearts: 0, toHearts: 1, kicker: "TINK THE SMITH · FIRST TRUST HEART", title: "The rolling washer", body: "Tink spots a small iron washer rolling under your worktable and drops to one knee before it can vanish behind the flour tins. He says it slipped from a hand-cranked label press he is making for workshop jars. You slide a shallow tray under the table while he nudges the washer into it with a spoon. At the forge, he fits it back onto the press and turns the handle. The label comes out crooked but readable: MINT, almost. Tink squints, then lets you add a pencil arrow showing which way the washer should face next time.", footer: "1 of 3 trust hearts · The washer sits correctly in Tink's label press, with a pencil arrow for its proper direction." },
  { customerId: "customer-5", fromHearts: 1, toHearts: 2, kicker: "TINK THE SMITH · SECOND TRUST HEART", title: "A steadier turn", body: "Two market days later, Tink brings the label press to the workshop with the washer still in place but the pencil arrow smudged from use. You hold the press steady while he turns its handle slowly, and the first label reads MINT without leaning. The second jams halfway through. Instead of yanking it free, Tink sets the press on the tray you used under the table and you both lift the paper back in one piece. He redraws the arrow on a small metal tab and ties the tab to the handle with twine. \"That should survive my enthusiasm,\" he says.", footer: "2 of 3 trust hearts · A metal direction tab now hangs from the press handle; the tray catches any jammed labels." },
  { customerId: "customer-5", fromHearts: 2, toHearts: 3, kicker: "TINK THE SMITH · THIRD TRUST HEART", title: "Labels before lunch", body: "The next Saturday, jars have gathered on your counter before the morning rush. Tink sets his press beside the shallow tray, checks the metal tab, and hands you the blank labels one at a time. You line up each jar while he gives the handle its steady turn. When one label starts to crease, you catch it in the tray and Tink resets the paper without fuss. Soon every jar has a straight name, including the smallest amber bottle. Tink reads that last label aloud, nods solemnly, and leaves the press by your counter for the afternoon.", footer: "3 of 3 trust hearts · Tink's label press, direction tab, and shallow tray make a reliable workshop counter routine." },
  { customerId: "customer-7", fromHearts: 0, toHearts: 1, kicker: "CAPTAIN WREN · FIRST TRUST HEART", title: "The blue cord", body: "Captain Wren, silver at the temples, comes up from the docks with salt dried on his coat and a coil of blue tarred cord over one arm. Decades of rough crossings, departures, and temporary ports have taught him to treat a harbor as a place to leave once duty is done. The wooden berth marker beside the workshop-side quay has worked loose after a hard tide; without it, a returning vessel can drift toward the wrong piling in the dark. You hold the lantern steady while he lashes the marker fast and tests each knot with his weathered hands. He studies the water, then makes one small mark on the tide chart tucked in his jacket. \"It reads clear from the channel.\" Before you can point him toward the kettle, he turns for his ship. \"Tide won't wait.\" Then he leaves.", footer: "1 of 3 trust hearts · Blue tarred cord secures the workshop-side berth marker; Wren leaves once the immediate dock work is finished." },
  { customerId: "customer-7", fromHearts: 1, toHearts: 2, kicker: "CAPTAIN WREN · SECOND TRUST HEART", title: "The next tide", body: "Three days later, Wren returns alone when the tide turns. He checks the blue tarred cord first, then the berth marker's angle against the channel. \"Held,\" he says. His ship is already safe at its mooring, but he unrolls his tide chart on your counter and asks whether the harbor bell sounded before dawn. You point out the workshop lamp you had left lit for the early boats. He adds a small lamp mark beside the berth. The chart is folded and the work is done, yet he notices the kettle beside the labels. \"You keep it there. Sensible.\" He stays for one cup.", footer: "2 of 3 trust hearts · The blue cord still holds the berth marker, and Wren's tide chart now carries a small lamp mark beside the workshop-side quay." },
  { customerId: "customer-7", fromHearts: 2, toHearts: 3, kicker: "CAPTAIN WREN · THIRD TRUST HEART", title: "The brass tag", body: "A week later, fog settles over the harbor before evening. Wren arrives at the workshop door before his ship does and asks for the lantern by the label shelf. A small courier sloop has missed the berth marker in the haze. You carry the lantern to the quay while Wren calls calm directions from the piling; the blue tarred cord catches the light, and the sloop comes alongside without scraping its hull. When the line is made fast, Wren walks back with you instead of boarding at once. He sets a small brass route tag beside the kettle. \"Keep it there,\" he says. \"I'll come in on the next tide.\"", footer: "3 of 3 trust hearts · Wren's brass route tag remains beside the workshop kettle, a reason for him to return after the courier sloop reaches berth." },
  { customerId: "customer-8", fromHearts: 0, toHearts: 1, kicker: "NELL OF THE MILL · FIRST TRUST HEART", title: "The quiet scoop", body: "Near closing, Nell brings a small wooden flour scoop to the workshop with a loose leather loop at its handle. It keeps slipping from the peg beside her shift basket, and she is tired of finding it under the clean cloths. You hold the scoop while she threads a fresh bit of twine through the handle, then she taps the knot with one floury finger. Back at the mill, she hangs it on the peg and gives the basket a cheerful little pat. \"There,\" she says. \"One less thing trying to join the floor.\"", footer: "1 of 3 trust hearts · Nell's wooden scoop hangs from a new twine loop beside her late-shift basket." },
  { customerId: "customer-8", fromHearts: 1, toHearts: 2, kicker: "NELL OF THE MILL · SECOND TRUST HEART", title: "The folded list", body: "Four evenings later, Nell has tied a folded paper list to the same scoop loop. The list is for the next morning’s bakery sacks, but each time she reaches for the scoop, it swings against the paper and smudges the pencil. You bring a plain glass bead from the workshop’s odds-and-ends drawer, and she threads it between the scoop and the list. The bead keeps them apart. Nell tests the arrangement by measuring one careful scoop into a sack, then reads the list without a gray thumbprint across it. She leaves the bead in place and sends you home with a warm oat biscuit.", footer: "2 of 3 trust hearts · A glass bead separates Nell’s scoop from the morning-sack list, keeping the pencil notes clean." },
  { customerId: "customer-8", fromHearts: 2, toHearts: 3, kicker: "NELL OF THE MILL · THIRD TRUST HEART", title: "Breakfast by the door", body: "The following market morning, a delivery boy arrives early for the bakery sacks and finds Nell already at the mill door with her shift basket. The wooden scoop is on its peg, the glass bead is between it and the folded list, and every sack is ready to count. You hold the door while she reads the last note aloud and hands over the correct bundle. After he hurries off, you set a warm oat biscuit in a clean paper sleeve beside her basket, returning the favor from the night before. Nell laughs, adds a second biscuit from her tin, and declares the door-side peg an excellent place for breakfast planning.", footer: "3 of 3 trust hearts · Nell keeps the scoop, bead, list, and a two-biscuit breakfast packet together by the mill door." },
  { customerId: "customer-9", fromHearts: 0, toHearts: 1, kicker: "ROWAN THE TAILOR · FIRST TRUST HEART", title: "The wandering button", body: "Rowan spots a brass button rolling beneath your counter and catches it with the toe of his shoe. It belongs to a child's rain cape he is mending, but the button card in his work basket has a torn corner and let it escape. You flatten the card on the counter while he cuts a neat paper patch from an old potion-order slip. He stitches the patch on with blue thread, then slides the button into its proper hole. \"Small things travel surprisingly fast,\" he says, handing you the card to hold while he finishes the cape cuff.", footer: "1 of 3 trust hearts · The brass button rests on Rowan's patched card until it is sewn back onto the rain cape." },
  { customerId: "customer-9", fromHearts: 1, toHearts: 2, kicker: "ROWAN THE TAILOR · SECOND TRUST HEART", title: "A pocket for the card", body: "Two afternoons later, Rowan returns with the finished rain cape and the patched button card still tucked in his basket. A gust from the open shop door lifts the card toward the floor. You catch it against a bottle crate, and Rowan studies the inside of the cape. With your help holding the lining flat, he sews a narrow pocket just large enough for the card. The original button goes back on the cuff; Rowan threads two spare brass buttons onto the patched card and slides it into the new pocket. He folds a small flap over the opening and fastens it with a blue-thread loop, then says the cape has become more organized than most desks.", footer: "2 of 3 trust hearts · The repaired cape’s inside pocket carries Rowan’s patched card and two spare brass buttons beneath a thread-loop flap." },
  { customerId: "customer-9", fromHearts: 2, toHearts: 3, kicker: "ROWAN THE TAILOR · THIRD TRUST HEART", title: "Rainy-day return", body: "A week later, the child comes by in the rain wearing the cape, with a loose mitten string dragging from one sleeve. Rowan opens the blue-thread loop and finds the patched card exactly where he left it, along with the two spare buttons. You hold the sleeve straight while he anchors the mitten string with one of them. The child twirls once, pleased that nothing has fallen away. Rowan returns the card to its pocket and lets the child refasten the loop. Before they leave, he presses the remaining spare button into your palm for the workshop mending tin.", footer: "3 of 3 trust hearts · Rowan’s pocketed button card supports a second repair, and one spare brass button now waits in the workshop tin." },
  { customerId: "customer-10", fromHearts: 0, toHearts: 1, kicker: "ARCHIVIST SOL · FIRST TRUST HEART", title: "The rain shelf", body: "A hard afternoon shower finds one archive window dripping onto a row of old bridge guides. Sol has already moved the dry books, but the damp ones have begun to curl at their corners. You fetch two clean bottle crates from the workshop and hold each guide open while he slides blotting paper between its pages. Sol measures every space with a ruler, then hands you a blue card to place on the empty shelf. \"Not lost,\" he says. \"Just taking the long way back.\" By closing time, the guides are drying safely on the crate lids.", footer: "1 of 3 trust hearts · Bridge guides dry on bottle crates; a blue shelf card marks their place." },
  { customerId: "customer-10", fromHearts: 1, toHearts: 2, kicker: "ARCHIVIST SOL · SECOND TRUST HEART", title: "The clear corner", body: "Two mornings later, Sol brings the blue shelf card to the workshop because its pencil note has smudged in the damp. You steady a jar of ink while he writes a fresh, simple label: BRIDGE GUIDES — DRYING. Back at the archive, the pages lie flat again, but one booklet still needs another day. Sol lets you choose the cleanest corner of the return desk for it, then moves the card there with a tiny nod. When a mason asks for a route sketch, Sol checks the card before reaching for any shelf. \"Useful,\" he says, approving the ordinary word.", footer: "2 of 3 trust hearts · One guide finishes drying at the return desk under the freshly labeled blue card." },
  { customerId: "customer-10", fromHearts: 2, toHearts: 3, kicker: "ARCHIVIST SOL · THIRD TRUST HEART", title: "Before the bell", body: "On the next market morning, the same mason returns before the village bell with a repaired bridge railing to inspect and no route sketch in hand. Sol is sorting returns, so you spot the blue card first and bring the last dry guide from the desk. He checks its corners, then passes it to the mason without a lecture or a delay. The mason leaves in time to beat the rain. Sol slides the blue card into the return-desk drawer and hands you the empty bottle crate. \"A good temporary system,\" he says. \"Those are rarer than permanent ones.\"", footer: "3 of 3 trust hearts · The bridge guide reaches its reader; the blue card and crate become the archive's rain-day set." },
  { customerId: "customer-11", fromHearts: 0, toHearts: 1, kicker: "BEE KEEPER BEA · FIRST TRUST HEART", title: "The little water tray", body: "On a dry afternoon, Bea sets a shallow clay tray beside the orchard fence and studies it as if it has made a questionable decision. The bees have been visiting the puddle by the gate instead, where passing carts make a fuss. You wash a handful of smooth pebbles at the workshop pump and settle them into the tray so there are small dry places above the water. Bea tops it up from her can and steps back with you. \"There,\" she says. \"A much less dramatic refreshment table.\" The tray stays beneath the fence's patch of shade.", footer: "1 of 3 trust hearts · A pebble-filled water tray rests in the shaded orchard corner." },
  { customerId: "customer-11", fromHearts: 1, toHearts: 2, kicker: "BEE KEEPER BEA · SECOND TRUST HEART", title: "A quieter path", body: "Three days later, Bea finds a bright ribbon caught low on the orchard fence near the water tray. It flaps whenever the gate opens, so you hold the gate still while she eases the ribbon free and folds it into her apron pocket. Together you carry the tray a few steps behind the bench, where the shade lasts longer and walkers have a clearer path. You press a blue stripe on the bench leg with a bit of chalk so its new spot is easy to find. Bea fills the tray again and leaves you the can while she checks the far hives.", footer: "2 of 3 trust hearts · The tray moves behind the bench; a blue stripe marks its quieter, shadier place." },
  { customerId: "customer-11", fromHearts: 2, toHearts: 3, kicker: "BEE KEEPER BEA · THIRD TRUST HEART", title: "The right bench", body: "The following Saturday, a gusty market sends a few shoppers through the orchard shortcut. Bea arrives with the folded ribbon and finds you refilling the tray behind the blue-striped bench. The water is still calm, and the path by the gate is clear. She ties the ribbon around the bench rail instead, where it simply marks the place to pause before the orchard. A child asks where the bees are, and Bea points from a comfortable distance while you keep the gate open for the family. Afterward, Bea takes back her can and leaves the ribbon in place.", footer: "3 of 3 trust hearts · The blue-striped bench and ribbon make a calm orchard pause beside the water tray." },
];
let passed = 0;
function test(name, fn) {
  fn(); passed += 1; console.log(`ok ${passed} - ${name}`);
}

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value)) assertDeepFrozen(nested, seen);
}

test("content catalog exposes the same deeply frozen objects through CommonJS and PPWLogic", () => {
  assert.deepEqual(Object.keys(relationship), ["DELIVERY_NARRATIVE_PILOTS"]);
  assert.equal(Object.isFrozen(relationship), true);
  assert.equal(Object.isFrozen(content), true);
  assert.equal(Object.isFrozen(game), true);
  assert.deepEqual(Object.keys(content), CONTENT_KEYS);
  assert.strictEqual(content.DELIVERY_NARRATIVE_PILOTS, relationship.DELIVERY_NARRATIVE_PILOTS);
  assert.strictEqual(game.DELIVERY_NARRATIVE_PILOTS, relationship.DELIVERY_NARRATIVE_PILOTS);
  assert.deepEqual(relationship.DELIVERY_NARRATIVE_PILOTS, EXPECTED_DELIVERY_NARRATIVES);
  assertDeepFrozen(relationship);
  for (const key of CONTENT_KEYS) {
    assert.strictEqual(game[key], content[key]);
    assertDeepFrozen(content[key]);
  }
});

test("content catalog exposes one browser global and game logic requires it", () => {
  const relationshipSource = fs.readFileSync("relationship-content.js", "utf8");
  const contentSource = fs.readFileSync("content-data.js", "utf8");
  const logicSource = fs.readFileSync("game-logic.js", "utf8");
  const browser = vm.createContext({});
  vm.runInContext(relationshipSource, browser, { filename: "relationship-content.js" });
  assert.ok(browser.PPWRelationshipContent);
  vm.runInContext(contentSource, browser, { filename: "content-data.js" });
  assert.ok(browser.PPWContent);
  vm.runInContext(logicSource, browser, { filename: "game-logic.js" });
  assert.strictEqual(browser.PPWContent.DELIVERY_NARRATIVE_PILOTS, browser.PPWRelationshipContent.DELIVERY_NARRATIVE_PILOTS);
  assert.strictEqual(browser.PPWLogic.DELIVERY_NARRATIVE_PILOTS, browser.PPWRelationshipContent.DELIVERY_NARRATIVE_PILOTS);
  for (const key of CONTENT_KEYS) assert.strictEqual(browser.PPWLogic[key], browser.PPWContent[key]);
  assert.throws(() => vm.runInNewContext(contentSource, {}, { filename: "content-data.js" }), /relationship content is unavailable/);
  assert.throws(() => vm.runInNewContext(logicSource, {}, { filename: "game-logic.js" }), /content catalog is unavailable/);
});

test("Captain Wren uses only the approved maritime support copy", () => {
  assert.deepEqual(game.CUSTOMERS[7], ["Captain Wren", "⚓", "Workshop light is on. Good enough bearing.", "#d8dfec"]);
  assert.deepEqual(game.CUSTOMER_CONTENT[7].orderLines, ["Berth marker holds. Good.", "You keep the kettle where it belongs. Sensible.", "I'll come in on the next tide."]);
  assert.deepEqual(game.CUSTOMER_CONTENT[7].stories, ["After decades at sea, Captain Wren marks the workshop-side berth on his tide chart, then closes the book before anyone can call it a habit; temporary ports taught him not to keep much.", "He returns on the next tide to see whether the blue tarred cord still holds the harbor marker true.", "A small brass route tag stays beside the workshop kettle; Wren says it is easier to find there when he comes back."]);
  assert.deepEqual(game.SIGNATURE_COMMISSIONS.find(entry => entry.id === "wren-harbor"), { id: "wren-harbor", customerId: "customer-7", recipeId: "way", title: "A Safe Harbor", request: "A steady cordial for a ship captain bringing his vessel in after rough water, and one workshop he has begun to mark on the chart.", keepsake: { mark: "CR", name: "Compass Rose", description: "A worn brass compass rose Wren leaves beside the workshop kettle, so he can find the door again without pretending he forgot it." } });
  assert.doesNotMatch(JSON.stringify({ customer: game.CUSTOMERS[7], content: game.CUSTOMER_CONTENT[7], commission: game.SIGNATURE_COMMISSIONS.find(entry => entry.id === "wren-harbor") }), /road|orchard|pear|inland|her compass|she adds|pirate|violent|romantic/i);
});

test("relationship cards require acknowledgement without changing other completion timing", () => {
  const appSource = fs.readFileSync("app.js", "utf8");
  const uiSource = fs.readFileSync("ui-render.js", "utf8");
  const styleSource = fs.readFileSync("style.css", "utf8");
  const completionPath = appSource.slice(appSource.indexOf("function beginCompletionState"), appSource.indexOf("function saveState"));
  const narrativePath = appSource.slice(appSource.indexOf("function renderNarrativeDelivery"), appSource.indexOf("function chooseCommission"));
  assert.doesNotMatch(completionPath, /narrative/, "relationship cards must not enter the timer-driven completion path");
  assert.match(appSource, /narrativeWorkshop: \[\], narrativeOrders: \[\]/, "relationship cards use transient queues rather than saved acknowledgement state");
  assert.match(narrativePath, /const narrative = queue\[0\] \|\| null/);
  assert.match(narrativePath, /queue\.shift\(\)/);
  assert.match(narrativePath, /data-dismiss-narrative/);
  assert.match(narrativePath, /dismissNarrativeDelivery/);
  assert.match(narrativePath, /visibleEnabledAction/);
  assert.doesNotMatch(narrativePath, /setTimeout/, "relationship cards must not auto-dismiss");
  assert.match(uiSource, /class="narrative-continue" data-dismiss-narrative>Continue/);
  assert.match(styleSource, /\.narrative-continue \{ min-height: 44px;/);
  assert.doesNotMatch(styleSource, /\.narrative-delivery-card\.is-collapsing/);
  assert.match(completionPath, /Logic\.COMPLETION_CARD_CONFIG\.readableMs/, "unrelated completion cards retain their existing readable timing");
});

test("relationship story queues preserve order, acknowledgement, focus, and surface independence", () => {
  const appSource = fs.readFileSync("app.js", "utf8");
  const narrativePath = appSource.slice(appSource.indexOf("function renderNarrativeDelivery"), appSource.indexOf("function chooseCommission"));
  const focused = [];
  const makeCard = id => {
    const button = { id: `${id}Continue`, addEventListener(type, listener) { if (type === "click") this.listener = listener; } };
    return { id, hidden: true, innerHTML: "", button, querySelector(selector) { return selector === "[data-dismiss-narrative]" && this.innerHTML ? button : null; } };
  };
  const cards = { workshopNarrativeDelivery: makeCard("workshopNarrativeDelivery"), ordersNarrativeDelivery: makeCard("ordersNarrativeDelivery") };
  const workshopSafe = { id: "workshopSafe", getClientRects: () => [{}] };
  const ordersSafe = { id: "ordersSafe", getClientRects: () => [{}] };
  const sandbox = {
    transientCompletions: { narrativeWorkshop: [], narrativeOrders: [] },
    CUSTOMERS: [],
    UI: { narrativeDeliveryMarkup: detail => detail ? detail.title : "" },
    requestAnimationFrame: callback => callback(),
    focusTarget: target => focused.push(target?.id || null),
    document: {
      getElementById: id => cards[id] || null,
      querySelector: selector => {
        if (selector === "#workshopNarrativeDelivery [data-dismiss-narrative]") return cards.workshopNarrativeDelivery.button;
        if (selector === "#ordersNarrativeDelivery [data-dismiss-narrative]") return cards.ordersNarrativeDelivery.button;
        if (selector.includes("readyDeliverStrip") || selector.includes("#gatherButton") || selector.includes("[data-brew]")) return workshopSafe;
        if (selector.includes("#orderList") || selector.includes("#claimDailyButton") || selector.includes("#refreshOrdersButton")) return ordersSafe;
        return null;
      },
    },
  };
  vm.runInNewContext(narrativePath, sandbox, { filename: "app.js relationship queue" });
  const workshopFirst = { title: "workshop first" };
  const workshopSecond = { title: "workshop second" };
  const ordersFirst = { title: "orders first" };

  sandbox.showNarrativeDelivery("workshop", workshopFirst, 11);
  sandbox.showNarrativeDelivery("workshop", workshopSecond, 12);
  sandbox.renderNarrativeDelivery();
  assert.deepEqual(sandbox.transientCompletions.narrativeWorkshop.map(entry => entry.detail.title), ["workshop first", "workshop second"], "same-surface scenes queue FIFO");
  assert.equal(cards.workshopNarrativeDelivery.innerHTML, "workshop first", "the second scene cannot replace the first");

  sandbox.showNarrativeDelivery("orders", ordersFirst, 21);
  sandbox.renderNarrativeDelivery();
  assert.equal(cards.workshopNarrativeDelivery.innerHTML, "workshop first", "Orders scenes do not affect Workshop's visible scene");
  assert.equal(cards.ordersNarrativeDelivery.innerHTML, "orders first");

  sandbox.dismissNarrativeDelivery("Workshop", sandbox.transientCompletions.narrativeWorkshop[0]);
  assert.deepEqual(sandbox.transientCompletions.narrativeWorkshop.map(entry => entry.detail.title), ["workshop second"]);
  assert.equal(cards.workshopNarrativeDelivery.innerHTML, "workshop second", "first Continue reveals the second scene");
  assert.equal(focused[focused.length - 1], "workshopNarrativeDeliveryContinue", "queued Workshop scene receives focus on Continue");

  sandbox.dismissNarrativeDelivery("Orders", sandbox.transientCompletions.narrativeOrders[0]);
  assert.equal(sandbox.transientCompletions.narrativeOrders.length, 0, "Orders drains independently");
  assert.equal(sandbox.transientCompletions.narrativeWorkshop.length, 1, "Orders dismissal leaves Workshop's queue intact");
  assert.equal(focused[focused.length - 1], "ordersSafe", "Orders restores a same-surface action only after its queue drains");

  sandbox.dismissNarrativeDelivery("Workshop", sandbox.transientCompletions.narrativeWorkshop[0]);
  assert.equal(sandbox.transientCompletions.narrativeWorkshop.length, 0, "second Continue clears the Workshop queue");
  assert.equal(focused[focused.length - 1], "workshopSafe", "Workshop restores a same-surface action only after its queue drains");
});

test("exact ingredient cost starts a brew and consumes exactly the cost", () => {
  const state = game.defaultState(NOW);
  state.ingredients = { herb: 2, mushroom: 1, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  assert.equal(game.startBrew(state, "tonic", NOW), true);
  assert.deepEqual(state.ingredients, { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 });
});

test("insufficient cost cannot start or partially charge a brew", () => {
  const state = game.defaultState(NOW);
  state.ingredients = { herb: 2, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  const before = structuredClone(state.ingredients);
  assert.equal(game.startBrew(state, "tonic", NOW), false);
  assert.deepEqual(state.ingredients, before);
});

test("a completed brew can only be collected once", () => {
  const state = game.defaultState(NOW);
  game.startBrew(state, "tonic", NOW);
  assert.ok(game.collectBrew(state, NOW + 30000));
  assert.equal(game.collectBrew(state, NOW + 30000), null);
  assert.equal(state.potions.tonic, 1);
  assert.equal(state.stats.brewed, 1);
});

test("quick-brew assist removes forty percent once without finishing the brew", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients.herb = 3;
  state.ingredients.crystal = 1;
  assert.equal(game.startBrew(state, "clarity", NOW), true);
  const status = game.finishBrewAssistStatus(state, NOW + 6000);
  assert.equal(status.available, true);
  assert.equal(status.remainingMs, 60000);
  const result = game.applyFinishBrewAssist(state, NOW + 6000);
  assert.equal(result.applied, true);
  assert.equal(result.remainingMs, 36000);
  assert.equal(state.brew.endsAt, NOW + 42000);
  assert.equal(game.collectBrew(state, NOW + 6000), null);
  assert.equal(game.finishBrewAssistStatus(state, NOW + 6000).reason, "already-used");
  assert.equal(game.applyFinishBrewAssist(state, NOW + 6000).applied, false);
  assert.equal(state.brew.endsAt, NOW + 42000);
});

test("quick-brew assist rejects missing, ready, and nearly complete brews", () => {
  const state = game.defaultState(NOW);
  assert.equal(game.finishBrewAssistStatus(state, NOW).reason, "no-active-brew");
  game.startBrew(state, "tonic", NOW);
  assert.equal(game.finishBrewAssistStatus(state, NOW).reason, "too-close-to-ready");
  assert.equal(game.finishBrewAssistStatus(state, NOW + 30000).reason, "brew-ready");
});

test("quick-brew usage survives save normalization", () => {
  const state = game.defaultState(NOW);
  game.startBrew(state, "tonic", NOW);
  state.brew.assistUses = 99;
  const loaded = game.normalizeState(state, NOW);
  assert.equal(loaded.brew.assistUses, game.FINISH_BREW_CONFIG.maxUsesPerBrew);
});

test("an order can only be delivered once", () => {
  const state = game.defaultState(NOW);
  state.orders = [{ id: 1, recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
  state.nextOrderId = 2; state.potions.tonic = 1;
  assert.ok(game.fulfillOrder(state, 1, NOW, () => 0));
  assert.equal(game.fulfillOrder(state, 1, NOW, () => 0), null);
  assert.equal(state.stats.orders, 1);
  assert.equal(state.potions.tonic, 0);
});

test("XP overflow crosses multiple levels and keeps the remainder", () => {
  const state = game.defaultState(NOW);
  const total = game.xpNeeded(1) + game.xpNeeded(2) + 7;
  assert.deepEqual(game.addXp(state, total), [2, 3]);
  assert.equal(state.level, 3);
  assert.equal(state.xp, 7);
});

test("data-driven achievement evaluation unlocks every existing threshold once with supplied timestamps", () => {
  const thresholds = {
    firstBrew: [state => { state.stats.brewed = 0; }, state => { state.stats.brewed = 1; }],
    orderFive: [state => { state.stats.orders = 4; }, state => { state.stats.orders = 5; }],
    coin500: [state => { state.stats.coinsEarned = 499; }, state => { state.stats.coinsEarned = 500; }],
    brew25: [state => { state.stats.brewed = 24; }, state => { state.stats.brewed = 25; }],
    rebirth: [state => { state.stats.prestiges = 0; }, state => { state.stats.prestiges = 1; }],
    tap50: [state => { state.stats.taps = 49; }, state => { state.stats.taps = 50; }],
    levelFour: [state => { state.level = 3; }, state => { state.level = 4; }],
    upgradeThree: [state => { state.upgrades.garden = 2; }, state => { state.upgrades.garden = 3; }],
  };
  assert.equal(Object.keys(thresholds).length, game.ACHIEVEMENTS.length);
  for (const achievement of game.ACHIEVEMENTS) {
    const state = game.defaultState(NOW);
    for (const other of game.ACHIEVEMENTS) if (other.id !== achievement.id) state.achievements[other.id] = NOW - 1;
    const [before, reach] = thresholds[achievement.id];
    before(state);
    assert.deepEqual(game.evaluateAchievements(state, NOW), [], `${achievement.id} unlocked before its threshold`);
    reach(state);
    assert.deepEqual(game.evaluateAchievements(state, NOW).map(item => item.id), [achievement.id]);
    assert.equal(state.achievements[achievement.id], NOW);
    assert.deepEqual(game.evaluateAchievements(state, NOW + 1), [], `${achievement.id} announced twice`);
    assert.equal(state.achievements[achievement.id], NOW, `${achievement.id} timestamp changed after re-evaluation`);
  }
});

test("triggering actions evaluate harvest, upgrade, rolling reward, and level-up achievements immediately", () => {
  const pinOtherAchievements = (state, id) => {
    for (const achievement of game.ACHIEVEMENTS) if (achievement.id !== id) state.achievements[achievement.id] = NOW - 1;
  };

  const harvest = game.defaultState(NOW);
  harvest.stats.taps = 49;
  pinOtherAchievements(harvest, "tap50");
  assert.deepEqual(game.chargedGather(harvest, NOW, () => 0).achievements.map(item => item.id), ["tap50"]);
  assert.equal(harvest.achievements.tap50, NOW);

  const upgrade = game.defaultState(NOW);
  upgrade.coins = 1000; upgrade.upgrades.garden = 2;
  pinOtherAchievements(upgrade, "upgradeThree");
  assert.deepEqual(game.buyUpgrade(upgrade, "garden", NOW).achievements.map(item => item.id), ["upgradeThree"]);
  assert.equal(upgrade.achievements.upgradeThree, NOW);

  const rolling = game.defaultState(NOW);
  rolling.stats.coinsEarned = 490; rolling.weekly.progress = 2;
  pinOtherAchievements(rolling, "coin500");
  assert.deepEqual(game.claimWeeklyStep(rolling, NOW).achievements.map(item => item.id), ["coin500"]);
  assert.equal(rolling.achievements.coin500, NOW);

  const levelUp = game.defaultState(NOW);
  levelUp.stats.coinsEarned = 480; levelUp.xp = game.xpNeeded(1) - 1;
  pinOtherAchievements(levelUp, "coin500");
  assert.deepEqual(game.addXp(levelUp, 1, NOW).achievements.map(item => item.id), ["coin500"]);
  assert.equal(levelUp.achievements.coin500, NOW);
});

test("gameplay coin grants update lifetime coins exactly once and exclude starting, spending, and bundle currency", () => {
  const assertGrant = (state, action, expected) => {
    const before = { coins: state.coins, earned: state.stats.coinsEarned };
    const result = action();
    assert.equal(state.coins - before.coins, expected);
    assert.equal(state.stats.coinsEarned - before.earned, expected);
    return result;
  };

  const order = game.defaultState(NOW);
  order.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 0 }]; order.nextOrderId = 2; order.potions.tonic = 1;
  assert.equal(assertGrant(order, () => game.fulfillOrder(order, 1, NOW, () => 0).reward, 20), 20);

  const favor = game.defaultState(NOW);
  favor.customers["customer-0"] = { deliveries: 2, hearts: 0 };
  favor.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 0 }]; favor.nextOrderId = 2; favor.potions.tonic = 1;
  const favorResult = game.fulfillOrder(favor, 1, NOW, () => 0);
  assert.equal(favorResult.customerBonus, game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.equal(favorResult.reward, 20 + game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.equal(favor.coins, 30 + favorResult.reward);
  assert.equal(favor.stats.coinsEarned, favorResult.reward);

  const level = game.defaultState(NOW);
  level.xp = game.xpNeeded(1) - 1;
  assertGrant(level, () => game.addXp(level, 1, NOW), 20);

  const daily = game.defaultState(NOW);
  daily.daily.orders = 5;
  assertGrant(daily, () => game.claimDaily(daily, NOW), 50);

  const rolling = game.defaultState(NOW);
  rolling.weekly.progress = 2;
  assertGrant(rolling, () => game.claimWeeklyStep(rolling, NOW), 10);

  const journal = game.defaultState(NOW);
  journal.discovery.brewed.tonic = 1;
  assertGrant(journal, () => game.claimJournalReward(journal, "recipe", "tonic", NOW), game.JOURNAL_REWARDS.recipe);
  journal.achievements.firstBrew = NOW;
  assertGrant(journal, () => game.claimJournalReward(journal, "achievement", "firstBrew", NOW), game.JOURNAL_REWARDS.achievement);

  const excluded = game.defaultState(NOW);
  assert.deepEqual({ coins: excluded.coins, earned: excluded.stats.coinsEarned }, { coins: 30, earned: 0 });
  const earnedBeforeSpend = excluded.stats.coinsEarned;
  excluded.coins = 100;
  assert.ok(game.buyUpgrade(excluded, "garden", NOW));
  assert.equal(excluded.coins, 30);
  assert.equal(excluded.stats.coinsEarned, earnedBeforeSpend);
  excluded.starterClaimed = true; excluded.coins += 100;
  assert.equal(excluded.stats.coinsEarned, earnedBeforeSpend, "simulated apprentice-bundle currency remains excluded");
});

test("existing lifetime coin totals round-trip unchanged before adopting prospective grants", () => {
  const existing = game.defaultState(NOW);
  existing.stats.coinsEarned = 451;
  existing.daily.orders = 5;
  const loaded = game.parseSave(JSON.stringify(existing), NOW).state;
  assert.equal(loaded.version, game.SAVE_VERSION);
  assert.equal(loaded.stats.coinsEarned, 451);
  assert.ok(game.claimDaily(loaded, NOW));
  assert.equal(loaded.stats.coinsEarned, 501);
});

test("hostile save numerics normalize to finite bounded gameplay values", () => {
  const state = game.defaultState(NOW);
  state.coins = "499.9";
  state.level = Number.MAX_SAFE_INTEGER;
  state.xp = Number.MAX_VALUE;
  state.stardust = "Infinity";
  state.ingredients = { herb: "12.8", mushroom: -4, crystal: "1e9999", mist: Number.MAX_SAFE_INTEGER, ember: "NaN", mint: Number.MAX_VALUE, lavender: "-0.5" };
  state.potions = Object.fromEntries(game.RECIPES.map((recipe, index) => [recipe.id, ["4.9", -1, "Infinity", Number.MAX_VALUE][index % 4]]));
  state.mastery = Object.fromEntries(game.RECIPES.map((recipe, index) => [recipe.id, [Number.MAX_SAFE_INTEGER, "1e9999", -3, "2.7"][index % 4]]));
  state.customers["customer-0"] = { deliveries: Number.MAX_VALUE, hearts: Number.MAX_SAFE_INTEGER };
  state.daily = { date: game.todayKey(NOW), orders: "1e9999", claimed: false };
  state.weekly = { cycle: Number.MAX_SAFE_INTEGER, progress: Number.MAX_VALUE, claimedSteps: "1e9999" };
  state.gather = { charges: "2.9", lastRechargeAt: "Infinity", targetId: "mint" };
  state.stats = { taps: Number.MAX_VALUE, brewed: "1e9999", orders: -8, coinsEarned: Number.MAX_SAFE_INTEGER, prestiges: "3.7", legacyCounter: "11.4" };
  state.orders = [{ id: Number.MAX_SAFE_INTEGER, recipeId: "tonic", quantity: "1.8", reward: Number.MAX_VALUE, xp: Number.MAX_SAFE_INTEGER }];
  state.brew = { recipeId: "aurora", startedAt: "Infinity", endsAt: Number.MAX_VALUE, durationMs: "1e9999", assistUses: Number.MAX_SAFE_INTEGER };

  const loaded = game.normalizeState(state, NOW);
  assert.equal(loaded.coins, 499, "smaller valid numeric strings retain their value");
  assert.equal(loaded.level, game.SAVE_LIMITS.level);
  assert.ok(loaded.xp < game.xpNeeded(loaded.level));
  assert.equal(loaded.stardust, 0);
  assert.equal(loaded.ingredients.herb, 12);
  assert.equal(loaded.ingredients.mushroom, 0);
  assert.equal(loaded.potions.tonic, 4);
  assert.equal(loaded.mastery.aurora, 2);
  assert.equal(loaded.customers["customer-0"].deliveries, game.SAVE_LIMITS.counter);
  assert.equal(loaded.daily.orders, 0);
  assert.equal(loaded.gather.charges, 2);
  assert.equal(loaded.gather.lastRechargeAt, NOW);
  assert.equal(loaded.stats.legacyCounter, 11);
  assert.equal(loaded.stats.coinsEarned, game.SAVE_LIMITS.currency);
  const tonicOrder = loaded.orders.find(order => order.recipeId === "tonic" && !game.isAfterStarsOrder(order));
  assert.equal(tonicOrder.id, game.SAVE_LIMITS.counter);
  assert.equal(tonicOrder.reward, game.SAVE_LIMITS.currency);
  assert.equal(loaded.brew.assistUses, game.FINISH_BREW_CONFIG.maxUsesPerBrew);
  for (const value of [loaded.coins, loaded.xp, loaded.stardust, ...Object.values(loaded.ingredients), ...Object.values(loaded.potions), ...Object.values(loaded.mastery), loaded.daily.orders, loaded.gather.charges, ...Object.values(loaded.stats), tonicOrder.id, tonicOrder.reward, tonicOrder.xp, loaded.brew.startedAt, loaded.brew.endsAt, loaded.brew.durationMs, loaded.brew.assistUses]) {
    assert.ok(Number.isSafeInteger(value) && value >= 0, `unsafe normalized value: ${value}`);
  }
});

test("save XP normalization preserves reasonable overflow and caps extreme values", () => {
  const reasonable = game.defaultState(NOW);
  reasonable.xp = game.xpNeeded(1) + game.xpNeeded(2) + 7;
  assert.deepEqual(game.normalizeState(reasonable, NOW).level, 3);
  assert.equal(game.normalizeState(reasonable, NOW).xp, 7);

  const extreme = game.defaultState(NOW);
  extreme.xp = Number.MAX_SAFE_INTEGER;
  const loaded = game.normalizeState(extreme, NOW);
  assert.equal(loaded.level, game.SAVE_LIMITS.level);
  assert.ok(loaded.xp >= 0 && loaded.xp < game.xpNeeded(loaded.level));
});

test("maximum-level saves remain capped through collecting, delivering, and direct XP", () => {
  const saved = game.defaultState(NOW);
  saved.xp = Number.MAX_SAFE_INTEGER;
  const state = game.normalizeState(saved, NOW);
  const maxXp = game.xpNeeded(game.SAVE_LIMITS.level) - 1;
  assert.equal(state.level, game.SAVE_LIMITS.level);
  assert.equal(state.xp, maxXp);

  const coinsBeforeCollect = state.coins;
  assert.equal(game.startBrew(state, "tonic", NOW), true);
  const collected = game.collectBrew(state, NOW + 30000);
  assert.deepEqual(collected.levels, []);
  assert.equal(state.level, game.SAVE_LIMITS.level);
  assert.equal(state.xp, maxXp);
  assert.equal(state.coins, coinsBeforeCollect);

  state.orders = [{ id: 17, recipeId: "tonic", quantity: 1, reward: 20, xp: 9999 }];
  state.nextOrderId = 18;
  const coinsBeforeDelivery = state.coins;
  const delivered = game.fulfillOrder(state, 17, NOW + 30000, () => 0);
  assert.ok(delivered);
  assert.deepEqual(delivered.levels, []);
  assert.equal(state.level, game.SAVE_LIMITS.level);
  assert.equal(state.xp, maxXp);
  assert.equal(state.coins, coinsBeforeDelivery + delivered.reward);

  const coinsBeforeDirectXp = state.coins;
  assert.deepEqual(game.addXp(state, Number.MAX_SAFE_INTEGER), []);
  assert.equal(state.level, game.SAVE_LIMITS.level);
  assert.equal(state.xp, maxXp);
  assert.equal(state.coins, coinsBeforeDirectXp);
});

test("order IDs recover uniquely and continue without reuse across reloads", () => {
  const hostile = game.defaultState(NOW);
  hostile.orders = [
    { id: Number.MAX_SAFE_INTEGER, recipeId: "tonic", quantity: 1, reward: 20, xp: 1 },
    { id: Number.MAX_SAFE_INTEGER, recipeId: "tonic", quantity: 1, reward: 21, xp: 1 },
    { id: Number.MAX_SAFE_INTEGER, recipeId: "tonic", quantity: 1, reward: 22, xp: 1 },
  ];
  hostile.nextOrderId = Number.MAX_SAFE_INTEGER;
  const loaded = game.normalizeState(hostile, NOW);
  const initialIds = new Set(loaded.orders.map(order => order.id));
  assert.equal(initialIds.size, loaded.orders.length);
  assert.ok([...initialIds].every(id => id >= 1 && id <= game.SAVE_LIMITS.counter));
  assert.ok(!initialIds.has(loaded.nextOrderId));

  const fulfilledId = loaded.orders[0].id;
  loaded.potions.tonic = 1;
  assert.ok(game.fulfillOrder(loaded, fulfilledId, NOW, () => 0));
  const replacement = loaded.orders.find(order => !initialIds.has(order.id));
  assert.ok(replacement, "fulfillment generates a genuinely new safe order ID");
  assert.notEqual(replacement.id, fulfilledId);
  assert.equal(new Set(loaded.orders.map(order => order.id)).size, loaded.orders.length);
  assert.ok(!loaded.orders.some(order => order.id === loaded.nextOrderId));

  const reloaded = game.normalizeState(loaded, NOW);
  assert.equal(new Set(reloaded.orders.map(order => order.id)).size, reloaded.orders.length);
  assert.deepEqual(new Set(reloaded.orders.map(order => order.id)), new Set(loaded.orders.map(order => order.id)));
  assert.ok(!reloaded.orders.some(order => order.id === reloaded.nextOrderId));
});

test("coins earned uses the currency cap while action counters retain their counter cap", () => {
  const state = game.defaultState(NOW);
  state.stats = {
    taps: Number.MAX_SAFE_INTEGER,
    brewed: Number.MAX_SAFE_INTEGER,
    orders: Number.MAX_SAFE_INTEGER,
    coinsEarned: game.SAVE_LIMITS.counter + 12345,
    prestiges: Number.MAX_SAFE_INTEGER,
  };
  const loaded = game.normalizeState(state, NOW);
  assert.equal(loaded.stats.coinsEarned, game.SAVE_LIMITS.counter + 12345);
  assert.equal(loaded.stats.taps, game.SAVE_LIMITS.counter);
  assert.equal(loaded.stats.brewed, game.SAVE_LIMITS.counter);
  assert.equal(loaded.stats.orders, game.SAVE_LIMITS.counter);
  assert.equal(loaded.stats.prestiges, game.SAVE_LIMITS.counter);
});

test("save normalization clears only a known brew locked above the normalized level", () => {
  const state = game.defaultState(NOW - 1000);
  state.ingredients = { herb: 21, mushroom: 13, crystal: 8, mist: 4, ember: 2, mint: 0, lavender: 0 };
  state.potions.tonic = 3;
  state.mastery.tonic = 2;
  state.stats = { taps: 9, brewed: 2, orders: 1, coinsEarned: 99, prestiges: 0 };
  state.brew = { recipeId: "clarity", startedAt: NOW - 1000, endsAt: NOW + 65000, durationMs: 66000, assistUses: 1 };

  const loaded = game.normalizeState(state, NOW);
  assert.equal(loaded.level, 1);
  assert.equal(loaded.brew, null);
  assert.deepEqual(loaded.ingredients, state.ingredients);
  assert.equal(loaded.potions.tonic, 3);
  assert.equal(loaded.mastery.tonic, 2);
  assert.deepEqual(loaded.stats, state.stats);
});

test("an unlocked completed brew round-trips with its saved timing and assist use", () => {
  const state = game.defaultState(NOW - 100000);
  state.level = 2;
  state.brew = { recipeId: "clarity", startedAt: NOW - 100000, endsAt: NOW - 34000, durationMs: 66000, assistUses: 1 };
  const loaded = game.normalizeState(state, NOW);
  assert.deepEqual(loaded.brew, state.brew);
  assert.ok(game.collectBrew(loaded, NOW));
  assert.equal(loaded.potions.clarity, 1);
});

test("ingredient additions stop exactly at the storage cap", () => {
  const state = game.defaultState(NOW);
  state.ingredients = { herb: 59, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  assert.equal(game.addRandomIngredients(state, 50, () => 0), 1);
  assert.equal(game.totalIngredients(state), 60);
  const corrupt = { ...state, ingredients: { herb: 1000, mushroom: 1000, crystal: 1000, mist: 1000, ember: 1000, mint: 1000, lavender: 1000 } };
  assert.equal(game.totalIngredients(game.normalizeState(corrupt, NOW)), 60);
});

test("daily reward is idempotent", () => {
  const state = game.defaultState(NOW); state.daily.orders = 5;
  assert.ok(game.claimDaily(state, NOW));
  assert.equal(game.claimDaily(state, NOW), false);
  assert.equal(state.coins, 80); assert.equal(state.stardust, 1); assert.equal(state.stats.coinsEarned, 50);
  assert.equal(state.commissions.invitations, 1);
  state.daily = { date: game.todayKey(NOW + 86400000), orders: 5, claimed: false };
  state.commissions.invitations = 12;
  assert.ok(game.claimDaily(state, NOW + 86400000));
  assert.equal(state.commissions.invitations, 12, "daily invitations cannot exceed unfinished requests");
  state.daily = { date: game.todayKey(NOW + 2 * 86400000), orders: 5, claimed: false };
  state.commissions.completedIds = game.SIGNATURE_COMMISSIONS.map(item => item.id);
  assert.ok(game.claimDaily(state, NOW + 2 * 86400000));
  assert.equal(state.commissions.invitations, 0, "finishing the collection grants currencies but no invitation");
  assert.equal(state.coins, 180); assert.equal(state.stardust, 3);
});

test("Stardust uses the approved bounded order multiplier without changing sources or saves", () => {
  const state = game.defaultState(NOW);
  const values = new Map([[0, 1], [1, 1.1], [2, 1.2], [3, 1.3], [4, 1.4], [5, 1.5], [6, 1.5 + 1 / 21], [10, 1.7], [40, 1.5 + 35 / 55], [180, 1.5 + 175 / 195], [100000, 1.5 + 99995 / 100015]]);
  let previous = 0;
  for (let stardust = 0; stardust <= game.SAVE_LIMITS.stardust; stardust += 1) {
    state.stardust = stardust;
    const multiplier = game.coinMultiplier(state, NOW);
    assert.ok(multiplier >= previous && multiplier < 2.5, `Stardust ${stardust} must remain monotonic and below 2.5x`);
    previous = multiplier;
  }
  for (const [stardust, expected] of values) {
    state.stardust = stardust;
    assert.equal(game.coinMultiplier(state, NOW), expected, `Stardust ${stardust} has its exact approved multiplier`);
  }
  state.stardust = 40; state.boostUntil = NOW + 1;
  assert.equal(game.coinMultiplier(state, NOW), values.get(40) * 2, "temporary boost remains a separate 2x multiplier");
  state.boostUntil = 0; state.upgrades.ledger = 2; state.mastery.tonic = game.MASTERY_CONFIG.thresholds.at(-1);
  assert.equal(game.orderMultiplier(state, NOW, "tonic"), values.get(40) * (1 + 2 * .12 + 3 * game.MASTERY_CONFIG.coinBonusPerRank), "Ledger and recipe mastery retain their existing order stacking");
  const daily = game.defaultState(NOW); daily.daily.orders = 5;
  assert.ok(game.claimDaily(daily, NOW)); assert.deepEqual({ coins: daily.coins, stardust: daily.stardust }, { coins: 80, stardust: 1 }, "Daily Goal source remains 50 coins plus one Stardust");
  const rebirth = game.defaultState(NOW); rebirth.level = game.PRESTIGE_CONFIG.unlockLevel; rebirth.stardust = 180;
  assert.equal(game.performPrestige(rebirth, undefined, NOW).stardust, 183, "rebirth preserves carried Stardust and grants its existing reward");
  for (const stardust of [40, 180, 100000]) {
    const saved = game.defaultState(NOW); saved.stardust = stardust;
    assert.equal(game.normalizeState(JSON.parse(JSON.stringify(saved)), NOW).stardust, stardust, `save round-trip preserves ${stardust} Stardust`);
  }
});

test("daily rollover resets before a post-midnight delivery", () => {
  const yesterday = NOW;
  const midnight = NOW + 86400000;
  const state = game.defaultState(yesterday);
  state.daily.orders = 4;
  state.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
  state.potions.tonic = 1;
  assert.ok(game.fulfillOrder(state, 1, midnight, () => 0));
  assert.deepEqual(state.daily, { date: game.todayKey(midnight), orders: 1, claimed: false });
});

test("stale daily completion cannot be claimed after rollover", () => {
  const state = game.defaultState(NOW);
  state.daily.orders = 5;
  const coins = state.coins, stardust = state.stardust, invitations = state.commissions.invitations;
  assert.equal(game.claimDaily(state, NOW + 86400000), false);
  assert.deepEqual(state.daily, { date: game.todayKey(NOW + 86400000), orders: 0, claimed: false });
  assert.equal(state.coins, coins); assert.equal(state.stardust, stardust); assert.equal(state.commissions.invitations, invitations);
});

test("same-day daily delivery and claim behavior is unchanged", () => {
  const state = game.defaultState(NOW);
  state.daily.orders = 4;
  state.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
  state.potions.tonic = 1;
  assert.ok(game.fulfillOrder(state, 1, NOW, () => 0));
  assert.equal(state.daily.orders, 5);
  assert.ok(game.claimDaily(state, NOW));
  assert.equal(state.daily.claimed, true);
});

test("foreground rollover refreshes and schedules once, then stays quiet", () => {
  const state = game.defaultState(NOW);
  let renders = 0, saveSchedules = 0;
  const refresh = () => { renders += 1; saveSchedules += 1; };
  assert.equal(game.foregroundDailyTransition(state, NOW + 86400000, true, refresh), true);
  assert.equal(game.foregroundDailyTransition(state, NOW + 86400000, true, refresh), false);
  assert.equal(game.foregroundDailyTransition(state, NOW - 86400000, true, refresh), false);
  assert.equal(renders, 1);
  assert.equal(saveSchedules, 1);
});

test("stale claim orchestration rolls over before checking eligibility", () => {
  const state = game.defaultState(NOW);
  state.daily.orders = 5;
  const before = { coins: state.coins, stardust: state.stardust, invitations: state.commissions.invitations };
  let renders = 0, saveSchedules = 0;
  const refresh = () => { renders += 1; saveSchedules += 1; };
  const claimFromBrowser = now => {
    if (game.foregroundDailyTransition(state, now, true, refresh)) return false;
    return game.claimDaily(state, now);
  };
  assert.equal(claimFromBrowser(NOW + 86400000), false);
  assert.deepEqual(state.daily, { date: game.todayKey(NOW + 86400000), orders: 0, claimed: false });
  assert.deepEqual({ coins: state.coins, stardust: state.stardust, invitations: state.commissions.invitations }, before);
  assert.equal(renders, 1);
  assert.equal(saveSchedules, 1);
});

test("foreground transition seam is the tick boundary", () => {
  const state = game.defaultState(NOW);
  const tickAt = now => game.foregroundDailyTransition(state, now, true, () => {});
  assert.equal(tickAt(NOW + 86400000), true);
  assert.equal(state.daily.date, game.todayKey(NOW + 86400000));
  assert.equal(tickAt(NOW + 86400000 + 1000), false);
  assert.equal(tickAt(NOW - 86400000), false);
});

test("recipe mastery has bounded milestones and raises only matching order value", () => {
  const state = game.defaultState(NOW);
  state.mastery.tonic = 3;
  assert.deepEqual(game.recipeMasteryProgress(state, "tonic"), { count: 3, rank: 1, next: 8 });
  assert.equal(game.orderMultiplier(state, NOW, "tonic"), 1.04);
  assert.equal(game.orderMultiplier(state, NOW, "clarity"), 1);
  state.mastery.tonic = 999;
  assert.deepEqual(game.recipeMasteryProgress(state, "tonic"), { count: 999, rank: 3, next: null });
});

test("recurring customers gain trust and grant a deterministic non-blocking favor", () => {
  const state = game.defaultState(NOW);
  state.customers["customer-0"] = { deliveries: 2, hearts: 0 };
  state.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
  state.nextOrderId = 2; state.potions.tonic = 1;
  const result = game.fulfillOrder(state, 1, NOW, () => 0);
  assert.equal(result.customerBonus, game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.equal(result.reward, 20 + game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.deepEqual(state.customers["customer-0"], { deliveries: 3, hearts: 1 });
  assert.deepEqual(result.narrative, EXPECTED_DELIVERY_NARRATIVES[0]);
  assert.equal(game.journalClaimableCounts(state).story, 1);
  assert.equal(game.customerStoryStatus(state, "customer-0", 0).read, false);
});

test("all relationship arcs trigger exactly once across every supported fulfillment path", () => {
  const newPilots = EXPECTED_DELIVERY_NARRATIVES;
  const deliver = (pilot, deliveries = pilot.toHearts * game.CUSTOMER_CONFIG.deliveriesPerHeart - 1, hearts = pilot.fromHearts, extra = {}) => {
    const state = game.defaultState(NOW);
    state.customers[pilot.customerId] = { deliveries, hearts };
    state.orders = [{ id: 1, customerId: pilot.customerId, customer: game.CUSTOMERS[Number(pilot.customerId.slice(9))][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
    state.nextOrderId = 2;
    state.potions.tonic = extra.ready === false ? 0 : 1;
    return { state, result: game.fulfillOrder(state, 1, NOW, () => 0) };
  };

  for (const pilot of newPilots) {
    const boundaryDeliveries = pilot.toHearts * game.CUSTOMER_CONFIG.deliveriesPerHeart - 1;
    assert.equal(deliver(pilot, boundaryDeliveries - 1, pilot.fromHearts).result.narrative, null, `${pilot.kicker} must not trigger before its boundary`);
    const ordinary = deliver(pilot);
    assert.deepEqual(ordinary.result.narrative, pilot, `${pilot.kicker} must use its exact ordinary-order payload`);
    assert.equal(ordinary.result.customerBonus, game.CUSTOMER_CONFIG.heartBonusCoins);
    assert.equal(ordinary.result.reward, 20 + game.CUSTOMER_CONFIG.heartBonusCoins);
    assert.equal(ordinary.state.coins, game.defaultState(NOW).coins + ordinary.result.reward, "the narrative adds no extra coins");
    assert.deepEqual(ordinary.state.customers[pilot.customerId], { deliveries: boundaryDeliveries + 1, hearts: pilot.toHearts });
    assert.equal(Object.hasOwn(ordinary.state, "narrative"), false, "the narrative is not saved state");
    assert.deepEqual(Object.keys(ordinary.state).sort(), Object.keys(game.defaultState(NOW)).sort(), "the narrative adds no saved field");
    assert.equal(game.customerStoryStatus(ordinary.state, pilot.customerId, pilot.toHearts - 1).read, false, "the matching Journal summary remains unread");
    assert.equal(game.journalClaimableCounts(ordinary.state).story, pilot.toHearts, "existing Journal summaries remain claimable by heart count");
    const coinsBeforeClaim = ordinary.state.coins;
    assert.deepEqual(game.claimJournalReward(ordinary.state, "story", `${pilot.customerId}:${pilot.toHearts}`, NOW), { kind: "story", id: `${pilot.customerId}:${pilot.toHearts}`, reward: game.JOURNAL_REWARDS.story });
    assert.equal(ordinary.state.coins, coinsBeforeClaim + game.JOURNAL_REWARDS.story, "the existing Journal reward stays exact");

    const repeatedSnapshot = JSON.stringify(ordinary.state);
    assert.equal(game.fulfillOrder(ordinary.state, 1, NOW, () => 0), null, `${pilot.kicker} cannot repeat from its consumed order`);
    assert.equal(JSON.stringify(ordinary.state), repeatedSnapshot, "a repeated delivery cannot mutate state");
    assert.equal(deliver(pilot, boundaryDeliveries, pilot.toHearts).result.narrative, null, `${pilot.kicker} cannot replay after the heart is earned`);
    assert.equal(deliver(pilot, boundaryDeliveries, pilot.fromHearts, { ready: false }).result, null, `${pilot.kicker} cannot trigger on a failed delivery`);

    const offBoard = game.defaultState(NOW);
    offBoard.customers[pilot.customerId] = { deliveries: boundaryDeliveries, hearts: pilot.fromHearts };
    offBoard.potions.tonic = 1;
    assert.equal(game.fulfillOrder(offBoard, 999, NOW, () => 0), null, `${pilot.kicker} cannot trigger from an off-board order`);

    const reloaded = game.parseSave(JSON.stringify(ordinary.state), NOW + 1).state;
    assert.equal(Object.hasOwn(reloaded, "narrative"), false, "reload and startup reconciliation cannot restore a transient narrative");
    reloaded.orders = [{ id: 999, customerId: pilot.customerId, customer: game.CUSTOMERS[Number(pilot.customerId.slice(9))][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
    reloaded.potions.tonic = 1;
    assert.equal(game.fulfillOrder(reloaded, 999, NOW + 1, () => 0).narrative, null, `${pilot.kicker} cannot replay after reload`);

    const rebirthState = game.defaultState(NOW);
    rebirthState.level = game.PRESTIGE_CONFIG.unlockLevel;
    rebirthState.customers[pilot.customerId] = { deliveries: boundaryDeliveries, hearts: pilot.fromHearts };
    const reborn = game.performPrestige(rebirthState, 3, NOW);
    assert.deepEqual(reborn.customers[pilot.customerId], { deliveries: boundaryDeliveries, hearts: pilot.fromHearts });
    assert.equal(Object.hasOwn(reborn, "narrative"), false, "rebirth alone cannot produce a fulfillment payload");
    reborn.orders = [{ id: 1, customerId: pilot.customerId, customer: game.CUSTOMERS[Number(pilot.customerId.slice(9))][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
    reborn.nextOrderId = 2;
    reborn.potions.tonic = 1;
    assert.deepEqual(game.fulfillOrder(reborn, 1, NOW, () => 0).narrative, pilot, `${pilot.kicker} remains eligible on a genuine post-rebirth boundary`);
  }

  for (const pilot of newPilots) {
    const commission = game.SIGNATURE_COMMISSIONS.find(entry => entry.customerId === pilot.customerId);
    const commissionState = game.defaultState(NOW);
    commissionState.level = game.recipeById(commission.recipeId).unlock;
    commissionState.commissions.invitations = 1;
    const commissionOrder = game.selectSignatureCommission(commissionState, commission.id);
    commissionState.customers[pilot.customerId] = { deliveries: pilot.toHearts * game.CUSTOMER_CONFIG.deliveriesPerHeart - 1, hearts: pilot.fromHearts };
    commissionState.potions[commission.recipeId] = 1;
    const commissionResult = game.fulfillOrder(commissionState, commissionOrder.id, NOW, () => 0);
    assert.equal(commissionResult.commission.id, commission.id, "Special Request completion must coexist with the narrative");
    assert.deepEqual(commissionResult.narrative, pilot, `${pilot.kicker} must work through its canonical Special Request`);
  }

  for (const pilot of newPilots.filter(entry => ["customer-0", "customer-3", "customer-6", "customer-9"].includes(entry.customerId))) {
    const afterStarsState = game.defaultState(NOW);
    const step = game.AFTER_STARS_STEPS.findIndex(entry => entry.customerId === pilot.customerId);
    const authored = game.AFTER_STARS_STEPS[step];
    afterStarsState.stats.prestiges = 1;
    afterStarsState.level = game.recipeById(authored.recipeId).unlock;
    afterStarsState.afterStars.step = step;
    game.ensureOrders(afterStarsState, () => 0);
    const afterStarsOrder = afterStarsState.orders.find(game.isAfterStarsOrder);
    afterStarsState.customers[pilot.customerId] = { deliveries: pilot.toHearts * game.CUSTOMER_CONFIG.deliveriesPerHeart - 1, hearts: pilot.fromHearts };
    afterStarsState.potions[authored.recipeId] = 1;
    const afterStarsResult = game.fulfillOrder(afterStarsState, afterStarsOrder.id, NOW, () => 0);
    assert.deepEqual(afterStarsResult.afterStars, { step, title: authored.title, complete: step === game.AFTER_STARS_STEPS.length - 1 });
    assert.deepEqual(afterStarsResult.narrative, pilot, `${pilot.kicker} must work through the eligible canonical After the Stars order`);
  }

  const wrongVillager = game.defaultState(NOW);
  wrongVillager.customers["customer-10"] = { deliveries: 2, hearts: 0 };
  wrongVillager.orders = [{ id: 1, customerId: "customer-11", customer: game.CUSTOMERS[11][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
  wrongVillager.potions.tonic = 1;
  assert.equal(game.fulfillOrder(wrongVillager, 1, NOW, () => 0).narrative, null, "Sol's boundary cannot produce a Bea payload");

  const forged = game.defaultState(NOW);
  forged.customers["customer-3"] = { deliveries: 2, hearts: 0 };
  forged.orders = [{ id: 1, customerId: "customer-3", customer: game.CUSTOMERS[3][0], recipeId: "clarity", quantity: 1, reward: 999, xp: 1, afterStarsStep: 0 }];
  forged.potions.tonic = 1;
  const forgedReload = game.parseSave(JSON.stringify(forged), NOW).state;
  assert.equal(forgedReload.orders.length, 0, "a forged reserved order is discarded before it can trigger Pip's narrative");
});

test("Fern's narrative pilot is exact, transition-only, and keeps every delivery path intact", () => {
  const fernPilot = {
    customerId: "customer-6", fromHearts: 0, toHearts: 1,
    kicker: "FERN · FIRST TRUST HEART", title: "The seed that would not wake",
    body: "Fern sets a blue clay pot on the counter. Its soil is dark and carefully tended, but bare. \"I've tried sun, shade, songs, and apologizing to it,\" she says. \"I keep telling everyone it just needs more time, but I'm starting to think I'm wrong.\" She asks if she can leave the pot beside your warm cauldron for a few days, and you clear it a place.",
    footer: "1 of 3 trust hearts · The blue pot stays in your workshop",
  };
  const fernSecondPilot = {
    customerId: "customer-6", fromHearts: 1, toHearts: 2,
    kicker: "FERN · SECOND TRUST HEART", title: "What help looks like",
    body: "A few days later, Fern returns to check the blue pot and finds a tiny green shoot breaking through the soil. It has grown toward the cauldron and is beginning to lean. Fern reaches to move it closer to the warmth, but you point to the morning light at the nearby window. Together you move the pot where it can have both, then brace the stem with a folded order slip. \"I thought being patient meant leaving it alone,\" Fern says. \"But sometimes patience means watching closely and helping at the right time.\"",
    footer: "2 of 3 trust hearts · The seedling moves to the workshop window",
  };
  const fernThirdPilot = {
    customerId: "customer-6", fromHearts: 2, toHearts: 3,
    kicker: "FERN · THIRD TRUST HEART", title: "A place by the window",
    body: "Some time later, Fern visits the workshop again and takes one look at the blue pot. A small violet flower has opened above the leaves. \"It bloomed!\" she says, then laughs when you point to the folded order slip still supporting the stem. Fern brushes a little soil from the sill while you turn the flower toward the light. She adds a painted label: PATIENCE. \"It did most of the work,\" she says. \"But I think it liked having both of us around.\" When Fern reaches to take the pot home, you tap its place by the window. She smiles and leaves it there.",
    footer: "3 of 3 trust hearts · Patience stays by the workshop window",
  };
  assert.equal(game.DELIVERY_NARRATIVE_PILOTS.length, 36);
  assert.deepEqual(game.DELIVERY_NARRATIVE_PILOTS.map(pilot => [pilot.customerId, pilot.fromHearts, pilot.toHearts]), EXPECTED_DELIVERY_NARRATIVES.map(pilot => [pilot.customerId, pilot.fromHearts, pilot.toHearts]));
  assert.deepEqual(game.DELIVERY_NARRATIVE_PILOTS[9], fernPilot, "Fern's first-heart entry remains byte-for-byte in catalog order");
  assert.deepEqual(game.DELIVERY_NARRATIVE_PILOTS[10], fernSecondPilot, "Fern's second-heart entry is exact and follows the first-heart entry");
  assert.deepEqual(game.DELIVERY_NARRATIVE_PILOTS[11], fernThirdPilot, "Fern's third-heart entry is exact and follows the second-heart entry");
  assert.equal(Object.isFrozen(game.DELIVERY_NARRATIVE_PILOTS[9]), true);
  assert.equal(Object.isFrozen(game.DELIVERY_NARRATIVE_PILOTS[10]), true);
  assert.equal(Object.isFrozen(game.DELIVERY_NARRATIVE_PILOTS[11]), true);

  const deliver = (customerId, deliveries, hearts, { recipeId = "bloom", ready = true } = {}) => {
    const state = game.defaultState(NOW);
    state.customers[customerId] = { deliveries, hearts };
    state.orders = [{ id: 1, customerId, customer: game.CUSTOMERS[Number(customerId.slice(9))][0], recipeId, quantity: 1, reward: 20, xp: 1 }];
    state.nextOrderId = 2;
    state.potions[recipeId] = ready ? 1 : 0;
    return { state, result: game.fulfillOrder(state, 1, NOW, () => 0) };
  };

  assert.equal(deliver("customer-6", 0, 0).result.narrative, null, "zero-heart delivery is early");
  const ordinary = deliver("customer-6", 2, 0);
  assert.deepEqual(ordinary.result.narrative, fernPilot, "the exact Fern payload appears at zero-to-one");
  assert.equal(ordinary.result.customerBonus, game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.equal(ordinary.result.reward, 20 + game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.deepEqual(ordinary.state.customers["customer-6"], { deliveries: 3, hearts: 1 });
  assert.equal(Object.hasOwn(ordinary.state, "narrative"), false, "the payoff is not saved state");
  assert.equal(game.journalClaimableCounts(ordinary.state).story, 1);
  assert.equal(game.customerStoryStatus(ordinary.state, "customer-6", 0).read, false);
  const ordinaryKeys = Object.keys(ordinary.state).sort();
  const freshKeys = Object.keys(game.defaultState(NOW)).sort();
  assert.deepEqual(ordinaryKeys, freshKeys, "the payoff adds no saved field");
  const coinsBeforeClaim = ordinary.state.coins;
  assert.deepEqual(game.claimJournalReward(ordinary.state, "story", "customer-6:1", NOW), { kind: "story", id: "customer-6:1", reward: game.JOURNAL_REWARDS.story });
  assert.equal(ordinary.state.coins, coinsBeforeClaim + game.JOURNAL_REWARDS.story);
  assert.equal(game.customerStoryStatus(ordinary.state, "customer-6", 0).read, true);

  assert.equal(deliver("customer-6", 3, 1).result.narrative, null, "same-heart delivery is later");
  const secondHeart = deliver("customer-6", 5, 1);
  assert.deepEqual(secondHeart.result.narrative, fernSecondPilot, "the exact Fern payload appears only at one-to-two");
  assert.equal(secondHeart.result.customerBonus, game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.equal(secondHeart.result.reward, 20 + game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.deepEqual(secondHeart.state.customers["customer-6"], { deliveries: 6, hearts: 2 });
  assert.equal(secondHeart.state.coins, game.defaultState(NOW).coins + secondHeart.result.reward, "the inline payoff adds no extra reward");
  assert.equal(game.journalClaimableCounts(secondHeart.state).story, 2, "the second Journal story is unlocked and claimable");
  assert.equal(game.customerStoryStatus(secondHeart.state, "customer-6", 1).read, false, "the second Journal story remains unread");
  assert.deepEqual(game.claimJournalReward(secondHeart.state, "story", "customer-6:2", NOW), { kind: "story", id: "customer-6:2", reward: game.JOURNAL_REWARDS.story });
  assert.equal(game.customerStoryStatus(secondHeart.state, "customer-6", 1).read, true);
  assert.equal(deliver("customer-6", 7, 2).result.narrative, null, "a before-boundary delivery is later");
  const thirdHeart = deliver("customer-6", 8, 2);
  assert.deepEqual(thirdHeart.result.narrative, fernThirdPilot, "the exact Fern payload appears only at two-to-three");
  assert.equal(thirdHeart.result.customerBonus, game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.equal(thirdHeart.result.reward, 20 + game.CUSTOMER_CONFIG.heartBonusCoins);
  assert.deepEqual(thirdHeart.state.customers["customer-6"], { deliveries: 9, hearts: 3 });
  assert.equal(thirdHeart.state.coins, game.defaultState(NOW).coins + thirdHeart.result.reward, "the third-heart inline payoff adds no extra reward");
  assert.equal(game.journalClaimableCounts(thirdHeart.state).story, 3, "the third Journal story is unlocked and claimable");
  assert.equal(game.customerStoryStatus(thirdHeart.state, "customer-6", 2).read, false, "the third Journal story remains unread");
  assert.deepEqual(game.claimJournalReward(thirdHeart.state, "story", "customer-6:3", NOW), { kind: "story", id: "customer-6:3", reward: game.JOURNAL_REWARDS.story });
  assert.equal(game.customerStoryStatus(thirdHeart.state, "customer-6", 2).read, true);
  assert.equal(Object.hasOwn(thirdHeart.state, "narrative"), false, "the third-heart payoff is not saved state");
  assert.deepEqual(Object.keys(thirdHeart.state).sort(), Object.keys(game.defaultState(NOW)).sort(), "the third-heart payoff adds no saved field");
  assert.equal(deliver("customer-6", 9, 3).result.narrative, null, "a maximum-heart delivery cannot replay the payoff");
  assert.equal(deliver("customer-10", 8, 1).result.narrative, null, "a wrong-heart transition cannot produce Fern's payload");
  const failed = deliver("customer-6", 8, 2, { ready: false });
  assert.equal(failed.result, null, "failed delivery has no payload");
  assert.deepEqual(failed.state.customers["customer-6"], { deliveries: 8, hearts: 2 });
  const duplicate = deliver("customer-6", 2, 0);
  const afterFirst = JSON.stringify(duplicate.state);
  assert.equal(game.fulfillOrder(duplicate.state, 1, NOW, () => 0), null, "duplicate delivery cannot replay the pilot");
  assert.deepEqual(duplicate.result.narrative, fernPilot, "the first delivery produced the one pilot payload");
  assert.equal(JSON.stringify(duplicate.state), afterFirst, "a duplicate delivery does not change state");

  const thirdDuplicate = deliver("customer-6", 8, 2);
  const afterThird = JSON.stringify(thirdDuplicate.state);
  assert.deepEqual(thirdDuplicate.result.narrative, fernThirdPilot, "the boundary delivery produced the third-heart payload");
  assert.equal(game.fulfillOrder(thirdDuplicate.state, 1, NOW, () => 0), null, "a repeated boundary delivery cannot replay the pilot");
  assert.equal(JSON.stringify(thirdDuplicate.state), afterThird, "a repeated boundary delivery does not change state");

  const reloaded = game.parseSave(JSON.stringify(ordinary.state), NOW + 1).state;
  reloaded.orders = [{ id: 1, customerId: "customer-6", customer: game.CUSTOMERS[6][0], recipeId: "bloom", quantity: 1, reward: 20, xp: 1 }];
  reloaded.potions.bloom = 1;
  assert.equal(game.fulfillOrder(reloaded, 1, NOW + 1, () => 0).narrative, null, "reload cannot replay the pilot");

  const thirdReloaded = game.parseSave(JSON.stringify(thirdHeart.state), NOW + 1).state;
  thirdReloaded.orders = [{ id: 1, customerId: "customer-6", customer: game.CUSTOMERS[6][0], recipeId: "bloom", quantity: 1, reward: 20, xp: 1 }];
  thirdReloaded.potions.bloom = 1;
  assert.equal(game.fulfillOrder(thirdReloaded, 1, NOW + 1, () => 0).narrative, null, "reload cannot replay the third-heart payoff");

  const stale = game.defaultState(NOW);
  stale.customers["customer-6"] = { deliveries: 8, hearts: 2 };
  stale.potions.bloom = 1;
  assert.equal(game.fulfillOrder(stale, 999, NOW, () => 0), null, "an off-board order cannot trigger the payoff");
  assert.deepEqual(stale.customers["customer-6"], { deliveries: 8, hearts: 2 });

  const forged = game.defaultState(NOW);
  forged.customers["customer-6"] = { deliveries: 8, hearts: 2 };
  forged.orders = [{ id: 1, customerId: "customer-6", customer: game.CUSTOMERS[6][0], recipeId: "bloom", quantity: 1, reward: 999, xp: 1, afterStarsStep: 0 }];
  forged.potions.bloom = 1;
  const forgedReload = game.parseSave(JSON.stringify(forged), NOW).state;
  assert.equal(forgedReload.orders.length, 0, "a forged reserved order is discarded before fulfillment");
  assert.deepEqual(forgedReload.customers["customer-6"], { deliveries: 8, hearts: 2 });

  const commissionState = game.defaultState(NOW);
  commissionState.level = game.recipeById("bloom").unlock;
  commissionState.commissions.invitations = 1;
  const commissionOrder = game.selectSignatureCommission(commissionState, "fern-patience");
  commissionState.customers["customer-6"] = { deliveries: 8, hearts: 2 };
  commissionState.potions.bloom = 1;
  const commissionResult = game.fulfillOrder(commissionState, commissionOrder.id, NOW, () => 0);
  assert.deepEqual(commissionResult.narrative, fernThirdPilot);
  assert.equal(commissionResult.commission.id, "fern-patience", "Special Request completion remains present");

  const afterStarsState = game.defaultState(NOW);
  afterStarsState.level = game.recipeById("bloom").unlock;
  afterStarsState.stats.prestiges = 1;
  afterStarsState.afterStars.step = 2;
  game.ensureOrders(afterStarsState, () => 0);
  const afterStarsOrder = afterStarsState.orders.find(game.isAfterStarsOrder);
  afterStarsState.customers["customer-6"] = { deliveries: 8, hearts: 2 };
  afterStarsState.potions.bloom = 1;
  const afterStarsResult = game.fulfillOrder(afterStarsState, afterStarsOrder.id, NOW, () => 0);
  assert.deepEqual(afterStarsResult.narrative, fernThirdPilot);
  assert.deepEqual(afterStarsResult.afterStars, { step: 2, title: "Roots After Starlight", complete: false }, "After the Stars completion remains present");

  const rebirthState = game.defaultState(NOW);
  rebirthState.level = game.PRESTIGE_CONFIG.unlockLevel;
  rebirthState.customers["customer-6"] = { deliveries: 8, hearts: 2 };
  const reborn = game.performPrestige(rebirthState, 3, NOW);
  assert.deepEqual(reborn.customers["customer-6"], { deliveries: 8, hearts: 2 });
  assert.equal(Object.hasOwn(reborn, "narrative"), false, "rebirth cannot produce a fulfillment payload");

  reborn.customers["customer-6"] = { deliveries: 8, hearts: 2 };
  reborn.orders = [{ id: 1, customerId: "customer-6", customer: game.CUSTOMERS[6][0], recipeId: "bloom", quantity: 1, reward: 20, xp: 1 }];
  reborn.nextOrderId = 2;
  reborn.potions.bloom = 1;
  const postRebirthResult = game.fulfillOrder(reborn, 1, NOW, () => 0);
  assert.deepEqual(postRebirthResult.narrative, fernThirdPilot, "a genuine post-rebirth two-to-three boundary remains eligible");
});

test("all villagers have three distinct trust stories and deterministic request variety", () => {
  assert.equal(game.CUSTOMERS.length, 12);
  assert.equal(game.CUSTOMER_CONTENT.length, game.CUSTOMERS.length);
  for (let index = 0; index < game.CUSTOMERS.length; index += 1) {
    const content = game.CUSTOMER_CONTENT[index];
    assert.equal(content.stories.length, 3);
    assert.equal(new Set(content.stories).size, 3);
    assert.equal(content.orderLines.length, 3);
    assert.equal(new Set(content.orderLines).size, 3);
    const customerId = `customer-${index}`;
    const firstPass = [1, 2, 3].map(id => game.customerOrderLine(customerId, id, "tonic", 1));
    const secondPass = [1, 2, 3].map(id => game.customerOrderLine(customerId, id, "tonic", 1));
    assert.deepEqual(firstPass, secondPass);
    assert.equal(new Set(firstPass).size, 3);
  }
});

test("journal stories unlock from trust and safely record read state", () => {
  const state = game.defaultState(NOW);
  state.customers["customer-0"] = { deliveries: 6, hearts: 2 };
  assert.equal(game.customerStoryStatus(state, "customer-0", 0).unlocked, true);
  assert.equal(game.customerStoryStatus(state, "customer-0", 1).unlocked, true);
  assert.equal(game.customerStoryStatus(state, "customer-0", 2).unlocked, false);
  assert.equal(game.markJournalRead(state, "story", "customer-0:3"), false);
  assert.equal(game.markJournalRead(state, "story", "customer-0:2"), true);
  assert.equal(game.customerStoryStatus(state, "customer-0", 1).read, true);
  assert.equal(game.markJournalRead(state, "story", "not-a-story"), false);
});

test("all recipe lore unlocks from existing discovery without changing gameplay", () => {
  assert.equal(Object.keys(game.RECIPE_LORE).length, game.RECIPES.length);
  const state = game.defaultState(NOW);
  const before = { coins: state.coins, xp: state.xp, ingredients: structuredClone(state.ingredients), potions: structuredClone(state.potions) };
  for (const recipe of game.RECIPES) {
    assert.ok(game.RECIPE_LORE[recipe.id]);
    assert.equal(game.recipeLoreStatus(state, recipe.id).unlocked, false);
    state.discovery.delivered[recipe.id] = 1;
    assert.equal(game.recipeLoreStatus(state, recipe.id).unlocked, true);
    assert.equal(game.markJournalRead(state, "recipe", recipe.id), true);
    assert.equal(game.recipeLoreStatus(state, recipe.id).read, true);
  }
  assert.deepEqual({ coins: state.coins, xp: state.xp, ingredients: state.ingredients, potions: state.potions }, before);
});

test("expanded potion book adds exactly one ingredient and four authored recipes across levels four to seven", () => {
  const expansionIds = ["lantern", "quiet", "way", "aurora"];
  assert.equal(Object.keys(game.INGREDIENTS).length, 7);
  assert.equal(game.INGREDIENTS.mint.unlock, 4);
  assert.equal(game.RECIPES.length, 12);
  assert.deepEqual(expansionIds.map(id => game.recipeById(id).unlock), [4, 5, 6, 7]);
  for (const id of expansionIds) {
    const recipe = game.recipeById(id);
    assert.ok(recipe.name && recipe.description && game.RECIPE_LORE[id]);
    assert.ok(recipe.ingredients.mint > 0, `${id} should make Frostmint useful`);
    assert.ok(recipe.seconds > 0 && recipe.sell > 0);
  }
  assert.equal(game.PRESTIGE_CONFIG.unlockLevel, 7);
  assert.deepEqual([4, 5, 6, 7].map(level => game.unlocksAtLevel(level).recipes.filter(recipe => expansionIds.includes(recipe.id)).map(recipe => recipe.id)), [["lantern"], ["quiet"], ["way"], ["aurora"]]);
  assert.equal(game.unlocksAtLevel(4).ingredients.some(item => item.name === "Frostmint"), true);
});

test("new recipes participate in brewing, mastery, discovery, and eligible orders", () => {
  const state = game.defaultState(NOW);
  state.level = 4;
  Object.assign(state.ingredients, game.recipeById("lantern").ingredients);
  assert.equal(game.setGatherTarget(state, "mint"), true);
  assert.equal(game.startBrew(state, "lantern", NOW), true);
  const result = game.collectBrew(state, NOW + game.recipeById("lantern").seconds * 1000);
  assert.equal(result.recipe.id, "lantern");
  assert.equal(state.potions.lantern, 1);
  assert.equal(state.mastery.lantern, 1);
  assert.equal(state.discovery.brewed.lantern, 1);
  assert.equal(game.recipeLoreStatus(state, "lantern").unlocked, true);

  const generated = new Set();
  for (let index = 0; index < 100; index += 1) generated.add(game.generateOrder(state, () => (index % 97) / 97).recipeId);
  assert.equal(generated.has("lantern"), true);
  assert.equal([...generated].some(id => game.recipeById(id).unlock > state.level), false);
});

test("Frostmint participates in smart passive and offline gathering after unlock", () => {
  const state = game.defaultState(NOW);
  state.level = 4;
  state.ingredients = Object.fromEntries(Object.keys(game.INGREDIENTS).map(id => [id, 0]));
  state.stats.orders = 1;
  assert.equal(game.grantPassiveIngredients(state, 1, () => .999999), 1);
  assert.equal(state.ingredients.mint, 1);
  state.ingredients = Object.fromEntries(Object.keys(game.INGREDIENTS).map(id => [id, 0]));
  assert.equal(game.grantOfflineIngredients(state, 63, () => .999999), 1);
  assert.equal(state.ingredients.mint, 1);
});

test("Potion Sampler remains the durable original-eight Mooncloth goal", () => {
  const state = game.defaultState(NOW);
  for (const id of game.SAMPLER_IDS) state.mastery[id] = 1;
  assert.deepEqual(game.collectionGoalProgress(state, "sampler"), { current: 8, target: 8 });
  assert.equal(state.mastery.lantern, 0);
  assert.equal(state.mastery.quiet, 0);
  assert.equal(state.mastery.way, 0);
  assert.equal(state.mastery.aurora, 0);
  assert.equal(game.cosmeticUnlocked(state, "mooncloth"), true);
  state.customization.selected = "mooncloth";
  assert.equal(game.normalizeState(state, NOW).customization.selected, "mooncloth");
});

test("version-three and malformed saves zero new content keys without losing prior progress", () => {
  const existing = game.defaultState(NOW - 1000);
  existing.version = 3;
  existing.coins = 345;
  existing.mastery.tonic = 8;
  existing.discovery.brewed.tonic = 4;
  delete existing.ingredients.mint;
  for (const id of ["lantern", "quiet", "way", "aurora"]) {
    delete existing.potions[id];
    delete existing.mastery[id];
    delete existing.discovery.brewed[id];
    delete existing.discovery.delivered[id];
  }
  existing.potions.unknown = 99;
  existing.mastery.lantern = "broken";
  existing.discovery.delivered.aurora = -50;
  const loaded = game.normalizeState(existing, NOW);
  assert.equal(loaded.coins, 345);
  assert.equal(loaded.mastery.tonic, 8);
  assert.equal(loaded.discovery.brewed.tonic, 4);
  assert.equal(loaded.ingredients.mint, 0);
  for (const id of ["lantern", "quiet", "way", "aurora"]) {
    assert.equal(loaded.potions[id], 0);
    assert.equal(loaded.mastery[id], 0);
    assert.equal(loaded.discovery.brewed[id], 0);
    assert.equal(loaded.discovery.delivered[id], 0);
  }
  assert.equal("unknown" in loaded.potions, false);
});

test("malformed journal state normalizes to known unique content ids", () => {
  const state = game.defaultState(NOW);
  state.achievements = { firstBrew: NOW, orderFive: "invalid", unknown: NOW };
  state.journal = { readStories: ["customer-0:1", "customer-0:1", "customer-99:3", null], readRecipes: ["tonic", "tonic", "unknown", {}], claimedAchievements: ["firstBrew", "firstBrew", "unknown", null] };
  const loaded = game.normalizeState(state, NOW);
  assert.deepEqual(loaded.achievements, { firstBrew: NOW });
  assert.deepEqual(loaded.journal, { readStories: ["customer-0:1"], readRecipes: ["tonic"], claimedAchievements: ["firstBrew"] });
  const recovered = game.normalizeState({ ...state, journal: "broken" }, NOW);
  assert.deepEqual(recovered.journal, { readStories: [], readRecipes: [], claimedAchievements: [] });
});

test("journal rewards are bounded, one-time, and clear their claimable counts", () => {
  const state = game.defaultState(NOW);
  state.customers["customer-0"] = { deliveries: 3, hearts: 1 };
  state.discovery.brewed.tonic = 1;
  state.achievements.firstBrew = NOW;
  const before = { coins: state.coins, earned: state.stats.coinsEarned };
  assert.deepEqual(game.journalClaimableCounts(state), { story: 1, recipe: 1, achievement: 1, total: 3 });
  assert.deepEqual(game.claimJournalReward(state, "story", "customer-0:1"), { kind: "story", id: "customer-0:1", reward: 5 });
  assert.equal(game.claimJournalReward(state, "story", "customer-0:1"), null);
  assert.deepEqual(game.claimJournalReward(state, "recipe", "tonic"), { kind: "recipe", id: "tonic", reward: 5 });
  assert.equal(game.claimJournalReward(state, "recipe", "tonic"), null);
  assert.deepEqual(game.claimJournalReward(state, "achievement", "firstBrew"), { kind: "achievement", id: "firstBrew", reward: 10 });
  assert.equal(game.claimJournalReward(state, "achievement", "firstBrew"), null);
  assert.equal(game.claimJournalReward(state, "story", "customer-0:2"), null);
  assert.equal(game.claimJournalReward(state, "recipe", "unknown"), null);
  assert.equal(game.claimJournalReward(state, "achievement", "unknown"), null);
  assert.deepEqual(game.journalClaimableCounts(state), { story: 0, recipe: 0, achievement: 0, total: 0 });
  assert.equal(state.coins, before.coins + 20);
  assert.equal(state.stats.coinsEarned, before.earned + 20);
});

test("the complete Journal has a fixed 320-coin lifetime reward ceiling", () => {
  const state = game.defaultState(NOW);
  for (let index = 0; index < game.CUSTOMERS.length; index += 1) state.customers[`customer-${index}`] = { deliveries: 9, hearts: 3 };
  for (const recipe of game.RECIPES) state.discovery.brewed[recipe.id] = 1;
  for (const achievement of game.ACHIEVEMENTS) state.achievements[achievement.id] = NOW;
  const before = state.coins;
  for (let customer = 0; customer < game.CUSTOMERS.length; customer += 1) {
    for (let story = 1; story <= 3; story += 1) assert.ok(game.claimJournalReward(state, "story", `customer-${customer}:${story}`));
  }
  for (const recipe of game.RECIPES) assert.ok(game.claimJournalReward(state, "recipe", recipe.id));
  for (const achievement of game.ACHIEVEMENTS) assert.ok(game.claimJournalReward(state, "achievement", achievement.id));
  assert.equal(state.coins - before, 320);
  assert.deepEqual(game.journalClaimableCounts(state), { story: 0, recipe: 0, achievement: 0, total: 0 });
});

test("prestige opens with the final recipe and preserves durable goals plus the daily boundary", () => {
  const state = game.defaultState(NOW);
  state.level = game.PRESTIGE_CONFIG.unlockLevel;
  state.stardust = 2; state.daily = { date: game.todayKey(NOW), orders: 5, claimed: true };
  state.mastery.tonic = 8; state.customers["customer-0"] = { deliveries: 4, hearts: 1 };
  state.journal = { readStories: ["customer-0:1"], readRecipes: ["tonic"], claimedAchievements: ["firstBrew"] };
  assert.ok(game.unlocksAtLevel(state.level).recipes.length > 0, "prestige level must also unlock content");
  assert.equal(game.prestigeReward(state), 3);
  const next = game.performPrestige(state, undefined, NOW + 1000);
  assert.equal(next.level, 1); assert.equal(next.stardust, 5);
  assert.equal(next.mastery.tonic, 8); assert.deepEqual(next.customers["customer-0"], { deliveries: 4, hearts: 1 });
  assert.deepEqual(next.journal, state.journal);
  assert.deepEqual(next.daily, state.daily); assert.equal(game.claimDaily(next, NOW + 1000), false, "rebirth cannot reclaim today's reward");
  assert.equal(next.stats.prestiges, 1); assert.equal(game.cosmeticUnlocked(next, "starglass"), true);
  assert.equal(game.beginnerQuest(next, NOW + 1000), null, "rebirth cannot restart First Steps");
  assert.deepEqual(next.weekly, state.weekly); assert.deepEqual(next.customization, state.customization);
});

test("daily reset uses a monotonic saved date across alternating clock changes", () => {
  const state = game.defaultState(NOW);
  state.daily.orders = 5;
  assert.ok(game.claimDaily(state, NOW));
  const firstDate = state.daily.date;
  assert.equal(game.resetDailyIfNeeded(state, NOW - 86400000), false);
  assert.deepEqual(state.daily, { date: firstDate, orders: 5, claimed: true }, "clock rollback cannot reopen the saved date");

  assert.equal(game.resetDailyIfNeeded(state, NOW + 86400000), true);
  const laterDate = game.todayKey(NOW + 86400000);
  assert.deepEqual(state.daily, { date: laterDate, orders: 0, claimed: false }, "a genuinely later local date opens one fresh goal");
  state.daily.orders = 5;
  assert.ok(game.claimDaily(state, NOW + 86400000));
  assert.equal(game.resetDailyIfNeeded(state, NOW - 86400000), false);
  assert.equal(game.resetDailyIfNeeded(state, NOW + 86400000), false);
  assert.deepEqual(state.daily, { date: laterDate, orders: 5, claimed: true }, "alternating backward and forward to the saved high-water date cannot reissue rewards");
  assert.equal(state.coins, 130);
  assert.equal(state.stardust, 2);
});

test("rolling weekly chains ignore calendar time, never expire progress, and cap rewards", () => {
  const state = game.defaultState(NOW);
  const deliverAt = now => {
    state.orders = [{ id: state.nextOrderId++, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic", quantity: 1, reward: 20, xp: 1 }];
    state.potions.tonic = 1;
    assert.ok(game.fulfillOrder(state, state.orders[0].id, now, () => 0));
  };
  deliverAt(NOW + 365 * 86400000);
  deliverAt(NOW - 365 * 86400000);
  assert.equal(game.weeklyChainStatus(state).progress, 2, "forward and rollback clocks only record validated deliveries");
  assert.equal(game.weeklyChainStatus(state).ready, true);
  const before = state.coins;
  assert.deepEqual(game.claimWeeklyStep(state), { reward: 10, chainCompleted: false, cycle: 0 });
  assert.equal(state.coins, before + 10);
  assert.equal(game.claimWeeklyStep(state), null, "a parcel cannot be claimed twice");

  while (!game.weeklyChainStatus(state).complete) {
    const status = game.weeklyChainStatus(state);
    while (!game.weeklyChainStatus(state).ready) deliverAt(NOW);
    game.claimWeeklyStep(state);
    assert.ok(state.weekly.cycle > status.cycle || state.weekly.claimedSteps > status.claimedSteps);
  }
  assert.equal(state.weekly.cycle, game.WEEKLY_CHAINS.length);
  assert.equal(game.recordWeeklyDelivery(state), false);
  assert.equal(game.claimWeeklyStep(state), null);
});

test("malformed fully claimed weekly state advances to a reachable next chain", () => {
  const state = game.defaultState(NOW);
  state.weekly = { cycle: 0, progress: 6, claimedSteps: 3 };
  const normalized = game.normalizeState(state, NOW);
  assert.deepEqual(normalized.weekly, { cycle: 1, progress: 0, claimedSteps: 0 });
  game.recordWeeklyDelivery(normalized);
  game.recordWeeklyDelivery(normalized);
  assert.equal(game.weeklyChainStatus(normalized).ready, true);
  assert.deepEqual(game.claimWeeklyStep(normalized), { reward: 10, chainCompleted: false, cycle: 1 });
});

test("all villagers have one distinct authored signature commission and keepsake", () => {
  assert.equal(game.SIGNATURE_COMMISSIONS.length, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.id)).size, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.customerId)).size, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.title)).size, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.keepsake.name)).size, game.CUSTOMERS.length);
  assert.equal(new Set(game.SIGNATURE_COMMISSIONS.map(item => item.keepsake.mark)).size, game.CUSTOMERS.length);
  for (const commission of game.SIGNATURE_COMMISSIONS) {
    assert.ok(game.recipeById(commission.recipeId));
    assert.ok(commission.request.length >= 20);
    assert.ok(commission.keepsake.description.length >= 20);
  }
});

test("special-request choices include every unfinished request with an unlocked potion", () => {
  const state = game.defaultState(NOW);
  state.level = 1;
  game.ensureOrders(state, () => 0);
  assert.deepEqual(game.refreshCommissionChoices(state).map(item => item.id), ["mira-dawn"], "no prior random delivery is required");
  state.level = 3;
  const choices = game.refreshCommissionChoices(state);
  assert.ok(choices.some(item => item.id === "moss-rainpath"));
  state.commissions.completedIds.push("moss-rainpath");
  assert.ok(!game.refreshCommissionChoices(state).some(item => item.id === "moss-rainpath"));
});

test("choosing a special request consumes one invitation and preserves normal delivery rules", () => {
  const state = game.defaultState(NOW);
  state.level = 7;
  game.ensureOrders(state, () => 0);
  assert.equal(game.selectSignatureCommission(state, "mira-dawn"), null, "an earned invitation is required");
  state.commissions.invitations = 2;
  const chosen = game.selectSignatureCommission(state, "mira-dawn");
  assert.equal(chosen.commissionId, "mira-dawn");
  assert.equal(state.commissions.invitations, 1);
  assert.equal(state.orders.length, 3);
  assert.equal(state.orders.filter(game.isSignatureOrder).length, 1);
  assert.equal(state.orders.filter(order => !game.isSignatureOrder(order)).length, 2);
  assert.equal(game.selectSignatureCommission(state, "moss-rainpath"), null, "only one request may be active");
  assert.equal(state.commissions.invitations, 1, "a rejected selection cannot consume an invitation");
  state.daily.orders = 5;
  assert.ok(game.claimDaily(state, NOW));
  assert.equal(state.commissions.invitations, 2, "a daily invitation waits safely behind an active request");
  const before = { coins: state.coins, orders: state.stats.orders, daily: state.daily.orders, weekly: state.weekly.progress, delivered: state.discovery.delivered.tonic };
  state.potions.tonic = 1;
  const result = game.fulfillOrder(state, chosen.id, NOW, () => 0);
  assert.equal(result.commission.id, "mira-dawn");
  assert.equal(result.customerBonus, 0);
  assert.equal(result.reward, Math.round(chosen.reward * game.orderMultiplier(state, NOW, "tonic")));
  assert.equal(state.coins, before.coins + result.reward);
  assert.equal(state.stats.orders, before.orders + 1);
  assert.equal(state.daily.orders, before.daily + 1);
  assert.equal(state.weekly.progress, before.weekly + 1);
  assert.equal(state.discovery.delivered.tonic, before.delivered + 1);
  assert.deepEqual(state.commissions.completedIds, ["mira-dawn"]);
  assert.equal(state.commissions.selectedId, null);
  assert.equal(game.fulfillOrder(state, chosen.id, NOW, () => 0), null, "signature payout cannot repeat");
  assert.equal(state.orders.filter(game.isSignatureOrder).length, 0);
  assert.equal(state.orders.filter(order => !game.isSignatureOrder(order)).length, 3);
});

test("special-request invitations normalize safely and survive dates, reload, and prestige", () => {
  const malformed = game.defaultState(NOW);
  malformed.level = 7;
  malformed.commissions = { invitations: 999, selectedId: "unknown", completedIds: ["juniper-encore", "juniper-encore", "bad"] };
  malformed.orders = [{ id: 90, commissionId: "mira-dawn", customerId: "customer-3", recipeId: "tonic", quantity: 1, reward: 999, xp: 1 }];
  const normalized = game.normalizeState(malformed, NOW);
  assert.deepEqual(normalized.commissions, { invitations: 11, selectedId: null, completedIds: ["juniper-encore"] });
  assert.equal(normalized.orders.some(game.isSignatureOrder), false);
  const reloaded = game.parseSave(JSON.stringify(normalized), NOW + 1000).state;
  game.resetDailyIfNeeded(reloaded, NOW + 86400000);
  game.resetDailyIfNeeded(reloaded, NOW - 86400000);
  assert.equal(reloaded.commissions.invitations, 11);

  const state = reloaded;
  state.level = game.PRESTIGE_CONFIG.unlockLevel;
  state.commissions.completedIds = ["mira-dawn", "moss-rainpath"];
  state.commissions.selectedId = "juniper-encore";
  state.commissions.invitations = 4;
  const reborn = game.performPrestige(state, 3, NOW + 1000);
  assert.deepEqual(reborn.commissions, { invitations: 4, selectedId: null, completedIds: ["mira-dawn", "moss-rainpath"] });
  assert.equal(reborn.orders.length, 0);
});

test("completion cards stay readable before fading and reduced motion skips only the fade", () => {
  const shownAt = NOW;
  assert.equal(game.completionCardPhase(shownAt, shownAt + 2999), "readable");
  assert.equal(game.completionCardPhase(shownAt, shownAt + 3000), "fading");
  assert.equal(game.completionCardPhase(shownAt, shownAt + 3000, true), "hidden");
  assert.equal(game.completionCardPhase(shownAt, shownAt + 3300), "hidden");
});

test("collection cosmetics are few, durable, and have no economy effects", () => {
  const state = game.defaultState(NOW);
  const baseline = { order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) };
  state.stats.brewed = 10;
  assert.equal(game.cosmeticUnlocked(state, "fern"), true);
  assert.equal(game.selectCosmetic(state, "fern"), true);
  assert.equal(game.selectCosmetic(state, "mooncloth"), false);
  assert.deepEqual({ order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) }, baseline);
  Object.keys(state.mastery).forEach(id => { state.mastery[id] = game.MASTERY_CONFIG.thresholds.at(-1); });
  state.stats.prestiges = 1;
  state.weekly.cycle = 1;
  state.commissions.completedIds = game.SIGNATURE_COMMISSIONS.map(commission => commission.id);
  state.afterStars.step = game.AFTER_STARS_STEPS.length;
  state.chapterProgress = game.VILLAGE_CHAPTER.steps.length;
  const visualStates = {};
  for (const cosmetic of game.COSMETICS) {
    assert.equal(game.selectCosmetic(state, cosmetic.id), true);
    visualStates[cosmetic.id] = game.workshopDecorationState(state);
  }
  assert.deepEqual(visualStates.midnight, { selected: "midnight", keepsake: false, ribbon: false, dawnthread: false, masterwork: false });
  assert.deepEqual(visualStates.starglass, { selected: "starglass", keepsake: true, ribbon: false, dawnthread: false, masterwork: false });
  assert.deepEqual(visualStates.guild, { selected: "guild", keepsake: false, ribbon: true, dawnthread: false, masterwork: false });
  assert.equal(new Set(Object.values(visualStates).map(visual => JSON.stringify(visual))).size, game.COSMETICS.length, "each advertised selection yields a distinct reversible visual state");
  assert.equal(game.selectCosmetic(state, "midnight"), true);
  assert.equal(game.selectCosmetic(state, "midnight"), false, "selecting the current look is a no-op");
  const reloaded = game.normalizeState(state, NOW);
  assert.equal(reloaded.customization.selected, "midnight");
  assert.ok(game.COSMETICS.length <= 9);
});

test("Twelvefold Mastery unlocks only at the twelfth rank-three recipe and stays cosmetic", () => {
  const state = game.defaultState(NOW);
  const goal = game.COLLECTION_GOALS.find(item => item.id === "mastery");
  const maxCount = game.MASTERY_CONFIG.thresholds.at(-1);
  const rankTwoCount = game.MASTERY_CONFIG.thresholds.at(-2);
  assert.deepEqual(goal, { id: "mastery", name: "Twelvefold Mastery", target: game.RECIPES.length, cosmeticId: "masterwork" });
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 0, target: 12 });
  state.mastery.tonic = rankTwoCount;
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 0, target: 12 });
  state.mastery.tonic = maxCount;
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 1, target: 12 });
  assert.equal(game.cosmeticUnlocked(state, "masterwork"), false);
  state.mastery.tonic = "malformed";
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 0, target: 12 });
  game.RECIPES.forEach(recipe => { state.mastery[recipe.id] = maxCount; });
  state.mastery.aurora = maxCount - 1;
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 11, target: 12 });
  assert.equal(game.cosmeticUnlocked(state, "masterwork"), false);
  assert.equal(game.selectCosmetic(state, "masterwork"), false);
  state.mastery.aurora = maxCount;
  assert.deepEqual(game.collectionGoalProgress(state, "mastery"), { current: 12, target: 12 });
  assert.equal(game.cosmeticUnlocked(state, "masterwork"), true);
  const baseline = { coins: state.coins, xp: state.xp, stardust: state.stardust, order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) };
  assert.equal(game.selectCosmetic(state, "masterwork"), true);
  assert.deepEqual(game.workshopDecorationState(state), { selected: "masterwork", keepsake: false, ribbon: false, dawnthread: false, masterwork: true });
  assert.deepEqual({ coins: state.coins, xp: state.xp, stardust: state.stardust, order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) }, baseline);
  assert.equal(game.selectCosmetic(state, "midnight"), true);
  assert.equal(game.selectCosmetic(state, "masterwork"), true);
  const reloaded = game.normalizeState(state, NOW + 1);
  assert.equal(reloaded.customization.selected, "masterwork");
  const forged = game.defaultState(NOW);
  forged.customization.selected = "masterwork";
  assert.equal(game.normalizeState(forged, NOW).customization.selected, "midnight");
  reloaded.level = game.PRESTIGE_CONFIG.unlockLevel;
  const reborn = game.performPrestige(reloaded, 3, NOW + 2);
  assert.equal(game.cosmeticUnlocked(reborn, "masterwork"), true);
  assert.equal(reborn.customization.selected, "masterwork");
});

test("upgrade previews expose exact current and next effects across three paths", () => {
  const state = game.defaultState(NOW);
  assert.deepEqual(game.upgradePreview(state, game.upgradeById("basket")), { path: "Harvest", current: "3 items/harvest", next: "4 items/harvest", maxed: false });
  assert.deepEqual(game.upgradePreview(state, game.upgradeById("cauldron")), { path: "Brewing", current: "100% brew speed", next: "110% brew speed", maxed: false });
  assert.deepEqual(game.upgradePreview(state, game.upgradeById("ledger")), { path: "Trade", current: "+0% order coins", next: "+12% order coins", maxed: false });
  assert.deepEqual(new Set(game.UPGRADES.map(upgrade => upgrade.path)), new Set(["Harvest", "Brewing", "Trade"]));
});

test("offline elapsed time is capped at four hours and future timestamps earn zero", () => {
  const state = game.defaultState(NOW);
  state.lastSeen = NOW - 24 * 60 * 60 * 1000;
  assert.equal(game.offlineElapsedSeconds(state, NOW), game.OFFLINE_CAP_SECONDS);
  state.lastSeen = NOW + 60_000;
  assert.equal(game.offlineElapsedSeconds(state, NOW), 0);
});

test("hidden timer ticks do not overlap offline progress", () => {
  const hiddenFor = 90 * 60 * 1000;
  assert.equal(game.activeElapsedSeconds(NOW, NOW + hiddenFor, true), 0);
  const state = game.defaultState(NOW);
  state.lastSeen = NOW;
  assert.equal(game.offlineElapsedSeconds(state, NOW + hiddenFor), 90 * 60);
});

test("malformed JSON safely recovers to a fresh state", () => {
  const result = game.parseSave("{bad json", NOW);
  assert.equal(result.recovered, true); assert.equal(result.state.level, 1); assert.equal(result.state.coins, 30);
});

test("structurally corrupted saves normalize without losing durable valid progress", () => {
  const result = game.parseSave(JSON.stringify({
    version: 0, level: "6", xp: "oops", coins: -5, stardust: 9,
    ingredients: null, potions: [], upgrades: { garden: 999 }, orders: "bad",
    daily: null, brew: { recipeId: "unknown" }, achievements: { firstBrew: 1234, legacyBadge: 5678 },
    stats: { brewed: 22, orders: 11, coinsEarned: 800, prestiges: 2, legacyCounter: 44 },
    lastSeen: NOW + 999999,
  }), NOW).state;
  assert.equal(result.stardust, 9);
  assert.deepEqual(result.achievements, { firstBrew: 1234 });
  assert.equal(result.stats.brewed, 22); assert.equal(result.stats.prestiges, 2); assert.equal(result.stats.legacyCounter, 44);
  assert.equal(result.upgrades.garden, 8); assert.equal(result.brew, null); assert.equal(result.lastSeen, NOW);
});

test("a versioned existing save retains stardust, achievements, and lifetime stats", () => {
  const existing = game.defaultState(NOW - 1000);
  existing.stardust = 17;
  existing.achievements = { firstBrew: 111, rebirth: 222 };
  existing.stats = { taps: 90, brewed: 30, orders: 14, coinsEarned: 912, prestiges: 3 };
  existing.mastery.tonic = 12;
  existing.customers["customer-0"] = { deliveries: 5, hearts: 1 };
  const loaded = game.parseSave(JSON.stringify(existing), NOW).state;
  assert.equal(loaded.stardust, 17);
  assert.deepEqual(loaded.achievements, existing.achievements);
  assert.deepEqual(loaded.stats, existing.stats);
  assert.equal(loaded.mastery.tonic, 12);
  assert.deepEqual(loaded.customers["customer-0"], { deliveries: 5, hearts: 1 });
});

test("generated orders only request recipes unlocked at the current level", () => {
  for (let level = 1; level <= 8; level += 1) {
    const state = game.defaultState(NOW); state.level = level;
    for (let index = 0; index < 100; index += 1) {
      const order = game.generateOrder(state, () => (index % 97) / 97);
      assert.ok(game.recipeById(order.recipeId).unlock <= level);
    }
  }
});

test("the first post-level order includes a newly unlocked recipe", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.orders = [
    { id: 1, recipeId: "tonic", quantity: 1 },
    { id: 2, recipeId: "tonic", quantity: 1 },
  ];
  assert.equal(game.generateOrder(state, () => 0).recipeId, "clarity");
});

test("ordinary order boards use distinct known villagers and replacements avoid visible customers", () => {
  const fresh = game.defaultState(NOW);
  game.ensureOrders(fresh, () => 0);
  const freshCustomers = fresh.orders.map(order => order.customerId);
  assert.equal(freshCustomers.length, 3);
  assert.equal(new Set(freshCustomers).size, 3);
  assert.ok(freshCustomers.every(id => /^customer-(?:[0-9]|1[01])$/.test(id)));

  const replacement = game.defaultState(NOW);
  replacement.orders = [
    { id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic" },
    { id: 2, customerId: "customer-1", customer: game.CUSTOMERS[1][0], recipeId: "tonic" },
  ];
  replacement.nextOrderId = 3;
  const next = game.generateOrder(replacement, () => 0);
  assert.equal(next.customerId, "customer-2");
  assert.ok(!replacement.orders.some(order => order.customerId === next.customerId));
});

test("ordinary customer selection avoids reserved villagers without changing their order", () => {
  const state = game.defaultState(NOW);
  const reserved = { id: 1, afterStarsStep: 0, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic" };
  state.orders = [reserved];
  state.nextOrderId = 2;
  const generated = game.generateOrder(state, () => 0);
  assert.equal(generated.customerId, "customer-1");
  assert.equal(state.orders[0], reserved);
  assert.equal(state.orders[0].customerId, "customer-0");
});

test("ordinary customer selection gives every eligible villager base weight and heart-ready villagers total weight three", () => {
  const state = game.defaultState(NOW);
  state.orders = [{ id: 1, customerId: "customer-0", customer: game.CUSTOMERS[0][0], recipeId: "tonic" }];
  let pool = game.ordinaryOrderCustomerPool(state);
  for (let index = 1; index < game.CUSTOMERS.length; index += 1) assert.equal(pool.filter(id => id === `customer-${index}`).length, 1);
  assert.equal(pool.includes("customer-0"), false);

  state.orders = [];
  state.customers["customer-2"] = { deliveries: 2, hearts: 0 };
  pool = game.ordinaryOrderCustomerPool(state);
  assert.equal(pool.filter(id => id === "customer-2").length, 3);
  for (let index = 0; index < game.CUSTOMERS.length; index += 1) {
    if (index !== 2) assert.equal(pool.filter(id => id === `customer-${index}`).length, 1);
  }
  state.customers["customer-2"] = { deliveries: 3, hearts: 1 };
  state.customers["customer-3"] = { deliveries: 8, hearts: 2 };
  state.customers["customer-4"] = { deliveries: 9, hearts: 3 };
  state.customers["customer-5"] = { deliveries: 11, hearts: 3 };
  pool = game.ordinaryOrderCustomerPool(state);
  assert.equal(pool.filter(id => id === "customer-2").length, 1, "other delivery counts have only base weight");
  assert.equal(pool.filter(id => id === "customer-3").length, 3, "the next unearned heart gets exactly two extra entries");
  assert.equal(pool.filter(id => id === "customer-4").length, 1, "max-heart villagers get no extra weight");
  assert.equal(pool.filter(id => id === "customer-5").length, 1, "extra deliveries after max hearts get no extra weight");
});

test("ordinary customer selection uses deterministic weighted boundaries and one customer draw", () => {
  const generatedFor = customerDraw => {
    const state = game.defaultState(NOW);
    state.customers["customer-0"] = { deliveries: 2, hearts: 0 };
    const draws = [0, customerDraw, 0];
    const order = game.generateOrder(state, () => draws.shift());
    assert.equal(draws.length, 0, "level-one generation keeps one customer draw before the existing reward draw");
    return order;
  };
  assert.equal(generatedFor(0).customerId, "customer-0");
  assert.equal(generatedFor(3 / 14 - Number.EPSILON).customerId, "customer-0");
  assert.equal(generatedFor(3 / 14).customerId, "customer-1");
  assert.equal(generatedFor(.999999).customerId, "customer-11");
});

test("ordinary customer selection safely falls back for malformed and fully represented boards", () => {
  const malformed = game.defaultState(NOW);
  malformed.orders = [{ id: 1, customerId: "not-a-villager", customer: game.CUSTOMERS[0][0], recipeId: "tonic" }];
  malformed.customers = null;
  assert.deepEqual(game.ordinaryOrderCustomerPool(malformed), game.CUSTOMERS.map((_, index) => `customer-${index}`));
  assert.equal(game.generateOrder(malformed, () => 0).customerId, "customer-0");

  const forged = game.defaultState(NOW);
  forged.orders = game.CUSTOMERS.map((customer, index) => ({ id: index + 1, customerId: `customer-${index}`, customer: customer[0], recipeId: "tonic" }));
  forged.nextOrderId = game.CUSTOMERS.length + 1;
  assert.equal(game.ordinaryOrderCustomerPool(forged).length, game.CUSTOMERS.length);
  assert.equal(game.generateOrder(forged, () => 0).customerId, "customer-0");
});

test("charged gathering limits bursts and recharges forgivingly", () => {
  const state = game.defaultState(NOW);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, 0);
  assert.equal(game.chargedGather(state, NOW + game.GATHER_CONFIG.rechargeSeconds * 1000, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
});

test("offline ingredients wait for the first delivery and preserve harvest space", () => {
  const state = game.defaultState(NOW);
  assert.equal(game.grantOfflineIngredients(state, 3600, () => 0), 0);
  assert.equal(game.totalIngredients(state), 11);
  state.stats.orders = 1;
  assert.equal(game.grantOfflineIngredients(state, 3600, () => 0), 25);
  assert.equal(game.totalIngredients(state), game.passiveStorageCap(state));
  assert.equal(game.grantOfflineIngredients(state, 3600, () => 0), 0);
});

test("offline ingredients use the frontloaded diminishing curve and preserve Pantry safeguards", () => {
  const makeState = ({ garden = 0, shelves = 0, stock = 0, delivered = true } = {}) => {
    const state = game.defaultState(NOW);
    state.level = 4;
    state.ingredients = Object.fromEntries(Object.keys(game.INGREDIENTS).map(id => [id, 0]));
    state.ingredients.herb = stock;
    state.upgrades.garden = garden;
    state.upgrades.shelves = shelves;
    state.stats.orders = delivered ? 1 : 0;
    return state;
  };
  const quantity = seconds => game.offlineIngredientQuantity(makeState(), seconds);

  assert.deepEqual(
    [899, 900, 901, 7199, 7200, 7201, 14399, 14400, 14401].map(seconds => [seconds, quantity(seconds)]),
    [[899, 14], [900, 14], [901, 14], [7199, 64], [7200, 64], [7201, 64], [14399, 93], [14400, 93], [14401, 93]],
    "the bounded 15-, 120-, and 240-minute segment edges must remain exact",
  );
  assert.equal(quantity(17 * 60), 15, "segment fractions must be summed before one final floor");
  assert.equal(quantity(game.OFFLINE_CAP_SECONDS), quantity(game.OFFLINE_CAP_SECONDS * 2), "over-four-hour values must not increase the requested quantity");
  for (const malformed of [-1, Infinity, NaN, "not-a-duration", {}, null]) assert.equal(quantity(malformed), 0, "malformed elapsed values must safely grant zero");

  for (const [minutes, expected] of [[15, 14], [60, 36], [120, 54]]) {
    const state = makeState();
    assert.equal(game.grantOfflineIngredients(state, minutes * 60, () => 0), expected, `level-four empty Pantry must grant ${expected} at ${minutes} minutes`);
  }
  let firstReserveMinute = null;
  for (let minute = 1; minute <= 240; minute += 1) {
    const state = makeState();
    if (game.grantOfflineIngredients(state, minute * 60, () => 0) === game.passiveStorageCap(state)) { firstReserveMinute = minute; break; }
  }
  assert.equal(firstReserveMinute, 98, "the representative passive reserve must first fill at minute 98");

  const garden = makeState({ garden: 1 });
  assert.equal(game.grantOfflineIngredients(garden, 60 * 60, () => 0), 45, "Moonlit Garden level one must retain its gather-rate benefit");
  const shelves = makeState({ shelves: 1 });
  assert.equal(game.grantOfflineIngredients(shelves, 120 * 60, () => 0), 64, "Pantry Shelves must extend the passive reserve without changing the curve");
  assert.equal(game.grantOfflineIngredients(makeState({ shelves: 1 }), 240 * 60, () => 0), 69, "Pantry Shelves must still respect their enlarged passive reserve");

  const partial = makeState({ stock: 20 });
  assert.equal(game.grantOfflineIngredients(partial, 60 * 60, () => 0), 34, "existing Pantry stock must only reduce the available grant");
  assert.ok(partial.ingredients.herb >= 20, "existing ingredient stock must never be overwritten");
  const nearReserve = makeState({ stock: 53 });
  assert.equal(game.grantOfflineIngredients(nearReserve, 240 * 60, () => 0), 1);
  assert.equal(game.grantOfflineIngredients(makeState({ stock: 54 }), 240 * 60, () => 0), 0);
  assert.equal(game.grantOfflineIngredients(makeState({ delivered: false }), 240 * 60, () => 0), 0, "offline gathering must still wait for a completed delivery");
});

test("automatic gathering is slow, waits for a delivery, and never fills manual harvest space", () => {
  const state = game.defaultState(NOW);
  assert.equal(Math.round(game.gatherRate(state) * 600) / 10, 4.8);
  assert.equal(game.grantPassiveIngredients(state, 100, () => 0), 0);
  state.stats.orders = 1;
  assert.equal(game.grantPassiveIngredients(state, 100, () => 0), game.passiveStorageCap(state) - 11);
  assert.equal(game.totalIngredients(state), game.passiveStorageCap(state));
  assert.equal(game.grantPassiveIngredients(state, 1, () => 0), 0);
  assert.equal(game.chargedGather(state, NOW, () => 0).added, game.GATHER_CONFIG.amountPerCharge);
});

test("Request Mix gives one active request deficit a capped random weight", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  const pool = game.requestMixPool(state);
  assert.equal(pool.filter(id => id === "herb").length, 4);
  assert.equal(pool.filter(id => id === "crystal").length, 2);
  assert.equal(pool.filter(id => id === "mushroom").length, 1);
});

test("Request Mix aggregates duplicate requests and allocates bottled potions by recipe", () => {
  const state = game.defaultState(NOW);
  state.level = 3;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.potions = { ...state.potions, clarity: 1, moon: 1 };
  state.orders = [
    { id: 1, recipeId: "clarity", quantity: 1 },
    { id: 2, recipeId: "clarity", quantity: 2 },
    { id: 3, recipeId: "moon", quantity: 1 },
    { id: 4, recipeId: "tonic", quantity: 1 },
  ];
  const pool = game.requestMixPool(state);
  assert.equal(pool.filter(id => id === "herb").length, 4);
  assert.equal(pool.filter(id => id === "crystal").length, 3);
  assert.equal(pool.filter(id => id === "mushroom").length, 2);
  assert.equal(pool.filter(id => id === "mist").length, 1);
});

test("Request Mix subtracts Pantry stock before adding deficit weight", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: 2, mushroom: 0, crystal: 1, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  const pool = game.requestMixPool(state);
  assert.equal(pool.filter(id => id === "herb").length, 2);
  assert.equal(pool.filter(id => id === "crystal").length, 1);
  assert.equal(pool.filter(id => id === "mushroom").length, 1);
});

test("Request Mix ignores locked and malformed orders and falls back uniformly without a deficit", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [null, { id: 1, recipeId: "bloom", quantity: 1 }, { id: 2, recipeId: "unknown", quantity: 1 }, { id: 3, recipeId: "clarity", quantity: 0 }];
  assert.deepEqual(game.requestMixPool(state), ["herb", "mushroom", "crystal"]);
  state.orders = [{ id: 4, recipeId: "clarity", quantity: 1 }];
  state.potions.clarity = 1;
  assert.deepEqual(game.requestMixPool(state), ["herb", "mushroom", "crystal"]);
});

test("Request Mix uses deterministic weighted boundaries and recomputes between rolls", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  assert.deepEqual(game.requestMixPool(state), ["herb", "mushroom", "crystal", "herb", "herb", "herb", "crystal"]);
  const draws = [2 / 7, .999999];
  assert.equal(game.addRequestMixIngredients(state, 2, () => draws.shift()), 2);
  assert.deepEqual(state.ingredients, { herb: 1, mushroom: 0, crystal: 1, mist: 0, ember: 0, mint: 0, lavender: 0 });
});

test("Request Mix respects storage while exact targeting remains unchanged", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  state.ingredients = { herb: game.storageCap(state) - 1, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  state.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  assert.equal(game.chargedGather(state, NOW, () => 0).added, 1);
  assert.equal(game.totalIngredients(state), game.storageCap(state));
  const targeted = game.defaultState(NOW);
  targeted.level = 2;
  game.setGatherTarget(targeted, "crystal");
  assert.equal(game.chargedGather(targeted, NOW, () => 0).targetId, "crystal");
  assert.equal(targeted.ingredients.crystal, game.GATHER_CONFIG.amountPerCharge);
});

test("passive and offline gathering stay on their uniform random path", () => {
  const passive = game.defaultState(NOW);
  passive.level = 2;
  passive.stats.orders = 1;
  passive.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  passive.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  assert.equal(game.grantPassiveIngredients(passive, 1, () => .5), 1);
  assert.deepEqual(passive.ingredients, { herb: 0, mushroom: 1, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 });
  const offline = game.defaultState(NOW);
  offline.level = 2;
  offline.stats.orders = 1;
  offline.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  offline.orders = [{ id: 1, recipeId: "clarity", quantity: 1 }];
  assert.equal(game.grantOfflineIngredients(offline, 63, () => .5), 1);
  assert.deepEqual(offline.ingredients, { herb: 0, mushroom: 1, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 });
});

test("charged gathering can intentionally target an unlocked ingredient", () => {
  const state = game.defaultState(NOW);
  state.level = 2;
  assert.equal(game.setGatherTarget(state, "crystal"), true);
  const before = state.ingredients.crystal;
  const result = game.chargedGather(state, NOW, () => 0);
  assert.equal(result.targetId, "crystal");
  assert.equal(state.ingredients.crystal - before, game.GATHER_CONFIG.amountPerCharge);
  assert.equal(game.setGatherTarget(state, "mist"), false);
  assert.equal(state.gather.targetId, "crystal");
  assert.equal(game.setGatherTarget(state, null), true);
  assert.equal(state.gather.targetId, null);
});

test("discarding ingredients safely clears stock and an unwanted harvest target", () => {
  const state = game.defaultState(NOW);
  state.level = 4;
  state.ingredients.mint = 12;
  assert.equal(game.setGatherTarget(state, "mint"), true);
  assert.equal(game.discardIngredient(state, "mint", 5), 5);
  assert.equal(state.ingredients.mint, 7);
  assert.equal(state.gather.targetId, null);
  assert.equal(game.discardIngredient(state, "mint", 99), 7);
  assert.equal(game.discardIngredient(state, "mint", 1), 0);
  assert.equal(game.discardIngredient(state, "unknown", 1), 0);
});

test("gather target migrates safely and rejects locked or unknown values", () => {
  const state = game.defaultState(NOW);
  state.gather.targetId = "crystal";
  assert.equal(game.normalizeState(state, NOW).gather.targetId, null);
  state.level = 2;
  assert.equal(game.normalizeState(state, NOW).gather.targetId, "crystal");
  state.gather.targetId = "bogus";
  assert.equal(game.normalizeState(state, NOW).gather.targetId, null);
});

test("tutorial maps exact tonic actions to precise targets", () => {
  const state = game.defaultState(NOW);
  game.ensureOrders(state, () => 0);
  assert.deepEqual(
    { status: game.beginnerQuest(state, NOW).status, selector: game.beginnerQuest(state, NOW).targetSelector },
    { status: "available-to-start", selector: '[data-brew="tonic"]' },
  );
  game.startBrew(state, "tonic", NOW);
  assert.deepEqual(
    { status: game.beginnerQuest(state, NOW + 1000).status, selector: game.beginnerQuest(state, NOW + 1000).targetSelector },
    { status: "in-progress", selector: "#brewSlot" },
  );
  assert.deepEqual(
    { status: game.beginnerQuest(state, NOW + 30000).status, selector: game.beginnerQuest(state, NOW + 30000).targetSelector },
    { status: "ready-to-collect", selector: "#collectBrewButton" },
  );
  game.collectBrew(state, NOW + 30000);
  assert.deepEqual(
    { status: game.beginnerQuest(state, NOW + 30000).status, selector: game.beginnerQuest(state, NOW + 30000).targetSelector },
    { status: "needs-delivery", selector: '[data-quick-deliver="1"]' },
  );
});

test("tutorial recognizes coin, ingredient, upgrade, and new unlock states", () => {
  const state = game.defaultState(NOW);
  state.stats.orders = 1;
  state.coins = 40;
  state.ingredients = { herb: 0, mushroom: 0, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  let quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.blockedBy, "insufficient-coins");
  assert.equal(quest.status, "insufficient-ingredients");
  assert.equal(quest.targetSelector, "#gatherButton");
  state.coins = 65;
  quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.status, "affordable-upgrade");
  assert.equal(quest.targetSelector, '[data-upgrade="basket"]');
  state.upgrades.garden = 1;
  state.level = 2;
  quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.status, "choose-gather-target");
  assert.equal(quest.targetSelector, '[data-gather-target="crystal"]');
  game.setGatherTarget(state, "crystal");
  quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.status, "gather-new-ingredient");
  assert.equal(quest.targetKind, "gather-and-pantry");
  assert.equal(quest.targetSelector, "#gatherButton");
  state.ingredients.crystal = 1;
  state.ingredients.herb = 3;
  quest = game.beginnerQuest(state, NOW);
  assert.equal(quest.status, "available-to-start");
  assert.equal(quest.targetSelector, '[data-brew="clarity"]');
});

test("tutorial maps Clarity waiting, collection, delivery, and completion", () => {
  const state = game.defaultState(NOW);
  state.stats.orders = 2;
  state.level = 2;
  state.upgrades.garden = 1;
  state.ingredients.crystal = 1;
  state.ingredients.herb = 3;
  state.orders = [{ id: 44, recipeId: "clarity", quantity: 1, reward: 40, xp: 10 }];
  game.startBrew(state, "clarity", NOW);
  assert.equal(game.beginnerQuest(state, NOW + 1000).targetSelector, "#brewSlot");
  assert.equal(game.beginnerQuest(state, NOW + 66000).targetSelector, "#collectBrewButton");
  game.collectBrew(state, NOW + 66000);
  assert.equal(game.beginnerQuest(state, NOW + 66000).targetSelector, '[data-quick-deliver="44"]');
  state.discovery.delivered.clarity = 1;
  assert.equal(game.beginnerQuest(state), null);
});

test("cross-view tutorial prompts only when the next target changes views", () => {
  const before = { id: "collect", view: "workshop" };
  const deliver = { id: "deliver", title: "Deliver", detail: "Use Deliver", view: "orders", targetSelector: '[data-order="1"]', targetKind: "control" };
  const sameView = { ...deliver, id: "brew", view: "workshop" };
  assert.equal(game.tutorialTransitionPrompt(before, sameView, "workshop"), null);
  assert.deepEqual(game.tutorialTransitionPrompt(before, deliver, "workshop"), {
    key: "collect->deliver", title: "Deliver", detail: "Use Deliver", view: "orders", targetSelector: '[data-order="1"]', targetKind: "control",
  });
  assert.equal(game.tutorialTransitionPrompt(before, null, "workshop"), null);
});

function chapterReadyState() {
  const state = game.defaultState(NOW);
  state.level = 4;
  state.customers["customer-0"] = { deliveries: 9, hearts: 3 };
  state.commissions.completedIds = ["mira-dawn"];
  return state;
}

test("The Village Loaf is one immutable three-step chapter with exact unlock boundaries", () => {
  assert.deepEqual({ id: game.VILLAGE_CHAPTER.id, title: game.VILLAGE_CHAPTER.title, steps: game.VILLAGE_CHAPTER.steps.map(step => [step.recipeId, step.title]) }, {
    id: "mira-village-loaf", title: "The Village Loaf", steps: [["tonic", "A Steady First Line"], ["clarity", "Notes in the Margin"], ["sun", "A Shared Sunrise"]],
  });
  const ready = chapterReadyState();
  assert.equal(game.chapterStatus(ready).active, true);
  for (const blocked of [
    { ...ready, level: 3 },
    { ...ready, customers: { ...ready.customers, "customer-0": { deliveries: 8, hearts: 2 } } },
    { ...ready, commissions: { ...ready.commissions, completedIds: [] } },
  ]) {
    game.ensureOrders(blocked, () => 0);
    assert.equal(game.chapterStatus(blocked).eligible, false);
    assert.equal(blocked.orders.some(game.isChapterOrder), false);
  }
  game.ensureOrders(ready, () => 0);
  assert.equal(ready.orders.filter(game.isChapterOrder).length, 1);
  assert.equal(ready.orders.filter(order => !game.isReservedOrder(order)).length, 2);
  assert.deepEqual(game.reservedStoryTracker(ready), ["THE VILLAGE LOAF", "A Steady First Line", "1 / 3", "Mira is waiting for one Meadow Tonic."]);
});

test("The Village Loaf delivers canonical ordinary economics and one authored payoff per reloaded step", () => {
  let state = chapterReadyState();
  state.commissions.invitations = 2;
  game.ensureOrders(state, () => 0);
  for (let stepIndex = 0; stepIndex < game.VILLAGE_CHAPTER.steps.length; stepIndex += 1) {
    const authored = game.VILLAGE_CHAPTER.steps[stepIndex];
    const recipe = game.recipeById(authored.recipeId);
    const order = state.orders.find(game.isChapterOrder);
    assert.deepEqual({ chapterId: order.chapterId, chapterStep: order.chapterStep, customerId: order.customerId, recipeId: order.recipeId, quantity: order.quantity, reward: order.reward, xp: order.xp }, {
      chapterId: game.VILLAGE_CHAPTER.id, chapterStep: stepIndex, customerId: "customer-0", recipeId: authored.recipeId, quantity: 1,
      reward: Math.round(recipe.sell * (1.45 + .4 * .25)), xp: Math.round(8 + recipe.unlock * 3 + 3),
    });
    const before = { coins: state.coins, xp: state.xp, orders: state.stats.orders, daily: state.daily.orders, weekly: state.weekly.progress, delivered: state.discovery.delivered[recipe.id], trust: state.customers["customer-0"].deliveries, invitations: state.commissions.invitations };
    state.potions[recipe.id] = 1;
    const result = game.fulfillOrder(state, order.id, NOW + stepIndex * 1000, () => 0);
    assert.deepEqual(result.chapter, { step: stepIndex, title: authored.title, complete: stepIndex === game.VILLAGE_CHAPTER.steps.length - 1 });
    assert.deepEqual(result.narrative, authored.payoff);
    assert.deepEqual({ coins: state.coins, xp: state.xp, orders: state.stats.orders, daily: state.daily.orders, weekly: state.weekly.progress, delivered: state.discovery.delivered[recipe.id], trust: state.customers["customer-0"].deliveries, invitations: state.commissions.invitations }, {
      coins: before.coins + result.reward, xp: before.xp + order.xp, orders: before.orders + 1, daily: before.daily + 1, weekly: before.weekly + 1, delivered: before.delivered + 1, trust: before.trust + 1, invitations: before.invitations,
    });
    const after = JSON.stringify(state);
    assert.equal(game.fulfillOrder(state, order.id, NOW, () => 0), null, "a completed chapter step never replays");
    assert.equal(JSON.stringify(state), after);
    state = game.parseSave(JSON.stringify(state), NOW + stepIndex + 1).state;
    assert.equal(state.chapterProgress, stepIndex + 1);
    assert.ok(state.orders.filter(order => !game.isReservedOrder(order)).length >= 2);
  }
  assert.equal(state.orders.some(game.isChapterOrder), false);
  assert.equal(game.cosmeticUnlocked(state, "firstlight"), true);
});

test("reserved priority pauses and resumes the chapter without touching pending invitations", () => {
  const state = chapterReadyState();
  state.commissions.invitations = 3;
  game.ensureOrders(state, () => 0);
  assert.ok(state.orders.some(game.isChapterOrder));
  assert.ok(game.selectSignatureCommission(state, "moss-rainpath"));
  assert.equal(state.commissions.invitations, 2);
  assert.ok(state.orders.some(game.isSignatureOrder));
  assert.equal(state.orders.some(game.isChapterOrder), false);
  state.stats.prestiges = 1;
  game.ensureOrders(state, () => 0);
  assert.equal(state.orders.filter(game.isAfterStarsOrder).length, 1);
  assert.equal(state.orders.filter(game.isSignatureOrder).length, 0);
  assert.equal(state.commissions.selectedId, "moss-rainpath", "the selected request waits without being cancelled");
  assert.equal(state.commissions.invitations, 2);
  assert.equal(state.chapterProgress, 0);
  assert.equal(state.orders.filter(order => !game.isReservedOrder(order)).length, 2);
  state.afterStars.step = game.AFTER_STARS_STEPS.length;
  game.ensureOrders(state, () => 0);
  const special = state.orders.find(game.isSignatureOrder);
  assert.equal(special.commissionId, "moss-rainpath");
  assert.equal(state.commissions.invitations, 2);
  state.potions.moon = 1;
  assert.equal(game.fulfillOrder(state, special.id, NOW, () => 0).commission.id, "moss-rainpath");
  assert.equal(state.orders.filter(game.isChapterOrder).length, 1, "the chapter resumes after higher-priority work finishes");
  assert.equal(state.commissions.invitations, 2);
});

test("malformed and duplicate chapter orders recover canonically without progress or rewards", () => {
  const state = chapterReadyState();
  state.orders = [
    { id: 70, chapterId: game.VILLAGE_CHAPTER.id, chapterStep: 0, customerId: "customer-11", customer: "Forgery", recipeId: "sun", quantity: 2, reward: 999999, xp: 999999 },
    { id: 71, chapterId: game.VILLAGE_CHAPTER.id, chapterStep: 0, customerId: "customer-0", recipeId: "tonic", quantity: 1, reward: 1, xp: 1 },
    { id: 72, customerId: "customer-2", recipeId: "tonic", quantity: 1, reward: 20, xp: 12 },
    { id: 73, customerId: "customer-3", recipeId: "clarity", quantity: 1, reward: 40, xp: 17 },
  ];
  const before = { progress: state.chapterProgress, coins: state.coins, xp: state.xp, orders: state.stats.orders };
  game.ensureOrders(state, () => 0);
  const restored = state.orders.filter(game.isChapterOrder);
  assert.equal(restored.length, 1);
  assert.deepEqual({ customerId: restored[0].customerId, recipeId: restored[0].recipeId, quantity: restored[0].quantity, reward: restored[0].reward, xp: restored[0].xp }, { customerId: "customer-0", recipeId: "tonic", quantity: 1, reward: 22, xp: 14 });
  assert.equal(state.orders.filter(order => !game.isReservedOrder(order)).length, 2);
  assert.deepEqual({ progress: state.chapterProgress, coins: state.coins, xp: state.xp, orders: state.stats.orders }, before);
});

test("chapter progress and Firstlight normalize, persist, reverse, and survive rebirth without economy effects", () => {
  assert.equal(game.SAVE_VERSION, 9);
  for (const [value, expected] of [[-9, 0], [2.9, 2], [999, 3]]) {
    const hostile = chapterReadyState();
    hostile.chapterProgress = value;
    hostile.customization.selected = "firstlight";
    const normalized = game.normalizeState(hostile, NOW);
    assert.equal(normalized.chapterProgress, expected);
    assert.equal(normalized.customization.selected, expected === 3 ? "firstlight" : "midnight");
  }
  const state = chapterReadyState();
  state.level = game.PRESTIGE_CONFIG.unlockLevel;
  state.chapterProgress = 3;
  const baseline = { coins: state.coins, xp: state.xp, stardust: state.stardust, order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) };
  assert.equal(game.selectCosmetic(state, "firstlight"), true);
  assert.equal(game.selectCosmetic(state, "midnight"), true);
  assert.equal(game.selectCosmetic(state, "firstlight"), true);
  assert.deepEqual({ coins: state.coins, xp: state.xp, stardust: state.stardust, order: game.orderMultiplier(state, NOW, "tonic"), brew: game.brewSpeedMultiplier(state), gather: game.manualGatherAmount(state) }, baseline);
  const reloaded = game.parseSave(JSON.stringify(state), NOW + 1).state;
  assert.equal(reloaded.customization.selected, "firstlight");
  const reborn = game.performPrestige(reloaded, 3, NOW + 2);
  assert.equal(reborn.chapterProgress, 3);
  assert.equal(reborn.customization.selected, "firstlight");
  assert.equal(game.cosmeticUnlocked(reborn, "firstlight"), true);
  const reverseLocked = game.normalizeState({ ...state, chapterProgress: 2, customization: { selected: "firstlight" } }, NOW);
  assert.equal(reverseLocked.customization.selected, "midnight");
  assert.equal(game.defaultState(NOW).chapterProgress, 0, "a full owner reset starts with no chapter progress");
});

test("After the Stars is a dormant ordered four-step post-rebirth quest", () => {
  assert.deepEqual(game.AFTER_STARS_STEPS.map(step => [step.customerId, step.recipeId, step.title]), [
    ["customer-0", "tonic", "The Oven Remembers"],
    ["customer-3", "clarity", "A New Route"],
    ["customer-6", "bloom", "Roots After Starlight"],
    ["customer-9", "sun", "The Dawnthread Hem"],
  ]);
  const firstCycle = game.defaultState(NOW);
  firstCycle.level = 7;
  game.ensureOrders(firstCycle, () => 0);
  assert.equal(game.afterStarsStatus(firstCycle).active, false);
  assert.equal(firstCycle.orders.some(game.isAfterStarsOrder), false);
  assert.equal(game.cosmeticUnlocked(firstCycle, "dawnthread"), false);

  const state = game.defaultState(NOW);
  state.stats.prestiges = 1;
  game.ensureOrders(state, () => 0);
  assert.equal(state.orders.filter(game.isAfterStarsOrder).length, 1);
  assert.equal(state.orders.filter(order => !game.isReservedOrder(order)).length, 2);
  for (let stepIndex = 0; stepIndex < game.AFTER_STARS_STEPS.length; stepIndex += 1) {
    const authored = game.AFTER_STARS_STEPS[stepIndex];
    const recipe = game.recipeById(authored.recipeId);
    state.level = Math.max(state.level, recipe.unlock);
    game.ensureOrders(state, () => 0);
    const order = state.orders.find(game.isAfterStarsOrder);
    assert.equal(order.afterStarsStep, stepIndex);
    assert.deepEqual({ customerId: order.customerId, recipeId: order.recipeId, quantity: order.quantity, reward: order.reward, xp: order.xp }, {
      customerId: authored.customerId, recipeId: authored.recipeId, quantity: 1,
      reward: Math.round(recipe.sell * 1.55), xp: Math.round(11 + recipe.unlock * 3),
    });
    state.potions[recipe.id] = 1;
    const before = { orders: state.stats.orders, daily: state.daily.orders, weekly: state.weekly.progress, delivered: state.discovery.delivered[recipe.id] };
    const result = game.fulfillOrder(state, order.id, NOW + stepIndex * 1000, () => 0);
    assert.equal(result.afterStars.step, stepIndex);
    assert.equal(state.afterStars.step, stepIndex + 1);
    assert.deepEqual({ orders: state.stats.orders, daily: state.daily.orders, weekly: state.weekly.progress, delivered: state.discovery.delivered[recipe.id] }, {
      orders: before.orders + 1, daily: before.daily + 1, weekly: before.weekly + 1, delivered: before.delivered + 1,
    });
    assert.ok(state.orders.filter(order => !game.isReservedOrder(order)).length >= 2);
    assert.equal(game.fulfillOrder(state, order.id, NOW, () => 0), null, "a delivered quest step cannot repeat");
  }
  assert.equal(game.afterStarsStatus(state).complete, true);
  assert.equal(state.orders.some(game.isAfterStarsOrder), false);
  assert.equal(game.cosmeticUnlocked(state, "dawnthread"), true);
  assert.equal(game.selectCosmetic(state, "dawnthread"), true);
  assert.equal(game.selectCosmetic(state, "midnight"), true, "the final look remains reversible");
});

test("After the Stars shares the reserved slot and canonicalizes missing or forged orders", () => {
  const specialFirst = game.defaultState(NOW);
  specialFirst.level = 4;
  specialFirst.commissions.invitations = 1;
  game.ensureOrders(specialFirst, () => 0);
  assert.ok(game.selectSignatureCommission(specialFirst, "mira-dawn"));
  specialFirst.stats.prestiges = 1;
  game.ensureOrders(specialFirst, () => 0);
  assert.equal(specialFirst.orders.filter(game.isSignatureOrder).length, 0);
  assert.equal(specialFirst.orders.filter(game.isAfterStarsOrder).length, 1);
  assert.equal(specialFirst.commissions.selectedId, "mira-dawn", "the lower-priority selected request waits without being cancelled");
  assert.equal(specialFirst.orders.filter(order => !game.isReservedOrder(order)).length, 2);
  assert.equal(specialFirst.commissions.invitations, 0);

  const questFirst = game.defaultState(NOW);
  questFirst.level = 4;
  questFirst.stats.prestiges = 1;
  questFirst.commissions.invitations = 2;
  game.ensureOrders(questFirst, () => 0);
  assert.equal(game.selectSignatureCommission(questFirst, "moss-rainpath"), null);
  assert.equal(questFirst.commissions.invitations, 2, "a quest order never consumes saved invitations");

  const forged = game.defaultState(NOW);
  forged.level = 4;
  forged.stats.prestiges = 1;
  forged.afterStars = { step: 0 };
  forged.orders = [{ id: 77, afterStarsStep: 0, customerId: "customer-11", customer: "Forgery", avatar: "X", avatarColor: "hotpink", recipeId: "sun", quantity: 2, reward: 999999, xp: 999999 }];
  const restored = game.normalizeState(forged, NOW);
  const order = restored.orders.find(game.isAfterStarsOrder);
  assert.ok(order, "an eligible missing canonical order restores deterministically");
  assert.deepEqual({ customerId: order.customerId, recipeId: order.recipeId, quantity: order.quantity, reward: order.reward, xp: order.xp }, {
    customerId: "customer-0", recipeId: "tonic", quantity: 1, reward: Math.round(game.recipeById("tonic").sell * 1.55), xp: 14,
  });
  assert.deepEqual({ customer: order.customer, avatar: order.avatar, avatarColor: order.avatarColor }, { customer: game.CUSTOMERS[0][0], avatar: game.CUSTOMERS[0][1], avatarColor: game.CUSTOMERS[0][3] });
  assert.equal(restored.orders.filter(order => !game.isReservedOrder(order)).length, 0, "normalization restores only the missing quest order and does not invent saved ordinary orders");
});

test("After the Stars progress survives temporal changes, reload, and later rebirths", () => {
  const state = game.defaultState(NOW);
  state.level = 7;
  state.stats.prestiges = 2;
  state.afterStars.step = 2;
  state.customization.selected = "midnight";
  game.ensureOrders(state, () => 0);
  const activeId = state.orders.find(game.isAfterStarsOrder).id;
  const reloaded = game.parseSave(JSON.stringify(state), NOW + 86400000).state;
  assert.equal(reloaded.afterStars.step, 2);
  assert.equal(reloaded.orders.find(game.isAfterStarsOrder).id, activeId);
  game.resetDailyIfNeeded(reloaded, NOW - 86400000);
  assert.equal(reloaded.afterStars.step, 2);
  const reborn = game.performPrestige(reloaded, 3, NOW + 2000);
  assert.equal(reborn.afterStars.step, 2);
  assert.equal(reborn.orders.length, 0);
  assert.equal(game.afterStarsStatus(reborn).recipeLocked, true);
  reborn.level = game.recipeById("bloom").unlock;
  game.ensureOrders(reborn, () => 0);
  assert.equal(reborn.orders.find(game.isAfterStarsOrder).afterStarsStep, 2);
  assert.equal(reborn.orders.filter(order => !game.isReservedOrder(order)).length, 2);

  const malformed = game.normalizeState({ ...state, afterStars: { step: -999 } }, NOW);
  assert.equal(malformed.afterStars.step, 0);
  const oversized = game.normalizeState({ ...state, afterStars: { step: 999 } }, NOW);
  assert.equal(oversized.afterStars.step, 4);
});

test("the deterministic gather-brew-collect-deliver-upgrade loop succeeds", () => {
  const state = game.defaultState(NOW);
  game.ensureOrders(state, () => 0);
  game.addRandomIngredients(state, 1, () => 0);
  assert.equal(game.startBrew(state, "tonic", NOW), true);
  assert.ok(game.collectBrew(state, NOW + 30000));
  state.orders[0] = { ...state.orders[0], recipeId: "tonic", quantity: 1, reward: 20, xp: 20 };
  assert.ok(game.fulfillOrder(state, state.orders[0].id, NOW + 30000, () => 0));
  state.coins = 70;
  assert.ok(game.buyUpgrade(state, "garden"));
  assert.equal(state.upgrades.garden, 1);
});

test("reserved order actions deliver only current canonical ready orders without navigation or mutation", () => {
  const chapter = chapterReadyState();
  game.ensureOrders(chapter, () => 0);
  const special = game.defaultState(NOW);
  special.level = 4;
  special.commissions.invitations = 1;
  game.ensureOrders(special, () => 0);
  assert.ok(game.selectSignatureCommission(special, "mira-dawn"));
  const afterStars = game.defaultState(NOW);
  afterStars.level = 4;
  afterStars.stats.prestiges = 1;
  game.ensureOrders(afterStars, () => 0);

  const expectPureAction = (state, order, expected, detail) => {
    const snapshot = JSON.stringify(state);
    assert.equal(game.orderAction(state, order, NOW), expected, detail);
    assert.equal(JSON.stringify(state), snapshot, `${detail} must not mutate the complete state`);
  };
  for (const [label, state, predicate] of [
    ["Village Chapter", chapter, game.isChapterOrder],
    ["Villager Special Request", special, game.isSignatureOrder],
    ["After the Stars", afterStars, game.isAfterStarsOrder],
  ]) {
    const order = state.orders.find(predicate);
    const recipe = game.recipeById(order.recipeId);
    state.potions[recipe.id] = 0;
    state.ingredients = Object.fromEntries(Object.keys(state.ingredients).map(id => [id, 0]));
    state.brew = null;
    expectPureAction(state, order, null, `${label} does not receive Gather`);
    for (const [id, count] of Object.entries(recipe.ingredients)) state.ingredients[id] = count;
    expectPureAction(state, order, null, `${label} does not receive Brew`);
    state.brew = { recipeId: recipe.id, startedAt: NOW, endsAt: NOW + 1000, durationMs: 1000, assistUses: 0 };
    expectPureAction(state, order, null, `${label} does not receive View brew`);
    state.brew.endsAt = NOW;
    expectPureAction(state, order, null, `${label} does not receive Collect brew`);
    state.potions[recipe.id] = order.quantity;
    expectPureAction(state, order, "deliver", `${label} exposes Deliver when ready`);
  }

  const unknownCommission = game.defaultState(NOW);
  unknownCommission.potions.tonic = 1;
  unknownCommission.orders = [{ id: 71, commissionId: "forged-request", recipeId: "tonic", quantity: 1, reward: 20, xp: 14 }];
  assert.equal(game.isReservedOrder(unknownCommission.orders[0]), true);
  expectPureAction(unknownCommission, unknownCommission.orders[0], null, "an unknown commission marker stays disabled");

  const staleQuest = game.defaultState(NOW);
  staleQuest.level = 4;
  staleQuest.stats.prestiges = 1;
  game.ensureOrders(staleQuest, () => 0);
  staleQuest.orders[0] = { ...staleQuest.orders[0], afterStarsStep: 1 };
  staleQuest.potions.tonic = 1;
  expectPureAction(staleQuest, staleQuest.orders[0], null, "a stale After the Stars marker stays disabled");

  const forgedChapter = chapterReadyState();
  game.ensureOrders(forgedChapter, () => 0);
  forgedChapter.orders[0] = { ...forgedChapter.orders[0], quantity: 2 };
  forgedChapter.potions.tonic = 2;
  expectPureAction(forgedChapter, forgedChapter.orders[0], null, "a noncanonical chapter requirement stays disabled");

  const mixedMarkers = chapterReadyState();
  game.ensureOrders(mixedMarkers, () => 0);
  mixedMarkers.orders[0] = { ...mixedMarkers.orders[0], commissionId: "mira-dawn" };
  mixedMarkers.potions.tonic = 1;
  expectPureAction(mixedMarkers, mixedMarkers.orders[0], null, "mixed reserved markers stay disabled");

  const currentChapter = chapterReadyState();
  game.ensureOrders(currentChapter, () => 0);
  currentChapter.potions.tonic = 1;
  expectPureAction(currentChapter, { ...currentChapter.orders[0] }, null, "an off-board reserved copy stays disabled");
});

test("ordinary order actions preserve every state-aware branch and never mutate gameplay", () => {
  const state = game.defaultState(NOW);
  state.orders = [{ id: 41, recipeId: "tonic", quantity: 1, reward: 20, xp: 11 }];
  const order = state.orders[0];
  const expectAction = (expected, candidate = order) => {
    const snapshot = JSON.stringify(state);
    assert.equal(game.orderAction(state, candidate, NOW), expected);
    assert.equal(JSON.stringify(state), snapshot, `${expected || "no"} action decision must not mutate gameplay state`);
  };

  state.potions.tonic = 1;
  expectAction("deliver");
  state.potions.tonic = 0;
  state.brew = { recipeId: "clarity", startedAt: NOW, endsAt: NOW + 1, durationMs: 1000, assisted: false };
  expectAction("view-brew");
  state.brew.endsAt = NOW;
  expectAction("collect-brew");
  state.brew = null;
  state.ingredients = { herb: 3, mushroom: 1, crystal: 0, mist: 0, ember: 0, mint: 0, lavender: 0 };
  expectAction("brew");
  state.ingredients.mushroom = 0;
  expectAction("gather");

  expectAction(null, { id: "stale", recipeId: "unknown", quantity: 1 });
});

console.log(`All ${passed} game logic tests passed.`);
