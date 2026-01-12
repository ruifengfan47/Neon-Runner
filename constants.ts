import { Perk } from './types';
import { WeaponType } from './types';
import { Shield, Zap, Magnet, ArrowUp, Feather, Clock, Crosshair, Heart, Flame, Target, Skull, Activity } from 'lucide-react';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;
export const GROUND_HEIGHT = 80;

export const INITIAL_PLAYER_STATS = {
  jumpForce: 18, 
  gravity: 0.8,
  maxJumps: 2, 
  magnetRange: 250,
  scoreMultiplier: 1,
  hasShield: false,
  speedMultiplier: 1.0,
  weapon: WeaponType.PISTOL,
  damage: 25,
  fireRate: 8,
  spread: 0,
  maxHp: 100,
  moveSpeed: 9,
  lifesteal: 0,
  critChance: 0,
  homing: false,
  lowHpDamageBoost: false
};

export const BASE_SCROLL_SPEED = 9;
export const SPAWN_RATE_FRAMES = 70;

export const PERKS: Perk[] = [
  {
    id: 'plasma_cannon',
    name: 'Plasma Cannon',
    description: 'Fires massive energy balls.',
    rarity: 'legendary',
    icon: 'Flame',
    apply: (stats) => { stats.weapon = WeaponType.PLASMA_CANNON; stats.damage = 60; stats.fireRate = 18; }
  },
  {
    id: 'railgun',
    name: 'Railgun Prototype',
    description: 'Piercing high-velocity rounds.',
    rarity: 'legendary',
    icon: 'Zap',
    apply: (stats) => { stats.weapon = WeaponType.RAILGUN; stats.damage = 45; stats.fireRate = 25; }
  },
  {
    id: 'grenade_launcher',
    name: 'Grenade Module',
    description: 'Lob explosive rounds that deal area damage.',
    rarity: 'legendary',
    icon: 'Skull',
    apply: (stats) => { stats.weapon = WeaponType.GRENADE_LAUNCHER; stats.damage = 80; stats.fireRate = 35; }
  },
  {
    id: 'damage_up',
    name: 'High-Voltage Amp',
    description: 'Increase damage by 30%.',
    rarity: 'common',
    icon: 'Zap',
    apply: (stats) => { stats.damage *= 1.3; }
  },
  {
    id: 'cyber_heart',
    name: 'Titanium Skeleton',
    description: 'Increase Max HP by 50 and full heal.',
    rarity: 'rare',
    icon: 'Heart',
    apply: (stats) => { stats.maxHp += 50; } 
  },
  {
    id: 'scatter_shot',
    name: 'Flak Module',
    description: 'Unlock spread fire shotgun mode.',
    rarity: 'rare',
    icon: 'Crosshair',
    apply: (stats) => { stats.weapon = WeaponType.SHOTGUN; stats.spread = 0.35; stats.fireRate = 25; stats.damage = 25; }
  },
  {
    id: 'rapid_fire',
    name: 'Overclocked CPU',
    description: 'Fire rate increased by 40%.',
    rarity: 'rare',
    icon: 'Clock',
    apply: (stats) => { stats.fireRate = Math.max(3, stats.fireRate * 0.6); }
  },
  {
    id: 'shield_generator',
    name: 'Energy Barrier',
    description: 'Absorb one hit. Recharges every level.',
    rarity: 'common',
    icon: 'Shield',
    apply: (stats) => { stats.hasShield = true; }
  },
  {
    id: 'vampirism',
    name: 'Vampiric Nanobots',
    description: 'Heal 2 HP for every enemy killed.',
    rarity: 'legendary',
    icon: 'Heart',
    apply: (stats) => { stats.lifesteal += 2; }
  },
  {
    id: 'crit_lens',
    name: 'Critical Lens',
    description: '20% chance to deal Double Damage.',
    rarity: 'rare',
    icon: 'Crosshair',
    apply: (stats) => { stats.critChance += 0.2; }
  },
  {
    id: 'homing_tech',
    name: 'Smart Targeting',
    description: 'Projectiles slightly home in on enemies.',
    rarity: 'legendary',
    icon: 'Target',
    apply: (stats) => { stats.homing = true; }
  },
  {
    id: 'adrenaline',
    name: 'Adrenaline Pump',
    description: 'Deal more damage when health is low.',
    rarity: 'rare',
    icon: 'Activity',
    apply: (stats) => { stats.lowHpDamageBoost = true; }
  }
];

// Pink Cyberpunk / Vaporwave Palette
export const COLORS = {
  background: '#1a0515', 
  ground: '#0f000a',
  groundGrid: '#ff00ff', 
  
  // Player - High Contrast
  player: '#ffffff', 
  playerDark: '#ff00cc', 
  playerGlow: '#00ffff', 
  playerShielded: '#ffe700', 
  
  // Enemies
  enemy: '#ff003c', 
  enemyDark: '#8a0020',
  enemyGlow: '#ff003c',
  enemyTank: '#ff6600',
  enemyKamikaze: '#ffff00',
  
  // Boss
  boss: '#9d00ff', 
  bossDark: '#4b007a',
  bossGlow: '#9d00ff',
  
  // Projectiles
  projectilePlayer: '#00ffff', 
  projectilePlasma: '#ff00ff', 
  projectileRailgun: '#cc00ff',
  projectileGrenade: '#ffaa00',
  projectileEnemy: '#ff003c', 
  
  // Items
  shard: '#00ffff', 
  medkit: '#00ff66', 
  medkitGlow: '#00ff66',
  
  text: '#ff00ff',
  skyGradTop: '#0f0214', 
  skyGradBot: '#590042' 
};