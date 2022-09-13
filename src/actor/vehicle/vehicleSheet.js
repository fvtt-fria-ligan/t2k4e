import ActorSheetT2K from '../actorSheet.js';
import { T2K4E } from '../../system/config.js';

/**
 * Twilight 2000 Actor Sheet for Vehicles.
 * @extends {ActorSheetT2K} Extends the T2K ActorSheet
 */
export default class ActorSheetT2KVehicle extends ActorSheetT2K {
  /* ------------------------------------------- */
  /*  Sheet Properties                           */
  /* ------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['t2k4e', 'sheet', 'actor', 'vehicle'],
      width: 650,
      height: 715,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'crew' }],
    });
  }

  /* ------------------------------------------- */
  /*  Sheet Data Preparation                     */
  /* ------------------------------------------- */

  /** @override */
  async getData() {
    const sheetData = await super.getData();

    if (this.actor.type === 'vehicle') {
      this._prepareCrew(sheetData);
      this._prepareMountedWeapons(sheetData);
      sheetData.inVehicle = true;
    }

    return sheetData;
  }

  /* ------------------------------------------- */

  _prepareCrew(sheetData) {
    sheetData.crew = sheetData.system.crew.occupants.reduce((arr, o) => {
      o.actor = game.actors.get(o.id);
      // Creates a fake actor if it doesn't exist anymore in the database.
      if (!o.actor) {
        o.actor = {
          name: '{MISSING_CREW}',
          data: { data: { health: { value: 0, max: 0 } } },
          isCrewDeleted: true,
        };
      }
      arr.push(o);
      return arr;
    }, []);
    sheetData.crew.sort((o1, o2) => {
      const pos1 = T2K4E.vehicle.crewPositionFlags.indexOf(o1.position);
      const pos2 = T2K4E.vehicle.crewPositionFlags.indexOf(o2.position);
      if (pos1 < pos2) return -1;
      if (pos1 > pos2) return 1;
      // If they are at the same position, sort by their actor's names.
      if (o1.actor.name < o2.actor.name) return -1;
      if (o1.actor.name > o2.actor.name) return 1;
      return 0;
    });
    return sheetData;
  }

  /* ------------------------------------------- */

  _prepareMountedWeapons(sheetData) {
    const m = (i, slot) => i.type === 'weapon' && i.system.isMounted && i.system.mountSlot === slot;

    sheetData.mountedWeapons = {
      primary: sheetData.actor.items.filter(i => m(i, 1)),
      secondary: sheetData.actor.items.filter(i => m(i, 2)),
    };
    return sheetData;
  }

  /* ------------------------------------------- */
  /*  Crew Management                            */
  /* ------------------------------------------- */

  dropCrew(actorId) {
    const crew = game.actors.get(actorId);
    if (!crew) return;
    if (crew.type === 'vehicle') return ui.notifications.info('Vehicle inceptions are not allowed!');
    if (crew.type !== 'character' && crew.type !== 'npc') return;
    return this.actor.addVehicleOccupant(actorId);
  }

  /* ------------------------------------------- */
  /*  Sheet Listeners                            */
  /* ------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable.
    if (!this.options.editable) return;
    if (!this.isEditable) return;

    // Owner-only listeners.
    if (this.actor.isOwner) {
      // Crew
      html.find('.crew-edit').click(this._onCrewEdit.bind(this));
      html.find('.crew-remove').click(this._onCrewRemove.bind(this));
      html.find('.crew-expose').click(this._onExposeCrew.bind(this));
      html.find('.crew-position').change(this._onChangePosition.bind(this));
      // Items
      html.find('.item-mount').click(this._onWeaponMount.bind(this));
      html.find('.item-mount-move').click(this._onWeaponMountMove.bind(this));
    }
  }

  /* ------------------------------------------- */

  /**
   * @param {Event} event
   * @private
   */
  _onCrewEdit(event) {
    event.preventDefault();
    const elem = event.currentTarget;
    const crewId = elem.closest('.occupant').dataset.crewId;
    const actor = game.actors.get(crewId);
    return actor.sheet.render(true);
  }

  _onCrewRemove(event) {
    event.preventDefault();
    const elem = event.currentTarget;
    const crewId = elem.closest('.occupant').dataset.crewId;
    const occupants = this.actor.removeVehicleOccupant(crewId);
    return this.actor.update({ 'system.crew.occupants': occupants });
  }

  _onExposeCrew(event) {
    event.preventDefault();
    const elem = event.currentTarget;
    const crewId = elem.closest('.occupant').dataset.crewId;
    const position = this.actor.getVehicleOccupant(crewId)?.position;
    const exposed = elem.checked;
    return this.actor.addVehicleOccupant(crewId, position, exposed);
  }

  _onChangePosition(event) {
    event.preventDefault();
    const elem = event.currentTarget;
    const crewId = elem.closest('.occupant').dataset.crewId;
    const position = elem.value;
    const exposed = this.actor.getVehicleOccupant(crewId)?.exposed;
    return this.actor.addVehicleOccupant(crewId, position, exposed);
  }

  /* ------------------------------------------- */

  _onWeaponMount(event) {
    event.preventDefault();
    const elem = event.currentTarget;
    const itemId = elem.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (item.system.isMounted) {
      return item.update({ 'system.equipped': false });
    }
    else {
      return item.update({
        'system.equipped': true,
        'system.props.mounted': true,
        'system.mountSlot': 1,
      });
    }
  }

  _onWeaponMountMove(event) {
    event.preventDefault();
    const elem = event.currentTarget;
    const itemId = elem.closest('.item').dataset.itemId;
    const item = this.actor.items.get(itemId);
    let slot = item.system.mountSlot;

    if (slot > 1) slot--;
    else slot++;

    return item.update({ 'system.mountSlot': slot });
  }
}
