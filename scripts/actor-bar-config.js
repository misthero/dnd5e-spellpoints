import { SpellPoints } from "./spellpoints.js";

/**
 * Spell Points Configuration
 * @extends {dnd5e.applications.actor.BaseConfigSheetV2}
 */
export class ActorSpellPointsConfig extends dnd5e.applications.actor.BaseConfigSheetV2 {
  constructor(options) {
    foundry.utils.mergeObject(options ?? {}, {
      classes: [
        "standard-form", "config-sheet", "themed",
        "sheet", "dnd5e2", "spellpoints", "application"
      ],
      position: { width: 420 },
      submitOnClose: true,
      editable: true,
      submitOnChange: false,
      closeOnSubmit: false,
      actions: {
        updateSpellPointMax: ActorSpellPointsConfig._updateSpellPointMax,
        deleteRecovery: ActorSpellPointsConfig._deleteRecovery,
        addRecovery: ActorSpellPointsConfig._addRecovery,
      },
    });
    super(options);
  }

  /** @override */
  static PARTS = {
    config: {
      template: "modules/dnd5e-spellpoints/templates/spell-points-popup-config.hbs"
    }
  };

  /** Build the data context for spell-points-popup-config template */
  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const actor = this.document.parent;

    context.uses = this.document.system.uses;
    context.uses.value = context.uses.max - context.uses.spent;
    context.img = this.document.img;
    context.name = this.document.name;
    context.recovery = game.system.config.limitedUsePeriods;

    // Limited Uses
    context.recoveryPeriods = [
      ...Object.entries(CONFIG.DND5E.limitedUsePeriods)
        .filter(([, { deprecated }]) => !deprecated)
        .map(([value, { label }]) => ({ value, label, group: game.i18n.localize("DND5E.DurationTime") })),
      { value: "recharge", label: game.i18n.localize("DND5E.USES.Recovery.Recharge.Label") }
    ];
    context.recoveryTypes = [
      { value: "recoverAll", label: game.i18n.localize("DND5E.USES.Recovery.Type.RecoverAll") },
      { value: "loseAll", label: game.i18n.localize("DND5E.USES.Recovery.Type.LoseAll") },
      { value: "formula", label: game.i18n.localize("DND5E.USES.Recovery.Type.Formula") }
    ];

    let recovery = this.document.system.uses.recovery ?? [];
    if (!Array.isArray(recovery)) recovery = Object.values(recovery ?? {});
    context.usesRecovery = recovery.map((data, index) => ({
      data,
      prefix: `uses.recovery.${index}.`,
      source: context.uses?.recovery[index] ?? data,
      formulaOptions: data.period === "recharge" ? data.recharge?.options : null
    }));


    return context;
  }


  /** @override */
  async _processSubmitData(event, form, submitData) {
    const item = this.document;
    const FormDataExtended = new foundry.applications.ux.FormDataExtended(form);
    const data = foundry.utils.expandObject(FormDataExtended.object);
    // Calculate spent based on max and value
    data.uses.spent = data.uses.max - data.uses.value;

    // Merge the submitted data with the existing uses
    submitData = foundry.utils.mergeObject(submitData?.system?.uses ?? {}, data.uses);

    // Merge the changes with the item's system.uses
    const changedUses = foundry.utils.mergeObject(item.system.uses, data.uses);

    // Await the super's _processSubmitData and then re-render
    await super._processSubmitData(event, form, { [`system.uses`]: changedUses });
    this.document.system.uses = changedUses;
    // Refresh the data context and re-render the sheet
    this.render();
  }

  /** Dispatch your three custom actions */
  _onSheetAction(event) {
    const action = event.currentTarget.dataset.action;
    switch (action) {
      case "addRecovery": return this._onAddRecovery();
      case "deleteRecovery": return this._onDeleteRecovery(event.currentTarget);
      case "updateSpellPointMax": return this._onUpdateMax();
    }
  }


  static _addRecovery(event, target) {
    const uses = foundry.utils.duplicate(this.document.system.uses);
    uses.recovery = [...(uses.recovery || []), {}];
    this.document.update({ [`system.uses.recovery`]: uses.recovery });
  }


  static _deleteRecovery(event, target) {
    const idx = Number(target.closest("[data-index]").dataset.index);
    const uses = foundry.utils.duplicate(this.document.system.uses);
    // Convert object to array if necessary
    if (!Array.isArray(uses.recovery)) {
      uses.recovery = Object.values(uses.recovery || {});
    }
    uses.recovery.splice(idx, 1);
    this.document.update({ [`system.uses.recovery`]: uses.recovery });
  }

  static async _updateSpellPointMax(event, target) {
    const uses = foundry.utils.duplicate(this.document.system.uses);
    const item = this.document;
    const actor = item.parent;
    await SpellPoints.updateSpellPointsMax({}, {}, actor, item);
    this.render(true);
  }

  get title() {
    return `${game.i18n.localize("dnd5e-spellpoints.ItemConfig")}: ${this.document.name}`;
  }
}