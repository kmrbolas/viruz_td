function vec(x, y) { return { x: x, y: y }; }

class Transform
{
    constructor(position = vec(0, 0), rotation = 0, scale = 1)
    {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
    }
    get copy() { return new Transform(this.position, this.rotation, this.scale); }
}

class Transformable
{
    constructor(transform)
    {
        this._transform = transform;
    }
    get transform() { return this._transform; }
    set transform(value)
    {
        this._transform = value.copy;
    }
}

let t = new Transform();
// t.status = { get(){return 5;} }
Object.defineProperty(t, "status", {
    get: function(){return 5;},
    set: undefined,
    enumerable: true,
    // configurable: true
})
for(let p in t)
{
    console.log(p + " " + t[p]);
}
console.log(t.status);