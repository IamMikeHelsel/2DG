import { Scene, GameObjects } from 'phaser';

interface PartyMember {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isLeader: boolean;
}

export class PartyUI {
  private scene: Scene;
  private container: GameObjects.Container;
  private background: GameObjects.Rectangle;
  private titleText: GameObjects.Text;
  private memberContainers: GameObjects.Container[] = [];
  private createButton: GameObjects.Container;
  private leaveButton: GameObjects.Container;
  private isVisible: boolean = false;
  private currentPartyId: string = "";
  private members: PartyMember[] = [];
  private onPartyAction?: (action: string, data?: any) => void;

  constructor(scene: Scene) {
    this.scene = scene;

    // Create main container positioned at top-right
    this.container = scene.add.container(
      scene.cameras.main.width - 160,
      10
    );
    this.container.setDepth(90);
    this.container.setVisible(false);

    // Create background
    this.background = scene.add.rectangle(0, 0, 300, 200, 0x000000, 0.8);
    this.background.setStrokeStyle(2, 0x444444);
    this.background.setOrigin(0, 0);
    this.container.add(this.background);

    // Create title
    this.titleText = scene.add.text(10, 10, 'Party', {
      fontSize: '16px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    this.container.add(this.titleText);

    // Create party control buttons
    this.createButton = this.createButtonElement('Create Party', 10, 160, () => {
      this.onPartyAction?.('create');
    });
    this.container.add(this.createButton);

    this.leaveButton = this.createButtonElement('Leave Party', 150, 160, () => {
      this.onPartyAction?.('leave');
    });
    this.container.add(this.leaveButton);
    this.leaveButton.setVisible(false);

    // Handle screen resize
    this.scene.scale.on('resize', () => this.updatePosition());
  }

  private createButtonElement(text: string, x: number, y: number, onClick: () => void): GameObjects.Container {
    const buttonContainer = this.scene.add.container(x, y);
    
    const buttonBg = this.scene.add.rectangle(0, 0, 120, 25, 0x333333, 0.9);
    buttonBg.setOrigin(0, 0.5);
    buttonBg.setStrokeStyle(1, 0x666666);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.scene.add.text(5, 0, text, {
      fontSize: '12px',
      color: '#ffffff'
    });
    buttonText.setOrigin(0, 0.5);

    // Add hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x555555, 1);
      buttonText.setColor('#ffff00');
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x333333, 0.9);
      buttonText.setColor('#ffffff');
    });

    buttonBg.on('pointerdown', onClick);

    buttonContainer.add([buttonBg, buttonText]);
    return buttonContainer;
  }

  show() {
    this.isVisible = true;
    this.container.setVisible(true);
    this.updatePosition();
  }

  hide() {
    this.isVisible = false;
    this.container.setVisible(false);
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  setPartyActionHandler(handler: (action: string, data?: any) => void) {
    this.onPartyAction = handler;
  }

  updatePartyState(partyId: string, members: PartyMember[]) {
    this.currentPartyId = partyId;
    this.members = members;
    this.refreshDisplay();
  }

  clearParty() {
    this.currentPartyId = "";
    this.members = [];
    this.refreshDisplay();
  }

  private refreshDisplay() {
    // Clear existing member displays
    this.memberContainers.forEach(container => container.destroy());
    this.memberContainers = [];

    const hasParty = this.currentPartyId !== "";
    
    // Update button visibility
    this.createButton.setVisible(!hasParty);
    this.leaveButton.setVisible(hasParty);

    if (!hasParty) {
      this.titleText.setText('Party');
      // Resize background for no party state
      this.background.setSize(300, 60);
      return;
    }

    this.titleText.setText(`Party (${this.members.length}/5)`);

    // Create member displays
    this.members.forEach((member, index) => {
      const memberContainer = this.createMemberDisplay(member, index);
      this.container.add(memberContainer);
      this.memberContainers.push(memberContainer);
    });

    // Resize background to fit content
    const contentHeight = Math.max(100, 40 + (this.members.length * 25) + 35);
    this.background.setSize(300, contentHeight);
  }

  private createMemberDisplay(member: PartyMember, index: number): GameObjects.Container {
    const yOffset = 35 + (index * 25);
    const memberContainer = this.scene.add.container(10, yOffset);

    // Member name with leader indicator
    const nameText = member.isLeader ? `👑 ${member.name}` : member.name;
    const memberText = this.scene.add.text(0, 0, nameText, {
      fontSize: '12px',
      color: member.isLeader ? '#ffff00' : '#ffffff'
    });
    memberContainer.add(memberText);

    // Health bar background
    const hpBarBg = this.scene.add.rectangle(150, 0, 100, 8, 0x333333);
    hpBarBg.setStrokeStyle(1, 0x666666);
    memberContainer.add(hpBarBg);

    // Health bar fill
    const hpPercent = Math.max(0, Math.min(1, member.hp / member.maxHp));
    const hpBarWidth = 98 * hpPercent;
    const hpColor = hpPercent > 0.6 ? 0x00ff00 : hpPercent > 0.3 ? 0xffff00 : 0xff0000;
    
    if (hpBarWidth > 0) {
      const hpBar = this.scene.add.rectangle(151, 0, hpBarWidth, 6, hpColor);
      hpBar.setOrigin(0, 0.5);
      memberContainer.add(hpBar);
    }

    // Health text
    const hpText = this.scene.add.text(255, 0, `${member.hp}/${member.maxHp}`, {
      fontSize: '10px',
      color: '#cccccc'
    });
    hpText.setOrigin(0, 0.5);
    memberContainer.add(hpText);

    return memberContainer;
  }

  private updatePosition() {
    this.container.setPosition(
      this.scene.cameras.main.width - 160,
      10
    );
  }

  handleInvitation(fromName: string, fromId: string, partyId: string) {
    // Show invitation dialog or notification
    // For now, we'll use a simple browser confirm
    const accept = window.confirm(`${fromName} invited you to their party. Accept?`);
    
    if (accept && this.onPartyAction) {
      this.onPartyAction('join', { partyId });
    }
  }

  showInviteDialog() {
    // Simple implementation - in a real game you'd have a proper player list
    const targetName = window.prompt('Enter player name to invite:');
    if (targetName && this.onPartyAction) {
      this.onPartyAction('invite', { targetName });
    }
  }

  destroy() {
    this.container?.destroy();
  }
}