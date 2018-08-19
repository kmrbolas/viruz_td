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
    
	static dot(v1, v2) { return v1.x * v2.x + v1.y + v2.y; }
    static cross(v1, v2) { return v1.x * v2.y - v1.y + v2.x; }
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

class Sprite
{
    constructor(path)
    {
        this.image = new Image();
        this.image.src = path;
    }

    Render(position, rotation, scale = 1)
    {
        context.save(); 
        context.translate(position.x, position.y);
        context.rotate(rotation);
        let size = vec(this.image.width * scale, this.image.height * scale);
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

class Path
{
    constructor(core, origin, ...positions)
    {
        this.core = core;
        this.origin = origin;
        this.positions = positions;
        this.positions.push(core.position);
        this.current_index = 0;
    }
    get copy()
    {
        let path = new Path(this.core, this.origin);
        path.positions = this.positions;
        path.current_index = this.current_index;
        return path;
    }
    get destination() { return this.positions[Math.clamp(this.current_index, 0, this.positions.length - 1)]; }
    get next_destination() { return this.positions[Math.clamp(this.current_index + 1, 0, this.positions.length - 1)]; }
    get core_reached() { return this.current_index == this.positions.length; }
    GetDirection(position, d = 1)
    {
        return Vector2.sub(this.destination, position).normalized.mult(d);
    }
    Next() { ++this.current_index; }

}

class BasicEntity
{
    constructor(render_layer = 0, enabled = true)
    {
        this.render_layer = render_layer;
        this.enabled = enabled;
        this.parent = null;
        this.manager = null;
    }
    Release() { if (this.manager != null) this.manager.RemoveEntity(this); }
    Update() {  }
    Render() {  }
}

class Timer extends BasicEntity
{
    constructor(delay, OnTimerTick = () => {  })
    {
        super();
        this.delay = delay;
        this.OnTimerTick = OnTimerTick;
        this.elapsed = 0;
    }

    get rate() { return 1 / this.delay; }
    set rate(value) { this.delay = 1 / value; }

    Update()
    {
        this.elapsed += Time.deltaTime;
        if (this.elapsed < this.delay)
            return;
        this.OnTimerTick();
        this.elapsed = 0;
    }

}

class Entity extends BasicEntity
{
    constructor(local_position = vec(0, 0), local_rotation = 0, render_layer = 0, enabled = true)
    {
        super(render_layer, enabled)
        this.local_position = local_position;
        this.local_rotation = local_rotation;
    }
    get position()
    {
        return this.parent == null ? this.local_position : Vector2.add(this.parent.position, this.local_position);
    }
    set position(value)
    {
        if (this.parent != null)
            value = Vector2.sub(value, this.parent.position);
        this.local_position = value;
    }
    get rotation()
    {
        return this.parent == null ? this.local_rotation : this.parent.rotation + this.local_rotation;
    }
    set rotation(value)
    {
        if (this.parent != null)
            value -= this.parent.rotation;
        this.local_rotation = value;
    }
    
    FaceTo(position, t = 1)
    {
        let dir = Vector2.sub(position, this.local_position).normalized;
        this.local_rotation = Vector2.angleVector(this.local_rotation).lerp(dir, t).angle;
    }
    MoveTo(position, amount)
    {
        let direction = Vector2.sub(position, this.local_position).normalized;
        this.local_position = Vector2.add(this.local_position, direction.mult(amount));
    }

}

class Animation extends Entity
{
    constructor(fps, ...sprites)
    {
        super();
        this.sprites = sprites;
        this.current_index = 0;
        let OnTimerTick = () => {
            if (++this.current_index == this.sprites.length)
                this.Release();
            this.current_index %= this.sprites.length;
        }
        this.timer = new Timer(1 / fps, OnTimerTick.bind(this));
    }
    get copy() { return new Animation(this.fps, ...this.sprites); }
    get fps() { return this.timer.rate; }
    set fps(value) { this.timer.rate = value; }
    get current_sprite() { return this.sprites[this.current_index]; }
    Update()
    {
        this.timer.Update();
    }
    Render()
    {
        this.current_sprite.Render(this.position, this.rotation, this.scale);
    }
    RenderUpdate()
    {
        this.Render();
        this.Update();
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
        // this.entities.sort((a, b) => { return a.layer > b.layer; });
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
        r.center = this.local_position;
        r.center = Vector2.sub(r.center, vec(0, offset));
        r.RenderLifeBar(this.life, this.max_life);
        if (!text)
            return;
        context.font= '10px sans-serif';
        context.fillStyle = "#000";
        context.fillText(this.life.toFixed(0), r.position.x, r.position.y + r.size.y - 2);
    }

}

class Bullet extends Entity
{
    constructor(target, speed, position = vec(0, 0), rotation = 0)
    {
        super(position, rotation);
        this.target = target;
        this.speed = speed;
    }
    Update()
    {
        this.FaceTo(this.target.position);
        this.MoveTo(this.target.position, this.speed * Time.deltaTime);
        if (Vector2.distance(this.local_position, this.target.position) <= this.speed * Time.deltaTime)
            this.OnHit();
    }
    Render()
    {
        new Circle2D(this.position, 5).Render("#FF0");
    }
    OnHit() { this.Release(); }
    
}

class Enemy extends KillableEntity
{
    constructor(speed, max_life, path = null)
    {
        super(max_life);
        this.speed = speed;
        this.traveled_distance = 0;
        this._path;
        this.path = path;
        this.org = Math.random() * 30 - 15;
    }
    get turn_speed() { return this.speed / 30; }
    get path() { return this._path; }
    set path(value)
    {
        this._path = value;
        if (this._path == null) return;
        this._path = this._path.copy;
        if (this.path.core_reached)
        {
            this.position = this.path.core.position;
            return;
        }
        this.local_position = this.path.origin;
        this.FaceTo(this.path.next_destination);
    }
    Update()
    {
        if (this.path.core_reached)
            return this.OnReachCore(this.path.core);
        let dest = this.path.destination;
        let perp = this.path.GetDirection(this.position).perp.mult(this.org);
        dest = Vector2.add(dest, perp);
        let delta = this.speed * Time.deltaTime;
        this.traveled_distance += delta;
        this.MoveTo(dest, delta);
        this.FaceTo(dest, this.turn_speed * Time.deltaTime);
        if (Vector2.distance(this.local_position, dest) <= 15 + delta)
        {
            this.path.Next();
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
        r.center = this.local_position;
        r.Render("#F00");
        this.RenderLifeBar();
    }
    SpawnAdjacent(...to_spawn)
    {
        let d = this.path.GetDirection(this.position).perp;
        let s = 1;
        to_spawn.forEach(e => {
            e.traveled_distance = this.traveled_distance;
            e.rotation = this.rotation;
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
        this.anim.parent = this;
        this.scale = scale;
    }

    Render()
    {
        this.anim.scale = this.scale;
        this.anim.RenderUpdate();
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

class SpiderD extends AnimEnemy { constructor(path = null) { super(animations.spider_d, .4, 180, 100, path); } }
class SpiderC extends AnimEnemy { constructor(path = null) { super(animations.spider_c, .6, 120, 150, path); } }
class SpiderB extends AnimEnemy
{
    constructor(path = null)
    {
        super(animations.spider_b, .7, 100, 180, path);
    }
    OnDeath()
    {
        this.SpawnAdjacent(new SpiderC(this.path), new SpiderC(this.path));
        super.OnDeath();
    }
}
class SpiderA extends AnimEnemy
{
    constructor(path = null)
    {
        super(animations.spider_a, .7, 90, 250, path);
    }
    OnDeath()
    {
        this.SpawnAdjacent(new SpiderB(this.path), new SpiderB(this.path));
        super.OnDeath();
    }
}

let sprites = 
{
    spider_d: Sprite.CreateArray("images/enemies/Spider/spider_d_0.png", "images/enemies/Spider/spider_d_1.png", "images/enemies/Spider/spider_d_2.png", "images/enemies/Spider/spider_d_3.png"),
    spider_c: Sprite.CreateArray("images/enemies/Spider/spider_c_0.png", "images/enemies/Spider/spider_c_1.png", "images/enemies/Spider/spider_c_2.png", "images/enemies/Spider/spider_c_3.png"),
    spider_b: Sprite.CreateArray("images/enemies/Spider/spider_b_0.png", "images/enemies/Spider/spider_b_1.png", "images/enemies/Spider/spider_b_2.png", "images/enemies/Spider/spider_b_3.png"),
    spider_a: Sprite.CreateArray("images/enemies/Spider/spider_a_0.png", "images/enemies/Spider/spider_a_1.png", "images/enemies/Spider/spider_a_2.png", "images/enemies/Spider/spider_a_3.png"),
    spider_s: Sprite.CreateArray("images/enemies/Spider/spider_a_0.png", "images/enemies/Spider/spider_b_1.png", "images/enemies/Spider/spider_c_2.png", "images/enemies/Spider/spider_d_3.png"),
    machine_gun: Sprite.CreateArray("images/turrets/Machine_Gun/machine_gun_0.png", "images/turrets/Machine_Gun/machine_gun_1.png", "images/turrets/Machine_Gun/machine_gun_2.png", "images/turrets/Machine_Gun/machine_gun_disabled.png"),
    explosion: Sprite.CreateArray("images/effects/tile000.png", "images/effects/tile001.png", "images/effects/tile002.png", "images/effects/tile003.png","images/effects/tile004.png"),
    track: new Sprite("images/background/Track01.png"),
}

let animations =
{
    spider_d: new Animation(12, ...sprites.spider_d),
    spider_c: new Animation(12, ...sprites.spider_c),
    spider_b: new Animation(12, ...sprites.spider_b),
    spider_a: new Animation(12, ...sprites.spider_a),
    spider_s: new Animation(12, ...sprites.spider_s),
    machine_gun: new Animation(12, ...sprites.machine_gun),
    explosion: new Animation(30, ...sprites.explosion),
}

let create_enemy = 
{
    spider_d(path) { return new SpiderD(path); },
    spider_c(path) { return new SpiderC(path); },
    spider_b(path) { return new SpiderB(path); },
    spider_a(path) { return new SpiderA(path); },
}

let map1 = 
{
    core: new KillableEntity(10000, vec(624, 540)),
    path: null
}

map1.path = new Path(map1.core, vec(0, 100), vec(650, 100), vec(650, 289), vec(156, 293), vec(158, 444), vec(624, 449));

map1.core.OnLifeChanged = value => { console.log("core hp: " + value); }
map1.core.OnDeath = () => { console.log("you lose playboy."); }

class MachineGun extends Entity
{
    constructor(range, damage, fireRate, position, bulletSpeed = 700)
    {
        super(position);
        this.render_layer = 5;
        this.anim = animations.machine_gun.copy;
        this.anim.parent = this;
        this.range = range;
        this.damage = damage;
        this.bulletSpeed = bulletSpeed;
        this.left = false;
        this.timer = new Timer(1 / fireRate, this.Shoot.bind(this));
        this.scale = 1;
        this.target = null;
    }
    get scale() { return this.anim.scale; }
    set scale(value) { this.anim.scale = value; }
    get fireRate() { return this.timer.rate; }
    set fireRate(value) { this.timer.rate = value; }

    Shoot()
    {
        if (this.target == null)
        {
            this.anim.current_index = 0;
            return;
        }
        let dir = Vector2.sub(this.target.position, this.position).normalized;
        if (Vector2.distance(dir, Vector2.angleVector(this.rotation)) > .4)
            return;
        this.left = !this.left;
        this.anim.current_index = this.left ? 1 : 2;
        let a = this.left ? -.4 : .4;
        let origin = Vector2.add(this.local_position, Vector2.angleVector(this.local_rotation + a).mult(30 * this.scale));
        let b = new Bullet(this.target, this.bulletSpeed, origin);
        b.damage = this.damage;
        b.OnHit = function() {
            this.target.life -= this.damage;
            this.Release();
        };
        level.AddEntities(b);
        this.target = null;
    }

    UpdateTarget()
    {
        let enemies = level.OverlapCircle(new Circle2D(this.local_position, this.range), e => {
            return e instanceof Enemy;
        });
        if (enemies.length == 0)
            return;
        enemies = enemies.sort((a, b) => { return b.traveled_distance - a.traveled_distance; });
        this.target = enemies[0];
        this.FaceTo(this.target.position, 5 * Time.deltaTime);
    }

    Update()
    {
        this.UpdateTarget();
        this.timer.Update();
    }

    Render()
    {
        let dir1 = Vector2.angleVector(this.rotation - .2).mult(this.range).add(this.position);
        let dir2 = Vector2.angleVector(this.rotation + .2).mult(this.range).add(this.position);
        context.strokeStyle = "#F00";
        context.beginPath();
        context.moveTo(this.position.x, this.position.y);
        context.lineTo(dir1.x, dir1.y);
        context.stroke();
        context.beginPath();
        context.moveTo(this.position.x, this.position.y);
        context.lineTo(dir2.x, dir2.y);
        context.stroke();
        let c = new Circle2D(this.position, this.range);
        c.RenderBorder("F00", 1, this.rotation - .2, this.rotation + .2);
        this.anim.Render();
    }

}

let level = new EntityManager(map1.core);
level.AddEntities(new MachineGun(300, 50, 7, vec(300, 300)));

let wave = function(delay, create_enemy = null, count = 1)
{
    return { delay: delay, create_enemy: create_enemy, count: count };
}

let monsters = [wave(3), wave(.5, create_enemy.spider_d, 10), wave(3), wave(.5, create_enemy.spider_b, 5)]

let timer = new Timer(monsters[0].delay);
timer.i = 0;
timer.count = 0;
let OnTimerTick = function()
{
    let wave = monsters[this.i];
    if (this.count == wave.count || wave.create_enemy == null)
    {
        this.count = 0;
        if (++this.i == monsters.length)
        {
            this.Release();
            return;
        }
        this.delay = monsters[this.i].delay;
        return;
    }
    level.AddEntity(wave.create_enemy(map1.path));
    this.count++;
}
timer.OnTimerTick = OnTimerTick.bind(timer);
level.AddEntity(timer);
timer = null;

function Update()
{
    if (Input.mouseClick)
        level.AddEntity(new MachineGun(300, 25, 5, Input.mousePos));
    level.Update();
}

function Render()
{
    sprites.track.Render(vec(sprites.track.image.width, sprites.track.image.height).div(2), 0, 1);
    level.Render();
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
canvas.addEventListener("mousemove", e => { Input.mousePos = vec(e.pageX, e.pageY); });

window.requestAnimationFrame(loop);