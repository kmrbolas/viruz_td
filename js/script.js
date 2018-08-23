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
function wave(delay, create_enemy = null, count = 1)
{
    return { delay: delay, create_enemy: create_enemy, count: count };
}
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
function RenderLine(color, lineWidth, origin, first, ...next)
{
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(origin.x, origin.y);
    context.lineTo(first.x, first.y);
    next.forEach(pos => { context.lineTo(pos.x, pos.y); });
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
let Time =
{
    deltaTime: 0,
    unscaledDeltaTime: 0,
    timeScale: 1,
}
const Input =
{
    mouseClick: false,
    mousePos: vec(0, 0),
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
        return position.x >= this.position.x && position.x <= this.right && position.y >= this.y && position.y <= this.bottom;
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
function rectangle(x, y, w, h) { return new Rectangle2D(vec(x, y), vec(w, h)); }
function circle(cx, cy, r) { return new Circle2D(vec(cx, cy), r); }
class Path
{
    constructor(core, origin, ...positions)
    {
        this.core = core;
        this.origin = origin;
        this.positions = positions;
        this.positions.push(core.position);
    }
    GetDestinationByIndex(index)
    {
        return this.positions[Math.clamp(index, 0, this.positions.length - 1)];
    }
}
class EntityManager
{
    constructor(...entities)
    {
        this.entities = Array(0);
        this.enabled_entities = Array(0);
        this.AddEntities(...entities);
    }
    AddEntity(entity)
    {
        if (this.entities.find(e => { return e === entity; }) !== undefined)
            return;
        entity.Release();
        entity.manager = this;
        this.entities.push(entity);
    }
    AddEntities(...entities)
    {
        entities.forEach(e => { this.AddEntity(e); });
    }
    RemoveEntity(entity)
    {
        this.entities.remove_if(e => {
            if (e === entity)
            {
                e.manager = null;
                return true;
            }
            return false;
        })
    }
    RemoveEntities(...entities)
    {
        entities.forEach(e => { this.RemoveEntity(e); });
    }
    OverlapCircle(c, callback = e => { return true; })
    {
        return this.enabled_entities.filter(e => {
            return (e instanceof Entity) && Vector2.distance(e.position, c.center_position) <= c.radius && callback(e);
        });
    }
    Update()
    {
        this.enabled_entities = this.entities.filter(e => { return e.enabled; });
        this.enabled_entities.forEach(e => { e.Update(); });
    }
    Render()
    {
        let entities = this.enabled_entities.sort((a, b) => { return a.render_layer - b.render_layer; });
        entities.forEach(e => { e.Render(); });
    }
    Release()
    {
        this.RemoveEntities(...this.entities);
        this.enabled_entities = this.entities;
    }

}
class Entity
{
    constructor(position = vec(0, 0), rotation = 0, scale = 1, render_layer = 0, enabled = true)
    {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.render_layer = render_layer;
        this.enabled = enabled;
    }
    get transform()
    {
        return { position: this.position, rotation: this.rotation, scale: this.scale };
    }
    set transform(value)
    {
        this.position = value.position;
        this.rotation = value.rotation;
        this.scale = value.scale;
    }
    Release() { if (this.manager != null) this.manager.RemoveEntity(this); }
    Update() {  }
    Render() {  }
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
class Sprite extends Entity
{
    constructor(path)
    {
        super();
        this.image = new Image();
        this.image.src = path;
    }
    get size() { return vec(this.image.width, this.image.height); }
    set size(value)
    {
        this.image.width = value.x;
        this.image.height = value.y;
    }
    Render()
    {
        context.save();
        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation);
        let size = vec(this.image.width * this.scale, this.image.height * this.scale);
        context.drawImage(this.image, -size.x / 2, -size.y / 2, size.x, size.y);
        context.restore();
    }
    static CreateArray(...images)
    {
        let result = new Array(0);
        images.forEach(t => { result.push(new Sprite(t)); });
        return result;
    }
}
class Timer extends Entity
{
    constructor(delay, OnTimerTick = null)
    {
        super();
        this.delay = delay;
        this.elapsed = 0;
        if (OnTimerTick != null)
            this.OnTimerTick = OnTimerTick;
    }
    get rate() { return 1 / this.delay; }
    set rate(value) { this.delay = 1 / value; }
    OnTimerTick()
    {
        this.Release();
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
class Animation extends Timer
{
    constructor(rate, ...sprites)
    {
        super(1 / rate);
        this.sprites = sprites;
        this.current_index = 0;
    }
    get copy() { return new Animation(this.rate, ...this.sprites); }
    get current_sprite() { return this.sprites[this.current_index]; }
    OnTimerTick()
    {
        if (++this.current_index == this.sprites.length)
            this.Release();
        this.current_index %= this.sprites.length;
    }
    Render()
    {
        this.current_sprite.transform = this.transform;
        this.current_sprite.Render(this.position, this.rotation, this.scale);
    }
    RenderUpdate()
    {
        this.Render();
        this.Update();
    }

}
class KillableEntity extends Entity
{
    constructor(max_life, position = vec(0, 0), rotation = 0, render_layer = 0)
    {
        super(position, rotation, render_layer);
        this.max_life = max_life;
        this._life = max_life;
    }
    get life() { return this._life; }
    set life(value)
    {
        value = Math.clamp(value, 0, this.max_life);
        if (this._life === value)
            return;
        this.OnLifeChanged(value);
        this._life = value;
        if (this._life === 0)
            this.OnDeath();
    }
    get is_alive() { return this.life > 0; }
    get is_dead() { return !this.is_alive; }
    OnLifeChanged(value) {  }
    OnDeath() { this.Release(); }
    Render()
    {
        super.Render();
        this.RenderLifeBar();
    }
    RenderLifeBar(offset = 30, r = rectangle(0, 0, 25, 5), text = false)
    {
        r.center = this.position;
        r.center = Vector2.sub(r.center, vec(0, offset));
        r.RenderLifeBar(this.life, this.max_life);
        if (!text)
            return;
        context.font= '10px sans-serif';
        context.fillStyle = "#000";
        context.fillText(this.life.toFixed(0), r.position.x, r.position.y + r.size.y - 2);
    }

}
class Enemy extends KillableEntity
{
    constructor(speed, max_life, path = null)
    {
        super(max_life, path == null ? vec(0, 0) : path.origin);
        this.speed = speed;
        this.traveled_distance = 0;
        this.current_index = 0;
        this.path = path;
        this.org = Math.random() * 30 - 15;
    }
    get turn_speed() { return this.speed / 30; }
    get destination()
    {
        return this.path == null ? this.position : this.path.GetDestinationByIndex(this.current_index);
    }
    get destination_direction()
    {
        return Vector2.sub(this.destination, this.position).normalized;
    }
    get core_reached()
    {
        return this.path == null || this.path.positions.length == this.current_index;
    }
    Update()
    {
        if (this.core_reached)
            return this.OnReachCore(this.path.core);
        let dest = this.destination;
        let perp = this.destination_direction.perp.mult(this.org);
        dest = Vector2.add(dest, perp);
        let delta = this.speed * Time.deltaTime;
        this.traveled_distance += delta;
        this.MoveTo(dest, delta);
        this.FaceTo(dest, this.turn_speed * Time.deltaTime);
        if (Vector2.distance(this.position, dest) <= 15 + delta)
        {
            this.current_index++;
            this.org = -this.org;
        }

    }
    OnReachCore(core)
    {
        core.life -= this.life;
        this.life = 0;
    }
    Render()
    {
        let r = rectangle(0, 0, 25, 25);
        r.center = this.position;
        r.Render("#F00");
        this.RenderLifeBar();
    }
    SpawnAdjacent(...to_spawn)
    {
        let d = this.destination_direction.perp;
        let s = 1;
        to_spawn.forEach(e => {
            e.traveled_distance = this.traveled_distance;
            e.rotation = this.rotation;
            e.current_index = this.current_index;
            let delta = Math.random() * 10 + 15;
            delta *= s;
            s *= -1;
            e.position = Vector2.add(this.position, d.mult(delta));
        })
        this.manager.AddEntities(...to_spawn);
    }
}
class AnimEnemy extends Enemy
{
    constructor(anim, scale, speed, max_life, path = null)
    {
        super(speed, max_life, path);
        this.anim = anim.copy;
        this.scale = scale;
    }
    Update()
    {
        this.anim.Update();
        super.Update();
    }
    Render()
    {
        this.anim.transform = this.transform;
        this.anim.Render();
        this.RenderLifeBar();
    }
    OnDeath()
    {
        let ex = animations.explosion.copy;
        ex.position = this.position;
        this.manager.AddEntity(ex);
        super.OnDeath();
    }

}
let sprites =
{
    spider:[Sprite.CreateArray("images/enemies/Spider/spider_d_0.png", "images/enemies/Spider/spider_d_1.png", "images/enemies/Spider/spider_d_2.png", "images/enemies/Spider/spider_d_3.png"),
            Sprite.CreateArray("images/enemies/Spider/spider_c_0.png", "images/enemies/Spider/spider_c_1.png", "images/enemies/Spider/spider_c_2.png", "images/enemies/Spider/spider_c_3.png"),
            Sprite.CreateArray("images/enemies/Spider/spider_b_0.png", "images/enemies/Spider/spider_b_1.png", "images/enemies/Spider/spider_b_2.png", "images/enemies/Spider/spider_b_3.png"),
            Sprite.CreateArray("images/enemies/Spider/spider_a_0.png", "images/enemies/Spider/spider_a_1.png", "images/enemies/Spider/spider_a_2.png", "images/enemies/Spider/spider_a_3.png"),
            Sprite.CreateArray("images/enemies/Spider/spider_a_0.png", "images/enemies/Spider/spider_b_1.png", "images/enemies/Spider/spider_c_2.png", "images/enemies/Spider/spider_d_3.png")],
    beetle:[Sprite.CreateArray("images/enemies/Bettle/beetle_d_0.png", "images/enemies/Bettle/beetle_d_1.png"),
            Sprite.CreateArray("images/enemies/Bettle/beetle_c_0.png", "images/enemies/Bettle/beetle_c_1.png"),
            Sprite.CreateArray("images/enemies/Bettle/beetle_b_0.png", "images/enemies/Bettle/beetle_b_1.png"),
            Sprite.CreateArray("images/enemies/Bettle/beetle_a_0.png", "images/enemies/Bettle/beetle_a_1.png"),
            Sprite.CreateArray("images/enemies/Bettle/beetle_d_0.png", "images/enemies/Bettle/beetle_c_1.png", "images/enemies/Bettle/beetle_b_0.png", "images/enemies/Bettle/beetle_a_1.png")],
    machine_gun: Sprite.CreateArray("images/turrets/Machine_Gun/machine_gun_0.png", "images/turrets/Machine_Gun/machine_gun_1.png", "images/turrets/Machine_Gun/machine_gun_2.png", "images/turrets/Machine_Gun/machine_gun_enabled.png", "images/turrets/Machine_Gun/machine_gun_disabled.png"),
    anti_air: Sprite.CreateArray("images/turrets/antiair/0.png", "images/turrets/antiair/0.png"),
    rocket: new Sprite("images/projectiles/rocket/0.png"),
    bullet: new Sprite("images/projectiles/bullet/0.png"),
    explosion: Sprite.CreateArray("images/effects/tile000.png", "images/effects/tile001.png", "images/effects/tile002.png", "images/effects/tile003.png","images/effects/tile004.png"),
    explosion_realistic: Sprite.CreateArray("images/effects/realexplosion/1.png",
                                            "images/effects/realexplosion/2.png",
                                            "images/effects/realexplosion/3.png",
                                            "images/effects/realexplosion/4.png",
                                            "images/effects/realexplosion/5.png",
                                            "images/effects/realexplosion/6.png",
                                            "images/effects/realexplosion/7.png",
                                            "images/effects/realexplosion/8.png",
                                            "images/effects/realexplosion/9.png",
                                            "images/effects/realexplosion/10.png",
                                            "images/effects/realexplosion/11.png",
                                            "images/effects/realexplosion/12.png",
                                            "images/effects/realexplosion/13.png",
                                            "images/effects/realexplosion/14.png",
                                            "images/effects/realexplosion/15.png",
                                            "images/effects/realexplosion/16.png",
                                            "images/effects/realexplosion/17.png",
                                            "images/effects/realexplosion/18.png",
                                            "images/effects/realexplosion/19.png",
                                            "images/effects/realexplosion/20.png",
                                            "images/effects/realexplosion/21.png",
                                            "images/effects/realexplosion/22.png",
                                            "images/effects/realexplosion/23.png",
                                            "images/effects/realexplosion/24.png",
                                            "images/effects/realexplosion/25.png",
                                            "images/effects/realexplosion/26.png"),
    track: new Sprite("images/background/Track01.png"),
}
let animations =
{
    spider:[new Animation(12, ...sprites.spider[0]),
            new Animation(12, ...sprites.spider[1]),
            new Animation(12, ...sprites.spider[2]),
            new Animation(12, ...sprites.spider[3]),
            new Animation(12, ...sprites.spider[4])],
    beetle:[new Animation(12, ...sprites.beetle[0]),
            new Animation(12, ...sprites.beetle[1]),
            new Animation(12, ...sprites.beetle[2]),
            new Animation(12, ...sprites.beetle[3]),
            new Animation(12, ...sprites.beetle[4])],
    machine_gun: new Animation(12, ...sprites.machine_gun),
    anti_air: new Animation(12, ...sprites.anti_air),
    explosion: new Animation(30, ...sprites.explosion),
    explosion_realistic: new Animation(30, ...sprites.explosion_realistic),
}
class EnemyFactory
{
    constructor(anims, base_scale, base_speed, base_life)
    {
        this.anims = anims;
        this.base_scale = base_scale;
        this.base_speed = base_speed;
        this.base_life = base_life;
        this.Create = [ this.CreateByRank.bind(this, 0),
                        this.CreateByRank.bind(this, 1),
                        this.CreateByRank.bind(this, 2),
                        this.CreateByRank.bind(this, 3),
                        this.CreateByRank.bind(this, 4)];
    }
    CreateByRank(rank, path = null)
    {
        let e = new AnimEnemy(this.anims[rank], this.base_scale + .1 * rank, this.base_speed * Math.pow(.9, rank), this.base_life * Math.pow(2, rank), path);
        e.factory = this;
        e.rank = rank;
        if (rank == 2 || rank == 3)
        {
            e.OnDeath = function()
            {
                this.SpawnAdjacent(this.factory.CreateByRank(this.rank - 1, this.path), this.factory.CreateByRank(this.rank - 1, this.path));
                this.Release();
            }
        }
        return e;
    }
}
class Projectile extends Entity
{
    constructor(target, speed, position = vec(0, 0), rotation = 0, scale = 1, render_layer = 0)
    {
        super(position, rotation, scale, render_layer);
        this.target = target;
        this.speed = speed;
    }
    Update()
    {
        this.FaceTo(this.target.position);
        this.MoveTo(this.target.position, this.speed * Time.deltaTime);
        if (Vector2.distance(this.position, this.target.position) <= this.speed * Time.deltaTime)
            this.OnHit();
    }
    Render()
    {
        new Circle2D(this.position, 5).Render("#FF0");
    }
    OnHit() { this.Release(); }

}
class Bullet extends Projectile
{
    constructor(target, damage, speed, position = vec(0, 0), rotation = 0, scale = 1)
    {
        super(target, speed, position, rotation, scale, 6);
        this.damage = damage;
    }
    OnHit()
    {
        this.target.life -= this.damage;
        super.OnHit();
    }
    Render()
    {
        sprites.bullet.transform = this.transform;
        sprites.bullet.Render();
    }
}
class Rocket extends Projectile
{
    constructor(target, damage, aoe, speed, position = vec(0, 0), rotation = 0)
    {
        super(target, speed, position, rotation);
        this.damage = damage;
        this.aoe = aoe;
    }
    OnHit()
    {
        let enemies = this.manager.OverlapCircle(new Circle2D(this.target.position, this.aoe), e => {
            return e instanceof Enemy;
        });
        enemies.forEach(e => {
            e.life -= this.damage;
        });
        let ex = animations.explosion_realistic.copy;
        ex.position = this.target.position;
        ex.scale = this.aoe / 50;
        this.manager.AddEntity(ex);
        this.Release();
    }
    Render()
    {
        sprites.rocket.transform = this.transform;
        sprites.rocket.Render();
    }
}
class Turret extends Entity
{
    constructor(speed, range, fov, position)
    {
        super(position, 0, 5);
        this.range = range;
        this.fov = fov;
        this.targets = Array(0);
        this.timer = new Timer(1 / speed, () => { if (this.targets.length > 0) this.Shoot(); });
    }
    get speed() { return this.timer.rate; }
    set speed(value) { this.timer.rate = value; }
    get bullet_speed() { return this.speed * 50; }
    get bullet_position() { return this.position; }
    create_bullet(target, speed, position, angle) { return new Projectile(target, speed, position, angle); }
    Shoot()
    {
        let target = this.targets[0];
        let angle = Vector2.sub(target.position, this.bullet_position).angle;
        this.manager.AddEntity(this.create_bullet(target, this.bullet_speed, this.bullet_position, angle));
    }
    UpdateRotation()
    {
        if (this.targets.length > 0)
            this.FaceTo(this.targets[0].position, 10 * Time.deltaTime);
    }
    UpdateTargets()
    {
        this.targets = this.manager.OverlapCircle(new Circle2D(this.position, this.range), e => { return e instanceof Enemy; });
        this.targets = this.targets.sort((a, b) => { return b.traveled_distance - a.traveled_distance; });
    }
    Update()
    {
        this.UpdateTargets();
        this.UpdateRotation();
        this.targets.remove_if(e => { return Vector2.sub(e.position, this.position).normalized.distance(Vector2.angleVector(this.rotation)) > this.fov / 2; });
        this.timer.Update();
    }
    RenderRange(color = "#F00")
    {
        let d = this.fov / 2;
        let a1 = this.rotation - d;
        let a2 = this.rotation + d;
        let dir1 = Vector2.angleVector(a1).mult(this.range).add(this.position);
        let dir2 = Vector2.angleVector(a2).mult(this.range).add(this.position);
        RenderLine(color, 1, dir1, this.position, dir2);
        let c = new Circle2D(this.position, this.range);
        c.RenderBorder(color, 1, a1, a2);
    }
}
class MachineGun extends Turret
{
    static get enabled_sprite() { return sprites.machine_gun[3]; }
    static get disabled_sprite() { return sprites.machine_gun[4]; }
    constructor(damage, speed, range, fov, position)
    {
        super(speed, range, fov, position)
        this.damage = damage;
        this.left = false;
        this.sprite = sprites.machine_gun[0];
        this.scale = .5;
    }
    get bullet_position()
    {
        let a = this.left ? -.5 : .5;
        return Vector2.add(this.position, Vector2.angleVector(this.rotation + a).mult(30 * this.scale));
    }
    create_bullet(target, speed, position, angle)
    {
        return new Bullet(target, this.damage, speed, position, angle);
    }
    Shoot()
    {
        this.left = !this.left;
        this.sprite = this.left ? sprites.machine_gun[1] : sprites.machine_gun[2];
        super.Shoot();
    }
    Render()
    {
        if (this.targets.length == 0) this.sprite = sprites.machine_gun[0];
        this.sprite.transform = this.transform;
        this.sprite.Render(this.position, this.rotation, this.scale);
    }

}
class RocketLauncher extends Turret
{
    constructor(damage, aoe, speed, range, fov, position)
    {
        super(speed, range, fov, position)
        this.damage = damage;
        this.aoe = aoe;
        this.sprite = sprites.anti_air[0];
        this.left = false;
        this.scale = .5;
    }
    get bullet_speed() { return this.speed * 200; }
    create_bullet(target, speed, position, angle)
    {
        return new Rocket(target, this.damage, this.aoe, speed, position, angle);
    }
    Shoot()
    {
        this.sprite = sprites.anti_air[1];
        super.Shoot();
    }
    UpdateTargets()
    {
        super.UpdateTargets();
        this.targets = this.targets.sort((a, b) => {
            let a1 = this.manager.OverlapCircle(new Circle2D(a.position, this.aoe), e => { return e instanceof Enemy; });
            let b1 = this.manager.OverlapCircle(new Circle2D(b.position, this.aoe), e => { return e instanceof Enemy; });
            return b1.length - a1.length;
        });
    }
    Render()
    {
        if (this.targets.length == 0) this.sprite = sprites.anti_air[0];
        this.sprite.transform = this.transform;
        this.sprite.Render(this.position, this.rotation, this.scale);
    }
}
class GameMap extends Entity
{
    constructor(background_sprite, paths, waves)
    {
        this.background_sprite = background_sprite;
        this.paths = paths;
        this.waves = waves;
    }
    Render()
    {
        this.background_sprite.position = this.background_sprite.size.div(mult);
        this.background_sprite.Render();
    }

}

let spider_factory = new EnemyFactory(animations.spider, .4, 180, 100);
let beetle_factory = new EnemyFactory(animations.beetle, .3, 130, 140);

let level_manager = new EntityManager(map1.core);

function ValidPosition(map, manager, position)
{
    let positions = new Array(map.path.origin);
    map.path.positions.forEach(pos => { positions.push(pos); });
    for (let i = 0; i < positions.length; i++)
        if (Vector2.distance(positions[i], position) < 50)
            return false;
    for (let i = 0; i + 1 < positions.length; i++) {
        const v1 = positions[i];
        const v2 = positions[i + 1];
        let d = position.add(v1.sub(v2).perp.normalized);
        let v = IntersectLines(v1, v2, position, d);
        if (v.x < 0 || v.x > 1)
            continue;
        if (MinDistanceFromPointToLine(v1, v2, position) < 50)
            return false;
    }
    let turrets = manager.OverlapCircle(new Circle2D(position, 40), t => { return t instanceof Turret; });
    return turrets.length > 0;
}

let turret_sprite = sprites.machine_gun[4];

function Update()
{
    let valid = ValidPosition(map1, level_manager, Input.mousePos);
    turret_sprite = valid ? MachineGun.enabled_sprite : MachineGun.disabled_sprite;
    if (Input.mouseClick && valid)
        level_manager.AddEntity(new MachineGun(50, 10, 230, .4, Input.mousePos));
    level_manager.Update();
}

function Render()
{
    sprites.track.position = sprites.track.size.div(2);
    sprites.track.Render();
    level_manager.Render();
    rectangle(0, 0, 800, 600).RenderBorder("#000", 1);
    turret_sprite.position = Input.mousePos;
    turret_sprite.scale = .5;
    turret_sprite.Render();
}

context.clear = function() { this.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight); }

let lastRender = 0;
function loop(elapsed)
{
    Time.unscaledDeltaTime = Math.min(0.05, (elapsed - lastRender) / 1000);
    Time.deltaTime = Time.unscaledDeltaTime * Time.timeScale;
    lastRender = elapsed;
    context.clear();
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

window.requestAnimationFrame(loop);