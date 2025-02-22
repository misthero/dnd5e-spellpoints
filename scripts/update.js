import { SP_MODULE_NAME, SP_ITEM_ID } from "./main.js";
export const checkUpdate = function () {
  const settingExists = typeof game.settings.settings.get(SP_MODULE_NAME + '.spPrevVersion') === 'undefined' ? 0 : 1;
  let spPrevVersion = 0;

  if (settingExists) {
    spPrevVersion = game.settings.get(SP_MODULE_NAME, "spPrevVersion");
  }

  let updateSuccess = true;

  // update 2.4.00
  if (foundry.utils.isNewerVersion('2.4.00', spPrevVersion)) {
    console.log("SpellPoints launch update 2.4.00");
    updateSuccess = update2_4_00();
  }
  // update 2.4.12
  if (foundry.utils.isNewerVersion('2.4.12', spPrevVersion)) {
    console.log("SpellPoints launch update 2.4.12");
    updateSuccess = update2_4_12();
  }

  // update previous version setting
  if (updateSuccess) {
    const currentVersion = game.modules.get(SP_MODULE_NAME).version;
    game.settings.set(SP_MODULE_NAME, "spPrevVersion", currentVersion);
  }
}

// update to 2.4.00
async function update2_4_00() {
  if (!game.user.isGM) {
    return false;
  }
  // find spellpoint items
  const spItems = game.items.filter((i) => {
    const is_sp = i.flags?.core?.sourceId === 'Compendium.dnd5e-spellpoints.module-items.Item.' + SP_ITEM_ID
      || i.system?.source?.custom == 'Spell Points';
    return is_sp;
  });

  // remove activities from spellpoints items
  for (const s in spItems) {
    const FoundItem = spItems[s];
    if (FoundItem.system.activities.size > 0) {
      FoundItem.system.activities.forEach((n) => {
        n.delete();
      })
    }
  }

  return true;
}

/** add class and subclass type to imported spell points items */
async function update2_4_12() {
  if (!game.user.isGM) {
    return false;
  }

  // find spellpoint items
  const spItems = game.items.filter((i) => {
    const is_sp = i.flags?.core?.sourceId === 'Compendium.dnd5e-spellpoints.module-items.Item.' + SP_ITEM_ID
      || i.system?.source?.custom == 'Spell Points';
    return is_sp;
  });

  for (const s in spItems) {
    const FoundItem = spItems[s];
    FoundItem.update({
      [`system.type.value`]: 'class',
      [`system.type.subtype`]: 'sp',
      [`system.type.label`]: game.i18n.format(SP_MODULE_NAME + ".spClassSubtype")
    })
  }

  return true;
}