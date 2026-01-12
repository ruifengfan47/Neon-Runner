export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  BOSS_FIGHT = 'BOSS_FIGHT'
}

export enum EntityType {
  PLAYER = 'PLAYER',
  OBSTACLE = 'OBSTACLE',
  ENEMY_DRONE = 'ENEMY_DRONE',
  ENEMY_WALKER = 'ENEMY_WALKER',
  ENEMY_TURRET = 'ENEMY_TURRET', 
  ENEMY_KAMIKAZE = 'ENEMY_KAMIKAZE', // New: Fast suicide unit
  ENEMY_TANK = 'ENEMY_TANK', // New: Slow high HP unit
  BOSS = 'BOSS',
  PROJECTILE_PLAYER = 'PROJECTILE_PLAYER',
  PROJECTILE_GRENADE = 'PROJECTILE_GRENADE', // New: Arcing projectile
  PROJECTILE_ENEMY = 'PROJECTILE_ENEMY',
  LASER_WARNING = 'LASER_WARNING', 
  LASER_BEAM = 'LASER_BEAM', 
  COLLECTIBLE = 'COLLECTIBLE',
  MEDKIT = 'MEDKIT', 
  WEAPON_DROP = 'WEAPON_DROP', 
  PARTICLE = 'PARTICLE',
  EXPLOSION = 'EXPLOSION'
}

export enum WeaponType {
  PISTOL = 'PISTOL',
  LASER = 'LASER',
  SHOTGUN = 'SHOTGUN',
  PLASMA_CANNON = 'PLASMA_CANNON',
  RAILGUN = 'RAILGUN', // New: Piercing, high speed
  GRENADE_LAUNCHER = 'GRENADE_LAUNCHER' // New: AOE
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface Entity extends Rect, Velocity {
  id: string;
  type: EntityType;
  color: string;
  hp?: number;
  maxHp?: number;
  toBeRemoved?: boolean;
  opacity?: number;
  rotation?: number;
  scale?: number;
  animationFrame?: number;
  facing?: -1 | 1; 
  
  // Specific props
  weaponType?: WeaponType; 
  attackTimer?: number; 
  attackState?: 'IDLE' | 'BARRAGE' | 'LASER_CHARGE' | 'LASER_FIRE'; 
  
  // Projectile props
  piercing?: boolean; // For Railgun
  homing?: boolean; // For Homing Perk
  
  // For particles/explosions
  life?: number;
  maxLife?: number;
  vx?: number;
  vy?: number;
  glow?: boolean;
}

export interface Perk {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
  icon: string;
  apply: (stats: PlayerStats) => void;
}

export interface PlayerStats {
  jumpForce: number;
  gravity: number;
  maxJumps: number;
  magnetRange: number;
  scoreMultiplier: number;
  hasShield: boolean;
  speedMultiplier: number;
  weapon: WeaponType;
  damage: number;
  fireRate: number; 
  spread: number;
  maxHp: number;
  moveSpeed: number;
  // New Stats
  lifesteal: number;
  critChance: number;
  homing: boolean;
  lowHpDamageBoost: boolean;
}

export interface GameScore {
  current: number;
  high: number;
  shards: number;
  level: number;
  shardTarget: number;
}