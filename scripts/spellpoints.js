import { SP_MODULE_NAME, SP_ITEM_ID } from "./main.js";
import { ActorSpellPointsConfig } from "./actor-bar-config.js";

function isset(variable) {
  return (typeof variable !== 'undefined');
}

/**
 * Extracts the mathematical operator from the start of a string
 * @param {string} str - The input string to check
 * @returns {string|null} The operator if found, null if no operator
 */
function extractOperator(str) {
  if (typeof str === 'number') return '+'; // Default to addition for numeric values
  const operators = ['+', '-', '*', '/', '%'];

  const trimmed = str.trim();
  const firstChar = trimmed.charAt(0);

  return operators.includes(firstChar) ? firstChar : null;
}


/**
 * Applies a mathematical operator to two numeric values and returns the result.
 *
 * @param {number} value1 - The first operand.
 * @param {string} operator - The operator to apply ('+', '-', '*', '/', '%').
 * @param {number} value2 - The second operand.
 * @returns {number} The result of applying the operator to the operands.
 */
function applyOperator(value1, operator, value2) {
  switch (operator) {
    case '+': return value1 + value2;
    case '-': return value1 - value2;
    case '*': return value1 * value2;
    case '/': return value1 / value2;
    case '%': return value1 % value2;
    default: return value1 + value2; // Default to addition if operator not recognized
  }
}

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export class SpellPoints {
  static get settings() {
    return foundry.utils.mergeObject(this.defaultSettings, game.settings.get(SP_MODULE_NAME, 'settings'), { insertKeys: true, insertValues: true });
  }

  /**
   * Get default settings object.
   */
  static get defaultSettings() {

    let dndSpellProgression = CONFIG.DND5E.spellProgression;

    const progressionValues = {
      full: 1,
      half: 2,
      third: 3,
      artificer: 1,
      pact: 1,
      none: 0,
    };

    const spellProgression = {};
    for (const [key, label] of Object.entries(dndSpellProgression)) {
      spellProgression[key] = {
        value: progressionValues[key] ?? 0,
        label
      };
    }


    return {
      spResource: 'Spell Points',
      spAutoSpellpoints: true,
      spFormula: 'DMG',
      enableForNpc: false,
      chatMessagePrivate: false,
      spellPointsByLevel: { 1: 4, 2: 6, 3: 14, 4: 17, 5: 27, 6: 32, 7: 38, 8: 44, 9: 57, 10: 64, 11: 73, 12: 73, 13: 83, 14: 83, 15: 94, 16: 94, 17: 107, 18: 114, 19: 123, 20: 133 },
      spellPointsCosts: { 0: 0, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 10, 8: 11, 9: 13 },
      spEnableVariant: false,
      spLifeCost: 2,
      isCustom: false,
      spCustomFormulaBase: '0',
      spCustomFormulaSlotMultiplier: '1',
      spUseLeveled: false,
      spellProgression: spellProgression,
      leveledProgressionFormula: { 1: "0", 2: "0", 3: "0", 4: "0", 5: "0", 6: "0", 7: "", 8: "0", 9: "0", 10: "0", 11: "0", 12: "0", 13: "0", 14: "0", 15: "0", 16: "0", 17: "0", 18: "0", 19: "0", 20: "0" },
      spGmOnly: true,
      spColorL: '#3a0e5f',
      spColorR: '#8a40c7',
      spAnimateBar: true,
      spActivateBar: true,
      spResourceBind: "",
    };
  }


  /**
   * Get a map of formulas to override values specific to those formulas.
   */
  static get formulas() {
    const maxlevel = CONFIG.DND5E.maxLevel;
    const slotLevels = CONFIG.DND5E.spellLevels;

    function buildLevelTable(table) {
      const built = {};
      for (let lvl = 1; lvl <= maxlevel; lvl++) {
        built[lvl] = table[lvl] ?? 0;
      }
      return built;
    }

    function buildSpellPointsCosts(costs) {
      const built = {};
      for (const lvl of Object.keys(slotLevels)) {
        built[lvl] = costs[lvl] ?? 0;
      }
      return built;
    }

    const leveledProgression = buildLevelTable(this.defaultSettings.leveledProgressionFormula);
    const spellPointsByLevel = buildLevelTable(this.defaultSettings.spellPointsByLevel);
    const spellPointsCosts = buildSpellPointsCosts(this.defaultSettings.spellPointsCosts);

    return {
      DMG: {
        isCustom: false,
        spellPointsByLevel: this.defaultSettings.spellPointsByLevel,
        spellPointsCosts: this.defaultSettings.spellPointsCosts,
        spCustomFormulaSlotMultiplier: '',
        spUseLeveled: false
      },
      DMG_CUSTOM: {
        isCustom: true,
        spCustomFormulaBase: '0',
        spCustomFormulaSlotMultiplier: '1',
        spUseLeveled: true,
        spellPointsCosts: spellPointsCosts,
        leveledProgressionFormula: spellPointsByLevel
      },
      AM_CUSTOM: {
        isCustom: true,
        spCustomFormulaBase: 'ceil((2*@spells.pact.level + 1*@spells.spell1.max + 2*@spells.spell2.max + 3*@spells.spell3.max + 4*@spells.spell4.max + 5*@spells.spell5.max + 6*@spells.spell6.max + 7*@spells.spell7.max + 8*@spells.spell8.max + 9*@spells.spell9.max) / 2) + @attributes.spell.dc - 8 - @attributes.prof',
        spCustomFormulaSlotMultiplier: '0',
        spUseLeveled: false,
        spellPointsCosts: buildSpellPointsCosts({ 0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '12', 7: '14', 8: '24', 9: '27' }),
        leveledProgressionFormula: leveledProgression
      },
      CUSTOM: {
        isCustom: true,
        leveledProgressionFormula: leveledProgression,
        spellPointsCosts: spellPointsCosts,
        spCustomFormulaBase: '',
        spUseLeveled: false
      }
    }
  }

  static setSpColors() {
    document.documentElement.style.setProperty('--sp-left-color', SpellPoints.settings.spColorL);
    document.documentElement.style.setProperty('--sp-right-color', SpellPoints.settings.spColorR);
    if (SpellPoints.settings.spAnimateBar) {
      document.documentElement.style.setProperty('--sp-animation-name', 'scroll');
    } else {
      document.documentElement.style.setProperty('--sp-animation-name', 'none');
    }
  }

  static isActorCharacter(actor) {
    return actor?.type === "character" || actor?.type === "npc";
  }

  static getActorFlagSpellPointItem(actor) {
    const item_id = actor?.flags?.dnd5espellpoints?.item;
    return typeof item_id === 'string' && item_id.trim().length > 0 ? item_id : false;
  }

  static isSpellPointsItem(item) {
    return (item.type === "feat" || (item.type === "class" && item.type.subtype === "sp"))
      && (item.flags?.core?.sourceId === "Compendium.dnd5e-spellpoints.module-items.Item." + SP_ITEM_ID
        || item.system.source?.custom === this.settings.spResource);
  }

  static userHasActorOwnership(actor) {
    return actor.testUserPermission(game.user, "OWNER");
  }

  /**
   * Evaluates the given formula with the given actors data. Uses FoundryVTT's Roll
   * to make this evaluation.
   * @param {string|number} formula The rollable formula to evaluate.
   * @param {object} actor The actor used for variables.
   * @return {number} The result of the formula.
   */
  static async withActorData(formula, actor) {
    formula = formula.toString().replace(/\n/g, " ");
    if (!formula || typeof formula !== 'string' || formula.length === 0) {
      return 0;
    }
    let dataObject = actor.getRollData();
    dataObject.flags = actor.flags;
    const r = await Roll.create(formula.toString(), dataObject).evaluate();
    return r.total;
  }

  /**
   * Retrieves the spell points item associated with the given actor.
   *
   * This method attempts to find the spell points item by first checking for an item ID
   * stored in the actor's flags. If not found, it searches the actor's items collection
   * for a feature or class item with a custom source label matching the configured spell points resource.
   *
   * @param {Actor} actor - The actor whose spell points item is to be retrieved.
   * @returns {Item|false} The spell points item if found, otherwise false.
   */
  static getSpellPointsItem(actor) {
    if (!actor) {
      //console.warn("SpellPoints.getSpellPointsItem: No actor provided.");
      return false;
    }
    let items = actor.items;
    const item_id = SpellPoints.getActorFlagSpellPointItem(actor);
    let foundItem = item_id ? items.get(item_id) : false;
    if (!foundItem) {
      let sp = actor.itemTypes.feat.filter(s => s.system.source.custom === this.settings.spResource);

      if (typeof sp === 'undefined') {
        return false;
      } else {
        foundItem = sp[0];
      }
    }
    return foundItem;
  }

  static async updateSpellPointItem(item, value = null, max = null, spent = null, options = {}) {
    if (!item) {
      return;
    }

    const currentUses = item.system.uses ?? {};
    const nextUses = {
      max: max !== null ? max : currentUses.max,
      value: value !== null ? value : currentUses.value,
      spent: spent !== null ? spent : currentUses.spent
    };

    const preference = (spent !== null && value === null) ? "spent" : "value";
    const normalizedUses = SpellPoints.normalizeUses(nextUses, preference);

    const hasChanges = ["max", "value", "spent"].some((key) => normalizedUses[key] !== currentUses[key]);
    if (!hasChanges) {
      return;
    }

    item.update({
      "system.uses.max": normalizedUses.max,
      "system.uses.value": normalizedUses.value,
      "system.uses.spent": normalizedUses.spent
    }, options);
  }

  static normalizeUses(uses, preference = "value") {
    const normalizedMax = Math.max(0, Math.trunc(toFiniteNumber(uses?.max, 0)));
    let normalizedValue = toFiniteNumber(uses?.value, normalizedMax);
    let normalizedSpent = toFiniteNumber(uses?.spent, normalizedMax - normalizedValue);

    if (preference === "spent") {
      normalizedSpent = Math.max(0, Math.min(Math.trunc(normalizedSpent), normalizedMax));
      normalizedValue = normalizedMax - normalizedSpent;
    } else {
      normalizedValue = Math.max(0, Math.min(Math.trunc(normalizedValue), normalizedMax));
      normalizedSpent = normalizedMax - normalizedValue;
    }

    return {
      max: normalizedMax,
      value: normalizedValue,
      spent: normalizedSpent
    };
  }

  static getActiveEffectsModifiers(item, baseUses = null) {
    let originalUses = baseUses ? foundry.utils.deepClone(baseUses) : foundry.utils.deepClone(item.system.uses);

    const actor = item.parent;

    if (!actor) {
      return { max: 0, value: 0, spent: 0 };
    }

    let changes = [];
    for (const effect of actor.allApplicableEffects()) {
      // allApplicableEffects() does NOT filter disabled effects (disabled ≠ suppressed in Foundry V14).
      // This mirrors the approach used in dnd5e's own _prepareActiveEffectAttributions.
      if (effect.disabled || effect.isSuppressed) continue;
      if (!effect?.changes || !Array.isArray(effect.changes)) continue;
      for (const change of effect.changes) {
        if (typeof change.key === "string" && change.key.startsWith("dnd5espellpoints.")) {
          changes.push({
            ...change,
            priority: change.priority ?? 0
          });
        }
      }
    }

    changes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    let modifiedUses = { max: 0, value: 0, spent: 0 };
    let workingUses = foundry.utils.deepClone(originalUses);

    for (const change of changes) {
      const path = change.key.slice("dnd5espellpoints.".length);
      if (!path.startsWith("system.uses.")) continue;
      const usesKey = path.split(".")[2];
      if (!workingUses.hasOwnProperty(usesKey)) continue;

      let currentValue = workingUses[usesKey];

      let modValue = 0;
      const rawValue = change.value;
      if (typeof rawValue === "number") {
        modValue = rawValue;
      } else if (typeof rawValue === "string") {
        const formula = rawValue.trim();
        if (formula.length === 0) continue;
        modValue = dnd5e.utils.simplifyBonus(formula, actor.getRollData());
      } else {
        continue;
      }

      const changeType = change.mode ?? change.type; // dnd v5.3+ uses "type", before was "mode"; ?? handles mode=0 (CUSTOM)
      switch (changeType) {
        case 0: // CUSTOM (applyOperator)
        case 'custom':
          workingUses[usesKey] = originalUses[usesKey] + modValue;
          break;
        case 1: // MULTIPLY
        case 'multiply':
          workingUses[usesKey] = currentValue * modValue;
          break;
        case 2: // ADD
        case 'add':
          workingUses[usesKey] = currentValue + modValue;
          break;
        default:
          break;
      }
    }

    for (const key of ["max", "value", "spent"]) {
      if (typeof workingUses[key] === "number" && typeof originalUses[key] === "number") {
        modifiedUses[key] = workingUses[key] - originalUses[key];
      } else {
        modifiedUses[key] = 0;
      }
    }

    return modifiedUses;
  }


  /**
   * Alters the spell points for a given actor by updating the associated spell point item.
   *
   * @param {Actor} actor - The actor whose spell points are to be altered.
   * @param {number} [uses] - The new value for current spell points. If provided, it will be clamped between 0 and max.
   * @param {number} [max] - The new maximum value for spell points. If provided, updates the maximum.
   *
   * @returns {void}
   */
  static async alterSpellPoints(actor, uses, max) {
    if (!actor) {
      //console.warn("SpellPoints.alterSpellPoints: No actor provided.");
      return;
    }

    if (!SpellPoints.isActorCharacter(actor)) return;

    let spellPointItem = SpellPoints.getSpellPointsItem(actor);
    if (!spellPointItem) return;

    let newValues = { max: null, value: null, spent: null };

    let currentMax = await SpellPoints.withActorData(spellPointItem.system.uses.max, actor);

    if (typeof max !== "undefined" && max !== null && max !== false && max !== "") {
      const maxOperator = extractOperator(max);
      const maxValue = await SpellPoints.withActorData(max, actor);
      if (maxOperator) {
        currentMax = applyOperator(maxValue, maxOperator, currentMax);
      } else {
        currentMax = maxValue;
      }
      newValues.max = currentMax;
    }

    let currentUses = spellPointItem.system.uses.value;

    if (typeof uses !== "undefined" && uses !== null && uses !== false && uses !== "") {
      const usesOperator = extractOperator(uses);
      const usesValue = await SpellPoints.withActorData(uses, actor);
      if (usesOperator) {
        currentUses = applyOperator(usesValue, usesOperator, currentUses);
      } else {
        currentUses = usesValue;
      }
      currentUses = Math.max(0, Math.min(currentUses, currentMax));
      newValues.value = currentUses;
      newValues.spent = currentMax - currentUses;
    }

    if (Object.values(newValues).some(v => v !== null)) {
      SpellPoints.updateSpellPointItem(spellPointItem, newValues.value, newValues.max, newValues.spent);
    }
  }

  /** @deprecated Legacy resource lookup by configured spell point label. */
  static getSpellPointsResource(actor) {
    let _resources = foundry.utils.getProperty(actor, "system.resources");
    for (let r in _resources) {
      if (_resources[r].label == this.settings.spResource) {
        return { 'values': _resources[r], 'key': r };
      }
    }
    return false;
  }



  /**
   * The function checks if the actor has enough spell points to cast the spell, and if not, checks if
   * the actor can cast the spell using hit points. If the actor can cast the spell using hit points,
   * the function reduces the actor's maximum hit points by the amount of hit points required to cast
   * the spell
   * @param item - the Item being used
   * @param consumeConfig - resource consumption
   * @param actor - The actor that is being updated.
   * @returns The update object.
   */

  static async castSpell(item, consumeConfig, options) {
    // ('SP CAST SPELL item', item);

    if (!consumeConfig.consume?.spellPoints || !item.consumption.spellSlot) {
      return [item, consumeConfig, options];
    }

    const actor = item.actor;
    if (!SpellPoints.isActorCharacter(actor))
      return [item, consumeConfig, options];

    let spellPointItem = consumeConfig.spellPointsItem;

    const moduleSettings = this.settings
    let settings = moduleSettings;

    if (spellPointItem.flags?.spellpoints?.override) {
      settings = spellPointItem.flags?.spellpoints?.config ?? settings;
    }

    const parentItem = item?.parent?.parent;

    if (typeof parentItem === 'undefined' || parentItem?.type !== 'spell')
      return [item, consumeConfig, options];

    if (consumeConfig.consume.spellSlot) {
      consumeConfig.consume.spellPoints = false;
      return [item, consumeConfig, options];
    }

    if (consumeConfig.consume.spellPoints) {
      consumeConfig.consume.spellSlot = false;
      consumeConfig.hasConsumption = false; // prevent slot consumption
    }

    if (!spellPointItem) {
      return {};
    }

    const spellLvl = consumeConfig.isCantrip ? 0 : isset(options?.data?.flags?.dnd5e?.use?.spellLevel) ? options.data.flags.dnd5e.use.spellLevel : options.data.system.spellLevel;

    const currentUses = spellPointItem.system.uses;
    let remainingUses = {
      'value': currentUses.value,
      'spent': currentUses.spent,
    }

    let actualSpellPoints = remainingUses.value;

    const spellPointCost = await this.withActorData(settings.spellPointsCosts[spellLvl], actor);

    let SpeakTo = [];
    if (moduleSettings.chatMessagePrivate) {
      SpeakTo = game.users.filter(u => u.isGM);
    }

    let updateActor = {
      'system': {
        'attributes': {},
        'resources': {}
      }
    };
    if (actualSpellPoints - spellPointCost >= 0) {
      remainingUses.spent += spellPointCost;

      ChatMessage.create({
        content: "<i style='color:green;'>" +
          game.i18n.format(SP_MODULE_NAME + ".spellUsingSpellPoints",
            {
              ActorName: actor.name,
              SpellPoints: moduleSettings.spResource,
              spellPointUsed: spellPointCost,
              remainingPoints: actualSpellPoints - spellPointCost
            }) + "</i>",
        speaker: ChatMessage.getSpeaker({ alias: actor.name }),
        isContentVisible: false,
        isAuthor: true,
        whisper: SpeakTo
      });
    } else if (actualSpellPoints - spellPointCost < 0) {
      if (settings.spEnableVariant) {
        // spell point resource is 0 but character can still cast.
        remainingUses.spent = currentUses.max;

        const hpMaxLost = spellPointCost * await SpellPoints.withActorData(settings.spLifeCost, actor);
        const hpActual = actor.system.attributes.hp.value;
        let hpTempMaxActual = actor.system.attributes.hp.tempmax;
        const hpMaxFull = actor.system.attributes.hp.max;
        if (!hpTempMaxActual)
          hpTempMaxActual = 0;
        const newTempMaxHP = hpTempMaxActual - hpMaxLost;
        const newMaxHP = hpMaxFull + newTempMaxHP;

        if (hpMaxFull + newTempMaxHP <= 0) { //character is permanently dead
          updateActor.system.attributes = { 'death': { 'failure': 3 }, 'hp': { 'tempmax': -hpMaxFull, 'value': 0 } };
          ChatMessage.create({
            content: "<i style='color:red;'>" + game.i18n.format(SP_MODULE_NAME + ".castedLifeDead", { ActorName: actor.name }) + "</i>",
            speaker: ChatMessage.getSpeaker({ alias: actor.name }),
            isContentVisible: false,
            isAuthor: true,
            whisper: SpeakTo
          });
        } else {
          updateActor.system.attributes = { 'hp': { 'tempmax': newTempMaxHP } };// hp max reduction
          if (hpActual > newMaxHP) { // a character cannot have more hp than his maximum
            updateActor.system.attributes = foundry.utils.mergeObject(updateActor.system.attributes, { 'hp': { 'value': newMaxHP } });
          }
          ChatMessage.create({
            content: "<i style='color:red;'>" + game.i18n.format(SP_MODULE_NAME + ".castedLife", { ActorName: actor.name, hpMaxLost: hpMaxLost }) + "</i>",
            speaker: ChatMessage.getSpeaker({ alias: actor.name }),
            isContentVisible: false,
            isAuthor: true,
            whisper: SpeakTo
          });
        }
      } else {
        ChatMessage.create({
          content: "<i style='color:red;'>" + game.i18n.format(SP_MODULE_NAME + ".notEnoughSp", { ActorName: actor.name, SpellPoints: moduleSettings.spResource }) + "</i>",
          speaker: ChatMessage.getSpeaker({ alias: actor.name }),
          isContentVisible: false,
          isAuthor: true,
          whisper: SpeakTo
        });
        consumeConfig.consume.SpellSlot = false;
        consumeConfig.consume.SpellLevel = false;
        consumeConfig.create.measuredTemplate = false;
        options.createMessage = false;
        options.create = false;
        options.hasConsumption = false;
        consumeConfig.hasConsumption = false;
        delete options.flags;
        return [item, consumeConfig, options];
      }
    }

    consumeConfig.consume.SpellLevel = false;
    consumeConfig.consume.SpellSlot = false;
    options.hasConsumption = false;
    consumeConfig.hasConsumption = false;

    remainingUses.value = currentUses.max - remainingUses.spent;

    SpellPoints.updateSpellPointItem(spellPointItem, remainingUses.value, null, remainingUses.spent);
    actor.update(updateActor);

    return [item, consumeConfig, options];
  }

  static async updateActiveEffect(spells, actor) {
    if (!actor) {
      return;
    }

    const item = SpellPoints.getSpellPointsItem(actor);
    if (!item) {
      //console.warn("SpellPoints.updateActiveEffect: No spell points item found for actor", actor);
      return;
    }

    // Only force an item refresh when active-effect modifiers actually changed.
    // This avoids infinite update loops from repeated prepare/render cycles.
    const previousModifiers = actor?.flags?.[SP_MODULE_NAME]?.modifiers || { max: 0, value: 0, spent: 0 };
    const effectBaseUses = {
      max: item.system.uses.max - (previousModifiers.max ?? 0),
      value: item.system.uses.value - (previousModifiers.value ?? 0),
      spent: item.system.uses.spent - (previousModifiers.spent ?? 0)
    };
    const currentModifiers = SpellPoints.getActiveEffectsModifiers(item, effectBaseUses);

    const modifiersChanged = ["max", "value", "spent"].some((key) => {
      const prev = previousModifiers[key] ?? 0;
      const curr = currentModifiers[key] ?? 0;
      return prev !== curr;
    });

    // Also force a refresh when the stored sentUses has drifted from the actual item state.
    // This recovers from corrupted state (e.g. item.max=27 but sentUses.max=32 and modifiers={max:5}
    // → effectBaseUses.max=22, currentMod=5=previousMod → modifiersChanged=false → stuck forever).
    const previousSentUses = actor?.flags?.[SP_MODULE_NAME]?.sentUses;
    const itemStateConsistent = !previousSentUses || ["max", "value", "spent"].every(
      (key) => previousSentUses[key] === item.system.uses[key]
    );

    if (!modifiersChanged && itemStateConsistent) {
      return;
    }

    await item.update({});
  }

  static async onActiveEffectChange(effect) {
    const parent = effect?.parent;
    if (!parent) {
      return;
    }

    const actor = parent.documentName === "Actor"
      ? parent
      : (parent.actor || parent.parent);

    if (!actor) {
      return;
    }

    await SpellPoints.updateActiveEffect(null, actor);
  }

  static async checkPreUseActivity(activity, usageConfig, dialogConfig, messageConfig) {
    if (!activity.isSpell) {
      return [activity, usageConfig, dialogConfig, messageConfig];
    }

    const actor = activity.actor;
    const spellPointItem = SpellPoints.getSpellPointsItem(actor);

    if (!this.isActorCharacter(actor) || !spellPointItem) {
      return [activity, usageConfig, dialogConfig, messageConfig];
    }

    const isCantrip = activity.item.system.level === 0;
    if (isCantrip) {
      let settings = this.settings;
      if (spellPointItem.flags?.spellpoints?.override) {
        settings = spellPointItem.flags?.spellpoints?.config !== 'undefined' ? spellPointItem.flags?.spellpoints.config : settings;
      }
      if (settings.spellPointsCosts[0] == 0) {
        return [activity, usageConfig, dialogConfig, messageConfig];
      } else {
        usageConfig.hasConsumption = true;
        usageConfig.isCantrip = true;
        usageConfig.spell = { slot: "spell0" };
      }
    } else {
      usageConfig.isCantrip = false;
    }

    usageConfig.consume.canUseSpellpoints = true;
    usageConfig.spellPointsItem = spellPointItem;

    if (!dialogConfig.applicationClass.DEFAULT_OPTIONS.classes.includes('spellpoints-cast')) {
      dialogConfig.applicationClass.DEFAULT_OPTIONS.classes.push('spellpoints-cast');
    }

    if (!isCantrip && !usageConfig.consume.spellSlot) {
      usageConfig.consume.spellPoints = false;
      return [activity, usageConfig, dialogConfig, messageConfig];
    }

    usageConfig.consume.spellPoints = true;
    usageConfig.consume.spellSlot = false;

    return [activity, usageConfig, dialogConfig, messageConfig];
  }

  /**
   * renderActivityUsageDialog hook
   * It checks if the spell is being cast by a player character, and if so, it replaces the spell slot
   * dropdown with a list of spell point costs, and adds a button to the dialog that will cast the
   * spell if the spell point cost is available
   * @param dialog - The dialog object.
   * @param html - The HTML element of the dialog.
   * @param formData - The data that was submitted by the user.
   * @returns the value of the variable `level`
   */
  static async checkDialogSpellPoints(dialog, html) {

    var usageConfig = foundry.utils.getProperty(dialog, "config");

    if (usageConfig?.consume?.canUseSpellpoints !== true) {
      return;
    }

    // Declare settings as a separate variable because jQuery overrides `this` when in an each() block
    let settings = this.settings;

    let actor = foundry.utils.getProperty(dialog, "item.actor");

    const spell = dialog.item.system;
    const preparation = spell.preparation.mode; //prepared,pact,always,atwill,innate

    const baseSpellLvl = spell.level;

    const spellPointItem = usageConfig.spellPointsItem;

    if (spellPointItem && spellPointItem.flags?.spellpoints?.override) {
      settings = isset(spellPointItem.flags?.spellpoints?.config) ? spellPointItem.flags?.spellpoints?.config : settings;
    }

    let optionLevel = 'none';
    let cost = 0;

    let actualSpellPoints = spellPointItem.system.uses.value;

    if (usageConfig.consume.spellPoints && !usageConfig?.isCantrip) {
      const options = $('select[name="spell.slot"] option', $(html));
      for (const option of Array.from(options)) {
        let $option = $(option);
        let optionValue = $option.val();
        if (!optionValue || optionValue === '') {
          continue;
        }

        if (optionValue === 'pact') {
          optionLevel = actor.system.spells.pact.level;
        } else {
          optionLevel = optionValue.replace('spell', '');
        }

        cost = await SpellPoints.withActorData(settings.spellPointsCosts[optionLevel], actor);

        if (settings.spFormula === 'DMG' && optionValue === 'pact') {
          // do nothing
        } else {
          const spCostText = game.i18n.format(SP_MODULE_NAME + ".spellCost", { amount: cost + '/' + actualSpellPoints, SpellPoints: spellPointItem.name });
          let newText = $option.text() + ` (${spCostText})`;
          if (usageConfig.consume.spellSlot) {
            newText = $option.text() + ' (' + spCostText + ')';
          }

          $option.text(newText);
        }
      }
    }

    let choosenSpellLevel = usageConfig.spell.slot.replace('spell', '');

    if (choosenSpellLevel === 'pact') {
      choosenSpellLevel = actor.system.spells.pact.level;
    }

    let consumeSection = $('section[data-application-part="consumption"] fieldset', $(html));
    if (usageConfig.isCantrip) {
      consumeSection = $('section[data-application-part="consumption"]', $(html));
    }

    const consumeString = game.i18n.format(SP_MODULE_NAME + ".consumeSpellSlotInput", { SpellPoints: spellPointItem.name });
    const consumeSpellPoints = usageConfig.consume.spellPoints ? "checked" : '';

    let SpellPointsInput = `<div class="form-group">
        <label>${consumeString}</label>
        <div class="form-fields">
        <input type="checkbox" name="consume.spellPoints" ${consumeSpellPoints}></div></div>`;

    if (usageConfig.isCantrip) {
      SpellPointsInput = `<fieldset>${SpellPointsInput}</fieldset>`;
    }

    consumeSection.append(SpellPointsInput);

    let spellPointCost = 0;

    if (preparation === 'pact') {
      spellPointCost = cost;
    } else {
      spellPointCost = await SpellPoints.withActorData(settings.spellPointsCosts[choosenSpellLevel], actor);
    }

    const missing_points = (typeof actualSpellPoints === 'undefined' || actualSpellPoints - spellPointCost < 0);
    const messageNotEnough = game.i18n.format(SP_MODULE_NAME + ".youNotEnough", { SpellPoints: spellPointItem.name });

    if (missing_points) {
      consumeSection.append('<div class="spError">' + messageNotEnough + '</div>');
    }

    let copyButton = $('.form-footer button', $(html)).clone();
    $('.form-footer button', $(html)).addClass('original').hide();
    copyButton.addClass('copy').removeClass('use').attr('data-button', '');
    $('.form-footer', $(html)).append(copyButton);

    $(html).on('click', '.copy', function (e) {
      e.preventDefault();
      if (!$('dnd5e-checkbox[name="consume.spellSlot"]', $(html)).prop('checked') || settings.spEnableVariant) {
        $('.original', $(html)).trigger("click");
      } else if ($('select[name="spell.slot"]', $(html)).length > 0) {
        if (missing_points) {
          ui.notifications.error(messageNotEnough);
          dialog.close();
        } else {
          $('.original', $(html)).trigger("click");
        }
      }
    })
  }

  static async alterActivityDialogSP(dialog, html) {
    if (dialog.activity.isSpell) {

      const spellPointItem = SpellPoints.getSpellPointsItem(dialog.activity.actor);
      if (!spellPointItem) {
        return (dialog, html);
      }
      const template_data = {
        spellPointsEnabled: spellPointItem ? true : false, // TODO: check if spell points are enabled for this actor
        itemName: spellPointItem.name,
      };

      const template_file = "modules/dnd5e-spellpoints/templates/spell-points-activity.hbs";
      const rendered_html = await foundry.applications.handlebars.renderTemplate(template_file, template_data);
      $('.tab.activity-consumption', html).prepend(rendered_html);
      return (dialog, html);
    }

    return (dialog, html);
  }

  /**
   * Calculates the maximum spell points for an actor based on custom formulas.
   * @param {object} actor The actor used for variables.
   * @param {object} settings configuration from module or item ovveride
   * @return {number} The calculated maximum spell points.
   */
  static async _calculateSpellPointsCustom(actor, settings) {
    let SpellPointsMax = await SpellPoints.withActorData(settings.spCustomFormulaBase, actor);

    let hasSpellSlots = false;
    let spellPointsFromSlots = 0;
    for (let [slotLvlTxt, slot] of Object.entries(actor.system.spells)) {
      let slotLvl;
      if (slotLvlTxt === 'spell0') {
        slotLvl = 0;
      } else {
        slotLvl = slot.level;
      }

      if (!slotLvl || slotLvl == 0) {
        continue;
      }

      spellPointsFromSlots += slot.max * await SpellPoints.withActorData(settings.spellPointsCosts[slotLvl], actor);
      if (slot.max > 0) {
        hasSpellSlots = true;
      }
    }

    if (!hasSpellSlots) {
      return 0;
    }

    return SpellPointsMax;
  }

  /**
   * Calculates the maximum spell points for an actor based on a fixed map of
   * spellcasting level to maximum spell points. Builds up a total spellcasting
   * level based on the level of each spellcasting class according to
   * Multiclassing rules.
   * @param {object} item The class item of the actor.
   * @param {object} updates The details of how the class item was udpated.
   * @param {object} actor The actor used for variables.
   * @return {number} The calculated maximum spell points.
   */
  static async _calculateSpellPointsFixed(classItem, updates, actor, settings) {
    let changedClassLevel = null;
    let changedClassID = null;
    let levelUpdated = false;
    const leveledProgression = settings.spUseLeveled;

    if (foundry.utils.getProperty(updates.system, 'levels')) {
      changedClassLevel = foundry.utils.getProperty(updates.system, 'levels');
      changedClassID = foundry.utils.getProperty(classItem, '_id');
      levelUpdated = true;
    }

    let spellcastingNpc, spellcastingNpcLevel = false;
    if (actor.type === 'npc') {
      if (actor.system?.attributes?.spell.level > 0) {
        spellcastingNpc = true;
        spellcastingNpcLevel = actor.system.attributes.spell.level;
      } else {
        return 0;
      }
    }

    const actorClasses = actor.classes;

    if (foundry.utils.isEmpty(actorClasses) && !spellcastingNpc) {
      return 0;
    }

    if (spellcastingNpc && foundry.utils.isEmpty(actorClasses)) {
      if (leveledProgression) {
        return parseInt(await this.withActorData(settings.leveledProgressionFormula[spellcastingNpcLevel], actor)) || 0;
      } else {
        return parseInt(settings.spellPointsByLevel[spellcastingNpcLevel]) || 0;
      }
    }

    let spellcastingClassCount = 0;
    let spellcastingLevels = {};

    Object.keys(dnd5e.config.spellProgression).forEach((key) => {
      spellcastingLevels[key] = [];
    });

    Object.values(actorClasses).forEach(actorClass => {
      /* Use Item5e.spellcasting getter — already resolves subclass overrides */
      const progression = actorClass.spellcasting?.progression ?? 'none';

      let level = actorClass.system.levels;

      if (levelUpdated && actorClass._id === changedClassID)
        level = changedClassLevel;

      if (spellcastingLevels[progression] != undefined) {
        spellcastingLevels[progression].push(level);
        spellcastingClassCount++;
      }
    })

    let totalSpellcastingLevel = 0;
    const divisorSource = (settings.spFormula === 'DMG')
      ? SpellPoints.defaultSettings.spellProgression
      : settings.spellProgression;

    for (const key of Object.keys(divisorSource)) {
      if (key === 'none') continue;
      if (key === 'pact' && settings.spFormula === 'DMG') continue; // Exclude pact for DMG
      const rawDivisor = Number(divisorSource[key]?.value);
      if (!rawDivisor) continue; // skip if 0 or NaN
      const divisor = rawDivisor;

      const levels = spellcastingLevels[key] || [];
      let sum = 0;
      if (key === 'artificer') {
        sum = levels.reduce((acc, lvl) => acc + (divisor === 1 ? lvl : Math.ceil(lvl / divisor)), 0);
      } else if (key === 'half' || key === 'third') {
        if (spellcastingClassCount === 1 && ((key === 'half' && levels[0] >= 2) || (key === 'third' && levels[0] >= 3))) {
          sum = levels.reduce((acc, lvl) => acc + (divisor === 1 ? lvl : Math.ceil(lvl / divisor)), 0);
        } else {
          sum = levels.reduce((acc, lvl) => acc + (divisor === 1 ? lvl : Math.floor(lvl / divisor)), 0);
        }
      } else {
        sum = levels.reduce((acc, lvl) => acc + (divisor === 1 ? lvl : Math.floor(lvl / divisor)), 0);
      }
      totalSpellcastingLevel += sum;
    }

    if (leveledProgression && totalSpellcastingLevel > 0) {
      return parseInt(await this.withActorData(settings.leveledProgressionFormula[totalSpellcastingLevel], actor)) || 0;
    }

    return parseInt(settings.spellPointsByLevel[totalSpellcastingLevel]) || 0
  }

  static async spOnUpdateActor(actor, update, action, id) {
    // Only proceed if actor is a character and user has ownership
    if (!SpellPoints.isActorCharacter(actor) || !SpellPoints.userHasActorOwnership(actor)) {
      return;
    }
    return SpellPoints.maybeUpdateSpellPoints(actor, update, action, id);
  }

  /**
   * Conditionally updates the spell points for a given npc actor based on specific update actions.
   *
   * This method checks if the actor is a character and if the user has ownership before proceeding.
   * It updates the spell points if the action is an advancement or if the actor's spellcasting level
   * or spellcasting attribute has changed.
   *
   * @param {Actor} actor - The actor whose spell points may need to be updated.
   * @param {Object} update - The update data that may contain changes to the actor's system attributes.
   * @param {Object} action - The action object, which may indicate if this is an advancement.
   * @param {string} id - The identifier for the update or action.
   * @returns {Promise<void>} Resolves when the spell points update process is complete or skipped.
   */
  static async maybeUpdateSpellPoints(actor, update, action, id) {
    const spellPointsItem = SpellPoints.getSpellPointsItem(actor);
    // If spellcasting level increased, update spell points (NPCs)
    if (spellPointsItem && update?.system?.attributes?.spell?.level >= 0) {
      SpellPoints.updateSpellPointsMax({}, {}, actor, spellPointsItem);
    }
  }

  static async spOnUpdateItem(item, update, action, id) {
    // Refresh spellpoint active-effect modifiers when item suppression state may change
    // (equipped / attuned / attunement requirement transitions).
    await SpellPoints.maybeRefreshSpellPointsFromSuppressionState(item, update);

    if (item.type !== 'class') {
      return;
    }
    return SpellPoints.classItemUpdateSpellPoints(item, update, action, id);
  }

  static isSuppressionAffectingItemUpdate(update) {
    if (!update) return false;
    return foundry.utils.hasProperty(update, "system.equipped")
      || foundry.utils.hasProperty(update, "system.attuned")
      || foundry.utils.hasProperty(update, "system.attunement");
  }

  static async maybeRefreshSpellPointsFromSuppressionState(item, update) {
    if (!SpellPoints.isSuppressionAffectingItemUpdate(update)) {
      return;
    }

    const actor = item?.parent;
    if (!actor || !SpellPoints.isActorCharacter(actor)) {
      return;
    }

    if (!SpellPoints.userHasActorOwnership(actor)) {
      return;
    }

    await SpellPoints.updateActiveEffect(null, actor);
  }

  /**
    * Handles class-item updates from the `updateItem` hook.
   * If the module is active, the actor is a character, and the actor has a spell point resource, then
   * update the spell point resource's maximum value
   * @param item - The item that was updated.
   * @param updates - The updates that are being applied to the item.
   * @param isDifferent - true if the item is being updated, false if it's being dropped
   * @returns True
   */
  static async classItemUpdateSpellPoints(classItem, update, action, id) {
    // Handles class-item updates and class-item drops.

    const actor = classItem.parent;

    if (!SpellPoints.isActorCharacter(actor))
      return [classItem, update, action, id];

    if (!SpellPoints.userHasActorOwnership(actor)) {
      return [classItem, update, action, id];
    }

    if (!foundry.utils.getProperty(update.system, 'levels'))
      return [classItem, update, action, id];

    SpellPoints.updateSpellPointsMax(classItem, update, actor, false);

    return [classItem, update, action, id];
  }

  static spOnCreateItem(item, updates, id) {
    if (SpellPoints.isSpellPointsItem(item)) {
      SpellPoints.processFirstDrop(item);
      return true;
    }
  }


  static async updateSpellPointsMax(classItem, updates, actor, spellPointsItem) {
    const actorName = actor.name;

    if (!spellPointsItem) {
      spellPointsItem = SpellPoints.getSpellPointsItem(actor);
      if (!spellPointsItem) {
        return;
      }
    }

    let settings;
    if (spellPointsItem.flags?.spellpoints?.override) {
      settings = foundry.utils.mergeObject(SpellPoints.settings, spellPointsItem.flags.spellpoints.config, { overwrite: true, recursive: true });
    } else {
      settings = SpellPoints.settings;
    }

    if (!settings.spAutoSpellpoints) {
      return true;
    }

    const isCustom = settings.isCustom;
    const spUseLeveled = settings.spUseLeveled;

    const SpellPointsMax = isCustom && !spUseLeveled ?
      await SpellPoints._calculateSpellPointsCustom(actor, settings) :
      await SpellPoints._calculateSpellPointsFixed(classItem, updates, actor, settings)

    if (SpellPointsMax !== NaN) {
      // Add the current stored active-effect max modifier to the raw formula result so that
      // updateSpellPointItem sees a real change even when the formula base matches the old
      // effective max. Example: level 5→6 (base 27→32) while a ring (+5) is equipped —
      // old effective max is 32, new formula is 32, so without this offset updateSpellPointItem
      const storedModifiers = actor?.flags?.[SP_MODULE_NAME]?.modifiers ?? { max: 0, value: 0, spent: 0 };
      const effectiveSpellPointsMax = SpellPointsMax + (storedModifiers.max ?? 0);

      // Signal spPreUpdateItem (via Foundry's options object) to use the delta path instead of
      // the reverse/manual-edit path for max. effectiveSpellPointsMax already incorporates the
      // active-effect offset; re-applying effects on top would double-count the modifier.
      // Using options is reliable — unlike a static flag, it flows synchronously through the
      // Foundry update pipeline and is present in the preUpdateItem hook's third argument.
      await SpellPoints.updateSpellPointItem(spellPointsItem, null, effectiveSpellPointsMax, null, { dnd5espellpoints_formulaUpdate: true });

      if (!game.user.isGM) {
        let SpeakTo = game.users.filter(u => u.isGM);
        let message = game.i18n.format(SP_MODULE_NAME + ".spellPointsFound", { SpellPoints: spellPointsItem.name, Actor: actorName })
        ChatMessage.create({
          content: "<i style='color:green;'>" + message + "</i>",
          speaker: ChatMessage.getSpeaker({ alias: actorName }),
          isContentVisible: false,
          isAuthor: true,
          whisper: SpeakTo
        });
      }
    }
    return updates;
  }

  /** Hook handler: `preDeleteItem`. */
  static spPreDeleteItem(item, dialog, id) {
    let actor = item.parent;
    if (item._id === SpellPoints.getActorFlagSpellPointItem(actor)) {
      actor.update({ [`flags.dnd5espellpoints.-=item`]: null });
    }
  }

  /**
   * Applies active effect modifiers to uses values while tracking previous modifiers
   * to avoid duplicate applications. Returns adjusted uses values.
   *
   * Behavior differs based on which property is being modified:
   * - For properties flagged in reverseForProperties (currently max on manual edits):
   *   use current base value and apply current modifier directly.
   * - For other properties: apply delta between current and previous modifiers.
   *
   * @param {Item} item - The spell points item
   * @param {Object} baseUses - The base uses values (max, value, spent)
   * @param {Object} reverseForProperties - Properties to reverse modifiers for (e.g., { max: true })
    * @param {Object} effectBaseUses - Base uses for effect calculation (defaults to baseUses if not provided)
   * @return {Object} An object containing adjusted uses and current modifiers
   */
  static applyActiveEffectModifiers(item, baseUses, reverseForProperties = {}, effectBaseUses = null) {
    // Use provided effectBaseUses for effect calculation, otherwise use baseUses
    if (!effectBaseUses) {
      effectBaseUses = baseUses;
    }

    const currentModifiers = SpellPoints.getActiveEffectsModifiers(item, effectBaseUses);
    const actor = item.parent;
    const previousModifiers = actor?.flags?.[SP_MODULE_NAME]?.modifiers || { max: 0, value: 0, spent: 0 };

    const adjustedUses = { max: baseUses.max, value: baseUses.value, spent: baseUses.spent };

    for (const key of ["max", "value", "spent"]) {
      const currentMod = currentModifiers[key] ?? 0;
      const previousMod = previousModifiers[key] ?? 0;

      if (reverseForProperties[key]) {
        // For manually-edited properties (like max): treat the manual value as the new base,
        // then apply only the current modifier snapshot.
        adjustedUses[key] = baseUses[key] + currentMod;
      } else {
        // For non-manually-edited properties: apply modifier delta from previous snapshot.
        const delta = currentMod - previousMod;
        if (delta !== 0) {
          adjustedUses[key] = adjustedUses[key] + delta;
        }
      }
    }

    return {
      adjusted: adjustedUses,
      currentModifiers: currentModifiers
    };
  }

  /** preUpdateItem hook */
  static spPreUpdateItem(item, update, difference, id) {
    if (!SpellPoints.isSpellPointsItem(item)) {
      return;
    }

    let max, value, spent;
    let changed_uses, changed_max, changed_value, changed_spent = false;

    const actor = item.parent;

    // Recover previous state from ACTOR flags (not item flags)
    // This avoids triggering item updates just for tracking state
    // Store the ACTUAL values we sent last time (including effects), not calculated base
    // This allows change detection on the next update
    const previousModifiers = actor?.flags?.[SP_MODULE_NAME]?.modifiers || { max: 0, value: 0, spent: 0 };
    const previousSentUses = actor?.flags?.[SP_MODULE_NAME]?.sentUses || {
      max: item.system.uses.max,
      value: item.system.uses.value,
      spent: item.system.uses.spent
    };

    // Extract incoming values from update (always present per user confirmation)
    let incomingMax = update.system?.uses?.max !== undefined && update.system?.uses?.max !== null
      ? parseInt(update.system.uses.max)
      : item.system.uses.max;
    let incomingValue = update.system?.uses?.value !== undefined && update.system?.uses?.value !== null
      ? parseInt(update.system.uses.value)
      : item.system.uses.value;
    let incomingSpent = update.system?.uses?.spent !== undefined && update.system?.uses?.spent !== null
      ? parseInt(update.system.uses.spent)
      : item.system.uses.spent;

    // Detect TRUE changes by comparing against previous base values (not modified current)
    // This prevents re-applying effects when user only changes spent but form sends all fields
    if (incomingMax !== previousSentUses.max) {
      max = incomingMax;
      changed_uses = true;
      changed_max = true;
    } else {
      max = incomingMax;
    }

    if (incomingValue !== previousSentUses.value) {
      value = incomingValue;
      changed_uses = true;
      changed_value = true;
    } else {
      value = incomingValue;
    }

    if (incomingSpent !== previousSentUses.spent) {
      spent = incomingSpent;
      changed_uses = true;
      changed_spent = true;
    } else {
      spent = incomingSpent;
    }

    // Apply active effect modifiers and get adjusted values
    const baseUses = { max, value, spent };
    const isFormulaUpdate = difference?.dnd5espellpoints_formulaUpdate === true;
    const { adjusted: adjustedUses, currentModifiers } = SpellPoints.applyActiveEffectModifiers(
      item,
      baseUses,
      { max: changed_max && !isFormulaUpdate }, // reverse only for manual max edits, not formula recalculation
      baseUses // pass base uses for effect calculation
    );

    const effectChangedMax = adjustedUses.max !== item.system.uses.max;
    const effectChangedValue = adjustedUses.value !== item.system.uses.value;
    const effectChangedSpent = adjustedUses.spent !== item.system.uses.spent;

    let normalizationPreference = "value";
    if (changed_value) {
      normalizationPreference = "value";
    } else if (changed_max) {
      // max change takes priority over derived-spent changes: when updateSpellPointItem
      // normalizes a max-only write it also emits a new spent value, which looks like
      // changed_spent but is just a derivation — we must not let it override the intent.
      normalizationPreference = "value";
    } else if (changed_spent) {
      // only true spent-only edits (no max change involved) use spent preference
      normalizationPreference = "spent";
    } else if (effectChangedSpent) {
      normalizationPreference = "spent";
    } else if (effectChangedValue) {
      normalizationPreference = "value";
    } else if (effectChangedMax) {
      normalizationPreference = "value";
    }

    const usesChanges = SpellPoints.normalizeUses(adjustedUses, normalizationPreference);
    // Compare against BOTH the current item state AND the incoming values.
    // The incoming update may undo a previously-applied effect (e.g. "calculate max" writes
    // formula max=27 while ring is equipped, so adjusted=32 == current item=32 → no item diff,
    // but the incoming would corrupt the state to 27 if we let it through uncorrected).
    const incomingUses = { max: incomingMax, value: incomingValue, spent: incomingSpent };
    const hasUsesChanges = ["max", "value", "spent"].some((key) =>
      usesChanges[key] !== item.system.uses[key] || usesChanges[key] !== incomingUses[key]
    );

    // Only set system.uses in update if we have changes
    if (hasUsesChanges) {
      if (!update.system) {
        update.system = {};
      }
      update.system.uses = {
        max: usesChanges.max,
        value: usesChanges.value,
        spent: usesChanges.spent
      };

      // Store modifiers/baseUses in ACTOR flags (not item flags) to avoid item re-updates
      // This prevents unnecessary item updates when just calculating effects
      const safeCurrentModifiers = {
        max: typeof currentModifiers.max === 'number' ? currentModifiers.max : 0,
        value: typeof currentModifiers.value === 'number' ? currentModifiers.value : 0,
        spent: typeof currentModifiers.spent === 'number' ? currentModifiers.spent : 0
      };

      const newSentUses = {
        max: usesChanges.max,
        value: usesChanges.value,
        spent: usesChanges.spent
      };

      // Store to actor flags asynchronously to avoid recursion
      if (actor) {
        actor.setFlag(SP_MODULE_NAME, 'modifiers', safeCurrentModifiers);
        actor.setFlag(SP_MODULE_NAME, 'sentUses', newSentUses);
      }

      // Only initialize config if it doesn't exist (one-time setup) - stored in item
      if (!isset(item.flags?.spellpoints?.config)) {
        const def = SpellPoints.settings;
        const formulas = SpellPoints.formulas;
        let conf = {};

        conf = foundry.utils.mergeObject(conf, def, { recursive: true, insertKeys: true, insertValues: false, overwrite: false })
        const preset = conf.spFormula;

        conf.isCustom = formulas[preset].isCustom;

        update.flags = foundry.utils.mergeObject(update?.flags || {}, {
          spellpoints: {
            [`config`]: item.flags?.spellpoints?.override ? conf : {},
            [`override`]: item.flags?.spellpoints?.override
          }
        });
      }
    }

    // Only call maybeUpdateTrackedResource if we actually changed uses
    if (hasUsesChanges) {
      SpellPoints.maybeUpdateTrackedResource(item, usesChanges.max, usesChanges.value);
    }

    return [item, update, difference, id];
  }
  static maybeUpdateTrackedResource(item, max, value) {
    const trackedResource = SpellPoints.settings.spResourceBind;
    const actor = item.parent;
    if (!trackedResource || trackedResource === "" || !actor) {
      return;
    }
    const resources = ["primary", "secondary", "tertiary"];

    const currentResource = actor.system.resources[trackedResource];
    const currentLabel = currentResource?.label || "";
    const currentMax = currentResource?.max || 0;
    const currentValue = currentResource?.value || 0;

    const isTrackedResourceUnchanged =
      currentLabel === item.name &&
      currentMax === max &&
      currentValue === value;

    const hasConflictingLabels = resources.some(resource => {
      if (resource !== trackedResource) {
        const resourceLabel = actor.system.resources[resource]?.label;
        return resourceLabel === item.name;
      }
      return false;
    });

    if (isTrackedResourceUnchanged && !hasConflictingLabels) {
      return;
    }

    let updateActor = {};
    if (!isTrackedResourceUnchanged) {
      updateActor = {
        [`system.resources.${trackedResource}.label`]: item.name,
        [`system.resources.${trackedResource}.max`]: max,
        [`system.resources.${trackedResource}.value`]: value
      };
    }

    resources.forEach(resource => {
      if (resource !== trackedResource) {
        const resourceLabel = actor.system.resources[resource]?.label;
        if (resourceLabel === item.name) {
          updateActor[`system.resources.${resource}.label`] = "";
        }
      }
    });

    actor.update(updateActor);
  }

  static processFirstDrop(item) {
    const actor = item.parent;

    if (!SpellPoints.userHasActorOwnership(actor)) {
      return;
    }

    if (SpellPoints.getActorFlagSpellPointItem(actor)) {
      // there is already a spellpoints item here.
      ui.notifications.error(game.i18n.format(SP_MODULE_NAME + ".alreadySpItemOwned"));
      item.update({
        'name': item.name + ' (' + game.i18n.format(SP_MODULE_NAME + ".duplicated") + ')'
      });
      return;
    }

    if (actor == null)
      return;

    let updateActor = {
      'flags': {
        'dnd5espellpoints': {
          'item': item._id
        }
      }
    };
    if (SpellPoints.settings.spResourceBind && SpellPoints.settings.spResourceBind !== "") {
      updateActor[`system.resources.${SpellPoints.settings.spResourceBind}.label`] = item.name;
      updateActor[`system.resources.${SpellPoints.settings.spResourceBind}.max`] = item.system.uses.max;
      updateActor[`system.resources.${SpellPoints.settings.spResourceBind}.value`] = item.system.uses.value;
    }
    actor.update(updateActor);
    SpellPoints.updateSpellPointsMax({}, {}, actor, item)
  }

  static removeOldResource(item, spellPointResource) {
    const actor = item.actor;

    let max = actor.system.resources[`${spellPointResource.key}`].max;
    let value = actor.system.resources[`${spellPointResource.key}`].value;
    let updateActor = { [`system.resources.${spellPointResource.key}.label`]: "" };
    actor.update(updateActor);
    SpellPoints.updateSpellPointItem(item, value, max, max - value);
  }

  /**
   * It adds a spell points tracker to the character sheet
   * @param app - The application object.
   * @param html - The HTML of the Actor sheet.
   * @param data - The data object passed to the sheet.
   * @returns The return value is the html_checkbox variable.
   */
  static async alterCharacterSheet(app, html, data, type) {
    if (data.actor.type != "character" && data.actor.type != "npc") {
      return;
    }
    if (!SpellPoints.settings.spActivateBar) {
      return;
    }
    const actor = data.actor;
    const spellPointsItem = this.getSpellPointsItem(actor);

    if (spellPointsItem) {
      //const computedValues = await SpellPoints.getComputedValues(spellPointsItem, actor);
      //console.log("alterCharacterSheet Spell Points Computed Values:", computedValues);
      const max = spellPointsItem.system.uses.max;
      const value = spellPointsItem.system.uses.value;

      let percent = value / max * 100 > 100 ? 100 : value / max * 100;
      const template_data = {
        'isV2': type === 'v2',
        'isNPC': type === 'npc',
        'editable': data.editable,
        'name': spellPointsItem.name,
        '_id': spellPointsItem._id,
        'max': max,
        'value': value,
        'percent': percent,
      }

      const template_file = "modules/dnd5e-spellpoints/templates/spell-points-sheet-tracker.hbs";
      const rendered_html = await foundry.applications.handlebars.renderTemplate(template_file, template_data);

      let sidebarClasses = '.sidebar .stats'
      let append = true;

      let container = $('<div class="sp-bar-container"></div>');

      container.append(rendered_html);

      if (app.classList.value.includes('tidy5e-sheet')) {
        // Tidy5e CLASSIC specific handling
        sidebarClasses = '.attributes .side-panel, .tidy-tab.favorites';
        append = false;
      } else if (type === 'v2') {
        sidebarClasses = '.sidebar .stats > .meter-group:last';
      } else if (type === 'npc') {
        sidebarClasses = '.sheet-body .sidebar';
        append = false;
      } else {
        sidebarClasses = '.header-details .attributes';
      }

      if ($(sidebarClasses + ' .sp-bar-container', html).length > 0) {
        // If the sp bar container already exists, clear it
        $(sidebarClasses + ' .sp-bar-container', html).remove();
      }

      if (append) {
        $(sidebarClasses, html).after(container);
      } else {
        $(sidebarClasses, html).prepend(container);
      }

      $('.config-button.spellPoints').off('click').on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        let config = new ActorSpellPointsConfig({ document: spellPointsItem });
        config?.render(true);
      });

      $('.progress.sp-points .label', html).off('click').on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $('.progress.sp-points .label', html).attr('hidden', 'hidden');
        let input = $('.progress.sp-points input.sp_value', html);
        input.removeAttr('hidden');
        input.focus();
        input.select();
      });

      $('.progress.sp-points input.sp_value', html)
        .off('blur')
        .on('blur', async (event) => {
          await SpellPoints.handleSPBarValueChange(spellPointsItem, event, html, max);
        })
        .off('keydown')
        .on('keydown', async (event) => {
          if (event.key === "Enter") {
            //await SpellPoints.handleSPBarValueChange(spellPointsItem, event, html, max);
            event.target.blur();
          }
        });
    }
  }

  static async handleSPBarValueChange(item, event, html, max) {
    const inputValue = $(event.target).val().trim();
    const currentValue = item.system.uses.value;

    let newValue;

    if (inputValue.startsWith('+') || inputValue.startsWith('-')) {
      const relativeChange = parseInt(inputValue);
      if (isNaN(relativeChange)) {
        newValue = currentValue; // Keep current value if invalid
      } else {
        newValue = currentValue + relativeChange;
      }
    } else {
      newValue = parseInt(inputValue);
      if (isNaN(newValue)) {
        newValue = currentValue; // Keep current value if invalid
      }
    }

    if (newValue < 0) {
      newValue = 0;
    }
    if (newValue > max) {
      newValue = max;
    }

    let spent = max - newValue;
    await SpellPoints.updateSpellPointItem(item, newValue, null, spent);
    let label = $('.progress.sp-points .label', html);
    label.removeAttr('hidden');
    $(event.target).attr('hidden', 'hidden');
  }

  static filterLevelKeys(obj, maxLevel) {
    const filtered = {};
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      if (obj[lvl] !== undefined) filtered[lvl] = obj[lvl];
    }
    return filtered;
  }

  static filterSpellLevelKeys(obj, spellLevels) {
    const filtered = {};
    for (const lvl of Object.keys(spellLevels)) {
      if (obj[lvl] !== undefined) filtered[lvl] = obj[lvl];
    }
    return filtered;
  }

  static async renderSpellPointsItem(app, html, data) {
    const html_obj = $(html);
    const item = data?.item;

    if (SpellPoints.isSpellPointsItem(item)) {
      const itemId = item._id;

      $('.item-properties', html_obj).hide();
      let template_item = data.document;
      const def = SpellPoints.settings;
      const formulas = SpellPoints.formulas;
      let conf = isset(template_item.flags?.spellpoints?.config) ? template_item.flags?.spellpoints?.config : {};

      conf = foundry.utils.mergeObject(conf, def, { recursive: true, insertKeys: true, insertValues: false, overwrite: false })

      const preset = conf.spFormula;

      conf.isCustom = isset(conf?.spFormula) ? formulas[preset].isCustom : def.isCustom;

      if (isset(conf?.previousFormula) && conf?.previousFormula != preset) {
        // changed formula preset, update spellpoints default
        conf = foundry.utils.mergeObject(conf, formulas[preset], { recursive: true, overwrite: true });
        conf.previousFormula = preset;
      }

      const maxLevel = CONFIG.DND5E.maxLevel;
      const spellLevels = CONFIG.DND5E.spellLevels;

      if (conf.spellPointsByLevel) {
        conf.spellPointsByLevel = SpellPoints.filterLevelKeys(conf.spellPointsByLevel, maxLevel);
      }
      if (conf.leveledProgressionFormula) {
        conf.leveledProgressionFormula = SpellPoints.filterLevelKeys(conf.leveledProgressionFormula, maxLevel);
      }
      if (conf.spellPointsCosts) {
        conf.spellPointsCosts = SpellPoints.filterSpellLevelKeys(conf.spellPointsCosts, spellLevels);
      }

      if (!isset(template_item.flags?.spellpoints?.config)) {
        template_item.flags.spellpoints = {
          [`config`]: template_item.flags?.spellpoints?.override ? conf : {},
          [`override`]: template_item.flags?.spellpoints?.override
        };
      }



      template_item.flags.spellpoints.editable = data.editable && (game.user.isGM || SpellPoints.settings?.spGmOnly == false);

      template_item.flags.spellpoints.spFormulas = Object.fromEntries(Object.keys(SpellPoints.formulas).map(formula_key => [formula_key, game.i18n.localize(`dnd5e-spellpoints.${formula_key}`)]));
      const template_file = "modules/dnd5e-spellpoints/templates/spell-points-item.hbs";

      foundry.applications.handlebars.renderTemplate(template_file, template_item).then(function (html) {
        html_obj.addClass('spellpoints-item-sheet');
        $('.tab[data-tab="description"] .item-descriptions', html_obj).prepend(html);
        $('.tab.description', html_obj).scrollTop(SpellPoints.scroll);
        SpellPoints.scroll = 0;
        html_obj.on('change', function (e) {
          let scroll = $('.tab.description', html_obj).scrollTop();
          SpellPoints.scroll = scroll;
        });
      })


    }
  }
  static scroll = 0;
} // End SpellPoints class.


