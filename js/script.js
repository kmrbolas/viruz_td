"use strict";
Array.prototype.remove_if = function(callback)
{
    let i = this.length;
    while (i--)
        if (callback(this[i], i, this))
            this.splice(i, 1);
};
Array.prototype.find_last_of = function(callback)
{
    let i = this.length;
    while (i--)
        if (callback(this[i], i, this))
            return this[i];
    return undefined;
};
Math.clamp = (value, min, max) => { return Math.max(min, Math.min(value, max)); }
Math.lerp = (v1, v2, t) => { return v1 + (v2 - v1) * Math.clamp(t, 0, 1); };
function wave(delay, create_enemy = null, count = 1) { return { delay: delay, create_enemy: create_enemy, count: count }; }
class Vector2
{
	constructor(x, y)
	{
		this.x = x;
		this.y = y;
    }

    get copy() { return new Vector2(this.x, this.y); }
    set(v) { this.x = v.x; this.y = v.y; }

    static angleVector(a) { return new Vector2(Math.cos(a), Math.sin(a)); }
    static perp(v) { return new Vector2(v.y, -v.x); }

	static dot(v1, v2) { return v1.x * v2.x + v1.y * v2.y; }
    static cross(v1, v2) { return v1.x * v2.y - v1.y * v2.x; }
    static lerp(v1, v2, t) { return new Vector2(Math.lerp(v1.x, v2.x, t), Math.lerp(v1.y, v2.y, t)); }

    dot(v) { return Vector2.dot(this, v); }
    cross(v) { return Vector2.cross(this, v); }
    lerp(v, t) { return Vector2.lerp(this, v, t); }

    static add(v1, v2) { return new Vector2(v1.x + v2.x, v1.y + v2.y); }
	static sub(v1, v2) { return new Vector2(v1.x - v2.x, v1.y - v2.y); }
	static mult(v1, s) { return new Vector2(v1.x * s, v1.y * s); }
    static div(v1, s)  { return new Vector2(v1.x / s, v1.y / s); }

    add(v) { return Vector2.add(this, v); }
	sub(v) { return Vector2.sub(this, v); }
	mult(s) { return Vector2.mult(this, s); }
    div(s) { return Vector2.div(this, s); }

    static sqrDistance(v1, v2) { return Vector2.sub(v1, v2).sqrMagnitude; }
    static distance(v1, v2) { return Vector2.sub(v1, v2).magnitude; }

    sqrDistance(v) { return Vector2.sqrDistance(this, v); }
    distance(v) { return Vector2.distance(this, v); }

	get sqrMagnitude() { return this.x * this.x + this.y * this.y; }
	get magnitude() { return Math.sqrt(this.sqrMagnitude); }

    get normalized()
    {
        let m = this.magnitude;
        return m == 0 ? this : this.div(this.magnitude);
    }

	normalize() { this.set(this.normalized); }

    get angle() { return Math.atan2(this.y, this.x); }
    get perp() { return Vector2.perp(this); }

	toPrecision(d) { return new Vector2(this.x.toPrecision(d), this.y.toPrecision(d)); }

	toString()
	{
		let v = this.toPrecision(1);
		return ("(" + v.x + ", " + v.y + ")");
	}

};
let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");
function RenderLines(style, lineWidth, ...positions)
{
    context.strokeStyle = style;
    context.lineWidth = lineWidth;
    context.beginPath();
    positions.forEach(pos => { context.lineTo(pos.x, pos.y); });
    context.stroke();
}
function MinDistanceFromPointToLine(v1, v2, point)
{
    let AB = Vector2.sub(v2, v1);
    let AC = Vector2.sub(point, v1);
    return Math.abs(Vector2.cross(AC, AB) / AB.magnitude);
}
function IntersectLines(a, b, c, d)
{
    const r = Vector2.sub(b, a);
    const s = Vector2.sub(d, c);
    return vec(Vector2.cross(Vector2.sub(c, a), s) / Vector2.cross(r, s), Vector2.cross(Vector2.sub(a, c), r) / Vector2.cross(s, r));
}
function RenderRectangleFilled(style, pos, size)
{
    context.fillStyle = style;
    context.fillRect(pos.x, pos.y, size.x, size.y);
}
function RenderRectangleStroked(style, lineWidth, pos, size)
{
    context.strokeStyle = style;
    context.lineWidth = lineWidth;
    context.strokeRect(pos.x, pos.y, size.x, size.y);
}
function RenderRectangle(fillStyle, strokeStyle, lineWidth, pos, size)
{
    RenderRectangleFilled(fillStyle, pos, size);
    RenderRectangleStroked(strokeStyle, lineWidth, pos, size);
}
function RenderLifeBar(life, max_life, pos, size)
{
    RenderRectangle("#999", "#000", 1, pos, size);
    let p = life / max_life;
    size.x *= p;
    let color = p >= .8 ? "#0F0" : p >= .6 ? "#DF0" : p >= .4 ? "#FF0" : p >= .2 ? "#F90" : "#F00";
    RenderRectangle(color, "#000", 1, pos, size);
}
let Time =
{
    deltaTime: 0,
    unscaledDeltaTime: 0,
    timeScale: 1,
}
let Input =
{
    mouseClick: false,
    mousePos: vec(0, 0),
    log(s) { console.log(s); },
}
class Rectangle2D
{
    constructor(position, size)
    {
        this.position = vec(position.x, position.y);
        this.size = vec(size.x, size.y);
    }
    get copy() { return new Rectangle2D(this.position, this.size); }
    get right() { return this.position.x + this.size.x; }
    get bottom() { return this.position.y + this.size.y; }
    get center() { return vec(this.position.x + this.size.x / 2, this.position.y + this.size.y / 2); }
    set center(value) { this.position = vec(value.x, value.y).sub(Vector2.div(this.size, 2)); }
    IsInside(position)
    {
        return position.x >= this.position.x && position.x <= this.right && position.y >= this.position.y && position.y <= this.bottom;
    }
    static HasCollided(r1, r2)
    {
        return (r1.position.x >= r2.position.x && r1.position.x <= r2.right && r1.position.y >= r2.position.y && r1.position.y <= r2.bottom)
            || (r2.position.x >= r1.position.x && r2.position.x <= r1.right && r2.position.y >= r1.position.y && r2.position.y <= r1.bottom);
    }
    Render(color = "#999", borderColor = "#000", lineWidth = 1)
    {
        this.RenderFilled(color);
        this.RenderBorder(borderColor, lineWidth);
    }
    RenderFilled(color)
    {
        context.fillStyle = color;
        context.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);
    }
    RenderBorder(color, lineWidth)
    {
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
    }
    RenderLifeBar(m, n)
    {
        this.Render("#999", "#000", 1);
        let r = this.copy;
        let p = m / n;
        r.size.x *= p;
        let color = p >= .8 ? "#0F0" : p >= .6 ? "#DF0" : p >= .4 ? "#FF0" : p >= .2 ? "#F90" : "#F00";
        r.Render(color, "#000", 1);
    }

}
class Circle2D
{
    constructor(center_position, radius)
    {
        this.center_position = vec(center_position.x, center_position.y);
        this.radius = radius;
    }
    get copy() { return new Circle2D(this.center_position, this.radius); }
    get position() { return Vector2.sub(this.center_position, vec(this.radius, this.radius)); }
    set position(value) { this.center_position = vec(value.x + this.radius, value.y + this.radius); }
    IsInside(position) { return Vector2.distance(this.center_position, position) <= this.radius; }
    Render(color = "#999", borderColor = "#000", lineWidth = 1, start = 0, end = 2 * Math.PI)
    {
        this.RenderFilled(color, start, end);
        this.RenderBorder(borderColor, lineWidth, start, end);
    }
    RenderFilled(color, start = 0, end = 2 * Math.PI)
    {
        context.fillStyle = color;
        context.beginPath();
        context.arc(this.center_position.x, this.center_position.y, this.radius, start, end);
        context.fill();
    }
    RenderBorder(color, lineWidth = 1, start = 0, end = 2 * Math.PI)
    {
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.beginPath();
        context.arc(this.center_position.x, this.center_position.y, this.radius, start, end);
        context.stroke();
    }

}
function vec(x, y) { return new Vector2(x, y); }
function rectangle(pos, size) { return new Rectangle2D(pos, size); }
class Transform
{
    constructor(position = vec(0, 0), rotation = 0, scale = 1)
    {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
    }
    get copy() { return new Transform(this.position, this.rotation, this.scale); }
    FaceTo(position, t = 1)
    {
        let dir = Vector2.sub(position, this.position).normalized;
        this.rotation = Vector2.angleVector(this.rotation).lerp(dir, t).angle;
    }
    MoveTo(position, amount)
    {
        let direction = Vector2.sub(position, this.position).normalized;
        this.position = Vector2.add(this.position, direction.mult(amount));
    }
}
function trans(pos, rot, sca) { return new Transform(pos, rot, sca); }
class Transformable
{
    constructor(transform)
    {
        this._transform = new Transform();
        this.transform = transform;
    }
    get transform() { return this._transform; }
    set transform(value) { this._transform = value.copy; }
}
class Timer
{
    constructor(delay, OnTimerTick = null)
    {
        this.delay = delay;
        this.elapsed = 0;
        if (OnTimerTick != null)
            this.OnTimerTick = OnTimerTick;
    }
    get frequency() { return 1 / this.delay; }
    set frequency(value) { this.delay = 1 / value; }
    get to_tick() { return this.delay - this.elapsed; }
    OnTimerTick()
    {
        
    }
    Update()
    {
        this.elapsed += Time.deltaTime;
        if (this.elapsed < this.delay)
            return;
        this.OnTimerTick();
        this.elapsed = 0;
    }

}
class Sprite extends Transformable
{
    constructor(src, transform = new Transform())
    {
        super(transform);
        this.img = new Image();
        this.img.src = src;
    }
    get unscaled_size() { return vec(this.img.width, this.img.height); }
    get size() { return this.unscaled_size.mult(this.transform.scale); }
    get top_position() { return this.transform.position.sub(this.size.div(2)); }
    set top_position(value) { this.transform.position = value.add(this.size.div(2)); }
    Render()
    {
        context.save();
        context.translate(this.transform.position.x, this.transform.position.y);
        context.rotate(this.transform.rotation);
        context.scale(this.transform.scale, this.transform.scale);
        context.drawImage(this.img, -this.img.width / 2, -this.img.height / 2, this.img.width, this.img.height);
        context.restore();
    }
    static CreateArray(...srcs)
    {
        let arr = new Array(0);
        srcs.forEach(src => { arr.push(new Sprite(src)); });
        return arr;
    }
    static CreateSheet(path, n, fmt)
    {
        let arr = new Array(0);
        for (let i = 0; i < n; i++)
            arr.push(path + i + fmt);
        return Sprite.CreateArray(...arr);
    }
}
let sprites =
{
    spider:
    [
        Sprite.CreateSheet("images/enemies/spider_d_", 4, ".png"),
        Sprite.CreateSheet("images/enemies/spider_c_", 4, ".png"),
        Sprite.CreateSheet("images/enemies/spider_b_", 4, ".png"),
        Sprite.CreateSheet("images/enemies/spider_a_", 4, ".png"),
        Sprite.CreateArray("images/enemies/spider_d_0.png", "images/enemies/spider_c_1.png", "images/enemies/spider_b_0.png", "images/enemies/spider_a_1.png")
    ],

    beetle:
    [
        Sprite.CreateSheet("images/enemies/beetle_d_", 2, ".png"),
        Sprite.CreateSheet("images/enemies/beetle_c_", 2, ".png"),
        Sprite.CreateSheet("images/enemies/beetle_b_", 2, ".png"),
        Sprite.CreateSheet("images/enemies/beetle_a_", 2, ".png"),
        Sprite.CreateArray("images/enemies/beetle_d_0.png", "images/enemies/beetle_c_1.png", "images/enemies/beetle_b_0.png", "images/enemies/beetle_a_1.png")
    ],

    wasp:
    [
        Sprite.CreateSheet("images/enemies/wasp_d_", 5, ".png"),
        Sprite.CreateSheet("images/enemies/wasp_c_", 5, ".png"),
        Sprite.CreateSheet("images/enemies/wasp_b_", 5, ".png"),
        Sprite.CreateSheet("images/enemies/wasp_a_", 5, ".png"),
        Sprite.CreateArray("images/enemies/wasp_d_0.png", "images/enemies/wasp_c_1.png", "images/enemies/wasp_b_2.png", "images/enemies/wasp_a_3.png", "images/enemies/wasp_a_4.png")
    ],

    machine_gun: Sprite.CreateArray("images/turrets/Machine_Gun/machine_gun_0.png", "images/turrets/Machine_Gun/machine_gun_1.png", "images/turrets/Machine_Gun/machine_gun_2.png", "images/turrets/Machine_Gun/machine_gun_enabled.png", "images/turrets/Machine_Gun/machine_gun_disabled.png"),
    anti_air: Sprite.CreateArray("images/turrets/antiair/0.png", "images/turrets/antiair/0.png"),
    rocket_launcher: Sprite.CreateArray("images/turrets/rocketlauncher/0.png"),
    rocket: new Sprite("images/projectiles/rocket/0.png"),
    bullet: new Sprite("images/projectiles/bullet/0.png"),
    explosion: Sprite.CreateArray("images/effects/tile000.png", "images/effects/tile001.png", "images/effects/tile002.png", "images/effects/tile003.png","images/effects/tile004.png"),
    explosion_realistic: Sprite.CreateSheet("images/effects/realexplosion/", 27, ".png"),
    track: new Sprite("images/background/Track01.png"),
    grass: new Sprite("images/background/grass.jpg"),
}
class Animation extends Transformable
{
    constructor(frame_rate, sprites, transform = new Transform(), opacity = 1)
    {
        super(transform);
        this.sprites = sprites;
        this.sprite_index = 0;
        this.times_played = 0;
        this.opacity = opacity;
        this.timer = new Timer(1 / frame_rate, () => { 
            this.sprite_index = (this.sprite_index + 1) % this.sprites.length;
            if (this.sprite_index == 0)
                this.times_played++;
        });
    }
    get copy() { return new Animation(this.frame_rate, this.sprites, this.transform); }
    get frame_rate() { return this.timer.frequency; }
    set frame_rate(value) { this.timer.frequency = value; }
    get current_sprite() { return this.sprites[this.sprite_index]; }
    Render()
    {
        this.current_sprite.transform = this.transform;
        let old_alpha = context.globalAlpha;
        context.globalAlpha = this.opacity;
        this.current_sprite.Render();
        context.globalAlpha = old_alpha;
    }
    Update()
    {
        this.timer.Update();
    }
    static CreateArray(frame_rate, sprites_arr)
    {
        let arr = new Array(0);
        sprites_arr.forEach(sprites => { arr.push(new Animation(frame_rate, sprites)); });
        return arr;
    }
}
let animations =
{
    spider: Animation.CreateArray(12, sprites.spider),
    beetle: Animation.CreateArray(12, sprites.beetle),
    wasp: Animation.CreateArray(60, sprites.wasp),
    machine_gun: new Animation(12, sprites.machine_gun),
    anti_air: new Animation(12, sprites.anti_air),
    explosion: new Animation(30, sprites.explosion),
    explosion_realistic: new Animation(120, sprites.explosion_realistic),
}
class KillableEntity extends Transformable
{
    constructor(max_life, transform = new Transform())
    {
        super(transform);
        this.max_life = max_life;
        this._life = max_life;
    }
    get is_alive() { return this.life > 0; }
    get is_dead() { return !this.is_alive; }
    get life() { return this._life; }
    set life(value) { this._life = Math.clamp(value, 0, this.max_life); }
    Render()
    {
        this.RenderLifeBar();
    }
    RenderLifeBar(offset = 30, text = false)
    {
        let pos = Vector2.sub(this.transform.position, vec(12, offset));
        RenderLifeBar(this.life, this.max_life, pos, vec(25, 5));
        if (!text)
            return;
        context.font= '10px sans-serif';
        context.fillStyle = "#000";
        context.fillText(this.life.toFixed(0), pos.x, pos.y + 10);
    }

}
class Path
{
    constructor(sprite, core, ...positions)
    {
        this.sprite = sprite;
        this.core = core;
        this.positions = positions;
        this.positions.push(core.transform.position);
    }
    get origin() { return this.positions[0]; }
    Render()
    {
        // RenderLines("#F00", 1, ...this.positions);
        this.sprite.Render();
        this.core.Render();
    }
    GetDestinationByIndex(index)
    {
        return this.positions[Math.clamp(index, 0, this.positions.length - 1)];
    }
    GetDirectionByIndex(index)
    {
        return Vector2.sub(this.GetDestinationByIndex(index), this.GetDestinationByIndex(index - 1)).normalized;
    }
    IsInside(position, delta = 50)
    {
        for (let i = 0; i < this.positions.length; i++)
            if (Vector2.distance(this.positions[i], position) < delta)
                return true;
        for (let i = 0; i + 1 < this.positions.length; i++)
        {
            const v1 = this.positions[i];
            const v2 = this.positions[i + 1];
            let d = position.add(v1.sub(v2).perp.normalized);
            let v = IntersectLines(v1, v2, position, d);
            if (v.x < 0 || v.x > 1)
                continue;
            if (MinDistanceFromPointToLine(v1, v2, position) < delta)
                return true;
        }
        return false;
    }
    
}
class Enemy extends KillableEntity
{
    constructor(speed, max_life, transform = new Transform())
    {
        super(max_life, transform);
        this.speed = speed;
        this.traveled_distance = 0;
        this.path_index = 0;
        this.org = Math.random() * 30 - 15;
    }
    get turn_speed() { return this.speed / 10; }
    Update(game_manager)
    {
        let path = game_manager.path;
        if (this.path_index == 0)
        {
            this.transform.position = path.origin;
            this.transform.FaceTo(path.GetDestinationByIndex(++this.path_index));
            return;
        }
        let dest = path.GetDestinationByIndex(this.path_index);
        let perp = path.GetDirectionByIndex(this.path_index).perp;
        dest = dest.add(perp.mult(this.org));
        this.traveled_distance += this.speed * Time.deltaTime;
        this.transform.MoveTo(dest, this.speed * Time.deltaTime);
        this.transform.FaceTo(dest, this.turn_speed * Time.deltaTime);
        if (Vector2.distance(this.transform.position, dest) <= 5 * this.speed * Time.deltaTime)
        {
            this.org = -this.org;
            if (this.path_index++ >= path.positions.length)
            {
                path.core.life -= this.life;
                this.life = 0;
            }
        }
        if (this.is_dead)
        {
            let ex = animations.explosion.copy;
            ex.transform = this.transform;
            ex.transform.scale *= 1.5;
            game_manager.PlayAnimation(ex);
            if (this.rank < 1) return;
            this.SpawnAdjacent(game_manager, this.factory.CreateByRank(this.rank - 1));
            if (this.rank < 3) return;
            this.SpawnAdjacent(game_manager, this.factory.CreateByRank(this.rank - 1));
            return;
        }
    }
    SpawnAdjacent(game_manager, to_spawn, d = Math.random() * 20 - 10)
    {
        to_spawn.transform.position = Vector2.angleVector(this.transform.rotation).perp.mult(d).add(this.transform.position);
        to_spawn.transform.rotation = this.transform.rotation;
        to_spawn.traveled_distance = this.traveled_distance;
        to_spawn.path_index = this.path_index;
        game_manager.wave_path.enemies.push(to_spawn);
    }
}
class AnimEnemy extends Enemy
{
    constructor(anim, speed, max_life, transform = new Transform())
    {
        super(speed, max_life, transform);
        this.anim = anim.copy;
    }
    Update(game_manager)
    {
        super.Update(game_manager);
        this.anim.Update();
    }
    Render()
    {
        this.anim.transform = this.transform;
        this.anim.Render();
        this.RenderLifeBar();
    }

}
class EnemyFactory
{
    constructor(anims, base_scale, base_speed, base_life, type = 0)
    {
        this.anims = anims;
        this.base_scale = base_scale;
        this.base_speed = base_speed;
        this.base_life = base_life;
        this.type = type;
        this.Create = new Array(0);
        for (let i = 0; i < anims.length; i++)
            this.Create.push(this.CreateByRank.bind(this, i));
    }
    CreateByRank(rank)
    {
        let e = new AnimEnemy(this.anims[rank], this.base_speed, this.base_life * Math.pow(1.5, rank));
        e.transform.scale = this.base_scale + .05 * rank;
        e.factory = this;
        e.type = this.type;
        e.rank = rank;
        return e;
    }
}
let spider_factory = new EnemyFactory(animations.spider, .4, 100, 100);
let beetle_factory = new EnemyFactory(animations.beetle, .3, 80, 150);
let wasp_factory = new EnemyFactory(animations.wasp, .4, 100, 125, 1);
class Projectile extends Transformable
{
    constructor(aoe, speed, target, transform = new Transform())
    {
        super(transform);
        this.aoe = aoe;
        this.speed = speed;
        this.target = target;
        this.target_reached = false;
    }
    Update(game_manager)
    {
        this.transform.FaceTo(this.target.transform.position);
        this.transform.MoveTo(this.target.transform.position, this.speed * Time.deltaTime);
        if (Vector2.distance(this.transform.position, this.target.transform.position) <= this.speed * Time.deltaTime)
        {
            this.target_reached = true;
            let targets = [this.target];
            game_manager.enemies.forEach(e => {
                if (Vector2.distance(e !== this.target && e.transform.position, this.transform.position) <= this.aoe)
                    targets.push(e);
            });
            this.OnHit(targets, game_manager);
        }
    }
    Render()
    {
        RenderRectangleFilled("#F00", this.transform.position, vec(25, 25));
    }
    OnHit(targets, game_manager)
    {

    }

}
function create_bullet(sprite, damage, chains_number, aoe, speed, target, transform)
{
    let bullet = new Projectile(aoe, speed, target, transform);
    bullet.sprite = sprite;
    bullet.Render = function()
    {
        this.sprite.transform = this.transform;
        this.sprite.Render();
    }
    bullet.damage = damage;
    bullet.chains_number = chains_number;
    bullet.OnHit = function(targets)
    {
        targets[0].life -= this.damage;
        if (targets.length == 1 || this.chains_number == 0)
            return;
        this.target = targets[1];
        this.chains_number--;
        this.target_reached = false;
    }
    return bullet;
}
function create_rocket(sprite, explosion, damage, aoe, speed, target, transform)
{
    let bullet = new Projectile(aoe, speed, target, transform);
    bullet.sprite = sprite;
    bullet.Render = function()
    {
        this.sprite.transform = this.transform;
        this.sprite.Render();
    }
    bullet.explosion = explosion;
    bullet.damage = damage;
    bullet.OnHit = function(targets, game_manager)
    {
        targets.forEach(t => {
            t.life -= this.damage;
        });
        let ex = this.explosion.copy;
        ex.opacity = .8;
        ex.transform = this.transform;
        ex.transform.scale = this.aoe / 60;
        game_manager.PlayAnimation(ex);
    }
    return bullet;
}
class Turret extends Transformable
{
    constructor(fire_rate, range, aoe, transform = new Transform())
    {
        super(transform);
        this.timer = new Timer(1 / fire_rate);
        this.range = range;
        this.range = aoe;
    }
    get fire_rate() { return this.timer.frequency; }
    set fire_rate(value) { this.timer.frequency = value; }
    Update(game_manager)
    {
        this.timer.Update();
    }
}
class TurretFactory
{
    constructor(cost, create_fn, enabled_sprite, disabled_sprite)
    {
        this.cost = cost;
        this.create_fn = create_fn;
        this.enabled_sprite = enabled_sprite;
        this.disabled_sprite = disabled_sprite;
    }

}
class WavePath extends Timer
{
    constructor(waves)
    {
        super(waves[0].delay);
        this.enemies = new Array(0);
        this.waves = waves;
        this.wave_index = 0;
        this.enemy_index = 0;
    }
    Update()
    {
        super.Update();
        this.enemies = this.enemies.sort((a, b) => { return b.traveled_distance - a.traveled_distance; });
    }
    OnTimerTick()
    {
        if (this.wave_index == this.waves.length)
            return;
        let wave = this.waves[this.wave_index];
        if (wave.create_enemy == null || wave.count == this.enemy_index)
        {
            if (++this.wave_index == this.waves.length)
                return;
            this.enemy_index = 0;
            this.delay = this.waves[this.wave_index].delay;
            return;
        }
        this.enemies.push(wave.create_enemy(this.path));
        this.enemy_index++;
    }
    Reset()
    {
        this.wave_index = 0;
        this.enemy_index = 0;
        this.enemies = new Array(0);
    }
}
class GameManager
{
    constructor(background_sprite, path, waves)
    {
        this.background_sprite = background_sprite;        
        this.path = path;
        this.waves = waves;
        this.wave_path = new WavePath(this.waves);
        this.animations = new Array(0);
        this.projectiles = new Array(0);
        this.turrets = new Array(0);
    }
    get enemies() { return this.wave_path.enemies; }
    PlayAnimation(anim, times_to_play = 1)
    {
        anim.times_to_play = times_to_play;
        this.animations.push(anim);
    }
    Update()
    {
        this.wave_path.Update();
        if (this.enemies.length > 0 && Input.mouseClick)
        {
            this.projectiles.push(create_bullet(sprites.bullet, 50, 2, 100, 600, this.enemies[0], trans(Input.mousePos)));
            //this.projectiles.push(create_rocket(sprites.rocket, animations.explosion_realistic, 30, 100, 400, this.enemies[0], trans(Input.mousePos)));
        }
        this.enemies.remove_if(e => {
            e.Update(this);
            return e.is_dead;
        });
        this.animations.remove_if(a => {
            a.Update(this);
            return a.times_played >= a.times_to_play;
        });
        this.projectiles.remove_if(p => {
            p.Update(this);
            return p.target_reached;
        });
        this.turrets.remove_if(t => {
            t.Update(this);
            return false;
        });
    }
    Render()
    {
        this.background_sprite.Render();
        this.path.Render();
        this.wave_path.enemies.forEach(e => { e.Render(); })
        this.animations.forEach(a => { a.Render(); })
        this.projectiles.forEach(p => { p.Render(); })
        this.turrets.forEach(t => { t.Render(); })
    }
    Reset()
    {
        this.wave_path.Reset();
    }
}

let current_level = new GameManager(sprites.grass, new Path(sprites.track, new KillableEntity(10000, trans(vec(625, 540))), vec(0, 100), vec(650, 100), vec(650, 290), vec(155, 290), vec(155, 450), vec(625, 450)), 
[wave(.5, wasp_factory.Create[4], 2)]);
// [wave(3), wave(.5, wasp_factory.Create[4], 3), wave(3), wave(.5, spider_factory.Create[0], 10), wave(3), wave(.5, spider_factory.Create[0], 10)]);

function Start()
{
    sprites.grass.transform.scale = 1.2;
    sprites.grass.top_position = vec(0, 0);
    sprites.track.top_position = vec(0, 0);
}

function Update()
{
    current_level.Update();
}

function Render()
{
    current_level.Render();
}

let lastRender = 0;
function loop(elapsed)
{
    Time.unscaledDeltaTime = Math.min(0.05, (elapsed - lastRender) / 1000);
    Time.deltaTime = Time.unscaledDeltaTime * Time.timeScale;
    lastRender = elapsed;
    context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
    Update();
    Render();
    Input.mouseClick = false;
    window.requestAnimationFrame(loop);
}

canvas.addEventListener("click", e => { Input.mouseClick = true; });
canvas.addEventListener("mousemove", e =>
{
    let rect = canvas.getBoundingClientRect();
    Input.mousePos = vec(e.clientX - rect.left, e.clientY - rect.top);
});

window.onload = function()
{
    Start();
    window.requestAnimationFrame(loop);
}