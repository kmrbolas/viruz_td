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
Array.prototype.contains = function(n)
{
    return this.find(e => { return e === n; }) != undefined;
}
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
function InsideRect(point, pos, size)
{
    return point.x >= pos.x && point.x <= pos.x + size.x && point.y >= pos.y && point.y <= pos.y + size.y;
}
function RenderCircleFilled(pos, radius, style = "#999")
{
    context.fillStyle = style;
    context.beginPath();
    context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
    context.fill();
}
function RenderCircleStroked(pos, radius, style = "#000", lineWidth = 1)
{
    context.strokeStyle = style;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
    context.stroke();
}
function RenderCircle(pos, radius, fillStyle = "#999", strokeStyle = "#000", lineWidth = 1)
{
    RenderCircleFilled(pos, radius, fillStyle);
    RenderCircleStroked(pos, radius, strokeStyle, lineWidth);
}
function RenderText(center_pos, text, max_width, fillStyle = "#000")
{
    context.fillStyle = fillStyle;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, center_pos.x, center_pos.y, max_width);
}
function RenderTextArray(top_pos, size, texts)
{
    RenderRectangle("#FFF", "#000", 2, top_pos, size);
    for (let i = 0; i < texts.length; i++)
    {
        const text = texts[i];
        let pos = top_pos.add(vec(0, 15 * i + 5));
        context.font = "15px sans-serif";
        let center = pos.add(vec(100, 5));
        RenderText(center, text, size.x);
    }
}
function SetProperty(o, name, get, set = undefined)
{
    Object.defineProperty(o, name, {
        get: get,
        set: set,
        enumerable: true,
    });
}
let Input =
{
    mouseClick: false,
    mousePos: vec(0, 0),
    keyDown: new Array(512),
    msgs: new Array(0),
    log(s)
    {
        // console.log(s);
        this.msgs.push(s);
        if (this.msgs.length > 7)
            this.msgs.splice(0, 1);
    },
    RenderMessages(top_pos)
    {
        RenderTextArray(top_pos, vec(200, 120), this.msgs);
    }
}
let Time =
{
    deltaTime: 0,
    unscaledDeltaTime: 0,
    timeScale: 1,
    elapsed: 0,
}
let Player =
{
    level: 0,
    gold: 5000,
    score: 0,
}
function Button(pos, size, text, fillStyle = "#BBB", strokeStyle = "#000", lineWidth = 0)
{
    let check = InsideRect(Input.mousePos, pos, size);
    RenderRectangle(check ? "#DDD" : fillStyle, strokeStyle, lineWidth, pos, size);
    context.font = "15px sans-serif";
    let center = pos.add(size.div(2));
    RenderText(center, text, size.x);
    return Input.mouseClick && check;
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
    OnTimerTick() {  }
    Update()
    {
        this.elapsed += Time.deltaTime;
        if (this.elapsed < this.delay)
            return;
        this.OnTimerTick();
        this.elapsed = 0;
    }

}
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
    machine_gun: Sprite.CreateArray("images/turrets/machine_gun_0.png", "images/turrets/machine_gun_1.png", "images/turrets/machine_gun_2.png", "images/turrets/machine_gun_enabled.png", "images/turrets/machine_gun_disabled.png"),
    laser_gun: Sprite.CreateSheet("images/turrets/p_laser_gun_", 3, ".png"),
    anti_air: Sprite.CreateArray("images/turrets/antiair.png", "images/turrets/antiair_enabled.png", "images/turrets/antiair_disabled.png"),
    rocket_launcher: Sprite.CreateArray("images/turrets/rocket_launcher.png", "images/turrets/rocket_launcher_enabled.png", "images/turrets/rocket_launcher_disabled.png"),
    mini_gun: Sprite.CreateSheet("images/turrets/mini_gun_", 2, ".png"),
    base: Sprite.CreateArray("images/turrets/base.png", "images/turrets/base_enabled.png", "images/turrets/base_disabled.png"),
    rocket: new Sprite("images/projectiles/rocket/0.png"),
    bullet: new Sprite("images/projectiles/bullet/0.png"),
    laser_beam: new Sprite("images/Projectiles/Laser/0.png"),
    explosion: Sprite.CreateArray("images/effects/tile000.png", "images/effects/tile001.png", "images/effects/tile002.png", "images/effects/tile003.png","images/effects/tile004.png"),
    explosion_realistic: Sprite.CreateSheet("images/effects/realexplosion/", 27, ".png"),
    grass: new Sprite("images/background/grass.jpg"),
    paths: Sprite.CreateSheet("images/background/Track", 4,".png"),
    menu_background: new Sprite("images/background/menu.png"),
}
class Entity extends Transformable
{
    constructor(transform = new Transform())
    {
        super(transform);
        this.manager = null;
        this.render_layer = 0;
    }
    get info() { return []; }
    Update() {  }
    Render() {  }
    Release() { if (this.manager != null) this.manager.RemoveEntity(this); }
    RenderInfo(position, size)
    {
        let arr = new Array(0);
        for(let p in this.info)
            arr.push(p + ": " + this.info[p]);
        RenderTextArray(position, size, arr);
    }
}
class EntityManager
{
    constructor(...entities)
    {
        this.entities = new Array(0);
        this.AddEntities(...entities);
        this.paused = false;
    }
    Update()
    {
        if (!this.paused)
            for (let i = 0; i < this.entities.length; i++)
                this.entities[i].Update();
    }
    Render()
    {
        this.entities = this.entities.sort((a, b) => { return a.render_layer - b.render_layer; });
        this.entities.forEach(e => { e.Render(); });
    }
    AddEntity(entity)
    {
        if (this.entities.contains(entity))
            return;
        entity.manager = this;
        this.entities.push(entity);
    }
    AddEntities(...entities)
    {
        entities.forEach(e => { this.AddEntity(e) });
    }
    RemoveEntity(entity)
    {
        this.entities.remove_if(e => { return e === entity; });
    }
    RemoveEntities(...entities)
    {
        entities.forEach(e => { this.RemoveEntity(e); });
    }
    OverlapCircle(position, radius, callback = e => { return true; })
    {
        return this.entities.filter(e => { return Vector2.distance(e.transform.position, position) <= radius && callback(e); });
    }
    Reset()
    {
        this.entities.forEach(e => { e.manager = null; });
        this.entities = [];
    }
}
class Animation extends Entity
{
    constructor(frame_rate, sprites, transform = new Transform(), opacity = 1, times_to_play = 1)
    {
        super(transform);
        this.sprites = sprites;
        this.sprite_index = 0;
        this.times_played = 0;
        this.times_to_play = times_to_play;
        this.opacity = opacity;
        this.timer = new Timer(1 / frame_rate, this.OnTimerTick.bind(this));
        this.render_layer = 1;
    }
    get copy() { return new Animation(this.frame_rate, this.sprites, this.transform); }
    get frame_rate() { return this.timer.frequency; }
    set frame_rate(value) { this.timer.frequency = value; }
    get current_sprite() { return this.sprites[this.sprite_index]; }
    OnTimerTick()
    {
        this.sprite_index = (this.sprite_index + 1) % this.sprites.length;
        if (this.times_to_play == 0)
            return;
        if (this.sprite_index == 0 && ++this.times_played >= this.times_to_play)
            this.Release();
    }
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
    explosion: new Animation(30, sprites.explosion),
    explosion_realistic: new Animation(120, sprites.explosion_realistic),
    mini_gun: new Animation(5, sprites.mini_gun),
}
class KillableEntity extends Entity
{
    constructor(max_life, transform = new Transform())
    {
        super(transform);
        this.max_life = max_life;
        this._life = max_life;
    }
    get info() { return ["Vida Atual: " + this.life, "Vida Máxima" + this.max_life]; }
    get is_alive() { return this.life > 0; }
    get is_dead() { return !this.is_alive; }
    get life() { return this._life; }
    set life(value)
    {
        value = Math.clamp(value, 0, this.max_life);
        if (this._life == value)
            return;
        this._life = value;
        if (value == 0)
            this.OnDeath();
    }
    OnDeath()
    {
        this.Release();
    }
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
        this.render_layer = 1;
        this.speed = speed;
        this.traveled_distance = 0;
        this.path_index = 0;
        this.org = (Math.random() - .5) * 2 * (Math.random() * 20 + 10);
        this.path = null;
    }
    get info()
    {
        return super.info.concat("Velocidade: " + this.speed, "Distância Percorrida: " + Math.floor(this.traveled_distance));
    }
    Update()
    {
        if (this.path_index == 0)
        {
            this.transform.position = this.path.origin;
            this.transform.FaceTo(this.path.GetDestinationByIndex(++this.path_index));
            return;
        }
        let dest = this.path.GetDestinationByIndex(this.path_index);
        let perp = this.path.GetDirectionByIndex(this.path_index).perp;
        dest = dest.add(perp.mult(this.org));
        let delta = this.speed * Time.deltaTime;
        this.traveled_distance += delta;
        this.transform.MoveTo(dest, delta);
        this.transform.FaceTo(dest, delta / 10);
        if (Vector2.distance(this.transform.position, dest) <= 5 * delta)
        {
            this.org = -this.org;
            if (this.path_index++ >= this.path.positions.length)
                this.OnReachCore(this.path.core);
        }
    }
    OnReachCore(core)
    {
        core.life -= this.life;
        this.life = 0;
    }
    SpawnAdjacent(to_spawn, d = (Math.random() - .5) * 2 * (Math.random() * 30 + 10))
    {
        to_spawn.transform.position = Vector2.angleVector(this.transform.rotation).perp.mult(d).add(this.transform.position);
        to_spawn.transform.rotation = this.transform.rotation;
        to_spawn.traveled_distance = this.traveled_distance;
        to_spawn.path_index = this.path_index;
        this.manager.AddEntity(to_spawn);
    }
}
class AnimEnemy extends Enemy
{
    constructor(anim, speed, max_life, transform = new Transform())
    {
        super(speed, max_life, transform);
        this.anim = anim.copy;
        this.anim.times_to_play = 0;
    }
    Update()
    {
        super.Update();
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
    constructor(name, anims, base_scale, base_speed, base_life, type)
    {
        this.name = name;
        this.anims = anims;
        this.base_scale = base_scale;
        this.base_speed = base_speed;
        this.base_life = base_life;
        this.type = type;
        this.Create = new Array(0);
        for (let i = 0; i < anims.length; i++)
            this.Create.push(this.CreateByRank.bind(this, i));
    }
    CreateByRank(rank, path)
    {
        let e = new AnimEnemy(this.anims[rank], this.base_speed, this.base_life * Math.pow(1.5, rank));
        e.transform.scale = this.base_scale + .05 * rank;
        e.factory = this;
        e.type = this.type;
        e.path = path;
        e.name = this.name;
        e.rank = rank;
        e.gold = 3 * (rank + 1);
        SetProperty(e, "info", function() {
            return [this.name + "-" + (rank != 4 ? rank != 3 ? rank != 2 ? rank != 1 ? "D" : "C" : "B" : "A" : "S"),
            "Vida: " + this.life + " de " + this.max_life,
            "Tipo: " + this.type,
            "Velocidade: " + this.speed,
            "Distância Percorrida: " + Math.floor(this.traveled_distance)];
        });
        e.OnReachCore = function(core)
        {
            core.life -= this.life;
            this.gold = Math.floor(((this.max_life - this.life) / this.max_life) * this.gold);
            this.life = 0;
        };
        e.OnDeath = function()
        {
            let ex = animations.explosion.copy;
            ex.transform = this.transform;
            ex.transform.scale *= 1.5;
            this.manager.AddEntity(ex);
            if (rank > 1)
            {
                e.SpawnAdjacent(this.factory.Create[rank - 1](this.path));
                e.SpawnAdjacent(this.factory.Create[rank - 1](this.path));
            }
            if (this.gold)
            {
                Player.gold += this.gold;
                Input.log("+" + this.gold + " gold");
            }
            Player.score += this.max_life;
            this.Release();
        };
        return e;
    }
}
let spider_factory = new EnemyFactory("Mecha-Aranha", animations.spider, .4, 100, 100, "Terrestre");
let beetle_factory = new EnemyFactory("Mecha-Besouro", animations.beetle, .3, 80, 150, "Terrestre");
let wasp_factory = new EnemyFactory("Mecha-Vespa", animations.wasp, .3, 100, 125, "Aéreo");
class Projectile extends Entity
{
    constructor(aoe, speed, main_target, transform = new Transform())
    {
        super(transform);
        this.aoe = aoe;
        this.speed = speed;
        this.main_target = main_target;
    }
    get copy() { return new Projectile(this.aoe, this.speed, this.main_target, this.transform); }
    Update()
    {
        this.transform.FaceTo(this.main_target.transform.position);
        this.transform.MoveTo(this.main_target.transform.position, this.speed * Time.deltaTime);
        if (Vector2.distance(this.transform.position, this.main_target.transform.position) <= this.speed * Time.deltaTime)
        {
            this.transform.position = this.main_target.transform.position;
            let targets = this.manager.OverlapCircle(this.main_target.transform.position, this.aoe, e => { return e instanceof Enemy; });
            targets = targets.sort((a, b) => { return a.transform.position.distance(this.transform.position) - b.transform.position.distance(this.transform.position); });
            if (targets.length > 0)
                this.OnHit(targets);
            else
                this.Release();
        }
    }
    Render()
    {
        RenderRectangleFilled("#F00", this.transform.position, vec(25, 25));
    }
    OnHit(targets)
    {
        this.Release();
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
        if (targets.length == 0)
            return this.Release();
        targets[0].life -= this.damage;
        if (this.chains_number == 0 || targets.length == 1)
            return this.Release();
        this.main_target = targets[1];
        this.chains_number--;
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
        ex.transform = targets[0].transform;
        ex.transform.scale = this.aoe / 60;
        this.manager.AddEntity(ex);
        this.Release();
    }
}
class Upgrade
{
    constructor(base_value, max_level, scale = .25, level = 1)
    {
        this.base_value = base_value;
        this.scale = scale;
        this.max_level = max_level;
        this._level = level;
    }
    get level() { return this._level; }
    set level(value) { this._level = Math.clamp(value, 0, this.max_level); }
    get value()
    {
        if (!this.level)
            return 0;
        return this.base_value * (1 + this.scale * (this.level - 1));
    }
    get is_maxed() { return this._level == this.max_level; }
}
class Turret extends Entity
{
    constructor(fire_rate, base_range, transform = new Transform())
    {
        super(transform);
        this.render_layer = 5;
        this.timer = new Timer(1 / fire_rate, this.OnTimerTick.bind(this));
        this.fov = Math.PI / 6;
        this.targets = Array(0);
        this.targets_in_range = Array(0);
        this.upgrades = { Alcance: new Upgrade(base_range, 4, .1) };
        this.name = "Turret";
        this.cost = 0;
        this.evolutions = [];
    }
    get copy() { return new Turret(this.fire_rate, this.range, this.transform); }
    get range() { return this.upgrades.Alcance.value; }
    get info() { return [this.name, "Alcance: " + Math.round(this.range), "Tiros por segundo: " + this.fire_rate]; }
    get fire_rate() { return this.timer.frequency; }
    set fire_rate(value) { this.timer.frequency = value; }
    get target() { return this.targets_in_range[0]; }
    Shoot()
    {

    }
    UpdateTargetsInRange()
    {
        this.targets_in_range = this.manager.OverlapCircle(this.transform.position, this.range, (e) => { return e instanceof Enemy; });
        this.targets_in_range = this.targets_in_range.sort((a, b) => { return b.traveled_distance - a.traveled_distance; });
    }
    UpdateTargets()
    {
        this.targets = this.targets_in_range.filter(t => { return Vector2.sub(t.transform.position, this.transform.position).normalized.distance(Vector2.angleVector(this.transform.rotation)) <= this.fov / 2; });
    }
    UpdateRotation()
    {
        this.transform.FaceTo(this.targets_in_range[0].transform.position, 10 * Time.deltaTime);
    }
    Update()
    {
        this.UpdateTargetsInRange();
        this.UpdateTargets();
        this.timer.Update();
        if (this.targets_in_range.length == 0)
            return;
        this.UpdateRotation();
    }
    Render()
    {
        sprites.base[0].transform = this.transform;
        sprites.base[0].transform.rotation = 0;
        sprites.base[0].Render();
    }
    OnTimerTick()
    {
        if (this.targets.length > 0)
            this.Shoot();
    }
    RenderRange(color = "#999")
    {
        Turret.RenderRange(this.transform, this.range, this.fov, color);
    }
    RenderState(b)
    {
        let sprite = sprites.base[b ? 1 : 2];
        sprite.transform = this.transform;
        sprite.transform.rotation = 0;
        sprite.Render();
    }
    static RenderRange(transform, range, fov = 0, color = "#999")
    {
        let d = fov / 2;
        let a1 = transform.rotation - d;
        let a2 = transform.rotation + d;
        let dir1 = Vector2.angleVector(a1).mult(range).add(transform.position);
        let dir2 = Vector2.angleVector(a2).mult(range).add(transform.position);
        context.save();
        context.globalAlpha = .4;
        RenderCircle(transform.position, range, color);
        RenderLines("#000", 1, dir1, transform.position, dir2);
        context.restore();
    }
}
class LaserGun extends Turret
{
    constructor(transform = new Transform())
    {
        super(8, 195, transform);
        this.sprite_sheet = sprites.laser_gun;
        this.bullet_sprite = sprites.laser_beam;
        this.left = false;
        this.transform.scale = .5;
        this.upgrades.Alcance.max_level = 1;
        this.upgrades.Dano = new Upgrade(60, 5);
        this.upgrades.Ricochetes = new Upgrade(1, 4, 1);
        this.bullet_aoe = 70;
        this.bullet_speed = 500;
        this.name = "Arma de Laser";
        this.cost = 120;
    }
    get copy() { return new LaserGun(this.transform); }
    get chains() { return this.upgrades.Ricochetes.value; }
    get damage() { return this.upgrades.Dano.value; }
    get info() { return super.info.concat("Alvos: Rank B ou inferior", "Dano: " + this.damage, "Ricochetes: " + this.chains); }
    get bullet_position() { return Vector2.add(this.transform.position, Vector2.angleVector(this.transform.rotation + (this.left ? -.5 : .5)).mult(30 * this.transform.scale)); }
    get sprite() { return this.targets.length == 0 ? this.sprite_sheet[0] : this.left ? this.sprite_sheet[1] : this.sprite_sheet[2]; }
    UpdateTargetsInRange()
    {
        super.UpdateTargetsInRange();
        this.targets_in_range = this.targets_in_range.filter(e => { return 2 >= e.rank; });
    }
    Shoot()
    {
        this.left = !this.left;
        this.manager.AddEntity(new Bullet(this.bullet_sprite, this.damage, this.chains, this.bullet_aoe, this.bullet_speed, this.target, trans(this.bullet_position, this.transform.rotation, this.transform.scale)));
    }
    Render()
    {
        super.Render();
        this.sprite.transform = this.transform;
        this.sprite.Render();
    }

}
class MiniGun extends Turret
{
    constructor(transform = new Transform())
    {
        super(15, 250, transform);
        this.transform.scale = .5;
        this.name = "MiniGun";
        this.cost = 120;
        this.upgrades.Dano = new Upgrade(50, 5);
        this.upgrades.Critico = new Upgrade(.15, 4, 1, 0);
        this.bullet_speed = 850;
        this.bullet_sprite = sprites.bullet;
        this.anim = animations.mini_gun.copy;
    }
    get copy() { return new MiniGun(this.transform); }
    get chains() { return this.upgrades.Ricochetes.value; }
    get damage() { return this.upgrades.Dano.value; }
    get info() { return super.info.concat("Alvos: Rank B ou superior", "Dano: " + this.damage, "Chance de Crítico: " + Math.ceil(this.crit * 100) + "%"); }
    get bullet_position() { return Vector2.add(this.transform.position, Vector2.angleVector(this.transform.rotation).mult(30 * this.transform.scale)); }
    get crit() { return this.upgrades.Critico.value; }
    UpdateTargetsInRange()
    {
        super.UpdateTargetsInRange();
        this.targets_in_range = this.targets_in_range.filter(e => { return 2 <= e.rank; });
    }
    Shoot()
    {
        this.manager.AddEntity(new Bullet(this.bullet_sprite, this.crit > Math.random() ? this.damage * 2 : this.damage, 0, 10, this.bullet_speed, this.target, trans(this.bullet_position, this.transform.rotation)));
    }
    Render()
    {
        super.Render();
        this.anim.Update();
        this.anim.transform = this.transform;
        this.anim.transform.scale = this.transform.scale * 1.2;
        if (!this.targets.length) this.anim.sprite_index = 0;
        this.anim.Render();
    }
}
class MachineGun extends Turret
{
    constructor(transform = new Transform())
    {
        super(5, 150, transform);
        this.sprite_sheet = sprites.machine_gun;
        this.bullet_sprite = sprites.bullet;
        this.left = false;
        this.transform.scale = .5;
        this.upgrades.Dano = new Upgrade(30, 5);
        this.bullet_aoe = 0;
        this.bullet_speed = 700;
        this.name = "Metralhadora";
        this.cost = 80;
        this.evolutions = [new LaserGun, new MiniGun];
    }
    get copy() { return new MachineGun(this.transform); }
    get damage() { return this.upgrades.Dano.value; }
    get info() { return super.info.concat("Alvos: Rank B ou inferior", "Dano: " + this.damage); }
    get bullet_position() { return Vector2.add(this.transform.position, Vector2.angleVector(this.transform.rotation + (this.left ? -.5 : .5)).mult(30 * this.transform.scale)); }
    get sprite() { return this.targets.length == 0 ? this.sprite_sheet[0] : this.left ? this.sprite_sheet[1] : this.sprite_sheet[2]; }
    UpdateTargetsInRange()
    {
        super.UpdateTargetsInRange();
        this.targets_in_range = this.targets_in_range.filter(e => { return 2 >= e.rank; });
    }
    Shoot()
    {
        this.left = !this.left;
        this.manager.AddEntity(new Bullet(this.bullet_sprite, this.damage, 0, this.bullet_aoe, this.bullet_speed, this.target, trans(this.bullet_position, this.transform.rotation)));
    }
    Render()
    {
        super.Render();
        this.sprite.transform = this.transform;
        this.sprite.Render();
    }
    RenderState(b)
    {
        super.RenderState(b);
        let sprite = sprites.machine_gun[b ? 3 : 4];
        sprite.transform = this.transform;
        sprite.Render();
    }

}
class CannonTurret extends Turret
{
    constructor(cannon_sprites, fire_rate, base_range, transform = new Transform())
    {
        super(fire_rate, base_range, transform);
        this.cannon_sprites = cannon_sprites;
    }
    Render()
    {
        super.Render();
        let sprite = this.cannon_sprites[0];
        sprite.transform = this.transform;
        if (this.targets.length > 0)
            sprite.transform.position = this.transform.position.add(Vector2.angleVector(this.transform.rotation).mult(((this.timer.delay - this.timer.to_tick) / this.timer.delay) * 10 * this.transform.scale));
        sprite.Render();
    }
    RenderState(b)
    {
        super.RenderState(b);
        let sprite = this.cannon_sprites[b ? 1 : 2];
        sprite.transform = this.transform;
        sprite.Render();
    }

}
class RocketLauncher extends CannonTurret
{
    constructor(transform = new Transform())
    {
        super(sprites.rocket_launcher, 2.5, 120, transform);
        this.upgrades.damage = new Upgrade(40, 4);
        this.upgrades.aoe = new Upgrade(60, 4);
        this.name = "Lança Missel";
        this.cost = 100;
        this.transform.scale = .5;
    }
    get copy() { return new RocketLauncher(this.transform); }
    get damage() { return this.upgrades.damage.value; }
    get aoe() { return this.upgrades.aoe.value; }
    get info()
    {
        return super.info.concat("Alvos: Terrestres", "Dano: " + this.damage, "Area de Efeito: " + this.aoe);
    }
    UpdateTargetsInRange()
    {
        super.UpdateTargetsInRange();
        this.targets_in_range = this.targets_in_range.filter(t => { return t.type == "Terrestre"; });
    }
    Shoot()
    {
        this.manager.AddEntity(new Rocket(sprites.rocket, animations.explosion_realistic, this.upgrades.damage.value, this.upgrades.aoe.value, 500, this.target, this.transform));
    }
}
class AntiAir extends CannonTurret
{
    constructor(transform = new Transform())
    {
        super(sprites.anti_air, 3.5, 200, transform);
        this.upgrades.damage = new Upgrade(40, 4);
        this.upgrades.aoe = new Upgrade(70, 4);
        this.name = "Anti-Aéreo";
        this.cost = 120;
        this.transform.scale = .5;
    }
    get copy() { return new AntiAir(this.transform); }
    get damage() { return this.upgrades.damage.value; }
    get aoe() { return this.upgrades.aoe.value; }
    get info()
    {
        return super.info.concat("Alvos: Aéreos", "Dano: " + this.damage, "Area de Efeito: " + this.aoe);
    }
    UpdateTargetsInRange()
    {
        super.UpdateTargetsInRange();
        this.targets_in_range = this.targets_in_range.filter(t => { return t.type == "Aéreo"; });
    }
    Shoot()
    {
        this.manager.AddEntity(new Rocket(sprites.rocket, animations.explosion_realistic, this.upgrades.damage.value, this.upgrades.aoe.value, 350, this.target, this.transform));
    }
}
let turrets =
{
    machine_gun: new MachineGun(),
    rocket_launcher: new RocketLauncher(),
    anti_air: new AntiAir(),
};
class GameMap extends Entity
{
    constructor(background_sprite, path, waves)
    {
        super();
        this.background_sprite = background_sprite;
        this.path = path;
        this.waves = waves;
        this.wave_index = 0;
        this.enemy_index = 0;
        this.timer = new Timer(waves[0].delay, () => {
            if (this.wave_index == this.waves.length)
                return;
            let wave = this.waves[this.wave_index];
            if (wave.create_enemy == null || wave.count == this.enemy_index)
            {
                if (++this.wave_index == this.waves.length)
                    return;
                this.enemy_index = 0;
                this.timer.delay = this.waves[this.wave_index].delay;
                return;
            }
            this.manager.AddEntity(wave.create_enemy(this.path));
            this.enemy_index++;
        });
    }
    get core() { return this.path.core; }
    get current_wave() { return this.waves[Math.clamp(this.wave_index, 0, this.waves.length - 1)]; }
    get next_wave_time() { return this.current_wave.create_enemy != null ? 0 : this.timer.delay - this.timer.elapsed; }
    get finished() { return this.wave_index == this.waves.length; }
    SendNextWave()
    {
        this.timer.elapsed = this.timer.delay;
    }
    Update()
    {
        this.timer.Update();
    }
    Render()
    {
        this.background_sprite.Render();
        this.path.Render();
    }
    Reset()
    {
        this.timer.elapsed = 0;
        this.wave_index = 0;
        this.enemy_index = 0;
        this.timer.delay = this.current_wave.delay;
        this.core._life = this.core.max_life;
    }
}
class GameManager extends EntityManager
{
    constructor()
    {
        super();
        this._map = null;
    }
    get map() { return this._map; }
    set map(value)
    {
        super.Reset();
        this._map = value;
        if (this._map == null) return;
        this._map.Reset();
        this.AddEntity(this._map);
    }
    IsPositionValid(position, d = 50)
    {
        return InsideRect(position, vec(20, 20), vec(800 - 2 * 20, 600 - 2 * 20)) && this.OverlapCircle(position, d * .7, e => { return e instanceof Turret; }).length == 0 && !this._map.path.IsInside(position, d);
    }
    Reset()
    {
        this.map = this._map;
    }
}

let paths =
[
    new Path(sprites.paths[0], new KillableEntity(5000, trans(vec(375, 580))), vec(0, 105), vec(332, 105), vec(332, 235), vec(730, 235), vec(730, 445), vec(375, 445)),
    new Path(sprites.paths[1], new KillableEntity(5000, trans(vec(625, 540))), vec(0, 100), vec(650, 100), vec(650, 290), vec(155, 290), vec(155, 450), vec(625, 450)),
    new Path(sprites.paths[2], new KillableEntity(5000, trans(vec(580, 588))), vec(0, 65), vec(240, 65), vec(240, 175), vec(435, 175), vec(435, 65), vec(725, 65), vec(725, 328), vec(295, 328), vec(295, 478), vec(580, 478)),
    new Path(sprites.paths[3], new KillableEntity(5000, trans(vec(270, 592))), vec(0, 358), vec(136, 358), vec(136, 43), vec(360, 43), vec(360, 145), vec(542, 145), vec(542, 50), vec(720, 50), vec(720, 255), vec(318, 255), vec(318, 393), vec(583, 393), vec(583, 505), vec(270, 505)),
];

let waves =
[
    [wave(10), wave(.5, spider_factory.Create[0], 20), wave(10), wave(.5, beetle_factory.Create[0], 20), wave(10), wave(.5, wasp_factory.Create[0], 20)],
    [wave(10), wave(.5, spider_factory.Create[3], 20), wave(10), wave(.5, beetle_factory.Create[3], 20), wave(10), wave(.5, wasp_factory.Create[3], 20)],
    [wave(10), wave(.5, spider_factory.Create[3], 20), wave(10), wave(.5, beetle_factory.Create[3], 20), wave(10), wave(.5, wasp_factory.Create[3], 20)],
];

let maps =
[
    new GameMap(sprites.paths[1], paths[1], waves[1]),
    new GameMap(sprites.paths[0], paths[0], waves[0]),
    new GameMap(sprites.paths[2], paths[2], waves[2]),
    new GameMap(sprites.paths[3], paths[3], waves[0]),
];

let manager = new GameManager();

let map_index = 0;
let game_state = 0;

let gui =
{
    selected_entity: null,
    selected_turret: null,
    RenderInfo(entity)
    {
        entity.transform.push();
        entity.transform.position = vec(900, 100);
        entity.Render();
        entity.transform.pop();
        RenderTextArray(vec(800, 200), vec(200, 110), entity.info);
    },
    RenderTowerUpgrades(top_position, turret)
    {
        let size = vec(200, 25);
        let pos = top_position.add(vec(0, 5));
        let evolution_ready = true;
        for (let p in turret.upgrades)
        {
            let upgrade = turret.upgrades[p];
            let upgrade_cost = (upgrade.level + 1) * 30;
            if (upgrade.is_maxed)
                Button(pos, size, p + ", Nivel: " + upgrade.level);
            else
            {
                evolution_ready = false;
                if (Button(pos, size, p + ", Nivel: " + upgrade.level + ", Custo: " + upgrade_cost) && Player.gold >= upgrade_cost)
                {
                    upgrade.level++;
                    Player.gold -= upgrade_cost;
                }
            }
            pos = pos.add(vec(0, size.y + 5));
        }
        if (!evolution_ready || !turret.evolutions.length)
            return;
        RenderText(pos.add(size.div(2)), "Evoluções");
        pos = pos.add(vec(0, 30));
        turret.evolutions.forEach(e => {
            if (Button(pos, size, e.name + " " + e.cost + "g") && Player.gold >= e.cost)
            {
                let t = e.copy;
                t.transform.position = turret.transform.position;
                manager.AddEntity(this.selected_entity = t);
                turret.Release();
                Player.gold -= e.cost;
            }
            pos = pos.add(vec(0, size.y + 5));
        });
    },
    Update()
    {
        if (manager.map.core.life <= 0)
        {
            game_state = 1;
            return;
        }
        if (this.selected_turret) this.selected_entity = null;
        if (InsideRect(Input.mousePos, vec(0, 0), vec(800, 600)))
        {
            if (this.selected_turret)
            {
                if (Input.keyDown[27])
                    this.selected_turret = null;
                else if (Input.mouseClick)
                {
                    if (!manager.IsPositionValid(Input.mousePos))
                        Input.log("Posição Inválida");
                    else if (Player.gold - this.selected_turret.cost < 0)
                        Input.log("Gold Insuficiente");
                    else
                    {
                        manager.AddEntity(this.selected_turret.copy);
                        Player.gold -= this.selected_turret.cost;
                    }
                    if (!Input.keyDown[16])
                        this.selected_turret = null;
                }
            }
            else if (Input.mouseClick)
            {
                let s = manager.OverlapCircle(Input.mousePos, 30, e => { return e instanceof Turret || e instanceof Enemy; });
                this.selected_entity = s.length > 0 ? s[0] : null;
            }
        }
    },
    Render()
    {
        //First Gui Layer
        manager.entities.forEach(e => { if (e instanceof KillableEntity) e.RenderLifeBar(); });
        if (this.selected_turret && InsideRect(Input.mousePos, vec(0, 0), vec(800, 600)))
        {
            this.selected_turret.transform.position = Input.mousePos;
            this.selected_turret.RenderState(manager.IsPositionValid(Input.mousePos));
            this.selected_turret.RenderRange();
        }
        if (this.selected_entity instanceof Turret)
            this.selected_entity.RenderRange();
        //Second Gui Layer
        RenderRectangleStroked("#000", 2, vec(0, 0), vec(800, 600));
        RenderRectangle("#FFF", "#000", 2, vec(800, 0), vec(200, 720));
        RenderRectangle("#777", "#000", 2, vec(800, 0), vec(200, 200));
        RenderRectangle("#FFF", "#000", 2, vec(0, 600), vec(1000, 120));
    
        let next_wave_time = Math.ceil(manager.map.next_wave_time);
        if (next_wave_time)
        {
            if (Button(vec(480 - 5, 600 + 5), vec(210, 50), "Próxima onda em " + next_wave_time + " segundos") || Input.keyDown[90])
            {
                manager.map.SendNextWave();
                Input.log("+" + next_wave_time + " gold");
                Player.gold += next_wave_time;
            }
        }
        else
            Button(vec(480 - 5, 600 + 5), vec(210, 50), "Onda em Andamento!");
    
        Button(vec(700 - 5, 600 + 5), vec(100, 50), "Gold: " + Player.gold);
        if (Button(vec(700 - 5, 650 + 10), vec(100, 50), "Velocidade: " + Time.timeScale))
        {
            Time.timeScale *= 2;
            if (Time.timeScale > 4)
                Time.timeScale = 1;
        }
        if (this.selected_turret)
            this.RenderInfo(this.selected_turret);
        else if (this.selected_entity)
        {
            this.RenderInfo(this.selected_entity);
            if (this.selected_entity instanceof Turret)
            {
                this.RenderTowerUpgrades(vec(800, 310), this.selected_entity);
            }
        }
        
        let i = 0;
        for (let p in turrets)
        {
            let turret = turrets[p];
            let pos = vec(155 * (Math.floor(i / 2)) + 5, 720 + 55 * -(2 - (i % 2)) - 3);
            if (Button(pos, vec(150, 50), turret.name + " - " + turret.cost + "g"))
                this.selected_turret = turret;
            i++;
        }
        Input.RenderMessages(vec(800, 600));
    },
    Reset()
    {
        this.selected_entity = null;
        this.selected_turret = null;
        Time.timeScale = 1;
    }
};

function RenderStartMenu()
{
    sprites.menu_background.Render();
    let size = vec(100, 50);
    let pos = vec(canvas.clientWidth / 2, canvas.clientHeight / 2).sub(size.div(2));
    if (Button(pos, size, "Jogar"))
    {
        manager.map = maps[0];
        game_state = 2;
    }
}

function RenderGameOver()
{
    let size = vec(150, 50);
    let pos = vec(canvas.clientWidth / 2, canvas.clientHeight / 2).sub(size.div(2));
    if (Button(pos, size, "Tentar Novamente"))
    {
        manager.Reset();
        gui.Reset();
        game_state = 2;
    }
    
}

function RenderScore()
{
    let size = vec(100, 50);
    let pos = vec(canvas.clientWidth / 2, canvas.clientHeight / 2).sub(size.div(2));
    if (Button(pos, size, "Continuar"))
    {
        if (++map_index == maps.length)
        {
            game_state = 4;
            return;
        }
        manager.map = maps[map_index];
        gui.Reset();
        game_state = 2;
    }
    gui.selected_entity = null;
    gui.selected_turret = null;
    Time.timeScale = 1;
}

function RenderCredits()
{

}

function Start()
{
    sprites.grass.top_position = vec(0, 0);
    sprites.paths.forEach(b => { b.top_position = vec(0, 0); });
    sprites.menu_background.top_position = vec(0, 0);
    manager.map = maps[0];    
}

function Update()
{
    switch(game_state)
    {
        case 2:
        manager.Update();
        gui.Update();
        if (manager.map.core.life == 0)
            game_state = 1;
        else if (manager.map.finished && !manager.entities.filter(e => { return e instanceof Enemy; }).length)
            game_state = 3;
        break;
    }
}

function Render()
{
    RenderRectangleFilled("#99F", vec(0, 0), vec(1000, 720));
    switch(game_state)
    {
        case 0:
        RenderStartMenu();
        break;
        case 1:
        RenderGameOver();
        break;
        case 2:
        manager.Render();
        gui.Render();
        break;
        case 3:
        RenderScore();
        break;
        case 4:
        RenderCredits();
        break;
    }
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

document.addEventListener("keydown", e => {
    Input.keyDown[e.which] = true;
});
document.addEventListener("keyup", e => {
    Input.keyDown[e.which] = false;
});

window.onload = function()
{
    Start();
    window.requestAnimationFrame(loop);
}