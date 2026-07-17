"use strict";

(() => {
  const PORTRAITS = { "customer-0": "mira", "customer-6": "fern" };
  const ingredientSpriteAttr = id => ` data-ingredient-sprite="${id}"`;
  const potionAttr = recipe => ` data-sprite="${recipe.id}"`;
  const potionSpriteMarkup = (recipe, className = "potion-inline") => `<span class="${className}"${potionAttr(recipe)} aria-hidden="true">${recipe.icon}</span>`;
  const portraitMarkup = id => PORTRAITS[id] ? `<span class="villager-portrait ${PORTRAITS[id]}-portrait" aria-hidden="true"></span>` : "";
  const customerAvatarMarkup = (id, avatar, color) => `<span class="customer-avatar" style="--avatar:${color}">${portraitMarkup(id) || avatar}</span>`;
  const formatNumber = value => Math.floor(value).toLocaleString("en-US");
  const ingredientCostText = (recipe, ingredients) => Object.entries(recipe.ingredients).map(([id, count]) => `<span class="ingredient-cost-item"><span class="ingredient-cost-icon"${ingredientSpriteAttr(id)} aria-hidden="true">${ingredients[id].icon}</span>${count}</span>`).join("");

  const ingredientCards = (ingredients, level, targetId, counts) => Object.entries(ingredients).map(([id, item]) => {
    const locked = item.unlock > level;
    const selected = targetId === id;
    return `<button class="ingredient-card ${selected ? "is-selected" : ""}" type="button" style="--ingredient-bg:${item.color}" ${locked ? "disabled" : `data-gather-target="${id}" aria-pressed="${selected}"`}>
      <span class="ingredient-icon"${locked ? "" : ingredientSpriteAttr(id)}>${locked ? "?" : item.icon}</span>
      <strong>${locked ? `Level ${item.unlock}` : formatNumber(counts[id])}</strong>
      <small>${locked ? "Locked" : item.name}</small>
    </button>`;
  }).join("");

  const readyDeliverStrip = (ready, recipeById, orderReward) => ready.length ? `<div><span class="eyebrow">READY TO DELIVER</span><strong>${ready.length} order${ready.length === 1 ? "" : "s"} waiting</strong></div><div class="ready-deliver-actions">${ready.slice(0, 2).map(order => {
    const recipe = recipeById(order.recipeId);
    return `<button data-quick-deliver="${order.id}">${potionSpriteMarkup(recipe)}<span>Deliver ${recipe.name} · +${orderReward(order)}</span></button>`;
  }).join("")}</div>` : "";

  const idleBrewMarkup = () => `<div class="brew-empty"><span>♨</span><div><strong>Your cauldron is ready</strong><small>Choose a recipe below to start brewing.</small></div></div>`;
  const activeBrewMarkup = recipe => `<div class="active-brew">
    <span class="potion-bottle"${potionAttr(recipe)} style="--potion-color:${recipe.color}">${recipe.icon}</span>
    <div><strong>${recipe.name}</strong><small data-brew-remaining></small><div class="brew-progress" role="progressbar" aria-label="${recipe.name} brewing progress" aria-valuemin="0" aria-valuemax="100"><span></span></div></div>
    <button class="collect-button" id="collectBrewButton" disabled>Brewing</button>
  </div>`;

  const recipeListMarkup = (recipes, state, canAffordRecipe, recipeMasteryProgress, masteryCoinBonus, brewSpeedMultiplier, ingredients) => recipes.map(recipe => {
    const locked = recipe.unlock > state.level;
    const disabled = locked || Boolean(state.brew) || !canAffordRecipe(recipe);
    let buttonLabel = "Brew";
    if (locked) buttonLabel = `Lv. ${recipe.unlock}`;
    else if (state.brew) buttonLabel = "Busy";
    else if (!canAffordRecipe(recipe)) buttonLabel = "Need items";
    const requested = state.orders.some(order => order.recipeId === recipe.id);
    const mastery = recipeMasteryProgress(recipe.id);
    const masteryBonus = mastery.rank * masteryCoinBonus * 100;
    const masteryText = mastery.next ? `Mastery ${mastery.rank} · ${mastery.count}/${mastery.next} brews · +${masteryBonus}% order coins` : `Mastery ${mastery.rank} · complete · +${masteryBonus}% order coins`;
    return `<article class="recipe-card ${locked ? "is-locked" : ""} ${requested ? "is-requested" : ""}">
      <span class="potion-bottle"${locked ? "" : potionAttr(recipe)} style="--potion-color:${recipe.color}">${locked ? "?" : recipe.icon}</span>
      <div class="recipe-info"><strong>${locked ? "Mysterious recipe" : recipe.name}</strong><small>${locked ? `Discover at level ${recipe.unlock}` : `${Math.ceil(recipe.seconds / brewSpeedMultiplier())} sec · order value ~${recipe.sell} coins`}</small>${!locked && recipe.description ? `<small class="recipe-description">${recipe.description}</small>` : ""}<div class="recipe-cost">${locked ? "Keep helping villagers to level up" : `${ingredientCostText(recipe, ingredients)} · Owned ${state.potions[recipe.id]}${requested ? " · Requested" : ""}`}</div>${locked ? "" : `<small class="mastery-progress">${masteryText}</small>`}</div>
      <button class="brew-button" data-brew="${recipe.id}" aria-label="${buttonLabel} ${locked ? "locked recipe" : recipe.name}" ${disabled ? "disabled" : ""}>${buttonLabel}</button>
    </article>`;
  }).join("");

  const orderListMarkup = (cards, customerConfig) => cards.map(({ order, recipe, owned, action, commission, questStep, chapterStep, customer, reward }) => {
    const label = { gather: "Gather", brew: "Brew", "view-brew": "View brew", "collect-brew": "Collect brew" }[action];
    const html = action === "deliver" ? `<button class="fulfill-button" data-order="${order.id}">Deliver</button>` : label ? `<button class="fulfill-button" data-next="${order.id}">${label}</button>` : `<button class="fulfill-button" data-order="${order.id}" disabled>Not ready</button>`;
    const towardHeart = customer.deliveries % customerConfig.deliveriesPerHeart;
    const trust = customer.hearts >= customerConfig.maxHearts ? `${"♥".repeat(customer.hearts)} trusted friend` : `${"♥".repeat(customer.hearts)}${"♡".repeat(customerConfig.maxHearts - customer.hearts)} · ${towardHeart}/${customerConfig.deliveriesPerHeart} toward next favor`;
    const questRibbon = questStep ? `<div class="commission-ribbon">After the Stars · ${questStep.title}</div>` : "";
    return `<article class="order-card ${commission ? "is-commission" : questStep ? "is-after-stars" : chapterStep ? "is-chapter" : ""}">${questRibbon}
      ${commission ? `<div class="commission-ribbon">Villager Special Request · ${commission.title}</div>` : ""}
      ${chapterStep ? `<div class="commission-ribbon">Village Chapter</div>` : ""}
      <div class="order-top">${customerAvatarMarkup(order.customerId, order.avatar, order.avatarColor)}<div class="order-copy"><strong>${order.customer}</strong><small>${order.note}</small><small class="customer-trust">${trust}</small></div><div class="order-reward">+${reward} ●<br><small>+${order.xp} XP</small></div></div>
      <div class="order-bottom"><div class="order-request"><span>${potionSpriteMarkup(recipe)} ${order.quantity}×</span> ${recipe.name}<br><small>You have ${owned}</small></div>${html}</div>
    </article>`;
  }).join("");

  const narrativeDeliveryMarkup = (detail, customers) => detail ? `${portraitMarkup(detail.customerId) || customerAvatarMarkup(detail.customerId, customers[Number(detail.customerId.slice(9))][1], customers[Number(detail.customerId.slice(9))][3])}<div class="narrative-copy"><p class="eyebrow">${detail.kicker}</p><h2>${detail.title}</h2><p>${detail.body}</p><small>${detail.footer}</small></div>` : "";

  const commissionChoicesMarkup = (choices, customers, recipeById, state, customerConfig) => choices.length ? `<p>Choose exactly who you want to help. Their request uses one noticeboard slot, builds their trust, and awards the keepsake shown.</p><div class="commission-choice-list">${choices.map(commission => {
    const customer = customers[Number(commission.customerId.slice(9))];
    const recipe = recipeById(commission.recipeId);
    const trust = state.customers[commission.customerId]?.hearts || 0;
    return `<button type="button" class="commission-choice" data-commission-choice="${commission.id}">${customerAvatarMarkup(commission.customerId, customer[1], customer[3])}<span><strong>${customer[0]} · ${commission.title}</strong><small class="commission-potion-line">${potionSpriteMarkup(recipe)} Potion: ${recipe.name}</small><small>Trust: ${trust}/${customerConfig.maxHearts} hearts</small><small>Keepsake: ${commission.keepsake.name}</small></span><b>Choose request</b></button>`;
  }).join("")}</div>` : `<p>No unfinished request matches a potion you know yet. Your invitation is saved until you unlock another potion.</p>`;

  const upgradeListMarkup = (upgrades, state, upgradeCost, upgradePreview) => upgrades.map(upgrade => {
    const level = state.upgrades[upgrade.id];
    const maxed = level >= upgrade.max;
    const cost = upgradeCost(upgrade);
    const preview = upgradePreview(upgrade);
    return `<article class="upgrade-card"><span class="upgrade-icon">${upgrade.icon}</span><div class="upgrade-copy"><strong>${upgrade.name}</strong><small>${preview.path} path · ${upgrade.description}</small><small class="upgrade-preview">${preview.maxed ? `Current: ${preview.current}` : `${preview.current} → ${preview.next}`}</small><small class="upgrade-level">Level ${level} / ${upgrade.max}</small></div><button class="upgrade-button" data-upgrade="${upgrade.id}" ${maxed || state.coins < cost ? "disabled" : ""}>${maxed ? "MAX" : `${cost} ●`}</button></article>`;
  }).join("");

  globalThis.PPWUI = Object.freeze({
    activeBrewMarkup, commissionChoicesMarkup, customerAvatarMarkup, formatNumber, idleBrewMarkup,
    ingredientCards, narrativeDeliveryMarkup, orderListMarkup, portraitMarkup,
    readyDeliverStrip, recipeListMarkup, upgradeListMarkup,
  });
})();
