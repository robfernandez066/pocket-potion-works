"use strict";

(function exposePocketPotionContent(root, factory) {
  const relationshipContent = typeof module === "object" && module.exports ? require("./relationship-content.js") : root && root.PPWRelationshipContent;
  const api = factory(relationshipContent);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PPWContent = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPocketPotionContent(relationshipContent) {
  if (!relationshipContent?.DELIVERY_NARRATIVE_PILOTS) throw new Error("Pocket Potion Works relationship content is unavailable. Load relationship-content.js before content-data.js.");
  const { DELIVERY_NARRATIVE_PILOTS } = relationshipContent;

  const CUSTOMER_CONTENT = Object.freeze([
    Object.freeze({ orderLines: Object.freeze(["The ovens wake before I do.", "A warm loaf deserves a steady baker.", "Could you bottle a calmer morning?"]), stories: Object.freeze(["Mira leaves the first bun of every batch on the village well for whoever starts work earliest.", "She learned to bake from a flour-smudged notebook whose final page is still blank.", "Mira decides the blank page should hold a recipe the whole village helps invent."]) }),
    Object.freeze({ orderLines: Object.freeze(["The moss has been whispering again.", "A hedgerow sent me with this request.", "The old oaks think this one is important."]), stories: Object.freeze(["Old Moss knows which footpaths appear only after rain.", "He once planted a walking stick; it grew into the crooked willow by the pond.", "He admits the forest does not actually talk loudly. He has simply become very good at listening."]) }),
    Object.freeze({ orderLines: Object.freeze(["My encore could use a little courage.", "This melody needs one brighter note.", "A sip before the curtain, please."]), stories: Object.freeze(["Juniper practices behind the mill because the turning wheel keeps perfect time.", "Her favorite song began as a tune for a nervous moonmoth.", "She finally plays that song in the square and names it after the alchemist who listened first."]) }),
    Object.freeze({ orderLines: Object.freeze(["Special delivery, gently hurried!", "The west route is especially uphill today.", "Rain or shine, the post must sparkle."]), stories: Object.freeze(["Pip sorts letters by destination, urgency, and how much hope seems tucked inside.", "His fastest route crosses three gardens and includes a mandatory biscuit stop.", "Pip starts a tiny free post service for letters people are not brave enough to send alone."]) }),
    Object.freeze({ orderLines: Object.freeze(["Something refined, but not terribly sensible.", "The conservatory requires a flourish.", "Surprise me within impeccable limits."]), stories: Object.freeze(["Lady Bramble secretly trims the palace hedges into animals after sunset.", "Her grandest hat was rescued from a bramble bush and still attracts robins.", "She opens the conservatory for village picnics and insists the muddy footprints improve the marble."]) }),
    Object.freeze({ orderLines: Object.freeze(["For a perfectly controlled experiment.", "The forge needs one less explosion today.", "I have goggles, tongs, and a theory."]), stories: Object.freeze(["Tink labels every invention, including the kettle and one unusually dependable spoon.", "The small brass bird on the forge roof was his first machine that chose where to fly.", "He stops calling mistakes scrap and builds them into a wind chime for the workshop door."]) }),
    Object.freeze({ orderLines: Object.freeze(["The seedlings asked very politely.", "My nasturtiums need encouragement.", "A little help for the greenhouse, please."]), stories: Object.freeze(["Fern can identify every garden in the village by the smell of its soil.", "She keeps a stubborn seed in a blue pot and greets it every morning.", "The stubborn seed finally blooms; Fern names the new flower Patience."]) }),
    Object.freeze({ orderLines: Object.freeze(["Steady hands make kind journeys.", "The road is long, but the weather is fair.", "One bottle for the trail ahead."]), stories: Object.freeze(["Captain Wren maps good resting spots as carefully as distant roads.", "Her compass points toward the place she is most needed, which is rarely north.", "She adds Pocket Potion Works to the map as the village's official safe harbor."]) }),
    Object.freeze({ orderLines: Object.freeze(["The millstones and I are on the late shift.", "A little shine for a floury night.", "Could you brighten the next sackful?"]), stories: Object.freeze(["Nell knows the mill's nighttime creaks well enough to hum their harmony.", "She grinds a special flour for the moonfair, though it dusts everything silver.", "Nell invites the village to paint the mill sails, then keeps every cheerful handprint."]) }),
    Object.freeze({ orderLines: Object.freeze(["This hem refuses to see reason.", "I need a brighter stitch of inspiration.", "Something elegant for a tangled afternoon."]), stories: Object.freeze(["Rowan saves every ribbon end because even the shortest piece can mend something.", "He sews tiny silver pockets inside winter coats for lucky stones and secret notes.", "His patchwork festival banner uses a scrap from every household in the village."]) }),
    Object.freeze({ orderLines: Object.freeze(["This footnote is resisting cataloging.", "The archives require a clearer afternoon.", "I have found a mystery between paragraphs."]), stories: Object.freeze(["Sol can tell who borrowed a book by the crumbs left between its pages.", "A missing catalogue card leads him to a shelf of villagers' unfinished stories.", "He leaves several pages blank so new village tales always have somewhere to belong."]) }),
    Object.freeze({ orderLines: Object.freeze(["The hives are rehearsing a tiny opera.", "A calmer buzz would be lovely.", "The bees voted for this request."]), stories: Object.freeze(["Bea names each hive after a different kind of weather.", "The bees build one honeycomb shaped exactly like the village clock.", "Bea bottles the season's last honey for a feast where everyone brings something sweet."]) }),
  ]);

  const SIGNATURE_COMMISSIONS = Object.freeze([
    Object.freeze({ id: "mira-dawn", customerId: "customer-0", recipeId: "tonic", title: "The First Oven", request: "A steady bottle for the village's earliest batch.", keepsake: Object.freeze({ mark: "FS", name: "Flour-Sun Pin", description: "Mira's tiny sunrise, dusted with flour." }) }),
    Object.freeze({ id: "moss-rainpath", customerId: "customer-1", recipeId: "moon", title: "The Rainpath Walk", request: "Moonlight for a footpath that appears after rain.", keepsake: Object.freeze({ mark: "WK", name: "Willow Knot", description: "A smooth knot from Old Moss's crooked willow." }) }),
    Object.freeze({ id: "juniper-encore", customerId: "customer-2", recipeId: "heart", title: "The Moonmoth Encore", request: "One brave cordial before the song's first public encore.", keepsake: Object.freeze({ mark: "SN", name: "Silver Note", description: "A bright note from Juniper's moonmoth song." }) }),
    Object.freeze({ id: "pip-hilltop", customerId: "customer-3", recipeId: "clarity", title: "Hilltop Express", request: "A clear head for the steepest route before sundown.", keepsake: Object.freeze({ mark: "BP", name: "Brass Postmark", description: "Pip's mark for a letter delivered with care." }) }),
    Object.freeze({ id: "bramble-toast", customerId: "customer-4", recipeId: "aurora", title: "The Conservatory Toast", request: "Dawn colors for the conservatory's first village picnic.", keepsake: Object.freeze({ mark: "RC", name: "Robin Cameo", description: "A tiny robin from Lady Bramble's rescued hat." }) }),
    Object.freeze({ id: "tink-trial", customerId: "customer-5", recipeId: "quiet", title: "The Quiet Forge Trial", request: "A calmer brew for one perfectly controlled experiment.", keepsake: Object.freeze({ mark: "CG", name: "Copper Gear", description: "The first gear Tink decided was not scrap." }) }),
    Object.freeze({ id: "fern-patience", customerId: "customer-6", recipeId: "bloom", title: "Patience in Bloom", request: "A gentle tea for the stubborn seed in the blue pot.", keepsake: Object.freeze({ mark: "BS", name: "Blue Seed", description: "A keepsake from Fern's famously patient flower." }) }),
    Object.freeze({ id: "wren-harbor", customerId: "customer-7", recipeId: "way", title: "A Safe Harbor", request: "A cordial for mapping the village's kindest resting places.", keepsake: Object.freeze({ mark: "CR", name: "Compass Rose", description: "Wren's compass rose points toward whoever needs help." }) }),
    Object.freeze({ id: "nell-moonfair", customerId: "customer-8", recipeId: "lantern", title: "The Silver Mill Shift", request: "Lantern light for flour that sparkles after midnight.", keepsake: Object.freeze({ mark: "MS", name: "Mill-Sail Charm", description: "A painted charm shaped like Nell's cheerful mill sails." }) }),
    Object.freeze({ id: "rowan-banner", customerId: "customer-9", recipeId: "sun", title: "The Festival Banner", request: "Bottled sunshine for the banner's final golden stitch.", keepsake: Object.freeze({ mark: "PS", name: "Patchwork Star", description: "A star sewn from Rowan's smallest ribbon ends." }) }),
    Object.freeze({ id: "sol-catalog", customerId: "customer-10", recipeId: "dream", title: "The Blank-Page Catalogue", request: "A dreaming draught for stories not written yet.", keepsake: Object.freeze({ mark: "IB", name: "Ivory Bookmark", description: "Sol's bookmark leaves room for the next village tale." }) }),
    Object.freeze({ id: "bea-feast", customerId: "customer-11", recipeId: "starlight", title: "The Last Honey Feast", request: "A starlit bottle for the feast's final jar of honey.", keepsake: Object.freeze({ mark: "HS", name: "Honeycomb Seal", description: "Bea's seal for a season shared sweetly." }) }),
  ]);

  const AFTER_STARS_STEPS = Object.freeze([
    Object.freeze({ id: "oven-remembers", title: "The Oven Remembers", customerId: "customer-0", recipeId: "tonic", request: "A meadow tonic for the first oven lit beneath the changed stars." }),
    Object.freeze({ id: "new-route", title: "A New Route", customerId: "customer-3", recipeId: "clarity", request: "A clarity elixir for mapping a post road through the starborn morning." }),
    Object.freeze({ id: "roots-after-starlight", title: "Roots After Starlight", customerId: "customer-6", recipeId: "bloom", request: "Cloudbloom tea to help the garden remember its roots after starlight." }),
    Object.freeze({ id: "dawnthread-hem", title: "The Dawnthread Hem", customerId: "customer-9", recipeId: "sun", request: "Bottled sunrise for the final golden hem of a dawnthread banner." }),
  ]);

  const VILLAGE_CHAPTER = Object.freeze({
    id: "mira-village-loaf",
    title: "The Village Loaf",
    customerId: "customer-0",
    steps: Object.freeze([
      Object.freeze({ id: "steady-first-line", title: "A Steady First Line", recipeId: "tonic", request: "A Meadow Tonic for a steady first line on the notebook's blank final page.", payoff: Object.freeze({ kicker: "THE VILLAGE LOAF · 1 OF 3", title: "The first line", body: "Mira writes the tonic beside a sketch of the village's shared loaf. The blank page finally has a beginning.", footer: "Next: Notes in the Margin" }) }),
      Object.freeze({ id: "notes-in-margin", title: "Notes in the Margin", recipeId: "clarity", request: "A Clarity Elixir for gathering every neighbor's flour-smudged notes in the margin.", payoff: Object.freeze({ kicker: "THE VILLAGE LOAF · 2 OF 3", title: "Room for every hand", body: "Clear notes gather around Mira's first line—small ideas from every kitchen in the village.", footer: "Next: A Shared Sunrise" }) }),
      Object.freeze({ id: "shared-sunrise", title: "A Shared Sunrise", recipeId: "sun", request: "A Bottled Sunrise for the shared loaf's final warm, golden line.", payoff: Object.freeze({ kicker: "THE VILLAGE LOAF · COMPLETE", title: "A shared sunrise", body: "Mira fills the final page with a loaf shaped by the whole village. The Firstlight Bakery Workshop Look was unlocked.", footer: "Firstlight Bakery is ready in Journal" }) }),
    ]),
  });

  const RECIPE_LORE = Object.freeze({
    tonic: "A meadow remedy first brewed for gardeners who forgot to stop for lunch.",
    clarity: "Its square shimmer is said to put wandering thoughts back on the same path.",
    moon: "Moonmilk keeps a silver glow borrowed from the quietest hour of night.",
    bloom: "Cloudbloom Tea carries the fresh scent of rain that has not fallen yet.",
    sun: "Each bottle holds the golden instant when dawn reaches the village roofs.",
    heart: "Kindheart Cordial warms most when poured for someone else.",
    dream: "This draught gathers gentle dreams and leaves troublesome ones at the door.",
    starlight: "The final philter reflects constellations that only patient alchemists can see.",
    lantern: "A moonfair favorite for carrying lanterns home.",
    quiet: "This tea helps small sounds settle softly.",
    way: "This cordial remembers every welcoming doorstep.",
    aurora: "This nectar keeps dawn colors for late celebrations.",
  });

  return Object.freeze({ DELIVERY_NARRATIVE_PILOTS, CUSTOMER_CONTENT, SIGNATURE_COMMISSIONS, AFTER_STARS_STEPS, VILLAGE_CHAPTER, RECIPE_LORE });
});
