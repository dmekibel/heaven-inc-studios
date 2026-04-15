import { FLOOR_GRID, ROOM_TYPES, FLOOR_ENEMIES } from './constants.js';
import { Room } from './room.js';
import { spawnEnemies } from './enemies.js';

export class Floor {
    constructor(floorNum) {
        this.floorNum = floorNum;
        this.grid = Array(FLOOR_GRID).fill(null).map(() => Array(FLOOR_GRID).fill(null));
        this.currentX = 0;
        this.currentY = 0;
        this.rooms = [];

        this.generate();
    }

    generate() {
        // Start room at center
        const cx = Math.floor(FLOOR_GRID / 2);
        const cy = Math.floor(FLOOR_GRID / 2);
        this.currentX = cx;
        this.currentY = cy;

        // Generate room layout using random walk
        const positions = [{ x: cx, y: cy }];
        const posSet = new Set([`${cx},${cy}`]);

        // Target room count: 8-12 rooms
        const targetRooms = 8 + Math.floor(Math.random() * 5);
        let attempts = 0;

        while (positions.length < targetRooms && attempts < 200) {
            attempts++;
            // Pick random existing room to branch from
            const base = positions[Math.floor(Math.random() * positions.length)];
            const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            const nx = base.x + dir[0];
            const ny = base.y + dir[1];

            if (nx >= 0 && nx < FLOOR_GRID && ny >= 0 && ny < FLOOR_GRID && !posSet.has(`${nx},${ny}`)) {
                // Don't allow too many neighbors (keeps map cleaner)
                let neighbors = 0;
                for (const d of dirs) {
                    if (posSet.has(`${nx + d[0]},${ny + d[1]}`)) neighbors++;
                }
                if (neighbors <= 1) {
                    positions.push({ x: nx, y: ny });
                    posSet.add(`${nx},${ny}`);
                }
            }
        }

        // Find dead ends (rooms with only 1 neighbor) for special rooms
        const deadEnds = [];
        const furthestFromStart = { pos: null, dist: 0 };

        for (const pos of positions) {
            if (pos.x === cx && pos.y === cy) continue;
            let neighbors = 0;
            const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            for (const d of dirs) {
                if (posSet.has(`${pos.x + d[0]},${pos.y + d[1]}`)) neighbors++;
            }
            if (neighbors === 1) deadEnds.push(pos);

            const dist = Math.abs(pos.x - cx) + Math.abs(pos.y - cy);
            if (dist > furthestFromStart.dist) {
                furthestFromStart.pos = pos;
                furthestFromStart.dist = dist;
            }
        }

        // Assign room types
        // Boss room = furthest dead end
        const bossPos = furthestFromStart.pos || deadEnds[0] || positions[positions.length - 1];
        // Item room = another dead end
        const remainingDeadEnds = deadEnds.filter(p => p !== bossPos);
        const itemPos = remainingDeadEnds.length > 0 ? remainingDeadEnds[0] : null;
        // Shop room = another dead end if available
        const shopPos = remainingDeadEnds.length > 1 ? remainingDeadEnds[1] : null;

        // Create rooms
        for (const pos of positions) {
            let type = ROOM_TYPES.NORMAL;
            if (pos.x === cx && pos.y === cy) type = ROOM_TYPES.START;
            else if (pos === bossPos) type = ROOM_TYPES.BOSS;
            else if (pos === itemPos) type = ROOM_TYPES.ITEM;
            else if (pos === shopPos) type = ROOM_TYPES.SHOP;

            const room = new Room(type, pos.x, pos.y);
            this.grid[pos.y][pos.x] = room;
            this.rooms.push(room);
        }

        // Set up doors between adjacent rooms
        for (const room of this.rooms) {
            const { gridX: gx, gridY: gy } = room;
            if (this.grid[gy - 1]?.[gx]) { room.doors.up = true; }
            if (this.grid[gy + 1]?.[gx]) { room.doors.down = true; }
            if (this.grid[gy]?.[gx - 1]) { room.doors.left = true; }
            if (this.grid[gy]?.[gx + 1]) { room.doors.right = true; }
        }
    }

    getCurrentRoom() {
        return this.grid[this.currentY][this.currentX];
    }

    moveRoom(direction) {
        switch (direction) {
            case 'up': this.currentY--; break;
            case 'down': this.currentY++; break;
            case 'left': this.currentX--; break;
            case 'right': this.currentX++; break;
        }
        const room = this.getCurrentRoom();
        if (room) room.visited = true;
        return room;
    }

    spawnRoomEnemies(room) {
        if (room.type !== ROOM_TYPES.NORMAL) return [];
        if (room.cleared) return [];

        const enemyPool = FLOOR_ENEMIES[this.floorNum] || FLOOR_ENEMIES[1];
        const count = 2 + Math.floor(Math.random() * 3) + Math.floor(this.floorNum * 0.5);
        const enemies = [];

        for (let i = 0; i < count; i++) {
            const type = enemyPool[Math.floor(Math.random() * enemyPool.length)];
            enemies.push(...spawnEnemies(type, 1, room));
        }
        return enemies;
    }
}
