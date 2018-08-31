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
function vec(x, y) { return new Vector2(x, y); }
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
let Player =
{
    level: 0,
    gold: 200,
}
class Transform
{
    constructor(position = vec(0, 0), rotation = 0, scale = 1)
    {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.back = Array(0);
    }
    get copy() { return new Transform(this.position, this.rotation, this.scale); }
    set(value)
    {
        this.position = value.position;
        this.rotation = value.rotation;
        this.scale = value.scale;
    }
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
    push() { this.back.push(this.copy); }
    pop() { this.set(this.back.pop()); }
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
    wasp: Animation.CreateArray(30, sprites.wasp),
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
    SpawnAdjacent(manager, to_spawn, d = (Math.random() - .5) * 2 * (Math.random() * 30 + 10))
    {
        to_spawn.transform.position = Vector2.angleVector(this.transform.rotation).perp.mult(d).add(this.transform.position);
        to_spawn.transform.rotation = this.transform.rotation;
        to_spawn.traveled_distance = this.traveled_distance;
        to_spawn.path_index = this.path_index;
        manager.enemies.push(to_spawn);
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
        // this.RenderLifeBar();
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
let wasp_factory = new EnemyFactory(animations.wasp, .3, 100, 125, 1);
class Projectile extends Transformable
{
    constructor(aoe, speed, target, transform = new Transform())
    {
        super(transform);
        this.aoe = aoe;
        this.speed = speed;
        this.target = target;
        this.target_reached = false;
        this.game_manager = null;
    }
    Update(game_manager)
    {
        this.game_manager = game_manager;
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
            this.OnHit(targets);
        }
    }
    Render()
    {
        RenderRectangleFilled("#F00", this.transform.position, vec(25, 25));
    }
    OnHit(targets)
    {

    }

}
class Bullet extends Projectile
{
    constructor(sprite, damage, chains_number, aoe, speed, target, transform = new Transform())
    {
        super(aoe, speed, target, transform);
        this.sprite = sprite;
        this.damage = damage;
        this.chains_number = chains_number;
    }
    Render()
    {
        this.sprite.transform = this.transform;
        this.sprite.Render();
    }
    OnHit(targets)
    {
        targets[0].life -= this.damage;
        if (targets.length == 1 || this.chains_number == 0)
            return;
        this.target = targets[1];
        this.chains_number--;
        this.target_reached = false;
    }
}
class Rocket extends Projectile
{
    constructor(sprite, explosion, damage, aoe, speed, target, transform)
    {
        super(aoe, speed, target, transform);
        this.sprite = sprite;
        this.explosion = explosion;
        this.damage = damage;
    }
    Render()
    {
        this.sprite.transform = this.transform;
        this.sprite.Render();
    }
    OnHit(targets)
    {
        targets.forEach(t => { t.life -= this.damage; });
        let ex = this.explosion.copy;
        ex.opacity = .8;
        ex.transform = this.transform;
        ex.transform.scale = this.aoe / 60;
        this.game_manager.PlayAnimation(ex);
    }
}
class Turret extends Transformable
{
    constructor(fire_rate, range, fov, transform = new Transform())
    {
        super(transform);
        this.timer = new Timer(1 / fire_rate, this.OnTimerTick.bind(this));
        this.range = range;
        this.fov = fov * Math.PI / 180;
        this.manager = null;
        this.targets = Array(0);
        this.targets_in_range = Array(0);
    }
    get fire_rate() { return this.timer.frequency; }
    set fire_rate(value) { this.timer.frequency = value; }
    get target() { return this.targets_in_range[0]; }
    Shoot()
    {

    }
    UpdateTargets()
    {
        this.targets_in_range = this.manager.enemies.filter(e => { return Vector2.distance(e.transform.position, this.transform.position) <= this.range; });
        this.targets_in_range = this.targets_in_range.sort((a, b) => { return b.traveled_distance - a.traveled_distance; });
    }
    UpdateTargetsInRange()
    {
        this.targets = this.targets_in_range.filter(t => { return Vector2.sub(t.transform.position, this.transform.position).normalized.distance(Vector2.angleVector(this.transform.rotation)) <= this.fov / 2; });
    }
    UpdateRotation()
    {
        this.transform.FaceTo(this.targets_in_range[0].transform.position, 10 * Time.deltaTime);
    }
    Update(manager)
    {
        this.manager = manager;
        this.UpdateTargets();
        this.UpdateTargetsInRange();
        this.timer.Update();
        if (this.targets_in_range.length == 0)
            return;
        this.UpdateRotation();
    }
    OnTimerTick()
    {
        if (this.targets.length > 0)
            this.Shoot();
        else
            this.timer.elapsed = this.timer.delay;
    }
    RenderRange(color = "#000")
    {
        let d = this.fov / 2;
        let a1 = this.rotation - d;
        let a2 = this.rotation + d;
        let dir1 = Vector2.angleVector(a1).mult(this.range).add(this.transform.position);
        let dir2 = Vector2.angleVector(a2).mult(this.range).add(this.transform.position);
        RenderLines(color, 1, dir1, this.transform.position, dir2);
        let c = new Circle2D(this.transform.position, this.range);
        context.save();
        context.globalAlpha = .5;
        c.Render("#FFF", color);
        context.restore();
    }
}
class MachineGun extends Turret
{
    constructor(sprites, create_bullet, fire_rate, range, fov, transform)
    {
        super(fire_rate, range, fov, transform);
        this.sprites = sprites;
        this.create_bullet = create_bullet;
        this.left = false;
    }
    get bullet_position()
    {
        return Vector2.add(this.transform.position, Vector2.angleVector(this.transform.rotation + (this.left ? -.5 : .5)).mult(30 * this.transform.scale));
    }
    Shoot()
    {
        this.left = !this.left;
        this.sprite = this.left ? sprites.machine_gun[1] : sprites.machine_gun[2];
        this.manager.projectiles.push(this.create_bullet());
    }
    Render()
    {
        if (this.targets.length == 0) this.sprite = sprites.machine_gun[0];
        this.sprite.transform = this.transform;
        this.sprite.Render();
    }

}
class RocketLauncher extends Turret
{
    constructor(create_bullet, aoe, fire_rate, range, fov, position)
    {
        super(fire_rate, range, fov, position)
        this.create_bullet = create_bullet;
        this.aoe = aoe;
        this.sprite = sprites.rocket_launcher[0];
        this.left = false;
        this.scale = .5;
    }
    get bullet_position() { return this.transform.position.add(Vector2.angleVector(this.transform.rotation).mult(this.transform.scale * 50)); }
    Shoot()
    {
        this.manager.AddEntity(this.create_bullet());
    }
    UpdateTargets()
    {
        super.UpdateTargets();
        this.targets = this.targets.sort((a, b) => {
            let a1 = this.manager.enemies.filter(e => { return e !== this.target && Vector2.distance(e.transform.position, a.transform.position) <= this.aoe; });
            let b1 = this.manager.enemies.filter(e => { return e !== this.target && Vector2.distance(e.transform.position, b.transform.position) <= this.aoe; });
            return b1.length - a1.length;
        });
    }
    Render()
    {
        this.sprite.transform = this.transform;
        if (this.targets.length > 0)
            this.sprite.position = this.position.add(Vector2.angleVector(this.rotation).mult(((this.delay - this.to_tick) / this.delay) * 10 ));
        this.sprite.Render(this.position, this.rotation, this.scale);
    }
}
class BasicTurret extends Turret
{
    constructor(base_sprite, cannon_sprite, fire_rate, range, fov, transform = new Transform())
    {
        super(fire_rate, range, fov, transform);
        this.base_sprite = base_sprite;
        this.cannon_sprite = cannon_sprite;
    }
    Update(manager)
    {
        super.Update(manager);
    }
    Render()
    {
        this.base_sprite.transform = this.transform;
        this.base_sprite.transform.rotation = 0;
        this.cannon_sprite.transform = this.transform;
        if (this.targets.length > 0)
            this.cannon_sprite.transform.position = this.transform.position.add(Vector2.angleVector(this.transform.rotation).mult(((this.timer.delay - this.timer.to_tick) / this.timer.delay) * 10 ));
        this.base_sprite.Render();
        this.cannon_sprite.Render();
    }

}
class TurretFactory
{
    constructor(cost, create, enabled_sprite, disabled_sprite)
    {
        this.cost = cost;
        this.create = create;
        this.enabled_sprite = enabled_sprite;
        this.disabled_sprite = disabled_sprite;
    }

}
class WaveSpawner extends Timer
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
        this.wave_spawner = new WaveSpawner(this.waves);
        this.animations = new Array(0);
        this.projectiles = new Array(0);
        this.turrets = new Array(0);
        this.turret_factory = null;
        this.selected = null;
    }
    get enemies() { return this.wave_spawner.enemies; }
    IsValidPosition(position, d = 50)
    {
        return this.turrets.filter(t => { return Vector2.distance(position, t.transform.position) <= d; }).length == 0 && !this.path.IsInside(position, d);
    }
    PlayAnimation(anim, times_to_play = 1)
    {
        anim.times_to_play = times_to_play;
        this.animations.push(anim);
    }
    Update()
    {
        this.wave_spawner.Update();
        if (Input.mouseClick && this.turret_factory != null && this.turret_factory.cost <= Player.gold && this.IsValidPosition(Input.mousePos))
        {
            Player.gold -= this.turret_factory.cost;
            this.turrets.push(this.turret_factory.create(Input.mousePos));
            this.turret_factory = null;
        }
        if (Input.mouseClick)
        {
            let s = this.turrets.filter(t => { return Vector2.distance(t.transform.position, Input.mousePos) <= 20; });
            this.selected = s.length > 0 ? s[0] : null;
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
    RenderUI()
    {
        RenderRectangleStroked("#000", 2, vec(0, 0), vec(800, 600));
        RenderRectangle("#FFF", "#000", 2, vec(0, 600), vec(1280, 120));
        RenderRectangle("#FFF", "#000", 2, vec(800, 0), vec(480, 720));
        RenderRectangle("#FFF", "#000", 2, vec(800, 0), vec(480, 200));
        if (this.selected == null)
            return;
        this.selected.transform.push();
        this.selected.transform.position = vec(1040, 100);
        this.selected.Render();
        this.selected.transform.pop();
    }
    Render()
    {
        this.background_sprite.Render();
        this.path.Render();
        this.wave_spawner.enemies.forEach(e => { e.Render(); });
        this.wave_spawner.enemies.forEach(e => { e.RenderLifeBar(); });
        this.animations.forEach(a => { a.Render(); });
        this.projectiles.forEach(p => { p.Render(); });
        this.turrets.forEach(t => { t.Render(); });
        this.RenderUI();
    }
    Reset()
    {
        this.wave_spawner.Reset();
    }
}
class Upgrade
{
    constructor(max_level)
    {
        this.max_level = max_level;
        this._level = 0;
    }
    get level() { return this._level; }
    set level(value) { this._level = Math.clamp(value, 0, this.max_level); }
    get maxed() { return this._level == this.max_level; }
}

let current_level = new GameManager(sprites.grass, new Path(sprites.track, new KillableEntity(10000, trans(vec(625, 540))), vec(0, 100), vec(650, 100), vec(650, 290), vec(155, 290), vec(155, 450), vec(625, 450)), 
[wave(.5, wasp_factory.Create[4], 2)]);
// [wave(3), wave(.5, wasp_factory.Create[4], 3), wave(3), wave(.5, spider_factory.Create[0], 10), wave(3), wave(.5, spider_factory.Create[0], 10)]);

let create_bullet = function() { return new Bullet(sprites.bullet, 50, 2, 50, 600, this.target, trans(this.bullet_position)); }
let machine_gun_factory = new TurretFactory(60, (position) => { return new MachineGun(sprites.machine_gun, create_bullet, 4, 200, 30, trans(position)); });
current_level.turret_factory = machine_gun_factory;

current_level.turrets.push(new BasicTurret(sprites.explosion[0], sprites.anti_air[0], 2, 600, 30, trans(vec(200, 200))));



function Start()
{
    sprites.grass.transform.scale = 1.2;
    sprites.grass.top_position = vec(0, 0);
    sprites.track.top_position = vec(0, 0);
    sprites.machine_gun.forEach(s => { s.img.width *= .5; s.img.height *= .5; });
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