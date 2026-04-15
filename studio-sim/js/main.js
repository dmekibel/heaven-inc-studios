// Heaven Inc. Studios — Connected World with Camera & Zoom
// One big map. All rooms visible. Zoom in/out. No teleporting.

// Baseline canvas dimensions (desktop default). These are LIVE values — resize() updates them to match
// the viewport aspect ratio on touch devices so the game truly fills the screen (tall in portrait,
// extra-wide in landscape). The camera centers on CANVAS_W/2, CANVAS_H/2 automatically.
const BASE_W = 720;
const BASE_H = 405;
let CANVAS_W = BASE_W;
let CANVAS_H = BASE_H;
const T = 24; // tile size in world pixels

// Touch device detection — affects shoot-direction mapping (screen vs world) and canvas sizing
let IS_TOUCH = (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
    : false;

// === MODULAR MAP SYSTEM ===
// Define rooms as modules. Corridors auto-generated from connections.
// WorldGrid auto-built. Collisions always consistent.

const LEVEL_H = 14;

// Room templates: id, name, size, colors, elevation, furniture list
const ROOM_DEFS = [
    // Fairytale magical studio — pastel tones with warm glow
    { id: 'vault', name: 'LORE VAULT', w: 10, h: 8, floor1: '#1A1428', floor2: '#221A30', wallColor: '#9966CC', elevated: true },
    { id: 'design', name: 'DESIGN LAB', w: 10, h: 8, floor1: '#1E1018', floor2: '#281420', wallColor: '#DD6699', elevated: true },
    { id: 'art', name: 'ART STUDIO', w: 10, h: 8, floor1: '#1A1022', floor2: '#22142A', wallColor: '#CC55AA', elevated: true },
    { id: 'hub', name: 'GRAND HALL', w: 16, h: 10, floor1: '#14101E', floor2: '#1C1428', wallColor: '#BB88DD' },
    { id: 'engine', name: 'ENGINE ROOM', w: 9, h: 8, floor1: '#0E1818', floor2: '#142020', wallColor: '#44BBAA' },
    { id: 'oracle', name: 'ORACLE DEN', w: 8, h: 8, floor1: '#1A1808', floor2: '#22200E', wallColor: '#DDAA44' },
    { id: 'qa', name: 'QA LAB', w: 9, h: 7, floor1: '#18100E', floor2: '#201814', wallColor: '#DD8844' },
    { id: 'writer', name: 'WRITERS ROOM', w: 9, h: 7, floor1: '#0E1420', floor2: '#141C28', wallColor: '#55AADD' },
    { id: 'ceo', name: 'CEO OFFICE', w: 10, h: 6, floor1: '#1C1408', floor2: '#241C0E', wallColor: '#DDAA33' },
];

// Layout: place rooms at specific positions. Connections auto-generate corridors.
const MAP_LAYOUT = {
    rooms: {
        vault:  { x: 1, y: 1 },
        design: { x: 14, y: 1 },
        art:    { x: 27, y: 1 },
        hub:    { x: 11, y: 12 },
        engine: { x: 1, y: 14 },
        oracle: { x: 30, y: 14 },
        qa:     { x: 5, y: 24 },
        writer: { x: 16, y: 24 },
        ceo:    { x: 28, y: 24 },
    },
    // Connections: [roomA, roomB, corridor_width]
    connections: [
        ['vault', 'design', 4],
        ['design', 'art', 4],
        ['vault', 'hub', 4],
        ['design', 'hub', 5],
        ['art', 'hub', 4],
        ['hub', 'engine', 4],
        ['hub', 'oracle', 4],
        ['hub', 'qa', 4],
        ['hub', 'writer', 4],
        ['qa', 'writer', 3],
        ['writer', 'ceo', 3],
    ],
};

// === BUILD WORLD FROM MODULAR LAYOUT ===
let WORLD, ZONES, RAMPS, WORLD_W, WORLD_H;

function buildModularWorld() {
    // Place rooms
    const rooms = [];
    const zones = [];
    for (const def of ROOM_DEFS) {
        const pos = MAP_LAYOUT.rooms[def.id];
        if (!pos) continue;
        const room = { ...def, x: pos.x, y: pos.y };
        rooms.push(room);
        // Zone = room interior (1 tile inset)
        zones.push({
            id: def.id, name: def.name,
            x: pos.x + 1, y: pos.y + 1, w: def.w - 2, h: def.h - 2,
            floor1: def.floor1, floor2: def.floor2, color: def.wallColor,
        });
    }

    // Auto-generate corridors from connections
    const corridors = [];
    const ramps = [];
    for (const [idA, idB, cw] of MAP_LAYOUT.connections) {
        const rA = rooms.find(r => r.id === idA);
        const rB = rooms.find(r => r.id === idB);
        if (!rA || !rB) continue;

        const cxA = rA.x + rA.w / 2, cyA = rA.y + rA.h / 2;
        const cxB = rB.x + rB.w / 2, cyB = rB.y + rB.h / 2;
        const halfW = Math.floor(cw / 2);

        if (Math.abs(cyA - cyB) > Math.abs(cxA - cxB)) {
            // Vertical corridor
            const cx = Math.round((cxA + cxB) / 2);
            const y1 = Math.min(rA.y + rA.h - 1, rB.y + rB.h - 1);
            const y2 = Math.max(rA.y + 1, rB.y + 1);
            corridors.push({ x: cx - halfW, y: Math.min(y1, y2), w: cw, h: Math.abs(y2 - y1) + 1 });
            // Add ramp if elevation differs
            if (rA.elevated !== rB.elevated) {
                const ry = Math.min(y1, y2);
                ramps.push({ x: cx - halfW, y: ry, w: cw, h: 2,
                    fromH: rA.elevated ? LEVEL_H : 0,
                    toH: rB.elevated ? LEVEL_H : 0 });
            }
        } else {
            // Horizontal corridor
            const cy = Math.round((cyA + cyB) / 2);
            const x1 = Math.min(rA.x + rA.w - 1, rB.x + rB.w - 1);
            const x2 = Math.max(rA.x + 1, rB.x + 1);
            corridors.push({ x: Math.min(x1, x2), y: cy - halfW, w: Math.abs(x2 - x1) + 1, h: cw });
        }
    }

    // Calculate world bounds
    let maxX = 0, maxY = 0;
    for (const r of rooms) { maxX = Math.max(maxX, r.x + r.w + 1); maxY = Math.max(maxY, r.y + r.h + 1); }
    for (const c of corridors) { maxX = Math.max(maxX, c.x + c.w + 1); maxY = Math.max(maxY, c.y + c.h + 1); }

    WORLD = { rooms, corridors };
    ZONES = zones;
    RAMPS = ramps;
    WORLD_W = maxX;
    WORLD_H = maxY;
}

// === COLORS ===
const C = {
    bg: '#0A0A18',
    wallTrim: '#DAA520',
    skinTone: '#E8B878', white: '#F0E8D8', black: '#0A0A14',
    magenta: '#CC6688', green: '#558844', gold: '#DAA520', pink: '#CC7788',
    cyan: '#4488AA', orange: '#CC8833', red: '#AA3344', blue: '#446688',
    purple: '#8866AA', yellow: '#CCAA44',
    bubbleBg: '#F0E8D0', bubbleText: '#2A1A08',
    corridorFloor: '#100E14', corridorFloor2: '#161220',
    screenBg: '#0A0808', screenGlow: '#CCAA44',
};

// === AGENTS ===
const AGENT_DEFS = [
    { id: 'vault', name: 'VAULT', role: 'Lore Architect', color: C.purple, bodyColor: '#8E44AD',
      homeX: 5, homeY: 4, greeting: 'The lore runs deep. Every rule is a mechanic.', status: 'Indexing 18 sources.',
      chatter: ["Dave Juice has 5 stages.", "Celestial Manhattan: 5 districts.", "Devil wears blue suit, yellow moons.", "Michael's arc: busboy to exile.", "Hell is open-source."] },
    { id: 'design', name: 'DESIGN', role: 'Game Designer', color: C.red, bodyColor: '#CC3333',
      homeX: 18, homeY: 4, greeting: 'No mechanic ships without lore justification.', status: 'Awaiting direction.',
      chatter: ["Flow state as mechanic?", "Negotiation over combat.", "Club Penguin + Disco Elysium.", "Every upgrade needs a price.", "Items shift with Juice level?"] },
    { id: 'art', name: 'ART', role: 'Art Director', color: C.magenta, bodyColor: '#C0166A',
      homeX: 31, homeY: 4, greeting: 'The concept art IS the style guide.', status: 'Studying references.',
      chatter: ["Gold on midnight blue.", "Neon reflections on wet streets.", "Clear silhouettes always.", "FOP palette, noir atmosphere.", "Rain scenes are key mood."] },
    { id: 'writer', name: 'WRITER', role: 'Narrative Designer', color: C.cyan, bodyColor: '#0AA5A5',
      homeX: 20, homeY: 27, greeting: "Every line must earn its words.", status: 'Mapping voices.',
      chatter: ["Michael deflects with humor.", "God: charm, control beneath.", "Devil speaks in metaphors.", "Dialogue IS character.", "Item text shifts with Juice."] },
    { id: 'engine', name: 'ENGINE', role: 'Programmer', color: C.green, bodyColor: '#189018',
      homeX: 5, homeY: 17, greeting: 'Modular. Readable. Ready to build.', status: 'On standby.',
      chatter: ["Isometric is complex.", "Need format decision first.", "Modular, every system swappable.", "Canvas vs WebGL?", "Refactoring renderer."] },
    { id: 'qa', name: 'QA', role: 'QA Lead', color: C.orange, bodyColor: '#CC7000',
      homeX: 9, homeY: 27, greeting: "Would a fan say 'they understood it'?", status: 'Waiting for build.',
      chatter: ["Prototype felt like Isaac, not us.", "Lore accuracy check needed.", "Combat needs lore-native hook.", "Every detail must feel authentic."] },
    { id: 'oracle', name: 'ORACLE', role: 'Meta Assistant', color: C.gold, bodyColor: '#B8860B',
      homeX: 33, homeY: 17, greeting: "I improve the studio, not the game.", status: 'Monitoring efficiency.',
      chatter: ["Studio efficiency: 30%.", "Brain hasn't run yet.", "Lore vault rich, unstructured.", "Need a direction call.", "System self-improves with /brain."] },
    { id: 'assistant', name: 'FRIDAY', role: 'Personal Assistant', color: '#FFFFFF', bodyColor: '#AAAACC',
      homeX: 18, homeY: 16, greeting: "I'm FRIDAY, your assistant. Meetings, priorities, whatever you need, boss.", status: 'Following you.',
      chatter: ["VAULT has new findings.", "DESIGN wants your input.", "No meetings scheduled.", "Oracle recommends /brain.", "Team waiting on direction."],
      followsPlayer: true },
];

// === STATE ===
let canvas, ctx;
let camera = { x: 19 * T, y: 16 * T, zoom: 1.0, targetZoom: 1.0 };
let player = { x: 19 * T, y: 16 * T, speed: 2.0, facing: 'down', vx: 0, vy: 0, skateAngle: null };
let keys = {};
let agents = [];
let activeAgent = null;
let time = 0;
let bubble = null;
let bubbleTimer = 100;
let playerBubble = null;
let chatFocused = false;
let worldGrid = null; // 2D array: 0=empty, 1=floor, 2=wall
let skateMode = false;
let jumpVel = 0;
let jumpHeight = 0;
let playerOnFurniture = false;

// Trick system
// Body spin = free rotation mid-air (left/right arrows), works with or without skateboard
// Board flips = grab + flip (up/down arrows), needs big air from pump/ramp
let bodySpinAngle = 0;       // current body rotation in air (degrees, resets on land)
let boardFlipState = null;   // null or { name, rotation, duration, timer, landed }
let trickCombo = 0;
let trickDisplay = null;
let pumpCharge = 0;

// === JUICE SYSTEMS (screen shake, trails, score) ===
let screenShake = 0;
let trickScore = 0;
let speedBoostTimer = 0;
let dustParticles = []; // landing dust puffs
let trailParticles = []; // speed lines behind board

const BOARD_FLIPS = {
    // Up/Down = kickflip/heelflip (board flip)
    up:    { name: 'KICKFLIP', rotation: 360, duration: 12, type: 'flip' },
    down:  { name: 'HEELFLIP', rotation: -360, duration: 12, type: 'flip' },
    // Left/Right = board rotation (180 spin)
    left:  { name: 'BS 180', rotation: 180, duration: 10, type: 'spin' },
    right: { name: 'FS 180', rotation: -180, duration: 10, type: 'spin' },
    // Combos
    'up+left':    { name: 'VARIAL FLIP', rotation: 540, duration: 14, type: 'flip' },
    'up+right':   { name: 'HARDFLIP', rotation: -540, duration: 14, type: 'flip' },
    'down+left':  { name: 'INWARD HEEL', rotation: 360, duration: 14, type: 'flip' },
    'down+right': { name: 'TRE FLIP', rotation: -720, duration: 16, type: 'flip' },
};
let gameMode = 'title'; // 'title', 'studio', or 'dungeon'
let dungeonTransition = 0; // fade timer for door transition
let meetingState = null; // null or { phase, timer, speakerIdx, seats }

const MEETING_ORDER = ['vault', 'design', 'art', 'writer', 'engine', 'qa', 'oracle'];
const MEETING_RESPONSES = {
    vault: [
        "18 lore sources indexed. Dave Juice has 5 stages mapped to progression. Celestial Manhattan has 5 districts ready as game zones.",
        "I've mapped the full mythology. Michael's arc from busboy to exile is clear. The Devil's open-source Hell is our strongest world-building element.",
        "Season 1 and 2 story beats are locked. Every department department in Heaven Inc maps to a gameplay system. Creativity, Memory, Dream, Fear — all playable.",
    ],
    design: [
        "Core loop proposal: negotiation over combat. Flow State as the skill tree. Club Penguin social meets Disco Elysium dialogue. Every upgrade costs something narratively.",
        "Dave Juice stages ARE the progression system. Halo brightness as XP creates natural risk — brighter halo attracts Thought Police. Risk-reward baked into the lore.",
        "I want items that shift based on Juice level. A health potion at Stage 1 becomes reality-warping at Stage 5. Same item, different meaning.",
    ],
    art: [
        "Gold on midnight blue is locked. FOP proportions, noir atmosphere. Rain on Celestial Manhattan streets is our signature visual. Every silhouette reads clean.",
        "Michael: curly gold hair, tired eyes, small wings. Devil: red skin, blue suit, yellow moons. God: white beard, talk show desk. All designed for instant recognition.",
        "Concept art defines everything. The retrofuture city needs neon reflections on wet streets. Warm sepia for flashbacks. Teal for Hell sequences.",
    ],
    writer: [
        "Michael deflects with humor when scared. God speaks with charm but you feel the control. The Devil only uses metaphors. Every line earns its place.",
        "Item descriptions shift with Juice level. A simple coffee mug description goes from mundane to cosmic depending on the player's state. Dialogue IS gameplay.",
        "Act structure: Michael's rise, his corruption, his crash through the OS. Season 2 flips to the Devil's perspective. We need both arcs playable.",
    ],
    engine: [
        "Canvas 2D for now, WebGL when we need rain effects. Modular architecture — every system is swappable. Need the format decision before building the dialogue tree engine.",
        "Isometric renderer is working. Skateboard physics feel good. Next priority: the room transition system for the dungeon mode. Two days once format is locked.",
        "I've built the collision system, camera, and entity pipeline. The agent AI framework is ready. Just need content to plug in.",
    ],
    qa: [
        "First prototype missed our tone completely. It felt like Isaac with a Heaven skin. Whatever we build next needs a lore-native hook from frame one.",
        "I'm testing every mechanic against the source bible. If a fan wouldn't say 'they understood it,' it doesn't ship. Authenticity is the quality bar.",
        "The skateboard feels right but combat needs the negotiation angle. We can't just reskin shooting. The mechanic has to come FROM the world.",
    ],
    oracle: [
        "Studio efficiency is at 30%. Blocked on direction. The lore vault is rich but needs taxonomy. I recommend a brain protocol run before next sprint.",
        "Cross-department alignment is low. Design and Art agree on tone but Engine needs a format call. QA's concerns about authenticity are valid and unresolved.",
        "The team is talented but unfocused. One clear directive from the CEO would unblock three departments simultaneously.",
    ],
};
const MEETING_PROMPTS = {
    vault: "The CEO just called a team meeting. Give your status report on the lore foundation. What's ready, what's mapped, what needs attention? Be specific about the IP — Dave Juice, Celestial Manhattan, characters. 2-3 sentences.",
    design: "The CEO called a team meeting. Vault just gave their lore update. Give your status on game mechanics — what's the core loop proposal, what systems are you designing, what decisions are blocked? Reference the lore. 2-3 sentences.",
    art: "Team meeting. Vault and Design reported. Give your art direction status — palette, character style, key scenes, what's locked vs pending. Be specific about visual identity. 2-3 sentences.",
    writer: "Team meeting. Give your narrative status — character voices, dialogue systems, how writing connects to gameplay mechanics. What's mapped, what needs work? 2-3 sentences.",
    engine: "Team meeting. Give your technical status — what architecture decisions are made, what's blocked, what can you build now? Be honest about dependencies on other departments. 2-3 sentences.",
    qa: "Team meeting. Give your honest quality assessment — what worked in the last prototype, what didn't, what are you watching for? Be direct about concerns. 2-3 sentences.",
    oracle: "Team meeting. Give your meta-analysis — studio efficiency, bottlenecks, what the team should prioritize next. Reference what other departments said. 2-3 sentences.",
};

// Meeting seats around the table (not on it)
function getMeetingSeats() {
    const hub = WORLD?.rooms?.find(r => r.id === 'hub');
    if (!hub) return [];
    const cx = hub.x + hub.w / 2, cy = hub.y + hub.h / 2;
    // Seats spaced OUTSIDE the table edges (table is 6T wide, 2T deep at center)
    return [
        { x: cx - 2, y: cy - 3 }, { x: cx, y: cy - 3 }, { x: cx + 2, y: cy - 3 },  // back row
        { x: cx - 2, y: cy + 3 }, { x: cx, y: cy + 3 }, { x: cx + 2, y: cy + 3 },  // front row
        { x: cx - 4, y: cy },  // left side
    ];
}

// Auto-generated furniture collision boxes (populated by buildModularWorld)
let FURNITURE = [];

function buildFurniture() {
    FURNITURE = [];
    for (const room of WORLD.rooms) {
        const cx = (room.x + room.w / 2) * T;
        const cy = (room.y + room.h / 2) * T;
        if (room.id === 'hub') {
            FURNITURE.push({ x: cx - T * 3, y: cy - T, w: T * 6, d: T * 2, h: 8 });
        } else if (room.id === 'ceo') {
            FURNITURE.push({ x: cx - T, y: cy - T / 2, w: T * 3, d: T, h: 10 });
        } else {
            FURNITURE.push({ x: cx - T / 2, y: cy - T / 4, w: T + 4, d: T * 0.7, h: 8 });
        }
    }
}

// === ISOMETRIC PROJECTION ===
function worldToIso(wx, wy) {
    return { x: wx - wy, y: (wx + wy) * 0.5 };
}
function isoToWorld(sx, sy) {
    return { x: (sx + 2 * sy) / 2, y: (2 * sy - sx) / 2 };
}
function isoDepth(wx, wy) { return wx + wy; }
function darkenColor(hex, factor) {
    if (hex[0] !== '#') return hex;
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgb(${Math.round(r*factor)},${Math.round(g*factor)},${Math.round(b*factor)})`;
}
function drawIsoTile(tx, ty, color) {
    const p = worldToIso(tx * T, ty * T);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + T, p.y + T/2);
    ctx.lineTo(p.x, p.y + T);
    ctx.lineTo(p.x - T, p.y + T/2);
    ctx.closePath();
    ctx.fill();
}
function drawIsoWall(tx, ty, color) {
    const h = T * 0.5;
    const p = worldToIso(tx * T, ty * T);
    // Top face
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h);
    ctx.lineTo(p.x + T, p.y + T/2 - h);
    ctx.lineTo(p.x, p.y + T - h);
    ctx.lineTo(p.x - T, p.y + T/2 - h);
    ctx.closePath(); ctx.fill();
    // Left face
    ctx.fillStyle = darkenColor(color, 0.6);
    ctx.beginPath();
    ctx.moveTo(p.x - T, p.y + T/2 - h);
    ctx.lineTo(p.x, p.y + T - h);
    ctx.lineTo(p.x, p.y + T);
    ctx.lineTo(p.x - T, p.y + T/2);
    ctx.closePath(); ctx.fill();
    // Right face
    ctx.fillStyle = darkenColor(color, 0.4);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + T - h);
    ctx.lineTo(p.x + T, p.y + T/2 - h);
    ctx.lineTo(p.x + T, p.y + T/2);
    ctx.lineTo(p.x, p.y + T);
    ctx.closePath(); ctx.fill();
}
function safeSpawnStudio() {
    // Spawn in hub room, offset from table center
    const hub = WORLD?.rooms?.find(r => r.id === 'hub');
    if (hub) {
        player.x = (hub.x + hub.w / 2 + 4) * T;
        player.y = (hub.y + hub.h / 2 + 3) * T;
    } else {
        player.x = 19 * T; player.y = 20 * T;
    }
    player.vx = 0; player.vy = 0;
    camera.x = player.x; camera.y = player.y;
}

function hitsFurniture(wx, wy, r) {
    for (const f of FURNITURE) {
        if (wx + r > f.x && wx - r < f.x + f.w &&
            wy + r > f.y && wy - r < f.y + f.d) {
            return f;
        }
    }
    return null;
}

function getFurnitureAt(wx, wy) {
    for (const f of FURNITURE) {
        if (wx >= f.x && wx < f.x + f.w && wy >= f.y && wy < f.y + f.d) return f;
    }
    return null;
}

function getHeightAt(wx, wy) {
    const tx = wx / T;
    const ty = wy / T;
    // Check ramps first
    for (const r of RAMPS) {
        if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
            const t = (ty - r.y) / r.h;
            return r.fromH * (1 - t) + r.toH * t;
        }
    }
    // Check if in an elevated room
    const itx = Math.floor(tx), ity = Math.floor(ty);
    for (const room of WORLD.rooms) {
        if (itx >= room.x && itx < room.x + room.w && ity >= room.y && ity < room.y + room.h) {
            return room.elevated ? LEVEL_H : 0;
        }
    }
    return 0;
}

function drawIsoBox(wx, wy, w, d, h, topColor, leftColor, rightColor) {
    const p0 = worldToIso(wx, wy);
    const p1 = worldToIso(wx + w, wy);
    const p2 = worldToIso(wx + w, wy + d);
    const p3 = worldToIso(wx, wy + d);
    // Left face
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y - h); ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p2.x, p2.y); ctx.lineTo(p2.x, p2.y - h);
    ctx.closePath(); ctx.fill();
    // Right face
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y - h); ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p1.x, p1.y); ctx.lineTo(p1.x, p1.y - h);
    ctx.closePath(); ctx.fill();
    // Top face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y - h); ctx.lineTo(p1.x, p1.y - h);
    ctx.lineTo(p2.x, p2.y - h); ctx.lineTo(p3.x, p3.y - h);
    ctx.closePath(); ctx.fill();
}

// Build world grid
function buildWorldGrid() {
    worldGrid = Array(WORLD_H).fill(null).map(() => Array(WORLD_W).fill(0));

    // Mark room interiors as walkable (skip borders for thin wall look)
    for (const room of WORLD.rooms) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                if (y >= 0 && y < WORLD_H && x >= 0 && x < WORLD_W) {
                    if (y === room.y || y === room.y + room.h - 1 || x === room.x || x === room.x + room.w - 1) {
                        if (worldGrid[y][x] !== 1) worldGrid[y][x] = 2;
                    } else {
                        worldGrid[y][x] = 1;
                    }
                }
            }
        }
    }
    // Corridors override walls
    for (const cor of WORLD.corridors) {
        for (let y = cor.y; y < cor.y + cor.h; y++) {
            for (let x = cor.x; x < cor.x + cor.w; x++) {
                if (y >= 0 && y < WORLD_H && x >= 0 && x < WORLD_W) {
                    worldGrid[y][x] = 1;
                }
            }
        }
    }
}

// 8-direction facing from any angle
function angleToFacing8(angle) {
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const slice = Math.PI / 8; // 22.5°
    if (norm < slice || norm >= 15 * slice) return 'right';
    if (norm < 3 * slice) return 'down-right';
    if (norm < 5 * slice) return 'down';
    if (norm < 7 * slice) return 'down-left';
    if (norm < 9 * slice) return 'left';
    if (norm < 11 * slice) return 'up-left';
    if (norm < 13 * slice) return 'up';
    return 'up-right';
}

function isWalkable(wx, wy) {
    const tx = Math.floor(wx / T);
    const ty = Math.floor(wy / T);
    if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return false;
    return worldGrid[ty][tx] === 1;
}

function getRoomAt(wx, wy) {
    const tx = wx / T;
    const ty = wy / T;
    for (const zone of ZONES) {
        if (tx >= zone.x && tx < zone.x + zone.w && ty >= zone.y && ty < zone.y + zone.h) return zone;
    }
    for (const room of WORLD.rooms) {
        if (tx >= room.x && tx < room.x + room.w && ty >= room.y && ty < room.y + room.h) return room;
    }
    return null;
}

// === INIT ===
// === AUDIO SYSTEM (procedural — no files needed) ===
let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicPlaying = false;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.3;
    sfxGain.connect(audioCtx.destination);
}

function playTone(freq, duration, type, vol, dest) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime((vol || 0.3) * sfxGain.gain.value, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(dest || audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, vol) {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol || 0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
}

const SFX = {
    ollie() {
        // Soft pop
        playTone(600, 0.05, 'sine', 0.08);
        playTone(900, 0.03, 'sine', 0.05);
    },
    trickLand() {
        // Satisfying catch — ascending tone
        playTone(400, 0.1, 'sine', 0.2);
        setTimeout(() => playTone(600, 0.1, 'sine', 0.2), 30);
        setTimeout(() => playTone(800, 0.15, 'sine', 0.25), 60);
    },
    bail() {
        // Thud + buzz
        playTone(120, 0.2, 'sawtooth', 0.15);
        playNoise(0.15, 0.1);
    },
    shoot() {
        // Quiet halo ping
        playTone(1200, 0.04, 'sine', 0.04);
    },
    hit() {
        // Taking damage — low thud
        playTone(80, 0.15, 'sine', 0.3);
        playTone(60, 0.2, 'triangle', 0.2);
    },
    enemyDeath() {
        // Fairy poof — ascending sparkle
        playTone(600, 0.08, 'sine', 0.15);
        setTimeout(() => playTone(900, 0.08, 'sine', 0.12), 40);
        setTimeout(() => playTone(1300, 0.1, 'sine', 0.1), 80);
    },
    pickup() {
        // Coin/item collect
        playTone(800, 0.05, 'sine', 0.2);
        setTimeout(() => playTone(1200, 0.08, 'sine', 0.2), 50);
    },
    doorOpen() {
        // Magical door unlock
        playTone(300, 0.15, 'sine', 0.15);
        setTimeout(() => playTone(450, 0.15, 'sine', 0.15), 100);
        setTimeout(() => playTone(600, 0.2, 'sine', 0.2), 200);
    },
    skateRoll() {
        // Subtle rolling rumble
        playNoise(0.08, 0.02);
    },
    enterDungeon() {
        // Dramatic descending
        playTone(600, 0.2, 'sine', 0.2);
        setTimeout(() => playTone(400, 0.2, 'sine', 0.2), 150);
        setTimeout(() => playTone(300, 0.3, 'sine', 0.25), 300);
    },
    menuSelect() {
        playTone(500, 0.08, 'sine', 0.2);
        setTimeout(() => playTone(700, 0.1, 'sine', 0.2), 50);
    },
};

// Lo-fi ambient music — procedural noir jazz loop
let musicInterval = null;
function startMusic() {
    if (musicPlaying || !audioCtx) return;
    musicPlaying = true;

    // Ambient pad — warm chord drone
    const chords = [
        [220, 277, 330],  // Am
        [196, 247, 294],  // G
        [175, 220, 262],  // F
        [165, 208, 247],  // E
    ];
    let chordIdx = 0;

    function playChord() {
        if (!musicPlaying) return;
        const chord = chords[chordIdx % chords.length];
        chordIdx++;
        for (const freq of chord) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.5);
            gain.gain.linearRampToValueAtTime(0.03, audioCtx.currentTime + 3);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 4);
            osc.connect(gain);
            gain.connect(musicGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 4);
        }
    }

    playChord();
    musicInterval = setInterval(playChord, 4000);
}

function stopMusic() {
    musicPlaying = false;
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
}

function init() {
    canvas = document.getElementById('sim');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx.imageSmoothingEnabled = false;
    resize();
    // iOS Safari reports stale innerWidth/innerHeight right after rotation,
    // and the URL bar collapses/expands producing multiple layout changes.
    // Fire a staircase of resizes so the final state is correct.
    const kickResize = () => {
        window.scrollTo(0, 0);
        resize();
        [60, 180, 400, 800].forEach(ms => setTimeout(() => { window.scrollTo(0, 0); resize(); }, ms));
    };
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', kickResize);
    // visualViewport is the most reliable on iOS — fires on URL bar changes too
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', resize);
    }
    window.addEventListener('keydown', e => {
        if (chatFocused) return; // let chat input handle its own keys
        keys[e.key.toLowerCase()] = true;
        if (e.key === 'Shift') skateMode = !skateMode;
        if (e.key === 'Enter') {
            document.getElementById('chat-bar').classList.add('active');
            document.getElementById('chat-input').focus();
            e.preventDefault(); return;
        }
        e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Mobile twin-stick controls
    // Left stick: movement + TAP to toggle skateboard
    setupMobileStick('stick-left', 'knob-left', (dx, dy) => {
        keys['w'] = dy < -0.3; keys['s'] = dy > 0.3;
        keys['a'] = dx < -0.3; keys['d'] = dx > 0.3;
    });
    const stickLeft = document.getElementById('stick-left');
    if (stickLeft) {
        let leftTapTime = 0;
        stickLeft.addEventListener('touchstart', e => {
            leftTapTime = Date.now();
            initAudio(); // unlock iOS audio on first touch
        });
        stickLeft.addEventListener('touchend', e => {
            if (Date.now() - leftTapTime < 200) skateMode = !skateMode; // quick tap = toggle skate
        });
    }
    // Right stick: aim/shoot/tricks + TAP to jump
    setupMobileStick('stick-right', 'knob-right', (dx, dy) => {
        keys['arrowup'] = dy < -0.3; keys['arrowdown'] = dy > 0.3;
        keys['arrowleft'] = dx < -0.3; keys['arrowright'] = dx > 0.3;
    });
    const stickRight = document.getElementById('stick-right');
    if (stickRight) {
        let rightTapTime = 0;
        stickRight.addEventListener('touchstart', e => { rightTapTime = Date.now(); });
        stickRight.addEventListener('touchend', e => {
            if (Date.now() - rightTapTime < 200) { keys[' '] = true; setTimeout(() => { keys[' '] = false; }, 50); }
        });
    }
    // Interact button
    const interactBtn = document.getElementById('mobile-interact');
    if (interactBtn) {
        interactBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['e'] = true; initAudio(); });
        interactBtn.addEventListener('touchend', e => { e.preventDefault(); keys['e'] = false; });
    }
    // ESC button (exit dungeon / close dialogue) — top-left X corner
    const escBtn = document.getElementById('mobile-esc');
    if (escBtn) {
        const pressEsc = () => { keys['escape'] = true; setTimeout(() => { keys['escape'] = false; }, 120); };
        escBtn.addEventListener('touchstart', e => { e.preventDefault(); pressEsc(); });
        escBtn.addEventListener('click', e => { e.preventDefault(); pressEsc(); });
    }
    // Mobile zoom buttons (tap-based, intentionally no pinch gesture so browser zoom isn't hijacked)
    const zoomInBtn = document.getElementById('mobile-zoom-in');
    const zoomOutBtn = document.getElementById('mobile-zoom-out');
    if (zoomInBtn) {
        const zin = e => { e.preventDefault(); zoomStep(1); };
        zoomInBtn.addEventListener('touchstart', zin, { passive: false });
        zoomInBtn.addEventListener('click', zin);
    }
    if (zoomOutBtn) {
        const zout = e => { e.preventDefault(); zoomStep(-1); };
        zoomOutBtn.addEventListener('touchstart', zout, { passive: false });
        zoomOutBtn.addEventListener('click', zout);
    }
    // Unlock iOS audio on any canvas touch
    canvas.addEventListener('touchstart', () => { initAudio(); if (!musicPlaying) startMusic(); }, { once: true });

    document.getElementById('dialogue-close').addEventListener('click', closeDialogue);
    document.getElementById('card-close').addEventListener('click', () => {
        document.getElementById('agent-card').classList.add('hidden');
    });

    // Drag character card
    const card = document.getElementById('agent-card');
    let dragging = false, dragOffX = 0, dragOffY = 0;
    card.addEventListener('mousedown', e => {
        if (e.target.id === 'card-close') return;
        dragging = true;
        dragOffX = e.clientX - card.offsetLeft;
        dragOffY = e.clientY - card.offsetTop;
        card.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        card.style.left = (e.clientX - dragOffX) + 'px';
        card.style.top = (e.clientY - dragOffY) + 'px';
    });
    window.addEventListener('mouseup', () => {
        dragging = false;
        card.style.cursor = 'grab';
    });

    // Club Penguin style chat bar
    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) { chatInput.blur(); document.getElementById('chat-bar').classList.remove('active'); return; }
            chatInput.value = '';

            const lower = text.toLowerCase();

            // End meeting commands
            if (meetingState && (lower.includes('end meeting') || lower.includes('dismissed') || lower.includes('adjourn') || lower.includes('meeting over') || lower.includes('wrap up'))) {
                playerBubble = { text, life: 180 };
                addMessage('YOU', text, 'ceo');
                endMeeting();
                chatInput.blur();
                document.getElementById('chat-bar').classList.remove('active');
                return;
            }

            // Start meeting commands
            if (!meetingState && (lower.includes('meeting') || lower.includes('gather') || lower.includes('assemble') || lower.includes('round table'))) {
                playerBubble = { text, life: 180 };
                startMeeting();
                chatInput.blur();
                document.getElementById('chat-bar').classList.remove('active');
                return;
            }

            // During meeting: player talks to the whole table
            if (meetingState) {
                playerBubble = { text, life: 180 };
                addMessage('YOU', text, 'ceo');
                // Send to a relevant agent (or the last speaker) for a real response
                const lastSpeaker = MEETING_ORDER[Math.max(0, (meetingState.speakerIdx || 1) - 1)];
                sendChatMessage(lastSpeaker || 'vault', text);
                chatInput.value = '';
                chatInput.blur();
                document.getElementById('chat-bar').classList.remove('active');
                return;
            }

            // Show player bubble above head
            playerBubble = { text, life: 240 };
            // If near an agent or have active dialogue, send to them
            const targetAgent = activeAgent || (findNearestAgent()?.dist < 50 ? findNearestAgent().agent : null);
            if (targetAgent) {
                if (!activeAgent) openDialogue(targetAgent);
                addMessage('YOU', text, 'ceo');
                sendChatMessage(targetAgent.id, text);
            }
            chatInput.blur();
        }
        e.stopPropagation(); // Don't move player while typing
    });
    chatInput.addEventListener('keyup', e => e.stopPropagation());
    chatInput.addEventListener('focus', () => { chatFocused = true; });
    chatInput.addEventListener('blur', () => { chatFocused = false; });

    buildModularWorld();
    buildWorldGrid();
    buildFurniture();

    agents = AGENT_DEFS.map(def => ({
        ...def,
        x: def.homeX * T + T / 2,
        y: def.homeY * T + T / 2,
        targetX: def.homeX * T + T / 2,
        targetY: def.homeY * T + T / 2,
        atDesk: true, wanderTimer: 200 + Math.random() * 300,
        animFrame: 0, animTimer: 0, talking: false,
        chatIdx: 0, facing: 'down',
    }));

    player.x = 19 * T;
    player.y = 16 * T;
    camera.x = player.x;
    camera.y = player.y;

    loop();
}

function resize() {
    IS_TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    // Prefer visualViewport on touch — it reports the real painted size
    // (accounts for URL bar, reliable across rotation). Fallback to innerW/H.
    const vv = window.visualViewport;
    const vw = (IS_TOUCH && vv) ? Math.round(vv.width)  : window.innerWidth;
    const vh = (IS_TOUCH && vv) ? Math.round(vv.height) : window.innerHeight;

    if (IS_TOUCH) {
        // Full-screen canvas on mobile. Keep internal height pegged to BASE_H for consistent physics,
        // but let width match viewport aspect ratio so portrait is tall and landscape is wide.
        const aspect = vw / vh;
        CANVAS_H = BASE_H;
        CANVAS_W = Math.round(CANVAS_H * aspect);
        // Canvas fills the whole viewport
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        canvas.style.position = 'fixed';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.right = '0';
        canvas.style.bottom = '0';
        canvas.style.width = vw + 'px';
        canvas.style.height = vh + 'px';
        canvas.style.margin = '0';
        canvas.style.transform = 'none';
    } else {
        // Desktop: locked baseline, letterboxed and centered
        CANVAS_W = BASE_W;
        CANVAS_H = BASE_H;
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H);
        const w = Math.floor(CANVAS_W * scale);
        const h = Math.floor(CANVAS_H * scale);
        canvas.style.position = 'fixed';
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.style.left = Math.floor((vw - w) / 2) + 'px';
        canvas.style.top = Math.floor((vh - h) / 2) + 'px';
        canvas.style.right = 'auto';
        canvas.style.bottom = 'auto';
        canvas.style.margin = '0';
        canvas.style.transform = 'none';
    }
    ctx.imageSmoothingEnabled = false;
    // Re-apply zoom so the current step shows the intended world-width
    // (CANVAS_W just changed — zoom multiplier must re-derive from it).
    // Snap camera.zoom as well so boot/rotation doesn't show a frame at
    // the pre-lerp zoom (which was causing the "opens in zoomed in" bug
    // on portrait — default zoom 1.0 is very tight on a 187px canvas).
    if (typeof camera !== 'undefined' && camera) {
        const levels = currentZoomLevels();
        const z = levels[Math.max(0, Math.min(levels.length - 1, zoomIndex))];
        camera.targetZoom = z;
        camera.zoom = z;
    }
}

// Zoom steps. On desktop we use the original raw multipliers people are used
// to; on touch we use target world-widths because the canvas aspect varies
// wildly with orientation. Tuned so portrait "closest" feels close without
// being the previous cramped 75px-wide view.
const DESKTOP_ZOOMS = [0.6, 1.2, 2.5];
const TOUCH_TARGET_WIDTHS = [600, 380, 260]; // far → mid → close (world px visible)
let zoomIndex = 1; // start at middle

function currentZoomLevels() {
    if (IS_TOUCH) {
        return TOUCH_TARGET_WIDTHS.map(w => CANVAS_W / w);
    }
    return DESKTOP_ZOOMS;
}

function zoomStep(dir) {
    const levels = currentZoomLevels();
    zoomIndex = Math.max(0, Math.min(levels.length - 1, zoomIndex + dir));
    camera.targetZoom = levels[zoomIndex];
}

let zoomCooldown = 0;
// Floating thumbstick: the zone is a large invisible area covering half the screen.
// On touchstart, we anchor the visible stick base at the touch point. The knob follows
// the finger (capped to maxDist from the anchor). On release the base fades out.
function setupMobileStick(zoneId, knobId, callback) {
    const zone = document.getElementById(zoneId);
    const knob = document.getElementById(knobId);
    if (!zone || !knob) return;
    const base = zone.querySelector('.stick-base');
    const BASE_SIZE = 120; // matches CSS width/height
    const maxDist = 44;
    let touchId = null, cx = 0, cy = 0;

    zone.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.changedTouches[0];
        touchId = t.identifier;
        // Anchor the stick base at the touch point, relative to the zone
        const zoneRect = zone.getBoundingClientRect();
        const localX = t.clientX - zoneRect.left;
        const localY = t.clientY - zoneRect.top;
        if (base) {
            base.style.left = (localX - BASE_SIZE / 2) + 'px';
            base.style.top  = (localY - BASE_SIZE / 2) + 'px';
            base.style.right = 'auto';
            base.style.bottom = 'auto';
            base.classList.add('active');
        }
        cx = t.clientX;
        cy = t.clientY;
        knob.style.transform = 'translate(-50%, -50%)';
    }, { passive: false });

    zone.addEventListener('touchmove', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier !== touchId) continue;
            const dx = t.clientX - cx, dy = t.clientY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const clamp = Math.min(dist, maxDist);
            const nx = dist > 0 ? (dx / dist) * clamp : 0;
            const ny = dist > 0 ? (dy / dist) * clamp : 0;
            knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
            callback(dist > 8 ? dx / dist : 0, dist > 8 ? dy / dist : 0);
        }
    }, { passive: false });

    const end = e => {
        for (const t of e.changedTouches) {
            if (t.identifier !== touchId) continue;
            touchId = null;
            knob.style.transform = 'translate(-50%, -50%)';
            if (base) base.classList.remove('active');
            callback(0, 0);
        }
    };
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);
}

function handleWheel(e) {
    e.preventDefault();
    if (zoomCooldown > 0) return;
    zoomStep(e.deltaY > 0 ? -1 : 1);
    zoomCooldown = 15; // frames cooldown between zoom steps
}

function startMeeting() {
    if (meetingState) return;

    const hub = WORLD.rooms.find(r => r.id === 'hub');
    if (!hub) return;
    const seats = getMeetingSeats();
    const headSeat = { x: hub.x + hub.w / 2 + 4, y: hub.y + hub.h / 2 }; // right side head of table

    meetingState = { phase: 'gathering', timer: 0, speakerIdx: -1, headSeat };

    // Move player to head of table
    player.vx = 0; player.vy = 0;
    meetingState.playerTarget = { x: headSeat.x * T, y: headSeat.y * T };

    // Send all agents to seats
    const nonFollowers = agents.filter(a => !a.followsPlayer);
    for (let i = 0; i < nonFollowers.length && i < seats.length; i++) {
        nonFollowers[i].targetX = seats[i].x * T;
        nonFollowers[i].targetY = seats[i].y * T;
        nonFollowers[i].atDesk = false;
    }
    // FRIDAY sits at end
    const friday = agents.find(a => a.followsPlayer);
    if (friday && seats.length > nonFollowers.length) {
        friday.targetX = seats[nonFollowers.length].x * T;
        friday.targetY = seats[nonFollowers.length].y * T;
    }

    // Open dialogue panel
    document.getElementById('dialogue-panel').classList.remove('hidden');
    document.getElementById('dialogue-name').textContent = 'TEAM MEETING';
    document.getElementById('dialogue-role').textContent = 'Game Functions Review';
    document.getElementById('dialogue-body').innerHTML = '';
    addMessage('SYSTEM', 'Meeting called. Everyone gathering at the Round Table...', 'agent');
}

function endMeeting() {
    if (!meetingState) return;
    addMessage('FRIDAY', 'Meeting adjourned. Everyone back to stations.', 'agent');
    showTextAsBubbles(agents.find(a => a.followsPlayer) || agents[0], 'Meeting adjourned. Back to stations.');
    // Send everyone back
    for (const a of agents) {
        a.targetX = a.homeX * T + T / 2;
        a.targetY = a.homeY * T + T / 2;
        a.talking = false;
    }
    meetingState = null;
}

function updateMeeting() {
    if (!meetingState) return;

    // Auto-walk player to head of table during gathering
    if (meetingState.playerTarget) {
        const dx = meetingState.playerTarget.x - player.x;
        const dy = meetingState.playerTarget.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 4) {
            player.vx = (dx / dist) * player.speed;
            player.vy = (dy / dist) * player.speed;
            if (dx > 0) player.facing = 'right';
            else if (dx < 0) player.facing = 'left';
        } else {
            player.vx = 0; player.vy = 0;
            meetingState.playerTarget = null;
        }
    }

    meetingState.timer++;

    if (meetingState.phase === 'gathering') {
        const allArrived = agents.every(a => {
            const d = Math.sqrt((a.x - a.targetX) ** 2 + (a.y - a.targetY) ** 2);
            return d < 10;
        });
        if (allArrived || meetingState.timer > 300) {
            meetingState.phase = 'seated';
            meetingState.timer = 0;
            // FRIDAY opens — never puts words in the player's mouth
            addMessage('FRIDAY', 'Everyone\'s here, boss. Ready when you are.', 'agent');
            showTextAsBubbles(agents.find(a => a.followsPlayer) || agents[0], "Everyone's here, boss. Ready when you are.");
        }
    } else if (meetingState.phase === 'seated') {
        // Just waiting — player talks freely, meeting continues until player ends it
        // FRIDAY auto-cycles through agents if player doesn't talk for a while
        if (meetingState.timer > 400 && meetingState.speakerIdx < MEETING_ORDER.length) {
            const prevId = MEETING_ORDER[meetingState.speakerIdx - 1];
            if (prevId) {
                const prevAgent = agents.find(a => a.id === prevId);
                if (prevAgent) prevAgent.talking = false;
            }
            // FRIDAY calls on next agent
            const nextId = MEETING_ORDER[meetingState.speakerIdx];
            const nextAgent = agents.find(a => a.id === nextId);
            if (nextAgent) {
                addMessage('FRIDAY', `${nextAgent.name}, your update?`, 'agent');
                showTextAsBubbles(agents.find(a => a.followsPlayer) || agents[0], `${nextAgent.name}, your update?`);
                // Small delay then agent speaks
                setTimeout(() => speakAtMeeting(meetingState.speakerIdx), 1500);
            }
            meetingState.speakerIdx++;
            meetingState.timer = 0;
        }
        // After all agents have spoken, FRIDAY prompts the CEO
        if (meetingState.speakerIdx >= MEETING_ORDER.length && meetingState.timer > 300 && !meetingState.allSpoke) {
            meetingState.allSpoke = true;
            addMessage('FRIDAY', 'That\'s everyone, boss. Your call.', 'agent');
            showTextAsBubbles(agents.find(a => a.followsPlayer) || agents[0], "That's everyone, boss. Your call.");
        }
    }
}

let bubbleQueue = []; // queue of {agentId, text, life} for sequential display

function speakAtMeeting(idx) {
    const agentId = MEETING_ORDER[idx];
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    agent.talking = true;
    // Local response — pick from agent's meeting lines
    const lines = MEETING_RESPONSES[agentId] || agent.chatter;
    const responseText = lines[Math.floor(Math.random() * lines.length)];
    addMessage(agent.name, responseText, 'agent');
    showTextAsBubbles(agent, responseText);
}

function showTextAsBubbles(agent, text) {
    // Split into sentences, then into chunks that fit in small bubbles
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    for (const s of sentences) {
        const trimmed = s.trim();
        if (trimmed.length <= 50) {
            chunks.push(trimmed);
        } else {
            // Split long sentence at word boundaries
            const words = trimmed.split(' ');
            let chunk = '';
            for (const w of words) {
                if ((chunk + ' ' + w).length > 45 && chunk) {
                    chunks.push(chunk);
                    chunk = w;
                } else {
                    chunk = chunk ? chunk + ' ' + w : w;
                }
            }
            if (chunk) chunks.push(chunk);
        }
    }
    // Queue all chunks as sequential bubbles
    for (let i = 0; i < chunks.length; i++) {
        bubbleQueue.push({
            agentId: agent.id,
            text: chunks[i],
            life: 150,
            delay: i * 160, // stagger
        });
    }
}

// === SHARED PLAYER MOVEMENT — used by both studio and dungeon ===
function updatePlayerMovement() {
    let mx = 0, my = 0;
    if (keys['w']) my -= 1;
    if (keys['s']) my += 1;
    if (keys['a']) mx -= 1;
    if (keys['d']) mx += 1;
    const mLen = Math.sqrt(mx * mx + my * my);
    if (mLen > 0) { mx /= mLen; my /= mLen; }

    const skating = skateMode;
    const boost = speedBoostTimer > 0 ? 1.4 : 1.0;
    if (speedBoostTimer > 0) speedBoostTimer--;
    const spd = (skating ? player.speed * 1.0 : player.speed) * boost;

    if (skating) {
        if (mx || my) {
            const targetAngle = Math.atan2(my, mx);
            if (player.skateAngle === null) player.skateAngle = targetAngle;
            else {
                let diff = targetAngle - player.skateAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const absDiff = Math.abs(diff);
                if (absDiff > Math.PI * 0.75) player.skateAngle = targetAngle;
                else player.skateAngle += diff * (absDiff > Math.PI * 0.3 ? 0.15 : 0.06);
            }
            player.vx = (player.vx || 0) * 0.9 + Math.cos(player.skateAngle) * spd * 0.12;
            player.vy = (player.vy || 0) * 0.9 + Math.sin(player.skateAngle) * spd * 0.12;
        } else if (player.skateAngle !== null) {
            player.vx = (player.vx || 0) * 0.988;
            player.vy = (player.vy || 0) * 0.988;
        }
        const vSpeed = Math.sqrt((player.vx||0)**2 + (player.vy||0)**2);
        if (vSpeed > 0.3 && player.skateAngle !== null) {
            const bcos = Math.cos(player.skateAngle), bsin = Math.sin(player.skateAngle);
            const along = player.vx * bcos + player.vy * bsin;
            const perp = -player.vx * bsin + player.vy * bcos;
            const driftRatio = Math.abs(perp) / (Math.abs(along) + Math.abs(perp) + 0.01);
            const grip = 0.92 - driftRatio * 0.3;
            player.vx = along * bcos - (perp * grip) * bsin;
            player.vy = along * bsin + (perp * grip) * bcos;
        }
        if (player.skateAngle !== null) {
            const facingAngles = { right: 0, 'down-right': Math.PI/4, down: Math.PI/2, 'down-left': Math.PI*3/4, left: Math.PI, 'up-left': -Math.PI*3/4, up: -Math.PI/2, 'up-right': -Math.PI/4 };
            const ca = facingAngles[player.facing] || 0;
            const p1 = player.skateAngle + Math.PI/2, p2 = player.skateAngle - Math.PI/2;
            let d1 = p1 - ca; while (d1 > Math.PI) d1 -= Math.PI*2; while (d1 < -Math.PI) d1 += Math.PI*2;
            let d2 = p2 - ca; while (d2 > Math.PI) d2 -= Math.PI*2; while (d2 < -Math.PI) d2 += Math.PI*2;
            player.facing = angleToFacing8(Math.abs(d1) < Math.abs(d2) ? p1 : p2);
        }
    } else {
        player.skateAngle = null;
        if (mx || my) player.facing = angleToFacing8(Math.atan2(my, mx));
        player.vx = mx * spd;
        player.vy = my * spd;
    }
    player.vx = Math.max(-3.5, Math.min(3.5, player.vx || 0));
    player.vy = Math.max(-3.5, Math.min(3.5, player.vy || 0));
}

// === SHARED JUMP + TRICKS — used by both studio and dungeon ===
function updateJumpAndTricks() {
    const skating = skateMode;
    if (keys[' '] && jumpHeight === 0) {
        keys[' '] = false;
        jumpVel = skating ? -3.5 : -2.5;
        boardFlipState = null;
        bodySpinAngle = 0;
        SFX.ollie();
    }
    // Tricks mid-air
    if (jumpHeight < -3) {
        // A/D mid-air = body spin (works with or without skateboard)
        if (keys['a']) bodySpinAngle += 8;
        if (keys['d']) bodySpinAngle -= 8;
        // Visually rotate character facing based on spin angle
        if (Math.abs(bodySpinAngle) > 10) {
            const baseAngle = Math.atan2(player.vy || 0, player.vx || 0);
            player.facing = angleToFacing8(baseAngle + bodySpinAngle * Math.PI / 180);
        }
        // Arrows mid-air = board tricks (skating only)
        if (skating && !boardFlipState) {
            const tu = keys['arrowup'], td = keys['arrowdown'];
            const tl = keys['arrowleft'], tr = keys['arrowright'];
            let flipKey = '';
            if (tu && tl) flipKey = 'up+left';
            else if (tu && tr) flipKey = 'up+right';
            else if (td && tl) flipKey = 'down+left';
            else if (td && tr) flipKey = 'down+right';
            else if (tu) flipKey = 'up';
            else if (td) flipKey = 'down';
            else if (tl) flipKey = 'left';
            else if (tr) flipKey = 'right';
            if (flipKey && BOARD_FLIPS[flipKey]) {
                const f = BOARD_FLIPS[flipKey];
                boardFlipState = { name: f.name, rotation: f.rotation, duration: f.duration, timer: 0, landed: false, type: f.type };
            }
        }
    }
    if (boardFlipState) {
        boardFlipState.timer++;
        if (boardFlipState.timer >= boardFlipState.duration) boardFlipState.landed = true;
    }
    // Gravity
    if (jumpHeight < 0 || jumpVel !== 0) {
        jumpHeight += jumpVel; jumpVel += 0.25;
        if (jumpHeight >= 0) {
            jumpHeight = 0; jumpVel = 0;
            // Score tricks on landing + juice effects
            if (boardFlipState) {
                if (boardFlipState.landed) {
                    trickCombo++;
                    const points = trickCombo * 100;
                    trickScore += points;
                    const combo = trickCombo > 1 ? ` x${trickCombo}` : '';
                    trickDisplay = { text: boardFlipState.name + combo + ` +${points}`, timer: 70 };
                    screenShake = 4 + trickCombo * 2;
                    SFX.trickLand();
                    speedBoostTimer = 30; // brief speed boost reward
                    // Landing dust
                    for (let d = 0; d < 5; d++) dustParticles.push({ x: player.x + (Math.random()-0.5)*8, y: player.y + (Math.random()-0.5)*4, vx: (Math.random()-0.5)*2, vy: -Math.random()*0.5, life: 15 });
                } else {
                    trickDisplay = { text: 'BAIL!', timer: 40 };
                    screenShake = 6; SFX.bail();
                    trickCombo = 0;
                }
            } else if (Math.abs(bodySpinAngle) >= 150) {
                const dir = bodySpinAngle > 0 ? 'BS' : 'FS';
                const deg = Math.round(Math.abs(bodySpinAngle) / 180) * 180;
                trickCombo++;
                const points = trickCombo * 50;
                trickScore += points;
                const combo = trickCombo > 1 ? ` x${trickCombo}` : '';
                trickDisplay = { text: `${dir} ${deg}${combo} +${points}`, timer: 60 };
                screenShake = 3;
                speedBoostTimer = 20;
                for (let d = 0; d < 3; d++) dustParticles.push({ x: player.x + (Math.random()-0.5)*6, y: player.y, vx: (Math.random()-0.5)*1.5, vy: -Math.random()*0.3, life: 12 });
            } else {
                trickCombo = 0;
                // Small landing dust even without trick
                if (skateMode) for (let d = 0; d < 2; d++) dustParticles.push({ x: player.x + (Math.random()-0.5)*4, y: player.y, vx: (Math.random()-0.5)*1, vy: -Math.random()*0.2, life: 8 });
            }
            bodySpinAngle = 0;
            boardFlipState = null;
        }
    }
}

function drawTitle() {
    // Gradient background — deep purple to pink
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bgGrad.addColorStop(0, '#1A0828');
    bgGrad.addColorStop(0.5, '#2A1040');
    bgGrad.addColorStop(1, '#180830');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Sparkle stars — pink, gold, white, lavender
    for (let i = 0; i < 60; i++) {
        const sx = ((i * 73 + 17) % CANVAS_W);
        const sy = ((i * 47 + 31) % CANVAS_H);
        const b = 0.2 + Math.sin(time * 0.025 + i * 1.3) * 0.2;
        ctx.globalAlpha = b;
        const colors = ['#FFD700', '#FF88CC', '#FFFFFF', '#BB88FF', '#88DDFF'];
        ctx.fillStyle = colors[i % 5];
        const sz = i % 7 === 0 ? 2 : 1;
        ctx.fillRect(sx, sy, sz, sz);
    }
    ctx.globalAlpha = 1;

    // Title glow — pink/gold
    const glow = 0.7 + Math.sin(time * 0.03) * 0.15;
    ctx.shadowColor = '#FF88CC'; ctx.shadowBlur = 25 * glow;

    // Title
    const titleY = CANVAS_H * 0.28 + Math.sin(time * 0.02) * 3;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HEAVEN INC.', CANVAS_W / 2, titleY);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#CC88DD';
    ctx.fillText('S T U D I O S', CANVAS_W / 2, titleY + 22);
    ctx.shadowBlur = 0;

    // Character preview — CEO on skateboard
    const cx = CANVAS_W / 2, cy = CANVAS_H * 0.52;
    const bob = Math.sin(time * 0.04) * 2;
    drawCharBody(cx, cy + bob, '#996B00', C.gold, 'right', false, 0);
    drawCharHead(cx, cy + bob, '#DAA520', 'right', false, 0);
    // Halo
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.ellipse(cx, cy + bob - 22, 6, 2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // Board under feet
    ctx.fillStyle = '#8B4513'; ctx.fillRect(cx - 7, cy + bob + 8, 14, 4);
    ctx.fillStyle = C.gold; ctx.fillRect(cx - 6, cy + bob + 9, 12, 2);

    // Prompt
    const flash = Math.sin(time * 0.06) > 0;
    if (flash) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('PRESS SPACE TO START', CANVAS_W / 2, CANVAS_H * 0.75);
    }

    // Credits
    ctx.fillStyle = '#555'; ctx.font = '7px monospace';
    ctx.fillText('WASD: Move  |  SHIFT: Skateboard  |  SPACE: Jump  |  ARROWS: Tricks', CANVAS_W / 2, CANVAS_H * 0.88);
    ctx.fillText('ENTER: Chat  |  E: Interact', CANVAS_W / 2, CANVAS_H * 0.92);
    ctx.textAlign = 'left';

    // Vignette
    const vigGrad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.2, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.6);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(0, 0, 10, 0.6)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function loop() { requestAnimationFrame(loop); update(); draw(); }

// === UPDATE ===
function update() {
    time++;
    if (gameMode === 'title') {
        if (keys[' '] || keys['enter']) {
            keys[' '] = false; keys['enter'] = false;
            initAudio(); startMusic(); SFX.menuSelect();
            gameMode = 'studio';
        }
        return;
    }
    if (gameMode === 'dungeon') { updateDungeon(); return; }
    if (dungeonTransition > 0) {
        dungeonTransition--;
        if (dungeonTransition === 0) { gameMode = 'dungeon'; initDungeon(); }
        return;
    }

    // Zoom - snap to set levels
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.4;
    if (zoomCooldown > 0) zoomCooldown--;

    // Player bubble countdown
    if (playerBubble) {
        playerBubble.life--;
        if (playerBubble.life <= 0) playerBubble = null;
    }

    // Skip key input while typing, but keep physics running
    if (!chatFocused) {
    // Zoom with keys (set levels)
    if (keys['='] || keys['+']) { keys['='] = false; keys['+'] = false; zoomStep(1); }
    if (keys['-']) { keys['-'] = false; zoomStep(-1); }
    }

    updatePlayerMovement();

    // Cap max velocity
    const maxV = 3.5;
    player.vx = Math.max(-maxV, Math.min(maxV, player.vx || 0));
    player.vy = Math.max(-maxV, Math.min(maxV, player.vy || 0));

    // Move with wall collision
    const r = 5;
    player.x += player.vx || 0;
    player.y += player.vy || 0;
    // Wall collision — push back per axis
    if (!isWalkable(player.x - r, player.y) || !isWalkable(player.x + r, player.y)) {
        player.x -= player.vx || 0; player.vx = 0;
    }
    if (!isWalkable(player.x, player.y - r) || !isWalkable(player.x, player.y + r)) {
        player.y -= player.vy || 0; player.vy = 0;
    }
    // Furniture — soft push away (never traps, just nudges)
    if (!playerOnFurniture && jumpHeight >= -1) {
        const furn = hitsFurniture(player.x, player.y, r);
        if (furn) {
            const fcx = furn.x + furn.w / 2, fcy = furn.y + furn.d / 2;
            const dx = player.x - fcx, dy = player.y - fcy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            player.x += (dx / dist) * 1.5;
            player.y += (dy / dist) * 1.5;
        }
    }

    if (!chatFocused) updateJumpAndTricks();

    // Auto-jump when moving off elevated edge (studio-only)
    if (jumpHeight === 0 && jumpVel === 0 && !playerOnFurniture) {
        const prevH = getHeightAt(player.x - (player.vx || 0), player.y - (player.vy || 0));
        const currH = getHeightAt(player.x, player.y);
        if (prevH - currH > 2) {
            const speed = Math.sqrt((player.vx||0)**2 + (player.vy||0)**2);
            jumpVel = skateMode ? Math.min(-1.5, -speed * 0.8) : -1.5;
            jumpHeight = -(prevH - currH);
        }
    }
    // Fall off furniture edge
    if (playerOnFurniture && !getFurnitureAt(player.x, player.y)) {
        playerOnFurniture = false;
        jumpVel = 0;
    }


    // Safety clamp - never leave walkable area
    if (!isWalkable(player.x, player.y)) {
        safeSpawnStudio();
        player.vx = 0; player.vy = 0;
    }

    // Camera follow + clamp to world (faster when skating)
    const camSpeed = skateMode ? 0.15 : 0.08;
    camera.x += (player.x - camera.x) * camSpeed;
    camera.y += (player.y - camera.y) * camSpeed;
    // Clamp camera to world bounds (loose for iso)
    camera.x = Math.max(T, Math.min(WORLD_W * T - T, camera.x));
    camera.y = Math.max(T, Math.min(WORLD_H * T - T, camera.y));

    // Agent AI
    for (const a of agents) {
        a.animTimer++;
        if (a.animTimer > 15) { a.animTimer = 0; a.animFrame = (a.animFrame + 1) % 2; }

        // During meeting: walk to seat, then STAY. No wandering, no following.
        if (meetingState) {
            const dx = a.targetX - a.x, dy = a.targetY - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 2) {
                const spd = 0.8;
                const nmx = a.x + (dx / dist) * spd;
                const nmy = a.y + (dy / dist) * spd;
                if (isWalkable(nmx, nmy)) { a.x = nmx; a.y = nmy; }
                if (Math.abs(dx) > Math.abs(dy)) a.facing = dx > 0 ? 'right' : 'left';
                else a.facing = dy > 0 ? 'down' : 'up';
            }
            // Stay put once arrived — face the table center
            continue;
        }

        // FRIDAY follows the player
        if (a.followsPlayer) {
            const followDist = 55;
            const fdx = player.x - followDist - a.x;
            const fdy = player.y + 15 - a.y;
            const fd = Math.sqrt(fdx * fdx + fdy * fdy);
            if (fd > 30) {
                const speed = Math.min(1.2, fd > 80 ? 1.2 : fd > 40 ? 0.6 : 0.3);
                const nmx = a.x + (fdx / fd) * speed;
                const nmy = a.y + (fdy / fd) * speed;
                if (isWalkable(nmx, nmy)) { a.x = nmx; a.y = nmy; }
                if (Math.abs(fdx) > Math.abs(fdy)) a.facing = fdx > 0 ? 'right' : 'left';
                else a.facing = fdy > 0 ? 'down' : 'up';
            }
            continue;
        }

        a.wanderTimer--;

        if (a.wanderTimer <= 0 && a.atDesk && !a.talking) {
            a.targetX = a.homeX * T + T / 2 + (Math.random() - 0.5) * T * 2;
            a.targetY = a.homeY * T + T / 2 + (Math.random() - 0.5) * T * 1.5;
            a.atDesk = false;
            a.wanderTimer = 250 + Math.random() * 400;
        }

        const dx = a.targetX - a.x, dy = a.targetY - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) {
            const nmx = a.x + (dx / dist) * 0.5;
            const nmy = a.y + (dy / dist) * 0.5;
            if (isWalkable(nmx, nmy)) {
                a.x = nmx; a.y = nmy;
                if (Math.abs(dx) > Math.abs(dy)) a.facing = dx > 0 ? 'right' : 'left';
                else a.facing = dy > 0 ? 'down' : 'up';
            }
            else { a.targetX = a.homeX * T + T / 2; a.targetY = a.homeY * T + T / 2; }
        } else if (!a.atDesk) {
            a.targetX = a.homeX * T + T / 2;
            a.targetY = a.homeY * T + T / 2;
            a.atDesk = true;
        }
    }

    // Process bubble queue (sequential short bubbles)
    if (!bubble && bubbleQueue.length > 0) {
        const next = bubbleQueue[0];
        if (next.delay > 0) { next.delay--; }
        else {
            bubbleQueue.shift();
            const agent = agents.find(a => a.id === next.agentId);
            if (agent) {
                bubble = { x: agent.x, y: agent.y - 20, text: next.text, life: next.life, color: agent.color, name: agent.name, agentId: agent.id };
                agent.talking = true;
            }
        }
    }

    // Agents talk TO each other — skip during meetings
    bubbleTimer--;
    if (bubbleTimer <= 0 && !bubble && !meetingState && bubbleQueue.length === 0) {
        // Pick two nearby agents for a conversation
        const nonFollow = agents.filter(a => !a.followsPlayer);
        const a = nonFollow[Math.floor(Math.random() * nonFollow.length)];
        // Find nearest other agent
        let nearest = null, minD = Infinity;
        for (const b of agents) {
            if (b === a) continue;
            const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
            if (d < minD) { minD = d; nearest = b; }
        }
        const target = nearest ? nearest.name : 'team';
        const msg = a.chatter[a.chatIdx % a.chatter.length];
        a.chatIdx++;
        const fullMsg = minD < 120 ? `@${target}: ${msg}` : msg;
        bubble = { x: a.x, y: a.y - 20, text: fullMsg, life: 400, color: a.color, name: a.name, agentId: a.id };
        a.talking = true;
        bubbleTimer = 400 + Math.random() * 300;
    }
    if (bubble) {
        bubble.life--;
        const sp = agents.find(a => a.id === bubble.agentId);
        if (sp) { bubble.x = sp.x; bubble.y = sp.y - 20; }
        if (bubble.life <= 0) {
            if (sp) sp.talking = false;
            bubble = null;
        }
    }

    // Speed trail particles (skating fast)
    const spd2 = Math.sqrt((player.vx||0)**2 + (player.vy||0)**2);
    if (skateMode && spd2 > 1.5 && time % 3 === 0) {
        if (time % 15 === 0) SFX.skateRoll(); // subtle wheel rumble
        trailParticles.push({ x: player.x - (player.vx||0)*2, y: player.y - (player.vy||0)*2, life: 10,
            color: speedBoostTimer > 0 ? '#FFD700' : '#8866AA' });
    }
    // Update trail + dust particles
    for (let i = trailParticles.length - 1; i >= 0; i--) { trailParticles[i].life--; if (trailParticles[i].life <= 0) trailParticles.splice(i, 1); }
    for (let i = dustParticles.length - 1; i >= 0; i--) { const d = dustParticles[i]; d.x += d.vx; d.y += d.vy; d.life--; if (d.life <= 0) dustParticles.splice(i, 1); }

    // Meeting system
    updateMeeting();

    // HUD - current room
    const room = getRoomAt(player.x, player.y);
    const statusEl = document.getElementById('hud-status');
    const nearest = findNearestAgent();
    if (nearest && nearest.dist < 30) {
        statusEl.textContent = `[E/Click] ${nearest.agent.name} - ${nearest.agent.role}`;
    } else {
        statusEl.textContent = room ? room.name : 'CORRIDOR';
    }
    document.getElementById('hud-title').textContent = 'HEAVEN INC. STUDIOS';

    // Dungeon door check — near the portal in QA room
    const qaRoom = WORLD.rooms.find(r => r.id === 'qa');
    if (qaRoom && !chatFocused && keys['e']) {
        const doorX = (qaRoom.x + qaRoom.w - 3) * T, doorY = (qaRoom.y + qaRoom.h - 3) * T;
        const ddist = Math.sqrt((player.x - doorX) ** 2 + (player.y - doorY) ** 2);
        if (ddist < 40) {
            keys['e'] = false;
            dungeonTransition = 30; SFX.enterDungeon();
            return;
        }
    }

    if (!chatFocused && keys['e'] && nearest && nearest.dist < 30) {
        keys['e'] = false;
        openDialogue(nearest.agent, true);
    }
}

// === DRAW ===
function draw() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (gameMode === 'title') { drawTitle(); return; }
    if (gameMode === 'dungeon') { drawDungeon(); return; }

    // Door transition fade
    if (dungeonTransition > 0) {
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 1 - dungeonTransition / 30;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.globalAlpha = 1;
        return;
    }

    ctx.save();
    try {
    // Camera transform (isometric projection) + screen shake
    const z = camera.zoom;
    const isoCam = worldToIso(camera.x, camera.y);
    const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
    const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
    if (screenShake > 0) screenShake *= 0.85;
    if (screenShake < 0.3) screenShake = 0;
    ctx.translate(CANVAS_W / 2 + shakeX, CANVAS_H / 2 + shakeY);
    ctx.scale(z, z);
    ctx.translate(-isoCam.x, -isoCam.y);

    drawWorld();
    drawFurniture();

    // Sort all entities by iso depth (back-to-front)
    const entities = [...agents.map(a => ({ type: 'agent', data: a, depth: isoDepth(a.x, a.y) })),
                      { type: 'player', data: player, depth: isoDepth(player.x, player.y) }];
    entities.sort((a, b) => a.depth - b.depth);
    for (const e of entities) {
        if (e.type === 'agent') drawAgent(e.data);
        else drawPlayer();
    }

    if (bubble) drawBubble(bubble);

    // Player chat bubble (Club Penguin style)
    if (playerBubble) {
        const pIso = worldToIso(player.x, player.y);
        const pbx = pIso.x, pby = pIso.y - 35;
        const alpha = Math.min(1, playerBubble.life / 30);
        ctx.globalAlpha = alpha;
        ctx.font = '7px monospace';
        const tw = ctx.measureText(playerBubble.text).width;
        const pw = tw + 14, ph = 16;
        const ppx = pbx - pw / 2, ppy = pby - ph;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(ppx + 4, ppy); ctx.lineTo(ppx + pw - 4, ppy);
        ctx.quadraticCurveTo(ppx + pw, ppy, ppx + pw, ppy + 4);
        ctx.lineTo(ppx + pw, ppy + ph - 4);
        ctx.quadraticCurveTo(ppx + pw, ppy + ph, ppx + pw - 4, ppy + ph);
        ctx.lineTo(ppx + 4, ppy + ph);
        ctx.quadraticCurveTo(ppx, ppy + ph, ppx, ppy + ph - 4);
        ctx.lineTo(ppx, ppy + 4);
        ctx.quadraticCurveTo(ppx, ppy, ppx + 4, ppy);
        ctx.fill();
        ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.stroke();
        // Tail
        ctx.fillStyle = C.bubbleBg;
        ctx.beginPath();
        ctx.moveTo(pbx - 3, ppy + ph); ctx.lineTo(pbx, ppy + ph + 5); ctx.lineTo(pbx + 3, ppy + ph);
        ctx.fill();
        // Text
        ctx.fillStyle = C.bubbleText;
        ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
        ctx.fillText(playerBubble.text, pbx, ppy + 11);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }

    // Zone labels (department areas) — projected to iso
    for (const zone of ZONES) {
        const zp = worldToIso((zone.x + zone.w / 2) * T, (zone.y + zone.h - 0.5) * T);
        ctx.fillStyle = zone.color; ctx.globalAlpha = 0.5;
        ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
        ctx.fillText(zone.name, zp.x, zp.y);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    // Room labels
    for (const room of WORLD.rooms) {
        const rp = worldToIso((room.x + room.w / 2) * T, (room.y + room.h - 1) * T);
        ctx.fillStyle = C.gold;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(room.name, rp.x, rp.y);
        ctx.textAlign = 'left';
    }

    } finally {
    ctx.restore();
    ctx.globalAlpha = 1;
    }

    // Vignette — dark edges for dramatic noir lighting
    const vigGrad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.25, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(0, 0, 10, 0.5)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // minimap removed
    // minimap removed

    // Speed trail + dust particles (screen space, after restore)
    // Trail
    for (const t of trailParticles) {
        const tp = worldToIso(t.x, t.y);
        // Convert to screen space with camera
        const sx = (tp.x - isoCam.x) * z + CANVAS_W / 2;
        const sy = (tp.y - isoCam.y) * z + CANVAS_H / 2;
        ctx.globalAlpha = t.life / 10 * 0.4;
        ctx.fillStyle = t.color;
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
    // Dust
    for (const d of dustParticles) {
        const dp = worldToIso(d.x, d.y);
        const sx = (dp.x - isoCam.x) * z + CANVAS_W / 2;
        const sy = (dp.y - isoCam.y) * z + CANVAS_H / 2;
        ctx.globalAlpha = d.life / 15 * 0.5;
        ctx.fillStyle = '#CCBBAA';
        const size = 2 + (15 - d.life) * 0.2;
        ctx.beginPath(); ctx.ellipse(sx, sy, size * z, size * z * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Trick score display
    if (trickScore > 0) {
        ctx.fillStyle = '#FFD700'; ctx.globalAlpha = 0.6;
        ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
        ctx.fillText('SCORE: ' + trickScore, CANVAS_W - 12, 20);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
}

function drawIsoRegion(x, y, w, h, color) {
    // Draw a solid iso region (no tile grid) — one big diamond shape
    const tl = worldToIso(x * T, y * T);
    const tr = worldToIso((x + w) * T, y * T);
    const br = worldToIso((x + w) * T, (y + h) * T);
    const bl = worldToIso(x * T, (y + h) * T);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
    ctx.closePath(); ctx.fill();
}

function drawWorld() {
    // Draw each room floor at its height + cliff faces for elevated rooms
    for (const room of WORLD.rooms) {
        const rh = getHeightAt((room.x + 1) * T, (room.y + 1) * T);
        const x1 = room.x, y1 = room.y, x2 = room.x + room.w, y2 = room.y + room.h;

        if (rh > 0) {
            // Elevated room — draw cliff faces
            const fl = worldToIso(x1 * T, y2 * T);
            const fr = worldToIso(x2 * T, y2 * T);
            const tl = worldToIso(x1 * T, y1 * T);
            // Front cliff
            ctx.fillStyle = darkenColor(room.wallColor, 0.5);
            ctx.beginPath();
            ctx.moveTo(fl.x, fl.y - rh); ctx.lineTo(fr.x, fr.y - rh);
            ctx.lineTo(fr.x, fr.y); ctx.lineTo(fl.x, fl.y);
            ctx.closePath(); ctx.fill();
            // Left cliff
            ctx.fillStyle = darkenColor(room.wallColor, 0.35);
            ctx.beginPath();
            ctx.moveTo(tl.x, tl.y - rh); ctx.lineTo(fl.x, fl.y - rh);
            ctx.lineTo(fl.x, fl.y); ctx.lineTo(tl.x, tl.y);
            ctx.closePath(); ctx.fill();
        }

        // Room floor surface
        const tl = worldToIso(x1 * T, y1 * T);
        const tr = worldToIso(x2 * T, y1 * T);
        const br = worldToIso(x2 * T, y2 * T);
        const bl = worldToIso(x1 * T, y2 * T);
        // Floor edge glow — bright neon border defining the room
        ctx.strokeStyle = room.wallColor; ctx.lineWidth = 3; ctx.globalAlpha = 0.6;
        ctx.shadowColor = room.wallColor; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y - rh); ctx.lineTo(tr.x, tr.y - rh);
        ctx.lineTo(br.x, br.y - rh); ctx.lineTo(bl.x, bl.y - rh);
        ctx.closePath(); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.fillStyle = room.floor1;
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y - rh); ctx.lineTo(tr.x, tr.y - rh);
        ctx.lineTo(br.x, br.y - rh); ctx.lineTo(bl.x, bl.y - rh);
        ctx.closePath(); ctx.fill();
    }

    // Corridor floors
    for (const cor of WORLD.corridors) {
        drawIsoRegion(cor.x, cor.y, cor.w, cor.h, C.corridorFloor);
    }

    // Zone overlays on top of floors
    for (const zone of ZONES) {
        const h = getHeightAt((zone.x + 0.5) * T, (zone.y + 0.5) * T);
        const tl = worldToIso(zone.x * T, zone.y * T);
        const tr = worldToIso((zone.x + zone.w) * T, zone.y * T);
        const br2 = worldToIso((zone.x + zone.w) * T, (zone.y + zone.h) * T);
        const bl2 = worldToIso(zone.x * T, (zone.y + zone.h) * T);
        ctx.fillStyle = zone.floor1;
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y - h); ctx.lineTo(tr.x, tr.y - h);
        ctx.lineTo(br2.x, br2.y - h); ctx.lineTo(bl2.x, bl2.y - h);
        ctx.closePath(); ctx.fill();
        // Inner highlight
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = zone.floor2;
        const i = 0.5;
        const itl = worldToIso((zone.x+i)*T, (zone.y+i)*T);
        const itr = worldToIso((zone.x+zone.w-i)*T, (zone.y+i)*T);
        const ibr = worldToIso((zone.x+zone.w-i)*T, (zone.y+zone.h-i)*T);
        const ibl = worldToIso((zone.x+i)*T, (zone.y+zone.h-i)*T);
        ctx.beginPath();
        ctx.moveTo(itl.x, itl.y - h); ctx.lineTo(itr.x, itr.y - h);
        ctx.lineTo(ibr.x, ibr.y - h); ctx.lineTo(ibl.x, ibl.y - h);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        // Zone outline
        ctx.strokeStyle = zone.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y - h); ctx.lineTo(tr.x, tr.y - h);
        ctx.lineTo(br2.x, br2.y - h); ctx.lineTo(bl2.x, bl2.y - h);
        ctx.closePath(); ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Walls — cutaway iso: only on exterior edges facing void
    const WALL_H = 18;
    for (const room of WORLD.rooms) {
        const wc = room.wallColor;
        const x1 = room.x, y1 = room.y, x2 = room.x + room.w, y2 = room.y + room.h;

        // TOP WALL — only where tile above is void (exterior)
        {
            let segStart = null;
            for (let tx = x1; tx <= x2; tx++) {
                // Exterior = wall tile AND the tile above it is void
                const isExterior = tx < x2 && worldGrid[y1]?.[tx] === 2 &&
                    (y1 === 0 || worldGrid[y1 - 1]?.[tx] === 0);
                if (isExterior && segStart === null) segStart = tx;
                if ((!isExterior || tx === x2) && segStart !== null) {
                    const sl = worldToIso(segStart * T, y1 * T);
                    const sr = worldToIso(tx * T, y1 * T);
                    // Wall face
                    ctx.fillStyle = darkenColor(wc, 0.7);
                    ctx.beginPath();
                    ctx.moveTo(sl.x, sl.y - WALL_H); ctx.lineTo(sr.x, sr.y - WALL_H);
                    ctx.lineTo(sr.x, sr.y); ctx.lineTo(sl.x, sl.y);
                    ctx.closePath(); ctx.fill();
                    // Wall top
                    ctx.fillStyle = wc;
                    const slb = worldToIso(segStart * T, (y1 - 0.3) * T);
                    const srb = worldToIso(tx * T, (y1 - 0.3) * T);
                    ctx.beginPath();
                    ctx.moveTo(slb.x, slb.y - WALL_H); ctx.lineTo(srb.x, srb.y - WALL_H);
                    ctx.lineTo(sr.x, sr.y - WALL_H); ctx.lineTo(sl.x, sl.y - WALL_H);
                    ctx.closePath(); ctx.fill();
                    // Windows
                    const segLen = tx - segStart;
                    if (segLen >= 3) {
                        const glow = 0.5 + Math.sin(time * 0.02 + segStart) * 0.1;
                        for (let w = 0; w < Math.floor(segLen / 2); w++) {
                            const wwx = segStart + 1 + w * 2;
                            const wl = worldToIso(wwx * T, y1 * T);
                            const wr = worldToIso((wwx + 1) * T, y1 * T);
                            ctx.fillStyle = `rgba(180, 220, 255, ${glow})`;
                            ctx.beginPath();
                            ctx.moveTo(wl.x, wl.y - WALL_H + 4); ctx.lineTo(wr.x, wr.y - WALL_H + 4);
                            ctx.lineTo(wr.x, wr.y - 4); ctx.lineTo(wl.x, wl.y - 4);
                            ctx.closePath(); ctx.fill();
                        }
                    }
                    segStart = null;
                }
            }
        }

        // LEFT WALL — only where tile to the left is void (exterior)
        {
            let segStart = null;
            for (let ty = y1; ty <= y2; ty++) {
                const isExterior = ty < y2 && worldGrid[ty]?.[x1] === 2 &&
                    (x1 === 0 || worldGrid[ty]?.[x1 - 1] === 0);
                if (isExterior && segStart === null) segStart = ty;
                if ((!isExterior || ty === y2) && segStart !== null) {
                    const st = worldToIso(x1 * T, segStart * T);
                    const sb = worldToIso(x1 * T, ty * T);
                    ctx.fillStyle = darkenColor(wc, 0.5);
                    ctx.beginPath();
                    ctx.moveTo(st.x, st.y - WALL_H); ctx.lineTo(st.x, st.y);
                    ctx.lineTo(sb.x, sb.y); ctx.lineTo(sb.x, sb.y - WALL_H);
                    ctx.closePath(); ctx.fill();
                    ctx.fillStyle = wc;
                    const stl = worldToIso((x1 - 0.3) * T, segStart * T);
                    const sbl = worldToIso((x1 - 0.3) * T, ty * T);
                    ctx.beginPath();
                    ctx.moveTo(stl.x, stl.y - WALL_H); ctx.lineTo(st.x, st.y - WALL_H);
                    ctx.lineTo(sb.x, sb.y - WALL_H); ctx.lineTo(sbl.x, sbl.y - WALL_H);
                    ctx.closePath(); ctx.fill();
                    // Windows
                    const segLen = ty - segStart;
                    if (segLen >= 3) {
                        const glow = 0.5 + Math.sin(time * 0.02 + segStart) * 0.1;
                        for (let w = 0; w < Math.floor(segLen / 2); w++) {
                            const wwy = segStart + 1 + w * 2;
                            const wt = worldToIso(x1 * T, wwy * T);
                            const wb = worldToIso(x1 * T, (wwy + 1) * T);
                            ctx.fillStyle = `rgba(180, 220, 255, ${glow})`;
                            ctx.beginPath();
                            ctx.moveTo(wt.x, wt.y - WALL_H + 4); ctx.lineTo(wt.x, wt.y - 4);
                            ctx.lineTo(wb.x, wb.y - 4); ctx.lineTo(wb.x, wb.y - WALL_H + 4);
                            ctx.closePath(); ctx.fill();
                        }
                    }
                    segStart = null;
                }
            }
        }

        // Gold trim on exterior wall tops
        ctx.strokeStyle = C.wallTrim; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
        const ntl2 = worldToIso(x1 * T, y1 * T);
        const ntr2 = worldToIso(x2 * T, y1 * T);
        const wbl2 = worldToIso(x1 * T, y2 * T);
        ctx.beginPath();
        ctx.moveTo(wbl2.x, wbl2.y - WALL_H); ctx.lineTo(ntl2.x, ntl2.y - WALL_H);
        ctx.lineTo(ntr2.x, ntr2.y - WALL_H);
        ctx.stroke(); ctx.globalAlpha = 1;
    }

    // Ramps — sloped surfaces connecting floors
    for (const ramp of RAMPS) {
        const tl = worldToIso(ramp.x * T, ramp.y * T);
        const tr = worldToIso((ramp.x + ramp.w) * T, ramp.y * T);
        const br = worldToIso((ramp.x + ramp.w) * T, (ramp.y + ramp.h) * T);
        const bl = worldToIso(ramp.x * T, (ramp.y + ramp.h) * T);
        // Slope surface (top tilted)
        ctx.fillStyle = '#A890C8';
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y - ramp.fromH);
        ctx.lineTo(tr.x, tr.y - ramp.fromH);
        ctx.lineTo(br.x, br.y - ramp.toH);
        ctx.lineTo(bl.x, bl.y - ramp.toH);
        ctx.closePath(); ctx.fill();
        // Side face
        ctx.fillStyle = '#7A6898';
        ctx.beginPath();
        ctx.moveTo(bl.x, bl.y - ramp.toH);
        ctx.lineTo(br.x, br.y - ramp.toH);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath(); ctx.fill();
        // Step lines on ramp
        ctx.strokeStyle = '#8A78A8'; ctx.lineWidth = 1;
        for (let s = 0; s < 3; s++) {
            const t = (s + 1) / 4;
            const h = ramp.fromH * (1 - t) + ramp.toH * t;
            const ly = ramp.y + ramp.h * t;
            const l1 = worldToIso(ramp.x * T, ly * T);
            const l2 = worldToIso((ramp.x + ramp.w) * T, ly * T);
            ctx.beginPath();
            ctx.moveTo(l1.x, l1.y - h); ctx.lineTo(l2.x, l2.y - h);
            ctx.stroke();
        }
    }
}

function drawFurniture() {
    // Auto-furnish each room based on its type
    for (const room of WORLD.rooms) {
        const rx = (room.x + 2) * T, ry = (room.y + 2) * T;
        const cx = (room.x + room.w / 2) * T, cy = (room.y + room.h / 2) * T;
        const rw = room.w, rh = room.h;

        // Every room gets plants + multiple lamps for moody lighting
        drawIsoPlant(rx, ry);
        drawIsoPlant((room.x + rw - 2) * T, (room.y + rh - 2) * T);
        drawIsoLamp((room.x + rw - 2) * T, ry);
        drawIsoLamp(rx, (room.y + rh - 2) * T);
        if (rw > 8) drawIsoLamp(cx, ry); // extra center lamp for large rooms

        if (room.id === 'vault') {
            drawIsoRug(rx, ry + T, T * 6, T * 4, '#9966CC');
            drawIsoDesk(cx, cy, C.purple);
            drawIsoShelf(rx, ry + T);
            drawIsoShelf(rx, cy + T);
            drawIsoShelf(rx + T * 5, ry + T);
            drawIsoScreen(cx, ry, 'LORE: 18', C.purple);
            drawIsoCoffee(cx + 12, cy - 8);
        } else if (room.id === 'design') {
            drawIsoDesk(cx, cy, C.red);
            drawIsoBoard(rx, ry + T, C.red);
            drawIsoCorkboard(cx + T * 2, ry + T);
            drawIsoCoffee(cx + 12, cy - 8);
        } else if (room.id === 'art') {
            drawIsoDesk(cx, cy, C.magenta);
            drawIsoBoard(rx, ry + T, C.magenta);
            drawIsoCanvas(cx + T * 2, ry + T, C.gold);
            drawIsoPalette(rx, cy + T);
        } else if (room.id === 'hub') {
            drawIsoRug(cx - T * 3, cy - T * 2, T * 6, T * 4, '#DD88BB');
            drawIsoBox(cx - T * 3, cy - T, T * 6, T * 2, 8, '#7A4E2A', '#5C3A1A', '#4A2E12');
            drawIsoChair(cx - T * 2, cy - T * 2);
            drawIsoChair(cx, cy - T * 2);
            drawIsoChair(cx + T * 2, cy - T * 2);
            drawIsoChair(cx - T * 2, cy + T + 8);
            drawIsoChair(cx, cy + T + 8);
            drawIsoChair(cx + T * 2, cy + T + 8);
            drawIsoBoard(cx - T * 2, ry, '#DD66AA');
            drawIsoTree(rx, cy);
            drawIsoTree((room.x + rw - 2) * T, cy);
        } else if (room.id === 'engine') {
            drawIsoDesk(cx, cy, C.green);
            drawIsoDesk(rx + T, ry + T, C.green);
            drawIsoRack(cx + T * 2, ry + T);
            drawIsoRack(cx + T * 2, cy + T);
            drawIsoCoffee(cx + 12, cy - 8);
        } else if (room.id === 'oracle') {
            drawIsoDesk(cx, cy, C.gold);
            drawIsoCrystalBall(cx, ry + T);
            drawIsoShelf(rx, cy + T);
        } else if (room.id === 'qa') {
            drawIsoDesk(cx, cy, C.orange);
            drawIsoDesk(rx + T, ry + T, C.orange);
            drawIsoScreen(cx + T * 2, ry + T, 'BUGS: 0', C.orange);
            drawIsoCoffee(cx + 12, cy - 8);
            // DUNGEON DOOR — glowing portal
            const doorX = (room.x + rw - 3) * T, doorY = (room.y + rh - 3) * T;
            const dp = worldToIso(doorX, doorY);
            const dglow = 0.5 + Math.sin(time * 0.04) * 0.3;
            // Portal glow
            const pGrad = ctx.createRadialGradient(dp.x, dp.y - 10, 2, dp.x, dp.y - 10, 20);
            pGrad.addColorStop(0, `rgba(255, 100, 50, ${dglow})`);
            pGrad.addColorStop(1, 'rgba(255, 50, 20, 0)');
            ctx.fillStyle = pGrad;
            ctx.fillRect(dp.x - 20, dp.y - 30, 40, 40);
            // Door frame
            drawIsoBox(doorX, doorY, T, T * 0.5, 20, '#441111', '#331111', '#220808');
            // Portal inner glow
            ctx.fillStyle = `rgba(255, 80, 30, ${dglow})`;
            ctx.beginPath(); ctx.ellipse(dp.x, dp.y - 10, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255, 200, 100, ${dglow * 0.5})`;
            ctx.beginPath(); ctx.ellipse(dp.x, dp.y - 10, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
            // Label
            const pdist = Math.sqrt((player.x - doorX) ** 2 + (player.y - doorY) ** 2);
            if (pdist < 40) {
                ctx.fillStyle = '#FF8844'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
                ctx.fillText('ENTER GAME [E]', dp.x, dp.y - 28);
                ctx.textAlign = 'left';
            }
        } else if (room.id === 'writer') {
            drawIsoDesk(cx, cy, C.cyan);
            drawIsoShelf(rx, ry + T);
            drawIsoShelf(rx + T * 4, ry + T);
            drawIsoBoard(rx + T * 2, cy + T, C.cyan);
            drawIsoCoffee(cx + 12, cy - 8);
        } else if (room.id === 'ceo') {
            drawIsoRug(cx - T * 2, cy - T, T * 4, T * 2, '#DAA520');
            drawIsoBox(cx - T, cy - T / 2, T * 3, T, 10, '#AA8520', '#8B6914', '#6B4A0A');
            drawIsoChair(cx + T, cy + T);
            drawIsoTrophy((room.x + rw - 2) * T, ry);
            drawIsoTree(rx, ry);
            const ceoP = worldToIso(cx, cy);
            ctx.fillStyle = C.gold;
            ctx.globalAlpha = 0.6 + Math.sin(time * 0.03) * 0.2;
            ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText('CEO', ceoP.x, ceoP.y - 18);
            ctx.textAlign = 'left'; ctx.globalAlpha = 1;
        }

    }
}

// === ISO FURNITURE PRIMITIVES ===

function drawIsoDesk(wx, wy, color) {
    // Desk surface
    drawIsoBox(wx - 6, wy, T, T * 0.7, 8, '#4A80C0', '#3A60A0', '#2A4080');
    // Monitor on desk
    drawIsoBox(wx + 2, wy + 2, 8, 4, 14, color, darkenColor(color, 0.6), darkenColor(color, 0.4));
}

function drawIsoShelf(wx, wy) {
    drawIsoBox(wx, wy, 16, 8, 18, '#7A4E2A', '#5C3A1A', '#4A2E12');
    // Books on top
    const colors = [C.red, C.blue, C.green, C.purple];
    for (let i = 0; i < 3; i++) {
        drawIsoBox(wx + 2 + i * 4, wy + 1, 3, 5, 22, colors[i], darkenColor(colors[i], 0.6), darkenColor(colors[i], 0.4));
    }
}

function drawIsoPlant(wx, wy) {
    // Pot
    drawIsoBox(wx - 3, wy - 3, 6, 6, 5, '#A0724D', '#8B5E3C', '#6B4A2C');
    // Leaves (billboard)
    const p = worldToIso(wx, wy);
    ctx.fillStyle = '#228B22';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 10, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2E8B2E';
    ctx.beginPath(); ctx.ellipse(p.x - 3, p.y - 12, 3, 2, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(p.x + 3, p.y - 12, 3, 2, 0.3, 0, Math.PI * 2); ctx.fill();
}

function drawIsoBoard(wx, wy, color) {
    // Whiteboard - thin tall box
    drawIsoBox(wx, wy, 20, 2, 16, '#F0F0E8', darkenColor(color, 0.8), darkenColor(color, 0.6));
}

function drawIsoRack(wx, wy) {
    drawIsoBox(wx, wy, 10, 8, 20, '#3A3A4A', '#2A2A3A', '#1A1A2A');
    const p = worldToIso(wx, wy);
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = (time + i * 17) % 60 < 40 ? C.green : C.red;
        ctx.fillRect(p.x + 2 + i * 3, p.y - 16 + Math.floor(i / 2) * 4, 2, 2);
    }
}

function drawIsoScreen(wx, wy, text, color) {
    drawIsoBox(wx, wy, 16, 3, 12, C.screenBg, darkenColor(color, 0.3), darkenColor(color, 0.2));
    const p = worldToIso(wx, wy);
    ctx.fillStyle = color; ctx.font = 'bold 4px monospace';
    ctx.fillText(text, p.x - 6, p.y - 8);
}

function drawIsoCorkboard(wx, wy) {
    drawIsoBox(wx, wy, 14, 2, 14, '#C8A060', '#B08040', '#987030');
    const p = worldToIso(wx, wy);
    // Pins
    ctx.fillStyle = C.red; ctx.fillRect(p.x - 2, p.y - 10, 2, 2);
    ctx.fillStyle = C.blue; ctx.fillRect(p.x + 2, p.y - 8, 2, 2);
    ctx.fillStyle = C.green; ctx.fillRect(p.x - 1, p.y - 5, 2, 2);
    // Sticky note
    ctx.fillStyle = '#FFFFAA'; ctx.fillRect(p.x + 1, p.y - 12, 4, 3);
}

function drawIsoCanvas(wx, wy, color) {
    drawIsoBox(wx, wy, 12, 2, 14, '#FFF8F0', '#E0D8D0', '#C8C0B8');
    const p = worldToIso(wx, wy);
    ctx.fillStyle = color; ctx.globalAlpha = 0.6;
    ctx.fillRect(p.x - 2, p.y - 10, 6, 6);
    ctx.globalAlpha = 1;
}

function drawIsoPalette(wx, wy) {
    drawIsoBox(wx, wy, 12, 8, 2, '#FFFFFF', '#E0E0E0', '#C0C0C0');
    const p = worldToIso(wx, wy);
    const colors = [C.magenta, C.gold, C.blue, C.green, C.red, C.cyan];
    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(p.x - 4 + (i % 3) * 3, p.y - 3 + Math.floor(i / 3) * 3, 2, 2);
    }
}

function drawIsoCoffee(wx, wy) {
    const p = worldToIso(wx, wy);
    // Mug
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(p.x - 2, p.y - 5, 4, 4);
    ctx.fillStyle = '#6B3410';
    ctx.fillRect(p.x - 1, p.y - 4, 2, 2);
}

function drawIsoChair(wx, wy) {
    drawIsoBox(wx, wy, 6, 6, 4, '#5A5A7A', '#4A4A6A', '#3A3A5A');
}

function drawIsoRug(wx, wy, w, d, color) {
    const p0 = worldToIso(wx, wy);
    const p1 = worldToIso(wx + w, wy);
    const p2 = worldToIso(wx + w, wy + d);
    const p3 = worldToIso(wx, wy + d);
    ctx.fillStyle = color; ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.closePath(); ctx.fill();
    // Border
    ctx.strokeStyle = darkenColor(color, 0.6); ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function drawIsoDivider(wx, wy, len, color) {
    drawIsoBox(wx, wy, len, 2, 14, color, darkenColor(color, 0.6), darkenColor(color, 0.4));
}

function drawIsoTree(wx, wy) {
    // Trunk
    drawIsoBox(wx, wy, 4, 4, 10, '#8B5E3C', '#6B4A2C', '#4A3018');
    // Canopy
    const p = worldToIso(wx + 2, wy + 2);
    ctx.fillStyle = '#22AA22';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 18, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#33CC33';
    ctx.beginPath(); ctx.ellipse(p.x - 2, p.y - 22, 7, 5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(p.x + 3, p.y - 20, 6, 5, 0.3, 0, Math.PI * 2); ctx.fill();
}

function drawIsoLamp(wx, wy) {
    const p = worldToIso(wx, wy);
    const glow = 0.4 + Math.sin(time * 0.025 + wx * 0.01) * 0.1;

    // Warm amber light pool (concept art golden lamp glow)
    const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 45);
    grad.addColorStop(0, `rgba(218, 165, 32, ${glow * 0.4})`);
    grad.addColorStop(0.4, `rgba(200, 140, 20, ${glow * 0.2})`);
    grad.addColorStop(1, 'rgba(180, 120, 10, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(p.x - 40, p.y - 20, 80, 50);

    // Pole
    ctx.fillStyle = '#555';
    ctx.fillRect(p.x - 1, p.y - 22, 2, 20);
    // Shade
    ctx.fillStyle = `rgba(255, 230, 150, ${glow + 0.3})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 24, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    // Bright core
    ctx.fillStyle = '#FFEE88';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 24, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
}

function drawIsoTrophy(wx, wy) {
    // Base
    drawIsoBox(wx, wy, 6, 4, 3, '#888', '#666', '#444');
    const p = worldToIso(wx + 3, wy + 2);
    // Cup
    ctx.fillStyle = C.gold;
    ctx.fillRect(p.x - 2, p.y - 10, 4, 6);
    ctx.fillRect(p.x - 3, p.y - 11, 6, 2);
    // Star on top
    ctx.fillStyle = '#FFE833';
    ctx.font = '6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('\u2605', p.x, p.y - 12);
    ctx.textAlign = 'left';
}

function drawIsoCrystalBall(wx, wy) {
    // Pedestal
    drawIsoBox(wx, wy, 8, 8, 6, '#4A3A5A', '#3A2A4A', '#2A1A3A');
    // Glowing orb
    const p = worldToIso(wx + 4, wy + 4);
    const glow = 0.4 + Math.sin(time * 0.04) * 0.2;
    ctx.fillStyle = `rgba(180, 100, 255, ${glow})`;
    ctx.beginPath(); ctx.arc(p.x, p.y - 12, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255, 200, 255, ${glow * 0.6})`;
    ctx.beginPath(); ctx.arc(p.x - 1, p.y - 13, 2, 0, Math.PI * 2); ctx.fill();
}

function drawIsoRune(wx, wy, color) {
    const p = worldToIso(wx, wy);
    const glow = 0.3 + Math.sin(time * 0.03 + wx * 0.1) * 0.15;
    ctx.fillStyle = color; ctx.globalAlpha = glow;
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('\u2726', p.x, p.y);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

// === CHARACTERS ===
function drawMinimap() {
    const mmW = 100, mmH = 70;
    const mmX = CANVAS_W - mmW - 8, mmY = 8;
    const scaleX = mmW / (WORLD_W * T), scaleY = mmH / (WORLD_H * T);

    // Background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.8)';
    ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1;
    ctx.strokeRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);

    // Rooms
    for (const room of WORLD.rooms) {
        ctx.fillStyle = room.wallColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(
            mmX + room.x * T * scaleX,
            mmY + room.y * T * scaleY,
            room.w * T * scaleX,
            room.h * T * scaleY
        );
    }
    ctx.globalAlpha = 1;

    // Corridors
    ctx.fillStyle = '#8070A0';
    ctx.globalAlpha = 0.4;
    for (const cor of WORLD.corridors) {
        ctx.fillRect(mmX + cor.x * T * scaleX, mmY + cor.y * T * scaleY, cor.w * T * scaleX, cor.h * T * scaleY);
    }
    ctx.globalAlpha = 1;

    // Agents as colored dots
    for (const a of agents) {
        ctx.fillStyle = a.color;
        ctx.fillRect(mmX + a.x * scaleX - 1, mmY + a.y * scaleY - 1, 3, 3);
    }

    // Player as gold dot (bigger)
    ctx.fillStyle = C.gold;
    ctx.fillRect(mmX + player.x * scaleX - 2, mmY + player.y * scaleY - 2, 4, 4);

    // Camera viewport rect
    const vpW = (CANVAS_W / camera.zoom) * scaleX;
    const vpH = (CANVAS_H / camera.zoom) * scaleY;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    ctx.strokeRect(
        mmX + (camera.x - CANVAS_W / 2 / camera.zoom) * scaleX,
        mmY + (camera.y - CANVAS_H / 2 / camera.zoom) * scaleY,
        vpW, vpH
    );
    ctx.globalAlpha = 1;

    // Label
    ctx.fillStyle = C.gold; ctx.font = '6px monospace';
    ctx.fillText('MAP', mmX, mmY - 4);
}

function drawCharBody(bx, by, bodyColor, shirtColor, facing, talking, talkTime) {
    const f = facing;
    const side = (f === 'left' || f === 'right');
    const diag = f.includes('-'); // diagonal facing
    const flip = (f === 'left' || f === 'down-left' || f === 'up-left') ? -1 : 1;

    // Shoes (cute rounded)
    ctx.fillStyle = '#222244';
    if (diag) {
        ctx.fillRect(bx - 1 + flip, by + 4, 3, 4);
        ctx.fillRect(bx + flip * 3, by + 4, 3, 4);
    } else if (side) {
        ctx.fillRect(bx - 1, by + 4, 3, 4);
        ctx.fillRect(bx + flip * 2, by + 4, 3, 4);
    } else {
        ctx.fillRect(bx - 3, by + 4, 3, 4);
        ctx.fillRect(bx + 1, by + 4, 3, 4);
    }
    // Body — slightly narrower for diagonals (3/4 view)
    const bw = diag ? 6 : (side ? 5 : 7);
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(bx + (diag ? flip : 0), by + 1, bw, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shirtColor;
    ctx.beginPath(); ctx.ellipse(bx + (diag ? flip : 0), by + 1, bw - 1, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Collar detail
    ctx.fillStyle = darkenColor(shirtColor, 0.7);
    ctx.fillRect(bx - 2, by - 3, 4, 2);
    // Arms
    if (diag) {
        // 3/4 view: one arm more visible
        ctx.fillStyle = shirtColor;
        ctx.beginPath(); ctx.ellipse(bx + flip * 6, by + 1, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx - flip * 4, by + 2, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (side) {
        ctx.fillStyle = shirtColor;
        ctx.beginPath(); ctx.ellipse(bx + flip * 6, by + 1, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillStyle = shirtColor;
        ctx.beginPath(); ctx.ellipse(bx - 7, by + 1, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + 7, by + 1, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
}

function drawCharHead(bx, by, hairColor, facing, talking, talkTime) {
    const f = facing;
    const side = (f === 'left' || f === 'right');
    const diag = f.includes('-');
    const flip = (f === 'left' || f === 'down-left' || f === 'up-left') ? -1 : 1;
    const back = (f === 'up');
    const backDiag = (f === 'up-left' || f === 'up-right');
    const frontDiag = (f === 'down-left' || f === 'down-right');

    // Head shape — offset for diagonals
    const hx = bx + (diag ? flip * 1 : 0);
    ctx.fillStyle = C.skinTone;
    ctx.beginPath(); ctx.ellipse(hx, by - 10, (side || diag) ? 8 : 9, 9, 0, 0, Math.PI * 2); ctx.fill();

    // Hair
    ctx.fillStyle = hairColor;
    ctx.beginPath(); ctx.ellipse(hx, by - 17, (side || diag) ? 9 : 10, 5, 0, Math.PI, Math.PI * 2); ctx.fill();
    if (side || diag) {
        ctx.beginPath(); ctx.ellipse(hx - flip * 4, by - 12, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    }

    if (back) {
        // Full back — hair covers face
        ctx.fillStyle = hairColor;
        ctx.beginPath(); ctx.ellipse(hx, by - 10, 9, 9, 0, 0, Math.PI * 2); ctx.fill();
    } else if (backDiag) {
        // 3/4 back — partial face, one eye barely visible
        ctx.fillStyle = hairColor;
        ctx.beginPath(); ctx.ellipse(hx - flip * 2, by - 10, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
        // Peek of one eye
        ctx.fillStyle = C.white;
        ctx.beginPath(); ctx.ellipse(hx + flip * 4, by - 10, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.black;
        ctx.beginPath(); ctx.ellipse(hx + flip * 4.5, by - 9.5, 1, 1, 0, 0, Math.PI * 2); ctx.fill();
    } else if (side) {
        // Pure side — one big eye
        ctx.fillStyle = C.white;
        ctx.beginPath(); ctx.ellipse(hx + flip * 3, by - 11, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.black;
        ctx.beginPath(); ctx.ellipse(hx + flip * 4, by - 10, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.white;
        ctx.fillRect(hx + flip * 4, by - 12, 1, 1);
        ctx.fillStyle = talking ? '#FF4466' : '#DD8899';
        if (talking) { ctx.beginPath(); ctx.ellipse(hx + flip * 3, by - 5, 2 + Math.sin(talkTime * 0.3), 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(hx + flip * 2, by - 5, 3, 1);
    } else if (frontDiag) {
        // 3/4 front — two eyes, one bigger (closer)
        ctx.fillStyle = C.white;
        ctx.beginPath(); ctx.ellipse(hx + flip * 4, by - 11, 4, 4, 0, 0, Math.PI * 2); ctx.fill(); // close eye
        ctx.beginPath(); ctx.ellipse(hx - flip * 1, by - 11, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill(); // far eye
        ctx.fillStyle = C.black;
        ctx.beginPath(); ctx.ellipse(hx + flip * 5, by - 10, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx - flip * 0.5, by - 10, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.white;
        ctx.fillRect(hx + flip * 5, by - 12, 1, 1);
        ctx.fillRect(hx - flip * 1, by - 12, 1, 1);
        ctx.fillStyle = talking ? '#FF4466' : '#DD8899';
        if (talking) { ctx.beginPath(); ctx.ellipse(hx + flip * 2, by - 4, 2 + Math.sin(talkTime * 0.3), 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(hx + flip * 1, by - 5, 3, 1);
    } else {
        // Pure front — two big eyes
        ctx.fillStyle = C.white;
        ctx.beginPath(); ctx.ellipse(hx - 3, by - 11, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + 3, by - 11, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.black;
        ctx.beginPath(); ctx.ellipse(hx - 2, by - 10, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + 4, by - 10, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.white;
        ctx.fillRect(hx - 2, by - 12, 1, 1);
        ctx.fillRect(hx + 4, by - 12, 1, 1);
        // Nose
        ctx.fillStyle = '#E0A878';
        ctx.fillRect(hx, by - 7, 1, 2);
        // Blush marks (cute FOP style)
        ctx.fillStyle = '#FF8888'; ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.ellipse(hx - 5, by - 6, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + 5, by - 6, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Mouth
        ctx.fillStyle = talking ? '#FF4466' : '#DD8899';
        if (talking) { const mw = 3 + Math.sin(talkTime * 0.3) * 2; ctx.beginPath(); ctx.ellipse(hx, by - 4, mw, 2, 0, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(hx - 2, by - 5, 4, 1);
    }
}

function drawAgent(a) {
    const bob = Math.sin(time * 0.06 + a.x * 0.1) * (a.atDesk ? 0.3 : 1.2);
    // Project to isometric + elevation + fairy float
    const aIso = worldToIso(a.x, a.y);
    const hOff = getHeightAt(a.x, a.y);
    const fairyFloat = Math.sin(time * 0.05 + a.x * 0.2) * 1.5;
    const bx = Math.round(aIso.x), by = Math.round(aIso.y + bob - hOff - 2 + fairyFloat);

    // Shadow on ground (stays below floating fairy)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    const shadowY = Math.round(aIso.y - hOff) + 10;
    ctx.beginPath(); ctx.ellipse(bx, shadowY, 7, 3, 0, 0, Math.PI * 2); ctx.fill();

    drawCharBody(bx, by, a.bodyColor, a.color, a.facing, a.talking, time);
    drawCharHead(bx, by, a.color, a.facing, a.talking, time);

    // Halo
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7 + Math.sin(time * 0.04 + a.y * 0.1) * 0.2;
    ctx.beginPath(); ctx.ellipse(bx, by - 21, 6, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // Wings — big, double-layered, shimmering
    const wf = Math.sin(time * 0.08 + a.x * 0.1) * 0.4; // flutter
    if (a.facing !== 'left' && a.facing !== 'right') {
        // Outer wings (larger, more transparent)
        ctx.fillStyle = a.color; ctx.globalAlpha = 0.15;
        ctx.beginPath(); ctx.ellipse(bx - 11, by - 2, 8 + wf, 6, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + 11, by - 2, 8 + wf, 6, 0.3, 0, Math.PI * 2); ctx.fill();
        // Inner wings (brighter)
        ctx.fillStyle = '#EEDDFF'; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.ellipse(bx - 8, by, 5, 4, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + 8, by, 5, 4, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    } else {
        const flip = a.facing === 'left' ? 1 : -1;
        ctx.fillStyle = a.color; ctx.globalAlpha = 0.15;
        ctx.beginPath(); ctx.ellipse(bx - flip * 10, by - 1, 9 + wf, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#EEDDFF'; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.ellipse(bx - flip * 7, by, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
    // Name
    ctx.fillStyle = a.color; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText(a.name, bx, by - 24);
    ctx.textAlign = 'left';
}

function drawPlayer() {
    const moving = keys['w'] || keys['s'] || keys['a'] || keys['d'];
    const skating = skateMode;
    const skateSpeed = Math.sqrt((player.vx||0)**2 + (player.vy||0)**2);
    const bob = skating ? 0 : (moving ? Math.sin(time * 0.15) * 1.5 : 0);
    // Project to isometric screen position + elevation (player grounded, no float)
    const pIso = worldToIso(player.x, player.y);
    const hOff = getHeightAt(player.x, player.y);
    const bx = Math.round(pIso.x), by = Math.round(pIso.y + bob + jumpHeight - hOff);

    // Speed lines when skating (iso-projected direction)
    if (skating && skateSpeed > 0.3) {
        const ivx = (player.vx||0) - (player.vy||0); // iso velocity x
        const ivy = ((player.vx||0) + (player.vy||0)) * 0.5; // iso velocity y
        ctx.strokeStyle = C.gold; ctx.lineWidth = 1;
        ctx.globalAlpha = Math.min(0.6, skateSpeed * 0.1);
        for (let i = 0; i < 3; i++) {
            const lx = bx - ivx * 2 + (Math.random()-0.5)*4;
            const ly = by - ivy * 2 + i * 3 - 3;
            ctx.beginPath(); ctx.moveTo(lx, ly);
            ctx.lineTo(lx - ivx * 4, ly - ivy * 4);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

    }

    // Map 8-dir facing to 4-dir sprite (diagonals use nearest cardinal)
    const f = player.facing;
    const spriteMap = { 'down-right': 'right', 'down-left': 'left', 'up-right': 'right', 'up-left': 'left' };
    const sf = spriteMap[f] || f;
    const side = (sf === 'left' || sf === 'right');
    const flip = (sf === 'left') ? -1 : 1;
    const back = sf === 'up';

    // Shadow — on ground directly below feet
    const groundY = Math.round(pIso.y - hOff) + 12;
    const shadowScale = Math.max(0.01, 1 - Math.abs(jumpHeight) * 0.04);
    ctx.fillStyle = `rgba(0,0,0,${0.15 * shadowScale})`;
    ctx.beginPath(); ctx.ellipse(bx, groundY, 8 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2); ctx.fill();

    // Legs
    ctx.fillStyle = '#2A2A55';
    if (side) {
        ctx.fillRect(bx - 1, by + 6, 2, 6);
        ctx.fillRect(bx + flip * 1, by + 6, 2, 6);
    } else {
        ctx.fillRect(bx - 4, by + 6, 3, 6);
        ctx.fillRect(bx + 1, by + 6, 3, 6);
    }

    // Body (warm golden suit — Michael from concept art)
    if (side) {
        ctx.fillStyle = '#7A5A10'; ctx.fillRect(bx - 4, by - 3, 8, 10);
        ctx.fillStyle = C.gold; ctx.fillRect(bx - 3, by - 2, 6, 8);
        ctx.fillStyle = C.gold; ctx.fillRect(bx + flip * 5, by, 3, 3);
        ctx.fillStyle = C.skinTone;
        ctx.beginPath(); ctx.arc(bx + flip * 8, by + 1, 2, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillStyle = '#7A5A10'; ctx.fillRect(bx - 6, by - 3, 12, 10);
        ctx.fillStyle = C.gold; ctx.fillRect(bx - 5, by - 2, 10, 8);
        if (!back) {
            ctx.fillStyle = C.white; ctx.fillRect(bx - 2, by - 2, 4, 6);
            ctx.fillStyle = C.magenta; ctx.fillRect(bx, by - 1, 1, 5);
        }
        ctx.fillStyle = C.gold;
        ctx.fillRect(bx - 10, by, 4, 3); ctx.fillRect(bx + 6, by, 4, 3);
        ctx.fillStyle = C.skinTone;
        ctx.beginPath(); ctx.arc(bx - 11, by + 1, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 11, by + 1, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Head
    ctx.fillStyle = C.skinTone;
    if (side) {
        ctx.fillRect(bx - 6, by - 16, 12, 14);
        ctx.fillRect(bx - 7 + (flip > 0 ? 0 : 2), by - 12, 14, 8);
    } else {
        ctx.fillRect(bx - 8, by - 16, 16, 14);
        ctx.fillRect(bx - 9, by - 12, 18, 8);
    }

    // Hair (curly golden)
    ctx.fillStyle = '#DAA520';
    if (side) {
        ctx.fillRect(bx - 7, by - 20, 14, 5);
        ctx.fillRect(bx - 5, by - 23, 10, 4);
        ctx.fillRect(bx - flip * 6, by - 16, 3, 8);
        ctx.fillStyle = '#C89B18';
        ctx.fillRect(bx - 6, by - 21, 4, 2);
        ctx.fillRect(bx + 2, by - 22, 4, 2);
    } else {
        ctx.fillRect(bx - 9, by - 20, 18, 5);
        ctx.fillRect(bx - 7, by - 23, 14, 4);
        ctx.fillStyle = '#C89B18';
        ctx.fillRect(bx - 9, by - 21, 4, 2);
        ctx.fillRect(bx + 1, by - 23, 4, 2);
        ctx.fillRect(bx + 6, by - 21, 4, 2);
    }

    if (back) {
        ctx.fillStyle = '#DAA520';
        ctx.fillRect(bx - 8, by - 16, 16, 10);
    } else if (side) {
        ctx.strokeStyle = '#8B7500'; ctx.lineWidth = 1;
        ctx.strokeRect(bx + flip * 1, by - 14, 5, 4);
        ctx.fillStyle = C.white;
        ctx.fillRect(bx + flip * 2, by - 13, 3, 3);
        ctx.fillStyle = C.black;
        ctx.fillRect(bx + flip * 3, by - 12, 2, 2);
        ctx.fillStyle = '#4488FF';
        ctx.fillRect(bx + flip * 3, by - 11, 1, 1);
        ctx.fillStyle = '#E8B090';
        ctx.fillRect(bx + flip * 7, by - 10, 2, 2);
        ctx.fillStyle = '#CC8888';
        ctx.fillRect(bx + flip * 4, by - 7, 3, 1);
    } else {
        // Front view
        ctx.strokeStyle = '#8B7500'; ctx.lineWidth = 1;
        ctx.strokeRect(bx - 7, by - 14, 6, 5);
        ctx.strokeRect(bx + 1, by - 14, 6, 5);
        ctx.fillStyle = '#8B7500'; ctx.fillRect(bx - 1, by - 12, 2, 1);
        ctx.fillStyle = C.white;
        ctx.fillRect(bx - 6, by - 13, 4, 4); ctx.fillRect(bx + 2, by - 13, 4, 4);
        ctx.fillStyle = C.black;
        ctx.fillRect(bx - 4, by - 12, 2, 2); ctx.fillRect(bx + 3, by - 12, 2, 2);
        ctx.fillStyle = '#4488FF';
        ctx.fillRect(bx - 4, by - 11, 1, 1); ctx.fillRect(bx + 3, by - 11, 1, 1);
        // Nose
        ctx.fillStyle = '#E0A878'; ctx.fillRect(bx, by - 9, 1, 2);
        // Blush
        ctx.fillStyle = '#FF8888'; ctx.globalAlpha = 0.2;
        ctx.beginPath(); ctx.ellipse(bx - 6, by - 8, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + 6, by - 8, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Mouth
        ctx.fillStyle = '#CC8888'; ctx.fillRect(bx - 2, by - 7, 4, 1);
    }

    // Halo
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(bx, by - 25, 8, 3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;

    // Wings - change based on facing
    ctx.fillStyle = '#DDDDFF'; ctx.globalAlpha = 0.4;
    if (back) {
        ctx.beginPath(); ctx.ellipse(bx - 10, by - 2, 7, 5, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + 10, by - 2, 7, 5, 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (side) {
        ctx.beginPath(); ctx.ellipse(bx - flip * 8, by, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
        // Front - small wings on sides
        ctx.beginPath(); ctx.ellipse(bx - 10, by + 1, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + 10, by + 1, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Skateboard — with body spin + board flip animation
    if (skating) {
        ctx.save();
        ctx.translate(bx, by + 10);
        // Board angle — follows body during spin, follows skateAngle on ground
        let isoAngle;
        if (jumpHeight < -2 && Math.abs(bodySpinAngle) > 10) {
            // Mid-air spinning: board follows character facing
            const facingAngles = { right: 0, 'down-right': Math.PI/4, down: Math.PI/2, 'down-left': Math.PI*3/4, left: Math.PI, 'up-left': -Math.PI*3/4, up: -Math.PI/2, 'up-right': -Math.PI/4 };
            const fAngle = facingAngles[player.facing] || 0;
            // Board perpendicular to body facing, convert to iso
            const bAngle = fAngle + Math.PI / 2;
            const bcos = Math.cos(bAngle), bsin = Math.sin(bAngle);
            isoAngle = Math.atan2((bcos + bsin) * 0.5, bcos - bsin);
        } else {
            // Normal: board follows skateAngle
            const wdx = Math.cos(player.skateAngle || 0);
            const wdy = Math.sin(player.skateAngle || 0);
            isoAngle = Math.atan2((wdx + wdy) * 0.5, wdx - wdy);
        }

        // Board trick visual
        let trickFlipScale = 1;
        if (boardFlipState) {
            const progress = Math.min(1, boardFlipState.timer / boardFlipState.duration);
            const trickAngle = (boardFlipState.rotation * Math.PI / 180) * progress;
            if (boardFlipState.type === 'flip') {
                // Kickflip/heelflip — board flips on its axis
                trickFlipScale = Math.cos(trickAngle);
            } else {
                // 180 spin — rotate the board angle
                isoAngle += trickAngle;
            }
        }

        ctx.rotate(isoAngle);
        ctx.scale(1, trickFlipScale);
        // Deck
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-7, -3, 14, 6);
        ctx.fillStyle = C.gold;
        ctx.fillRect(-6, -2, 12, 4);
        // Grip tape stripe
        ctx.fillStyle = '#5C3A1A';
        ctx.fillRect(-4, -1, 8, 1);
        // Nose/tail
        ctx.fillStyle = '#6B3410';
        ctx.fillRect(-8, -2, 2, 4);
        ctx.fillRect(6, -2, 2, 4);
        // Wheels
        ctx.fillStyle = '#333';
        ctx.fillRect(-6, -4, 2, 1);
        ctx.fillRect(-6, 3, 2, 1);
        ctx.fillRect(4, -4, 2, 1);
        ctx.fillRect(4, 3, 2, 1);
        ctx.restore();
    }

    // Trick name display (floats up on land)
    if (trickDisplay) {
        trickDisplay.timer--;
        if (trickDisplay.timer <= 0) trickDisplay = null;
        else {
            const ta = Math.min(1, trickDisplay.timer / 15);
            ctx.globalAlpha = ta;
            const isBail = trickDisplay.text === 'BAIL!';
            ctx.fillStyle = isBail ? '#FF3344' : '#FFD700';
            ctx.font = `bold ${isBail ? 7 : 9}px monospace`; ctx.textAlign = 'center';
            ctx.fillText(trickDisplay.text, bx, by - 35 - (70 - trickDisplay.timer) * 0.4);
            ctx.textAlign = 'left'; ctx.globalAlpha = 1;
        }
    }

    // Show current spin angle while airborne
    if (jumpHeight < -2 && Math.abs(bodySpinAngle) > 30) {
        const dir = bodySpinAngle > 0 ? 'BS' : 'FS';
        const deg = Math.round(Math.abs(bodySpinAngle) / 45) * 45;
        ctx.fillStyle = 'rgba(255,215,0,0.5)'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`${dir} ${deg}°`, bx, by - 32);
        ctx.textAlign = 'left';
    }

    // Label
    ctx.fillStyle = C.gold; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('YOU', bx, by - 28);
    ctx.textAlign = 'left';
}

// === BUBBLE (Club Penguin style) ===
function drawBubble(b) {
    const alpha = Math.min(1, b.life / 30);
    ctx.globalAlpha = alpha;

    // Project bubble anchor to iso
    const bIso = worldToIso(b.x, b.y);
    b._isoX = bIso.x; b._isoY = bIso.y;

    // Word-wrap text into lines (scale font down when zoomed in)
    const bFontSize = Math.max(4, Math.round(7 / Math.max(1, camera.zoom * 0.7)));
    ctx.font = `bold ${bFontSize}px monospace`;
    const maxW = Math.round(80 / Math.max(1, camera.zoom * 0.6));
    const words = b.text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);

    const lineH = bFontSize + 2;
    const pw = Math.min(Math.max(...lines.map(l => ctx.measureText(l).width)) + 10, 100);
    const ph = lines.length * lineH + 6;
    const bsx = b._isoX || b.x, bsy = b._isoY || b.y;
    const px = bsx - pw / 2;
    const py = bsy - ph - 4;

    // Rounded bubble (semi-transparent so overlapping bubbles readable)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(px + 3, py); ctx.lineTo(px + pw - 3, py);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + 3);
    ctx.lineTo(px + pw, py + ph - 3);
    ctx.quadraticCurveTo(px + pw, py + ph, px + pw - 3, py + ph);
    ctx.lineTo(px + 3, py + ph);
    ctx.quadraticCurveTo(px, py + ph, px, py + ph - 3);
    ctx.lineTo(px, py + 3);
    ctx.quadraticCurveTo(px, py, px + 3, py);
    ctx.fill();

    // Tail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(bsx - 3, py + ph);
    ctx.lineTo(bsx, py + ph + 4);
    ctx.lineTo(bsx + 3, py + ph);
    ctx.fill();

    // Text lines
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${bFontSize}px monospace`;
    ctx.textAlign = 'center';
    const scaledLineH = bFontSize + 2;
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], bsx, py + bFontSize + 2 + i * scaledLineH);
    }
    ctx.textAlign = 'left';

    ctx.globalAlpha = 1;
}

// === INTERACTION ===
function findNearestAgent() {
    let nearest = null, minDist = Infinity;
    for (const a of agents) {
        const d = Math.sqrt((a.x - player.x) ** 2 + (a.y - player.y) ** 2);
        if (d < minDist) { minDist = d; nearest = a; }
    }
    return nearest ? { agent: nearest, dist: minDist } : null;
}

function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const sy = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    // Convert screen -> iso -> world
    const isoCam = worldToIso(camera.x, camera.y);
    const isoX = (sx - CANVAS_W / 2) / camera.zoom + isoCam.x;
    const isoY = (sy - CANVAS_H / 2) / camera.zoom + isoCam.y;
    const world = isoToWorld(isoX, isoY);
    for (const a of agents) {
        if (Math.sqrt((world.x - a.x) ** 2 + (world.y - a.y) ** 2) < 20) {
            openDialogue(a, true); return;
        }
    }
}

function openDialogue(agent, showCard) {
    activeAgent = agent;
    if (showCard) showAgentCard(agent);
    document.getElementById('chat-input').focus();
}

function showAgentCard(agent) {
    const card = document.getElementById('agent-card');
    card.classList.remove('hidden');
    document.getElementById('card-name').textContent = agent.name;
    document.getElementById('card-role').textContent = agent.role;
    document.getElementById('card-status').textContent = agent.status;
    document.getElementById('card-greeting').textContent = agent.greeting;

    // Draw big avatar on card canvas
    const cv = document.getElementById('card-avatar');
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 80, 80);

    const bx = 40, by = 50;
    // Body
    c.fillStyle = agent.bodyColor;
    c.fillRect(bx - 12, by - 4, 24, 18);
    c.fillStyle = agent.color;
    c.fillRect(bx - 10, by - 2, 20, 14);
    c.fillStyle = '#FFFFFF';
    c.fillRect(bx - 4, by - 4, 8, 6);
    // Arms
    c.fillStyle = agent.color;
    c.fillRect(bx - 18, by + 2, 7, 5);
    c.fillRect(bx + 11, by + 2, 7, 5);
    c.fillStyle = '#FFD5B8';
    c.beginPath(); c.arc(bx - 19, by + 4, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(bx + 19, by + 4, 3, 0, Math.PI * 2); c.fill();
    // Legs
    c.fillStyle = '#333355';
    c.fillRect(bx - 8, by + 14, 5, 10);
    c.fillRect(bx + 3, by + 14, 5, 10);
    // Head (BIG)
    c.fillStyle = '#FFD5B8';
    c.fillRect(bx - 14, by - 28, 28, 25);
    c.fillRect(bx - 16, by - 20, 32, 14);
    // Eyes
    c.fillStyle = '#FFFFFF';
    c.fillRect(bx - 10, by - 22, 9, 9);
    c.fillRect(bx + 2, by - 22, 9, 9);
    c.fillStyle = '#1A1020';
    c.fillRect(bx - 7, by - 19, 4, 5);
    c.fillRect(bx + 4, by - 19, 4, 5);
    c.fillStyle = '#FFFFFF';
    c.fillRect(bx - 6, by - 19, 2, 2);
    c.fillRect(bx + 5, by - 19, 2, 2);
    c.fillStyle = agent.color;
    c.fillRect(bx - 7, by - 16, 3, 2);
    c.fillRect(bx + 5, by - 16, 3, 2);
    // Hair
    c.fillStyle = agent.color;
    c.fillRect(bx - 16, by - 34, 32, 8);
    c.fillRect(bx - 14, by - 38, 28, 5);
    // Mouth
    c.fillStyle = '#CC8888';
    c.fillRect(bx - 4, by - 10, 8, 2);
    // Halo
    c.strokeStyle = '#FFD700'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(bx, by - 40, 12, 4, 0, 0, Math.PI * 2); c.stroke();
    // Wings
    c.fillStyle = '#DDDDFF'; c.globalAlpha = 0.5;
    c.beginPath(); c.ellipse(bx - 18, by + 2, 8, 6, -0.3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(bx + 18, by + 2, 8, 6, 0.3, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;

    // Color the card border based on agent
    card.style.borderColor = agent.color;
}

function closeDialogue() {
    document.getElementById('dialogue-panel').classList.add('hidden');
    document.getElementById('agent-card').classList.add('hidden');
    activeAgent = null;
}

function addMessage(sender, text, type) {
    const body = document.getElementById('dialogue-body');
    const div = document.createElement('div');
    div.className = 'msg ' + type;
    div.innerHTML = `<div class="sender">${sender}</div>${text}`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

// Local agent response system (no API needed)
function sendChatMessage(agentId, text) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    // Pick a contextual response from chatter
    const responses = agent.chatter || ['...'];
    const response = responses[Math.floor(Math.random() * responses.length)];

    // Small delay to feel natural
    setTimeout(() => {
        addMessage(agent.name, response, 'agent');
        bubble = { x: agent.x, y: agent.y - 20, text: response, life: 400, color: agent.color, name: agent.name, agentId: agent.id };
        agent.talking = true;
        setTimeout(() => { agent.talking = false; }, 3000);
    }, 300);
}

// ============================================================
// DUNGEON GAME — Isaac-style isometric skateboard combat
// ============================================================

const DG = {
    ROOM_W: 17, ROOM_H: 13, FLOOR_GRID: 5,
    state: 'playing', // playing, transition, gameover, win
    floor: null, rooms: null, currentX: 0, currentY: 0,
    enemies: [], projectiles: [], particles: [], items: [],
    floorNum: 1, transTimer: 0, transDir: null,
    playerHP: 6, playerMaxHP: 6, playerDmg: 1, playerFireRate: 18,
    playerShotSpeed: 3, playerShotRange: 120, playerShotSize: 4,
    tripleShot: false, piercing: false,
    fireCooldown: 0, iframes: 0,
};

function initDungeon() {
    DG.floorNum = 1;
    DG.playerHP = 6; DG.playerMaxHP = 6; DG.playerDmg = 1;
    DG.playerFireRate = 18; DG.playerShotSpeed = 3; DG.tripleShot = false; DG.piercing = false;
    DG.playerShotRange = 120; DG.playerShotSize = 4;
    skateMode = true;
    player.vx = 0; player.vy = 0;
    generateDungeonFloor();
}

function generateDungeonFloor() {
    const G = DG.FLOOR_GRID;
    const grid = Array(G).fill(null).map(() => Array(G).fill(null));
    // Random walk from center
    let cx = 2, cy = 2;
    const path = [{ x: cx, y: cy }];
    grid[cy][cx] = { type: 'start', doors: {}, cleared: true, obstacles: [] };
    const roomCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < roomCount; i++) {
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
        const shuffled = dirs.sort(() => Math.random() - 0.5);
        let placed = false;
        for (const [dx, dy] of shuffled) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < G && ny >= 0 && ny < G && !grid[ny][nx]) {
                grid[ny][nx] = { type: 'normal', doors: {}, cleared: false, obstacles: [] };
                // Random obstacles
                const obCount = 1 + Math.floor(Math.random() * 3);
                for (let o = 0; o < obCount; o++) {
                    const ox = 2 + Math.floor(Math.random() * (DG.ROOM_W - 4));
                    const oy = 2 + Math.floor(Math.random() * (DG.ROOM_H - 4));
                    grid[ny][nx].obstacles.push({ x: ox, y: oy });
                }
                cx = nx; cy = ny;
                path.push({ x: cx, y: cy });
                placed = true; break;
            }
        }
        if (!placed) { cx = path[Math.floor(Math.random() * path.length)].x; cy = path[Math.floor(Math.random() * path.length)].y; }
    }
    // Find dead ends for boss/item
    const deadEnds = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
        if (!grid[y][x] || (x === 2 && y === 2)) continue;
        let neighbors = 0;
        if (x > 0 && grid[y][x-1]) neighbors++;
        if (x < G-1 && grid[y][x+1]) neighbors++;
        if (y > 0 && grid[y-1][x]) neighbors++;
        if (y < G-1 && grid[y+1][x]) neighbors++;
        if (neighbors <= 1) deadEnds.push({ x, y, dist: Math.abs(x-2) + Math.abs(y-2) });
    }
    deadEnds.sort((a, b) => b.dist - a.dist);
    if (deadEnds[0]) grid[deadEnds[0].y][deadEnds[0].x].type = 'boss';
    if (deadEnds[1]) grid[deadEnds[1].y][deadEnds[1].x].type = 'item';
    // Compute doors
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
        if (!grid[y][x]) continue;
        grid[y][x].doors = {
            up: y > 0 && !!grid[y-1][x],
            down: y < G-1 && !!grid[y+1][x],
            left: x > 0 && !!grid[y][x-1],
            right: x < G-1 && !!grid[y][x+1],
        };
    }
    DG.rooms = grid; DG.currentX = 2; DG.currentY = 2;
    DG.enemies = []; DG.projectiles = []; DG.particles = []; DG.items = [];
    DG.state = 'playing'; DG.fireCooldown = 0; DG.iframes = 0;
    // Center player — nudge if obstacle is there
    player.x = (DG.ROOM_W / 2) * T; player.y = (DG.ROOM_H / 2) * T;
    const startRoom = getDungeonRoom();
    if (startRoom) for (const ob of startRoom.obstacles) {
        if (Math.abs(player.x - ob.x * T) < T && Math.abs(player.y - ob.y * T) < T) {
            player.x += T * 2; // nudge away from obstacle
        }
    }
    player.vx = 0; player.vy = 0;
    camera.x = player.x; camera.y = player.y;
}

function getDungeonRoom() { return DG.rooms?.[DG.currentY]?.[DG.currentX]; }

function dgSpawnEnemies() {
    DG.enemies = [];
    const room = getDungeonRoom();
    if (!room || room.type === 'start' || room.type === 'item') return;
    const count = room.type === 'boss' ? 1 : 2 + Math.floor(Math.random() * 3) + DG.floorNum;
    for (let i = 0; i < count; i++) {
        const ex = (2 + Math.random() * (DG.ROOM_W - 4)) * T;
        const ey = (2 + Math.random() * (DG.ROOM_H - 4)) * T;
        if (Math.abs(ex - player.x) < 40 && Math.abs(ey - player.y) < 40) continue;
        const isBoss = room.type === 'boss';
        // 6 enemy tiers — each with unique behavior
        const tierPool = [
            // Tier 1: Wisp — floats in place, contact damage only, doesn't chase
            { type: 'wisp', hp: 1, size: 8, speed: 0, damage: 1, color: '#88DDFF' },
            // Tier 2: Pixie — slowly drifts toward player
            { type: 'pixie', hp: 2, size: 10, speed: 0.3, damage: 1, color: '#FF88CC' },
            // Tier 3: Sprite — hovers at range, shoots magic stars
            { type: 'sprite', hp: 3, size: 10, speed: 0.4, damage: 1, color: '#AA88FF' },
            // Tier 4: Imp — charges in bursts, fast and aggressive
            { type: 'imp', hp: 3, size: 10, speed: 0.5, damage: 1, color: '#FF6644' },
            // Tier 5: Shade — teleports, appears behind you
            { type: 'shade', hp: 4, size: 12, speed: 0.6, damage: 2, color: '#8844AA' },
            // Tier 6: Knight — slow tank, high HP, shoots + chases
            { type: 'knight', hp: 8, size: 14, speed: 0.25, damage: 2, color: '#CC2255' },
        ];
        // Higher floors unlock harder tiers
        const maxTier = Math.min(tierPool.length, 2 + DG.floorNum * 2);
        const tier = tierPool[Math.floor(Math.random() * maxTier)];
        const e = isBoss ? { type: 'boss', hp: 20 + DG.floorNum * 10, size: 16, speed: 0.5, damage: 2, color: '#FF2244' } : { ...tier };
        e.hp += DG.floorNum - 1; // scale with floor
        DG.enemies.push({
            x: ex, y: ey, vx: 0, vy: 0,
            ...e,
            fireCooldown: 0, chargeTimer: 0, chargeDir: null,
            teleTimer: 0, wandAngle: Math.random() * Math.PI * 2,
            floatPhase: Math.random() * Math.PI * 2,
        });
    }
}

function updateDungeon() {
    time++;
    if (DG.state === 'gameover') {
        if (keys[' '] || keys['enter']) { keys[' '] = false; keys['enter'] = false; gameMode = 'studio'; safeSpawnStudio(); }
        return;
    }
    if (DG.state === 'win') {
        if (keys[' '] || keys['enter']) { keys[' '] = false; keys['enter'] = false; gameMode = 'studio'; safeSpawnStudio(); }
        return;
    }
    if (DG.state === 'transition') {
        DG.transTimer--;
        if (DG.transTimer <= 0) {
            // Move to next room
            const d = DG.transDir;
            if (d === 'up') DG.currentY--;
            else if (d === 'down') DG.currentY++;
            else if (d === 'left') DG.currentX--;
            else if (d === 'right') DG.currentX++;
            // Reposition player well inside room (avoid re-triggering door)
            const midX = (DG.ROOM_W / 2) * T, midY = (DG.ROOM_H / 2) * T;
            if (d === 'up') { player.x = midX; player.y = (DG.ROOM_H - 4) * T; }
            else if (d === 'down') { player.x = midX; player.y = 4 * T; }
            else if (d === 'left') { player.x = (DG.ROOM_W - 4) * T; player.y = midY; }
            else if (d === 'right') { player.x = 4 * T; player.y = midY; }
            player.vx = 0; player.vy = 0; // kill momentum to prevent sliding back into door
            DG.projectiles = []; DG.enemies = [];
            const room = getDungeonRoom();
            if (room && !room.cleared) dgSpawnEnemies();
            DG.state = 'playing';
        }
        return;
    }

    // === PLAYING ===
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.3;
    if (zoomCooldown > 0) zoomCooldown--;
    if (keys['='] || keys['+']) { keys['='] = false; keys['+'] = false; zoomStep(1); }
    if (keys['-']) { keys['-'] = false; zoomStep(-1); }

    // Shared movement + jump + tricks (identical to studio)
    updatePlayerMovement();

    // Apply velocity + dungeon wall collision
    player.x += player.vx || 0;
    player.y += player.vy || 0;
    const r = 5;
    if (player.x < r + T) { player.x = r + T; player.vx *= -0.3; }
    if (player.x > (DG.ROOM_W - 1) * T - r) { player.x = (DG.ROOM_W - 1) * T - r; player.vx *= -0.3; }
    if (player.y < r + T) { player.y = r + T; player.vy *= -0.3; }
    if (player.y > (DG.ROOM_H - 1) * T - r) { player.y = (DG.ROOM_H - 1) * T - r; player.vy *= -0.3; }
    // Obstacle collision
    const room = getDungeonRoom();
    if (room) for (const ob of room.obstacles) {
        const ox = ob.x * T + T/2, oy = ob.y * T + T/2;
        if (Math.abs(player.x - ox) < T && Math.abs(player.y - oy) < T) {
            player.x -= player.vx; player.y -= player.vy;
            player.vx *= -0.3; player.vy *= -0.3;
        }
    }

    updateJumpAndTricks();

    // Shooting — device-aware direction:
    //   PC: arrows fire in WORLD (isometric) directions — up arrow = world-north (up-right on screen)
    //   Touch/mobile: right thumbstick sets arrow keys from SCREEN space, so convert screen→world via inverse iso
    if (DG.fireCooldown > 0) DG.fireCooldown--;
    if (jumpHeight >= -1) {
        let ix = 0, iy = 0;
        if (keys['arrowup']) iy -= 1;
        if (keys['arrowdown']) iy += 1;
        if (keys['arrowleft']) ix -= 1;
        if (keys['arrowright']) ix += 1;
        if ((ix || iy) && DG.fireCooldown <= 0) {
            const ilen = Math.sqrt(ix*ix+iy*iy); ix/=ilen; iy/=ilen;
            let wx, wy;
            if (IS_TOUCH) {
                // Screen→world inverse iso so stick direction = on-screen arrow direction
                wx = ix + iy;
                wy = iy - ix;
            } else {
                // PC: raw world direction (isometric mapping)
                wx = ix;
                wy = iy;
            }
            const wlen = Math.sqrt(wx*wx+wy*wy) || 1;
            const dx = (wx/wlen) * DG.playerShotSpeed;
            const dy = (wy/wlen) * DG.playerShotSpeed;
            // Main arrow
            DG.projectiles.push({ x: player.x, y: player.y, dx, dy,
                damage: DG.playerDmg, range: DG.playerShotRange, size: DG.playerShotSize, traveled: 0, isPlayer: true, isArrow: true, piercing: DG.piercing });
            // Triple shot spread (in world space)
            if (DG.tripleShot) {
                const angle = Math.atan2(dy, dx);
                for (const off of [-0.25, 0.25]) {
                    const a = angle + off;
                    DG.projectiles.push({ x: player.x, y: player.y, dx: Math.cos(a) * DG.playerShotSpeed, dy: Math.sin(a) * DG.playerShotSpeed,
                        damage: DG.playerDmg * 0.7, range: DG.playerShotRange * 0.8, size: DG.playerShotSize - 1, traveled: 0, isPlayer: true, isArrow: true, piercing: DG.piercing });
                }
            }
            SFX.shoot();
            DG.fireCooldown = DG.playerFireRate;
        }
    }

    // Camera follow
    camera.x += (player.x - camera.x) * 0.12;
    camera.y += (player.y - camera.y) * 0.12;

    // Update projectiles
    for (let i = DG.projectiles.length - 1; i >= 0; i--) {
        const p = DG.projectiles[i];
        p.x += p.dx; p.y += p.dy; p.traveled += Math.sqrt(p.dx*p.dx+p.dy*p.dy);
        if (p.traveled > p.range || p.x < 0 || p.x > DG.ROOM_W * T || p.y < 0 || p.y > DG.ROOM_H * T) {
            DG.projectiles.splice(i, 1);
        }
    }

    // Enemy AI + collision
    if (DG.iframes > 0) DG.iframes--;
    for (let i = DG.enemies.length - 1; i >= 0; i--) {
        const e = DG.enemies[i];
        const dx = player.x - e.x, dy = player.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Fairy float animation
        e.floatPhase = (e.floatPhase || 0) + 0.06;

        if (e.type === 'wisp') {
            // Wisp: floats in a gentle circle, doesn't chase — contact damage only
            e.x += Math.cos(e.floatPhase * 0.5) * 0.3;
            e.y += Math.sin(e.floatPhase * 0.7) * 0.3;
        } else if (e.type === 'pixie' || e.type === 'boss') {
            // Pixie/Boss: drifts toward player
            if (dist > 10) { e.x += (dx/dist) * e.speed; e.y += (dy/dist) * e.speed; }
        } else if (e.type === 'sprite' || e.type === 'knight') {
            // Sprite: hovers, shoots stars. Knight: slow tank, also shoots
            const keepDist = e.type === 'knight' ? 40 : 80;
            if (dist > keepDist) { e.x += (dx/dist) * e.speed; e.y += (dy/dist) * e.speed; }
            else if (dist < keepDist * 0.6 && e.type === 'sprite') { e.x -= (dx/dist) * e.speed * 0.3; e.y -= (dy/dist) * e.speed * 0.3; }
            e.fireCooldown--;
            e.wandAngle = Math.atan2(dy, dx);
            if (e.fireCooldown <= 0 && dist < 160) {
                e.fireCooldown = e.type === 'knight' ? 50 : 70;
                DG.projectiles.push({ x: e.x, y: e.y, dx: (dx/dist) * 2.5, dy: (dy/dist) * 2.5,
                    damage: e.damage, range: 160, size: 5, traveled: 0, isPlayer: false, isMagic: true });
                for (let p = 0; p < 3; p++) DG.particles.push({ x: e.x, y: e.y, vx: (Math.random()-0.5)*2, vy: -Math.random()*1.5, life: 15, color: ['#FFD700', '#FF88CC'][p % 2], type: 'poof' });
            }
        } else if (e.type === 'shade') {
            // Shade: teleports near player every few seconds
            e.teleTimer = (e.teleTimer || 0) + 1;
            if (e.teleTimer > 120 + Math.random() * 60) {
                // Teleport behind player
                const angle = Math.atan2(player.vy || 0, player.vx || 0) + Math.PI;
                e.x = player.x + Math.cos(angle) * 50 + (Math.random()-0.5)*20;
                e.y = player.y + Math.sin(angle) * 50 + (Math.random()-0.5)*20;
                e.teleTimer = 0;
                for (let p = 0; p < 6; p++) DG.particles.push({ x: e.x, y: e.y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, life: 20, color: '#8844AA', type: 'poof' });
            }
            if (dist > 15) { e.x += (dx/dist) * e.speed; e.y += (dy/dist) * e.speed; }
        } else if (e.type === 'imp') {
            if (e.chargeDir) {
                e.x += e.chargeDir.x * 3; e.y += e.chargeDir.y * 3;
                e.chargeTimer--;
                if (e.chargeTimer <= 0) e.chargeDir = null;
            } else {
                e.chargeTimer++;
                if (e.chargeTimer > 60 && dist < 100) {
                    e.chargeDir = { x: dx/dist, y: dy/dist };
                    e.chargeTimer = 20;
                }
            }
        }

        // Player projectiles hit enemies
        for (let j = DG.projectiles.length - 1; j >= 0; j--) {
            const p = DG.projectiles[j];
            if (!p.isPlayer) continue;
            if (Math.abs(p.x - e.x) < e.size && Math.abs(p.y - e.y) < e.size) {
                e.hp -= p.damage;
                if (!p.piercing) DG.projectiles.splice(j, 1);
                for (let k = 0; k < 3; k++) DG.particles.push({ x: e.x, y: e.y, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, life: 15, color: '#FFAA44' });
                if (!p.piercing) break;
            }
        }

        // Fairy dies — big magical POOF!
        if (e.hp <= 0) {
            DG.enemies.splice(i, 1);
            // Star burst
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2;
                DG.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, life: 30, color: '#FFD700', type: 'star' });
            }
            // Poof cloud
            for (let k = 0; k < 8; k++) {
                DG.particles.push({ x: e.x + (Math.random()-0.5)*10, y: e.y + (Math.random()-0.5)*10,
                    vx: (Math.random()-0.5)*1.5, vy: -Math.random()*1.5, life: 25,
                    color: ['#FFFFFF', '#FFB0D0', '#B0FFFF', e.color][k % 4], type: 'poof' });
            }
            // Drop pickup (20% chance health, 10% damage boost)
            if (Math.random() < 0.3) {
                const dropType = Math.random() < 0.65 ? 'health' : 'power';
                DG.items.push({ x: e.x, y: e.y, type: dropType, life: 300 });
            }
            screenShake = 3; SFX.enemyDeath();
            continue;
        }

        // Enemy/boss hits player
        if (dist < e.size + 6 && DG.iframes <= 0 && jumpHeight >= -2) {
            DG.playerHP -= e.damage;
            DG.iframes = 60;
            screenShake = 8; SFX.hit();
            for (let k = 0; k < 5; k++) DG.particles.push({ x: player.x, y: player.y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, life: 20, color: '#FF4444' });
        }
    }

    // Enemy projectiles hit player
    for (let j = DG.projectiles.length - 1; j >= 0; j--) {
        const p = DG.projectiles[j];
        if (p.isPlayer) continue;
        if (Math.abs(p.x - player.x) < 8 && Math.abs(p.y - player.y) < 8 && DG.iframes <= 0) {
            DG.playerHP -= 1; DG.iframes = 60;
            DG.projectiles.splice(j, 1);
        }
    }

    // Room cleared?
    if (room && !room.cleared && DG.enemies.length === 0 && room.type !== 'start') {
        room.cleared = true; SFX.doorOpen();
        // Boss cleared = next floor or win
        if (room.type === 'boss') {
            if (DG.floorNum >= 3) { DG.state = 'win'; return; }
            DG.floorNum++;
            generateDungeonFloor();
            return;
        }
    }

    // Item pickup
    // Item room — special items with names and effects
    if (room && room.type === 'item' && !room.itemPicked) {
        const ix = (DG.ROOM_W / 2) * T, iy = (DG.ROOM_H / 2) * T;
        if (Math.abs(player.x - ix) < 15 && Math.abs(player.y - iy) < 15) {
            room.itemPicked = true;
            const items = [
                { name: 'GOLDEN BOW', desc: '+Damage +Range', apply() { DG.playerDmg += 0.5; DG.playerShotRange += 20; }, icon: '\u2190', color: '#FFD700' },
                { name: 'ANGEL SHIELD', desc: '+2 HP', apply() { DG.playerMaxHP += 2; DG.playerHP += 2; }, icon: '\u25C6', color: '#88CCFF' },
                { name: 'SWIFT WINGS', desc: '+Speed', apply() { player.speed += 0.3; }, icon: '\u2666', color: '#FF88CC' },
                { name: 'HALO CHARM', desc: '+Fire Rate', apply() { DG.playerFireRate = Math.max(6, DG.playerFireRate - 4); }, icon: '\u25CB', color: '#FFDD44' },
                { name: 'DIVINE SWORD', desc: '+Big Damage', apply() { DG.playerDmg += 1; DG.playerShotSize += 2; }, icon: '\u2020', color: '#FF4466' },
                { name: 'FAIRY DUST', desc: '+Triple Shot', apply() { DG.tripleShot = true; }, icon: '\u2605', color: '#CC88FF' },
                { name: 'CRYSTAL HEART', desc: 'Full Heal', apply() { DG.playerHP = DG.playerMaxHP; }, icon: '\u2665', color: '#FF6688' },
                { name: 'DARK CLOAK', desc: '+Piercing Shots', apply() { DG.piercing = true; }, icon: '\u25A0', color: '#6644AA' },
            ];
            const item = items[Math.floor(Math.random() * items.length)];
            item.apply();
            trickDisplay = { text: item.name + ' - ' + item.desc, timer: 90 };
            screenShake = 5; SFX.pickup();
            for (let k = 0; k < 12; k++) DG.particles.push({ x: ix, y: iy, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, life: 30, color: item.color, type: 'star' });
        }
    }

    // Collect enemy drops
    for (let i = DG.items.length - 1; i >= 0; i--) {
        const it = DG.items[i];
        it.life--;
        if (it.life <= 0) { DG.items.splice(i, 1); continue; }
        if (Math.abs(player.x - it.x) < 12 && Math.abs(player.y - it.y) < 12) {
            if (it.type === 'health') { DG.playerHP = Math.min(DG.playerMaxHP, DG.playerHP + 2); }
            else if (it.type === 'power') { DG.playerDmg += 0.25; }
            DG.items.splice(i, 1);
            screenShake = 2; SFX.pickup();
            for (let k = 0; k < 5; k++) DG.particles.push({ x: it.x, y: it.y, vx: (Math.random()-0.5)*2, vy: -Math.random()*2, life: 20, color: it.type === 'health' ? '#FF4488' : '#FFD700', type: 'star' });
        }
    }

    // Door transitions
    if (room && room.cleared) {
        const doorZone = T + 10; // wide enough to reach past wall clamp
        if (player.y < doorZone && room.doors.up) { DG.transDir = 'up'; DG.transTimer = 15; DG.state = 'transition'; }
        if (player.y > (DG.ROOM_H - 1) * T - doorZone && room.doors.down) { DG.transDir = 'down'; DG.transTimer = 15; DG.state = 'transition'; }
        if (player.x < doorZone && room.doors.left) { DG.transDir = 'left'; DG.transTimer = 15; DG.state = 'transition'; }
        if (player.x > (DG.ROOM_W - 1) * T - doorZone && room.doors.right) { DG.transDir = 'right'; DG.transTimer = 15; DG.state = 'transition'; }
    }

    // Particles
    for (let i = DG.particles.length - 1; i >= 0; i--) {
        const p = DG.particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) DG.particles.splice(i, 1);
    }

    // Player death
    if (DG.playerHP <= 0) { DG.state = 'gameover'; }

    // Escape to leave
    if (keys['escape']) { keys['escape'] = false; gameMode = 'studio'; safeSpawnStudio(); }
}

function drawDungeon() {
    // Background — magical deep
    const bgColors = ['#0A0818', '#061018', '#100814'];
    ctx.fillStyle = bgColors[Math.min(DG.floorNum - 1, 2)];
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    const z = camera.zoom;
    const isoCam = worldToIso(camera.x, camera.y);
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
    ctx.scale(z, z);
    ctx.translate(-isoCam.x, -isoCam.y);

    const room = getDungeonRoom();
    if (!room) { ctx.restore(); return; }

    // Fairy world floor colors per floor
    const floorPalettes = [
        { a: '#1A1028', b: '#160E22', wall: '#9966CC', wallD: '#7744AA', obs: '#BB88DD', accent: '#FF88CC' }, // Floor 1: enchanted palace (lavender/pink)
        { a: '#0A1820', b: '#081418', wall: '#44AACC', wallD: '#338899', obs: '#66CCEE', accent: '#88EEFF' }, // Floor 2: crystal caverns (teal/ice)
        { a: '#1A0818', b: '#140612', wall: '#CC44AA', wallD: '#AA3388', obs: '#DD66CC', accent: '#FF88DD' }, // Floor 3: fairy queen's domain (magenta)
    ];
    const fp = floorPalettes[Math.min(DG.floorNum - 1, 2)];

    // Floor tiles — enchanted pattern
    for (let ty = 0; ty < DG.ROOM_H; ty++) {
        for (let tx = 0; tx < DG.ROOM_W; tx++) {
            const isWall = tx === 0 || ty === 0 || tx === DG.ROOM_W - 1 || ty === DG.ROOM_H - 1;
            if (isWall) continue;
            drawIsoTile(tx, ty, (tx + ty) % 2 === 0 ? fp.a : fp.b);
        }
    }

    // Magical floor decorations — glowing runes, flowers, sparkles
    // Sparkle particles floating
    for (let i = 0; i < 12; i++) {
        const sx = ((i * 73 + time * 0.2) % (DG.ROOM_W - 2)) + 1;
        const sy = ((i * 47 + time * 0.15) % (DG.ROOM_H - 2)) + 1;
        const sp = worldToIso(sx * T, sy * T);
        const sparkle = Math.sin(time * 0.04 + i * 1.7) * 0.5 + 0.5;
        const colors = [fp.accent, '#FFD700', '#FFFFFF', fp.wall];
        ctx.fillStyle = colors[i % 4]; ctx.globalAlpha = sparkle * 0.5;
        ctx.beginPath(); ctx.arc(sp.x, sp.y - sparkle * 4, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Glowing floor rune in center
    const rc = worldToIso((DG.ROOM_W/2) * T, (DG.ROOM_H/2) * T);
    ctx.strokeStyle = fp.accent; ctx.lineWidth = 1; ctx.globalAlpha = 0.15 + Math.sin(time * 0.02) * 0.08;
    ctx.beginPath(); ctx.ellipse(rc.x, rc.y, T * 2, T, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(rc.x, rc.y, T, T * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // Corner flowers/crystals
    const corners = [[2,2],[DG.ROOM_W-3,2],[2,DG.ROOM_H-3],[DG.ROOM_W-3,DG.ROOM_H-3]];
    for (let ci = 0; ci < corners.length; ci++) {
        const cp = worldToIso(corners[ci][0]*T, corners[ci][1]*T);
        const cg = 0.4 + Math.sin(time*0.03+ci*2)*0.2;
        // Crystal
        ctx.fillStyle = fp.accent; ctx.globalAlpha = cg;
        ctx.beginPath(); ctx.moveTo(cp.x, cp.y-10); ctx.lineTo(cp.x+3, cp.y-2); ctx.lineTo(cp.x-3, cp.y-2); ctx.closePath(); ctx.fill();
        // Glow
        ctx.fillStyle = fp.accent; ctx.globalAlpha = cg * 0.3;
        ctx.beginPath(); ctx.ellipse(cp.x, cp.y-4, 6, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Glowing walls — back walls with magical glow
    const wallGlow = 0.6 + Math.sin(time * 0.02) * 0.15;
    for (let tx = 0; tx < DG.ROOM_W; tx++) {
        drawIsoBox(tx * T, 0, T, T * 0.3, 16, fp.wall, fp.wallD, darkenColor(fp.wallD, 0.7));
    }
    for (let ty = 0; ty < DG.ROOM_H; ty++) {
        drawIsoBox(0, ty * T, T * 0.3, T, 16, fp.wall, fp.wallD, darkenColor(fp.wallD, 0.7));
    }
    // Wall glow effect
    ctx.globalAlpha = wallGlow * 0.15;
    const wtl = worldToIso(0, 0), wtr = worldToIso(DG.ROOM_W * T, 0);
    ctx.fillStyle = fp.wall;
    ctx.fillRect(wtl.x - 5, wtl.y - 20, wtr.x - wtl.x + 10, 8);
    ctx.globalAlpha = 1;

    // Obstacles — magical crystals/mushrooms
    for (const ob of room.obstacles) {
        drawIsoBox(ob.x * T, ob.y * T, T, T, 12, fp.obs, darkenColor(fp.obs, 0.6), darkenColor(fp.obs, 0.4));
        // Crystal glow on top
        const op = worldToIso(ob.x * T + T/2, ob.y * T + T/2);
        ctx.fillStyle = fp.obs; ctx.globalAlpha = 0.3 + Math.sin(time * 0.03 + ob.x) * 0.15;
        ctx.beginPath(); ctx.ellipse(op.x, op.y - 14, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Doors — enchanted portals when cleared
    const doorColor = room.cleared ? '#FFD700' : '#555';
    const midW = Math.floor(DG.ROOM_W / 2), midH = Math.floor(DG.ROOM_H / 2);
    const doorGlow = room.cleared ? (0.4 + Math.sin(time * 0.04) * 0.2) : 0;
    if (room.doors.up) { const dp = worldToIso(midW * T, 0); if (room.cleared) { ctx.fillStyle = `rgba(255,215,0,${doorGlow})`; ctx.beginPath(); ctx.ellipse(dp.x, dp.y + 4, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = doorColor; ctx.beginPath(); ctx.ellipse(dp.x, dp.y + 4, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    if (room.doors.down) { const dp = worldToIso(midW * T, (DG.ROOM_H-1) * T); if (room.cleared) { ctx.fillStyle = `rgba(255,215,0,${doorGlow})`; ctx.beginPath(); ctx.ellipse(dp.x, dp.y + 4, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = doorColor; ctx.beginPath(); ctx.ellipse(dp.x, dp.y + 4, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    if (room.doors.left) { const dp = worldToIso(0, midH * T); if (room.cleared) { ctx.fillStyle = `rgba(255,215,0,${doorGlow})`; ctx.beginPath(); ctx.ellipse(dp.x, dp.y + 4, 6, 12, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = doorColor; ctx.beginPath(); ctx.ellipse(dp.x, dp.y + 4, 4, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    if (room.doors.right) { const dp = worldToIso((DG.ROOM_W-1) * T, midH * T); if (room.cleared) { ctx.fillStyle = `rgba(255,215,0,${doorGlow})`; ctx.beginPath(); ctx.ellipse(dp.x, dp.y + 4, 6, 12, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = doorColor; ctx.beginPath(); ctx.ellipse(dp.x, dp.y + 4, 4, 8, 0, 0, Math.PI * 2); ctx.fill(); }

    // Item glow in item rooms
    if (room.type === 'item' && !room.itemPicked) {
        const ip = worldToIso((DG.ROOM_W/2)*T, (DG.ROOM_H/2)*T);
        const ig = 0.5 + Math.sin(time * 0.05) * 0.3;
        ctx.fillStyle = `rgba(255, 215, 0, ${ig})`;
        ctx.beginPath(); ctx.ellipse(ip.x, ip.y - 5, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        drawIsoBox((DG.ROOM_W/2)*T - 4, (DG.ROOM_H/2)*T - 4, 8, 8, 8, '#FFD700', '#CC9900', '#996600');
    }

    // Enemy drops (floating pickups)
    for (const it of DG.items) {
        const ip = worldToIso(it.x, it.y);
        const fy = Math.sin(time * 0.08) * 3;
        const glow = 0.5 + Math.sin(time * 0.06) * 0.2;
        ctx.fillStyle = it.type === 'health' ? `rgba(255,68,136,${glow})` : `rgba(255,215,0,${glow})`;
        ctx.beginPath(); ctx.ellipse(ip.x, ip.y + fy - 5, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = it.type === 'health' ? '#FF4488' : '#FFD700';
        ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
        ctx.fillText(it.type === 'health' ? '\u2665' : '\u2605', ip.x, ip.y + fy - 3);
        ctx.textAlign = 'left';
    }

    // Lamps in corners for moody lighting
    drawIsoLamp(2 * T, 2 * T);
    drawIsoLamp((DG.ROOM_W - 3) * T, 2 * T);

    // Sort everything by depth for drawing
    const allEntities = [];
    // Enemies
    for (const e of DG.enemies) {
        allEntities.push({ type: 'enemy', data: e, depth: isoDepth(e.x, e.y) });
    }
    // Player
    allEntities.push({ type: 'player', depth: isoDepth(player.x, player.y) });
    allEntities.sort((a, b) => a.depth - b.depth);

    for (const ent of allEntities) {
        if (ent.type === 'player') {
            if (DG.iframes > 0 && Math.floor(DG.iframes / 4) % 2 === 0) continue;
            drawPlayer();
        } else {
            // Draw fairy enemy
            const e = ent.data;
            const ep = worldToIso(e.x, e.y);
            const fairyFloat = Math.sin((e.floatPhase || 0)) * 3;
            const ebx = Math.round(ep.x), eby = Math.round(ep.y + fairyFloat);

            // Shadow (stays on ground)
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.beginPath(); ctx.ellipse(ebx, Math.round(ep.y) + 8, 5, 2, 0, 0, Math.PI * 2); ctx.fill();

            // Fairy wings (translucent, fluttering)
            const wingFlap = Math.sin((e.floatPhase || 0) * 2) * 0.3;
            ctx.fillStyle = e.color; ctx.globalAlpha = 0.25;
            ctx.beginPath(); ctx.ellipse(ebx - 8, eby - 2, 6 + wingFlap, 4, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(ebx + 8, eby - 2, 6 + wingFlap, 4, 0.3, 0, Math.PI * 2); ctx.fill();
            // Smaller inner wings
            ctx.globalAlpha = 0.15;
            ctx.beginPath(); ctx.ellipse(ebx - 6, eby + 1, 4, 3, -0.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(ebx + 6, eby + 1, 4, 3, 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;

            // Body + Head
            drawCharBody(ebx, eby, darkenColor(e.color, 0.7), e.color, 'down', false, 0);
            drawCharHead(ebx, eby, e.color, 'down', false, 0);

            // Magic wand (ALL fairies have wands)
            {
                const wa = e.wandAngle || 0;
                const wIso = Math.atan2((Math.cos(wa) + Math.sin(wa)) * 0.5, Math.cos(wa) - Math.sin(wa));
                ctx.save();
                ctx.translate(ebx + 6, eby);
                ctx.rotate(wIso * 0.3);
                // Wand stick
                ctx.fillStyle = '#8B6914'; ctx.fillRect(-1, -8, 2, 8);
                // Star on top
                ctx.fillStyle = '#FFD700';
                ctx.beginPath(); ctx.arc(0, -10, 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#FFEE88';
                ctx.beginPath(); ctx.arc(0, -10, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // Boss crown
            if (e.type === 'boss') {
                ctx.fillStyle = '#FFD700'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
                ctx.fillText('\u2605', ebx, eby - 24); ctx.textAlign = 'left';
            }
            // HP bar for ALL enemies
            const maxHP = e.type === 'boss' ? (20 + DG.floorNum * 10) : (2 + DG.floorNum);
            const barW = e.type === 'boss' ? 24 : 14, barH = 2;
            const barY = eby - (e.type === 'boss' ? 26 : 22);
            ctx.fillStyle = '#222'; ctx.fillRect(ebx - barW/2, barY, barW, barH);
            ctx.fillStyle = e.type === 'boss' ? '#FF2244' : e.color;
            ctx.fillRect(ebx - barW/2, barY, barW * Math.max(0, e.hp / maxHP), barH);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 0.5; ctx.strokeRect(ebx - barW/2, barY, barW, barH);
        }
    }

    // Projectiles
    for (const p of DG.projectiles) {
        const pp = worldToIso(p.x, p.y);
        if (p.isMagic) {
            // Magic star projectile — spinning star with sparkle trail
            ctx.save(); ctx.translate(pp.x, pp.y);
            ctx.rotate(p.traveled * 0.1);
            ctx.fillStyle = '#FFD700';
            // 4-point star shape
            for (let s = 0; s < 4; s++) {
                ctx.save(); ctx.rotate(s * Math.PI / 2);
                ctx.fillRect(-1, -4, 2, 4);
                ctx.restore();
            }
            ctx.fillStyle = '#FFEE88';
            ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            // Sparkle trail
            ctx.fillStyle = 'rgba(255,215,0,0.3)';
            ctx.beginPath(); ctx.arc(pp.x, pp.y, 5, 0, Math.PI * 2); ctx.fill();
        } else if (p.isArrow) {
            // Arrow projectile — rotated line with arrowhead
            ctx.save(); ctx.translate(pp.x, pp.y);
            const aAngle = Math.atan2((p.dx + p.dy) * 0.5, p.dx - p.dy);
            ctx.rotate(aAngle);
            // Shaft
            ctx.fillStyle = '#DAA520'; ctx.fillRect(-6, -1, 10, 2);
            // Arrowhead
            ctx.fillStyle = '#FFEE88';
            ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(8, 0); ctx.lineTo(5, 3); ctx.closePath(); ctx.fill();
            // Fletching
            ctx.fillStyle = '#FF88AA'; ctx.fillRect(-7, -2, 2, 1); ctx.fillRect(-7, 1, 2, 1);
            ctx.restore();
            // Trail glow
            ctx.fillStyle = 'rgba(255,215,0,0.2)';
            ctx.beginPath(); ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2); ctx.fill();
        } else {
            // Enemy projectile
            ctx.fillStyle = '#FF69B4';
            ctx.beginPath(); ctx.arc(pp.x, pp.y, p.size / 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,105,180,0.3)';
            ctx.beginPath(); ctx.arc(pp.x, pp.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    // Particles — poof clouds, stars, sparkles
    for (const p of DG.particles) {
        const pp = worldToIso(p.x, p.y);
        ctx.globalAlpha = Math.min(1, p.life / 15);
        if (p.type === 'poof') {
            // Expanding cloud puff
            const size = 3 + (25 - p.life) * 0.3;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.ellipse(pp.x, pp.y, size, size * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'star') {
            // Spinning star
            ctx.save(); ctx.translate(pp.x, pp.y);
            ctx.rotate(p.life * 0.3);
            ctx.fillStyle = p.color;
            ctx.fillRect(-1, -3, 2, 6);
            ctx.fillRect(-3, -1, 6, 2);
            ctx.restore();
        } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(pp.x - 1, pp.y - 1, 2, 2);
        }
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Vignette
    const vigGrad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.2, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.6);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(0, 0, 10, 0.6)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // HUD
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 10px monospace';
    ctx.fillText('FLOOR ' + DG.floorNum, 10, 16);
    // Hearts
    for (let i = 0; i < DG.playerMaxHP / 2; i++) {
        const hx = 10 + i * 14, hy = 22;
        const full = DG.playerHP >= (i + 1) * 2;
        const half = !full && DG.playerHP >= i * 2 + 1;
        ctx.fillStyle = full ? '#FF2244' : half ? '#FF6688' : '#333';
        ctx.fillRect(hx, hy, 10, 8);
        ctx.strokeStyle = '#661122'; ctx.lineWidth = 0.5; ctx.strokeRect(hx, hy, 10, 8);
    }
    // Room indicator
    ctx.fillStyle = '#888'; ctx.font = '7px monospace';
    const roomType = room?.type || '???';
    ctx.fillText(roomType.toUpperCase(), 10, 38);
    ctx.fillStyle = '#555'; ctx.fillText('[ESC] Exit', CANVAS_W - 60, 16);

    // Transition fade
    if (DG.state === 'transition') {
        ctx.fillStyle = '#000'; ctx.globalAlpha = 1 - DG.transTimer / 15;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H); ctx.globalAlpha = 1;
    }
    // Game over
    if (DG.state === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#FF2244'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_W/2, CANVAS_H/2 - 10);
        ctx.fillStyle = '#888'; ctx.font = '9px monospace';
        ctx.fillText('PRESS SPACE TO RETURN', CANVAS_W/2, CANVAS_H/2 + 10);
        ctx.textAlign = 'left';
    }
    // Win
    if (DG.state === 'win') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText('DUNGEON CLEARED', CANVAS_W/2, CANVAS_H/2 - 10);
        ctx.fillStyle = '#888'; ctx.font = '9px monospace';
        ctx.fillText('PRESS SPACE TO RETURN TO STUDIO', CANVAS_W/2, CANVAS_H/2 + 10);
        ctx.textAlign = 'left';
    }
}

init();
