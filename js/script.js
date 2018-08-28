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
class GUI
{
    static Button(position, size, text)
    {
        let rect = new Rectangle2D(position, size);
        rect.Render("#999", "#000", 1);
        context.fillStyle="#000";
        context.font='10px sans-serif';
        context.textAlign='center';
        context.fillText(text, rect.center.x, rect.center.y);
        return Input.mouseClick && rect.IsInside(Input.mousePos);
    }
}
function vec(x, y) { return new Vector2(x, y); }
function rectangle(pos, size) { return new Rectangle2D(pos, size); }
class Transformable
{
    constructor(position = vec(0, 0), rotation = 0, scale = 1)
    {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
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
    constructor(src, position = vec(0, 0), rotation = 0, scale = 1)
    {
        super(position, rotation, scale);
        this.img = new Image();
        this.img.src = src;
    }
    get center() { return this.position.add(this.size.div(2)); }
    set center(value) { this.position = value.sub(this.size.div(2)); }
    get size() { return vec(this.img.width * this.scale, this.img.height * this.scale); }
    Render()
    {
        context.save();
        context.translate(this.center.x, this.center.y);
        context.rotate(this.rotation);
        context.drawImage(this.img, -this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        context.restore();
    }
    static CreateArray(...srcs)
    {
        let arr = new Array(0);
        srcs.forEach(src => { arr.push(new Sprite(src)); });
        return arr;
    }
}
class Animation extends Transformable
{
    constructor(frame_rate, sprites, position = vec(0, 0), rotation = 0, scale = 1, align_to_center = true)
    {
        super(position, rotation, scale);
        this.sprites = sprites;
        this.sprite_index = 0;
        this.times_played = 0;
        this.align_to_center = align_to_center;
        this.timer = new Timer(1 / frame_rate, () => { 
            this.sprite_index = (this.sprite_index + 1) % this.sprites.length;
            if (this.sprite_index == 0)
                this.times_played++;
        });
    }
    get copy() { return new Animation(this.frame_rate, this.sprites, this.position, this.rotation, this.scale); }
    get frame_rate() { return this.timer.frequency; }
    set frame_rate(value) { this.timer.frequency = value; }
    get current_sprite() { return this.sprites[this.sprite_index]; }
    Render()
    {
        this.current_sprite.transform = this.transform;
        if (this.align_to_center) this.current_sprite.center = this.position;
        this.current_sprite.Render();
    }
    Update()
    {
        this.timer.Update();
    }
}
class KillableEntity extends Transformable
{
    constructor(max_life, position = vec(0, 0), rotation = 0, scale = 1)
    {
        super(position, rotation, scale);
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
    OnDeath() {  }
    Render()
    {
        this.RenderLifeBar();
    }
    RenderLifeBar(offset = 30, r = rectangle(vec(0, 0), vec(25, 5)), text = false)
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
    constructor(speed, max_life, position = vec(0, 0), rotation = 0, scale = 1)
    {
        super(max_life, position, rotation, scale);
        this.speed = speed;
        this.traveled_distance = 0;
        this.path_index = 0;
        this.org = Math.random() * 30 - 15;
        this.current_path = null;
        this.destination = position;
        this.direction = vec(0, 0);
    }
    get turn_speed() { return this.speed / 30; }
    OnReachCore(core)
    {
        core.life -= this.life;
        this.life = 0;
    }
    Render()
    {
        let r = rectangle(vec(0, 0), vec(25, 25));
        r.center = this.position;
        r.Render("#F00");
        this.RenderLifeBar();
    }

    SpawnAdjacent(...to_spawn)
    {

    }
}
class Path
{
    constructor(core, ...positions)
    {
        this.core = core;
        this.positions = positions;
        this.positions.push(core.position);
        this.enemies = Array(0);
    }
    get origin() { return this.positions[0]; }
    AddEnemy(enemy)
    {
        if (!(enemy instanceof Enemy) || this.enemies.find(e => { return e === enemy; }) != undefined)
            return;
        enemy.position = this.origin;
        enemy.current_path = this;
        enemy.path_index = 0;
        this.enemies.push(enemy);
    }
    OverlapCircle(circle, callback = e => { return true; })
    {
        return this.enemies.find(e => { return circle.IsInside(e.position) && callback(e); })
    }
    Update()
    {
        this.enemies.forEach(e => {
            let dest = this.GetDestinationByIndex(e.path_index);
            let perp = this.GetDirectionByIndex(e.path_index).perp;
            dest = dest.add(perp.mult(e.org));
            e.MoveTo(dest, e.speed * Time.deltaTime);
            e.FaceTo(dest, e.turn_speed * Time.deltaTime);
            if (Vector2.distance(e.position, dest) <= 5 * e.speed * Time.deltaTime)
            {
                e.org = -e.org;
                if (++e.path_index == this.positions.length)
                    e.OnReachCore(this.core);
            }
        });
        this.enemies.remove_if(e => { return e.current_index == this.positions.length || e.is_dead; });
    }
    Render()
    {
        // RenderLines("#F00", 1, ...this.positions);
        this.enemies.forEach(e => { e.Render(); })
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
class AnimEnemy extends Enemy
{
    constructor(anim, speed, max_life, position = vec(0, 0), rotation = 0, scale = 1)
    {
        super(speed, max_life, position, rotation, scale);
        this.anim = anim.copy;
        this.scale = scale;
    }
    Render()
    {
        this.anim.transform = this.transform;
        this.anim.center = this.position;
        this.anim.Update();
        this.anim.Render();
        this.RenderLifeBar();
    }
    OnDeath()
    {
        let ex = animations.explosion.copy;
        ex.position = this.position;
        // this.manager.AddEntity(ex);
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
    rocket_launcher: Sprite.CreateArray("images/turrets/rocketlauncher/0.png"),
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
    spider:[new Animation(12, sprites.spider[0]),
            new Animation(12, sprites.spider[1]),
            new Animation(12, sprites.spider[2]),
            new Animation(12, sprites.spider[3]),
            new Animation(12, sprites.spider[4])],
    beetle:[new Animation(12, sprites.beetle[0]),
            new Animation(12, sprites.beetle[1]),
            new Animation(12, sprites.beetle[2]),
            new Animation(12, sprites.beetle[3]),
            new Animation(12, sprites.beetle[4])],
    machine_gun: new Animation(12, sprites.machine_gun),
    anti_air: new Animation(12, sprites.anti_air),
    explosion: new Animation(30, sprites.explosion),
    explosion_realistic: new Animation(120, sprites.explosion_realistic),
}
class Projectile extends Transformable
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
    constructor(target, damage, aoe, speed, position = vec(0, 0), rotation = 0, scale = 1)
    {
        super(target, speed, position, rotation, scale);
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
        // new Circle2D(this.position, this.aoe).RenderBorder("#F00", 2);
    }
}
class Turret extends Timer
{
    constructor(rate, range, fov, position)
    {
        super(1 / rate);
        this.render_layer = 5;
        this.position = position;
        this.range = range;
        this.fov = fov;
        this.targets = Array(0);
    }
    get bullet_speed() { return this.rate * 50; }
    get bullet_position() { return this.position; }
    get target() { return this.targets[0]; }
    Shoot()
    {
        this.manager.AddEntity(new Projectile(this.target, this.bullet_speed, this.bullet_position, this.rotation));
    }
    UpdateRotation()
    {
        this.FaceTo(this.targets[0].position, 10 * Time.deltaTime);
    }
    UpdateTargets()
    {
        this.targets = this.manager.OverlapCircle(new Circle2D(this.position, this.range), e => { return e instanceof Enemy; });
        this.targets = this.targets.sort((a, b) => { return b.traveled_distance - a.traveled_distance; });
    }
    ValidateTargets()
    {
        this.targets.remove_if(e => { return Vector2.sub(e.position, this.position).normalized.distance(Vector2.angleVector(this.rotation)) > this.fov / 2; });
    }
    Update()
    {
        super.Update();
        this.UpdateTargets();
        if (this.targets.length == 0)
            return;
        this.UpdateRotation();
        this.ValidateTargets();
    }
    OnTimerTick()
    {
        if (this.targets.length > 0)
            this.Shoot();
    }
    RenderRange(color = "#000")
    {
        let d = this.fov / 2;
        let a1 = this.rotation - d;
        let a2 = this.rotation + d;
        let dir1 = Vector2.angleVector(a1).mult(this.range).add(this.position);
        let dir2 = Vector2.angleVector(a2).mult(this.range).add(this.position);
        RenderLines(color, 1, dir1, this.position, dir2);
        let c = new Circle2D(this.position, this.range);
        context.save();
        context.globalAlpha = .5;
        c.Render("#FFF", color);
        context.restore();
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
        return Vector2.add(this.position, Vector2.angleVector(this.rotation + (this.left ? -.5 : .5)).mult(30 * this.scale));
    }
    Shoot()
    {
        this.left = !this.left;
        this.sprite = this.left ? sprites.machine_gun[1] : sprites.machine_gun[2];
        this.manager.AddEntity(new Bullet(this.target, this.damage, this.bullet_speed, this.bullet_position));
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
    constructor(damage, aoe, rate, range, fov, position)
    {
        super(rate, range, fov, position)
        this.damage = damage;
        this.aoe = aoe;
        this.sprite = sprites.rocket_launcher[0];
        this.left = false;
        this.scale = .5;
    }
    get bullet_speed() { return this.rate * 400; }
    get bullet_position() { return this.position.add(Vector2.angleVector(this.rotation).mult(this.scale * 50)); }
    Shoot()
    {
        this.manager.AddEntity(new Rocket(this.target, this.damage, this.aoe, this.bullet_speed, this.bullet_position));
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
        this.sprite.transform = this.transform;
        if (this.targets.length > 0)
            this.sprite.position = this.position.add(Vector2.angleVector(this.rotation).mult(((this.delay - this.to_tick) / this.delay) * 10 ));
        this.sprite.Render(this.position, this.rotation, this.scale);
    }
}
class WaveSpawner extends Timer
{
    constructor(path, waves)
    {
        super(waves[0].delay);
        this.path = path;
        this.waves = waves;
        this.wave_index = 0;
        this.enemy_index = 0;
    }
    OnTimerTick()
    {
        let wave = this.waves[this.wave_index];
        if (wave.create_enemy == null || wave.count == this.enemy_index)
        {
            if (++this.wave_index == this.waves.length)
                return this.Release();
            this.enemy_index = 0;
            this.delay = this.waves[this.wave_index].delay;
            return;
        }
        this.manager.AddEntity(wave.create_enemy(this.path));
        this.enemy_index++;
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
        let e = new AnimEnemy(this.anims[rank], this.base_speed, this.base_life * Math.pow(2, rank));
        e.scale = this.base_scale + .1 * rank;
        e.factory = this;
        e.type = this.type;
        e.rank = rank;
        if (rank >= 2)
        {
            e.OnDeath = function()
            {
                this.SpawnAdjacent(this.factory.CreateByRank(this.rank - 1, this.path), this.factory.CreateByRank(this.rank - 1, this.path));
                let ex = animations.explosion.copy;
                ex.position = this.position;
                this.manager.AddEntity(ex);
                this.Release();
            }
        }
        return e;
    }
}
class TurretFactory
{
    constructor(create_fn, enabled_sprite, disabled_sprite)
    {
        this.create_fn = create_fn;
        this.enabled_sprite = enabled_sprite;
        this.disabled_sprite = disabled_sprite;
    }

}
let spider_factory = new EnemyFactory(animations.spider, .4, 100, 100);
let beetle_factory = new EnemyFactory(animations.beetle, .3, 80, 150);
let wasp_factory = new EnemyFactory(animations.spider, .4, 100, 125, 1);

let paths =
[
    new Path(new KillableEntity(1000, vec(625, 540)), vec(0, 100), vec(650, 100), vec(650, 290), vec(155, 290), vec(155, 450), vec(625, 450))
];
let waves = 
[
    [wave(3), wave(.5, spider_factory.Create[0], 10), wave(3), wave(.5, spider_factory.Create[2], 3)]
];
let wave_paths =
[
    new WaveSpawner(paths[0], waves[0])
];

let selected_entity = null;

paths[0].AddEnemy(spider_factory.Create[0]());

function Update()
{
    paths[0].Update();
}

function Render()
{
    sprites.track.Render();
    paths[0].Render();
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

window.requestAnimationFrame(loop);