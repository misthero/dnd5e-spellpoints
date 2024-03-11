import { SpellPointsForm } from "./settings-form.js";
import { SpellPoints } from "./spellpoints.js";

export const MODULE_NAME = 'dnd5e-spellpoints';

export let dndV3 = false;

CONFIG.debug.hooks = true;

console.log('start');

var compareVersions = function (a, b) {
  const versionA = a.split('.').map(Number);
  const versionB = b.split('.').map(Number);
  console.log("SP versionA", versionA);

  for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
    const numA = versionA[i] || 0;
    const numB = versionB[i] || 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}

console.log('SP COMP', compareVersions("2.0.5", "1.0.15"));  // returns 1
console.log('SP COMP', compareVersions("1.2.2", "1.2.0"));   // returns 1
console.log('SP COMP', compareVersions("1.0.5", "1.1.0"));   // returns -1
console.log('SP COMP', compareVersions("1.0.5", "1.00.05")); // returns 0
console.log('SP COMP', compareVersions("0.9.9.9.9.9.9", "1.0.0.0.0.0.0")); // returns -1

Handlebars.registerHelper("spFormat", (path, ...args) => {
  return game.i18n.format(path, args[0].hash);
});

Hooks.on('init', () => {
  console.log('SpellPoints init');
  if (typeof game.dnd5e.version === 'string') {
    dndV3 = compareVersions(game.dnd5e.version, '2.99.99') == 1;
    console.log('SP dndversion3', dndV3);
  } else {
    console.log('SP isundefined version');
  }


  /** should spellpoints be enabled */
  game.settings.register(MODULE_NAME, "spEnableSpellpoints", {
    name: "Enable Spell Points system",
    hint: "Enables or disables spellpoints for casting spells, this will override the slot cost for player tokens.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.registerMenu(MODULE_NAME, MODULE_NAME, {
    name: "dnd5e-spellpoints.form",
    label: "dnd5e-spellpoints.form-title",
    hint: "dnd5e-spellpoints.form-hint",
    icon: "fas fa-magic",
    type: SpellPointsForm,
    restricted: true
  });

  game.settings.register(MODULE_NAME, "settings", {
    name: "Spell Points Settings",
    scope: "world",
    default: SpellPoints.defaultSettings,
    type: Object,
    config: false,
    //onChange: (x) => window.location.reload()
  });

  let _betterRollsActive = false;
  for (const mod of game.data.modules) {
    if (mod.id == "betterrolls5e" && mod.active) {
      _betterRollsActive = true;
      break;
    }
  }

});

/** spell launch dialog **/
Hooks.on("renderAbilityUseDialog", async (dialog, html, formData) => {
  SpellPoints.checkDialogSpellPoints(dialog, html, formData);
})

Hooks.on("updateItem", SpellPoints.calculateSpellPoints);
Hooks.on("createItem", SpellPoints.calculateSpellPoints);
Hooks.on("preDeleteItem", SpellPoints.removeItemFlag);
Hooks.on("preCreateItem", SpellPoints.addSpellPointsItemFlag);

//Hooks.on("dnd5e.computeLeveledProgression", SpellPoints.calculateSpellPointsProgression);

Hooks.on("renderActorSheet5e", (app, html, data) => {
  SpellPoints.mixedMode(app, html, data);
});

/**
  * Hook that is triggered after the SpellPointsForm has been rendered. This
  * sets the visiblity of the custom formula fields based on if the current
  * formula is a custom formula.
  */
Hooks.on('renderSpellPointsForm', (spellPointsForm, html, data) => {
  const isCustom = (data.isCustom || "").toString().toLowerCase() == "true"
  spellPointsForm.setCustomOnlyVisibility(isCustom)
})

Hooks.on("dnd5e.preItemUsageConsumption", (item, consume, options, update) => {
  SpellPoints.castSpell(item, consume, options, update);
})