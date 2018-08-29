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

let a = new Transformable(new Transform(vec(10, 10), 5));
let b = new Transformable(new Transform(vec(100, 100), 50));

b.transform = a.transform;
b.transform.position = vec(100, 100);
console.log(a.transform.position);
console.log(b.transform.position);