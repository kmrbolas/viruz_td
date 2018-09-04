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
function AddPropertyGet(o, name, get_fn)
{
    Object.defineProperty(o, name, {
        get: get_fn,
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
}
let Player =
{
    level: 0,
    gold: 120,
}
function Button(pos, size, text, fillStyle = "#FFF", strokeStyle = "#000", lineWidth = 0)
{
    RenderRectangle(fillStyle, strokeStyle, lineWidth, pos, size);
    context.font = "15px sans-serif";
    let center = pos.add(size.div(2));
    RenderText(center, text, size.x);
    return Input.mouseClick && InsideRect(Input.mousePos, pos, size);
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
    machine_gun: Sprite.CreateArray("images/turrets/Machine_Gun/machine_gun_0.png", "images/turrets/Machine_Gun/machine_gun_1.png", "images/turrets/Machine_Gun/machine_gun_2.png", "images/turrets/Machine_Gun/machine_gun_enabled.png", "images/turrets/Machine_Gun/machine_gun_disabled.png"),
    anti_air: Sprite.CreateArray("images/turrets/antiair/0.png", "images/turrets/antiair/0.png"),
    rocket_launcher: Sprite.CreateArray("images/turrets/rocketlauncher/0.png"),
    base: Sprite.CreateArray("images/turrets/base.png", "images/turrets/base_enabled.png", "images/turrets/base_disabled.png"),
    rocket: new Sprite("images/projectiles/rocket/0.png"),
    bullet: new Sprite("images/projectiles/bullet/0.png"),
    explosion: Sprite.CreateArray("images/effects/tile000.png", "images/effects/tile001.png", "images/effects/tile002.png", "images/effects/tile003.png","images/effects/tile004.png"),
    explosion_realistic: Sprite.CreateSheet("images/effects/realexplosion/", 27, ".png"),
    track: new Sprite("images/background/Track01.png"),
    grass: new Sprite("images/background/grass.jpg"),
}
class Entity extends Transformable
{
    constructor(transform = new Transform())
    {
        super(transform);
        this.manager = null;
        this.info = {  };
        this.info["Nome"] = "Entity";
    }
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
    }
    Update()
    {
        this.entities.forEach(e => { e.Update(); });
    }
    Render()
    {
        this.entities.forEach(e => { e.Render(); });
    }
    AddEntity(entity)
    {
        if (this.entities.find(e => { return e === entity; }) != undefined)
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
    }
    get copy() { return new Animation(this.frame_rate, this.sprites, this.transform); }
    get frame_rate() { return this.timer.frequency; }
    set frame_rate(value) { this.timer.frequency = value; }
    get current_sprite() { return this.sprites[this.sprite_index]; }
    OnTimerTick()
    {
        this.sprite_index = (this.sprite_index + 1) % this.sprites.length;
        if (this.sprite_index == 0 && this.times_played++ >= this.times_to_play)
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
    machine_gun: new Animation(12, sprites.machine_gun),
    anti_air: new Animation(12, sprites.anti_air),
    explosion: new Animation(30, sprites.explosion),
    explosion_realistic: new Animation(120, sprites.explosion_realistic),
}
class KillableEntity extends Entity
{
    constructor(max_life, transform = new Transform())
    {
        super(transform);
        this.max_life = max_life;
        this._life = max_life;
        AddPropertyGet(this.info, "Vida Máxima", ()=>{return this.max_life;});
        AddPropertyGet(this.info, "Vida Atual", ()=>{return this._life;});
    }
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
        this.speed = speed;
        this.traveled_distance = 0;
        this.path_index = 0;
        this.org = (Math.random() - .5) * 2 * (Math.random() * 30 + 10);
        this.path = null;
        this.info["Velocidade"] = this.speed;
        AddPropertyGet(this.info, "Distância Percorrida", ()=>{return Math.floor(this.traveled_distance);});
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
    constructor(name, anims, base_scale, base_speed, base_life, type = 0)
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
        e.rank = rank;
        e.path = path;
        e.info.Rank = rank != 4 ? rank != 3 ? rank != 2 ? rank != 1 ? "D" : "C" : "B" : "A" : "S";
        e.info.Nome = this.name;
        e.OnDeath = function()
        {
            let ex = animations.explosion.copy;
            ex.transform = this.transform;
            ex.transform.scale *= 1.5;
            this.manager.AddEntity(ex);
            if (this.rank > 1)
            {
                e.SpawnAdjacent(this.factory.Create[this.rank - 1](this.path));
                e.SpawnAdjacent(this.factory.Create[this.rank - 1](this.path));
            }
            this.Release();
        };
        return e;
    }
}
let spider_factory = new EnemyFactory("Mecha-Aranha", animations.spider, .4, 100, 100);
let beetle_factory = new EnemyFactory("Mecha-Besouro", animations.beetle, .3, 80, 150);
let wasp_factory = new EnemyFactory("Mecha-Vespa", animations.wasp, .3, 100, 125, 1);
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
            this.OnHit(this.manager.OverlapCircle(this.main_target.transform.position, this.aoe, e => { return e instanceof Enemy; }));
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
        ex.transform = this.transform;
        ex.transform.scale = this.aoe / 60;
        this.game_manager.PlayAnimation(ex);
        this.Release();
    }
}
class Upgrade
{
    constructor(base_value, max_level, scale = .25)
    {
        this.base_value = base_value;
        this.scale = scale;
        this.max_level = max_level;
        this._level = 0;
    }
    get level() { return this._level; }
    set level(value) { this._level = Math.clamp(value, 0, this.max_level); }
    get value() { return this.base_value * (1 + this.scale * this.level); }
    get is_maxed() { return this._level == this.max_level; }
}
class Turret extends Entity
{
    constructor(fire_rate, base_range, transform = new Transform())
    {
        super(transform);
        this.timer = new Timer(1 / fire_rate, this.OnTimerTick.bind(this));
        this.fov = Math.PI / 6;
        this.targets = Array(0);
        this.targets_in_range = Array(0);
        this.upgrades = { range: new Upgrade(base_range, 4) };
        this.info["Nome"] = "Turret";
        AddPropertyGet(this.info, "Alcance", ()=>{ return this.upgrades.range.value; });
    }
    get fire_rate() { return this.timer.frequency; }
    set fire_rate(value) { this.timer.frequency = value; }
    get target() { return this.targets_in_range[0]; }
    Shoot()
    {

    }
    UpdateTargets()
    {
        this.targets_in_range = this.manager.OverlapCircle(this.transform.position, this.upgrades.range.value, (e) => { return e instanceof Enemy; });
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
    Update()
    {
        this.UpdateTargets();
        this.UpdateTargetsInRange();
        this.timer.Update();
        if (this.targets_in_range.length == 0)
            return;
        this.UpdateRotation();
    }
    Render()
    {
        sprites.base[0].transform.position = this.transform.position;
        sprites.base[0].Render();
    }
    OnTimerTick()
    {
        if (this.targets.length > 0)
            this.Shoot();
    }
    RenderRange(color = "#999")
    {
        Turret.RenderRange(this.transform, this.upgrades.range.value, this.fov, color);
    }
    RenderState(b)
    {
        let sprite = sprites.base[b ? 1 : 2];
        sprite.transform.position = this.transform.position;
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
class MachineGun extends Turret
{
    constructor(transform = new Transform())
    {
        super(5, 125, transform);
        this.left = false;
        this.transform.scale = .5
        this.upgrades.damage = new Upgrade(40, 4);
        this.upgrades.chains = new Upgrade(0, 4);
        this.bullet_aoe = 50;
        this.bullet_speed = 700;
        this.info["Nome"] = "Metralhadora";
        AddPropertyGet(this.info, "Dano", ()=>{return this.upgrades.damage.value;});
        AddPropertyGet(this.info, "Ricochetes", ()=>{return this.upgrades.chains.value;});
    }
    get copy() { return new MachineGun(this.transform); }
    get bullet_position()
    {
        return Vector2.add(this.transform.position, Vector2.angleVector(this.transform.rotation + (this.left ? -.5 : .5)).mult(30 * this.transform.scale));
    }
    Shoot()
    {
        this.left = !this.left;
        this.sprite = this.left ? sprites.machine_gun[1] : sprites.machine_gun[2];
        this.manager.AddEntity(new Bullet(sprites.bullet, this.upgrades.damage.value, this.upgrades.chains.level, this.bullet_aoe, this.bullet_speed, this.target, trans(this.bullet_position, this.transform.rotation)));
    }
    Render()
    {
        super.Render();
        if (this.targets.length == 0) this.sprite = sprites.machine_gun[0];
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
class BasicTurret extends Turret
{
    constructor(base_sprite, cannon_sprite, fire_rate, range, fov, transform = new Transform())
    {
        super(fire_rate, range, fov, transform);
        this.base_sprite = base_sprite;
        this.cannon_sprite = cannon_sprite;
    }
    get copy() { return new BasicTurret(this.base_sprite, this.cannon_sprite, this.fire_rate, this.base_range, this.fov, this.transform); }
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
    constructor(cost, turret)
    {
        this.cost = cost;
        this.turret = turret;
    }
    create(position)
    {
        let t = this.turret.copy;
        t.transform.position = position;
        return t;
    }
}
let turrets =
{
    machine_gun: new MachineGun(),
};
let turrets_factory =
{
    machine_gun: new TurretFactory(60, turrets.machine_gun),
};
class WavePath extends Entity
{
    constructor(path, waves)
    {
        super();
        this.enemies = new Array(0);
        this.path = path;
        this.waves = waves;
        this.wave_index = 0;
        this.enemy_index = 0;
        this.timer = new Timer(waves[0].delay, this.OnTimerTick.bind(this));
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
            this.timer.delay = this.waves[this.wave_index].delay;
            return;
        }
        this.manager.AddEntity(wave.create_enemy(this.path));
        this.enemy_index++;
    }
    Update()
    {
        this.timer.Update();
    }
    Render()
    {
        this.path.Render();
    }
    Reset()
    {
        this.wave_index = 0;
        this.enemy_index = 0;
    }
}
class GameManager extends EntityManager
{
    constructor(background_sprite, path, waves)
    {
        super();
        this.background_sprite = background_sprite;        
        this.path = path;
        this.waves = waves;
        this.wave_spawner = new WavePath(path, waves);
        this.AddEntity(this.wave_spawner);
        this.selected = null;
    }
    get enemies() { return this.wave_spawner.enemies; }
    IsValidPosition(position, d = 50)
    {
        return InsideRect(position, vec(20, 20), vec(800 - 2 * 20, 600 - 2 * 20)) && this.OverlapCircle(position, d, e => { return e instanceof Turret; }).length == 0 && !this.path.IsInside(position, d);
    }
    Update()
    {
        super.Update();
        if (Input.mouseClick)
        {
            if (this.selected instanceof TurretFactory)
            {
                if (Input.keyDown[27])
                    this.selected = null;
                else if (!this.IsValidPosition(Input.mousePos))
                    Input.log("Posição Inválida!");
                else if (Player.gold - this.selected.cost < 0)
                    Input.log("Ouro Insuficiente!");
                else
                {
                    this.AddEntity(this.selected.create(Input.mousePos));
                    Player.gold -= this.selected.cost;
                }
                if (!Input.keyDown[16]) this.selected = null;
            }
            else if (InsideRect(Input.mousePos, vec(0, 0), vec(800, 600)))
            {
                let s = this.OverlapCircle(Input.mousePos, 20, e => { return e instanceof Turret || e instanceof Enemy; });
                this.selected = s.length > 0 ? s[0] : null;
            }
        }
    }
    RenderUI()
    {
        this.entities.forEach(e => { if (e instanceof KillableEntity) e.RenderLifeBar(); });
        RenderRectangleStroked("#000", 2, vec(0, 0), vec(800, 600));
        RenderRectangle("#FFF", "#000", 2, vec(800, 0), vec(200, 720));
        RenderRectangle("#777", "#000", 2, vec(800, 0), vec(200, 200));
        RenderRectangle("#FFF", "#000", 2, vec(0, 600), vec(1000, 120));
        if (this.selected instanceof Entity)
        {
            this.selected.transform.push();
            this.selected.transform.position = vec(900, 100);
            this.selected.Render();
            this.selected.transform.pop();
            this.selected.RenderInfo(vec(800, 200), vec(200, 100));
        }
        let i = 0;
        for (let p in turrets_factory)
        {
            const factory = turrets_factory[p];
            let pos = vec(155 * (Math.floor(i / 2)) + 5, 720 + 55 * -(2 - (i % 2)) - 3);
            if (Button(pos, vec(150, 50), factory.turret.info["Nome"] + " - " + factory.cost + "p"))
                this.selected = factory;
            i++;
        }
        Input.RenderMessages(vec(800, 600));
    }
    Render()
    {
        this.background_sprite.Render();
        super.Render();
        if (this.selected instanceof TurretFactory)
        {
            let t = this.selected.turret;
            t.transform.position = Input.mousePos;
            t.RenderState(this.IsValidPosition(Input.mousePos));
            t.RenderRange();
        }
        else if (this.selected instanceof Turret)
        {
            this.selected.RenderRange();
        }
        this.RenderUI();
    }
    Reset()
    {
        this.wave_spawner.Reset();
    }
}

let current_level = new GameManager(sprites.grass, new Path(sprites.track, new KillableEntity(10000, trans(vec(625, 540))), vec(0, 100), vec(650, 100), vec(650, 290), vec(155, 290), vec(155, 450), vec(625, 450)), 
// [wave(.5, wasp_factory.Create[4], 2)]);
[wave(3), wave(1, beetle_factory.Create[4]), wave(3), wave(.5, wasp_factory.Create[2], 3), wave(3), wave(.5, spider_factory.Create[0], 10), wave(3), wave(.5, spider_factory.Create[0], 10)]);

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