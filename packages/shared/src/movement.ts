export interface MovementInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface MovementResult extends Position {
  dir: number; // 0 up,1 right,2 down,3 left
}

// Pure movement step shared by client and server.
// Applies normalized velocity and axis/diagonal collision checks.
export function computeNextPosition(
  pos: Position,
  input: MovementInput,
  speed: number,
  dt: number,
  isWalkable: (x: number, y: number) => boolean,
  prevDir: number = 2
): MovementResult {
  const vel = { x: 0, y: 0 };
  if (input.up) vel.y -= 1;
  if (input.down) vel.y += 1;
  if (input.left) vel.x -= 1;
  if (input.right) vel.x += 1;

  // normalize diagonal movement
  if (vel.x !== 0 || vel.y !== 0) {
    const mag = Math.hypot(vel.x, vel.y);
    vel.x /= mag;
    vel.y /= mag;
  }

  const nx = pos.x + vel.x * speed * dt;
  const ny = pos.y + vel.y * speed * dt;

  let nextX = pos.x;
  let nextY = pos.y;

  // Check X movement
  if (isWalkable(Math.round(nx), Math.round(pos.y))) {
    nextX = nx;
  }

  // Check Y movement
  if (isWalkable(Math.round(pos.x), Math.round(ny))) {
    nextY = ny;
  }

  // Check diagonal movement; if blocked, cancel both
  if (!isWalkable(Math.round(nx), Math.round(ny))) {
    nextX = pos.x;
    nextY = pos.y;
  }

  // Determine facing direction if moving/trying to move
  let dir = prevDir;
  if (vel.x !== 0 || vel.y !== 0) {
    if (vel.y < 0) dir = 0; // up
    else if (vel.x > 0) dir = 1; // right
    else if (vel.y > 0) dir = 2; // down
    else if (vel.x < 0) dir = 3; // left
  }

  return { x: nextX, y: nextY, dir };
}
