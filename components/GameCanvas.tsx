import React, { useRef, useEffect } from 'react';
import { GameState, Entity, EntityType, PlayerStats, GameScore, Perk, WeaponType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_HEIGHT, INITIAL_PLAYER_STATS, BASE_SCROLL_SPEED, SPAWN_RATE_FRAMES, COLORS } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  onGameOver: (score: number) => void;
  onLevelUp: () => void;
  onScoreUpdate: (score: GameScore, hp: number, maxHp: number) => void;
  selectedPerk: Perk | null;
  resetTrigger: number;
  inputStateRef: React.MutableRefObject<{ left: boolean; right: boolean; jump: boolean; shoot: boolean; interact: boolean; mouseX: number; mouseY: number }>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  onGameOver, 
  onLevelUp, 
  onScoreUpdate, 
  selectedPerk,
  resetTrigger,
  inputStateRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const frameCountRef = useRef<number>(0);
  const scrollOffsetRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);
  
  // Refs for Game State
  const playerRef = useRef<Entity>({
    id: 'player', type: EntityType.PLAYER, 
    x: 100, y: CANVAS_HEIGHT - GROUND_HEIGHT - 70, w: 40, h: 70, 
    dx: 0, dy: 0, color: COLORS.player, hp: 100, maxHp: 100, facing: 1, animationFrame: 0
  });
  
  const entitiesRef = useRef<Entity[]>([]);
  const statsRef = useRef<PlayerStats>({ ...INITIAL_PLAYER_STATS });
  const scoreRef = useRef<GameScore>({ current: 0, high: 0, shards: 0, level: 1, shardTarget: 10 });
  const jumpsUsedRef = useRef<number>(0);
  const lastShotTimeRef = useRef<number>(0);
  const bossActiveRef = useRef<boolean>(false);
  const lastJumpInputRef = useRef<boolean>(false);
  
  // Layers
  const cityLayersRef = useRef<any[]>([]);
  const foregroundLayerRef = useRef<any[]>([]);

  // --- Initialization ---
  useEffect(() => {
    const CYBER_WORDS = ['NEON', 'CORP', 'DATA', 'RAM', 'CITY', '2077', 'NET', 'GRID', 'VOID', 'AI'];
    
    const generateSkyline = (heightMin: number, heightMax: number, widthMin: number, widthMax: number, color: string, zIndex: number) => {
      const buildings = [];
      let currentX = -200;
      while (currentX < CANVAS_WIDTH * 2.5) {
        const w = widthMin + Math.random() * (widthMax - widthMin);
        const h = heightMin + Math.random() * (heightMax - heightMin);
        const hasDancer = zIndex === 2 && Math.random() > 0.9 && h > 150;
        const hasFan = !hasDancer && Math.random() > 0.8;
        const neonSign = !hasDancer && !hasFan && Math.random() > 0.5;
        const signText = CYBER_WORDS[Math.floor(Math.random() * CYBER_WORDS.length)];
        
        buildings.push({ 
            x: currentX, y: CANVAS_HEIGHT - GROUND_HEIGHT - h, w, h, color, 
            windows: Math.random() > 0.3,
            hasDancer, hasFan, neonSign, signText,
            neonColor: Math.random() > 0.5 ? '#ff00ff' : '#00ffff'
        });
        currentX += w - 5;
      }
      return buildings;
    };

    const generateForeground = () => {
        const objects = [];
        let currentX = 0;
        while (currentX < CANVAS_WIDTH * 2) {
             const gap = Math.random() * 400 + 200;
             const type = Math.random();
             if (type > 0.6) {
                 objects.push({ x: currentX, y: 0, w: 60, h: CANVAS_HEIGHT, type: 'PILLAR' });
             } else {
                 objects.push({ x: currentX, y: CANVAS_HEIGHT - GROUND_HEIGHT - 60, w: 80, h: 60, type: 'DEBRIS' });
             }
             currentX += gap;
        }
        return objects;
    };

    cityLayersRef.current = [
      { speed: 0.1, elements: generateSkyline(400, 580, 100, 300, '#0a0005', 0) }, 
      { speed: 0.2, elements: generateSkyline(250, 450, 80, 200, '#14000a', 1) },  
      { speed: 0.5, elements: generateSkyline(100, 300, 60, 150, '#1f0010', 2) },  
    ];
    foregroundLayerRef.current = generateForeground();

  }, [resetTrigger]);

  useEffect(() => {
    if (selectedPerk) {
      selectedPerk.apply(statsRef.current);
      if (selectedPerk.id === 'cyber_heart') {
        playerRef.current.maxHp = statsRef.current.maxHp;
        playerRef.current.hp = statsRef.current.maxHp;
      }
      if (selectedPerk.id === 'shield') statsRef.current.hasShield = true;
    }
  }, [selectedPerk]);

  useEffect(() => {
    if (resetTrigger > 0) resetGame();
  }, [resetTrigger]);

  const resetGame = () => {
    playerRef.current = {
      id: 'player', type: EntityType.PLAYER, 
      x: 100, y: CANVAS_HEIGHT - GROUND_HEIGHT - 70, w: 40, h: 70, 
      dx: 0, dy: 0, color: COLORS.player, hp: 100, maxHp: 100, facing: 1, animationFrame: 0
    };
    entitiesRef.current = [];
    statsRef.current = { ...INITIAL_PLAYER_STATS };
    scoreRef.current = { current: 0, high: Number(localStorage.getItem('neon_runner_highscore') || 0), shards: 0, level: 1, shardTarget: 10 };
    bossActiveRef.current = false;
    frameCountRef.current = 0;
    lastShotTimeRef.current = -100; // FIX: Ensure we can shoot immediately after restart
    jumpsUsedRef.current = 0;
    onScoreUpdate({ ...scoreRef.current }, 100, 100);
  };

  const createExplosion = (x: number, y: number, color: string, scale: number = 1) => {
    entitiesRef.current.push({
        id: `exp_flash_${Date.now()}_${Math.random()}`,
        type: EntityType.EXPLOSION,
        x: x - 20 * scale, y: y - 20 * scale, w: 40 * scale, h: 40 * scale,
        color: '#ffffff', life: 5, maxLife: 5, glow: true
    });
    
    for (let i = 0; i < 12 * scale; i++) {
      entitiesRef.current.push({
        id: `p_${Date.now()}_${Math.random()}`,
        type: EntityType.PARTICLE,
        x, y, w: Math.random() * 6 * scale + 2, h: Math.random() * 6 * scale + 2,
        dx: (Math.random() - 0.5) * 15 * scale,
        dy: (Math.random() - 0.5) * 15 * scale,
        color: color,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        vx: 0, vy: 0.5,
        glow: Math.random() > 0.5
      });
    }
  };

  const spawnEntity = () => {
    if (bossActiveRef.current) return;

    const currentScore = scoreRef.current.current;

    // Boss Spawn
    if (currentScore > 0 && Math.floor(currentScore) % 3000 < 50 && Math.floor(currentScore) > 1000) {
      bossActiveRef.current = true;
      entitiesRef.current.push({
        id: `BOSS_${Date.now()}`, type: EntityType.BOSS,
        x: CANVAS_WIDTH + 150, y: CANVAS_HEIGHT - GROUND_HEIGHT - 300,
        w: 160, h: 140, dx: -2, dy: 0, color: COLORS.boss,
        hp: 800 * (1 + scoreRef.current.level * 0.2), 
        maxHp: 800 * (1 + scoreRef.current.level * 0.2),
        facing: -1,
        attackTimer: 0,
        attackState: 'IDLE'
      });
      return;
    }

    const typeRoll = Math.random();
    const x = CANVAS_WIDTH + 100;

    // Difficulty Stages
    const canSpawnWalker = currentScore > 300;
    const canSpawnTurret = currentScore > 1000;
    const canSpawnKamikaze = currentScore > 1500;
    const canSpawnTank = currentScore > 2500;

    if (typeRoll < 0.03) {
       // Weapon Drop
       const weaponRoll = Math.random();
       let wType = WeaponType.SHOTGUN;
       if (weaponRoll > 0.8) wType = WeaponType.PLASMA_CANNON;
       else if (weaponRoll > 0.6) wType = WeaponType.RAILGUN;
       else if (weaponRoll > 0.4) wType = WeaponType.GRENADE_LAUNCHER;
       else if (weaponRoll > 0.2) wType = WeaponType.LASER;

       entitiesRef.current.push({
         id: `w_${Date.now()}`, type: EntityType.WEAPON_DROP,
         x, y: CANVAS_HEIGHT - GROUND_HEIGHT - 60, w: 40, h: 40,
         dx: -BASE_SCROLL_SPEED, dy: 0, color: '#fff',
         weaponType: wType
       });
    } else if (typeRoll < 0.08) {
       entitiesRef.current.push({
         id: `m_${Date.now()}`, type: EntityType.MEDKIT,
         x, y: CANVAS_HEIGHT - GROUND_HEIGHT - 50, w: 30, h: 25,
         dx: -BASE_SCROLL_SPEED, dy: 0, color: COLORS.medkit
       });
    } else if (typeRoll < 0.2) {
       entitiesRef.current.push({
        id: `c_${Date.now()}`, type: EntityType.COLLECTIBLE,
        x, y: CANVAS_HEIGHT - GROUND_HEIGHT - 50 - Math.random() * 200, 
        w: 25, h: 25, dx: -BASE_SCROLL_SPEED, dy: 0, color: COLORS.shard
      });
    } else {
       // Enemy Spawning Logic based on difficulty
       let enemyType = EntityType.ENEMY_DRONE;
       
       // Higher score = higher chance for tougher enemies
       const enemyRoll = Math.random();
       
       if (canSpawnTank && enemyRoll > 0.9) enemyType = EntityType.ENEMY_TANK;
       else if (canSpawnKamikaze && enemyRoll > 0.8) enemyType = EntityType.ENEMY_KAMIKAZE;
       else if (canSpawnTurret && enemyRoll > 0.65) enemyType = EntityType.ENEMY_TURRET;
       else if (canSpawnWalker && enemyRoll > 0.45) enemyType = EntityType.ENEMY_WALKER;

       // Config Enemy
       if (enemyType === EntityType.ENEMY_TANK) {
           entitiesRef.current.push({
                id: `e_tank_${Date.now()}`, type: EntityType.ENEMY_TANK,
                x, y: CANVAS_HEIGHT - GROUND_HEIGHT - 90,
                w: 90, h: 80, dx: -BASE_SCROLL_SPEED * 0.4, dy: 0,
                color: COLORS.enemyTank, hp: 150, maxHp: 150, facing: -1,
                attackTimer: Math.random() * 100
           });
       } else if (enemyType === EntityType.ENEMY_KAMIKAZE) {
           entitiesRef.current.push({
                id: `e_kami_${Date.now()}`, type: EntityType.ENEMY_KAMIKAZE,
                x, y: CANVAS_HEIGHT - GROUND_HEIGHT - 100 - Math.random() * 200,
                w: 40, h: 40, dx: -BASE_SCROLL_SPEED * 1.5, dy: 0,
                color: COLORS.enemyKamikaze, hp: 20, maxHp: 20, facing: -1,
                attackTimer: 0
           });
       } else if (enemyType === EntityType.ENEMY_TURRET) {
            entitiesRef.current.push({
                id: `e_turret_${Date.now()}`, type: EntityType.ENEMY_TURRET,
                x, y: CANVAS_HEIGHT - GROUND_HEIGHT - 200 - Math.random() * 100,
                w: 60, h: 60, dx: -BASE_SCROLL_SPEED, dy: 0,
                color: '#ffaa00', hp: 50, maxHp: 50, facing: -1,
                attackTimer: Math.random() * 100
            });
       } else if (enemyType === EntityType.ENEMY_WALKER) {
            entitiesRef.current.push({
                id: `e_walker_${Date.now()}`, type: EntityType.ENEMY_WALKER,
                x, y: CANVAS_HEIGHT - GROUND_HEIGHT - 80,
                w: 60, h: 70, dx: -BASE_SCROLL_SPEED * 0.8, dy: 0,
                color: COLORS.enemy, hp: 60, maxHp: 60, facing: -1,
                attackTimer: Math.random() * 100
            });
       } else {
            // Drone (Default)
            entitiesRef.current.push({
                id: `e_drone_${Date.now()}`, type: EntityType.ENEMY_DRONE,
                x, y: CANVAS_HEIGHT - GROUND_HEIGHT - 120 - Math.random() * 250,
                w: 50, h: 40, dx: -BASE_SCROLL_SPEED * 1.1, dy: Math.sin(Date.now() / 1000) * 4,
                color: COLORS.enemy, hp: 30, maxHp: 30, facing: -1,
                attackTimer: Math.random() * 100
            });
       }
    }
  };

  const update = () => {
    if (gameState !== GameState.PLAYING && gameState !== GameState.BOSS_FIGHT) return;

    const input = inputStateRef.current;
    const player = playerRef.current;
    const stats = statsRef.current;
    
    // --- Aim Angle Calculation ---
    let currentAimAngle = 0;
    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const mouseCanvasX = (input.mouseX - rect.left) * scaleX;
        const mouseCanvasY = (input.mouseY - rect.top) * scaleY;
        const pCenterX = player.x + player.w/2;
        const pCenterY = player.y + player.h/2;
        currentAimAngle = Math.atan2(mouseCanvasY - pCenterY, mouseCanvasX - pCenterX);
    }

    // --- Movement & Animation ---
    if (input.left) { 
        player.dx = -stats.moveSpeed; 
        player.facing = -1; 
        player.animationFrame = (player.animationFrame || 0) + 1; 
    } else if (input.right) { 
        player.dx = stats.moveSpeed; 
        player.facing = 1; 
        player.animationFrame = (player.animationFrame || 0) + 1; 
    } else { 
        player.dx = 0; 
        player.animationFrame = 0; 
    }
    
    // Jump Logic
    if (input.jump && !lastJumpInputRef.current) {
        if (jumpsUsedRef.current < stats.maxJumps) {
            player.dy = -stats.jumpForce;
            jumpsUsedRef.current++;
            createExplosion(player.x + player.w/2, player.y + player.h, '#fff', 1);
        }
    }
    lastJumpInputRef.current = input.jump;

    // Physics
    player.x += player.dx;
    if (player.x < 0) player.x = 0;
    if (player.x > CANVAS_WIDTH - player.w) player.x = CANVAS_WIDTH - player.w;

    player.dy += stats.gravity;
    player.y += player.dy;

    const groundY = CANVAS_HEIGHT - GROUND_HEIGHT - player.h;
    if (player.y >= groundY) {
      player.y = groundY;
      player.dy = 0;
      jumpsUsedRef.current = 0;
    }

    // --- Shooting ---
    if (input.shoot && frameCountRef.current - lastShotTimeRef.current > stats.fireRate) {
      lastShotTimeRef.current = frameCountRef.current;
      // Removed screen shake for player shooting as requested
      
      const createProjectile = (angleOffset: number) => {
        const angle = currentAimAngle + angleOffset;
        const weapon = stats.weapon;
        
        let speed = 22;
        let size = 10;
        let color = COLORS.projectilePlayer;
        let piercing = false;
        let type = EntityType.PROJECTILE_PLAYER;
        let gravity = 0;

        if (weapon === WeaponType.PLASMA_CANNON) { speed = 15; size = 40; color = COLORS.projectilePlasma; }
        else if (weapon === WeaponType.LASER) { speed = 30; size = 6; color = '#ff00aa'; }
        else if (weapon === WeaponType.RAILGUN) { speed = 40; size = 100; color = COLORS.projectileRailgun; piercing = true; }
        else if (weapon === WeaponType.GRENADE_LAUNCHER) { speed = 18; size = 15; color = COLORS.projectileGrenade; type = EntityType.PROJECTILE_GRENADE; gravity = 0.5; }
        
        entitiesRef.current.push({
          id: `p_bullet_${Date.now()}_${angleOffset}_${Math.random()}`,
          type: type,
          x: player.x + player.w/2 + Math.cos(angle)*40, 
          y: player.y + player.h/2 + Math.sin(angle)*40,
          w: (weapon === WeaponType.LASER) ? 40 : size, 
          h: size,
          dx: Math.cos(angle) * speed, 
          dy: Math.sin(angle) * speed,
          vx: 0, vy: gravity, // For Grenades
          color: color,
          glow: true,
          life: (weapon === WeaponType.LASER) ? 2 : 100,
          piercing: piercing
        });
      };

      createProjectile(0);
      if (stats.weapon === WeaponType.SHOTGUN) {
        createProjectile(-0.15);
        createProjectile(0.15);
        createProjectile(-0.3);
        createProjectile(0.3);
      }
      
      // Removed Shoot Explosion visual on player to reduce shake/noise if desired, or keep it subtle
      // keeping subtle muzzle flash effect in drawPlayer
    }

    if (!bossActiveRef.current) {
        scrollOffsetRef.current += BASE_SCROLL_SPEED;
    }

    frameCountRef.current++;
    if (!bossActiveRef.current && frameCountRef.current % Math.floor(SPAWN_RATE_FRAMES / stats.speedMultiplier) === 0) {
      spawnEntity();
    }

    // --- Entity Processing ---
    for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
      const entity = entitiesRef.current[i];
      
      // BOSS LOGIC
      if (entity.type === EntityType.BOSS) {
         entity.attackTimer = (entity.attackTimer || 0) + 1;
         
         // Boss Movement
         if (entity.x > CANVAS_WIDTH - 300) entity.x -= 3;
         entity.y += Math.sin(frameCountRef.current * 0.02) * 1.5;

         // State Machine
         if (entity.attackState === 'IDLE') {
             if ((entity.attackTimer || 0) > 120) {
                 entity.attackTimer = 0;
                 entity.attackState = Math.random() > 0.6 ? 'LASER_CHARGE' : 'BARRAGE';
             }
         }
         else if (entity.attackState === 'BARRAGE') {
             if (entity.attackTimer && entity.attackTimer % 20 === 0 && entity.attackTimer < 100) {
                 for(let k = -0.3; k <= 0.3; k+=0.3) {
                    const angle = Math.atan2((player.y + player.h/2) - (entity.y + entity.h/2), (player.x + player.w/2) - (entity.x + entity.w/2)) + k;
                    entitiesRef.current.push({
                        id: `p_enemy_${Date.now()}_${k}`, type: EntityType.PROJECTILE_ENEMY,
                        x: entity.x, y: entity.y + entity.h/2, w: 20, h: 20,
                        dx: Math.cos(angle) * 8, dy: Math.sin(angle) * 8, color: COLORS.projectileEnemy, glow: true
                    });
                 }
             }
             if ((entity.attackTimer || 0) > 120) {
                 entity.attackTimer = 0;
                 entity.attackState = 'IDLE';
             }
         }
         else if (entity.attackState === 'LASER_CHARGE') {
             if (entity.attackTimer === 1) {
                entitiesRef.current.push({
                    id: `laser_warn_${Date.now()}`, type: EntityType.LASER_WARNING,
                    x: 0, y: entity.y + entity.h/2 - 5, w: CANVAS_WIDTH, h: 10,
                    dx: 0, dy: 0, color: '#ff00ff', life: 60
                });
             }
             if ((entity.attackTimer || 0) > 60) {
                 entity.attackState = 'LASER_FIRE';
                 entity.attackTimer = 0;
             }
         }
         else if (entity.attackState === 'LASER_FIRE') {
             if (entity.attackTimer === 1) {
                 screenShakeRef.current = 20;
                 entitiesRef.current.push({
                    id: `laser_beam_${Date.now()}`, type: EntityType.LASER_BEAM,
                    x: 0, y: entity.y + entity.h/2 - 50, w: CANVAS_WIDTH, h: 100,
                    dx: 0, dy: 0, color: '#fff', life: 40 
                 });
             }
             if ((entity.attackTimer || 0) > 40) {
                 entity.attackState = 'IDLE';
                 entity.attackTimer = 0;
             }
         }

      } 
      // ENEMY LOGIC
      else if (entity.type === EntityType.ENEMY_WALKER || entity.type === EntityType.ENEMY_TURRET || entity.type === EntityType.ENEMY_TANK) {
          if (!bossActiveRef.current) entity.x += entity.dx;
          entity.animationFrame = (entity.animationFrame || 0) + 1;
          entity.attackTimer = (entity.attackTimer || 0) + 1;
          
          let fireRate = 150;
          if (entity.type === EntityType.ENEMY_TANK) fireRate = 200;

          if ((entity.attackTimer || 0) > fireRate) {
              if (entity.x < CANVAS_WIDTH && entity.x > 0) { 
                  const angle = Math.atan2((player.y + player.h/2) - (entity.y + entity.h/2), (player.x + player.w/2) - (entity.x + entity.w/2));
                  const speed = entity.type === EntityType.ENEMY_TANK ? 5 : 7;
                  const size = entity.type === EntityType.ENEMY_TANK ? 25 : 15;
                  
                  entitiesRef.current.push({
                        id: `p_enemy_shot_${Date.now()}`, type: EntityType.PROJECTILE_ENEMY,
                        x: entity.x, y: entity.y + entity.h/2, w: size, h: size,
                        dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, color: COLORS.projectileEnemy, glow: true
                  });
              }
              entity.attackTimer = 0;
          }
      }
      else if (entity.type === EntityType.ENEMY_KAMIKAZE) {
          if (!bossActiveRef.current) entity.x += entity.dx;
          // Homing behavior for Kamikaze
          if (entity.x < CANVAS_WIDTH && entity.x > 0) {
             const dy = (player.y - entity.y) * 0.05;
             entity.y += dy;
          }
      }
      else if (entity.type.includes('PROJECTILE')) {
        entity.x += entity.dx;
        entity.y += entity.dy;
        if (entity.type === EntityType.PROJECTILE_GRENADE) {
            entity.dy += (entity.vy || 0); // Gravity
        }
        
        // Homing Logic for Player Projectiles (if perk)
        if (stats.homing && entity.type === EntityType.PROJECTILE_PLAYER && !entity.type.includes('RAILGUN') && !entity.type.includes('GRENADE')) {
            let closest = null;
            let minDist = 400;
            entitiesRef.current.forEach(e => {
               if (e.type.includes('ENEMY') || e.type === EntityType.BOSS) {
                   const dist = Math.hypot(e.x - entity.x, e.y - entity.y);
                   if (dist < minDist) { minDist = dist; closest = e; }
               }
            });
            if (closest) {
                const angle = Math.atan2((closest.y+closest.h/2) - entity.y, (closest.x+closest.w/2) - entity.x);
                entity.dx += Math.cos(angle) * 1.5;
                entity.dy += Math.sin(angle) * 1.5;
                // Clamp speed
                const speed = Math.hypot(entity.dx, entity.dy);
                if (speed > 20) { entity.dx *= 0.9; entity.dy *= 0.9; }
            }
        }

      } else if (entity.type === EntityType.PARTICLE) {
        entity.x += entity.dx;
        entity.y += entity.dy;
        entity.dy += (entity.vy || 0); 
        entity.life = (entity.life || 0) - 1;
        if ((entity.life || 0) <= 0) entity.toBeRemoved = true;
      } else if (entity.type === EntityType.EXPLOSION || entity.type === EntityType.LASER_WARNING || entity.type === EntityType.LASER_BEAM) {
         entity.life = (entity.life || 0) - 1;
         if ((entity.life || 0) <= 0) entity.toBeRemoved = true;
      } else if (entity.type === EntityType.COLLECTIBLE || entity.type === EntityType.MEDKIT || entity.type === EntityType.WEAPON_DROP) {
         const dist = Math.hypot(player.x - entity.x, player.y - entity.y);
         if (entity.type !== EntityType.WEAPON_DROP && dist < stats.magnetRange) {
           entity.x += (player.x - entity.x) * 0.25;
           entity.y += (player.y - entity.y) * 0.25;
         } else {
           if (!bossActiveRef.current) entity.x -= BASE_SCROLL_SPEED;
         }
         entity.rotation = (entity.rotation || 0) + 0.2;
      } else {
        if (!bossActiveRef.current) entity.x += entity.dx;
        entity.animationFrame = (entity.animationFrame || 0) + 1;
        if (entity.type === EntityType.ENEMY_DRONE) entity.y += Math.sin(frameCountRef.current * 0.1) * 3;
      }

      if (entity.x < -300 || entity.x > CANVAS_WIDTH + 300 || entity.y < -300 || entity.y > CANVAS_HEIGHT + 300) {
        entity.toBeRemoved = true;
      }

      // Collisions
      if (!entity.toBeRemoved && entity.type !== EntityType.PARTICLE && entity.type !== EntityType.EXPLOSION && entity.type !== EntityType.LASER_WARNING) {
        // Collectibles & Drops
        if ((entity.type === EntityType.COLLECTIBLE || entity.type === EntityType.MEDKIT || entity.type === EntityType.WEAPON_DROP) && checkRectOverlap(player, entity)) {
            
            if (entity.type === EntityType.WEAPON_DROP) {
                if (input.interact) {
                    if (entity.weaponType) {
                        stats.weapon = entity.weaponType;
                        if (stats.weapon === WeaponType.PLASMA_CANNON) { stats.damage = 60; stats.fireRate = 20; }
                        else if (stats.weapon === WeaponType.LASER) { stats.damage = 15; stats.fireRate = 4; }
                        else if (stats.weapon === WeaponType.SHOTGUN) { stats.damage = 25; stats.fireRate = 25; }
                        else if (stats.weapon === WeaponType.RAILGUN) { stats.damage = 45; stats.fireRate = 25; }
                        else if (stats.weapon === WeaponType.GRENADE_LAUNCHER) { stats.damage = 80; stats.fireRate = 35; }
                    }
                    entity.toBeRemoved = true;
                    createExplosion(player.x, player.y, '#00ffff', 2);
                }
            } else {
                entity.toBeRemoved = true;
                if (entity.type === EntityType.MEDKIT) {
                    player.hp = Math.min(player.maxHp || 100, (player.hp || 0) + 30);
                    scoreRef.current.current += 100;
                    createExplosion(player.x + player.w/2, player.y + player.h/2, COLORS.medkit, 2);
                } else {
                    scoreRef.current.shards++;
                    scoreRef.current.current += 50;
                    if (scoreRef.current.shards >= scoreRef.current.shardTarget) {
                        scoreRef.current.shards = 0;
                        scoreRef.current.level++;
                        scoreRef.current.shardTarget = Math.ceil(scoreRef.current.shardTarget * 1.5);
                        onLevelUp();
                    }
                }
            }
        }

        // Projectile Hits Enemy
        if (entity.type === EntityType.PROJECTILE_PLAYER || entity.type === EntityType.PROJECTILE_GRENADE) {
             entitiesRef.current.forEach(target => {
                 if ((target.type.includes('ENEMY') || target.type === EntityType.BOSS) && !target.toBeRemoved) {
                    if (checkRectOverlap(entity, target)) {
                        if (!entity.piercing && entity.type !== EntityType.PROJECTILE_GRENADE) entity.toBeRemoved = true;
                        
                        // Grenade Logic
                        if (entity.type === EntityType.PROJECTILE_GRENADE) {
                            entity.toBeRemoved = true;
                            createExplosion(entity.x, entity.y, '#ffaa00', 3); // Big Boom
                            // AOE is handled by the explosion effectively hitting visually, but for logic we simple deal big damage to direct hit for now or extend collision logic for AOE. 
                            // Keeping it simple: Direct hit = massive damage.
                        }

                        let dmg = stats.damage;
                        // Low HP Boost Perk
                        if (stats.lowHpDamageBoost && (player.hp || 0) < player.maxHp! * 0.3) dmg *= 1.5;
                        // Crit Perk
                        if (Math.random() < stats.critChance) { dmg *= 2; createExplosion(target.x, target.y, '#ffff00', 0.5); }

                        target.hp = (target.hp || 0) - dmg;
                        createExplosion(entity.x, entity.y, target.color, 0.5);
                        
                        if ((target.hp || 0) <= 0) {
                            target.toBeRemoved = true;
                            createExplosion(target.x + target.w/2, target.y + target.h/2, target.color, 4);
                            scoreRef.current.current += (target.type === EntityType.BOSS ? 10000 : 200);
                            
                            // Vampirism
                            if (stats.lifesteal > 0) player.hp = Math.min(player.maxHp!, player.hp! + stats.lifesteal);

                            // Random Loot Drop
                            if (target.type !== EntityType.BOSS && Math.random() < 0.2) {
                                const dropRoll = Math.random();
                                if (dropRoll < 0.1) {
                                    // Weapon
                                    let wType = WeaponType.SHOTGUN;
                                    const wR = Math.random();
                                    if (wR > 0.7) wType = WeaponType.GRENADE_LAUNCHER;
                                    else if (wR > 0.4) wType = WeaponType.RAILGUN;
                                    
                                    entitiesRef.current.push({
                                        id: `w_drop_${Date.now()}`, type: EntityType.WEAPON_DROP,
                                        x: target.x, y: target.y, w: 40, h: 40,
                                        dx: -BASE_SCROLL_SPEED, dy: 0, color: '#fff', weaponType: wType
                                    });
                                } else if (dropRoll < 0.4) {
                                     // Medkit
                                     entitiesRef.current.push({
                                        id: `m_drop_${Date.now()}`, type: EntityType.MEDKIT,
                                        x: target.x, y: target.y, w: 30, h: 25,
                                        dx: -BASE_SCROLL_SPEED, dy: 0, color: COLORS.medkit
                                    });
                                } else {
                                    // Shard
                                    entitiesRef.current.push({
                                        id: `c_drop_${Date.now()}`, type: EntityType.COLLECTIBLE,
                                        x: target.x, y: target.y, w: 25, h: 25,
                                        dx: -BASE_SCROLL_SPEED, dy: 0, color: COLORS.shard
                                    });
                                }
                            }

                            if (target.type === EntityType.BOSS) {
                                bossActiveRef.current = false;
                                screenShakeRef.current = 30;
                                for(let k=0; k<20; k++) entitiesRef.current.push({ id: `c_${k}_${Date.now()}`, type: EntityType.COLLECTIBLE, x: target.x + Math.random()*150, y: target.y + Math.random()*150, w: 25, h: 25, dx: (Math.random()-0.5)*15, dy: (Math.random()-0.5)*15, color: COLORS.shard });
                            } else {
                                screenShakeRef.current = 2;
                            }
                        }
                    }
                 }
             });
        }

        // Enemy Hits Player
        if (entity.type.includes('ENEMY') || entity.type === EntityType.PROJECTILE_ENEMY || entity.type === EntityType.BOSS || entity.type === EntityType.LASER_BEAM) {
            if (checkRectOverlap(player, entity)) {
                
                let damage = 10;
                if (entity.type === EntityType.LASER_BEAM) damage = 2; 
                if (entity.type === EntityType.BOSS) damage = 20;
                if (entity.type === EntityType.ENEMY_TANK) damage = 25;
                if (entity.type === EntityType.ENEMY_KAMIKAZE) { damage = 40; entity.toBeRemoved = true; createExplosion(entity.x, entity.y, '#ffff00', 4); }

                if (entity.type.includes('PROJECTILE')) entity.toBeRemoved = true;
                
                if (stats.hasShield) {
                    stats.hasShield = false;
                    createExplosion(player.x, player.y, COLORS.playerShielded, 3);
                    screenShakeRef.current = 15;
                    if (!entity.type.includes('PROJECTILE') && entity.type !== EntityType.BOSS && entity.type !== EntityType.LASER_BEAM) entity.dx = 20;
                } else {
                    player.hp = (player.hp || 0) - damage;
                    if(frameCountRef.current % 5 === 0) screenShakeRef.current = 5; 
                    if(frameCountRef.current % 10 === 0) createExplosion(player.x, player.y, '#ff0000', 1);
                    
                    if ((player.hp || 0) <= 0) onGameOver(Math.floor(scoreRef.current.current));
                }
            }
        }
      }
    }

    entitiesRef.current = entitiesRef.current.filter(e => !e.toBeRemoved);
    if (screenShakeRef.current > 0) screenShakeRef.current *= 0.9;
    
    if (frameCountRef.current % 5 === 0) onScoreUpdate({ ...scoreRef.current }, player.hp || 0, player.maxHp || 0);
  };

  const checkRectOverlap = (r1: Entity, r2: Entity) => {
     return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
  };

  const drawPixelRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  };

  const drawEnemyDrone = (ctx: CanvasRenderingContext2D, e: Entity) => {
      ctx.save();
      ctx.translate(e.x + e.w/2, e.y + e.h/2);
      ctx.scale(e.facing || -1, 1);
      
      // Drone Body
      ctx.fillStyle = e.color;
      ctx.shadowBlur = 10; ctx.shadowColor = e.color;
      
      ctx.beginPath();
      ctx.moveTo(-15, -10); ctx.lineTo(15, -10); ctx.lineTo(20, 0); ctx.lineTo(15, 10); ctx.lineTo(-15, 10); ctx.lineTo(-20, 0);
      ctx.closePath(); ctx.fill();
      
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 15; ctx.fillRect(5, -3, 8, 6); // Eye
      const rotorOffset = Math.sin(frameCountRef.current * 0.8) * 3;
      ctx.fillStyle = '#888'; ctx.fillRect(-25, -15 + rotorOffset, 50, 2); ctx.fillRect(-25, 15 - rotorOffset, 50, 2);

      ctx.restore(); ctx.shadowBlur = 0;
  };

  const drawEnemyWalker = (ctx: CanvasRenderingContext2D, e: Entity) => {
      ctx.save();
      ctx.translate(e.x + e.w/2, e.y + e.h/2);
      ctx.scale(e.facing || -1, 1);
      
      ctx.fillStyle = '#300';
      drawPixelRect(ctx, -20, -25, 40, 35, '#220011'); 
      const alert = (e.attackTimer || 0) > 120;
      ctx.fillStyle = alert ? '#fff' : '#f00'; ctx.shadowColor = '#f00'; ctx.shadowBlur = alert ? 20 : 10;
      drawPixelRect(ctx, 5, -15, 12, 6, alert ? '#fff' : '#f00'); ctx.shadowBlur = 0;

      const anim = Math.floor((e.animationFrame || 0) / 8) % 2;
      const legOffset = anim === 0 ? -6 : 6;
      ctx.fillStyle = '#444';
      drawPixelRect(ctx, -10, 10, 10, 25 + legOffset, '#333');
      drawPixelRect(ctx, 10, 10, 10, 25 - legOffset, '#333');
      ctx.restore();
  };
  
  const drawEnemyTurret = (ctx: CanvasRenderingContext2D, e: Entity) => {
      ctx.save(); ctx.translate(e.x + e.w/2, e.y + e.h/2);
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 15; ctx.fillStyle = '#442200';
      ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 35, frameCountRef.current*0.1, frameCountRef.current*0.1 + Math.PI*1.5); ctx.stroke();
      const player = playerRef.current;
      const angle = Math.atan2((player.y + player.h/2) - (e.y + e.h/2), (player.x + player.w/2) - (e.x + e.w/2));
      ctx.rotate(angle);
      drawPixelRect(ctx, 0, -8, 40, 16, '#ffaa00');
      ctx.restore(); ctx.shadowBlur = 0;
  };

  const drawEnemyTank = (ctx: CanvasRenderingContext2D, e: Entity) => {
      ctx.save(); ctx.translate(e.x + e.w/2, e.y + e.h/2); ctx.scale(e.facing || -1, 1);
      // Treads
      const treadAnim = Math.floor((e.animationFrame || 0) / 4) % 2;
      ctx.fillStyle = '#111'; ctx.fillRect(-45, 20, 90, 20);
      ctx.fillStyle = '#333';
      for(let tx=-40 + treadAnim*5; tx<40; tx+=10) ctx.fillRect(tx, 25, 5, 10);
      // Body
      ctx.fillStyle = COLORS.enemyTank; ctx.shadowColor = COLORS.enemyTank; ctx.shadowBlur = 10;
      drawPixelRect(ctx, -40, -20, 80, 40, COLORS.enemyTank);
      drawPixelRect(ctx, -30, -35, 50, 20, '#552200'); // Turret base
      // Barrel
      drawPixelRect(ctx, 0, -30, 60, 10, '#331100');
      ctx.restore(); ctx.shadowBlur = 0;
  };

  const drawEnemyKamikaze = (ctx: CanvasRenderingContext2D, e: Entity) => {
      ctx.save(); ctx.translate(e.x + e.w/2, e.y + e.h/2);
      ctx.rotate(frameCountRef.current * 0.2);
      ctx.fillStyle = COLORS.enemyKamikaze; ctx.shadowColor = COLORS.enemyKamikaze; ctx.shadowBlur = 20;
      ctx.beginPath();
      // Spiky shape
      for(let i=0; i<8; i++) {
          const angle = (Math.PI*2/8) * i;
          const r = i%2===0 ? 20 : 10;
          ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
      ctx.restore(); ctx.shadowBlur = 0;
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Entity, aimAngle: number) => {
      const facing = p.facing || 1;
      const isMoving = Math.abs(p.dx) > 1;
      const animSpeed = isMoving ? 5 : 15; 
      const animFrame = Math.floor((p.animationFrame || 0) / animSpeed) % 4; 
      const bob = isMoving ? (animFrame % 2 === 0 ? 0 : -3) : Math.sin(frameCountRef.current * 0.1) * 2;
      let leftLegOff = 0;
      let rightLegOff = 0;
      if (isMoving) {
          if (animFrame === 1) { leftLegOff = -8; rightLegOff = 8; }
          else if (animFrame === 3) { leftLegOff = 8; rightLegOff = -8; }
      }
      
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.scale(facing, 1);
      
      ctx.shadowBlur = 10; ctx.shadowColor = COLORS.playerGlow;

      if (statsRef.current.hasShield) {
          ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.strokeStyle = COLORS.playerShielded; ctx.lineWidth = 2; ctx.stroke();
          ctx.globalAlpha = 0.2; ctx.fillStyle = COLORS.playerShielded; ctx.fill(); ctx.globalAlpha = 1;
      }

      ctx.save(); ctx.translate(leftLegOff, 0);
      drawPixelRect(ctx, -12 + bob, 20, 10, 20, '#111'); drawPixelRect(ctx, -12 + bob, 35, 12, 8, '#333'); 
      ctx.restore();

      ctx.save(); ctx.translate(rightLegOff, 0);
      drawPixelRect(ctx, 4 - bob, 20, 10, 20, '#111'); drawPixelRect(ctx, 4 - bob, 35, 12, 8, '#333'); 
      ctx.fillStyle = COLORS.playerDark; ctx.fillRect(4 - bob, 25, 10, 5);
      ctx.restore();

      drawPixelRect(ctx, -16, -15 + bob, 32, 40, '#222'); 
      ctx.fillStyle = '#333'; ctx.fillRect(-12, -10 + bob, 24, 20);
      
      ctx.shadowBlur = 15; ctx.shadowColor = COLORS.playerGlow;
      drawPixelRect(ctx, -6, -5 + bob, 12, 12, COLORS.playerGlow); ctx.shadowBlur = 10;

      drawPixelRect(ctx, -14, -38 + bob, 28, 28, '#ddd'); 
      ctx.fillStyle = '#000'; ctx.fillRect(-14, -32 + bob, 28, 10); 
      ctx.fillStyle = COLORS.playerDark; ctx.fillRect(-14, -28 + bob, 28, 2); 

      ctx.strokeStyle = COLORS.playerDark; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowBlur = 20; ctx.beginPath();
      const scarfY = -25 + bob;
      const flow = Math.sin(frameCountRef.current * 0.3) * 10;
      ctx.moveTo(-10, scarfY); ctx.quadraticCurveTo(-40, scarfY - 10 + flow, -60, scarfY + 5 + flow); ctx.stroke(); ctx.shadowBlur = 10; 

      // Weapon Arm
      const drawAngle = facing === 1 ? aimAngle : Math.PI - aimAngle + Math.PI; 
      ctx.save(); ctx.translate(0, -8 + bob); ctx.rotate(drawAngle);
      
      drawPixelRect(ctx, -5, -8, 16, 16, '#444');
      
      const weapon = statsRef.current.weapon;
      if (weapon === WeaponType.PLASMA_CANNON) {
          drawPixelRect(ctx, 10, -12, 40, 24, '#303'); ctx.fillStyle = '#f0f'; ctx.fillRect(15, -6, 20, 12); 
      } else if (weapon === WeaponType.SHOTGUN) {
          drawPixelRect(ctx, 10, -10, 30, 8, '#555'); drawPixelRect(ctx, 10, 2, 30, 8, '#555'); drawPixelRect(ctx, 8, -5, 10, 10, '#222'); 
      } else if (weapon === WeaponType.LASER) {
          drawPixelRect(ctx, 10, -5, 45, 10, '#fff'); ctx.fillStyle = '#0ff'; ctx.fillRect(10, -2, 45, 2); 
      } else if (weapon === WeaponType.RAILGUN) {
          drawPixelRect(ctx, 10, -6, 55, 12, '#222'); ctx.fillStyle = COLORS.projectileRailgun; ctx.fillRect(10, -2, 55, 4); 
          ctx.shadowColor = COLORS.projectileRailgun; ctx.shadowBlur = 10;
      } else if (weapon === WeaponType.GRENADE_LAUNCHER) {
           drawPixelRect(ctx, 10, -10, 30, 20, '#442'); ctx.fillStyle = '#000'; ctx.fillRect(40, -8, 5, 16); // Muzzle
      } else {
          drawPixelRect(ctx, 10, -8, 20, 10, '#888'); drawPixelRect(ctx, 8, 0, 8, 8, '#222');
      }

      // Muzzle Flash
      if (inputStateRef.current.shoot) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = '#fff';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(50, 0, 10 + Math.random()*5, 0, Math.PI*2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore(); 
      ctx.restore(); 
      ctx.shadowBlur = 0; 
  };

  const draw = (ctx: CanvasRenderingContext2D, currentAimAngle: number) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Global Shake
    ctx.save();
    if (screenShakeRef.current > 0) {
        ctx.translate((Math.random()-0.5)*screenShakeRef.current, (Math.random()-0.5)*screenShakeRef.current);
    }

    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, COLORS.skyGradTop);
    grad.addColorStop(1, COLORS.skyGradBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Parallax City
    cityLayersRef.current.forEach(layer => {
        const offset = (scrollOffsetRef.current * layer.speed) % (CANVAS_WIDTH * 2.5);
        layer.elements.forEach((b: any) => {
            let rx = b.x - offset;
            if (rx < -b.w) rx += CANVAS_WIDTH * 2.5; 
            
            if (rx < CANVAS_WIDTH && rx + b.w > 0) {
                 drawPixelRect(ctx, rx, b.y, b.w, b.h, b.color);
                 if (b.neonSign) {
                     ctx.shadowColor = b.neonColor; ctx.shadowBlur = 20; ctx.fillStyle = b.neonColor;
                     ctx.font = '20px monospace'; ctx.fillText(b.signText || 'NEON', rx + 5, b.y + 30); ctx.shadowBlur = 0;
                 }
                 if (b.windows) {
                     ctx.fillStyle = Math.random() > 0.95 ? '#fff' : '#301';
                     for(let wy = b.y + 10; wy < b.y + b.h - 10; wy += 20) {
                         for(let wx = rx + 8; wx < rx + b.w - 8; wx += 15) {
                             if ((wx * wy) % 7 === 0) ctx.fillRect(wx, wy, 4, 8);
                         }
                     }
                 }
            }
        });
    });

    // Ground
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    ctx.strokeStyle = COLORS.groundGrid;
    ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = COLORS.groundGrid;
    ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);
    const groundOffset = (scrollOffsetRef.current * BASE_SCROLL_SPEED) % 120;
    for(let i=0; i < CANVAS_WIDTH + 200; i+=120) {
        ctx.moveTo(i - groundOffset, CANVAS_HEIGHT - GROUND_HEIGHT); ctx.lineTo(i - groundOffset - 300, CANVAS_HEIGHT);
    }
    ctx.stroke(); ctx.shadowBlur = 0;

    // Entities
    entitiesRef.current.forEach(e => {
        if (e.type === EntityType.PLAYER) return; 

        if (e.type === EntityType.ENEMY_DRONE) drawEnemyDrone(ctx, e);
        else if (e.type === EntityType.ENEMY_WALKER) drawEnemyWalker(ctx, e);
        else if (e.type === EntityType.ENEMY_TURRET) drawEnemyTurret(ctx, e);
        else if (e.type === EntityType.ENEMY_TANK) drawEnemyTank(ctx, e);
        else if (e.type === EntityType.ENEMY_KAMIKAZE) drawEnemyKamikaze(ctx, e);
        else if (e.type === EntityType.BOSS) {
             ctx.save(); ctx.translate(e.x + e.w/2, e.y + e.h/2);
             ctx.shadowBlur = 30; ctx.shadowColor = COLORS.bossGlow;
             ctx.fillStyle = '#102';
             ctx.beginPath(); ctx.moveTo(-60, -40); ctx.lineTo(60, -40); ctx.lineTo(80, 0); ctx.lineTo(60, 40); ctx.lineTo(-60, 40); ctx.lineTo(-40, 0); ctx.fill();
             const charge = e.attackState === 'LASER_CHARGE';
             const fire = e.attackState === 'LASER_FIRE';
             ctx.fillStyle = fire ? '#fff' : (charge ? '#f0f' : '#90f');
             if (charge) ctx.shadowColor = '#f0f';
             ctx.beginPath(); ctx.arc(0, 0, fire ? 30 : 20, 0, Math.PI*2); ctx.fill();
             const hpPct = (e.hp || 0) / (e.maxHp || 1);
             drawPixelRect(ctx, -60, -90, 120, 8, '#000'); drawPixelRect(ctx, -60, -90, 120 * hpPct, 8, COLORS.boss);
             ctx.restore(); ctx.shadowBlur = 0;
        } 
        else if (e.type === EntityType.WEAPON_DROP) {
             const hover = Math.sin(frameCountRef.current * 0.1) * 5;
             ctx.save(); ctx.translate(e.x + e.w/2, e.y + e.h/2 + hover);
             ctx.fillStyle = '#111'; ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
             ctx.beginPath(); ctx.rect(-20, -20, 40, 40); ctx.fill(); ctx.stroke();
             ctx.fillStyle = '#0ff'; ctx.font = '12px monospace'; ctx.fillText('WEAPON', -22, -25);
             const p = playerRef.current;
             const dist = Math.hypot((p.x+p.w/2) - (e.x+e.w/2), (p.y+p.h/2) - (e.y+e.h/2));
             if (dist < 100) {
                 ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('[ E ]', -10, -40);
             }
             ctx.restore();
        }
        else if (e.type === EntityType.COLLECTIBLE) {
             ctx.save(); ctx.translate(e.x+e.w/2, e.y+e.h/2); ctx.rotate(e.rotation || 0);
             ctx.fillStyle = COLORS.shard; ctx.shadowBlur = 15; ctx.shadowColor = COLORS.shard;
             ctx.fillRect(-10, -10, 20, 20); ctx.fillStyle = '#fff'; ctx.fillRect(-5, -5, 10, 10);
             ctx.restore(); ctx.shadowBlur = 0;
        }
        else if (e.type === EntityType.MEDKIT) {
             ctx.fillStyle = COLORS.medkit; ctx.shadowBlur = 15; ctx.shadowColor = COLORS.medkitGlow;
             drawPixelRect(ctx, e.x, e.y, e.w, e.h, COLORS.medkit);
             ctx.fillStyle = '#fff'; ctx.fillRect(e.x+12, e.y+5, 6, 15); ctx.fillRect(e.x+7, e.y+10, 16, 5);
             ctx.shadowBlur = 0;
        }
        else if (e.type.includes('PROJECTILE')) {
             ctx.fillStyle = e.color; ctx.shadowBlur = 20; ctx.shadowColor = e.color;
             if (e.type === EntityType.PROJECTILE_PLAYER && e.w > 20) {
                 ctx.fillRect(e.x, e.y, e.w, e.h);
             } else {
                 ctx.beginPath(); ctx.arc(e.x, e.y, e.w/2, 0, Math.PI*2); ctx.fill();
             }
             ctx.shadowBlur = 0;
        }
        else if (e.type === EntityType.LASER_WARNING) {
             ctx.fillStyle = e.color; ctx.globalAlpha = 0.5 + Math.sin(frameCountRef.current * 0.5) * 0.4;
             ctx.fillRect(0, e.y, CANVAS_WIDTH, 2); ctx.globalAlpha = 1;
        }
        else if (e.type === EntityType.LASER_BEAM) {
             ctx.fillStyle = '#fff'; ctx.shadowColor = '#f0f'; ctx.shadowBlur = 30; ctx.fillRect(0, e.y, CANVAS_WIDTH, e.h);
             ctx.fillStyle = '#f0f'; ctx.fillRect(0, e.y + 20, CANVAS_WIDTH, e.h - 40); ctx.shadowBlur = 0;
        }
        else if (e.type === EntityType.PARTICLE || e.type === EntityType.EXPLOSION) {
             ctx.globalAlpha = (e.life||0)/(e.maxLife||1); ctx.fillStyle = e.color;
             if(e.glow) { ctx.shadowBlur = 15; ctx.shadowColor = e.color; ctx.globalCompositeOperation = 'lighter'; }
             if(e.type === EntityType.EXPLOSION) {
                 ctx.beginPath(); ctx.arc(e.x+e.w/2, e.y+e.h/2, e.w, 0, Math.PI*2); ctx.fill();
             } else {
                 ctx.fillRect(e.x, e.y, e.w, e.h);
             }
             ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
    });
    
    drawPlayer(ctx, playerRef.current, currentAimAngle);

    if (!bossActiveRef.current) {
        foregroundLayerRef.current.forEach(obj => {
            const parallaxX = obj.x - (scrollOffsetRef.current * 1.5) % (CANVAS_WIDTH * 2 + 500);
            let drawX = parallaxX;
            if (drawX < -100) drawX += CANVAS_WIDTH * 2 + 500;
            if (drawX < CANVAS_WIDTH && drawX + obj.w > 0) {
                if (obj.type === 'PILLAR') {
                    ctx.fillStyle = '#000'; ctx.fillRect(drawX, 0, obj.w, CANVAS_HEIGHT);
                    ctx.fillStyle = '#220022'; ctx.fillRect(drawX, 0, 5, CANVAS_HEIGHT);
                } else if (obj.type === 'DEBRIS') {
                    ctx.fillStyle = '#000'; ctx.fillRect(drawX, obj.y, obj.w, obj.h);
                }
            }
        });
    }

    ctx.restore();
  };

  const loop = () => {
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.imageSmoothingEnabled = false;
            
            const input = inputStateRef.current;
            const player = playerRef.current;
            let currentAimAngle = 0;
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = CANVAS_WIDTH / rect.width;
            const scaleY = CANVAS_HEIGHT / rect.height;
            const mouseCanvasX = (input.mouseX - rect.left) * scaleX;
            const mouseCanvasY = (input.mouseY - rect.top) * scaleY;
            const pCenterX = player.x + player.w/2;
            const pCenterY = player.y + player.h/2;
            currentAimAngle = Math.atan2(mouseCanvasY - pCenterY, mouseCanvasX - pCenterX);

            update();
            draw(ctx, currentAimAngle);
        }
    }
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  });

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-contain bg-[#1a0515]"
    />
  );
};