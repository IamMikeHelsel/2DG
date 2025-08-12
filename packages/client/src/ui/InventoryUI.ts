import { Scene, GameObjects, Input } from 'phaser';
import { INVENTORY_SIZE, BASE_ITEMS, EquipSlot, type InventoryItem, type BaseItem } from '@toodee/shared';

interface InventorySlotData {
  x: number;
  y: number;
  item: InventoryItem | null;
}

interface EquipmentData {
  weapon: InventoryItem | null;
  armor: InventoryItem | null;
  accessory: InventoryItem | null;
}

export class InventoryUI {
  private scene: Scene;
  private container: GameObjects.Container;
  private background: GameObjects.Rectangle;
  private isShowing: boolean = false;
  
  // Inventory grid
  private slotSize = 48;
  private slotSpacing = 4;
  private slots: GameObjects.Container[] = [];
  private slotBackgrounds: GameObjects.Rectangle[] = [];
  private slotItems: GameObjects.Container[] = [];
  
  // Equipment slots
  private equipmentContainer: GameObjects.Container;
  private equipmentSlots: { [key in EquipSlot]: GameObjects.Container } = {} as any;
  
  // Drag and drop
  private draggedItem: GameObjects.Container | null = null;
  private dragStartSlot: { x: number; y: number } | null = null;
  private isDragging = false;
  
  // Tooltip
  private tooltip: GameObjects.Container;
  private tooltipBackground: GameObjects.Rectangle;
  private tooltipText: GameObjects.Text;
  
  // Data
  private inventoryData: InventorySlotData[] = [];
  private equipmentData: EquipmentData = {
    weapon: null,
    armor: null,
    accessory: null
  };

  constructor(scene: Scene) {
    this.scene = scene;
    this.createUI();
    this.createTooltip();
    this.setupInputHandlers();
  }

  private createUI() {
    // Main container
    this.container = this.scene.add.container(100, 100);
    this.container.setDepth(50);
    this.container.setVisible(false);

    // Background
    const totalWidth = INVENTORY_SIZE.width * (this.slotSize + this.slotSpacing) + 200; // Extra for equipment
    const totalHeight = INVENTORY_SIZE.height * (this.slotSize + this.slotSpacing) + 60;
    
    this.background = this.scene.add.rectangle(0, 0, totalWidth, totalHeight, 0x2a2a2a, 0.95);
    this.background.setStrokeStyle(2, 0x555555);
    this.container.add(this.background);

    // Title
    const title = this.scene.add.text(0, -totalHeight/2 + 20, 'Inventory', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Create inventory slots
    this.createInventoryGrid();
    
    // Create equipment slots
    this.createEquipmentSlots();

    // Close button
    const closeButton = this.scene.add.text(totalWidth/2 - 20, -totalHeight/2 + 20, '×', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    closeButton.setOrigin(0.5, 0.5);
    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.hide());
    this.container.add(closeButton);
  }

  private createInventoryGrid() {
    const startX = -INVENTORY_SIZE.width * (this.slotSize + this.slotSpacing) / 2 + this.slotSize / 2;
    const startY = -INVENTORY_SIZE.height * (this.slotSize + this.slotSpacing) / 2 + this.slotSize / 2 + 40;

    for (let y = 0; y < INVENTORY_SIZE.height; y++) {
      for (let x = 0; x < INVENTORY_SIZE.width; x++) {
        const slotX = startX + x * (this.slotSize + this.slotSpacing);
        const slotY = startY + y * (this.slotSize + this.slotSpacing);

        // Slot container
        const slotContainer = this.scene.add.container(slotX, slotY);
        
        // Slot background
        const slotBg = this.scene.add.rectangle(0, 0, this.slotSize, this.slotSize, 0x444444, 0.8);
        slotBg.setStrokeStyle(1, 0x666666);
        slotBg.setInteractive();
        
        // Item container for this slot
        const itemContainer = this.scene.add.container(0, 0);
        
        slotContainer.add([slotBg, itemContainer]);
        this.container.add(slotContainer);
        
        this.slots.push(slotContainer);
        this.slotBackgrounds.push(slotBg);
        this.slotItems.push(itemContainer);

        // Setup slot interactions
        this.setupSlotInteractions(slotBg, x, y);

        // Initialize slot data
        this.inventoryData.push({ x, y, item: null });
      }
    }
  }

  private createEquipmentSlots() {
    this.equipmentContainer = this.scene.add.container(150, 0);
    this.container.add(this.equipmentContainer);

    const equipmentTitle = this.scene.add.text(0, -120, 'Equipment', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    equipmentTitle.setOrigin(0.5, 0.5);
    this.equipmentContainer.add(equipmentTitle);

    // Create equipment slots
    const equipSlots = [
      { slot: EquipSlot.Weapon, x: 0, y: -60, label: 'Weapon' },
      { slot: EquipSlot.Armor, x: 0, y: 0, label: 'Armor' },
      { slot: EquipSlot.Accessory, x: 0, y: 60, label: 'Accessory' }
    ];

    equipSlots.forEach(({ slot, x, y, label }) => {
      const slotContainer = this.scene.add.container(x, y);
      
      const slotBg = this.scene.add.rectangle(0, 0, this.slotSize, this.slotSize, 0x444444, 0.8);
      slotBg.setStrokeStyle(1, 0x888888);
      slotBg.setInteractive();
      
      const slotLabel = this.scene.add.text(0, this.slotSize/2 + 15, label, {
        fontSize: '12px',
        color: '#cccccc'
      });
      slotLabel.setOrigin(0.5, 0.5);
      
      const itemContainer = this.scene.add.container(0, 0);
      
      slotContainer.add([slotBg, itemContainer, slotLabel]);
      this.equipmentContainer.add(slotContainer);
      
      this.equipmentSlots[slot] = slotContainer;
      
      // Setup equipment slot interactions
      this.setupEquipmentSlotInteractions(slotBg, slot);
    });
  }

  private createTooltip() {
    this.tooltip = this.scene.add.container(0, 0);
    this.tooltip.setDepth(100);
    this.tooltip.setVisible(false);

    this.tooltipBackground = this.scene.add.rectangle(0, 0, 200, 100, 0x000000, 0.9);
    this.tooltipBackground.setStrokeStyle(1, 0xffffff);
    
    this.tooltipText = this.scene.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 180 }
    });
    this.tooltipText.setOrigin(0.5, 0.5);
    
    this.tooltip.add([this.tooltipBackground, this.tooltipText]);
    this.scene.add.existing(this.tooltip);
  }

  private setupInputHandlers() {
    // Toggle inventory with 'I' key
    this.scene.input.keyboard?.on('keydown-I', () => {
      this.toggle();
    });

    // Hide tooltip when mouse moves away
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) {
        this.hideTooltip();
      }
    });
  }

  private setupSlotInteractions(slotBg: GameObjects.Rectangle, x: number, y: number) {
    // Hover effects
    slotBg.on('pointerover', () => {
      slotBg.setFillStyle(0x555555);
      this.showTooltipForSlot(x, y);
    });

    slotBg.on('pointerout', () => {
      slotBg.setFillStyle(0x444444);
    });

    // Click handling
    slotBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleSlotClick(x, y, pointer);
    });

    slotBg.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.handleSlotRelease(x, y, pointer);
    });
  }

  private setupEquipmentSlotInteractions(slotBg: GameObjects.Rectangle, equipSlot: EquipSlot) {
    slotBg.on('pointerover', () => {
      slotBg.setFillStyle(0x555555);
      this.showTooltipForEquipment(equipSlot);
    });

    slotBg.on('pointerout', () => {
      slotBg.setFillStyle(0x444444);
    });

    slotBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleEquipmentClick(equipSlot, pointer);
    });
  }

  private handleSlotClick(x: number, y: number, pointer: Phaser.Input.Pointer) {
    const slotData = this.inventoryData.find(slot => slot.x === x && slot.y === y);
    if (!slotData || !slotData.item) return;

    if (pointer.rightButtonDown()) {
      // Right click - use item or equip
      this.handleRightClick(x, y);
    } else {
      // Left click - start drag
      this.startDrag(x, y);
    }
  }

  private handleSlotRelease(x: number, y: number, pointer: Phaser.Input.Pointer) {
    if (this.isDragging && this.draggedItem) {
      this.handleDrop(x, y);
    }
  }

  private handleEquipmentClick(equipSlot: EquipSlot, pointer: Phaser.Input.Pointer) {
    const item = this.equipmentData[equipSlot];
    if (!item) return;

    if (pointer.rightButtonDown()) {
      // Unequip item
      this.unequipItem(equipSlot);
    }
  }

  private handleRightClick(x: number, y: number) {
    const slotData = this.inventoryData.find(slot => slot.x === x && slot.y === y);
    if (!slotData || !slotData.item) return;

    const baseItem = BASE_ITEMS[slotData.item.itemId];
    if (!baseItem) return;

    if (baseItem.equipSlot) {
      // Equip item
      this.equipItem(x, y, baseItem.equipSlot);
    } else if (baseItem.type === 'consumable') {
      // Use consumable
      this.useItem(x, y);
    }
  }

  private startDrag(x: number, y: number) {
    const slotIndex = y * INVENTORY_SIZE.width + x;
    const itemContainer = this.slotItems[slotIndex];
    
    if (itemContainer.list.length === 0) return;

    this.isDragging = true;
    this.dragStartSlot = { x, y };
    this.draggedItem = itemContainer;
    
    // Make dragged item follow cursor
    this.scene.input.on('pointermove', this.handleDragMove, this);
  }

  private handleDragMove = (pointer: Phaser.Input.Pointer) => {
    if (this.draggedItem && this.isDragging) {
      // Convert screen coordinates to world coordinates relative to container
      const localPoint = this.container.getLocalPoint(pointer.x, pointer.y);
      this.draggedItem.setPosition(localPoint.x, localPoint.y);
    }
  };

  private handleDrop(x: number, y: number) {
    if (!this.dragStartSlot || !this.draggedItem) return;

    this.isDragging = false;
    this.scene.input.off('pointermove', this.handleDragMove, this);

    // Send move message to server
    this.scene.events.emit('inventory:move', {
      fromX: this.dragStartSlot.x,
      fromY: this.dragStartSlot.y,
      toX: x,
      toY: y
    });

    // Reset drag state
    this.draggedItem = null;
    this.dragStartSlot = null;
  }

  private equipItem(x: number, y: number, equipSlot: EquipSlot) {
    this.scene.events.emit('inventory:equip', {
      inventoryX: x,
      inventoryY: y,
      equipSlot: equipSlot
    });
  }

  private unequipItem(equipSlot: EquipSlot) {
    // Server will handle finding an empty slot
    this.scene.events.emit('inventory:unequip', {
      equipSlot: equipSlot
    });
  }

  private useItem(x: number, y: number) {
    this.scene.events.emit('inventory:use', {
      inventoryX: x,
      inventoryY: y
    });
  }

  private showTooltipForSlot(x: number, y: number) {
    const slotData = this.inventoryData.find(slot => slot.x === x && slot.y === y);
    if (!slotData || !slotData.item) {
      this.hideTooltip();
      return;
    }

    const baseItem = BASE_ITEMS[slotData.item.itemId];
    if (!baseItem) {
      this.hideTooltip();
      return;
    }

    this.showTooltip(baseItem, slotData.item);
  }

  private showTooltipForEquipment(equipSlot: EquipSlot) {
    const item = this.equipmentData[equipSlot];
    if (!item) {
      this.hideTooltip();
      return;
    }

    const baseItem = BASE_ITEMS[item.itemId];
    if (!baseItem) {
      this.hideTooltip();
      return;
    }

    this.showTooltip(baseItem, item);
  }

  private showTooltip(baseItem: BaseItem, item: InventoryItem) {
    let tooltipContent = `${baseItem.icon} ${baseItem.name}\n`;
    tooltipContent += `${baseItem.description}\n`;
    
    if (item.quantity > 1) {
      tooltipContent += `Quantity: ${item.quantity}\n`;
    }
    
    if (baseItem.stats) {
      tooltipContent += '\nStats:\n';
      if (baseItem.stats.damage) tooltipContent += `Damage: +${baseItem.stats.damage}\n`;
      if (baseItem.stats.defense) tooltipContent += `Defense: +${baseItem.stats.defense}\n`;
      if (baseItem.stats.health) tooltipContent += `Health: +${baseItem.stats.health}\n`;
      if (baseItem.stats.speed) tooltipContent += `Speed: +${baseItem.stats.speed}\n`;
    }
    
    tooltipContent += `\nValue: ${baseItem.value} gold`;
    
    this.tooltipText.setText(tooltipContent);
    
    // Adjust tooltip size
    const bounds = this.tooltipText.getBounds();
    this.tooltipBackground.setSize(bounds.width + 20, bounds.height + 20);
    
    // Position tooltip at cursor
    const pointer = this.scene.input.activePointer;
    this.tooltip.setPosition(pointer.x + 10, pointer.y - 10);
    this.tooltip.setVisible(true);
  }

  private hideTooltip() {
    this.tooltip.setVisible(false);
  }

  private renderSlot(x: number, y: number, item: InventoryItem | null) {
    const slotIndex = y * INVENTORY_SIZE.width + x;
    const itemContainer = this.slotItems[slotIndex];
    
    // Clear existing item display
    itemContainer.removeAll(true);
    
    if (!item) return;
    
    const baseItem = BASE_ITEMS[item.itemId];
    if (!baseItem) return;
    
    // Item icon
    const itemIcon = this.scene.add.text(0, 0, baseItem.icon, {
      fontSize: '24px'
    });
    itemIcon.setOrigin(0.5, 0.5);
    itemContainer.add(itemIcon);
    
    // Quantity text for stackable items
    if (item.quantity > 1) {
      const quantityText = this.scene.add.text(this.slotSize/2 - 8, this.slotSize/2 - 8, item.quantity.toString(), {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000'
      });
      quantityText.setOrigin(1, 1);
      itemContainer.add(quantityText);
    }
  }

  private renderEquipmentSlot(equipSlot: EquipSlot, item: InventoryItem | null) {
    const slotContainer = this.equipmentSlots[equipSlot];
    const itemContainer = slotContainer.list[1] as GameObjects.Container; // Second item is the item container
    
    // Clear existing item display
    itemContainer.removeAll(true);
    
    if (!item) return;
    
    const baseItem = BASE_ITEMS[item.itemId];
    if (!baseItem) return;
    
    // Item icon
    const itemIcon = this.scene.add.text(0, 0, baseItem.icon, {
      fontSize: '24px'
    });
    itemIcon.setOrigin(0.5, 0.5);
    itemContainer.add(itemIcon);
  }

  // Public methods for updating inventory state
  public updateInventory(slots: InventorySlotData[]) {
    this.inventoryData = slots;
    
    // Re-render all slots
    for (let y = 0; y < INVENTORY_SIZE.height; y++) {
      for (let x = 0; x < INVENTORY_SIZE.width; x++) {
        const slotData = slots.find(slot => slot.x === x && slot.y === y);
        this.renderSlot(x, y, slotData?.item || null);
      }
    }
  }

  public updateEquipment(equipment: EquipmentData) {
    this.equipmentData = equipment;
    
    // Re-render equipment slots
    this.renderEquipmentSlot(EquipSlot.Weapon, equipment.weapon);
    this.renderEquipmentSlot(EquipSlot.Armor, equipment.armor);
    this.renderEquipmentSlot(EquipSlot.Accessory, equipment.accessory);
  }

  public show() {
    this.isShowing = true;
    this.container.setVisible(true);
    
    // Position in center of screen
    const camera = this.scene.cameras.main;
    this.container.setPosition(camera.width / 2, camera.height / 2);
  }

  public hide() {
    this.isShowing = false;
    this.container.setVisible(false);
    this.hideTooltip();
  }

  public toggle() {
    if (this.isShowing) {
      this.hide();
    } else {
      this.show();
    }
  }

  public isVisible(): boolean {
    return this.isShowing;
  }

  public destroy() {
    this.container.destroy();
    this.tooltip.destroy();
  }
}